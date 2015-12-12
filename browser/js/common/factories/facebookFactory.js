app.factory('FacebookFactory', function($q, Facebook){
    function getFriends(me){
        var deferred = $q.defer();
        Facebook.api('/me/friends?' + 'access_token='+me.facebook.token, function(response) {
            if (!response || response.error) {
                deferred.reject('Error occured');
            } else {
                deferred.resolve(response);
            }
        });
        return deferred.promise;
    }

    function getPortrait(user, me){
        var deferred = $q.defer();

        Facebook.api('/'+user.id+'/picture?' + 'access_token='+me.facebook.token, function(response) {
            if (!response || response.error) {
                deferred.reject('Error occured');
            } else {
                deferred.resolve(response);
            }
        });
        return deferred.promise;
    }

    return {
        getFriends: getFriends,
        getPortrait: getPortrait
    };

});
