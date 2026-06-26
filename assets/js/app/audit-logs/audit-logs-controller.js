(function() {
  'use strict';

  angular.module('frontend.audit-logs')
    .controller('AuditLogsController', [
      '$scope', '$log', '$state', '$http',
      function controller($scope, $log, $state, $http) {
        $scope.logs = [];
        $scope.loading = true;

        $scope.fetchLogs = function() {
          $scope.loading = true;
          $http.get('/api/auditlogs?sort=createdAt DESC&limit=100')
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
