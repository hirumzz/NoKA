(function() {
    'use strict';

    angular.module('frontend.key-sets')
        .service('KeySetModel', [
            'DataModel',
            function(DataModel) {
                var model = new DataModel('kong/key-sets', true);
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
