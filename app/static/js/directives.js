'use strict';

/* Directives */

angular.module('poetreeDirectives', [])
  .directive('blurMe', function($timeout) {
    return {
      scope: { trigger: '@blurMe' },
      link: function(scope, element) {
        scope.$watch('trigger', function(value) {
          console.log(element);
          if(value === "true") {
            $timeout(function() {
              console.log('blurring');
              element[0].blur();
            });
          }
        });
      }
    };
  });
