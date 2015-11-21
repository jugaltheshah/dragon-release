app.config(function($stateProvider){
   $stateProvider
       .state('eventList', {
           url:'/events',
           templateUrl: 'js/event/list.html',
           controller: function($scope){
                $scope.page="list";
           }
       })
       .state('eventDetail', {
           url:'/events/detail/:id',
           templateUrl: 'js/event/detail.html',
           controller: function($scope){
               $scope.page="detail";
           }
       })
       .state('eventCreate', {
           url:'/events/create',
           templateUrl: 'js/event/create.html',
           controller: function($scope){
               $scope.page="create";
           }
       })
       .state('eventUpdate', {
           url:'/events/update/:id',
           templateUrl: 'js/event/update.html',
           controller: function($scope){
               $scope.page="update";
           }
       });
});
