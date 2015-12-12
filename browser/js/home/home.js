app.config(function ($stateProvider) {
    $stateProvider.state('home', {
        url: '/',
        templateUrl: 'js/home/home.html',
        resolve: {
        	user: function (AuthService) {
                  return AuthService.getLoggedInUser()
                      .then(function(res){
                          return res;
                      })
              }
        },
        controller: function($scope, user) { 
        	$scope.user = user;
        }
    });
});