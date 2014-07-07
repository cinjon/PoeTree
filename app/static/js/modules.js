'use strict';

angular.module('Poetree', ['ui.bootstrap', 'poetreeServices', 'poetreeFilters'])
  .controller('about', function($scope) {

  })
  .controller('home', function($scope, $sanitize, $http, $location, $timeout) {
    $scope.greeting = "PoeTree";
    $scope.searchTerm = $scope.greeting;
    $scope.hasInstructions = true;
    $scope.hasVoice = hasGetUserMedia();
    $scope.hasBack = false;
    $scope.isGreeting = function() {
      return $scope.searchTerm == $scope.greeting;
    }

    var mic = new Wit.Microphone(document.getElementById("microphone"));
    mic.onready = function () {
      mic.start();
    };
    mic.onaudiostart = function () {
      $timeout(function() {
        mic.stop()
      }, 2000)
    };
    mic.onaudioend = function () {
      console.log('recstop');
    };
    mic.onerror = function (err) {
      console.log("Error: " + err);
    };
    mic.onresult = function(intent, entities) {
      console.log(intent);
      console.log(entities);
      if (intent == 'poet') {
        do_search_poet(entities, $scope);
      } else if (intent == 'poem') {
        do_search_poem(entities);
      } else if (intent == 'select') {
        do_select(entities);
      } else if (intent == 'back') {
        do_back();
      } else if (intent == 'instructions') {
        do_instructions();
      }
    }
    mic.connect('X4HVIEQCOLHU6VMRWJAEL5QM27OGGZSW');

    var set_search_settings = function(name) {
      $scope.searchTerm = name;
      $scope.warningTerm = '';
      $scope.hasInstructions = false;
    }

    var do_search_poem = function(entities) {
      if (!('poem_name' in entities)) {
        $scope.warningTerm = "Our hamsters heard you say a poem, but aren't quite sure which one.";
        return;
      }

      name = entities['poem_name']['value']
      set_search_settings(name);
      $http.get('/poem/' + name, {}).then(function(result) {
        if (result.data.success == 'single') {
          $scope.poem = result.data.poems[0];
          $scope.hasPoem = true;
          $scope.hasList = false;
          $scope.hasBack = false;
          $scope.searchTerm =  'Poem: ' + $scope.poem.title;
          $scope.supplementaryInfo = $scope.poem.poet;
        } else if (result.data.success == 'list') {
          $scope.list = result.data.poems;
          $scope.hasPoem = false;
          $scope.hasList = true;
          $scope.hasBack = false;
          $scope.searchTerm = 'Poem: ' + name;
        } else {
          $scope.warningTerm = "Our hamsters didn't find that poem. Please try again."
        }
      });
    }

    var do_search_poet = function(entities, $scope) {
      if (!('poet_name' in entities)) {
        $scope.warningTerm = "Our hamsters heard you say a poet, but aren't quite sure which one.";
        return;
      }

      name = entities['poet_name']['value']
      set_search_settings(name);
      $http.get('/poet/' + name, {}).then(function(result) {
        if (result.data.success) {
          $scope.searchTerm = 'Poet: ' + result.data.poet;
          var list = result.data.poems;
          if (list.length == 1) {
            $scope.hasPoem = true;
            $scope.hasList = false;
            $scope.poem = list[0];
            $scope.supplementaryInfo = $scope.poem.title;
          } else {
            $scope.hasPoem = false;
            $scope.hasList = true;
            $scope.list = list;
          }
        } else {
          $scope.warningTerm = "Our hamsters didn't find that poet. Please try again."
        }
      });
    }

    var do_select = function(entities) {
      //select one of the options already presented on the poet page, if exist
      if (!$scope.hasList) {
        return;
      } else if ('number' in entities) {
        $scope.hasList = false;
        $scope.hasPoem = true;
        $scope.hasBack = true;
        $scope.poem = $scope.list[entities['number']['value'] - 1];
        $scope.searchTerm = 'Poem: ' + $scope.poem.title;
      } else {
        $scope.warningTerm = "Sorry, our hamsters are bad with numbers. Please repeat that.";
      }
    }

    var do_back = function() {
      //return back from poem page to poet page
      if ($scope.hasBack) {
        $scope.searchTerm = $scope.greeting;
        $scope.warning = '';
        $scope.hasList = true;
        $scope.hasPoem = false;
        $scope.hasBack = false;
      }
    }

    var do_instructions = function() {
      $scope.hasList = false;
      $scope.hasPoem = false;
      $scope.hasBack = false;
      $scope.hasInstructions = true;
      $scope.searchTerm = $scope.greeting;
      $scope.warning = '';
    }

    $scope.poemTextSanitize = function() {
      if ($scope.hasPoem) {
        return $sanitize($scope.poem.text);
      }
    };
  })
  .config([
    '$routeProvider', '$locationProvider',
    function($routeProvider, $locationProvider) {
      $routeProvider
	.when('/', {
	  templateUrl: 'static/partials/home.html',
          controller: 'home'
	})
        .when('/about', {
          templateUrl: 'static/partials/about.html',
          controller: 'about'
        })
	.otherwise({
	  redirectTo: '/'
	});
      $locationProvider.html5Mode(true);
    }
  ]);

function hasGetUserMedia() {
  return !!(navigator.getUserMedia || navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia || navigator.msGetUserMedia);
}