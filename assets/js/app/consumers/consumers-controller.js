/**
 * This file contains all necessary Angular controller definitions for 'frontend.admin.login-history' module.
 *
 * Note that this file should only contain controllers and nothing else.
 */
(function () {
  'use strict';

  angular.module('frontend.consumers')
    .controller('ConsumersController', [
      '_', '$scope', '$log', '$state', 'ConsumerService', '$q', 'MessageService',
      'UserService', 'SocketHelperService',
      '$uibModal', 'DialogService', 'ListConfig', 'ConsumerModel', '$http',
      function controller(_, $scope, $log, $state, ConsumerService, $q, MessageService,
                          UserService, SocketHelperService,
                          $uibModal, DialogService, ListConfig, ConsumerModel, $http) {

        ConsumerModel.setScope($scope, false, 'items', 'itemCount');
        $scope = angular.extend($scope, angular.copy(ListConfig.getConfig('consumer', ConsumerModel)));
        $scope.user = UserService.user();
        $scope.openCreateConsumerModal = openCreateConsumerModal


        function openCreateConsumerModal() {
          $uibModal.open({
            animation: true,
            ariaLabelledBy: 'modal-title',
            ariaDescribedBy: 'modal-body',
            templateUrl: 'js/app/consumers/create-consumer-modal.html',
            controller: function ($scope, $rootScope, $log, $uibModalInstance, MessageService, ConsumerModel) {

              $scope.consumer = {
                username: '',
                custom_id: '',
                tags: []
              }

              $scope.close = close
              $scope.submit = submit

              $scope.onTagInputKeyPress = function ($event) {
                if($event.keyCode === 13) {
                  if(!$scope.consumer.tags) $scope.consumer.tags = [];
                  $scope.consumer.tags = $scope.consumer.tags.concat($event.currentTarget.value);
                  $event.currentTarget.value = null;
                }
              }

              function submit() {

                $scope.errors = {}

                var data = _.cloneDeep($scope.consumer)
                if (!data.custom_id) {
                  delete data.custom_id;
                }

                if (!data.username) {
                  delete data.username;
                }

                ConsumerModel.create(data)
                  .then(function (res) {
                    MessageService.success("Consumer created successfully!")
                    $rootScope.$broadcast('consumer.created', res.data)
                    close()
                    // Navigate to the newly created consumers page
                    $state.go('consumers.edit',{id:res.data.id});
                  }).catch(function (err) {
                  $log.error("Failed to create consumer", err)
                  ConsumerModel.handleError($scope, err);

                });
              }


              function close() {
                $uibModalInstance.dismiss()
              }
            },
            controllerAs: '$ctrl',
          });
        }


        $scope.selectedTag = '';
        $scope.filterByTag = function (item) {
          if (!$scope.selectedTag) return true;
          return item.tags && item.tags.indexOf($scope.selectedTag) > -1;
        };

        // Smart Search Filter supporting Username, Custom ID, Consumer UUID, Tags, and all Credentials (OAuth2, Key-Auth, Basic-Auth, JWT, HMAC)
        $scope.smartSearchFilter = function (consumer) {
          if (!$scope.filters || !$scope.filters.searchWord) {
            consumer._matchedCred = null;
            return true;
          }
          var search = ($scope.filters.searchWord + '').toLowerCase().trim();
          if (!search) {
            consumer._matchedCred = null;
            return true;
          }

          // Reset matched credential badge
          consumer._matchedCred = null;

          // 1. Check direct consumer properties
          if (consumer.username && consumer.username.toLowerCase().indexOf(search) > -1) return true;
          if (consumer.custom_id && consumer.custom_id.toLowerCase().indexOf(search) > -1) return true;
          if (consumer.id && consumer.id.toLowerCase().indexOf(search) > -1) return true;
          if (consumer.tags && consumer.tags.some(function(t) { return (t + '').toLowerCase().indexOf(search) > -1; })) return true;

          // 2. Check credentials (OAuth2 Client ID, API Key, Basic Auth, JWT, HMAC)
          if (consumer._credentials && consumer._credentials.length) {
            for (var i = 0; i < consumer._credentials.length; i++) {
              var cred = consumer._credentials[i];
              if (cred.value && (cred.value + '').toLowerCase().indexOf(search) > -1) {
                consumer._matchedCred = cred;
                return true;
              }
            }
          }

          return false;
        };

        function _fetchCredentials(consumers) {
          if (!consumers || !consumers.length) return;

          var credConfigs = [
            { type: 'OAuth2 Client ID', url: 'kong/oauth2?size=1000', field: 'client_id' },
            { type: 'API Key', url: 'kong/key-auths?size=1000', field: 'key' },
            { type: 'Basic Auth', url: 'kong/basic-auths?size=1000', field: 'username' },
            { type: 'JWT Key', url: 'kong/jwts?size=1000', field: 'key' },
            { type: 'HMAC Username', url: 'kong/hmac-auths?size=1000', field: 'username' }
          ];

          var promises = credConfigs.map(function(cfg) {
            return $http.get(cfg.url)
              .then(function(res) {
                return { cfg: cfg, data: (res.data && res.data.data) ? res.data.data : [] };
              })
              .catch(function() {
                return { cfg: cfg, data: [] };
              });
          });

          $q.all(promises).then(function(results) {
            var credMap = {};

            results.forEach(function(r) {
              if (r.data && r.data.length) {
                r.data.forEach(function(item) {
                  var consumerId = (item.consumer && item.consumer.id) ? item.consumer.id : item.consumer_id;
                  if (consumerId) {
                    if (!credMap[consumerId]) credMap[consumerId] = [];
                    var val = item[r.cfg.field];
                    if (val) {
                      credMap[consumerId].push({
                        type: r.cfg.type,
                        value: val,
                        name: item.name || ''
                      });
                    }
                  }
                });
              }
            });

            // Assign credentials to each consumer object
            consumers.forEach(function(c) {
              c._credentials = credMap[c.id] || [];
            });
          });
        }

        function _fetchData() {

          $scope.loading = true;
          ConsumerModel.load({
            size: $scope.itemsFetchSize
          }).then(function (response) {
            $scope.items = response;
            
            // Extract unique tags
            var tagsMap = {};
            if ($scope.items && $scope.items.data) {
              $scope.items.data.forEach(function(consumer) {
                if (consumer.tags) {
                  consumer.tags.forEach(function(t) { tagsMap[t] = true; });
                }
              });
              // Fetch and associate credentials for smart searching
              _fetchCredentials($scope.items.data);
            }
            $scope.availableTags = Object.keys(tagsMap).sort();

            $scope.loading = false;

          }).catch(function (err) {
            $scope.loading = false;
            $log.error('Failed to load consumers', err);
          });
        }


        $scope.$on('consumer.created', function (ev, user) {
          _fetchData()
        })


        $scope.$on('consumer.updated', function (ev, user) {
          _fetchData()
        })

        $scope.$on('credentials.assigned', function (ev, user) {
          _fetchData()
        })

        $scope.$on('search', function (ev, user) {
          _fetchData()
        })

        $scope.$on('user.node.updated', function (ev, node) {
          _fetchData()
        })

        _fetchData();

      }
    ]);
}());
