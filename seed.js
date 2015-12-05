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
var Chance = require('chance');
var chance = new Chance();
var moment = require('moment');
moment().format();

var getRandomLocation = function() { //change this later to take a sport and return a location that makes sense for the sport input.
    var locations = [
    {name: 'Central Park', coords: {latitude: 40.771606, longitude: -73.974819}},
    {name: 'Chelsea Piers Sports Center', coords: {latitude: 40.746617, longitude: -74.010184}},
    {name: 'Hudson River Park', coords: {latitude: 40.727127, longitude: -74.011334}},
    {name: 'Central Park Great Lawn', coords: {latitude: 40.781389, longitude: -73.966553}},
    {name: 'Nelson Rockefeller Park', coords: {latitude: 40.716920, longitude: -74.016867}},
    {name: '"The Cage" W4 St Basketball Courts', coords: {latitude: 40.731041, longitude: -74.001244}}, 
    ]

    return locations[Math.floor(Math.random()*locations.length)];
}

var getRandomLevel = function() {
    var levels = ['Beginner (1-2)', 'Novice (3-4)', 'Intermediate(5-6)', 'Advanced(7-8)', 'Pro(9-10)'];
    return levels[Math.floor(Math.random()*levels.length)];
}

var getRandomSport = function() {
    var sports = ["Basketball", "Climbing", "Soccer", "Baseball", "Football", "Lifting", "Skiing", "Mountain Biking", "Surfing", "Cycling", 'Tennis']
    return sports[Math.floor(Math.random()*sports.length)];
}
var genRandomEvents = function(num) {
    var events = [];

    for(i=0;i<num;i++) {
        var newEvent = {
            name: chance.sentence({words: 3}),
            host: chance.first(),
            sport: getRandomSport(),
            timeBegin: moment(chance.date({string: true, year: 2015, month: 11})+'T'+chance.hour()+':'+chance.minute()+':00.000Z', 'h:mm A'),
            location: getRandomLocation(),
            level: getRandomLevel(),
            description: chance.paragraph({sentences: 1})
        }
        events.push(newEvent);
    }
       return events;
}

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

    var events = genRandomEvents(12);
    var staticEvents = [
    {
        name: 'The best soccer game ever', 
        host: 'bryce',
        sport: 'Soccer',
        timeBegin: '2015-12-08T14:30:00.000Z',
        location: {name: 'Central Park', coords: {latitude: 40.771606, longitude: -73.974819}},
        tags: ['Soccer', 'Fun', 'Central Park', 'Easy'],
        level: 'Beginner (1-2)',
        minAttendees: 10,
        maxAttendees: 16,
        image: 'https://thomasblondal.files.wordpress.com/2014/10/norge-kampen.jpg',
        description: 'A soccer game for beginners. Not intense at all. Basically we\'ll just be kicking around a ball and having fun.'
    },
    {
        name: 'Chelsea Piers Basketball Tournament', 
        host: 'mingjie',
        sport: 'Basketball',
        timeBegin: '2015-12-10T18:30:00.000Z',
        location: {name: 'Chelsea Piers Sports Center', coords: {latitude: 40.746617, longitude: -74.010184}},
        tags: ['Basketball', 'Tournament', 'Chelsea Piers'],
        level: 'Intermediate (5-6)',
        fee: 25.00,
        minAttendees: 20,
        maxAttendees: 30,
        image: 'https://thomasblondal.files.wordpress.com/2014/10/norge-kampen.jpg',
        description: 'Basketball tournament at Chelsea Piers! Be good. No scrubs allowed. Teams randomly assigned. Winning team gets $100 each!'
    },
    {
        name: 'Intense Tennis Match', 
        host: 'jugal',
        sport: 'Tennis', 
        timeBegin: '2015-12-09T17:30:00.000Z',
        location: {name: 'Hudson River Park Tennis Courts', coords: {latitude: 40.727127, longitude: -74.011334}}, 
        tags: ['Tennis', 'Practice', 'Challenging', 'Match'],
        level: 'Pro (9-10)',
        minAttendees: 2,
        maxAttendees: 2,
        image: 'https://thomasblondal.files.wordpress.com/2014/10/norge-kampen.jpg',
        description: 'I\'m really good at Tennis and I need a partner who is also really good at Tennis. Looking to play ASAP.'
    }
    ]

    staticEvents.forEach(function(staticEvent){
        events.push(staticEvent);
    });

    return Event.createAsync(events);
}

connectToDb.then(function () {
    User.findAsync({}).then(function (users) {
        if (users.length === 0) {
            return seedUsers();
        } else {
            console.log(chalk.magenta('Seems to already be user data, exiting!'));
            process.kill(0);
        }
    })
    .then(function(){
        console.log(chalk.yellow('Seeding Events...'));
        return seedEvents();
    })
    .then(function () {
        console.log(chalk.green('Seed successful!'));
        process.kill(0);
    }).catch(function (err) {
        console.error(err);
        process.kill(1);
    });
});
