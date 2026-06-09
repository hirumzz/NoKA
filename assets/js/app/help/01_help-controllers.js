(function() {
  'use strict';

  angular.module('frontend.help')
    .controller('HelpController', [
      '$scope', '$log', '$state', 'AuthService',
      function controller($scope, $log, $state, AuthService) {
          $scope.currentUser = AuthService.user();
      }
    ])
  ;
}());
