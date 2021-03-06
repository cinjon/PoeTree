(function () {
  var a, b, c, d, e;
  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia, window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext,
  function () {
    var a, b, c, d, e, f, g, h;
    for (e = window, h = ["ms", "moz", "webkit", "o"], f = 0, g = h.length; g > f && (d = h[f], !e.requestAnimationFrame); f++) e.requestAnimationFrame = e["" + d + "RequestAnimationFrame"], e.cancelAnimationFrame = e["" + d + "CancelAnimationFrame"] || e["" + d + "CancelRequestAnimationFrame"];
    if (e.requestAnimationFrame) {
      if (e.cancelAnimationFrame) return;
      return a = e.requestAnimationFrame, b = {}, e.requestAnimationFrame = function (c) {
        var d;
        return d = a(function (a) {
          return d in b ? delete b[d] : c(a)
        })
      }, e.cancelAnimationFrame = function (a) {
        return b[a] = !0
      }
    }
    return c = 0, e.requestAnimationFrame = function (a) {
      var b;
      return c = Math.max(c + 16, b = +new Date), e.setTimeout(function () {
        return a(+new Date)
      }, c - b)
    }, e.cancelAnimationFrame = function (a) {
      return clearTimeout(a)
    }
  }(), d = /debug/.test(window.location.search) ?
  function () {
    return console.log.apply(console, arguments)
  } : function () {}, c = function (a, b) {
    return this.name = "WitError", this.message = a || "", this.infos = b, this
  }, c.prototype = Error.prototype, b = "wss://api.wit.ai/speech_ws", a = function (a) {
    var b, c, d = this;
    return this.conn = null, this.ctx = new AudioContext, this.state = "disconnected", this.rec = !1, this.handleError = function (a) {
      var b, c;
      return _.isFunction(c = this.onerror) ? (b = _.isString(a) ? a : _.isString(a.message) ? a.message : "Something went wrong!", c.call(window, b, a)) : void 0
    }, this.handleResult = function (a) {
      var b, c, d;
      return _.isFunction(c = this.onresult) ? (d = a.outcome.intent, b = a.outcome.entities, c.call(window, d, b, a)) : void 0
    }, a && (this.elem = a, a.addEventListener("click", function () {
      console.log('toggling')
      return d.fsm("toggle_record")
    })),
    this.rmactive = function () {
      return this.elem ? this.elem.classList.remove("active") : void 0
    }, this.mkactive = function () {
      return this.elem ? this.elem.classList.add("active") : void 0
    }, this.mkthinking = function () {
    }, this.rmthinking = function () {
      return this.thinking = !1
    }, this
  }, e = {
    disconnected: {
      connect: function (a) {
        var c, d, e = this;
        return a || this.handleError("No token provided"), c = new WebSocket(b), c.onopen = function () {
          return c.send(JSON.stringify(["auth", a]))
        }, c.onclose = function () {
          return e.fsm("socket_closed")
        }, c.onmessage = function (a) {
          var b, c, d;
          return d = JSON.parse(a.data), c = d[0], b = d[1], b ? e.fsm.call(e, c, b) : e.fsm.call(e, c)
        }, this.conn = c, d = function (a) {
          var b, c, d;
          return b = e.ctx, d = b.createMediaStreamSource(a), c = (b.createScriptProcessor || b.createJavascriptNode).call(b, 4096, 1, 1), c.onaudioprocess = function (a) {
            var b;
            if (e.rec) return b = a.inputBuffer.getChannelData(0), e.conn.send(b)
          }, d.connect(c), c.connect(b.destination), e.stream = a, e.proc = c, e.src = d, e.fsm("got_stream")
        }, navigator.getUserMedia({
          audio: !0
        }, d, this.handleError), "connecting"
      }
    },
    connecting: {
      "auth-ok": function () {
        return "waiting_for_stream"
      },
      got_stream: function () {
        return "waiting_for_auth"
      },
      error: function (a) {
        return this.handleError(a), "connecting"
      },
      socket_closed: function () {
        return "disconnected"
      }
    },
    waiting_for_auth: {
      "auth-ok": function () {
        return "ready"
      }
    },
    waiting_for_stream: {
      got_stream: function () {
        return "ready"
      }
    },
    ready: {
      socket_closed: function () {
        return "disconnected"
      },
      timeout: function () {
        return "ready"
      },
      start: function () {
        return this.fsm("toggle_record")
      },
      toggle_record: function () {
        return this.conn.send(JSON.stringify(["start", this.context || {}])), this.rec = !0, this.ctx || console.error("No context"), this.stream || console.error("No stream"), this.src || console.error("No source"), this.proc || console.error("No processor"), "audiostart"
      }
    },
    audiostart: {
      error: function (a) {
        return this.rec = !1, this.handleError(new c("Error during recording", {
          code: "RECORD",
          data: a
        })), "ready"
      },
      socket_closed: function () {
        return this.rec = !1, "disconnected"
      },
      stop: function () {
        return this.fsm("toggle_record")
      },
      toggle_record: function () {
        var a = this;
        return this.rec = !1, this.conn.send(JSON.stringify(["stop"])), this.timer = setTimeout(function () {
          return a.fsm("timeout")
        }, 7e3), "audioend"
      }
    },
    audioend: {
      socket_closed: function () {
        return this.timer && clearTimeout(this.timer), "disconnected"
      },
      timeout: function () {
        return this.handleError(new c("Wit timed out", {
          code: "TIMEOUT"
        })), "ready"
      },
      error: function (a) {
        return this.timer && clearTimeout(this.timer), this.handleError(new c("Wit did not recognize intent", {
          code: "RESULT",
          data: a
        })), "ready"
      },
      result: function (a) {
        return this.timer && clearTimeout(this.timer), this.handleResult(a), "ready"
      }
    }
  }, a.prototype.fsm = function (a) {
    var b, c, f, g;
    if (c = null != (g = e[this.state]) ? g[a] : void 0, b = Array.prototype.slice.call(arguments, 1), _.isFunction(c)) switch (f = c.apply(this, b), d("fsm: " + this.state + " + " + a + " -> " + f, b), this.state = f, ("audiostart" === f || "audioend" === f || "ready" === f) && _.isFunction(c = this["on" + f]) && c.call(window), f) {
    case "disconnected":
      this.rmthinking(), this.rmactive();
      break;
    case "ready":
      this.rmthinking(), this.rmactive();
      break;
    case "audiostart":
      this.mkactive();
      break;
    case "audioend":
      this.mkthinking(), this.rmactive()
    } else d("fsm error: " + this.state + " + " + a, b);
    return f
  }, a.prototype.connect = function (a) {
    return this.fsm("connect", a)
  }, a.prototype.start = function () {
    return this.fsm("start")
  }, a.prototype.stop = function () {
    return this.fsm("stop")
  }, a.prototype.setContext = function (a) {
    var b, c;
    this.context || (this.context = {});
    for (b in a) c = a[b], this.context[b] = a[b];
    return d("context: ", this.context), null
  }, window._ || (window._ = {}), _.isFunction || (_.isFunction = function (a) {
    return "function" == typeof a
  }), _.isString || (_.isString = function (a) {
    return "[object String]" === toString.call(a)
  }), window.Wit || (window.Wit = {}), Wit.Microphone = a
}).call(this);