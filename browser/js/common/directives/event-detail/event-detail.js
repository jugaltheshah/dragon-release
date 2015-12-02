app.directive('eventDetail', function(Utils) {
	return {
		restrict: 'E',
		scope: {
			eventdata: '='
		},
		templateUrl: '/js/common/directives/event-detail/event-detail.html', 
		link: function(scope, element, attrs){
			var defaultImages = Utils.defaultImages;
			scope.getImage = function() {
				// type = type.toLowerCase();
				// console.log(type);
				return defaultImages[scope.eventdata.sport.toLowerCase()];
			}
		}
	}
});