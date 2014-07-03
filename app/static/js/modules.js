'use strict';

angular.module('SmacDB', ['ui.bootstrap', 'poetreeServices', 'poetreeFilters'])
  .controller('about', function($scope) {

  })
  .controller('home', function($scope, $sanitize, $http, $location, limitToFilter) {
    var info = function (msg) {
      document.getElementById("info").innerHTML = msg;
    };

    var mic = new Wit.Microphone(document.getElementById("microphone"));
    mic.onready = function () {
      info("Microphone is ready to record");
    };
    mic.onaudiostart = function () {
      info("Recording started");
    };
    mic.onaudioend = function () {
      info("Recording stopped, processing started");
    };
    mic.onerror = function (err) {
      info("Error: " + err);
    };
    mic.connect('X4HVIEQCOLHU6VMRWJAEL5QM27OGGZSW');

    $scope.hasVoice = true;

    if (hasGetUserMedia()) {
      console.log('has get usm');
      // $scope.hasVoice = true;
    }

    $scope.onSelectTypeahead = function(item, model, label) {
      console.log(item)
      console.log(model)
      console.log(label);
    }

    $scope.hasVoice = false;
    $scope.hasPermissions = false;
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
