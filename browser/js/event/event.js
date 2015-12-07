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
               angular.forEach($scope.event.attendees, function (val, key) {
                   if (val === user._id) {
                       $scope.reserved = true;
                   }
               });
               $scope.join = function () {
                   if (user === null) {
                       alert('Please Login to Join the Sport.');
                   }
                   else {
                       $scope.event.attendees.push(user);
                   }
                   EventFactory.updateEvent($scope.event)
                       .then(function (res) {
                           $scope.reserved = true;
                           $scope.event = res.data;
                           $state.go('eventDetail', {id: res.data._id});
                       });
               };

               $scope.cancel = function () {
                   angular.forEach($scope.event.attendees, function (val, key) {
                       if (val === user._id) {
                           $scope.event.attendees.splice(key, 1);
                       }
                   });
                   EventFactory.updateEvent($scope.event)
                       .then(function (res) {
                           $scope.reserved = false;
                           $scope.event = res.data;
                           $state.go('eventDetail', {id: res.data._id});
                       });
               };
           }

       })
       .state('eventCreate', {
           url:'/events/create',
           templateUrl: 'js/event/create.html',
           controller: function($scope, EventFactory, $state, Utils){
               $scope.createEvent = function() {
                    //EventFactory.createEvent($scope.event)
                    //    .then(function(res){
                    //        $state.go('eventDetail', {id: res.data._id});
                    //    });
                   console.log($scope.event);
               };
            $scope.sportsList = Utils.sportsList;
               $scope.states = Utils.getStates();
               console.log($scope.sportsList);
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
               }
           },
           controller: function($scope, event, EventFactory, $state){
               $scope.event = event;
               $scope.updateEvent = function() {
                   EventFactory.updateEvent($scope.event)
                       .then(function(res){
                           $state.go('eventDetail', {id: res.data._id});
                       });
               }
           }
       });
});
