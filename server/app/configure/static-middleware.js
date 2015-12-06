"use strict";
var path = require('path');
var express = require('express');
var favicon = require('serve-favicon');

module.exports = function (app) {

    var root = app.getValue('projectRoot');

    var npmPath = path.join(root, './node_modules');
    var publicPath = path.join(root, './public');
    var browserPath = path.join(root, './browser');
    var vendorPath = path.join(root, './vendor');
    var videoPath = path.join(root, './video');
    var imagePath = path.join(root, './image');

    app.use(favicon(app.getValue('faviconPath')));
    app.use(express.static(npmPath));
    app.use(express.static(publicPath));
    app.use(express.static(browserPath));
    app.use(express.static(vendorPath));
    app.use(express.static(videoPath));
    app.use(express.static(imagePath));

};
