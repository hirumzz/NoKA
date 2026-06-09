'use strict';

var _ = require('lodash');

/**
 * KongaComment.js
 *
 * Model to store comments on Routes and Services.
 */
var defaultModel = _.merge(_.cloneDeep(require('../base/Model')), {
  tableName: "konga_comments",
  autoPK: false,
  attributes: {
    id: {
      type: 'integer',
      primaryKey: true,
      unique: true,
      autoIncrement: true
    },
    referenceId: {
      type: 'string', // The route ID or service ID
      required: true
    },
    referenceType: {
      type: 'string', // 'route' or 'service'
      required: true,
      enum: ['route', 'service']
    },
    content: {
      type: 'text',
      required: true
    },
    user: {
      model: 'user', // The user who made the comment
      required: true
    }
  }
});

if (sails.config.models.connection == 'postgres' && process.env.DB_PG_SCHEMA) {
  defaultModel.meta = {
    schemaName: process.env.DB_PG_SCHEMA
  }
}

module.exports = defaultModel;
