
/**
 * AdGuard Scriptlets
 * Version 1.1.9
 */

(function () {
    function randomId() {
      return Math.random().toString(36).substr(2, 9);
    }

    function setPropertyAccess(object, property, descriptor) {
      var currentDescriptor = Object.getOwnPropertyDescriptor(object, property);
      if (currentDescriptor && !currentDescriptor.configurable) {
        return false;
      }
      Object.defineProperty(object, property, descriptor);
      return true;
    }

    function getPropertyInChain(base, chain) {
      var addProp = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
      var pos = chain.indexOf('.');
      if (pos === -1) {
        return {
          base: base,
          prop: chain
        };
      }
      var prop = chain.slice(0, pos);
      var own = base[prop];
      chain = chain.slice(pos + 1);
      if (own !== undefined) {
        return getPropertyInChain(own, chain, addProp);
      }
      if (!addProp) {
        return false;
      }
      Object.defineProperty(base, prop, {
        configurable: true
      });
      return {
        base: own,
        prop: prop,
        chain: chain
      };
    }

    var escapeRegExp = function escapeRegExp(str) {
      return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };
    var toRegExp = function toRegExp(str) {
      if (str[0] === '/' && str[str.length - 1] === '/') {
        return new RegExp(str.slice(1, -1));
      }
      var escaped = str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(escaped);
    };
    var getBeforeRegExp = function getBeforeRegExp(str, rx) {
      var index = str.search(rx);
      return str.substring(0, index);
    };
    var startsWith = function startsWith(str, prefix) {
      return str && str.indexOf(prefix) === 0;
    };
    var substringAfter = function substringAfter(str, separator) {
      if (!str) {
        return str;
      }
      var index = str.indexOf(separator);
      return index < 0 ? '' : str.substring(index + separator.length);
    };
    var substringBefore = function substringBefore(str, separator) {
      if (!str || !separator) {
        return str;
      }
      var index = str.indexOf(separator);
      return index < 0 ? str : str.substring(0, index);
    };
    var wrapInSingleQuotes = function wrapInSingleQuotes(str) {
      if (str[0] === '\'' && str[str.length - 1] === '\'' || str[0] === '"' && str[str.length - 1] === '"') {
        str = str.substring(1, str.length - 1);
      }
      str = str.replace(/\'/g, '"');
      return "'".concat(str, "'");
    };
    var getStringInBraces = function getStringInBraces(str) {
      var firstIndex = str.indexOf('(');
      var lastIndex = str.lastIndexOf(')');
      return str.substring(firstIndex + 1, lastIndex);
    };

    function createOnErrorHandler(rid) {
      var nativeOnError = window.onerror;
      return function onError(error) {
        if (typeof error === 'string' && error.indexOf(rid) !== -1) {
          return true;
        }
        if (nativeOnError instanceof Function) {
          for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
            args[_key - 1] = arguments[_key];
          }
          return nativeOnError.apply(this, [error].concat(args));
        }
        return false;
      };
    }

    var noop = function noop() {};
    var noopNull = function noopNull() {
      return null;
    };
    function noopThis() {
      return this;
    }
    var noopArray = function noopArray() {
      return [];
    };
    var noopStr = function noopStr() {
      return '';
    };

    var hit = function hit(source, message) {
      if (source.verbose !== true) {
        return;
      }
      try {
        var log = console.log.bind(console);
        var trace = console.trace.bind(console);
        var prefix = source.ruleText || '';
        if (message) {
          log("".concat(prefix, " message:\n").concat(message));
        }
        log("".concat(prefix, " trace start"));
        if (trace) {
          trace();
        }
        log("".concat(prefix, " trace end"));
      } catch (e) {}
      if (typeof window.__debugScriptlets === 'function') {
        window.__debugScriptlets(source);
      }
    };

    var observeDOMChanges = function observeDOMChanges(callback) {
      var observeAttrs = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      var attrsToObserv = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
      var throttle = function throttle(method, delay) {
        var wait = false;
        var savedArgs;
        var wrapper = function wrapper() {
          for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }
          if (wait) {
            savedArgs = args;
            return;
          }
          method.apply(void 0, args);
          wait = true;
          setTimeout(function () {
            wait = false;
            if (savedArgs) {
              wrapper(savedArgs);
              savedArgs = null;
            }
          }, delay);
        };
        return wrapper;
      };
      var THROTTLE_DELAY_MS = 20;
      var observer = new MutationObserver(throttle(callbackWrapper, THROTTLE_DELAY_MS));
      var connect = function connect() {
        if (attrsToObserv.length > 0) {
          observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: observeAttrs,
            attributeFilter: attrsToObserv
          });
        } else {
          observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: observeAttrs
          });
        }
      };
      var disconnect = function disconnect() {
        observer.disconnect();
      };
      function callbackWrapper() {
        disconnect();
        callback();
        connect();
      }
      connect();
    };



    var dependencies = /*#__PURE__*/Object.freeze({
        __proto__: null,
        randomId: randomId,
        setPropertyAccess: setPropertyAccess,
        getPropertyInChain: getPropertyInChain,
        escapeRegExp: escapeRegExp,
        toRegExp: toRegExp,
        getBeforeRegExp: getBeforeRegExp,
        startsWith: startsWith,
        substringAfter: substringAfter,
        substringBefore: substringBefore,
        wrapInSingleQuotes: wrapInSingleQuotes,
        getStringInBraces: getStringInBraces,
        createOnErrorHandler: createOnErrorHandler,
        noop: noop,
        noopNull: noopNull,
        noopThis: noopThis,
        noopArray: noopArray,
        noopStr: noopStr,
        hit: hit,
        observeDOMChanges: observeDOMChanges
    });

    function attachDependencies(scriptlet) {
      var _scriptlet$injections = scriptlet.injections,
          injections = _scriptlet$injections === void 0 ? [] : _scriptlet$injections;
      return injections.reduce(function (accum, dep) {
        return "".concat(accum, "\n").concat(dependencies[dep.name]);
      }, scriptlet.toString());
    }
    function addCall(scriptlet, code) {
      return "".concat(code, ";\n        const updatedArgs = args ? [].concat(source).concat(args) : [source];\n        ").concat(scriptlet.name, ".apply(this, updatedArgs);\n    ");
    }
    function passSourceAndProps(source, code) {
      if (source.hit) {
        source.hit = source.hit.toString();
      }
      var sourceString = JSON.stringify(source);
      var argsString = source.args ? "[".concat(source.args.map(JSON.stringify), "]") : undefined;
      var params = argsString ? "".concat(sourceString, ", ").concat(argsString) : sourceString;
      return "(function(source, args){\n".concat(code, "\n})(").concat(params, ");");
    }
    function wrapInNonameFunc(code) {
      return "function(source, args){\n".concat(code, "\n}");
    }

    function _arrayWithHoles(arr) {
      if (Array.isArray(arr)) return arr;
    }
    var arrayWithHoles = _arrayWithHoles;

    function _iterableToArrayLimit(arr, i) {
      if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) {
        return;
      }
      var _arr = [];
      var _n = true;
      var _d = false;
      var _e = undefined;
      try {
        for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
          _arr.push(_s.value);
          if (i && _arr.length === i) break;
        }
      } catch (err) {
        _d = true;
        _e = err;
      } finally {
        try {
          if (!_n && _i["return"] != null) _i["return"]();
        } finally {
          if (_d) throw _e;
        }
      }
      return _arr;
    }
    var iterableToArrayLimit = _iterableToArrayLimit;

    function _nonIterableRest() {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
    var nonIterableRest = _nonIterableRest;

    function _slicedToArray(arr, i) {
      return arrayWithHoles(arr) || iterableToArrayLimit(arr, i) || nonIterableRest();
    }
    var slicedToArray = _slicedToArray;

    function _defineProperty(obj, key, value) {
      if (key in obj) {
        Object.defineProperty(obj, key, {
          value: value,
          enumerable: true,
          configurable: true,
          writable: true
        });
      } else {
        obj[key] = value;
      }
      return obj;
    }
    var defineProperty = _defineProperty;

    function iterateWithTransitions(iterable, transitions, init, args) {
      var state = init || Object.keys(transitions)[0];
      for (var i = 0; i < iterable.length; i += 1) {
        state = transitions[state](iterable, i, args);
      }
      return state;
    }
    var ADG_SCRIPTLET_MASK = '#//scriptlet';
    var wordSaver = function wordSaver() {
      var str = '';
      var strs = [];
      var saveSymb = function saveSymb(s) {
        str += s;
        return str;
      };
      var saveStr = function saveStr() {
        strs.push(str);
        str = '';
      };
      var getAll = function getAll() {
        return [].concat(strs);
      };
      return {
        saveSymb: saveSymb,
        saveStr: saveStr,
        getAll: getAll
      };
    };
    var substringAfter$1 = function substringAfter(str, separator) {
      if (!str) {
        return str;
      }
      var index = str.indexOf(separator);
      return index < 0 ? '' : str.substring(index + separator.length);
    };
    var parseRule = function parseRule(ruleText) {
      var _transitions;
      ruleText = substringAfter$1(ruleText, ADG_SCRIPTLET_MASK);
      var TRANSITION = {
        OPENED: 'opened',
        PARAM: 'param',
        CLOSED: 'closed'
      };
      var opened = function opened(rule, index, _ref) {
        var sep = _ref.sep;
        var char = rule[index];
        var transition;
        switch (char) {
          case ' ':
          case '(':
          case ',':
            {
              transition = TRANSITION.OPENED;
              break;
            }
          case '\'':
          case '"':
            {
              sep.symb = char;
              transition = TRANSITION.PARAM;
              break;
            }
          case ')':
            {
              transition = index === rule.length - 1 ? TRANSITION.CLOSED : TRANSITION.OPENED;
              break;
            }
          default:
            {
              throw new Error('The rule is not a scriptlet');
            }
        }
        return transition;
      };
      var param = function param(rule, index, _ref2) {
        var saver = _ref2.saver,
            sep = _ref2.sep;
        var char = rule[index];
        switch (char) {
          case '\'':
          case '"':
            {
              var preIndex = index - 1;
              var before = rule[preIndex];
              if (char === sep.symb && before !== '\\') {
                sep.symb = null;
                saver.saveStr();
                return TRANSITION.OPENED;
              }
            }
          default:
            {
              saver.saveSymb(char);
              return TRANSITION.PARAM;
            }
        }
      };
      var transitions = (_transitions = {}, defineProperty(_transitions, TRANSITION.OPENED, opened), defineProperty(_transitions, TRANSITION.PARAM, param), defineProperty(_transitions, TRANSITION.CLOSED, function () {}), _transitions);
      var sep = {
        symb: null
      };
      var saver = wordSaver();
      var state = iterateWithTransitions(ruleText, transitions, TRANSITION.OPENED, {
        sep: sep,
        saver: saver
      });
      if (state !== 'closed') {
        throw new Error("Invalid scriptlet rule ".concat(ruleText));
      }
      var args = saver.getAll();
      return {
        name: args[0],
        args: args.slice(1)
      };
    };

    function abortOnPropertyRead(source, property) {
      if (!property) {
        return;
      }
      var rid = randomId();
      var abort = function abort() {
        hit(source);
        throw new ReferenceError(rid);
      };
      var setChainPropAccess = function setChainPropAccess(owner, property) {
        var chainInfo = getPropertyInChain(owner, property);
        var base = chainInfo.base;
        var prop = chainInfo.prop,
            chain = chainInfo.chain;
        if (chain) {
          var setter = function setter(a) {
            base = a;
            if (a instanceof Object) {
              setChainPropAccess(a, chain);
            }
          };
          Object.defineProperty(owner, prop, {
            get: function get() {
              return base;
            },
            set: setter
          });
          return;
        }
        setPropertyAccess(base, prop, {
          get: abort,
          set: function set() {}
        });
      };
      setChainPropAccess(window, property);
      window.onerror = createOnErrorHandler(rid).bind();
    }
    abortOnPropertyRead.names = ['abort-on-property-read', 'abort-on-property-read.js', 'ubo-abort-on-property-read.js', 'aopr.js', 'ubo-aopr.js', 'abp-abort-on-property-read'];
    abortOnPropertyRead.injections = [randomId, setPropertyAccess, getPropertyInChain, createOnErrorHandler, hit];

    function abortOnPropertyWrite(source, property) {
      if (!property) {
        return;
      }
      var rid = randomId();
      var abort = function abort() {
        hit(source);
        throw new ReferenceError(rid);
      };
      var setChainPropAccess = function setChainPropAccess(owner, property) {
        var chainInfo = getPropertyInChain(owner, property);
        var base = chainInfo.base;
        var prop = chainInfo.prop,
            chain = chainInfo.chain;
        if (chain) {
          var setter = function setter(a) {
            base = a;
            if (a instanceof Object) {
              setChainPropAccess(a, chain);
            }
          };
          Object.defineProperty(owner, prop, {
            get: function get() {
              return base;
            },
            set: setter
          });
          return;
        }
        setPropertyAccess(base, prop, {
          set: abort
        });
      };
      setChainPropAccess(window, property);
      window.onerror = createOnErrorHandler(rid).bind();
    }
    abortOnPropertyWrite.names = ['abort-on-property-write', 'abort-on-property-write.js', 'ubo-abort-on-property-write.js', 'aopw.js', 'ubo-aopw.js', 'abp-abort-on-property-write'];
    abortOnPropertyWrite.injections = [randomId, setPropertyAccess, getPropertyInChain, createOnErrorHandler, hit];

    function preventSetTimeout(source, match, delay) {
      var nativeTimeout = window.setTimeout;
      var nativeIsNaN = Number.isNaN || window.isNaN;
      var log = console.log.bind(console);
      var shouldLog = typeof match === 'undefined' && typeof delay === 'undefined';
      var INVERT_MARKER = '!';
      var isNotMatch = startsWith(match, INVERT_MARKER);
      if (isNotMatch) {
        match = match.slice(1);
      }
      var isNotDelay = startsWith(delay, INVERT_MARKER);
      if (isNotDelay) {
        delay = delay.slice(1);
      }
      delay = parseInt(delay, 10);
      delay = nativeIsNaN(delay) ? null : delay;
      match = match ? toRegExp(match) : toRegExp('/.?/');
      var timeoutWrapper = function timeoutWrapper(callback, timeout) {
        var shouldPrevent = false;
        if (shouldLog) {
          hit(source);
          log("setTimeout(\"".concat(callback.toString(), "\", ").concat(timeout, ")"));
        } else if (!delay) {
          shouldPrevent = match.test(callback.toString()) !== isNotMatch;
        } else if (match === '/.?/') {
          shouldPrevent = timeout === delay !== isNotDelay;
        } else {
          shouldPrevent = match.test(callback.toString()) !== isNotMatch && timeout === delay !== isNotDelay;
        }
        if (shouldPrevent) {
          hit(source);
          return nativeTimeout(function () {}, timeout);
        }
        for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
          args[_key - 2] = arguments[_key];
        }
        return nativeTimeout.apply(window, [callback, timeout].concat(args));
      };
      window.setTimeout = timeoutWrapper;
    }
    preventSetTimeout.names = ['prevent-setTimeout', 'no-setTimeout-if.js',
    'ubo-no-setTimeout-if.js', 'setTimeout-defuser.js',
    'ubo-setTimeout-defuser.js', 'nostif.js',
    'ubo-nostif.js', 'std.js',
    'ubo-std.js'];
    preventSetTimeout.injections = [toRegExp, startsWith, hit];

    function preventSetInterval(source, match, delay) {
      var nativeInterval = window.setInterval;
      var nativeIsNaN = Number.isNaN || window.isNaN;
      var log = console.log.bind(console);
      var shouldLog = typeof match === 'undefined' && typeof delay === 'undefined';
      var INVERT_MARKER = '!';
      var isNotMatch = startsWith(match, INVERT_MARKER);
      if (isNotMatch) {
        match = match.slice(1);
      }
      var isNotDelay = startsWith(delay, INVERT_MARKER);
      if (isNotDelay) {
        delay = delay.slice(1);
      }
      delay = parseInt(delay, 10);
      delay = nativeIsNaN(delay) ? null : delay;
      match = match ? toRegExp(match) : toRegExp('/.?/');
      var intervalWrapper = function intervalWrapper(callback, interval) {
        var shouldPrevent = false;
        if (shouldLog) {
          hit(source);
          log("setInterval(\"".concat(callback.toString(), "\", ").concat(interval, ")"));
        } else if (!delay) {
          shouldPrevent = match.test(callback.toString()) !== isNotMatch;
        } else if (match === '/.?/') {
          shouldPrevent = interval === delay !== isNotDelay;
        } else {
          shouldPrevent = match.test(callback.toString()) !== isNotMatch && interval === delay !== isNotDelay;
        }
        if (shouldPrevent) {
          hit(source);
          return nativeInterval(function () {}, interval);
        }
        for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
          args[_key - 2] = arguments[_key];
        }
        return nativeInterval.apply(window, [callback, interval].concat(args));
      };
      window.setInterval = intervalWrapper;
    }
    preventSetInterval.names = ['prevent-setInterval', 'no-setInterval-if.js',
    'ubo-no-setInterval-if.js', 'setInterval-defuser.js',
    'ubo-setInterval-defuser.js', 'nosiif.js',
    'ubo-nosiif.js', 'sid.js',
    'ubo-sid.js'];
    preventSetInterval.injections = [toRegExp, startsWith, hit];

    function preventWindowOpen(source, inverse, match) {
      var nativeOpen = window.open;
      inverse = inverse ? !+inverse : !!inverse;
      match = match ? toRegExp(match) : toRegExp('/.?/');
      var openWrapper = function openWrapper(str) {
        if (inverse === match.test(str)) {
          for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
            args[_key - 1] = arguments[_key];
          }
          return nativeOpen.apply(window, [str].concat(args));
        }
        hit(source);
      };
      window.open = openWrapper;
    }
    preventWindowOpen.names = ['prevent-window-open', 'window.open-defuser.js', 'ubo-window.open-defuser.js'];
    preventWindowOpen.injections = [toRegExp, hit];

    function abortCurrentInlineScript(source, property) {
      var search = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
      var regex = search ? toRegExp(search) : null;
      var rid = randomId();
      var getCurrentScript = function getCurrentScript() {
        if (!document.currentScript) {
          var scripts = document.getElementsByTagName('script');
          return scripts[scripts.length - 1];
        }
        return document.currentScript;
      };
      var ourScript = getCurrentScript();
      var abort = function abort() {
        var scriptEl = getCurrentScript();
        var content = scriptEl.textContent;
        try {
          var textContentGetter = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent').get;
          content = textContentGetter.call(scriptEl);
        } catch (e) {}
        if (scriptEl instanceof HTMLScriptElement && content.length > 0 && scriptEl !== ourScript && (!regex || regex.test(scriptEl.textContent))) {
          hit(source);
          throw new ReferenceError(rid);
        }
      };
      var setChainPropAccess = function setChainPropAccess(owner, property) {
        var chainInfo = getPropertyInChain(owner, property);
        var base = chainInfo.base;
        var prop = chainInfo.prop,
            chain = chainInfo.chain;
        if (chain) {
          var setter = function setter(a) {
            base = a;
            if (a instanceof Object) {
              setChainPropAccess(a, chain);
            }
          };
          Object.defineProperty(owner, prop, {
            get: function get() {
              return base;
            },
            set: setter
          });
          return;
        }
        var currentValue = base[prop];
        setPropertyAccess(base, prop, {
          set: function set(value) {
            abort();
            currentValue = value;
          },
          get: function get() {
            abort();
            return currentValue;
          }
        });
      };
      setChainPropAccess(window, property);
      window.onerror = createOnErrorHandler(rid).bind();
    }
    abortCurrentInlineScript.names = ['abort-current-inline-script', 'abort-current-inline-script.js', 'ubo-abort-current-inline-script.js', 'acis.js', 'ubo-acis.js', 'abp-abort-current-inline-script'];
    abortCurrentInlineScript.injections = [randomId, setPropertyAccess, getPropertyInChain, toRegExp, createOnErrorHandler, hit];

    function setConstant(source, property, value) {
      if (!property) {
        return;
      }
      var nativeIsNaN = Number.isNaN || window.isNaN;
      var constantValue;
      if (value === 'undefined') {
        constantValue = undefined;
      } else if (value === 'false') {
        constantValue = false;
      } else if (value === 'true') {
        constantValue = true;
      } else if (value === 'null') {
        constantValue = null;
      } else if (value === 'noopFunc') {
        constantValue = function constantValue() {};
      } else if (value === 'trueFunc') {
        constantValue = function constantValue() {
          return true;
        };
      } else if (value === 'falseFunc') {
        constantValue = function constantValue() {
          return false;
        };
      } else if (/^\d+$/.test(value)) {
        constantValue = parseFloat(value);
        if (nativeIsNaN(constantValue)) {
          return;
        }
        if (Math.abs(constantValue) > 0x7FFF) {
          return;
        }
      } else if (value === '-1') {
        constantValue = -1;
      } else if (value === '') {
        constantValue = '';
      } else {
        return;
      }
      var canceled = false;
      var mustCancel = function mustCancel(value) {
        if (canceled) {
          return canceled;
        }
        canceled = value !== undefined && constantValue !== undefined && typeof value !== typeof constantValue;
        return canceled;
      };
      var setChainPropAccess = function setChainPropAccess(owner, property) {
        var chainInfo = getPropertyInChain(owner, property);
        var base = chainInfo.base;
        var prop = chainInfo.prop,
            chain = chainInfo.chain;
        if (chain) {
          var setter = function setter(a) {
            base = a;
            if (a instanceof Object) {
              setChainPropAccess(a, chain);
            }
          };
          Object.defineProperty(owner, prop, {
            get: function get() {
              return base;
            },
            set: setter
          });
          return;
        }
        if (mustCancel(base[prop])) {
          return;
        }
        hit(source);
        setPropertyAccess(base, prop, {
          get: function get() {
            return constantValue;
          },
          set: function set(a) {
            if (mustCancel(a)) {
              constantValue = a;
            }
          }
        });
      };
      setChainPropAccess(window, property);
    }
    setConstant.names = ['set-constant', 'set-constant.js', 'ubo-set-constant.js', 'set.js', 'ubo-set.js'];
    setConstant.injections = [getPropertyInChain, setPropertyAccess, hit];

    function removeCookie(source, match) {
      var regex = match ? toRegExp(match) : toRegExp('/.?/');
      var removeCookieFromHost = function removeCookieFromHost(cookieName, hostName) {
        var cookieSpec = "".concat(cookieName, "=");
        var domain1 = "; domain=".concat(hostName);
        var domain2 = "; domain=.".concat(hostName);
        var path = '; path=/';
        var expiration = '; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = cookieSpec + expiration;
        document.cookie = cookieSpec + domain1 + expiration;
        document.cookie = cookieSpec + domain2 + expiration;
        document.cookie = cookieSpec + path + expiration;
        document.cookie = cookieSpec + domain1 + path + expiration;
        document.cookie = cookieSpec + domain2 + path + expiration;
        hit(source);
      };
      var rmCookie = function rmCookie() {
        document.cookie.split(';').forEach(function (cookieStr) {
          var pos = cookieStr.indexOf('=');
          if (pos === -1) {
            return;
          }
          var cookieName = cookieStr.slice(0, pos).trim();
          if (!regex.test(cookieName)) {
            return;
          }
          var hostParts = document.location.hostname.split('.');
          for (var i = 0; i <= hostParts.length - 1; i += 1) {
            var hostName = hostParts.slice(i).join('.');
            if (hostName) {
              removeCookieFromHost(cookieName, hostName);
            }
          }
        });
      };
      rmCookie();
      window.addEventListener('beforeunload', rmCookie);
    }
    removeCookie.names = ['remove-cookie', 'cookie-remover.js', 'ubo-cookie-remover.js'];
    removeCookie.injections = [toRegExp, hit];

    function preventAddEventListener(source, event, funcStr) {
      event = event ? toRegExp(event) : toRegExp('/.?/');
      funcStr = funcStr ? toRegExp(funcStr) : toRegExp('/.?/');
      var nativeAddEventListener = window.EventTarget.prototype.addEventListener;
      function addEventListenerWrapper(eventName, callback) {
        if (event.test(eventName.toString()) && funcStr.test(callback.toString())) {
          hit(source);
          return undefined;
        }
        for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
          args[_key - 2] = arguments[_key];
        }
        return nativeAddEventListener.apply(this, [eventName, callback].concat(args));
      }
      window.EventTarget.prototype.addEventListener = addEventListenerWrapper;
    }
    preventAddEventListener.names = ['prevent-addEventListener', 'addEventListener-defuser.js', 'ubo-addEventListener-defuser.js', 'aeld.js', 'ubo-aeld.js'];
    preventAddEventListener.injections = [toRegExp, hit];

    function preventBab(source) {
      var _this = this;
      var nativeSetTimeout = window.setTimeout;
      var babRegex = /\.bab_elementid.$/;
      window.setTimeout = function (callback) {
        if (typeof callback !== 'string' || !babRegex.test(callback)) {
          for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
            args[_key - 1] = arguments[_key];
          }
          return nativeSetTimeout.call.apply(nativeSetTimeout, [_this, callback].concat(args));
        }
        hit(source);
      };
      var signatures = [['blockadblock'], ['babasbm'], [/getItem\('babn'\)/], ['getElementById', 'String.fromCharCode', 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 'charAt', 'DOMContentLoaded', 'AdBlock', 'addEventListener', 'doScroll', 'fromCharCode', '<<2|r>>4', 'sessionStorage', 'clientWidth', 'localStorage', 'Math', 'random']];
      var check = function check(str) {
        for (var i = 0; i < signatures.length; i += 1) {
          var tokens = signatures[i];
          var match = 0;
          for (var j = 0; j < tokens.length; j += 1) {
            var token = tokens[j];
            var found = token instanceof RegExp ? token.test(str) : str.indexOf(token) > -1;
            if (found) {
              match += 1;
            }
          }
          if (match / tokens.length >= 0.8) {
            return true;
          }
        }
        return false;
      };
      var nativeEval = window.eval;
      window.eval = function (str) {
        if (!check(str)) {
          return nativeEval(str);
        }
        hit(source);
        var bodyEl = document.body;
        if (bodyEl) {
          bodyEl.style.removeProperty('visibility');
        }
        var el = document.getElementById('babasbmsgx');
        if (el) {
          el.parentNode.removeChild(el);
        }
      };
    }
    preventBab.names = ['prevent-bab', 'bab-defuser.js', 'ubo-bab-defuser.js', 'nobab.js', 'ubo-nobab.js'];
    preventBab.injections = [hit];

    function nowebrtc(source) {
      var propertyName = '';
      if (window.RTCPeerConnection) {
        propertyName = 'RTCPeerConnection';
      } else if (window.webkitRTCPeerConnection) {
        propertyName = 'webkitRTCPeerConnection';
      }
      if (propertyName === '') {
        return;
      }
      var rtcReplacement = function rtcReplacement(config) {
        hit(source, "Document tried to create an RTCPeerConnection: ".concat(config));
      };
      var noop = function noop() {};
      rtcReplacement.prototype = {
        close: noop,
        createDataChannel: noop,
        createOffer: noop,
        setRemoteDescription: noop
      };
      var rtc = window[propertyName];
      window[propertyName] = rtcReplacement;
      if (rtc.prototype) {
        rtc.prototype.createDataChannel = function (a, b) {
          return {
            close: noop,
            send: noop
          };
        }.bind(null);
      }
    }
    nowebrtc.names = ['nowebrtc', 'nowebrtc.js', 'ubo-nowebrtc.js'];
    nowebrtc.injections = [hit];

    function logAddEventListener(source) {
      var log = console.log.bind(console);
      var nativeAddEventListener = window.EventTarget.prototype.addEventListener;
      function addEventListenerWrapper(eventName, callback) {
        hit(source);
        log("addEventListener(\"".concat(eventName, "\", ").concat(callback.toString(), ")"));
        for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
          args[_key - 2] = arguments[_key];
        }
        return nativeAddEventListener.apply(this, [eventName, callback].concat(args));
      }
      window.EventTarget.prototype.addEventListener = addEventListenerWrapper;
    }
    logAddEventListener.names = ['log-addEventListener', 'addEventListener-logger.js', 'ubo-addEventListener-logger.js', 'aell.js', 'ubo-aell.js'];
    logAddEventListener.injections = [hit];

    function logEval(source) {
      var log = console.log.bind(console);
      var nativeEval = window.eval;
      function evalWrapper(str) {
        hit(source);
        log("eval(\"".concat(str, "\")"));
        return nativeEval(str);
      }
      window.eval = evalWrapper;
      var nativeFunction = window.Function;
      function FunctionWrapper() {
        hit(source);
        for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }
        log("new Function(".concat(args.join(', '), ")"));
        return nativeFunction.apply(this, [].concat(args));
      }
      FunctionWrapper.prototype = Object.create(nativeFunction.prototype);
      FunctionWrapper.prototype.constructor = FunctionWrapper;
      window.Function = FunctionWrapper;
    }
    logEval.names = ['log-eval'];
    logEval.injections = [hit];

    function log() {
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }
      console.log(args);
    }
    log.names = ['log'];

    function noeval(source) {
      window.eval = function evalWrapper(s) {
        hit(source, "AdGuard has prevented eval:\n".concat(s));
      }.bind();
    }
    noeval.names = ['noeval', 'noeval.js', 'silent-noeval.js', 'ubo-noeval.js', 'ubo-silent-noeval.js'];
    noeval.injections = [hit];

    function preventEvalIf(source, search) {
      search = search ? toRegExp(search) : toRegExp('/.?/');
      var nativeEval = window.eval;
      window.eval = function (payload) {
        if (!search.test(payload.toString())) {
          return nativeEval.call(window, payload);
        }
        hit(source, payload);
        return undefined;
      }.bind(window);
    }
    preventEvalIf.names = ['prevent-eval-if', 'noeval-if.js', 'ubo-noeval-if.js'];
    preventEvalIf.injections = [toRegExp, hit];

    function preventFab(source) {
      hit(source);
      var Fab = function Fab() {};
      Fab.prototype.check = noop;
      Fab.prototype.clearEvent = noop;
      Fab.prototype.emitEvent = noop;
      Fab.prototype.on = function (a, b) {
        if (!a) {
          b();
        }
        return this;
      };
      Fab.prototype.onDetected = function () {
        return this;
      };
      Fab.prototype.onNotDetected = function (a) {
        a();
        return this;
      };
      Fab.prototype.setOption = noop;
      window.FuckAdBlock = window.BlockAdBlock = Fab;
      window.fuckAdBlock = window.blockAdBlock = new Fab();
    }
    preventFab.names = ['prevent-fab-3.2.0', 'fuckadblock.js-3.2.0', 'ubo-fuckadblock.js-3.2.0', 'nofab.js', 'ubo-nofab.js'];
    preventFab.injections = [noop, hit];

    function setPopadsDummy(source) {
      delete window.PopAds;
      delete window.popns;
      Object.defineProperties(window, {
        PopAds: {
          get: function get() {
            hit(source);
            return {};
          }
        },
        popns: {
          get: function get() {
            hit(source);
            return {};
          }
        }
      });
    }
    setPopadsDummy.names = ['set-popads-dummy', 'popads-dummy.js', 'ubo-popads-dummy.js'];
    setPopadsDummy.injections = [hit];

    function preventPopadsNet(source) {
      var rid = randomId();
      var throwError = function throwError() {
        throw new ReferenceError(rid);
      };
      delete window.PopAds;
      delete window.popns;
      Object.defineProperties(window, {
        PopAds: {
          set: throwError
        },
        popns: {
          set: throwError
        }
      });
      window.onerror = createOnErrorHandler(rid).bind();
      hit(source);
    }
    preventPopadsNet.names = ['prevent-popads-net', 'popads.net.js', 'ubo-popads.net.js'];
    preventPopadsNet.injections = [createOnErrorHandler, randomId, hit];

    function preventAdfly(source) {
      var isDigit = function isDigit(data) {
        return /^\d$/.test(data);
      };
      var handler = function handler(encodedURL) {
        var evenChars = '';
        var oddChars = '';
        for (var i = 0; i < encodedURL.length; i += 1) {
          if (i % 2 === 0) {
            evenChars += encodedURL.charAt(i);
          } else {
            oddChars = encodedURL.charAt(i) + oddChars;
          }
        }
        var data = (evenChars + oddChars).split('');
        for (var _i = 0; _i < data.length; _i += 1) {
          if (isDigit(data[_i])) {
            for (var ii = _i + 1; ii < data.length; ii += 1) {
              if (isDigit(data[ii])) {
                var temp = parseInt(data[_i], 10) ^ parseInt(data[ii], 10);
                if (temp < 10) {
                  data[_i] = temp.toString();
                }
                _i = ii;
                break;
              }
            }
          }
        }
        data = data.join('');
        var decodedURL = window.atob(data).slice(16, -16);
        if (window.stop) {
          window.stop();
        }
        window.onbeforeunload = null;
        window.location.href = decodedURL;
      };
      var val;
      var applyHandler = true;
      var result = setPropertyAccess(window, 'ysmm', {
        configurable: false,
        set: function set(value) {
          if (applyHandler) {
            applyHandler = false;
            try {
              if (typeof value === 'string') {
                handler(value);
              }
            } catch (err) {}
          }
          val = value;
        },
        get: function get() {
          return val;
        }
      });
      if (result) {
        hit(source);
      } else {
        window.console.error('Failed to set up prevent-adfly scriptlet');
      }
    }
    preventAdfly.names = ['prevent-adfly', 'adfly-defuser.js', 'ubo-adfly-defuser.js'];
    preventAdfly.injections = [setPropertyAccess, hit];

    function debugOnPropertyRead(source, property) {
      if (!property) {
        return;
      }
      var rid = randomId();
      var abort = function abort() {
        hit(source);
        debugger;
      };
      var setChainPropAccess = function setChainPropAccess(owner, property) {
        var chainInfo = getPropertyInChain(owner, property);
        var base = chainInfo.base;
        var prop = chainInfo.prop,
            chain = chainInfo.chain;
        if (chain) {
          var setter = function setter(a) {
            base = a;
            if (a instanceof Object) {
              setChainPropAccess(a, chain);
            }
          };
          Object.defineProperty(owner, prop, {
            get: function get() {
              return base;
            },
            set: setter
          });
          return;
        }
        setPropertyAccess(base, prop, {
          get: abort,
          set: function set() {}
        });
      };
      setChainPropAccess(window, property);
      window.onerror = createOnErrorHandler(rid).bind();
    }
    debugOnPropertyRead.names = ['debug-on-property-read'];
    debugOnPropertyRead.injections = [randomId, setPropertyAccess, getPropertyInChain, createOnErrorHandler, hit];

    function debugOnPropertyWrite(source, property) {
      if (!property) {
        return;
      }
      var rid = randomId();
      var abort = function abort() {
        hit(source);
        debugger;
      };
      var setChainPropAccess = function setChainPropAccess(owner, property) {
        var chainInfo = getPropertyInChain(owner, property);
        var base = chainInfo.base;
        var prop = chainInfo.prop,
            chain = chainInfo.chain;
        if (chain) {
          var setter = function setter(a) {
            base = a;
            if (a instanceof Object) {
              setChainPropAccess(a, chain);
            }
          };
          Object.defineProperty(owner, prop, {
            get: function get() {
              return base;
            },
            set: setter
          });
          return;
        }
        setPropertyAccess(base, prop, {
          set: abort
        });
      };
      setChainPropAccess(window, property);
      window.onerror = createOnErrorHandler(rid).bind();
    }
    debugOnPropertyWrite.names = ['debug-on-property-write'];
    debugOnPropertyWrite.injections = [randomId, setPropertyAccess, getPropertyInChain, createOnErrorHandler, hit];

    function debugCurrentInlineScript(source, property) {
      var search = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
      var regex = search ? toRegExp(search) : null;
      var rid = randomId();
      var getCurrentScript = function getCurrentScript() {
        if (!document.currentScript) {
          var scripts = document.getElementsByTagName('script');
          return scripts[scripts.length - 1];
        }
        return document.currentScript;
      };
      var ourScript = getCurrentScript();
      var abort = function abort() {
        var scriptEl = getCurrentScript();
        if (scriptEl instanceof HTMLScriptElement && scriptEl.textContent.length > 0 && scriptEl !== ourScript && (!regex || regex.test(scriptEl.textContent))) {
          hit(source);
          debugger;
        }
      };
      var setChainPropAccess = function setChainPropAccess(owner, property) {
        var chainInfo = getPropertyInChain(owner, property);
        var base = chainInfo.base;
        var prop = chainInfo.prop,
            chain = chainInfo.chain;
        if (chain) {
          var setter = function setter(a) {
            base = a;
            if (a instanceof Object) {
              setChainPropAccess(a, chain);
            }
          };
          Object.defineProperty(owner, prop, {
            get: function get() {
              return base;
            },
            set: setter
          });
          return;
        }
        var currentValue = base[prop];
        setPropertyAccess(base, prop, {
          set: function set(value) {
            abort();
            currentValue = value;
          },
          get: function get() {
            abort();
            return currentValue;
          }
        });
      };
      setChainPropAccess(window, property);
      window.onerror = createOnErrorHandler(rid).bind();
    }
    debugCurrentInlineScript.names = ['debug-current-inline-script'];
    debugCurrentInlineScript.injections = [randomId, setPropertyAccess, getPropertyInChain, toRegExp, createOnErrorHandler, hit];

    function removeAttr(source, attrs, selector) {
      if (!attrs) {
        return;
      }
      attrs = attrs.split(/\s*\|\s*/);
      if (!selector) {
        selector = "[".concat(attrs.join('],['), "]");
      }
      var rmattr = function rmattr() {
        var nodes = [].slice.call(document.querySelectorAll(selector));
        var removed = false;
        nodes.forEach(function (node) {
          attrs.forEach(function (attr) {
            node.removeAttribute(attr);
            removed = true;
          });
        });
        if (removed) {
          hit(source);
        }
      };
      rmattr();
      observeDOMChanges(rmattr, true);
    }
    removeAttr.names = ['remove-attr', 'remove-attr.js', 'ubo-remove-attr.js', 'ra.js', 'ubo-ra.js'];
    removeAttr.injections = [hit, observeDOMChanges];

    function removeClass(source, classNames, selector) {
      if (!classNames) {
        return;
      }
      classNames = classNames.split(/\s*\|\s*/);
      var selectors = [];
      if (!selector) {
        selectors = classNames.map(function (className) {
          return ".".concat(className);
        });
      }
      var removeClassHandler = function removeClassHandler() {
        var nodes = new Set();
        if (selector) {
          var foundedNodes = [].slice.call(document.querySelectorAll(selector));
          foundedNodes.forEach(function (n) {
            return nodes.add(n);
          });
        } else if (selectors.length > 0) {
          selectors.forEach(function (s) {
            var elements = document.querySelectorAll(s);
            for (var i = 0; i < elements.length; i += 1) {
              var element = elements[i];
              nodes.add(element);
            }
          });
        }
        var removed = false;
        nodes.forEach(function (node) {
          classNames.forEach(function (className) {
            if (node.classList.contains(className)) {
              node.classList.remove(className);
              removed = true;
            }
          });
        });
        if (removed) {
          hit(source);
        }
      };
      removeClassHandler();
      var CLASS_ATTR_NAME = ['class'];
      observeDOMChanges(removeClassHandler, true, CLASS_ATTR_NAME);
    }
    removeClass.names = ['remove-class'];
    removeClass.injections = [hit, observeDOMChanges];

    function disableNewtabLinks(source) {
      document.addEventListener('click', function (ev) {
        var target = ev.target;
        while (target !== null) {
          if (target.localName === 'a' && target.hasAttribute('target')) {
            ev.stopPropagation();
            ev.preventDefault();
            hit(source);
            break;
          }
          target = target.parentNode;
        }
      });
    }
    disableNewtabLinks.names = ['disable-newtab-links', 'disable-newtab-links.js', 'ubo-disable-newtab-links.js'];
    disableNewtabLinks.injections = [hit];

    function adjustSetInterval(source, match, interval, boost) {
      var nativeInterval = window.setInterval;
      var nativeIsNaN = Number.isNaN || window.isNaN;
      var nativeIsFinite = Number.isFinite || window.isFinite;
      interval = parseInt(interval, 10);
      interval = nativeIsNaN(interval) ? 1000 : interval;
      boost = parseInt(boost, 10);
      boost = nativeIsNaN(interval) || !nativeIsFinite(boost) ? 0.05 : boost;
      match = match ? toRegExp(match) : toRegExp('/.?/');
      if (boost < 0.02) {
        boost = 0.02;
      }
      if (boost > 50) {
        boost = 50;
      }
      var intervalWrapper = function intervalWrapper(cb, d) {
        if (d === interval && match.test(cb.toString())) {
          d *= boost;
          hit(source);
        }
        for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
          args[_key - 2] = arguments[_key];
        }
        return nativeInterval.apply(window, [cb, d].concat(args));
      };
      window.setInterval = intervalWrapper;
    }
    adjustSetInterval.names = ['adjust-setInterval', 'nano-setInterval-booster.js', 'ubo-nano-setInterval-booster.js', 'nano-sib.js', 'ubo-nano-sib.js'];
    adjustSetInterval.injections = [toRegExp, hit];

    function adjustSetTimeout(source, match, timeout, boost) {
      var nativeTimeout = window.setTimeout;
      var nativeIsNaN = Number.isNaN || window.isNaN;
      var nativeIsFinite = Number.isFinite || window.isFinite;
      timeout = parseInt(timeout, 10);
      timeout = nativeIsNaN(timeout) ? 1000 : timeout;
      boost = parseInt(boost, 10);
      boost = nativeIsNaN(timeout) || !nativeIsFinite(boost) ? 0.05 : boost;
      match = match ? toRegExp(match) : toRegExp('/.?/');
      if (boost < 0.02) {
        boost = 0.02;
      }
      if (boost > 50) {
        boost = 50;
      }
      var timeoutWrapper = function timeoutWrapper(cb, d) {
        if (d === timeout && match.test(cb.toString())) {
          d *= boost;
          hit(source);
        }
        for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
          args[_key - 2] = arguments[_key];
        }
        return nativeTimeout.apply(window, [cb, d].concat(args));
      };
      window.setTimeout = timeoutWrapper;
    }
    adjustSetTimeout.names = ['adjust-setTimeout', 'nano-setTimeout-booster.js', 'ubo-nano-setTimeout-booster.js', 'nano-stb.js', 'ubo-nano-stb.js'];
    adjustSetTimeout.injections = [toRegExp, hit];

    function dirString(source, times) {
      var _console = console,
          dir = _console.dir;
      times = parseInt(times, 10);
      function dirWrapper(object) {
        var temp;
        for (var i = 0; i < times; i += 1) {
          temp = "".concat(object);
        }
        if (typeof dir === 'function') {
          dir.call(this, object);
        }
        hit(source, temp);
      }
      console.dir = dirWrapper;
    }
    dirString.names = ['dir-string', 'abp-dir-string'];
    dirString.injections = [hit];

    function jsonPrune(source, propsToRemove, requiredInitialProps) {
      var log = console.log.bind(console);
      var prunePaths = propsToRemove !== undefined && propsToRemove !== '' ? propsToRemove.split(/ +/) : [];
      var needlePaths = requiredInitialProps !== undefined && requiredInitialProps !== '' ? requiredInitialProps.split(/ +/) : [];
      function isPruningNeeded(root) {
        if (!root) {
          return false;
        }
        for (var i = 0; i < needlePaths.length; i += 1) {
          var needlePath = needlePaths[i];
          var details = getPropertyInChain(root, needlePath, false);
          var nestedPropName = needlePath.split('.').pop();
          if (details && details.base[nestedPropName] === undefined) {
            return false;
          }
        }
        return true;
      }
      var nativeParse = JSON.parse;
      var parseWrapper = function parseWrapper() {
        for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }
        var r = nativeParse.apply(window, args);
        if (prunePaths.length === 0) {
          log(window.location.hostname, r);
          return r;
        }
        if (isPruningNeeded(r) === false) {
          return r;
        }
        prunePaths.forEach(function (path) {
          var ownerObj = getPropertyInChain(r, path, false);
          if (ownerObj !== undefined && ownerObj.base) {
            delete ownerObj.base[ownerObj.prop];
          }
        });
        hit(source);
        return r;
      };
      JSON.parse = parseWrapper;
    }
    jsonPrune.names = ['json-prune', 'json-prune.js', 'ubo-json-prune.js'];
    jsonPrune.injections = [hit, getPropertyInChain];



    var scriptletList = /*#__PURE__*/Object.freeze({
        __proto__: null,
        abortOnPropertyRead: abortOnPropertyRead,
        abortOnPropertyWrite: abortOnPropertyWrite,
        preventSetTimeout: preventSetTimeout,
        preventSetInterval: preventSetInterval,
        preventWindowOpen: preventWindowOpen,
        abortCurrentInlineScript: abortCurrentInlineScript,
        setConstant: setConstant,
        removeCookie: removeCookie,
        preventAddEventListener: preventAddEventListener,
        preventBab: preventBab,
        nowebrtc: nowebrtc,
        logAddEventListener: logAddEventListener,
        logEval: logEval,
        log: log,
        noeval: noeval,
        preventEvalIf: preventEvalIf,
        preventFab: preventFab,
        setPopadsDummy: setPopadsDummy,
        preventPopadsNet: preventPopadsNet,
        preventAdfly: preventAdfly,
        debugOnPropertyRead: debugOnPropertyRead,
        debugOnPropertyWrite: debugOnPropertyWrite,
        debugCurrentInlineScript: debugCurrentInlineScript,
        removeAttr: removeAttr,
        removeClass: removeClass,
        disableNewtabLinks: disableNewtabLinks,
        adjustSetInterval: adjustSetInterval,
        adjustSetTimeout: adjustSetTimeout,
        dirString: dirString,
        jsonPrune: jsonPrune
    });

    const redirects=[{adg:"1x1-transparent.gif",ubo:"1x1.gif",abp:"1x1-transparent-gif"},{adg:"2x2-transparent.png",ubo:"2x2.png",abp:"2x2-transparent-png"},{adg:"3x2-transparent.png",ubo:"3x2.png",abp:"3x2-transparent-png"},{adg:"32x32-transparent.png",ubo:"32x32.png",abp:"32x32-transparent-png"},{adg:"google-analytics",ubo:"google-analytics_analytics.js"},{adg:"google-analytics-ga",ubo:"google-analytics_ga.js"},{adg:"googlesyndication-adsbygoogle",ubo:"googlesyndication_adsbygoogle.js"},{adg:"googletagmanager-gtm",ubo:"googletagmanager_gtm.js"},{adg:"googletagservices-gpt",ubo:"googletagservices_gpt.js"},{adg:"metrika-yandex-watch"},{adg:"metrika-yandex-tag"},{adg:"noeval",ubo:"noeval-silent.js"},{adg:"noopcss",abp:"blank-css"},{adg:"noopframe",ubo:"noop.html",abp:"blank-html"},{adg:"noopjs",ubo:"noop.js",abp:"blank-js"},{adg:"nooptext",ubo:"noop.txt",abp:"blank-text"},{adg:"noopmp3.0.1s",ubo:"noop-0.1s.mp3",abp:"blank-mp3"},{adg:"noopmp4-1s",ubo:"noop-1s.mp4",abp:"blank-mp4"},{adg:"noopvast-2.0"},{adg:"noopvast-3.0"},{adg:"prevent-fab-3.2.0",ubo:"nofab.js"},{adg:"prevent-popads-net",ubo:"popads.js"},{adg:"scorecardresearch-beacon",ubo:"scorecardresearch_beacon.js"},{adg:"set-popads-dummy",ubo:"popads-dummy.js"},{ubo:"addthis_widget.js"},{ubo:"amazon_ads.js"},{ubo:"ampproject_v0.js"},{ubo:"chartbeat.js"},{ubo:"disqus_embed.js"},{ubo:"disqus_forums_embed.js"},{ubo:"doubleclick_instream_ad_status.js"},{ubo:"empty"},{ubo:"google-analytics_cx_api.js"},{ubo:"google-analytics_inpage_linkid.js"},{ubo:"hd-main.js"},{ubo:"ligatus_angular-tag.js"},{ubo:"monkeybroker.js"},{ubo:"outbrain-widget.js"},{ubo:"window.open-defuser.js"},{ubo:"nobab.js"},{ubo:"noeval.js"}];

    var COMMENT_MARKER = '!';
    var isComment = function isComment(rule) {
      return startsWith(rule, COMMENT_MARKER);
    };
    var UBO_SCRIPTLET_MASK_REG = /#@?#script:inject|#@?#\s*\+js/;
    var UBO_SCRIPTLET_MASK_1 = '##+js';
    var UBO_SCRIPTLET_MASK_2 = '##script:inject';
    var UBO_SCRIPTLET_EXCEPTION_MASK_1 = '#@#+js';
    var UBO_SCRIPTLET_EXCEPTION_MASK_2 = '#@#script:inject';
    var ABP_SCRIPTLET_MASK = '#$#';
    var ABP_SCRIPTLET_EXCEPTION_MASK = '#@$#';
    var ADG_CSS_MASK_REG = /#@?\$#.+?\s*\{.*\}\s*$/g;
    var isAdgScriptletRule = function isAdgScriptletRule(rule) {
      return !isComment(rule) && rule.indexOf(ADG_SCRIPTLET_MASK) > -1;
    };
    var isUboScriptletRule = function isUboScriptletRule(rule) {
      return (rule.indexOf(UBO_SCRIPTLET_MASK_1) > -1 || rule.indexOf(UBO_SCRIPTLET_MASK_2) > -1 || rule.indexOf(UBO_SCRIPTLET_EXCEPTION_MASK_1) > -1 || rule.indexOf(UBO_SCRIPTLET_EXCEPTION_MASK_2) > -1) && UBO_SCRIPTLET_MASK_REG.test(rule) && !isComment(rule);
    };
    var isAbpSnippetRule = function isAbpSnippetRule(rule) {
      return (rule.indexOf(ABP_SCRIPTLET_MASK) > -1 || rule.indexOf(ABP_SCRIPTLET_EXCEPTION_MASK) > -1) && rule.search(ADG_CSS_MASK_REG) === -1 && !isComment(rule);
    };
    var getScriptletByName = function getScriptletByName(name) {
      var scriptlets = Object.keys(scriptletList).map(function (key) {
        return scriptletList[key];
      });
      return scriptlets.find(function (s) {
        return s.names && s.names.indexOf(name) > -1;
      });
    };
    var isValidScriptletName = function isValidScriptletName(name) {
      if (!name) {
        return false;
      }
      var scriptlet = getScriptletByName(name);
      if (!scriptlet) {
        return false;
      }
      return true;
    };
    var ADG_UBO_REDIRECT_MARKER = 'redirect=';
    var ABP_REDIRECT_MARKER = 'rewrite=abp-resource:';
    var VALID_SOURCE_TYPES = ['image', 'subdocument', 'stylesheet', 'script', 'xmlhttprequest', 'media'];
    var validAdgRedirects = redirects.filter(function (el) {
      return el.adg;
    });
    var objFromEntries = function objFromEntries(pairs) {
      var output = pairs.reduce(function (acc, el) {
        var _el = slicedToArray(el, 2),
            key = _el[0],
            value = _el[1];
        acc[key] = value;
        return acc;
      }, {});
      return output;
    };
    var uboToAdgCompatibility = objFromEntries(validAdgRedirects.filter(function (el) {
      return el.ubo;
    }).map(function (el) {
      return [el.ubo, el.adg];
    }));
    var abpToAdgCompatibility = objFromEntries(validAdgRedirects.filter(function (el) {
      return el.abp;
    }).map(function (el) {
      return [el.abp, el.adg];
    }));
    var adgToUboCompatibility = objFromEntries(validAdgRedirects.filter(function (el) {
      return el.ubo;
    }).map(function (el) {
      return [el.adg, el.ubo];
    }));
    var REDIRECT_RULE_TYPES = {
      ADG: {
        marker: ADG_UBO_REDIRECT_MARKER,
        compatibility: adgToUboCompatibility
      },
      UBO: {
        marker: ADG_UBO_REDIRECT_MARKER,
        compatibility: uboToAdgCompatibility
      },
      ABP: {
        marker: ABP_REDIRECT_MARKER,
        compatibility: abpToAdgCompatibility
      }
    };
    var parseModifiers = function parseModifiers(rule) {
      return substringAfter(rule, '$').split(',');
    };
    var getRedirectName = function getRedirectName(rule, marker) {
      var ruleModifiers = parseModifiers(rule);
      var redirectNamePart = ruleModifiers.find(function (el) {
        return el.indexOf(marker) > -1;
      });
      return substringAfter(redirectNamePart, marker);
    };
    var isAdgRedirectRule = function isAdgRedirectRule(rule) {
      return !isComment(rule) && rule.indexOf(REDIRECT_RULE_TYPES.ADG.marker) > -1;
    };
    var isRedirectRuleByType = function isRedirectRuleByType(rule, type) {
      var _REDIRECT_RULE_TYPES$ = REDIRECT_RULE_TYPES[type],
          marker = _REDIRECT_RULE_TYPES$.marker,
          compatibility = _REDIRECT_RULE_TYPES$.compatibility;
      if (!isComment(rule) && rule.indexOf(marker) > -1) {
        var redirectName = getRedirectName(rule, marker);
        return redirectName === Object.keys(compatibility).find(function (el) {
          return el === redirectName;
        });
      }
      return false;
    };
    var isValidAdgRedirectRule = function isValidAdgRedirectRule(rule) {
      return isRedirectRuleByType(rule, 'ADG');
    };
    var isValidUboRedirectRule = function isValidUboRedirectRule(rule) {
      return isRedirectRuleByType(rule, 'UBO');
    };
    var isValidAbpRedirectRule = function isValidAbpRedirectRule(rule) {
      return isRedirectRuleByType(rule, 'ABP');
    };
    var isValidRedirectRule = function isValidRedirectRule(rule) {
      return isValidAdgRedirectRule(rule) || isValidUboRedirectRule(rule) || isValidAbpRedirectRule(rule);
    };
    var hasValidContentType = function hasValidContentType(rule) {
      if (isRedirectRuleByType(rule, 'ADG')) {
        var ruleModifiers = parseModifiers(rule);
        var sourceType = ruleModifiers.find(function (el) {
          return VALID_SOURCE_TYPES.indexOf(el) > -1;
        });
        return sourceType !== undefined;
      }
      return false;
    };
    var validator = {
      UBO_SCRIPTLET_MASK_REG: UBO_SCRIPTLET_MASK_REG,
      ABP_SCRIPTLET_MASK: ABP_SCRIPTLET_MASK,
      ABP_SCRIPTLET_EXCEPTION_MASK: ABP_SCRIPTLET_EXCEPTION_MASK,
      isComment: isComment,
      isAdgScriptletRule: isAdgScriptletRule,
      isUboScriptletRule: isUboScriptletRule,
      isAbpSnippetRule: isAbpSnippetRule,
      getScriptletByName: getScriptletByName,
      isValidScriptletName: isValidScriptletName,
      REDIRECT_RULE_TYPES: REDIRECT_RULE_TYPES,
      isAdgRedirectRule: isAdgRedirectRule,
      isValidRedirectRule: isValidRedirectRule,
      isValidAdgRedirectRule: isValidAdgRedirectRule,
      isValidUboRedirectRule: isValidUboRedirectRule,
      isValidAbpRedirectRule: isValidAbpRedirectRule,
      parseModifiers: parseModifiers,
      getRedirectName: getRedirectName,
      hasValidContentType: hasValidContentType
    };

    function _iterableToArray(iter) {
      if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter);
    }
    var iterableToArray = _iterableToArray;

    function _toArray(arr) {
      return arrayWithHoles(arr) || iterableToArray(arr) || nonIterableRest();
    }
    var toArray = _toArray;

    var ADGUARD_SCRIPTLET_MASK_REG = /#@?%#\/\/scriptlet\(.+\)/;
    var ADGUARD_SCRIPTLET_TEMPLATE = '${domains}#%#//scriptlet(${args})';
    var ADGUARD_SCRIPTLET_EXCEPTION_TEMPLATE = '${domains}#@%#//scriptlet(${args})';
    var UBO_SCRIPTLET_TEMPLATE = '${domains}##+js(${args})';
    var UBO_SCRIPTLET_EXCEPTION_TEMPLATE = '${domains}#@#+js(${args})';
    var UBO_ALIAS_NAME_MARKER = 'ubo-';
    var UBO_XHR_TYPE = 'xhr';
    var ADG_XHR_TYPE = 'xmlhttprequest';
    var getSentences = function getSentences(str) {
      var reg = /'.*?'|".*?"|\S+/g;
      return str.match(reg);
    };
    var replacePlaceholders = function replacePlaceholders(str, data) {
      return Object.keys(data).reduce(function (acc, key) {
        var reg = new RegExp("\\$\\{".concat(key, "\\}"), 'g');
        acc = acc.replace(reg, data[key]);
        return acc;
      }, str);
    };
    var convertUboScriptletToAdg = function convertUboScriptletToAdg(rule) {
      var domains = getBeforeRegExp(rule, validator.UBO_SCRIPTLET_MASK_REG);
      var mask = rule.match(validator.UBO_SCRIPTLET_MASK_REG)[0];
      var template;
      if (mask.indexOf('@') > -1) {
        template = ADGUARD_SCRIPTLET_EXCEPTION_TEMPLATE;
      } else {
        template = ADGUARD_SCRIPTLET_TEMPLATE;
      }
      var args = getStringInBraces(rule).split(/, /g).map(function (arg, index) {
        var outputArg;
        if (index === 0) {
          outputArg = arg.indexOf('.js') > -1 ? "ubo-".concat(arg) : "ubo-".concat(arg, ".js");
        } else {
          outputArg = arg;
        }
        if (arg === '$') {
          outputArg = '$$';
        }
        return outputArg;
      }).map(function (arg) {
        return wrapInSingleQuotes(arg);
      }).join(', ');
      var adgRule = replacePlaceholders(template, {
        domains: domains,
        args: args
      });
      return [adgRule];
    };
    var convertAbpSnippetToAdg = function convertAbpSnippetToAdg(rule) {
      var SEMICOLON_DIVIDER = /;(?=(?:(?:[^"]*"){2})*[^"]*$)/g;
      var mask = rule.indexOf(validator.ABP_SCRIPTLET_MASK) > -1 ? validator.ABP_SCRIPTLET_MASK : validator.ABP_SCRIPTLET_EXCEPTION_MASK;
      var template = mask === validator.ABP_SCRIPTLET_MASK ? ADGUARD_SCRIPTLET_TEMPLATE : ADGUARD_SCRIPTLET_EXCEPTION_TEMPLATE;
      var domains = substringBefore(rule, mask);
      var args = substringAfter(rule, mask);
      return args.split(SEMICOLON_DIVIDER).map(function (args) {
        return getSentences(args).filter(function (arg) {
          return arg;
        }).map(function (arg, index) {
          return index === 0 ? "abp-".concat(arg) : arg;
        }).map(function (arg) {
          return wrapInSingleQuotes(arg);
        }).join(', ');
      }).map(function (args) {
        return replacePlaceholders(template, {
          domains: domains,
          args: args
        });
      });
    };
    var convertScriptletToAdg = function convertScriptletToAdg(rule) {
      var result;
      if (validator.isUboScriptletRule(rule)) {
        result = convertUboScriptletToAdg(rule);
      } else if (validator.isAbpSnippetRule(rule)) {
        result = convertAbpSnippetToAdg(rule);
      } else if (validator.isAdgScriptletRule(rule) || validator.isComment(rule)) {
        result = [rule];
      }
      return result;
    };
    var convertAdgScriptletToUbo = function convertAdgScriptletToUbo(rule) {
      var res;
      if (validator.isAdgScriptletRule(rule)) {
        var _parseRule = parseRule(rule),
            parsedName = _parseRule.name,
            parsedParams = _parseRule.args;
        var adgScriptletObject = Object.keys(scriptletList).map(function (el) {
          return scriptletList[el];
        }).map(function (s) {
          var _s$names = toArray(s.names),
              name = _s$names[0],
              aliases = _s$names.slice(1);
          return {
            name: name,
            aliases: aliases
          };
        }).find(function (el) {
          return el.name === parsedName || el.aliases.indexOf(parsedName) >= 0;
        });
        var aliases = adgScriptletObject.aliases;
        if (aliases.length > 0) {
          var uboAlias = adgScriptletObject.aliases
          .find(function (alias) {
            return alias.includes(UBO_ALIAS_NAME_MARKER);
          });
          if (uboAlias) {
            var mask = rule.match(ADGUARD_SCRIPTLET_MASK_REG)[0];
            var template;
            if (mask.indexOf('@') > -1) {
              template = UBO_SCRIPTLET_EXCEPTION_TEMPLATE;
            } else {
              template = UBO_SCRIPTLET_TEMPLATE;
            }
            var domains = getBeforeRegExp(rule, ADGUARD_SCRIPTLET_MASK_REG);
            var uboName = uboAlias.replace(UBO_ALIAS_NAME_MARKER, '')
            .replace('.js', '');
            var args = parsedParams.length > 0 ? "".concat(uboName, ", ").concat(parsedParams.join(', ')) : uboName;
            var uboRule = replacePlaceholders(template, {
              domains: domains,
              args: args
            });
            res = uboRule;
          }
        }
      }
      return res;
    };
    var isValidScriptletRule = function isValidScriptletRule(input) {
      if (!input) {
        return false;
      }
      var rulesArray = convertScriptletToAdg(input);
      var isValid = rulesArray.reduce(function (acc, rule) {
        var parsedRule = parseRule(rule);
        return validator.isValidScriptletName(parsedRule.name) && acc;
      }, true);
      return isValid;
    };
    var convertUboRedirectToAdg = function convertUboRedirectToAdg(rule) {
      var firstPartOfRule = substringBefore(rule, '$');
      var uboModifiers = validator.parseModifiers(rule);
      var adgModifiers = uboModifiers.map(function (el) {
        if (el.indexOf(validator.REDIRECT_RULE_TYPES.UBO.marker) > -1) {
          var uboName = substringAfter(el, validator.REDIRECT_RULE_TYPES.UBO.marker);
          var adgName = validator.REDIRECT_RULE_TYPES.UBO.compatibility[uboName];
          return "".concat(validator.REDIRECT_RULE_TYPES.ADG.marker).concat(adgName);
        }
        if (el === UBO_XHR_TYPE) {
          return ADG_XHR_TYPE;
        }
        return el;
      }).join(',');
      return "".concat(firstPartOfRule, "$").concat(adgModifiers);
    };
    var convertAbpRedirectToAdg = function convertAbpRedirectToAdg(rule) {
      var firstPartOfRule = substringBefore(rule, '$');
      var abpModifiers = validator.parseModifiers(rule);
      var adgModifiers = abpModifiers.map(function (el) {
        if (el.indexOf(validator.REDIRECT_RULE_TYPES.ABP.marker) > -1) {
          var abpName = substringAfter(el, validator.REDIRECT_RULE_TYPES.ABP.marker);
          var adgName = validator.REDIRECT_RULE_TYPES.ABP.compatibility[abpName];
          return "".concat(validator.REDIRECT_RULE_TYPES.ADG.marker).concat(adgName);
        }
        return el;
      }).join(',');
      return "".concat(firstPartOfRule, "$").concat(adgModifiers);
    };
    var convertRedirectToAdg = function convertRedirectToAdg(rule) {
      var result;
      if (validator.isValidUboRedirectRule(rule)) {
        result = convertUboRedirectToAdg(rule);
      } else if (validator.isValidAbpRedirectRule(rule)) {
        result = convertAbpRedirectToAdg(rule);
      } else if (validator.isValidAdgRedirectRule(rule) || validator.isComment(rule)) {
        result = rule;
      }
      return result;
    };
    var convertAdgRedirectToUbo = function convertAdgRedirectToUbo(rule) {
      if (!validator.hasValidContentType(rule)) {
        throw new Error("Rule is not valid for converting to Ubo. Source type is not specified in the rule: ".concat(rule));
      } else {
        var firstPartOfRule = substringBefore(rule, '$');
        var uboModifiers = validator.parseModifiers(rule);
        var adgModifiers = uboModifiers.map(function (el) {
          if (el.indexOf(validator.REDIRECT_RULE_TYPES.ADG.marker) > -1) {
            var adgName = substringAfter(el, validator.REDIRECT_RULE_TYPES.ADG.marker);
            var uboName = validator.REDIRECT_RULE_TYPES.ADG.compatibility[adgName];
            return "".concat(validator.REDIRECT_RULE_TYPES.UBO.marker).concat(uboName);
          }
          return el;
        }).join(',');
        return "".concat(firstPartOfRule, "$").concat(adgModifiers);
      }
    };

    function GoogleAnalytics(source) {
      var Tracker = function Tracker() {};
      var proto = Tracker.prototype;
      proto.get = noop;
      proto.set = noop;
      proto.send = noop;
      var googleAnalyticsName = window.GoogleAnalyticsObject || 'ga';
      function ga() {
        var len = arguments.length;
        if (len === 0) {
          return;
        }
        var lastArg = arguments[len - 1];
        if (typeof lastArg !== 'object' || lastArg === null || typeof lastArg.hitCallback !== 'function') {
          return;
        }
        try {
          lastArg.hitCallback();
        } catch (ex) {}
      }
      ga.create = function () {
        return new Tracker();
      };
      ga.getByName = noopNull;
      ga.getAll = function () {
        return [];
      };
      ga.remove = noop;
      ga.loaded = true;
      window[googleAnalyticsName] = ga;
      var _window = window,
          dataLayer = _window.dataLayer;
      if (dataLayer instanceof Object && dataLayer.hide instanceof Object && typeof dataLayer.hide.end === 'function') {
        dataLayer.hide.end();
      }
      hit(source);
    }
    GoogleAnalytics.names = ['google-analytics', 'ubo-google-analytics_analytics.js', 'google-analytics_analytics.js'];
    GoogleAnalytics.injections = [hit, noop, noopNull];

    function GoogleAnalyticsGa(source) {
      function Gaq() {}
      Gaq.prototype.Na = noop;
      Gaq.prototype.O = noop;
      Gaq.prototype.Sa = noop;
      Gaq.prototype.Ta = noop;
      Gaq.prototype.Va = noop;
      Gaq.prototype._createAsyncTracker = noop;
      Gaq.prototype._getAsyncTracker = noop;
      Gaq.prototype._getPlugin = noop;
      Gaq.prototype.push = function (data) {
        if (typeof data === 'function') {
          data();
          return;
        }
        if (Array.isArray(data) === false) {
          return;
        }
        if (data[0] === '_link' && typeof data[1] === 'string') {
          window.location.assign(data[1]);
        }
        if (data[0] === '_set' && data[1] === 'hitCallback' && typeof data[2] === 'function') {
          data[2]();
        }
      };
      var gaq = new Gaq();
      var asyncTrackers = window._gaq || [];
      if (Array.isArray(asyncTrackers)) {
        while (asyncTrackers[0]) {
          gaq.push(asyncTrackers.shift());
        }
      }
      window._gaq = gaq.qf = gaq;
      function Gat() {}
      var api = ['_addIgnoredOrganic', '_addIgnoredRef', '_addItem', '_addOrganic', '_addTrans', '_clearIgnoredOrganic', '_clearIgnoredRef', '_clearOrganic', '_cookiePathCopy', '_deleteCustomVar', '_getName', '_setAccount', '_getAccount', '_getClientInfo', '_getDetectFlash', '_getDetectTitle', '_getLinkerUrl', '_getLocalGifPath', '_getServiceMode', '_getVersion', '_getVisitorCustomVar', '_initData', '_link', '_linkByPost', '_setAllowAnchor', '_setAllowHash', '_setAllowLinker', '_setCampContentKey', '_setCampMediumKey', '_setCampNameKey', '_setCampNOKey', '_setCampSourceKey', '_setCampTermKey', '_setCampaignCookieTimeout', '_setCampaignTrack', '_setClientInfo', '_setCookiePath', '_setCookiePersistence', '_setCookieTimeout', '_setCustomVar', '_setDetectFlash', '_setDetectTitle', '_setDomainName', '_setLocalGifPath', '_setLocalRemoteServerMode', '_setLocalServerMode', '_setReferrerOverride', '_setRemoteServerMode', '_setSampleRate', '_setSessionTimeout', '_setSiteSpeedSampleRate', '_setSessionCookieTimeout', '_setVar', '_setVisitorCookieTimeout', '_trackEvent', '_trackPageLoadTime', '_trackPageview', '_trackSocial', '_trackTiming', '_trackTrans', '_visitCode'];
      var tracker = api.reduce(function (res, funcName) {
        res[funcName] = noop;
        return res;
      }, {});
      tracker._getLinkerUrl = function (a) {
        return a;
      };
      Gat.prototype._anonymizeIP = noop;
      Gat.prototype._createTracker = noop;
      Gat.prototype._forceSSL = noop;
      Gat.prototype._getPlugin = noop;
      Gat.prototype._getTracker = function () {
        return tracker;
      };
      Gat.prototype._getTrackerByName = function () {
        return tracker;
      };
      Gat.prototype._getTrackers = noop;
      Gat.prototype.aa = noop;
      Gat.prototype.ab = noop;
      Gat.prototype.hb = noop;
      Gat.prototype.la = noop;
      Gat.prototype.oa = noop;
      Gat.prototype.pa = noop;
      Gat.prototype.u = noop;
      var gat = new Gat();
      window._gat = gat;
      hit(source);
    }
    GoogleAnalyticsGa.names = ['google-analytics-ga', 'ubo-google-analytics_ga.js', 'google-analytics_ga.js'];
    GoogleAnalyticsGa.injections = [hit, noop];

    function GoogleSyndicationAdsByGoogle(source) {
      window.adsbygoogle = window.adsbygoogle || {
        length: 0,
        loaded: true,
        push: function push() {
          this.length += 1;
        }
      };
      var adElems = document.querySelectorAll('.adsbygoogle');
      var css = 'height:1px!important;max-height:1px!important;max-width:1px!important;width:1px!important;';
      var executed = false;
      for (var i = 0; i < adElems.length; i += 1) {
        var frame = document.createElement('iframe');
        frame.id = "aswift_".concat(i + 1);
        frame.style = css;
        var childFrame = document.createElement('iframe');
        childFrame.id = "google_ads_frame".concat(i);
        frame.appendChild(childFrame);
        document.body.appendChild(frame);
        executed = true;
      }
      if (executed) {
        hit(source);
      }
    }
    GoogleSyndicationAdsByGoogle.names = ['googlesyndication-adsbygoogle', 'ubo-googlesyndication_adsbygoogle.js', 'googlesyndication_adsbygoogle.js'];
    GoogleSyndicationAdsByGoogle.injections = [hit];

    function GoogleTagManagerGtm(source) {
      window.ga = window.ga || noop;
      var _window = window,
          dataLayer = _window.dataLayer;
      if (dataLayer instanceof Object === false) {
        return;
      }
      if (dataLayer.hide instanceof Object && typeof dataLayer.hide.end === 'function') {
        dataLayer.hide.end();
      }
      if (typeof dataLayer.push === 'function') {
        dataLayer.push = function (data) {
          if (data instanceof Object && typeof data.eventCallback === 'function') {
            setTimeout(data.eventCallback, 1);
          }
        };
      }
      hit(source);
    }
    GoogleTagManagerGtm.names = ['googletagmanager-gtm', 'ubo-googletagmanager_gtm.js', 'googletagmanager_gtm.js'];
    GoogleTagManagerGtm.injections = [hit, noop];

    function GoogleTagServicesGpt(source) {
      var companionAdsService = {
        addEventListener: noopThis,
        enableSyncLoading: noop,
        setRefreshUnfilledSlots: noop
      };
      var contentService = {
        addEventListener: noopThis,
        setContent: noop
      };
      function PassbackSlot() {}
      PassbackSlot.prototype.display = noop;
      PassbackSlot.prototype.get = noopNull;
      PassbackSlot.prototype.set = noopThis;
      PassbackSlot.prototype.setClickUrl = noopThis;
      PassbackSlot.prototype.setTagForChildDirectedTreatment = noopThis;
      PassbackSlot.prototype.setTargeting = noopThis;
      PassbackSlot.prototype.updateTargetingFromMap = noopThis;
      function SizeMappingBuilder() {}
      SizeMappingBuilder.prototype.addSize = noopThis;
      SizeMappingBuilder.prototype.build = noopNull;
      function Slot() {}
      Slot.prototype.addService = noopThis;
      Slot.prototype.clearCategoryExclusions = noopThis;
      Slot.prototype.clearTargeting = noopThis;
      Slot.prototype.defineSizeMapping = noopThis;
      Slot.prototype.get = noopNull;
      Slot.prototype.getAdUnitPath = noopArray;
      Slot.prototype.getAttributeKeys = noopArray;
      Slot.prototype.getCategoryExclusions = noopArray;
      Slot.prototype.getDomId = noopStr;
      Slot.prototype.getSlotElementId = noopStr;
      Slot.prototype.getSlotId = noopThis;
      Slot.prototype.getTargeting = noopArray;
      Slot.prototype.getTargetingKeys = noopArray;
      Slot.prototype.set = noopThis;
      Slot.prototype.setCategoryExclusion = noopThis;
      Slot.prototype.setClickUrl = noopThis;
      Slot.prototype.setCollapseEmptyDiv = noopThis;
      Slot.prototype.setTargeting = noopThis;
      var pubAdsService = {
        addEventListener: noopThis,
        clear: noop,
        clearCategoryExclusions: noopThis,
        clearTagForChildDirectedTreatment: noopThis,
        clearTargeting: noopThis,
        collapseEmptyDivs: noop,
        defineOutOfPagePassback: function defineOutOfPagePassback() {
          return new PassbackSlot();
        },
        definePassback: function definePassback() {
          return new PassbackSlot();
        },
        disableInitialLoad: noop,
        display: noop,
        enableAsyncRendering: noop,
        enableSingleRequest: noop,
        enableSyncRendering: noop,
        enableVideoAds: noop,
        get: noopNull,
        getAttributeKeys: noopArray,
        getTargeting: noop,
        getTargetingKeys: noopArray,
        getSlots: noopArray,
        refresh: noop,
        set: noopThis,
        setCategoryExclusion: noopThis,
        setCentering: noop,
        setCookieOptions: noopThis,
        setForceSafeFrame: noopThis,
        setLocation: noopThis,
        setPublisherProvidedId: noopThis,
        setRequestNonPersonalizedAds: noopThis,
        setSafeFrameConfig: noopThis,
        setTagForChildDirectedTreatment: noopThis,
        setTargeting: noopThis,
        setVideoContent: noopThis,
        updateCorrelator: noop
      };
      var _window = window,
          _window$googletag = _window.googletag,
          googletag = _window$googletag === void 0 ? {} : _window$googletag;
      var _googletag$cmd = googletag.cmd,
          cmd = _googletag$cmd === void 0 ? [] : _googletag$cmd;
      googletag.apiReady = true;
      googletag.cmd = [];
      googletag.cmd.push = function (a) {
        try {
          a();
        } catch (ex) {}
        return 1;
      };
      googletag.companionAds = function () {
        return companionAdsService;
      };
      googletag.content = function () {
        return contentService;
      };
      googletag.defineOutOfPageSlot = function () {
        return new Slot();
      };
      googletag.defineSlot = function () {
        return new Slot();
      };
      googletag.destroySlots = noop;
      googletag.disablePublisherConsole = noop;
      googletag.display = noop;
      googletag.enableServices = noop;
      googletag.getVersion = noopStr;
      googletag.pubads = function () {
        return pubAdsService;
      };
      googletag.pubadsReady = true;
      googletag.setAdIframeTitle = noop;
      googletag.sizeMapping = function () {
        return new SizeMappingBuilder();
      };
      window.googletag = googletag;
      while (cmd.length !== 0) {
        googletag.cmd.push(cmd.shift());
      }
      hit(source);
    }
    GoogleTagServicesGpt.names = ['googletagservices-gpt', 'ubo-googletagservices_gpt.js', 'googletagservices_gpt.js'];
    GoogleTagServicesGpt.injections = [hit, noop, noopThis, noopNull, noopArray, noopStr];

    function ScoreCardResearchBeacon(source) {
      window.COMSCORE = {
        purge: function purge() {
          window._comscore = [];
        },
        beacon: function beacon() {}
      };
      hit(source);
    }
    ScoreCardResearchBeacon.names = ['scorecardresearch-beacon', 'ubo-scorecardresearch_beacon.js', 'scorecardresearch_beacon.js'];
    ScoreCardResearchBeacon.injections = [hit];

    function metrikaYandexTag(source) {
      var asyncCallbackFromOptions = function asyncCallbackFromOptions(param) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        var callback = options.callback;
        var ctx = options.ctx;
        if (typeof callback === 'function') {
          callback = ctx !== undefined ? callback.bind(ctx) : callback;
          setTimeout(function () {
            return callback();
          });
        }
      };
      var init = noop;
      var addFileExtension = noop;
      var extLink = asyncCallbackFromOptions;
      var file = asyncCallbackFromOptions;
      var getClientID = function getClientID(cb) {
        setTimeout(cb(null));
      };
      var hitFunc = asyncCallbackFromOptions;
      var notBounce = asyncCallbackFromOptions;
      var params = noop;
      var reachGoal = function reachGoal(target, params, callback, ctx) {
        asyncCallbackFromOptions(null, {
          callback: callback,
          ctx: ctx
        });
      };
      var setUserID = noop;
      var userParams = noop;
      var api = {
        init: init,
        addFileExtension: addFileExtension,
        extLink: extLink,
        file: file,
        getClientID: getClientID,
        hit: hitFunc,
        notBounce: notBounce,
        params: params,
        reachGoal: reachGoal,
        setUserID: setUserID,
        userParams: userParams
      };
      function ym(id, funcName) {
        for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
          args[_key - 2] = arguments[_key];
        }
        return api[funcName] && api[funcName].apply(api, args);
      }
      window.ym = ym;
      hit(source);
    }
    metrikaYandexTag.names = ['metrika-yandex-tag'];
    metrikaYandexTag.injections = [hit, noop];

    function metrikaYandexWatch(source) {
      var cbName = 'yandex_metrika_callbacks';
      var asyncCallbackFromOptions = function asyncCallbackFromOptions() {
        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        var callback = options.callback;
        var ctx = options.ctx;
        if (typeof callback === 'function') {
          callback = ctx !== undefined ? callback.bind(ctx) : callback;
          setTimeout(function () {
            return callback();
          });
        }
      };
      function Metrika() {}
      Metrika.prototype.addFileExtension = noop;
      Metrika.prototype.getClientID = noop;
      Metrika.prototype.setUserID = noop;
      Metrika.prototype.userParams = noop;
      Metrika.prototype.extLink = function (url, options) {
        asyncCallbackFromOptions(options);
      };
      Metrika.prototype.file = function (url, options) {
        asyncCallbackFromOptions(options);
      };
      Metrika.prototype.hit = function (url, options) {
        asyncCallbackFromOptions(options);
      };
      Metrika.prototype.reachGoal = function (target, params, cb, ctx) {
        asyncCallbackFromOptions({
          callback: cb,
          ctx: ctx
        });
      };
      Metrika.prototype.notBounce = asyncCallbackFromOptions;
      if (window.Ya) {
        window.Ya.Metrika = Metrika;
      } else {
        window.Ya = {
          Metrika: Metrika
        };
      }
      if (window[cbName] && Array.isArray(window[cbName])) {
        window[cbName].forEach(function (func) {
          if (typeof func === 'function') {
            func();
          }
        });
      }
      hit(source);
    }
    metrikaYandexWatch.names = ['metrika-yandex-watch'];
    metrikaYandexWatch.injections = [hit, noop];



    var redirectsList = /*#__PURE__*/Object.freeze({
        __proto__: null,
        preventFab: preventFab,
        setPopadsDummy: setPopadsDummy,
        preventPopadsNet: preventPopadsNet,
        noeval: noeval,
        GoogleAnalytics: GoogleAnalytics,
        GoogleAnalyticsGa: GoogleAnalyticsGa,
        GoogleSyndicationAdsByGoogle: GoogleSyndicationAdsByGoogle,
        GoogleTagManagerGtm: GoogleTagManagerGtm,
        GoogleTagServicesGpt: GoogleTagServicesGpt,
        ScoreCardResearchBeacon: ScoreCardResearchBeacon,
        metrikaYandexTag: metrikaYandexTag,
        metrikaYandexWatch: metrikaYandexWatch
    });

    var getRedirectByName = function getRedirectByName(name) {
      var redirects = Object.keys(redirectsList).map(function (key) {
        return redirectsList[key];
      });
      return redirects.find(function (r) {
        return r.names && r.names.indexOf(name) > -1;
      });
    };
    var getRedirectCode = function getRedirectCode(name) {
      var redirect = getRedirectByName(name);
      var result = attachDependencies(redirect);
      result = addCall(redirect, result);
      return passSourceAndProps({
        name: name
      }, result);
    };
    var redirectsCjs = {
      getCode: getRedirectCode,
      isAdgRedirectRule: validator.isAdgRedirectRule,
      isValidRedirectRule: validator.isValidRedirectRule,
      isValidAdgRedirectRule: validator.isValidAdgRedirectRule,
      isValidUboRedirectRule: validator.isValidUboRedirectRule,
      isValidAbpRedirectRule: validator.isValidAbpRedirectRule,
      convertUboRedirectToAdg: convertUboRedirectToAdg,
      convertAbpRedirectToAdg: convertAbpRedirectToAdg,
      convertRedirectToAdg: convertRedirectToAdg,
      convertAdgRedirectToUbo: convertAdgRedirectToUbo
    };

    function getScriptletCode(source) {
      if (!validator.isValidScriptletName(source.name)) {
        return null;
      }
      var scriptlet = validator.getScriptletByName(source.name);
      var result = attachDependencies(scriptlet);
      result = addCall(scriptlet, result);
      result = source.engine === 'corelibs' ? wrapInNonameFunc(result) : passSourceAndProps(source, result);
      return result;
    }
    scriptlets = function () {
      return {
        invoke: getScriptletCode,
        isValidScriptletName: validator.isValidScriptletName,
        isValidScriptletRule: isValidScriptletRule,
        isAdgScriptletRule: validator.isAdgScriptletRule,
        isUboScriptletRule: validator.isUboScriptletRule,
        isAbpSnippetRule: validator.isAbpSnippetRule,
        convertUboToAdg: convertUboScriptletToAdg,
        convertAbpToAdg: convertAbpSnippetToAdg,
        convertScriptletToAdg: convertScriptletToAdg,
        convertAdgToUbo: convertAdgScriptletToUbo,
        redirects: redirectsCjs
      };
    }();

}());

/**
 * -------------------------------------------
 * |                                         |
 * |  If you want to add your own scriptlet  |
 * |  please put your code below             |
 * |                                         |
 * -------------------------------------------
 */
//# sourceMappingURL=scriptlets.js.map
