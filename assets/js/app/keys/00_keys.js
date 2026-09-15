(function() {
    'use strict';

    angular.module('frontend.keys', []);

    angular.module('frontend.keys')
        .config([
            '$stateProvider',
            function config($stateProvider) {
                $stateProvider
                    .state('keys', {
                        parent : 'frontend',
                        url: '/keys',
                        data : {
                            activeNode : true,
                            pageName : "Keys",
                            pageDescription : "A key object holds asymmetric or symmetric keys (public / private) that are used for digital signatures, JWT verification, and encryption.",
                            prefix : '<i class="material-icons text-primary">vpn_key</i>'
                        },
                        resolve: {
                          _gateway: [
                            'InfoService',
                            function (InfoService) {
                              return InfoService.ensureGatewayInfo();
                            }
                          ],
                        },
                        views: {
                            'content@': {
                                templateUrl: 'js/app/keys/keys.html',
                                controller: 'KeysController'
                            }
                        }
                    })
            }
        ])
    ;
}());
