app.config(function ($stateProvider) {

    $stateProvider.state('login', {
        url: '/login',
        templateUrl: 'js/login/login.html',
        controller: 'LoginCtrl'
    });

});

app.controller('LoginCtrl', function ($scope, AuthService, $state, UserFactory) {

    $scope.login = {};
    $scope.error = null;

    $scope.sendLogin = function (loginInfo) {

        $scope.error = null;

        AuthService.login(loginInfo).then(function () {
            $state.go('home');
        }).catch(function () {
            $scope.error = 'Invalid login credentials.';
        });

    };

    $scope.sendSignup = function(signupInfo){
        $scope.error = null;
        UserFactory.createUser(signupInfo)
            .then(function(){
                return AuthService.login(signupInfo);
            })
            .then(function(){
                $state.go('home');
            })
            .catch(function(err){
                $scope.error = err;
            })
    }

});
