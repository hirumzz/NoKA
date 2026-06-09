'use strict';

var _ = require('lodash');
var Kong = require("../services/KongService");
var EventService = require('../services/EventService');

module.exports = _.merge(_.cloneDeep(require('../base/Controller')), {

    subscribeHealthChecks: function(req, res) {

        if (!req.isSocket) {
            sails.log.error("KongNodeController:subscribe failed")
            return res.badRequest('Only a client socket can subscribe.');
        }

        var roomName = 'node.health_checks';
        sails.sockets.join(req.socket, roomName);
        res.json({
            room: roomName
        });
    },

    update : function(req,res){
        sails.models.kongnode.findOne({id:req.params.id}).exec(function afterwards(err, node){

            if (err) return res.negotiate(err);
            sails.models.kongnode.update({id:req.params.id},req.body).exec(function afterwards(err, resp){

                if (err) return res.negotiate(err);
                if (resp && resp.length) {
                    EventService.broadcast(req, 'connection', 'update', resp[0]);
                }
                if(req.body.active && node.active != req.body.active) {
                    sails.models.kongnode.update({
                        where: { id:{ '!': req.params.id } },

                    },{active:false}).exec(function afterwards(err, upd){
                        if (err) return res.negotiate(err);
                        return  res.json(resp[0])
                    })
                }else{
                    return  res.json(resp[0])
                }
            });
        });

    },


    destroy: function(req, res) {
        var id = req.param('id');
        sails.models.kongnode.findOne({id: id}).exec(function(err, node) {
            if (err) return res.negotiate(err);
            if (!node) return res.notFound();

            sails.models.kongnode.destroy({id: id}).exec(function(err) {
                if (err) return res.negotiate(err);
                EventService.broadcast(req, 'connection', 'destroy', node);
                return res.json(node);
            });
        });
    },

    create : function(req,res) {
        sails.models.kongnode.create(req.body)
            .exec(function(err, node){
                if(err) {
                    return res.negotiate(err);
                }

                if(process.env.NODE_ENV == 'test') {
                    EventService.broadcast(req, 'connection', 'create', node);
                    return res.created(node);
                }

                Kong.nodeInfo(node, function(err,info){

                    if(err) {
                        sails.log.error("KongNodeController:create","Failed to get node info",err)
                    }

                    if(info) {
                        sails.models.kongnode.update(node.id,{
                            kong_version : info.version
                        }).exec(function (err, _node) {
                            if(err) {
                                return res.negotiate(err);
                            }

                            EventService.broadcast(req, 'connection', 'create', _node[0] || _node);
                            return res.created(_node);
                        })
                    }else{
                        EventService.broadcast(req, 'connection', 'create', node);
                        return res.created(node);
                    }
                })
            })
    }
});
