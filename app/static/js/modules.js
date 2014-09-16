
'use strict';

angular.module('Poetree', ['poetreeServices', 'poetreeFilters', 'poetreeDirectives', 'ui.bootstrap', 'angular-loading-bar'])
  .controller('main', function($scope, $http, $location, $window) {
    $scope.mobile = window.mobilecheck();
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
      $scope.shouldBlurSearch = false;
      $location.path('/' + item.ty + '/' + item.route);
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
    $scope.mobile = $scope.$parent.mobile;
    $scope.$parent.setVars(false, true, false, false);
    $http.get('/all-poets', {}).then(function(result) {
      if ($scope.mobile) {
        $scope.poetLists = sliceIntoArrays(result.data.poets, 2);
      } else {
        $scope.poetLists = sliceIntoArrays(result.data.poets, 3);
      }
    });
  })
  .controller('poem', function($scope, $location, $routeParams, $sanitize, $window, $timeout, Poem, Post) {
    redirectIfNotArgs([$routeParams.route], $location)

    $scope.mobile = $scope.$parent.mobile;
    if (!$scope.mobile) {
      $window.addEventListener('load', poemAudio.initAudioRecorder());
    }
    $window.addEventListener('load', poemAudio.initAudioPlayer('audio-src'));

    $scope.$parent.shouldBlurSearch = true;

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
      $scope.hasAudio = hasAudio;
      $scope.hasVoice = !$scope.mobile && (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
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
    $scope.play = function() {
      $scope.$parent._clickPlay();
    }
    $scope.random = function() {
      $scope.$parent._clickRandom();
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
    $scope.mobile = $scope.$parent.mobile;

    $scope.getPoemHref = function(poem) {
      var href = '/poem/' + poem.route;
      if (!$scope.mobile) {
        href += '?hasBack';
      }
      return href;
    }
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
  ret.push(arr.slice((multiple-1)*div));
  return ret;
}

window.mobilecheck = function() {
  var check = false;
  (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od|ad)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))check = true})(navigator.userAgent||navigator.vendor||window.opera);
  return check;
}
