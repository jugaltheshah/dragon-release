app.directive('eventForm',function(){
	return {
		restrict:'E',
		templateUrl:'js/common/directives/event-form/event-form.html',
		scope:{
			event:"=",
			fn:"&"
		},
		controller:'createEventCtrl'

	});
});


app.controller('createEventCtrl', function ($scope) {

    $scope.event = {};
});
