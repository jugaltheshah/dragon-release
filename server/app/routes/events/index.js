'use strict';
var router = require('express').Router();
module.exports = router;
var _ = require('lodash');
var mongoose =require('mongoose');
var Event = require('../../../db/models/event.js')

router.get('/', function(req, res, next){
    console.log('Called! Getting Events!')
    Event
        .find()
        .then(function(events){
            console.log(events);
            res.json(events);
        })
        .then(null, next);
});

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
        .then(function(doc){
            res.json(doc);
        })
        .then(null, next);
});