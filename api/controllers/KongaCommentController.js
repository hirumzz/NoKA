'use strict';

/**
 * KongaCommentController
 *
 * Controller to handle comment CRUD operations on routes and services.
 */
module.exports = {
  create: function(req, res) {
    var data = req.body;
    data.user = req.token;

    if (!data.referenceId || !data.referenceType || !data.content) {
      return res.badRequest({ message: 'Missing required fields' });
    }

    // Retrieve user performing the action to check role
    sails.models.user.findOne({ id: req.token }).exec(function(err, user) {
      if (err) return res.negotiate(err);
      if (!user) return res.forbidden({ message: 'User not found' });

      // Enforce: only admin and commenter roles can write comments. Viewers cannot write comments unless they are admin.
      if (user.role === 'viewer' && !user.admin) {
        return res.forbidden({ message: 'Forbidden - Viewers cannot write comments' });
      }

      sails.models.kongacomment.create(data).exec(function(err, created) {
        if (err) return res.negotiate(err);

        // Find user to populate details on return payload
        sails.models.user.findOne({ id: req.token }).exec(function(err, populatedUser) {
          created.user = populatedUser;

          var username = populatedUser ? (populatedUser.username || populatedUser.firstName || 'User') : 'User';
          var msg = "User '" + username + "' commented on " + data.referenceType + ": " + data.content;

          // Broadcast comment created event
          sails.sockets.broadcast('konga-events', 'konga.event', {
            type: 'info',
            message: msg,
            icon: 'mdi-comment-text-outline',
            entity: 'comment',
            action: 'create',
            user: username,
            referenceId: data.referenceId,
            referenceType: data.referenceType,
            state: data.referenceType === 'route' ? 'routes.read' : (data.referenceType === 'service' ? 'services.read' : 'consumers.edit'),
            stateParams: data.referenceType === 'route' ? { route_id: data.referenceId } : (data.referenceType === 'service' ? { service_id: data.referenceId } : { id: data.referenceId }),
            timestamp: Date.now()
          });

          return res.json(created);
        });
      });
    });
  },

  find: function(req, res) {
    var referenceId = req.param('referenceId');
    var referenceType = req.param('referenceType');

    if (!referenceId || !referenceType) {
      return res.badRequest({ message: 'Missing parameters' });
    }

    sails.models.kongacomment.find({
      referenceId: referenceId,
      referenceType: referenceType
    })
    .populate('user')
    .sort('createdAt ASC')
    .exec(function(err, comments) {
      if (err) return res.negotiate(err);
      return res.json(comments);
    });
  }
};
