app.config(function($stateProvider){
   $stateProvider
       .state('eventList', {
           url:'/events',
           templateUrl: 'js/event/list.html',
           resolve: {
                events: function(EventFactory) {
                  return EventFactory.getEvents();
                }
           },
           controller: function($scope, uiGmapGoogleMapApi, Utils, events){
              console.log(navigator.geolocation);
               $scope.events = events;
               $scope.map = { center: { latitude: 40.773959, longitude: -73.970949 }, zoom: 14 };
               uiGmapGoogleMapApi.then(function(maps) {});
               $scope.sportsList = Utils.sportsList;
               $scope.selectedSport = 'Filter by Sport';

               $scope.filterDistance = function(distance) {
                $scope.events = events;
                var filteredList = [];
                  for(var i=0; i<$scope.events.length; i++){
                    if ($scope.events[i].sport === sport) {
                      filteredList.push($scope.events[i]);
                    }
                  }
                $scope.events = filteredList;
               }
               $scope.filterSport = function(sport){
                $scope.selectedSport = sport;
                $scope.events = events;
                var filteredList = [];
                  for(var i=0; i<$scope.events.length; i++){
                    if ($scope.events[i].sport === sport) {
                      filteredList.push($scope.events[i]);
                    }
                  }
                $scope.events = filteredList;
               }

               $scope.filterDistance = function(distance) {
                console.log('called with distance: '+distance);
               }
           }
       })
       .state('eventDetail', {
           url:'/events/detail/:id',
           templateUrl: 'js/event/detail.html',
           resolve: {
              event: function(EventFactory, $stateParams){
                  return EventFactory.getEventById($stateParams.id)
                      .then(function(res){
                          return res.data;
                      })
              },
              user: function(AuthService){
                  return AuthService.getLoggedInUser()
                      .then(function(res){
                          return res;
                      })
              }
           },
           controller: function($scope, event, user, EventFactory, $state) {
               $scope.event = event;
               $scope.reserved = false;
               console.log($scope.event.host);
               $scope.user = user;
               angular.forEach($scope.event.attendees, function (val, key) {
                   if (user && val._id === user._id) {
                       $scope.reserved = true;
                   }
               });
               $scope.join = function () {
                   if($scope.reserved === false){
                       $scope.event.attendees.push(user);
                       EventFactory.updateEvent($scope.event)
                           .then(function (res) {
                               $scope.reserved = true;
                               return EventFactory.getEventById(res.data._id);
                           })
                           .then(function(res){
                               $scope.event = res.data;
                               console.log(res.data);
                               $state.go('eventDetail', {id: res.data._id});
                           });
                   }

               };

               $scope.cancel = function () {
                   angular.forEach($scope.event.attendees, function (val, key) {
                       if (val._id === user._id) {
                           $scope.event.attendees.splice(key, 1);
                       }
                   });
                   EventFactory.updateEvent($scope.event)
                       .then(function (res) {
                           $scope.reserved = false;
                           return EventFactory.getEventById(res.data._id);
                       })
                       .then(function(res){
                           $scope.event = res.data;
                           console.log(res.data);
                           $state.go('eventDetail', {id: res.data._id});
                       });
               };
           }

       })
       .state('eventCreate', {
           url:'/events/create',
           templateUrl: 'js/event/create.html',
           resolve: {
               user: function(AuthService){
                   return AuthService.getLoggedInUser()
                       .then(function(res){
                           return res;
                       })
               }
           },
           controller: function($scope, EventFactory, $state, Utils, user){
               $scope.createEvent = function() {
                    $scope.event.host = user;
                    var addressString_pre = $scope.event.address1 + ', ' + $scope.event.city + ', ' + $scope.event.state;
                    var addressString_post = addressString_pre.split(' ').join('+');
                    Utils.getCoordinates(addressString_post)
                        .then(function(res){
                            $scope.location = (res.data.status === 'OK') ? res.data.results[0].geometry.location : null;
                            return EventFactory.createEvent($scope.event)
                        })
                        .then(function(res){
                            $state.go('eventDetail', {id: res.data._id});
                        });
               };
               $scope.sportsList = Utils.sportsList;
               $scope.states = Utils.getStates();
           }
       })
       .state('eventUpdate', {
           url:'/events/update/:id',
           templateUrl: 'js/event/update.html',
           resolve: {
               event: function(EventFactory, $stateParams){
                   return EventFactory.getEventById($stateParams.id)
                       .then(function(res){
                           return res.data;
                       })
               },
               user: function(AuthService){
                   return AuthService.getLoggedInUser()
                       .then(function(res){
                           return res;
                       })
               }
           },
           controller: function($scope, event, user, EventFactory, $state, Utils){
               $scope.event = event;
               $scope.event.host = user;
               $scope.event.date = new Date($scope.event.date);
               $scope.updateEvent = function() {
                   var addressString_pre = $scope.event.address1 + ', ' + $scope.event.city + ', ' + $scope.event.state;
                   var addressString_post = addressString_pre.split(' ').join('+');
                   console.log(addressString_post);
                   Utils.getCoordinates(addressString_post)
                       .then(function(res){
                           $scope.event.location = (res.data.status === 'OK') ? res.data.results[0].geometry.location : null;
                           return EventFactory.updateEvent($scope.event)
                       })
                       .then(function(res){
                           $state.go('eventDetail', {id: res.data._id});
                       });
               }
               $scope.sportsList = Utils.sportsList;
               $scope.states = Utils.getStates();
           }
       });
});
