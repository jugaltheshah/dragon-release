'use strict';
var router = require('express').Router();
module.exports = router;
var _ = require('lodash');
var mongoose =require('mongoose');
var User = mongoose.model('User');

var ensureAuthenticated = function (req, res, next) {
    if (req.isAuthenticated()) {
        next();
    } else {
        res.status(401).end();
    }
};

router.get('/', function(req, res, next){
    User
        .find()
        .then(function(docs){
            res.json(docs);
        })
        .then(null, next);
});

router.post('/', function(req, res, next){
    var user = req.body;
    User
        .create(user)
        .then(function(doc){
            res.json(doc);
        })
        .then(null, next);
});

router.put('/', function(req, res, next){
    var user = req.body;
    User
        .findOne({_id: user._id})
        .then(function(doc){
            _.forEach(user, function(val, key){
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
    User
        .remove({_id: req.params.id})
        .then(function(doc){
            res.json(doc);
        })
        .then(null, next);
});

router.get('/:id', function(req, res, next){
    User
        .findOne({_id: req.params.id})
        .then(function(doc){
            res.json(doc);
        })
        .then(null, next);
});

router.get('/fb/:id', function(req, res, next){
    User
        .findOne({'facebook.id': req.params.id})
        .then(function(doc){
            res.json(doc);
        })
        .then(null, next);
});


