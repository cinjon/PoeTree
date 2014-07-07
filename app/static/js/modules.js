'use strict';

angular.module('Poetree', ['ui.bootstrap', 'poetreeServices', 'poetreeFilters'])
  .controller('about', function($scope) {

  })
  .controller('home', function($scope, $sanitize, $http, $location, limitToFilter) {
    $scope.greeting = "PoeTree";
    $scope.searchTerm = $scope.greeting;
    $scope.hasInstructions = true;
    $scope.hasVoice = hasGetUserMedia();
    $scope.hasBack = false;

    $scope.findPoet = function() {
      do_search({'poet_name':{'value':'robert frost'}});
    }
    $scope.findPoem = function() {
      do_search({'poem_name':{'value':'o captain! my captain!'}});
    }
    $scope.select = function(num) {
      do_select({'number':{'value':num}});
    }
    $scope.isGreeting = function() {
      return $scope.searchTerm == $scope.greeting;
    }
    $scope.do_instructions = function() {
      do_instructions();
    }
    $scope.do_back = function() {
      do_back();
    }

    var mic = new Wit.Microphone(document.getElementById("microphone"));
    mic.onready = function () {
      console.log('ready')
      mic.start();
    };
    mic.onaudiostart = function () {
      setTimeout(function() {
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
      if (intent == 'search') {
        do_search(entities)
      } else if (intent == 'select') {
        do_select(entities);
      } else if (intent == 'back') {
        do_back();
      } else if (intent == 'instructions') {
        do_instructions();
      } else {
        do_unknown();
      }
    }
    // mic.connect('X4HVIEQCOLHU6VMRWJAEL5QM27OGGZSW'); //Move this to server

    var do_search = function(entities, callback) {
      $scope.searchTerm = name;
      $scope.warningTerm = '';
      $scope.hasInstructions = false;
      //search for entity, either {poet_name:''} or {poem_name:''}
      if ('poet_name' in entities) {
        return do_search_poet(entities['poet_name']['value']);
      } else if ('poem_name' in entities) {
        return do_search_poem(entities['poem_name']['value']);
      }
    }

    var do_search_poem = function(name) {
      $scope.searchTerm = name;
      $scope.warningTerm = '';
      $scope.hasInstructions = false;
      $http.get('/poem/' + name, {}).then(function(result) {
        if (result.data.success == 'single') {
          $scope.poem = result.data.poems[0];
          $scope.hasPoem = true;
          $scope.hasList = false;
          $scope.hasBack = false;
          $scope.searchTerm =  'Poem: ' + $scope.poem.title;
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

    var do_search_poet = function(name) {
      $http.get('/poet/' + name, {}).then(function(result) {
        if (result.data.success) {
          $scope.searchTerm = 'Poet: ' + result.data.poet;
          var list = result.data.poems;
          if (list.length == 1) {
            $scope.poem = list[0];
            $scope.hasPoem = true;
            $scope.hasList = false;
          } else {
            $scope.list = list;
            $scope.hasPoem = false;
            $scope.hasList = true;
          }
        } else {
          $scope.warningTerm = "Our hamsters didn't find that poet. Please try again."
        }
      });
    }

    var do_select = function(entities, callback) {
      //select one of the options already presented on the poet page, if exist
      if (!$scope.hasList) {
        return;
      }
      if ($scope.hasList && 'number' in entities) {
        $scope.poem = $scope.list[entities['number']['value'] - 1];
        $scope.searchTerm = 'Poem: ' + $scope.poem.title;
        $scope.hasList = false;
        $scope.hasPoem = true;
        $scope.hasBack = true;
      } else if ($scope.hasList) {
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

    var do_unknown = function(callback) {
      //tell user response not understood
      $scope.warningTerm = "Our hamsters are hard of hearing. Do you mind trying again?"
      $scope.searchTerm = $scope.greeting;
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