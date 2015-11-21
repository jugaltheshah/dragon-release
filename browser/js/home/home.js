app.config(function ($stateProvider) {
    $stateProvider.state('home', {
        url: '/',
        templateUrl: 'js/home/home.html'
        controller: function($scope){
        	$scope.create = function(){
        		console.log("create")	
        	};

        	$scope.update = function(){

        		
        	}

        }
    });
});