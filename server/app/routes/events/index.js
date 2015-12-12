'use strict';
var router = require('express').Router();
module.exports = router;
var _ = require('lodash');
var mongoose =require('mongoose');
var Event = require('../../../db/models/event.js');
var geocalc = require('../../../geocalc');

// Get events by sport type
router.get('/sport/:sport', function(req, res, next){
    console.log('Called! Getting Events for sport ', req.params.sport , "!");

    Event
        .find({
            sport: req.params.sport
        })
        .then(function(events){
            console.log(events);
            res.json(events);
        })
        .then(null, next);
});

// Get events by date (always current time or after)
router.get('/date/:date', function(req, res, next){
    console.log('Called! Getting Events for date ', req.params.date , " or greater!");
    var today = new Date();
    var dt = new Date("12/16/2015");

    // Do we want to find all events and then filter or try to set query
    // If finding all - "expensive" operation
    // If filtering - date field is string, will be hard to compare greater than, less than, etc
    Event
        .find({
            date: "12/03/2015"
        })
        .then(function(events){
            console.log(events);
            res.json(events);
        })
        .then(null, next);
});

// // Get events by location
// router.get('/location/:location', function(req, res, next){
//     var reqestedSport = req.params.sport;
//     console.log('Called! Getting Events for sport ', requestedSport , "!");
//
//     Event
//         .find({
//             sport: requestedSport,
//         })
//         .then(function(events){
//             console.log(events);
//             res.json(events);
//         })
//         .then(null, next);
// });

// Get ALL events
router.get('/', function(req, res, next){
    console.log('Called! Getting Events!')
    Event
        .find()
        .populate('host', 'attendees')
        .exec()
        .then(function(events){
            console.log(events);
            res.json(events);
        })
        .then(null, next);
});

router.post('/findNearby', function(req, res, next){
    var userLoc = req.body.userLoc;
    var events = req.body.events;
    var distance = req.body.distance;
    var filteredEvents = geocalc.findNearby(userLoc, events, distance);
    console.log(filteredEvents.length);
    res.send(filteredEvents);
})

router.post('/', function(req, res, next){
    var newEvent = req.body;
    Event
        .create(newEvent)
        .then(function(doc){
            res.json(doc);
        })
        .then(null, next);
});

router.put('/', function(req, res, next){
    var updatedEvent = req.body;
    Event
        .findOne({_id: updatedEvent._id})
        .then(function(doc){
            _.forEach(updatedEvent, function(val, key){
                doc[key] = val;
            });
            return doc.save();
        })
        .then(function(doc){
            res.json(doc);
        })
        .then(null, next);
});

router.delete('/:id', function(req, res, next){
    Event
        .remove({_id: req.params.id})
        .then(function(doc){
            res.json(doc);
        })
        .then(null, next);
});

router.get('/:id', function(req, res, next){
    Event
        .findOne({_id: req.params.id})
        .populate('host attendees')
        .exec()
        .then(function(doc){
            res.json(doc);
        })
        .then(null, next);
});

router.get('/attendee/:id', function(req, res, next){
    var uid = req.params.id;
    Event
        .find({attendees: {$elemMatch: {$eq: uid}}})
        .populate('host attendees')
        .exec()
        .then(function(doc){
            res.json(doc);
        })
        .then(null, next);
});

router.get('/host/:id', function(req, res, next){
    var uid = req.params.id;
    Event
        .find({host:uid})
        .populate('host attendees')
        .exec()
        .then(function(doc){
            res.json(doc);
        })
        .then(null, next);
});

router.get('/address/:q', function(req, res, next){

    var q = req.params.q;
    Event
        .find({$or: [{'address1': new RegExp(q, 'i')},{'address2': new RegExp(q,'i')}, {'city': new RegExp(q, 'i')}, {'state': new RegExp(q, 'i')}, {'zip': new RegExp(q, 'i')},]})
        .populate('host attendees')
        .exec()
        .then(function(doc){
            res.json(doc);
        })
        .then(null, next);
});
