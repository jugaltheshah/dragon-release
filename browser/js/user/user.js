app.config(function($stateProvider){
   $stateProvider
       .state('users', {
           url: '/users',
           templateUrl: 'js/user/list.html',
           resolve: {
               users: function(UserFactory){
                   return UserFactory
                       .getUsers()
                       .then(function(res){
                           return res.data;
                       })
               }
           },
           controller: function($scope, users){
                $scope.users = users;
           }
       })
       .state('userDetail', {
           url: '/users/detail/:id',
           templateUrl: 'js/user/profile.html',
           resolve: {
               user: function(UserFactory, $stateParams){
                   return UserFactory
                       .getUserById($stateParams.id)
                       .then(function(res){
                           return res.data;
                       })
               },
               me: function(AuthService){
                   return AuthService.getLoggedInUser()
                       .then(function(res){
                           return res;
                       })
               },
               fb_friends: function(FacebookFactory, user){
                   return FacebookFactory.getFriends(user)
                       .then(function(res){
                           return res.data;
                       });
               },
               events: function(EventFactory, user){
                   var events = {host:[], attendee: []};
                   return EventFactory.getEventsByHost(user)
                       .then(function(res){
                            events.host = res.data;
                           return EventFactory.getEventsByAttendee(user);
                       })
                       .then(function(res){
                           events.attendee =res.data;
                           return events;
                       });
               }
           },
           controller: function($scope, user, me, events, fb_friends, FacebookFactory){
               $scope.friends = [];
               $scope.events = events;
               var tempHost={};
               var tempAttendees = {};
               $scope.hosts= [];
               $scope.attendees= []
               angular.forEach($scope.events.host, function(event, key){
                    if(!tempHost[event.host._id]){
                        $scope.hosts.push(event.host);
                        tempHost[event.host._id] = true;
                    }
               });

               angular.forEach($scope.events.attendee, function(event, key){
                   angular.forEach(event.attendees, function(attendee, k){
                        if(!tempAttendees[attendee._id]){
                            $scope.attendees.push(attendee);
                            tempAttendees[attendee._id] = true;
                        }
                   });
               });


               console.log($scope.hosts);
               console.log($scope.attendees);
               angular.forEach(fb_friends, function(friend){
                   FacebookFactory.getPortrait(friend, me)
                       .then(function(res){
                           $scope.friends.push({id: friend.id, name: friend.name, picture:res.data.url});
                       });
               });
               $scope.user = user;
               $scope.me = me;
           }
       })
       .state('userEdit', {
           url: '/users/edit/:id',
           templateUrl: 'js/user/edit.html',
           resolve: {
                user: function($stateParams, UserFactory){
                    return UserFactory
                        .getUserById($stateParams.id)
                        .then(function(res){
                            return res.data;
                        })
                },
                states: function(Utils){
                    return Utils.getStates();
                }
           },
           controller: function($scope, user, states, UserFactory, $state){
                $scope.user = user;

                $scope.allStates = states;

                $scope.setState = function(state){
                    $scope.user.address.state = state;
                };

                $scope.updateUser = function(){
                    UserFactory
                        .updateUser($scope.user)
                        .then(function(res){
                            $state.go('userDetail', {id:res.data._id});
                            console.log('update user', res.data);
                        });
                };

                $scope.deleteUser = function(id){
                    UserFactory.removeUser(id)
                        .then(function(res){
                            if(res.data.ok){
                                $state.go('home');
                            }
                        });
                };
           }
       });
});
