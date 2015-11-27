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

    $stateProvider.state('login', {
        url: '/login',
        templateUrl: 'js/login/login.html',
        controller: 'LoginCtrl'
    });
});

app.controller('LoginCtrl', function ($scope, AuthService, $state) {

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
        console.log(signupInfo);
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
    $stateProvider.state('home', {
        url: '/',
        templateUrl: 'js/home/home.html'

    });
});
app.config(function ($stateProvider) {
    $stateProvider.state('users', {
        url: '/users',
        templateUrl: 'js/user/list.html',
        controller: function controller($scope) {}
    }).state('userDetail', {
        url: '/users/detail/:id',
        templateUrl: 'js/user/profile.html',
        controller: function controller($scope) {
            $scope.user = {
                userName: 'Stewee',
                firstName: 'Stewart',
                lastName: 'Griffin',
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
                    country: 'USA'
                },
                about: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.',
                following: []
            };
        }
    }).state('userEdit', {
        url: '/users/edit/:id',
        templateUrl: 'js/user/edit.html',
        resolve: {
            user: function user($stateParams, UserFactory) {
                console.log($stateParams.id);

                return UserFactory.getUserById($stateParams.id);
            },
            states: function states(Utils) {
                return Utils.getStates();
            }
        },
        controller: function controller($scope, user, states) {
            $scope.user = user;
            $scope.allStates = states;
            $scope.setState = function (state) {
                $scope.user.address.state = state;
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

app.factory('UserFactory', function () {

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
        return users;
    }

    function getUserById(id) {
        return users[0];
    }

    return {
        getUsers: getUsers,
        getUserById: getUserById
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

app.directive('rotateText', function ($interval) {

    return function (scope, element, attrs) {

        scope.wordArr = ['Swim', 'Team', 'Gym', 'Climb', 'Sport'];

        function updateWord(i) {
            var j = (i + 1) % 5; //(i+1) to start at second word
            //console.log(j);
            element.text(scope.wordArr[j]);
        }

        element.text(scope.wordArr[0]); //displays "fun"
        stopWord = $interval(updateWord, 2000); //start rotating 1 second after, changes every sec

        // listen on DOM destroy (removal) event
        // to prevent updating word after the DOM element was removed.
        element.on('$destroy', function () {
            $interval.cancel(stopWord);
        });
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFib3V0L2Fib3V0LmpzIiwiZG9jcy9kb2NzLmpzIiwiZXZlbnQvZXZlbnQuanMiLCJmc2EvZnNhLXByZS1idWlsdC5qcyIsImxvZ2luL2xvZ2luLmpzIiwibWVtYmVycy1vbmx5L21lbWJlcnMtb25seS5qcyIsImhvbWUvaG9tZS5qcyIsInVzZXIvdXNlci5qcyIsImNvbW1vbi9mYWN0b3JpZXMvRXZlbnRGYWN0b3J5LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9GdWxsc3RhY2tQaWNzLmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9PbmVFdmVudC5qcyIsImNvbW1vbi9mYWN0b3JpZXMvUmFuZG9tTW90dG8uanMiLCJjb21tb24vZmFjdG9yaWVzL1VzZXJGYWN0b3J5LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9VdGlsRmFjdG9yeS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL2VkaXRvci9lZGl0b3IuanMiLCJjb21tb24vZGlyZWN0aXZlcy9ldmVudC1kZXRhaWwvZXZlbnQtZGV0YWlsLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvZXZlbnQtZm9ybS9ldmVudC1mb3JtLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uanMiLCJjb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvcmFuZG8tbW90dG8vcmFuZG8tbW90dG8uanMiLCJjb21tb24vZGlyZWN0aXZlcy90ZXh0LXJvdGF0ZS90ZXh0LXJvdGF0ZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxZQUFBLENBQUE7QUFDQSxNQUFBLENBQUEsR0FBQSxHQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsdUJBQUEsRUFBQSxDQUFBLFdBQUEsRUFBQSxjQUFBLEVBQUEsYUFBQSxFQUFBLGNBQUEsRUFBQSxXQUFBLEVBQUEsYUFBQSxFQUFBLG1CQUFBLEVBQUEsYUFBQSxFQUFBLGVBQUEsQ0FBQSxDQUFBLENBQUE7O0FBRUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGtCQUFBLEVBQUEsaUJBQUEsRUFBQTs7QUFFQSxxQkFBQSxDQUFBLFNBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTs7QUFFQSxzQkFBQSxDQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTtDQUNBLENBQUEsQ0FDQSxNQUFBLENBQUEsVUFBQSwwQkFBQSxFQUFBO0FBQ0EsOEJBQUEsQ0FBQSxTQUFBLENBQUE7QUFDQSxXQUFBLEVBQUEseUNBQUE7QUFDQSxTQUFBLEVBQUEsTUFBQTtBQUNBLGlCQUFBLEVBQUEsZ0NBQUE7S0FDQSxDQUFBLENBQUE7Q0FDQSxDQUFBLENBQUE7OztBQUdBLEdBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxVQUFBLEVBQUEsV0FBQSxFQUFBLE1BQUEsRUFBQTs7O0FBR0EsUUFBQSw0QkFBQSxHQUFBLFNBQUEsNEJBQUEsQ0FBQSxLQUFBLEVBQUE7QUFDQSxlQUFBLEtBQUEsQ0FBQSxJQUFBLElBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxZQUFBLENBQUE7S0FDQSxDQUFBOzs7O0FBSUEsY0FBQSxDQUFBLEdBQUEsQ0FBQSxtQkFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQSxRQUFBLEVBQUE7O0FBRUEsWUFBQSxDQUFBLDRCQUFBLENBQUEsT0FBQSxDQUFBLEVBQUE7OztBQUdBLG1CQUFBO1NBQ0E7O0FBRUEsWUFBQSxXQUFBLENBQUEsZUFBQSxFQUFBLEVBQUE7OztBQUdBLG1CQUFBO1NBQ0E7OztBQUdBLGFBQUEsQ0FBQSxjQUFBLEVBQUEsQ0FBQTs7QUFFQSxtQkFBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTs7OztBQUlBLGdCQUFBLElBQUEsRUFBQTtBQUNBLHNCQUFBLENBQUEsRUFBQSxDQUFBLE9BQUEsQ0FBQSxJQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7YUFDQSxNQUFBO0FBQ0Esc0JBQUEsQ0FBQSxFQUFBLENBQUEsT0FBQSxDQUFBLENBQUE7YUFDQTtTQUNBLENBQUEsQ0FBQTtLQUVBLENBQUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUN6REEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTs7O0FBR0Esa0JBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLFFBQUE7QUFDQSxrQkFBQSxFQUFBLGlCQUFBO0FBQ0EsbUJBQUEsRUFBQSxxQkFBQTtLQUNBLENBQUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsVUFBQSxDQUFBLGlCQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsYUFBQSxFQUFBOzs7QUFHQSxVQUFBLENBQUEsTUFBQSxHQUFBLENBQUEsQ0FBQSxPQUFBLENBQUEsYUFBQSxDQUFBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUNoQkEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTtBQUNBLGtCQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxPQUFBO0FBQ0EsbUJBQUEsRUFBQSxtQkFBQTtLQUNBLENBQUEsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7QUNMQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FDQSxLQUFBLENBQUEsV0FBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLFNBQUE7QUFDQSxtQkFBQSxFQUFBLG9CQUFBO0FBQ0Esa0JBQUEsRUFBQSxvQkFBQSxNQUFBLEVBQUEsa0JBQUEsRUFBQTtBQUNBLGtCQUFBLENBQUEsR0FBQSxHQUFBLEVBQUEsTUFBQSxFQUFBLEVBQUEsUUFBQSxFQUFBLFNBQUEsRUFBQSxTQUFBLEVBQUEsQ0FBQSxTQUFBLEVBQUEsRUFBQSxJQUFBLEVBQUEsRUFBQSxFQUFBLENBQUE7QUFDQSw4QkFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQSxFQUFBLENBQUEsQ0FBQTtTQUNBO0tBQ0EsQ0FBQSxDQUNBLEtBQUEsQ0FBQSxhQUFBLEVBQUE7QUFDQSxXQUFBLEVBQUEsb0JBQUE7QUFDQSxtQkFBQSxFQUFBLHNCQUFBO0FBQ0Esa0JBQUEsRUFBQSxvQkFBQSxNQUFBLEVBQUE7QUFDQSxrQkFBQSxDQUFBLElBQUEsR0FBQSxRQUFBLENBQUE7U0FDQTtLQUNBLENBQUEsQ0FDQSxLQUFBLENBQUEsYUFBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLGdCQUFBO0FBQ0EsbUJBQUEsRUFBQSxzQkFBQTtBQUNBLGtCQUFBLEVBQUEsb0JBQUEsTUFBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxNQUFBLEdBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSxxQkFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO2FBQ0EsQ0FBQTtTQUNBO0tBQ0EsQ0FBQSxDQUNBLEtBQUEsQ0FBQSxhQUFBLEVBQUE7QUFDQSxXQUFBLEVBQUEsb0JBQUE7QUFDQSxtQkFBQSxFQUFBLHNCQUFBO0FBQ0Esa0JBQUEsRUFBQSxvQkFBQSxNQUFBLEVBQUE7QUFDQSxrQkFBQSxDQUFBLE1BQUEsR0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLHFCQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7YUFDQSxDQUFBO1NBQ0E7S0FDQSxDQUFBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FDbkNBLENBQUEsWUFBQTs7QUFFQSxnQkFBQSxDQUFBOzs7QUFHQSxRQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsRUFBQSxNQUFBLElBQUEsS0FBQSxDQUFBLHdCQUFBLENBQUEsQ0FBQTs7QUFFQSxRQUFBLEdBQUEsR0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLGFBQUEsRUFBQSxFQUFBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsT0FBQSxDQUFBLFFBQUEsRUFBQSxZQUFBO0FBQ0EsWUFBQSxDQUFBLE1BQUEsQ0FBQSxFQUFBLEVBQUEsTUFBQSxJQUFBLEtBQUEsQ0FBQSxzQkFBQSxDQUFBLENBQUE7QUFDQSxlQUFBLE1BQUEsQ0FBQSxFQUFBLENBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtLQUNBLENBQUEsQ0FBQTs7Ozs7QUFLQSxPQUFBLENBQUEsUUFBQSxDQUFBLGFBQUEsRUFBQTtBQUNBLG9CQUFBLEVBQUEsb0JBQUE7QUFDQSxtQkFBQSxFQUFBLG1CQUFBO0FBQ0EscUJBQUEsRUFBQSxxQkFBQTtBQUNBLHNCQUFBLEVBQUEsc0JBQUE7QUFDQSx3QkFBQSxFQUFBLHdCQUFBO0FBQ0EscUJBQUEsRUFBQSxxQkFBQTtLQUNBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsT0FBQSxDQUFBLGlCQUFBLEVBQUEsVUFBQSxVQUFBLEVBQUEsRUFBQSxFQUFBLFdBQUEsRUFBQTtBQUNBLFlBQUEsVUFBQSxHQUFBO0FBQ0EsZUFBQSxFQUFBLFdBQUEsQ0FBQSxnQkFBQTtBQUNBLGVBQUEsRUFBQSxXQUFBLENBQUEsYUFBQTtBQUNBLGVBQUEsRUFBQSxXQUFBLENBQUEsY0FBQTtBQUNBLGVBQUEsRUFBQSxXQUFBLENBQUEsY0FBQTtTQUNBLENBQUE7QUFDQSxlQUFBO0FBQ0EseUJBQUEsRUFBQSx1QkFBQSxRQUFBLEVBQUE7QUFDQSwwQkFBQSxDQUFBLFVBQUEsQ0FBQSxVQUFBLENBQUEsUUFBQSxDQUFBLE1BQUEsQ0FBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsdUJBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTthQUNBO1NBQ0EsQ0FBQTtLQUNBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsYUFBQSxFQUFBO0FBQ0EscUJBQUEsQ0FBQSxZQUFBLENBQUEsSUFBQSxDQUFBLENBQ0EsV0FBQSxFQUNBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsbUJBQUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxpQkFBQSxDQUFBLENBQUE7U0FDQSxDQUNBLENBQUEsQ0FBQTtLQUNBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsT0FBQSxDQUFBLGFBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsVUFBQSxFQUFBLFdBQUEsRUFBQSxFQUFBLEVBQUE7O0FBRUEsaUJBQUEsaUJBQUEsQ0FBQSxRQUFBLEVBQUE7QUFDQSxnQkFBQSxJQUFBLEdBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxFQUFBLEVBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0Esc0JBQUEsQ0FBQSxVQUFBLENBQUEsV0FBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBO0FBQ0EsbUJBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQTtTQUNBOzs7O0FBSUEsWUFBQSxDQUFBLGVBQUEsR0FBQSxZQUFBO0FBQ0EsbUJBQUEsQ0FBQSxDQUFBLE9BQUEsQ0FBQSxJQUFBLENBQUE7U0FDQSxDQUFBOztBQUVBLFlBQUEsQ0FBQSxlQUFBLEdBQUEsVUFBQSxVQUFBLEVBQUE7Ozs7Ozs7Ozs7QUFVQSxnQkFBQSxJQUFBLENBQUEsZUFBQSxFQUFBLElBQUEsVUFBQSxLQUFBLElBQUEsRUFBQTtBQUNBLHVCQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsT0FBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO2FBQ0E7Ozs7O0FBS0EsbUJBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsaUJBQUEsQ0FBQSxTQUFBLENBQUEsWUFBQTtBQUNBLHVCQUFBLElBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQTtTQUVBLENBQUE7O0FBRUEsWUFBQSxDQUFBLEtBQUEsR0FBQSxVQUFBLFdBQUEsRUFBQTtBQUNBLG1CQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEsUUFBQSxFQUFBLFdBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxpQkFBQSxDQUFBLFNBQ0EsQ0FBQSxZQUFBO0FBQ0EsdUJBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxFQUFBLE9BQUEsRUFBQSw0QkFBQSxFQUFBLENBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQTtTQUNBLENBQUE7O0FBRUEsWUFBQSxDQUFBLE1BQUEsR0FBQSxZQUFBO0FBQ0EsbUJBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQTtBQUNBLHVCQUFBLENBQUEsT0FBQSxFQUFBLENBQUE7QUFDQSwwQkFBQSxDQUFBLFVBQUEsQ0FBQSxXQUFBLENBQUEsYUFBQSxDQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FDQSxDQUFBO0tBRUEsQ0FBQSxDQUFBOztBQUVBLE9BQUEsQ0FBQSxPQUFBLENBQUEsU0FBQSxFQUFBLFVBQUEsVUFBQSxFQUFBLFdBQUEsRUFBQTs7QUFFQSxZQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsa0JBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLGdCQUFBLEVBQUEsWUFBQTtBQUNBLGdCQUFBLENBQUEsT0FBQSxFQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7O0FBRUEsa0JBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLGNBQUEsRUFBQSxZQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxPQUFBLEVBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTs7QUFFQSxZQUFBLENBQUEsRUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLFlBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLFlBQUEsQ0FBQSxNQUFBLEdBQUEsVUFBQSxTQUFBLEVBQUEsSUFBQSxFQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxFQUFBLEdBQUEsU0FBQSxDQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO1NBQ0EsQ0FBQTs7QUFFQSxZQUFBLENBQUEsT0FBQSxHQUFBLFlBQUE7QUFDQSxnQkFBQSxDQUFBLEVBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxnQkFBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7U0FDQSxDQUFBO0tBRUEsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxFQUFBLENBQUE7O0FDcElBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7O0FBRUEsa0JBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLFFBQUE7QUFDQSxtQkFBQSxFQUFBLHFCQUFBO0FBQ0Esa0JBQUEsRUFBQSxXQUFBO0tBQ0EsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxVQUFBLENBQUEsV0FBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxNQUFBLEVBQUE7O0FBRUEsVUFBQSxDQUFBLEtBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsU0FBQSxHQUFBLFVBQUEsU0FBQSxFQUFBOztBQUVBLGNBQUEsQ0FBQSxLQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLG1CQUFBLENBQUEsS0FBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxZQUFBO0FBQ0Esa0JBQUEsQ0FBQSxFQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7U0FDQSxDQUFBLFNBQUEsQ0FBQSxZQUFBO0FBQ0Esa0JBQUEsQ0FBQSxLQUFBLEdBQUEsNEJBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUVBLENBQUE7O0FBRUEsVUFBQSxDQUFBLFVBQUEsR0FBQSxVQUFBLFVBQUEsRUFBQTtBQUNBLGNBQUEsQ0FBQSxLQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTtLQUNBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FDaENBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7O0FBRUEsa0JBQUEsQ0FBQSxLQUFBLENBQUEsYUFBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLGVBQUE7QUFDQSxnQkFBQSxFQUFBLG1FQUFBO0FBQ0Esa0JBQUEsRUFBQSxvQkFBQSxNQUFBLEVBQUEsV0FBQSxFQUFBO0FBQ0EsdUJBQUEsQ0FBQSxRQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxzQkFBQSxDQUFBLEtBQUEsR0FBQSxLQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FDQTs7O0FBR0EsWUFBQSxFQUFBO0FBQ0Esd0JBQUEsRUFBQSxJQUFBO1NBQ0E7S0FDQSxDQUFBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FBRUEsR0FBQSxDQUFBLE9BQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUE7O0FBRUEsUUFBQSxRQUFBLEdBQUEsU0FBQSxRQUFBLEdBQUE7QUFDQSxlQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsMkJBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLG1CQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFdBQUE7QUFDQSxnQkFBQSxFQUFBLFFBQUE7S0FDQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDL0JBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7QUFDQSxrQkFBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxXQUFBLEVBQUEsR0FBQTtBQUNBLG1CQUFBLEVBQUEsbUJBQUE7O0tBRUEsQ0FBQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBO0FDTkEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTtBQUNBLGtCQUFBLENBQ0EsS0FBQSxDQUFBLE9BQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxRQUFBO0FBQ0EsbUJBQUEsRUFBQSxtQkFBQTtBQUNBLGtCQUFBLEVBQUEsb0JBQUEsTUFBQSxFQUFBLEVBRUE7S0FDQSxDQUFBLENBQ0EsS0FBQSxDQUFBLFlBQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxtQkFBQTtBQUNBLG1CQUFBLEVBQUEsc0JBQUE7QUFDQSxrQkFBQSxFQUFBLG9CQUFBLE1BQUEsRUFBQTtBQUNBLGtCQUFBLENBQUEsSUFBQSxHQUFBO0FBQ0Esd0JBQUEsRUFBQSxRQUFBO0FBQ0EseUJBQUEsRUFBQSxTQUFBO0FBQ0Esd0JBQUEsRUFBQSxTQUFBO0FBQ0EscUJBQUEsRUFBQTtBQUNBLHVCQUFBLEVBQUEsSUFBQTtBQUNBLHlCQUFBLEVBQUEsSUFBQTtBQUNBLHdCQUFBLEVBQUEsTUFBQTtpQkFDQTtBQUNBLHFC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QUNBLENBQUE7QUFDQSxhQUFBLFFBQUEsR0FBQTtBQUNBLGVBQUEsS0FBQSxDQUFBO0tBQ0E7O0FBRUEsYUFBQSxXQUFBLENBQUEsRUFBQSxFQUFBO0FBQ0EsZUFBQSxLQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7S0FDQTs7QUFFQSxXQUFBO0FBQ0EsZ0JBQUEsRUFBQSxRQUFBO0FBQ0EsbUJBQUEsRUFBQSxXQUFBO0tBQ0EsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUN6Q0EsR0FBQSxDQUFBLE9BQUEsQ0FBQSxPQUFBLEVBQUEsWUFBQTs7QUFFQSxRQUFBLFVBQUEsR0FBQSxDQUNBO0FBQ0EsY0FBQSxFQUFBLFNBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFFBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLGdCQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxTQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxVQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxZQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxVQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxhQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxVQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxzQkFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsZ0NBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFNBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFNBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLE1BQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFFBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLE9BQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFVBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFNBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLE1BQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFFBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFVBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFdBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLE9BQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLGtCQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxVQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxlQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxVQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxXQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxhQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxVQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxTQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxVQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxRQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxlQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxZQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxZQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxVQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxnQkFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsY0FBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsMEJBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLE1BQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFVBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLFFBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLE9BQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLGNBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLGFBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLGNBQUE7QUFDQSxzQkFBQSxFQUFBLElBQUE7S0FDQSxFQUNBO0FBQ0EsY0FBQSxFQUFBLGdCQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxjQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxXQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxPQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxNQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxTQUFBO0FBQ0Esc0JBQUEsRUFBQSxJQUFBO0tBQ0EsRUFDQTtBQUNBLGNBQUEsRUFBQSxnQkFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsVUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsWUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsZUFBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsV0FBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLEVBQ0E7QUFDQSxjQUFBLEVBQUEsU0FBQTtBQUNBLHNCQUFBLEVBQUEsSUFBQTtLQUNBLENBQ0EsQ0FBQTs7QUFFQSxhQUFBLFNBQUEsR0FBQTtBQUNBLGVBQUEsVUFBQSxDQUFBO0tBQ0E7O0FBRUEsV0FBQTtBQUNBLGlCQUFBLEVBQUEsU0FBQTtLQUNBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FDeFBBLEdBQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxFQUFBLFlBQUE7QUFDQSxXQUFBO0FBQ0EsZ0JBQUEsRUFBQSxHQUFBO0FBQ0EsbUJBQUEsRUFBQSx5Q0FBQTtBQUNBLGFBQUEsRUFBQTtBQUNBLG1CQUFBLEVBQUEsR0FBQTtTQUNBO0FBQ0Esa0JBQUEsRUFBQSxvQkFBQSxNQUFBLEVBQUEsRUFDQTtBQUNBLFlBQUEsRUFBQSxnQkFBQSxFQUVBO0tBQ0EsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7QUNiQSxHQUFBLENBQUEsU0FBQSxDQUFBLGFBQUEsRUFBQSxVQUFBLFlBQUEsRUFBQTtBQUNBLFdBQUE7QUFDQSxnQkFBQSxFQUFBLEdBQUE7QUFDQSxtQkFBQSxFQUFBLHNEQUFBO0FBQ0EsWUFBQSxFQUFBLGNBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQSxLQUFBLEVBQUE7QUFDQSxpQkFBQSxDQUFBLFFBQUEsR0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLHVCQUFBLFlBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7YUFDQSxDQUFBO1NBQ0E7S0FDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBO0FDVkEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLEVBQUEsWUFBQTtBQUNBLFdBQUE7QUFDQSxnQkFBQSxFQUFBLEdBQUE7QUFDQSxtQkFBQSxFQUFBLGlEQUFBO0FBQ0EsYUFBQSxFQUFBO0FBQ0EsaUJBQUEsRUFBQSxHQUFBO0FBQ0EsY0FBQSxFQUFBLEdBQUE7QUFDQSxnQkFBQSxFQUFBLEdBQUE7U0FDQTtBQUNBLGtCQUFBLEVBQUEsZUFBQTs7S0FFQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQUdBLEdBQUEsQ0FBQSxVQUFBLENBQUEsZUFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBO0FBQ0EsV0FBQSxDQUFBLEdBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsS0FBQSxHQUFBLEVBQUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUNuQkEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxlQUFBLEVBQUEsWUFBQTtBQUNBLFdBQUE7QUFDQSxnQkFBQSxFQUFBLEdBQUE7QUFDQSxtQkFBQSxFQUFBLHlEQUFBO0tBQ0EsQ0FBQTtDQUNBLENBQUEsQ0FBQTtBQ0xBLEdBQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxFQUFBLFVBQUEsVUFBQSxFQUFBLFdBQUEsRUFBQSxXQUFBLEVBQUEsTUFBQSxFQUFBOztBQUVBLFdBQUE7QUFDQSxnQkFBQSxFQUFBLEdBQUE7QUFDQSxhQUFBLEVBQUEsRUFBQTtBQUNBLG1CQUFBLEVBQUEseUNBQUE7QUFDQSxZQUFBLEVBQUEsY0FBQSxLQUFBLEVBQUE7O0FBRUEsaUJBQUEsQ0FBQSxLQUFBLEdBQUEsQ0FDQSxFQUFBLEtBQUEsRUFBQSxNQUFBLEVBQUEsS0FBQSxFQUFBLE1BQUEsRUFBQSxFQUNBLEVBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLEVBQ0EsRUFBQSxLQUFBLEVBQUEsZUFBQSxFQUFBLEtBQUEsRUFBQSxNQUFBLEVBQUEsRUFDQSxFQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQSxFQUNBLEVBQUEsS0FBQSxFQUFBLFFBQUEsRUFBQSxLQUFBLEVBQUEsV0FBQSxFQUFBLEVBQ0EsRUFBQSxLQUFBLEVBQUEsY0FBQSxFQUFBLEtBQUEsRUFBQSxhQUFBLEVBQUEsSUFBQSxFQUFBLElBQUEsRUFBQSxDQUNBLENBQUE7O0FBRUEsaUJBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLGlCQUFBLENBQUEsVUFBQSxHQUFBLFlBQUE7QUFDQSx1QkFBQSxXQUFBLENBQUEsZUFBQSxFQUFBLENBQUE7YUFDQSxDQUFBOztBQUVBLGlCQUFBLENBQUEsTUFBQSxHQUFBLFlBQUE7QUFDQSwyQkFBQSxDQUFBLE1BQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxZQUFBO0FBQ0EsMEJBQUEsQ0FBQSxFQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7aUJBQ0EsQ0FBQSxDQUFBO2FBQ0EsQ0FBQTs7QUFFQSxnQkFBQSxPQUFBLEdBQUEsU0FBQSxPQUFBLEdBQUE7QUFDQSwyQkFBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLHlCQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtpQkFDQSxDQUFBLENBQUE7YUFDQSxDQUFBOztBQUVBLGdCQUFBLFVBQUEsR0FBQSxTQUFBLFVBQUEsR0FBQTtBQUNBLHFCQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTthQUNBLENBQUE7O0FBRUEsbUJBQUEsRUFBQSxDQUFBOztBQUVBLHNCQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBLEVBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxzQkFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsQ0FBQSxDQUFBO0FBQ0Esc0JBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLGNBQUEsRUFBQSxVQUFBLENBQUEsQ0FBQTtTQUVBOztLQUVBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FDakRBLEdBQUEsQ0FBQSxTQUFBLENBQUEsWUFBQSxFQUFBLFVBQUEsV0FBQSxFQUFBOztBQUVBLFdBQUE7QUFDQSxnQkFBQSxFQUFBLEdBQUE7QUFDQSxtQkFBQSxFQUFBLG1EQUFBO0FBQ0EsWUFBQSxFQUFBLGNBQUEsS0FBQSxFQUFBO0FBQ0EsaUJBQUEsQ0FBQSxLQUFBLEdBQUEsV0FBQSxDQUFBLGNBQUEsRUFBQSxDQUFBO1NBQ0E7S0FDQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQ1RBLEdBQUEsQ0FBQSxTQUFBLENBQUEsWUFBQSxFQUNBLFVBQUEsU0FBQSxFQUFBOztBQUVBLFdBQUEsVUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLEtBQUEsRUFBQTs7QUFFQSxhQUFBLENBQUEsT0FBQSxHQUFBLENBQUEsTUFBQSxFQUFBLE1BQUEsRUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBOztBQUVBLGlCQUFBLFVBQUEsQ0FBQSxDQUFBLEVBQUE7QUFDQSxnQkFBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBOztBQUVBLG1CQUFBLENBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQTtTQUNBOztBQUVBLGVBQUEsQ0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBO0FBQ0EsZ0JBQUEsR0FBQSxTQUFBLENBQUEsVUFBQSxFQUFBLElBQUEsQ0FBQSxDQUFBOzs7O0FBSUEsZUFBQSxDQUFBLEVBQUEsQ0FBQSxVQUFBLEVBQUEsWUFBQTtBQUNBLHFCQUFBLENBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTtDQUNBLENBQUEsQ0FBQSIsImZpbGUiOiJtYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xud2luZG93LmFwcCA9IGFuZ3VsYXIubW9kdWxlKCdGdWxsc3RhY2tHZW5lcmF0ZWRBcHAnLCBbJ3VpLnJvdXRlcicsICd1aS5ib290c3RyYXAnLCAnZnNhUHJlQnVpbHQnLCAnbmdGaWxlVXBsb2FkJywgJ25nQW5pbWF0ZScsICd0ZXh0QW5ndWxhcicsICd1aUdtYXBnb29nbGUtbWFwcycsICduZ1RhZ3NJbnB1dCcsICdzbGlkZVB1c2hNZW51J10pO1xuXG5hcHAuY29uZmlnKGZ1bmN0aW9uICgkdXJsUm91dGVyUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyKSB7XG4gICAgLy8gVGhpcyB0dXJucyBvZmYgaGFzaGJhbmcgdXJscyAoLyNhYm91dCkgYW5kIGNoYW5nZXMgaXQgdG8gc29tZXRoaW5nIG5vcm1hbCAoL2Fib3V0KVxuICAgICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcbiAgICAvLyBJZiB3ZSBnbyB0byBhIFVSTCB0aGF0IHVpLXJvdXRlciBkb2Vzbid0IGhhdmUgcmVnaXN0ZXJlZCwgZ28gdG8gdGhlIFwiL1wiIHVybC5cbiAgICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvJyk7XG59KVxuLmNvbmZpZyhmdW5jdGlvbih1aUdtYXBHb29nbGVNYXBBcGlQcm92aWRlcikge1xuICAgIHVpR21hcEdvb2dsZU1hcEFwaVByb3ZpZGVyLmNvbmZpZ3VyZSh7XG4gICAgICAgIGtleTogJ0FJemFTeUNBZnlYc2VTWFVEQlFZd2ZwMmlYcnlENUF2QzFKODJPZycsXG4gICAgICAgIHY6ICczLjIwJywgLy9kZWZhdWx0cyB0byBsYXRlc3QgMy5YIGFueWhvd1xuICAgICAgICBsaWJyYXJpZXM6ICd3ZWF0aGVyLGdlb21ldHJ5LHZpc3VhbGl6YXRpb24nXG4gICAgfSk7XG59KVxuXG4vLyBUaGlzIGFwcC5ydW4gaXMgZm9yIGNvbnRyb2xsaW5nIGFjY2VzcyB0byBzcGVjaWZpYyBzdGF0ZXMuXG5hcHAucnVuKGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlKSB7XG5cbiAgICAvLyBUaGUgZ2l2ZW4gc3RhdGUgcmVxdWlyZXMgYW4gYXV0aGVudGljYXRlZCB1c2VyLlxuICAgIHZhciBkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoID0gZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgICAgIHJldHVybiBzdGF0ZS5kYXRhICYmIHN0YXRlLmRhdGEuYXV0aGVudGljYXRlO1xuICAgIH07XG5cbiAgICAvLyAkc3RhdGVDaGFuZ2VTdGFydCBpcyBhbiBldmVudCBmaXJlZFxuICAgIC8vIHdoZW5ldmVyIHRoZSBwcm9jZXNzIG9mIGNoYW5naW5nIGEgc3RhdGUgYmVnaW5zLlxuICAgICRyb290U2NvcGUuJG9uKCckc3RhdGVDaGFuZ2VTdGFydCcsIGZ1bmN0aW9uIChldmVudCwgdG9TdGF0ZSwgdG9QYXJhbXMpIHtcblxuICAgICAgICBpZiAoIWRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGgodG9TdGF0ZSkpIHtcbiAgICAgICAgICAgIC8vIFRoZSBkZXN0aW5hdGlvbiBzdGF0ZSBkb2VzIG5vdCByZXF1aXJlIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpKSB7XG4gICAgICAgICAgICAvLyBUaGUgdXNlciBpcyBhdXRoZW50aWNhdGVkLlxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENhbmNlbCBuYXZpZ2F0aW5nIHRvIG5ldyBzdGF0ZS5cbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAvLyBJZiBhIHVzZXIgaXMgcmV0cmlldmVkLCB0aGVuIHJlbmF2aWdhdGUgdG8gdGhlIGRlc3RpbmF0aW9uXG4gICAgICAgICAgICAvLyAodGhlIHNlY29uZCB0aW1lLCBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSB3aWxsIHdvcmspXG4gICAgICAgICAgICAvLyBvdGhlcndpc2UsIGlmIG5vIHVzZXIgaXMgbG9nZ2VkIGluLCBnbyB0byBcImxvZ2luXCIgc3RhdGUuXG4gICAgICAgICAgICBpZiAodXNlcikge1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbyh0b1N0YXRlLm5hbWUsIHRvUGFyYW1zKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdsb2dpbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgIH0pO1xuXG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAvLyBSZWdpc3RlciBvdXIgKmFib3V0KiBzdGF0ZS5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnYWJvdXQnLCB7XG4gICAgICAgIHVybDogJy9hYm91dCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdBYm91dENvbnRyb2xsZXInLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2Fib3V0L2Fib3V0Lmh0bWwnXG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignQWJvdXRDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSwgRnVsbHN0YWNrUGljcykge1xuXG4gICAgLy8gSW1hZ2VzIG9mIGJlYXV0aWZ1bCBGdWxsc3RhY2sgcGVvcGxlLlxuICAgICRzY29wZS5pbWFnZXMgPSBfLnNodWZmbGUoRnVsbHN0YWNrUGljcyk7XG5cbn0pOyIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2RvY3MnLCB7XG4gICAgICAgIHVybDogJy9kb2NzJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9kb2NzL2RvY3MuaHRtbCdcbiAgICB9KTtcbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbigkc3RhdGVQcm92aWRlcil7XG4gICAkc3RhdGVQcm92aWRlclxuICAgICAgIC5zdGF0ZSgnZXZlbnRMaXN0Jywge1xuICAgICAgICAgICB1cmw6Jy9ldmVudHMnLFxuICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2V2ZW50L2xpc3QuaHRtbCcsXG4gICAgICAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCRzY29wZSwgdWlHbWFwR29vZ2xlTWFwQXBpKXtcbiAgICAgICAgICAgICAgICRzY29wZS5tYXAgPSB7IGNlbnRlcjogeyBsYXRpdHVkZTogNDAuNzczOTU5LCBsb25naXR1ZGU6IC03My45NzA5NDkgfSwgem9vbTogMTQgfTtcbiAgICAgICAgICAgICAgIHVpR21hcEdvb2dsZU1hcEFwaS50aGVuKGZ1bmN0aW9uKG1hcHMpIHt9KTtcbiAgICAgICAgICAgfVxuICAgICAgIH0pXG4gICAgICAgLnN0YXRlKCdldmVudERldGFpbCcsIHtcbiAgICAgICAgICAgdXJsOicvZXZlbnRzL2RldGFpbC86aWQnLFxuICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2V2ZW50L2RldGFpbC5odG1sJyxcbiAgICAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oJHNjb3BlKXtcbiAgICAgICAgICAgICAgICRzY29wZS5wYWdlPVwiZGV0YWlsXCI7XG4gICAgICAgICAgIH1cbiAgICAgICB9KVxuICAgICAgIC5zdGF0ZSgnZXZlbnRDcmVhdGUnLCB7XG4gICAgICAgICAgIHVybDonL2V2ZW50cy9jcmVhdGUnLFxuICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2V2ZW50L2NyZWF0ZS5odG1sJyxcbiAgICAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oJHNjb3BlKXtcbiAgICAgICAgICAgICAgICRzY29wZS5jcmVhdGUgPSBmdW5jdGlvbihwYXJhKSB7XG4gICAgICAgICAgICAgICAgICAgIGFsZXJ0KHBhcmEpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgIH1cbiAgICAgICB9KVxuICAgICAgIC5zdGF0ZSgnZXZlbnRVcGRhdGUnLCB7XG4gICAgICAgICAgIHVybDonL2V2ZW50cy91cGRhdGUvOmlkJyxcbiAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9ldmVudC91cGRhdGUuaHRtbCcsXG4gICAgICAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCRzY29wZSl7XG4gICAgICAgICAgICAgICAkc2NvcGUudXBkYXRlID0gZnVuY3Rpb24ocGFyYSkge1xuICAgICAgICAgICAgICAgICAgICBhbGVydChwYXJhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgIH1cbiAgICAgICB9KTtcbn0pO1xuIiwiKGZ1bmN0aW9uICgpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8vIEhvcGUgeW91IGRpZG4ndCBmb3JnZXQgQW5ndWxhciEgRHVoLWRveS5cbiAgICBpZiAoIXdpbmRvdy5hbmd1bGFyKSB0aHJvdyBuZXcgRXJyb3IoJ0kgY2FuXFwndCBmaW5kIEFuZ3VsYXIhJyk7XG5cbiAgICB2YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoJ2ZzYVByZUJ1aWx0JywgW10pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ1NvY2tldCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCF3aW5kb3cuaW8pIHRocm93IG5ldyBFcnJvcignc29ja2V0LmlvIG5vdCBmb3VuZCEnKTtcbiAgICAgICAgcmV0dXJuIHdpbmRvdy5pbyh3aW5kb3cubG9jYXRpb24ub3JpZ2luKTtcbiAgICB9KTtcblxuICAgIC8vIEFVVEhfRVZFTlRTIGlzIHVzZWQgdGhyb3VnaG91dCBvdXIgYXBwIHRvXG4gICAgLy8gYnJvYWRjYXN0IGFuZCBsaXN0ZW4gZnJvbSBhbmQgdG8gdGhlICRyb290U2NvcGVcbiAgICAvLyBmb3IgaW1wb3J0YW50IGV2ZW50cyBhYm91dCBhdXRoZW50aWNhdGlvbiBmbG93LlxuICAgIGFwcC5jb25zdGFudCgnQVVUSF9FVkVOVFMnLCB7XG4gICAgICAgIGxvZ2luU3VjY2VzczogJ2F1dGgtbG9naW4tc3VjY2VzcycsXG4gICAgICAgIGxvZ2luRmFpbGVkOiAnYXV0aC1sb2dpbi1mYWlsZWQnLFxuICAgICAgICBsb2dvdXRTdWNjZXNzOiAnYXV0aC1sb2dvdXQtc3VjY2VzcycsXG4gICAgICAgIHNlc3Npb25UaW1lb3V0OiAnYXV0aC1zZXNzaW9uLXRpbWVvdXQnLFxuICAgICAgICBub3RBdXRoZW50aWNhdGVkOiAnYXV0aC1ub3QtYXV0aGVudGljYXRlZCcsXG4gICAgICAgIG5vdEF1dGhvcml6ZWQ6ICdhdXRoLW5vdC1hdXRob3JpemVkJ1xuICAgIH0pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ0F1dGhJbnRlcmNlcHRvcicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkcSwgQVVUSF9FVkVOVFMpIHtcbiAgICAgICAgdmFyIHN0YXR1c0RpY3QgPSB7XG4gICAgICAgICAgICA0MDE6IEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsXG4gICAgICAgICAgICA0MDM6IEFVVEhfRVZFTlRTLm5vdEF1dGhvcml6ZWQsXG4gICAgICAgICAgICA0MTk6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LFxuICAgICAgICAgICAgNDQwOiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dFxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzcG9uc2VFcnJvcjogZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KHN0YXR1c0RpY3RbcmVzcG9uc2Uuc3RhdHVzXSwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UpXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG5cbiAgICBhcHAuY29uZmlnKGZ1bmN0aW9uICgkaHR0cFByb3ZpZGVyKSB7XG4gICAgICAgICRodHRwUHJvdmlkZXIuaW50ZXJjZXB0b3JzLnB1c2goW1xuICAgICAgICAgICAgJyRpbmplY3RvcicsXG4gICAgICAgICAgICBmdW5jdGlvbiAoJGluamVjdG9yKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRpbmplY3Rvci5nZXQoJ0F1dGhJbnRlcmNlcHRvcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICBdKTtcbiAgICB9KTtcblxuICAgIGFwcC5zZXJ2aWNlKCdBdXRoU2VydmljZScsIGZ1bmN0aW9uICgkaHR0cCwgU2Vzc2lvbiwgJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMsICRxKSB7XG5cbiAgICAgICAgZnVuY3Rpb24gb25TdWNjZXNzZnVsTG9naW4ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIHZhciBkYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgIFNlc3Npb24uY3JlYXRlKGRhdGEuaWQsIGRhdGEudXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzKTtcbiAgICAgICAgICAgIHJldHVybiBkYXRhLnVzZXI7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVc2VzIHRoZSBzZXNzaW9uIGZhY3RvcnkgdG8gc2VlIGlmIGFuXG4gICAgICAgIC8vIGF1dGhlbnRpY2F0ZWQgdXNlciBpcyBjdXJyZW50bHkgcmVnaXN0ZXJlZC5cbiAgICAgICAgdGhpcy5pc0F1dGhlbnRpY2F0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gISFTZXNzaW9uLnVzZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5nZXRMb2dnZWRJblVzZXIgPSBmdW5jdGlvbiAoZnJvbVNlcnZlcikge1xuXG4gICAgICAgICAgICAvLyBJZiBhbiBhdXRoZW50aWNhdGVkIHNlc3Npb24gZXhpc3RzLCB3ZVxuICAgICAgICAgICAgLy8gcmV0dXJuIHRoZSB1c2VyIGF0dGFjaGVkIHRvIHRoYXQgc2Vzc2lvblxuICAgICAgICAgICAgLy8gd2l0aCBhIHByb21pc2UuIFRoaXMgZW5zdXJlcyB0aGF0IHdlIGNhblxuICAgICAgICAgICAgLy8gYWx3YXlzIGludGVyZmFjZSB3aXRoIHRoaXMgbWV0aG9kIGFzeW5jaHJvbm91c2x5LlxuXG4gICAgICAgICAgICAvLyBPcHRpb25hbGx5LCBpZiB0cnVlIGlzIGdpdmVuIGFzIHRoZSBmcm9tU2VydmVyIHBhcmFtZXRlcixcbiAgICAgICAgICAgIC8vIHRoZW4gdGhpcyBjYWNoZWQgdmFsdWUgd2lsbCBub3QgYmUgdXNlZC5cblxuICAgICAgICAgICAgaWYgKHRoaXMuaXNBdXRoZW50aWNhdGVkKCkgJiYgZnJvbVNlcnZlciAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAkcS53aGVuKFNlc3Npb24udXNlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE1ha2UgcmVxdWVzdCBHRVQgL3Nlc3Npb24uXG4gICAgICAgICAgICAvLyBJZiBpdCByZXR1cm5zIGEgdXNlciwgY2FsbCBvblN1Y2Nlc3NmdWxMb2dpbiB3aXRoIHRoZSByZXNwb25zZS5cbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSA0MDEgcmVzcG9uc2UsIHdlIGNhdGNoIGl0IGFuZCBpbnN0ZWFkIHJlc29sdmUgdG8gbnVsbC5cbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9zZXNzaW9uJykudGhlbihvblN1Y2Nlc3NmdWxMb2dpbikuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmxvZ2luID0gZnVuY3Rpb24gKGNyZWRlbnRpYWxzKSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2xvZ2luJywgY3JlZGVudGlhbHMpXG4gICAgICAgICAgICAgICAgLnRoZW4ob25TdWNjZXNzZnVsTG9naW4pXG4gICAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdCh7IG1lc3NhZ2U6ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLicgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvbG9nb3V0JykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgU2Vzc2lvbi5kZXN0cm95KCk7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICB9KTtcblxuICAgIGFwcC5zZXJ2aWNlKCdTZXNzaW9uJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEFVVEhfRVZFTlRTKSB7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuaWQgPSBudWxsO1xuICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuXG4gICAgICAgIHRoaXMuY3JlYXRlID0gZnVuY3Rpb24gKHNlc3Npb25JZCwgdXNlcikge1xuICAgICAgICAgICAgdGhpcy5pZCA9IHNlc3Npb25JZDtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IHVzZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5pZCA9IG51bGw7XG4gICAgICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuICAgICAgICB9O1xuXG4gICAgfSk7XG5cbn0pKCk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2xvZ2luJywge1xuICAgICAgICB1cmw6ICcvbG9naW4nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2xvZ2luL2xvZ2luLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnTG9naW5DdHJsJ1xuICAgIH0pO1xuXG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ0xvZ2luQ3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcblxuICAgICRzY29wZS5sb2dpbiA9IHt9O1xuICAgICRzY29wZS5lcnJvciA9IG51bGw7XG5cbiAgICAkc2NvcGUuc2VuZExvZ2luID0gZnVuY3Rpb24gKGxvZ2luSW5mbykge1xuXG4gICAgICAgICRzY29wZS5lcnJvciA9IG51bGw7XG5cbiAgICAgICAgQXV0aFNlcnZpY2UubG9naW4obG9naW5JbmZvKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IgPSAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nO1xuICAgICAgICB9KTtcblxuICAgIH07XG5cbiAgICAkc2NvcGUuc2VuZFNpZ251cCA9IGZ1bmN0aW9uKHNpZ251cEluZm8pe1xuICAgICAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuICAgICAgICBjb25zb2xlLmxvZyhzaWdudXBJbmZvKTtcbiAgICB9XG5cbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdtZW1iZXJzT25seScsIHtcbiAgICAgICAgdXJsOiAnL21lbWJlcnMtYXJlYScsXG4gICAgICAgIHRlbXBsYXRlOiAnPGltZyBuZy1yZXBlYXQ9XCJpdGVtIGluIHN0YXNoXCIgd2lkdGg9XCIzMDBcIiBuZy1zcmM9XCJ7eyBpdGVtIH19XCIgLz4nLFxuICAgICAgICBjb250cm9sbGVyOiBmdW5jdGlvbiAoJHNjb3BlLCBTZWNyZXRTdGFzaCkge1xuICAgICAgICAgICAgU2VjcmV0U3Rhc2guZ2V0U3Rhc2goKS50aGVuKGZ1bmN0aW9uIChzdGFzaCkge1xuICAgICAgICAgICAgICAgICRzY29wZS5zdGFzaCA9IHN0YXNoO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIC8vIFRoZSBmb2xsb3dpbmcgZGF0YS5hdXRoZW50aWNhdGUgaXMgcmVhZCBieSBhbiBldmVudCBsaXN0ZW5lclxuICAgICAgICAvLyB0aGF0IGNvbnRyb2xzIGFjY2VzcyB0byB0aGlzIHN0YXRlLiBSZWZlciB0byBhcHAuanMuXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgIGF1dGhlbnRpY2F0ZTogdHJ1ZVxuICAgICAgICB9XG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuZmFjdG9yeSgnU2VjcmV0U3Rhc2gnLCBmdW5jdGlvbiAoJGh0dHApIHtcblxuICAgIHZhciBnZXRTdGFzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2FwaS9tZW1iZXJzL3NlY3JldC1zdGFzaCcpLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIGdldFN0YXNoOiBnZXRTdGFzaFxuICAgIH07XG5cbn0pOyIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2hvbWUnLCB7XG4gICAgICAgIHVybDogJy8nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2hvbWUvaG9tZS5odG1sJyxcbiAgICAgIFxuICAgIH0pO1xufSk7IiwiYXBwLmNvbmZpZyhmdW5jdGlvbigkc3RhdGVQcm92aWRlcil7XG4gICAkc3RhdGVQcm92aWRlclxuICAgICAgIC5zdGF0ZSgndXNlcnMnLCB7XG4gICAgICAgICAgIHVybDogJy91c2VycycsXG4gICAgICAgICAgIHRlbXBsYXRlVXJsOiAnanMvdXNlci9saXN0Lmh0bWwnLFxuICAgICAgICAgICBjb250cm9sbGVyOiBmdW5jdGlvbigkc2NvcGUpe1xuXG4gICAgICAgICAgIH1cbiAgICAgICB9KVxuICAgICAgIC5zdGF0ZSgndXNlckRldGFpbCcsIHtcbiAgICAgICAgICAgdXJsOiAnL3VzZXJzL2RldGFpbC86aWQnLFxuICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3VzZXIvcHJvZmlsZS5odG1sJyxcbiAgICAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oJHNjb3BlKXtcbiAgICAgICAgICAgICAgICAkc2NvcGUudXNlciA9e1xuICAgICAgICAgICAgICAgICAgICB1c2VyTmFtZTogJ1N0ZXdlZScsXG4gICAgICAgICAgICAgICAgICAgIGZpcnN0TmFtZTogJ1N0ZXdhcnQnLFxuICAgICAgICAgICAgICAgICAgICBsYXN0TmFtZTogJ0dyaWZmaW4nLFxuICAgICAgICAgICAgICAgICAgICBiaXJ0aDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF5OiAnMTUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgbW9udGg6ICcwNicsXG4gICAgICAgICAgICAgICAgICAgICAgICB5ZWFyOiAnMjAxMCdcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgbW90dG86ICdMaXR0bGUgQXNzaG9sZCcsXG4gICAgICAgICAgICAgICAgICAgIGFkZHJlc3M6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFkZHJlc3MxOiAnMzIxIGJyb2Fkd2F5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGFkZHJlc3MyOiAnYXB0IDRjJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNpdHk6ICduZXcgeW9yaycsXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZTogJ05ZJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50cnk6ICdVU0EnXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGFib3V0OiAnTG9yZW0gSXBzdW0gaXMgc2ltcGx5IGR1bW15IHRleHQgb2YgdGhlIHByaW50aW5nIGFuZCB0eXBlc2V0dGluZyBpbmR1c3RyeS4gTG9yZW0gSXBzdW0gaGFzIGJlZW4gdGhlIGluZHVzdHJ5XFwncyBzdGFuZGFyZCBkdW1teSB0ZXh0IGV2ZXIgc2luY2UgdGhlIDE1MDBzLCB3aGVuIGFuIHVua25vd24gcHJpbnRlciB0b29rIGEgZ2FsbGV5IG9mIHR5cGUgYW5kIHNjcmFtYmxlZCBpdCB0byBtYWtlIGEgdHlwZSBzcGVjaW1lbiBib29rLiBJdCBoYXMgc3Vydml2ZWQgbm90IG9ubHkgZml2ZSBjZW50dXJpZXMsIGJ1dCBhbHNvIHRoZSBsZWFwIGludG8gZWxlY3Ryb25pYyB0eXBlc2V0dGluZywgcmVtYWluaW5nIGVzc2VudGlhbGx5IHVuY2hhbmdlZC4gSXQgd2FzIHBvcHVsYXJpc2VkIGluIHRoZSAxOTYwcyB3aXRoIHRoZSByZWxlYXNlIG9mIExldHJhc2V0IHNoZWV0cyBjb250YWluaW5nIExvcmVtIElwc3VtIHBhc3NhZ2VzLCBhbmQgbW9yZSByZWNlbnRseSB3aXRoIGRlc2t0b3AgcHVibGlzaGluZyBzb2Z0d2FyZSBsaWtlIEFsZHVzIFBhZ2VNYWtlciBpbmNsdWRpbmcgdmVyc2lvbnMgb2YgTG9yZW0gSXBzdW0uJyxcbiAgICAgICAgICAgICAgICAgICAgZm9sbG93aW5nOiBbXVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgIH1cbiAgICAgICB9KVxuICAgICAgIC5zdGF0ZSgndXNlckVkaXQnLCB7XG4gICAgICAgICAgIHVybDogJy91c2Vycy9lZGl0LzppZCcsXG4gICAgICAgICAgIHRlbXBsYXRlVXJsOiAnanMvdXNlci9lZGl0Lmh0bWwnLFxuICAgICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgICAgICAgdXNlcjogZnVuY3Rpb24oJHN0YXRlUGFyYW1zLCBVc2VyRmFjdG9yeSl7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCRzdGF0ZVBhcmFtcy5pZCk7XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFVzZXJGYWN0b3J5LmdldFVzZXJCeUlkKCRzdGF0ZVBhcmFtcy5pZCk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzdGF0ZXM6IGZ1bmN0aW9uKFV0aWxzKXtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFV0aWxzLmdldFN0YXRlcygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgfSxcbiAgICAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oJHNjb3BlLCB1c2VyLCBzdGF0ZXMpe1xuICAgICAgICAgICAgICAgICRzY29wZS51c2VyID0gdXNlcjtcbiAgICAgICAgICAgICAgICAkc2NvcGUuYWxsU3RhdGVzID0gc3RhdGVzO1xuICAgICAgICAgICAgICAgICRzY29wZS5zZXRTdGF0ZSA9IGZ1bmN0aW9uKHN0YXRlKXtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnVzZXIuYWRkcmVzcy5zdGF0ZSA9IHN0YXRlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgfVxuICAgICAgIH0pO1xufSk7XG4iLCJhcHAuZmFjdG9yeSgnRXZlbnRGYWN0b3J5JywgZnVuY3Rpb24oKXtcblx0dmFyIGRlZmF1bHRJbWFnZXMgPSB7XG5cdFx0YmFza2V0YmFsbDogJ2h0dHA6Ly9kZXNpZ255b3V0cnVzdC5jb20vd3AtY29udGVudC91cGxvYWRzLzIwMTQvMDEvVGhpc19HYW1lX1dlX1BsYXlfTllDX0Jhc2tldGJhbGxfQ291cnRzX2J5X0ZyYW5jay1fQm9oYm90XzIwMTRfMDMuanBnJyxcblx0XHRjbGltYmluZzogJ2h0dHA6Ly93d3cuZ2xhcHBpdG5vdmEuY29tL3dwLWNvbnRlbnQvdXBsb2Fkcy8yMDE1LzA3L0JLQkNoaWNhZ28tU291dGgtQnVpbGRpbmctQ2xpbWJpbmctV2FsbC5qcGcnLFxuXHRcdHNvY2NlcjogJ2h0dHA6Ly93d3czLnBpY3R1cmVzLnppbWJpby5jb20vZ2kvTmV3K1lvcmsrUmVkK0J1bGxzK01heW9yK0Jsb29tYmVyZytPcGVuK05ldytGOVpvMldvUDdnLWwuanBnJyxcblx0XHRiYXNlYmFsbDogJ2h0dHA6Ly93d3cuc3VpdGNhc2VnZXRhd2F5cy5jb20vd3AtY29udGVudC91cGxvYWRzLzIwMTQvMDgvTllDLUNlbnRyYWwtUGFyay1IZWNrc2NoZXItQmFsbEZpZWxkcy1Tb3V0aC1FbmQtOTI5Ni0xNC0xMDMweDY4Ni5qcGcnLFxuIFx0XHRmb290YmFsbDogJ2h0dHA6Ly93d3cucHNhbC5vcmcvaW1hZ2VzL0FydGljbGVzLzIwMTUvMjAxNTA3MjMxMDU5MDM1OTA4LmpwZycsXG4gXHRcdGxpZnRpbmc6ICdodHRwczovL2VuY3J5cHRlZC10Ym4wLmdzdGF0aWMuY29tL2ltYWdlcz9xPXRibjpBTmQ5R2NSRTY1UUFJblhwSEp1VW1DWjM3WGxmNVJzeEp0d2VxV0F1ZXdNVU1rZGg0eS12NnNONVc1RE5CSWcnLFxuXHRcdHNraWluZzogJ2h0dHA6Ly93d3cuaG9tZS1odW50cy5uZXQvd3AtY29udGVudC91cGxvYWRzLzIwMTUvMDEvQ2F1dGVyZXRzLXNraWluZy5qcGcnLFxuXHRcdG1vdW50YWluYmlraW5nOiAnaHR0cDovL2Zpbm5vaGFyYS5jb20vYmxvZy93cC1jb250ZW50L3VwbG9hZHMvMDAwMF9GT19BVEhMRVRFU185NjFfMWNfUkdCLmpwZycsXG5cdFx0c3VyZmluZzogJ2h0dHBzOi8vZW5jcnlwdGVkLXRibjMuZ3N0YXRpYy5jb20vaW1hZ2VzP3E9dGJuOkFOZDlHY1JjeFNJSG9iTHZnWE1neTZnMHUxeVhqcTl0SDdlY09MMDNWQ1ZJaG1mLTVfazl2RUpDJyxcblx0XHRjeWNsaW5nOiAnaHR0cDovL3d3dy5tc25iYy5jb20vc2l0ZXMvbXNuYmMvZmlsZXMvMjAxMy8wNS9hcDAyMDUwNTAyMjU3XzEuanBnJ1xuXHR9XG5cblx0cmV0dXJuIHtcblx0XHRnZXRVcmw6IGZ1bmN0aW9uKHR5cGUpIHtcblx0XHRcdHJldHVybiBkZWZhdWx0SW1hZ2VzW3R5cGVdO1xuXHRcdH1cblx0fVxufSkiLCJhcHAuZmFjdG9yeSgnRnVsbHN0YWNrUGljcycsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW1xuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I3Z0JYdWxDQUFBWFFjRS5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9mYmNkbi1zcGhvdG9zLWMtYS5ha2FtYWloZC5uZXQvaHBob3Rvcy1hay14YXAxL3QzMS4wLTgvMTA4NjI0NTFfMTAyMDU2MjI5OTAzNTkyNDFfODAyNzE2ODg0MzMxMjg0MTEzN19vLmpwZycsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQi1MS1VzaElnQUV5OVNLLmpwZycsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjc5LVg3b0NNQUFrdzd5LmpwZycsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQi1VajlDT0lJQUlGQWgwLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjZ5SXlGaUNFQUFxbDEyLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0UtVDc1bFdBQUFtcXFKLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0V2WkFnLVZBQUFrOTMyLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0VnTk1lT1hJQUlmRGhLLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0VReUlETldnQUF1NjBCLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0NGM1Q1UVc4QUUybEdKLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0FlVnc1U1dvQUFBTHNqLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0FhSklQN1VrQUFsSUdzLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0FRT3c5bFdFQUFZOUZsLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQi1PUWJWckNNQUFOd0lNLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjliX2Vyd0NZQUF3UmNKLnBuZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjVQVGR2bkNjQUVBbDR4LmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjRxd0MwaUNZQUFsUEdoLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjJiMzN2UklVQUE5bzFELmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQndwSXdyMUlVQUF2TzJfLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQnNTc2VBTkNZQUVPaEx3LmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0o0dkxmdVV3QUFkYTRMLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0k3d3pqRVZFQUFPUHBTLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0lkSHZUMlVzQUFubkhWLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0dDaVBfWVdZQUFvNzVWLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0lTNEpQSVdJQUkzN3F1LmpwZzpsYXJnZSdcbiAgICBdO1xufSk7XG4iLCJhcHAuZmFjdG9yeSgnT25lRXZlbnQnLCBmdW5jdGlvbiAoKSB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBuYW1lOiBcInNrYXRpbmdcIixcbiAgICAgICAgdGFnczpcImljZVwiLFxuICAgICAgICBudW1PZlBlb3BsZToyLFxuICAgICAgICBkYXRlOlwiMTEvMjMvMjAxNVwiLFxuICAgICAgICB0aW1lOlwiNzowMFwiLFxuICAgICAgICBmZWVQZXJQZXJzb246NSxcbiAgICAgICAgbG9jYXRpb246XCJjZW50cmFsIFBhcmtcIixcbiAgICAgICAgZGVzY3JpcHRpb246IFwiTmljZSBwbGFjZVwiXG4gICAgfTtcblxufSk7XG4iLCJhcHAuZmFjdG9yeSgnUmFuZG9tTW90dG8nLCBmdW5jdGlvbiAoKSB7XG5cbiAgICB2YXIgZ2V0UmFuZG9tRnJvbUFycmF5ID0gZnVuY3Rpb24gKGFycikge1xuICAgICAgICByZXR1cm4gYXJyW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGFyci5sZW5ndGgpXTtcbiAgICB9O1xuXG4gICAgdmFyIG1vdHRvID0gW1xuICAgICAgICAnU3BvcnQgdXAhJyxcbiAgICAgICAgJ3RlYW13b3JrIG1ha2VzIHRoZSBkcmVhbSB3b3JrJyxcbiAgICAgICAgJ0hlbGxvLCBzaW1wbGUgaHVtYW4uJyxcbiAgICAgICAgJ1doYXQgYSBiZWF1dGlmdWwgZGF5IUxldFxcJ3Mgd29yayBvdXQhJyxcbiAgICAgICAgJ+eUn+WRveWcqOS6jui/kOWKqCcsXG4gICAgICAgICdMaWZlIGlzIHNob3J0LCBQbGF5IEhhcmQhJyxcbiAgICAgICAgJ1RvZ2V0aGVyIEV2ZXJ5b25lIEFjaGlldmVzIE1vcmUuJyxcbiAgICAgICAgJ1VuaXRlZCB3ZSBwbGF5LiBVbml0ZWQgd2Ugd2luLicsXG4gICAgICAgICdZb3UgbWF5IGJlIHN0cm9uZywgYnV0IHdlIGFyZSBzdHJvbmdlci4nXG4gICAgXTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIG1vdHRvOiBtb3R0byxcbiAgICAgICAgZ2V0UmFuZG9tTW90dG86IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBnZXRSYW5kb21Gcm9tQXJyYXkobW90dG8pO1xuICAgICAgICB9XG4gICAgfTtcblxufSk7XG4iLCJhcHAuZmFjdG9yeSgnVXNlckZhY3RvcnknLCBmdW5jdGlvbigpe1xuXG5cbiAgICB2YXIgdXNlcnMgPSBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIHVzZXJOYW1lOiAnU3Rld2VlJyxcbiAgICAgICAgICAgIGZpcnN0TmFtZTogJ1N0ZXdhcnQnLFxuICAgICAgICAgICAgbGFzdE5hbWU6ICdHcmlmZmluJyxcbiAgICAgICAgICAgIGdlbmRlcjogJ00nLFxuICAgICAgICAgICAgZW1haWw6ICdtaW5namllQGZzYS5jb20nLFxuICAgICAgICAgICAgYmlydGg6IHtcbiAgICAgICAgICAgICAgICBkYXk6ICcxNScsXG4gICAgICAgICAgICAgICAgbW9udGg6ICcwNicsXG4gICAgICAgICAgICAgICAgeWVhcjogJzIwMTAnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbW90dG86ICdMaXR0bGUgQXNzaG9sZCcsXG4gICAgICAgICAgICBhZGRyZXNzOiB7XG4gICAgICAgICAgICAgICAgYWRkcmVzczE6ICczMjEgYnJvYWR3YXknLFxuICAgICAgICAgICAgICAgIGFkZHJlc3MyOiAnYXB0IDRjJyxcbiAgICAgICAgICAgICAgICBjaXR5OiAnbmV3IHlvcmsnLFxuICAgICAgICAgICAgICAgIHN0YXRlOiAnTlknLFxuICAgICAgICAgICAgICAgIHppcDogJzExMjI5J1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGxpbmtzOiBbXSxcbiAgICAgICAgICAgIGltYWdlOiAnJyxcbiAgICAgICAgICAgIGFib3V0OiAnTG9yZW0gSXBzdW0gaXMgc2ltcGx5IGR1bW15IHRleHQgb2YgdGhlIHByaW50aW5nIGFuZCB0eXBlc2V0dGluZyBpbmR1c3RyeS4gTG9yZW0gSXBzdW0gaGFzIGJlZW4gdGhlIGluZHVzdHJ5XFwncyBzdGFuZGFyZCBkdW1teSB0ZXh0IGV2ZXIgc2luY2UgdGhlIDE1MDBzLCB3aGVuIGFuIHVua25vd24gcHJpbnRlciB0b29rIGEgZ2FsbGV5IG9mIHR5cGUgYW5kIHNjcmFtYmxlZCBpdCB0byBtYWtlIGEgdHlwZSBzcGVjaW1lbiBib29rLiBJdCBoYXMgc3Vydml2ZWQgbm90IG9ubHkgZml2ZSBjZW50dXJpZXMsIGJ1dCBhbHNvIHRoZSBsZWFwIGludG8gZWxlY3Ryb25pYyB0eXBlc2V0dGluZywgcmVtYWluaW5nIGVzc2VudGlhbGx5IHVuY2hhbmdlZC4gSXQgd2FzIHBvcHVsYXJpc2VkIGluIHRoZSAxOTYwcyB3aXRoIHRoZSByZWxlYXNlIG9mIExldHJhc2V0IHNoZWV0cyBjb250YWluaW5nIExvcmVtIElwc3VtIHBhc3NhZ2VzLCBhbmQgbW9yZSByZWNlbnRseSB3aXRoIGRlc2t0b3AgcHVibGlzaGluZyBzb2Z0d2FyZSBsaWtlIEFsZHVzIFBhZ2VNYWtlciBpbmNsdWRpbmcgdmVyc2lvbnMgb2YgTG9yZW0gSXBzdW0uJ1xuICAgICAgICB9XG4gICAgXTtcbiAgICBmdW5jdGlvbiBnZXRVc2VycygpIHtcbiAgICAgICAgcmV0dXJuIHVzZXJzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFVzZXJCeUlkKGlkKXtcbiAgICAgICAgcmV0dXJuIHVzZXJzWzBdO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIGdldFVzZXJzOiBnZXRVc2VycyxcbiAgICAgICAgZ2V0VXNlckJ5SWQ6IGdldFVzZXJCeUlkXG4gICAgfVxuXG59KTtcbiIsImFwcC5mYWN0b3J5KCdVdGlscycsIGZ1bmN0aW9uKCl7XG5cbiAgICB2YXIgc3RhdGVfaGFzaCA9ICBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkFsYWJhbWFcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiQUxcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJBbGFza2FcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiQUtcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJBbWVyaWNhbiBTYW1vYVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJBU1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkFyaXpvbmFcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiQVpcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJBcmthbnNhc1wiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJBUlwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkNhbGlmb3JuaWFcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiQ0FcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJDb2xvcmFkb1wiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJDT1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkNvbm5lY3RpY3V0XCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIkNUXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiRGVsYXdhcmVcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiREVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJEaXN0cmljdCBPZiBDb2x1bWJpYVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJEQ1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkZlZGVyYXRlZCBTdGF0ZXMgT2YgTWljcm9uZXNpYVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJGTVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkZsb3JpZGFcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiRkxcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJHZW9yZ2lhXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIkdBXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiR3VhbVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJHVVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkhhd2FpaVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJISVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIklkYWhvXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIklEXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiSWxsaW5vaXNcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiSUxcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJJbmRpYW5hXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIklOXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiSW93YVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJJQVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkthbnNhc1wiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJLU1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIktlbnR1Y2t5XCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIktZXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiTG91aXNpYW5hXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIkxBXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiTWFpbmVcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiTUVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJNYXJzaGFsbCBJc2xhbmRzXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIk1IXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiTWFyeWxhbmRcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiTURcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJNYXNzYWNodXNldHRzXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIk1BXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiTWljaGlnYW5cIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiTUlcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJNaW5uZXNvdGFcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiTU5cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJNaXNzaXNzaXBwaVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJNU1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIk1pc3NvdXJpXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIk1PXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiTW9udGFuYVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJNVFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIk5lYnJhc2thXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIk5FXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiTmV2YWRhXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIk5WXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiTmV3IEhhbXBzaGlyZVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJOSFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIk5ldyBKZXJzZXlcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiTkpcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJOZXcgTWV4aWNvXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIk5NXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiTmV3IFlvcmtcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiTllcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJOb3J0aCBDYXJvbGluYVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJOQ1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIk5vcnRoIERha290YVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJORFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIk5vcnRoZXJuIE1hcmlhbmEgSXNsYW5kc1wiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJNUFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIk9oaW9cIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiT0hcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJPa2xhaG9tYVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJPS1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIk9yZWdvblwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJPUlwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIlBhbGF1XCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIlBXXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiUGVubnN5bHZhbmlhXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIlBBXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiUHVlcnRvIFJpY29cIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiUFJcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJSaG9kZSBJc2xhbmRcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiUklcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJTb3V0aCBDYXJvbGluYVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJTQ1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIlNvdXRoIERha290YVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJTRFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIlRlbm5lc3NlZVwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJUTlwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIlRleGFzXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIlRYXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiVXRhaFwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJVVFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIlZlcm1vbnRcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiVlRcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJWaXJnaW4gSXNsYW5kc1wiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJWSVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIlZpcmdpbmlhXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIlZBXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiV2FzaGluZ3RvblwiLFxuICAgICAgICAgICAgXCJhYmJyZXZpYXRpb25cIjogXCJXQVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIldlc3QgVmlyZ2luaWFcIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiV1ZcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJXaXNjb25zaW5cIixcbiAgICAgICAgICAgIFwiYWJicmV2aWF0aW9uXCI6IFwiV0lcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJXeW9taW5nXCIsXG4gICAgICAgICAgICBcImFiYnJldmlhdGlvblwiOiBcIldZXCJcbiAgICAgICAgfVxuICAgIF07XG5cbiAgICBmdW5jdGlvbiBnZXRTdGF0ZXMoKXtcbiAgICAgICAgcmV0dXJuIHN0YXRlX2hhc2g7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZ2V0U3RhdGVzOiBnZXRTdGF0ZXNcbiAgICB9XG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ2VkaXRvcicsIGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9lZGl0b3IvZWRpdG9yLmh0bWwnLFxuICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgY29udGVudDogJz0nXG4gICAgICAgIH0sXG4gICAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCRzY29wZSl7XG4gICAgICAgIH0sXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKCl7XG5cbiAgICAgICAgfVxuICAgIH07XG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ2V2ZW50RGV0YWlsJywgZnVuY3Rpb24oRXZlbnRGYWN0b3J5KSB7XG5cdHJldHVybiB7XG5cdFx0cmVzdHJpY3Q6ICdFJyxcblx0XHR0ZW1wbGF0ZVVybDogJy9qcy9jb21tb24vZGlyZWN0aXZlcy9ldmVudC1kZXRhaWwvZXZlbnQtZGV0YWlsLmh0bWwnLCBcblx0XHRsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMpe1xuXHRcdFx0c2NvcGUuZ2V0SW1hZ2UgPSBmdW5jdGlvbih0eXBlKSB7XG5cdFx0XHRcdHJldHVybiBFdmVudEZhY3RvcnkuZ2V0VXJsKHR5cGUpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufSk7IiwiYXBwLmRpcmVjdGl2ZSgnZXZlbnRGb3JtJyxmdW5jdGlvbigpe1xuXHRyZXR1cm4ge1xuXHRcdHJlc3RyaWN0OidFJyxcblx0XHR0ZW1wbGF0ZVVybDonanMvY29tbW9uL2RpcmVjdGl2ZXMvZXZlbnQtZm9ybS9ldmVudC1mb3JtLmh0bWwnLFxuXHRcdHNjb3BlOntcblx0XHRcdGV2ZW50OlwiPVwiLFxuXHRcdFx0Zm46XCImXCIsXG5cdFx0XHR0eXBlOidAJ1xuXHRcdH0sXG5cdFx0Y29udHJvbGxlcjonZXZlbnRGb3JtQ3RybCdcblxuXHR9O1xufSk7XG5cblxuYXBwLmNvbnRyb2xsZXIoJ2V2ZW50Rm9ybUN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlKSB7XG5cdGNvbnNvbGUubG9nKCRzY29wZS50eXBlKTtcbiAgICAkc2NvcGUuZXZlbnQgPSB7fTtcblxufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCdmdWxsc3RhY2tMb2dvJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uaHRtbCdcbiAgICB9O1xufSk7IiwiYXBwLmRpcmVjdGl2ZSgnbmF2YmFyJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCBBVVRIX0VWRU5UUywgJHN0YXRlKSB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICBzY29wZToge30sXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5odG1sJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlKSB7XG5cbiAgICAgICAgICAgIHNjb3BlLml0ZW1zID0gW1xuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdIb21lJywgc3RhdGU6ICdob21lJyB9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdBYm91dCcsIHN0YXRlOiAnYWJvdXQnIH0sXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ0RvY3VtZW50YXRpb24nLCBzdGF0ZTogJ2RvY3MnIH0sXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ1VzZXJzJywgc3RhdGU6ICd1c2Vycyd9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdFdmVudHMnLCBzdGF0ZTogJ2V2ZW50TGlzdCd9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdNZW1iZXJzIE9ubHknLCBzdGF0ZTogJ21lbWJlcnNPbmx5JywgYXV0aDogdHJ1ZSB9XG4gICAgICAgICAgICBdO1xuXG4gICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcblxuICAgICAgICAgICAgc2NvcGUuaXNMb2dnZWRJbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzY29wZS5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UubG9nb3V0KCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdob21lJyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgc2V0VXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnVzZXIgPSB1c2VyO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIHJlbW92ZVVzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2NvcGUudXNlciA9IG51bGw7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzZXRVc2VyKCk7XG5cbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcywgc2V0VXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzLCByZW1vdmVVc2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LCByZW1vdmVVc2VyKTtcblxuICAgICAgICB9XG5cbiAgICB9O1xuXG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ3JhbmRvTW90dG8nLCBmdW5jdGlvbiAoUmFuZG9tTW90dG8pIHtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvcmFuZG8tbW90dG8vcmFuZG8tbW90dG8uaHRtbCcsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSkge1xuICAgICAgICAgICAgc2NvcGUubW90dG8gPSBSYW5kb21Nb3R0by5nZXRSYW5kb21Nb3R0bygpO1xuICAgICAgICB9XG4gICAgfTtcblxufSk7IiwiXG5hcHAuZGlyZWN0aXZlKCdyb3RhdGVUZXh0JyxcbiAgICBmdW5jdGlvbigkaW50ZXJ2YWwpIHtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XG5cbiAgICAgICAgICAgIHNjb3BlLndvcmRBcnI9WydTd2ltJywnVGVhbScsICdHeW0nLCAnQ2xpbWInLCAnU3BvcnQnXTtcblxuICAgICAgICAgICAgZnVuY3Rpb24gdXBkYXRlV29yZChpKSB7XG4gICAgICAgICAgICAgICAgdmFyIGo9KGkrMSklNTsgLy8oaSsxKSB0byBzdGFydCBhdCBzZWNvbmQgd29yZFxuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coaik7XG4gICAgICAgICAgICAgICAgZWxlbWVudC50ZXh0KHNjb3BlLndvcmRBcnJbal0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBlbGVtZW50LnRleHQoc2NvcGUud29yZEFyclswXSk7IC8vZGlzcGxheXMgXCJmdW5cIlxuICAgICAgICAgICAgc3RvcFdvcmQgPSAkaW50ZXJ2YWwodXBkYXRlV29yZCwgMjAwMCk7IC8vc3RhcnQgcm90YXRpbmcgMSBzZWNvbmQgYWZ0ZXIsIGNoYW5nZXMgZXZlcnkgc2VjXG5cbiAgICAgICAgICAgIC8vIGxpc3RlbiBvbiBET00gZGVzdHJveSAocmVtb3ZhbCkgZXZlbnRcbiAgICAgICAgICAgIC8vIHRvIHByZXZlbnQgdXBkYXRpbmcgd29yZCBhZnRlciB0aGUgRE9NIGVsZW1lbnQgd2FzIHJlbW92ZWQuXG4gICAgICAgICAgICBlbGVtZW50Lm9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICRpbnRlcnZhbC5jYW5jZWwoc3RvcFdvcmQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
