/**
 * Auth interceptor for HTTP and Socket request. This interceptor will add required
 * JWT (Json Web Token) token to each requests. That token is validated in server side
 * application.
 */
(function() {
  'use strict';

  angular.module('frontend.core.interceptors')
    .factory('KongaInterceptor', [
      '$q', '$injector', '$localStorage',
      function(
        $q, $injector, $localStorage
      ) {

        function getEntityFromUrl(url) {
          if (!url) return null;
          var parts = url.replace('/kong/', '').replace('/kong', '').split('/').filter(Boolean);
          return parts[0] || null;
        }

        function getEntityIcon(entity) {
          switch(entity) {
            case 'services': return 'mdi-cloud-outline';
            case 'routes': return 'mdi-directions-fork';
            case 'consumers': return 'mdi-account-outline';
            case 'plugins': return 'mdi-power-plug';
            case 'upstreams': return 'mdi-arrow-up-bold-circle-outline';
            case 'certificates': return 'mdi-certificate';
            default: return 'mdi-message-outline';
          }
        }

        return {
          request: function requestCallback(config) {
            var connection_id = '';
            if ($localStorage.credentials && $localStorage.credentials.user.node) {
                connection_id = $localStorage.credentials.user.node.id;
            }
            config.headers['connection-id'] = connection_id;
            return config;
          },

          response: function responseCallback(response) {
            var config = response.config;
            var url = config.url || '';
            var method = (config.method || '').toLowerCase();

            // Only intercept Kong proxy write operations and comment operations
            var isKongWrite = url.indexOf('kong/') > -1 && (method === 'post' || method === 'patch' || method === 'put' || method === 'delete');
            var isCommentWrite = url.indexOf('api/comments') > -1 && (method === 'post' || method === 'put' || method === 'delete');

            if (isKongWrite || isCommentWrite) {
              var NotificationsService = $injector.get('NotificationsService');
              var entity = isCommentWrite ? 'comment' : getEntityFromUrl(url);
              var action = method === 'post' ? 'created' : (method === 'delete' ? 'deleted' : 'updated');
              var name = '';

              if (response.data) {
                name = response.data.name || response.data.id || '';
              }

              var message = '';
              if (isCommentWrite) {
                var refType = (config.data && config.data.referenceType) || 'resource';
                message = 'Comment ' + action + ' on ' + refType;
              } else {
                message = (entity || 'Resource') + ' ' + (name ? "'" + name + "'" : '') + ' ' + action;
              }

              var icon = isCommentWrite ? 'mdi-comment-text-outline' : getEntityIcon(entity);

              NotificationsService.add({
                icon: icon,
                message: message,
                state: null,
                stateParams: null
              });
            }

            return response;
          }
        };
      }
    ])
  ;
}());
