/**
 * This file contains all necessary Angular controller definitions for 'frontend.login-history' module.
 *
 * Note that this file should only contain controllers and nothing else.
 */
(function () {
  'use strict';

  angular.module('frontend.services')
    .controller('ServiceDetailsController', [
      '_', '$scope', '$rootScope', '$log', '$state', 'ServiceService', '$uibModal', 'MessageService', 'SettingsService', '$http', 'UserService',
      function controller(_, $scope, $rootScope, $log, $state, ServiceService, $uibModal, MessageService, SettingsService, $http, UserService) {

        var availableFormattedVersion = $rootScope.Gateway ? ServiceService.getLastAvailableFormattedVersion($rootScope.Gateway.version) : '013';
        $scope.settings = SettingsService.getSettings();
        $scope.user = UserService.user();
        $scope.tags = [];
        $scope.partial = 'js/app/services/partials/form-service-' + availableFormattedVersion + '.html?r=' + Date.now();

        // Store the original service in a var so that we can later check if the name is modified.
        // This is a monkey patch that fixes Kong's API inconsistency when using Cassandra in v0.13.x.
        // https://github.com/Kong/kong/issues/3534
        var originalService = angular.copy($scope.service);

        $scope.updateService = function () {

          $scope.loading = true
          // Detect changed fields for notification
          var changedFields = [];
          var data = angular.copy($scope.service);
          var skip = ['id', 'data', 'created_at', 'updated_at', 'token', 'createdAt', 'updatedAt', 'createdUser', 'updatedUser', 'kong_node_id', 'service_id'];
          for (var key in data) {
            if (data.hasOwnProperty(key) && skip.indexOf(key) < 0 && typeof data[key] !== 'function') {
              if (key === 'extras' && data.extras && originalService.extras) {
                // Check inside extras for actual changed fields
                for (var eKey in data.extras) {
                  if (data.extras.hasOwnProperty(eKey) && skip.indexOf(eKey) < 0 && typeof data.extras[eKey] !== 'function') {
                    if (JSON.stringify(data.extras[eKey]) !== JSON.stringify(originalService.extras[eKey])) {
                      changedFields.push(eKey.replace(/_/g, ' '));
                    }
                  }
                }
              } else if (JSON.stringify(data[key]) !== JSON.stringify(originalService[key])) {
                changedFields.push(key.replace(/_/g, ' '));
              }
            }
          }
          $rootScope._changedFields = changedFields.length > 0 ? changedFields.slice(0, 3).join(', ') : '';

          // workaround, name field creates constraint violation in v0.13.x when using Cassandra
          if (!isKongUsingPostgres() && originalService.name === data.name) {
            delete data.name;
          }

          // Kong 1.x compat
          delete data.data;

          ServiceService.update(data)
            .then(function (res) {
              console.log("Update Service: ", res)
              $scope.loading = false
              MessageService.success('Service updated successfully!');
              originalService = res.data; // ref. monkey patch
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

        $scope.onTagInputKeyPress = function ($event) {
          if($event.keyCode === 13) {
            if($rootScope.isGatewayVersionEqOrGreater("1.1.0rc1")) {
              if(!$scope.service.tags) $scope.service.tags = [];
              $scope.service.tags = $scope.service.tags.concat($event.currentTarget.value);
            }else{
              if(!$scope.service.extras) $scope.service.extras = {};
              if(!$scope.service.extras.tags) $scope.service.extras.tags = [];
              $scope.service.extras.tags = $scope.service.extras.tags.concat($event.currentTarget.value);
            }
            $event.currentTarget.value = null;
          }
        }

        function getTags() {
          ServiceService.getTags().then(function (res) {
            $scope.tags = res.data;
          }).catch(function (err) {
            console.error(err);
          })
        }

        function isKongUsingPostgres() {
          return _.get($rootScope.Gateway, 'configuration.database') === 'postgres';
        }

        $scope.comments = [];
        $scope.newComment = { content: '' };

        $scope.isCommentOwner = function(comment) {
          if (!comment || !comment.user || !$scope.user) return false;
          return String(comment.user.id) === String($scope.user.id);
        };

        $scope.canDeleteComment = function(comment) {
          return $scope.isCommentOwner(comment) || $scope.user.admin || $scope.user.role === 'admin';
        };

        function loadComments() {
          $http.get('api/comments', {
            params: {
              referenceId: $scope.service.id,
              referenceType: 'service'
            }
          }).then(function (res) {
            var currentUserId = String($scope.user.id);
            var isAdmin = $scope.user.admin || $scope.user.role === 'admin';
            res.data.forEach(function(comment) {
              comment._isOwner = comment.user ? String(comment.user.id) === currentUserId : false;
              comment._canDelete = comment._isOwner || isAdmin;
            });
            $scope.comments = res.data;
          }).catch(function (err) {
            $log.error('Failed to load comments', err);
          });
        }

        $scope.addComment = function () {
          if (!$scope.newComment.content) return;

          $http.post('api/comments', {
            referenceId: $scope.service.id,
            referenceType: 'service',
            content: $scope.newComment.content
          }).then(function (res) {
            $scope.newComment.content = '';
            loadComments();
          }).catch(function (err) {
            MessageService.error(err.data.message || 'Failed to add comment');
          });
        };

        $scope.startEditComment = function(comment) {
          if (!$scope.isCommentOwner(comment)) {
            MessageService.error('You can only edit your own comments');
            return;
          }
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
          if (data.entity === 'comment' && data.referenceId === $scope.service.id) {
            loadComments();
          }
        });

        getTags();
        loadComments();

      }
    ])
  ;
}());
