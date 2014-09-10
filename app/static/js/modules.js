'use strict';

angular.module('Poetree', ['poetreeServices', 'poetreeFilters', 'poetreeDirectives', 'ui.bootstrap', 'angular-loading-bar'])
  .controller('main', function($scope, $http, $location, $window) {
    $scope.hasBack = false;
    $scope.hasAudio = false;
    $scope.hasDiscover = false;
    $scope.hasRandom = false;
    $scope.isPlaying = false;

    $scope.setVars = function(hasBack, hasRandom, hasAudio, hasDiscover) {
      $scope.hasBack = hasBack;
      $scope.hasRandom = hasRandom;
      $scope.hasAudio = hasAudio;
      $scope.hasDiscover = hasDiscover;
    }
    $scope.setObject = function(poem, poet, searchTerm) {
      $scope.poem = poem;
      $scope.poet = poet;
      $scope.searchTerm = searchTerm;
      if (poem && poem.audio) {
        $scope.hasAudio = true;
      }
    }
    $scope.setObject(null, null, null);

    function doClick(f, optional_var) {
      if ($scope.isPlaying) {poemAudio.pauseAudio()}
      f(optional_var);
    }
    function doRandom() {
      $http.get('/random-poem-route', {}).then(function(result) {
        if (!result.data.success) {
          $scope.warningTerm = "Oh no, there was an error. Please try again."
        } else {
          $location.path('/poem/' + result.data.route);
        }
      })
    }
    function doBack() {
      //Returns to poet page from poem page
      if (!$scope.poet || !$scope.poet.route) {
        return;
      }
      $location.path('/poet/' + $scope.poet.route);
    }
    function doPlay() {
      if ($scope.poem && $scope.poem.audio != null) {
        if (!$scope.initializedAudioPlayer) {
          poemAudio.initAudioPlayer('audio-src')
          $scope.initializedAudioPlayer = true;
        }
        poemAudio.setAudioPlayer($scope.poem.audio, audioPlayerEnded($scope))
        poemAudio.playAudio()
        $scope.isPlaying = true;
      }
    }

    $scope._clickRandom = function() {
      doClick(doRandom);
    }
    $scope._clickBack = function() {
      doClick(doBack);
    }
    $scope._clickPlay = function() {
      doClick(doPlay);
    }

    var audioPlayerEnded = function() {
      $scope.isPlaying = false;
    }

    $scope._getTypeaheadValues = function(val) {
      return $http.get('/typeahead/' + val, {}).then(function(result) {
        var poets = result.data.poets || [];
        var poems = result.data.poems || [];
        return poets.concat(poems);
      });
    }
    $scope._onSelectSearchTerm = function(item, model, label) {
      $location.path('/' + item.ty + '/' + item.route)
    }
    $scope._searchFocus = function(event) {
      event.target.value = '';
    }
    $scope._searchBlur = function(event) {
      event.target.value = $scope.searchTerm;
    }
  })
  .controller('about', function($scope) {

  })
  .controller('home', function($scope, $http) {
    $scope.$parent.setVars(false, true, false, false);
    $http.get('/all-poets', {}).then(function(result) {
      $scope.poetLists = sliceIntoArrays(result.data.poets, 3)
    });
  })
  .controller('poem', function($scope, $location, $routeParams, $sanitize, $window, $timeout, Poem, Post) {
    redirectIfNotArgs([$routeParams.route], $location)

    $window.addEventListener('load', poemAudio.initAudioRecorder());
    $window.addEventListener('load', poemAudio.initAudioPlayer('audio-src'));

    var setPoem = function(data) {
      $scope.poem = data;
      $scope.$parent.setObject(data, {'route':data['poet_route']}, data.title);
    }

    //Check routeParams for back, if so, set that var
    var poemQuery = Poem.get({route:$routeParams.route}, function(result) {
      var data = result.data;
      var hasBack = $routeParams.hasBack;
      var hasAudio = data.audio != null;
      setPoem(data);
      $scope.$parent.setVars(hasBack, !hasBack, hasAudio, !hasAudio);
      $scope.hasAudio = data.audio == null;
      $scope.hasVoice = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
      if ($scope.hasVoice) {
        $scope.hasPlayback = false;
        $scope.hasSaved = false;
        $scope.recording = false;
        $scope.countdown = -1;
      }

      if (hasBack) {
        $location.url($location.path()); //Clear out hasBack
      }
    });

    $scope.countdownTimer = function() {
      if ($scope.countdown > 0) {
        $scope.countdown--;
        if ($scope.countdown == 0) {
          $scope.recording = true;
          poemAudio.startRecording();
        }
        $timeout($scope.countdownTimer, 1000);
      }
    }
    $scope.$watch('countdown', function(newvar) {
      if (newvar > 0) {
        $scope.recordMessage = 'Ready in ' + newvar;
      } else if ($scope.recording) {
        $scope.recordMessage = 'Recording';
      } else if ($scope.hasPlayback) {
        $scope.recordMessage = 'Re-record';
      } else {
        $scope.recordMessage = 'Record';
      }
    });

    $scope.$watch('isPlaying', function(newVal) {
      $scope.$parent.isPlaying = newVal;
    });

    $scope.playback = function() {
      // Play the recording back to the user
      var record = poemAudio.getRecord();
      poemAudio.setAudioPlayer(record.url, function() {$scope.isPlaying = false;});
      poemAudio.playAudio();
      $scope.isPlaying = true;
    }
    $scope.save = function() {
      // Upload the recording to the server
      if ($scope.isPlaying) {poemAudio.pauseAudio()}
      $scope.isLoading = true;

      var form = new FormData();
      var record = poemAudio.getRecord();
      form.append('file', record.blob);
      form.append('route', $scope.poem.route);

      Post.postRecord(form).then(function(data) {
        if (data.data.success) {
          $scope.hasSaved = true;
          setPoem(data.data.poem);
        } else {
          $scope.warningTerm = data.data.msg;
        }
        $scope.isLoading = false;
      })
    }
    $scope.download = function() {
      // Let the user download their .wav recording
      var record = poemAudio.getRecord();
      $('a#download-link').attr({target:'_blank', href:record.url, download:$scope.poem.next_audio});
    }
    $scope.sanitize = function(txt) {
      if (txt) {
        return $sanitize(txt);
      }
    }
    $scope.toggleRecord = function(poem) {
      poemAudio.pauseAudio();
      $scope.hasPlayback = false;
      if ($scope.countdown > 0) { //Canceled during countdown
        $scope.countdown = -1;
      } else if ($scope.recording) { //Completed recording
        $scope.recording = false;
        $scope.countdown = -1;
        poemAudio.stopRecording();
        $scope.hasSaved = false;
        $scope.hasPlayback = true;
      } else { // Pressed the button. Start the timer.
        $scope.countdown = 2;
        $timeout($scope.countdownTimer, 1000);
      }
    }
  })
  .controller('poet', function($scope, $location, $routeParams, Poet) {
    redirectIfNotArgs([$routeParams.route], $location)

    var poetQuery = Poet.get({route:$routeParams.route}, function(result) {
      var data = result.data;
      $scope.poet = data;
      $scope.$parent.setVars(false, true, false, true);
      $scope.$parent.setObject(null, data, data.name);
      $scope.list = data.poems;
    });
  })
  .config([
    '$routeProvider', '$locationProvider',
    function($routeProvider, $locationProvider) {
      $routeProvider
	.when('/', {
	  templateUrl: '/static/partials/home.html',
          controller: 'home'
	})
        .when('/about', {
          templateUrl: '/static/partials/about.html',
          controller: 'about'
        })
        .when('/poet/:route', {
          templateUrl: '/static/partials/poet.html',
          controller: 'poet'
        })
        .when('/poem/:route', {
          templateUrl: '/static/partials/poem.html',
          controller: 'poem',
          reloadOnSearch: false
        })
	.otherwise({
	  redirectTo: '/'
	});
      $locationProvider.html5Mode(true);
    }
  ]);

audiojs.events.ready(function() {
  var as = audiojs.createAll();
})

function redirectIfNotArgs(params, $location) {
  for (var param in params) {
    if (!params[param] || params[param] == '') {
      $location.path('/')
    }
  }
}

function PoemAudio() {
  var audioRecorder = null;
  var audioPlayer = null;
  var record = {'url':null, 'blob':null};
  var initializedAudioRecorder = false;
  var initializedAudioPlayer = false;

  this.getRecord = function() {
    return record;
  }

  this.initAudioRecorder = function() {
    if (initializedAudioRecorder) {
      return;
    }

    if (!navigator.getUserMedia)
      navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
    if (!navigator.cancelAnimationFrame)
      navigator.cancelAnimationFrame = navigator.webkitCancelAnimationFrame || navigator.mozCancelAnimationFrame;
    if (!navigator.requestAnimationFrame)
      navigator.requestAnimationFrame = navigator.webkitRequestAnimationFrame || navigator.mozRequestAnimationFrame;

    var callback = gotStream;
    navigator.getUserMedia({audio:true}, callback, function(e) {
      console.log(e);
    });
  };

  this.initAudioPlayer = function(domID) {
    if (!initializedAudioPlayer || initializedAudioPlayer != domID) {
      initializedAudioPlayer = domID;
      audioPlayer = document.getElementById(domID);
      this.setAudioPlayer('', null);
    }
  }

  this.setAudioPlayer = function(src, callback) {
    audioPlayer.src = src;
    audioPlayer.load();
    if (callback) {
      audioPlayer.addEventListener('ended', callback);
    }
  }

  this.playAudio = function() {
    audioPlayer.play();
  };

  this.pauseAudio = function() {
    audioPlayer.pause();
  };

  this.stopRecording = function() {
    audioRecorder.stop();
    audioRecorder.getBuffer(saveAudio);
  };

  this.startRecording = function() {
    audioRecorder.clear();
    audioRecorder.record();
  };

  var saveAudio = function() {
    audioRecorder.exportWAV(doneEncoding);
  };

  var gotStream = function(stream) {
    var audioContext = new AudioContext();
    var inputPoint = audioContext.createGain();
    var realAudioInput = audioContext.createMediaStreamSource(stream);
    var audioInput = realAudioInput;
    audioInput.connect(inputPoint);
    audioRecorder = new Recorder(inputPoint);
    initializedAudioRecorder = true;
  };

  var doneEncoding = function(blob) {
    record.url = (window.URL || window.webkitURL).createObjectURL(blob);
    record.blob = blob;
  }
}
var poemAudio = new PoemAudio();

var sliceIntoArrays = function(arr, num) {
  //divides arr into num ~= arrays and returns them
  var ret = [];
  var div = parseInt(arr.length / num);
  var multiple = 1;
  while (multiple < num) {
    ret.push(arr.slice((multiple-1)*div, multiple*div))
    multiple += 1;
  }
  ret.push(arr.slice(multiple*div));
  return ret;
}