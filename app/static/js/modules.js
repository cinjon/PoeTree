'use strict';

var msWitLoop = 800;
var scrollAmt = 280;

angular.module('Poetree', ['poetreeServices', 'poetreeFilters', 'poetreeDirectives', 'ui.bootstrap'])
  .controller('about', function($scope) {

  })
  .controller('home', function($scope, $sanitize, $http, $location, $timeout, limitToFilter) {
    var scrollCounter = 0;
    var isMicLooping = false;
    var isPlaying = false;
    var isTypeless = false;

    $scope.searchTerm = '';
    $scope.greeting = "Search TLP"
    $scope.audioPlayer = null;
    $scope.hasVoice = hasGetUserMedia();
    if (!$scope.hasVoice) {
      isTypeless = false;
    }

    $scope.typeless = isTypeless;
    $scope.toggleTypeless = function() {
      $scope.typeless = !$scope.typeless;
      isTypeless = $scope.typeless;
    }
    $scope.$watch('typeless', function(newvar) {
      $scope.typeToggleMessage = newvar ? "I really really want to use my hands. Ok" : "I'm an intrepid voice explorer. Fantastic";
      if ($scope.typeless) {
        mic.start();
      } else {
        mic.stop();
      }
    });
    $scope.isGreeting = function() {
      //Check if the search term in the box is the greeting
      return $scope.searchTerm == $scope.greeting;
    }
    $scope.hasPoem = function() {
      return $scope.hasSearchedObj && $scope.searchedObj.type == "poem";
    }
    $scope.hasPoemAudio = function() {
      return $scope.hasPoem() && $scope.searchedObj.audio != null;
    }
    settings_notify($scope.greeting, '');

    $scope.sanitize = function(txt) {
      if (txt) {
        return $sanitize(txt);
      }
    }

    //Get the poet and poem names
    $scope.getTypeaheadValues = function(val) {
      return $http.get('/typeahead/' + val, {}).then(function(result) {
        return result.data.data;
      });
    }

    $scope.onSelectSearchTerm = function(item, model, label) {
      httpGetItem(item);
    }

    function settings_notify(searchTerm, warningTerm) {
      //Set searchTerm, warningTerm
      $scope.searchTerm = searchTerm;
      $scope.warningTerm = warningTerm;
    }
    function settings_layout(hasSearchedObj, hasList, hasBack, hasHelp, hasDiscover, hasAudio) {
      //Set layout settings
      $scope.hasSearchedObj = hasSearchedObj;
      $scope.hasList = hasList;
      $scope.hasBack = hasBack;
      $scope.hasHelp = hasHelp;
      $scope.hasDiscover = hasDiscover;
      $scope.hasAudio = hasAudio;
      if (hasAudio) {
        $scope.audioPlayer = getAudioPlayer('http://www.typelesspoetry.com/' + $scope.searchedObj.audio);
        $scope.audioPlayer.addEventListener('ended', function() {
          isPlaying = false;
          mic.start();
        });
      }
    }
    function set_poem(poem) {
      $scope.searchedObj = poem;
      settings_layout(true, false, false, false, false, poem.audio != null);
      settings_notify(poem.title, '');
    }
    function set_poet(poet) {
      if (poet.poems.length == 1) {
        set_poem(poet.poems[0]);
      } else {
        $scope.searchedObj = poet;
        $scope.list = poet.poems;
        settings_layout(true, true, false, false, false, false);
        settings_notify(poet.name, '');
      }
    }
    settings_layout(false, false, false, true, false, false);

    var mic = new Wit.Microphone(document.getElementById("microphone"));
    mic.onready = function () {
      if (!isPlaying && isTypeless) {
        mic.start();
        isMicLooping = true;
      }
    };
    mic.onaudiostart = function () {
      $timeout(function() {
        mic.stop()
        isMicLooping = false;
      }, msWitLoop)
    };
    mic.onerror = function (err) {
      console.log("Error: " + err);
    };
    mic.onresult = function(intent, entities, res) {
      if (intent == 'back') {
        doBack();
      } else if (intent == 'choose') {
        doChoose(entities);
      } else if (intent == 'discover') {
        doDiscover();
      } else if (intent == 'find') {
        doFind(entities, res);
      } else if (intent == 'help') {
        doHelp();
      } else if (intent == 'play') {
        doPlay();
      } else if (intent == 'random') {
        doRandom();
      } else if (intent == 'scroll') {
        if ($scope.hasPoem()) {
          doScroll(entities);
        }
      }
    }
    mic.connect('X4HVIEQCOLHU6VMRWJAEL5QM27OGGZSW');

    function doBack() {
      //return back from poem page to poet page
      if ($scope.hasBack) {
        settings_notify($scope.greeting, '');
        settings_layout(false, true, false, false, false, false);
      }
    }

    function doChoose(entities) {
      //choose one of the options already presented on the poet page, if exist
      if (!$scope.hasList) {
        return;
      } else if ('number' in entities) {
        var number = entities['number']['value'] - 1;
        if (number > $scope.list.length) {
          return;
        }
        set_poem($scope.list[number]);
        $scope.hasBack = true;
      } else {
        $scope.warningTerm = "Sorry, our hamsters are bad with numbers. Please repeat that.";
      }
    }

    function doDiscover() {
      return $http.get('/all', {}).then(function(result) {
        poems = result.data.poems;
        $scope.poemNamesFirst = poems.slice(0,Math.ceil(poems.length/3))
        $scope.poemListsTwoThree = [
          poems.slice(Math.ceil(poems.length/3), 2*Math.ceil(poems.length/3)),
          poems.slice(2*Math.ceil(poems.length/3))]
        $scope.poets = result.data.poets;
        settings_notify($scope.greeting, '');
        settings_layout(false, false, false, false, true, false);
      });
    }

    function doFind(entities, res) {
      if ('poet' in entities) {
        name = entities['poet']['value']
      } else if ('poem' in entities) {
        name = entities['poem']['value']
      } else if (res['msg_body'] != '') {
        name = res['msg_body'];
      } else {
        return;
      }
      httpFind(name);
    }

    function httpFind(name) {
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
            settings_layout(false, true, false, false, false, false);
            settings_notify(name, '');
          }
        }
      });
    }

    $scope.focusSearch = function() {
      $scope.searchModel = '';
    }

    function doHelp() {
      settings_notify($scope.greeting, '');
      settings_layout(false, false, false, true, false, false);
      $scope.searchModel = '';
    }

    function doPlay() {
      if ($scope.hasPoemAudio()) {
        isPlaying = true;
        $scope.audioPlayer.play();
      }
    }

    function doRandom(typeless_check) {
      console.log('doRandom: ' + typeless_check);
      if (typeless_check) {
        return;
      }
      $http.get('/randompoem', {}).then(function(result) {
        if (!result.data.success) {
          $scope.warningTerm = "Oh no, there was an error. Please try again."
        } else {
          set_poem(result.data.poem);
        }
      });
    }
    // doRandom();

    function doScroll(entities) {
      //Scroll in some direction. Uses 'on' for down, 'off' for up
      var direction;
      var entities = entities['on_off'];
      if (!entities) {
        direction = 'on';
      } else {
        direction = entities['value'];
      }

      if (direction == 'off') {
        scrollCounter -= scrollAmt;
        if (scrollCounter < 0) {
          scrollCounter = 0;
        }
      } else {
        scrollCounter += scrollAmt;
      }
      $('.poem-text').scrollTop($('.poem-text').offset().top + scrollCounter);
    }

    function httpGetItem(item) {
      var ty = item.ty;
      $http.get('/get_data/' + ty + '/' + item.name, {}).then(function(result) {
        if (!result.data.success) {return;} //TODO
        if (ty == 'poet') {
          set_poet(result.data.data);
        } else if (ty == 'poem') {
          set_poem(result.data.data);
        }
      });
    }

    function doClick(f, optional_var) {
      if (isTypeless || isPlaying) {return;}
      f(optional_var);
    }

    $scope.clickDiscover = function() {
      doClick(doDiscover);
    }

    $scope.clickHelp = function() {
      doClick(doHelp);
    }

    $scope.clickPlay = function() {
      doClick(doPlay);
    }

    $scope.clickRandom = function() {
      doClick(doRandom);
    }

    $scope.clickBack = function() {
      doClick(doBack);
    }

    $scope.clickChoose = function(index) {
      //index is an index into list. in this case, we clicked choose. only accept if !typeless
      doClick(doChoose, {'number':{'value':index+1}});
    }

    $scope.clickName = function(obj) {
      //obj is a {name:String, ty:poet|poem}}
      doClick(httpGetItem, obj);
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

function doRandom() {
  console.log('outside of scope');
}

function getAudioPlayer(src) {
  var player = document.getElementsByTagName('audio')[0];
  player.src = src;
  player.load();
  return player;
}

audiojs.events.ready(function() {
  var as = audiojs.createAll();
});
