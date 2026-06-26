'use strict';

var _ = require("lodash");

module.exports = _.merge(_.cloneDeep(require('../base/Controller')), {
  find: function (req, res) {
    // Verify Origin/Referer header to ensure it comes from our frontend
    var allowedHost = req.get('host');
    var referer = req.get('referer') || '';
    var origin = req.get('origin') || '';

    var refererValid = referer.indexOf(allowedHost) > -1;
    var originValid = origin ? origin.indexOf(allowedHost) > -1 : true;

    if (!refererValid || !originValid) {
      return res.forbidden({ message: 'Forbidden - Unauthorized client origin.' });
    }

    // Call base find action
    return this.find(req, res);
  }
});
