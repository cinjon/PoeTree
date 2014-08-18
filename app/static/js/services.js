'use strict';

angular.module('poetreeServices', ['ngResource', 'ngRoute', 'ngSanitize'])
  .factory('post', function($http) {
    return {
      postRecord: function(form) {
        return $http.post('/save-record', form, {
          headers: {'Content-Type': undefined},
          transformRequest: angular.identity
        });
      }
    }
  });
