app.factory('EventFactory', function($http){
	function getEvents() {
		return $http.get('/api/events').then(function(res){
			console.log(res);
			return res.data;
		});
	}

	return {
		getEvents: getEvents
	}
});