'use strict';
var router = require('express').Router();
module.exports = router;
var _ = require('lodash');
var mongoose =require('mongoose');
var Event = require('../../../db/models/event.js');
var geocalc = require('../../../geocalc');

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
        .populate('host', 'attendees')
        .exec()
        .then(function(doc){
            res.json(doc);
        })
        .then(null, next);
});
