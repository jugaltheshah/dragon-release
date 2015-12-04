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
               console.log(events);
               $scope.events = events;
               $scope.map = { center: { latitude: 40.773959, longitude: -73.970949 }, zoom: 14 };
               uiGmapGoogleMapApi.then(function(maps) {});
               $scope.sportsList = Utils.sportsList;
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
              }
           },
           controller: function($scope, event){
               $scope.page="detail";
               console.log(event)
               $scope.event = event;
;           }
       })
       .state('eventCreate', {
           url:'/events/create',
           templateUrl: 'js/event/create.html',
           controller: function($scope, EventFactory, $state){
               $scope.createEvent = function() {
                    EventFactory.createEvent($scope.event)
                        .then(function(res){
                            $state.go('eventDetail', {id: res.data._id});
                        });
               };
           }
       })
       .state('eventUpdate', {
           url:'/events/update/:id',
           templateUrl: 'js/event/update.html',
           controller: function($scope){
               $scope.update = function(para) {
                    alert(para);
                }
           }
       });
});
