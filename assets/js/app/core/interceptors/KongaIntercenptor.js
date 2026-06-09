/**
 * HTTP interceptor that adds connection-id header and triggers bell notifications
 * on successful write operations with detailed messages and clickable navigation.
 */
(function() {
  'use strict';

  angular.module('frontend.core.interceptors')
    .factory('KongaInterceptor', [
      '$q', '$injector', '$localStorage',
      function($q, $injector, $localStorage) {

        function getEntityFromUrl(url) {
          if (!url) return null;
          // Remove any leading path and /kong/ prefix
          var cleaned = url.replace(/^.*?kong\//, '');
          var parts = cleaned.split('/').filter(Boolean);
          return parts[0] || null;
        }

        function getEntityLabel(entity) {
          var map = { services: 'Service', routes: 'Route', consumers: 'Consumer', plugins: 'Plugin', upstreams: 'Upstream', certificates: 'Certificate', targets: 'Target', user: 'User' };
          return map[entity] || entity || 'Resource';
        }

        function getEntityIcon(entity) {
          var map = { services: 'mdi-cloud-outline', routes: 'mdi-directions-fork', consumers: 'mdi-account-outline', plugins: 'mdi-power-plug', upstreams: 'mdi-arrow-up-bold-circle-outline', certificates: 'mdi-certificate', user: 'mdi-account', comment: 'mdi-comment-text-outline' };
          return map[entity] || 'mdi-message-outline';
        }

        function getActionLabel(method) {
          if (method === 'post') return 'created';
          if (method === 'delete') return 'deleted';
          return 'updated';
        }

        function getCurrentUsername() {
          if ($localStorage.credentials && $localStorage.credentials.user) {
            return $localStorage.credentials.user.username || $localStorage.credentials.user.firstName || 'You';
          }
          return 'You';
        }

        function getChangedFields(sentData) {
          if (!sentData || typeof sentData !== 'object') return '';
          var skip = ['id', 'created_at', 'updated_at', 'createdAt', 'updatedAt', 'token', 'extras', 'connection-id'];
          var fields = [];
          for (var key in sentData) {
            if (sentData.hasOwnProperty(key) && skip.indexOf(key) < 0 && sentData[key] !== null && sentData[key] !== undefined && sentData[key] !== '') {
              fields.push(key);
            }
          }
          if (fields.length > 3) return fields.slice(0, 3).join(', ') + '...';
          return fields.join(', ');
        }

        function getNavState(entity, id, method) {
          if (method === 'delete') return { state: null, stateParams: null };
          switch(entity) {
            case 'services': return { state: 'services.read', stateParams: { service_id: id } };
            case 'routes': return { state: 'routes.read', stateParams: { route_id: id } };
            case 'consumers': return { state: 'consumers.edit', stateParams: { id: id } };
            case 'user': return { state: 'users.show', stateParams: { id: id } };
            default: return { state: null, stateParams: null };
          }
        }

        function getResourceNameFromScope(refType) {
          try {
            var $rootScope = $injector.get('$rootScope');
            if ($rootScope.$$childHead) {
              var scope = $rootScope.$$childHead;
              for (var i = 0; i < 50 && scope; i++) {
                if (refType === 'service' && scope.service && scope.service.name) return scope.service.name;
                if (refType === 'route' && scope.route && (scope.route.name || scope.route.id)) return scope.route.name || scope.route.id;
                if (refType === 'consumer' && scope.consumer && (scope.consumer.username || scope.consumer.custom_id)) return scope.consumer.username || scope.consumer.custom_id;
                scope = scope.$$nextSibling || scope.$$childHead;
              }
            }
          } catch(e) {}
          return '';
        }

        return {
          request: function requestCallback(config) {
            var connection_id = '';
            if ($localStorage.credentials && $localStorage.credentials.user && $localStorage.credentials.user.node) {
                connection_id = $localStorage.credentials.user.node.id;
            }
            config.headers['connection-id'] = connection_id;
            return config;
          },

          response: function responseCallback(response) {
            var config = response.config;
            var url = config.url || '';
            var method = (config.method || '').toLowerCase();

            var isKongWrite = url.indexOf('kong/') > -1 && (method === 'post' || method === 'patch' || method === 'put' || method === 'delete');
            var isCommentWrite = url.indexOf('api/comments') > -1 && (method === 'post' || method === 'put' || method === 'delete');
            var isUserWrite = (url.match(/\/user($|\/)/) || url.indexOf('/api/user') > -1) && url.indexOf('subscribe') < 0 && url.indexOf('node') < 0 && (method === 'post' || method === 'put' || method === 'delete');

            if (isKongWrite || isCommentWrite || isUserWrite) {
              var NotificationsService = $injector.get('NotificationsService');
              var username = getCurrentUsername();
              var action = getActionLabel(method);
              var message, icon, nav;

              if (isCommentWrite) {
                var refType = (config.data && config.data.referenceType) || (response.data && response.data.referenceType) || '';
                var refId = (config.data && config.data.referenceId) || (response.data && response.data.referenceId) || '';
                var refName = getResourceNameFromScope(refType);
                message = username + ' ' + action + ' a comment on ' + refType + (refName ? " '" + refName + "'" : '');
                icon = getEntityIcon('comment');
                nav = getNavState(refType + 's', refId, method);

              } else if (isUserWrite) {
                var uname = response.data ? (response.data.username || response.data.email || '') : '';
                var uid = response.data ? response.data.id : null;
                message = username + ' ' + action + ' user' + (uname ? " '" + uname + "'" : '');
                icon = getEntityIcon('user');
                nav = getNavState('user', uid, method);

              } else {
                var entity = getEntityFromUrl(url);
                var name = response.data ? (response.data.name || response.data.username || response.data.custom_id || '') : '';
                var id = response.data ? response.data.id : null;
                var label = getEntityLabel(entity);

                if (method === 'patch' || method === 'put') {
                  message = username + ' updated ' + label + (name ? " '" + name + "'" : '');
                } else {
                  message = username + ' ' + action + ' ' + label + (name ? " '" + name + "'" : '');
                }
                icon = getEntityIcon(entity);
                nav = getNavState(entity, id, method);
              }

              NotificationsService.add({
                icon: icon,
                message: message,
                state: nav ? nav.state : null,
                stateParams: nav ? nav.stateParams : null
              });
            }

            return response;
          }
        };
      }
    ])
  ;
}());
