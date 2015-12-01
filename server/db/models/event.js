'use strict';
var mongoose = require('mongoose');

var schema = new mongoose.Schema({
	name: {
		type: String,
		required: true
	}, 
	host: {
		type: String, 
		required: true
	},
	date: {
		type: Date,
		required: true
		//default: (current date)
	},
	time: {
		type: String,
		required: true
	},
	location: {
		type: Object,
		required: true
	},
	tags: {
		type: [String]
	}, 
	level: {
		type: String
	},
	maxAttendees: {
		type: Number
	},
	fee: {
		type: Number
	},
	image: {
		type: String
	},
	description: {
		type: String
	}
})


module.exports = mongoose.model('Event', schema)