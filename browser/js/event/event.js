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
           controller: function($scope, $http, uiGmapGoogleMapApi, Utils, events, Socket){
                var events = events;
                var userLocation;
                var getMarkers = function() { 
                  var markerList = [];
                  $scope.events.forEach(function(event){
                      if (event.location) {
                        markerList.push({
                        name: event.name,
                        latitude: event.location.latitude,
                        longitude: event.location.longitude,
                        options: '{title:'+event.name+'}',
                        icon: Utils.mapIconUrls[event.sport.toLowerCase()],
                        mouseover: 'showEventDetails('+event+')',
                        id: event._id
                      })
                    }
                  });
                  return markerList;
               };

                if (navigator.geolocation)
                  navigator.geolocation.getCurrentPosition(function(pos){
                    userLocation = {latitude: pos.coords.latitude, longitude: pos.coords.longitude};
                    $scope.userLocReady = true;
                    $scope.userLoc = userLocation;
                    $scope.userMarker = {name: 'Your Location', location: userLocation, id: 0};
                    $scope.$digest();
                  });

               $scope.userLocReady = false;
               $scope.events = events;
               $scope.markers = getMarkers();
               $scope.map = { center: { latitude: 40.773959, longitude: -73.970949 }, zoom: 14 };
               $scope.sportsList = Utils.sportsList;
               $scope.selectedSport = 'Filter by Sport';
               $scope.selectedFilter = null;
               

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
                $scope.markers = getMarkers();
               }

               $scope.filterDistance = function(distance) {
                $scope.events = events;
                var data = {
                    userLoc: $scope.userLoc,
                    events: $scope.events,
                    distance: distance
                }

                if ($scope.userLocReady) {
                  $http.post('/api/events/findNearby', data).then(function(res){
                    $scope.events = res.data;
                    $scope.markers = getMarkers();
                  })
                }                
              }

              $scope.specifyDate = function(date){
                $scope.events = events;
                var t = new Date(date).getTime();

                $scope.events = $scope.events.filter(function(event){
                  var d = new Date(event.date).getTime()
                
                  if (d == t){
                    console.log('Match!');
                    return event
                  }
                })

                $scope.selectedFilter = $scope.specifyDate;
              }
              $scope.removeFilters = function() {
                $scope.events = events;
                $scope.filter = {};
                $scope.markers = getMarkers();
              }

              $scope.search = function(query) {
                $scope.events = events;
                var query = query.toString();
                var matches = [];

                events.forEach(function(event){
                    if (event.name == query) {
                      matches.push(event);
                    }
                    else {
                      event.tags.forEach(function(tag){
                        if (tag.text == query) {
                          matches.push(event);
                        }
                      })
                    }
                })
                $scope.events = matches;
                $scope.markers = getMarkers();
              }

              $scope.filterTime = function(time){
                  $scope.events = events;
                  var now = new Date();
                  var then;

                  switch(time) {
                    case 'today':
                      then = new Date().setHours(23,59,59);
                      break;
                    case 'thisweek':
                      then = new Date().setDate(now.getDate()+7);
                      break;
                    case 'nextweek':
                      then = new Date().setDate(now.getDate()+14);

                  }                  
                  var filteredEvents = $scope.events.filter(function(event){
                    var d = new Date(event.date);
                    if (d < then) {
                      return event
                    }
                  });

                  filteredEvents.sort(function(a, b){
                    var dateA = new Date(a.date), dateB = new Date(b.date);
                    if (dateA < dateB) return -1;
                    if (dateA > dateB) return 1;
                    return 0;
                  });
                  $scope.events = filteredEvents
                  $scope.markers = getMarkers();
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
