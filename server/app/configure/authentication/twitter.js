'use strict';

var passport = require('passport');
var TwitterStrategy = require('passport-twitter').Strategy;
var mongoose = require('mongoose');
var UserModel = mongoose.model('User');

module.exports = function (app) {

    var twitterConfig = app.getValue('env').TWITTER;

    var twitterCredentials = {
        consumerKey: twitterConfig.consumerKey,
        consumerSecret: twitterConfig.consumerSecret,
        callbackUrl: twitterConfig.callbackUrl,
        passReqToCallback : true
    };

    //var createNewUser = function (token, tokenSecret, profile) {
    //    console.log(token, tokenSecret);
    //    return UserModel.create({
    //        twitter: {
    //            id: profile.id,
    //            username: profile.username,
    //            token: token,
    //            tokenSecret: tokenSecret
    //        }
    //    });
    //};
    //
    //var updateUserCredentials = function (user, token, tokenSecret, profile) {
    //
    //    user.twitter.token = token;
    //    user.twitter.tokenSecret = tokenSecret;
    //    user.twitter.username = profile.username;
    //
    //    return user.save();
    //
    //};
    //
    //var verifyCallback = function (token, tokenSecret, profile, done) {
    //
    //    UserModel.findOne({'twitter.id': profile.id}).exec()
    //        .then(function (user) {
    //            if (user) { // If a user with this twitter id already exists.
    //                return updateUserCredentials(user, token, tokenSecret, profile);
    //            } else { // If this twitter id has never been seen before and no user is attached.
    //                return createNewUser(token, tokenSecret, profile);
    //            }
    //        }).then(function (user) {
    //            done(null, user);
    //        }, function (err) {
    //            console.error('Error creating user from Twitter authentication', err);
    //            done(err);
    //        });
    //
    //};

    var verifyCallback = function(req, token, tokenSecret, profile, done) {

        // asynchronous
        process.nextTick(function() {

            // check if the user is already logged in
            if (!req.user) {
                UserModel.findOne({ 'twitter.id' : profile.id }, function(err, user) {
                    if (err)
                        return done(err);
                    if (user) {
                        // if there is a user id already but no token (user was linked at one point and then removed)
                        if (!user.twitter.token) {
                            user.twitter.token = token;
                            user.twitter.username = profile.username;
                            user.twitter.displayName = profile.displayName;
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
                        newUser.twitter.id = profile.id;
                        newUser.twitter.token = token;
                        newUser.twitter.username = profile.username;
                        newUser.twitter.displayName = profile.displayName;
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
                user.twitter.id = profile.id;
                user.twitter.token = token;
                user.twitter.username = profile.username;
                user.twitter.displayName = profile.displayName;
                user.save(function(err) {
                    if (err)
                        return done(err);

                    return done(null, user);
                });
            }

        });

    };

    passport.use(new TwitterStrategy(twitterCredentials, verifyCallback));

    //app.get('/auth/twitter', passport.authenticate('twitter'));
    //
    //app.get('/auth/twitter/callback',
    //    passport.authenticate('twitter', {failureRedirect: '/login'}),
    //    function (req, res) {
    //        res.redirect('/');
    //    });

    // send to twitter to do the authentication
    app.get('/auth/twitter', passport.authenticate('twitter', { scope : 'email' }));

    // handle the callback after twitter has authenticated the user
    app.get('/auth/twitter/callback',
        passport.authenticate('twitter', {
            successRedirect : '/',
            failureRedirect : '/login'
        }));
};
