'use strict';
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var cors = require('cors');

module.exports = function (app) {

    app.use(cors());

    // Important to have this before any session middleware
    // because what is a session without a cookie?
    // No session at all.
    app.use(cookieParser());

    // Parse our POST and PUT bodies.
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

};
