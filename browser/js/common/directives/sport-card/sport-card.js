app.directive('sportCard', function(Utils) {
	return {
		restrict: 'E',
		scope: {
			sport: '='
		},
		templateUrl: '/js/common/directives/sport-card/sport-card.html', 
		link: function(scope, element, attrs){
			scope.getImage = function() {
				return Utils.sportCardImages[scope.sport.toLowerCase()];
			}
		}
	}
});