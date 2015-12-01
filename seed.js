/*

This seed file is only a placeholder. It should be expanded and altered
to fit the development of your application.

It uses the same file the server uses to establish
the database connection:
--- server/db/index.js

The name of the database used is set in your environment files:
--- server/env/*

This seed file has a safety check to see if you already have users
in the database. If you are developing multiple applications with the
fsg scaffolding, keep in mind that fsg always uses the same database
name in the environment files.

*/

var mongoose = require('mongoose');
var Promise = require('bluebird');
var chalk = require('chalk');
var connectToDb = require('./server/db');
var User = Promise.promisifyAll(mongoose.model('User'));
var Event = Promise.promisifyAll(mongoose.model('Event'));

var seedUsers = function () {

    var users = [
        {
            email: 'jugal@fsa.com',
            password: 'jugal'
        },
        {
            email: 'june@fsa.com',
            password: 'june'
        },
        {
            email: 'mingjie@fsa.com',
            password: 'mingjie'
        },
	{
            email: 'bryce@fsa.com',
            password: 'bryce'
        }
    ];

    return User.createAsync(users);

};

var seedEvents = function () {

    var events = [
    {
        name: 'The best soccer game ever', 
        host: 'bryce',
        date:, 
        time:, 
        location: {name: 'Central Park', location: {latitude: 40.771606, longitude: -73.974819}},
        tags: ['Soccer', 'Fun', 'Central Park', 'Easy'],
        level: 'Beginner',
        maxAttendees: 10,
        image: 'https://thomasblondal.files.wordpress.com/2014/10/norge-kampen.jpg',
        description: 'A soccer game for beginners. Not intense at all. Basically we\'ll just be kicking around a ball and having fun.'
    },
    {
        name: 'Chelsea Piers Basketball Tournament', 
        host: 'mingjie',
        date:, 
        time:, 
        location: {name: 'Chelsea Piers Sports Center', location: {latitude: 40.746617, longitude: -74.010184}},
        tags: ['Basketball', 'Tournament', 'Chelsea Piers'],
        level: 'Intermediate',
        fee: 25.00,
        maxAttendees: 25,
        image: 'https://thomasblondal.files.wordpress.com/2014/10/norge-kampen.jpg',
        description: 'Basketball tournament at Chelsea Piers! Be good. No scrubs allowed. Teams randomly assigned. Winning team gets $100 each!'
    },
    {
        name: 'Intense Tennis Match', 
        host: 'jugal',
        date:, 
        time:, 
        location: {name: 'Hudson River Park Tennis Courts', location: {latitude: 40.727127, longitude: -74.011334}}, 
        tags: ['Tennis', 'Practice', 'Challenging', 'Match'],
        level: 'Advanced',
        maxAttendees: 2,
        image: 'https://thomasblondal.files.wordpress.com/2014/10/norge-kampen.jpg',
        description: 'I\'m really good at Tennis and I need a partner who is also really good at Tennis. Looking to play ASAP.'
    }



    }
    ]
}

connectToDb.then(function () {
    User.findAsync({}).then(function (users) {
        if (users.length === 0) {
            return seedUsers();
        } else {
            console.log(chalk.magenta('Seems to already be user data, exiting!'));
            process.kill(0);
        }
    }).then(function () {
        console.log(chalk.green('Seed successful!'));
        process.kill(0);
    }).catch(function (err) {
        console.error(err);
        process.kill(1);
    });
});
