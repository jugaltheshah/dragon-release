'use strict';
var mongoose = require('mongoose');

var schema = new mongoose.Schema({
	name: {
		type: String,
		required: true
	},
	sport: {
    	type: String,
    },
	host: {
		type: String,
	},
	date: {
		type: String,
		required: true
	},
	//time: {
	//	type: String,
	//	required: true
	//},
    feePerPerson: Number,
    timeBegin: {
        type: String,
        required: true
    },
    timeEnd: {
        type: String,
        required: true
    },
	location: {
		location: String
	},
	tags: [{
        text: String
    }],
	level: {
		type: String
	},
	maxAttendees: {
		type: Number
	},
	minAttendees: {
		type: Number
	},
	fee: {
		type: Number
	},
	image: {
		type: String
	},
	video: {
		type: String
	},
	description: {
		type: String
	},
})


module.exports = mongoose.model('Event', schema)
