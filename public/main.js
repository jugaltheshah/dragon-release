'use strict';
window.app = angular.module('FullstackGeneratedApp', ['ui.router', 'ui.bootstrap', 'fsaPreBuilt', 'ngFileUpload', 'ngAnimate', 'textAngular', 'uiGmapgoogle-maps', 'ngTagsInput', 'slidePushMenu', 'ngAutocomplete', 'ui.bootstrap.datetimepicker']);

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
        controller: function controller($scope, uiGmapGoogleMapApi, EventFactory) {
            $scope.map = { center: { latitude: 40.773959, longitude: -73.970949 }, zoom: 14 };
            uiGmapGoogleMapApi.then(function (maps) {});
            $scope.sportsList = EventFactory.sportsList;
        }
    }).state('eventDetail', {
        url: '/events/detail/:id',
        templateUrl: 'js/event/detail.html',
        resolve: {
            event: function event(EventFactory, $stateParams) {
                return EventFactory.getEventById($stateParams.id).then(function (res) {
                    return res.data;
                });
            }
        },
        controller: function controller($scope, event) {
            $scope.page = "detail";
            console.log(event);
            $scope.event = event;
            ;
        }
    }).state('eventCreate', {
        url: '/events/create',
        templateUrl: 'js/event/create.html',
        controller: function controller($scope, EventFactory, $state) {
            $scope.createEvent = function () {
                EventFactory.createEvent($scope.event).then(function (res) {
                    $state.go('eventDetail', { id: res.data._id });
                });
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
app.factory('EventFactory', function ($http) {
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

    function createEvent(event) {
        return $http.post('/api/event/', event);
    }

    function getEventById(id) {
        return $http.get('/api/event/' + id);
    }
    return {
        getUrl: function getUrl(type) {
            return defaultImages[type];
        },
        createEvent: createEvent,
        getEventById: getEventById,
        sportsList: sportsList
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
            event: "="
        },
        controller: 'eventFormCtrl'

    };
});

app.controller('eventFormCtrl', function ($scope) {});

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFib3V0L2Fib3V0LmpzIiwiZG9jcy9kb2NzLmpzIiwiZXZlbnQvZXZlbnQuanMiLCJmc2EvZnNhLXByZS1idWlsdC5qcyIsImhvbWUvaG9tZS5qcyIsImxvZ2luL2xvZ2luLmpzIiwidXNlci91c2VyLmpzIiwibWVtYmVycy1vbmx5L21lbWJlcnMtb25seS5qcyIsImNvbW1vbi9mYWN0b3JpZXMvRXZlbnRGYWN0b3J5LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9GdWxsc3RhY2tQaWNzLmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9PbmVFdmVudC5qcyIsImNvbW1vbi9mYWN0b3JpZXMvUmFuZG9tTW90dG8uanMiLCJjb21tb24vZmFjdG9yaWVzL1VzZXJGYWN0b3J5LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9VdGlsRmFjdG9yeS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL2VkaXRvci9lZGl0b3IuanMiLCJjb21tb24vZGlyZWN0aXZlcy9ldmVudC1kZXRhaWwvZXZlbnQtZGV0YWlsLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvZXZlbnQtZm9ybS9ldmVudC1mb3JtLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvZmxpcC1jYXJkL2ZsaXAtY2FyZC5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL2Z1bGxzdGFjay1sb2dvL2Z1bGxzdGFjay1sb2dvLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3JhbmRvLW1vdHRvL3JhbmRvLW1vdHRvLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvc2VhcmNoLWZpbHRlcnMvc2VhcmNoLWZpbHRlcnMuanMiLCJjb21tb24vZGlyZWN0aXZlcy90ZXh0LXJvdGF0ZS90ZXh0LXJvdGF0ZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxZQUFBLENBQUE7QUFDQSxNQUFBLENBQUEsR0FBQSxHQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsdUJBQUEsRUFBQSxDQUFBLFdBQUEsRUFBQSxjQUFBLEVBQUEsYUFBQSxFQUFBLGNBQUEsRUFBQSxXQUFBLEVBQUEsYUFBQSxFQUFBLG1CQUFBLEVBQUEsYUFBQSxFQUFBLGVBQUEsRUFBQSxnQkFBQSxFQUFBLDZCQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxrQkFBQSxFQUFBLGlCQUFBLEVBQUE7O0FBRUEscUJBQUEsQ0FBQSxTQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7O0FBRUEsc0JBQUEsQ0FBQSxTQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7Q0FDQSxDQUFBLENBQ0EsTUFBQSxDQUFBLFVBQUEsMEJBQUEsRUFBQTtBQUNBLDhCQUFBLENBQUEsU0FBQSxDQUFBO0FBQ0EsV0FBQSxFQUFBLHlDQUFBO0FBQ0EsU0FBQSxFQUFBLE1BQUE7QUFDQSxpQkFBQSxFQUFBLGdDQUFBO0tBQ0EsQ0FBQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOzs7QUFHQSxHQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsVUFBQSxFQUFBLFdBQUEsRUFBQSxNQUFBLEVBQUE7OztBQUdBLFFBQUEsNEJBQUEsR0FBQSxTQUFBLDRCQUFBLENBQUEsS0FBQSxFQUFBO0FBQ0EsZUFBQSxLQUFBLENBQUEsSUFBQSxJQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQSxDQUFBO0tBQ0EsQ0FBQTs7OztBQUlBLGNBQUEsQ0FBQSxHQUFBLENBQUEsbUJBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsUUFBQSxFQUFBOztBQUVBLFlBQUEsQ0FBQSw0QkFBQSxDQUFBLE9BQUEsQ0FBQSxFQUFBOzs7QUFHQSxtQkFBQTtTQUNBOztBQUVBLFlBQUEsV0FBQSxDQUFBLGVBQUEsRUFBQSxFQUFBOzs7QUFHQSxtQkFBQTtTQUNBOzs7QUFHQSxhQUFBLENBQUEsY0FBQSxFQUFBLENBQUE7O0FBRUEsbUJBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7Ozs7QUFJQSxnQkFBQSxJQUFBLEVBQUE7QUFDQSxzQkFBQSxDQUFBLEVBQUEsQ0FBQSxPQUFBLENBQUEsSUFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO2FBQ0EsTUFBQTtBQUNBLHNCQUFBLENBQUEsRUFBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBO2FBQ0E7U0FDQSxDQUFBLENBQUE7S0FFQSxDQUFBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FBR0EsR0FBQSxDQUFBLFVBQUEsQ0FBQSxVQUFBLEVBQUEsVUFBQSxVQUFBLEVBQUEsV0FBQSxFQUFBLFdBQUEsRUFBQSxNQUFBLEVBQUEsTUFBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLFVBQUEsR0FBQSxZQUFBO0FBQ0EsZUFBQSxXQUFBLENBQUEsZUFBQSxFQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxNQUFBLEdBQUEsWUFBQTtBQUNBLG1CQUFBLENBQUEsTUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFlBQUE7QUFDQSxrQkFBQSxDQUFBLEVBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsUUFBQSxPQUFBLEdBQUEsU0FBQSxPQUFBLEdBQUE7QUFDQSxtQkFBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLGtCQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsUUFBQSxVQUFBLEdBQUEsU0FBQSxVQUFBLEdBQUE7QUFDQSxjQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsV0FBQSxFQUFBLENBQUE7O0FBRUEsY0FBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0EsY0FBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsQ0FBQSxDQUFBO0FBQ0EsY0FBQSxDQUFBLEdB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QSxDQUFBLGNBQUE7U0FDQSxDQUFBO0FBQ0EsZUFBQTtBQUNBLHlCQUFBLEVBQUEsdUJBQUEsUUFBQSxFQUFBO0FBQ0EsMEJBQUEsQ0FBQSxVQUFBLENBQUEsVUFBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLENBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLHVCQUFBLEVBQUEsQ0FBQSxNQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7YUFDQTtTQUNBLENBQUE7S0FDQSxDQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGFBQUEsRUFBQTtBQUNBLHFCQUFBLENBQUEsWUFBQSxDQUFBLElBQUEsQ0FBQSxDQUNBLFdBQUEsRUFDQSxVQUFBLFNBQUEsRUFBQTtBQUNBLG1CQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsaUJBQUEsQ0FBQSxDQUFBO1NBQ0EsQ0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7O0FBRUEsT0FBQSxDQUFBLE9BQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUEsRUFBQSxFQUFBOztBQUVBLGlCQUFBLGlCQUFBLENBQUEsUUFBQSxFQUFBO0FBQ0EsZ0JBQUEsSUFBQSxHQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsRUFBQSxFQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsVUFBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQTtBQUNBLG1CQUFBLElBQUEsQ0FBQSxJQUFBLENBQUE7U0FDQTs7OztBQUlBLFlBQUEsQ0FBQSxlQUFBLEdBQUEsWUFBQTtBQUNBLG1CQUFBLENBQUEsQ0FBQSxPQUFBLENBQUEsSUFBQSxDQUFBO1NBQ0EsQ0FBQTs7QUFFQSxZQUFBLENBQUEsZUFBQSxHQUFBLFVBQUEsVUFBQSxFQUFBOzs7Ozs7Ozs7O0FBVUEsZ0JBQUEsSUFBQSxDQUFBLGVBQUEsRUFBQSxJQUFBLFVBQUEsS0FBQSxJQUFBLEVBQUE7QUFDQSx1QkFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLE9BQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTthQUNBOzs7OztBQUtBLG1CQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLGlCQUFBLENBQUEsU0FBQSxDQUFBLFlBQUE7QUFDQSx1QkFBQSxJQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FFQSxDQUFBOztBQUVBLFlBQUEsQ0FBQSxLQUFBLEdBQUEsVUFBQSxXQUFBLEVBQUE7QUFDQSxtQkFBQSxLQUFBLENBQUEsSUFBQSxDQUFBLFFBQUEsRUFBQSxXQUFBLENBQUEsQ0FDQSxJQUFBLENBQUEsaUJBQUEsQ0FBQSxTQUNBLENBQUEsWUFBQTtBQUNBLHVCQUFBLEVBQUEsQ0FBQSxNQUFBLENBQUEsRUFBQSxPQUFBLEVBQUEsNEJBQUEsRUFBQSxDQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FDQSxDQUFBOztBQUVBLFlBQUEsQ0FBQSxNQUFBLEdBQUEsWUFBQTtBQUNBLG1CQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFlBQUE7QUFDQSx1QkFBQSxDQUFBLE9BQUEsRUFBQSxDQUFBO0FBQ0EsMEJBQUEsQ0FBQSxVQUFBLENBQUEsV0FBQSxDQUFBLGFBQUEsQ0FBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBQ0EsQ0FBQTtLQUVBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsT0FBQSxDQUFBLFNBQUEsRUFBQSxVQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUE7O0FBRUEsWUFBQSxJQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLGtCQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxnQkFBQSxFQUFBLFlBQUE7QUFDQSxnQkFBQSxDQUFBLE9BQUEsRUFBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBOztBQUVBLGtCQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxjQUFBLEVBQUEsWUFBQTtBQUNBLGdCQUFBLENBQUEsT0FBQSxFQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7O0FBRUEsWUFBQSxDQUFBLEVBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxZQUFBLENBQUEsTUFBQSxHQUFBLFVBQUEsU0FBQSxFQUFBLElBQUEsRUFBQTtBQUNBLGdCQUFBLENBQUEsRUFBQSxHQUFBLFNBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtTQUNBLENBQUE7O0FBRUEsWUFBQSxDQUFBLE9BQUEsR0FBQSxZQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxFQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO1NBQ0EsQ0FBQTtLQUVBLENBQUEsQ0FBQTtDQUVBLENBQUEsRUFBQSxDQUFBOztBQ3BJQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLEdBQUE7QUFDQSxtQkFBQSxFQUFBLG1CQUFBOztLQUVBLENBQUEsQ0FBQTtDQUNBLENBQUEsQ0FBQTtBQ05BLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7O0FBRUEsa0JBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLFFBQUE7QUFDQSxtQkFBQSxFQUFBLHFCQUFBO0FBQ0Esa0JBQUEsRUFBQSxXQUFBO0tBQ0EsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxVQUFBLENBQUEsV0FBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxNQUFBLEVBQUEsV0FBQSxFQUFBOztBQUVBLFVBQUEsQ0FBQSxLQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsVUFBQSxDQUFBLFNBQUEsR0FBQSxVQUFBLFNBQUEs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QUVBLGtCQUFBLENBQUEsUUFBQSxHQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0Esc0JBQUEsQ0FBQSxJQUFBLENBQUEsT0FBQSxDQUFBLEtBQUEsR0FBQSxLQUFBLENBQUE7YUFDQSxDQUFBOztBQUVBLGtCQUFBLENBQUEsVUFBQSxHQUFBLFlBQUE7QUFDQSwyQkFBQSxDQUNBLFVBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLFVBQUEsR0FBQSxFQUFBO0FBQ0EsMEJBQUEsQ0FBQSxFQUFBLENBQUEsWUFBQSxFQUFBLEVBQUEsRUFBQSxFQUFBLEdBQUEsQ0FBQSxJQUFBLENBQUEsR0FBQSxFQUFBLENBQUEsQ0FBQTtBQUNBLDJCQUFBLENBQUEsR0FBQSxDQUFBLGFBQUEsRUFBQSxHQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7aUJBQ0EsQ0FBQSxDQUFBO2FBQ0EsQ0FBQTs7QUFFQSxrQkFBQSxDQUFBLFVBQUEsR0FBQSxVQUFBLEVBQUEsRUFBQTtBQUNBLDJCQUFBLENBQUEsVUFBQSxDQUFBLEVBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxVQUFBLEdBQUEsRUFBQTtBQUNBLHdCQUFBLEdBQUEsQ0FBQSxJQUFBLENBQUEsRUFBQSxFQUFBO0FBQ0EsOEJBQUEsQ0FBQSxFQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7cUJBQ0E7aUJBQ0EsQ0FBQSxDQUFBO2FBQ0EsQ0FBQTtTQUNBO0tBQ0EsQ0FBQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQzdFQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBOztBQUVBLGtCQUFBLENBQUEsS0FBQSxDQUFBLGFBQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxlQUFBO0FBQ0EsZ0JBQUEsRUFBQSxtRUFBQTtBQUNBLGtCQUFBLEVBQUEsb0JBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQTtBQUNBLHVCQUFBLENBQUEsUUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0Esc0JBQUEsQ0FBQSxLQUFBLEdBQUEsS0FBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBQ0E7OztBQUdBLFlBQUEsRUFBQTtBQUNBLHdCQUFBLEVBQUEsSUFBQTtTQUNBO0tBQ0EsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxPQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBOztBQUVBLFFBQUEsUUFBQSxHQUFBLFNBQUEsUUFBQSxHQUFBO0FBQ0EsZUFBQSxLQUFBLENBQUEsR0FBQSxDQUFBLDJCQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxtQkFBQSxRQUFBLENBQUEsSUFBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxXQUFBO0FBQ0EsZ0JBQUEsRUFBQSxRQUFBO0tBQ0EsQ0FBQTtDQUVBLENBQUEsQ0FBQTtBQy9CQSxHQUFBLENBQUEsT0FBQSxDQUFBLGNBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLFFBQUEsYUFBQSxHQUFBO0FBQ0Esa0JBQUEsRUFBQSw0SEFBQTtBQUNBLGdCQUFBLEVBQUEsbUdBQUE7QUFDQSxjQUFBLEVBQUEsaUdBQUE7QUFDQSxnQkFBQSxFQUFBLGlJQUFBO0FBQ0EsZ0JBQUEsRUFBQSxpRUFBQTtBQUNBLGVBQUEsRUFBQSxpSEFBQTtBQUNBLGNBQUEsRUFBQSwyRUFBQTtBQUNBLHNCQUFBLEVBQUEsOEVBQUE7QUFDQSxlQUFBLEVBQUEsMEdBQUE7QUFDQSxlQUFBLEVBQUEsb0VBQUE7QUFDQSxjQUFBLEVBQUEsK0VBQUE7S0FDQSxDQUFBOztBQUVBLFFBQUEsVUFBQSxHQUFBLENBQUEsWUFBQSxFQUFBLFVBQUEsRUFBQSxRQUFBLEVBQUEsVUFBQSxFQUFBLFVBQUEsRUFBQSxTQUFBLEVBQUEsUUFBQSxFQUFBLGlCQUFBLEVBQUEsU0FBQSxFQUFBLFNBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTs7QUFFQSxhQUFBLFdBQUEsQ0FBQSxLQUFBLEVBQUE7QUFDQSxlQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEsYUFBQSxFQUFBLEtBQUEsQ0FBQSxDQUFBO0tBQ0E7O0FBRUEsYUFBQSxZQUFBLENBQUEsRUFBQSxFQUFBO0FBQ0EsZUFBQSxLQUFBLENBQUEsR0FBQSxDQUFBLGFBQUEsR0FBQSxFQUFBLENBQUEsQ0FBQTtLQUNBO0FBQ0EsV0FBQTtBQUNBLGNBQUEsRUFBQSxnQkFBQSxJQUFBLEVBQUE7QUFDQSxtQkFBQSxhQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7U0FDQTtBQUNBLG1CQUFBLEVBQUEsV0FBQTtBQUNBLG9CQUFBLEVBQUEsWUFBQTtBQUNBLGtCQUFBLEVBQUEsVUFBQTtLQUNBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FDaENBLEdBQUEsQ0FBQSxPQUFBLENBQUEsZUFBQSxFQUFBLFlBQUE7QUFDQSxXQUFBLENBQ0EsdURBQUEsRUFDQSxxSEFBQSxFQUNBLGlEQUFBLEVBQ0EsaURBQUEsRUFDQSx1REFBQSxFQUNBLHVEQUFBLEVBQ0EsdURBQUEsRUFDQSx1REFBQSxFQUNBLHVEQUFBLEVBQ0EsdURBQUEsRUFDQSx1REFBQSxFQUNBLHVEQUFBLEVBQ0EsdURBQUEsRUFDQSx1REFBQSxFQUNBLHVEQUFBLEVBQ0EsdURBQUEsRUFDQSx1REFBQSxFQUNBLHVEQUFBLEVBQ0EsdURBQUEsRUFDQSx1REFBQSxFQUNBLHVEQUFBLEVBQ0EsdURBQUEsRUFDQSx1REFBQSxFQUNBLHVEQUFBLEVBQ0EsdURBQUEsRUFDQSx1REFBQSxDQUNBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FDN0JBLEdBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxFQUFBLFlBQUE7O0FBRUEsV0FBQTtBQUNBLFlBQUEsRUFBQSxTQUFBO0FBQ0EsWUFBQSxFQUFBLEtBQUE7QUFDQSxtQkFBQSxFQUFBLENBQUE7QUFDQSxZQUFBLEVBQUEsWUFBQTtBQUNBLFlBQUEsRUFBQSxNQUFBO0FBQ0Esb0JBQUEsRUFBQSxDQUFBO0FBQ0EsZ0JBQUEsRUFBQSxjQUFBO0FBQ0EsbUJBQUEsRUFBQSxZQUFBO0tBQ0EsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUNiQSxHQUFBLENBQUEsT0FBQSxDQUFBLGFBQUEsRUFBQSxZQUFBOztBQUVBLFFBQUEsa0JBQUEsR0FBQSxTQUFBLGtCQUFBLENBQUEsR0FBQSxFQUFBO0FBQ0EsZUFBQSxHQUFBLENBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEsTUFBQSxFQUFBLEdBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFFBQUEsS0FBQSxHQUFBLENBQ0EsV0FBQSxFQUNBLCtCQUFBLEVBQ0Esc0JBQUEsRUFDQSx1Q0FBQSxFQUNBLFFBQUEsRUFDQSwyQkFBQSxFQUNBLGtDQUFBLEVBQ0EsZ0NBQUEsRUFDQSx5Q0FBQSxDQUNBLENBQUE7O0FBRUEsV0FBQTtBQUNBLGFBQUEsRUFBQSxLQUFBO0FBQ0Esc0JBQUEsRUFBQSwwQkFBQTtBQUNBLG1CQUFBLGtCQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7U0FDQTtLQUNBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FDekJBLEdBQUEsQ0FBQSxPQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBOztBQUdBLFFBQUEsS0FBQSxHQUFBLENBQ0E7QUFDQSxnQkFBQSxFQUFBLFFBQUE7QUFDQSxpQkFBQSxFQUFBLFNBQUE7QUFDQSxnQkFBQSxFQUFBLFNBQUE7QUFDQSxjQUFBLEVBQUEsR0FBQTtBQUNBLGFBQUEsRUFBQSxpQkFBQTtBQUNBLGFBQUEsRUFBQTtBQUNBLGVBQUEsRUFBQSxJQUFBO0FBQ0EsaUJBQUEsRUFBQSxJQUFBO0FBQ0EsZ0JBQUEsRUFBQSxNQUFBO1NBQ0E7QUFDQSxhQUFBLEVBQUEsZ0JBQUE7QUFDQSxlQUFBLEVBQUE7QUFDQSxvQkFBQSxFQUFBLGNBQUE7QUFDQSxvQkFBQSxFQUFBLFFBQUE7QUFDQSxnQkFBQSxFQUFBLFVBQUE7QUFDQSxpQkFBQSxFQUFBLElBQUE7QUFDQSxlQUFBLEVBQUEsT0FBQTtTQUNBO0FBQ0EsYUFBQSxFQUFBLEVBQUE7QUFDQSxhQUFBLEVBQUEsRUFBQTtBQUNBLGFBQUEsRUFBQSxpa0JBQUE7S0FDQSxDQUNBLENBQUE7QUFDQSxhQUFBLFFBQUEsR0FBQTtBQUNBLGVBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxhQUFBLENBQUEsQ0FBQTtLQUNBOztBQUVBLGFBQUEsV0FBQSxDQUFBLEVBQUEsRUFBQTtBQUNBLGVBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxhQUFBLEdBQUEsRUFBQSxDQUFBLENBQUE7S0FDQTs7QUFFQSxhQUFBLFVBQUEsQ0FBQSxJQUFBLEVBQUE7QUFDQSxlQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsYUFBQSxFQUFBLElBQUEsQ0FBQSxDQUFBO0tBQ0E7O0FBRUEsYUFBQSxVQUFBLENBQUEsSUFBQSxFQUFBO0FBQ0EsZUFBQSxLQUFBLENBQUEsSUFBQSxDQUFBLGFBQUEsRUFBQSxJQUFBLENBQUEsQ0FBQTtLQUNBOztBQUVBLGFBQUEsVUFBQSxDQUFBLEVBQUEsRUFBQTtBQUNBLGVBQUEsS0FBQSxVQUFBLENBQUEsYUFBQSxHQUFBLEVBQUEsQ0FBQSxDQUFBO0tBQ0E7O0FBRUEsV0FBQTtBQUNBLGdCQUFBLEVBQUEsUUFBQTtBQUNBLG1CQUFBLEVBQUEsV0FBQTtBQUNBLGtCQUFBLEVBQUEsVUFBQTtBQUNBLGtCQUFBLEVBQUEsVUFBQTtBQUNBLGtCQUFBLEVBQUEsVUFBQTtLQUNBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FDeERBLEdBQUEsQ0FBQSxPQUFBLENBQUEsT0FBQSxFQUFBLFlBQUE7O0FBRUEsUUFBQSxVQUFBLEdBQUEsQ0FDQTtBQUNBLGNBQUEsRUFBQSxTQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxRQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxnQkFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsU0FBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsVUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsWUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsVUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsYUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsVUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsc0JBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLGdDQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxTQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxTQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxNQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxRQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxPQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxVQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxTQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxNQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxRQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxVQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxXQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxPQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxrQkFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsVUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsZUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsVUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsV0FBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsYUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsVUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsU0FBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsVUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsUUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsZUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsWUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsWUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsVUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsZ0JBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLGNBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLDBCQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxNQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxVQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxRQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxPQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxjQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxhQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxjQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxnQkFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsY0FBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsV0FBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsT0FBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsTUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsU0FBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsZ0JBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFVBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFlBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLGVBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFdBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFNBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxDQUNBLENBQUE7O0FBRUEsYUFBQSxTQUFBLEdBQUE7QUFDQSxlQUFBLFVBQUEsQ0FBQTtLQUNBOztBQUVBLFdBQUE7QUFDQSxpQkFBQSxFQUFBLFNBQUE7S0FDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQ3hQQSxHQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsRUFBQSxZQUFBO0FBQ0EsV0FBQTtBQUNBLGdCQUFBLEVBQUEsR0FBQTtBQUNBLG1CQUFBLEVBQUEseUNBQUE7QUFDQSxhQUFBLEVBQUE7QUFDQSxtQkFBQSxFQUFBLEdBQUE7U0FDQTtBQUNBLGtCQUFBLEVBQUEsb0JBQUEsTUFBQSxFQUFBLEVBQ0E7QUFDQSxZQUFBLEVBQUEsZ0JBQUEsRUFFQTtLQUNBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FDYkEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxZQUFBLEVBQUE7QUFDQSxXQUFBO0FBQ0EsZ0JBQUEsRUFBQSxHQUFBO0FBQ0EsbUJBQUEsRUFBQSxzREFBQTtBQUNBLFlBQUEsRUFBQSxjQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsS0FBQSxFQUFBO0FBQ0EsaUJBQUEsQ0FBQSxRQUFBLEdBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSx1QkFBQSxZQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO2FBQ0EsQ0FBQTtTQUNBO0tBQ0EsQ0FBQTtDQUNBLENBQUEsQ0FBQTtBQ1ZBLEdBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxFQUFBLFlBQUE7QUFDQSxXQUFBO0FBQ0EsZ0JBQUEsRUFBQSxHQUFBO0FBQ0EsbUJBQUEsRUFBQSxpREFBQTtBQUNBLGFBQUEsRUFBQTtBQUNBLGlCQUFBLEVBQUEsR0FBQTtTQUNBO0FBQ0Esa0JBQUEsRUFBQSxlQUFBOztLQUVBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FBRUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxlQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsRUFFQSxDQUFBLENBQUE7O0FDZEEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLEVBQUEsWUFBQTtBQUNBLFdBQUE7QUFDQSxnQkFBQSxFQUFBLElBQUE7QUFDQSxZQUFBLEVBQUEsY0FBQSxNQUFBLEVBQUEsS0FBQSxFQUFBLE1BQUEsRUFBQTs7QUFFQSxnQkFBQSxPQUFBLEdBQUE7QUFDQSw0QkFBQSxFQUFBLE1BQUEsQ0FBQSxZQUFBLEdBQUEsTUFBQSxDQUFBLFlBQUEsR0FBQSxHQUFBO0FBQ0EsOEJBQUEsRUFBQSxhQUFBO2FBQ0EsQ0FBQTs7O0FBR0EsbUJBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxjQUFBLEVBQUEsYUFBQSxDQUFBLEVBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSxvQkFBQSxFQUFBLEdBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLG9CQUFBLEVBQUEsQ0FBQSxNQUFBLElBQUEsQ0FBQSxFQUFBO0FBQ0EsMkJBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxFQUFBLEVBQUEsTUFBQSxFQUFBLFVBQUEsQ0FBQSxFQUFBLFVBQUEsTUFBQSxFQUFBO0FBQ0EsK0JBQUEsQ0FBQSxPQUFBLENBQUEsRUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsR0FBQSxZQUFBLEVBQUEsTUFBQSxHQUFBLE9BQUEsQ0FBQSxZQUFBLEdBQUEsSUFBQSxHQUFBLElBQUEsR0FBQSxPQUFBLENBQUEsY0FBQSxDQUFBLENBQUE7cUJBQ0EsQ0FBQSxDQUFBO2lCQUNBO2FBQ0EsQ0FBQSxDQUFBOzs7OztBQUtBLGtCQUFBLENBQUEsSUFBQSxHQUFBLFlBQUE7QUFDQSxxQkFBQSxDQUFBLFdBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQTthQUNBLENBQUE7U0FFQTtLQUNBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FDN0JBLEdBQUEsQ0FBQSxTQUFBLENBQUEsZUFBQSxFQUFBLFlBQUE7QUFDQSxXQUFBO0FBQ0EsZ0JBQUEsRUFBQSxHQUFBO0FBQ0EsbUJBQUEsRUFBQSx5REFBQTtLQUNBLENBQUE7Q0FDQSxDQUFBLENBQUE7QUNMQSxHQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsRUFBQSxVQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUEsV0FBQSxFQUFBLE1BQUEsRUFBQTs7QUFFQSxXQUFBO0FBQ0EsZ0JBQUEsRUFBQSxHQUFBO0FBQ0EsYUFBQSxFQUFBLEVBQUE7QUFDQSxtQkFBQSxFQUFBLHlDQUFBO0FBQ0EsWUFBQSxFQUFBLGNBQUEsS0FBQSxFQUFBOztBQUVBLGlCQUFBLENBQUEsS0FBQSxHQUFBLENBQ0EsRUFBQSxLQUFBLEVBQUEsTUFBQSxFQUFBLEtBQUEsRUFBQSxNQUFBLEVBQUEsRUFDQSxFQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQSxFQUNBLEVBQUEsS0FBQSxFQUFBLGVBQUEsRUFBQSxLQUFBLEVBQUEsTUFBQSxFQUFBLEVBQ0EsRUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsRUFDQSxFQUFBLEtBQUEsRUFBQSxRQUFBLEVBQUEsS0FBQSxFQUFBLFdBQUEsRUFBQSxFQUNBLEVBQUEsS0FBQSxFQUFBLGNBQUEsRUFBQSxLQUFBLEVBQUEsYUFBQSxFQUFBLElBQUEsRUFBQSxJQUFBLEVBQUEsQ0FDQSxDQUFBOztBQUVBLGlCQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxpQkFBQSxDQUFBLFVBQUEsR0FBQSxZQUFBO0FBQ0EsdUJBQUEsV0FBQSxDQUFBLGVBQUEsRUFBQSxDQUFBO2FBQ0EsQ0FBQTs7QUFFQSxpQkFBQSxDQUFBLE1BQUEsR0FBQSxZQUFBO0FBQ0EsMkJBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQTtBQUNBLDBCQUFBLENBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO2lCQUNBLENBQUEsQ0FBQTthQUNBLENBQUE7O0FBRUEsZ0JBQUEsT0FBQSxHQUFBLFNBQUEsT0FBQSxHQUFBO0FBQ0EsMkJBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSx5QkFBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7aUJBQ0EsQ0FBQSxDQUFBO2FBQ0EsQ0FBQTs7QUFFQSxnQkFBQSxVQUFBLEdBQUEsU0FBQSxVQUFBLEdBQUE7QUFDQSxxQkFBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7YUFDQSxDQUFBOztBQUVBLG1CQUFBLEVBQUEsQ0FBQTs7QUFFQSxzQkFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0Esc0JBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLGFBQUEsRUFBQSxVQUFBLENBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxjQUFBLEVBQUEsVUFBQSxDQUFBLENBQUE7U0FFQTs7S0FFQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQ2pEQSxHQUFBLENBQUEsU0FBQSxDQUFBLFlBQUEsRUFBQSxVQUFBLFdBQUEsRUFBQTs7QUFFQSxXQUFBO0FBQ0EsZ0JBQUEsRUFBQSxHQUFBO0FBQ0EsbUJBQUEsRUFBQSxtREFBQTtBQUNBLFlBQUEsRUFBQSxjQUFBLEtBQUEsRUFBQTtBQUNBLGlCQUFBLENBQUEsS0FBQSxHQUFBLFdBQUEsQ0FBQSxjQUFBLEVBQUEsQ0FBQTtTQUNBO0tBQ0EsQ0FBQTtDQUVBLENBQUEsQ0FBQTtBQ1ZBLEdBQUEsQ0FBQSxTQUFBLENBQUEsZUFBQSxFQUFBLFVBQUEsWUFBQSxFQUFBO0FBQ0EsV0FBQTtBQUNBLGdCQUFBLEVBQUEsR0FBQTtBQUNBLG1CQUFBLEVBQUEsMERBQUE7S0FDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQ0pBLEdBQUEsQ0FBQSxTQUFBLENBQUEsWUFBQSxFQUNBLFVBQUEsU0FBQSxFQUFBOztBQUVBLFdBQUEsVUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLEtBQUEsRUFBQTs7QUFFQSxhQUFBLENBQUEsT0FBQSxHQUFBLENBQUEsTUFBQSxFQUFBLE1BQUEsRUFBQSxNQUFBLEVBQUEsS0FBQSxFQUFBLFFBQUEsRUFBQSxNQUFBLEVBQUEsT0FBQSxFQUFBLE1BQUEsRUFBQSxNQUFBLEVBQUEsT0FBQSxFQUFBLE9BQUEsRUFBQSxPQUFBLEVBQUEsT0FBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBOztBQUVBLGlCQUFBLFVBQUEsQ0FBQSxDQUFBLEVBQUE7QUFDQSxnQkFBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBOztBQUVBLG1CQUFBLENBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtTQUNBOztBQUVBLGVBQUEsQ0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsWUFBQSxRQUFBLEdBQUEsU0FBQSxDQUFBLFVBQUEsRUFBQSxJQUFBLENBQUEsQ0FBQTs7OztBQUlBLGVBQUEsQ0FBQSxFQUFBLENBQUEsVUFBQSxFQUFBLFlBQUE7QUFDQSxxQkFBQSxDQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUNBLENBQUE7Q0FDQSxDQUFBLENBQUEiLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcbndpbmRvdy5hcHAgPSBhbmd1bGFyLm1vZHVsZSgnRnVsbHN0YWNrR2VuZXJhdGVkQXBwJywgWyd1aS5yb3V0ZXInLCAndWkuYm9vdHN0cmFwJywgJ2ZzYVByZUJ1aWx0JywgJ25nRmlsZVVwbG9hZCcsICduZ0FuaW1hdGUnLCAndGV4dEFuZ3VsYXInLCAndWlHbWFwZ29vZ2xlLW1hcHMnLCAnbmdUYWdzSW5wdXQnLCAnc2xpZGVQdXNoTWVudScsICduZ0F1dG9jb21wbGV0ZScsICd1aS5ib290c3RyYXAuZGF0ZXRpbWVwaWNrZXInXSk7XG5cbmFwcC5jb25maWcoZnVuY3Rpb24gKCR1cmxSb3V0ZXJQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIpIHtcbiAgICAvLyBUaGlzIHR1cm5zIG9mZiBoYXNoYmFuZyB1cmxzICgvI2Fib3V0KSBhbmQgY2hhbmdlcyBpdCB0byBzb21ldGhpbmcgbm9ybWFsICgvYWJvdXQpXG4gICAgJGxvY2F0aW9uUHJvdmlkZXIuaHRtbDVNb2RlKHRydWUpO1xuICAgIC8vIElmIHdlIGdvIHRvIGEgVVJMIHRoYXQgdWktcm91dGVyIGRvZXNuJ3QgaGF2ZSByZWdpc3RlcmVkLCBnbyB0byB0aGUgXCIvXCIgdXJsLlxuICAgICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoJy8nKTtcbn0pXG4uY29uZmlnKGZ1bmN0aW9uKHVpR21hcEdvb2dsZU1hcEFwaVByb3ZpZGVyKSB7XG4gICAgdWlHbWFwR29vZ2xlTWFwQXBpUHJvdmlkZXIuY29uZmlndXJlKHtcbiAgICAgICAga2V5OiAnQUl6YVN5Q0FmeVhzZVNYVURCUVl3ZnAyaVhyeUQ1QXZDMUo4Mk9nJyxcbiAgICAgICAgdjogJzMuMjAnLCAvL2RlZmF1bHRzIHRvIGxhdGVzdCAzLlggYW55aG93XG4gICAgICAgIGxpYnJhcmllczogJ3dlYXRoZXIsZ2VvbWV0cnksdmlzdWFsaXphdGlvbidcbiAgICB9KTtcbn0pXG5cbi8vIFRoaXMgYXBwLnJ1biBpcyBmb3IgY29udHJvbGxpbmcgYWNjZXNzIHRvIHNwZWNpZmljIHN0YXRlcy5cbmFwcC5ydW4oZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcblxuICAgIC8vIFRoZSBnaXZlbiBzdGF0ZSByZXF1aXJlcyBhbiBhdXRoZW50aWNhdGVkIHVzZXIuXG4gICAgdmFyIGRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGggPSBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmRhdGEgJiYgc3RhdGUuZGF0YS5hdXRoZW50aWNhdGU7XG4gICAgfTtcblxuICAgIC8vICRzdGF0ZUNoYW5nZVN0YXJ0IGlzIGFuIGV2ZW50IGZpcmVkXG4gICAgLy8gd2hlbmV2ZXIgdGhlIHByb2Nlc3Mgb2YgY2hhbmdpbmcgYSBzdGF0ZSBiZWdpbnMuXG4gICAgJHJvb3RTY29wZS4kb24oJyRzdGF0ZUNoYW5nZVN0YXJ0JywgZnVuY3Rpb24gKGV2ZW50LCB0b1N0YXRlLCB0b1BhcmFtcykge1xuXG4gICAgICAgIGlmICghZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCh0b1N0YXRlKSkge1xuICAgICAgICAgICAgLy8gVGhlIGRlc3RpbmF0aW9uIHN0YXRlIGRvZXMgbm90IHJlcXVpcmUgYXV0aGVudGljYXRpb25cbiAgICAgICAgICAgIC8vIFNob3J0IGNpcmN1aXQgd2l0aCByZXR1cm4uXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCkpIHtcbiAgICAgICAgICAgIC8vIFRoZSB1c2VyIGlzIGF1dGhlbnRpY2F0ZWQuXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2FuY2VsIG5hdmlnYXRpbmcgdG8gbmV3IHN0YXRlLlxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgIC8vIElmIGEgdXNlciBpcyByZXRyaWV2ZWQsIHRoZW4gcmVuYXZpZ2F0ZSB0byB0aGUgZGVzdGluYXRpb25cbiAgICAgICAgICAgIC8vICh0aGUgc2Vjb25kIHRpbWUsIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpIHdpbGwgd29yaylcbiAgICAgICAgICAgIC8vIG90aGVyd2lzZSwgaWYgbm8gdXNlciBpcyBsb2dnZWQgaW4sIGdvIHRvIFwibG9naW5cIiBzdGF0ZS5cbiAgICAgICAgICAgIGlmICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKHRvU3RhdGUubmFtZSwgdG9QYXJhbXMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2luJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgfSk7XG5cbn0pO1xuXG5cbmFwcC5jb250cm9sbGVyKCdtYWluQ3RybCcsIGZ1bmN0aW9uKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCBBVVRIX0VWRU5UUywgJHN0YXRlLCAkc2NvcGUpe1xuICAgICRzY29wZS51c2VyID0gbnVsbDtcblxuICAgICRzY29wZS5pc0xvZ2dlZEluID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCk7XG4gICAgfTtcblxuICAgICRzY29wZS5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIEF1dGhTZXJ2aWNlLmxvZ291dCgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHN0YXRlLmdvKCdob21lJyk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICB2YXIgc2V0VXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgJHNjb3BlLnVzZXIgPSB1c2VyO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgdmFyIHJlbW92ZVVzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICRzY29wZS51c2VyID0gbnVsbDtcbiAgICB9O1xuXG4gICAgc2V0VXNlcigpO1xuXG4gICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzLCBzZXRVc2VyKTtcbiAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzLCByZW1vdmVVc2VyKTtcbiAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgcmVtb3ZlVXNlcik7XG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAvLyBSZWdpc3RlciBvdXIgKmFib3V0KiBzdGF0ZS5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnYWJvdXQnLCB7XG4gICAgICAgIHVybDogJy9hYm91dCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdBYm91dENvbnRyb2xsZXInLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2Fib3V0L2Fib3V0Lmh0bWwnXG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignQWJvdXRDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSwgRnVsbHN0YWNrUGljcykge1xuXG4gICAgLy8gSW1hZ2VzIG9mIGJlYXV0aWZ1bCBGdWxsc3RhY2sgcGVvcGxlLlxuICAgICRzY29wZS5pbWFnZXMgPSBfLnNodWZmbGUoRnVsbHN0YWNrUGljcyk7XG5cbn0pOyIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2RvY3MnLCB7XG4gICAgICAgIHVybDogJy9kb2NzJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9kb2NzL2RvY3MuaHRtbCdcbiAgICB9KTtcbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbigkc3RhdGVQcm92aWRlcil7XG4gICAkc3RhdGVQcm92aWRlclxuICAgICAgIC5zdGF0ZSgnZXZlbnRMaXN0Jywge1xuICAgICAgICAgICB1cmw6Jy9ldmVudHMnLFxuICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2V2ZW50L2xpc3QuaHRtbCcsXG4gICAgICAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCRzY29wZSwgdWlHbWFwR29vZ2xlTWFwQXBpLCBFdmVudEZhY3Rvcnkpe1xuICAgICAgICAgICAgICAgJHNjb3BlLm1hcCA9IHsgY2VudGVyOiB7IGxhdGl0dWRlOiA0MC43NzM5NTksIGxvbmdpdHVkZTogLTczLjk3MDk0OSB9LCB6b29tOiAxNCB9O1xuICAgICAgICAgICAgICAgdWlHbWFwR29vZ2xlTWFwQXBpLnRoZW4oZnVuY3Rpb24obWFwcykge30pO1xuICAgICAgICAgICAgICAgJHNjb3BlLnNwb3J0c0xpc3QgPSBFdmVudEZhY3Rvcnkuc3BvcnRzTGlzdFxuICAgICAgICAgICB9XG4gICAgICAgfSlcbiAgICAgICAuc3RhdGUoJ2V2ZW50RGV0YWlsJywge1xuICAgICAgICAgICB1cmw6Jy9ldmVudHMvZGV0YWlsLzppZCcsXG4gICAgICAgICAgIHRlbXBsYXRlVXJsOiAnanMvZXZlbnQvZGV0YWlsLmh0bWwnLFxuICAgICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgICAgIGV2ZW50OiBmdW5jdGlvbihFdmVudEZhY3RvcnksICRzdGF0ZVBhcmFtcyl7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gRXZlbnRGYWN0b3J5LmdldEV2ZW50QnlJZCgkc3RhdGVQYXJhbXMuaWQpXG4gICAgICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlcy5kYXRhO1xuICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgfSxcbiAgICAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oJHNjb3BlLCBldmVudCl7XG4gICAgICAgICAgICAgICAkc2NvcGUucGFnZT1cImRldGFpbFwiO1xuICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXZlbnQpXG4gICAgICAgICAgICAgICAkc2NvcGUuZXZlbnQgPSBldmVudDtcbjsgICAgICAgICAgIH1cbiAgICAgICB9KVxuICAgICAgIC5zdGF0ZSgnZXZlbnRDcmVhdGUnLCB7XG4gICAgICAgICAgIHVybDonL2V2ZW50cy9jcmVhdGUnLFxuICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2V2ZW50L2NyZWF0ZS5odG1sJyxcbiAgICAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oJHNjb3BlLCBFdmVudEZhY3RvcnksICRzdGF0ZSl7XG4gICAgICAgICAgICAgICAkc2NvcGUuY3JlYXRlRXZlbnQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgRXZlbnRGYWN0b3J5LmNyZWF0ZUV2ZW50KCRzY29wZS5ldmVudClcbiAgICAgICAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlcyl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdldmVudERldGFpbCcsIHtpZDogcmVzLmRhdGEuX2lkfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgIH1cbiAgICAgICB9KVxuICAgICAgIC5zdGF0ZSgnZXZlbnRVcGRhdGUnLCB7XG4gICAgICAgICAgIHVybDonL2V2ZW50cy91cGRhdGUvOmlkJyxcbiAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9ldmVudC91cGRhdGUuaHRtbCcsXG4gICAgICAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCRzY29wZSl7XG4gICAgICAgICAgICAgICAkc2NvcGUudXBkYXRlID0gZnVuY3Rpb24ocGFyYSkge1xuICAgICAgICAgICAgICAgICAgICBhbGVydChwYXJhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgIH1cbiAgICAgICB9KTtcbn0pO1xuIiwiKGZ1bmN0aW9uICgpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8vIEhvcGUgeW91IGRpZG4ndCBmb3JnZXQgQW5ndWxhciEgRHVoLWRveS5cbiAgICBpZiAoIXdpbmRvdy5hbmd1bGFyKSB0aHJvdyBuZXcgRXJyb3IoJ0kgY2FuXFwndCBmaW5kIEFuZ3VsYXIhJyk7XG5cbiAgICB2YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoJ2ZzYVByZUJ1aWx0JywgW10pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ1NvY2tldCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCF3aW5kb3cuaW8pIHRocm93IG5ldyBFcnJvcignc29ja2V0LmlvIG5vdCBmb3VuZCEnKTtcbiAgICAgICAgcmV0dXJuIHdpbmRvdy5pbyh3aW5kb3cubG9jYXRpb24ub3JpZ2luKTtcbiAgICB9KTtcblxuICAgIC8vIEFVVEhfRVZFTlRTIGlzIHVzZWQgdGhyb3VnaG91dCBvdXIgYXBwIHRvXG4gICAgLy8gYnJvYWRjYXN0IGFuZCBsaXN0ZW4gZnJvbSBhbmQgdG8gdGhlICRyb290U2NvcGVcbiAgICAvLyBmb3IgaW1wb3J0YW50IGV2ZW50cyBhYm91dCBhdXRoZW50aWNhdGlvbiBmbG93LlxuICAgIGFwcC5jb25zdGFudCgnQVVUSF9FVkVOVFMnLCB7XG4gICAgICAgIGxvZ2luU3VjY2VzczogJ2F1dGgtbG9naW4tc3VjY2VzcycsXG4gICAgICAgIGxvZ2luRmFpbGVkOiAnYXV0aC1sb2dpbi1mYWlsZWQnLFxuICAgICAgICBsb2dvdXRTdWNjZXNzOiAnYXV0aC1sb2dvdXQtc3VjY2VzcycsXG4gICAgICAgIHNlc3Npb25UaW1lb3V0OiAnYXV0aC1zZXNzaW9uLXRpbWVvdXQnLFxuICAgICAgICBub3RBdXRoZW50aWNhdGVkOiAnYXV0aC1ub3QtYXV0aGVudGljYXRlZCcsXG4gICAgICAgIG5vdEF1dGhvcml6ZWQ6ICdhdXRoLW5vdC1hdXRob3JpemVkJ1xuICAgIH0pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ0F1dGhJbnRlcmNlcHRvcicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkcSwgQVVUSF9FVkVOVFMpIHtcbiAgICAgICAgdmFyIHN0YXR1c0RpY3QgPSB7XG4gICAgICAgICAgICA0MDE6IEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsXG4gICAgICAgICAgICA0MDM6IEFVVEhfRVZFTlRTLm5vdEF1dGhvcml6ZWQsXG4gICAgICAgICAgICA0MTk6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LFxuICAgICAgICAgICAgNDQwOiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dFxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzcG9uc2VFcnJvcjogZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KHN0YXR1c0RpY3RbcmVzcG9uc2Uuc3RhdHVzXSwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UpXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG5cbiAgICBhcHAuY29uZmlnKGZ1bmN0aW9uICgkaHR0cFByb3ZpZGVyKSB7XG4gICAgICAgICRodHRwUHJvdmlkZXIuaW50ZXJjZXB0b3JzLnB1c2goW1xuICAgICAgICAgICAgJyRpbmplY3RvcicsXG4gICAgICAgICAgICBmdW5jdGlvbiAoJGluamVjdG9yKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRpbmplY3Rvci5nZXQoJ0F1dGhJbnRlcmNlcHRvcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICBdKTtcbiAgICB9KTtcblxuICAgIGFwcC5zZXJ2aWNlKCdBdXRoU2VydmljZScsIGZ1bmN0aW9uICgkaHR0cCwgU2Vzc2lvbiwgJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMsICRxKSB7XG5cbiAgICAgICAgZnVuY3Rpb24gb25TdWNjZXNzZnVsTG9naW4ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIHZhciBkYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgIFNlc3Npb24uY3JlYXRlKGRhdGEuaWQsIGRhdGEudXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzKTtcbiAgICAgICAgICAgIHJldHVybiBkYXRhLnVzZXI7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVc2VzIHRoZSBzZXNzaW9uIGZhY3RvcnkgdG8gc2VlIGlmIGFuXG4gICAgICAgIC8vIGF1dGhlbnRpY2F0ZWQgdXNlciBpcyBjdXJyZW50bHkgcmVnaXN0ZXJlZC5cbiAgICAgICAgdGhpcy5pc0F1dGhlbnRpY2F0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gISFTZXNzaW9uLnVzZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5nZXRMb2dnZWRJblVzZXIgPSBmdW5jdGlvbiAoZnJvbVNlcnZlcikge1xuXG4gICAgICAgICAgICAvLyBJZiBhbiBhdXRoZW50aWNhdGVkIHNlc3Npb24gZXhpc3RzLCB3ZVxuICAgICAgICAgICAgLy8gcmV0dXJuIHRoZSB1c2VyIGF0dGFjaGVkIHRvIHRoYXQgc2Vzc2lvblxuICAgICAgICAgICAgLy8gd2l0aCBhIHByb21pc2UuIFRoaXMgZW5zdXJlcyB0aGF0IHdlIGNhblxuICAgICAgICAgICAgLy8gYWx3YXlzIGludGVyZmFjZSB3aXRoIHRoaXMgbWV0aG9kIGFzeW5jaHJvbm91c2x5LlxuXG4gICAgICAgICAgICAvLyBPcHRpb25hbGx5LCBpZiB0cnVlIGlzIGdpdmVuIGFzIHRoZSBmcm9tU2VydmVyIHBhcmFtZXRlcixcbiAgICAgICAgICAgIC8vIHRoZW4gdGhpcyBjYWNoZWQgdmFsdWUgd2lsbCBub3QgYmUgdXNlZC5cblxuICAgICAgICAgICAgaWYgKHRoaXMuaXNBdXRoZW50aWNhdGVkKCkgJiYgZnJvbVNlcnZlciAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAkcS53aGVuKFNlc3Npb24udXNlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE1ha2UgcmVxdWVzdCBHRVQgL3Nlc3Npb24uXG4gICAgICAgICAgICAvLyBJZiBpdCByZXR1cm5zIGEgdXNlciwgY2FsbCBvblN1Y2Nlc3NmdWxMb2dpbiB3aXRoIHRoZSByZXNwb25zZS5cbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSA0MDEgcmVzcG9uc2UsIHdlIGNhdGNoIGl0IGFuZCBpbnN0ZWFkIHJlc29sdmUgdG8gbnVsbC5cbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9zZXNzaW9uJykudGhlbihvblN1Y2Nlc3NmdWxMb2dpbikuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmxvZ2luID0gZnVuY3Rpb24gKGNyZWRlbnRpYWxzKSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2xvZ2luJywgY3JlZGVudGlhbHMpXG4gICAgICAgICAgICAgICAgLnRoZW4ob25TdWNjZXNzZnVsTG9naW4pXG4gICAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdCh7IG1lc3NhZ2U6ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLicgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvbG9nb3V0JykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgU2Vzc2lvbi5kZXN0cm95KCk7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICB9KTtcblxuICAgIGFwcC5zZXJ2aWNlKCdTZXNzaW9uJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEFVVEhfRVZFTlRTKSB7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuaWQgPSBudWxsO1xuICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuXG4gICAgICAgIHRoaXMuY3JlYXRlID0gZnVuY3Rpb24gKHNlc3Npb25JZCwgdXNlcikge1xuICAgICAgICAgICAgdGhpcy5pZCA9IHNlc3Npb25JZDtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IHVzZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5pZCA9IG51bGw7XG4gICAgICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuICAgICAgICB9O1xuXG4gICAgfSk7XG5cbn0pKCk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdob21lJywge1xuICAgICAgICB1cmw6ICcvJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9ob21lL2hvbWUuaHRtbCcsXG4gICAgICBcbiAgICB9KTtcbn0pOyIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbG9naW4nLCB7XG4gICAgICAgIHVybDogJy9sb2dpbicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvbG9naW4vbG9naW4uaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMb2dpbkN0cmwnXG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignTG9naW5DdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSwgVXNlckZhY3RvcnkpIHtcblxuICAgICRzY29wZS5sb2dpbiA9IHt9O1xuICAgICRzY29wZS5lcnJvciA9IG51bGw7XG5cbiAgICAkc2NvcGUuc2VuZExvZ2luID0gZnVuY3Rpb24gKGxvZ2luSW5mbykge1xuXG4gICAgICAgICRzY29wZS5lcnJvciA9IG51bGw7XG5cbiAgICAgICAgQXV0aFNlcnZpY2UubG9naW4obG9naW5JbmZvKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IgPSAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nO1xuICAgICAgICB9KTtcblxuICAgIH07XG5cbiAgICAkc2NvcGUuc2VuZFNpZ251cCA9IGZ1bmN0aW9uKHNpZ251cEluZm8pe1xuICAgICAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuICAgICAgICBVc2VyRmFjdG9yeS5jcmVhdGVVc2VyKHNpZ251cEluZm8pXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIHJldHVybiBBdXRoU2VydmljZS5sb2dpbihzaWdudXBJbmZvKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbihlcnIpe1xuICAgICAgICAgICAgICAgICRzY29wZS5lcnJvciA9IGVycjtcbiAgICAgICAgICAgIH0pXG4gICAgfVxuXG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpe1xuICAgJHN0YXRlUHJvdmlkZXJcbiAgICAgICAuc3RhdGUoJ3VzZXJzJywge1xuICAgICAgICAgICB1cmw6ICcvdXNlcnMnLFxuICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3VzZXIvbGlzdC5odG1sJyxcbiAgICAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgICAgdXNlcnM6IGZ1bmN0aW9uKFVzZXJGYWN0b3J5KXtcbiAgICAgICAgICAgICAgICAgICByZXR1cm4gVXNlckZhY3RvcnlcbiAgICAgICAgICAgICAgICAgICAgICAgLmdldFVzZXJzKClcbiAgICAgICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXMuZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgfSxcbiAgICAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oJHNjb3BlLCB1c2Vycyl7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnVzZXJzID0gdXNlcnM7XG4gICAgICAgICAgIH1cbiAgICAgICB9KVxuICAgICAgIC5zdGF0ZSgndXNlckRldGFpbCcsIHtcbiAgICAgICAgICAgdXJsOiAnL3VzZXJzL2RldGFpbC86aWQnLFxuICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3VzZXIvcHJvZmlsZS5odG1sJyxcbiAgICAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgICAgdXNlcjogZnVuY3Rpb24oVXNlckZhY3RvcnksICRzdGF0ZVBhcmFtcyl7XG4gICAgICAgICAgICAgICAgICAgcmV0dXJuIFVzZXJGYWN0b3J5XG4gICAgICAgICAgICAgICAgICAgICAgIC5nZXRVc2VyQnlJZCgkc3RhdGVQYXJhbXMuaWQpXG4gICAgICAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlcyl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzLmRhdGE7XG4gICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICB9XG4gICAgICAgICAgIH0sXG4gICAgICAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCRzY29wZSwgdXNlcil7XG4gICAgICAgICAgICAgICAkc2NvcGUudXNlciA9IHVzZXI7XG4gICAgICAgICAgIH1cbiAgICAgICB9KVxuICAgICAgIC5zdGF0ZSgndXNlckVkaXQnLCB7XG4gICAgICAgICAgIHVybDogJy91c2Vycy9lZGl0LzppZCcsXG4gICAgICAgICAgIHRlbXBsYXRlVXJsOiAnanMvdXNlci9lZGl0Lmh0bWwnLFxuICAgICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgICAgICAgdXNlcjogZnVuY3Rpb24oJHN0YXRlUGFyYW1zLCBVc2VyRmFjdG9yeSl7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBVc2VyRmFjdG9yeVxuICAgICAgICAgICAgICAgICAgICAgICAgLmdldFVzZXJCeUlkKCRzdGF0ZVBhcmFtcy5pZClcbiAgICAgICAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlcyl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlcy5kYXRhO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHN0YXRlczogZnVuY3Rpb24oVXRpbHMpe1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gVXRpbHMuZ2V0U3RhdGVzKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICB9LFxuICAgICAgICAgICBjb250cm9sbGVyOiBmdW5jdGlvbigkc2NvcGUsIHVzZXIsIHN0YXRlcywgVXNlckZhY3RvcnksICRzdGF0ZSl7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnVzZXIgPSB1c2VyO1xuXG4gICAgICAgICAgICAgICAgJHNjb3BlLmFsbFN0YXRlcyA9IHN0YXRlcztcblxuICAgICAgICAgICAgICAgICRzY29wZS5zZXRTdGF0ZSA9IGZ1bmN0aW9uKHN0YXRlKXtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnVzZXIuYWRkcmVzcy5zdGF0ZSA9IHN0YXRlO1xuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUudXBkYXRlVXNlciA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJGYWN0b3J5XG4gICAgICAgICAgICAgICAgICAgICAgICAudXBkYXRlVXNlcigkc2NvcGUudXNlcilcbiAgICAgICAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlcyl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKCd1c2VyRGV0YWlsJywge2lkOnJlcy5kYXRhLl9pZH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd1cGRhdGUgdXNlcicsIHJlcy5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUuZGVsZXRlVXNlciA9IGZ1bmN0aW9uKGlkKXtcbiAgICAgICAgICAgICAgICAgICAgVXNlckZhY3RvcnkucmVtb3ZlVXNlcihpZClcbiAgICAgICAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlcyl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYocmVzLmRhdGEub2spe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICB9XG4gICAgICAgfSk7XG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbWVtYmVyc09ubHknLCB7XG4gICAgICAgIHVybDogJy9tZW1iZXJzLWFyZWEnLFxuICAgICAgICB0ZW1wbGF0ZTogJzxpbWcgbmctcmVwZWF0PVwiaXRlbSBpbiBzdGFzaFwiIHdpZHRoPVwiMzAwXCIgbmctc3JjPVwie3sgaXRlbSB9fVwiIC8+JyxcbiAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24gKCRzY29wZSwgU2VjcmV0U3Rhc2gpIHtcbiAgICAgICAgICAgIFNlY3JldFN0YXNoLmdldFN0YXNoKCkudGhlbihmdW5jdGlvbiAoc3Rhc2gpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuc3Rhc2ggPSBzdGFzaDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICAvLyBUaGUgZm9sbG93aW5nIGRhdGEuYXV0aGVudGljYXRlIGlzIHJlYWQgYnkgYW4gZXZlbnQgbGlzdGVuZXJcbiAgICAgICAgLy8gdGhhdCBjb250cm9scyBhY2Nlc3MgdG8gdGhpcyBzdGF0ZS4gUmVmZXIgdG8gYXBwLmpzLlxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICBhdXRoZW50aWNhdGU6IHRydWVcbiAgICAgICAgfVxuICAgIH0pO1xuXG59KTtcblxuYXBwLmZhY3RvcnkoJ1NlY3JldFN0YXNoJywgZnVuY3Rpb24gKCRodHRwKSB7XG5cbiAgICB2YXIgZ2V0U3Rhc2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvbWVtYmVycy9zZWNyZXQtc3Rhc2gnKS50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBnZXRTdGFzaDogZ2V0U3Rhc2hcbiAgICB9O1xuXG59KTsiLCJhcHAuZmFjdG9yeSgnRXZlbnRGYWN0b3J5JywgZnVuY3Rpb24oJGh0dHApe1xuXHR2YXIgZGVmYXVsdEltYWdlcyA9IHtcblx0XHRiYXNrZXRiYWxsOiAnaHR0cDovL2Rlc2lnbnlvdXRydXN0LmNvbS93cC1jb250ZW50L3VwbG9hZHMvMjAxNC8wMS9UaGlzX0dhbWVfV2VfUGxheV9OWUNfQmFza2V0YmFsbF9Db3VydHNfYnlfRnJhbmNrLV9Cb2hib3RfMjAxNF8wMy5qcGcnLFxuXHRcdGNsaW1iaW5nOiAnaHR0cDovL3d3dy5nbGFwcGl0bm92YS5jb20vd3AtY29udGVudC91cGxvYWRzLzIwMTUvMDcvQktCQ2hpY2Fnby1Tb3V0aC1CdWlsZGluZy1DbGltYmluZy1XYWxsLmpwZycsXG5cdFx0c29jY2VyOiAnaHR0cDovL3d3dzMucGljdHVyZXMuemltYmlvLmNvbS9naS9OZXcrWW9yaytSZWQrQnVsbHMrTWF5b3IrQmxvb21iZXJnK09wZW4rTmV3K0Y5Wm8yV29QN2ctbC5qcGcnLFxuXHRcdGJhc2ViYWxsOiAnaHR0cDovL3d3dy5zdWl0Y2FzZWdldGF3YXlzLmNvbS93cC1jb250ZW50L3VwbG9hZHMvMjAxNC8wOC9OWUMtQ2VudHJhbC1QYXJrLUhlY2tzY2hlci1CYWxsRmllbGRzLVNvdXRoLUVuZC05Mjk2LTE0LTEwMzB4Njg2LmpwZycsXG4gXHRcdGZvb3RiYWxsOiAnaHR0cDovL3d3dy5wc2FsLm9yZy9pbWFnZXMvQXJ0aWNsZXMvMjAxNS8yMDE1MDcyMzEwNTkwMzU5MDguanBnJyxcbiBcdFx0bGlmdGluZzogJ2h0dHBzOi8vZW5jcnlwdGVkLXRibjAuZ3N0YXRpYy5jb20vaW1hZ2VzP3E9dGJuOkFOZDlHY1JFNjVRQUluWHBISnVVbUNaMzdYbGY1UnN4SnR3ZXFXQXVld01VTWtkaDR5LXY2c041VzVETkJJZycsXG5cdFx0c2tpaW5nOiAnaHR0cDovL3d3dy5ob21lLWh1bnRzLm5ldC93cC1jb250ZW50L3VwbG9hZHMvMjAxNS8wMS9DYXV0ZXJldHMtc2tpaW5nLmpwZycsXG5cdFx0bW91bnRhaW5iaWtpbmc6ICdodHRwOi8vZmlubm9oYXJhLmNvbS9ibG9nL3dwLWNvbnRlbnQvdXBsb2Fkcy8wMDAwX0ZPX0FUSExFVEVTXzk2MV8xY19SR0IuanBnJyxcblx0XHRzdXJmaW5nOiAnaHR0cHM6Ly9lbmNyeXB0ZWQtdGJuMy5nc3RhdGljLmNvbS9pbWFnZXM/cT10Ym46QU5kOUdjUmN4U0lIb2JMdmdYTWd5NmcwdTF5WGpxOXRIN2VjT0wwM1ZDVklobWYtNV9rOXZFSkMnLFxuXHRcdGN5Y2xpbmc6ICdodHRwOi8vd3d3Lm1zbmJjLmNvbS9zaXRlcy9tc25iYy9maWxlcy8yMDEzLzA1L2FwMDIwNTA1MDIyNTdfMS5qcGcnLFxuXHRcdHRlbm5pczogJ2h0dHA6Ly9pbWFnZXMubnltYWcuY29tL2d1aWRlcy9ldmVyeXRoaW5nL3Rlbm5pcy9wdWJsaWNjb3VydHMwODA1MDVfMV81NjAuanBnJ1xuXHR9XG5cblx0dmFyIHNwb3J0c0xpc3QgPSBbXCJCYXNrZXRiYWxsXCIsIFwiQ2xpbWJpbmdcIiwgXCJTb2NjZXJcIiwgXCJCYXNlYmFsbFwiLCBcIkZvb3RiYWxsXCIsIFwiTGlmdGluZ1wiLCBcIlNraWluZ1wiLCBcIk1vdW50YWluIEJpa2luZ1wiLCBcIlN1cmZpbmdcIiwgXCJDeWNsaW5nXCIsICdUZW5uaXMnXTtcblxuICAgIGZ1bmN0aW9uIGNyZWF0ZUV2ZW50KGV2ZW50KXtcbiAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9hcGkvZXZlbnQvJywgZXZlbnQpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldEV2ZW50QnlJZChpZCl7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvZXZlbnQvJytpZCk7XG4gICAgfVxuXHRyZXR1cm4ge1xuXHRcdGdldFVybDogZnVuY3Rpb24odHlwZSkge1xuXHRcdFx0cmV0dXJuIGRlZmF1bHRJbWFnZXNbdHlwZV07XG5cdFx0fSxcbiAgICAgICAgY3JlYXRlRXZlbnQ6IGNyZWF0ZUV2ZW50LFxuICAgICAgICBnZXRFdmVudEJ5SWQ6IGdldEV2ZW50QnlJZCxcblx0XHRzcG9ydHNMaXN0OiBzcG9ydHNMaXN0XG5cdH1cbn0pXG4iLCJhcHAuZmFjdG9yeSgnRnVsbHN0YWNrUGljcycsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW1xuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I3Z0JYdWxDQUFBWFFjRS5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9mYmNkbi1zcGhvdG9zLWMtYS5ha2FtYWloZC5uZXQvaHBob3Rvcy1hay14YXAxL3QzMS4wLTgvMTA4NjI0NTFfMTAyMDU2MjI5OTAzNTkyNDFfODAyNzE2ODg0MzMxMjg0MTEzN19vLmpwZycsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQi1MS1VzaElnQUV5OVNLLmpwZycsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjc5LVg3b0NNQUFrdzd5LmpwZycsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQi1VajlDT0lJQUlGQWgwLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjZ5SXlGaUNFQUFxbDEyLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0UtVDc1bFdBQUFtcXFKLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0V2WkFnLVZBQUFrOTMyLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0VnTk1lT1hJQUlmRGhLLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0VReUlETldnQUF1NjBCLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0NGM1Q1UVc4QUUybEdKLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0FlVnc1U1dvQUFBTHNqLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0FhSklQN1VrQUFsSUdzLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0FRT3c5bFdFQUFZOUZsLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQi1PUWJWckNNQUFOd0lNLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjliX2Vyd0NZQUF3UmNKLnBuZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjVQVGR2bkNjQUVBbDR4LmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjRxd0MwaUNZQUFsUEdoLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjJiMzN2UklVQUE5bzFELmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQndwSXdyMUlVQUF2TzJfLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQnNTc2VBTkNZQUVPaEx3LmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0o0dkxmdVV3QUFkYTRMLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0k3d3pqRVZFQUFPUHBTLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0lkSHZUMlVzQUFubkhWLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0dDaVBfWVdZQUFvNzVWLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0lTNEpQSVdJQUkzN3F1LmpwZzpsYXJnZSdcbiAgICBdO1xufSk7XG4iLCJhcHAuZmFjdG9yeSgnT25lRXZlbnQnLCBmdW5jdGlvbiAoKSB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBuYW1lOiBcInNrYXRpbmdcIixcbiAgICAgICAgdGFnczpcImljZVwiLFxuICAgICAgICBudW1PZlBlb3BsZToyLFxuICAgICAgICBkYXRlOlwiMTEvMjMvMjAxNVwiLFxuICAgICAgICB0aW1lOlwiNzowMFwiLFxuICAgICAgICBmZWVQZXJQZXJzb246NSxcbiAgICAgICAgbG9jYXRpb246XCJjZW50cmFsIFBhcmtcIixcbiAgICAgICAgZGVzY3JpcHRpb246IFwiTmljZSBwbGFjZVwiXG4gICAgfTtcblxufSk7XG4iLCJhcHAuZmFjdG9yeSgnUmFuZG9tTW90dG8nLCBmdW5jdGlvbiAoKSB7XG5cbiAgICB2YXIgZ2V0UmFuZG9tRnJvbUFycmF5ID0gZnVuY3Rpb24gKGFycikge1xuICAgICAgICByZXR1cm4gYXJyW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGFyci5sZW5ndGgpXTtcbiAgICB9O1xuXG4gICAgdmFyIG1vdHRvID0gW1xuICAgICAgICAnU3BvcnQgdXAhJyxcbiAgICAgICAgJ3RlYW13b3JrIG1ha2VzIHRoZSBkcmVhbSB3b3JrJyxcbiAgICAgICAgJ0hlbGxvLCBzaW1wbGUgaHVtYW4uJyxcbiAgICAgICAgJ1doYXQgYSBiZWF1dGlmdWwgZGF5IUxldFxcJ3Mgd29yayBvdXQhJyxcbiAgICAgICAgJ+eUn+WRveWcqOS6jui/kOWKqCcsXG4gICAgICAgICdMaWZlIGlzIHNob3J0LCBQbGF5IEhhcmQhJyxcbiAgICAgICAgJ1RvZ2V0aGVyIEV2ZXJ5b25lIEFjaGlldmVzIE1vcmUuJyxcbiAgICAgICAgJ1VuaXRlZCB3ZSBwbGF5LiBVbml0ZWQgd2Ugd2luLicsXG4gICAgICAgICdZb3UgbWF5IGJlIHN0cm9uZywgYnV0IHdlIGFyZSBzdHJvbmdlci4nXG4gICAgXTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIG1vdHRvOiBtb3R0byxcbiAgICAgICAgZ2V0UmFuZG9tTW90dG86IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBnZXRSYW5kb21Gcm9tQXJyYXkobW90dG8pO1xuICAgICAgICB9XG4gICAgfTtcblxufSk7XG4iLCJhcHAuZmFjdG9yeSgnVXNlckZhY3RvcnknLCBmdW5jdGlvbigkaHR0cCl7XG5cblxuICAgIHZhciB1c2VycyA9IFtcbiAgICAgICAge1xuICAgICAgICAgICAgdXNlck5hbWU6ICdTdGV3ZWUnLFxuICAgICAgICAgICAgZmlyc3ROYW1lOiAnU3Rld2FydCcsXG4gICAgICAgICAgICBsYXN0TmFtZTogJ0dyaWZmaW4nLFxuICAgICAgICAgICAgZ2VuZGVyOiAnTScsXG4gICAgICAgICAgICBlbWFpbDogJ21pbmdqaWVAZnNhLmNvbScsXG4gICAgICAgICAgICBiaXJ0aDoge1xuICAgICAgICAgICAgICAgIGRheTogJzE1JyxcbiAgICAgICAgICAgICAgICBtb250aDogJzA2JyxcbiAgICAgICAgICAgICAgICB5ZWFyOiAnMjAxMCdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBtb3R0bzogJ0xpdHRsZSBBc3Nob2xkJyxcbiAgICAgICAgICAgIGFkZHJlc3M6IHtcbiAgICAgICAgICAgICAgICBhZGRyZXNzMTogJzMyMSBicm9hZHdheScsXG4gICAgICAgICAgICAgICAgYWRkcmVzczI6ICdhcHQgNGMnLFxuICAgICAgICAgICAgICAgIGNpdHk6ICduZXcgeW9yaycsXG4gICAgICAgICAgICAgICAgc3RhdGU6ICdOWScsXG4gICAgICAgICAgICAgICAgemlwOiAnMTEyMjknXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbGlua3M6IFtdLFxuICAgICAgICAgICAgaW1hZ2U6ICcnLFxuICAgICAgICAgICAgYWJvdXQ6ICdMb3JlbSBJcHN1bSBpcyBzaW1wbHkgZHVtbXkgdGV4dCBvZiB0aGUgcHJpbnRpbmcgYW5kIHR5cGVzZXR0aW5nIGluZHVzdHJ5LiBMb3JlbSBJcHN1bSBoYXMgYmVlbiB0aGUgaW5kdXN0cnlcXCdzIHN0YW5kYXJkIGR1bW15IHRleHQgZXZlciBzaW5jZSB0aGUgMTUwMHMsIHdoZW4gYW4gdW5rbm93biBwcmludGVyIHRvb2sgYSBnYWxsZXkgb2YgdHlwZSBhbmQgc2NyYW1ibGVkIGl0IHRvIG1ha2UgYSB0eXBlIHNwZWNpbWVuIGJvb2suIEl0IGhhcyBzdXJ2aXZlZCBub3Qgb25seSBmaXZlIGNlbnR1cmllcywgYnV0IGFsc28gdGhlIGxlYXAgaW50byBlbGVjdHJvbmljIHR5cGVzZXR0aW5nLCByZW1haW5pbmcgZXNzZW50aWFsbHkgdW5jaGFuZ2VkLiBJdCB3YXMgcG9wdWxhcmlzZWQgaW4gdGhlIDE5NjBzIHdpdGggdGhlIHJlbGVhc2Ugb2YgTGV0cmFzZXQgc2hlZXRzIGNvbnRhaW5pbmcgTG9yZW0gSXBzdW0gcGFzc2FnZXMsIGFuZCBtb3JlIHJlY2VudGx5IHdpdGggZGVza3RvcCBwdWJsaXNoaW5nIHNvZnR3YXJlIGxpa2UgQWxkdXMgUGFnZU1ha2VyIGluY2x1ZGluZyB2ZXJzaW9ucyBvZiBMb3JlbSBJcHN1bS4nXG4gICAgICAgIH1cbiAgICBdO1xuICAgIGZ1bmN0aW9uIGdldFVzZXJzKCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL3VzZXJzLycpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFVzZXJCeUlkKGlkKXtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2FwaS91c2Vycy8nICsgaWQpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVwZGF0ZVVzZXIodXNlcil7XG4gICAgICAgIHJldHVybiAkaHR0cC5wdXQoJy9hcGkvdXNlcnMvJywgdXNlcik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3JlYXRlVXNlcih1c2VyKXtcbiAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9hcGkvdXNlcnMvJywgdXNlcik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVtb3ZlVXNlcihpZCl7XG4gICAgICAgIHJldHVybiAkaHR0cC5kZWxldGUoJy9hcGkvdXNlcnMvJytpZCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZ2V0VXNlcnM6IGdldFVzZXJzLFxuICAgICAgICBnZXRVc2VyQnlJZDogZ2V0VXNlckJ5SWQsXG4gICAgICAgIHVwZGF0ZVVzZXI6IHVwZGF0ZVVzZXIsXG4gICAgICAgIGNyZWF0ZVVzZXI6IGNyZWF0ZVVzZXIsXG4gICAgICAgIHJlbW92ZVVzZXI6IHJlbW92ZVVzZXJcbiAgICB9XG5cbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ1V0aWxzJywgZnVuY3Rpb24oKXtcblxuICAgIHZhciBzdGF0ZV9oYXNoID0gIFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiQWxhYmFtYVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJBTFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkFsYXNrYVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJBS1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkFtZXJpY2FuIFNhbW9hXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIkFTXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiQXJpem9uYVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJBWlwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkFya2Fuc2FzXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIkFSXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiQ2FsaWZvcm5pYVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJDQVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkNvbG9yYWRvXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIkNPXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiQ29ubmVjdGljdXRcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiQ1RcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJEZWxhd2FyZVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJERVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkRpc3RyaWN0IE9mIENvbHVtYmlhXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIkRDXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiRmVkZXJhdGVkIFN0YXRlcyBPZiBNaWNyb25lc2lhXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIkZNXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiRmxvcmlkYVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJGTFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkdlb3JnaWFcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiR0FcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJHdWFtXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIkdVXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiSGF3YWlpXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIkhJXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiSWRhaG9cIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiSURcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJJbGxpbm9pc1wiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJJTFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkluZGlhbmFcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiSU5cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJJb3dhXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIklBXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiS2Fuc2FzXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIktTXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiS2VudHVja3lcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiS1lcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJMb3Vpc2lhbmFcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiTEFcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJNYWluZVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJNRVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIk1hcnNoYWxsIElzbGFuZHNcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiTUhcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJNYXJ5bGFuZFwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJNRFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIk1hc3NhY2h1c2V0dHNcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiTUFcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJNaWNoaWdhblwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJNSVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIk1pbm5lc290YVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJNTlwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIk1pc3Npc3NpcHBpXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIk1TXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiTWlzc291cmlcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiTU9cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJNb250YW5hXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIk1UXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiTmVicmFza2FcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiTkVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJOZXZhZGFcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiTlZcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJOZXcgSGFtcHNoaXJlXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIk5IXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiTmV3IEplcnNleVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJOSlwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIk5ldyBNZXhpY29cIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiTk1cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJOZXcgWW9ya1wiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJOWVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIk5vcnRoIENhcm9saW5hXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIk5DXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiTm9ydGggRGFrb3RhXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIk5EXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiTm9ydGhlcm4gTWFyaWFuYSBJc2xhbmRzXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIk1QXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiT2hpb1wiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJPSFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIk9rbGFob21hXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIk9LXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiT3JlZ29uXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIk9SXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiUGFsYXVcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiUFdcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJQZW5uc3lsdmFuaWFcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiUEFcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJQdWVydG8gUmljb1wiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJQUlwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIlJob2RlIElzbGFuZFwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJSSVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIlNvdXRoIENhcm9saW5hXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIlNDXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiU291dGggRGFrb3RhXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIlNEXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiVGVubmVzc2VlXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIlROXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiVGV4YXNcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiVFhcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJVdGFoXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIlVUXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiVmVybW9udFwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJWVFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIlZpcmdpbiBJc2xhbmRzXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIlZJXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiVmlyZ2luaWFcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiVkFcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJXYXNoaW5ndG9uXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIldBXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiV2VzdCBWaXJnaW5pYVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJXVlwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIldpc2NvbnNpblwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJXSVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIld5b21pbmdcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiV1lcIlxuICAgICAgICB9XG4gICAgXTtcblxuICAgIGZ1bmN0aW9uIGdldFN0YXRlcygpe1xuICAgICAgICByZXR1cm4gc3RhdGVfaGFzaDtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBnZXRTdGF0ZXM6IGdldFN0YXRlc1xuICAgIH1cbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgnZWRpdG9yJywgZnVuY3Rpb24oKXtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL2VkaXRvci9lZGl0b3IuaHRtbCcsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICBjb250ZW50OiAnPSdcbiAgICAgICAgfSxcbiAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oJHNjb3BlKXtcbiAgICAgICAgfSxcbiAgICAgICAgbGluazogZnVuY3Rpb24oKXtcblxuICAgICAgICB9XG4gICAgfTtcbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgnZXZlbnREZXRhaWwnLCBmdW5jdGlvbihFdmVudEZhY3RvcnkpIHtcblx0cmV0dXJuIHtcblx0XHRyZXN0cmljdDogJ0UnLFxuXHRcdHRlbXBsYXRlVXJsOiAnL2pzL2NvbW1vbi9kaXJlY3RpdmVzL2V2ZW50LWRldGFpbC9ldmVudC1kZXRhaWwuaHRtbCcsIFxuXHRcdGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycyl7XG5cdFx0XHRzY29wZS5nZXRJbWFnZSA9IGZ1bmN0aW9uKHR5cGUpIHtcblx0XHRcdFx0cmV0dXJuIEV2ZW50RmFjdG9yeS5nZXRVcmwodHlwZSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59KTsiLCJhcHAuZGlyZWN0aXZlKCdldmVudEZvcm0nLGZ1bmN0aW9uKCl7XG5cdHJldHVybiB7XG5cdFx0cmVzdHJpY3Q6J0UnLFxuXHRcdHRlbXBsYXRlVXJsOidqcy9jb21tb24vZGlyZWN0aXZlcy9ldmVudC1mb3JtL2V2ZW50LWZvcm0uaHRtbCcsXG5cdFx0c2NvcGU6e1xuXHRcdFx0ZXZlbnQ6XCI9XCJcblx0XHR9LFxuXHRcdGNvbnRyb2xsZXI6J2V2ZW50Rm9ybUN0cmwnXG5cblx0fTtcbn0pO1xuXG5hcHAuY29udHJvbGxlcignZXZlbnRGb3JtQ3RybCcsIGZ1bmN0aW9uICgkc2NvcGUpIHtcblxufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCdmbGlwcHknLCBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0VBJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24oJHNjb3BlLCAkZWxlbSwgJGF0dHJzKSB7XG5cbiAgICAgICAgICAgIHZhciBvcHRpb25zID0ge1xuICAgICAgICAgICAgICAgIGZsaXBEdXJhdGlvbjogKCRhdHRycy5mbGlwRHVyYXRpb24pID8gJGF0dHJzLmZsaXBEdXJhdGlvbiA6IDQwMCxcbiAgICAgICAgICAgICAgICB0aW1pbmdGdW5jdGlvbjogJ2Vhc2UtaW4tb3V0JyxcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIHNldHRpbmcgZmxpcCBvcHRpb25zXG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goWydmbGlwcHktZnJvbnQnLCAnZmxpcHB5LWJhY2snXSwgZnVuY3Rpb24obmFtZSkge1xuICAgICAgICAgICAgICAgIHZhciBlbCA9ICRlbGVtLmZpbmQobmFtZSk7XG4gICAgICAgICAgICAgICAgaWYgKGVsLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChbJycsICctbXMtJywgJy13ZWJraXQtJ10sIGZ1bmN0aW9uKHByZWZpeCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KGVsWzBdKS5jc3MocHJlZml4ICsgJ3RyYW5zaXRpb24nLCAnYWxsICcgKyBvcHRpb25zLmZsaXBEdXJhdGlvbi8xMDAwICsgJ3MgJyArIG9wdGlvbnMudGltaW5nRnVuY3Rpb24pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBiZWhhdmlvdXIgZm9yIGZsaXBwaW5nIGVmZmVjdC5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgJHNjb3BlLmZsaXAgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAkZWxlbS50b2dnbGVDbGFzcygnZmxpcHBlZCcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cbiAgICB9O1xufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCdmdWxsc3RhY2tMb2dvJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uaHRtbCdcbiAgICB9O1xufSk7IiwiYXBwLmRpcmVjdGl2ZSgnbmF2YmFyJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCBBVVRIX0VWRU5UUywgJHN0YXRlKSB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICBzY29wZToge30sXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5odG1sJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlKSB7XG5cbiAgICAgICAgICAgIHNjb3BlLml0ZW1zID0gW1xuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdIb21lJywgc3RhdGU6ICdob21lJyB9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdBYm91dCcsIHN0YXRlOiAnYWJvdXQnIH0sXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ0RvY3VtZW50YXRpb24nLCBzdGF0ZTogJ2RvY3MnIH0sXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ1VzZXJzJywgc3RhdGU6ICd1c2Vycyd9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdFdmVudHMnLCBzdGF0ZTogJ2V2ZW50TGlzdCd9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdNZW1iZXJzIE9ubHknLCBzdGF0ZTogJ21lbWJlcnNPbmx5JywgYXV0aDogdHJ1ZSB9XG4gICAgICAgICAgICBdO1xuXG4gICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcblxuICAgICAgICAgICAgc2NvcGUuaXNMb2dnZWRJbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzY29wZS5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UubG9nb3V0KCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdob21lJyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgc2V0VXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnVzZXIgPSB1c2VyO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIHJlbW92ZVVzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2NvcGUudXNlciA9IG51bGw7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzZXRVc2VyKCk7XG5cbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcywgc2V0VXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzLCByZW1vdmVVc2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LCByZW1vdmVVc2VyKTtcblxuICAgICAgICB9XG5cbiAgICB9O1xuXG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ3JhbmRvTW90dG8nLCBmdW5jdGlvbiAoUmFuZG9tTW90dG8pIHtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvcmFuZG8tbW90dG8vcmFuZG8tbW90dG8uaHRtbCcsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSkge1xuICAgICAgICAgICAgc2NvcGUubW90dG8gPSBSYW5kb21Nb3R0by5nZXRSYW5kb21Nb3R0bygpO1xuICAgICAgICB9XG4gICAgfTtcblxufSk7IiwiYXBwLmRpcmVjdGl2ZSgnc2VhcmNoRmlsdGVycycsIGZ1bmN0aW9uKEV2ZW50RmFjdG9yeSkge1xuXHRyZXR1cm4ge1xuXHRcdHJlc3RyaWN0OiAnRScsXG5cdFx0dGVtcGxhdGVVcmw6ICcvanMvY29tbW9uL2RpcmVjdGl2ZXMvc2VhcmNoLWZpbHRlcnMvc2VhcmNoLWZpbHRlcnMuaHRtbCcsIFxuXHRcdH1cblx0fSk7IiwiXG5hcHAuZGlyZWN0aXZlKCdyb3RhdGVUZXh0JyxcbiAgICBmdW5jdGlvbigkaW50ZXJ2YWwpIHtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XG5cbiAgICAgICAgICAgIHNjb3BlLndvcmRBcnI9WydCYWxsJywgJ1N3aW0nLCAnR29hbCcsICdUZWUnLCAnVGFja2xlJywgJ1B1bGwnLCAnQ2FydmUnLCAnVGVhbScsICdMaWZ0JywgJ0NsaW1iJywgJ0JlbGF5JywgJ0N5Y2xlJywgJ1NlcnZlJywgJ1Nwb3J0J107XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIHVwZGF0ZVdvcmQoaSkge1xuICAgICAgICAgICAgICAgIHZhciBqPShpKzEpJTU7IC8vKGkrMSkgdG8gc3RhcnQgYXQgc2Vjb25kIHdvcmRcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKGopO1xuICAgICAgICAgICAgICAgIGVsZW1lbnQudGV4dChzY29wZS53b3JkQXJyW2pdKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZWxlbWVudC50ZXh0KHNjb3BlLndvcmRBcnJbMF0pOyAvL2Rpc3BsYXlzIFwiZnVuXCJcbiAgICAgICAgICAgIHZhciBzdG9wV29yZCA9ICRpbnRlcnZhbCh1cGRhdGVXb3JkLCAyMDAwKTsgLy9zdGFydCByb3RhdGluZyAxIHNlY29uZCBhZnRlciwgY2hhbmdlcyBldmVyeSBzZWNcblxuICAgICAgICAgICAgLy8gbGlzdGVuIG9uIERPTSBkZXN0cm95IChyZW1vdmFsKSBldmVudFxuICAgICAgICAgICAgLy8gdG8gcHJldmVudCB1cGRhdGluZyB3b3JkIGFmdGVyIHRoZSBET00gZWxlbWVudCB3YXMgcmVtb3ZlZC5cbiAgICAgICAgICAgIGVsZW1lbnQub24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgJGludGVydmFsLmNhbmNlbChzdG9wV29yZCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
