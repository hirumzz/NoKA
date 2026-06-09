(function () {
  'use strict';

  angular.module('frontend.vaults')
    .controller('VaultsController', [
      '$scope', '$rootScope', '$log', '$state', 'ApiService', '$uibModal', 'DialogService', 'UserService',
      'MessageService', '$http', 'VaultModel', 'ListConfig',
      function controller($scope, $rootScope, $log, $state, ApiService, $uibModal, DialogService, UserService,
                          MessageService, $http, VaultModel, ListConfig) {

        VaultModel.setScope($scope, false, 'items', 'itemCount');
        $scope = angular.extend($scope, angular.copy(ListConfig.getConfig('vault', VaultModel)));
        $scope.user = UserService.user();

        $scope.openAddVaultModal = function (vault) {
          const modalInstance = $uibModal.open({
            animation: true,
            ariaLabelledBy: 'modal-title',
            ariaDescribedBy: 'modal-body',
            templateUrl: 'js/app/vaults/add-vault-modal.html',
            controller: function ($scope, $uibModalInstance, _vault) {
              $scope.update = _vault
              $scope.data = _vault ? angular.copy(_vault) : {
                name: '',
                prefix: '',
                description: '',
                config: '{}'
              }
              if (_vault && typeof $scope.data.config === 'object') {
                $scope.data.config = JSON.stringify($scope.data.config, null, 2);
              }
              $scope.close = function () {
                return $uibModalInstance.dismiss()
              }

              $scope.submit = function () {
                $scope.errorMessage = ""
                let data = angular.copy($scope.data);
                if(!data.name || !data.prefix) {
                  $scope.errorMessage = "Name and Prefix cannot be empty"
                  return false;
                }
                try {
                  data.config = JSON.parse(data.config || '{}');
                } catch(e) {
                  $scope.errorMessage = "Invalid JSON in Config field";
                  return false;
                }

                if($scope.update) {
                  VaultModel.update(data.id, _.omit(data, ['id']))
                    .then(function (resp) {
                      $uibModalInstance.close(resp)
                    }).catch(function (err) {
                      $scope.errorMessage = err.data && err.data.body && err.data.body.message || "An error occurred";
                    })
                } else {
                  VaultModel.create(data)
                    .then(function (resp) {
                      $uibModalInstance.close(resp)
                    }).catch(function (err) {
                      $scope.errorMessage = err.data && err.data.body && err.data.body.message || "An error occurred";
                    })
                }
              }
            },
            resolve: {
              _vault: function () {
                return vault
              }
            }
          });

          modalInstance.result.then(function () {
            _fetchData();
          }, function () {});
        }

        function _fetchData() {
          $scope.loading = true;
          VaultModel.load({
            size: $scope.itemsFetchSize
          }).then(function (response) {
            $scope.loading = false;
            if (response.data && response.data.data) {
              $scope.vaults = response.data.data;
            } else {
              $scope.vaults = [];
            }
          })
        }

        _fetchData();
      }
    ])
  ;
}());
