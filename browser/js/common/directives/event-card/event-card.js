app.directive('eventCard', function(Utils) {
	return {
		restrict: 'E',
		scope: {
			eventdata: '='
		},
		templateUrl: '/js/common/directives/event-card/event-card.html', 
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