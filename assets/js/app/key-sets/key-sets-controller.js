(function () {
  'use strict';

  angular.module('frontend.key-sets')
    .controller('KeySetsController', [
      '$scope', '$rootScope', '$log', '$state', 'ApiService', '$uibModal', 'DialogService', 'UserService',
      'MessageService', '$http', 'KeySetModel', 'ListConfig',
      function controller($scope, $rootScope, $log, $state, ApiService, $uibModal, DialogService, UserService,
                          MessageService, $http, KeySetModel, ListConfig) {

        KeySetModel.setScope($scope, false, 'items', 'itemCount');
        $scope = angular.extend($scope, angular.copy(ListConfig.getConfig('key-set', KeySetModel)));
        $scope.user = UserService.user();

        $scope.openAddKeySetModal = function (keySet) {
          const modalInstance = $uibModal.open({
            animation: true,
            ariaLabelledBy: 'modal-title',
            ariaDescribedBy: 'modal-body',
            templateUrl: 'js/app/key-sets/add-key-set-modal.html',
            controller: function ($scope, $uibModalInstance, _keySet) {
              $scope.update = _keySet
              $scope.data = _keySet ? angular.copy(_keySet) : {
                name: ''
              }
              $scope.close = function () {
                return $uibModalInstance.dismiss()
              }

              $scope.submit = function () {
                $scope.errorMessage = ""
                let data = angular.copy($scope.data);
                if(!data.name) {
                  $scope.errorMessage = "Name cannot be empty"
                  return false;
                }

                if($scope.update) {
                  KeySetModel.update(data.id, _.omit(data, ['id']))
                    .then(function (resp) {
                      $uibModalInstance.close(resp)
                    }).catch(function (err) {
                      $scope.errorMessage = err.data && err.data.body && err.data.body.message || "An error occurred";
                    })
                } else {
                  KeySetModel.create(data)
                    .then(function (resp) {
                      $uibModalInstance.close(resp)
                    }).catch(function (err) {
                      $scope.errorMessage = err.data && err.data.body && err.data.body.message || "An error occurred";
                    })
                }
              }
            },
            resolve: {
              _keySet: function () {
                return keySet
              }
            }
          });

          modalInstance.result.then(function () {
            _fetchData();
          }, function () {});
        }

        function _fetchData() {
          $scope.loading = true;
          KeySetModel.load({
            size: $scope.itemsFetchSize
          }).then(function (response) {
            $scope.loading = false;
            if (response.data && response.data.data) {
              $scope.keySets = response.data.data;
            } else {
              $scope.keySets = [];
            }
          })
        }

        _fetchData();
      }
    ])
  ;
}());
