(function() {
  'use strict';

  angular.module('frontend.audit-logs')
    .controller('AuditLogsController', [
      '$scope', '$log', '$state', 'ApiService',
      function controller($scope, $log, $state, ApiService) {
        $scope.logs = [];
        $scope.loading = true;

        $scope.fetchLogs = function() {
          $scope.loading = true;
          ApiService.get('/api/auditlogs?sort=createdAt DESC&limit=100')
            .then(function(response) {
              $scope.logs = response.data;
              $scope.loading = false;
            })
            .catch(function(err) {
              $log.error("Error fetching audit logs:", err);
              $scope.loading = false;
            });
        };

        $scope.fetchLogs();
      }
    ]);
}());
