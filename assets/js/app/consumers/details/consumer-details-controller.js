/**
 * This file contains all necessary Angular controller definitions for 'frontend.admin.login-history' module.
 *
 * Note that this file should only contain controllers and nothing else.
 */
(function () {
  'use strict';

  angular.module('frontend.consumers')
    .controller('ConsumerDetailsController', [
      '_', '$scope', '$log', '$state', 'ConsumerModel', 'ListConfig', 'MessageService', 'UserService', '$http',
      function controller(_, $scope, $log, $state, ConsumerModel, ListConfig, MessageService, UserService, $http) {

        ConsumerModel.setScope($scope, false, 'items', 'itemCount');
        $scope = angular.extend($scope, angular.copy(ListConfig.getConfig('consumer', ConsumerModel)));
        $scope.user = UserService.user();

        $scope.updateConsumerDetails = updateConsumerDetails

        $scope.onTagInputKeyPress = function ($event) {
          if ($event.keyCode === 13) {
            if (!$scope.consumer.tags) $scope.consumer.tags = [];
            $scope.consumer.tags = $scope.consumer.tags.concat($event.currentTarget.value);
            $event.currentTarget.value = null;
          }
        }

        function updateConsumerDetails() {
          ConsumerModel.update($scope.consumer.id, _.omit($scope.consumer, ['id']))
            .then(function (res) {
              $log.debug(res.data)
              $scope.consumer = res.data
              $scope.errors = {}
              MessageService.success("Consumer updated successfully!")
            }).catch(function (err) {
            $log.error("Failed to update consumer", err)
            $scope.handleErrors(err)
          })
        }

        $scope.comments = [];
        $scope.newComment = { content: '' };

        function loadComments() {
          $http.get('api/comments', {
            params: {
              referenceId: $scope.consumer.id,
              referenceType: 'consumer',
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
            referenceId: $scope.consumer.id,
            referenceType: 'consumer',
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
          if (data.entity === 'comment' && data.referenceId === $scope.consumer.id) {
            loadComments();
          }
        });

        loadComments();

      }
    ])
}());
