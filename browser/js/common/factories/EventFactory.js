app.factory('EventFactory', function($http, Socket){
    function createEvent(event){
        return $http.post('/api/events/', event);
    }

    function updateEvent(event){
        return $http.put('/api/events/', event);
    }

    function getEventById(id){
        return $http.get('/api/events/'+id);
    }

    function getEvents() {
        return $http.get('/api/events').then(function(res){
            return res.data;
        });
    }

	return {
        createEvent: createEvent,
        getEventById: getEventById,
        getEvents: getEvents,
        updateEvent: updateEvent,
	}
});
