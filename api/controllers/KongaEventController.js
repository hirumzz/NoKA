'use strict';

/**
 * KongaEventController
 *
 * Controller to handle event room subscription requests.
 */
module.exports = {
  subscribe: function(req, res) {
    if (!req.isSocket) {
      sails.log.error("KongaEventController:subscribe failed - Not a socket request.");
      return res.badRequest('Only a client socket can subscribe.');
    }

    var roomName = 'konga-events';
    sails.sockets.join(req.socket, roomName);
    
    return res.json({
      room: roomName
    });
  }
};
