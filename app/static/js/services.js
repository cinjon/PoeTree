'use strict';

angular.module('poetreeServices', ['ngResource', 'ngRoute', 'ngSanitize'])
  .factory('Post', function($http) {
    return {
      postRecord: function(form) {
        return $http.post('/save-record', form, {
          headers: {'Content-Type': undefined},
          transformRequest: angular.identity
        });
      }
    }
  })
  .factory('Poet', function($resource) {
    return $resource('/get-data/poet/:route', {}, {
      query: {
        method:'GET',
        params:{route:''},
        isArray:false
      }
    })
  })
  .factory('Poem', function($resource) {
    return $resource('/get-data/poem/:route', {}, {
      query: {
        method:'GET',
        params:{route:''},
        isArray:false
      }
    })
  })
