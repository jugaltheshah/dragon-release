app.config(function ($stateProvider) {
    $stateProvider.state('home', {
        url: '/',
        templateUrl: 'js/home/home.html',
        controller: function($scope){
        	$scope.create = function(para){
        		alert(para);	
        	};

        	$scope.update = function(para){
                alert(para);
	
        	}

        }
    });
});