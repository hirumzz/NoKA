(function () {
  'use strict';

  angular.module('frontend.keys')
    .controller('KeysController', [
      '$scope', '$rootScope', '$log', '$state', 'ApiService', '$uibModal', 'DialogService', 'UserService',
      'MessageService', '$http', 'KeyModel', 'ListConfig',
      function controller($scope, $rootScope, $log, $state, ApiService, $uibModal, DialogService, UserService,
                          MessageService, $http, KeyModel, ListConfig) {

        KeyModel.setScope($scope, false, 'items', 'itemCount');
        $scope = angular.extend($scope, angular.copy(ListConfig.getConfig('key', KeyModel)));
        $scope.user = UserService.user();

        $scope.openAddKeyModal = function (key) {
          const modalInstance = $uibModal.open({
            animation: true,
            ariaLabelledBy: 'modal-title',
            ariaDescribedBy: 'modal-body',
            templateUrl: 'js/app/keys/add-key-modal.html',
            controller: function ($scope, $uibModalInstance, _key, $http) {
              $scope.update = _key
              $scope.data = _key ? angular.copy(_key) : {
                name: '',
                jwk: '{}',
                set: null
              }
              
              if (_key && typeof $scope.data.jwk === 'object') {
                $scope.data.jwk = JSON.stringify($scope.data.jwk, null, 2);
              }
              if (_key && _key.set) {
                $scope.data.set = _key.set.id || _key.set;
              }

              $scope.keySets = [];
              $http.get('kong/key-sets').then(function(res) {
                if(res.data && res.data.data) {
                  $scope.keySets = res.data.data;
                }
              });

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
                try {
                  data.jwk = JSON.parse(data.jwk || '{}');
                } catch(e) {
                  $scope.errorMessage = "Invalid JSON in JWK field";
                  return false;
                }
                if(data.set) {
                  data.set = { id: data.set };
                } else {
                  delete data.set;
                }

                if($scope.update) {
                  KeyModel.update(data.id, _.omit(data, ['id']))
                    .then(function (resp) {
                      $uibModalInstance.close(resp)
                    }).catch(function (err) {
                      $scope.errorMessage = err.data && err.data.body && err.data.body.message || "An error occurred";
                    })
                } else {
                  KeyModel.create(data)
                    .then(function (resp) {
                      $uibModalInstance.close(resp)
                    }).catch(function (err) {
                      $scope.errorMessage = err.data && err.data.body && err.data.body.message || "An error occurred";
                    })
                }
              }
            },
            resolve: {
              _key: function () {
                return key
              }
            }
          });

          modalInstance.result.then(function () {
            _fetchData();
          }, function () {});
        }

        function _fetchData() {
          $scope.loading = true;
          KeyModel.load({
            size: $scope.itemsFetchSize
          }).then(function (response) {
            $scope.loading = false;
            if (response.data && response.data.data) {
              $scope.keys = response.data.data;
            } else {
              $scope.keys = [];
            }
          })
        }

        _fetchData();
      }
    ])
  ;
}());
