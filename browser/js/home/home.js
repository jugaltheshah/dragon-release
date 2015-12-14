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
        controller: function($scope, user, EventFactory, $state) {
            $scope.querySearch = function(q){
                return EventFactory.searchOverallEvent(q)
                    .then(function(res){
                        return res.data;
                    })
            };

            $scope.selectedItemChange = function(item){
                console.log('test', item);
                $state.go('eventDetail', {id: item._id})
            };
        }
    });
});
