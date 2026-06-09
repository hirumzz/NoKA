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

    sails.models.user.findOne({ id: req.token }).exec(function(err, user) {
      if (err) return res.negotiate(err);
      if (!user) return res.forbidden({ message: 'User not found' });

      if (user.role === 'viewer' && !user.admin) {
        return res.forbidden({ message: 'Forbidden - Viewers cannot write comments' });
      }

      sails.models.kongacomment.create(data).exec(function(err, created) {
        if (err) return res.negotiate(err);

        sails.models.user.findOne({ id: req.token }).exec(function(err, populatedUser) {
          created.user = populatedUser;

          var username = populatedUser ? (populatedUser.username || populatedUser.firstName || 'User') : 'User';
          var msg = username + " commented on " + data.referenceType + ": " + data.content.substring(0, 50);

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

  update: function(req, res) {
    var commentId = req.param('id');
    var content = req.body.content;

    if (!commentId || !content) {
      return res.badRequest({ message: 'Missing comment id or content' });
    }

    sails.models.kongacomment.findOne({ id: commentId }).populate('user').exec(function(err, comment) {
      if (err) return res.negotiate(err);
      if (!comment) return res.notFound({ message: 'Comment not found' });

      // Only the comment owner can edit
      var commentUserId = comment.user ? (comment.user.id || comment.user) : comment.user;
      if (commentUserId != req.token) {
        return res.forbidden({ message: 'You can only edit your own comments' });
      }

      sails.models.kongacomment.update({ id: commentId }, { content: content }).exec(function(err, updated) {
        if (err) return res.negotiate(err);

        var updatedComment = updated[0];

        sails.models.user.findOne({ id: req.token }).exec(function(err, actingUser) {
          var username = actingUser ? (actingUser.username || actingUser.firstName || 'User') : 'User';
          var msg = username + " edited a comment on " + comment.referenceType;

          sails.sockets.broadcast('konga-events', 'konga.event', {
            type: 'info',
            message: msg,
            icon: 'mdi-comment-text-outline',
            entity: 'comment',
            action: 'update',
            user: username,
            referenceId: comment.referenceId,
            referenceType: comment.referenceType,
            state: comment.referenceType === 'route' ? 'routes.read' : (comment.referenceType === 'service' ? 'services.read' : 'consumers.edit'),
            stateParams: comment.referenceType === 'route' ? { route_id: comment.referenceId } : (comment.referenceType === 'service' ? { service_id: comment.referenceId } : { id: comment.referenceId }),
            timestamp: Date.now()
          });

          // Return populated comment
          sails.models.kongacomment.findOne({ id: commentId }).populate('user').exec(function(err, populatedComment) {
            return res.json(populatedComment || updatedComment);
          });
        });
      });
    });
  },

  destroy: function(req, res) {
    var commentId = req.param('id');

    if (!commentId) {
      return res.badRequest({ message: 'Missing comment id' });
    }

    sails.models.kongacomment.findOne({ id: commentId }).populate('user').exec(function(err, comment) {
      if (err) return res.negotiate(err);
      if (!comment) return res.notFound({ message: 'Comment not found' });

      // Check permissions: owner can delete their own, admin can delete any
      sails.models.user.findOne({ id: req.token }).exec(function(err, actingUser) {
        if (err) return res.negotiate(err);
        if (!actingUser) return res.forbidden({ message: 'User not found' });

        var commentUserId = comment.user ? (comment.user.id || comment.user) : comment.user;
        var isOwner = (commentUserId == req.token);
        var isAdmin = (actingUser.admin || actingUser.role === 'admin');

        if (!isOwner && !isAdmin) {
          return res.forbidden({ message: 'Only the comment owner or an admin can delete comments' });
        }

        sails.models.kongacomment.destroy({ id: commentId }).exec(function(err) {
          if (err) return res.negotiate(err);

          var username = actingUser.username || actingUser.firstName || 'User';
          var msg = username + " deleted a comment on " + comment.referenceType;

          sails.sockets.broadcast('konga-events', 'konga.event', {
            type: 'warning',
            message: msg,
            icon: 'mdi-comment-remove-outline',
            entity: 'comment',
            action: 'destroy',
            user: username,
            referenceId: comment.referenceId,
            referenceType: comment.referenceType,
            state: comment.referenceType === 'route' ? 'routes.read' : (comment.referenceType === 'service' ? 'services.read' : 'consumers.edit'),
            stateParams: comment.referenceType === 'route' ? { route_id: comment.referenceId } : (comment.referenceType === 'service' ? { service_id: comment.referenceId } : { id: comment.referenceId }),
            timestamp: Date.now()
          });

          return res.json({ message: 'Comment deleted', id: commentId });
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
