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
        resolve: {
            events: function events(EventFactory) {
                return EventFactory.getEvents();
            }
        },
        controller: function controller($scope, uiGmapGoogleMapApi, Utils, events) {
            console.log(events);
            $scope.events = events;
            $scope.map = { center: { latitude: 40.773959, longitude: -73.970949 }, zoom: 14 };
            uiGmapGoogleMapApi.then(function (maps) {});
            $scope.sportsList = Utils.sportsList;
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
    $stateProvider.state('home', {
        url: '/',
        templateUrl: 'js/home/home.html'

    });
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

app.factory('EventFactory', function ($http) {
    function getEvents() {
        return $http.get('/api/events').then(function (res) {
            console.log(res);
            return res.data;
        });
    }

    return {
        getEvents: getEvents
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
        cycling: 'http://www.msnbc.com/sites/msnbc/files/2013/05/ap02050502257_1.jpg',
        tennis: 'http://images.nymag.com/guides/everything/tennis/publiccourts080505_1_560.jpg'
    };

    var sportsList = ["Basketball", "Climbing", "Soccer", "Baseball", "Football", "Lifting", "Skiing", "Mountain Biking", "Surfing", "Cycling", 'Tennis'];

    return {
        getStates: getStates,
        defaultImages: defaultImages,
        sportsList: sportsList
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

app.directive('eventDetail', function (Utils) {
    return {
        restrict: 'E',
        scope: {
            eventdata: '='
        },
        templateUrl: '/js/common/directives/event-detail/event-detail.html',
        link: function link(scope, element, attrs) {
            var defaultImages = Utils.defaultImages;
            scope.getImage = function () {
                // type = type.toLowerCase();
                // console.log(type);
                return defaultImages[scope.eventdata.sport.toLowerCase()];
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

app.directive('randoMotto', function (RandomMotto) {

    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/rando-motto/rando-motto.html',
        link: function link(scope) {
            scope.motto = RandomMotto.getRandomMotto();
        }
    };
});
app.directive('searchFilters', function (EventFactory) {
    return {
        restrict: 'E',
        templateUrl: '/js/common/directives/search-filters/search-filters.html'
    };
});

app.directive('rotateText', function ($interval) {

    return function (scope, element, attrs) {

        scope.wordArr = ['Ball', 'Swim', 'Goal', 'Tee', 'Tackle', 'Pull', 'Carve', 'Team', 'Lift', 'Climb', 'Belay', 'Cycle', 'Serve', 'Sport'];

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFib3V0L2Fib3V0LmpzIiwiZG9jcy9kb2NzLmpzIiwiZnNhL2ZzYS1wcmUtYnVpbHQuanMiLCJldmVudC9ldmVudC5qcyIsImxvZ2luL2xvZ2luLmpzIiwiaG9tZS9ob21lLmpzIiwibWVtYmVycy1vbmx5L21lbWJlcnMtb25seS5qcyIsInVzZXIvdXNlci5qcyIsImNvbW1vbi9mYWN0b3JpZXMvRXZlbnRGYWN0b3J5LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9GdWxsc3RhY2tQaWNzLmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9PbmVFdmVudC5qcyIsImNvbW1vbi9mYWN0b3JpZXMvUmFuZG9tTW90dG8uanMiLCJjb21tb24vZmFjdG9yaWVzL1VzZXJGYWN0b3J5LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9VdGlsRmFjdG9yeS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL2VkaXRvci9lZGl0b3IuanMiLCJjb21tb24vZGlyZWN0aXZlcy9ldmVudC1kZXRhaWwvZXZlbnQtZGV0YWlsLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvZXZlbnQtZm9ybS9ldmVudC1mb3JtLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvZmxpcC1jYXJkL2ZsaXAtY2FyZC5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL2Z1bGxzdGFjay1sb2dvL2Z1bGxzdGFjay1sb2dvLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3JhbmRvLW1vdHRvL3JhbmRvLW1vdHRvLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvc2VhcmNoLWZpbHRlcnMvc2VhcmNoLWZpbHRlcnMuanMiLCJjb21tb24vZGlyZWN0aXZlcy90ZXh0LXJvdGF0ZS90ZXh0LXJvdGF0ZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxZQUFBLENBQUE7QUFDQSxNQUFBLENBQUEsR0FBQSxHQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsdUJBQUEsRUFBQSxDQUFBLFdBQUEsRUFBQSxjQUFBLEVBQUEsYUFBQSxFQUFBLGNBQUEsRUFBQSxXQUFBLEVBQUEsYUFBQSxFQUFBLG1CQUFBLEVBQUEsYUFBQSxFQUFBLGVBQUEsQ0FBQSxDQUFBLENBQUE7O0FBRUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGtCQUFBLEVBQUEsaUJBQUEsRUFBQTs7QUFFQSxxQkFBQSxDQUFBLFNBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTs7QUFFQSxzQkFBQSxDQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTtDQUNBLENBQUEsQ0FDQSxNQUFBLENBQUEsVUFBQSwwQkFBQSxFQUFBO0FBQ0EsOEJBQUEsQ0FBQSxTQUFBLENBQUE7QUFDQSxXQUFBLEVBQUEseUNBQUE7QUFDQSxTQUFBLEVBQUEsTUFBQTtBQUNBLGlCQUFBLEVBQUEsZ0NBQUE7S0FDQSxDQUFBLENBQUE7Q0FDQSxDQUFBLENBQUE7OztBQUdBLEdBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxVQUFBLEVBQUEsV0FBQSxFQUFBLE1BQUEsRUFBQTs7O0FBR0EsUUFBQSw0QkFBQSxHQUFBLFNBQUEsNEJBQUEsQ0FBQSxLQUFBLEVBQUE7QUFDQSxlQUFBLEtBQUEsQ0FBQSxJQUFBLElBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxZQUFBLENBQUE7S0FDQSxDQUFBOzs7O0FBSUEsY0FBQSxDQUFBLEdBQUEsQ0FBQSxtQkFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQSxRQUFBLEVBQUE7O0FBRUEsWUFBQSxDQUFBLDRCQUFBLENBQUEsT0FBQSxDQUFBLEVBQUE7OztBQUdBLG1CQUFBO1NBQ0E7O0FBRUEsWUFBQSxXQUFBLENBQUEsZUFBQSxFQUFBLEVBQUE7OztBQUdBLG1CQUFBO1NBQ0E7OztBQUdBLGFBQUEsQ0FBQSxjQUFBLEVBQUEsQ0FBQTs7QUFFQSxtQkFBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTs7OztBQUlBLGdCQUFBLElBQUEsRUFBQTtBQUNBLHNCQUFBLENBQUEsRUFBQSxDQUFBLE9BQUEsQ0FBQSxJQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7YUFDQSxNQUFBO0FBQ0Esc0JBQUEsQ0FBQSxFQUFBLENBQUEsT0FBQSxDQUFBLENBQUE7YUFDQTtTQUNBLENBQUEsQ0FBQTtLQUVBLENBQUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUFHQSxHQUFBLENBQUEsVUFBQSxDQUFBLFVBQUEsRUFBQSxVQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUEsV0FBQSxFQUFBLE1BQUEsRUFBQSxNQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsVUFBQSxHQUFBLFlBQUE7QUFDQSxlQUFBLFdBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsVUFBQSxDQUFBLE1BQUEsR0FBQSxZQUFBO0FBQ0EsbUJBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQTtBQUNBLGtCQUFBLENBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxRQUFBLE9BQUEsR0FBQSxTQUFBLE9BQUEsR0FBQTtBQUNBLG1CQUFBLENBQUEsZUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxRQUFBLFVBQUEsR0FBQSxTQUFBLFVBQUEsR0FBQTtBQUNBLGNBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxXQUFBLEVBQUEsQ0FBQTs7QUFFQSxjQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBLEVBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSxjQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxjQUFBLEVBQUEsVUFBQSxDQUFBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FDeEZBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7OztBQUdBLGtCQUFBLENBQUEsS0FBQSxDQUFBLE9BQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxRQUFBO0FBQ0Esa0JBQUEsRUFBQSxpQkFBQTtBQUNBLG1CQUFBLEVBQUEscUJBQUE7S0FDQSxDQUFBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FBRUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxpQkFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLGFBQUEsRUFBQTs7O0FBR0EsVUFBQSxDQUFBLE1BQUEsR0FBQSxDQUFBLENBQUEsT0FBQSxDQUFBLGFBQUEsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDaEJBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7QUFDQSxrQkFBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxXQUFBLEVBQUEsT0FBQTtBQUNBLG1CQUFBLEVBQUEsbUJBQUE7S0FDQSxDQUFBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FDTEEsQ0FBQSxZQUFBOztBQUVBLGdCQUFBLENBQUE7OztBQUdBLFFBQUEsQ0FBQSxNQUFBLENBQUEsT0FBQSxFQUFBLE1BQUEsSUFBQSxLQUFBLENBQUEsd0JBQUEsQ0FBQSxDQUFBOztBQUVBLFFBQUEsR0FBQSxHQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsYUFBQSxFQUFBLEVBQUEsQ0FBQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxPQUFBLENBQUEsUUFBQSxFQUFBLFlBQUE7QUFDQSxZQUFBLENBQUEsTUFBQSxDQUFBLEVBQUEsRUFBQSxNQUFBLElBQUEsS0FBQSxDQUFBLHNCQUFBLENBQUEsQ0FBQTtBQUNBLGVBQUEsTUFBQSxDQUFBLEVBQUEsQ0FBQSxNQUFBLENBQUEsUUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0tBQ0EsQ0FBQSxDQUFBOzs7OztBQUtBLE9BQUEsQ0FBQSxRQUFBLENBQUEsYUFBQSxFQUFBO0FBQ0Esb0JBQUEsRUFBQSxvQkFBQTtBQUNBLG1CQUFBLEVBQUEsbUJBQUE7QUFDQSxxQkFBQSxFQUFBLHFCQUFBO0FBQ0Esc0JBQUEsRUFBQSxzQkFBQTtBQUNBLHdCQUFBLEVBQUEsd0JBQUE7QUFDQSxxQkFBQSxFQUFBLHFCQUFBO0tBQ0EsQ0FBQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxPQUFBLENBQUEsaUJBQUEsRUFBQSxVQUFBLFVBQUEsRUFBQSxFQUFBLEVBQUEsV0FBQSxFQUFBO0FBQ0EsWUFBQSxVQUFBLEdBQUE7QUFDQSxlQUFBLEVBQUEsV0FBQSxDQUFBLGdCQUFBO0FBQ0EsZUFBQSxFQUFBLFdBQUEsQ0FBQSxhQUFBO0FBQ0EsZUFBQSxFQUFBLFdBQUEsQ0FBQSxjQUFBO0FBQ0EsZUFBQSxFQUFBLFdBQUEsQ0FBQSxjQUFBO1NBQ0EsQ0FBQTtBQUNBLGVBQUE7QUFDQSx5QkFBQSxFQUFBLHVCQUFBLFFBQUEsRUFBQTtBQUNBLDBCQUFBLENBQUEsVUFBQSxDQUFBLFVBQUEsQ0FBQSxRQUFBLENBQUEsTUFBQSxDQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSx1QkFBQSxFQUFBLENBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO2FBQ0E7U0FDQSxDQUFBO0tBQ0EsQ0FBQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxhQUFBLEVBQUE7QUFDQSxxQkFBQSxDQUFBLFlBQUEsQ0FBQSxJQUFBLENBQUEsQ0FDQSxXQUFBLEVBQ0EsVUFBQSxTQUFBLEVBQUE7QUFDQSxtQkFBQSxTQUFBLENBQUEsR0FBQSxDQUFBLGlCQUFBLENBQUEsQ0FBQTtTQUNBLENBQ0EsQ0FBQSxDQUFBO0tBQ0EsQ0FBQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxPQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQSxVQUFBLEVBQUEsV0FBQSxFQUFBLEVBQUEsRUFBQTs7QUFFQSxpQkFBQSxpQkFBQSxDQUFBLFFBQUEsRUFBQTtBQUNBLGdCQUFBLElBQUEsR0FBQSxRQUFBLENBQUEsSUFBQSxDQUFBO0FBQ0EsbUJBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLEVBQUEsRUFBQSxJQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7QUFDQSxzQkFBQSxDQUFBLFVBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQSxDQUFBLENBQUE7QUFDQSxtQkFBQSxJQUFBLENBQUEsSUFBQSxDQUFBO1NBQ0E7Ozs7QUFJQSxZQUFBLENBQUEsZUFBQSxHQUFBLFlBQUE7QUFDQSxtQkFBQSxDQUFBLENBQUEsT0FBQSxDQUFBLElBQUEsQ0FBQTtTQUNBLENBQUE7O0FBRUEsWUFBQSxDQUFBLGVBQUEsR0FBQSxVQUFBLFVBQUEsRUFBQTs7Ozs7Ozs7OztBQVVBLGdCQUFBLElBQUEsQ0FBQSxlQUFBLEVBQUEsSUFBQSxVQUFBLEtBQUEsSUFBQSxFQUFBO0FBQ0EsdUJBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxPQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7YUFDQTs7Ozs7QUFLQSxtQkFBQSxLQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxpQkFBQSxDQUFBLFNBQUEsQ0FBQSxZQUFBO0FBQ0EsdUJBQUEsSUFBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBRUEsQ0FBQTs7QUFFQSxZQUFBLENBQUEsS0FBQSxHQUFBLFVBQUEsV0FBQSxFQUFBO0FBQ0EsbUJBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxRQUFBLEVBQUEsV0FBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLGlCQUFBLENBQUEsU0FDQSxDQUFBLFlBQUE7QUFDQSx1QkFBQSxFQUFBLENBQUEsTUFBQSxDQUFBLEVBQUEsT0FBQSxFQUFBLDRCQUFBLEVBQUEsQ0FBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBQ0EsQ0FBQTs7QUFFQSxZQUFBLENBQUEsTUFBQSxHQUFBLFlBQUE7QUFDQSxtQkFBQSxLQUFBLENBQUEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxZQUFBO0FBQ0EsdUJBQUEsQ0FBQSxPQUFBLEVBQUEsQ0FBQTtBQUNBLDBCQUFBLENBQUEsVUFBQSxDQUFBLFdBQUEsQ0FBQSxhQUFBLENBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQTtTQUNBLENBQUE7S0FFQSxDQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLE9BQUEsQ0FBQSxTQUFBLEVBQUEsVUFBQSxVQUFBLEVBQUEsV0FBQSxFQUFBOztBQUVBLFlBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxrQkFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsZ0JBQUEsRUFBQSxZQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxPQUFBLEVBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTs7QUFFQSxrQkFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsY0FBQSxFQUFBLFlBQUE7QUFDQSxnQkFBQSxDQUFBLE9BQUEsRUFBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBOztBQUVBLFlBQUEsQ0FBQSxFQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsWUFBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsWUFBQSxDQUFBLE1BQUEsR0FBQSxVQUFBLFNBQUEsRUFBQSxJQUFBLEVBQUE7QUFDQSxnQkFBQSxDQUFBLEVBQUEsR0FBQSxTQUFBLENBQUE7QUFDQSxnQkFBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7U0FDQSxDQUFBOztBQUVBLFlBQUEsQ0FBQSxPQUFBLEdBQUEsWUFBQTtBQUNBLGdCQUFBLENBQUEsRUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtTQUNBLENBQUE7S0FFQSxDQUFBLENBQUE7Q0FFQSxDQUFBLEVBQUEsQ0FBQTs7QUNwSUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTtBQUNBLGtCQUFBLENBQ0EsS0FBQSxDQUFBLFdBQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxTQUFBO0FBQ0EsbUJBQUEsRUFBQSxvQkFBQTtBQUNBLGVBQUEsRUFBQTtBQUNBLGtCQUFBLEVBQUEsZ0JBQUEsWUFBQSxFQUFBO0FBQ0EsdUJBQUEsWUFBQSxDQUFBLFNBQUEsRUFBQSxDQUFBO2FBQ0E7U0FDQTtBQUNBLGtCQUFBLEVBQUEsb0JBQUEsTUFBQSxFQUFBLGtCQUFBLEVBQUEsS0FBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLG1CQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0Esa0JBQUEsQ0FBQSxNQUFBLEdBQUEsTUFBQSxDQUFBO0FBQ0Esa0JBQUEsQ0FBQSxHQUFBLEdBQUEsRUFBQSxNQUFBLEVBQUEsRUFBQSxRQUFBLEVBQUEsU0FBQSxFQUFBLFNBQUEsRUFBQSxDQUFBLFNBQUEsRUFBQSxFQUFBLElBQUEsRUFBQSxFQUFBLEVBQUEsQ0FBQTtBQUNBLDhCQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBLEVBQUEsQ0FBQSxDQUFBO0FBQ0Esa0JBQUEsQ0FBQSxVQUFBLEdBQUEsS0FBQSxDQUFBLFVBQUEsQ0FBQTtTQUNBO0tBQ0EsQ0FBQSxDQUNBLEtBQUEsQ0FBQSxhQUFBLEVBQUE7QUFDQSxXQUFBLEVBQUEsb0JBQUE7QUFDQSxtQkFBQSxFQUFBLHNCQUFBO0FBQ0Esa0JBQUEsRUFBQSxvQkFBQSxNQUFBLEVBQUE7QUFDQSxrQkFBQSxDQUFBLElBQUEsR0FBQSxRQUFBLENBQUE7U0FDQTtLQUNBLENBQUEsQ0FDQSxLQUFBLENBQUEsYUFBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLGdCQUFBO0FBQ0EsbUJBQUEsRUFBQSxzQkFBQTtBQUNBLGtCQUFBLEVBQUEsb0JBQUEsTUFBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxNQUFBLEdBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSxxQkFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO2FBQ0EsQ0FBQTtTQUNBO0tBQ0EsQ0FBQSxDQUNBLEtBQUEsQ0FBQSxhQUFBLEVBQUE7QUFDQSxXQUFBLEVBQUEsb0JBQUE7QUFDQSxtQkFBQSxFQUFBLHNCQUFBO0FBQ0Esa0JBQUEsRUFBQSxvQkFBQSxNQUFBLEVBQUE7QUFDQSxrQkFBQSxDQUFBLE1BQUEsR0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLHFCQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7YUFDQSxDQUFBO1NBQ0E7S0FDQSxDQUFBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FDM0NBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7O0FBRUEsa0JBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLFFBQUE7QUFDQSxtQkFBQSxFQUFBLHFCQUFBO0FBQ0Esa0JBQUEsRUFBQSxXQUFBO0tBQ0EsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxVQUFBLENBQUEsV0FBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxNQUFBLEVBQUEsV0FBQSxFQUFBOztBQUVBLFVBQUEsQ0FBQSxLQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLFNBQUEsR0FBQSxVQUFBLFNBQUEsRUFBQTs7QUFFQSxjQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxtQkFBQSxDQUFBLEtBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQTtBQUNBLGtCQUFBLENBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO1NBQ0EsQ0FBQSxTQUFBLENBQUEsWUFBQTtBQUNBLGtCQUFBLENBQUEsS0FBQSxHQUFBLDRCQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FFQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxVQUFBLEdBQUEsVUFBQSxVQUFBLEVBQUE7QUFDQSxjQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsVUFBQSxDQUFBLFVBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxZQUFBO0FBQ0EsbUJBQUEsV0FBQSxDQUFBLEtBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTtTQUNBLENBQUEsQ0FDQSxJQUFBLENBQUEsWUFBQTtBQUNBLGtCQUFB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Q0FBQTtxQkFDQTtpQkFDQSxDQUFBLENBQUE7YUFDQSxDQUFBO1NBQ0E7S0FDQSxDQUFBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FDN0VBLEdBQUEsQ0FBQSxPQUFBLENBQUEsY0FBQSxFQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsYUFBQSxTQUFBLEdBQUE7QUFDQSxlQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsYUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsR0FBQSxFQUFBO0FBQ0EsbUJBQUEsQ0FBQSxHQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7QUFDQSxtQkFBQSxHQUFBLENBQUEsSUFBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBQ0E7O0FBRUEsV0FBQTtBQUNBLGlCQUFBLEVBQUEsU0FBQTtLQUNBLENBQUE7Q0FDQSxDQUFBLENBQUE7QUNYQSxHQUFBLENBQUEsT0FBQSxDQUFBLGVBQUEsRUFBQSxZQUFBO0FBQ0EsV0FBQSxDQUNBLHVEQUFBLEVBQ0EscUhBQUEsRUFDQSxpREFBQSxFQUNBLGlEQUFBLEVBQ0EsdURBQUEsRUFDQSx1REFBQSxFQUNBLHVEQUFBLEVBQ0EsdURBQUEsRUFDQSx1REFBQSxFQUNBLHVEQUFBLEVBQ0EsdURBQUEsRUFDQSx1REFBQSxFQUNBLHVEQUFBLEVBQ0EsdURBQUEsRUFDQSx1REFBQSxFQUNBLHVEQUFBLEVBQ0EsdURBQUEsRUFDQSx1REFBQSxFQUNBLHVEQUFBLEVBQ0EsdURBQUEsRUFDQSx1REFBQSxFQUNBLHVEQUFBLEVBQ0EsdURBQUEsRUFDQSx1REFBQSxFQUNBLHVEQUFBLEVBQ0EsdURBQUEsQ0FDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQzdCQSxHQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsRUFBQSxZQUFBOztBQUVBLFdBQUE7QUFDQSxZQUFBLEVBQUEsU0FBQTtBQUNBLFlBQUEsRUFBQSxLQUFBO0FBQ0EsbUJBQUEsRUFBQSxDQUFBO0FBQ0EsWUFBQSxFQUFBLFlBQUE7QUFDQSxZQUFBLEVBQUEsTUFBQTtBQUNBLG9CQUFBLEVBQUEsQ0FBQTtBQUNBLGdCQUFBLEVBQUEsY0FBQTtBQUNBLG1CQUFBLEVBQUEsWUFBQTtLQUNBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FDYkEsR0FBQSxDQUFBLE9BQUEsQ0FBQSxhQUFBLEVBQUEsWUFBQTs7QUFFQSxRQUFBLGtCQUFBLEdBQUEsU0FBQSxrQkFBQSxDQUFBLEdBQUEsRUFBQTtBQUNBLGVBQUEsR0FBQSxDQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsSUFBQSxDQUFBLE1BQUEsRUFBQSxHQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxRQUFBLEtBQUEsR0FBQSxDQUNBLFdBQUEsRUFDQSwrQkFBQSxFQUNBLHNCQUFBLEVBQ0EsdUNBQUEsRUFDQSxRQUFBLEVBQ0EsMkJBQUEsRUFDQSxrQ0FBQSxFQUNBLGdDQUFBLEVBQ0EseUNBQUEsQ0FDQSxDQUFBOztBQUVBLFdBQUE7QUFDQSxhQUFBLEVBQUEsS0FBQTtBQUNBLHNCQUFBLEVBQUEsMEJBQUE7QUFDQSxtQkFBQSxrQkFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBO1NBQ0E7S0FDQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQ3pCQSxHQUFBLENBQUEsT0FBQSxDQUFBLGFBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQTs7QUFHQSxRQUFBLEtBQUEsR0FBQSxDQUNBO0FBQ0EsZ0JBQUEsRUFBQSxRQUFBO0FBQ0EsaUJBQUEsRUFBQSxTQUFBO0FBQ0EsZ0JBQUEsRUFBQSxTQUFBO0FBQ0EsY0FBQSxFQUFBLEdBQUE7QUFDQSxhQUFBLEVBQUEsaUJBQUE7QUFDQSxhQUFBLEVBQUE7QUFDQSxlQUFBLEVBQUEsSUFBQTtBQUNBLGlCQUFBLEVBQUEsSUFBQTtBQUNBLGdCQUFBLEVBQUEsTUFBQTtTQUNBO0FBQ0EsYUFBQSxFQUFBLGdCQUFBO0FBQ0EsZUFBQSxFQUFBO0FBQ0Esb0JBQUEsRUFBQSxjQUFBO0FBQ0Esb0JBQUEsRUFBQSxRQUFBO0FBQ0EsZ0JBQUEsRUFBQSxVQUFBO0FBQ0EsaUJBQUEsRUFBQSxJQUFBO0FBQ0EsZUFBQSxFQUFBLE9BQUE7U0FDQTtBQUNBLGFBQUEsRUFBQSxFQUFBO0FBQ0EsYUFBQSxFQUFBLEVBQUE7QUFDQSxhQUFBLEVBQUEsaWtCQUFBO0tBQ0EsQ0FDQSxDQUFBO0FBQ0EsYUFBQSxRQUFBLEdBQUE7QUFDQSxlQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsYUFBQSxDQUFBLENBQUE7S0FDQTs7QUFFQSxhQUFBLFdBQUEsQ0FBQSxFQUFBLEVBQUE7QUFDQSxlQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsYUFBQSxHQUFBLEVBQUEsQ0FBQSxDQUFBO0tBQ0E7O0FBRUEsYUFBQSxVQUFBLENBQUEsSUFBQSxFQUFBO0FBQ0EsZUFBQSxLQUFBLENBQUEsR0FBQSxDQUFBLGFBQUEsRUFBQSxJQUFBLENBQUEsQ0FBQTtLQUNBOztBQUVBLGFBQUEsVUFBQSxDQUFBLElBQUEsRUFBQTtBQUNBLGVBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxhQUFBLEVBQUEsSUFBQSxDQUFBLENBQUE7S0FDQTs7QUFFQSxhQUFBLFVBQUEsQ0FBQSxFQUFBLEVBQUE7QUFDQSxlQUFBLEtBQUEsVUFBQSxDQUFBLGFBQUEsR0FBQSxFQUFBLENBQUEsQ0FBQTtLQUNBOztBQUVBLFdBQUE7QUFDQSxnQkFBQSxFQUFBLFFBQUE7QUFDQSxtQkFBQSxFQUFBLFdBQUE7QUFDQSxrQkFBQSxFQUFBLFVBQUE7QUFDQSxrQkFBQSxFQUFBLFVBQUE7QUFDQSxrQkFBQSxFQUFBLFVBQUE7S0FDQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQ3hEQSxHQUFBLENBQUEsT0FBQSxDQUFBLE9BQUEsRUFBQSxZQUFBOztBQUVBLFFBQUEsVUFBQSxHQUFBLENBQ0E7QUFDQSxjQUFBLEVBQUEsU0FBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsUUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsZ0JBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFNBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFVBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFlBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFVBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLGFBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFVBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLHNCQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxnQ0FBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsU0FBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsU0FBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsTUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsUUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsT0FBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsVUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsU0FBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsTUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsUUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsVUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsV0FBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsT0FBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsa0JBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFVBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLGVBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFVBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFdBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLGFBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFVBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFNBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFVBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFFBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLGVBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFlBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFlBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFVBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLGdCQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxjQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSwwQkFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsTUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsVUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsUUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsT0FBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsY0FBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsYUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsY0FBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsZ0JBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLGNBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFdBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLE9BQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLE1BQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFNBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLGdCQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxVQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxZQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxlQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxXQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxTQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsQ0FDQSxDQUFBOztBQUVBLGFBQUEsU0FBQSxHQUFBO0FBQ0EsZUFBQSxVQUFBLENBQUE7S0FDQTs7QUFFQSxRQUFBLGFBQUEsR0FBQTtBQUNBLGtCQUFBLEVBQUEsNEhBQUE7QUFDQSxnQkFBQSxFQUFBLG1HQUFBO0FBQ0EsY0FBQSxFQUFBLGlHQUFBO0FBQ0EsZ0JBQUEsRUFBQSxpSUFBQTtBQUNBLGdCQUFBLEVBQUEsaUVBQUE7QUFDQSxlQUFBLEVBQUEsaUhBQUE7QUFDQSxjQUFBLEVBQUEsMkVBQUE7QUFDQSxzQkFBQSxFQUFBLDhFQUFBO0FBQ0EsZUFBQSxFQUFBLDBHQUFBO0FBQ0EsZUFBQSxFQUFBLG9FQUFBO0FBQ0EsY0FBQSxFQUFBLCtFQUFBO0tBQ0EsQ0FBQTs7QUFFQSxRQUFBLFVBQUEsR0FBQSxDQUFBLFlBQUEsRUFBQSxVQUFBLEVBQUEsUUFBQSxFQUFBLFVBQUEsRUFBQSxVQUFBLEVBQUEsU0FBQSxFQUFBLFFBQUEsRUFBQSxpQkFBQSxFQUFBLFNBQUEsRUFBQSxTQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7O0FBRUEsV0FBQTtBQUNBLGlCQUFBLEVBQUEsU0FBQTtBQUNBLHFCQUFBLEVBQUEsYUFBQTtBQUNBLGtCQUFBLEVBQUEsVUFBQTtLQUNBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FDMVFBLEdBQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxFQUFBLFlBQUE7QUFDQSxXQUFBO0FBQ0EsZ0JBQUEsRUFBQSxHQUFBO0FBQ0EsbUJBQUEsRUFBQSx5Q0FBQTtBQUNBLGFBQUEsRUFBQTtBQUNBLG1CQUFBLEVBQUEsR0FBQTtTQUNBO0FBQ0Esa0JBQUEsRUFBQSxvQkFBQSxNQUFBLEVBQUEsRUFDQTtBQUNBLFlBQUEsRUFBQSxnQkFBQSxFQUVBO0tBQ0EsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7QUNiQSxHQUFBLENBQUEsU0FBQSxDQUFBLGFBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLFdBQUE7QUFDQSxnQkFBQSxFQUFBLEdBQUE7QUFDQSxhQUFBLEVBQUE7QUFDQSxxQkFBQSxFQUFBLEdBQUE7U0FDQTtBQUNBLG1CQUFBLEVBQUEsc0RBQUE7QUFDQSxZQUFBLEVBQUEsY0FBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLEtBQUEsRUFBQTtBQUNBLGdCQUFBLGFBQUEsR0FBQSxLQUFBLENBQUEsYUFBQSxDQUFBO0FBQ0EsaUJBQUEsQ0FBQSxRQUFBLEdBQUEsWUFBQTs7O0FBR0EsdUJBQUEsYUFBQSxDQUFBLEtBQUEsQ0FBQSxTQUFBLENBQUEsS0FBQSxDQUFBLFdBQUEsRUFBQSxDQUFBLENBQUE7YUFDQSxDQUFBO1NBQ0E7S0FDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBO0FDaEJBLEdBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxFQUFBLFlBQUE7QUFDQSxXQUFBO0FBQ0EsZ0JBQUEsRUFBQSxHQUFBO0FBQ0EsbUJBQUEsRUFBQSxpREFBQTtBQUNBLGFBQUEsRUFBQTtBQUNBLGlCQUFBLEVBQUEsR0FBQTtBQUNBLGNBQUEsRUFBQSxHQUFBO0FBQ0EsZ0JBQUEsRUFBQSxHQUFBO1NBQ0E7QUFDQSxrQkFBQSxFQUFBLGVBQUE7O0tBRUEsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7QUFHQSxHQUFBLENBQUEsVUFBQSxDQUFBLGVBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQTtBQUNBLFdBQUEsQ0FBQSxHQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsR0FBQSxFQUFBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FDbkJBLEdBQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxFQUFBLFlBQUE7QUFDQSxXQUFBO0FBQ0EsZ0JBQUEsRUFBQSxJQUFBO0FBQ0EsWUFBQSxFQUFBLGNBQUEsTUFBQSxFQUFBLEtBQUEsRUFBQSxN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QTs7QUFFQSxpQkFBQSxVQUFBLENBQUEsQ0FBQSxFQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTs7QUFFQSxtQkFBQSxDQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7U0FDQTs7QUFFQSxlQUFBLENBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBLFlBQUEsUUFBQSxHQUFBLFNBQUEsQ0FBQSxVQUFBLEVBQUEsSUFBQSxDQUFBLENBQUE7Ozs7QUFJQSxlQUFBLENBQUEsRUFBQSxDQUFBLFVBQUEsRUFBQSxZQUFBO0FBQ0EscUJBQUEsQ0FBQSxNQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG53aW5kb3cuYXBwID0gYW5ndWxhci5tb2R1bGUoJ0Z1bGxzdGFja0dlbmVyYXRlZEFwcCcsIFsndWkucm91dGVyJywgJ3VpLmJvb3RzdHJhcCcsICdmc2FQcmVCdWlsdCcsICduZ0ZpbGVVcGxvYWQnLCAnbmdBbmltYXRlJywgJ3RleHRBbmd1bGFyJywgJ3VpR21hcGdvb2dsZS1tYXBzJywgJ25nVGFnc0lucHV0JywgJ3NsaWRlUHVzaE1lbnUnXSk7XG5cbmFwcC5jb25maWcoZnVuY3Rpb24gKCR1cmxSb3V0ZXJQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIpIHtcbiAgICAvLyBUaGlzIHR1cm5zIG9mZiBoYXNoYmFuZyB1cmxzICgvI2Fib3V0KSBhbmQgY2hhbmdlcyBpdCB0byBzb21ldGhpbmcgbm9ybWFsICgvYWJvdXQpXG4gICAgJGxvY2F0aW9uUHJvdmlkZXIuaHRtbDVNb2RlKHRydWUpO1xuICAgIC8vIElmIHdlIGdvIHRvIGEgVVJMIHRoYXQgdWktcm91dGVyIGRvZXNuJ3QgaGF2ZSByZWdpc3RlcmVkLCBnbyB0byB0aGUgXCIvXCIgdXJsLlxuICAgICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoJy8nKTtcbn0pXG4uY29uZmlnKGZ1bmN0aW9uKHVpR21hcEdvb2dsZU1hcEFwaVByb3ZpZGVyKSB7XG4gICAgdWlHbWFwR29vZ2xlTWFwQXBpUHJvdmlkZXIuY29uZmlndXJlKHtcbiAgICAgICAga2V5OiAnQUl6YVN5Q0FmeVhzZVNYVURCUVl3ZnAyaVhyeUQ1QXZDMUo4Mk9nJyxcbiAgICAgICAgdjogJzMuMjAnLCAvL2RlZmF1bHRzIHRvIGxhdGVzdCAzLlggYW55aG93XG4gICAgICAgIGxpYnJhcmllczogJ3dlYXRoZXIsZ2VvbWV0cnksdmlzdWFsaXphdGlvbidcbiAgICB9KTtcbn0pXG5cbi8vIFRoaXMgYXBwLnJ1biBpcyBmb3IgY29udHJvbGxpbmcgYWNjZXNzIHRvIHNwZWNpZmljIHN0YXRlcy5cbmFwcC5ydW4oZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcblxuICAgIC8vIFRoZSBnaXZlbiBzdGF0ZSByZXF1aXJlcyBhbiBhdXRoZW50aWNhdGVkIHVzZXIuXG4gICAgdmFyIGRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGggPSBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmRhdGEgJiYgc3RhdGUuZGF0YS5hdXRoZW50aWNhdGU7XG4gICAgfTtcblxuICAgIC8vICRzdGF0ZUNoYW5nZVN0YXJ0IGlzIGFuIGV2ZW50IGZpcmVkXG4gICAgLy8gd2hlbmV2ZXIgdGhlIHByb2Nlc3Mgb2YgY2hhbmdpbmcgYSBzdGF0ZSBiZWdpbnMuXG4gICAgJHJvb3RTY29wZS4kb24oJyRzdGF0ZUNoYW5nZVN0YXJ0JywgZnVuY3Rpb24gKGV2ZW50LCB0b1N0YXRlLCB0b1BhcmFtcykge1xuXG4gICAgICAgIGlmICghZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCh0b1N0YXRlKSkge1xuICAgICAgICAgICAgLy8gVGhlIGRlc3RpbmF0aW9uIHN0YXRlIGRvZXMgbm90IHJlcXVpcmUgYXV0aGVudGljYXRpb25cbiAgICAgICAgICAgIC8vIFNob3J0IGNpcmN1aXQgd2l0aCByZXR1cm4uXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCkpIHtcbiAgICAgICAgICAgIC8vIFRoZSB1c2VyIGlzIGF1dGhlbnRpY2F0ZWQuXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2FuY2VsIG5hdmlnYXRpbmcgdG8gbmV3IHN0YXRlLlxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgIC8vIElmIGEgdXNlciBpcyByZXRyaWV2ZWQsIHRoZW4gcmVuYXZpZ2F0ZSB0byB0aGUgZGVzdGluYXRpb25cbiAgICAgICAgICAgIC8vICh0aGUgc2Vjb25kIHRpbWUsIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpIHdpbGwgd29yaylcbiAgICAgICAgICAgIC8vIG90aGVyd2lzZSwgaWYgbm8gdXNlciBpcyBsb2dnZWQgaW4sIGdvIHRvIFwibG9naW5cIiBzdGF0ZS5cbiAgICAgICAgICAgIGlmICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKHRvU3RhdGUubmFtZSwgdG9QYXJhbXMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2luJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgfSk7XG5cbn0pO1xuXG5cbmFwcC5jb250cm9sbGVyKCdtYWluQ3RybCcsIGZ1bmN0aW9uKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCBBVVRIX0VWRU5UUywgJHN0YXRlLCAkc2NvcGUpe1xuICAgICRzY29wZS51c2VyID0gbnVsbDtcblxuICAgICRzY29wZS5pc0xvZ2dlZEluID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCk7XG4gICAgfTtcblxuICAgICRzY29wZS5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIEF1dGhTZXJ2aWNlLmxvZ291dCgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHN0YXRlLmdvKCdob21lJyk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICB2YXIgc2V0VXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgJHNjb3BlLnVzZXIgPSB1c2VyO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgdmFyIHJlbW92ZVVzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICRzY29wZS51c2VyID0gbnVsbDtcbiAgICB9O1xuXG4gICAgc2V0VXNlcigpO1xuXG4gICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzLCBzZXRVc2VyKTtcbiAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzLCByZW1vdmVVc2VyKTtcbiAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgcmVtb3ZlVXNlcik7XG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAvLyBSZWdpc3RlciBvdXIgKmFib3V0KiBzdGF0ZS5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnYWJvdXQnLCB7XG4gICAgICAgIHVybDogJy9hYm91dCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdBYm91dENvbnRyb2xsZXInLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2Fib3V0L2Fib3V0Lmh0bWwnXG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignQWJvdXRDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSwgRnVsbHN0YWNrUGljcykge1xuXG4gICAgLy8gSW1hZ2VzIG9mIGJlYXV0aWZ1bCBGdWxsc3RhY2sgcGVvcGxlLlxuICAgICRzY29wZS5pbWFnZXMgPSBfLnNodWZmbGUoRnVsbHN0YWNrUGljcyk7XG5cbn0pOyIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2RvY3MnLCB7XG4gICAgICAgIHVybDogJy9kb2NzJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9kb2NzL2RvY3MuaHRtbCdcbiAgICB9KTtcbn0pO1xuIiwiKGZ1bmN0aW9uICgpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8vIEhvcGUgeW91IGRpZG4ndCBmb3JnZXQgQW5ndWxhciEgRHVoLWRveS5cbiAgICBpZiAoIXdpbmRvdy5hbmd1bGFyKSB0aHJvdyBuZXcgRXJyb3IoJ0kgY2FuXFwndCBmaW5kIEFuZ3VsYXIhJyk7XG5cbiAgICB2YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoJ2ZzYVByZUJ1aWx0JywgW10pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ1NvY2tldCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCF3aW5kb3cuaW8pIHRocm93IG5ldyBFcnJvcignc29ja2V0LmlvIG5vdCBmb3VuZCEnKTtcbiAgICAgICAgcmV0dXJuIHdpbmRvdy5pbyh3aW5kb3cubG9jYXRpb24ub3JpZ2luKTtcbiAgICB9KTtcblxuICAgIC8vIEFVVEhfRVZFTlRTIGlzIHVzZWQgdGhyb3VnaG91dCBvdXIgYXBwIHRvXG4gICAgLy8gYnJvYWRjYXN0IGFuZCBsaXN0ZW4gZnJvbSBhbmQgdG8gdGhlICRyb290U2NvcGVcbiAgICAvLyBmb3IgaW1wb3J0YW50IGV2ZW50cyBhYm91dCBhdXRoZW50aWNhdGlvbiBmbG93LlxuICAgIGFwcC5jb25zdGFudCgnQVVUSF9FVkVOVFMnLCB7XG4gICAgICAgIGxvZ2luU3VjY2VzczogJ2F1dGgtbG9naW4tc3VjY2VzcycsXG4gICAgICAgIGxvZ2luRmFpbGVkOiAnYXV0aC1sb2dpbi1mYWlsZWQnLFxuICAgICAgICBsb2dvdXRTdWNjZXNzOiAnYXV0aC1sb2dvdXQtc3VjY2VzcycsXG4gICAgICAgIHNlc3Npb25UaW1lb3V0OiAnYXV0aC1zZXNzaW9uLXRpbWVvdXQnLFxuICAgICAgICBub3RBdXRoZW50aWNhdGVkOiAnYXV0aC1ub3QtYXV0aGVudGljYXRlZCcsXG4gICAgICAgIG5vdEF1dGhvcml6ZWQ6ICdhdXRoLW5vdC1hdXRob3JpemVkJ1xuICAgIH0pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ0F1dGhJbnRlcmNlcHRvcicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkcSwgQVVUSF9FVkVOVFMpIHtcbiAgICAgICAgdmFyIHN0YXR1c0RpY3QgPSB7XG4gICAgICAgICAgICA0MDE6IEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsXG4gICAgICAgICAgICA0MDM6IEFVVEhfRVZFTlRTLm5vdEF1dGhvcml6ZWQsXG4gICAgICAgICAgICA0MTk6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LFxuICAgICAgICAgICAgNDQwOiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dFxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzcG9uc2VFcnJvcjogZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KHN0YXR1c0RpY3RbcmVzcG9uc2Uuc3RhdHVzXSwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UpXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG5cbiAgICBhcHAuY29uZmlnKGZ1bmN0aW9uICgkaHR0cFByb3ZpZGVyKSB7XG4gICAgICAgICRodHRwUHJvdmlkZXIuaW50ZXJjZXB0b3JzLnB1c2goW1xuICAgICAgICAgICAgJyRpbmplY3RvcicsXG4gICAgICAgICAgICBmdW5jdGlvbiAoJGluamVjdG9yKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRpbmplY3Rvci5nZXQoJ0F1dGhJbnRlcmNlcHRvcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICBdKTtcbiAgICB9KTtcblxuICAgIGFwcC5zZXJ2aWNlKCdBdXRoU2VydmljZScsIGZ1bmN0aW9uICgkaHR0cCwgU2Vzc2lvbiwgJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMsICRxKSB7XG5cbiAgICAgICAgZnVuY3Rpb24gb25TdWNjZXNzZnVsTG9naW4ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIHZhciBkYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgIFNlc3Npb24uY3JlYXRlKGRhdGEuaWQsIGRhdGEudXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzKTtcbiAgICAgICAgICAgIHJldHVybiBkYXRhLnVzZXI7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVc2VzIHRoZSBzZXNzaW9uIGZhY3RvcnkgdG8gc2VlIGlmIGFuXG4gICAgICAgIC8vIGF1dGhlbnRpY2F0ZWQgdXNlciBpcyBjdXJyZW50bHkgcmVnaXN0ZXJlZC5cbiAgICAgICAgdGhpcy5pc0F1dGhlbnRpY2F0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gISFTZXNzaW9uLnVzZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5nZXRMb2dnZWRJblVzZXIgPSBmdW5jdGlvbiAoZnJvbVNlcnZlcikge1xuXG4gICAgICAgICAgICAvLyBJZiBhbiBhdXRoZW50aWNhdGVkIHNlc3Npb24gZXhpc3RzLCB3ZVxuICAgICAgICAgICAgLy8gcmV0dXJuIHRoZSB1c2VyIGF0dGFjaGVkIHRvIHRoYXQgc2Vzc2lvblxuICAgICAgICAgICAgLy8gd2l0aCBhIHByb21pc2UuIFRoaXMgZW5zdXJlcyB0aGF0IHdlIGNhblxuICAgICAgICAgICAgLy8gYWx3YXlzIGludGVyZmFjZSB3aXRoIHRoaXMgbWV0aG9kIGFzeW5jaHJvbm91c2x5LlxuXG4gICAgICAgICAgICAvLyBPcHRpb25hbGx5LCBpZiB0cnVlIGlzIGdpdmVuIGFzIHRoZSBmcm9tU2VydmVyIHBhcmFtZXRlcixcbiAgICAgICAgICAgIC8vIHRoZW4gdGhpcyBjYWNoZWQgdmFsdWUgd2lsbCBub3QgYmUgdXNlZC5cblxuICAgICAgICAgICAgaWYgKHRoaXMuaXNBdXRoZW50aWNhdGVkKCkgJiYgZnJvbVNlcnZlciAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAkcS53aGVuKFNlc3Npb24udXNlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE1ha2UgcmVxdWVzdCBHRVQgL3Nlc3Npb24uXG4gICAgICAgICAgICAvLyBJZiBpdCByZXR1cm5zIGEgdXNlciwgY2FsbCBvblN1Y2Nlc3NmdWxMb2dpbiB3aXRoIHRoZSByZXNwb25zZS5cbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSA0MDEgcmVzcG9uc2UsIHdlIGNhdGNoIGl0IGFuZCBpbnN0ZWFkIHJlc29sdmUgdG8gbnVsbC5cbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9zZXNzaW9uJykudGhlbihvblN1Y2Nlc3NmdWxMb2dpbikuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmxvZ2luID0gZnVuY3Rpb24gKGNyZWRlbnRpYWxzKSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2xvZ2luJywgY3JlZGVudGlhbHMpXG4gICAgICAgICAgICAgICAgLnRoZW4ob25TdWNjZXNzZnVsTG9naW4pXG4gICAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdCh7IG1lc3NhZ2U6ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLicgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvbG9nb3V0JykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgU2Vzc2lvbi5kZXN0cm95KCk7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICB9KTtcblxuICAgIGFwcC5zZXJ2aWNlKCdTZXNzaW9uJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEFVVEhfRVZFTlRTKSB7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuaWQgPSBudWxsO1xuICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuXG4gICAgICAgIHRoaXMuY3JlYXRlID0gZnVuY3Rpb24gKHNlc3Npb25JZCwgdXNlcikge1xuICAgICAgICAgICAgdGhpcy5pZCA9IHNlc3Npb25JZDtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IHVzZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5pZCA9IG51bGw7XG4gICAgICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuICAgICAgICB9O1xuXG4gICAgfSk7XG5cbn0pKCk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKXtcbiAgICRzdGF0ZVByb3ZpZGVyXG4gICAgICAgLnN0YXRlKCdldmVudExpc3QnLCB7XG4gICAgICAgICAgIHVybDonL2V2ZW50cycsXG4gICAgICAgICAgIHRlbXBsYXRlVXJsOiAnanMvZXZlbnQvbGlzdC5odG1sJyxcbiAgICAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgZXZlbnRzOiBmdW5jdGlvbihFdmVudEZhY3RvcnkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIEV2ZW50RmFjdG9yeS5nZXRFdmVudHMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgfSwgXG4gICAgICAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCRzY29wZSwgdWlHbWFwR29vZ2xlTWFwQXBpLCBVdGlscywgZXZlbnRzKXtcbiAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGV2ZW50cyk7XG4gICAgICAgICAgICAgICAkc2NvcGUuZXZlbnRzID0gZXZlbnRzO1xuICAgICAgICAgICAgICAgJHNjb3BlLm1hcCA9IHsgY2VudGVyOiB7IGxhdGl0dWRlOiA0MC43NzM5NTksIGxvbmdpdHVkZTogLTczLjk3MDk0OSB9LCB6b29tOiAxNCB9O1xuICAgICAgICAgICAgICAgdWlHbWFwR29vZ2xlTWFwQXBpLnRoZW4oZnVuY3Rpb24obWFwcykge30pO1xuICAgICAgICAgICAgICAgJHNjb3BlLnNwb3J0c0xpc3QgPSBVdGlscy5zcG9ydHNMaXN0O1xuICAgICAgICAgICB9XG4gICAgICAgfSlcbiAgICAgICAuc3RhdGUoJ2V2ZW50RGV0YWlsJywge1xuICAgICAgICAgICB1cmw6Jy9ldmVudHMvZGV0YWlsLzppZCcsXG4gICAgICAgICAgIHRlbXBsYXRlVXJsOiAnanMvZXZlbnQvZGV0YWlsLmh0bWwnLFxuICAgICAgICAgICBjb250cm9sbGVyOiBmdW5jdGlvbigkc2NvcGUpe1xuICAgICAgICAgICAgICAgJHNjb3BlLnBhZ2U9XCJkZXRhaWxcIjtcbiAgICAgICAgICAgfVxuICAgICAgIH0pXG4gICAgICAgLnN0YXRlKCdldmVudENyZWF0ZScsIHtcbiAgICAgICAgICAgdXJsOicvZXZlbnRzL2NyZWF0ZScsXG4gICAgICAgICAgIHRlbXBsYXRlVXJsOiAnanMvZXZlbnQvY3JlYXRlLmh0bWwnLFxuICAgICAgICAgICBjb250cm9sbGVyOiBmdW5jdGlvbigkc2NvcGUpe1xuICAgICAgICAgICAgICAgJHNjb3BlLmNyZWF0ZSA9IGZ1bmN0aW9uKHBhcmEpIHtcbiAgICAgICAgICAgICAgICAgICAgYWxlcnQocGFyYSk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgfVxuICAgICAgIH0pXG4gICAgICAgLnN0YXRlKCdldmVudFVwZGF0ZScsIHtcbiAgICAgICAgICAgdXJsOicvZXZlbnRzL3VwZGF0ZS86aWQnLFxuICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2V2ZW50L3VwZGF0ZS5odG1sJyxcbiAgICAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oJHNjb3BlKXtcbiAgICAgICAgICAgICAgICRzY29wZS51cGRhdGUgPSBmdW5jdGlvbihwYXJhKSB7XG4gICAgICAgICAgICAgICAgICAgIGFsZXJ0KHBhcmEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgfVxuICAgICAgIH0pO1xufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2xvZ2luJywge1xuICAgICAgICB1cmw6ICcvbG9naW4nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2xvZ2luL2xvZ2luLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnTG9naW5DdHJsJ1xuICAgIH0pO1xuXG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ0xvZ2luQ3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUsIFVzZXJGYWN0b3J5KSB7XG5cbiAgICAkc2NvcGUubG9naW4gPSB7fTtcbiAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuXG4gICAgJHNjb3BlLnNlbmRMb2dpbiA9IGZ1bmN0aW9uIChsb2dpbkluZm8pIHtcblxuICAgICAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuXG4gICAgICAgIEF1dGhTZXJ2aWNlLmxvZ2luKGxvZ2luSW5mbykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnKTtcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHNjb3BlLmVycm9yID0gJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJztcbiAgICAgICAgfSk7XG5cbiAgICB9O1xuXG4gICAgJHNjb3BlLnNlbmRTaWdudXAgPSBmdW5jdGlvbihzaWdudXBJbmZvKXtcbiAgICAgICAgJHNjb3BlLmVycm9yID0gbnVsbDtcbiAgICAgICAgVXNlckZhY3RvcnkuY3JlYXRlVXNlcihzaWdudXBJbmZvKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gQXV0aFNlcnZpY2UubG9naW4oc2lnbnVwSW5mbyk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyKXtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZXJyb3IgPSBlcnI7XG4gICAgICAgICAgICB9KVxuICAgIH1cblxufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdob21lJywge1xuICAgICAgICB1cmw6ICcvJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9ob21lL2hvbWUuaHRtbCcsXG4gICAgICBcbiAgICB9KTtcbn0pOyIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbWVtYmVyc09ubHknLCB7XG4gICAgICAgIHVybDogJy9tZW1iZXJzLWFyZWEnLFxuICAgICAgICB0ZW1wbGF0ZTogJzxpbWcgbmctcmVwZWF0PVwiaXRlbSBpbiBzdGFzaFwiIHdpZHRoPVwiMzAwXCIgbmctc3JjPVwie3sgaXRlbSB9fVwiIC8+JyxcbiAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24gKCRzY29wZSwgU2VjcmV0U3Rhc2gpIHtcbiAgICAgICAgICAgIFNlY3JldFN0YXNoLmdldFN0YXNoKCkudGhlbihmdW5jdGlvbiAoc3Rhc2gpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuc3Rhc2ggPSBzdGFzaDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICAvLyBUaGUgZm9sbG93aW5nIGRhdGEuYXV0aGVudGljYXRlIGlzIHJlYWQgYnkgYW4gZXZlbnQgbGlzdGVuZXJcbiAgICAgICAgLy8gdGhhdCBjb250cm9scyBhY2Nlc3MgdG8gdGhpcyBzdGF0ZS4gUmVmZXIgdG8gYXBwLmpzLlxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICBhdXRoZW50aWNhdGU6IHRydWVcbiAgICAgICAgfVxuICAgIH0pO1xuXG59KTtcblxuYXBwLmZhY3RvcnkoJ1NlY3JldFN0YXNoJywgZnVuY3Rpb24gKCRodHRwKSB7XG5cbiAgICB2YXIgZ2V0U3Rhc2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvbWVtYmVycy9zZWNyZXQtc3Rhc2gnKS50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBnZXRTdGFzaDogZ2V0U3Rhc2hcbiAgICB9O1xuXG59KTsiLCJhcHAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKXtcbiAgICRzdGF0ZVByb3ZpZGVyXG4gICAgICAgLnN0YXRlKCd1c2VycycsIHtcbiAgICAgICAgICAgdXJsOiAnL3VzZXJzJyxcbiAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy91c2VyL2xpc3QuaHRtbCcsXG4gICAgICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICAgICAgIHVzZXJzOiBmdW5jdGlvbihVc2VyRmFjdG9yeSl7XG4gICAgICAgICAgICAgICAgICAgcmV0dXJuIFVzZXJGYWN0b3J5XG4gICAgICAgICAgICAgICAgICAgICAgIC5nZXRVc2VycygpXG4gICAgICAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlcyl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzLmRhdGE7XG4gICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICB9XG4gICAgICAgICAgIH0sXG4gICAgICAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCRzY29wZSwgdXNlcnMpe1xuICAgICAgICAgICAgICAgICRzY29wZS51c2VycyA9IHVzZXJzO1xuICAgICAgICAgICB9XG4gICAgICAgfSlcbiAgICAgICAuc3RhdGUoJ3VzZXJEZXRhaWwnLCB7XG4gICAgICAgICAgIHVybDogJy91c2Vycy9kZXRhaWwvOmlkJyxcbiAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy91c2VyL3Byb2ZpbGUuaHRtbCcsXG4gICAgICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICAgICAgIHVzZXI6IGZ1bmN0aW9uKFVzZXJGYWN0b3J5LCAkc3RhdGVQYXJhbXMpe1xuICAgICAgICAgICAgICAgICAgIHJldHVybiBVc2VyRmFjdG9yeVxuICAgICAgICAgICAgICAgICAgICAgICAuZ2V0VXNlckJ5SWQoJHN0YXRlUGFyYW1zLmlkKVxuICAgICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihyZXMpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlcy5kYXRhO1xuICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgfVxuICAgICAgICAgICB9LFxuICAgICAgICAgICBjb250cm9sbGVyOiBmdW5jdGlvbigkc2NvcGUsIHVzZXIpe1xuICAgICAgICAgICAgICAgJHNjb3BlLnVzZXIgPSB1c2VyO1xuICAgICAgICAgICB9XG4gICAgICAgfSlcbiAgICAgICAuc3RhdGUoJ3VzZXJFZGl0Jywge1xuICAgICAgICAgICB1cmw6ICcvdXNlcnMvZWRpdC86aWQnLFxuICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3VzZXIvZWRpdC5odG1sJyxcbiAgICAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgICAgIHVzZXI6IGZ1bmN0aW9uKCRzdGF0ZVBhcmFtcywgVXNlckZhY3Rvcnkpe1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gVXNlckZhY3RvcnlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5nZXRVc2VyQnlJZCgkc3RhdGVQYXJhbXMuaWQpXG4gICAgICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihyZXMpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXMuZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzdGF0ZXM6IGZ1bmN0aW9uKFV0aWxzKXtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFV0aWxzLmdldFN0YXRlcygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgfSxcbiAgICAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oJHNjb3BlLCB1c2VyLCBzdGF0ZXMsIFVzZXJGYWN0b3J5LCAkc3RhdGUpe1xuICAgICAgICAgICAgICAgICRzY29wZS51c2VyID0gdXNlcjtcblxuICAgICAgICAgICAgICAgICRzY29wZS5hbGxTdGF0ZXMgPSBzdGF0ZXM7XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUuc2V0U3RhdGUgPSBmdW5jdGlvbihzdGF0ZSl7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS51c2VyLmFkZHJlc3Muc3RhdGUgPSBzdGF0ZTtcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgJHNjb3BlLnVwZGF0ZVVzZXIgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICBVc2VyRmFjdG9yeVxuICAgICAgICAgICAgICAgICAgICAgICAgLnVwZGF0ZVVzZXIoJHNjb3BlLnVzZXIpXG4gICAgICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihyZXMpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygndXNlckRldGFpbCcsIHtpZDpyZXMuZGF0YS5faWR9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygndXBkYXRlIHVzZXInLCByZXMuZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgJHNjb3BlLmRlbGV0ZVVzZXIgPSBmdW5jdGlvbihpZCl7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJGYWN0b3J5LnJlbW92ZVVzZXIoaWQpXG4gICAgICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihyZXMpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKHJlcy5kYXRhLm9rKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdob21lJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgfVxuICAgICAgIH0pO1xufSk7XG4iLCJhcHAuZmFjdG9yeSgnRXZlbnRGYWN0b3J5JywgZnVuY3Rpb24oJGh0dHApe1xuXHRmdW5jdGlvbiBnZXRFdmVudHMoKSB7XG5cdFx0cmV0dXJuICRodHRwLmdldCgnL2FwaS9ldmVudHMnKS50aGVuKGZ1bmN0aW9uKHJlcyl7XG5cdFx0XHRjb25zb2xlLmxvZyhyZXMpO1xuXHRcdFx0cmV0dXJuIHJlcy5kYXRhO1xuXHRcdH0pO1xuXHR9XG5cblx0cmV0dXJuIHtcblx0XHRnZXRFdmVudHM6IGdldEV2ZW50c1xuXHR9XG59KTsiLCJhcHAuZmFjdG9yeSgnRnVsbHN0YWNrUGljcycsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW1xuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I3Z0JYdWxDQUFBWFFjRS5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9mYmNkbi1zcGhvdG9zLWMtYS5ha2FtYWloZC5uZXQvaHBob3Rvcy1hay14YXAxL3QzMS4wLTgvMTA4NjI0NTFfMTAyMDU2MjI5OTAzNTkyNDFfODAyNzE2ODg0MzMxMjg0MTEzN19vLmpwZycsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQi1MS1VzaElnQUV5OVNLLmpwZycsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjc5LVg3b0NNQUFrdzd5LmpwZycsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQi1VajlDT0lJQUlGQWgwLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjZ5SXlGaUNFQUFxbDEyLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0UtVDc1bFdBQUFtcXFKLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0V2WkFnLVZBQUFrOTMyLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0VnTk1lT1hJQUlmRGhLLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0VReUlETldnQUF1NjBCLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0NGM1Q1UVc4QUUybEdKLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0FlVnc1U1dvQUFBTHNqLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0FhSklQN1VrQUFsSUdzLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0FRT3c5bFdFQUFZOUZsLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQi1PUWJWckNNQUFOd0lNLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjliX2Vyd0NZQUF3UmNKLnBuZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjVQVGR2bkNjQUVBbDR4LmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjRxd0MwaUNZQUFsUEdoLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjJiMzN2UklVQUE5bzFELmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQndwSXdyMUlVQUF2TzJfLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQnNTc2VBTkNZQUVPaEx3LmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0o0dkxmdVV3QUFkYTRMLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0k3d3pqRVZFQUFPUHBTLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0lkSHZUMlVzQUFubkhWLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0dDaVBfWVdZQUFvNzVWLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0lTNEpQSVdJQUkzN3F1LmpwZzpsYXJnZSdcbiAgICBdO1xufSk7XG4iLCJhcHAuZmFjdG9yeSgnT25lRXZlbnQnLCBmdW5jdGlvbiAoKSB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBuYW1lOiBcInNrYXRpbmdcIixcbiAgICAgICAgdGFnczpcImljZVwiLFxuICAgICAgICBudW1PZlBlb3BsZToyLFxuICAgICAgICBkYXRlOlwiMTEvMjMvMjAxNVwiLFxuICAgICAgICB0aW1lOlwiNzowMFwiLFxuICAgICAgICBmZWVQZXJQZXJzb246NSxcbiAgICAgICAgbG9jYXRpb246XCJjZW50cmFsIFBhcmtcIixcbiAgICAgICAgZGVzY3JpcHRpb246IFwiTmljZSBwbGFjZVwiXG4gICAgfTtcblxufSk7XG4iLCJhcHAuZmFjdG9yeSgnUmFuZG9tTW90dG8nLCBmdW5jdGlvbiAoKSB7XG5cbiAgICB2YXIgZ2V0UmFuZG9tRnJvbUFycmF5ID0gZnVuY3Rpb24gKGFycikge1xuICAgICAgICByZXR1cm4gYXJyW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGFyci5sZW5ndGgpXTtcbiAgICB9O1xuXG4gICAgdmFyIG1vdHRvID0gW1xuICAgICAgICAnU3BvcnQgdXAhJyxcbiAgICAgICAgJ3RlYW13b3JrIG1ha2VzIHRoZSBkcmVhbSB3b3JrJyxcbiAgICAgICAgJ0hlbGxvLCBzaW1wbGUgaHVtYW4uJyxcbiAgICAgICAgJ1doYXQgYSBiZWF1dGlmdWwgZGF5IUxldFxcJ3Mgd29yayBvdXQhJyxcbiAgICAgICAgJ+eUn+WRveWcqOS6jui/kOWKqCcsXG4gICAgICAgICdMaWZlIGlzIHNob3J0LCBQbGF5IEhhcmQhJyxcbiAgICAgICAgJ1RvZ2V0aGVyIEV2ZXJ5b25lIEFjaGlldmVzIE1vcmUuJyxcbiAgICAgICAgJ1VuaXRlZCB3ZSBwbGF5LiBVbml0ZWQgd2Ugd2luLicsXG4gICAgICAgICdZb3UgbWF5IGJlIHN0cm9uZywgYnV0IHdlIGFyZSBzdHJvbmdlci4nXG4gICAgXTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIG1vdHRvOiBtb3R0byxcbiAgICAgICAgZ2V0UmFuZG9tTW90dG86IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBnZXRSYW5kb21Gcm9tQXJyYXkobW90dG8pO1xuICAgICAgICB9XG4gICAgfTtcblxufSk7XG4iLCJhcHAuZmFjdG9yeSgnVXNlckZhY3RvcnknLCBmdW5jdGlvbigkaHR0cCl7XG5cblxuICAgIHZhciB1c2VycyA9IFtcbiAgICAgICAge1xuICAgICAgICAgICAgdXNlck5hbWU6ICdTdGV3ZWUnLFxuICAgICAgICAgICAgZmlyc3ROYW1lOiAnU3Rld2FydCcsXG4gICAgICAgICAgICBsYXN0TmFtZTogJ0dyaWZmaW4nLFxuICAgICAgICAgICAgZ2VuZGVyOiAnTScsXG4gICAgICAgICAgICBlbWFpbDogJ21pbmdqaWVAZnNhLmNvbScsXG4gICAgICAgICAgICBiaXJ0aDoge1xuICAgICAgICAgICAgICAgIGRheTogJzE1JyxcbiAgICAgICAgICAgICAgICBtb250aDogJzA2JyxcbiAgICAgICAgICAgICAgICB5ZWFyOiAnMjAxMCdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBtb3R0bzogJ0xpdHRsZSBBc3Nob2xkJyxcbiAgICAgICAgICAgIGFkZHJlc3M6IHtcbiAgICAgICAgICAgICAgICBhZGRyZXNzMTogJzMyMSBicm9hZHdheScsXG4gICAgICAgICAgICAgICAgYWRkcmVzczI6ICdhcHQgNGMnLFxuICAgICAgICAgICAgICAgIGNpdHk6ICduZXcgeW9yaycsXG4gICAgICAgICAgICAgICAgc3RhdGU6ICdOWScsXG4gICAgICAgICAgICAgICAgemlwOiAnMTEyMjknXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbGlua3M6IFtdLFxuICAgICAgICAgICAgaW1hZ2U6ICcnLFxuICAgICAgICAgICAgYWJvdXQ6ICdMb3JlbSBJcHN1bSBpcyBzaW1wbHkgZHVtbXkgdGV4dCBvZiB0aGUgcHJpbnRpbmcgYW5kIHR5cGVzZXR0aW5nIGluZHVzdHJ5LiBMb3JlbSBJcHN1bSBoYXMgYmVlbiB0aGUgaW5kdXN0cnlcXCdzIHN0YW5kYXJkIGR1bW15IHRleHQgZXZlciBzaW5jZSB0aGUgMTUwMHMsIHdoZW4gYW4gdW5rbm93biBwcmludGVyIHRvb2sgYSBnYWxsZXkgb2YgdHlwZSBhbmQgc2NyYW1ibGVkIGl0IHRvIG1ha2UgYSB0eXBlIHNwZWNpbWVuIGJvb2suIEl0IGhhcyBzdXJ2aXZlZCBub3Qgb25seSBmaXZlIGNlbnR1cmllcywgYnV0IGFsc28gdGhlIGxlYXAgaW50byBlbGVjdHJvbmljIHR5cGVzZXR0aW5nLCByZW1haW5pbmcgZXNzZW50aWFsbHkgdW5jaGFuZ2VkLiBJdCB3YXMgcG9wdWxhcmlzZWQgaW4gdGhlIDE5NjBzIHdpdGggdGhlIHJlbGVhc2Ugb2YgTGV0cmFzZXQgc2hlZXRzIGNvbnRhaW5pbmcgTG9yZW0gSXBzdW0gcGFzc2FnZXMsIGFuZCBtb3JlIHJlY2VudGx5IHdpdGggZGVza3RvcCBwdWJsaXNoaW5nIHNvZnR3YXJlIGxpa2UgQWxkdXMgUGFnZU1ha2VyIGluY2x1ZGluZyB2ZXJzaW9ucyBvZiBMb3JlbSBJcHN1bS4nXG4gICAgICAgIH1cbiAgICBdO1xuICAgIGZ1bmN0aW9uIGdldFVzZXJzKCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL3VzZXJzLycpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFVzZXJCeUlkKGlkKXtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2FwaS91c2Vycy8nICsgaWQpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVwZGF0ZVVzZXIodXNlcil7XG4gICAgICAgIHJldHVybiAkaHR0cC5wdXQoJy9hcGkvdXNlcnMvJywgdXNlcik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3JlYXRlVXNlcih1c2VyKXtcbiAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9hcGkvdXNlcnMvJywgdXNlcik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVtb3ZlVXNlcihpZCl7XG4gICAgICAgIHJldHVybiAkaHR0cC5kZWxldGUoJy9hcGkvdXNlcnMvJytpZCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZ2V0VXNlcnM6IGdldFVzZXJzLFxuICAgICAgICBnZXRVc2VyQnlJZDogZ2V0VXNlckJ5SWQsXG4gICAgICAgIHVwZGF0ZVVzZXI6IHVwZGF0ZVVzZXIsXG4gICAgICAgIGNyZWF0ZVVzZXI6IGNyZWF0ZVVzZXIsXG4gICAgICAgIHJlbW92ZVVzZXI6IHJlbW92ZVVzZXJcbiAgICB9XG5cbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ1V0aWxzJywgZnVuY3Rpb24oKXtcblxuICAgIHZhciBzdGF0ZV9oYXNoID0gIFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiQWxhYmFtYVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJBTFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkFsYXNrYVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJBS1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkFtZXJpY2FuIFNhbW9hXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIkFTXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiQXJpem9uYVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJBWlwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkFya2Fuc2FzXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIkFSXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiQ2FsaWZvcm5pYVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJDQVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkNvbG9yYWRvXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIkNPXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiQ29ubmVjdGljdXRcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiQ1RcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJEZWxhd2FyZVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJERVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkRpc3RyaWN0IE9mIENvbHVtYmlhXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIkRDXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiRmVkZXJhdGVkIFN0YXRlcyBPZiBNaWNyb25lc2lhXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIkZNXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiRmxvcmlkYVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJGTFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkdlb3JnaWFcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiR0FcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJHdWFtXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIkdVXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiSGF3YWlpXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIkhJXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiSWRhaG9cIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiSURcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJJbGxpbm9pc1wiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJJTFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkluZGlhbmFcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiSU5cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJJb3dhXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIklBXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiS2Fuc2FzXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIktTXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiS2VudHVja3lcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiS1lcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJMb3Vpc2lhbmFcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiTEFcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJNYWluZVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJNRVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIk1hcnNoYWxsIElzbGFuZHNcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiTUhcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJNYXJ5bGFuZFwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJNRFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIk1hc3NhY2h1c2V0dHNcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiTUFcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJNaWNoaWdhblwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJNSVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIk1pbm5lc290YVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJNTlwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIk1pc3Npc3NpcHBpXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIk1TXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiTWlzc291cmlcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiTU9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJNb250YW5hXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIk1UXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiTmVicmFza2FcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiTkVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJOZXZhZGFcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiTlZcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJOZXcgSGFtcHNoaXJlXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIk5IXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiTmV3IEplcnNleVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJOSlwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIk5ldyBNZXhpY29cIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiTk1cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJOZXcgWW9ya1wiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJOWVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIk5vcnRoIENhcm9saW5hXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIk5DXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiTm9ydGggRGFrb3RhXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIk5EXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiTm9ydGhlcm4gTWFyaWFuYSBJc2xhbmRzXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIk1QXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiT2hpb1wiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJPSFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIk9rbGFob21hXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIk9LXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiT3JlZ29uXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIk9SXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiUGFsYXVcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiUFdcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJQZW5uc3lsdmFuaWFcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiUEFcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJQdWVydG8gUmljb1wiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJQUlwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIlJob2RlIElzbGFuZFwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJSSVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIlNvdXRoIENhcm9saW5hXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIlNDXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiU291dGggRGFrb3RhXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIlNEXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiVGVubmVzc2VlXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIlROXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiVGV4YXNcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiVFhcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJVdGFoXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIlVUXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiVmVybW9udFwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJWVFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIlZpcmdpbiBJc2xhbmRzXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIlZJXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiVmlyZ2luaWFcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiVkFcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJXYXNoaW5ndG9uXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIldBXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiV2VzdCBWaXJnaW5pYVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJXVlwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIldpc2NvbnNpblwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJXSVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIld5b21pbmdcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiV1lcIlxuICAgICAgICB9XG4gICAgXTtcblxuICAgIGZ1bmN0aW9uIGdldFN0YXRlcygpe1xuICAgICAgICByZXR1cm4gc3RhdGVfaGFzaDtcbiAgICB9XG5cbiAgICB2YXIgZGVmYXVsdEltYWdlcyA9IHtcbiAgICAgICAgYmFza2V0YmFsbDogJ2h0dHA6Ly9kZXNpZ255b3V0cnVzdC5jb20vd3AtY29udGVudC91cGxvYWRzLzIwMTQvMDEvVGhpc19HYW1lX1dlX1BsYXlfTllDX0Jhc2tldGJhbGxfQ291cnRzX2J5X0ZyYW5jay1fQm9oYm90XzIwMTRfMDMuanBnJyxcbiAgICAgICAgY2xpbWJpbmc6ICdodHRwOi8vd3d3LmdsYXBwaXRub3ZhLmNvbS93cC1jb250ZW50L3VwbG9hZHMvMjAxNS8wNy9CS0JDaGljYWdvLVNvdXRoLUJ1aWxkaW5nLUNsaW1iaW5nLVdhbGwuanBnJyxcbiAgICAgICAgc29jY2VyOiAnaHR0cDovL3d3dzMucGljdHVyZXMuemltYmlvLmNvbS9naS9OZXcrWW9yaytSZWQrQnVsbHMrTWF5b3IrQmxvb21iZXJnK09wZW4rTmV3K0Y5Wm8yV29QN2ctbC5qcGcnLFxuICAgICAgICBiYXNlYmFsbDogJ2h0dHA6Ly93d3cuc3VpdGNhc2VnZXRhd2F5cy5jb20vd3AtY29udGVudC91cGxvYWRzLzIwMTQvMDgvTllDLUNlbnRyYWwtUGFyay1IZWNrc2NoZXItQmFsbEZpZWxkcy1Tb3V0aC1FbmQtOTI5Ni0xNC0xMDMweDY4Ni5qcGcnLFxuICAgICAgICBmb290YmFsbDogJ2h0dHA6Ly93d3cucHNhbC5vcmcvaW1hZ2VzL0FydGljbGVzLzIwMTUvMjAxNTA3MjMxMDU5MDM1OTA4LmpwZycsXG4gICAgICAgIGxpZnRpbmc6ICdodHRwczovL2VuY3J5cHRlZC10Ym4wLmdzdGF0aWMuY29tL2ltYWdlcz9xPXRibjpBTmQ5R2NSRTY1UUFJblhwSEp1VW1DWjM3WGxmNVJzeEp0d2VxV0F1ZXdNVU1rZGg0eS12NnNONVc1RE5CSWcnLFxuICAgICAgICBza2lpbmc6ICdodHRwOi8vd3d3LmhvbWUtaHVudHMubmV0L3dwLWNvbnRlbnQvdXBsb2Fkcy8yMDE1LzAxL0NhdXRlcmV0cy1za2lpbmcuanBnJyxcbiAgICAgICAgbW91bnRhaW5iaWtpbmc6ICdodHRwOi8vZmlubm9oYXJhLmNvbS9ibG9nL3dwLWNvbnRlbnQvdXBsb2Fkcy8wMDAwX0ZPX0FUSExFVEVTXzk2MV8xY19SR0IuanBnJyxcbiAgICAgICAgc3VyZmluZzogJ2h0dHBzOi8vZW5jcnlwdGVkLXRibjMuZ3N0YXRpYy5jb20vaW1hZ2VzP3E9dGJuOkFOZDlHY1JjeFNJSG9iTHZnWE1neTZnMHUxeVhqcTl0SDdlY09MMDNWQ1ZJaG1mLTVfazl2RUpDJyxcbiAgICAgICAgY3ljbGluZzogJ2h0dHA6Ly93d3cubXNuYmMuY29tL3NpdGVzL21zbmJjL2ZpbGVzLzIwMTMvMDUvYXAwMjA1MDUwMjI1N18xLmpwZycsXG4gICAgICAgIHRlbm5pczogJ2h0dHA6Ly9pbWFnZXMubnltYWcuY29tL2d1aWRlcy9ldmVyeXRoaW5nL3Rlbm5pcy9wdWJsaWNjb3VydHMwODA1MDVfMV81NjAuanBnJ1xuICAgIH1cblxuICAgIHZhciBzcG9ydHNMaXN0ID0gW1wiQmFza2V0YmFsbFwiLCBcIkNsaW1iaW5nXCIsIFwiU29jY2VyXCIsIFwiQmFzZWJhbGxcIiwgXCJGb290YmFsbFwiLCBcIkxpZnRpbmdcIiwgXCJTa2lpbmdcIiwgXCJNb3VudGFpbiBCaWtpbmdcIiwgXCJTdXJmaW5nXCIsIFwiQ3ljbGluZ1wiLCAnVGVubmlzJ107XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBnZXRTdGF0ZXM6IGdldFN0YXRlcyxcbiAgICAgICAgZGVmYXVsdEltYWdlczogZGVmYXVsdEltYWdlcyxcbiAgICAgICAgc3BvcnRzTGlzdDogc3BvcnRzTGlzdFxuICAgIH1cbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgnZWRpdG9yJywgZnVuY3Rpb24oKXtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL2VkaXRvci9lZGl0b3IuaHRtbCcsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICBjb250ZW50OiAnPSdcbiAgICAgICAgfSxcbiAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oJHNjb3BlKXtcbiAgICAgICAgfSxcbiAgICAgICAgbGluazogZnVuY3Rpb24oKXtcblxuICAgICAgICB9XG4gICAgfTtcbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgnZXZlbnREZXRhaWwnLCBmdW5jdGlvbihVdGlscykge1xuXHRyZXR1cm4ge1xuXHRcdHJlc3RyaWN0OiAnRScsXG5cdFx0c2NvcGU6IHtcblx0XHRcdGV2ZW50ZGF0YTogJz0nXG5cdFx0fSxcblx0XHR0ZW1wbGF0ZVVybDogJy9qcy9jb21tb24vZGlyZWN0aXZlcy9ldmVudC1kZXRhaWwvZXZlbnQtZGV0YWlsLmh0bWwnLCBcblx0XHRsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMpe1xuXHRcdFx0dmFyIGRlZmF1bHRJbWFnZXMgPSBVdGlscy5kZWZhdWx0SW1hZ2VzO1xuXHRcdFx0c2NvcGUuZ2V0SW1hZ2UgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0Ly8gdHlwZSA9IHR5cGUudG9Mb3dlckNhc2UoKTtcblx0XHRcdFx0Ly8gY29uc29sZS5sb2codHlwZSk7XG5cdFx0XHRcdHJldHVybiBkZWZhdWx0SW1hZ2VzW3Njb3BlLmV2ZW50ZGF0YS5zcG9ydC50b0xvd2VyQ2FzZSgpXTtcblx0XHRcdH1cblx0XHR9XG5cdH1cbn0pOyIsImFwcC5kaXJlY3RpdmUoJ2V2ZW50Rm9ybScsZnVuY3Rpb24oKXtcblx0cmV0dXJuIHtcblx0XHRyZXN0cmljdDonRScsXG5cdFx0dGVtcGxhdGVVcmw6J2pzL2NvbW1vbi9kaXJlY3RpdmVzL2V2ZW50LWZvcm0vZXZlbnQtZm9ybS5odG1sJyxcblx0XHRzY29wZTp7XG5cdFx0XHRldmVudDpcIj1cIixcblx0XHRcdGZuOlwiJlwiLFxuXHRcdFx0dHlwZTonQCdcblx0XHR9LFxuXHRcdGNvbnRyb2xsZXI6J2V2ZW50Rm9ybUN0cmwnXG5cblx0fTtcbn0pO1xuXG5cbmFwcC5jb250cm9sbGVyKCdldmVudEZvcm1DdHJsJywgZnVuY3Rpb24gKCRzY29wZSkge1xuXHRjb25zb2xlLmxvZygkc2NvcGUudHlwZSk7XG4gICAgJHNjb3BlLmV2ZW50ID0ge307XG5cbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgnZmxpcHB5JywgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFQScsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKCRzY29wZSwgJGVsZW0sICRhdHRycykge1xuXG4gICAgICAgICAgICB2YXIgb3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICBmbGlwRHVyYXRpb246ICgkYXR0cnMuZmxpcER1cmF0aW9uKSA/ICRhdHRycy5mbGlwRHVyYXRpb24gOiA0MDAsXG4gICAgICAgICAgICAgICAgdGltaW5nRnVuY3Rpb246ICdlYXNlLWluLW91dCcsXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBzZXR0aW5nIGZsaXAgb3B0aW9uc1xuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKFsnZmxpcHB5LWZyb250JywgJ2ZsaXBweS1iYWNrJ10sIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgICAgICAgICB2YXIgZWwgPSAkZWxlbS5maW5kKG5hbWUpO1xuICAgICAgICAgICAgICAgIGlmIChlbC5sZW5ndGggPT0gMSkge1xuICAgICAgICAgICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goWycnLCAnLW1zLScsICctd2Via2l0LSddLCBmdW5jdGlvbihwcmVmaXgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudChlbFswXSkuY3NzKHByZWZpeCArICd0cmFuc2l0aW9uJywgJ2FsbCAnICsgb3B0aW9ucy5mbGlwRHVyYXRpb24vMTAwMCArICdzICcgKyBvcHRpb25zLnRpbWluZ0Z1bmN0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogYmVoYXZpb3VyIGZvciBmbGlwcGluZyBlZmZlY3QuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICRzY29wZS5mbGlwID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgJGVsZW0udG9nZ2xlQ2xhc3MoJ2ZsaXBwZWQnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9XG4gICAgfTtcbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgnZnVsbHN0YWNrTG9nbycsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL2Z1bGxzdGFjay1sb2dvL2Z1bGxzdGFjay1sb2dvLmh0bWwnXG4gICAgfTtcbn0pOyIsImFwcC5kaXJlY3RpdmUoJ25hdmJhcicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBdXRoU2VydmljZSwgQVVUSF9FVkVOVFMsICRzdGF0ZSkge1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgc2NvcGU6IHt9LFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL25hdmJhci9uYXZiYXIuaHRtbCcsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSkge1xuXG4gICAgICAgICAgICBzY29wZS5pdGVtcyA9IFtcbiAgICAgICAgICAgICAgICB7IGxhYmVsOiAnSG9tZScsIHN0YXRlOiAnaG9tZScgfSxcbiAgICAgICAgICAgICAgICB7IGxhYmVsOiAnQWJvdXQnLCBzdGF0ZTogJ2Fib3V0JyB9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdEb2N1bWVudGF0aW9uJywgc3RhdGU6ICdkb2NzJyB9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdVc2VycycsIHN0YXRlOiAndXNlcnMnfSxcbiAgICAgICAgICAgICAgICB7IGxhYmVsOiAnRXZlbnRzJywgc3RhdGU6ICdldmVudExpc3QnfSxcbiAgICAgICAgICAgICAgICB7IGxhYmVsOiAnTWVtYmVycyBPbmx5Jywgc3RhdGU6ICdtZW1iZXJzT25seScsIGF1dGg6IHRydWUgfVxuICAgICAgICAgICAgXTtcblxuICAgICAgICAgICAgc2NvcGUudXNlciA9IG51bGw7XG5cbiAgICAgICAgICAgIHNjb3BlLmlzTG9nZ2VkSW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2NvcGUubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmxvZ291dCgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIHNldFVzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gdXNlcjtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciByZW1vdmVVc2VyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNjb3BlLnVzZXIgPSBudWxsO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2V0VXNlcigpO1xuXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MsIHNldFVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9nb3V0U3VjY2VzcywgcmVtb3ZlVXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgcmVtb3ZlVXNlcik7XG5cbiAgICAgICAgfVxuXG4gICAgfTtcblxufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCdyYW5kb01vdHRvJywgZnVuY3Rpb24gKFJhbmRvbU1vdHRvKSB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL3JhbmRvLW1vdHRvL3JhbmRvLW1vdHRvLmh0bWwnLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUpIHtcbiAgICAgICAgICAgIHNjb3BlLm1vdHRvID0gUmFuZG9tTW90dG8uZ2V0UmFuZG9tTW90dG8oKTtcbiAgICAgICAgfVxuICAgIH07XG5cbn0pOyIsImFwcC5kaXJlY3RpdmUoJ3NlYXJjaEZpbHRlcnMnLCBmdW5jdGlvbihFdmVudEZhY3RvcnkpIHtcblx0cmV0dXJuIHtcblx0XHRyZXN0cmljdDogJ0UnLFxuXHRcdHRlbXBsYXRlVXJsOiAnL2pzL2NvbW1vbi9kaXJlY3RpdmVzL3NlYXJjaC1maWx0ZXJzL3NlYXJjaC1maWx0ZXJzLmh0bWwnLCBcblx0XHR9XG5cdH0pOyIsIlxuYXBwLmRpcmVjdGl2ZSgncm90YXRlVGV4dCcsXG4gICAgZnVuY3Rpb24oJGludGVydmFsKSB7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xuXG4gICAgICAgICAgICBzY29wZS53b3JkQXJyPVsnQmFsbCcsICdTd2ltJywgJ0dvYWwnLCAnVGVlJywgJ1RhY2tsZScsICdQdWxsJywgJ0NhcnZlJywgJ1RlYW0nLCAnTGlmdCcsICdDbGltYicsICdCZWxheScsICdDeWNsZScsICdTZXJ2ZScsICdTcG9ydCddO1xuXG4gICAgICAgICAgICBmdW5jdGlvbiB1cGRhdGVXb3JkKGkpIHtcbiAgICAgICAgICAgICAgICB2YXIgaj0oaSsxKSU1OyAvLyhpKzEpIHRvIHN0YXJ0IGF0IHNlY29uZCB3b3JkXG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhqKTtcbiAgICAgICAgICAgICAgICBlbGVtZW50LnRleHQoc2NvcGUud29yZEFycltqXSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGVsZW1lbnQudGV4dChzY29wZS53b3JkQXJyWzBdKTsgLy9kaXNwbGF5cyBcImZ1blwiXG4gICAgICAgICAgICB2YXIgc3RvcFdvcmQgPSAkaW50ZXJ2YWwodXBkYXRlV29yZCwgMjAwMCk7IC8vc3RhcnQgcm90YXRpbmcgMSBzZWNvbmQgYWZ0ZXIsIGNoYW5nZXMgZXZlcnkgc2VjXG5cbiAgICAgICAgICAgIC8vIGxpc3RlbiBvbiBET00gZGVzdHJveSAocmVtb3ZhbCkgZXZlbnRcbiAgICAgICAgICAgIC8vIHRvIHByZXZlbnQgdXBkYXRpbmcgd29yZCBhZnRlciB0aGUgRE9NIGVsZW1lbnQgd2FzIHJlbW92ZWQuXG4gICAgICAgICAgICBlbGVtZW50Lm9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICRpbnRlcnZhbC5jYW5jZWwoc3RvcFdvcmQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
