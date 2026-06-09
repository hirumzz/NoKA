/**
 * This file contains all necessary Angular controller definitions for 'frontend.admin.login-history' module.
 *
 * Note that this file should only contain controllers and nothing else.
 */
(function() {
  'use strict';

  angular.module('frontend.info')
    .service('InfoService', [
        '$log', '$state','$http',
      function( $log, $state, $http) {

          return {

              getInfo : function() {
                  console.log('InfoService:getInfo called');
                  return $http.get('kong')
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
