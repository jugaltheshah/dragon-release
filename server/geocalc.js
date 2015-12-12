var geo = require('geolib');

function isFloat(n) {
  return isFinite(n) && n != '';
}

function validLat(n) {
  if(isFloat(n)) {
    return n <= 90 && n >= -90;
  }
  return false
}

function validLong(n) {
  if(isFloat(n)) {
    return n <= 180 && n >= -180;
  }
  return false;
}

function validateCoords(lat, lng){
	if (validLat(lat) && validLong(lng)){
		return true;
	}
	return false;
}

function findDistance(userLoc, event){
	//Do validation prior to calling this function
	var eventLoc = {latitude: event.location.latitude, longitude: event.location.longitude};
	return geo.getDistance(userLoc, eventLoc);	
}

function findNearby(userLoc, eventsArray, distance){
	var maxDistance;
	var filteredEvents = [];
	switch(distance){
		case 'walking':
			maxDistance = 1609
			break;
		case 'biking':
			maxDistance = 6437
			break;
		case 'driving':
			maxDistance = 16094
			break;
		default:
			maxDistance = 0;
	}

	var filteredEvents = eventsArray.filter(function(event){
		if (findDistance(userLoc, event) < maxDistance) {
			return event;
		}	 
	})
	return filteredEvents;
}

module.exports = {
	findNearby: findNearby,
	validateCoords: validateCoords
}
