app.config(function($stateProvider){
	$stateProvider.state('events', {
		url: '/events', 
		templateUrl: '/js/events/events.list.html', //add in a resolve to get all of the current events
		controller: 'EventCtrl'
	})
});