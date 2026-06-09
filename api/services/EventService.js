'use strict';

/**
 * EventService
 *
 * Global service to broadcast changes on User, Setting, Connection, Consumer, Route, and Service entities.
 */
module.exports = {
  broadcast: function(req, entity, action, data) {
    // Normalize entity
    var normalizedEntity = entity;
    if (entity === 'consumers' || entity === 'consumer') normalizedEntity = 'consumer';
    else if (entity === 'routes' || entity === 'route') normalizedEntity = 'route';
    else if (entity === 'services' || entity === 'service') normalizedEntity = 'service';
    else if (entity === 'settings' || entity === 'setting') normalizedEntity = 'setting';
    else if (entity === 'kongnodes' || entity === 'connection') normalizedEntity = 'connection';
    else if (entity === 'users' || entity === 'user') normalizedEntity = 'user';

    var userId = req ? req.token : null;
    var username = 'System';

    if (userId && userId !== 'noauth') {
      sails.models.user.findOne({ id: userId }).exec(function(err, user) {
        if (user) {
          username = user.username || user.firstName || 'User';
        }
        sendBroadcast(username);
      });
    } else {
      if (userId === 'noauth') {
        username = 'noauth';
      }
      sendBroadcast(username);
    }

    function sendBroadcast(userPerforming) {
      var msg = '';
      var name = data ? (data.username || data.name || data.email || data.custom_id || data.id || '') : '';
      var actionLabel = action === 'destroy' || action === 'delete' ? 'deleted' : (action === 'create' ? 'created' : 'updated');

      switch (normalizedEntity) {
        case 'user':
          msg = "User '" + userPerforming + "' " + actionLabel + " user '" + name + "'";
          break;
        case 'setting':
          msg = "User '" + userPerforming + "' updated settings";
          break;
        case 'connection':
          msg = "User '" + userPerforming + "' " + actionLabel + " connection '" + name + "'";
          break;
        case 'consumer':
          msg = "User '" + userPerforming + "' " + actionLabel + " consumer '" + name + "'";
          break;
        case 'route':
          msg = "User '" + userPerforming + "' " + actionLabel + " route '" + name + "'";
          break;
        case 'service':
          msg = "User '" + userPerforming + "' " + actionLabel + " service '" + name + "'";
          break;
        default:
          msg = "User '" + userPerforming + "' " + actionLabel + " " + normalizedEntity + " '" + name + "'";
      }

      var type = 'info';
      if (action === 'create') {
        type = 'info';
      } else if (action === 'update') {
        type = 'warning';
      } else if (action === 'destroy' || action === 'delete') {
        type = 'alert';
      }

      var icon = 'mdi-message-outline';
      switch (normalizedEntity) {
        case 'user': icon = 'mdi-account'; break;
        case 'setting': icon = 'mdi-settings'; break;
        case 'connection': icon = 'mdi-cast-connected'; break;
        case 'consumer': icon = 'mdi-account-outline'; break;
        case 'route': icon = 'mdi-directions-fork'; break;
        case 'service': icon = 'mdi-cloud-outline'; break;
      }

      var state = '';
      var stateParams = {};
      if (action !== 'destroy' && action !== 'delete') {
        switch (normalizedEntity) {
          case 'user':
            state = 'users.show';
            stateParams = { id: data.id };
            break;
          case 'setting':
            state = 'settings';
            break;
          case 'connection':
            state = 'connections';
            break;
          case 'consumer':
            state = 'consumers.edit';
            stateParams = { id: data.id };
            break;
          case 'route':
            state = 'routes.read';
            stateParams = { route_id: data.id };
            break;
          case 'service':
            state = 'services.read';
            stateParams = { service_id: data.id };
            break;
        }
      } else {
        switch (normalizedEntity) {
          case 'user': state = 'users'; break;
          case 'consumer': state = 'consumers'; break;
          case 'route': state = 'routes'; break;
          case 'service': state = 'services'; break;
          case 'connection': state = 'connections'; break;
        }
      }

      sails.sockets.broadcast('konga-events', 'konga.event', {
        type: type,
        message: msg,
        icon: icon,
        entity: normalizedEntity,
        action: action,
        user: userPerforming,
        state: state,
        stateParams: stateParams,
        timestamp: Date.now()
      });
    }
  }
};
