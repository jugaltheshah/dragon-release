app.directive('eventForm',function(){
	return {
		restrict:'E',
		templateUrl:'js/common/directives/event-form/event-form.html',
		scope:{
			event:"=",
			fn:"&",
			type:'@'
		},
		controller:'eventFormCtrl'

	};
});


app.controller('eventFormCtrl', function ($scope) {
	console.log($scope.type);
    $scope.event = {};

});
