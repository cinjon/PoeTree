'use strict';

angular.module('Poetree', ['ui.bootstrap', 'poetreeServices', 'poetreeFilters'])
  .controller('about', function($scope) {

  })
  .controller('home', function($scope, $sanitize, $http, $location, $timeout) {
    $scope.greeting = "PoeTree";
    $scope.searchTerm = $scope.greeting;
    $scope.hasHelp = true;
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
      if (intent == 'choose') {
        do_choose(entities);
      } else if (intent == 'find') {
        do_find(entities);
      } else if (intent == 'back') {
        do_back();
      } else if (intent == 'help') {
        do_help();
      }
    }
    mic.connect('X4HVIEQCOLHU6VMRWJAEL5QM27OGGZSW');

    var set_result_settings = function(name) {
      $scope.searchTerm = name;
      $scope.warningTerm = '';
      $scope.hasHelp = false;
    }
    var set_has_settings = function(searchedObj, list, back) {
      $scope.hasSearchedObj = searchedObj;
      $scope.hasList = list;
      $scope.hasBack = back;
    }

    var do_find = function(entities) {
      name = entities['find']['value']
      set_result_settings(name);
      $http.get('/find/' + name, {}).then(function(result) {
        // Return results could be a list of poems and poets, at most five of each:
        // [{text:"", name:"", type:"poem", poet:"by <Poet>"}, ..., {type:"poet", poems:[{...}], name:", extra:"# Poems"}]
        // Or a single poem or a single poet (which will have a list of poems)
        if (!result.data.success) {
          $scope.warningTerm = "Our hamsters didn't find any results. Please try again."
        } else if (result.data.type == 'single-poem') {
          var poem = result.data.poem;
          $scope.searchedObj = poem;
          set_has_settings(true, false, false);
        } else if (result.data.type == 'single-poet') {
          var poet = result.data.poet;
          $scope.searchedObj = poet;
          $scope.list = poet.poems;
          set_has_settings(true, true, false);
        } else if (result.data.type == 'multi') {
          $scope.list = result.data.poems.concat(result.data.poets);
          set_has_settings(false, true, false);
        }
      });
    }

    var do_choose = function(entities) {
      //choose one of the options already presented on the poet page, if exist
      if (!$scope.hasList) {
        return;
      } else if ('number' in entities) {
        var number = entities['number']['value'] - 1;
        var listEntity = $scope.list[number];
        $scope.hasList = false;
        $scope.hasBack = true;
        $scope.hasSearchedObj = true;
        $scope.searchedObj = listEntity;
      } else {
        $scope.warningTerm = "Sorry, our hamsters are bad with numbers. Please repeat that.";
      }
    }

    var do_back = function() {
      //return back from poem page to poet page
      if ($scope.hasBack) {
        $scope.searchTerm = $scope.greeting;
        $scope.warningTerm = '';
        $scope.hasList = true;
        $scope.hasSearchedObj = false;
        $scope.hasBack = false;
      }
    }

    var do_help = function() {
      $scope.hasList = false;
      $scope.hasSearchedObj = false;
      $scope.hasBack = false;
      $scope.hasHelp = true;
      $scope.searchTerm = $scope.greeting;
      $scope.warningTerm = '';
    }

    $scope.hasPoem = function() {
      return $scope.hasSearchedObj && $scope.hasSearchedObj.type == "poem";
    }

    $scope.poemTextSanitize = function() {
      //Sanitize text for poems
      if ($scope.hasPoem()) {
        return $sanitize($scope.hasSearchedObj.text);
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