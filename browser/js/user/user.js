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
       .state('userInterest', {
        url: '/users/interest/:id',
        templateUrl: 'js/user/interest.html',
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
        },
        controller: function($scope, UserFactory, user, me){
          $scope.user = user;
          console.log($scope.user);
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
               fb_friends: function(facebookFactory, user){
                   return facebookFactory.getFriends(user)
                       .then(function(res){
                           return res.data;
                       });
               }
           },
           controller: function($scope, user, me, fb_friends, facebookFactory){
               //console.log(fb_friends);
               $scope.friends = [];
               angular.forEach(fb_friends, function(friend){
                   facebookFactory.getPortrait(friend, me)
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
