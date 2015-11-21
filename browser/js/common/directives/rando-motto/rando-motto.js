app.directive('randoMotto', function (RandomMotto) {

    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/rando-motto/rando-motto.html',
        link: function (scope) {
            scope.motto = RandomMotto.getRandomMotto();
        }
    };

});