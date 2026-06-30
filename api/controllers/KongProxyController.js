/**
 * RemoteApiController
 */

var unirest = require("unirest");
var KongService = require("../services/KongService");
var ProxyHooks = require("../services/KongProxyHooks");
var _ = require("lodash");
var Utils = require('../helpers/utils');
var EventService = require('../services/EventService');


function getEntityFromRequest(req) {
  if(!req.path) return null;
  return req.path.replace('/kong', '').split("/").filter(function (e) {
    return e;
  })[0];
}

var self = module.exports = {


  /**
   * Proxy requests to native Kong Admin API
   * @param req
   * @param res
   */
  proxy: function (req, res) {

    req.url = req.url.replace('/kong', ''); // Remove the /kong prefix
    var entity = getEntityFromRequest(req);

    // Enforce role-based access control (RBAC) for Kong write operations
    if (req.method.toLowerCase() !== 'get') {
      var userId = req.token;
      if (userId && userId !== 'noauth') {
        return sails.models.user.findOne({ id: userId }).exec(function(err, user) {
          if (err || !user) {
            return res.forbidden({ message: 'Forbidden - User not found.' });
          }

          var role = user.role || (user.admin ? 'admin' : 'viewer');

          // Viewers and commenters cannot perform any write operations on Kong
          if (role === 'viewer' || role === 'commenter') {
            return res.forbidden({ message: 'Forbidden - You do not have permission to perform this action.' });
          }

          // Developers can create and update, but cannot delete
          if (role === 'developer' && req.method.toLowerCase() === 'delete') {
            return res.forbidden({ message: 'Forbidden - Developers cannot delete resources.' });
          }

          return proceed();
        });
      }
    }

    return proceed();

    function proceed() {
      sails.log.debug("KongProxyController:req.method", req.method)
      sails.log.debug("KongProxyController:req.url", req.url)
      sails.log.debug("KongProxyController:entity", entity)

      // Fix update method by setting it to "PATCH" as Kong requires
      if (req.method.toLowerCase() === 'put') {
        req.method = "PATCH";
      }


      if (!req.connection) {
        return res.badRequest({
          message: 'No Kong connection is defined'
        });
      }

      sails.log("Kong admin url =>", req.connection.kong_admin_url);

      var request = unirest[req.method.toLowerCase()](req.connection.kong_admin_url + req.url)

      // Assign Konga correlations to a var if set in the request
      var konga_extras;
      if(req.body) {
        if(req.body.extras) {
          konga_extras = req.body.extras;
          // Remove the correlations attribute so that we don't break the request to Kong.
          // If we need them later, they will be available in the `konga_extras` var
          delete req.body.extras;
        }
        delete req.body._readOnly;
      }

      // Set the appropriate request headers
      request.headers(KongService.headers(req.connection, true))

      // Apply monkey patches
      if (['post', 'put', 'patch'].indexOf(req.method.toLowerCase()) > -1) {

        if (req.body && req.body.orderlist) {
          for (var i = 0; i < req.body.orderlist.length; i++) {
            try {
              req.body.orderlist[i] = parseInt(req.body.orderlist[i])
            } catch (err) {
              return res.badRequest({
                body: {
                  message: 'Ordelist entities must be integers'
                }
              });
            }
          }
        }
      }

      // Apply before Hooks
      switch(req.method.toLowerCase()) {
        case "patch":
          return ProxyHooks.beforeEntityUpdate(entity, req.param("id"), req.connection.id, _.merge(req.body,{extras: konga_extras}), function (err, data) {
            if(err) return res.badRequest(err);
            req.body = data; // Assign the resulting data to req.body
            return self.send(entity, request, konga_extras, req, res)
          });
        default:
          return self.send(entity, request, konga_extras,  req, res);
      }
    }

  },


  /**
   * All GET methods to Kong will be using this methods
   * starting from Kong 1.x due to Kong's limitations on listing size
   * @param req
   * @param res
   */
  listProxy: (req, res) => {
    req.url = req.url.replace('/kong', ''); // Remove the /kong prefix
    const entity = req.params.entity;

    sails.log.debug("KongProxyController:listAllEntityRecords:req.method", req.method)
    sails.log.debug("KongProxyController:listAllEntityRecords:req.url", req.url)
    sails.log.debug("KongProxyController:listAllEntityRecords:entity", entity)

    KongService.listAllCb(req, req.url, (err, data) => {
      if(err) return res.negotiate(err);
      return res.json(data);
    })
  },

  /**
   * Actually send the request to Kong
   * @param entity
   * @param unirestReq
   * @param konga_extras
   * @param req
   * @param res
   */
  send: function (entity, unirestReq, konga_extras, req, res) {

    // Clean up the mess
    // delete req.body.token;

    unirestReq.send(req.body);

    unirestReq.end(function (response) {
      if (response.error) {
        sails.log.error("KongProxyController", "request error", response.body);
        return res.negotiate(response);
      }

      // Save to Audit Log for successful write operations (POST, PUT, PATCH, DELETE)
      if (req.method.toLowerCase() !== 'get') {
        var clientIp = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.ip || (req.socket && req.socket.remoteAddress) || '127.0.0.1';
        var username = 'anonymous';
        var userId = req.token;

        var saveLog = function(usrName) {
          sails.models.auditlog.create({
            ip_address: clientIp,
            user_id: userId && userId !== 'noauth' ? parseInt(userId) : null,
            username: usrName,
            action: req.method,
            entity: entity || 'unknown',
            url: req.url,
            payload: req.body || null,
            kong_node_name: req.connection ? req.connection.name : ''
          }).exec(function(err, created) {
            if (err) {
              sails.log.error("Failed to save audit log:", err);
            }
          });
        };

        if (userId && userId !== 'noauth') {
          sails.models.user.findOne({ id: userId }).exec(function(err, user) {
            if (!err && user) {
              username = user.username || user.email || 'user-' + userId;
            }
            saveLog(username);
          });
        } else {
          saveLog(username);
        }
      }

      // Apply after Hooks
      switch(req.method.toLowerCase()) {
        case "get":
          return ProxyHooks.afterEntityRetrieve(entity, req, response.body, function (err, data) {
            if(err) return res.badRequest(err);
            return res.json(data);
          });
        case "post":
          return ProxyHooks.afterEntityCreate(entity, req, response.body, konga_extras || {}, function (err, data) {
            if(err) return res.badRequest(err);
            EventService.broadcast(req, entity, 'create', data);
            return res.json(data);
          });
        case "delete":
          return ProxyHooks.afterEntityDelete(entity,req,function (err) {
            if(err) return res.badRequest(err);
            var parts = req.url.split('/').filter(Boolean);
            var deletedId = parts[1] || req.param("id") || '';
            EventService.broadcast(req, entity, 'delete', { id: deletedId });
            return res.json(response);
          });
        default:
          var resBody = response.body;
          if (req.method.toLowerCase() === 'patch' || req.method.toLowerCase() === 'put') {
            EventService.broadcast(req, entity, 'update', resBody);
          }
          return res.json(resBody);
      }


    });
  },

  prometheusMetrics: function (req, res) {
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');

    if (!req.connection) {
      return res.badRequest({
        message: 'No Kong connection is defined'
      });
    }

    var metricsUrl = Utils.withoutTrailingSlash(req.connection.kong_admin_url) + "/metrics";
    sails.log.debug("KongProxyController:prometheusMetrics calling =>", metricsUrl);

    unirest.get(metricsUrl)
      .headers(KongService.headers(req.connection, true))
      .end(function (response) {
        if (response.error) {
          sails.log.error("KongProxyController:prometheusMetrics error fetching metrics:", response.error);
          return res.json({
            success: false,
            message: "Prometheus plugin is not enabled or not reachable on this node"
          });
        }

        try {
          var text = response.body;
          if (typeof text !== 'string') {
            text = JSON.stringify(text);
          }

          var parsed = parsePrometheus(text);
          return res.json(_.merge({ success: true }, parsed));
        } catch (err) {
          sails.log.error("KongProxyController:prometheusMetrics error parsing metrics:", err);
          return res.negotiate(err);
        }
      });
  }
};

function parsePrometheus(text) {
  var lines = text.split('\n');
  var httpRequests = [];
  var latencySum = {};
  var latencyCount = {};

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line || line.indexOf('#') === 0) continue;

    var match = line.match(/^([a-zA-Z_0-9]+)({([^}]+)})?\s+([0-9.eE+\-]+)$/);
    if (!match) continue;

    var name = match[1];
    var labelsStr = match[3] || '';
    var value = parseFloat(match[4]);

    var labels = {};
    if (labelsStr) {
      var regex = /([a-zA-Z_0-9]+)="([^"]*)"/g;
      var labelMatch;
      while ((labelMatch = regex.exec(labelsStr)) !== null) {
        labels[labelMatch[1]] = labelMatch[2];
      }
    }

    if (name === 'kong_http_requests_total') {
      httpRequests.push({
        service: labels.service || 'unknown',
        route: labels.route || 'unknown',
        code: labels.code || 'unknown',
        count: value
      });
    } else if (name === 'kong_request_latency_ms_sum') {
      var key = (labels.service || 'unknown') + ':' + (labels.route || 'unknown');
      latencySum[key] = value;
    } else if (name === 'kong_request_latency_ms_count') {
      var key = (labels.service || 'unknown') + ':' + (labels.route || 'unknown');
      latencyCount[key] = value;
    }
  }

  var hitsByEndpoint = {};
  var totalRequests = 0;
  var statusCodes = {
    '2xx': 0,
    '3xx': 0,
    '4xx': 0,
    '5xx': 0
  };
  for (var j = 0; j < httpRequests.length; j++) {
    var req = httpRequests[j];
    var key = req.route !== 'unknown' ? req.route : (req.service !== 'unknown' ? req.service : 'unknown');
    hitsByEndpoint[key] = (hitsByEndpoint[key] || 0) + req.count;
    totalRequests += req.count;

    var code = req.code;
    if (code && code.length > 0) {
      var firstChar = code.charAt(0);
      if (firstChar === '2') {
        statusCodes['2xx'] += req.count;
      } else if (firstChar === '3') {
        statusCodes['3xx'] += req.count;
      } else if (firstChar === '4') {
        statusCodes['4xx'] += req.count;
      } else if (firstChar === '5') {
        statusCodes['5xx'] += req.count;
      }
    }
  }

  var sortedHits = Object.keys(hitsByEndpoint).map(function(endpoint) {
    return {
      endpoint: endpoint,
      hits: hitsByEndpoint[endpoint]
    };
  }).sort(function(a, b) {
    return b.hits - a.hits;
  });

  var latencies = [];
  var keys = Object.keys(latencyCount);
  for (var k = 0; k < keys.length; k++) {
    var key = keys[k];
    var count = latencyCount[key];
    var sum = latencySum[key] || 0;
    var avg = count > 0 ? (sum / count) : 0;
    
    var parts = key.split(':');
    var serviceName = parts[0];
    var routeName = parts[1];
    var endpoint = routeName !== 'unknown' ? routeName : (serviceName !== 'unknown' ? serviceName : 'unknown');

    latencies.push({
      endpoint: endpoint,
      avgLatency: parseFloat(avg.toFixed(2)),
      count: count
    });
  }

  var sortedLatencies = latencies.sort(function(a, b) {
    return b.avgLatency - a.avgLatency;
  });

  return {
    totalRequests: totalRequests,
    topHits: sortedHits.slice(0, 10),
    slowestEndpoints: sortedLatencies.slice(0, 10),
    statusCodes: statusCodes
  };
}