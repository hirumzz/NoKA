(function() {
    'use strict';

    angular.module('frontend.vaults')
        .service('VaultModel', [
            'DataModel',
            function(DataModel) {
                var model = new DataModel('kong/vaults', true);
                model.handleError = function($scope, err) {
                    $scope.errors = {}
                    if(err.data && err.data.body && err.data.body.fields){
                        for(var key in err.data.body.fields){
                            $scope.errors[key] = err.data.body.fields[key]
                        }
                    }
                }
                return model;
            }
        ])
    ;
}());
