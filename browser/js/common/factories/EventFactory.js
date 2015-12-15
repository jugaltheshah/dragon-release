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

    function getEventsByHost(user){
        return $http.get('/api/events/host/'+user._id);
    }

    function getEventsByAttendee(user){
        return $http.get('/api/events/attendee/'+user._id);
    }

    function getEvents() {
        return $http.get('/api/events').then(function(res){
            return res.data;
        });
    }

    function getEventsByMatchAddress(q) {
        return $http.get('/api/events/address/'+q);
    }

    function searchOverallEvent(q){
        return $http.get('/api/events/all/'+q);
    }

	return {
        createEvent: createEvent,
        getEventById: getEventById,
        getEvents: getEvents,
        updateEvent: updateEvent,
        getEventsByAttendee: getEventsByAttendee,
        getEventsByHost: getEventsByHost,
        getEventsByMatchAddress: getEventsByMatchAddress,
        searchOverallEvent: searchOverallEvent
	}
});
