(function() {
    'use strict';

    angular.module('frontend.help', []);

    // Module configuration
    angular.module('frontend.help')
        .config([
            '$stateProvider',
            function config($stateProvider) {
                $stateProvider
                    .state('help', {
                        parent: 'frontend',
                        url: '/help',
                        data : {
                            activeNode : false,
                            pageName : "Help & Guide",
                            access: 1, // Any authenticated user can access this route
                            pageDescription : "Detailed documentation and guide for Noka features",
                            prefix : '<i class="material-icons text-primary">&#xE8FD;</i>'
                        },
                        views: {
                            'content@': {
                                templateUrl: 'js/app/help/index.html',
                                controller: 'HelpController'
                            }
                        }
                    })
                ;
            }
        ])
    ;
}());
