(function() {
    'use strict';

    angular.module('frontend.key-sets', []);

    angular.module('frontend.key-sets')
        .config([
            '$stateProvider',
            function config($stateProvider) {
                $stateProvider
                    .state('key-sets', {
                        parent : 'frontend',
                        url: '/key-sets',
                        data : {
                            activeNode : true,
                            pageName : "Key Sets",
                            pageDescription : "A key set holds a collection of keys to organize and group key entities together.",
                            prefix : '<i class="material-icons text-primary">layers</i>'
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
                                templateUrl: 'js/app/key-sets/key-sets.html',
                                controller: 'KeySetsController'
                            }
                        }
                    })
            }
        ])
    ;
}());
