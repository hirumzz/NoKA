'use strict';

var _ = require('lodash');

/**
 * KongaNotification.js
 *
 * Stores notifications for all users (broadcast notifications).
 */
var defaultModel = _.merge(_.cloneDeep(require('../base/Model')), {
  tableName: "konga_notifications",
  autoPK: false,
  attributes: {
    id: {
      type: 'integer',
      primaryKey: true,
      unique: true,
      autoIncrement: true
    },
    message: {
      type: 'text',
      required: true
    },
    icon: {
      type: 'string',
      defaultsTo: 'mdi-message-outline'
    },
    state: {
      type: 'string',
      defaultsTo: ''
    },
    stateParams: {
      type: 'json',
      defaultsTo: {}
    },
    user: {
      model: 'user'
    }
  }
});

if (sails.config.models.connection == 'postgres' && process.env.DB_PG_SCHEMA) {
  defaultModel.meta = {
    schemaName: process.env.DB_PG_SCHEMA
  };
}

module.exports = defaultModel;
