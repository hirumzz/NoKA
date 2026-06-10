/**
 * Simple service to activate noty2 message to GUI. This service can be used every where in application. Generally
 * all $http and $socket queries uses this service to show specified errors to user.
 *
 * Service can be used as in following examples (assuming that you have inject this service to your controller):
 *  Message.success(message, [title], [options]);
 *  Message.error(message, [title], [options]);
 *  Message.message(message, [title], [options]);
 *
 * Feel free to be happy and code some awesome stuff!
 *
 * @todo do we need some queue dismiss?
 */
(function() {
    'use strict';

    angular.module('frontend.core.services')
        .factory('NotificationsService', [
            '$localStorage','$rootScope','MessageService','$state','$injector',
            function factory($localStorage,$rootScope,MessageService,$state,$injector) {

                function createNavigatorNotification(message) {
                    Notification.requestPermission(function (permission) {
                        if (Notification.permission === "granted") {
                            new Notification("KONGA!",{
                                body: message,
                                icon: 'images/k.png'
                            });
                        }
                    });
                }

                function load() {
                    return $localStorage.notifications;
                }

                function add(data) {
                    if(!$localStorage.notifications) {
                        $localStorage.notifications = []
                    }
                    $localStorage.notifications.unshift({
                        id : new Date().getTime(),
                        icon : data.icon,
                        message : data.message,
                        state: data.state,
                        stateParams: data.stateParams
                    })

                    createNavigatorNotification(data.message)
                }

                function remove(index) {
                    $localStorage.notifications.splice(index, 1);
                }


                /**
                 * Listen for important events
                 */

                $rootScope.$on('node.health_checks',function(event,data){

                    if(!data.isHealthy) {

                        // var message = 'A Kong node is down, unresponsive or unreachable.'
                        //
                        // add({
                        //     message : message
                        // })

                        MessageService.warning('A Connection health check has failed: ' + _.get(data,'lastFailedReason', 'N/A'))
                    }

                })

                $rootScope.$on('konga.event', function(event, data){
                    // Add to dropdown list
                    add({
                        icon: data.icon,
                        message: data.message,
                        state: data.state,
                        stateParams: data.stateParams
                    });

                    // Build toast configuration with onTap redirect
                    var toastOptions = {
                        onTap: function() {
                            if (data.state) {
                                $state.go(data.state, data.stateParams);
                            }
                        }
                    };

                    // Display toast
                    if (data.type === 'info') {
                        MessageService.info(data.message, null, toastOptions);
                    } else if (data.type === 'warning') {
                        MessageService.warning(data.message, null, toastOptions);
                    } else if (data.type === 'alert' || data.type === 'danger') {
                        MessageService.error(data.message, null, toastOptions);
                    }
                })

                // Poll for new notifications from other users
                var lastPollTime = new Date().getTime();
                var pollInterval = null;

                function startPolling() {
                    if (pollInterval) return;
                    pollInterval = setInterval(function() {
                        if (!$localStorage.credentials || !$localStorage.credentials.token) return;

                        var $http = $injector.get('$http');

                        $http.get('api/notifications', { params: { since: lastPollTime } })
                            .then(function(res) {
                                if (res.data && res.data.length) {
                                    var currentUserId = $localStorage.credentials ? $localStorage.credentials.user.id : null;
                                    res.data.forEach(function(notif) {
                                        // Only add notifications from OTHER users
                                        var notifUserId = notif.user ? (notif.user.id || notif.user) : null;
                                        if (notifUserId && String(notifUserId) !== String(currentUserId)) {
                                            // Check if not already in local notifications
                                            var exists = false;
                                            var notifications = $localStorage.notifications || [];
                                            for (var i = 0; i < notifications.length; i++) {
                                                if (notifications[i].dbId === notif.id) {
                                                    exists = true;
                                                    break;
                                                }
                                            }
                                            if (!exists) {
                                                add({
                                                    dbId: notif.id,
                                                    icon: notif.icon,
                                                    message: notif.message,
                                                    state: notif.state || null,
                                                    stateParams: notif.stateParams || null
                                                });
                                            }
                                        }
                                    });
                                    lastPollTime = new Date().getTime();
                                }
                            });
                    }, 15000);
                }

                function stopPolling() {
                    if (pollInterval) {
                        clearInterval(pollInterval);
                        pollInterval = null;
                    }
                }

                // Load recent notifications on init (for fresh login)
                function loadInitialNotifications() {
                    if (!$localStorage.credentials || !$localStorage.credentials.token) return;
                    var $http = $injector.get('$http');
                    var isFirstLoad = !$localStorage.lastNotifReadTime;
                    var since = $localStorage.lastNotifReadTime || (new Date().getTime() - (24 * 60 * 60 * 1000));
                    
                    // Set lastNotifReadTime for fresh sessions
                    if (!$localStorage.lastNotifReadTime) {
                        $localStorage.lastNotifReadTime = new Date().getTime();
                    }
                    
                    $http.get('api/notifications', { params: { since: since } })
                        .then(function(res) {
                            if (res.data && res.data.length) {
                                var currentUserId = $localStorage.credentials.user.id;
                                res.data.forEach(function(notif) {
                                    var notifUserId = notif.user ? (notif.user.id || notif.user) : null;
                                    if (notifUserId && String(notifUserId) !== String(currentUserId)) {
                                        var exists = false;
                                        var notifications = $localStorage.notifications || [];
                                        for (var i = 0; i < notifications.length; i++) {
                                            if (notifications[i].dbId === notif.id) {
                                                exists = true;
                                                break;
                                            }
                                        }
                                        if (!exists) {
                                            if (!$localStorage.notifications) {
                                                $localStorage.notifications = [];
                                            }
                                            $localStorage.notifications.unshift({
                                                id: new Date().getTime(),
                                                dbId: notif.id,
                                                icon: notif.icon,
                                                message: notif.message,
                                                state: notif.state || null,
                                                stateParams: notif.stateParams || null,
                                                read: isFirstLoad ? true : false
                                            });
                                        }
                                    }
                                });
                            }
                        });
                }

                // Start polling only when authenticated
                if ($localStorage.credentials && $localStorage.credentials.token) {
                    startPolling();
                    loadInitialNotifications();
                }
                $rootScope.$on('user.login', function() {
                    lastPollTime = new Date().getTime() - (24 * 60 * 60 * 1000);
                    loadInitialNotifications();
                    startPolling();
                });

                return {

                    load   : load,
                    add    : add,
                    remove : remove

                }
            }
        ])
    ;
}());
