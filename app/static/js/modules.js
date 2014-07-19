'use strict';

var ms_wit_loop = 1200; //2000 works, but has a meh latency for users. 1500 is *ok*. 1200 is better.

angular.module('Poetree', ['poetreeServices', 'poetreeFilters'])
  .controller('about', function($scope) {

  })
  .controller('home', function($scope, $sanitize, $http, $location, $timeout) {
    $scope.greeting = "PoeTree";
    $scope.instructions = getInstructions();
    $scope.hasVoice = hasGetUserMedia();
    $scope.isGreeting = function() {
      //Check if the search term in the box is the greeting
      return $scope.searchTerm == $scope.greeting;
    }
    $scope.hasPoem = function() {
      return $scope.hasSearchedObj && $scope.searchedObj.type == "poem";
    }
    $scope.hasPoemAudio = function() {
      return $scope.hasPoem() && $scope.hasSearchedObj.audio != null;
    }

    $scope.sanitize = function(txt) {
      if (txt) {
        return $sanitize(txt);
      }
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

    function settings_notify(searchTerm, warningTerm) {
      //Set searchTerm, warningTerm
      $scope.searchTerm = searchTerm;
      $scope.warningTerm = warningTerm;
    }
    function settings_layout(hasSearchedObj, hasList, hasBack, hasHelp, hasDiscover) {
      //Set layout settings
      $scope.hasSearchedObj = hasSearchedObj;
      $scope.hasList = hasList;
      $scope.hasBack = hasBack;
      $scope.hasHelp = hasHelp;
      $scope.hasDiscover = hasDiscover;
    }
    function set_poem(poem) {
      $scope.searchedObj = poem;
      settings_layout(true, false, false, false, false);
      settings_notify(poem.title, '');
      $scope.hasBack = true;
      $scope.hasAudio = true;
    }
    function set_poet(poet) {
      if (poet.poems.length == 1) {
        set_poem(poet.poems[0]);
      } else {
        $scope.searchedObj = poet;
        $scope.list = poet.poems;
        settings_layout(true, true, false, false, false);
        settings_notify(poet.name, '');
      }
    }
    settings_notify($scope.greeting, '');
    settings_layout(false, false, false, true, false);

    var mic = new Wit.Microphone(document.getElementById("microphone"));
    mic.onready = function () {
      mic.start();
    };
    mic.onaudiostart = function () {
      $timeout(function() {
        mic.stop()
      }, ms_wit_loop)
    };
    mic.onerror = function (err) {
      console.log("Error: " + err);
    };
    mic.onresult = function(intent, entities, res) {
      console.log(intent);
      console.log(res);
      if (intent == 'back') {
        do_back();
      } else if (intent == 'choose') {
        do_choose(entities);
      } else if (intent == 'discover') {
        do_discover();
      } else if (intent == 'find') {
        do_find(entities, res);
      } else if (intent == 'help') {
        do_help();
      } else if (intent == 'play') {
        do_play();
      } else if (intent == 'random') {
        do_random();
      } else if (intent == 'scroll') {
        do_scroll(entities);
      }
    }
    mic.connect('X4HVIEQCOLHU6VMRWJAEL5QM27OGGZSW');

    function do_back() {
      //return back from poem page to poet page
      if ($scope.hasBack) {
        settings_notify($scope.greeting, '');
        settings_layout(false, true, false, false, false);
      }
    }

    function do_choose(entities) {
      //choose one of the options already presented on the poet page, if exist
      if (!$scope.hasList) {
        return;
      } else if ('number' in entities) {
        var number = entities['number']['value'] - 1;
        if (number > $scope.list.length) {
          return;
        }
        $scope.searchedObj = $scope.list[number]
        settings_layout(true, false, true, false, false);
        settings_notify($scope.searchedObj.title, '');
      } else {
        $scope.warningTerm = "Sorry, our hamsters are bad with numbers. Please repeat that.";
      }
    }

    function do_discover() {
      settings_notify($scope.greeting, '');
      settings_layout(false, false, false, false, true);
    }

    function do_find(entities, res) {
      if ('poet' in entities) {
        name = entities['poet']['value']
      } else if ('poem' in entities) {
        name = entities['poem']['value']
      } else if (res['msg_body'] != '') {
        name = res['msg_body'];
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
          set_poem(result.data.poem);
        } else if (result.data.type == 'single-poet') {
          set_poet(result.data.poet);
        } else if (result.data.type == 'multi') {
          $scope.list = result.data.poems.concat(result.data.poets);
          if ($scope.list.length == 1) {
            if (result.data.poems.length == 1) {
              //Just one return. It's a poem, show it.
              set_poem(result.data.poems[0]);
            } else {
              //Just one return. It's a poet, show it.
              set_poet(result.data.poets[0]);
            }
          } else {
            settings_layout(false, true, false, false, false);
            settings_notify(name, '');
          }
        }
      });
    }

    function do_help() {
      settings_notify($scope.greeting, '');
      settings_layout(false, false, false, true, false);
    }

    function do_play() {
      if ($scope.hasPoemAudio()) {
        //Play Audio
      }
    }

    function do_random() {
      $http.get('/randompoem', {}).then(function(result) {
        if (!result.data.success) {
          $scope.warningTerm = "Oh no, there was an error. Please try again."
        } else {
          console.log(result.data.poem);
          set_poem(result.data.poem);
        }
      });
    }
    do_random();

    function do_scroll(entities) {
      //Scroll in some direction. Uses 'on' for down, 'off' for up
      //TODO: Doesn't quite work yet
      direction = entities['scroll']['value']
      if (direction == 'on') {
        $('.poem-text').scroll(0, 100);
      } else {
        $('.poem-text').scroll(0, -100);
      }
    }
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

function getInstructions() {
  return [
    'This is an experiment to see what the future feels like.',
    'Speak your favorite poet: <span class="communicate">Robert Frost</span>',
    'Speak your favorite poem: <span class="communicate">Oh Captain My Captain</span>',
    'Discover our poets and poems: <span class="communicate">List</span>',
    'Find a <span class="communicate">Random</span> poem',
    'See the instructions again? <span class="communicate">Help</span>',
  ]
}