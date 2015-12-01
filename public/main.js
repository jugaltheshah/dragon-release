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
                    $state.go('userDetail', { id: res.data._id });
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

app.directive('flippy', function () {
    return {
        restrict: 'EA',
        link: function link($scope, $elem, $attrs) {

            var options = {
                flipDuration: $attrs.flipDuration ? $attrs.flipDuration : 400,
                timingFunction: 'ease-in-out'
            };

            // setting flip options
            angular.forEach(['flippy-front', 'flippy-back'], function (name) {
                var el = $elem.find(name);
                if (el.length == 1) {
                    angular.forEach(['', '-ms-', '-webkit-'], function (prefix) {
                        angular.element(el[0]).css(prefix + 'transition', 'all ' + options.flipDuration / 1000 + 's ' + options.timingFunction);
                    });
                }
            });

            /**
             * behaviour for flipping effect.
             */
            $scope.flip = function () {
                $elem.toggleClass('flipped');
            };
        }
    };
});

app.directive('fullstackLogo', function () {
    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/fullstack-logo/fullstack-logo.html'
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

app.directive('randoMotto', function (RandomMotto) {

    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/rando-motto/rando-motto.html',
        link: function link(scope) {
            scope.motto = RandomMotto.getRandomMotto();
        }
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFib3V0L2Fib3V0LmpzIiwiZG9jcy9kb2NzLmpzIiwiZnNhL2ZzYS1wcmUtYnVpbHQuanMiLCJldmVudC9ldmVudC5qcyIsImhvbWUvaG9tZS5qcyIsImxvZ2luL2xvZ2luLmpzIiwibWVtYmVycy1vbmx5L21lbWJlcnMtb25seS5qcyIsInVzZXIvdXNlci5qcyIsImNvbW1vbi9mYWN0b3JpZXMvRXZlbnRGYWN0b3J5LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9GdWxsc3RhY2tQaWNzLmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9PbmVFdmVudC5qcyIsImNvbW1vbi9mYWN0b3JpZXMvUmFuZG9tTW90dG8uanMiLCJjb21tb24vZmFjdG9yaWVzL1VzZXJGYWN0b3J5LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9VdGlsRmFjdG9yeS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL2VkaXRvci9lZGl0b3IuanMiLCJjb21tb24vZGlyZWN0aXZlcy9ldmVudC1kZXRhaWwvZXZlbnQtZGV0YWlsLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvZXZlbnQtZm9ybS9ldmVudC1mb3JtLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvZmxpcC1jYXJkL2ZsaXAtY2FyZC5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL2Z1bGxzdGFjay1sb2dvL2Z1bGxzdGFjay1sb2dvLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3RleHQtcm90YXRlL3RleHQtcm90YXRlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvcmFuZG8tbW90dG8vcmFuZG8tbW90dG8uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsWUFBQSxDQUFBO0FBQ0EsTUFBQSxDQUFBLEdBQUEsR0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLHVCQUFBLEVBQUEsQ0FBQSxXQUFBLEVBQUEsY0FBQSxFQUFBLGFBQUEsRUFBQSxjQUFBLEVBQUEsV0FBQSxFQUFBLGFBQUEsRUFBQSxtQkFBQSxFQUFBLGFBQUEsRUFBQSxlQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxrQkFBQSxFQUFBLGlCQUFBLEVBQUE7O0FBRUEscUJBQUEsQ0FBQSxTQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7O0FBRUEsc0JBQUEsQ0FBQSxTQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7Q0FDQSxDQUFBLENBQ0EsTUFBQSxDQUFBLFVBQUEsMEJBQUEsRUFBQTtBQUNBLDhCQUFBLENBQUEsU0FBQSxDQUFBO0FBQ0EsV0FBQSxFQUFBLHlDQUFBO0FBQ0EsU0FBQSxFQUFBLE1BQUE7QUFDQSxpQkFBQSxFQUFBLGdDQUFBO0tBQ0EsQ0FBQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOzs7QUFHQSxHQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsVUFBQSxFQUFBLFdBQUEsRUFBQSxNQUFBLEVBQUE7OztBQUdBLFFBQUEsNEJBQUEsR0FBQSxTQUFBLDRCQUFBLENBQUEsS0FBQSxFQUFBO0FBQ0EsZUFBQSxLQUFBLENBQUEsSUFBQSxJQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQSxDQUFBO0tBQ0EsQ0FBQTs7OztBQUlBLGNBQUEsQ0FBQSxHQUFBLENBQUEsbUJBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsUUFBQSxFQUFBOztBQUVBLFlBQUEsQ0FBQSw0QkFBQSxDQUFBLE9BQUEsQ0FBQSxFQUFBOzs7QUFHQSxtQkFBQTtTQUNBOztBQUVBLFlBQUEsV0FBQSxDQUFBLGVBQUEsRUFBQSxFQUFBOzs7QUFHQSxtQkFBQTtTQUNBOzs7QUFHQSxhQUFBLENBQUEsY0FBQSxFQUFBLENBQUE7O0FBRUEsbUJBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7Ozs7QUFJQSxnQkFBQSxJQUFBLEVBQUE7QUFDQSxzQkFBQSxDQUFBLEVBQUEsQ0FBQSxPQUFBLENBQUEsSUFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO2FBQ0EsTUFBQTtBQUNBLHNCQUFBLENBQUEsRUFBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBO2FBQ0E7U0FDQSxDQUFBLENBQUE7S0FFQSxDQUFBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FBR0EsR0FBQSxDQUFBLFVBQUEsQ0FBQSxVQUFBLEVBQUEsVUFBQSxVQUFBLEVBQUEsV0FBQSxFQUFBLFdBQUEsRUFBQSxNQUFBLEVBQUEsTUFBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLFVBQUEsR0FBQSxZQUFBO0FBQ0EsZUFBQSxXQUFBLENBQUEsZUFBQSxFQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxNQUFBLEdBQUEsWUFBQTtBQUNBLG1CQUFBLENBQUEsTUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFlBQUE7QUFDQSxrQkFBQSxDQUFBLEVBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsUUFBQSxPQUFBLEdBQUEsU0FBQSxPQUFBLEdBQUE7QUFDQSxtQkFBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLGtCQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsUUFBQSxVQUFBLEdBQUEsU0FBQSxVQUFBLEdBQUE7QUFDQSxjQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsV0FBQSxFQUFBLENBQUE7O0FBRUEsY0FBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0EsY0FBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsQ0FBQSxDQUFBO0FBQ0EsY0FBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsY0FBQSxFQUFBLFVBQUEsQ0FBQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQ3hGQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBOzs7QUFHQSxrQkFBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLEVBQUE7QUFDQSxXQUFBLEVBQUEsUUFBQTtBQUNBLGtCQUFBLEVBQUEsaUJBQUE7QUFDQSxtQkFBQSxFQUFBLHFCQUFBO0tBQ0EsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxVQUFBLENBQUEsaUJBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxhQUFBLEVBQUE7OztBQUdBLFVBQUEsQ0FBQSxNQUFBLEdBQUEsQ0FBQSxDQUFBLE9BQUEsQ0FBQSxhQUFBLENBQUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTtBQ2hCQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLE9BQUE7QUFDQSxtQkFBQSxFQUFBLG1CQUFBO0tBQ0EsQ0FBQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQ0xBLENBQUEsWUFBQTs7QUFFQSxnQkFBQSxDQUFBOzs7QUFHQSxRQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsRUFBQSxNQUFBLElBQUEsS0FBQSxDQUFBLHdCQUFBLENBQUEsQ0FBQTs7QUFFQSxRQUFBLEdBQUEsR0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLGFBQUEsRUFBQSxFQUFBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsT0FBQSxDQUFBLFFBQUEsRUFBQSxZQUFBO0FBQ0EsWUFBQSxDQUFBLE1BQUEsQ0FBQSxFQUFBLEVBQUEsTUFBQSxJQUFBLEtBQUEsQ0FBQSxzQkFBQSxDQUFBLENBQUE7QUFDQSxlQUFBLE1BQUEsQ0FBQSxFQUFBLENBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtLQUNBLENBQUEsQ0FBQTs7Ozs7QUFLQSxPQUFBLENBQUEsUUFBQSxDQUFBLGFBQUEsRUFBQTtBQUNBLG9CQUFBLEVBQUEsb0JBQUE7QUFDQSxtQkFBQSxFQUFBLG1CQUFBO0FBQ0EscUJBQUEsRUFBQSxxQkFBQTtBQUNBLHNCQUFBLEVBQUEsc0JBQUE7QUFDQSx3QkFBQSxFQUFBLHdCQUFBO0FBQ0EscUJBQUEsRUFBQSxxQkFBQTtLQUNBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsT0FBQSxDQUFBLGlCQUFBLEVBQUEsVUFBQSxVQUFBLEVBQUEsRUFBQSxFQUFBLFdBQUEsRUFBQTtBQUNBLFlBQUEsVUFBQSxHQUFBO0FBQ0EsZUFBQSxFQUFBLFdBQUEsQ0FBQSxnQkFBQTtBQUNBLGVBQUEsRUFBQSxXQUFBLENBQUEsYUFBQTtBQUNBLGVBQUEsRUFBQSxXQUFBLENBQUEsY0FBQTtBQUNBLGVBQUEsRUFBQSxXQUFBLENBQUEsY0FBQTtTQUNBLENBQUE7QUFDQSxlQUFBO0FBQ0EseUJBQUEsRUFBQSx1QkFBQSxRQUFBLEVBQUE7QUFDQSwwQkFBQSxDQUFBLFVBQUEsQ0FBQSxVQUFBLENBQUEsUUFBQSxDQUFBLE1BQUEsQ0FBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsdUJBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTthQUNBO1NBQ0EsQ0FBQTtLQUNBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsYUFBQSxFQUFBO0FBQ0EscUJBQUEsQ0FBQSxZQUFBLENBQUEsSUFBQSxDQUFBLENBQ0EsV0FBQSxFQUNBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsbUJBQUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxpQkFBQSxDQUFBLENBQUE7U0FDQSxDQUNBLENBQUEsQ0FBQTtLQUNBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsT0FBQSxDQUFBLGFBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsVUFBQSxFQUFBLFdBQUEsRUFBQSxFQUFBLEVBQUE7O0FBRUEsaUJBQUEsaUJBQUEsQ0FBQSxRQUFBLEVBQUE7QUFDQSxnQkFBQSxJQUFBLEdBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxFQUFBLEVBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0Esc0JBQUEsQ0FBQSxVQUFBLENBQUEsV0FBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBO0FBQ0EsbUJBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQTtTQUNBOzs7O0FBSUEsWUFBQSxDQUFBLGVBQUEsR0FBQSxZQUFBO0FBQ0EsbUJBQUEsQ0FBQSxDQUFBLE9BQUEsQ0FBQSxJQUFBLENBQUE7U0FDQSxDQUFBOztBQUVBLFlBQUEsQ0FBQSxlQUFBLEdBQUEsVUFBQSxVQUFBLEVBQUE7Ozs7Ozs7Ozs7QUFVQSxnQkFBQSxJQUFBLENBQUEsZUFBQSxFQUFBLElBQUEsVUFBQSxLQUFBLElBQUEsRUFBQTtBQUNBLHVCQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsT0FBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO2FBQ0E7Ozs7O0FBS0EsbUJBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsaUJBQUEsQ0FBQSxTQUFBLENBQUEsWUFBQTtBQUNBLHVCQUFBLElBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQTtTQUVBLENBQUE7O0FBRUEsWUFBQSxDQUFBLEtBQUEsR0FBQSxVQUFBLFdBQUEsRUFBQTtBQUNBLG1CQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEsUUFBQSxFQUFBLFdBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxpQkFBQSxDQUFBLFNBQ0EsQ0FBQSxZQUFBO0FBQ0EsdUJBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxFQUFBLE9BQUEsRUFBQSw0QkFBQSxFQUFBLENBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQTtTQUNBLENBQUE7O0FBRUEsWUFBQSxDQUFBLE1BQUEsR0FBQSxZQUFBO0FBQ0EsbUJBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQTtBQUNBLHVCQUFBLENBQUEsT0FBQSxFQUFBLENBQUE7QUFDQSwwQkFBQSxDQUFBLFVBQUEsQ0FBQSxXQUFBLENBQUEsYUFBQSxDQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FDQSxDQUFBO0tBRUEsQ0FBQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxPQUFBLENBQUEsU0FBQSxFQUFBLFVBQUEsVUFBQSxFQUFBLFdBQUEsRUFBQTs7QUFFQSxZQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsa0JBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLGdCQUFBLEVBQUEsWUFBQTtBQUNBLGdCQUFBLENBQUEsT0FBQSxFQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7O0FBRUEsa0JBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLGNBQUEsRUFBQSxZQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxPQUFBLEVBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTs7QUFFQSxZQUFBLENBQUEsRUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLFlBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLFlBQUEsQ0FBQSxNQUFBLEdBQUEsVUFBQSxTQUFBLEVBQUEsSUFBQSxFQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxFQUFBLEdBQUEsU0FBQSxDQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO1NBQ0EsQ0FBQTs7QUFFQSxZQUFBLENBQUEsT0FBQSxHQUFBLFlBQUE7QUFDQSxnQkFBQSxDQUFBLEVBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxnQkFBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7U0FDQSxDQUFBO0tBRUEsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxFQUFBLENBQUE7O0FDcElBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7QUFDQSxrQkFBQSxDQUNBLEtBQUEsQ0FBQSxXQUFBLEVBQUE7QUFDQSxXQUFBLEVBQUEsU0FBQTtBQUNBLG1CQUFBLEVBQUEsb0JBQUE7QUFDQSxrQkFBQSxFQUFBLG9CQUFBLE1BQUEsRUFBQSxrQkFBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxHQUFBLEdBQUEsRUFBQSxNQUFBLEVBQUEsRUFBQSxRQUFBLEVBQUEsU0FBQSxFQUFBLFNBQUEsRUFBQSxDQUFBLFNBQUEsRUFBQSxFQUFBLElBQUEsRUFBQSxFQUFBLEVBQUEsQ0FBQTtBQUNBLDhCQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBLEVBQUEsQ0FBQSxDQUFBO1NBQ0E7S0FDQSxDQUFBLENBQ0EsS0FBQSxDQUFBLGFBQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxvQkFBQTtBQUNBLG1CQUFBLEVBQUEsc0JBQUE7QUFDQSxrQkFBQSxFQUFBLG9CQUFBLE1BQUEsRUFBQTtBQUNBLGtCQUFBLENBQUEsSUFBQSxHQUFBLFFBQUEsQ0FBQTtTQUNBO0tBQ0EsQ0FBQSxDQUNBLEtBQUEsQ0FBQSxhQUFBLEVBQUE7QUFDQSxXQUFBLEVBQUEsZ0JBQUE7QUFDQSxtQkFBQSxFQUFBLHNCQUFBO0FBQ0Esa0JBQUEsRUFBQSxvQkFBQSxNQUFBLEVBQUE7QUFDQSxrQkFBQSxDQUFBLE1BQUEsR0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLHFCQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7YUFDQSxDQUFBO1NBQ0E7S0FDQSxDQUFBLENBQ0EsS0FBQSxDQUFBLGFBQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxvQkFBQTtBQUNBLG1CQUFBLEVBQUEsc0JBQUE7QUFDQSxrQkFBQSxFQUFBLG9CQUFBLE1BQUEsRUFBQTtBQUNBLGtCQUFBLENBQUEsTUFBQSxHQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EscUJBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTthQUNBLENBQUE7U0FDQTtLQUNBLENBQUEsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7QUNuQ0EsR0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTtBQUNBLGtCQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxHQUFBO0FBQ0EsbUJBQUEsRUFBQSxtQkFBQTs7S0FFQSxDQUFBLENBQUE7Q0FDQSxDQUFBLENBQUE7QUNOQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBOztBQUVBLGtCQUFBLENBQUEsS0FBQSxDQUFBLE9BQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxRQUFBO0FBQ0EsbUJBQUEsRUFBQSxxQkFBQTtBQUNBLGtCQUFBLEVBQUEsV0FBQTtLQUNBLENBQUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsVUFBQSxDQUFBLFdBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQTs7QUFFQSxVQUFBLENBQUEsS0FBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxLQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxTQUFBLEdBQUEsVUFBQSxTQUFBLEVBQUE7O0FBRUEsY0FBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsbUJBQUEsQ0FBQSxLQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFlBQUE7QUFDQSxrQkFBQSxDQUFBLEVBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtTQUNBLENBQUEsU0FBQSxDQUFBLFlBQUE7QUFDQSxrQkFBQSxDQUFBLEtBQUEsR0FBQSw0QkFBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBRUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsVUFBQSxHQUFBLFVBQUEsVUFBQSxFQUFBO0FBQ0EsY0FBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLFVBQUEsQ0FBQSxVQUFBLENBQUEsQ0FDQSxJQUFBLENBQUEsWUFBQTtBQUNBLG1CQUFBLFdBQUEsQ0FBQSxLQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7U0FDQSxDQUFBLENBQ0EsSUFBQSxDQUFBLFlBQUE7QUFDQSxrQkFBQSxDQUFBLEVBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtTQUNBLENBQUEsU0FDQSxDQUFBLFVBQUEsR0FBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxLQUFBLEdBQUEsR0FBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUN6Q0EsR0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTs7QUFFQSxrQkFBQSxDQUFBLEtBQUEsQ0FBQSxhQUFBLEVBQUE7QUFDQSxXQUFBLEVBQUEsZUFBQTtBQUNBLGdCQUFBLEVBQUEsbUVBQUE7QUFDQSxrQkFBQSxFQUFBLG9CQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUE7QUFDQSx1QkFBQSxDQUFBLFFBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLHNCQUFBLENBQUEsS0FBQSxHQUFBLEtBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQTtTQUNBOzs7QUFHQSxZQUFBLEVBQUE7QUFDQSx3QkFBQSxFQUFBLElBQUE7U0FDQTtLQUNBLENBQUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsT0FBQSxDQUFBLGFBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQTs7QUFFQSxRQUFBLFFBQUEsR0FBQSxTQUFBLFFBQUEsR0FBQTtBQUNBLGVBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSwyQkFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsbUJBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsV0FBQTtBQUNBLGdCQUFBLEVBQUEsUUFBQTtLQUNBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUMvQkEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTtBQUNBLGtCQUFBLENBQ0EsS0FBQSxDQUFBLE9BQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxRQUFBO0FBQ0EsbUJBQUEsRUFBQSxtQkFBQTtBQUNBLGVBQUEsRUFBQTtBQUNBLGlCQUFBLEVBQUEsZUFBQSxXQUFBLEVBQUE7QUFDQSx1QkFBQSxXQUFBLENBQ0EsUUFBQSxFQUFBLENBQ0EsSUFBQSxDQUFBLFVBQUEsR0FBQSxFQUFBO0FBQ0EsMkJBQUEsR0FBQSxDQUFBLElBQUEsQ0FBQTtpQkFDQSxDQUFBLENBQUE7YUFDQTtTQUNBO0FBQ0Esa0JBQUEsRUFBQSxvQkFBQSxNQUFBLEVBQUEsS0FBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxLQUFBLEdBQUEsS0FBQSxDQUFBO1NBQ0E7S0FDQSxDQUFBLENBQ0EsS0FBQSxDQUFBLFlBQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxtQkFBQTtBQUNBLG1CQUFBLEVBQUEsc0JBQUE7QUFDQSxlQUFBLEVBQUE7QUFDQSxnQkFBQSxFQUFBLGNBQUEsV0FBQSxFQUFBLFlBQUEsRUFBQTtBQUNBLHVCQUFBLFdBQUEsQ0FDQSxXQUFBLENBQUEsWUFBQSxDQUFBLEVBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxVQUFBLEdBQUEsRUFBQTtBQUNBLDJCQUFBLEdBQUEsQ0FBQSxJQUFBLENBQUE7aUJBQ0EsQ0FBQSxDQUFBO2FBQ0E7U0FDQTtBQUNBLGtCQUFBLEVBQUEsb0JBQUEsTUFBQSxFQUFBLElBQUEsRUFBQTtBQUNBLGtCQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtTQUNBO0tBQ0EsQ0FBQSxDQUNBLEtBQUEsQ0FBQSxVQUFBLEVBQUE7QUFDQSxXQUFBLEVBQUEsaUJBQUE7QUFDQSxtQkFBQSxFQUFBLG1CQUFBO0FBQ0EsZUFBQSxFQUFBO0FBQ0EsZ0JBQUEsRUFBQSxjQUFBLFlBQUEsRUFBQSxXQUFBLEVBQUE7QUFDQSx1QkFBQSxXQUFBLENBQ0EsV0FBQSxDQUFBLFlBQUEsQ0FBQSxFQUFBLENBQUEsQ0FDQSxJQUFBLENBQUEsVUFBQSxHQUFBLEVBQUE7QUFDQSwyQkFBQSxHQUFBLENBQUEsSUFBQSxDQUFBO2lCQUNBLENBQUEsQ0FBQTthQUNBO0FBQ0Esa0JBQUEsRUFBQSxnQkFBQSxLQUFBLEVBQUE7QUFDQSx1QkFBQSxLQUFBLENBQUEsU0FBQSxFQUFBLENBQUE7YUFDQTtTQUNBO0FBQ0Esa0JBQUEsRUFBQSxvQkFBQSxNQUFBLEVBQUEsSUFBQSxFQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsTUFBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLGtCQUFBLENBQUEsU0FBQSxHQUFBLE1BQUEsQ0FBQTs7QUFFQSxrQkFBQSxDQUFBLFFBQUEsR0FBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLHNCQUFBLENBQUEsSUFBQSxDQUFBLE9BQUEsQ0FBQSxLQUFBLEdBQUEsS0FBQSxDQUFBO2FBQ0EsQ0FBQTs7QUFFQSxrQkFBQSxDQUFBLFVBQUEsR0FBQSxZQUFBO0FBQ0EsMkJBQUEsQ0FDQSxVQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxVQUFBLEdBQUEsRUFBQTtBQUNBLDBCQUFBLENBQUEsRUFBQSxDQUFBLFlBQUEsRUFBQSxFQUFBLEVBQUEsRUFBQSxHQUFBLENBQUEsSUFBQSxDQUFBLEdBQUEsRUFBQSxDQUFBLENBQUE7QUFDQSwyQkFBQSxDQUFBLEdBQUEsQ0FBQSxhQUFBLEVBQUEsR0FBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO2lCQUNBLENBQUEsQ0FBQTthQUNBLENBQUE7O0FBRUEsa0JBQUEsQ0FBQSxVQUFBLEdBQUEsVUFBQSxFQUFBLEVBQUE7QUFDQSwyQkFBQSxDQUFBLFVBQUEsQ0FBQSxFQUFBLENBQUEsQ0FDQSxJQUFBLENBQUEsVUFBQSxHQUFBLEVBQUE7QUFDQSx3QkFBQSxHQUFBLENBQUEsSUFBQSxDQUFBLEVBQUEsRUFBQTtBQUNBLDhCQUFBLENBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO3FCQUNBO2lCQUNBLENBQUEsQ0FBQTthQUNBLENBQUE7U0FDQTtLQUNBLENBQUEsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7QUM3RUEsR0FBQSxDQUFBLE9BQUEsQ0FBQSxjQUFBLEVBQUEsWUFBQTtBQUNBLFFBQUEsYUFBQSxHQUFBO0FBQ0Esa0JBQUEsRUFBQSw0SEFBQTtBQUNBLGdCQUFBLEVBQUEsbUdBQUE7QUFDQSxjQUFBLEVBQUEsaUdBQUE7QUFDQSxnQkFBQSxFQUFBLGlJQUFBO0FBQ0EsZ0JBQUEsRUFBQSxpRUFBQTtBQUNBLGVBQUEsRUFBQSxpSEFBQTtBQUNBLGNBQUEsRUFBQSwyRUFBQTtBQUNBLHNCQUFBLEVBQUEsOEVBQUE7QUFDQSxlQUFBLEVBQUEsMEdBQUE7QUFDQSxlQUFBLEVBQUEsb0VBQUE7S0FDQSxDQUFBOztBQUVBLFdBQUE7QUFDQSxjQUFBLEVBQUEsZ0JBQUEsSUFBQSxFQUFBO0FBQ0EsbUJBQUEsYUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO1NBQ0E7S0FDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBO0FDbkJBLEdBQUEsQ0FBQSxPQUFBLENBQUEsZUFBQSxFQUFBLFlBQUE7QUFDQSxXQUFBLENBQ0EsdURBQUEsRUFDQSxxSEFBQSxFQUNBLGlEQUFBLEVBQ0EsaURBQUEsRUFDQSx1REFBQSxFQUNBLHVEQUFBLEVBQ0EsdURBQUEsRUFDQSx1REFBQSxFQUNBLHVEQUFBLEVBQ0EsdURBQUEsRUFDQSx1REFBQSxFQUNBLHVEQUFBLEVBQ0EsdURBQUEsRUFDQSx1REFBQSxFQUNBLHVEQUFBLEVBQ0EsdURBQUEsRUFDQSx1REFBQSxFQUNBLHVEQUFBLEVBQ0EsdURBQUEsRUFDQSx1REFBQSxFQUNBLHVEQUFBLEVBQ0EsdURBQUEsRUFDQSx1REFBQSxFQUNBLHVEQUFBLEVBQ0EsdURBQUEsRUFDQSx1REFBQSxDQUNBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FDN0JBLEdBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxFQUFBLFlBQUE7O0FBRUEsV0FBQTtBQUNBLFlBQUEsRUFBQSxTQUFBO0FBQ0EsWUFBQSxFQUFBLEtBQUE7QUFDQSxtQkFBQSxFQUFBLENBQUE7QUFDQSxZQUFBLEVBQUEsWUFBQTtBQUNBLFlBQUEsRUFBQSxNQUFBO0FBQ0Esb0JBQUEsRUFBQSxDQUFBO0FBQ0EsZ0JBQUEsRUFBQSxjQUFBO0FBQ0EsbUJBQUEsRUFBQSxZQUFBO0tBQ0EsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUNiQSxHQUFBLENBQUEsT0FBQSxDQUFBLGFBQUEsRUFBQSxZQUFBOztBQUVBLFFBQUEsa0JBQUEsR0FBQSxTQUFBLGtCQUFBLENBQUEsR0FBQSxFQUFBO0FBQ0EsZUFBQSxHQUFBLENBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEsTUFBQSxFQUFBLEdBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFFBQUEsS0FBQSxHQUFBLENBQ0EsV0FBQSxFQUNBLCtCQUFBLEVBQ0Esc0JBQUEsRUFDQSx1Q0FBQSxFQUNBLFFBQUEsRUFDQSwyQkFBQSxFQUNBLGtDQUFBLEVBQ0EsZ0NBQUEsRUFDQSx5Q0FBQSxDQUNBLENBQUE7O0FBRUEsV0FBQTtBQUNBLGFBQUEsRUFBQSxLQUFBO0FBQ0Esc0JBQUEsRUFBQSwwQkFBQTtBQUNBLG1CQUFBLGtCQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7U0FDQTtLQUNBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FDekJBLEdBQUEsQ0FBQSxPQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBOztBQUdBLFFBQUEsS0FBQSxHQUFBLENBQ0E7QUFDQSxnQkFBQSxFQUFBLFFBQUE7QUFDQSxpQkFBQSxFQUFBLFNBQUE7QUFDQSxnQkFBQSxFQUFBLFNBQUE7QUFDQSxjQUFBLEVBQUEsR0FBQTtBQUNBLGFBQUEsRUFBQSxpQkFBQTtBQUNBLGFBQUEsRUFBQTtBQUNBLGVBQUEsRUFBQSxJQUFBO0FBQ0EsaUJBQUEsRUFBQSxJQUFBO0FBQ0EsZ0JBQUEsRUFBQSxNQUFBO1NBQ0E7QUFDQSxhQUFBLEVBQUEsZ0JBQUE7QUFDQSxlQUFBLEVBQUE7QUFDQSxvQkFBQSxFQUFBLGNBQUE7QUFDQSxvQkFBQSxFQUFBLFFBQUE7QUFDQSxnQkFBQSxFQUFBLFVBQUE7QUFDQSxpQkFBQSxFQUFBLElBQUE7QUFDQSxlQUFBLEVBQUEsT0FBQTtTQUNBO0FBQ0EsYUFBQSxFQUFBLEVBQUE7QUFDQSxhQUFBLEVBQUEsRUFBQTtBQUNBLGFBQUEsRUFBQSxpa0JBQUE7S0FDQSxDQUNBLENBQUE7QUFDQSxhQUFBLFFBQUEsR0FBQTtBQUNBLGVBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxhQUFBLENBQUEsQ0FBQTtLQUNBOztBQUVBLGFBQUEsV0FBQSxDQUFBLEVBQUEsRUFBQTtBQUNBLGVBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxhQUFBLEdBQUEsRUFBQSxDQUFBLENBQUE7S0FDQTs7QUFFQSxhQUFBLFVBQUEsQ0FBQSxJQUFBLEVBQUE7QUFDQSxlQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsYUFBQSxFQUFBLElBQUEsQ0FBQSxDQUFBO0tBQ0E7O0FBRUEsYUFBQSxVQUFBLENBQUEsSUFBQSxFQUFBO0FBQ0EsZUFBQSxLQUFBLENBQUEsSUFBQSxDQUFBLGFBQUEsRUFBQSxJQUFBLENBQUEsQ0FBQTtLQUNBOztBQUVBLGFBQUEsVUFBQSxDQUFBLEVBQUEsRUFBQTtBQUNBLGVBQUEsS0FBQSxVQUFBLENBQUEsYUFBQSxHQUFBLEVBQUEsQ0FBQSxDQUFBO0tBQ0E7O0FBRUEsV0FBQTtBQUNBLGdCQUFBLEVBQUEsUUFBQTtBQUNBLG1CQUFBLEVBQUEsV0FBQTtBQUNBLGtCQUFBLEVBQUEsVUFBQTtBQUNBLGtCQUFBLEVBQUEsVUFBQTtBQUNBLGtCQUFBLEVBQUEsVUFBQTtLQUNBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FDeERBLEdBQUEsQ0FBQSxPQUFBLENBQUEsT0FBQSxFQUFBLFlBQUE7O0FBRUEsUUFBQSxVQUFBLEdBQUEsQ0FDQTtBQUNBLGNBQUEsRUFBQSxTQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxRQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxnQkFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsU0FBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsVUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsWUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsVUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsYUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsVUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsc0JBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLGdDQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxTQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxTQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxNQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxRQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxPQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxVQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxTQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxNQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxRQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxVQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxXQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxPQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxrQkFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsVUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsZUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsVUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsV0FBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsYUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsVUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsU0FBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsVUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsUUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsZUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsWUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsWUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsVUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsZ0JBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLGNBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLDBCQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxNQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxVQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxRQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxPQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxjQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxhQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxjQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxnQkFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsY0FBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsV0FBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsT0FBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsTUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsU0FBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsZ0JBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFVBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFlBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLGVBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFdBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFNBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxDQUNBLENBQUE7O0FBRUEsYUFBQSxTQUFBLEdBQUE7QUFDQSxlQUFBLFVBQUEsQ0FBQTtLQUNBOztBQUVBLFdBQUE7QUFDQSxpQkFBQSxFQUFBLFNBQUE7S0FDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQ3hQQSxHQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsRUFBQSxZQUFBO0FBQ0EsV0FBQTtBQUNBLGdCQUFBLEVBQUEsR0FBQTtBQUNBLG1CQUFBLEVBQUEseUNBQUE7QUFDQSxhQUFBLEVBQUE7QUFDQSxtQkFBQSxFQUFBLEdBQUE7U0FDQTtBQUNBLGtCQUFBLEVBQUEsb0JBQUEsTUFBQSxFQUFBLEVBQ0E7QUFDQSxZQUFBLEVBQUEsZ0JBQUEsRUFFQTtLQUNBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FDYkEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxZQUFBLEVBQUE7QUFDQSxXQUFBO0FBQ0EsZ0JBQUEsRUFBQSxHQUFBO0FBQ0EsbUJBQUEsRUFBQSxzREFBQTtBQUNBLFlBQUEsRUFBQSxjQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsS0FBQSxFQUFBO0FBQ0EsaUJBQUEsQ0FBQSxRQUFBLEdBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSx1QkFBQSxZQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO2FBQ0EsQ0FBQTtTQUNBO0tBQ0EsQ0FBQTtDQUNBLENBQUEsQ0FBQTtBQ1ZBLEdBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxFQUFBLFlBQUE7QUFDQSxXQUFBO0FBQ0EsZ0JBQUEsRUFBQSxHQUFBO0FBQ0EsbUJBQUEsRUFBQSxpREFBQTtBQUNBLGFBQUEsRUFBQTtBQUNBLGlCQUFBLEVBQUEsR0FBQTtBQUNBLGNBQUEsRUFBQSxHQUFBO0FBQ0EsZ0JBQUEsRUFBQSxHQUFBO1NBQ0E7QUFDQSxrQkFBQSxFQUFBLGVBQUE7O0tBRUEsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7QUFHQSxHQUFBLENBQUEsVUFBQSxDQUFBLGVBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQTtBQUNBLFdBQUEsQ0FBQSxHQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsR0FBQSxFQUFBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FDbkJBLEdBQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxFQUFBLFlBQUE7QUFDQSxXQUFBO0FBQ0EsZ0JBQUEsRUFBQSxJQUFBO0FBQ0EsWUFBQSxFQUFBLGNBQUEsTUFBQSxFQUFBLEtBQUEsRUFBQSxNQUFBLEVBQUE7O0FBRUEsZ0JBQUEsT0FBQSxHQUFBO0FBQ0EsNEJBQUEsRUFBQSxNQUFBLENBQUEsWUFBQSxHQUFBLE1BQUEsQ0FBQSxZQUFBLEdBQUEsR0FBQTtBQUNBLDhCQUFBLEVBQUEsYUFBQTthQUNBLENBQUE7OztBQUdBLG1CQUFBLENBQUEsT0FBQSxDQUFBLENBQUEsY0FBQSxFQUFBLGFBQUEsQ0FBQSxFQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0Esb0JBQUEsRUFBQSxHQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7QUFDQSxvQkFBQSxFQUFBLENBQUEsTUFBQSxJQUFBLENBQUEsRUFBQTtBQUNBLDJCQUFBLENBQUEsT0FBQSxDQUFBLENBQUEsRUFBQSxFQUFBLE1BQUEsRUFBQSxVQUFBLENBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQTtBQUNBLCtCQUFBLENBQUEsT0FBQSxDQUFBLEVBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxNQUFBLEdBQUEsWUFBQSxFQUFBLE1BQUEsR0FBQSxPQUFBLENBQUEsWUFBQSxHQUFBLElBQUEsR0FBQSxJQUFBLEdBQUEsT0FBQSxDQUFBLGNBQUEsQ0FBQSxDQUFBO3FCQUNBLENBQUEsQ0FBQTtpQkFDQTthQUNBLENBQUEsQ0FBQTs7Ozs7QUFLQSxrQkFBQSxDQUFBLElBQUEsR0FBQSxZQUFBO0FBQ0EscUJBQUEsQ0FBQSxXQUFBLENBQUEsU0FBQSxDQUFBLENBQUE7YUFDQSxDQUFBO1NBRUE7S0FDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQzdCQSxHQUFBLENBQUEsU0FBQSxDQUFBLGVBQUEsRUFBQSxZQUFBO0FBQ0EsV0FBQTtBQUNBLGdCQUFBLEVBQUEsR0FBQTtBQUNBLG1CQUFBLEVBQUEseURBQUE7S0FDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBO0FDTEEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLEVBQUEsVUFBQSxVQUFBLEVBQUEsV0FBQSxFQUFBLFdBQUEsRUFBQSxNQUFBLEVBQUE7O0FBRUEsV0FBQTtBQUNBLGdCQUFBLEVBQUEsR0FBQTtBQUNBLGFBQUEsRUFBQSxFQUFBO0FBQ0EsbUJBQUEsRUFBQSx5Q0FBQTtBQUNBLFlBQUEsRUFBQSxjQUFBLEtBQUEsRUFBQTs7QUFFQSxpQkFBQSxDQUFBLEtBQUEsR0FBQSxDQUNBLEVBQUEsS0FBQSxFQUFBLE1BQUEsRUFBQSxLQUFBLEVBQUEsTUFBQSxFQUFBLEVBQ0EsRUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsRUFDQSxFQUFBLEtBQUEsRUFBQSxlQUFBLEVBQUEsS0FBQSxFQUFBLE1BQUEsRUFBQSxFQUNBLEVBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLEVBQ0EsRUFBQSxLQUFBLEVBQUEsUUFBQSxFQUFBLEtBQUEsRUFBQSxXQUFBLEVBQUEsRUFDQSxFQUFBLEtBQUEsRUFBQSxjQUFBLEVBQUEsS0FBQSxFQUFBLGFBQUEsRUFBQSxJQUFBLEVBQUEsSUFBQSxFQUFBLENBQ0EsQ0FBQTs7QUFFQSxpQkFBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsaUJBQUEsQ0FBQSxVQUFBLEdBQUEsWUFBQTtBQUNBLHVCQUFBLFdBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQTthQUNBLENBQUE7O0FBRUEsaUJBQUEsQ0FBQSxNQUFBLEdBQUEsWUFBQTtBQUNBLDJCQUFBLENBQUEsTUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFlBQUE7QUFDQSwwQkFBQSxDQUFBLEVBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtpQkFDQSxDQUFBLENBQUE7YUFDQSxDQUFBOztBQUVBLGdCQUFBLE9BQUEsR0FBQSxTQUFBLE9BQUEsR0FBQTtBQUNBLDJCQUFBLENBQUEsZUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EseUJBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO2lCQUNBLENBQUEsQ0FBQTthQUNBLENBQUE7O0FBRUEsZ0JBQUEsVUFBQSxHQUFBLFNBQUEsVUFBQSxHQUFBO0FBQ0EscUJBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO2FBQ0EsQ0FBQTs7QUFFQSxtQkFBQSxFQUFBLENBQUE7O0FBRUEsc0JBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLFlBQUEsRUFBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSxzQkFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsY0FBQSxFQUFBLFVBQUEsQ0FBQSxDQUFBO1NBRUE7O0tBRUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUNoREEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxZQUFBLEVBQ0EsVUFBQSxTQUFBLEVBQUE7O0FBRUEsV0FBQSxVQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsS0FBQSxFQUFBOztBQUVBLGFBQUEsQ0FBQSxPQUFBLEdBQUEsQ0FBQSxNQUFBLEVBQUEsTUFBQSxFQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsT0FBQSxDQUFBLENBQUE7O0FBRUEsaUJBQUEsVUFBQSxDQUFBLENBQUEsRUFBQTtBQUNBLGdCQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7O0FBRUEsbUJBQUEsQ0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO1NBQ0E7O0FBRUEsZUFBQSxDQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxZQUFBLFFBQUEsR0FBQSxTQUFBLENBQUEsVUFBQSxFQUFBLElBQUEsQ0FBQSxDQUFBOzs7O0FBSUEsZUFBQSxDQUFBLEVBQUEsQ0FBQSxVQUFBLEVBQUEsWUFBQTtBQUNBLHFCQUFBLENBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7QUN2QkEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxZQUFBLEVBQUEsVUFBQSxXQUFBLEVBQUE7O0FBRUEsV0FBQTtBQUNBLGdCQUFBLEVBQUEsR0FBQTtBQUNBLG1CQUFBLEVBQUEsbURBQUE7QUFDQSxZQUFBLEVBQUEsY0FBQSxLQUFBLEVBQUE7QUFDQSxpQkFBQSxDQUFBLEtBQUEsR0FBQSxXQUFBLENBQUEsY0FBQSxFQUFBLENBQUE7U0FDQTtLQUNBLENBQUE7Q0FFQSxDQUFBLENBQUEiLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcbndpbmRvdy5hcHAgPSBhbmd1bGFyLm1vZHVsZSgnRnVsbHN0YWNrR2VuZXJhdGVkQXBwJywgWyd1aS5yb3V0ZXInLCAndWkuYm9vdHN0cmFwJywgJ2ZzYVByZUJ1aWx0JywgJ25nRmlsZVVwbG9hZCcsICduZ0FuaW1hdGUnLCAndGV4dEFuZ3VsYXInLCAndWlHbWFwZ29vZ2xlLW1hcHMnLCAnbmdUYWdzSW5wdXQnLCAnc2xpZGVQdXNoTWVudSddKTtcblxuYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHVybFJvdXRlclByb3ZpZGVyLCAkbG9jYXRpb25Qcm92aWRlcikge1xuICAgIC8vIFRoaXMgdHVybnMgb2ZmIGhhc2hiYW5nIHVybHMgKC8jYWJvdXQpIGFuZCBjaGFuZ2VzIGl0IHRvIHNvbWV0aGluZyBub3JtYWwgKC9hYm91dClcbiAgICAkbG9jYXRpb25Qcm92aWRlci5odG1sNU1vZGUodHJ1ZSk7XG4gICAgLy8gSWYgd2UgZ28gdG8gYSBVUkwgdGhhdCB1aS1yb3V0ZXIgZG9lc24ndCBoYXZlIHJlZ2lzdGVyZWQsIGdvIHRvIHRoZSBcIi9cIiB1cmwuXG4gICAgJHVybFJvdXRlclByb3ZpZGVyLm90aGVyd2lzZSgnLycpO1xufSlcbi5jb25maWcoZnVuY3Rpb24odWlHbWFwR29vZ2xlTWFwQXBpUHJvdmlkZXIpIHtcbiAgICB1aUdtYXBHb29nbGVNYXBBcGlQcm92aWRlci5jb25maWd1cmUoe1xuICAgICAgICBrZXk6ICdBSXphU3lDQWZ5WHNlU1hVREJRWXdmcDJpWHJ5RDVBdkMxSjgyT2cnLFxuICAgICAgICB2OiAnMy4yMCcsIC8vZGVmYXVsdHMgdG8gbGF0ZXN0IDMuWCBhbnlob3dcbiAgICAgICAgbGlicmFyaWVzOiAnd2VhdGhlcixnZW9tZXRyeSx2aXN1YWxpemF0aW9uJ1xuICAgIH0pO1xufSlcblxuLy8gVGhpcyBhcHAucnVuIGlzIGZvciBjb250cm9sbGluZyBhY2Nlc3MgdG8gc3BlY2lmaWMgc3RhdGVzLlxuYXBwLnJ1bihmdW5jdGlvbiAoJHJvb3RTY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xuXG4gICAgLy8gVGhlIGdpdmVuIHN0YXRlIHJlcXVpcmVzIGFuIGF1dGhlbnRpY2F0ZWQgdXNlci5cbiAgICB2YXIgZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCA9IGZ1bmN0aW9uIChzdGF0ZSkge1xuICAgICAgICByZXR1cm4gc3RhdGUuZGF0YSAmJiBzdGF0ZS5kYXRhLmF1dGhlbnRpY2F0ZTtcbiAgICB9O1xuXG4gICAgLy8gJHN0YXRlQ2hhbmdlU3RhcnQgaXMgYW4gZXZlbnQgZmlyZWRcbiAgICAvLyB3aGVuZXZlciB0aGUgcHJvY2VzcyBvZiBjaGFuZ2luZyBhIHN0YXRlIGJlZ2lucy5cbiAgICAkcm9vdFNjb3BlLiRvbignJHN0YXRlQ2hhbmdlU3RhcnQnLCBmdW5jdGlvbiAoZXZlbnQsIHRvU3RhdGUsIHRvUGFyYW1zKSB7XG5cbiAgICAgICAgaWYgKCFkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoKHRvU3RhdGUpKSB7XG4gICAgICAgICAgICAvLyBUaGUgZGVzdGluYXRpb24gc3RhdGUgZG9lcyBub3QgcmVxdWlyZSBhdXRoZW50aWNhdGlvblxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSkge1xuICAgICAgICAgICAgLy8gVGhlIHVzZXIgaXMgYXV0aGVudGljYXRlZC5cbiAgICAgICAgICAgIC8vIFNob3J0IGNpcmN1aXQgd2l0aCByZXR1cm4uXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDYW5jZWwgbmF2aWdhdGluZyB0byBuZXcgc3RhdGUuXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgLy8gSWYgYSB1c2VyIGlzIHJldHJpZXZlZCwgdGhlbiByZW5hdmlnYXRlIHRvIHRoZSBkZXN0aW5hdGlvblxuICAgICAgICAgICAgLy8gKHRoZSBzZWNvbmQgdGltZSwgQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCkgd2lsbCB3b3JrKVxuICAgICAgICAgICAgLy8gb3RoZXJ3aXNlLCBpZiBubyB1c2VyIGlzIGxvZ2dlZCBpbiwgZ28gdG8gXCJsb2dpblwiIHN0YXRlLlxuICAgICAgICAgICAgaWYgKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28odG9TdGF0ZS5uYW1lLCB0b1BhcmFtcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnbG9naW4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICB9KTtcblxufSk7XG5cblxuYXBwLmNvbnRyb2xsZXIoJ21haW5DdHJsJywgZnVuY3Rpb24oJHJvb3RTY29wZSwgQXV0aFNlcnZpY2UsIEFVVEhfRVZFTlRTLCAkc3RhdGUsICRzY29wZSl7XG4gICAgJHNjb3BlLnVzZXIgPSBudWxsO1xuXG4gICAgJHNjb3BlLmlzTG9nZ2VkSW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmxvZ291dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgQXV0aFNlcnZpY2UubG9nb3V0KCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnKTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHZhciBzZXRVc2VyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAkc2NvcGUudXNlciA9IHVzZXI7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICB2YXIgcmVtb3ZlVXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJHNjb3BlLnVzZXIgPSBudWxsO1xuICAgIH07XG5cbiAgICBzZXRVc2VyKCk7XG5cbiAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MsIHNldFVzZXIpO1xuICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MsIHJlbW92ZVVzZXIpO1xuICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LCByZW1vdmVVc2VyKTtcbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgIC8vIFJlZ2lzdGVyIG91ciAqYWJvdXQqIHN0YXRlLlxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdhYm91dCcsIHtcbiAgICAgICAgdXJsOiAnL2Fib3V0JyxcbiAgICAgICAgY29udHJvbGxlcjogJ0Fib3V0Q29udHJvbGxlcicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvYWJvdXQvYWJvdXQuaHRtbCdcbiAgICB9KTtcblxufSk7XG5cbmFwcC5jb250cm9sbGVyKCdBYm91dENvbnRyb2xsZXInLCBmdW5jdGlvbiAoJHNjb3BlLCBGdWxsc3RhY2tQaWNzKSB7XG5cbiAgICAvLyBJbWFnZXMgb2YgYmVhdXRpZnVsIEZ1bGxzdGFjayBwZW9wbGUuXG4gICAgJHNjb3BlLmltYWdlcyA9IF8uc2h1ZmZsZShGdWxsc3RhY2tQaWNzKTtcblxufSk7IiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnZG9jcycsIHtcbiAgICAgICAgdXJsOiAnL2RvY3MnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2RvY3MvZG9jcy5odG1sJ1xuICAgIH0pO1xufSk7XG4iLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLy8gSG9wZSB5b3UgZGlkbid0IGZvcmdldCBBbmd1bGFyISBEdWgtZG95LlxuICAgIGlmICghd2luZG93LmFuZ3VsYXIpIHRocm93IG5ldyBFcnJvcignSSBjYW5cXCd0IGZpbmQgQW5ndWxhciEnKTtcblxuICAgIHZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnZnNhUHJlQnVpbHQnLCBbXSk7XG5cbiAgICBhcHAuZmFjdG9yeSgnU29ja2V0JywgZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIXdpbmRvdy5pbykgdGhyb3cgbmV3IEVycm9yKCdzb2NrZXQuaW8gbm90IGZvdW5kIScpO1xuICAgICAgICByZXR1cm4gd2luZG93LmlvKHdpbmRvdy5sb2NhdGlvbi5vcmlnaW4pO1xuICAgIH0pO1xuXG4gICAgLy8gQVVUSF9FVkVOVFMgaXMgdXNlZCB0aHJvdWdob3V0IG91ciBhcHAgdG9cbiAgICAvLyBicm9hZGNhc3QgYW5kIGxpc3RlbiBmcm9tIGFuZCB0byB0aGUgJHJvb3RTY29wZVxuICAgIC8vIGZvciBpbXBvcnRhbnQgZXZlbnRzIGFib3V0IGF1dGhlbnRpY2F0aW9uIGZsb3cuXG4gICAgYXBwLmNvbnN0YW50KCdBVVRIX0VWRU5UUycsIHtcbiAgICAgICAgbG9naW5TdWNjZXNzOiAnYXV0aC1sb2dpbi1zdWNjZXNzJyxcbiAgICAgICAgbG9naW5GYWlsZWQ6ICdhdXRoLWxvZ2luLWZhaWxlZCcsXG4gICAgICAgIGxvZ291dFN1Y2Nlc3M6ICdhdXRoLWxvZ291dC1zdWNjZXNzJyxcbiAgICAgICAgc2Vzc2lvblRpbWVvdXQ6ICdhdXRoLXNlc3Npb24tdGltZW91dCcsXG4gICAgICAgIG5vdEF1dGhlbnRpY2F0ZWQ6ICdhdXRoLW5vdC1hdXRoZW50aWNhdGVkJyxcbiAgICAgICAgbm90QXV0aG9yaXplZDogJ2F1dGgtbm90LWF1dGhvcml6ZWQnXG4gICAgfSk7XG5cbiAgICBhcHAuZmFjdG9yeSgnQXV0aEludGVyY2VwdG9yJywgZnVuY3Rpb24gKCRyb290U2NvcGUsICRxLCBBVVRIX0VWRU5UUykge1xuICAgICAgICB2YXIgc3RhdHVzRGljdCA9IHtcbiAgICAgICAgICAgIDQwMTogQVVUSF9FVkVOVFMubm90QXV0aGVudGljYXRlZCxcbiAgICAgICAgICAgIDQwMzogQVVUSF9FVkVOVFMubm90QXV0aG9yaXplZCxcbiAgICAgICAgICAgIDQxOTogQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsXG4gICAgICAgICAgICA0NDA6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXNwb25zZUVycm9yOiBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3Qoc3RhdHVzRGljdFtyZXNwb25zZS5zdGF0dXNdLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChyZXNwb25zZSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KTtcblxuICAgIGFwcC5jb25maWcoZnVuY3Rpb24gKCRodHRwUHJvdmlkZXIpIHtcbiAgICAgICAgJGh0dHBQcm92aWRlci5pbnRlcmNlcHRvcnMucHVzaChbXG4gICAgICAgICAgICAnJGluamVjdG9yJyxcbiAgICAgICAgICAgIGZ1bmN0aW9uICgkaW5qZWN0b3IpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJGluamVjdG9yLmdldCgnQXV0aEludGVyY2VwdG9yJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIF0pO1xuICAgIH0pO1xuXG4gICAgYXBwLnNlcnZpY2UoJ0F1dGhTZXJ2aWNlJywgZnVuY3Rpb24gKCRodHRwLCBTZXNzaW9uLCAkcm9vdFNjb3BlLCBBVVRIX0VWRU5UUywgJHEpIHtcblxuICAgICAgICBmdW5jdGlvbiBvblN1Y2Nlc3NmdWxMb2dpbihyZXNwb25zZSkge1xuICAgICAgICAgICAgdmFyIGRhdGEgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgU2Vzc2lvbi5jcmVhdGUoZGF0YS5pZCwgZGF0YS51c2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MpO1xuICAgICAgICAgICAgcmV0dXJuIGRhdGEudXNlcjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVzZXMgdGhlIHNlc3Npb24gZmFjdG9yeSB0byBzZWUgaWYgYW5cbiAgICAgICAgLy8gYXV0aGVudGljYXRlZCB1c2VyIGlzIGN1cnJlbnRseSByZWdpc3RlcmVkLlxuICAgICAgICB0aGlzLmlzQXV0aGVudGljYXRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAhIVNlc3Npb24udXNlcjtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmdldExvZ2dlZEluVXNlciA9IGZ1bmN0aW9uIChmcm9tU2VydmVyKSB7XG5cbiAgICAgICAgICAgIC8vIElmIGFuIGF1dGhlbnRpY2F0ZWQgc2Vzc2lvbiBleGlzdHMsIHdlXG4gICAgICAgICAgICAvLyByZXR1cm4gdGhlIHVzZXIgYXR0YWNoZWQgdG8gdGhhdCBzZXNzaW9uXG4gICAgICAgICAgICAvLyB3aXRoIGEgcHJvbWlzZS4gVGhpcyBlbnN1cmVzIHRoYXQgd2UgY2FuXG4gICAgICAgICAgICAvLyBhbHdheXMgaW50ZXJmYWNlIHdpdGggdGhpcyBtZXRob2QgYXN5bmNocm9ub3VzbHkuXG5cbiAgICAgICAgICAgIC8vIE9wdGlvbmFsbHksIGlmIHRydWUgaXMgZ2l2ZW4gYXMgdGhlIGZyb21TZXJ2ZXIgcGFyYW1ldGVyLFxuICAgICAgICAgICAgLy8gdGhlbiB0aGlzIGNhY2hlZCB2YWx1ZSB3aWxsIG5vdCBiZSB1c2VkLlxuXG4gICAgICAgICAgICBpZiAodGhpcy5pc0F1dGhlbnRpY2F0ZWQoKSAmJiBmcm9tU2VydmVyICE9PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLndoZW4oU2Vzc2lvbi51c2VyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTWFrZSByZXF1ZXN0IEdFVCAvc2Vzc2lvbi5cbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSB1c2VyLCBjYWxsIG9uU3VjY2Vzc2Z1bExvZ2luIHdpdGggdGhlIHJlc3BvbnNlLlxuICAgICAgICAgICAgLy8gSWYgaXQgcmV0dXJucyBhIDQwMSByZXNwb25zZSwgd2UgY2F0Y2ggaXQgYW5kIGluc3RlYWQgcmVzb2x2ZSB0byBudWxsLlxuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL3Nlc3Npb24nKS50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMubG9naW4gPSBmdW5jdGlvbiAoY3JlZGVudGlhbHMpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvbG9naW4nLCBjcmVkZW50aWFscylcbiAgICAgICAgICAgICAgICAudGhlbihvblN1Y2Nlc3NmdWxMb2dpbilcbiAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHsgbWVzc2FnZTogJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJyB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmxvZ291dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9sb2dvdXQnKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBTZXNzaW9uLmRlc3Ryb3koKTtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoQVVUSF9FVkVOVFMubG9nb3V0U3VjY2Vzcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgIH0pO1xuXG4gICAgYXBwLnNlcnZpY2UoJ1Nlc3Npb24nLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMpIHtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubm90QXV0aGVudGljYXRlZCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5pZCA9IG51bGw7XG4gICAgICAgIHRoaXMudXNlciA9IG51bGw7XG5cbiAgICAgICAgdGhpcy5jcmVhdGUgPSBmdW5jdGlvbiAoc2Vzc2lvbklkLCB1c2VyKSB7XG4gICAgICAgICAgICB0aGlzLmlkID0gc2Vzc2lvbklkO1xuICAgICAgICAgICAgdGhpcy51c2VyID0gdXNlcjtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmlkID0gbnVsbDtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IG51bGw7XG4gICAgICAgIH07XG5cbiAgICB9KTtcblxufSkoKTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpe1xuICAgJHN0YXRlUHJvdmlkZXJcbiAgICAgICAuc3RhdGUoJ2V2ZW50TGlzdCcsIHtcbiAgICAgICAgICAgdXJsOicvZXZlbnRzJyxcbiAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9ldmVudC9saXN0Lmh0bWwnLFxuICAgICAgICAgICBjb250cm9sbGVyOiBmdW5jdGlvbigkc2NvcGUsIHVpR21hcEdvb2dsZU1hcEFwaSl7XG4gICAgICAgICAgICAgICAkc2NvcGUubWFwID0geyBjZW50ZXI6IHsgbGF0aXR1ZGU6IDQwLjc3Mzk1OSwgbG9uZ2l0dWRlOiAtNzMuOTcwOTQ5IH0sIHpvb206IDE0IH07XG4gICAgICAgICAgICAgICB1aUdtYXBHb29nbGVNYXBBcGkudGhlbihmdW5jdGlvbihtYXBzKSB7fSk7XG4gICAgICAgICAgIH1cbiAgICAgICB9KVxuICAgICAgIC5zdGF0ZSgnZXZlbnREZXRhaWwnLCB7XG4gICAgICAgICAgIHVybDonL2V2ZW50cy9kZXRhaWwvOmlkJyxcbiAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9ldmVudC9kZXRhaWwuaHRtbCcsXG4gICAgICAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCRzY29wZSl7XG4gICAgICAgICAgICAgICAkc2NvcGUucGFnZT1cImRldGFpbFwiO1xuICAgICAgICAgICB9XG4gICAgICAgfSlcbiAgICAgICAuc3RhdGUoJ2V2ZW50Q3JlYXRlJywge1xuICAgICAgICAgICB1cmw6Jy9ldmVudHMvY3JlYXRlJyxcbiAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9ldmVudC9jcmVhdGUuaHRtbCcsXG4gICAgICAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCRzY29wZSl7XG4gICAgICAgICAgICAgICAkc2NvcGUuY3JlYXRlID0gZnVuY3Rpb24ocGFyYSkge1xuICAgICAgICAgICAgICAgICAgICBhbGVydChwYXJhKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICB9XG4gICAgICAgfSlcbiAgICAgICAuc3RhdGUoJ2V2ZW50VXBkYXRlJywge1xuICAgICAgICAgICB1cmw6Jy9ldmVudHMvdXBkYXRlLzppZCcsXG4gICAgICAgICAgIHRlbXBsYXRlVXJsOiAnanMvZXZlbnQvdXBkYXRlLmh0bWwnLFxuICAgICAgICAgICBjb250cm9sbGVyOiBmdW5jdGlvbigkc2NvcGUpe1xuICAgICAgICAgICAgICAgJHNjb3BlLnVwZGF0ZSA9IGZ1bmN0aW9uKHBhcmEpIHtcbiAgICAgICAgICAgICAgICAgICAgYWxlcnQocGFyYSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICB9XG4gICAgICAgfSk7XG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2hvbWUnLCB7XG4gICAgICAgIHVybDogJy8nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2hvbWUvaG9tZS5odG1sJyxcbiAgICAgIFxuICAgIH0pO1xufSk7IiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdsb2dpbicsIHtcbiAgICAgICAgdXJsOiAnL2xvZ2luJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9sb2dpbi9sb2dpbi5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0xvZ2luQ3RybCdcbiAgICB9KTtcblxufSk7XG5cbmFwcC5jb250cm9sbGVyKCdMb2dpbkN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlLCBVc2VyRmFjdG9yeSkge1xuXG4gICAgJHNjb3BlLmxvZ2luID0ge307XG4gICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICRzY29wZS5zZW5kTG9naW4gPSBmdW5jdGlvbiAobG9naW5JbmZvKSB7XG5cbiAgICAgICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICAgICBBdXRoU2VydmljZS5sb2dpbihsb2dpbkluZm8pLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHN0YXRlLmdvKCdob21lJyk7XG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzY29wZS5lcnJvciA9ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLic7XG4gICAgICAgIH0pO1xuXG4gICAgfTtcblxuICAgICRzY29wZS5zZW5kU2lnbnVwID0gZnVuY3Rpb24oc2lnbnVwSW5mbyl7XG4gICAgICAgICRzY29wZS5lcnJvciA9IG51bGw7XG4gICAgICAgIFVzZXJGYWN0b3J5LmNyZWF0ZVVzZXIoc2lnbnVwSW5mbylcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIEF1dGhTZXJ2aWNlLmxvZ2luKHNpZ251cEluZm8pO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdob21lJyk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycil7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmVycm9yID0gZXJyO1xuICAgICAgICAgICAgfSlcbiAgICB9XG5cbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdtZW1iZXJzT25seScsIHtcbiAgICAgICAgdXJsOiAnL21lbWJlcnMtYXJlYScsXG4gICAgICAgIHRlbXBsYXRlOiAnPGltZyBuZy1yZXBlYXQ9XCJpdGVtIGluIHN0YXNoXCIgd2lkdGg9XCIzMDBcIiBuZy1zcmM9XCJ7eyBpdGVtIH19XCIgLz4nLFxuICAgICAgICBjb250cm9sbGVyOiBmdW5jdGlvbiAoJHNjb3BlLCBTZWNyZXRTdGFzaCkge1xuICAgICAgICAgICAgU2VjcmV0U3Rhc2guZ2V0U3Rhc2goKS50aGVuKGZ1bmN0aW9uIChzdGFzaCkge1xuICAgICAgICAgICAgICAgICRzY29wZS5zdGFzaCA9IHN0YXNoO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIC8vIFRoZSBmb2xsb3dpbmcgZGF0YS5hdXRoZW50aWNhdGUgaXMgcmVhZCBieSBhbiBldmVudCBsaXN0ZW5lclxuICAgICAgICAvLyB0aGF0IGNvbnRyb2xzIGFjY2VzcyB0byB0aGlzIHN0YXRlLiBSZWZlciB0byBhcHAuanMuXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgIGF1dGhlbnRpY2F0ZTogdHJ1ZVxuICAgICAgICB9XG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuZmFjdG9yeSgnU2VjcmV0U3Rhc2gnLCBmdW5jdGlvbiAoJGh0dHApIHtcblxuICAgIHZhciBnZXRTdGFzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2FwaS9tZW1iZXJzL3NlY3JldC1zdGFzaCcpLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIGdldFN0YXNoOiBnZXRTdGFzaFxuICAgIH07XG5cbn0pOyIsImFwcC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpe1xuICAgJHN0YXRlUHJvdmlkZXJcbiAgICAgICAuc3RhdGUoJ3VzZXJzJywge1xuICAgICAgICAgICB1cmw6ICcvdXNlcnMnLFxuICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3VzZXIvbGlzdC5odG1sJyxcbiAgICAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgICAgdXNlcnM6IGZ1bmN0aW9uKFVzZXJGYWN0b3J5KXtcbiAgICAgICAgICAgICAgICAgICByZXR1cm4gVXNlckZhY3RvcnlcbiAgICAgICAgICAgICAgICAgICAgICAgLmdldFVzZXJzKClcbiAgICAgICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXMuZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgfSxcbiAgICAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oJHNjb3BlLCB1c2Vycyl7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnVzZXJzID0gdXNlcnM7XG4gICAgICAgICAgIH1cbiAgICAgICB9KVxuICAgICAgIC5zdGF0ZSgndXNlckRldGFpbCcsIHtcbiAgICAgICAgICAgdXJsOiAnL3VzZXJzL2RldGFpbC86aWQnLFxuICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3VzZXIvcHJvZmlsZS5odG1sJyxcbiAgICAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgICAgdXNlcjogZnVuY3Rpb24oVXNlckZhY3RvcnksICRzdGF0ZVBhcmFtcyl7XG4gICAgICAgICAgICAgICAgICAgcmV0dXJuIFVzZXJGYWN0b3J5XG4gICAgICAgICAgICAgICAgICAgICAgIC5nZXRVc2VyQnlJZCgkc3RhdGVQYXJhbXMuaWQpXG4gICAgICAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlcyl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzLmRhdGE7XG4gICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICB9XG4gICAgICAgICAgIH0sXG4gICAgICAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCRzY29wZSwgdXNlcil7XG4gICAgICAgICAgICAgICAkc2NvcGUudXNlciA9IHVzZXI7XG4gICAgICAgICAgIH1cbiAgICAgICB9KVxuICAgICAgIC5zdGF0ZSgndXNlckVkaXQnLCB7XG4gICAgICAgICAgIHVybDogJy91c2Vycy9lZGl0LzppZCcsXG4gICAgICAgICAgIHRlbXBsYXRlVXJsOiAnanMvdXNlci9lZGl0Lmh0bWwnLFxuICAgICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgICAgICAgdXNlcjogZnVuY3Rpb24oJHN0YXRlUGFyYW1zLCBVc2VyRmFjdG9yeSl7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBVc2VyRmFjdG9yeVxuICAgICAgICAgICAgICAgICAgICAgICAgLmdldFVzZXJCeUlkKCRzdGF0ZVBhcmFtcy5pZClcbiAgICAgICAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlcyl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlcy5kYXRhO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHN0YXRlczogZnVuY3Rpb24oVXRpbHMpe1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gVXRpbHMuZ2V0U3RhdGVzKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICB9LFxuICAgICAgICAgICBjb250cm9sbGVyOiBmdW5jdGlvbigkc2NvcGUsIHVzZXIsIHN0YXRlcywgVXNlckZhY3RvcnksICRzdGF0ZSl7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnVzZXIgPSB1c2VyO1xuXG4gICAgICAgICAgICAgICAgJHNjb3BlLmFsbFN0YXRlcyA9IHN0YXRlcztcblxuICAgICAgICAgICAgICAgICRzY29wZS5zZXRTdGF0ZSA9IGZ1bmN0aW9uKHN0YXRlKXtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnVzZXIuYWRkcmVzcy5zdGF0ZSA9IHN0YXRlO1xuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUudXBkYXRlVXNlciA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJGYWN0b3J5XG4gICAgICAgICAgICAgICAgICAgICAgICAudXBkYXRlVXNlcigkc2NvcGUudXNlcilcbiAgICAgICAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlcyl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKCd1c2VyRGV0YWlsJywge2lkOnJlcy5kYXRhLl9pZH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd1cGRhdGUgdXNlcicsIHJlcy5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUuZGVsZXRlVXNlciA9IGZ1bmN0aW9uKGlkKXtcbiAgICAgICAgICAgICAgICAgICAgVXNlckZhY3RvcnkucmVtb3ZlVXNlcihpZClcbiAgICAgICAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlcyl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYocmVzLmRhdGEub2spe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICB9XG4gICAgICAgfSk7XG59KTtcbiIsImFwcC5mYWN0b3J5KCdFdmVudEZhY3RvcnknLCBmdW5jdGlvbigpe1xuXHR2YXIgZGVmYXVsdEltYWdlcyA9IHtcblx0XHRiYXNrZXRiYWxsOiAnaHR0cDovL2Rlc2lnbnlvdXRydXN0LmNvbS93cC1jb250ZW50L3VwbG9hZHMvMjAxNC8wMS9UaGlzX0dhbWVfV2VfUGxheV9OWUNfQmFza2V0YmFsbF9Db3VydHNfYnlfRnJhbmNrLV9Cb2hib3RfMjAxNF8wMy5qcGcnLFxuXHRcdGNsaW1iaW5nOiAnaHR0cDovL3d3dy5nbGFwcGl0bm92YS5jb20vd3AtY29udGVudC91cGxvYWRzLzIwMTUvMDcvQktCQ2hpY2Fnby1Tb3V0aC1CdWlsZGluZy1DbGltYmluZy1XYWxsLmpwZycsXG5cdFx0c29jY2VyOiAnaHR0cDovL3d3dzMucGljdHVyZXMuemltYmlvLmNvbS9naS9OZXcrWW9yaytSZWQrQnVsbHMrTWF5b3IrQmxvb21iZXJnK09wZW4rTmV3K0Y5Wm8yV29QN2ctbC5qcGcnLFxuXHRcdGJhc2ViYWxsOiAnaHR0cDovL3d3dy5zdWl0Y2FzZWdldGF3YXlzLmNvbS93cC1jb250ZW50L3VwbG9hZHMvMjAxNC8wOC9OWUMtQ2VudHJhbC1QYXJrLUhlY2tzY2hlci1CYWxsRmllbGRzLVNvdXRoLUVuZC05Mjk2LTE0LTEwMzB4Njg2LmpwZycsXG4gXHRcdGZvb3RiYWxsOiAnaHR0cDovL3d3dy5wc2FsLm9yZy9pbWFnZXMvQXJ0aWNsZXMvMjAxNS8yMDE1MDcyMzEwNTkwMzU5MDguanBnJyxcbiBcdFx0bGlmdGluZzogJ2h0dHBzOi8vZW5jcnlwdGVkLXRibjAuZ3N0YXRpYy5jb20vaW1hZ2VzP3E9dGJuOkFOZDlHY1JFNjVRQUluWHBISnVVbUNaMzdYbGY1UnN4SnR3ZXFXQXVld01VTWtkaDR5LXY2c041VzVETkJJZycsXG5cdFx0c2tpaW5nOiAnaHR0cDovL3d3dy5ob21lLWh1bnRzLm5ldC93cC1jb250ZW50L3VwbG9hZHMvMjAxNS8wMS9DYXV0ZXJldHMtc2tpaW5nLmpwZycsXG5cdFx0bW91bnRhaW5iaWtpbmc6ICdodHRwOi8vZmlubm9oYXJhLmNvbS9ibG9nL3dwLWNvbnRlbnQvdXBsb2Fkcy8wMDAwX0ZPX0FUSExFVEVTXzk2MV8xY19SR0IuanBnJyxcblx0XHRzdXJmaW5nOiAnaHR0cHM6Ly9lbmNyeXB0ZWQtdGJuMy5nc3RhdGljLmNvbS9pbWFnZXM/cT10Ym46QU5kOUdjUmN4U0lIb2JMdmdYTWd5NmcwdTF5WGpxOXRIN2VjT0wwM1ZDVklobWYtNV9rOXZFSkMnLFxuXHRcdGN5Y2xpbmc6ICdodHRwOi8vd3d3Lm1zbmJjLmNvbS9zaXRlcy9tc25iYy9maWxlcy8yMDEzLzA1L2FwMDIwNTA1MDIyNTdfMS5qcGcnXG5cdH1cblxuXHRyZXR1cm4ge1xuXHRcdGdldFVybDogZnVuY3Rpb24odHlwZSkge1xuXHRcdFx0cmV0dXJuIGRlZmF1bHRJbWFnZXNbdHlwZV07XG5cdFx0fVxuXHR9XG59KSIsImFwcC5mYWN0b3J5KCdGdWxsc3RhY2tQaWNzJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjdnQlh1bENBQUFYUWNFLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL2ZiY2RuLXNwaG90b3MtYy1hLmFrYW1haWhkLm5ldC9ocGhvdG9zLWFrLXhhcDEvdDMxLjAtOC8xMDg2MjQ1MV8xMDIwNTYyMjk5MDM1OTI0MV84MDI3MTY4ODQzMzEyODQxMTM3X28uanBnJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CLUxLVXNoSWdBRXk5U0suanBnJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CNzktWDdvQ01BQWt3N3kuanBnJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CLVVqOUNPSUlBSUZBaDAuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CNnlJeUZpQ0VBQXFsMTIuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DRS1UNzVsV0FBQW1xcUouanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DRXZaQWctVkFBQWs5MzIuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DRWdOTWVPWElBSWZEaEsuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DRVF5SUROV2dBQXU2MEIuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DQ0YzVDVRVzhBRTJsR0ouanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DQWVWdzVTV29BQUFMc2ouanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DQWFKSVA3VWtBQWxJR3MuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DQVFPdzlsV0VBQVk5RmwuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CLU9RYlZyQ01BQU53SU0uanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9COWJfZXJ3Q1lBQXdSY0oucG5nOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CNVBUZHZuQ2NBRUFsNHguanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CNHF3QzBpQ1lBQWxQR2guanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CMmIzM3ZSSVVBQTlvMUQuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9Cd3BJd3IxSVVBQXZPMl8uanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9Cc1NzZUFOQ1lBRU9oTHcuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DSjR2TGZ1VXdBQWRhNEwuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DSTd3empFVkVBQU9QcFMuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DSWRIdlQyVXNBQW5uSFYuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DR0NpUF9ZV1lBQW83NVYuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DSVM0SlBJV0lBSTM3cXUuanBnOmxhcmdlJ1xuICAgIF07XG59KTtcbiIsImFwcC5mYWN0b3J5KCdPbmVFdmVudCcsIGZ1bmN0aW9uICgpIHtcblxuICAgIHJldHVybiB7XG4gICAgICAgIG5hbWU6IFwic2thdGluZ1wiLFxuICAgICAgICB0YWdzOlwiaWNlXCIsXG4gICAgICAgIG51bU9mUGVvcGxlOjIsXG4gICAgICAgIGRhdGU6XCIxMS8yMy8yMDE1XCIsXG4gICAgICAgIHRpbWU6XCI3OjAwXCIsXG4gICAgICAgIGZlZVBlclBlcnNvbjo1LFxuICAgICAgICBsb2NhdGlvbjpcImNlbnRyYWwgUGFya1wiLFxuICAgICAgICBkZXNjcmlwdGlvbjogXCJOaWNlIHBsYWNlXCJcbiAgICB9O1xuXG59KTtcbiIsImFwcC5mYWN0b3J5KCdSYW5kb21Nb3R0bycsIGZ1bmN0aW9uICgpIHtcblxuICAgIHZhciBnZXRSYW5kb21Gcm9tQXJyYXkgPSBmdW5jdGlvbiAoYXJyKSB7XG4gICAgICAgIHJldHVybiBhcnJbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogYXJyLmxlbmd0aCldO1xuICAgIH07XG5cbiAgICB2YXIgbW90dG8gPSBbXG4gICAgICAgICdTcG9ydCB1cCEnLFxuICAgICAgICAndGVhbXdvcmsgbWFrZXMgdGhlIGRyZWFtIHdvcmsnLFxuICAgICAgICAnSGVsbG8sIHNpbXBsZSBodW1hbi4nLFxuICAgICAgICAnV2hhdCBhIGJlYXV0aWZ1bCBkYXkhTGV0XFwncyB3b3JrIG91dCEnLFxuICAgICAgICAn55Sf5ZG95Zyo5LqO6L+Q5YqoJyxcbiAgICAgICAgJ0xpZmUgaXMgc2hvcnQsIFBsYXkgSGFyZCEnLFxuICAgICAgICAnVG9nZXRoZXIgRXZlcnlvbmUgQWNoaWV2ZXMgTW9yZS4nLFxuICAgICAgICAnVW5pdGVkIHdlIHBsYXkuIFVuaXRlZCB3ZSB3aW4uJyxcbiAgICAgICAgJ1lvdSBtYXkgYmUgc3Ryb25nLCBidXQgd2UgYXJlIHN0cm9uZ2VyLidcbiAgICBdO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgbW90dG86IG1vdHRvLFxuICAgICAgICBnZXRSYW5kb21Nb3R0bzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGdldFJhbmRvbUZyb21BcnJheShtb3R0byk7XG4gICAgICAgIH1cbiAgICB9O1xuXG59KTtcbiIsImFwcC5mYWN0b3J5KCdVc2VyRmFjdG9yeScsIGZ1bmN0aW9uKCRodHRwKXtcblxuXG4gICAgdmFyIHVzZXJzID0gW1xuICAgICAgICB7XG4gICAgICAgICAgICB1c2VyTmFtZTogJ1N0ZXdlZScsXG4gICAgICAgICAgICBmaXJzdE5hbWU6ICdTdGV3YXJ0JyxcbiAgICAgICAgICAgIGxhc3ROYW1lOiAnR3JpZmZpbicsXG4gICAgICAgICAgICBnZW5kZXI6ICdNJyxcbiAgICAgICAgICAgIGVtYWlsOiAnbWluZ2ppZUBmc2EuY29tJyxcbiAgICAgICAgICAgIGJpcnRoOiB7XG4gICAgICAgICAgICAgICAgZGF5OiAnMTUnLFxuICAgICAgICAgICAgICAgIG1vbnRoOiAnMDYnLFxuICAgICAgICAgICAgICAgIHllYXI6ICcyMDEwJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG1vdHRvOiAnTGl0dGxlIEFzc2hvbGQnLFxuICAgICAgICAgICAgYWRkcmVzczoge1xuICAgICAgICAgICAgICAgIGFkZHJlc3MxOiAnMzIxIGJyb2Fkd2F5JyxcbiAgICAgICAgICAgICAgICBhZGRyZXNzMjogJ2FwdCA0YycsXG4gICAgICAgICAgICAgICAgY2l0eTogJ25ldyB5b3JrJyxcbiAgICAgICAgICAgICAgICBzdGF0ZTogJ05ZJyxcbiAgICAgICAgICAgICAgICB6aXA6ICcxMTIyOSdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsaW5rczogW10sXG4gICAgICAgICAgICBpbWFnZTogJycsXG4gICAgICAgICAgICBhYm91dDogJ0xvcmVtIElwc3VtIGlzIHNpbXBseSBkdW1teSB0ZXh0IG9mIHRoZSBwcmludGluZyBhbmQgdHlwZXNldHRpbmcgaW5kdXN0cnkuIExvcmVtIElwc3VtIGhhcyBiZWVuIHRoZSBpbmR1c3RyeVxcJ3Mgc3RhbmRhcmQgZHVtbXkgdGV4dCBldmVyIHNpbmNlIHRoZSAxNTAwcywgd2hlbiBhbiB1bmtub3duIHByaW50ZXIgdG9vayBhIGdhbGxleSBvZiB0eXBlIGFuZCBzY3JhbWJsZWQgaXQgdG8gbWFrZSBhIHR5cGUgc3BlY2ltZW4gYm9vay4gSXQgaGFzIHN1cnZpdmVkIG5vdCBvbmx5IGZpdmUgY2VudHVyaWVzLCBidXQgYWxzbyB0aGUgbGVhcCBpbnRvIGVsZWN0cm9uaWMgdHlwZXNldHRpbmcsIHJlbWFpbmluZyBlc3NlbnRpYWxseSB1bmNoYW5nZWQuIEl0IHdhcyBwb3B1bGFyaXNlZCBpbiB0aGUgMTk2MHMgd2l0aCB0aGUgcmVsZWFzZSBvZiBMZXRyYXNldCBzaGVldHMgY29udGFpbmluZyBMb3JlbSBJcHN1bSBwYXNzYWdlcywgYW5kIG1vcmUgcmVjZW50bHkgd2l0aCBkZXNrdG9wIHB1Ymxpc2hpbmcgc29mdHdhcmUgbGlrZSBBbGR1cyBQYWdlTWFrZXIgaW5jbHVkaW5nIHZlcnNpb25zIG9mIExvcmVtIElwc3VtLidcbiAgICAgICAgfVxuICAgIF07XG4gICAgZnVuY3Rpb24gZ2V0VXNlcnMoKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvdXNlcnMvJyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0VXNlckJ5SWQoaWQpe1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL3VzZXJzLycgKyBpZCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdXBkYXRlVXNlcih1c2VyKXtcbiAgICAgICAgcmV0dXJuICRodHRwLnB1dCgnL2FwaS91c2Vycy8nLCB1c2VyKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVVc2VyKHVzZXIpe1xuICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2FwaS91c2Vycy8nLCB1c2VyKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZW1vdmVVc2VyKGlkKXtcbiAgICAgICAgcmV0dXJuICRodHRwLmRlbGV0ZSgnL2FwaS91c2Vycy8nK2lkKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBnZXRVc2VyczogZ2V0VXNlcnMsXG4gICAgICAgIGdldFVzZXJCeUlkOiBnZXRVc2VyQnlJZCxcbiAgICAgICAgdXBkYXRlVXNlcjogdXBkYXRlVXNlcixcbiAgICAgICAgY3JlYXRlVXNlcjogY3JlYXRlVXNlcixcbiAgICAgICAgcmVtb3ZlVXNlcjogcmVtb3ZlVXNlclxuICAgIH1cblxufSk7XG4iLCJhcHAuZmFjdG9yeSgnVXRpbHMnLCBmdW5jdGlvbigpe1xuXG4gICAgdmFyIHN0YXRlX2hhc2ggPSAgW1xuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJBbGFiYW1hXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIkFMXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiQWxhc2thXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIkFLXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiQW1lcmljYW4gU2Ftb2FcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiQVNcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJBcml6b25hXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIkFaXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiQXJrYW5zYXNcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiQVJcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJDYWxpZm9ybmlhXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIkNBXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiQ29sb3JhZG9cIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiQ09cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJDb25uZWN0aWN1dFwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJDVFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkRlbGF3YXJlXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIkRFXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiRGlzdHJpY3QgT2YgQ29sdW1iaWFcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiRENcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJGZWRlcmF0ZWQgU3RhdGVzIE9mIE1pY3JvbmVzaWFcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiRk1cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJGbG9yaWRhXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIkZMXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiR2VvcmdpYVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJHQVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkd1YW1cIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiR1VcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJIYXdhaWlcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiSElcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJJZGFob1wiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJJRFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIklsbGlub2lzXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIklMXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiSW5kaWFuYVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJJTlwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIklvd2FcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiSUFcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJLYW5zYXNcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiS1NcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJLZW50dWNreVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJLWVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkxvdWlzaWFuYVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJMQVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIk1haW5lXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIk1FXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiTWFyc2hhbGwgSXNsYW5kc1wiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJNSFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIk1hcnlsYW5kXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIk1EXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiTWFzc2FjaHVzZXR0c1wiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJNQVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIk1pY2hpZ2FuXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIk1JXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiTWlubmVzb3RhXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIk1OXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiTWlzc2lzc2lwcGlcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiTVNcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJNaXNzb3VyaVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJNT1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIk1vbnRhbmFcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiTVRcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJOZWJyYXNrYVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJORVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIk5ldmFkYVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJOVlwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIk5ldyBIYW1wc2hpcmVcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiTkhcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJOZXcgSmVyc2V5XCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIk5KXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiTmV3IE1leGljb1wiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJOTVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIk5ldyBZb3JrXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIk5ZXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiTm9ydGggQ2Fyb2xpbmFcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiTkNcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJOb3J0aCBEYWtvdGFcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiTkRcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJOb3J0aGVybiBNYXJpYW5hIElzbGFuZHNcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiTVBcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJPaGlvXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIk9IXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiT2tsYWhvbWFcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiT0tcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJPcmVnb25cIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiT1JcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJQYWxhdVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJQV1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIlBlbm5zeWx2YW5pYVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJQQVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIlB1ZXJ0byBSaWNvXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIlBSXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiUmhvZGUgSXNsYW5kXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIlJJXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiU291dGggQ2Fyb2xpbmFcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiU0NcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJTb3V0aCBEYWtvdGFcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiU0RcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJUZW5uZXNzZWVcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiVE5cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJUZXhhc1wiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJUWFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIlV0YWhcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiVVRcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJWZXJtb250XCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIlZUXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiVmlyZ2luIElzbGFuZHNcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiVklcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJWaXJnaW5pYVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJWQVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIldhc2hpbmd0b25cIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiV0FcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJXZXN0IFZpcmdpbmlhXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIldWXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiV2lzY29uc2luXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIldJXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiV3lvbWluZ1wiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJXWVwiXG4gICAgICAgIH1cbiAgICBdO1xuXG4gICAgZnVuY3Rpb24gZ2V0U3RhdGVzKCl7XG4gICAgICAgIHJldHVybiBzdGF0ZV9oYXNoO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIGdldFN0YXRlczogZ2V0U3RhdGVzXG4gICAgfVxufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCdlZGl0b3InLCBmdW5jdGlvbigpe1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvZWRpdG9yL2VkaXRvci5odG1sJyxcbiAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgIGNvbnRlbnQ6ICc9J1xuICAgICAgICB9LFxuICAgICAgICBjb250cm9sbGVyOiBmdW5jdGlvbigkc2NvcGUpe1xuICAgICAgICB9LFxuICAgICAgICBsaW5rOiBmdW5jdGlvbigpe1xuXG4gICAgICAgIH1cbiAgICB9O1xufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCdldmVudERldGFpbCcsIGZ1bmN0aW9uKEV2ZW50RmFjdG9yeSkge1xuXHRyZXR1cm4ge1xuXHRcdHJlc3RyaWN0OiAnRScsXG5cdFx0dGVtcGxhdGVVcmw6ICcvanMvY29tbW9uL2RpcmVjdGl2ZXMvZXZlbnQtZGV0YWlsL2V2ZW50LWRldGFpbC5odG1sJywgXG5cdFx0bGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzKXtcblx0XHRcdHNjb3BlLmdldEltYWdlID0gZnVuY3Rpb24odHlwZSkge1xuXHRcdFx0XHRyZXR1cm4gRXZlbnRGYWN0b3J5LmdldFVybCh0eXBlKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cbn0pOyIsImFwcC5kaXJlY3RpdmUoJ2V2ZW50Rm9ybScsZnVuY3Rpb24oKXtcblx0cmV0dXJuIHtcblx0XHRyZXN0cmljdDonRScsXG5cdFx0dGVtcGxhdGVVcmw6J2pzL2NvbW1vbi9kaXJlY3RpdmVzL2V2ZW50LWZvcm0vZXZlbnQtZm9ybS5odG1sJyxcblx0XHRzY29wZTp7XG5cdFx0XHRldmVudDpcIj1cIixcblx0XHRcdGZuOlwiJlwiLFxuXHRcdFx0dHlwZTonQCdcblx0XHR9LFxuXHRcdGNvbnRyb2xsZXI6J2V2ZW50Rm9ybUN0cmwnXG5cblx0fTtcbn0pO1xuXG5cbmFwcC5jb250cm9sbGVyKCdldmVudEZvcm1DdHJsJywgZnVuY3Rpb24gKCRzY29wZSkge1xuXHRjb25zb2xlLmxvZygkc2NvcGUudHlwZSk7XG4gICAgJHNjb3BlLmV2ZW50ID0ge307XG5cbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgnZmxpcHB5JywgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFQScsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKCRzY29wZSwgJGVsZW0sICRhdHRycykge1xuXG4gICAgICAgICAgICB2YXIgb3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICBmbGlwRHVyYXRpb246ICgkYXR0cnMuZmxpcER1cmF0aW9uKSA/ICRhdHRycy5mbGlwRHVyYXRpb24gOiA0MDAsXG4gICAgICAgICAgICAgICAgdGltaW5nRnVuY3Rpb246ICdlYXNlLWluLW91dCcsXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBzZXR0aW5nIGZsaXAgb3B0aW9uc1xuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKFsnZmxpcHB5LWZyb250JywgJ2ZsaXBweS1iYWNrJ10sIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgICAgICAgICB2YXIgZWwgPSAkZWxlbS5maW5kKG5hbWUpO1xuICAgICAgICAgICAgICAgIGlmIChlbC5sZW5ndGggPT0gMSkge1xuICAgICAgICAgICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goWycnLCAnLW1zLScsICctd2Via2l0LSddLCBmdW5jdGlvbihwcmVmaXgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudChlbFswXSkuY3NzKHByZWZpeCArICd0cmFuc2l0aW9uJywgJ2FsbCAnICsgb3B0aW9ucy5mbGlwRHVyYXRpb24vMTAwMCArICdzICcgKyBvcHRpb25zLnRpbWluZ0Z1bmN0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogYmVoYXZpb3VyIGZvciBmbGlwcGluZyBlZmZlY3QuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICRzY29wZS5mbGlwID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgJGVsZW0udG9nZ2xlQ2xhc3MoJ2ZsaXBwZWQnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9XG4gICAgfTtcbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgnZnVsbHN0YWNrTG9nbycsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL2Z1bGxzdGFjay1sb2dvL2Z1bGxzdGFjay1sb2dvLmh0bWwnXG4gICAgfTtcbn0pOyIsImFwcC5kaXJlY3RpdmUoJ25hdmJhcicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBdXRoU2VydmljZSwgQVVUSF9FVkVOVFMsICRzdGF0ZSkge1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgc2NvcGU6IHt9LFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL25hdmJhci9uYXZiYXIuaHRtbCcsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSkge1xuXG4gICAgICAgICAgICBzY29wZS5pdGVtcyA9IFtcbiAgICAgICAgICAgICAgICB7IGxhYmVsOiAnSG9tZScsIHN0YXRlOiAnaG9tZScgfSxcbiAgICAgICAgICAgICAgICB7IGxhYmVsOiAnQWJvdXQnLCBzdGF0ZTogJ2Fib3V0JyB9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdEb2N1bWVudGF0aW9uJywgc3RhdGU6ICdkb2NzJyB9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdVc2VycycsIHN0YXRlOiAndXNlcnMnfSxcbiAgICAgICAgICAgICAgICB7IGxhYmVsOiAnRXZlbnRzJywgc3RhdGU6ICdldmVudExpc3QnfSxcbiAgICAgICAgICAgICAgICB7IGxhYmVsOiAnTWVtYmVycyBPbmx5Jywgc3RhdGU6ICdtZW1iZXJzT25seScsIGF1dGg6IHRydWUgfVxuICAgICAgICAgICAgXTtcblxuICAgICAgICAgICAgc2NvcGUudXNlciA9IG51bGw7XG5cbiAgICAgICAgICAgIHNjb3BlLmlzTG9nZ2VkSW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2NvcGUubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmxvZ291dCgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIHNldFVzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gdXNlcjtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciByZW1vdmVVc2VyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNjb3BlLnVzZXIgPSBudWxsO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2V0VXNlcigpO1xuXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MsIHNldFVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9nb3V0U3VjY2VzcywgcmVtb3ZlVXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgcmVtb3ZlVXNlcik7XG5cbiAgICAgICAgfVxuXG4gICAgfTtcblxufSk7XG4iLCJcbmFwcC5kaXJlY3RpdmUoJ3JvdGF0ZVRleHQnLFxuICAgIGZ1bmN0aW9uKCRpbnRlcnZhbCkge1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcblxuICAgICAgICAgICAgc2NvcGUud29yZEFycj1bJ1N3aW0nLCdUZWFtJywgJ0d5bScsICdDbGltYicsICdTcG9ydCddO1xuXG4gICAgICAgICAgICBmdW5jdGlvbiB1cGRhdGVXb3JkKGkpIHtcbiAgICAgICAgICAgICAgICB2YXIgaj0oaSsxKSU1OyAvLyhpKzEpIHRvIHN0YXJ0IGF0IHNlY29uZCB3b3JkXG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhqKTtcbiAgICAgICAgICAgICAgICBlbGVtZW50LnRleHQoc2NvcGUud29yZEFycltqXSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGVsZW1lbnQudGV4dChzY29wZS53b3JkQXJyWzBdKTsgLy9kaXNwbGF5cyBcImZ1blwiXG4gICAgICAgICAgICB2YXIgc3RvcFdvcmQgPSAkaW50ZXJ2YWwodXBkYXRlV29yZCwgMjAwMCk7IC8vc3RhcnQgcm90YXRpbmcgMSBzZWNvbmQgYWZ0ZXIsIGNoYW5nZXMgZXZlcnkgc2VjXG5cbiAgICAgICAgICAgIC8vIGxpc3RlbiBvbiBET00gZGVzdHJveSAocmVtb3ZhbCkgZXZlbnRcbiAgICAgICAgICAgIC8vIHRvIHByZXZlbnQgdXBkYXRpbmcgd29yZCBhZnRlciB0aGUgRE9NIGVsZW1lbnQgd2FzIHJlbW92ZWQuXG4gICAgICAgICAgICBlbGVtZW50Lm9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICRpbnRlcnZhbC5jYW5jZWwoc3RvcFdvcmQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiIsImFwcC5kaXJlY3RpdmUoJ3JhbmRvTW90dG8nLCBmdW5jdGlvbiAoUmFuZG9tTW90dG8pIHtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvcmFuZG8tbW90dG8vcmFuZG8tbW90dG8uaHRtbCcsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSkge1xuICAgICAgICAgICAgc2NvcGUubW90dG8gPSBSYW5kb21Nb3R0by5nZXRSYW5kb21Nb3R0bygpO1xuICAgICAgICB9XG4gICAgfTtcblxufSk7Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
