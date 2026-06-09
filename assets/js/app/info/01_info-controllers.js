/**
 * This file contains all necessary Angular controller definitions for 'frontend.admin.login-history' module.
 *
 * Note that this file should only contain controllers and nothing else.
 */
(function() {
  'use strict';

  angular.module('frontend.info')
    .controller('InfoController', [
      '$scope', '$log', '$state', 'InfoService', '$http', '$q',
      function controller($scope, $log, $state, InfoService, $http, $q) {

          $scope.showAllInfo = false;
          $scope.metricsEnabled = false;
          $scope.topHitsResolved = [];
          $scope.slowestResolved = [];

          function _getInfo() {
             $scope.loading = true;
             
             // Fetch main info
             InfoService.getInfo()
                 .then(function(response){
                     $scope.info = response.data;
                     
                     // Fetch routes, services and prometheus metrics in parallel
                     $q.all({
                         routes: $http.get('kong/routes').catch(function() { return { data: { data: [] } }; }),
                         services: $http.get('kong/services').catch(function() { return { data: { data: [] } }; }),
                         prometheus: InfoService.getPrometheusMetrics().catch(function() { return { data: { success: false } }; })
                     }).then(function(results) {
                         var routesList = results.routes.data.data || [];
                         var servicesList = results.services.data.data || [];
                         var prometheusData = results.prometheus.data;
                         
                         var routesMap = {};
                         var servicesMap = {};

                         angular.forEach(routesList, function(route) {
                             var pathStr = route.paths ? route.paths.join(', ') : '';
                             routesMap[route.id] = pathStr || route.name || route.id;
                             if (route.name) {
                                 routesMap[route.name] = pathStr || route.name;
                             }
                         });

                         angular.forEach(servicesList, function(service) {
                             servicesMap[service.id] = service.name || service.host || service.id;
                             if (service.name) {
                                 servicesMap[service.name] = service.name || service.host;
                             }
                         });

                         function resolveEndpointPath(endpointId) {
                             if (!endpointId || endpointId === 'unknown') return 'unknown';
                             if (routesMap[endpointId]) return routesMap[endpointId];
                             if (servicesMap[endpointId]) return 'Service: ' + servicesMap[endpointId];
                             return endpointId;
                         }

                         if (prometheusData && prometheusData.success) {
                             $scope.metricsEnabled = true;
                             $scope.prometheus = prometheusData;
                             
                             $scope.topHitsResolved = (prometheusData.topHits || []).map(function(item) {
                                 return {
                                     endpoint: resolveEndpointPath(item.endpoint),
                                     hits: item.hits
                                 };
                             });

                             $scope.slowestResolved = (prometheusData.slowestEndpoints || []).map(function(item) {
                                 return {
                                     endpoint: resolveEndpointPath(item.endpoint),
                                     avgLatency: item.avgLatency
                                 };
                             });
                         } else {
                             $scope.metricsEnabled = false;
                         }
                     }).finally(function() {
                         $scope.loading = false;
                     });
                 }).catch(function(err) {
                     $scope.loading = false;
                 });
          }

          _getInfo()

          $scope.$on('user.node.updated',function(node){
              _getInfo()
          })

          $scope.toggleShowAllInfo = function() {
              $scope.showAllInfo = !$scope.showAllInfo;
          };

          $scope.configArray = [];
          $scope.isObjectOrArray = function (val) {
              return typeof val === 'object' && val !== null;
          };

          $scope.formatJson = function (val) {
              return JSON.stringify(val, null, 2);
          };

          $scope.shouldShowConfigParam = function(key, val) {
              return typeof val !== 'function';
          };

          $scope.$watch('Gateway.configuration', function(newVal) {
              if (newVal) {
                  $scope.configArray = Object.keys(newVal).map(function(key) {
                      return {
                          key: key,
                          value: newVal[key]
                      };
                  }).sort(function(a, b) {
                      return a.key.localeCompare(b.key);
                  });
              }
          }, true);
      }
    ])
  ;
}());
