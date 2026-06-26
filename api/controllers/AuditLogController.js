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

    var actionUtil = require('sails/lib/hooks/blueprints/actionUtil');

    var criteria = actionUtil.parseCriteria(req);
    console.log("AUDIT LOG CRITERIA:", criteria);

    sails.models.auditlog.find()
      .where(criteria)
      .limit(actionUtil.parseLimit(req))
      .skip(actionUtil.parseSkip(req))
      .sort(actionUtil.parseSort(req))
      .exec(function(err, records) {
        if (err) {
          console.error("AUDIT LOG ERROR:", err);
          return res.negotiate(err);
        }
        console.log("AUDIT LOG RECORDS:", records);
        return res.json(records);
      });
  }
});
