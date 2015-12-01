'use strict';
window.app = angular.module('FullstackGeneratedApp', ['ui.router', 'ui.bootstrap', 'fsaPreBuilt', 'ngFileUpload', 'ngAnimate', 'textAngular', 'uiGmapgoogle-maps', 'ngTagsInput', 'slidePushMenu']);

app.config(function ($urlRouterProvider, $locationProvider) {
    // This turns off hashbang urls (/#about) and changes it to something normal (/about)
    $locationProvider.html5Mode(true);
    // If we go to a URL that ui-router doesn't have registered, go to the "/" url.
    $urlRouterProvider.otherwise('/');
}).config(function (uiGmapGoogleMapApiProvider) {
    uiGmapGoogleMapApiProvider.configure({
        key: 'AIzaSyCAfyXseSXUDBQYwfp2iXryD5AvC1J82Og',
        v: '3.20', //defaults to latest 3.X anyhow
        libraries: 'weather,geometry,visualization'
    });
});

// This app.run is for controlling access to specific states.
app.run(function ($rootScope, AuthService, $state) {

    // The given state requires an authenticated user.
    var destinationStateRequiresAuth = function destinationStateRequiresAuth(state) {
        return state.data && state.data.authenticate;
    };

    // $stateChangeStart is an event fired
    // whenever the process of changing a state begins.
    $rootScope.$on('$stateChangeStart', function (event, toState, toParams) {

        if (!destinationStateRequiresAuth(toState)) {
            // The destination state does not require authentication
            // Short circuit with return.
            return;
        }

        if (AuthService.isAuthenticated()) {
            // The user is authenticated.
            // Short circuit with return.
            return;
        }

        // Cancel navigating to new state.
        event.preventDefault();

        AuthService.getLoggedInUser().then(function (user) {
            // If a user is retrieved, then renavigate to the destination
            // (the second time, AuthService.isAuthenticated() will work)
            // otherwise, if no user is logged in, go to "login" state.
            if (user) {
                $state.go(toState.name, toParams);
            } else {
                $state.go('login');
            }
        });
    });
});

app.controller('mainCtrl', function ($rootScope, AuthService, AUTH_EVENTS, $state, $scope) {
    $scope.user = null;

    $scope.isLoggedIn = function () {
        return AuthService.isAuthenticated();
    };

    $scope.logout = function () {
        AuthService.logout().then(function () {
            $state.go('home');
        });
    };

    var setUser = function setUser() {
        AuthService.getLoggedInUser().then(function (user) {
            $scope.user = user;
        });
    };

    var removeUser = function removeUser() {
        $scope.user = null;
    };

    setUser();

    $rootScope.$on(AUTH_EVENTS.loginSuccess, setUser);
    $rootScope.$on(AUTH_EVENTS.logoutSuccess, removeUser);
    $rootScope.$on(AUTH_EVENTS.sessionTimeout, removeUser);
});

app.config(function ($stateProvider) {

    // Register our *about* state.
    $stateProvider.state('about', {
        url: '/about',
        controller: 'AboutController',
        templateUrl: 'js/about/about.html'
    });
});

app.controller('AboutController', function ($scope, FullstackPics) {

    // Images of beautiful Fullstack people.
    $scope.images = _.shuffle(FullstackPics);
});
app.config(function ($stateProvider) {
    $stateProvider.state('docs', {
        url: '/docs',
        templateUrl: 'js/docs/docs.html'
    });
});

app.config(function ($stateProvider) {
    $stateProvider.state('eventList', {
        url: '/events',
        templateUrl: 'js/event/list.html',
        controller: function controller($scope, uiGmapGoogleMapApi) {
            $scope.map = { center: { latitude: 40.773959, longitude: -73.970949 }, zoom: 14 };
            uiGmapGoogleMapApi.then(function (maps) {});
        }
    }).state('eventDetail', {
        url: '/events/detail/:id',
        templateUrl: 'js/event/detail.html',
        controller: function controller($scope) {
            $scope.page = "detail";
        }
    }).state('eventCreate', {
        url: '/events/create',
        templateUrl: 'js/event/create.html',
        controller: function controller($scope) {
            $scope.create = function (para) {
                alert(para);
            };
        }
    }).state('eventUpdate', {
        url: '/events/update/:id',
        templateUrl: 'js/event/update.html',
        controller: function controller($scope) {
            $scope.update = function (para) {
                alert(para);
            };
        }
    });
});

(function () {

    'use strict';

    // Hope you didn't forget Angular! Duh-doy.
    if (!window.angular) throw new Error('I can\'t find Angular!');

    var app = angular.module('fsaPreBuilt', []);

    app.factory('Socket', function () {
        if (!window.io) throw new Error('socket.io not found!');
        return window.io(window.location.origin);
    });

    // AUTH_EVENTS is used throughout our app to
    // broadcast and listen from and to the $rootScope
    // for important events about authentication flow.
    app.constant('AUTH_EVENTS', {
        loginSuccess: 'auth-login-success',
        loginFailed: 'auth-login-failed',
        logoutSuccess: 'auth-logout-success',
        sessionTimeout: 'auth-session-timeout',
        notAuthenticated: 'auth-not-authenticated',
        notAuthorized: 'auth-not-authorized'
    });

    app.factory('AuthInterceptor', function ($rootScope, $q, AUTH_EVENTS) {
        var statusDict = {
            401: AUTH_EVENTS.notAuthenticated,
            403: AUTH_EVENTS.notAuthorized,
            419: AUTH_EVENTS.sessionTimeout,
            440: AUTH_EVENTS.sessionTimeout
        };
        return {
            responseError: function responseError(response) {
                $rootScope.$broadcast(statusDict[response.status], response);
                return $q.reject(response);
            }
        };
    });

    app.config(function ($httpProvider) {
        $httpProvider.interceptors.push(['$injector', function ($injector) {
            return $injector.get('AuthInterceptor');
        }]);
    });

    app.service('AuthService', function ($http, Session, $rootScope, AUTH_EVENTS, $q) {

        function onSuccessfulLogin(response) {
            var data = response.data;
            Session.create(data.id, data.user);
            $rootScope.$broadcast(AUTH_EVENTS.loginSuccess);
            return data.user;
        }

        // Uses the session factory to see if an
        // authenticated user is currently registered.
        this.isAuthenticated = function () {
            return !!Session.user;
        };

        this.getLoggedInUser = function (fromServer) {

            // If an authenticated session exists, we
            // return the user attached to that session
            // with a promise. This ensures that we can
            // always interface with this method asynchronously.

            // Optionally, if true is given as the fromServer parameter,
            // then this cached value will not be used.

            if (this.isAuthenticated() && fromServer !== true) {
                return $q.when(Session.user);
            }

            // Make request GET /session.
            // If it returns a user, call onSuccessfulLogin with the response.
            // If it returns a 401 response, we catch it and instead resolve to null.
            return $http.get('/session').then(onSuccessfulLogin)['catch'](function () {
                return null;
            });
        };

        this.login = function (credentials) {
            return $http.post('/login', credentials).then(onSuccessfulLogin)['catch'](function () {
                return $q.reject({ message: 'Invalid login credentials.' });
            });
        };

        this.logout = function () {
            return $http.get('/logout').then(function () {
                Session.destroy();
                $rootScope.$broadcast(AUTH_EVENTS.logoutSuccess);
            });
        };
    });

    app.service('Session', function ($rootScope, AUTH_EVENTS) {

        var self = this;

        $rootScope.$on(AUTH_EVENTS.notAuthenticated, function () {
            self.destroy();
        });

        $rootScope.$on(AUTH_EVENTS.sessionTimeout, function () {
            self.destroy();
        });

        this.id = null;
        this.user = null;

        this.create = function (sessionId, user) {
            this.id = sessionId;
            this.user = user;
        };

        this.destroy = function () {
            this.id = null;
            this.user = null;
        };
    });
})();

app.config(function ($stateProvider) {
    $stateProvider.state('home', {
        url: '/',
        templateUrl: 'js/home/home.html'

    });
});
app.config(function ($stateProvider) {

    $stateProvider.state('login', {
        url: '/login',
        templateUrl: 'js/login/login.html',
        controller: 'LoginCtrl'
    });
});

app.controller('LoginCtrl', function ($scope, AuthService, $state, UserFactory) {

    $scope.login = {};
    $scope.error = null;

    $scope.sendLogin = function (loginInfo) {

        $scope.error = null;

        AuthService.login(loginInfo).then(function () {
            $state.go('home');
        })['catch'](function () {
            $scope.error = 'Invalid login credentials.';
        });
    };

    $scope.sendSignup = function (signupInfo) {
        $scope.error = null;
        UserFactory.createUser(signupInfo).then(function () {
            return AuthService.login(signupInfo);
        }).then(function () {
            $state.go('home');
        })['catch'](function (err) {
            $scope.error = err;
        });
    };
});

app.config(function ($stateProvider) {

    $stateProvider.state('membersOnly', {
        url: '/members-area',
        template: '<img ng-repeat="item in stash" width="300" ng-src="{{ item }}" />',
        controller: function controller($scope, SecretStash) {
            SecretStash.getStash().then(function (stash) {
                $scope.stash = stash;
            });
        },
        // The following data.authenticate is read by an event listener
        // that controls access to this state. Refer to app.js.
        data: {
            authenticate: true
        }
    });
});

app.factory('SecretStash', function ($http) {

    var getStash = function getStash() {
        return $http.get('/api/members/secret-stash').then(function (response) {
            return response.data;
        });
    };

    return {
        getStash: getStash
    };
});
app.config(function ($stateProvider) {
    $stateProvider.state('users', {
        url: '/users',
        templateUrl: 'js/user/list.html',
        resolve: {
            users: function users(UserFactory) {
                return UserFactory.getUsers().then(function (res) {
                    return res.data;
                });
            }
        },
        controller: function controller($scope, users) {
            $scope.users = users;
        }
    }).state('userDetail', {
        url: '/users/detail/:id',
        templateUrl: 'js/user/profile.html',
        resolve: {
            user: function user(UserFactory, $stateParams) {
                return UserFactory.getUserById($stateParams.id).then(function (res) {
                    return res.data;
                });
            }
        },
        controller: function controller($scope, user) {
            $scope.user = user;
        }
    }).state('userEdit', {
        url: '/users/edit/:id',
        templateUrl: 'js/user/edit.html',
        resolve: {
            user: function user($stateParams, UserFactory) {
                return UserFactory.getUserById($stateParams.id).then(function (res) {
                    return res.data;
                });
            },
            states: function states(Utils) {
                return Utils.getStates();
            }
        },
        controller: function controller($scope, user, states, UserFactory, $state) {
            $scope.user = user;

            $scope.allStates = states;

            $scope.setState = function (state) {
                $scope.user.address.state = state;
            };

            $scope.updateUser = function () {
                UserFactory.updateUser($scope.user).then(function (res) {
                    console.log('update user', res.data);
                });
            };

            $scope.deleteUser = function (id) {
                UserFactory.removeUser(id).then(function (res) {
                    if (res.data.ok) {
                        $state.go('home');
                    }
                });
            };
        }
    });
});

app.factory('EventFactory', function () {
    var defaultImages = {
        basketball: 'http://designyoutrust.com/wp-content/uploads/2014/01/This_Game_We_Play_NYC_Basketball_Courts_by_Franck-_Bohbot_2014_03.jpg',
        climbing: 'http://www.glappitnova.com/wp-content/uploads/2015/07/BKBChicago-South-Building-Climbing-Wall.jpg',
        soccer: 'http://www3.pictures.zimbio.com/gi/New+York+Red+Bulls+Mayor+Bloomberg+Open+New+F9Zo2WoP7g-l.jpg',
        baseball: 'http://www.suitcasegetaways.com/wp-content/uploads/2014/08/NYC-Central-Park-Heckscher-BallFields-South-End-9296-14-1030x686.jpg',
        football: 'http://www.psal.org/images/Articles/2015/201507231059035908.jpg',
        lifting: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRE65QAInXpHJuUmCZ37Xlf5RsxJtweqWAuewMUMkdh4y-v6sN5W5DNBIg',
        skiing: 'http://www.home-hunts.net/wp-content/uploads/2015/01/Cauterets-skiing.jpg',
        mountainbiking: 'http://finnohara.com/blog/wp-content/uploads/0000_FO_ATHLETES_961_1c_RGB.jpg',
        surfing: 'https://encrypted-tbn3.gstatic.com/images?q=tbn:ANd9GcRcxSIHobLvgXMgy6g0u1yXjq9tH7ecOL03VCVIhmf-5_k9vEJC',
        cycling: 'http://www.msnbc.com/sites/msnbc/files/2013/05/ap02050502257_1.jpg'
    };

    return {
        getUrl: function getUrl(type) {
            return defaultImages[type];
        }
    };
});
app.factory('FullstackPics', function () {
    return ['https://pbs.twimg.com/media/B7gBXulCAAAXQcE.jpg:large', 'https://fbcdn-sphotos-c-a.akamaihd.net/hphotos-ak-xap1/t31.0-8/10862451_10205622990359241_8027168843312841137_o.jpg', 'https://pbs.twimg.com/media/B-LKUshIgAEy9SK.jpg', 'https://pbs.twimg.com/media/B79-X7oCMAAkw7y.jpg', 'https://pbs.twimg.com/media/B-Uj9COIIAIFAh0.jpg:large', 'https://pbs.twimg.com/media/B6yIyFiCEAAql12.jpg:large', 'https://pbs.twimg.com/media/CE-T75lWAAAmqqJ.jpg:large', 'https://pbs.twimg.com/media/CEvZAg-VAAAk932.jpg:large', 'https://pbs.twimg.com/media/CEgNMeOXIAIfDhK.jpg:large', 'https://pbs.twimg.com/media/CEQyIDNWgAAu60B.jpg:large', 'https://pbs.twimg.com/media/CCF3T5QW8AE2lGJ.jpg:large', 'https://pbs.twimg.com/media/CAeVw5SWoAAALsj.jpg:large', 'https://pbs.twimg.com/media/CAaJIP7UkAAlIGs.jpg:large', 'https://pbs.twimg.com/media/CAQOw9lWEAAY9Fl.jpg:large', 'https://pbs.twimg.com/media/B-OQbVrCMAANwIM.jpg:large', 'https://pbs.twimg.com/media/B9b_erwCYAAwRcJ.png:large', 'https://pbs.twimg.com/media/B5PTdvnCcAEAl4x.jpg:large', 'https://pbs.twimg.com/media/B4qwC0iCYAAlPGh.jpg:large', 'https://pbs.twimg.com/media/B2b33vRIUAA9o1D.jpg:large', 'https://pbs.twimg.com/media/BwpIwr1IUAAvO2_.jpg:large', 'https://pbs.twimg.com/media/BsSseANCYAEOhLw.jpg:large', 'https://pbs.twimg.com/media/CJ4vLfuUwAAda4L.jpg:large', 'https://pbs.twimg.com/media/CI7wzjEVEAAOPpS.jpg:large', 'https://pbs.twimg.com/media/CIdHvT2UsAAnnHV.jpg:large', 'https://pbs.twimg.com/media/CGCiP_YWYAAo75V.jpg:large', 'https://pbs.twimg.com/media/CIS4JPIWIAI37qu.jpg:large'];
});

app.factory('OneEvent', function () {

    return {
        name: "skating",
        tags: "ice",
        numOfPeople: 2,
        date: "11/23/2015",
        time: "7:00",
        feePerPerson: 5,
        location: "central Park",
        description: "Nice place"
    };
});

app.factory('RandomMotto', function () {

    var getRandomFromArray = function getRandomFromArray(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    };

    var motto = ['Sport up!', 'teamwork makes the dream work', 'Hello, simple human.', 'What a beautiful day!Let\'s work out!', '生命在于运动', 'Life is short, Play Hard!', 'Together Everyone Achieves More.', 'United we play. United we win.', 'You may be strong, but we are stronger.'];

    return {
        motto: motto,
        getRandomMotto: function getRandomMotto() {
            return getRandomFromArray(motto);
        }
    };
});

app.factory('UserFactory', function ($http) {

    var users = [{
        userName: 'Stewee',
        firstName: 'Stewart',
        lastName: 'Griffin',
        gender: 'M',
        email: 'mingjie@fsa.com',
        birth: {
            day: '15',
            month: '06',
            year: '2010'
        },
        motto: 'Little Asshold',
        address: {
            address1: '321 broadway',
            address2: 'apt 4c',
            city: 'new york',
            state: 'NY',
            zip: '11229'
        },
        links: [],
        image: '',
        about: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.'
    }];
    function getUsers() {
        return $http.get('/api/users/');
    }

    function getUserById(id) {
        return $http.get('/api/users/' + id);
    }

    function updateUser(user) {
        return $http.put('/api/users/', user);
    }

    function createUser(user) {
        return $http.post('/api/users/', user);
    }

    function removeUser(id) {
        return $http['delete']('/api/users/' + id);
    }

    return {
        getUsers: getUsers,
        getUserById: getUserById,
        updateUser: updateUser,
        createUser: createUser,
        removeUser: removeUser
    };
});

app.factory('Utils', function () {

    var state_hash = [{
        "name": "Alabama",
        "abbreviation": "AL"
    }, {
        "name": "Alaska",
        "abbreviation": "AK"
    }, {
        "name": "American Samoa",
        "abbreviation": "AS"
    }, {
        "name": "Arizona",
        "abbreviation": "AZ"
    }, {
        "name": "Arkansas",
        "abbreviation": "AR"
    }, {
        "name": "California",
        "abbreviation": "CA"
    }, {
        "name": "Colorado",
        "abbreviation": "CO"
    }, {
        "name": "Connecticut",
        "abbreviation": "CT"
    }, {
        "name": "Delaware",
        "abbreviation": "DE"
    }, {
        "name": "District Of Columbia",
        "abbreviation": "DC"
    }, {
        "name": "Federated States Of Micronesia",
        "abbreviation": "FM"
    }, {
        "name": "Florida",
        "abbreviation": "FL"
    }, {
        "name": "Georgia",
        "abbreviation": "GA"
    }, {
        "name": "Guam",
        "abbreviation": "GU"
    }, {
        "name": "Hawaii",
        "abbreviation": "HI"
    }, {
        "name": "Idaho",
        "abbreviation": "ID"
    }, {
        "name": "Illinois",
        "abbreviation": "IL"
    }, {
        "name": "Indiana",
        "abbreviation": "IN"
    }, {
        "name": "Iowa",
        "abbreviation": "IA"
    }, {
        "name": "Kansas",
        "abbreviation": "KS"
    }, {
        "name": "Kentucky",
        "abbreviation": "KY"
    }, {
        "name": "Louisiana",
        "abbreviation": "LA"
    }, {
        "name": "Maine",
        "abbreviation": "ME"
    }, {
        "name": "Marshall Islands",
        "abbreviation": "MH"
    }, {
        "name": "Maryland",
        "abbreviation": "MD"
    }, {
        "name": "Massachusetts",
        "abbreviation": "MA"
    }, {
        "name": "Michigan",
        "abbreviation": "MI"
    }, {
        "name": "Minnesota",
        "abbreviation": "MN"
    }, {
        "name": "Mississippi",
        "abbreviation": "MS"
    }, {
        "name": "Missouri",
        "abbreviation": "MO"
    }, {
        "name": "Montana",
        "abbreviation": "MT"
    }, {
        "name": "Nebraska",
        "abbreviation": "NE"
    }, {
        "name": "Nevada",
        "abbreviation": "NV"
    }, {
        "name": "New Hampshire",
        "abbreviation": "NH"
    }, {
        "name": "New Jersey",
        "abbreviation": "NJ"
    }, {
        "name": "New Mexico",
        "abbreviation": "NM"
    }, {
        "name": "New York",
        "abbreviation": "NY"
    }, {
        "name": "North Carolina",
        "abbreviation": "NC"
    }, {
        "name": "North Dakota",
        "abbreviation": "ND"
    }, {
        "name": "Northern Mariana Islands",
        "abbreviation": "MP"
    }, {
        "name": "Ohio",
        "abbreviation": "OH"
    }, {
        "name": "Oklahoma",
        "abbreviation": "OK"
    }, {
        "name": "Oregon",
        "abbreviation": "OR"
    }, {
        "name": "Palau",
        "abbreviation": "PW"
    }, {
        "name": "Pennsylvania",
        "abbreviation": "PA"
    }, {
        "name": "Puerto Rico",
        "abbreviation": "PR"
    }, {
        "name": "Rhode Island",
        "abbreviation": "RI"
    }, {
        "name": "South Carolina",
        "abbreviation": "SC"
    }, {
        "name": "South Dakota",
        "abbreviation": "SD"
    }, {
        "name": "Tennessee",
        "abbreviation": "TN"
    }, {
        "name": "Texas",
        "abbreviation": "TX"
    }, {
        "name": "Utah",
        "abbreviation": "UT"
    }, {
        "name": "Vermont",
        "abbreviation": "VT"
    }, {
        "name": "Virgin Islands",
        "abbreviation": "VI"
    }, {
        "name": "Virginia",
        "abbreviation": "VA"
    }, {
        "name": "Washington",
        "abbreviation": "WA"
    }, {
        "name": "West Virginia",
        "abbreviation": "WV"
    }, {
        "name": "Wisconsin",
        "abbreviation": "WI"
    }, {
        "name": "Wyoming",
        "abbreviation": "WY"
    }];

    function getStates() {
        return state_hash;
    }

    return {
        getStates: getStates
    };
});

app.directive('editor', function () {
    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/editor/editor.html',
        scope: {
            content: '='
        },
        controller: function controller($scope) {},
        link: function link() {}
    };
});

app.directive('eventDetail', function (EventFactory) {
    return {
        restrict: 'E',
        templateUrl: '/js/common/directives/event-detail/event-detail.html',
        link: function link(scope, element, attrs) {
            scope.getImage = function (type) {
                return EventFactory.getUrl(type);
            };
        }
    };
});
app.directive('eventForm', function () {
    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/event-form/event-form.html',
        scope: {
            event: "=",
            fn: "&",
            type: '@'
        },
        controller: 'eventFormCtrl'

    };
});

app.controller('eventFormCtrl', function ($scope) {
    console.log($scope.type);
    $scope.event = {};
});

app.directive('fullstackLogo', function () {
    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/fullstack-logo/fullstack-logo.html'
    };
});
app.directive('randoMotto', function (RandomMotto) {

    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/rando-motto/rando-motto.html',
        link: function link(scope) {
            scope.motto = RandomMotto.getRandomMotto();
        }
    };
});
app.directive('navbar', function ($rootScope, AuthService, AUTH_EVENTS, $state) {

    return {
        restrict: 'E',
        scope: {},
        templateUrl: 'js/common/directives/navbar/navbar.html',
        link: function link(scope) {

            scope.items = [{ label: 'Home', state: 'home' }, { label: 'About', state: 'about' }, { label: 'Documentation', state: 'docs' }, { label: 'Users', state: 'users' }, { label: 'Events', state: 'eventList' }, { label: 'Members Only', state: 'membersOnly', auth: true }];

            scope.user = null;

            scope.isLoggedIn = function () {
                return AuthService.isAuthenticated();
            };

            scope.logout = function () {
                AuthService.logout().then(function () {
                    $state.go('home');
                });
            };

            var setUser = function setUser() {
                AuthService.getLoggedInUser().then(function (user) {
                    scope.user = user;
                });
            };

            var removeUser = function removeUser() {
                scope.user = null;
            };

            setUser();

            $rootScope.$on(AUTH_EVENTS.loginSuccess, setUser);
            $rootScope.$on(AUTH_EVENTS.logoutSuccess, removeUser);
            $rootScope.$on(AUTH_EVENTS.sessionTimeout, removeUser);
        }

    };
});

app.directive('rotateText', function ($interval) {

    return function (scope, element, attrs) {

        scope.wordArr = ['Swim', 'Team', 'Gym', 'Climb', 'Sport'];

        function updateWord(i) {
            var j = (i + 1) % 5; //(i+1) to start at second word
            //console.log(j);
            element.text(scope.wordArr[j]);
        }

        element.text(scope.wordArr[0]); //displays "fun"
        var stopWord = $interval(updateWord, 2000); //start rotating 1 second after, changes every sec

        // listen on DOM destroy (removal) event
        // to prevent updating word after the DOM element was removed.
        element.on('$destroy', function () {
            $interval.cancel(stopWord);
        });
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFib3V0L2Fib3V0LmpzIiwiZG9jcy9kb2NzLmpzIiwiZXZlbnQvZXZlbnQuanMiLCJmc2EvZnNhLXByZS1idWlsdC5qcyIsImhvbWUvaG9tZS5qcyIsImxvZ2luL2xvZ2luLmpzIiwibWVtYmVycy1vbmx5L21lbWJlcnMtb25seS5qcyIsInVzZXIvdXNlci5qcyIsImNvbW1vbi9mYWN0b3JpZXMvRXZlbnRGYWN0b3J5LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9GdWxsc3RhY2tQaWNzLmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9PbmVFdmVudC5qcyIsImNvbW1vbi9mYWN0b3JpZXMvUmFuZG9tTW90dG8uanMiLCJjb21tb24vZmFjdG9yaWVzL1VzZXJGYWN0b3J5LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9VdGlsRmFjdG9yeS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL2VkaXRvci9lZGl0b3IuanMiLCJjb21tb24vZGlyZWN0aXZlcy9ldmVudC1kZXRhaWwvZXZlbnQtZGV0YWlsLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvZXZlbnQtZm9ybS9ldmVudC1mb3JtLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uanMiLCJjb21tb24vZGlyZWN0aXZlcy9yYW5kby1tb3R0by9yYW5kby1tb3R0by5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL25hdmJhci9uYXZiYXIuanMiLCJjb21tb24vZGlyZWN0aXZlcy90ZXh0LXJvdGF0ZS90ZXh0LXJvdGF0ZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxZQUFBLENBQUE7QUFDQSxNQUFBLENBQUEsR0FBQSxHQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsdUJBQUEsRUFBQSxDQUFBLFdBQUEsRUFBQSxjQUFBLEVBQUEsYUFBQSxFQUFBLGNBQUEsRUFBQSxXQUFBLEVBQUEsYUFBQSxFQUFBLG1CQUFBLEVBQUEsYUFBQSxFQUFBLGVBQUEsQ0FBQSxDQUFBLENBQUE7O0FBRUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGtCQUFBLEVBQUEsaUJBQUEsRUFBQTs7QUFFQSxxQkFBQSxDQUFBLFNBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTs7QUFFQSxzQkFBQSxDQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTtDQUNBLENBQUEsQ0FDQSxNQUFBLENBQUEsVUFBQSwwQkFBQSxFQUFBO0FBQ0EsOEJBQUEsQ0FBQSxTQUFBLENBQUE7QUFDQSxXQUFBLEVBQUEseUNBQUE7QUFDQSxTQUFBLEVBQUEsTUFBQTtBQUNBLGlCQUFBLEVBQUEsZ0NBQUE7S0FDQSxDQUFBLENBQUE7Q0FDQSxDQUFBLENBQUE7OztBQUdBLEdBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxVQUFBLEVBQUEsV0FBQSxFQUFBLE1BQUEsRUFBQTs7O0FBR0EsUUFBQSw0QkFBQSxHQUFBLFNBQUEsNEJBQUEsQ0FBQSxLQUFBLEVBQUE7QUFDQSxlQUFBLEtBQUEsQ0FBQSxJQUFBLElBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxZQUFBLENBQUE7S0FDQSxDQUFBOzs7O0FBSUEsY0FBQSxDQUFBLEdBQUEsQ0FBQSxtQkFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQSxRQUFBLEVBQUE7O0FBRUEsWUFBQSxDQUFBLDRCQUFBLENBQUEsT0FBQSxDQUFBLEVBQUE7OztBQUdBLG1CQUFBO1NBQ0E7O0FBRUEsWUFBQSxXQUFBLENBQUEsZUFBQSxFQUFBLEVBQUE7OztBQUdBLG1CQUFBO1NBQ0E7OztBQUdBLGFBQUEsQ0FBQSxjQUFBLEVBQUEsQ0FBQTs7QUFFQSxtQkFBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTs7OztBQUlBLGdCQUFBLElBQUEsRUFBQTtBQUNBLHNCQUFBLENBQUEsRUFBQSxDQUFBLE9BQUEsQ0FBQSxJQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7YUFDQSxNQUFBO0FBQ0Esc0JBQUEsQ0FBQSxFQUFBLENBQUEsT0FBQSxDQUFBLENBQUE7YUFDQTtTQUNBLENBQUEsQ0FBQTtLQUVBLENBQUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUFHQSxHQUFBLENBQUEsVUFBQSxDQUFBLFVBQUEsRUFBQSxVQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUEsV0FBQSxFQUFBLE1BQUEsRUFBQSxNQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsVUFBQSxHQUFBLFlBQUE7QUFDQSxlQUFBLFdBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsVUFBQSxDQUFBLE1BQUEsR0FBQSxZQUFBO0FBQ0EsbUJBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQTtBQUNBLGtCQUFBLENBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxRQUFBLE9BQUEsR0FBQSxTQUFBLE9BQUEsR0FBQTtBQUNBLG1CQUFBLENBQUEsZUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxRQUFBLFVBQUEsR0FBQSxTQUFBLFVBQUEsR0FBQTtBQUNBLGNBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxXQUFBLEVBQUEsQ0FBQTs7QUFFQSxjQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBLEVBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxjQUFBLEVBQUEsVUFBQSxDQUFBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FDeEZBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7OztBQUdBLGtCQUFBLENBQUEsS0FBQSxDQUFBLE9BQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxRQUFBO0FBQ0Esa0JBQUEsRUFBQSxpQkFBQTtBQUNBLG1CQUFBLEVBQUEscUJBQUE7S0FDQSxDQUFBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FBRUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxpQkFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLGFBQUEsRUFBQTs7O0FBR0EsVUFBQSxDQUFBLE1BQUEsR0FBQSxDQUFBLENBQUEsT0FBQSxDQUFBLGFBQUEsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDaEJBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7QUFDQSxrQkFBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxXQUFBLEVBQUEsT0FBQTtBQUNBLG1CQUFBLEVBQUEsbUJBQUE7S0FDQSxDQUFBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FDTEEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTtBQUNBLGtCQUFBLENBQ0EsS0FBQSxDQUFBLFdBQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxTQUFBO0FBQ0EsbUJBQUEsRUFBQSxvQkFBQTtBQUNBLGtCQUFBLEVBQUEsb0JBQUEsTUFBQSxFQUFBLGtCQUFBLEVBQUE7QUFDQSxrQkFBQSxDQUFBLEdBQUEsR0FBQSxFQUFBLE1BQUEsRUFBQSxFQUFBLFFBQUEsRUFBQSxTQUFBLEVBQUEsU0FBQSxFQUFBLENBQUEsU0FBQSxFQUFBLEVBQUEsSUFBQSxFQUFBLEVBQUEsRUFBQSxDQUFBO0FBQ0EsOEJBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxJQUFBLEVBQUEsRUFBQSxDQUFBLENBQUE7U0FDQTtLQUNBLENBQUEsQ0FDQSxLQUFBLENBQUEsYUFBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLG9CQUFBO0FBQ0EsbUJBQUEsRUFBQSxzQkFBQTtBQUNBLGtCQUFBLEVBQUEsb0JBQUEsTUFBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxJQUFBLEdBQUEsUUFBQSxDQUFBO1NBQ0E7S0FDQSxDQUFBLENBQ0EsS0FBQSxDQUFBLGFBQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxnQkFBQTtBQUNBLG1CQUFBLEVBQUEsc0JBQUE7QUFDQSxrQkFBQSxFQUFBLG9CQUFBLE1BQUEsRUFBQTtBQUNBLGtCQUFBLENBQUEsTUFBQSxHQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EscUJBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTthQUNBLENBQUE7U0FDQTtLQUNBLENBQUEsQ0FDQSxLQUFBLENBQUEsYUFBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLG9CQUFBO0FBQ0EsbUJBQUEsRUFBQSxzQkFBQTtBQUNBLGtCQUFBLEVBQUEsb0JBQUEsTUFBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxNQUFBLEdBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSxxQkFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO2FBQ0EsQ0FBQTtTQUNBO0tBQ0EsQ0FBQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQ25DQSxDQUFBLFlBQUE7O0FBRUEsZ0JBQUEsQ0FBQTs7O0FBR0EsUUFBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLEVBQUEsTUFBQSxJQUFBLEtBQUEsQ0FBQSx3QkFBQSxDQUFBLENBQUE7O0FBRUEsUUFBQSxHQUFBLEdBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxhQUFBLEVBQUEsRUFBQSxDQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLEVBQUEsWUFBQTtBQUNBLFlBQUEsQ0FBQSxNQUFBLENBQUEsRUFBQSxFQUFBLE1BQUEsSUFBQSxLQUFBLENBQUEsc0JBQUEsQ0FBQSxDQUFBO0FBQ0EsZUFBQSxNQUFBLENBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7Ozs7O0FBS0EsT0FBQSxDQUFBLFFBQUEsQ0FBQSxhQUFBLEVBQUE7QUFDQSxvQkFBQSxFQUFBLG9CQUFBO0FBQ0EsbUJBQUEsRUFBQSxtQkFBQTtBQUNBLHFCQUFBLEVBQUEscUJBQUE7QUFDQSxzQkFBQSxFQUFBLHNCQUFBO0FBQ0Esd0JBQUEsRUFBQSx3QkFBQTtBQUNBLHFCQUFBLEVBQUEscUJBQUE7S0FDQSxDQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLE9BQUEsQ0FBQSxpQkFBQSxFQUFBLFVBQUEsVUFBQSxFQUFBLEVBQUEsRUFBQSxXQUFBLEVBQUE7QUFDQSxZQUFBLFVBQUEsR0FBQTtBQUNBLGVBQUEsRUFBQSxXQUFBLENBQUEsZ0JBQUE7QUFDQSxlQUFBLEVBQUEsV0FBQSxDQUFBLGFBQUE7QUFDQSxlQUFBLEVBQUEsV0FBQSxDQUFBLGNBQUE7QUFDQSxlQUFBLEVBQUEsV0FBQSxDQUFBLGNBQUE7U0FDQSxDQUFBO0FBQ0EsZUFBQTtBQUNBLHlCQUFBLEVBQUEsdUJBQUEsUUFBQSxFQUFBO0FBQ0EsMEJBQUEsQ0FBQSxVQUFBLENBQUEsVUFBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLENBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLHVCQUFBLEVBQUEsQ0FBQSxNQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7YUFDQTtTQUNBLENBQUE7S0FDQSxDQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGFBQUEsRUFBQTtBQUNBLHFCQUFBLENBQUEsWUFBQSxDQUFBLElBQUEsQ0FBQSxDQUNBLFdBQUEsRUFDQSxVQUFBLFNBQUEsRUFBQTtBQUNBLG1CQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsaUJBQUEsQ0FBQSxDQUFBO1NBQ0EsQ0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLE9BQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUEsRUFBQSxFQUFBOztBQUVBLGlCQUFBLGlCQUFBLENBQUEsUUFBQSxFQUFBO0FBQ0EsZ0JBQUEsSUFBQSxHQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsRUFBQSxFQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsVUFBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQTtBQUNBLG1CQUFBLElBQUEsQ0FBQSxJQUFBLENBQUE7U0FDQTs7OztBQUlBLFlBQUEsQ0FBQSxlQUFBLEdBQUEsWUFBQTtBQUNBLG1CQUFBLENBQUEsQ0FBQSxPQUFBLENBQUEsSUFBQSxDQUFBO1NBQ0EsQ0FBQTs7QUFFQSxZQUFBLENBQUEsZUFBQSxHQUFBLFVBQUEsVUFBQSxFQUFBOzs7Ozs7Ozs7O0FBVUEsZ0JBQUEsSUFBQSxDQUFBLGVBQUEsRUFBQSxJQUFBLFVBQUEsS0FBQSxJQUFBLEVBQUE7QUFDQSx1QkFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLE9BQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTthQUNBOzs7OztBQUtBLG1CQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLGlCQUFBLENBQUEsU0FBQSxDQUFBLFlBQUE7QUFDQSx1QkFBQSxJQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FFQSxDQUFBOztBQUVBLFlBQUEsQ0FBQSxLQUFBLEdBQUEsVUFBQSxXQUFBLEVBQUE7QUFDQSxtQkFBQSxLQUFBLENBQUEsSUFBQSxDQUFBLFFBQUEsRUFBQSxXQUFBLENBQUEsQ0FDQSxJQUFBLENBQUEsaUJBQUEsQ0FBQSxTQUNBLENBQUEsWUFBQTtBQUNBLHVCQUFBLEVBQUEsQ0FBQSxNQUFBLENBQUEsRUFBQSxPQUFBLEVBQUEsNEJBQUEsRUFBQSxDQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FDQSxDQUFBOztBQUVBLFlBQUEsQ0FBQSxNQUFBLEdBQUEsWUFBQTtBQUNBLG1CQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFlBQUE7QUFDQSx1QkFBQSxDQUFBLE9BQUEsRUFBQSxDQUFBO0FBQ0EsMEJBQUEsQ0FBQSxVQUFBLENBQUEsV0FBQSxDQUFBLGFBQUEsQ0FBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBQ0EsQ0FBQTtLQUVBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsT0FBQSxDQUFBLFNBQUEsRUFBQSxVQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUE7O0FBRUEsWUFBQSxJQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLGtCQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxnQkFBQSxFQUFBLFlBQUE7QUFDQSxnQkFBQSxDQUFBLE9BQUEsRUFBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBOztBQUVBLGtCQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxjQUFBLEVBQUEsWUFBQTtBQUNBLGdCQUFBLENBQUEsT0FBQSxFQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7O0FBRUEsWUFBQSxDQUFBLEVBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxZQUFBLENBQUEsTUFBQSxHQUFBLFVBQUEsU0FBQSxFQUFBLElBQUEsRUFBQTtBQUNBLGdCQUFBLENBQUEsRUFBQSxHQUFBLFNBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtTQUNBLENBQUE7O0FBRUEsWUFBQSxDQUFBLE9BQUEsR0FBQSxZQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxFQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO1NBQ0EsQ0FBQTtLQUVBLENBQUEsQ0FBQTtDQUVBLENBQUEsRUFBQSxDQUFBOztBQ3BJQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLEdBQUE7QUFDQSxtQkFBQSxFQUFBLG1CQUFBOztLQUVBLENBQUEsQ0FBQTtDQUNBLENBQUEsQ0FBQTtBQ05BLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7O0FBRUEsa0JBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLFFBQUE7QUFDQSxtQkFBQSxFQUFBLHFCQUFBO0FBQ0Esa0JBQUEsRUFBQSxXQUFBO0tBQ0EsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxVQUFBLENBQUEsV0FBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxNQUFBLEVBQUEsV0FBQSxFQUFBOztBQUVBLFVBQUEsQ0FBQSxLQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLFNBQUEsR0FBQSxVQUFBLFNBQUEsRUFBQTs7QUFFQSxjQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxtQkFBQSxDQUFBLEtBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQTtBQUNBLGtCQUFBLENBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO1NBQ0EsQ0FBQSxTQUFBLENBQUEsWUFBQTtBQUNBLGtCQUFBLENBQUEsS0FBQSxHQUFBLDRCQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FFQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxVQUFBLEdBQUEsVUFBQSxVQUFBLEVBQUE7QUFDQSxjQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsVUFBQSxDQUFBLFVBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxZQUFBO0FBQ0EsbUJBQUEsV0FBQSxDQUFBLEtBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTtTQUNBLENBQUEsQ0FDQSxJQUFBLENBQUEsWUFBQTtBQUNBLGtCQUFBLENBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO1NBQ0EsQ0FBQSxTQUNBLENBQUEsVUFBQSxHQUFBLEVBQUE7QUFDQSxrQkFBQSxDQUFBLEtBQUEsR0FBQSxHQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQ3pDQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBOztBQUVBLGtCQUFBLENBQUEsS0FBQSxDQUFBLGFBQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxlQUFBO0FBQ0EsZ0JBQUEsRUFBQSxtRUFBQTtBQUNBLGtCQUFBLEVBQUEsb0JBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQTtBQUNBLHVCQUFBLENBQUEsUUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0Esc0JBQUEsQ0FBQSxLQUFBLEdBQUEsS0FBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBQ0E7OztBQUdBLFlBQUEsRUFBQTtBQUNBLHdCQUFBLEVBQUEsSUFBQTtTQUNBO0tBQ0EsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxPQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBOztBQUVBLFFBQUEsUUFBQSxHQUFBLFNBQUEsUUFBQSxHQUFBO0FBQ0EsZUFBQSxLQUFBLENBQUEsR0FBQSxDQUFBLDJCQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxtQkFBQSxRQUFBLENBQUEsSUFBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxXQUFBO0FBQ0EsZ0JBQUEsRUFBQSxRQUFBO0tBQ0EsQ0FBQTtDQUVBLENBQUEsQ0FBQTtBQy9CQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FDQSxLQUFBLENBQUEsT0FBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLFFBQUE7QUFDQSxtQkFBQSxFQUFBLG1CQUFBO0FBQ0EsZUFBQSxFQUFBO0FBQ0EsaUJBQUEsRUFBQSxlQUFBLFdBQUEsRUFBQTtBQUNBLHVCQUFBLFdBQUEsQ0FDQSxRQUFBLEVBQUEsQ0FDQSxJQUFBLENBQUEsVUFBQSxHQUFBLEVBQUE7QUFDQSwyQkFBQSxHQUFBLENBQUEsSUFBQSxDQUFBO2lCQUNBLENBQUEsQ0FBQTthQUNBO1NBQ0E7QUFDQSxrQkFBQSxFQUFBLG9CQUFBLE1BQUEsRUFBQSxLQUFBLEVBQUE7QUFDQSxrQkFBQSxDQUFBLEtBQUEsR0FBQSxLQUFBLENBQUE7U0FDQTtLQUNBLENBQUEsQ0FDQSxLQUFBLENBQUEsWUFBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLG1CQUFBO0FBQ0EsbUJBQUEsRUFBQSxzQkFBQTtBQUNBLGVBQUEsRUFBQTtBQUNBLGdCQUFBLEVBQUEsY0FBQSxXQUFBLEVBQUEsWUFBQSxFQUFBO0FBQ0EsdUJBQUEsV0FBQSxDQUNBLFdBQUEsQ0FBQSxZQUFBLENBQUEsRUFBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLFVBQUEsR0FBQSxFQUFBO0FBQ0EsMkJBQUEsR0FBQSxDQUFBLElBQUEsQ0FBQTtpQkFDQSxDQUFBLENBQUE7YUFDQTtTQUNBO0FBQ0Esa0JBQUEsRUFBQSxvQkFBQSxNQUFBLEVBQUEsSUFBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO1NBQ0E7S0FDQSxDQUFBLENBQ0EsS0FBQSxDQUFBLFVBQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxpQkFBQTtBQUNBLG1CQUFBLEVBQUEsbUJBQUE7QUFDQSxlQUFBLEVBQUE7QUFDQSxnQkFBQSxFQUFBLGNBQUEsWUFBQSxFQUFBLFdBQUEsRUFBQTtBQUNBLHVCQUFBLFdBQUEsQ0FDQSxXQUFBLENBQUEsWUFBQSxDQUFBLEVBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxVQUFBLEdBQUEsRUFBQTtBQUNBLDJCQUFBLEdBQUEsQ0FBQSxJQUFBLENBQUE7aUJBQ0EsQ0FBQSxDQUFBO2FBQ0E7QUFDQSxrQkFBQSxFQUFBLGdCQUFBLEtBQUEsRUFBQTtBQUNBLHVCQUFBLEtBQUEsQ0FBQSxTQUFBLEVBQUEsQ0FBQTthQUNBO1NBQ0E7QUFDQSxrQkFBQSxFQUFBLG9CQUFBLE1BQUEsRUFBQSxJQUFBLEVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxNQUFBLEVBQUE7QUFDQSxrQkFBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsa0JBQUEsQ0FBQSxTQUFBLEdBQUEsTUFBQSxDQUFBOztBQUVBLGtCQUFBLENBQUEsUUFBQSxHQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0Esc0JBQUEsQ0FBQSxJQUFBLENBQUEsT0FBQSxDQUFBLEtBQUEsR0FBQSxLQUFBLENBQUE7YUFDQSxDQUFBOztBQUVBLGtCQUFBLENBQUEsVUFBQSxHQUFBLFlBQUE7QUFDQSwyQkFBQSxDQUNBLFVBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLFVBQUEsR0FBQSxFQUFBO0FBQ0EsMkJBQUEsQ0FBQSxHQUFBLENBQUEsYUFBQSxFQUFBLEdBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtpQkFDQSxDQUFBLENBQUE7YUFDQSxDQUFBOztBQUVBLGtCQUFBLENBQUEsVUFBQSxHQUFBLFVBQUEsRUFBQSxFQUFBO0FBQ0EsMkJBQUEsQ0FBQSxVQUFBLENBQUEsRUFBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLFVBQUEsR0FBQSxFQUFBO0FBQ0Esd0JBQUEsR0FBQSxDQUFBLElBQUEsQ0FBQSxFQUFBLEVBQUE7QUFDQSw4QkFBQSxDQUFBLEVBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtxQkFDQTtpQkFDQSxDQUFBLENBQUE7YUFDQSxDQUFBO1NBQ0E7S0FDQSxDQUFBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FDNUVBLEdBQUEsQ0FBQSxPQUFBLENBQUEsY0FBQSxFQUFBLFlBQUE7QUFDQSxRQUFBLGFBQUEsR0FBQTtBQUNBLGtCQUFBLEVBQUEsNEhBQUE7QUFDQSxnQkFBQSxFQUFBLG1HQUFBO0FBQ0EsY0FBQSxFQUFBLGlHQUFBO0FBQ0EsZ0JBQUEsRUFBQSxpSUFBQTtBQUNBLGdCQUFBLEVBQUEsaUVBQUE7QUFDQSxlQUFBLEVBQUEsaUhBQUE7QUFDQSxjQUFBLEVBQUEsMkVBQUE7QUFDQSxzQkFBQSxFQUFBLDhFQUFBO0FBQ0EsZUFBQSxFQUFBLDBHQUFBO0FBQ0EsZUFBQSxFQUFBLG9FQUFBO0tBQ0EsQ0FBQTs7QUFFQSxXQUFBO0FBQ0EsY0FBQSxFQUFBLGdCQUFBLElBQUEsRUFBQTtBQUNBLG1CQUFBLGFBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtTQUNBO0tBQ0EsQ0FBQTtDQUNBLENBQUEsQ0FBQTtBQ25CQSxHQUFBLENBQUEsT0FBQSxDQUFBLGVBQUEsRUFBQSxZQUFBO0FBQ0EsV0FBQSxDQUNBLHVEQUFBLEVBQ0EscUhBQUEsRUFDQSxpREFBQSxFQUNBLGlEQUFBLEVBQ0EsdURBQUEsRUFDQSx1REFBQSxFQUNBLHVEQUFBLEVBQ0EsdURBQUEsRUFDQSx1REFBQSxFQUNBLHVEQUFBLEVBQ0EsdURBQUEsRUFDQSx1REFBQSxFQUNBLHVEQUFBLEVBQ0EsdURBQUEsRUFDQSx1REFBQSxFQUNBLHVEQUFBLEVBQ0EsdURBQUEsRUFDQSx1REFBQSxFQUNBLHVEQUFBLEVBQ0EsdURBQUEsRUFDQSx1REFBQSxFQUNBLHVEQUFBLEVBQ0EsdURBQUEsRUFDQSx1REFBQSxFQUNBLHVEQUFBLEVBQ0EsdURBQUEsQ0FDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQzdCQSxHQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsRUFBQSxZQUFBOztBQUVBLFdBQUE7QUFDQSxZQUFBLEVBQUEsU0FBQTtBQUNBLFlBQUEsRUFBQSxLQUFBO0FBQ0EsbUJBQUEsRUFBQSxDQUFBO0FBQ0EsWUFBQSxFQUFBLFlBQUE7QUFDQSxZQUFBLEVBQUEsTUFBQTtBQUNBLG9CQUFBLEVBQUEsQ0FBQTtBQUNBLGdCQUFBLEVBQUEsY0FBQTtBQUNBLG1CQUFBLEVBQUEsWUFBQTtLQUNBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FDYkEsR0FBQSxDQUFBLE9BQUEsQ0FBQSxhQUFBLEVBQUEsWUFBQTs7QUFFQSxRQUFBLGtCQUFBLEdBQUEsU0FBQSxrQkFBQSxDQUFBLEdBQUEsRUFBQTtBQUNBLGVBQUEsR0FBQSxDQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsSUFBQSxDQUFBLE1BQUEsRUFBQSxHQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxRQUFBLEtBQUEsR0FBQSxDQUNBLFdBQUEsRUFDQSwrQkFBQSxFQUNBLHNCQUFBLEVBQ0EsdUNBQUEsRUFDQSxRQUFBLEVBQ0EsMkJBQUEsRUFDQSxrQ0FBQSxFQUNBLGdDQUFBLEVBQ0EseUNBQUEsQ0FDQSxDQUFBOztBQUVBLFdBQUE7QUFDQSxhQUFBLEVBQUEsS0FBQTtBQUNBLHNCQUFBLEVBQUEsMEJBQUE7QUFDQSxtQkFBQSxrQkFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO1NBQ0E7S0FDQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQ3pCQSxHQUFBLENBQUEsT0FBQSxDQUFBLGFBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQTs7QUFHQSxRQUFBLEtBQUEsR0FBQSxDQUNBO0FBQ0EsZ0JBQUEsRUFBQSxRQUFBO0FBQ0EsaUJBQUEsRUFBQSxTQUFBO0FBQ0EsZ0JBQUEsRUFBQSxTQUFBO0FBQ0EsY0FBQSxFQUFBLEdBQUE7QUFDQSxhQUFBLEVBQUEsaUJBQUE7QUFDQSxhQUFBLEVBQUE7QUFDQSxlQUFBLEVBQUEsSUFBQTtBQUNBLGlCQUFBLEVBQUEsSUFBQTtBQUNBLGdCQUFBLEVBQUEsTUFBQTtTQUNBO0FBQ0EsYUFBQSxFQUFBLGdCQUFBO0FBQ0EsZUFBQSxFQUFBO0FBQ0Esb0JBQUEsRUFBQSxjQUFBO0FBQ0Esb0JBQUEsRUFBQSxRQUFBO0FBQ0EsZ0JBQUEsRUFBQSxVQUFBO0FBQ0EsaUJBQUEsRUFBQSxJQUFBO0FBQ0EsZUFBQSxFQUFBLE9BQUE7U0FDQTtBQUNBLGFBQUEsRUFBQSxFQUFBO0FBQ0EsYUFBQSxFQUFBLEVBQUE7QUFDQSxhQUFBLEVBQUEsaWtCQUFBO0tBQ0EsQ0FDQSxDQUFBO0FBQ0EsYUFBQSxRQUFBLEdBQUE7QUFDQSxlQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsYUFBQSxDQUFBLENBQUE7S0FDQTs7QUFFQSxhQUFBLFdBQUEsQ0FBQSxFQUFBLEVBQUE7QUFDQSxlQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsYUFBQSxHQUFBLEVBQUEsQ0FBQSxDQUFBO0tBQ0E7O0FBRUEsYUFBQSxVQUFBLENBQUEsSUFBQSxFQUFBO0FBQ0EsZUFBQSxLQUFBLENBQUEsR0FBQSxDQUFBLGFBQUEsRUFBQSxJQUFBLENBQUEsQ0FBQTtLQUNBOztBQUVBLGFBQUEsVUFBQSxDQUFBLElBQUEsRUFBQTtBQUNBLGVBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxhQUFBLEVBQUEsSUFBQSxDQUFBLENBQUE7S0FDQTs7QUFFQSxhQUFBLFVBQUEsQ0FBQSxFQUFBLEVBQUE7QUFDQSxlQUFBLEtBQUEsVUFBQSxDQUFBLGFBQUEsR0FBQSxFQUFBLENBQUEsQ0FBQTtLQUNBOztBQUVBLFdBQUE7QUFDQSxnQkFBQSxFQUFBLFFBQUE7QUFDQSxtQkFBQSxFQUFBLFdBQUE7QUFDQSxrQkFBQSxFQUFBLFVBQUE7QUFDQSxrQkFBQSxFQUFBLFVBQUE7QUFDQSxrQkFBQSxFQUFBLFVBQUE7S0FDQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQ3hEQSxHQUFBLENBQUEsT0FBQSxDQUFBLE9BQUEsRUFBQSxZQUFBOztBQUVBLFFBQUEsVUFBQSxHQUFBLENBQ0E7QUFDQSxjQUFBLEVBQUEsU0FBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsUUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsZ0JBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFNBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFVBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFlBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFVBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLGFBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFVBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLHNCQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxnQ0FBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsU0FBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsU0FBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsTUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsUUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsT0FBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsVUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsU0FBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsTUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsUUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsVUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsV0FBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsT0FBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsa0JBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFVBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLGVBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFVBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFdBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLGFBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFVBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFNBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFVBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFFBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLGVBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFlBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFlBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFVBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLGdCQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxjQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSwwQkFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsTUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsVUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsUUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsT0FBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsY0FBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsYUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsY0FBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsZ0JBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLGNBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFdBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLE9BQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLE1BQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFNBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLGdCQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxVQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxZQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxlQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxXQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxTQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsQ0FDQSxDQUFBOztBQUVBLGFBQUEsU0FBQSxHQUFBO0FBQ0EsZUFBQSxVQUFBLENBQUE7S0FDQTs7QUFFQSxXQUFBO0FBQ0EsaUJBQUEsRUFBQSxTQUFBO0tBQ0EsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7QUN4UEEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLEVBQUEsWUFBQTtBQUNBLFdBQUE7QUFDQSxnQkFBQSxFQUFBLEdBQUE7QUFDQSxtQkFBQSxFQUFBLHlDQUFBO0FBQ0EsYUFBQSxFQUFBO0FBQ0EsbUJBQUEsRUFBQSxHQUFBO1NBQ0E7QUFDQSxrQkFBQSxFQUFBLG9CQUFBLE1BQUEsRUFBQSxFQUNBO0FBQ0EsWUFBQSxFQUFBLGdCQUFBLEVBRUE7S0FDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQ2JBLEdBQUEsQ0FBQSxTQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsWUFBQSxFQUFBO0FBQ0EsV0FBQTtBQUNBLGdCQUFBLEVBQUEsR0FBQTtBQUNBLG1CQUFBLEVBQUEsc0RBQUE7QUFDQSxZQUFBLEVBQUEsY0FBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLEtBQUEsRUFBQTtBQUNBLGlCQUFBLENBQUEsUUFBQSxHQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsdUJBQUEsWUFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTthQUNBLENBQUE7U0FDQTtLQUNBLENBQUE7Q0FDQSxDQUFBLENBQUE7QUNWQSxHQUFBLENBQUEsU0FBQSxDQUFBLFdBQUEsRUFBQSxZQUFBO0FBQ0EsV0FBQTtBQUNBLGdCQUFBLEVBQUEsR0FBQTtBQUNBLG1CQUFBLEVBQUEsaURBQUE7QUFDQSxhQUFBLEVBQUE7QUFDQSxpQkFBQSxFQUFBLEdBQUE7QUFDQSxjQUFBLEVBQUEsR0FBQTtBQUNBLGdCQUFBLEVBQUEsR0FBQTtTQUNBO0FBQ0Esa0JBQUEsRUFBQSxlQUFBOztLQUVBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FBR0EsR0FBQSxDQUFBLFVBQUEsQ0FBQSxlQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUE7QUFDQSxXQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxLQUFBLEdBQUEsRUFBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQ25CQSxHQUFBLENBQUEsU0FBQSxDQUFBLGVBQUEsRUFBQSxZQUFBO0FBQ0EsV0FBQTtBQUNBLGdCQUFBLEVBQUEsR0FBQTtBQUNBLG1CQUFBLEVBQUEseURBQUE7S0FDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBO0FDTEEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxZQUFBLEVBQUEsVUFBQSxXQUFBLEVBQUE7O0FBRUEsV0FBQTtBQUNBLGdCQUFBLEVBQUEsR0FBQTtBQUNBLG1CQUFBLEVBQUEsbURBQUE7QUFDQSxZQUFBLEVBQUEsY0FBQSxLQUFBLEVBQUE7QUFDQSxpQkFBQSxDQUFBLEtBQUEsR0FBQSxXQUFBLENBQUEsY0FBQSxFQUFBLENBQUE7U0FDQTtLQUNBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUNWQSxHQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsRUFBQSxVQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUEsV0FBQSxFQUFBLE1BQUEsRUFBQTs7QUFFQSxXQUFBO0FBQ0EsZ0JBQUEsRUFBQSxHQUFBO0FBQ0EsYUFBQSxFQUFBLEVBQUE7QUFDQSxtQkFBQSxFQUFBLHlDQUFBO0FBQ0EsWUFBQSxFQUFBLGNBQUEsS0FBQSxFQUFBOztBQUVBLGlCQUFBLENBQUEsS0FBQSxHQUFBLENBQ0EsRUFBQSxLQUFBLEVBQUEsTUFBQSxFQUFBLEtBQUEsRUFBQSxNQUFBLEVBQUEsRUFDQSxFQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQSxFQUNBLEVBQUEsS0FBQSxFQUFBLGVBQUEsRUFBQSxLQUFBLEVBQUEsTUFBQSxFQUFBLEVBQ0EsRUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsRUFDQSxFQUFBLEtBQUEsRUFBQSxRQUFBLEVBQUEsS0FBQSxFQUFBLFdBQUEsRUFBQSxFQUNBLEVBQUEsS0FBQSxFQUFBLGNBQUEsRUFBQSxLQUFBLEVBQUEsYUFBQSxFQUFBLElBQUEsRUFBQSxJQUFBLEVBQUEsQ0FDQSxDQUFBOztBQUVBLGlCQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxpQkFBQSxDQUFBLFVBQUEsR0FBQSxZQUFBO0FBQ0EsdUJBQUEsV0FBQSxDQUFBLGVBQUEsRUFBQSxDQUFBO2FBQ0EsQ0FBQTs7QUFFQSxpQkFBQSxDQUFBLE1BQUEsR0FBQSxZQUFBO0FBQ0EsMkJBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQTtBQUNBLDBCQUFBLENBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO2lCQUNBLENBQUEsQ0FBQTthQUNBLENBQUE7O0FBRUEsZ0JBQUEsT0FBQSxHQUFBLFNBQUEsT0FBQSxHQUFBO0FBQ0EsMkJBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSx5QkFBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7aUJBQ0EsQ0FBQSxDQUFBO2FBQ0EsQ0FBQTs7QUFFQSxnQkFBQSxVQUFBLEdBQUEsU0FBQSxVQUFBLEdBQUE7QUFDQSxxQkFBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7YUFDQSxDQUFBOztBQUVBLG1CQUFBLEVBQUEsQ0FBQTs7QUFFQSxzQkFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0Esc0JBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLGFBQUEsRUFBQSxVQUFBLENBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxjQUFBLEVBQUEsVUFBQSxDQUFBLENBQUE7U0FFQTs7S0FFQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQ2hEQSxHQUFBLENBQUEsU0FBQSxDQUFBLFlBQUEsRUFDQSxVQUFBLFNBQUEsRUFBQTs7QUFFQSxXQUFBLFVBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQSxLQUFBLEVBQUE7O0FBRUEsYUFBQSxDQUFBLE9BQUEsR0FBQSxDQUFBLE1BQUEsRUFBQSxNQUFBLEVBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQSxPQUFBLENBQUEsQ0FBQTs7QUFFQSxpQkFBQSxVQUFBLENBQUEsQ0FBQSxFQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTs7QUFFQSxtQkFBQSxDQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7U0FDQTs7QUFFQSxlQUFBLENBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLFlBQUEsUUFBQSxHQUFBLFNBQUEsQ0FBQSxVQUFBLEVBQUEsSUFBQSxDQUFBLENBQUE7Ozs7QUFJQSxlQUFBLENBQUEsRUFBQSxDQUFBLFVBQUEsRUFBQSxZQUFBO0FBQ0EscUJBQUEsQ0FBQSxNQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG53aW5kb3cuYXBwID0gYW5ndWxhci5tb2R1bGUoJ0Z1bGxzdGFja0dlbmVyYXRlZEFwcCcsIFsndWkucm91dGVyJywgJ3VpLmJvb3RzdHJhcCcsICdmc2FQcmVCdWlsdCcsICduZ0ZpbGVVcGxvYWQnLCAnbmdBbmltYXRlJywgJ3RleHRBbmd1bGFyJywgJ3VpR21hcGdvb2dsZS1tYXBzJywgJ25nVGFnc0lucHV0JywgJ3NsaWRlUHVzaE1lbnUnXSk7XG5cbmFwcC5jb25maWcoZnVuY3Rpb24gKCR1cmxSb3V0ZXJQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIpIHtcbiAgICAvLyBUaGlzIHR1cm5zIG9mZiBoYXNoYmFuZyB1cmxzICgvI2Fib3V0KSBhbmQgY2hhbmdlcyBpdCB0byBzb21ldGhpbmcgbm9ybWFsICgvYWJvdXQpXG4gICAgJGxvY2F0aW9uUHJvdmlkZXIuaHRtbDVNb2RlKHRydWUpO1xuICAgIC8vIElmIHdlIGdvIHRvIGEgVVJMIHRoYXQgdWktcm91dGVyIGRvZXNuJ3QgaGF2ZSByZWdpc3RlcmVkLCBnbyB0byB0aGUgXCIvXCIgdXJsLlxuICAgICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoJy8nKTtcbn0pXG4uY29uZmlnKGZ1bmN0aW9uKHVpR21hcEdvb2dsZU1hcEFwaVByb3ZpZGVyKSB7XG4gICAgdWlHbWFwR29vZ2xlTWFwQXBpUHJvdmlkZXIuY29uZmlndXJlKHtcbiAgICAgICAga2V5OiAnQUl6YVN5Q0FmeVhzZVNYVURCUVl3ZnAyaVhyeUQ1QXZDMUo4Mk9nJyxcbiAgICAgICAgdjogJzMuMjAnLCAvL2RlZmF1bHRzIHRvIGxhdGVzdCAzLlggYW55aG93XG4gICAgICAgIGxpYnJhcmllczogJ3dlYXRoZXIsZ2VvbWV0cnksdmlzdWFsaXphdGlvbidcbiAgICB9KTtcbn0pXG5cbi8vIFRoaXMgYXBwLnJ1biBpcyBmb3IgY29udHJvbGxpbmcgYWNjZXNzIHRvIHNwZWNpZmljIHN0YXRlcy5cbmFwcC5ydW4oZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcblxuICAgIC8vIFRoZSBnaXZlbiBzdGF0ZSByZXF1aXJlcyBhbiBhdXRoZW50aWNhdGVkIHVzZXIuXG4gICAgdmFyIGRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGggPSBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmRhdGEgJiYgc3RhdGUuZGF0YS5hdXRoZW50aWNhdGU7XG4gICAgfTtcblxuICAgIC8vICRzdGF0ZUNoYW5nZVN0YXJ0IGlzIGFuIGV2ZW50IGZpcmVkXG4gICAgLy8gd2hlbmV2ZXIgdGhlIHByb2Nlc3Mgb2YgY2hhbmdpbmcgYSBzdGF0ZSBiZWdpbnMuXG4gICAgJHJvb3RTY29wZS4kb24oJyRzdGF0ZUNoYW5nZVN0YXJ0JywgZnVuY3Rpb24gKGV2ZW50LCB0b1N0YXRlLCB0b1BhcmFtcykge1xuXG4gICAgICAgIGlmICghZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCh0b1N0YXRlKSkge1xuICAgICAgICAgICAgLy8gVGhlIGRlc3RpbmF0aW9uIHN0YXRlIGRvZXMgbm90IHJlcXVpcmUgYXV0aGVudGljYXRpb25cbiAgICAgICAgICAgIC8vIFNob3J0IGNpcmN1aXQgd2l0aCByZXR1cm4uXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCkpIHtcbiAgICAgICAgICAgIC8vIFRoZSB1c2VyIGlzIGF1dGhlbnRpY2F0ZWQuXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2FuY2VsIG5hdmlnYXRpbmcgdG8gbmV3IHN0YXRlLlxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgIC8vIElmIGEgdXNlciBpcyByZXRyaWV2ZWQsIHRoZW4gcmVuYXZpZ2F0ZSB0byB0aGUgZGVzdGluYXRpb25cbiAgICAgICAgICAgIC8vICh0aGUgc2Vjb25kIHRpbWUsIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpIHdpbGwgd29yaylcbiAgICAgICAgICAgIC8vIG90aGVyd2lzZSwgaWYgbm8gdXNlciBpcyBsb2dnZWQgaW4sIGdvIHRvIFwibG9naW5cIiBzdGF0ZS5cbiAgICAgICAgICAgIGlmICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKHRvU3RhdGUubmFtZSwgdG9QYXJhbXMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2luJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgfSk7XG5cbn0pO1xuXG5cbmFwcC5jb250cm9sbGVyKCdtYWluQ3RybCcsIGZ1bmN0aW9uKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCBBVVRIX0VWRU5UUywgJHN0YXRlLCAkc2NvcGUpe1xuICAgICRzY29wZS51c2VyID0gbnVsbDtcblxuICAgICRzY29wZS5pc0xvZ2dlZEluID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCk7XG4gICAgfTtcblxuICAgICRzY29wZS5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIEF1dGhTZXJ2aWNlLmxvZ291dCgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHN0YXRlLmdvKCdob21lJyk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICB2YXIgc2V0VXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgJHNjb3BlLnVzZXIgPSB1c2VyO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgdmFyIHJlbW92ZVVzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICRzY29wZS51c2VyID0gbnVsbDtcbiAgICB9O1xuXG4gICAgc2V0VXNlcigpO1xuXG4gICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzLCBzZXRVc2VyKTtcbiAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzLCByZW1vdmVVc2VyKTtcbiAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgcmVtb3ZlVXNlcik7XG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAvLyBSZWdpc3RlciBvdXIgKmFib3V0KiBzdGF0ZS5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnYWJvdXQnLCB7XG4gICAgICAgIHVybDogJy9hYm91dCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdBYm91dENvbnRyb2xsZXInLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2Fib3V0L2Fib3V0Lmh0bWwnXG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignQWJvdXRDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSwgRnVsbHN0YWNrUGljcykge1xuXG4gICAgLy8gSW1hZ2VzIG9mIGJlYXV0aWZ1bCBGdWxsc3RhY2sgcGVvcGxlLlxuICAgICRzY29wZS5pbWFnZXMgPSBfLnNodWZmbGUoRnVsbHN0YWNrUGljcyk7XG5cbn0pOyIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2RvY3MnLCB7XG4gICAgICAgIHVybDogJy9kb2NzJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9kb2NzL2RvY3MuaHRtbCdcbiAgICB9KTtcbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbigkc3RhdGVQcm92aWRlcil7XG4gICAkc3RhdGVQcm92aWRlclxuICAgICAgIC5zdGF0ZSgnZXZlbnRMaXN0Jywge1xuICAgICAgICAgICB1cmw6Jy9ldmVudHMnLFxuICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2V2ZW50L2xpc3QuaHRtbCcsXG4gICAgICAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCRzY29wZSwgdWlHbWFwR29vZ2xlTWFwQXBpKXtcbiAgICAgICAgICAgICAgICRzY29wZS5tYXAgPSB7IGNlbnRlcjogeyBsYXRpdHVkZTogNDAuNzczOTU5LCBsb25naXR1ZGU6IC03My45NzA5NDkgfSwgem9vbTogMTQgfTtcbiAgICAgICAgICAgICAgIHVpR21hcEdvb2dsZU1hcEFwaS50aGVuKGZ1bmN0aW9uKG1hcHMpIHt9KTtcbiAgICAgICAgICAgfVxuICAgICAgIH0pXG4gICAgICAgLnN0YXRlKCdldmVudERldGFpbCcsIHtcbiAgICAgICAgICAgdXJsOicvZXZlbnRzL2RldGFpbC86aWQnLFxuICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2V2ZW50L2RldGFpbC5odG1sJyxcbiAgICAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oJHNjb3BlKXtcbiAgICAgICAgICAgICAgICRzY29wZS5wYWdlPVwiZGV0YWlsXCI7XG4gICAgICAgICAgIH1cbiAgICAgICB9KVxuICAgICAgIC5zdGF0ZSgnZXZlbnRDcmVhdGUnLCB7XG4gICAgICAgICAgIHVybDonL2V2ZW50cy9jcmVhdGUnLFxuICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2V2ZW50L2NyZWF0ZS5odG1sJyxcbiAgICAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oJHNjb3BlKXtcbiAgICAgICAgICAgICAgICRzY29wZS5jcmVhdGUgPSBmdW5jdGlvbihwYXJhKSB7XG4gICAgICAgICAgICAgICAgICAgIGFsZXJ0KHBhcmEpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgIH1cbiAgICAgICB9KVxuICAgICAgIC5zdGF0ZSgnZXZlbnRVcGRhdGUnLCB7XG4gICAgICAgICAgIHVybDonL2V2ZW50cy91cGRhdGUvOmlkJyxcbiAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9ldmVudC91cGRhdGUuaHRtbCcsXG4gICAgICAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCRzY29wZSl7XG4gICAgICAgICAgICAgICAkc2NvcGUudXBkYXRlID0gZnVuY3Rpb24ocGFyYSkge1xuICAgICAgICAgICAgICAgICAgICBhbGVydChwYXJhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgIH1cbiAgICAgICB9KTtcbn0pO1xuIiwiKGZ1bmN0aW9uICgpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8vIEhvcGUgeW91IGRpZG4ndCBmb3JnZXQgQW5ndWxhciEgRHVoLWRveS5cbiAgICBpZiAoIXdpbmRvdy5hbmd1bGFyKSB0aHJvdyBuZXcgRXJyb3IoJ0kgY2FuXFwndCBmaW5kIEFuZ3VsYXIhJyk7XG5cbiAgICB2YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoJ2ZzYVByZUJ1aWx0JywgW10pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ1NvY2tldCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCF3aW5kb3cuaW8pIHRocm93IG5ldyBFcnJvcignc29ja2V0LmlvIG5vdCBmb3VuZCEnKTtcbiAgICAgICAgcmV0dXJuIHdpbmRvdy5pbyh3aW5kb3cubG9jYXRpb24ub3JpZ2luKTtcbiAgICB9KTtcblxuICAgIC8vIEFVVEhfRVZFTlRTIGlzIHVzZWQgdGhyb3VnaG91dCBvdXIgYXBwIHRvXG4gICAgLy8gYnJvYWRjYXN0IGFuZCBsaXN0ZW4gZnJvbSBhbmQgdG8gdGhlICRyb290U2NvcGVcbiAgICAvLyBmb3IgaW1wb3J0YW50IGV2ZW50cyBhYm91dCBhdXRoZW50aWNhdGlvbiBmbG93LlxuICAgIGFwcC5jb25zdGFudCgnQVVUSF9FVkVOVFMnLCB7XG4gICAgICAgIGxvZ2luU3VjY2VzczogJ2F1dGgtbG9naW4tc3VjY2VzcycsXG4gICAgICAgIGxvZ2luRmFpbGVkOiAnYXV0aC1sb2dpbi1mYWlsZWQnLFxuICAgICAgICBsb2dvdXRTdWNjZXNzOiAnYXV0aC1sb2dvdXQtc3VjY2VzcycsXG4gICAgICAgIHNlc3Npb25UaW1lb3V0OiAnYXV0aC1zZXNzaW9uLXRpbWVvdXQnLFxuICAgICAgICBub3RBdXRoZW50aWNhdGVkOiAnYXV0aC1ub3QtYXV0aGVudGljYXRlZCcsXG4gICAgICAgIG5vdEF1dGhvcml6ZWQ6ICdhdXRoLW5vdC1hdXRob3JpemVkJ1xuICAgIH0pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ0F1dGhJbnRlcmNlcHRvcicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkcSwgQVVUSF9FVkVOVFMpIHtcbiAgICAgICAgdmFyIHN0YXR1c0RpY3QgPSB7XG4gICAgICAgICAgICA0MDE6IEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsXG4gICAgICAgICAgICA0MDM6IEFVVEhfRVZFTlRTLm5vdEF1dGhvcml6ZWQsXG4gICAgICAgICAgICA0MTk6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LFxuICAgICAgICAgICAgNDQwOiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dFxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzcG9uc2VFcnJvcjogZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KHN0YXR1c0RpY3RbcmVzcG9uc2Uuc3RhdHVzXSwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UpXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG5cbiAgICBhcHAuY29uZmlnKGZ1bmN0aW9uICgkaHR0cFByb3ZpZGVyKSB7XG4gICAgICAgICRodHRwUHJvdmlkZXIuaW50ZXJjZXB0b3JzLnB1c2goW1xuICAgICAgICAgICAgJyRpbmplY3RvcicsXG4gICAgICAgICAgICBmdW5jdGlvbiAoJGluamVjdG9yKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRpbmplY3Rvci5nZXQoJ0F1dGhJbnRlcmNlcHRvcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICBdKTtcbiAgICB9KTtcblxuICAgIGFwcC5zZXJ2aWNlKCdBdXRoU2VydmljZScsIGZ1bmN0aW9uICgkaHR0cCwgU2Vzc2lvbiwgJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMsICRxKSB7XG5cbiAgICAgICAgZnVuY3Rpb24gb25TdWNjZXNzZnVsTG9naW4ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIHZhciBkYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgIFNlc3Npb24uY3JlYXRlKGRhdGEuaWQsIGRhdGEudXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzKTtcbiAgICAgICAgICAgIHJldHVybiBkYXRhLnVzZXI7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVc2VzIHRoZSBzZXNzaW9uIGZhY3RvcnkgdG8gc2VlIGlmIGFuXG4gICAgICAgIC8vIGF1dGhlbnRpY2F0ZWQgdXNlciBpcyBjdXJyZW50bHkgcmVnaXN0ZXJlZC5cbiAgICAgICAgdGhpcy5pc0F1dGhlbnRpY2F0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gISFTZXNzaW9uLnVzZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5nZXRMb2dnZWRJblVzZXIgPSBmdW5jdGlvbiAoZnJvbVNlcnZlcikge1xuXG4gICAgICAgICAgICAvLyBJZiBhbiBhdXRoZW50aWNhdGVkIHNlc3Npb24gZXhpc3RzLCB3ZVxuICAgICAgICAgICAgLy8gcmV0dXJuIHRoZSB1c2VyIGF0dGFjaGVkIHRvIHRoYXQgc2Vzc2lvblxuICAgICAgICAgICAgLy8gd2l0aCBhIHByb21pc2UuIFRoaXMgZW5zdXJlcyB0aGF0IHdlIGNhblxuICAgICAgICAgICAgLy8gYWx3YXlzIGludGVyZmFjZSB3aXRoIHRoaXMgbWV0aG9kIGFzeW5jaHJvbm91c2x5LlxuXG4gICAgICAgICAgICAvLyBPcHRpb25hbGx5LCBpZiB0cnVlIGlzIGdpdmVuIGFzIHRoZSBmcm9tU2VydmVyIHBhcmFtZXRlcixcbiAgICAgICAgICAgIC8vIHRoZW4gdGhpcyBjYWNoZWQgdmFsdWUgd2lsbCBub3QgYmUgdXNlZC5cblxuICAgICAgICAgICAgaWYgKHRoaXMuaXNBdXRoZW50aWNhdGVkKCkgJiYgZnJvbVNlcnZlciAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAkcS53aGVuKFNlc3Npb24udXNlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE1ha2UgcmVxdWVzdCBHRVQgL3Nlc3Npb24uXG4gICAgICAgICAgICAvLyBJZiBpdCByZXR1cm5zIGEgdXNlciwgY2FsbCBvblN1Y2Nlc3NmdWxMb2dpbiB3aXRoIHRoZSByZXNwb25zZS5cbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSA0MDEgcmVzcG9uc2UsIHdlIGNhdGNoIGl0IGFuZCBpbnN0ZWFkIHJlc29sdmUgdG8gbnVsbC5cbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9zZXNzaW9uJykudGhlbihvblN1Y2Nlc3NmdWxMb2dpbikuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmxvZ2luID0gZnVuY3Rpb24gKGNyZWRlbnRpYWxzKSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2xvZ2luJywgY3JlZGVudGlhbHMpXG4gICAgICAgICAgICAgICAgLnRoZW4ob25TdWNjZXNzZnVsTG9naW4pXG4gICAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdCh7IG1lc3NhZ2U6ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLicgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvbG9nb3V0JykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgU2Vzc2lvbi5kZXN0cm95KCk7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICB9KTtcblxuICAgIGFwcC5zZXJ2aWNlKCdTZXNzaW9uJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEFVVEhfRVZFTlRTKSB7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuaWQgPSBudWxsO1xuICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuXG4gICAgICAgIHRoaXMuY3JlYXRlID0gZnVuY3Rpb24gKHNlc3Npb25JZCwgdXNlcikge1xuICAgICAgICAgICAgdGhpcy5pZCA9IHNlc3Npb25JZDtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IHVzZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5pZCA9IG51bGw7XG4gICAgICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuICAgICAgICB9O1xuXG4gICAgfSk7XG5cbn0pKCk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdob21lJywge1xuICAgICAgICB1cmw6ICcvJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9ob21lL2hvbWUuaHRtbCcsXG4gICAgICBcbiAgICB9KTtcbn0pOyIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbG9naW4nLCB7XG4gICAgICAgIHVybDogJy9sb2dpbicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvbG9naW4vbG9naW4uaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMb2dpbkN0cmwnXG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignTG9naW5DdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSwgVXNlckZhY3RvcnkpIHtcblxuICAgICRzY29wZS5sb2dpbiA9IHt9O1xuICAgICRzY29wZS5lcnJvciA9IG51bGw7XG5cbiAgICAkc2NvcGUuc2VuZExvZ2luID0gZnVuY3Rpb24gKGxvZ2luSW5mbykge1xuXG4gICAgICAgICRzY29wZS5lcnJvciA9IG51bGw7XG5cbiAgICAgICAgQXV0aFNlcnZpY2UubG9naW4obG9naW5JbmZvKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IgPSAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nO1xuICAgICAgICB9KTtcblxuICAgIH07XG5cbiAgICAkc2NvcGUuc2VuZFNpZ251cCA9IGZ1bmN0aW9uKHNpZ251cEluZm8pe1xuICAgICAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuICAgICAgICBVc2VyRmFjdG9yeS5jcmVhdGVVc2VyKHNpZ251cEluZm8pXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIHJldHVybiBBdXRoU2VydmljZS5sb2dpbihzaWdudXBJbmZvKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbihlcnIpe1xuICAgICAgICAgICAgICAgICRzY29wZS5lcnJvciA9IGVycjtcbiAgICAgICAgICAgIH0pXG4gICAgfVxuXG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbWVtYmVyc09ubHknLCB7XG4gICAgICAgIHVybDogJy9tZW1iZXJzLWFyZWEnLFxuICAgICAgICB0ZW1wbGF0ZTogJzxpbWcgbmctcmVwZWF0PVwiaXRlbSBpbiBzdGFzaFwiIHdpZHRoPVwiMzAwXCIgbmctc3JjPVwie3sgaXRlbSB9fVwiIC8+JyxcbiAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24gKCRzY29wZSwgU2VjcmV0U3Rhc2gpIHtcbiAgICAgICAgICAgIFNlY3JldFN0YXNoLmdldFN0YXNoKCkudGhlbihmdW5jdGlvbiAoc3Rhc2gpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuc3Rhc2ggPSBzdGFzaDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICAvLyBUaGUgZm9sbG93aW5nIGRhdGEuYXV0aGVudGljYXRlIGlzIHJlYWQgYnkgYW4gZXZlbnQgbGlzdGVuZXJcbiAgICAgICAgLy8gdGhhdCBjb250cm9scyBhY2Nlc3MgdG8gdGhpcyBzdGF0ZS4gUmVmZXIgdG8gYXBwLmpzLlxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICBhdXRoZW50aWNhdGU6IHRydWVcbiAgICAgICAgfVxuICAgIH0pO1xuXG59KTtcblxuYXBwLmZhY3RvcnkoJ1NlY3JldFN0YXNoJywgZnVuY3Rpb24gKCRodHRwKSB7XG5cbiAgICB2YXIgZ2V0U3Rhc2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvbWVtYmVycy9zZWNyZXQtc3Rhc2gnKS50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBnZXRTdGFzaDogZ2V0U3Rhc2hcbiAgICB9O1xuXG59KTsiLCJhcHAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKXtcbiAgICRzdGF0ZVByb3ZpZGVyXG4gICAgICAgLnN0YXRlKCd1c2VycycsIHtcbiAgICAgICAgICAgdXJsOiAnL3VzZXJzJyxcbiAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy91c2VyL2xpc3QuaHRtbCcsXG4gICAgICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICAgICAgIHVzZXJzOiBmdW5jdGlvbihVc2VyRmFjdG9yeSl7XG4gICAgICAgICAgICAgICAgICAgcmV0dXJuIFVzZXJGYWN0b3J5XG4gICAgICAgICAgICAgICAgICAgICAgIC5nZXRVc2VycygpXG4gICAgICAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlcyl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzLmRhdGE7XG4gICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICB9XG4gICAgICAgICAgIH0sXG4gICAgICAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCRzY29wZSwgdXNlcnMpe1xuICAgICAgICAgICAgICAgICRzY29wZS51c2VycyA9IHVzZXJzO1xuICAgICAgICAgICB9XG4gICAgICAgfSlcbiAgICAgICAuc3RhdGUoJ3VzZXJEZXRhaWwnLCB7XG4gICAgICAgICAgIHVybDogJy91c2Vycy9kZXRhaWwvOmlkJyxcbiAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy91c2VyL3Byb2ZpbGUuaHRtbCcsXG4gICAgICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICAgICAgIHVzZXI6IGZ1bmN0aW9uKFVzZXJGYWN0b3J5LCAkc3RhdGVQYXJhbXMpe1xuICAgICAgICAgICAgICAgICAgIHJldHVybiBVc2VyRmFjdG9yeVxuICAgICAgICAgICAgICAgICAgICAgICAuZ2V0VXNlckJ5SWQoJHN0YXRlUGFyYW1zLmlkKVxuICAgICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihyZXMpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlcy5kYXRhO1xuICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgfVxuICAgICAgICAgICB9LFxuICAgICAgICAgICBjb250cm9sbGVyOiBmdW5jdGlvbigkc2NvcGUsIHVzZXIpe1xuICAgICAgICAgICAgICAgJHNjb3BlLnVzZXIgPSB1c2VyO1xuICAgICAgICAgICB9XG4gICAgICAgfSlcbiAgICAgICAuc3RhdGUoJ3VzZXJFZGl0Jywge1xuICAgICAgICAgICB1cmw6ICcvdXNlcnMvZWRpdC86aWQnLFxuICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3VzZXIvZWRpdC5odG1sJyxcbiAgICAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgICAgIHVzZXI6IGZ1bmN0aW9uKCRzdGF0ZVBhcmFtcywgVXNlckZhY3Rvcnkpe1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gVXNlckZhY3RvcnlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5nZXRVc2VyQnlJZCgkc3RhdGVQYXJhbXMuaWQpXG4gICAgICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihyZXMpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXMuZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzdGF0ZXM6IGZ1bmN0aW9uKFV0aWxzKXtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFV0aWxzLmdldFN0YXRlcygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgfSxcbiAgICAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oJHNjb3BlLCB1c2VyLCBzdGF0ZXMsIFVzZXJGYWN0b3J5LCAkc3RhdGUpe1xuICAgICAgICAgICAgICAgICRzY29wZS51c2VyID0gdXNlcjtcblxuICAgICAgICAgICAgICAgICRzY29wZS5hbGxTdGF0ZXMgPSBzdGF0ZXM7XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUuc2V0U3RhdGUgPSBmdW5jdGlvbihzdGF0ZSl7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS51c2VyLmFkZHJlc3Muc3RhdGUgPSBzdGF0ZTtcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgJHNjb3BlLnVwZGF0ZVVzZXIgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICBVc2VyRmFjdG9yeVxuICAgICAgICAgICAgICAgICAgICAgICAgLnVwZGF0ZVVzZXIoJHNjb3BlLnVzZXIpXG4gICAgICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihyZXMpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd1cGRhdGUgdXNlcicsIHJlcy5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUuZGVsZXRlVXNlciA9IGZ1bmN0aW9uKGlkKXtcbiAgICAgICAgICAgICAgICAgICAgVXNlckZhY3RvcnkucmVtb3ZlVXNlcihpZClcbiAgICAgICAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlcyl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYocmVzLmRhdGEub2spe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICB9XG4gICAgICAgfSk7XG59KTtcbiIsImFwcC5mYWN0b3J5KCdFdmVudEZhY3RvcnknLCBmdW5jdGlvbigpe1xuXHR2YXIgZGVmYXVsdEltYWdlcyA9IHtcblx0XHRiYXNrZXRiYWxsOiAnaHR0cDovL2Rlc2lnbnlvdXRydXN0LmNvbS93cC1jb250ZW50L3VwbG9hZHMvMjAxNC8wMS9UaGlzX0dhbWVfV2VfUGxheV9OWUNfQmFza2V0YmFsbF9Db3VydHNfYnlfRnJhbmNrLV9Cb2hib3RfMjAxNF8wMy5qcGcnLFxuXHRcdGNsaW1iaW5nOiAnaHR0cDovL3d3dy5nbGFwcGl0bm92YS5jb20vd3AtY29udGVudC91cGxvYWRzLzIwMTUvMDcvQktCQ2hpY2Fnby1Tb3V0aC1CdWlsZGluZy1DbGltYmluZy1XYWxsLmpwZycsXG5cdFx0c29jY2VyOiAnaHR0cDovL3d3dzMucGljdHVyZXMuemltYmlvLmNvbS9naS9OZXcrWW9yaytSZWQrQnVsbHMrTWF5b3IrQmxvb21iZXJnK09wZW4rTmV3K0Y5Wm8yV29QN2ctbC5qcGcnLFxuXHRcdGJhc2ViYWxsOiAnaHR0cDovL3d3dy5zdWl0Y2FzZWdldGF3YXlzLmNvbS93cC1jb250ZW50L3VwbG9hZHMvMjAxNC8wOC9OWUMtQ2VudHJhbC1QYXJrLUhlY2tzY2hlci1CYWxsRmllbGRzLVNvdXRoLUVuZC05Mjk2LTE0LTEwMzB4Njg2LmpwZycsXG4gXHRcdGZvb3RiYWxsOiAnaHR0cDovL3d3dy5wc2FsLm9yZy9pbWFnZXMvQXJ0aWNsZXMvMjAxNS8yMDE1MDcyMzEwNTkwMzU5MDguanBnJyxcbiBcdFx0bGlmdGluZzogJ2h0dHBzOi8vZW5jcnlwdGVkLXRibjAuZ3N0YXRpYy5jb20vaW1hZ2VzP3E9dGJuOkFOZDlHY1JFNjVRQUluWHBISnVVbUNaMzdYbGY1UnN4SnR3ZXFXQXVld01VTWtkaDR5LXY2c041VzVETkJJZycsXG5cdFx0c2tpaW5nOiAnaHR0cDovL3d3dy5ob21lLWh1bnRzLm5ldC93cC1jb250ZW50L3VwbG9hZHMvMjAxNS8wMS9DYXV0ZXJldHMtc2tpaW5nLmpwZycsXG5cdFx0bW91bnRhaW5iaWtpbmc6ICdodHRwOi8vZmlubm9oYXJhLmNvbS9ibG9nL3dwLWNvbnRlbnQvdXBsb2Fkcy8wMDAwX0ZPX0FUSExFVEVTXzk2MV8xY19SR0IuanBnJyxcblx0XHRzdXJmaW5nOiAnaHR0cHM6Ly9lbmNyeXB0ZWQtdGJuMy5nc3RhdGljLmNvbS9pbWFnZXM/cT10Ym46QU5kOUdjUmN4U0lIb2JMdmdYTWd5NmcwdTF5WGpxOXRIN2VjT0wwM1ZDVklobWYtNV9rOXZFSkMnLFxuXHRcdGN5Y2xpbmc6ICdodHRwOi8vd3d3Lm1zbmJjLmNvbS9zaXRlcy9tc25iYy9maWxlcy8yMDEzLzA1L2FwMDIwNTA1MDIyNTdfMS5qcGcnXG5cdH1cblxuXHRyZXR1cm4ge1xuXHRcdGdldFVybDogZnVuY3Rpb24odHlwZSkge1xuXHRcdFx0cmV0dXJuIGRlZmF1bHRJbWFnZXNbdHlwZV07XG5cdFx0fVxuXHR9XG59KSIsImFwcC5mYWN0b3J5KCdGdWxsc3RhY2tQaWNzJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjdnQlh1bENBQUFYUWNFLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL2ZiY2RuLXNwaG90b3MtYy1hLmFrYW1haWhkLm5ldC9ocGhvdG9zLWFrLXhhcDEvdDMxLjAtOC8xMDg2MjQ1MV8xMDIwNTYyMjk5MDM1OTI0MV84MDI3MTY4ODQzMzEyODQxMTM3X28uanBnJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CLUxLVXNoSWdBRXk5U0suanBnJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CNzktWDdvQ01BQWt3N3kuanBnJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CLVVqOUNPSUlBSUZBaDAuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CNnlJeUZpQ0VBQXFsMTIuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DRS1UNzVsV0FBQW1xcUouanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DRXZaQWctVkFBQWs5MzIuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DRWdOTWVPWElBSWZEaEsuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DRVF5SUROV2dBQXU2MEIuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DQ0YzVDVRVzhBRTJsR0ouanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DQWVWdzVTV29BQUFMc2ouanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DQWFKSVA3VWtBQWxJR3MuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DQVFPdzlsV0VBQVk5RmwuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CLU9RYlZyQ01BQU53SU0uanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9COWJfZXJ3Q1lBQXdSY0oucG5nOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CNVBUZHZuQ2NBRUFsNHguanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CNHF3QzBpQ1lBQWxQR2guanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CMmIzM3ZSSVVBQTlvMUQuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9Cd3BJd3IxSVVBQXZPMl8uanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9Cc1NzZUFOQ1lBRU9oTHcuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DSjR2TGZ1VXdBQWRhNEwuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DSTd3empFVkVBQU9QcFMuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DSWRIdlQyVXNBQW5uSFYuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DR0NpUF9ZV1lBQW83NVYuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DSVM0SlBJV0lBSTM3cXUuanBnOmxhcmdlJ1xuICAgIF07XG59KTtcbiIsImFwcC5mYWN0b3J5KCdPbmVFdmVudCcsIGZ1bmN0aW9uICgpIHtcblxuICAgIHJldHVybiB7XG4gICAgICAgIG5hbWU6IFwic2thdGluZ1wiLFxuICAgICAgICB0YWdzOlwiaWNlXCIsXG4gICAgICAgIG51bU9mUGVvcGxlOjIsXG4gICAgICAgIGRhdGU6XCIxMS8yMy8yMDE1XCIsXG4gICAgICAgIHRpbWU6XCI3OjAwXCIsXG4gICAgICAgIGZlZVBlclBlcnNvbjo1LFxuICAgICAgICBsb2NhdGlvbjpcImNlbnRyYWwgUGFya1wiLFxuICAgICAgICBkZXNjcmlwdGlvbjogXCJOaWNlIHBsYWNlXCJcbiAgICB9O1xuXG59KTtcbiIsImFwcC5mYWN0b3J5KCdSYW5kb21Nb3R0bycsIGZ1bmN0aW9uICgpIHtcblxuICAgIHZhciBnZXRSYW5kb21Gcm9tQXJyYXkgPSBmdW5jdGlvbiAoYXJyKSB7XG4gICAgICAgIHJldHVybiBhcnJbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogYXJyLmxlbmd0aCldO1xuICAgIH07XG5cbiAgICB2YXIgbW90dG8gPSBbXG4gICAgICAgICdTcG9ydCB1cCEnLFxuICAgICAgICAndGVhbXdvcmsgbWFrZXMgdGhlIGRyZWFtIHdvcmsnLFxuICAgICAgICAnSGVsbG8sIHNpbXBsZSBodW1hbi4nLFxuICAgICAgICAnV2hhdCBhIGJlYXV0aWZ1bCBkYXkhTGV0XFwncyB3b3JrIG91dCEnLFxuICAgICAgICAn55Sf5ZG95Zyo5LqO6L+Q5YqoJyxcbiAgICAgICAgJ0xpZmUgaXMgc2hvcnQsIFBsYXkgSGFyZCEnLFxuICAgICAgICAnVG9nZXRoZXIgRXZlcnlvbmUgQWNoaWV2ZXMgTW9yZS4nLFxuICAgICAgICAnVW5pdGVkIHdlIHBsYXkuIFVuaXRlZCB3ZSB3aW4uJyxcbiAgICAgICAgJ1lvdSBtYXkgYmUgc3Ryb25nLCBidXQgd2UgYXJlIHN0cm9uZ2VyLidcbiAgICBdO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgbW90dG86IG1vdHRvLFxuICAgICAgICBnZXRSYW5kb21Nb3R0bzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGdldFJhbmRvbUZyb21BcnJheShtb3R0byk7XG4gICAgICAgIH1cbiAgICB9O1xuXG59KTtcbiIsImFwcC5mYWN0b3J5KCdVc2VyRmFjdG9yeScsIGZ1bmN0aW9uKCRodHRwKXtcblxuXG4gICAgdmFyIHVzZXJzID0gW1xuICAgICAgICB7XG4gICAgICAgICAgICB1c2VyTmFtZTogJ1N0ZXdlZScsXG4gICAgICAgICAgICBmaXJzdE5hbWU6ICdTdGV3YXJ0JyxcbiAgICAgICAgICAgIGxhc3ROYW1lOiAnR3JpZmZpbicsXG4gICAgICAgICAgICBnZW5kZXI6ICdNJyxcbiAgICAgICAgICAgIGVtYWlsOiAnbWluZ2ppZUBmc2EuY29tJyxcbiAgICAgICAgICAgIGJpcnRoOiB7XG4gICAgICAgICAgICAgICAgZGF5OiAnMTUnLFxuICAgICAgICAgICAgICAgIG1vbnRoOiAnMDYnLFxuICAgICAgICAgICAgICAgIHllYXI6ICcyMDEwJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG1vdHRvOiAnTGl0dGxlIEFzc2hvbGQnLFxuICAgICAgICAgICAgYWRkcmVzczoge1xuICAgICAgICAgICAgICAgIGFkZHJlc3MxOiAnMzIxIGJyb2Fkd2F5JyxcbiAgICAgICAgICAgICAgICBhZGRyZXNzMjogJ2FwdCA0YycsXG4gICAgICAgICAgICAgICAgY2l0eTogJ25ldyB5b3JrJyxcbiAgICAgICAgICAgICAgICBzdGF0ZTogJ05ZJyxcbiAgICAgICAgICAgICAgICB6aXA6ICcxMTIyOSdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsaW5rczogW10sXG4gICAgICAgICAgICBpbWFnZTogJycsXG4gICAgICAgICAgICBhYm91dDogJ0xvcmVtIElwc3VtIGlzIHNpbXBseSBkdW1teSB0ZXh0IG9mIHRoZSBwcmludGluZyBhbmQgdHlwZXNldHRpbmcgaW5kdXN0cnkuIExvcmVtIElwc3VtIGhhcyBiZWVuIHRoZSBpbmR1c3RyeVxcJ3Mgc3RhbmRhcmQgZHVtbXkgdGV4dCBldmVyIHNpbmNlIHRoZSAxNTAwcywgd2hlbiBhbiB1bmtub3duIHByaW50ZXIgdG9vayBhIGdhbGxleSBvZiB0eXBlIGFuZCBzY3JhbWJsZWQgaXQgdG8gbWFrZSBhIHR5cGUgc3BlY2ltZW4gYm9vay4gSXQgaGFzIHN1cnZpdmVkIG5vdCBvbmx5IGZpdmUgY2VudHVyaWVzLCBidXQgYWxzbyB0aGUgbGVhcCBpbnRvIGVsZWN0cm9uaWMgdHlwZXNldHRpbmcsIHJlbWFpbmluZyBlc3NlbnRpYWxseSB1bmNoYW5nZWQuIEl0IHdhcyBwb3B1bGFyaXNlZCBpbiB0aGUgMTk2MHMgd2l0aCB0aGUgcmVsZWFzZSBvZiBMZXRyYXNldCBzaGVldHMgY29udGFpbmluZyBMb3JlbSBJcHN1bSBwYXNzYWdlcywgYW5kIG1vcmUgcmVjZW50bHkgd2l0aCBkZXNrdG9wIHB1Ymxpc2hpbmcgc29mdHdhcmUgbGlrZSBBbGR1cyBQYWdlTWFrZXIgaW5jbHVkaW5nIHZlcnNpb25zIG9mIExvcmVtIElwc3VtLidcbiAgICAgICAgfVxuICAgIF07XG4gICAgZnVuY3Rpb24gZ2V0VXNlcnMoKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvdXNlcnMvJyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0VXNlckJ5SWQoaWQpe1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL3VzZXJzLycgKyBpZCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdXBkYXRlVXNlcih1c2VyKXtcbiAgICAgICAgcmV0dXJuICRodHRwLnB1dCgnL2FwaS91c2Vycy8nLCB1c2VyKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVVc2VyKHVzZXIpe1xuICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2FwaS91c2Vycy8nLCB1c2VyKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZW1vdmVVc2VyKGlkKXtcbiAgICAgICAgcmV0dXJuICRodHRwLmRlbGV0ZSgnL2FwaS91c2Vycy8nK2lkKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBnZXRVc2VyczogZ2V0VXNlcnMsXG4gICAgICAgIGdldFVzZXJCeUlkOiBnZXRVc2VyQnlJZCxcbiAgICAgICAgdXBkYXRlVXNlcjogdXBkYXRlVXNlcixcbiAgICAgICAgY3JlYXRlVXNlcjogY3JlYXRlVXNlcixcbiAgICAgICAgcmVtb3ZlVXNlcjogcmVtb3ZlVXNlclxuICAgIH1cblxufSk7XG4iLCJhcHAuZmFjdG9yeSgnVXRpbHMnLCBmdW5jdGlvbigpe1xuXG4gICAgdmFyIHN0YXRlX2hhc2ggPSAgW1xuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJBbGFiYW1hXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIkFMXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiQWxhc2thXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIkFLXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiQW1lcmljYW4gU2Ftb2FcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiQVNcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJBcml6b25hXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIkFaXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiQXJrYW5zYXNcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiQVJcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJDYWxpZm9ybmlhXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIkNBXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiQ29sb3JhZG9cIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiQ09cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJDb25uZWN0aWN1dFwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJDVFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkRlbGF3YXJlXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIkRFXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiRGlzdHJpY3QgT2YgQ29sdW1iaWFcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiRENcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJGZWRlcmF0ZWQgU3RhdGVzIE9mIE1pY3JvbmVzaWFcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiRk1cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJGbG9yaWRhXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIkZMXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiR2VvcmdpYVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJHQVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkd1YW1cIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiR1VcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJIYXdhaWlcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiSElcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJJZGFob1wiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJJRFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIklsbGlub2lzXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIklMXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiSW5kaWFuYVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJJTlwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIklvd2FcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiSUFcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJLYW5zYXNcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiS1NcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJLZW50dWNreVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJLWVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkxvdWlzaWFuYVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJMQVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIk1haW5lXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIk1FXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiTWFyc2hhbGwgSXNsYW5kc1wiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJNSFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIk1hcnlsYW5kXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIk1EXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiTWFzc2FjaHVzZXR0c1wiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJNQVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIk1pY2hpZ2FuXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIk1JXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiTWlubmVzb3RhXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIk1OXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiTWlzc2lzc2lwcGlcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiTVNcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJNaXNzb3VyaVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJNT1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIk1vbnRhbmFcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiTVRcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJOZWJyYXNrYVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJORVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIk5ldmFkYVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJOVlwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIk5ldyBIYW1wc2hpcmVcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiTkhcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJOZXcgSmVyc2V5XCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIk5KXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiTmV3IE1leGljb1wiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJOTVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIk5ldyBZb3JrXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIk5ZXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiTm9ydGggQ2Fyb2xpbmFcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiTkNcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJOb3J0aCBEYWtvdGFcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiTkRcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJOb3J0aGVybiBNYXJpYW5hIElzbGFuZHNcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiTVBcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJPaGlvXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIk9IXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiT2tsYWhvbWFcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiT0tcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJPcmVnb25cIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiT1JcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJQYWxhdVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJQV1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIlBlbm5zeWx2YW5pYVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJQQVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIlB1ZXJ0byBSaWNvXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIlBSXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiUmhvZGUgSXNsYW5kXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIlJJXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiU291dGggQ2Fyb2xpbmFcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiU0NcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJTb3V0aCBEYWtvdGFcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiU0RcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJUZW5uZXNzZWVcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiVE5cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJUZXhhc1wiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJUWFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIlV0YWhcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiVVRcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJWZXJtb250XCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIlZUXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiVmlyZ2luIElzbGFuZHNcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiVklcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJWaXJnaW5pYVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJWQVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIldhc2hpbmd0b25cIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiV0FcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJXZXN0IFZpcmdpbmlhXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIldWXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiV2lzY29uc2luXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIldJXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiV3lvbWluZ1wiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJXWVwiXG4gICAgICAgIH1cbiAgICBdO1xuXG4gICAgZnVuY3Rpb24gZ2V0U3RhdGVzKCl7XG4gICAgICAgIHJldHVybiBzdGF0ZV9oYXNoO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIGdldFN0YXRlczogZ2V0U3RhdGVzXG4gICAgfVxufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCdlZGl0b3InLCBmdW5jdGlvbigpe1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvZWRpdG9yL2VkaXRvci5odG1sJyxcbiAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgIGNvbnRlbnQ6ICc9J1xuICAgICAgICB9LFxuICAgICAgICBjb250cm9sbGVyOiBmdW5jdGlvbigkc2NvcGUpe1xuICAgICAgICB9LFxuICAgICAgICBsaW5rOiBmdW5jdGlvbigpe1xuXG4gICAgICAgIH1cbiAgICB9O1xufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCdldmVudERldGFpbCcsIGZ1bmN0aW9uKEV2ZW50RmFjdG9yeSkge1xuXHRyZXR1cm4ge1xuXHRcdHJlc3RyaWN0OiAnRScsXG5cdFx0dGVtcGxhdGVVcmw6ICcvanMvY29tbW9uL2RpcmVjdGl2ZXMvZXZlbnQtZGV0YWlsL2V2ZW50LWRldGFpbC5odG1sJywgXG5cdFx0bGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzKXtcblx0XHRcdHNjb3BlLmdldEltYWdlID0gZnVuY3Rpb24odHlwZSkge1xuXHRcdFx0XHRyZXR1cm4gRXZlbnRGYWN0b3J5LmdldFVybCh0eXBlKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cbn0pOyIsImFwcC5kaXJlY3RpdmUoJ2V2ZW50Rm9ybScsZnVuY3Rpb24oKXtcblx0cmV0dXJuIHtcblx0XHRyZXN0cmljdDonRScsXG5cdFx0dGVtcGxhdGVVcmw6J2pzL2NvbW1vbi9kaXJlY3RpdmVzL2V2ZW50LWZvcm0vZXZlbnQtZm9ybS5odG1sJyxcblx0XHRzY29wZTp7XG5cdFx0XHRldmVudDpcIj1cIixcblx0XHRcdGZuOlwiJlwiLFxuXHRcdFx0dHlwZTonQCdcblx0XHR9LFxuXHRcdGNvbnRyb2xsZXI6J2V2ZW50Rm9ybUN0cmwnXG5cblx0fTtcbn0pO1xuXG5cbmFwcC5jb250cm9sbGVyKCdldmVudEZvcm1DdHJsJywgZnVuY3Rpb24gKCRzY29wZSkge1xuXHRjb25zb2xlLmxvZygkc2NvcGUudHlwZSk7XG4gICAgJHNjb3BlLmV2ZW50ID0ge307XG5cbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgnZnVsbHN0YWNrTG9nbycsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL2Z1bGxzdGFjay1sb2dvL2Z1bGxzdGFjay1sb2dvLmh0bWwnXG4gICAgfTtcbn0pOyIsImFwcC5kaXJlY3RpdmUoJ3JhbmRvTW90dG8nLCBmdW5jdGlvbiAoUmFuZG9tTW90dG8pIHtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvcmFuZG8tbW90dG8vcmFuZG8tbW90dG8uaHRtbCcsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSkge1xuICAgICAgICAgICAgc2NvcGUubW90dG8gPSBSYW5kb21Nb3R0by5nZXRSYW5kb21Nb3R0bygpO1xuICAgICAgICB9XG4gICAgfTtcblxufSk7IiwiYXBwLmRpcmVjdGl2ZSgnbmF2YmFyJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCBBVVRIX0VWRU5UUywgJHN0YXRlKSB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICBzY29wZToge30sXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5odG1sJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlKSB7XG5cbiAgICAgICAgICAgIHNjb3BlLml0ZW1zID0gW1xuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdIb21lJywgc3RhdGU6ICdob21lJyB9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdBYm91dCcsIHN0YXRlOiAnYWJvdXQnIH0sXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ0RvY3VtZW50YXRpb24nLCBzdGF0ZTogJ2RvY3MnIH0sXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ1VzZXJzJywgc3RhdGU6ICd1c2Vycyd9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdFdmVudHMnLCBzdGF0ZTogJ2V2ZW50TGlzdCd9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdNZW1iZXJzIE9ubHknLCBzdGF0ZTogJ21lbWJlcnNPbmx5JywgYXV0aDogdHJ1ZSB9XG4gICAgICAgICAgICBdO1xuXG4gICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcblxuICAgICAgICAgICAgc2NvcGUuaXNMb2dnZWRJbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzY29wZS5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UubG9nb3V0KCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdob21lJyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgc2V0VXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnVzZXIgPSB1c2VyO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIHJlbW92ZVVzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2NvcGUudXNlciA9IG51bGw7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzZXRVc2VyKCk7XG5cbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcywgc2V0VXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzLCByZW1vdmVVc2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LCByZW1vdmVVc2VyKTtcblxuICAgICAgICB9XG5cbiAgICB9O1xuXG59KTtcbiIsIlxuYXBwLmRpcmVjdGl2ZSgncm90YXRlVGV4dCcsXG4gICAgZnVuY3Rpb24oJGludGVydmFsKSB7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xuXG4gICAgICAgICAgICBzY29wZS53b3JkQXJyPVsnU3dpbScsJ1RlYW0nLCAnR3ltJywgJ0NsaW1iJywgJ1Nwb3J0J107XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIHVwZGF0ZVdvcmQoaSkge1xuICAgICAgICAgICAgICAgIHZhciBqPShpKzEpJTU7IC8vKGkrMSkgdG8gc3RhcnQgYXQgc2Vjb25kIHdvcmRcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKGopO1xuICAgICAgICAgICAgICAgIGVsZW1lbnQudGV4dChzY29wZS53b3JkQXJyW2pdKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZWxlbWVudC50ZXh0KHNjb3BlLndvcmRBcnJbMF0pOyAvL2Rpc3BsYXlzIFwiZnVuXCJcbiAgICAgICAgICAgIHZhciBzdG9wV29yZCA9ICRpbnRlcnZhbCh1cGRhdGVXb3JkLCAyMDAwKTsgLy9zdGFydCByb3RhdGluZyAxIHNlY29uZCBhZnRlciwgY2hhbmdlcyBldmVyeSBzZWNcblxuICAgICAgICAgICAgLy8gbGlzdGVuIG9uIERPTSBkZXN0cm95IChyZW1vdmFsKSBldmVudFxuICAgICAgICAgICAgLy8gdG8gcHJldmVudCB1cGRhdGluZyB3b3JkIGFmdGVyIHRoZSBET00gZWxlbWVudCB3YXMgcmVtb3ZlZC5cbiAgICAgICAgICAgIGVsZW1lbnQub24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgJGludGVydmFsLmNhbmNlbChzdG9wV29yZCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
