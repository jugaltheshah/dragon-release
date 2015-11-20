app.config(function($stateProvider){
	$stateProvider.state('updateEvent',{
		url:'/updateEvent',
		templateUrl:'js/updateEvent/updateEvent.html',
		controller:'updateEventCtrl'
	});
});


app.controller('updateEventCtrl', function ($scope,OneEvent) {

    $scope.reviseEvent = OneEvent;

    $scope.updateEvent = function () {
    	console.log( $scope.reviseEvent.name)
    };

});