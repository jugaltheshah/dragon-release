app.factory('RandomGreetings', function () {

    var getRandomFromArray = function (arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    };

    var greetings = [
        'Sport up!',
        'teamwork makes the dream work',
        'Hello, simple human.',
        'What a beautiful day!Let\'s work out!',
        '生命在于运动',
        'Life is short, Play Hard!',
        'Together Everyone Achieves More.',
        'United we play. United we win.',
        'You may be strong but we are stronger.'
    ];

    return {
        greetings: greetings,
        getRandomGreeting: function () {
            return getRandomFromArray(greetings);
        }
    };

});
