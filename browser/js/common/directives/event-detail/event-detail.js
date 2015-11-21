app.directive('eventDetail', function(EventFactory) {
	return {
		restrict: 'E',
		templateUrl: '/js/common/directives/event-detail/event-detail.html', 
		link: function(scope, element, attrs){
			scope.getImage = function(type) {
				return EventFactory.getUrl(type);
			}
		}
	}
});