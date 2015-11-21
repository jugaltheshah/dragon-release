app.config(function($stateProvider){
	$stateProvider.state('createEvent',{
		url:'/createEvent',
		templateUrl:'js/createEvent/createEvent.html',
		controller:'createEventCtrl'
	});
});


app.controller('createEventCtrl', function ($scope) {

    $scope.newEvent = {};

    $scope.createEvent = function () {
    	console.log($scope.newEvent.name)
    };

});