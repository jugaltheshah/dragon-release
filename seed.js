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
    {latitude: 40.771606, longitude: -73.974819},
    {latitude: 40.746617, longitude: -74.010184},
    {latitude: 40.727127, longitude: -74.011334},
    {latitude: 40.781389, longitude: -73.966553},
    {latitude: 40.716920, longitude: -74.016867},
    {latitude: 40.731041, longitude: -74.001244},
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
var getRandomTags = function(n) {
    var taglist = [];
    var tags = [{text: 'Fun'}, {text:'Awesome'}, {text:'Cool'}, {text:'Advanced'}, {text:'Easy'}, {text:'Hardcore'}, {text:'Music'}, {text:'Weekend'}, {text:'Day Trip'}, {text:'Night Time'}, {text:'Day Time'}, {text:'After Work'}, {text:'Kids'}, {text:'Adults'}, {text:'Intermediate'}];
    while(taglist.length < n) {
        if (taglist.length === tags.length) {
            break;
        }
        var randtag = tags[Math.floor(Math.random()*tags.length)]
        taglist.push(randtag)
    }
    return taglist;
}

var genRandomEvents = function(num) {
    return User.find({}).then(function(allUsers){
       var events = [];

       for(i=0;i<num;i++) {
        console.log(i);
        console.log(num);
        var newEvent = {
            name: chance.sentence({words: 2}),
            host: chance.pick(allUsers)._id,
            sport: getRandomSport(),
            date: new Date(chance.date({string: true, year: 2015, month: 11, day: chance.integer({min: 11, max: 31})})),
            location: getRandomLocation(),
            level: getRandomLevel(),
            tags: getRandomTags(),
            description: chance.paragraph({sentences: 1})
        }
         events.push(newEvent);
        }
        return events;
    })   
}

var seedUsers = function () {

    var users = [
        {
            userName: 'Jugal',
            email: 'jugal@fsa.com',
            password: 'jugal'
        },
        {
            userName: 'June',
            email: 'june@fsa.com',
            password: 'june'
        },
        {
            userName: 'Mingjie',
            email: 'mingjie@fsa.com',
            password: 'mingjie'
        },
	{
            userName: 'Bryce',
            email: 'bryce@fsa.com',
            password: 'bryce'
        }
    ];

    return User.createAsync(users);

};

var seedEvents = function () {
    return genRandomEvents(15).then(function(events){
        return Event.createAsync(events);
    });
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
