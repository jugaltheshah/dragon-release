app.factory('EventFactory', function($http){
	var defaultImages = {
		basketball: 'http://designyoutrust.com/wp-content/uploads/2014/01/This_Game_We_Play_NYC_Basketball_Courts_by_Franck-_Bohbot_2014_03.jpg',
		climbing: 'http://www.glappitnova.com/wp-content/uploads/2015/07/BKBChicago-South-Building-Climbing-Wall.jpg',
		soccer: 'http://www3.pictures.zimbio.com/gi/New+York+Red+Bulls+Mayor+Bloomberg+Open+New+F9Zo2WoP7g-l.jpg',
		baseball: 'http://www.suitcasegetaways.com/wp-content/uploads/2014/08/NYC-Central-Park-Heckscher-BallFields-South-End-9296-14-1030x686.jpg',
 		football: 'http://www.psal.org/images/Articles/2015/201507231059035908.jpg',
 		lifting: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRE65QAInXpHJuUmCZ37Xlf5RsxJtweqWAuewMUMkdh4y-v6sN5W5DNBIg',
		skiing: 'http://www.home-hunts.net/wp-content/uploads/2015/01/Cauterets-skiing.jpg',
		mountainbiking: 'http://finnohara.com/blog/wp-content/uploads/0000_FO_ATHLETES_961_1c_RGB.jpg',
		surfing: 'https://encrypted-tbn3.gstatic.com/images?q=tbn:ANd9GcRcxSIHobLvgXMgy6g0u1yXjq9tH7ecOL03VCVIhmf-5_k9vEJC',
		cycling: 'http://www.msnbc.com/sites/msnbc/files/2013/05/ap02050502257_1.jpg',
		tennis: 'http://images.nymag.com/guides/everything/tennis/publiccourts080505_1_560.jpg'
	}

	var sportsList = ["Basketball", "Climbing", "Soccer", "Baseball", "Football", "Lifting", "Skiing", "Mountain Biking", "Surfing", "Cycling", 'Tennis'];

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

	return {
		getUrl: function(type) {
			return defaultImages[type];
		},
        createEvent: createEvent,
        getEventById: getEventById,
        getEvents: getEvents,
        updateEvent: updateEvent,
		sportsList: sportsList,
        getEventsByAttendee: getEventsByAttendee,
        getEventsByHost: getEventsByHost,
        getEventsByMatchAddress: getEventsByMatchAddress
	}
});
