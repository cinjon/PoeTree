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
      console.log(input);
      parts = input.toLowerCase().split(' ');
      for (var index in parts) {
        part = parts[index];
        if (part == '') {
          continue;
        }
        parts[index] = part.slice(0, 1).toUpperCase() + part.slice(1);
      }
      return parts.join(' ');
    }
  });