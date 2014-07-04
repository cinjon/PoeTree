'use strict';

angular.module('SmacDB', ['ui.bootstrap', 'poetreeServices', 'poetreeFilters'])
  .controller('about', function($scope) {

  })
  .controller('home', function($scope, $sanitize, $http, $location, limitToFilter) {
    if (hasGetUserMedia()) {
      $scope.hasVoice = true;
    } else {
      $scope.hasVoice = false;
    }

    var mic = new Wit.Microphone(document.getElementById("microphone"));
    mic.onready = function () {
      mic.start();
    };
    mic.onaudiostart = function () {
      setTimeout(function() {
        mic.stop()
      }, 2500)
    };
    mic.onaudioend = function () {
      console.log('recstop');
    };
    mic.onerror = function (err) {
      info("Error: " + err);
    };
    mic.onresult = function(intent, entities) {
      if (intent == 'search') {
        do_search(entities)
      } else if (intent == 'select') {
        do_select(entities);
      } else if (intent == 'back') {
        do_back();
      } else {
        do_unknown();
      }
    }
    mic.connect('X4HVIEQCOLHU6VMRWJAEL5QM27OGGZSW');

    var do_search = function(entities, callback) {
      //search for entity, either {poet_name:''} or {poem_name:''}
      if ('poet_name' in entities) {
        return do_search_poet(entities['poet_name']['value']);
      } else if ('poem_name' in entities) {
        return do_search_poem(entities['poem_name']['value']);
      }
    }

    var do_search_poem = function(name) {
      console.log(name);
      $scope.searchTerm = name;
      $http.get('/poem/' + name, {}).then(function(result) {
        if (result.data.success) {
          $scope.poem = result.data.poem;
        } else {
          $scope.warning = "Our hamsters didn't find that poem. Please try again."
        }
      });
    }

    var do_search_poet = function(name) {
      console.log(name);
      $scope.searchTerm = name;
      $http.get('/poet/' + name, {}).then(function(result) {
        if (result.data.success) {
          console.log(result.data);
          $scope.poet_list_of_poems = result.data.poems;
          $scope.poet = result.data.poet;
        } else {
          $scope.warning = "Our hamsters didn't find that poet. Please try again."
        }
      });
    }

    var do_select = function(entities, callback) {
      //select one of the options already presented on the poet page, if exist
    }

    var do_back = function(callback) {
      //return back from poem page to poet page
    }

    var do_unknown = function(callback) {
      //tell user response not understood
      console.log('doing unknwon');
    }

    $
    $scope.poem = {title:"Title",
                   text:"<p>fluf</p><p>\n and huf\n</p>plo"}
    $scope.poet = {name:"Crank Mc"}
    $scope.list = [{title:$scope.poem.title}, {title:"falafel man"}, {title: "suckah"}];
    $scope.hasPoem = false;
    $scope.hasList = true;

    $scope.poemTextSanitize = function() {
      return $sanitize($scope.poem.text);
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