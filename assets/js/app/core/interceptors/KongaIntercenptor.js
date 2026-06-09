/**
 * HTTP interceptor that adds connection-id header and triggers bell notifications
 * on successful write operations (create/update/delete) for Kong entities, comments, and users.
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

        function getEntityLabel(entity) {
          switch(entity) {
            case 'services': return 'Service';
            case 'routes': return 'Route';
            case 'consumers': return 'Consumer';
            case 'plugins': return 'Plugin';
            case 'upstreams': return 'Upstream';
            case 'certificates': return 'Certificate';
            case 'targets': return 'Target';
            case 'user': return 'User';
            default: return entity || 'Resource';
          }
        }

        function getEntityIcon(entity) {
          switch(entity) {
            case 'services': return 'mdi-cloud-outline';
            case 'routes': return 'mdi-directions-fork';
            case 'consumers': return 'mdi-account-outline';
            case 'plugins': return 'mdi-power-plug';
            case 'upstreams': return 'mdi-arrow-up-bold-circle-outline';
            case 'certificates': return 'mdi-certificate';
            case 'user': return 'mdi-account';
            case 'comment': return 'mdi-comment-text-outline';
            default: return 'mdi-message-outline';
          }
        }

        function getActionLabel(method) {
          switch(method) {
            case 'post': return 'created';
            case 'delete': return 'deleted';
            default: return 'updated';
          }
        }

        function getCurrentUsername() {
          if ($localStorage.credentials && $localStorage.credentials.user) {
            return $localStorage.credentials.user.username || $localStorage.credentials.user.firstName || 'You';
          }
          return 'You';
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

            // Kong proxy write operations
            var isKongWrite = url.indexOf('kong/') > -1 && (method === 'post' || method === 'patch' || method === 'put' || method === 'delete');
            // Comment operations
            var isCommentWrite = url.indexOf('api/comments') > -1 && (method === 'post' || method === 'put' || method === 'delete');
            // User operations
            var isUserWrite = (url.indexOf('/user') > -1 || url.indexOf('/api/user') > -1) && url.indexOf('subscribe') < 0 && (method === 'post' || method === 'put' || method === 'delete');

            if (isKongWrite || isCommentWrite || isUserWrite) {
              var NotificationsService = $injector.get('NotificationsService');
              var username = getCurrentUsername();
              var action = getActionLabel(method);
              var entity, name, message, icon;

              if (isCommentWrite) {
                entity = 'comment';
                var refType = '';
                if (config.data && config.data.referenceType) {
                  refType = config.data.referenceType;
                } else if (response.data && response.data.referenceType) {
                  refType = response.data.referenceType;
                }
                message = username + ' ' + action + ' a comment' + (refType ? ' on ' + refType : '');
                icon = getEntityIcon('comment');
              } else if (isUserWrite) {
                entity = 'user';
                name = response.data ? (response.data.username || response.data.email || '') : '';
                message = username + ' ' + action + ' user' + (name ? " '" + name + "'" : '');
                icon = getEntityIcon('user');
              } else {
                entity = getEntityFromUrl(url);
                name = '';
                if (response.data) {
                  name = response.data.name || response.data.username || response.data.custom_id || '';
                }
                var label = getEntityLabel(entity);
                message = username + ' ' + action + ' ' + label + (name ? " '" + name + "'" : '');
                icon = getEntityIcon(entity);
              }

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
