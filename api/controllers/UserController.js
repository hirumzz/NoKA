'use strict';

var _ = require('lodash');
var EventService = require('../services/EventService');

/**
 * UserController
 *
 * @description :: Server-side logic for managing Users
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */
module.exports = _.merge(_.cloneDeep(require('../base/Controller')), {



    subscribe: function(req, res) {

        if (!req.isSocket) {
            sails.log.error("UserController:subscribe failed")
            return res.badRequest('Only a client socket can subscribe.');
        }

        var roomName = 'user.' + req.param("id") + '.updated';
        sails.sockets.join(req.socket, roomName);
        res.json({
            room: roomName
        });
    },

    create: function(req, res) {
        var user = req.body;
        var passports = req.body.passports;
        delete user.passports;
        delete user.password_confirmation;

        if (user.role) {
            user.admin = (user.role === 'admin');
        } else {
            user.role = user.admin ? 'admin' : 'viewer';
        }

        sails.models.user.create(user).exec(function(err, created) {
            if (err) return res.negotiate(err);

            // Broadcast user creation
            EventService.broadcast(req, 'user', 'create', created);

            if (passports && passports.password) {
                sails.models.passport.create({
                    protocol: 'local',
                    password: passports.password,
                    user: created.id
                }).exec(function(err, passport) {
                    if (err) return res.negotiate(err);
                    return res.json(created);
                });
            } else {
                return res.json(created);
            }
        });
    },

    destroy: function(req, res) {
        var id = req.param('id');
        sails.models.user.findOne({id: id}).exec(function(err, user) {
            if (err) return res.negotiate(err);
            if (!user) return res.notFound();

            sails.models.user.destroy({id: id}).exec(function(err) {
                if (err) return res.negotiate(err);

                // Delete passports
                sails.models.passport.destroy({user: id}).exec(function(err) {
                    // Broadcast user deletion
                    EventService.broadcast(req, 'user', 'destroy', user);
                    return res.json(user);
                });
            });
        });
    },

    update : function(req,res) {

        sails.log(req.body)

        var user = req.body;
        var passports = req.body.passports

        // Delete unwanted properties
        delete user.passports
        delete user.password_confirmation

        if (user.role) {
            user.admin = (user.role === 'admin');
        }

        sails.models.user
            .update({id : req.param('id')},user)
            .exec(function(err,updated){
                if(err) return res.negotiate(err);

                var user = updated[0];

                if(!user) {
                  return  res.json()
                }

                // Broadcast user update
                EventService.broadcast(req, 'user', 'update', user);

                if(user.node) {
                    sails.models.kongnode
                        .findOne({id : user.node})
                        .exec(function(err,node){
                            if(err) return res.negotiate(err)
                            user.node = node;
                            sails.sockets.blast('user.' + user.id + '.updated', user);
                        })
                }else{
                    sails.sockets.blast('user.' + user.id + '.updated', user);
                }


                if(!passports || !passports.password) return res.json(user)

                sails.models.passport
                    .update({user:req.param('id')},{password:passports.password})
                    .exec(function(err,updatedPassport){
                        if(err) return res.negotiate(err);
                        
                        if (!updatedPassport || updatedPassport.length === 0) {
                            // Passport does not exist yet, create it!
                            sails.models.passport
                                .create({
                                    protocol: 'local',
                                    password: passports.password,
                                    user: req.param('id')
                                })
                                .exec(function(err, createdPassport){
                                    if(err) return res.negotiate(err);
                                    return res.json(user);
                                });
                        } else {
                            return res.json(user);
                        }
                    })



        })
    }
});
