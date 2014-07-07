/* Filters */
round = function(input, precision) {
  return input ?
    parseFloat(input).toFixed(precision) :
    "";
}

angular.module('poetreeFilters', [])
  .filter('prettifyDate', function() {
    return function(date) {
      return new Date(date).toDateString('yyyy-MM-dd');
    }
  })
  .filter('uppercase', function() {
    return function(input) {
      return input.toUpperCase();
    }
  })
  .filter('title', function() {
    return function(input) {
      if (!input) {
        return '';
      }
      return input.split(' ').map(function(x) {return x[0].toUpperCase() + x.slice(1)}).join(' ')
    }
  })
  .filter('numToStr', function() {
    dict = {1:'One', 2:'Two', 3:'Three', 4:'Four', 5:'Five'}
    return function(input) {
      if (input in dict) {
        return dict[input];
      }
      return '?';
    }
  });
