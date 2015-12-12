'use strict';
var mongoose = require('mongoose');

var schema = new mongoose.Schema({
	name: {
		type: String,
	},
	sport: {
		type: String,
	},
	host: {
		type: String
	},
	/*{type: mongoose.Schema.Types.ObjectId, ref: 'User'}*/
	location: {
		latitude: Number,
        longitude: Number
	},
    date: String,
    address1:String,
    address2: String,
    city: String,
    state: String,
    zip: String,
	tags: [{text: String}],
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
    attendees: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
	video: {
		type: String
	},
	description: {
		type: String
	},
})


module.exports = mongoose.model('Event', schema)
