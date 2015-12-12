'use strict';
var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;
var mongoose = require('mongoose');
var UserModel = mongoose.model('User');

module.exports = function (app) {

    var facebookConfig = app.getValue('env').FACEBOOK;
    var facebookCredentials = {
        clientID: facebookConfig.clientID,
        clientSecret: facebookConfig.clientSecret,
        callbackURL: facebookConfig.callbackURL,
        profileFields: ['id', 'name','picture.type(large)', 'emails', 'displayName', 'gender']
    };

    //var verifyCallback = function (accessToken, refreshToken, profile, done) {
    //    process.nextTick(function(){
    //        UserModel.findOne({ 'facebook.id': profile.id }).exec()
    //            .then(function (user) {
    //                if (user) {
    //                    return user;
    //                } else {
    //                    return UserModel.create({
    //                        facebook: {
    //                            id: profile.id,
    //                            token: accessToken,
    //                            name: profile.name.givenName+' '+profile.name.familyName,
    //                            email: profile.emails[0]
    //                        }
    //                    });
    //                }
    //
    //            }).then(function (userToLogin) {
    //            done(null, userToLogin);
    //        }, function (err) {
    //            console.error('Error creating user from Facebook authentication', err);
    //            done(err);
    //        });
    //    });
    //};
    var verifyCallback = function(req, token, refreshToken, profile, done) {
        // asynchronous

        console.log(arguments);
        if(!token && refreshToken){
            token = refreshToken.access_token;
        }
        process.nextTick(function() {

            // check if the user is already logged in
            if (!req.user) {

                UserModel.findOne({ 'facebook.id' : profile.id }, function(err, user) {
                    if (err)
                        return done(err);

                    if (user) {

                        // if there is a user id already but no token (user was linked at one point and then removed)
                        if (!user.facebook.token) {
                            user.facebook.token = token;
                            user.facebook.name = profile.name.givenName + ' ' + profile.name.familyName;
                            user.save(function(error) {
                                if (error)
                                    return done(error);
                                return done(null, user);
                            });
                        }
                        return done(null, user); // user found, return that user
                    } else {
                        // if there is no user, create them
                        var newUser = new UserModel();
                        newUser.userName = profile.displayName;
                        newUser.gender = profile.gender;
                        newUser.firstName = profile.name.givenName;
                        newUser.lastName = profile.name.lastName;
                        newUser.facebook.id = profile.id;
                        newUser.facebook.token = token;
                        newUser.profilePicture = profile.photos[0].value;
                        newUser.facebook.displayName = profile.displayName;
                        newUser.save(function(error) {
                            if (error)
                                return done(error);

                            return done(null, newUser);
                        });
                    }
                });
            } else {
                // user already exists and is logged in, we have to link accounts
                var user = req.user; // pull the user out of the session
                user.userName = profile.displayName;
                user.gender = profile.gender;
                user.firstName = profile.name.givenName;
                user.lastName = profile.name.lastName;
                user.profilePicture = profile.photos[0].value;
                user.facebook.id = profile.id;
                user.facebook.token = token;
                user.facebook.displayName = profile.displayName;

                user.save(function(err) {
                    if (err)
                        return done(err);

                    return done(null, user);
                });

            }
        });

    };

    passport.use(new FacebookStrategy(facebookCredentials, verifyCallback));

    app.get('/auth/facebook', passport.authenticate('facebook', {scope: 'user_friends'}));

    app.get('/auth/facebook/callback',
        passport.authenticate('facebook', { failureRedirect: '/login' }),
        function (req, res) {
            res.redirect('/');
        });

    //app.get('/auth/facebook', passport.authenticate('facebook', { scope : 'email' }));
    //
    //// handle the callback after facebook has authenticated the user
    //app.get('/auth/facebook/callback',
    //    passport.authenticate('facebook', {
    //        successRedirect : '/',
    //        failureRedirect : '/login'
    //    }));

};
