'use strict';

/**
 * Policy to check if user is admin or developer role.
 */
module.exports = function isAdminOrDeveloper(request, response, next) {
  sails.models.user.findOne({ id: request.token }).exec(function(err, user) {
    if (err || !user) {
      return response.forbidden({ message: 'User not found' });
    }
    var role = user.role || (user.admin ? 'admin' : 'viewer');
    if (role === 'admin' || role === 'developer') {
      return next();
    }
    return response.forbidden({ message: 'Forbidden - Only admins and developers can perform this action.' });
  });
};
