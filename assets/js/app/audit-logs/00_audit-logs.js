(function() {
  'use strict';

  angular.module('frontend.audit-logs', []);

  angular.module('frontend.audit-logs')
    .config([
      '$stateProvider',
      function config($stateProvider) {
        $stateProvider
          .state('audit-logs', {
            url: '/audit-logs',
            parent: 'frontend',
            data: {
              access: 2, // Admin only access
              pageName: "Audit Logs",
              pageDescription: "Track all write operations on Kong configurations and see the source client IP.",
              prefix: '<i class="material-icons">assignment</i>'
            },
            views: {
              'content@': {
                templateUrl: 'js/app/audit-logs/index.html',
                controller: 'AuditLogsController'
              }
            }
          });
      }
    ]);
}());
