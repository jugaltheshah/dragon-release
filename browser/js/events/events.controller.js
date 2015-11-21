app.controller('EventCtrl', function($scope, uiGmapGoogleMapApi) {
	$scope.map = { center: { latitude: 40.773959, longitude: -73.970949 }, zoom: 14 };
    uiGmapGoogleMapApi.then(function(maps) {});
})