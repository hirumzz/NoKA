'use strict';

/**
 * HTTP Server Settings
 * (sails.config.http)
 *
 * Configuration for the underlying HTTP server in Sails.
 * Only applies to HTTP requests (not WebSockets)
 *
 * For more information on configuration, check out:
 * http://sailsjs.org/#/documentation/reference/sails.config/sails.config.http.html
 */

module.exports.http = {
  /****************************************************************************
   *                                                                           *
   * Express middleware to use for every Sails request. To add custom          *
   * middleware to the mix, add a function to the middleware config object and *
   * add its key to the "order" array. The $custom key is reserved for         *
   * backwards-compatibility with Sails v0.9.x apps that use the               *
   * `customMiddleware` config option.                                         *
   *                                                                           *
   ****************************************************************************/
  middleware: {
    protectStatic: function(req, res, next) {
      if (process.env.NO_AUTH === 'true') {
        return next();
      }

      var path = (req.path || req.url || '').toLowerCase();
      // Protect any client-side assets under /js/app/ except app.js and core framework files (auth/layout/etc)
      if (path.startsWith('/js/app/') && !path.startsWith('/js/app/core/') && path !== '/js/app/app.js') {
        var token = '';
        if (req.headers && req.headers.authorization) {
          var parts = req.headers.authorization.split(' ');
          if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
            token = parts[1];
          }
        } else if (req.query && req.query.token) {
          token = req.query.token;
        }

        if (!token) {
          return res.status(401).json({ message: 'Authorization token is required' });
        }

        if (typeof sails !== 'undefined' && sails.services && sails.services.token) {
          sails.services.token.verify(token, function(err, decoded) {
            if (err || decoded === -1) {
              return res.status(401).json({ message: 'Invalid authorization token' });
            }
            return next();
          });
        } else {
          return res.status(500).json({ message: 'Sails token service not initialized' });
        }
      } else {
        return next();
      }
    },

    /***************************************************************************
     *                                                                          *
     * The order in which middleware should be run for HTTP request. (the Sails *
     * router is invoked by the "router" middleware below.)                     *
     *                                                                          *
     ***************************************************************************/
    order: [
      'startRequestTimer',
      'cookieParser',
      'session',
      'bodyParser',
      'handleBodyParserError',
      'compress',
      'methodOverride',
      'poweredBy',
      '$custom',
      'router',
      'protectStatic',
      'www',
      'favicon',
      '404',
      '500'
    ]

    /***************************************************************************
     *                                                                          *
     * The body parser that will handle incoming multipart HTTP requests. By    *
     * default as of v0.10, Sails uses                                          *
     * [skipper](http://github.com/balderdashy/skipper). See                    *
     * http://www.senchalabs.org/connect/multipart.html for other options.      *
     *                                                                          *
     ***************************************************************************/
    //bodyParser: require('skipper')
  },

  /***************************************************************************
   *                                                                          *
   * The number of seconds to cache flat files on disk being served by        *
   * Express static middleware (by default, these files are in `.tmp/public`) *
   *                                                                          *
   * The HTTP static cache is only active in a 'production' environment,      *
   * since that's the only time Express will cache flat-files.                *
   *                                                                          *
   ***************************************************************************/
  cache: 31557600000
};
