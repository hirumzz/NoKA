'use strict';

/**
 * KongaNotificationController
 *
 * Handles fetching notifications for all users (polling-based).
 */
module.exports = {
  find: function(req, res) {
    var since = req.param('since');
    var criteria = {};

    if (since) {
      criteria.createdAt = { '>': new Date(parseInt(since)) };
    }

    sails.models.konganotification.find(criteria)
      .populate('user')
      .sort('createdAt DESC')
      .limit(50)
      .exec(function(err, notifications) {
        if (err) return res.negotiate(err);
        return res.json(notifications);
      });
  },

  create: function(req, res) {
    var data = req.body;
    data.user = req.token;

    sails.models.konganotification.create(data).exec(function(err, created) {
      if (err) return res.negotiate(err);
      return res.json(created);
    });
  }
};
