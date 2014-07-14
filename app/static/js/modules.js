'use strict';

angular.module('Poetree', ['ui.bootstrap', 'poetreeServices', 'poetreeFilters'])
  .controller('about', function($scope) {

  })
  .controller('home', function($scope, $sanitize, $http, $location, $timeout) {
    $scope.greeting = "PoeTree";
    $scope.hasVoice = hasGetUserMedia();
    $scope.isGreeting = function() {
      //Check if the search term in the box is the greeting
      return $scope.searchTerm == $scope.greeting;
    }

    //Get the poet and poem names
    $http.get('/poetnames', {}).then(function(result) {
      $scope.poetnames = result.data.names;
    });
    $http.get('/poemnames', {}).then(function(result) {
      $scope.poemnames_first = result.data.names.slice(0,Math.ceil(result.data.names.length/3))
      $scope.poemnames_second = result.data.names.slice(Math.ceil(result.data.names.length/3), 2*Math.ceil(result.data.names.length/3));
      $scope.poemnames_third = result.data.names.slice(2*Math.ceil(result.data.names.length/3))
    });

    var mic = new Wit.Microphone(document.getElementById("microphone"));
    mic.onready = function () {
      mic.start();
    };
    mic.onaudiostart = function () {
      $timeout(function() {
        mic.stop()
      }, 2000)
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
      } else if (intent == 'scroll') {
        do_scroll(entities);
      }
    }
    mic.connect('X4HVIEQCOLHU6VMRWJAEL5QM27OGGZSW');

    var settings_notify = function(searchTerm, warningTerm) {
      //Set searchTerm, warningTerm
      $scope.searchTerm = searchTerm;
      $scope.warningTerm = warningTerm;
    }
    var settings_layout = function(hasSearchedObj, hasList, hasBack, hasHelp, hasDiscover) {
      //Set layout settings
      $scope.hasSearchedObj = hasSearchedObj;
      $scope.hasList = hasList;
      $scope.hasBack = hasBack;
      $scope.hasHelp = hasHelp;
      $scope.hasDiscover = hasDiscover;
    }
    settings_notify($scope.greeting, '');
    settings_layout(false, false, false, true, false);

    var do_find = function(entities) {
      if ('poet' in entities) {
        name = entities['poet']['value']
      } else if ('poem' in entities) {
        name = entities['poem']['value']
      } else {
        return;
      }

      settings_notify(name, '');
      $http.get('/find/' + name, {}).then(function(result) {
        // Return results could be a list of poems and poets, at most five of each:
        // [{text:"", name:"", type:"poem", poet:"by <Poet>"}, ..., {type:"poet", poems:[{...}], name:", extra:"# Poems"}]
        // Or a single poem or a single poet (which will have a list of poems)
        if (!result.data.success) {
          $scope.warningTerm = "Our hamsters didn't find any results. Please try again."
        } else if (result.data.type == 'single-poem') {
          var poem = result.data.poem;
          $scope.searchedObj = poem;
          $scope.searchedObj.type = 'poem';
          settings_layout(true, false, false, false, false);
        } else if (result.data.type == 'single-poet') {
          var poet = result.data.poet;
          $scope.searchedObj = poet;
          $scope.list = poet.poems;
          settings_layout(true, true, false, false, false);
        } else if (result.data.type == 'multi') {
          $scope.list = result.data.poems.concat(result.data.poets);
          settings_layout(false, true, false, false, false);
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
        settings_layout(true, false, true, false, false);
        $scope.searchedObj = listEntity;
      } else {
        $scope.warningTerm = "Sorry, our hamsters are bad with numbers. Please repeat that.";
      }
    }

    var do_back = function() {
      //return back from poem page to poet page
      if ($scope.hasBack) {
        settings_notify($scope.greeting, '');
        settings_layout(false, true, false, false, false);
      }
    }

    var do_help = function() {
      settings_notify($scope.greeting, '');
      settings_layout(false, false, false, true, false);
    }

    var do_scroll = function(entities) {
      //Scroll in some direction. Uses 'on' for down, 'off' for up
      direction = entities['scroll']['value']
      if (direction == 'on') {
        $('.poem-text').scroll(0, 100);
      } else {
        $('.poem-text').scroll(0, -100);
      }
    }

    $scope.hasPoem = function() {
      return $scope.hasSearchedObj && $scope.searchedObj.type == "poem";
    }

    $scope.poemTextSanitize = function() {
      //Sanitize text for poems
      if ($scope.hasPoem()) {
        return $sanitize($scope.searchedObj.text);
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