/**
 * This file contains all necessary Angular controller definitions for 'frontend.login-history' module.
 *
 * Note that this file should only contain controllers and nothing else.
 */
(function () {
  'use strict';

  angular.module('frontend.routes')
    .controller('RouteDetailsController', [
      '$scope', '$rootScope', '$log', '$state', 'RoutesService', 'MessageService', 'SettingsService', '_route', '$http', 'UserService',
      function controller($scope, $rootScope, $log, $state, RoutesService, MessageService, SettingsService, _route, $http, UserService) {

        var availableFormattedVersion = RoutesService.getLastAvailableFormattedVersion($rootScope.Gateway.version);
        $scope.route = $scope.route || _route;
        $scope.user = UserService.user();

        // Transform headers attr to a compatible array
        if($scope.route.headers && !_.isArray($scope.route.headers) && Object.keys($scope.route.headers).length) {
          const array = [];
          Object.keys($scope.route.headers).forEach(key => {
            const str = `${key}:${$scope.route.headers[key].join(",")}`
            array.push(str)
          })
          $scope.route.headers = array;
        }
        
        // Transform sources and destinations
        if($scope.route.sources && $scope.route.sources.length) {
          $scope.route.sources = _.map($scope.route.sources, source => {
            return source.ip + (source.port ? ":" + source.port : "");
          })
        }

        if($scope.route.destinations && $scope.route.destinations.length) {
          $scope.route.destinations = _.map($scope.route.destinations, dest => {
            return dest.ip + (dest.port ? ":" + dest.port : "");
          })
        }

        $scope.settings = SettingsService.getSettings();
        $scope.partial = 'js/app/routes/partials/form-route-' + availableFormattedVersion + '.html?r=' + Date.now();

        $scope.onTagInputKeyPress = function ($event) {
          if($event.keyCode === 13) {
            if(!$scope.route.tags) $scope.route.tags = [];
            $scope.route.tags = $scope.route.tags.concat($event.currentTarget.value);
            $event.currentTarget.value = null;
          }
        }

        $scope.submit = function () {

          $scope.loading = true

          let data = _.cloneDeep($scope.route);

          if(!data.hosts || !data.hosts.length) data.hosts = null;
          if(!data.paths || !data.paths.length) data.paths = null;
          if(!data.headers || !data.headers.length) data.headers = null;
          if(!data.methods || !data.methods.length) data.methods = null;
          if(!data.protocols || !data.protocols.length) data.protocols = null;
          if(!data.snis || !data.snis.length) data.snis = null;
          if(!data.sources || !data.sources.length) data.sources = null;
          if(!data.destinations || !data.destinations.length) data.destinations = null;

          // Format sources and destingations and headers
          if(data.sources && data.sources.length) {
            data.sources = _.map(data.sources, (item) => {
              const parts = item.split(":");
              const obj = {};
              obj.ip = parts[0]
              if(parts[1]) obj.port = parseInt(parts[1])
              return obj;
            })
          }

          if(data.destinations && data.destinations.length) {
            data.destinations = _.map(data.destinations, (item) => {
              const parts = item.split(":");
              const obj = {};
              obj.ip = parts[0]
              if(parts[1]) obj.port = parseInt(parts[1])
              return obj;
            })
          }

          if(data.headers && data.headers.length) {
            data.headers = _.map(data.headers, (item) => {
              const parts = item.split(":");
              const obj = {};
              obj[parts[0]] = parts[1].split(",").filter(function (el) {
                return el;
              })
              return obj;
            }).reduce(function(r, e) {
              const key = Object.keys(e)[0];
              const value = e[key];
              r[key] = value;
              return r;
            }, {});
          }

          console.log("Submitting route", data);

          RoutesService.update($scope.route.id, _.omit(data,["id", "data"]))
            .then(function (res) {
              $log.debug("Update Route: ", res)
              $scope.loading = false
              MessageService.success('Route updated successfully!')
            }).catch(function (err) {
            console.log("err", err)
            $scope.loading = false
            var errors = {}
            Object.keys(err.data.body).forEach(function (key) {
              MessageService.error(key + " : " + err.data.body[key])
            })
            $scope.errors = errors
          })

        }

        $scope.comments = [];
        $scope.newComment = { content: '' };

        function loadComments() {
          $http.get('api/comments', {
            params: {
              referenceId: $scope.route.id,
              referenceType: 'route',
              _t: Date.now()
            }
          }).then(function (res) {
            $scope.comments = res.data;
          }).catch(function (err) {
            $log.error('Failed to load comments', err);
          });
        }

        $scope.addComment = function () {
          if (!$scope.newComment.content) return;

          $http.post('api/comments', {
            referenceId: $scope.route.id,
            referenceType: 'route',
            content: $scope.newComment.content
          }).then(function (res) {
            $scope.newComment.content = '';
            loadComments();
          }).catch(function (err) {
            MessageService.error(err.data.message || 'Failed to add comment');
          });
        };

        $scope.startEditComment = function(comment) {
          comment.editing = true;
          comment.editContent = comment.content;
        };

        $scope.cancelEditComment = function(comment) {
          comment.editing = false;
          comment.editContent = '';
        };

        $scope.saveEditComment = function(comment) {
          if (!comment.editContent) return;
          $http.put('api/comments/' + comment.id, { content: comment.editContent }).then(function(res) {
            comment.content = res.data.content;
            comment.updatedAt = res.data.updatedAt;
            comment.editing = false;
            MessageService.success('Comment updated');
          }).catch(function(err) {
            MessageService.error(err.data ? err.data.message : 'Failed to update comment');
          });
        };

        $scope.deleteComment = function(comment, index) {
          if (!confirm('Are you sure you want to delete this comment?')) return;
          $http.delete('api/comments/' + comment.id).then(function(res) {
            $scope.comments.splice(index, 1);
            MessageService.success('Comment deleted');
          }).catch(function(err) {
            MessageService.error(err.data ? err.data.message : 'Failed to delete comment');
          });
        };

        $scope.$on('konga.event', function (ev, data) {
          if (data.entity === 'comment' && data.referenceId === $scope.route.id) {
            loadComments();
          }
        });

        loadComments();

      }
    ])
  ;
}());
