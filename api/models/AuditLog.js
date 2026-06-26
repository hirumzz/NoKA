'use strict';

var _ = require('lodash');

var defaultModel = _.merge(_.cloneDeep(require('../base/Model')), {
  tableName: "konga_audit_logs",
  autoPK: false,
  attributes: {
    id: {
      type: 'integer',
      primaryKey: true,
      unique: true,
      autoIncrement: true
    },
    ip_address: {
      type: 'string',
      required: true
    },
    user_id: {
      type: 'integer'
    },
    username: {
      type: 'string',
      defaultsTo: 'anonymous'
    },
    action: {
      type: 'string',
      required: true
    },
    entity: {
      type: 'string',
      required: true
    },
    url: {
      type: 'string',
      required: true
    },
    payload: {
      type: 'json'
    },
    kong_node_name: {
      type: 'string',
      defaultsTo: ''
    }
  }
});

var mongoModel = function () {
  var obj = _.cloneDeep(defaultModel)
  delete obj.autoPK
  delete obj.attributes.id
  return obj;
}

if (sails.config.models.connection == 'postgres' && process.env.DB_PG_SCHEMA) {
  defaultModel.meta = {
    schemaName: process.env.DB_PG_SCHEMA
  }
}

module.exports = sails.config.models.connection == 'mongo' ? mongoModel() : defaultModel
