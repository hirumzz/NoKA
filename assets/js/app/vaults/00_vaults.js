(function() {
    'use strict';

    angular.module('frontend.vaults', []);

    angular.module('frontend.vaults')
        .config([
            '$stateProvider',
            function config($stateProvider) {
                $stateProvider
                    .state('vaults', {
                        parent : 'frontend',
                        url: '/vaults',
                        data : {
                            activeNode : true,
                            pageName : "Vaults",
                            pageDescription : "Vaults are entities where secret data (like password or API keys) can be stored and referenced securely from within Kong config.",
                            prefix : '<i class="material-icons text-primary">lock</i>'
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
                                templateUrl: 'js/app/vaults/vaults.html',
                                controller: 'VaultsController'
                            }
                        }
                    })
            }
        ])
    ;
}());
