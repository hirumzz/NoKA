/**
 * This file contains all necessary Angular controller definitions for 'frontend.admin.login-history' module.
 *
 * Note that this file should only contain controllers and nothing else.
 */
(function() {
  'use strict';

  angular.module('frontend.info')
    .service('InfoService', [
        '$log', '$state', '$http', '$q', '$rootScope',
      function( $log, $state, $http, $q, $rootScope) {

          return {

              getInfo : function() {
                  console.log('InfoService:getInfo called');
                  return $http.get('kong')
              },
              ensureGatewayInfo : function() {
                  if ($rootScope.Gateway) {
                      return $q.when($rootScope.Gateway);
                  }
                  return $http.get('kong').then(function(response) {
                      $rootScope.Gateway = response.data;
                      return response.data;
                  }).catch(function(err) {
                      return null;
                  });
              },
              nodeStatus : function(params) {
                  return $http.get('kong/status',{
                      params : params
                  })
              },
              getPrometheusMetrics : function() {
                  return $http.get('api/kong/prometheus-metrics')
              },

              clusterStatus : function() {
                  return $http.get('kong/cluster')
              },
          }
      }
    ])
  ;
}());
