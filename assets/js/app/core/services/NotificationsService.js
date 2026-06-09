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
            '$localStorage','$rootScope','MessageService','$state',
            function factory($localStorage,$rootScope,MessageService,$state) {

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

                return {

                    load   : load,
                    add    : add,
                    remove : remove

                }
            }
        ])
    ;
}());
