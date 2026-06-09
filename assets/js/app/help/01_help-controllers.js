
(function() {
  'use strict';

  angular.module('frontend.help')
    .controller('HelpController', [
      '$scope', '$log', '$state', 'UserService',
      function controller($scope, $log, $state, UserService) {
          $scope.user = UserService.user();
          $scope.activeGuide = null;

          $scope.toggleGuide = function(guide) {
            if ($scope.activeGuide === guide) {
              $scope.activeGuide = null;
            } else {
              $scope.activeGuide = guide;
            }
          };
      }
    ])
  ;
}());
