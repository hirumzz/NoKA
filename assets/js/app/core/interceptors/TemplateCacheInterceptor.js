
(function() {
  'use strict';

  angular.module('frontend.core.interceptors')
    .factory('TemplateCacheInterceptor', [
      function() {
        return {
          request: function( config ) {
            if( config.url.indexOf( ".html") > -1) {
              var version = window.konga_version || new Date().getTime();
              config.url += '?v=' + version;
            }
            return config;
          }
        };
      }
    ])
  ;
}());
