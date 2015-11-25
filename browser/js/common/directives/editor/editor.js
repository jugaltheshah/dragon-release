app.directive('editor', function(){
    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/editor/editor.html',
        scope: {
            content: '='
        },
        controller: function($scope){
        },
        link: function(){

        }
    };
});
