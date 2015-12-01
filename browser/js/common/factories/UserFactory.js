app.factory('UserFactory', function($http){


    var users = [
        {
            userName: 'Stewee',
            firstName: 'Stewart',
            lastName: 'Griffin',
            gender: 'M',
            email: 'mingjie@fsa.com',
            birth: {
                day: '15',
                month: '06',
                year: '2010'
            },
            motto: 'Little Asshold',
            address: {
                address1: '321 broadway',
                address2: 'apt 4c',
                city: 'new york',
                state: 'NY',
                zip: '11229'
            },
            links: [],
            image: '',
            about: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.'
        }
    ];
    function getUsers() {
        return $http.get('/api/users/');
    }

    function getUserById(id){
        return $http.get('/api/users/' + id);
    }

    function updateUser(user){
        return $http.put('/api/users/', user);
    }

    function createUser(user){
        return $http.post('/api/users/', user);
    }

    function removeUser(id){
        return $http.delete('/api/users/'+id);
    }

    return {
        getUsers: getUsers,
        getUserById: getUserById,
        updateUser: updateUser,
        createUser: createUser,
        removeUser: removeUser
    }

});
