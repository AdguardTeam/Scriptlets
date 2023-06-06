
/**
 * AdGuard Scriptlets
 * Version 1.9.37
 */

(function (factory) {
    typeof define === 'function' && define.amd ? define(factory) :
    factory();
})((function () {
    /**
     * Concat dependencies to scriptlet code
     *
     * @param {string} scriptlet string view of scriptlet
     * @returns {string} string view of scriptlet with attached dependencies
     */
    function attachDependencies(scriptlet) {
      const _scriptlet$injections = scriptlet.injections,
        injections = _scriptlet$injections === void 0 ? [] : _scriptlet$injections;
      return injections.reduce(function (accum, dep) {
        return "".concat(accum, "\n").concat(dep.toString());
      }, scriptlet.toString());
    }

    /**
     * Add scriptlet call to existing code
     *
     * @param {Function} scriptlet scriptlet func
     * @param {string} code scriptlet's string representation
     * @returns {string} wrapped scriptlet call
     */
    function addCall(scriptlet, code) {
      return "".concat(code, "\n    const updatedArgs = args ? [].concat(source).concat(args) : [source];\n    try {\n        ").concat(scriptlet.name, ".apply(this, updatedArgs);\n    } catch (e) {\n        console.log(e);\n    }");
    }

    /**
     * Wrap function into IIFE (Immediately invoked function expression)
     *
     * @example
     * const source = {
     *      args: ["aaa", "bbb"],
     *      name: 'noeval',
     * };
     * const code = "function noeval(source, args) { alert(source); } noeval.apply(this, args);"
     * const result = wrapInIIFE(source, code);
     *
     * // result
     * `(function(source, args) {
     *      function noeval(source) { alert(source); }
     *      noeval.apply(this, args);
     * )({"args": ["aaa", "bbb"], "name":"noeval"}, ["aaa", "bbb"])`
     * @param {Object} source - object with scriptlet properties
     * @param {string} code - scriptlet source code with dependencies
     * @param {boolean} redirect if function is redirect
     * @returns {string} full scriptlet code
     */
    function passSourceAndProps(source, code) {
      let redirect = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
      if (source.hit) {
        source.hit = source.hit.toString();
      }
      const sourceString = JSON.stringify(source);
      const argsString = source.args ? "[".concat(source.args.map(JSON.stringify), "]") : undefined;
      const params = argsString ? "".concat(sourceString, ", ").concat(argsString) : sourceString;
      if (redirect) {
        return "(function(source, args){\n".concat(code, "\n})(").concat(params, ");");
      }
      return "(".concat(code, ")(").concat(params, ");");
    }

    /**
     * Wrap code in no name function
     *
     * @param {string} code which must be wrapped
     * @returns {string} wrapped code
     */
    function wrapInNonameFunc(code) {
      return "function(source, args){\n".concat(code, "\n}");
    }

    /**
     * Checks whether the obj is an empty object
     *
     * @param {Object} obj arbitrary object
     * @returns {boolean} if object is empty
     */
    const isEmptyObject = function isEmptyObject(obj) {
      return Object.keys(obj).length === 0 && !obj.prototype;
    };

    /**
     * Safely retrieve property descriptor
     *
     * @param {Object} obj target object
     * @param {string} prop target property
     * @returns {object|null} descriptor or null if it's not available or non-configurable
     */
    const safeGetDescriptor = function safeGetDescriptor(obj, prop) {
      const descriptor = Object.getOwnPropertyDescriptor(obj, prop);
      if (descriptor && descriptor.configurable) {
        return descriptor;
      }
      return null;
    };

    /**
     * Set getter and setter to property if it's configurable
     *
     * @param {Object} object target object with property
     * @param {string} property property name
     * @param {Object} descriptor contains getter and setter functions
     * @returns {boolean} is operation successful
     */
    function setPropertyAccess(object, property, descriptor) {
      const currentDescriptor = Object.getOwnPropertyDescriptor(object, property);
      if (currentDescriptor && !currentDescriptor.configurable) {
        return false;
      }
      Object.defineProperty(object, property, descriptor);
      return true;
    }

    /**
     * Determines whether the passed value is NaN
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isNaN
     *
     * @param {any} num arbitrary value
     * @returns {boolean} if provided value is NaN
     */
    const nativeIsNaN = function nativeIsNaN(num) {
      // eslint-disable-next-line no-restricted-properties
      const native = Number.isNaN || window.isNaN;
      return native(num);
    };

    /**
     * Determines whether the passed value is a finite number
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isFinite
     *
     * @param {any} num arbitrary value
     * @returns {boolean} if provided value is finite
     */
    const nativeIsFinite = function nativeIsFinite(num) {
      // eslint-disable-next-line no-restricted-properties
      const native = Number.isFinite || window.isFinite;
      return native(num);
    };

    /**
     * Parses string for a number, if possible, otherwise returns null.
     *
     * @param {any} rawString arbitrary string
     * @returns {number|null} number or null if string not parsable
     */
    const getNumberFromString = function getNumberFromString(rawString) {
      const parsedDelay = parseInt(rawString, 10);
      const validDelay = nativeIsNaN(parsedDelay) ? null : parsedDelay;
      return validDelay;
    };

    /**
     * Generate a random integer between two values, inclusive
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random#getting_a_random_integer_between_two_values_inclusive
     *
     * @param {number} min range minimum
     * @param {number} max range maximum
     * @returns {number} random number
     */
    function getRandomIntInclusive(min, max) {
      min = Math.ceil(min);
      max = Math.floor(max);
      return Math.floor(Math.random() * (max - min + 1) + min);
    }

    /**
     * String.prototype.replaceAll polyfill
     *
     * @param {string} input input string
     * @param {string} substr to look for
     * @param {string} newSubstr replacement
     * @returns {string} result string
     */
    const replaceAll = function replaceAll(input, substr, newSubstr) {
      return input.split(substr).join(newSubstr);
    };

    /**
     * Escapes special chars in string
     *
     * @param {string} str raw string
     * @returns {string} string with escaped special characters
     */
    const escapeRegExp = function escapeRegExp(str) {
      return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    /**
     * A literal string or regexp pattern wrapped in forward slashes.
     * For example, 'simpleStr' or '/adblock|_0x/'.
     *
     * @typedef {string} RawStrPattern
     */

    /**
     * Converts string to the regexp
     * TODO think about nested dependencies, but be careful with dependency loops
     *
     * @param {RawStrPattern} [input=''] literal string or regexp pattern; defaults to '' (empty string)
     * @returns {RegExp} regular expression; defaults to /.?/
     * @throws {SyntaxError} Throw an error for invalid regex pattern
     */
    const toRegExp = function toRegExp() {
      let input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
      const DEFAULT_VALUE = '.?';
      const FORWARD_SLASH = '/';
      if (input === '') {
        return new RegExp(DEFAULT_VALUE);
      }
      if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
        return new RegExp(input.slice(1, -1));
      }
      const escaped = input
      // remove quotes' escapes for cases where scriptlet rule argument has own escaped quotes
      // e.g #%#//scriptlet('prevent-setTimeout', '.css(\'display\',\'block\');')
      .replace(/\\'/g, '\'').replace(/\\"/g, '"')
      // escape special characters for following RegExp construction
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(escaped);
    };

    /**
     * Checks whether the input string can be converted to regexp
     *
     * @param {RawStrPattern} input literal string or regexp pattern
     * @returns {boolean} if input can be converted to regexp
     */
    const isValidStrPattern = function isValidStrPattern(input) {
      const FORWARD_SLASH = '/';
      let str = escapeRegExp(input);
      if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
        str = input.slice(1, -1);
      }
      let isValid;
      try {
        isValid = new RegExp(str);
        isValid = true;
      } catch (e) {
        isValid = false;
      }
      return isValid;
    };

    /**
     * Get string before regexp first match
     *
     * @param {string} str input string
     * @param {RegExp} rx find pattern
     * @returns {string} result string
     */
    const getBeforeRegExp = function getBeforeRegExp(str, rx) {
      const index = str.search(rx);
      return str.substring(0, index);
    };
    const substringAfter$1 = function substringAfter(str, separator) {
      if (!str) {
        return str;
      }
      const index = str.indexOf(separator);
      return index < 0 ? '' : str.substring(index + separator.length);
    };
    const substringBefore = function substringBefore(str, separator) {
      if (!str || !separator) {
        return str;
      }
      const index = str.indexOf(separator);
      return index < 0 ? str : str.substring(0, index);
    };

    /**
     * Wrap str in single quotes and replaces single quotes to double one
     *
     * @param {string} str input string
     * @returns {string} string with swapped quotes
     */
    const wrapInSingleQuotes = function wrapInSingleQuotes(str) {
      if (str[0] === '\'' && str[str.length - 1] === '\'' || str[0] === '"' && str[str.length - 1] === '"') {
        str = str.substring(1, str.length - 1);
      }
      // eslint-disable-next-line no-useless-escape
      str = str.replace(/\'/g, '"');
      return "'".concat(str, "'");
    };

    /**
     * Returns substring enclosed in the widest braces
     *
     * @param {string} str input string
     * @returns {string} substring
     */
    const getStringInBraces = function getStringInBraces(str) {
      const firstIndex = str.indexOf('(');
      const lastIndex = str.lastIndexOf(')');
      return str.substring(firstIndex + 1, lastIndex);
    };

    /**
     * Prepares RTCPeerConnection config as string for proper logging
     *
     * @param {any} config RTC config
     * @returns {string} stringified config
     */
    const convertRtcConfigToString = function convertRtcConfigToString(config) {
      const UNDEF_STR = 'undefined';
      let str = UNDEF_STR;
      if (config === null) {
        str = 'null';
      } else if (config instanceof Object) {
        const SERVERS_PROP_NAME = 'iceServers';
        const URLS_PROP_NAME = 'urls';
        /*
            const exampleConfig = {
                'iceServers': [
                    'urls': ['stun:35.66.206.188:443'],
                ],
            };
        */
        if (Object.prototype.hasOwnProperty.call(config, SERVERS_PROP_NAME) && Object.prototype.hasOwnProperty.call(config[SERVERS_PROP_NAME][0], URLS_PROP_NAME) && !!config[SERVERS_PROP_NAME][0][URLS_PROP_NAME]) {
          str = config[SERVERS_PROP_NAME][0][URLS_PROP_NAME].toString();
        }
      }
      return str;
    };

    /**
     * Checks whether the match input string can be converted to regexp,
     * used for match inputs with possible negation
     *
     * @param {string} match literal string or regexp pattern
     * @returns {boolean} true if input can be converted to regexp
     */
    const isValidMatchStr = function isValidMatchStr(match) {
      const INVERT_MARKER = '!';
      let str = match;
      if (match !== null && match !== void 0 && match.startsWith(INVERT_MARKER)) {
        str = match.slice(1);
      }
      return isValidStrPattern(str);
    };

    /**
     * Validates the match input number,
     * used for match inputs with possible negation
     *
     * @param {string} match string of match number
     * @returns {boolean} if match number is valid
     */
    const isValidMatchNumber = function isValidMatchNumber(match) {
      const INVERT_MARKER = '!';
      let str = match;
      if (match !== null && match !== void 0 && match.startsWith(INVERT_MARKER)) {
        str = match.slice(1);
      }
      const num = parseFloat(str);
      return !nativeIsNaN(num) && nativeIsFinite(num);
    };

    /**
     * @typedef {Object} MatchData
     * @property {boolean} isInvertedMatch if matching should be inverted
     * @property {RegExp} matchRegexp match value parsed into regex
     */

    /**
     * Parses match arg with possible negation for no matching.
     * Needed for prevent-setTimeout, prevent-setInterval,
     * prevent-requestAnimationFrame and prevent-window-open
     *
     * @param {string} match matching arg
     * @returns {MatchData} data prepared for matching
     */
    const parseMatchArg = function parseMatchArg(match) {
      const INVERT_MARKER = '!';
      // In case if "match" is "undefined" return "false"
      const isInvertedMatch = match ? match === null || match === void 0 ? void 0 : match.startsWith(INVERT_MARKER) : false;
      const matchValue = isInvertedMatch ? match.slice(1) : match;
      const matchRegexp = toRegExp(matchValue);
      return {
        isInvertedMatch,
        matchRegexp,
        matchValue
      };
    };

    /**
     * @typedef {Object} DelayData
     * @property {boolean} isInvertedDelayMatch if matching should be inverted
     * @property {number|null} delayMatch parsed delay or null if delay is invalid
     */

    /**
     * Parses delay arg with possible negation for no matching.
     * Needed for prevent-setTimeout and prevent-setInterval
     *
     * @param {string} delay scriptlet's delay arg
     * @returns {DelayData} parsed delay data
     */
    const parseDelayArg = function parseDelayArg(delay) {
      const INVERT_MARKER = '!';
      const isInvertedDelayMatch = delay === null || delay === void 0 ? void 0 : delay.startsWith(INVERT_MARKER);
      let delayValue = isInvertedDelayMatch ? delay.slice(1) : delay;
      delayValue = parseInt(delayValue, 10);
      const delayMatch = nativeIsNaN(delayValue) ? null : delayValue;
      return {
        isInvertedDelayMatch,
        delayMatch
      };
    };

    /**
     * Converts object to string for logging
     *
     * @param {Object} obj data object
     * @returns {string} object's string representation
     */
    const objectToString = function objectToString(obj) {
      // In case if the type of passed obj is different than Object
      // https://github.com/AdguardTeam/Scriptlets/issues/282
      if (!obj || typeof obj !== 'object') {
        return String(obj);
      }
      return isEmptyObject(obj) ? '{}' : Object.entries(obj).map(function (pair) {
        const key = pair[0];
        const value = pair[1];
        let recordValueStr = value;
        if (value instanceof Object) {
          recordValueStr = "{ ".concat(objectToString(value), " }");
        }
        return "".concat(key, ":\"").concat(recordValueStr, "\"");
      }).join(' ');
    };

    /**
     * Converts types into a string
     *
     * @param {any} value input value type
     * @returns {string} type's string representation
     */
    const convertTypeToString = function convertTypeToString(value) {
      let output;
      if (typeof value === 'undefined') {
        output = 'undefined';
      } else if (typeof value === 'object') {
        if (value === null) {
          output = 'null';
        } else {
          output = objectToString(value);
        }
      } else {
        output = value.toString();
      }
      return output;
    };

    /**
     * Generate a random string, a length of the string is provided as an argument
     *
     * @param {number} length output's length
     * @returns {string} random string
     */
    function getRandomStrByLength(length) {
      let result = '';
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+=~';
      const charactersLength = characters.length;
      for (let i = 0; i < length; i += 1) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
      }
      return result;
    }

    /**
     * Generate a random string
     *
     * @param {string} customResponseText response text to include in output
     * @returns {string|null} random string or null if passed argument is invalid
     */
    function generateRandomResponse(customResponseText) {
      let customResponse = customResponseText;
      if (customResponse === 'true') {
        // Generate random alphanumeric string of 10 symbols
        customResponse = Math.random().toString(36).slice(-10);
        return customResponse;
      }
      customResponse = customResponse.replace('length:', '');
      const rangeRegex = /^\d+-\d+$/;
      // Return empty string if range is invalid
      if (!rangeRegex.test(customResponse)) {
        return null;
      }
      let rangeMin = getNumberFromString(customResponse.split('-')[0]);
      let rangeMax = getNumberFromString(customResponse.split('-')[1]);
      if (!nativeIsFinite(rangeMin) || !nativeIsFinite(rangeMax)) {
        return null;
      }

      // If rangeMin > rangeMax, swap variables
      if (rangeMin > rangeMax) {
        const temp = rangeMin;
        rangeMin = rangeMax;
        rangeMax = temp;
      }
      const LENGTH_RANGE_LIMIT = 500 * 1000;
      if (rangeMax > LENGTH_RANGE_LIMIT) {
        return null;
      }
      const length = getRandomIntInclusive(rangeMin, rangeMax);
      customResponse = getRandomStrByLength(length);
      return customResponse;
    }

    /**
     * Infers value from string argument
     * Inferring goes from more specific to more ambiguous options
     * Arrays, objects and strings are parsed via JSON.parse
     *
     * @param {string} value arbitrary string
     * @returns {any} converted value
     * @throws an error on unexpected input
     */
    function inferValue(value) {
      if (value === 'undefined') {
        return undefined;
      }
      if (value === 'false') {
        return false;
      }
      if (value === 'true') {
        return true;
      }
      if (value === 'null') {
        return null;
      }
      if (value === 'NaN') {
        return NaN;
      }

      // Number class constructor works 2 times faster than JSON.parse
      // and wont interpret mixed inputs like '123asd' as parseFloat would
      const MAX_ALLOWED_NUM = 32767;
      const numVal = Number(value);
      if (!nativeIsNaN(numVal)) {
        if (Math.abs(numVal) > MAX_ALLOWED_NUM) {
          throw new Error('number values bigger than 32767 are not allowed');
        }
        return numVal;
      }
      let errorMessage = "'".concat(value, "' value type can't be inferred");
      try {
        // Parse strings, arrays and objects represented as JSON strings
        // '[1,2,3,"string"]' > [1, 2, 3, 'string']
        // '"arbitrary string"' > 'arbitrary string'
        const parsableVal = JSON.parse(value);
        if (parsableVal instanceof Object || typeof parsableVal === 'string') {
          return parsableVal;
        }
      } catch (e) {
        errorMessage += ": ".concat(e);
      }
      throw new TypeError(errorMessage);
    }

    /**
     * Iterate over iterable argument and evaluate current state with transitions
     *
     * @param {Array|string} iterable rule or list or rules
     * @param {Object} transitions transtion functions
     * @param {string} init first transition name
     * @param {any} args arguments which should be passed to transition functions
     * @returns {string} state
     */
    function iterateWithTransitions(iterable, transitions, init, args) {
      let state = init || Object.keys(transitions)[0];
      for (let i = 0; i < iterable.length; i += 1) {
        state = transitions[state](iterable, i, args);
      }
      return state;
    }

    /**
     * AdGuard scriptlet rule mask
     */
    const ADG_SCRIPTLET_MASK = '#//scriptlet';

    /**
     * Helper to accumulate an array of strings char by char
     *
     * @returns {Object} object with helper methods
     */
    const wordSaver = function wordSaver() {
      let str = '';
      const strings = [];
      const saveSymb = function saveSymb(s) {
        str += s;
        return str;
      };
      const saveStr = function saveStr() {
        strings.push(str);
        str = '';
      };
      const getAll = function getAll() {
        return [...strings];
      };
      return {
        saveSymb,
        saveStr,
        getAll
      };
    };
    const substringAfter = function substringAfter(str, separator) {
      if (!str) {
        return str;
      }
      const index = str.indexOf(separator);
      return index < 0 ? '' : str.substring(index + separator.length);
    };

    /**
     * Parses scriptlet rule and validates its syntax.
     *
     * @param {string} ruleText Rule string
     *
     * @returns {{name: string, args: Array<string>}} Parsed rule data.
     * @throws An error on invalid rule syntax.
     */
    const parseRule = function parseRule(ruleText) {
      ruleText = substringAfter(ruleText, ADG_SCRIPTLET_MASK);
      /**
       * Transition names
       */
      const TRANSITION = {
        OPENED: 'opened',
        PARAM: 'param',
        CLOSED: 'closed'
      };

      /**
       * Transition function: the current index position in start, end or between params
       *
       * @param {string} rule rule string
       * @param {number} index index
       * @param {Object} Object helper object
       * @param {Object} Object.sep contains prop symb with current separator char
       * @throws {string} throws if given rule is not a scriptlet
       * @returns {string} transition
       */
      const opened = function opened(rule, index, _ref) {
        let sep = _ref.sep;
        const char = rule[index];
        let transition;
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
      /**
       * Transition function: the current index position inside param
       *
       * @param {string} rule rule string
       * @param {number} index index
       * @param {Object} Object helper object
       * @param {Object} Object.sep contains prop `symb` with current separator char
       * @param {Object} Object.saver helper which allow to save strings by car by char
       * @returns {void}
       */
      const param = function param(rule, index, _ref2) {
        let saver = _ref2.saver,
          sep = _ref2.sep;
        const char = rule[index];
        switch (char) {
          case '\'':
          case '"':
            {
              const preIndex = index - 1;
              const before = rule[preIndex];
              if (char === sep.symb && before !== '\\') {
                sep.symb = null;
                saver.saveStr();
                return TRANSITION.OPENED;
              }
            }
          // eslint-disable-next-line no-fallthrough
          default:
            {
              saver.saveSymb(char);
              return TRANSITION.PARAM;
            }
        }
      };
      const transitions = {
        [TRANSITION.OPENED]: opened,
        [TRANSITION.PARAM]: param,
        [TRANSITION.CLOSED]: function () {}
      };
      const sep = {
        symb: null
      };
      const saver = wordSaver();
      const state = iterateWithTransitions(ruleText, transitions, TRANSITION.OPENED, {
        sep,
        saver
      });
      if (state !== 'closed') {
        throw new Error("Invalid scriptlet rule ".concat(ruleText));
      }
      const args = saver.getAll();
      return {
        name: args[0],
        args: args.slice(1)
      };
    };

    /**
     * Validates event type
     *
     * @param {any} type event type
     * @returns {boolean} if type is valid
     */
    const validateType = function validateType(type) {
      // https://github.com/AdguardTeam/Scriptlets/issues/125
      return typeof type !== 'undefined';
    };

    /**
     * Validates event listener
     *
     * @param {any} listener event listener
     * @returns {boolean} if listener callback is valid
     */
    const validateListener = function validateListener(listener) {
      // https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#parameters
      return typeof listener !== 'undefined' && (typeof listener === 'function' || typeof listener === 'object'
      // https://github.com/AdguardTeam/Scriptlets/issues/76
      && listener !== null && typeof listener.handleEvent === 'function');
    };

    /**
     * @typedef {object|Function|null} EventListener
     */

    /**
     * Serialize valid event listener
     * https://developer.mozilla.org/en-US/docs/Web/API/EventListener
     *
     * @param {EventListener} listener valid listener
     * @returns {string} listener string
     */
    const listenerToString = function listenerToString(listener) {
      return typeof listener === 'function' ? listener.toString() : listener.handleEvent.toString();
    };

    const shouldMatchAnyDelay = function shouldMatchAnyDelay(delay) {
      return delay === '*';
    };

    /**
     * Handles input delay value
     *
     * @param {any} delay matchDelay argument of adjust-* scriptlets
     * @returns {number} proper number delay value
     */
    const getMatchDelay = function getMatchDelay(delay) {
      const DEFAULT_DELAY = 1000;
      const parsedDelay = parseInt(delay, 10);
      const delayMatch = nativeIsNaN(parsedDelay) ? DEFAULT_DELAY // default scriptlet value
      : parsedDelay;
      return delayMatch;
    };

    /**
     * Checks delay match condition
     *
     * @param {any} inputDelay matchDelay argument of adjust-* scriptlets
     * @param {number} realDelay delay argument of setTimeout/setInterval
     * @returns {boolean} if given delays match
     */
    const isDelayMatched = function isDelayMatched(inputDelay, realDelay) {
      return shouldMatchAnyDelay(inputDelay) || realDelay === getMatchDelay(inputDelay);
    };

    /**
     * Handles input boost value
     *
     * @param {any} boost boost argument of adjust-* scriptlets
     * @returns {number} proper number boost multiplier value
     */
    const getBoostMultiplier = function getBoostMultiplier(boost) {
      const DEFAULT_MULTIPLIER = 0.05;
      // https://github.com/AdguardTeam/Scriptlets/issues/262
      const MIN_MULTIPLIER = 0.001;
      const MAX_MULTIPLIER = 50;
      const parsedBoost = parseFloat(boost);
      let boostMultiplier = nativeIsNaN(parsedBoost) || !nativeIsFinite(parsedBoost) ? DEFAULT_MULTIPLIER // default scriptlet value
      : parsedBoost;
      if (boostMultiplier < MIN_MULTIPLIER) {
        boostMultiplier = MIN_MULTIPLIER;
      }
      if (boostMultiplier > MAX_MULTIPLIER) {
        boostMultiplier = MAX_MULTIPLIER;
      }
      return boostMultiplier;
    };

    /**
     * Some browsers do not support Array.prototype.flat()
     * for example, Opera 42 which is used for browserstack tests
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flat
     *
     * @param {Array} input arbitrary array
     * @returns {Array} flattened array
     */
    const flatten = function flatten(input) {
      const stack = [];
      input.forEach(function (el) {
        return stack.push(el);
      });
      const res = [];
      while (stack.length) {
        // pop value from stack
        const next = stack.pop();
        if (Array.isArray(next)) {
          // push back array items, won't modify the original input
          next.forEach(function (el) {
            return stack.push(el);
          });
        } else {
          res.push(next);
        }
      }
      // reverse to restore input order
      return res.reverse();
    };

    /**
     * Predicate method to check if the array item exists
     *
     * @param {any} item arbitrary
     * @returns {boolean} if item is truthy or not
     */
    const isExisting = function isExisting(item) {
      return !!item;
    };

    /**
     * Converts NodeList to array
     *
     * @param {NodeList} nodeList arbitrary NodeList
     * @returns {Node[Array]} array of nodes
     */
    const nodeListToArray = function nodeListToArray(nodeList) {
      const nodes = [];
      for (let i = 0; i < nodeList.length; i += 1) {
        nodes.push(nodeList[i]);
      }
      return nodes;
    };

    /**
     * Checks whether the input path is supported
     *
     * @param {string} rawPath input path
     * @returns {boolean} if cookie path is valid
     */
    const isValidCookiePath = function isValidCookiePath(rawPath) {
      return rawPath === '/' || rawPath === 'none';
    };

    /**
     * Returns 'path=/' if rawPath is '/'
     * or empty string '' for other cases, `rawPath === 'none'` included
     *
     * @param {string} rawPath path argument of *set-cookie-* scriptlets
     * @returns {string} cookie path
     */
    const getCookiePath = function getCookiePath(rawPath) {
      if (rawPath === '/') {
        return 'path=/';
      }
      // otherwise do not set path as invalid
      // the same for pathArg === 'none'
      return '';
    };

    /**
     * Combines input cookie name, value, and path into string.
     *
     * @param {string} rawName name argument of *set-cookie-* scriptlets
     * @param {string} rawValue value argument of *set-cookie-* scriptlets
     * @param {string} rawPath path argument of *set-cookie-* scriptlets
     * @param {boolean} shouldEncode if cookie's name and value should be encoded
     * @returns {string|null} string OR `null` if name or value is invalid
     */
    const concatCookieNameValuePath = function concatCookieNameValuePath(rawName, rawValue, rawPath) {
      let shouldEncode = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
      const COOKIE_BREAKER = ';';
      // semicolon will cause the cookie to break
      if (!shouldEncode && (rawName.includes(COOKIE_BREAKER) || "".concat(rawValue).includes(COOKIE_BREAKER))) {
        return null;
      }
      const name = shouldEncode ? encodeURIComponent(rawName) : rawName;
      const value = shouldEncode ? encodeURIComponent(rawValue) : rawValue;
      return "".concat(name, "=").concat(value, "; ").concat(getCookiePath(rawPath), ";");
    };

    /**
     * Gets supported cookie value
     *
     * @param {string} value input cookie value
     * @returns {string|null} valid cookie string if ok OR null if not
     */
    const getLimitedCookieValue = function getLimitedCookieValue(value) {
      if (!value) {
        return null;
      }
      let validValue;
      if (value === 'true') {
        validValue = 'true';
      } else if (value === 'True') {
        validValue = 'True';
      } else if (value === 'false') {
        validValue = 'false';
      } else if (value === 'False') {
        validValue = 'False';
      } else if (value === 'yes') {
        validValue = 'yes';
      } else if (value === 'Yes') {
        validValue = 'Yes';
      } else if (value === 'Y') {
        validValue = 'Y';
      } else if (value === 'no') {
        validValue = 'no';
      } else if (value === 'ok') {
        validValue = 'ok';
      } else if (value === 'OK') {
        validValue = 'OK';
      } else if (/^\d+$/.test(value)) {
        validValue = parseFloat(value);
        if (nativeIsNaN(validValue)) {
          return null;
        }
        if (Math.abs(validValue) < 0 || Math.abs(validValue) > 15) {
          return null;
        }
      } else {
        return null;
      }
      return validValue;
    };

    /**
     * Parses cookie string into object
     *
     * @param {string} cookieString string that conforms to document.cookie format
     * @returns {Object} key:value object that corresponds with incoming cookies keys and values
     */
    const parseCookieString = function parseCookieString(cookieString) {
      const COOKIE_DELIMITER = '=';
      const COOKIE_PAIRS_DELIMITER = ';';

      // Get raw cookies
      const cookieChunks = cookieString.split(COOKIE_PAIRS_DELIMITER);
      const cookieData = {};
      cookieChunks.forEach(function (singleCookie) {
        let cookieKey;
        let cookieValue;
        const delimiterIndex = singleCookie.indexOf(COOKIE_DELIMITER);
        if (delimiterIndex === -1) {
          cookieKey = singleCookie.trim();
        } else {
          cookieKey = singleCookie.slice(0, delimiterIndex).trim();
          cookieValue = singleCookie.slice(delimiterIndex + 1);
        }
        // Save cookie key=value data with null instead of empty ('') values
        cookieData[cookieKey] = cookieValue || null;
      });
      return cookieData;
    };

    /**
     * Check if cookie with specified name and value is present in a cookie string
     *
     * @param {string} cookieString 'document.cookie'-like string
     * @param {string} name name argument of *set-cookie-* scriptlets
     * @param {string} value value argument of *set-cookie-* scriptlets
     * @returns {boolean} if cookie is already set
     */
    const isCookieSetWithValue = function isCookieSetWithValue(cookieString, name, value) {
      return cookieString.split(';').some(function (cookieStr) {
        const pos = cookieStr.indexOf('=');
        if (pos === -1) {
          return false;
        }
        const cookieName = cookieStr.slice(0, pos).trim();
        const cookieValue = cookieStr.slice(pos + 1).trim();
        return name === cookieName && value === cookieValue;
      });
    };

    /**
     * Returns parsed offset expired number of ms or null if `offsetExpiresSec` is invalid
     *
     * @param {string} offsetExpiresSec input offset param in seconds
     * @returns {number|null} number is milliseconds OR null
     */
    const getTrustedCookieOffsetMs = function getTrustedCookieOffsetMs(offsetExpiresSec) {
      const ONE_YEAR_EXPIRATION_KEYWORD = '1year';
      const ONE_DAY_EXPIRATION_KEYWORD = '1day';
      const MS_IN_SEC = 1000;
      const SECONDS_IN_YEAR = 365 * 24 * 60 * 60;
      const SECONDS_IN_DAY = 24 * 60 * 60;
      let parsedSec;
      // Set predefined expire value if corresponding keyword was passed
      if (offsetExpiresSec === ONE_YEAR_EXPIRATION_KEYWORD) {
        parsedSec = SECONDS_IN_YEAR;
      } else if (offsetExpiresSec === ONE_DAY_EXPIRATION_KEYWORD) {
        parsedSec = SECONDS_IN_DAY;
      } else {
        parsedSec = Number.parseInt(offsetExpiresSec, 10);
        // If offsetExpiresSec has been parsed to NaN - do not set cookie at all
        if (Number.isNaN(parsedSec)) {
          return null;
        }
      }
      return parsedSec * MS_IN_SEC;
    };

    /**
     * Noop function
     *
     * @returns {undefined} undefined
     */
    const noopFunc = function noopFunc() {};

    /**
     * Function returns noopFunc
     *
     * @returns {Function} noopFunc
     */
    const noopCallbackFunc = function noopCallbackFunc() {
      return noopFunc;
    };

    /**
     * Function returns null
     *
     * @returns {null} null
     */
    const noopNull = function noopNull() {
      return null;
    };

    /**
     * Function returns true
     *
     * @returns {boolean} true
     */
    const trueFunc = function trueFunc() {
      return true;
    };

    /**
     * Function returns false
     *
     * @returns {boolean} false
     */
    const falseFunc = function falseFunc() {
      return false;
    };

    /**
     * Function returns this
     *
     * @returns {this} this object
     */
    function noopThis() {
      return this;
    }

    /**
     * Function returns empty string
     *
     * @returns {string} empty string
     */
    const noopStr = function noopStr() {
      return '';
    };

    /**
     * Function returns empty array
     *
     * @returns {Array} empty array
     */
    const noopArray = function noopArray() {
      return [];
    };

    /**
     * Function returns empty object
     *
     * @returns {Object} empty object
     */
    const noopObject = function noopObject() {
      return {};
    };

    /**
     * Function throws an error
     *
     * @throws
     */
    const throwFunc = function throwFunc() {
      throw new Error();
    };

    /**
     * Function returns Promise.reject()
     *
     * @returns {Promise} rejected Promise
     */
    const noopPromiseReject = function noopPromiseReject() {
      return Promise.reject();
    };

    /**
     * Returns Promise object that is resolved with specified props
     *
     * @param {string} [responseBody='{}'] value to set as responseBody
     * @param {string} [responseUrl=''] value to set as responseUrl
     * @param {string} [responseType='default'] value to set as responseType
     * @returns {Promise<Response>|undefined} resolved Promise or undefined if Response interface is not available
     */
    const noopPromiseResolve = function noopPromiseResolve() {
      let responseBody = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '{}';
      let responseUrl = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
      let responseType = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'default';
      if (typeof Response === 'undefined') {
        return;
      }
      const response = new Response(responseBody, {
        status: 200,
        statusText: 'OK'
      });

      // Mock response' url & type to avoid adb checks
      // https://github.com/AdguardTeam/Scriptlets/issues/216
      Object.defineProperties(response, {
        url: {
          value: responseUrl
        },
        type: {
          value: responseType
        }
      });

      // eslint-disable-next-line consistent-return
      return Promise.resolve(response);
    };

    /**
     * Determines if type of script is inline or injected
     * and when it's one of them then return true, otherwise false
     * https://github.com/AdguardTeam/Scriptlets/issues/201
     *
     * @param {string|undefined} stackMatch - input stack value to match
     * @param {string} stackTrace - script error stack trace
     * @returns {boolean} if stacks match
     */
    const shouldAbortInlineOrInjectedScript = function shouldAbortInlineOrInjectedScript(stackMatch, stackTrace) {
      const INLINE_SCRIPT_STRING = 'inlineScript';
      const INJECTED_SCRIPT_STRING = 'injectedScript';
      const INJECTED_SCRIPT_MARKER = '<anonymous>';
      const isInlineScript = function isInlineScript(stackMatch) {
        return stackMatch.includes(INLINE_SCRIPT_STRING);
      };
      const isInjectedScript = function isInjectedScript(stackMatch) {
        return stackMatch.includes(INJECTED_SCRIPT_STRING);
      };
      if (!(isInlineScript(stackMatch) || isInjectedScript(stackMatch))) {
        return false;
      }
      let documentURL = window.location.href;
      const pos = documentURL.indexOf('#');
      // Remove URL hash
      // in Chrome, URL in stackTrace doesn't contain hash
      // so, it's necessary to remove it, otherwise location.href
      // will not match with location from stackTrace
      if (pos !== -1) {
        documentURL = documentURL.slice(0, pos);
      }
      const stackSteps = stackTrace.split('\n').slice(2).map(function (line) {
        return line.trim();
      });
      const stackLines = stackSteps.map(function (line) {
        let stack;
        // Get stack trace URL
        // in Firefox stack trace looks like this: advanceTaskQueue@http://127.0.0.1:8080/scriptlets/tests/dist/qunit.js:1834:20
        // in Chrome like this: at Assert.throws (http://127.0.0.1:8080/scriptlets/tests/dist/qunit.js:3178:16)
        // so, first group "(.*?@)" is required for Firefox, second group contains URL
        const getStackTraceURL = /(.*?@)?(\S+)(:\d+):\d+\)?$/.exec(line);
        if (getStackTraceURL) {
          var _stackURL, _stackURL2;
          let stackURL = getStackTraceURL[2];
          if ((_stackURL = stackURL) !== null && _stackURL !== void 0 && _stackURL.startsWith('(')) {
            stackURL = stackURL.slice(1);
          }
          if ((_stackURL2 = stackURL) !== null && _stackURL2 !== void 0 && _stackURL2.startsWith(INJECTED_SCRIPT_MARKER)) {
            var _stackFunction;
            stackURL = INJECTED_SCRIPT_STRING;
            let stackFunction = getStackTraceURL[1] !== undefined ? getStackTraceURL[1].slice(0, -1) : line.slice(0, getStackTraceURL.index).trim();
            if ((_stackFunction = stackFunction) !== null && _stackFunction !== void 0 && _stackFunction.startsWith('at')) {
              stackFunction = stackFunction.slice(2).trim();
            }
            stack = "".concat(stackFunction, " ").concat(stackURL).trim();
          } else {
            stack = stackURL;
          }
        } else {
          stack = line;
        }
        return stack;
      });
      if (stackLines) {
        for (let index = 0; index < stackLines.length; index += 1) {
          if (isInlineScript(stackMatch) && documentURL === stackLines[index]) {
            return true;
          }
          if (isInjectedScript(stackMatch) && stackLines[index].startsWith(INJECTED_SCRIPT_STRING)) {
            return true;
          }
        }
      }
      return false;
    };

    /**
     * Finds shadow-dom host (elements with shadowRoot property) in DOM of rootElement.
     *
     * @param {HTMLElement} rootElement shadow dom root
     * @returns {HTMLElement[]} shadow-dom hosts
     */
    const findHostElements = function findHostElements(rootElement) {
      const hosts = [];
      // Element.querySelectorAll() returns list of elements
      // which are defined in DOM of Element.
      // Meanwhile, inner DOM of the element with shadowRoot property
      // is absolutely another DOM and which can not be reached by querySelectorAll('*')
      const domElems = rootElement.querySelectorAll('*');
      domElems.forEach(function (el) {
        if (el.shadowRoot) {
          hosts.push(el);
        }
      });
      return hosts;
    };

    /**
     * A collection of nodes.
     *
     * @external NodeList
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/NodeList NodeList}
     */

    /**
     * @typedef {Object} PierceData
     * @property {HTMLElement[]} targets found elements that match the specified selector
     * @property {HTMLElement[]} innerHosts inner shadow-dom hosts
     */

    /**
     * Pierces open shadow-dom in order to find:
     * - elements by 'selector' matching
     * - inner shadow-dom hosts
     *
     * @param {string} selector DOM elements selector
     * @param {HTMLElement[]|external:NodeList} hostElements shadow-dom hosts
     * @returns {PierceData} object with found elements and shadow-dom hosts
     */
    const pierceShadowDom = function pierceShadowDom(selector, hostElements) {
      let targets = [];
      const innerHostsAcc = [];

      // it's possible to get a few hostElements found by baseSelector on the page
      hostElements.forEach(function (host) {
        // check presence of selector element inside base element if it's not in shadow-dom
        const simpleElems = host.querySelectorAll(selector);
        targets = targets.concat([].slice.call(simpleElems));
        const shadowRootElem = host.shadowRoot;
        const shadowChildren = shadowRootElem.querySelectorAll(selector);
        targets = targets.concat([].slice.call(shadowChildren));

        // find inner shadow-dom hosts inside processing shadow-dom
        innerHostsAcc.push(findHostElements(shadowRootElem));
      });

      // if there were more than one host element,
      // innerHostsAcc is an array of arrays and should be flatten
      const innerHosts = flatten(innerHostsAcc);
      return {
        targets,
        innerHosts
      };
    };

    /**
     * Checks whether the passed arg is proper callback
     *
     * @param {any} callback arbitrary callback
     * @returns {boolean} if callback is valid
     */
    const isValidCallback = function isValidCallback(callback) {
      return callback instanceof Function
      // passing string as 'code' arg is not recommended
      // but it is possible and not restricted
      // https://developer.mozilla.org/en-US/docs/Web/API/setTimeout#parameters
      || typeof callback === 'string';
    };

    /**
     * Parses delay argument of setTimeout / setInterval methods into
     * rounded down number for number/string values or passes on for other types.
     * Needed for prevent-setTimeout and prevent-setInterval
     *
     * @param {any} delay native method delay arg
     * @returns {any} number as parsed delay or any input type if `delay` is not parsable
     */
    const parseRawDelay = function parseRawDelay(delay) {
      const parsedDelay = Math.floor(parseInt(delay, 10));
      return typeof parsedDelay === 'number' && !nativeIsNaN(parsedDelay) ? parsedDelay : delay;
    };

    /**
     * Checks whether 'callback' and 'delay' are matching
     * by given parameters 'matchCallback' and 'matchDelay'.
     * Used for prevent-setTimeout and prevent-setInterval.
     *
     * @param {Object} preventData set of data to determine if scriptlet should match
     * @param {Function} preventData.callback method's callback arg
     * @param {any} preventData.delay method's delay arg
     * @param {string} preventData.matchCallback scriptlets's callback arg
     * @param {string} preventData.matchDelay scriptlets's delay arg
     * @returns {boolean} if scriptlet should match
     */
    const isPreventionNeeded = function isPreventionNeeded(_ref) {
      let callback = _ref.callback,
        delay = _ref.delay,
        matchCallback = _ref.matchCallback,
        matchDelay = _ref.matchDelay;
      // if callback is has not valid type
      // scriptlet can not prevent it
      // so no need for more checking and do not call hit() later
      if (!isValidCallback(callback)) {
        return false;
      }
      if (!isValidMatchStr(matchCallback) || matchDelay && !isValidMatchNumber(matchDelay)) {
        return false;
      }
      const _parseMatchArg = parseMatchArg(matchCallback),
        isInvertedMatch = _parseMatchArg.isInvertedMatch,
        matchRegexp = _parseMatchArg.matchRegexp;
      const _parseDelayArg = parseDelayArg(matchDelay),
        isInvertedDelayMatch = _parseDelayArg.isInvertedDelayMatch,
        delayMatch = _parseDelayArg.delayMatch;

      // Parse delay for decimal, string and non-number values
      // https://github.com/AdguardTeam/Scriptlets/issues/247
      const parsedDelay = parseRawDelay(delay);
      let shouldPrevent = false;
      // https://github.com/AdguardTeam/Scriptlets/issues/105
      const callbackStr = String(callback);
      if (delayMatch === null) {
        shouldPrevent = matchRegexp.test(callbackStr) !== isInvertedMatch;
      } else if (!matchCallback) {
        shouldPrevent = parsedDelay === delayMatch !== isInvertedDelayMatch;
      } else {
        shouldPrevent = matchRegexp.test(callbackStr) !== isInvertedMatch && parsedDelay === delayMatch !== isInvertedDelayMatch;
      }
      return shouldPrevent;
    };

    const handleOldReplacement = function handleOldReplacement(replacement) {
      let result;
      // defaults to return noopFunc instead of window.open
      if (!replacement) {
        result = noopFunc;
      } else if (replacement === 'trueFunc') {
        result = trueFunc;
      } else if (replacement.includes('=')) {
        // We should return noopFunc instead of window.open
        // but with some property if website checks it (examples 5, 6)
        // https://github.com/AdguardTeam/Scriptlets/issues/71
        const isProp = replacement.startsWith('{') && replacement.endsWith('}');
        if (isProp) {
          const propertyPart = replacement.slice(1, -1);
          const propertyName = substringBefore(propertyPart, '=');
          const propertyValue = substringAfter$1(propertyPart, '=');
          if (propertyValue === 'noopFunc') {
            result = {};
            result[propertyName] = noopFunc;
          }
        }
      }
      return result;
    };
    const createDecoy = function createDecoy(args) {
      const OBJECT_TAG_NAME = 'object';
      const OBJECT_URL_PROP_NAME = 'data';
      const IFRAME_TAG_NAME = 'iframe';
      const IFRAME_URL_PROP_NAME = 'src';
      const replacement = args.replacement,
        url = args.url,
        delay = args.delay;
      let tag;
      let urlProp;
      if (replacement === 'obj') {
        tag = OBJECT_TAG_NAME;
        urlProp = OBJECT_URL_PROP_NAME;
      } else {
        tag = IFRAME_TAG_NAME;
        urlProp = IFRAME_URL_PROP_NAME;
      }
      const decoy = document.createElement(tag);
      decoy[urlProp] = url;
      decoy.style.setProperty('height', '1px', 'important');
      decoy.style.setProperty('position', 'fixed', 'important');
      decoy.style.setProperty('top', '-1px', 'important');
      decoy.style.setProperty('width', '1px', 'important');
      document.body.appendChild(decoy);
      setTimeout(function () {
        return decoy.remove();
      }, delay * 1000);
      return decoy;
    };
    const getPreventGetter = function getPreventGetter(nativeGetter) {
      const preventGetter = function preventGetter(target, prop) {
        if (prop && prop === 'closed') {
          return false;
        }
        if (typeof nativeGetter === 'function') {
          return noopFunc;
        }
        return prop && target[prop];
      };
      return preventGetter;
    };

    /* eslint-disable no-console, no-underscore-dangle */

    /**
     * Hit used only for debug purposes now
     *
     * @param {Object} source scriptlet properties
     * use LOG_MARKER = 'log: ' at the start of a message
     * for logging scriptlets
     */
    const hit = function hit(source) {
      if (source.verbose !== true) {
        return;
      }
      try {
        const log = console.log.bind(console);
        const trace = console.trace.bind(console);
        let prefix = source.ruleText || '';
        if (source.domainName) {
          const AG_SCRIPTLET_MARKER = '#%#//';
          const UBO_SCRIPTLET_MARKER = '##+js';
          let ruleStartIndex;
          if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
            ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
          } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
            ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
          }
          // delete all domains from ruleText and leave just rule part
          const rulePart = source.ruleText.slice(ruleStartIndex);
          // prepare applied scriptlet rule for specific domain
          prefix = "".concat(source.domainName).concat(rulePart);
        }
        log("".concat(prefix, " trace start"));
        if (trace) {
          trace();
        }
        log("".concat(prefix, " trace end"));
      } catch (e) {
        // try catch for Edge 15
        // In according to this issue https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/14495220/
        // console.log throws an error
      }

      // This is necessary for unit-tests only!
      if (typeof window.__debug === 'function') {
        window.__debug(source);
      }
    };

    /**
     * @typedef ChainInfo
     * @property {Object} base current chain base
     * @property {string} prop current chain prop
     * @property {string} [chain] string representation
     */

    /**
     * Check if the property exists in the base object (recursively).
     * Similar to getPropertyInChain but upgraded for json-prune:
     * handle wildcard properties and does not define nonexistent base property as 'undefined'
     *
     * @param {Object} base object that owns chain
     * @param {string} chain chain of owner properties
     * @param {boolean} [lookThrough=false]
     * should the method look through it's props in order to wildcard
     * @param {Array} [output=[]] result acc
     * @returns {ChainInfo[]} array of objects
     */
    function getWildcardPropertyInChain(base, chain) {
      let lookThrough = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
      let output = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [];
      const pos = chain.indexOf('.');
      if (pos === -1) {
        // for paths like 'a.b.*' every final nested prop should be processed
        if (chain === '*' || chain === '[]') {
          // eslint-disable-next-line no-restricted-syntax
          for (const key in base) {
            // to process each key in base except inherited ones
            if (Object.prototype.hasOwnProperty.call(base, key)) {
              output.push({
                base,
                prop: key
              });
            }
          }
        } else {
          output.push({
            base,
            prop: chain
          });
        }
        return output;
      }
      const prop = chain.slice(0, pos);
      const shouldLookThrough = prop === '[]' && Array.isArray(base) || prop === '*' && base instanceof Object;
      if (shouldLookThrough) {
        const nextProp = chain.slice(pos + 1);
        const baseKeys = Object.keys(base);

        // if there is a wildcard prop in input chain (e.g. 'ad.*.src' for 'ad.0.src ad.1.src'),
        // each one of base keys should be considered as a potential chain prop in final path
        baseKeys.forEach(function (key) {
          const item = base[key];
          getWildcardPropertyInChain(item, nextProp, lookThrough, output);
        });
      }
      const nextBase = base[prop];
      chain = chain.slice(pos + 1);
      if (nextBase !== undefined) {
        getWildcardPropertyInChain(nextBase, chain, lookThrough, output);
      }
      return output;
    }

    /**
     * Conditionally logs message to console.
     * Convention is to log messages by source.verbose if such log
     * is not a part of scriptlet's functionality, eg on invalid input,
     * and use 'forced' argument otherwise.
     *
     * @param {Object} source required, scriptlet properties
     * @param {any} message required, message to log
     * @param {boolean} [forced=false] to log message unconditionally
     * @param {boolean} [convertMessageToString=true] to convert message to string
     */
    const logMessage = function logMessage(source, message) {
      let forced = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
      let convertMessageToString = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
      const name = source.name,
        verbose = source.verbose;
      if (!forced && !verbose) {
        return;
      }

      // eslint-disable-next-line no-console
      const nativeConsole = console.log;
      if (!convertMessageToString) {
        // Template literals convert object to string,
        // so 'message' should not be passed to template literals
        // as it will not be logged correctly
        nativeConsole("".concat(name, ":"), message);
        return;
      }
      nativeConsole("".concat(name, ": ").concat(message));
    };

    /**
     * Checks if prunning is required
     *
     * @param {Object} source required, scriptlet properties
     * @param {Object} root object which should be pruned or logged
     * @param {Array} prunePaths array with string of space-separated properties to remove
     * @param {Array} requiredPaths array with string of space-separated properties
     * which must be all present for the pruning to occur
     * @returns {boolean|undefined} true if prunning is required
     */
    function isPruningNeeded(source, root, prunePaths, requiredPaths) {
      if (!root) {
        return false;
      }
      let shouldProcess;

      // Only log hostname and matched JSON payload if only second argument is present
      if (prunePaths.length === 0 && requiredPaths.length > 0) {
        const rootString = JSON.stringify(root);
        const matchRegex = toRegExp(requiredPaths.join(''));
        const shouldLog = matchRegex.test(rootString);
        if (shouldLog) {
          logMessage(source, "".concat(window.location.hostname, "\n").concat(JSON.stringify(root, null, 2)), true);
          if (root && typeof root === 'object') {
            logMessage(source, root, true, false);
          }
          shouldProcess = false;
          return shouldProcess;
        }
      }
      const wildcardSymbols = ['.*.', '*.', '.*', '.[].', '[].', '.[]'];
      for (let i = 0; i < requiredPaths.length; i += 1) {
        const requiredPath = requiredPaths[i];
        const lastNestedPropName = requiredPath.split('.').pop();
        const hasWildcard = wildcardSymbols.some(function (symbol) {
          return requiredPath.includes(symbol);
        });

        // if the path has wildcard, getPropertyInChain should 'look through' chain props
        const details = getWildcardPropertyInChain(root, requiredPath, hasWildcard);

        // start value of 'shouldProcess' due to checking below
        shouldProcess = !hasWildcard;
        for (let i = 0; i < details.length; i += 1) {
          if (hasWildcard) {
            // if there is a wildcard,
            // at least one (||) of props chain should be present in object
            shouldProcess = !(details[i].base[lastNestedPropName] === undefined) || shouldProcess;
          } else {
            // otherwise each one (&&) of them should be there
            shouldProcess = !(details[i].base[lastNestedPropName] === undefined) && shouldProcess;
          }
        }
      }
      return shouldProcess;
    }

    /**
     * Prunes properties of 'root' object
     *
     * @param {Object} source required, scriptlet properties
     * @param {Object} root object which should be pruned or logged
     * @param {Array} prunePaths array with string of space-separated properties to remove
     * @param {Array} requiredPaths array with string of space-separated properties
     * which must be all present for the pruning to occur
     * @returns {Object} pruned root
     */
    const jsonPruner = function jsonPruner(source, root, prunePaths, requiredPaths) {
      if (prunePaths.length === 0 && requiredPaths.length === 0) {
        logMessage(source, "".concat(window.location.hostname, "\n").concat(JSON.stringify(root, null, 2)), true);
        if (root && typeof root === 'object') {
          logMessage(source, root, true, false);
        }
        return root;
      }
      try {
        if (isPruningNeeded(source, root, prunePaths, requiredPaths) === false) {
          return root;
        }

        // if pruning is needed, we check every input pathToRemove
        // and delete it if root has it
        prunePaths.forEach(function (path) {
          const ownerObjArr = getWildcardPropertyInChain(root, path, true);
          ownerObjArr.forEach(function (ownerObj) {
            if (ownerObj !== undefined && ownerObj.base) {
              delete ownerObj.base[ownerObj.prop];
              hit(source);
            }
          });
        });
      } catch (e) {
        logMessage(source, e);
      }
      return root;
    };

    const getNativeRegexpTest = function getNativeRegexpTest() {
      return Object.getOwnPropertyDescriptor(RegExp.prototype, 'test').value;
    };

    /**
     * Modifies original response with the given replacement data.
     *
     * @param {Response} origResponse Original response.
     * @param {Object} replacement Replacement data for response with possible keys:
     * - `body`: optional, string, default to '{}';
     * - `type`: optional, string, original response type is used if not specified.
     *
     * @returns {Response} Modified response.
     */
    const modifyResponse = function modifyResponse(origResponse) {
      var _origResponse$headers;
      let replacement = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {
        body: '{}'
      };
      const headers = {};
      origResponse === null || origResponse === void 0 ? void 0 : (_origResponse$headers = origResponse.headers) === null || _origResponse$headers === void 0 ? void 0 : _origResponse$headers.forEach(function (value, key) {
        headers[key] = value;
      });
      const modifiedResponse = new Response(replacement.body, {
        status: origResponse.status,
        statusText: origResponse.statusText,
        headers
      });

      // Mock response url and type to avoid adblocker detection
      // https://github.com/AdguardTeam/Scriptlets/issues/216
      Object.defineProperties(modifiedResponse, {
        url: {
          value: origResponse.url
        },
        type: {
          value: replacement.type || origResponse.type
        }
      });
      return modifiedResponse;
    };

    /**
     * Returns array of request props that are supported by fetch/xhr scriptlets.
     * Includes common 'url' and 'method' props and all other fetch-specific props
     *
     * @returns {string[]} list of request props
     */
    const getRequestProps = function getRequestProps() {
      return ['url', 'method', 'headers', 'body', 'mode', 'credentials', 'cache', 'redirect', 'referrer', 'referrerPolicy', 'integrity', 'keepalive', 'signal'];
    };

    /**
     * Collects Request options to object
     *
     * @param {Request} request Request instance to collect properties from
     * @returns {Object} data object
     */
    const getRequestData = function getRequestData(request) {
      const requestInitOptions = getRequestProps();
      const entries = requestInitOptions.map(function (key) {
        // if request has no such option, value will be undefined
        const value = request[key];
        return [key, value];
      });
      return Object.fromEntries(entries);
    };

    /**
     * Collects fetch args to object
     *
     * @param {any} args fetch args
     * @returns {Object} data object
     */
    const getFetchData = function getFetchData(args) {
      const fetchPropsObj = {};
      let fetchUrl;
      let fetchInit;
      if (args[0] instanceof Request) {
        // if Request passed to fetch, it will be in array
        const requestData = getRequestData(args[0]);
        fetchUrl = requestData.url;
        fetchInit = requestData;
      } else {
        fetchUrl = args[0]; // eslint-disable-line prefer-destructuring
        fetchInit = args[1]; // eslint-disable-line prefer-destructuring
      }

      fetchPropsObj.url = fetchUrl;
      if (fetchInit instanceof Object) {
        Object.keys(fetchInit).forEach(function (prop) {
          fetchPropsObj[prop] = fetchInit[prop];
        });
      }
      return fetchPropsObj;
    };

    /**
     * Collect xhr.open arguments to object
     *
     * @param {string} method request method
     * @param {string} url request url
     * @param {string} async request async prop
     * @param {string} user request user prop
     * @param {string} password request password prop
     * @returns {Object} aggregated request data
     */
    const getXhrData = function getXhrData(method, url, async, user, password) {
      return {
        method,
        url,
        async,
        user,
        password
      };
    };

    /**
     * Parse propsToMatch input string into object;
     * used for prevent-fetch and prevent-xhr
     *
     * @param {string} propsToMatchStr string of space-separated request properties to match
     * @returns {Object} object where 'key' is prop name and 'value' is prop value
     */
    const parseMatchProps = function parseMatchProps(propsToMatchStr) {
      const PROPS_DIVIDER = ' ';
      const PAIRS_MARKER = ':';
      const LEGAL_MATCH_PROPS = getRequestProps();
      const propsObj = {};
      const props = propsToMatchStr.split(PROPS_DIVIDER);
      props.forEach(function (prop) {
        const dividerInd = prop.indexOf(PAIRS_MARKER);
        const key = prop.slice(0, dividerInd);
        const hasLegalMatchProp = LEGAL_MATCH_PROPS.includes(key);
        if (hasLegalMatchProp) {
          const value = prop.slice(dividerInd + 1);
          propsObj[key] = value;
        } else {
          // Escape multiple colons in prop
          // i.e regex value and/or url with protocol specified, with or without 'url:' match prop
          // https://github.com/AdguardTeam/Scriptlets/issues/216#issuecomment-1178591463
          propsObj.url = prop;
        }
      });
      return propsObj;
    };

    /**
     * Validates parsed data values
     *
     * @param {Object} data request data
     * @returns {boolean} if data is valid
     */
    const validateParsedData = function validateParsedData(data) {
      return Object.values(data).every(function (value) {
        return isValidStrPattern(value);
      });
    };

    /**
     * Converts valid parsed data to data obj for further matching
     *
     * @param {Object} data parsed request data
     * @returns {Object} data obj ready for matching
     */
    const getMatchPropsData = function getMatchPropsData(data) {
      const matchData = {};
      Object.keys(data).forEach(function (key) {
        matchData[key] = toRegExp(data[key]);
      });
      return matchData;
    };

    /**
     * Sets item to a specified storage, if storage isn't full.
     *
     * @param {Object} source scriptlet's configuration
     * @param {Storage} storage storage instance to set item into
     * @param {string} key storage key
     * @param {string} value staroge value
     */
    const setStorageItem = function setStorageItem(source, storage, key, value) {
      // setItem() may throw an exception if the storage is full.
      try {
        storage.setItem(key, value);
      } catch (e) {
        const message = "Unable to set sessionStorage item due to: ".concat(e.message);
        logMessage(source, message);
      }
    };

    /**
     * Gets supported storage item value
     *
     * @param {string} value input item value
     * @returns {string|null|undefined|boolean} valid item value if ok OR null if not
     */
    const getLimitedStorageItemValue = function getLimitedStorageItemValue(value) {
      if (typeof value !== 'string') {
        throw new Error('Invalid value');
      }
      let validValue;
      if (value === 'undefined') {
        validValue = undefined;
      } else if (value === 'false') {
        validValue = false;
      } else if (value === 'true') {
        validValue = true;
      } else if (value === 'null') {
        validValue = null;
      } else if (value === 'emptyArr') {
        validValue = '[]';
      } else if (value === 'emptyObj') {
        validValue = '{}';
      } else if (value === '') {
        validValue = '';
      } else if (/^\d+$/.test(value)) {
        validValue = parseFloat(value);
        if (nativeIsNaN(validValue)) {
          throw new Error('Invalid value');
        }
        if (Math.abs(validValue) > 32767) {
          throw new Error('Invalid value');
        }
      } else if (value === 'yes') {
        validValue = 'yes';
      } else if (value === 'no') {
        validValue = 'no';
      } else {
        throw new Error('Invalid value');
      }
      return validValue;
    };

    /**
     * Generates function which silents global errors on page generated by scriptlet
     * If error doesn't belong to our error we transfer it to the native onError handler
     *
     * @param {string} rid - unique identifier of scriptlet
     * @returns {Function} window.onerror handler
     */
    function createOnErrorHandler(rid) {
      // eslint-disable-next-line consistent-return
      const nativeOnError = window.onerror;
      return function onError(error) {
        if (typeof error === 'string' && error.includes(rid)) {
          return true;
        }
        if (nativeOnError instanceof Function) {
          for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
            args[_key - 1] = arguments[_key];
          }
          return nativeOnError.apply(this, [error, ...args]);
        }
        return false;
      };
    }

    /**
     * Generate random seven symbols id
     *
     * @returns {string} randomized id
     */
    function randomId() {
      return Math.random().toString(36).slice(2, 9);
    }

    /**
     * Prevents infinite loops when trapping props that could be used by scriptlet's own helpers
     * Example: window.RegExp, that is used by matchStackTrace > toRegExp
     *
     * https://github.com/AdguardTeam/Scriptlets/issues/251
     * https://github.com/AdguardTeam/Scriptlets/issues/226
     * https://github.com/AdguardTeam/Scriptlets/issues/232
     *
     * @returns {Object} descriptor addon
     */
    function getDescriptorAddon() {
      return {
        isAbortingSuspended: false,
        isolateCallback(cb) {
          this.isAbortingSuspended = true;
          // try...catch is required in case there are more than one inline scripts
          // which should be aborted,
          // so after the first successful abortion, `cb(...args);` will throw error,
          // and we should not stop on that and continue to abort other scripts
          try {
            for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
              args[_key - 1] = arguments[_key];
            }
            const result = cb(...args);
            this.isAbortingSuspended = false;
            return result;
          } catch (_unused) {
            const rid = randomId();
            this.isAbortingSuspended = false;
            // It's necessary to throw error
            // otherwise script will be not aborted
            throw new ReferenceError(rid);
          }
        }
      };
    }

    /**
     * @typedef ChainInfo
     * @property {Object} base current chain base
     * @property {string} prop current chain prop
     * @property {string} [chain] string representation
     */

    /**
     * Check if the property exists in the base object (recursively)
     *
     * If property doesn't exist in base object,
     * defines this property as 'undefined'
     * and returns base, property name and remaining part of property chain
     *
     * @param {Object} base object that owns chain
     * @param {string} chain chain of owner properties
     * @returns {ChainInfo} chain info object
     */
    function getPropertyInChain(base, chain) {
      const pos = chain.indexOf('.');
      if (pos === -1) {
        return {
          base,
          prop: chain
        };
      }
      const prop = chain.slice(0, pos);

      // https://github.com/AdguardTeam/Scriptlets/issues/128
      if (base === null) {
        // if base is null, return 'null' as base.
        // it's needed for triggering the reason logging while debugging
        return {
          base,
          prop,
          chain
        };
      }
      const nextBase = base[prop];
      chain = chain.slice(pos + 1);
      if ((base instanceof Object || typeof base === 'object') && isEmptyObject(base)) {
        // for empty objects in chain
        return {
          base,
          prop,
          chain
        };
      }
      if (nextBase === null) {
        return {
          base,
          prop,
          chain
        };
      }
      if (nextBase !== undefined) {
        return getPropertyInChain(nextBase, chain);
      }
      Object.defineProperty(base, prop, {
        configurable: true
      });
      return {
        base,
        prop,
        chain
      };
    }

    /**
     * Checks if given propsToMatch string matches with given request data
     * This is used by prevent-xhr, prevent-fetch, trusted-replace-xhr-response
     * and  trusted-replace-fetch-response scriptlets
     *
     * @param {Object} source scriptlet properties
     * @param {string} propsToMatch string of space-separated request properties to match
     * @param {Object} requestData object with standard properties of fetch/xhr like url, method etc
     * @returns {boolean} if request properties match
     */
    const matchRequestProps = function matchRequestProps(source, propsToMatch, requestData) {
      if (propsToMatch === '' || propsToMatch === '*') {
        return true;
      }
      let isMatched;
      const parsedData = parseMatchProps(propsToMatch);
      if (!validateParsedData(parsedData)) {
        logMessage(source, "Invalid parameter: ".concat(propsToMatch));
        isMatched = false;
      } else {
        const matchData = getMatchPropsData(parsedData);
        // prevent only if all props match
        isMatched = Object.keys(matchData).every(function (matchKey) {
          const matchValue = matchData[matchKey];
          return Object.prototype.hasOwnProperty.call(requestData, matchKey) && matchValue.test(requestData[matchKey]);
        });
      }
      return isMatched;
    };

    /**
     * Checks if the stackTrace contains stackRegexp
     * https://github.com/AdguardTeam/Scriptlets/issues/82
     *
     * @param {string|undefined} stackMatch - input stack value to match
     * @param {string} stackTrace - script error stack trace
     * @returns {boolean} if the stackTrace contains stackRegexp
     */
    const matchStackTrace = function matchStackTrace(stackMatch, stackTrace) {
      if (!stackMatch || stackMatch === '') {
        return true;
      }
      if (shouldAbortInlineOrInjectedScript(stackMatch, stackTrace)) {
        return true;
      }
      const stackRegexp = toRegExp(stackMatch);
      const refinedStackTrace = stackTrace.split('\n').slice(2) // get rid of our own functions in the stack trace
      .map(function (line) {
        return line.trim();
      }) // trim the lines
      .join('\n');
      return getNativeRegexpTest().call(stackRegexp, refinedStackTrace);
    };

    /**
     * Returns a wrapper, passing the call to 'method' at maximum once per 'delay' milliseconds.
     * Those calls that fall into the "cooldown" period, are ignored
     *
     * @param {Function} cb callback
     * @param {number} delay - milliseconds
     * @returns {Function} throttled callback
     */
    const throttle = function throttle(cb, delay) {
      let wait = false;
      let savedArgs;
      const wrapper = function wrapper() {
        for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }
        if (wait) {
          savedArgs = args;
          return;
        }
        cb(...args);
        wait = true;
        setTimeout(function () {
          wait = false;
          if (savedArgs) {
            // "savedArgs" might contains few arguments, so it's necessary to use spread operator
            // https://github.com/AdguardTeam/Scriptlets/issues/284#issuecomment-1419464354
            wrapper(...savedArgs);
            savedArgs = null;
          }
        }, delay);
      };
      return wrapper;
    };

    /**
     * DOM tree changes observer. Used for 'remove-attr' and 'remove-class' scriptlets
     *
     * @param {Function} callback function to call on each mutation
     * @param {boolean} [observeAttrs] if observer should observe attributes changes
     * @param {Array} [attrsToObserve] list of attributes to observe
     */
    const observeDOMChanges = function observeDOMChanges(callback) {
      let observeAttrs = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      let attrsToObserve = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
      /**
       * 'delay' in milliseconds for 'throttle' method
       */
      const THROTTLE_DELAY_MS = 20;
      /**
       * Used for remove-class
       */
      // eslint-disable-next-line no-use-before-define
      const observer = new MutationObserver(throttle(callbackWrapper, THROTTLE_DELAY_MS));
      const connect = function connect() {
        if (attrsToObserve.length > 0) {
          observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: observeAttrs,
            attributeFilter: attrsToObserve
          });
        } else {
          observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: observeAttrs
          });
        }
      };
      const disconnect = function disconnect() {
        observer.disconnect();
      };

      /**
       * Callback wrapper to prevent loops
       * when callback tinkers with attributes
       */
      function callbackWrapper() {
        disconnect();
        callback();
        connect();
      }
      connect();
    };

    /**
     * Returns the list of added nodes from the list of mutations
     *
     * @param {MutationRecord[]} mutations list of mutations
     * @returns {Node[]} list of added nodes
     */
    const getAddedNodes = function getAddedNodes(mutations) {
      const nodes = [];
      for (let i = 0; i < mutations.length; i += 1) {
        const addedNodes = mutations[i].addedNodes;
        for (let j = 0; j < addedNodes.length; j += 1) {
          nodes.push(addedNodes[j]);
        }
      }
      return nodes;
    };

    /**
     * Creates and runs a MutationObserver on the document element with optional
     * throttling and disconnect timeout.
     *
     * @param {Function} callback MutationObserver callback
     * @param {Object} options MutationObserver options
     * @param {number|null} timeout Disconnect timeout in ms
     */
    const observeDocumentWithTimeout = function observeDocumentWithTimeout(callback, options) {
      let timeout = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 10000;
      const observer = new MutationObserver(function (mutations, observer) {
        observer.disconnect();
        callback(mutations);
        observer.observe(document.documentElement, options);
      });
      observer.observe(document.documentElement, options);
      if (typeof timeout === 'number') {
        setTimeout(function () {
          return observer.disconnect();
        }, timeout);
      }
    };

    /**
     * @typedef {Object} FlagsData object that holds info about valid flags
     * and provides method for easy access
     * @property {string} ASAP asap flag string
     * @property {string} COMPLETE complete flag string
     * @property {string} STAY stay flag string
     * @property {Function} hasFlag to check if given flag is present
     */

    /**
     * Behaviour flags string parser
     *
     * @param {string} flags required, 'applying' argument string
     * @returns {FlagsData} object with parsed flags
     */
    const parseFlags = function parseFlags(flags) {
      const FLAGS_DIVIDER = ' ';
      const ASAP_FLAG = 'asap';
      const COMPLETE_FLAG = 'complete';
      const STAY_FLAG = 'stay';
      const VALID_FLAGS = [STAY_FLAG, ASAP_FLAG, COMPLETE_FLAG];
      const passedFlags = flags.trim().split(FLAGS_DIVIDER).filter(function (f) {
        return VALID_FLAGS.includes(f);
      });
      return {
        ASAP: ASAP_FLAG,
        COMPLETE: COMPLETE_FLAG,
        STAY: STAY_FLAG,
        hasFlag(flag) {
          return passedFlags.includes(flag);
        }
      };
    };

    /**
     * Modifies passed keyword value according to its purpose.
     * Returns initial value if it's not a keyword.
     *
     * Supported keywords:
     *   - '$now$' - returns current time in ms, e.g 1667915146503
     *   - '$currentDate$' - returns current date e.g 'Tue Nov 08 2022 13:53:19 GMT+0300'
     *
     * @param {string} rawValue keyword
     * @returns {string} parsed value
     */
    const parseKeywordValue = function parseKeywordValue(rawValue) {
      const NOW_VALUE_KEYWORD = '$now$';
      const CURRENT_DATE_KEYWORD = '$currentDate$';
      let parsedValue = rawValue;
      if (rawValue === NOW_VALUE_KEYWORD) {
        // Set to current time in ms, e.g 1667915146503
        parsedValue = Date.now().toString();
      } else if (rawValue === CURRENT_DATE_KEYWORD) {
        // Set to current date e.g 'Tue Nov 08 2022 13:53:19 GMT+0300'
        parsedValue = Date();
      }
      return parsedValue;
    };

    /**
     * Makes arbitrary operations on shadow root element,
     * to be passed as callback to hijackAttachShadow
     *
     * @callback attachShadowCallback
     * @param {HTMLElement} shadowRoot
     * @returns {void}
     */

    /**
     * Overrides attachShadow method of Element API on a given context
     * to pass retrieved shadowRoots to callback
     *
     * @param {Object} context e.g global window object or contentWindow of an iframe
     * @param {string} hostSelector selector to determine if callback should be called on current shadow subtree
     * @param {attachShadowCallback} callback callback to call on shadow root
     */
    const hijackAttachShadow = function hijackAttachShadow(context, hostSelector, callback) {
      const handlerWrapper = function handlerWrapper(target, thisArg, args) {
        const shadowRoot = Reflect.apply(target, thisArg, args);
        if (thisArg && thisArg.matches(hostSelector || '*')) {
          callback(shadowRoot);
        }
        return shadowRoot;
      };
      const attachShadowHandler = {
        apply: handlerWrapper
      };
      context.Element.prototype.attachShadow = new Proxy(context.Element.prototype.attachShadow, attachShadowHandler);
    };

    /**
     * Grabs existing nodes and passes them to a given handler.
     *
     * @param {string} selector CSS selector to find nodes by
     * @param {Function} handler handler to pass nodes to
     */
    const handleExistingNodes = function handleExistingNodes(selector, handler) {
      const nodeList = document.querySelectorAll(selector);
      const nodes = nodeListToArray(nodeList);
      handler(nodes);
    };

    /**
     * Extracts added nodes from mutations and passes them to a given handler.
     *
     * @param {MutationRecord[]} mutations mutations to find eligible nodes in
     * @param {Function} handler handler to pass eligible nodes to
     */
    const handleMutations = function handleMutations(mutations, handler) {
      const addedNodes = getAddedNodes(mutations);
      handler(addedNodes);
    };

    /**
     * Checks if given node's text content should be replaced
     *
     * @param {Node} node  node to check
     * @param {RegExp|string} nodeNameMatch regexp or string to match node name
     * @param {RegExp|string} textContentMatch regexp or string to match node's text content
     * @returns {boolean} true if node's text content should be replaced
     */
    const isTargetNode = function isTargetNode(node, nodeNameMatch, textContentMatch) {
      const nodeName = node.nodeName,
        textContent = node.textContent;
      const nodeNameLowerCase = nodeName.toLowerCase();
      return textContent !== '' && (nodeNameMatch instanceof RegExp ? nodeNameMatch.test(nodeNameLowerCase) : nodeNameMatch === nodeNameLowerCase) && (textContentMatch instanceof RegExp ? textContentMatch.test(textContent) : textContent.includes(textContentMatch));
    };

    /**
     * Replaces given node's text content with a given replacement.
     *
     * @param {string} source source of the scriptlet
     * @param {Node} node node to replace text content in
     * @param {RegExp|string} pattern pattern to match text content
     * @param {string} replacement replacement for matched text content
     */
    const replaceNodeText = function replaceNodeText(source, node, pattern, replacement) {
      node.textContent = node.textContent.replace(pattern, replacement);
      hit(source);
    };

    /**
     * Modifies arguments for trusted-replace-node-text and remove-node-text scriptlets
     *
     * @param {string} nodeName string or stringified regexp to match node name
     * @param {string} textMatch string or stringified regexp to match node's text content
     * @param {string} pattern string or stringified regexp to match replace pattern
     * @returns {Object} derivative params
     */
    const parseNodeTextParams = function parseNodeTextParams(nodeName, textMatch) {
      let pattern = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
      const REGEXP_START_MARKER = '/';
      const isStringNameMatch = !(nodeName.startsWith(REGEXP_START_MARKER) && nodeName.endsWith(REGEXP_START_MARKER));
      const selector = isStringNameMatch ? nodeName : '*';
      const nodeNameMatch = isStringNameMatch ? nodeName : toRegExp(nodeName);
      const textContentMatch = !textMatch.startsWith(REGEXP_START_MARKER) ? textMatch : toRegExp(textMatch);
      let patternMatch;
      if (pattern) {
        patternMatch = !pattern.startsWith(REGEXP_START_MARKER) ? pattern : toRegExp(pattern);
      }
      return {
        selector,
        nodeNameMatch,
        textContentMatch,
        patternMatch
      };
    };

    /* eslint-disable max-len */
    /**
     * @trustedScriptlet trusted-click-element
     *
     * @description
     * Clicks selected elements in a strict sequence, ordered by selectors passed,
     * and waiting for them to render in the DOM first.
     * Deactivates after all elements have been clicked or by 10s timeout.
     *
     * ### Syntax
     *
     * ```text
     * example.com#%#//scriptlet('trusted-click-element', selectors[, extraMatch[, delay]])
     * ```
     *
     * - `selectors` — required, string with query selectors delimited by comma
     * - `extraMatch` — optional, extra condition to check on a page; allows to match `cookie` and `localStorage`;
     * can be set as `name:key[=value]` where `value` is optional.
     * If `cookie`/`localStorage` starts with `!` then the element will only be clicked
     * if specified cookie/localStorage item does not exist.
     * Multiple conditions are allowed inside one `extraMatch` but they should be delimited by comma
     * and each of them should match the syntax. Possible `name`s:
     *     - `cookie` — test string or regex against cookies on a page
     *     - `localStorage` — check if localStorage item is present
     * - `delay` — optional, time in ms to delay scriptlet execution, defaults to instant execution.
     *
     * ### Examples
     *
     * 1. Click single element by selector
     *
     *     ```adblock
     *     example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"]')
     *     ```
     *
     * 1. Delay click execution by 500ms
     *
     *     ```adblock
     *     example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"]', '', '500')
     *     ```
     *
     * 1. Click multiple elements by selector with a delay
     *
     *     <!-- markdownlint-disable line-length -->
     *
     *     ```adblock
     *     example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"], button[name="check"], input[type="submit"][value="akkoord"]', '', '500')
     *     ```
     *
     * 1. Match cookies by keys using regex and string
     *
     *     ```adblock
     *     example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"]', 'cookie:userConsentCommunity, cookie:/cmpconsent|cmp/')
     *     ```
     *
     * 1. Match by cookie key=value pairs using regex and string
     *
     *     ```adblock
     *     example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"]', 'cookie:userConsentCommunity=true, cookie:/cmpconsent|cmp/=/[a-z]{1,5}/')
     *     ```
     *
     * 1. Match by localStorage item 'promo' key
     *
     *     ```adblock
     *     example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"]', 'localStorage:promo')
     *     ```
     *
     * 1. Click multiple elements with delay and matching by both cookie string and localStorage item
     *
     *     ```adblock
     *     example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"], input[type="submit"][value="akkoord"]', 'cookie:cmpconsent, localStorage:promo', '250')
     *     ```
     *
     *     <!-- markdownlint-enable line-length -->
     *
     * 1. Click element only if cookie with name `cmpconsent` does not exist
     *
     *     ```adblock
     *     example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"]', '!cookie:cmpconsent')
     *     ```
     *
     * 1. Click element only if specified cookie string and localStorage item does not exist
     *
     *     ```adblock
     *     example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"]', '!cookie:consent, !localStorage:promo')
     *     ```
     *
     * @added v1.7.3.
     */
    /* eslint-enable max-len */
    function trustedClickElement$1(source, selectors) {
      let extraMatch = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';
      let delay = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : NaN;
      if (!selectors) {
        return;
      }
      const OBSERVER_TIMEOUT_MS = 10000;
      const THROTTLE_DELAY_MS = 20;
      const STATIC_CLICK_DELAY_MS = 150;
      const COOKIE_MATCH_MARKER = 'cookie:';
      const LOCAL_STORAGE_MATCH_MARKER = 'localStorage:';
      const SELECTORS_DELIMITER = ',';
      const COOKIE_STRING_DELIMITER = ';';
      // Regex to split match pairs by commas, avoiding the ones included in regexes
      const EXTRA_MATCH_DELIMITER = /(,\s*){1}(?=!?cookie:|!?localStorage:)/;
      const sleep = function sleep(delayMs) {
        return new Promise(function (resolve) {
          return setTimeout(resolve, delayMs);
        });
      };
      let parsedDelay;
      if (delay) {
        parsedDelay = parseInt(delay, 10);
        const isValidDelay = !Number.isNaN(parsedDelay) || parsedDelay < OBSERVER_TIMEOUT_MS;
        if (!isValidDelay) {
          // eslint-disable-next-line max-len
          const message = "Passed delay '".concat(delay, "' is invalid or bigger than ").concat(OBSERVER_TIMEOUT_MS, " ms");
          logMessage(source, message);
          return;
        }
      }
      let canClick = !parsedDelay;
      const cookieMatches = [];
      const localStorageMatches = [];
      let isInvertedMatchCookie = false;
      let isInvertedMatchLocalStorage = false;
      if (extraMatch) {
        // Get all match marker:value pairs from argument
        const parsedExtraMatch = extraMatch.split(EXTRA_MATCH_DELIMITER).map(function (matchStr) {
          return matchStr.trim();
        });

        // Filter match pairs by marker
        parsedExtraMatch.forEach(function (matchStr) {
          if (matchStr.includes(COOKIE_MATCH_MARKER)) {
            const _parseMatchArg = parseMatchArg(matchStr),
              isInvertedMatch = _parseMatchArg.isInvertedMatch,
              matchValue = _parseMatchArg.matchValue;
            isInvertedMatchCookie = isInvertedMatch;
            const cookieMatch = matchValue.replace(COOKIE_MATCH_MARKER, '');
            cookieMatches.push(cookieMatch);
          }
          if (matchStr.includes(LOCAL_STORAGE_MATCH_MARKER)) {
            const _parseMatchArg2 = parseMatchArg(matchStr),
              isInvertedMatch = _parseMatchArg2.isInvertedMatch,
              matchValue = _parseMatchArg2.matchValue;
            isInvertedMatchLocalStorage = isInvertedMatch;
            const localStorageMatch = matchValue.replace(LOCAL_STORAGE_MATCH_MARKER, '');
            localStorageMatches.push(localStorageMatch);
          }
        });
      }
      if (cookieMatches.length > 0) {
        const parsedCookieMatches = parseCookieString(cookieMatches.join(COOKIE_STRING_DELIMITER));
        const parsedCookies = parseCookieString(document.cookie);
        const cookieKeys = Object.keys(parsedCookies);
        if (cookieKeys.length === 0) {
          return;
        }
        const cookiesMatched = Object.keys(parsedCookieMatches).every(function (key) {
          // Avoid getting /.?/ result from toRegExp on undefined
          // as cookie may be set without value,
          // on which cookie parsing will return cookieKey:undefined pair
          const valueMatch = parsedCookieMatches[key] ? toRegExp(parsedCookieMatches[key]) : null;
          const keyMatch = toRegExp(key);
          return cookieKeys.some(function (key) {
            const keysMatched = keyMatch.test(key);
            if (!keysMatched) {
              return false;
            }

            // Key matching is enough if cookie value match is not specified
            if (!valueMatch) {
              return true;
            }
            return valueMatch.test(parsedCookies[key]);
          });
        });
        const shouldRun = cookiesMatched !== isInvertedMatchCookie;
        if (!shouldRun) {
          return;
        }
      }
      if (localStorageMatches.length > 0) {
        const localStorageMatched = localStorageMatches.every(function (str) {
          const itemValue = window.localStorage.getItem(str);
          return itemValue || itemValue === '';
        });
        const shouldRun = localStorageMatched !== isInvertedMatchLocalStorage;
        if (!shouldRun) {
          return;
        }
      }

      /**
       * Create selectors array and swap selectors to null on finding it's element
       *
       * Selectors / nulls should not be (re)moved from array to:
       * - keep track of selectors order
       * - always know on what index corresponding element should be put
       * - prevent selectors from being queried multiple times
       */
      let selectorsSequence = selectors.split(SELECTORS_DELIMITER).map(function (selector) {
        return selector.trim();
      });
      const createElementObj = function createElementObj(element) {
        return {
          element: element || null,
          clicked: false
        };
      };
      const elementsSequence = Array(selectorsSequence.length).fill(createElementObj());

      /**
       * Go through elementsSequence from left to right, clicking on found elements
       *
       * Element should not be clicked if it is already clicked,
       * or a previous element is not found or clicked yet
       */
      const clickElementsBySequence = async function clickElementsBySequence() {
        for (let i = 0; i < elementsSequence.length; i += 1) {
          const elementObj = elementsSequence[i];
          // Add a delay between clicks to every element except the first one
          // https://github.com/AdguardTeam/Scriptlets/issues/284
          if (i >= 1) {
            await sleep(STATIC_CLICK_DELAY_MS);
          }
          // Stop clicking if that pos element is not found yet
          if (!elementObj.element) {
            break;
          }
          // Skip already clicked elements
          if (!elementObj.clicked) {
            elementObj.element.click();
            elementObj.clicked = true;
          }
        }
        const allElementsClicked = elementsSequence.every(function (elementObj) {
          return elementObj.clicked === true;
        });
        if (allElementsClicked) {
          // At this stage observer is already disconnected
          hit(source);
        }
      };
      const handleElement = function handleElement(element, i) {
        const elementObj = createElementObj(element);
        elementsSequence[i] = elementObj;
        if (canClick) {
          clickElementsBySequence();
        }
      };

      /**
       * Query all selectors from queue on each mutation
       * Each selector is swapped to null in selectorsSequence on founding corresponding element
       *
       * We start looking for elements before possible delay is over, to avoid cases
       * when delay is getting off after the last mutation took place.
       *
       */
      const findElements = function findElements(mutations, observer) {
        const fulfilledSelectors = [];
        selectorsSequence.forEach(function (selector, i) {
          if (!selector) {
            return;
          }
          const element = document.querySelector(selector);
          if (!element) {
            return;
          }
          handleElement(element, i);
          fulfilledSelectors.push(selector);
        });

        // selectorsSequence should be modified after the loop to not break loop indexation
        selectorsSequence = selectorsSequence.map(function (selector) {
          return fulfilledSelectors.includes(selector) ? null : selector;
        });

        // Disconnect observer after finding all elements
        const allSelectorsFulfilled = selectorsSequence.every(function (selector) {
          return selector === null;
        });
        if (allSelectorsFulfilled) {
          observer.disconnect();
        }
      };
      const observer = new MutationObserver(throttle(findElements, THROTTLE_DELAY_MS));
      observer.observe(document.documentElement, {
        attributes: true,
        childList: true,
        subtree: true
      });
      if (parsedDelay) {
        setTimeout(function () {
          // Click previously collected elements
          clickElementsBySequence();
          canClick = true;
        }, parsedDelay);
      }
      setTimeout(function () {
        return observer.disconnect();
      }, OBSERVER_TIMEOUT_MS);
    }
    trustedClickElement$1.names = ['trusted-click-element'
    // trusted scriptlets support no aliases
    ];

    trustedClickElement$1.injections = [hit, toRegExp, parseCookieString, throttle, logMessage, parseMatchArg];

    /* eslint-disable max-len */
    /**
     * @scriptlet abort-on-property-read
     *
     * @description
     * Aborts a script when it attempts to **read** the specified property.
     *
     * Related UBO scriptlet:
     * https://github.com/gorhill/uBlock/wiki/Resources-Library#abort-on-property-readjs-
     *
     * Related ABP source:
     * https://gitlab.com/eyeo/snippets/-/blob/main/source/behavioral/abort-on-property-read.js
     *
     * ### Syntax
     *
     * ```text
     * example.org#%#//scriptlet('abort-on-property-read', property)
     * ```
     *
     * - `property` — required, path to a property (joined with `.` if needed). The property must be attached to `window`
     *
     * ### Examples
     *
     * ```adblock
     * ! Aborts script when it tries to access `window.alert`
     * example.org#%#//scriptlet('abort-on-property-read', 'alert')
     *
     * ! Aborts script when it tries to access `navigator.language`
     * example.org#%#//scriptlet('abort-on-property-read', 'navigator.language')
     * ```
     *
     * @added v1.0.4.
     */
    /* eslint-enable max-len */
    function abortOnPropertyRead$1(source, property) {
      if (!property) {
        return;
      }
      const rid = randomId();
      const abort = function abort() {
        hit(source);
        throw new ReferenceError(rid);
      };
      const setChainPropAccess = function setChainPropAccess(owner, property) {
        const chainInfo = getPropertyInChain(owner, property);
        let base = chainInfo.base;
        const prop = chainInfo.prop,
          chain = chainInfo.chain;
        if (chain) {
          const setter = function setter(a) {
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
    abortOnPropertyRead$1.names = ['abort-on-property-read',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'abort-on-property-read.js', 'ubo-abort-on-property-read.js', 'aopr.js', 'ubo-aopr.js', 'ubo-abort-on-property-read', 'ubo-aopr', 'abp-abort-on-property-read'];
    abortOnPropertyRead$1.injections = [randomId, setPropertyAccess, getPropertyInChain, createOnErrorHandler, hit, isEmptyObject];

    /* eslint-disable max-len */
    /**
     * @scriptlet abort-on-property-write
     *
     * @description
     * Aborts a script when it attempts to **write** the specified property.
     *
     * Related UBO scriptlet:
     * https://github.com/gorhill/uBlock/wiki/Resources-Library#abort-on-property-writejs-
     *
     * Related ABP source:
     * https://gitlab.com/eyeo/snippets/-/blob/main/source/behavioral/abort-on-property-write.js
     *
     * ### Syntax
     *
     * ```text
     * example.org#%#//scriptlet('abort-on-property-write', property)
     * ```
     *
     * - `property` — required, path to a property (joined with `.` if needed).
     *   The property must be attached to `window`
     *
     * ### Examples
     *
     * ```adblock
     * ! Aborts script when it tries to set `window.adblock` value
     * example.org#%#//scriptlet('abort-on-property-write', 'adblock')
     * ```
     *
     * @added v1.0.4.
     */
    /* eslint-enable max-len */
    function abortOnPropertyWrite$1(source, property) {
      if (!property) {
        return;
      }
      const rid = randomId();
      const abort = function abort() {
        hit(source);
        throw new ReferenceError(rid);
      };
      const setChainPropAccess = function setChainPropAccess(owner, property) {
        const chainInfo = getPropertyInChain(owner, property);
        let base = chainInfo.base;
        const prop = chainInfo.prop,
          chain = chainInfo.chain;
        if (chain) {
          const setter = function setter(a) {
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
    abortOnPropertyWrite$1.names = ['abort-on-property-write',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'abort-on-property-write.js', 'ubo-abort-on-property-write.js', 'aopw.js', 'ubo-aopw.js', 'ubo-abort-on-property-write', 'ubo-aopw', 'abp-abort-on-property-write'];
    abortOnPropertyWrite$1.injections = [randomId, setPropertyAccess, getPropertyInChain, createOnErrorHandler, hit, isEmptyObject];

    /* eslint-disable max-len */
    /**
     * @scriptlet prevent-setTimeout
     *
     * @description
     * Prevents a `setTimeout` call if:
     *
     * 1. The text of the callback is matching the specified `matchCallback` string/regexp which does not start with `!`;
     *    otherwise mismatched calls should be defused.
     * 1. The delay is matching the specified `matchDelay`; otherwise mismatched calls should be defused.
     *
     * Related UBO scriptlet:
     * https://github.com/gorhill/uBlock/wiki/Resources-Library#no-settimeout-ifjs-
     *
     * ### Syntax
     *
     * ```text
     * example.org#%#//scriptlet('prevent-setTimeout'[, matchCallback[, matchDelay]])
     * ```
     *
     * > Call with no arguments will log all setTimeout calls (`log-setTimeout` superseding),
     * > it may be useful for debugging but it is not allowed for prod versions of filter lists.
     *
     * - `matchCallback` — optional, string or regular expression;
     *   invalid regular expression will be skipped and all callbacks will be matched.
     *   If starts with `!`, scriptlet will not match the stringified callback but all other will be defused.
     *   If do not start with `!`, the stringified callback will be matched.
     *   If not set, prevents all `setTimeout` calls due to specified `matchDelay`.
     * - `matchDelay` — optional, must be an integer.
     *   If starts with `!`, scriptlet will not match the delay but all other will be defused.
     *   If do not start with `!`, the delay passed to the `setTimeout` call will be matched.
     *   Decimal delay values will be rounded down, e.g `10.95` will be matched by `matchDelay` with value `10`.
     *
     * > If `prevent-setTimeout` log looks like `setTimeout(undefined, 1000)`,
     * > it means that no callback was passed to setTimeout() and that's not scriptlet issue
     * > and obviously it can not be matched by `matchCallback`.
     *
     * ### Examples
     *
     * 1. Prevents `setTimeout` calls if the callback matches `/\.test/` regardless of the delay
     *
     *     ```adblock
     *     example.org#%#//scriptlet('prevent-setTimeout', '/\.test/')
     *     ```
     *
     *     For instance, the following call will be prevented:
     *
     *     ```javascript
     *     setTimeout(function () {
     *         window.test = "value";
     *     }, 100);
     *     ```
     *
     * 1. Prevents `setTimeout` calls if the callback does not contain `value`
     *
     *     ```adblock
     *     example.org#%#//scriptlet('prevent-setTimeout', '!value')
     *     ```
     *
     *     For instance, only the first of the following calls will be prevented:
     *
     *     ```javascript
     *     setTimeout(function () {
     *         window.test = "test -- prevented";
     *     }, 300);
     *     setTimeout(function () {
     *         window.test = "value -- executed";
     *     }, 400);
     *     setTimeout(function () {
     *         window.value = "test -- executed";
     *     }, 500);
     *     ```
     *
     * 1. Prevents `setTimeout` calls if the callback contains `value` and the delay is not set to `300`
     *
     *     ```adblock
     *     example.org#%#//scriptlet('prevent-setTimeout', 'value', '!300')
     *     ```
     *
     *     For instance, only the first of the following calls will not be prevented:
     *
     *     ```javascript
     *     setTimeout(function () {
     *         window.test = "value 1 -- executed";
     *     }, 300);
     *     setTimeout(function () {
     *         window.test = "value 2 -- prevented";
     *     }, 400);
     *     setTimeout(function () {
     *         window.test = "value 3 -- prevented";
     *     }, 500);
     *     ```
     *
     * 1. Prevents `setTimeout` calls if the callback does not contain `value` and the delay is not set to `300`
     *
     *     ```adblock
     *     example.org#%#//scriptlet('prevent-setTimeout', '!value', '!300')
     *     ```
     *
     *     For instance, only the second of the following calls will be prevented:
     *
     *     ```javascript
     *     setTimeout(function () {
     *         window.test = "test -- executed";
     *     }, 300);
     *     setTimeout(function () {
     *         window.test = "test -- prevented";
     *     }, 400);
     *     setTimeout(function () {
     *         window.test = "value -- executed";
     *     }, 400);
     *     setTimeout(function () {
     *         window.value = "test -- executed";
     *     }, 500);
     *     ```
     *
     * 1. Prevents `setTimeout` calls if the callback contains `value` and delay is a decimal
     *
     *     ```adblock
     *     example.org#%#//scriptlet('prevent-setTimeout', 'value', '300')
     *     ```
     *
     *     For instance, the following calls will be prevented:
     *
     *     ```javascript
     *     setTimeout(function () {
     *         window.test = "value";
     *     }, 300);
     *     setTimeout(function () {
     *         window.test = "value";
     *     }, 300 + Math.random());
     *     ```
     *
     * @added v1.0.4.
     */
    /* eslint-enable max-len */
    function preventSetTimeout$1(source, matchCallback, matchDelay) {
      // logs setTimeouts to console if no arguments have been specified
      const shouldLog = typeof matchCallback === 'undefined' && typeof matchDelay === 'undefined';
      const handlerWrapper = function handlerWrapper(target, thisArg, args) {
        const callback = args[0];
        const delay = args[1];
        let shouldPrevent = false;
        if (shouldLog) {
          hit(source);
          // https://github.com/AdguardTeam/Scriptlets/issues/105
          logMessage(source, "setTimeout(".concat(String(callback), ", ").concat(delay, ")"), true);
        } else {
          shouldPrevent = isPreventionNeeded({
            callback,
            delay,
            matchCallback,
            matchDelay
          });
        }
        if (shouldPrevent) {
          hit(source);
          args[0] = noopFunc;
        }
        return target.apply(thisArg, args);
      };
      const setTimeoutHandler = {
        apply: handlerWrapper
      };
      window.setTimeout = new Proxy(window.setTimeout, setTimeoutHandler);
    }
    preventSetTimeout$1.names = ['prevent-setTimeout',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'no-setTimeout-if.js',
    // new implementation of setTimeout-defuser.js
    'ubo-no-setTimeout-if.js', 'nostif.js',
    // new short name of no-setTimeout-if
    'ubo-nostif.js', 'ubo-no-setTimeout-if', 'ubo-nostif',
    // old scriptlet names which should be supported as well.
    // should be removed eventually.
    // do not remove until other filter lists maintainers use them
    'setTimeout-defuser.js', 'ubo-setTimeout-defuser.js', 'ubo-setTimeout-defuser', 'std.js', 'ubo-std.js', 'ubo-std'];
    preventSetTimeout$1.injections = [hit, noopFunc, isPreventionNeeded, logMessage,
    // following helpers should be injected as helpers above use them
    parseMatchArg, parseDelayArg, toRegExp, nativeIsNaN, isValidCallback, isValidMatchStr, escapeRegExp, isValidStrPattern, nativeIsFinite, isValidMatchNumber, parseRawDelay];

    /* eslint-disable max-len */
    /**
     * @scriptlet prevent-setInterval
     *
     * @description
     * Prevents a `setInterval` call if:
     *
     * 1. The text of the callback is matching the specified `matchCallback` string/regexp which does not start with `!`;
     *    otherwise mismatched calls should be defused.
     * 1. The delay is matching the specified `matchDelay`; otherwise mismatched calls should be defused.
     *
     * Related UBO scriptlet:
     * https://github.com/gorhill/uBlock/wiki/Resources-Library#no-setinterval-ifjs-
     *
     * ### Syntax
     *
     * ```text
     * example.org#%#//scriptlet('prevent-setInterval'[, matchCallback[, matchDelay]])
     * ```
     *
     * > Call with no arguments will log all setInterval calls (`log-setInterval` superseding),
     * > it may be useful for debugging but it is not allowed for prod versions of filter lists.
     *
     * - `matchCallback` — optional, string or regular expression;
     *   invalid regular expression will be skipped and all callbacks will be matched.
     *   If starts with `!`, scriptlet will not match the stringified callback but all other will be defused.
     *   If do not start with `!`, the stringified callback will be matched.
     *   If not set, prevents all `setInterval` calls due to specified `matchDelay`.
     * - `matchDelay` — optional, must be an integer.
     *   If starts with `!`, scriptlet will not match the delay but all other will be defused.
     *   If do not start with `!`, the delay passed to the `setInterval` call will be matched.
     *   Decimal delay values will be rounded down, e.g `10.95` will be matched by `matchDelay` with value `10`.
     *
     * > If `prevent-setInterval` log looks like `setInterval(undefined, 1000)`,
     * > it means that no callback was passed to setInterval() and that's not scriptlet issue
     * > and obviously it can not be matched by `matchCallback`.
     *
     * ### Examples
     *
     * 1. Prevents `setInterval` calls if the callback matches `/\.test/` regardless of the delay
     *
     *     ```adblock
     *     example.org#%#//scriptlet('prevent-setInterval', '/\.test/')
     *     ```
     *
     *     For instance, the following call will be prevented:
     *
     *     ```javascript
     *     setInterval(function () {
     *         window.test = "value";
     *     }, 100);
     *     ```
     *
     * 1. Prevents `setInterval` calls if the callback does not contain `value`
     *
     *     ```adblock
     *     example.org#%#//scriptlet('prevent-setInterval', '!value')
     *     ```
     *
     *     For instance, only the first of the following calls will be prevented:
     *
     *     ```javascript
     *     setInterval(function () {
     *         window.test = "test -- prevented";
     *     }, 300);
     *     setInterval(function () {
     *         window.test = "value -- executed";
     *     }, 400);
     *     setInterval(function () {
     *         window.value = "test -- executed";
     *     }, 500);
     *     ```
     *
     * 1. Prevents `setInterval` calls if the callback contains `value` and the delay is not set to `300`
     *
     *     ```adblock
     *     example.org#%#//scriptlet('prevent-setInterval', 'value', '!300')
     *     ```
     *
     *     For instance, only the first of the following calls will not be prevented:
     *
     *     ```javascript
     *     setInterval(function () {
     *         window.test = "value 1 -- executed";
     *     }, 300);
     *     setInterval(function () {
     *         window.test = "value 2 -- prevented";
     *     }, 400);
     *     setInterval(function () {
     *         window.test = "value 3 -- prevented";
     *     }, 500);
     *     ```
     *
     * 1. Prevents `setInterval` calls if the callback does not contain `value` and the delay is not set to `300`
     *
     *     ```adblock
     *     example.org#%#//scriptlet('prevent-setInterval', '!value', '!300')
     *     ```
     *
     *     For instance, only the second of the following calls will be prevented:
     *
     *     ```javascript
     *     setInterval(function () {
     *         window.test = "test -- executed";
     *     }, 300);
     *     setInterval(function () {
     *         window.test = "test -- prevented";
     *     }, 400);
     *     setInterval(function () {
     *         window.test = "value -- executed";
     *     }, 400);
     *     setInterval(function () {
     *         window.value = "test -- executed";
     *     }, 500);
     *     ```
     *
     * 1. Prevents `setInterval` calls if the callback contains `value` and delay is a decimal number
     *
     *     ```adblock
     *     example.org#%#//scriptlet('prevent-setInterval', 'value', '300')
     *     ```
     *
     *     For instance, the following calls will be prevented:
     *
     *     ```javascript
     *     setInterval(function () {
     *         window.test = "value";
     *     }, 300);
     *     setInterval(function () {
     *         window.test = "value";
     *     }, 300 + Math.random());
     *     ```
     *
     * @added v1.0.4.
     */
    /* eslint-enable max-len */
    function preventSetInterval$1(source, matchCallback, matchDelay) {
      // logs setIntervals to console if no arguments have been specified
      const shouldLog = typeof matchCallback === 'undefined' && typeof matchDelay === 'undefined';
      const handlerWrapper = function handlerWrapper(target, thisArg, args) {
        const callback = args[0];
        const delay = args[1];
        let shouldPrevent = false;
        if (shouldLog) {
          hit(source);
          // https://github.com/AdguardTeam/Scriptlets/issues/105
          logMessage(source, "setInterval(".concat(String(callback), ", ").concat(delay, ")"), true);
        } else {
          shouldPrevent = isPreventionNeeded({
            callback,
            delay,
            matchCallback,
            matchDelay
          });
        }
        if (shouldPrevent) {
          hit(source);
          args[0] = noopFunc;
        }
        return target.apply(thisArg, args);
      };
      const setIntervalHandler = {
        apply: handlerWrapper
      };
      window.setInterval = new Proxy(window.setInterval, setIntervalHandler);
    }
    preventSetInterval$1.names = ['prevent-setInterval',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'no-setInterval-if.js',
    // new implementation of setInterval-defuser.js
    'ubo-no-setInterval-if.js', 'setInterval-defuser.js',
    // old name should be supported as well
    'ubo-setInterval-defuser.js', 'nosiif.js',
    // new short name of no-setInterval-if
    'ubo-nosiif.js', 'sid.js',
    // old short scriptlet name
    'ubo-sid.js', 'ubo-no-setInterval-if', 'ubo-setInterval-defuser', 'ubo-nosiif', 'ubo-sid'];
    preventSetInterval$1.injections = [hit, noopFunc, isPreventionNeeded, logMessage,
    // following helpers should be injected as helpers above use them
    toRegExp, nativeIsNaN, parseMatchArg, parseDelayArg, isValidCallback, isValidMatchStr, isValidStrPattern, escapeRegExp, nativeIsFinite, isValidMatchNumber, parseRawDelay];

    /* eslint-disable max-len */
    /**
     * @scriptlet prevent-window-open
     *
     * @description
     * Prevents `window.open` calls when URL either matches or not matches the specified string/regexp.
     * Using it without parameters prevents all `window.open` calls.
     *
     * Related UBO scriptlet:
     * https://github.com/gorhill/uBlock/wiki/Resources-Library#windowopen-defuserjs-
     *
     * ### Syntax
     *
     * ```text
     * example.org#%#//scriptlet('prevent-window-open'[, match[, delay[, replacement]]])
     * ```
     *
     * - `match` — optional, string or regular expression.
     *   If not set or regular expression is invalid, all window.open calls will be matched.
     *   If starts with `!`, scriptlet will not match the stringified callback but all other will be defused.
     *   If do not start with `!`, the stringified callback will be matched.
     * - `delay` — optional, number of seconds. If not set, scriptlet will return `null`,
     *   otherwise valid sham window object as injected `iframe` will be returned
     *   for accessing its methods (blur(), focus() etc.) and will be removed after the delay.
     * - `replacement` — optional, string; one of the predefined constants:
     *     - `obj` — for returning an object instead of default iframe;
     *        for cases when the page requires a valid `window` instance to be returned
     *     - `log` — for logging window.open calls; not allowed for prod versions of filter lists.
     *
     * ### Examples
     *
     * 1. Prevent all `window.open` calls
     *
     *     ```adblock
     *     example.org#%#//scriptlet('prevent-window-open')
     *     ```
     *
     * 1. Prevent `window.open` for all URLs containing `example`
     *
     *     ```adblock
     *     example.org#%#//scriptlet('prevent-window-open', 'example')
     *     ```
     *
     * 1. Prevent `window.open` for all URLs matching RegExp `/example\./`
     *
     *     ```adblock
     *     example.org#%#//scriptlet('prevent-window-open', '/example\./')
     *     ```
     *
     * 1. Prevent `window.open` for all URLs **NOT** containing `example`
     *
     *     ```adblock
     *     example.org#%#//scriptlet('prevent-window-open', '!example')
     *     ```
     *
     * ### Old syntax of prevent-window-open parameters
     *
     * - `match` — optional, defaults to "matching", any positive number or nothing for "matching",
     *   0 or empty string for "not matching"
     * - `search` — optional, string or regexp for matching the URL passed to `window.open` call;
     *   defaults to search all `window.open` call
     * - `replacement` — optional, string to return prop value or property instead of window.open;
     *   defaults to return noopFunc.
     *
     * ### Examples of old syntax
     *
     * ```adblock
     * example.org#%#//scriptlet('prevent-window-open', '1', '/example\./')
     * example.org#%#//scriptlet('prevent-window-open', '0', 'example')
     * example.org#%#//scriptlet('prevent-window-open', '', '', 'trueFunc')
     * example.org#%#//scriptlet('prevent-window-open', '1', '', '{propName=noopFunc}')
     * ```
     *
     * > For better compatibility with uBO, old syntax is not recommended to use.
     *
     * @added v1.0.4.
     */
    /* eslint-enable max-len */
    function preventWindowOpen$1(source) {
      let match = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '*';
      let delay = arguments.length > 2 ? arguments[2] : undefined;
      let replacement = arguments.length > 3 ? arguments[3] : undefined;
      // default match value is needed for preventing all window.open calls
      // if scriptlet runs without args
      const nativeOpen = window.open;
      const isNewSyntax = match !== '0' && match !== '1';
      const oldOpenWrapper = function oldOpenWrapper(str) {
        match = Number(match) > 0;
        // 'delay' was 'search' prop for matching in old syntax
        for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
          args[_key - 1] = arguments[_key];
        }
        if (!isValidStrPattern(delay)) {
          logMessage(source, "Invalid parameter: ".concat(delay));
          return nativeOpen.apply(window, [str, ...args]);
        }
        const searchRegexp = toRegExp(delay);
        if (match !== searchRegexp.test(str)) {
          return nativeOpen.apply(window, [str, ...args]);
        }
        hit(source);
        return handleOldReplacement(replacement);
      };
      const newOpenWrapper = function newOpenWrapper(url) {
        const shouldLog = replacement && replacement.includes('log');
        for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
          args[_key2 - 1] = arguments[_key2];
        }
        if (shouldLog) {
          const argsStr = args && args.length > 0 ? ", ".concat(args.join(', ')) : '';
          const message = "".concat(url).concat(argsStr);
          logMessage(source, message, true);
          hit(source);
        }
        let shouldPrevent = false;
        if (match === '*') {
          shouldPrevent = true;
        } else if (isValidMatchStr(match)) {
          const _parseMatchArg = parseMatchArg(match),
            isInvertedMatch = _parseMatchArg.isInvertedMatch,
            matchRegexp = _parseMatchArg.matchRegexp;
          shouldPrevent = matchRegexp.test(url) !== isInvertedMatch;
        } else {
          logMessage(source, "Invalid parameter: ".concat(match));
          shouldPrevent = false;
        }
        if (shouldPrevent) {
          const parsedDelay = parseInt(delay, 10);
          let result;
          if (nativeIsNaN(parsedDelay)) {
            result = noopNull();
          } else {
            const decoyArgs = {
              replacement,
              url,
              delay: parsedDelay
            };
            const decoy = createDecoy(decoyArgs);
            let popup = decoy.contentWindow;
            if (typeof popup === 'object' && popup !== null) {
              Object.defineProperty(popup, 'closed', {
                value: false
              });
              Object.defineProperty(popup, 'opener', {
                value: window
              });
              Object.defineProperty(popup, 'frameElement', {
                value: null
              });
            } else {
              const nativeGetter = decoy.contentWindow && decoy.contentWindow.get;
              Object.defineProperty(decoy, 'contentWindow', {
                get: getPreventGetter(nativeGetter)
              });
              popup = decoy.contentWindow;
            }
            result = popup;
          }
          hit(source);
          return result;
        }
        return nativeOpen.apply(window, [url, ...args]);
      };
      window.open = isNewSyntax ? newOpenWrapper : oldOpenWrapper;

      // Protect window.open from native code check
      window.open.toString = nativeOpen.toString.bind(nativeOpen);
    }
    preventWindowOpen$1.names = ['prevent-window-open',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'window.open-defuser.js', 'ubo-window.open-defuser.js', 'ubo-window.open-defuser', 'nowoif.js', 'ubo-nowoif.js', 'ubo-nowoif'];
    preventWindowOpen$1.injections = [hit, isValidStrPattern, escapeRegExp, isValidMatchStr, toRegExp, nativeIsNaN, parseMatchArg, handleOldReplacement, createDecoy, getPreventGetter, noopNull, logMessage, noopFunc, trueFunc, substringBefore, substringAfter$1];

    /* eslint-disable max-len */
    /**
     * @scriptlet abort-current-inline-script
     *
     * @description
     * Aborts an inline script when it attempts to **read** or **write to** the specified property
     * AND when the contents of the `<script>` element contains the specified
     * text or matches the regular expression.
     *
     * Related UBO scriptlet:
     * https://github.com/gorhill/uBlock/wiki/Resources-Library#abort-current-inline-scriptjs-
     *
     * Related ABP source:
     * https://gitlab.com/eyeo/snippets/-/blob/main/source/behavioral/abort-current-inline-script.js
     *
     * ### Syntax
     *
     * ```text
     * example.org#%#//scriptlet('abort-current-inline-script', property[, search])
     * ```
     *
     * - `property` — required, path to a property (joined with `.` if needed). The property must be attached to `window`
     * - `search` — optional, string or regular expression that must match the inline script content.
     *   Defaults to abort all scripts which are trying to access the specified property.
     *   Invalid regular expression will cause exit and rule will not work.
     *
     * > Note please that to abort the inline script with addEventListener in it,
     * > `property` should be set as `EventTarget.prototype.addEventListener`, not just `addEventListener`.
     *
     * ### Examples
     *
     * 1. Aborts all inline scripts trying to access `window.alert`
     *
     *     ```adblock
     *     example.org#%#//scriptlet('abort-current-inline-script', 'alert')
     *     ```
     *
     * 1. Aborts inline scripts which are trying to access `window.alert` and contain `Hello, world`
     *
     *     ```adblock
     *     example.org#%#//scriptlet('abort-current-inline-script', 'alert', 'Hello, world')
     *     ```
     *
     *     For instance, the following script will be aborted:
     *
     *     ```html
     *     <script>alert("Hello, world");</script>
     *     ```
     *
     * 1. Aborts inline scripts which are trying to access `window.alert` and match regexp `/Hello.+world/`
     *
     *     ```adblock
     *     example.org#%#//scriptlet('abort-current-inline-script', 'alert', '/Hello.+world/')
     *     ```
     *
     *     For instance, the following scripts will be aborted:
     *
     *     ```html
     *     <script>alert("Hello, big world");</script>
     *     ```
     *
     *     ```html
     *     <script>alert("Hello, little world");</script>
     *     ```
     *
     *     And this script will not be aborted:
     *
     *     ```html
     *     <script>alert("Hi, little world");</script>
     *     ```
     *
     * @added v1.0.4.
     */
    /* eslint-enable max-len */
    function abortCurrentInlineScript$1(source, property, search) {
      const searchRegexp = toRegExp(search);
      const rid = randomId();
      const SRC_DATA_MARKER = 'data:text/javascript;base64,';
      const getCurrentScript = function getCurrentScript() {
        if ('currentScript' in document) {
          return document.currentScript;
        }
        const scripts = document.getElementsByTagName('script');
        return scripts[scripts.length - 1];
      };
      const ourScript = getCurrentScript();
      const abort = function abort() {
        var _scriptEl$src;
        const scriptEl = getCurrentScript();
        if (!scriptEl) {
          return;
        }
        let content = scriptEl.textContent;

        // We are using Node.prototype.textContent property descriptor
        // to get the real script content
        // even when document.currentScript.textContent is replaced.
        // https://github.com/AdguardTeam/Scriptlets/issues/57#issuecomment-593638991
        try {
          const textContentGetter = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent').get;
          content = textContentGetter.call(scriptEl);
        } catch (e) {} // eslint-disable-line no-empty

        // https://github.com/AdguardTeam/Scriptlets/issues/130
        if (content.length === 0 && typeof scriptEl.src !== 'undefined' && (_scriptEl$src = scriptEl.src) !== null && _scriptEl$src !== void 0 && _scriptEl$src.startsWith(SRC_DATA_MARKER)) {
          const encodedContent = scriptEl.src.slice(SRC_DATA_MARKER.length);
          content = window.atob(encodedContent);
        }
        if (scriptEl instanceof HTMLScriptElement && content.length > 0 && scriptEl !== ourScript && searchRegexp.test(content)) {
          hit(source);
          throw new ReferenceError(rid);
        }
      };
      const setChainPropAccess = function setChainPropAccess(owner, property) {
        const chainInfo = getPropertyInChain(owner, property);
        let base = chainInfo.base;
        const prop = chainInfo.prop,
          chain = chainInfo.chain;

        // The scriptlet might be executed before the chain property has been created
        // (for instance, document.body before the HTML body was loaded).
        // In this case we're checking whether the base element exists or not
        // and if not, we simply exit without overriding anything.
        // e.g. https://github.com/AdguardTeam/Scriptlets/issues/57#issuecomment-575841092
        if (base instanceof Object === false && base === null) {
          const props = property.split('.');
          const propIndex = props.indexOf(prop);
          const baseName = props[propIndex - 1];
          const message = "The scriptlet had been executed before the ".concat(baseName, " was loaded.");
          logMessage(source, message);
          return;
        }
        if (chain) {
          const setter = function setter(a) {
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
        let currentValue = base[prop];
        let origDescriptor = Object.getOwnPropertyDescriptor(base, prop);
        if (origDescriptor instanceof Object === false || origDescriptor.get instanceof Function === false) {
          currentValue = base[prop];
          origDescriptor = undefined;
        }
        const descriptorWrapper = Object.assign(getDescriptorAddon(), {
          currentValue,
          get() {
            if (!this.isAbortingSuspended) {
              this.isolateCallback(abort);
            }
            if (origDescriptor instanceof Object) {
              return origDescriptor.get.call(base);
            }
            return this.currentValue;
          },
          set(newValue) {
            if (!this.isAbortingSuspended) {
              this.isolateCallback(abort);
            }
            if (origDescriptor instanceof Object) {
              origDescriptor.set.call(base, newValue);
            } else {
              this.currentValue = newValue;
            }
          }
        });
        setPropertyAccess(base, prop, {
          // Call wrapped getter and setter to keep isAbortingSuspended & isolateCallback values
          get() {
            return descriptorWrapper.get.call(descriptorWrapper);
          },
          set(newValue) {
            descriptorWrapper.set.call(descriptorWrapper, newValue);
          }
        });
      };
      setChainPropAccess(window, property);
      window.onerror = createOnErrorHandler(rid).bind();
    }
    abortCurrentInlineScript$1.names = ['abort-current-inline-script',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'abort-current-script.js', 'ubo-abort-current-script.js', 'acs.js', 'ubo-acs.js',
    // "ubo"-aliases with no "js"-ending
    'ubo-abort-current-script', 'ubo-acs',
    // obsolete but supported aliases
    'abort-current-inline-script.js', 'ubo-abort-current-inline-script.js', 'acis.js', 'ubo-acis.js', 'ubo-abort-current-inline-script', 'ubo-acis', 'abp-abort-current-inline-script'];
    abortCurrentInlineScript$1.injections = [randomId, setPropertyAccess, getPropertyInChain, toRegExp, createOnErrorHandler, hit, logMessage, isEmptyObject, getDescriptorAddon];

    /* eslint-disable max-len */
    /**
     * @scriptlet set-constant
     *
     * @description
     * Creates a constant property and assigns it one of the values from the predefined list.
     *
     * > Actually, it's not a constant. Please note, that it can be rewritten with a value of a different type.
     *
     * > If empty object is present in chain it will be trapped until chain leftovers appear.
     *
     * Related UBO scriptlet:
     * https://github.com/gorhill/uBlock/wiki/Resources-Library#set-constantjs-
     *
     * Related ABP snippet:
     * https://github.com/adblockplus/adblockpluscore/blob/adblockpluschrome-3.9.4/lib/content/snippets.js#L1361
     *
     * ### Syntax
     *
     * ```text
     * example.org#%#//scriptlet('set-constant', property, value[, stack])
     * ```
     *
     * - `property` — required, path to a property (joined with `.` if needed). The property must be attached to `window`.
     * - `value` — required. Possible values:
     *     - positive decimal integer `<= 32767`
     *     - one of the predefined constants:
     *         - `undefined`
     *         - `false`
     *         - `true`
     *         - `null`
     *         - `emptyObj` — empty object
     *         - `emptyArr` — empty array
     *         - `noopFunc` — function with empty body
     *         - `noopCallbackFunc` — function returning noopFunc
     *         - `trueFunc` — function returning true
     *         - `falseFunc` — function returning false
     *         - `throwFunc` — function throwing an error
     *         - `noopPromiseResolve` — function returning Promise object that is resolved with an empty response
     *         - `noopPromiseReject` — function returning Promise.reject()
     *         - `''` — empty string
     *         - `-1` — number value `-1`
     *         - `yes`
     *         - `no`
     * - `stack` — string or regular expression that must match the current function call stack trace,
     *   defaults to matching every call; if regular expression is invalid, it will be skipped
     * - `valueWrapper` – optional, string to modify a value to be set. Possible wrappers:
     *     - `asFunction` – function returning value
     *     - `asCallback` – function returning callback, that would return value
     *     - `asResolved` – Promise that would resolve with value
     *     - `asRejected` – Promise that would reject with value
     *
     * ### Examples
     *
     * ```adblock
     * ! Any access to `window.first` will return `false`
     * example.org#%#//scriptlet('set-constant', 'first', 'false')
     *
     * ✔ window.first === false
     * ```
     *
     * ```adblock
     * ! Any call to `window.second()` will return `true`
     * example.org#%#//scriptlet('set-constant', 'second', 'trueFunc')
     *
     * ✔ window.second() === true
     * ✔ window.second.toString() === "function trueFunc() {return true;}"
     * ```
     *
     * ```adblock
     * ! Any call to `document.third()` will return `true` if the method is related to `checking.js`
     * example.org#%#//scriptlet('set-constant', 'document.third', 'trueFunc', 'checking.js')
     *
     * ✔ document.third() === true  // if the condition described above is met
     * ```
     *
     * ```adblock
     * ! Any call to `document.fourth()` will return `yes`
     * example.org#%#//scriptlet('set-constant', 'document.fourth', 'yes', '', 'asFunction')
     *
     * ✔ document.fourth() === 'yes'
     * ```
     *
     * ```adblock
     * ! Any call to `document.fifth()` will return `yes`
     * example.org#%#//scriptlet('set-constant', 'document.fifth', '42', '', 'asRejected')
     *
     * ✔ document.fifth.catch((reason) => reason === 42) // promise rejects with specified number
     * ```
     *
     * @added v1.0.4.
     */
    /* eslint-enable max-len */
    function setConstant$1(source, property, value) {
      let stack = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : '';
      let valueWrapper = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : '';
      const uboAliases = ['set-constant.js', 'ubo-set-constant.js', 'set.js', 'ubo-set.js', 'ubo-set-constant', 'ubo-set'];

      /**
       * UBO set-constant analog has it's own args sequence:
       * (property, value, defer | wrapper)
       * 'defer' – a stringified number, which defines execution time, or
       * 'wrapper' - string which defines value wrapper name
       *
       * joysound.com##+js(set, document.body.oncopy, null, 3)
       * kompetent.de##+js(set, Object.keys, 42, asFunction)
       */
      if (uboAliases.includes(source.name)) {
        /**
         * Check that third argument was intended as 'valueWrapper' argument,
         * by excluding 'defer' single digits case, and move it to 'valueWrapper'
         */
        if (stack.length !== 1 && !getNumberFromString(stack)) {
          valueWrapper = stack;
        }
        /**
         * ubo doesn't support 'stack', while adg doesn't support 'defer'
         * that goes in the same spot, so we discard it
         */
        stack = undefined;
      }
      if (!property || !matchStackTrace(stack, new Error().stack)) {
        return;
      }
      const emptyArr = noopArray();
      const emptyObj = noopObject();
      let constantValue;
      if (value === 'undefined') {
        constantValue = undefined;
      } else if (value === 'false') {
        constantValue = false;
      } else if (value === 'true') {
        constantValue = true;
      } else if (value === 'null') {
        constantValue = null;
      } else if (value === 'emptyArr') {
        constantValue = emptyArr;
      } else if (value === 'emptyObj') {
        constantValue = emptyObj;
      } else if (value === 'noopFunc') {
        constantValue = noopFunc;
      } else if (value === 'noopCallbackFunc') {
        constantValue = noopCallbackFunc;
      } else if (value === 'trueFunc') {
        constantValue = trueFunc;
      } else if (value === 'falseFunc') {
        constantValue = falseFunc;
      } else if (value === 'throwFunc') {
        constantValue = throwFunc;
      } else if (value === 'noopPromiseResolve') {
        constantValue = noopPromiseResolve;
      } else if (value === 'noopPromiseReject') {
        constantValue = noopPromiseReject;
      } else if (/^\d+$/.test(value)) {
        constantValue = parseFloat(value);
        if (nativeIsNaN(constantValue)) {
          return;
        }
        if (Math.abs(constantValue) > 32767) {
          return;
        }
      } else if (value === '-1') {
        constantValue = -1;
      } else if (value === '') {
        constantValue = '';
      } else if (value === 'yes') {
        constantValue = 'yes';
      } else if (value === 'no') {
        constantValue = 'no';
      } else {
        return;
      }
      const valueWrapperNames = ['asFunction', 'asCallback', 'asResolved', 'asRejected'];
      if (valueWrapperNames.includes(valueWrapper)) {
        const valueWrappersMap = {
          asFunction(v) {
            return function () {
              return v;
            };
          },
          asCallback(v) {
            return function () {
              return function () {
                return v;
              };
            };
          },
          asResolved(v) {
            return Promise.resolve(v);
          },
          asRejected(v) {
            return Promise.reject(v);
          }
        };
        constantValue = valueWrappersMap[valueWrapper](constantValue);
      }
      let canceled = false;
      const mustCancel = function mustCancel(value) {
        if (canceled) {
          return canceled;
        }
        canceled = value !== undefined && constantValue !== undefined && typeof value !== typeof constantValue && value !== null;
        return canceled;
      };

      /**
       * Safely sets property on a given object
       *
       * IMPORTANT! this duplicates corresponding func in trusted-set-constant scriptlet as
       * reorganizing this to common helpers will most definitely complicate debugging
       *
       * @param {Object} base arbitrary reachable object
       * @param {string} prop property name
       * @param {boolean} configurable if set property should be configurable
       * @param {Object} handler custom property descriptor object
       * @returns {boolean} true if prop was trapped successfully
       */
      const trapProp = function trapProp(base, prop, configurable, handler) {
        if (!handler.init(base[prop])) {
          return false;
        }
        const origDescriptor = Object.getOwnPropertyDescriptor(base, prop);
        let prevSetter;
        // This is required to prevent scriptlets overwrite each over
        if (origDescriptor instanceof Object) {
          // This check is required to avoid defining non-configurable props
          if (!origDescriptor.configurable) {
            const message = "Property '".concat(prop, "' is not configurable");
            logMessage(source, message);
            return false;
          }
          base[prop] = constantValue;
          if (origDescriptor.set instanceof Function) {
            prevSetter = origDescriptor.set;
          }
        }
        Object.defineProperty(base, prop, {
          configurable,
          get() {
            return handler.get();
          },
          set(a) {
            if (prevSetter !== undefined) {
              prevSetter(a);
            }
            handler.set(a);
          }
        });
        return true;
      };

      /**
       * Traverses given chain to set constant value to its end prop
       * Chains that yet include non-object values (e.g null) are valid and will be
       * traversed when appropriate chain member is set by an external script
       *
       * IMPORTANT! this duplicates corresponding func in trusted-set-constant scriptlet as
       * reorganizing this to common helpers will most definitely complicate debugging
       *
       * @param {Object} owner object that owns chain
       * @param {string} property chain of owner properties
       */
      const setChainPropAccess = function setChainPropAccess(owner, property) {
        const chainInfo = getPropertyInChain(owner, property);
        const base = chainInfo.base;
        const prop = chainInfo.prop,
          chain = chainInfo.chain;

        // Handler method init is used to keep track of factual value
        // and apply mustCancel() check only on end prop
        const inChainPropHandler = {
          factValue: undefined,
          init(a) {
            this.factValue = a;
            return true;
          },
          get() {
            return this.factValue;
          },
          set(a) {
            // Prevent breakage due to loop assignments like win.obj = win.obj
            if (this.factValue === a) {
              return;
            }
            this.factValue = a;
            if (a instanceof Object) {
              setChainPropAccess(a, chain);
            }
          }
        };
        const endPropHandler = {
          init(a) {
            if (mustCancel(a)) {
              return false;
            }
            return true;
          },
          get() {
            return constantValue;
          },
          set(a) {
            if (!mustCancel(a)) {
              return;
            }
            constantValue = a;
          }
        };

        // End prop case
        if (!chain) {
          const isTrapped = trapProp(base, prop, false, endPropHandler);
          if (isTrapped) {
            hit(source);
          }
          return;
        }

        // Null prop in chain
        if (base !== undefined && base[prop] === null) {
          trapProp(base, prop, true, inChainPropHandler);
          return;
        }

        // Empty object prop in chain
        if ((base instanceof Object || typeof base === 'object') && isEmptyObject(base)) {
          trapProp(base, prop, true, inChainPropHandler);
        }

        // Defined prop in chain
        const propValue = owner[prop];
        if (propValue instanceof Object || typeof propValue === 'object' && propValue !== null) {
          setChainPropAccess(propValue, chain);
        }

        // Undefined prop in chain
        trapProp(base, prop, true, inChainPropHandler);
      };
      setChainPropAccess(window, property);
    }
    setConstant$1.names = ['set-constant',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'set-constant.js', 'ubo-set-constant.js', 'set.js', 'ubo-set.js', 'ubo-set-constant', 'ubo-set', 'abp-override-property-read'];
    setConstant$1.injections = [hit, logMessage, getNumberFromString, noopArray, noopObject, noopFunc, noopCallbackFunc, trueFunc, falseFunc, throwFunc, noopPromiseReject, noopPromiseResolve, getPropertyInChain, matchStackTrace, nativeIsNaN, isEmptyObject,
    // following helpers should be imported and injected
    // because they are used by helpers above
    shouldAbortInlineOrInjectedScript, getNativeRegexpTest, setPropertyAccess, toRegExp];

    /* eslint-disable max-len */
    /**
     * @scriptlet remove-cookie
     *
     * @description
     * Removes current page cookies by passed string matching with name. For current domain and subdomains.
     * Runs on load and before unload.
     *
     * Related UBO scriptlet:
     * https://github.com/gorhill/uBlock/wiki/Resources-Library#cookie-removerjs-
     *
     * Related ABP source:
     * https://gitlab.com/eyeo/snippets/-/blob/main/source/behavioral/cookie-remover.js
     *
     * ### Syntax
     *
     * ```text
     * example.org#%#//scriptlet('remove-cookie'[, match])
     * ```
     *
     * - `match` — optional, string or regex matching the cookie name.
     *   If not specified all accessible cookies will be removed.
     *
     * ### Examples
     *
     * 1. Removes all cookies
     *
     *     ```adblock
     *     example.org#%#//scriptlet('remove-cookie')
     *     ```
     *
     * 1. Removes cookies which name contains `example` string
     *
     *     ```adblock
     *     example.org#%#//scriptlet('remove-cookie', 'example')
     *     ```
     *
     *     For instance this cookie will be removed:
     *
     *     ```javascript
     *     document.cookie = '__example=randomValue';
     *     ```
     *
     * @added v1.0.4.
     */
    /* eslint-enable max-len */
    function removeCookie$1(source, match) {
      const matchRegexp = toRegExp(match);
      const removeCookieFromHost = function removeCookieFromHost(cookieName, hostName) {
        const cookieSpec = "".concat(cookieName, "=");
        const domain1 = "; domain=".concat(hostName);
        const domain2 = "; domain=.".concat(hostName);
        const path = '; path=/';
        const expiration = '; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = cookieSpec + expiration;
        document.cookie = cookieSpec + domain1 + expiration;
        document.cookie = cookieSpec + domain2 + expiration;
        document.cookie = cookieSpec + path + expiration;
        document.cookie = cookieSpec + domain1 + path + expiration;
        document.cookie = cookieSpec + domain2 + path + expiration;
        hit(source);
      };
      const rmCookie = function rmCookie() {
        document.cookie.split(';').forEach(function (cookieStr) {
          const pos = cookieStr.indexOf('=');
          if (pos === -1) {
            return;
          }
          const cookieName = cookieStr.slice(0, pos).trim();
          if (!matchRegexp.test(cookieName)) {
            return;
          }
          const hostParts = document.location.hostname.split('.');
          for (let i = 0; i <= hostParts.length - 1; i += 1) {
            const hostName = hostParts.slice(i).join('.');
            if (hostName) {
              removeCookieFromHost(cookieName, hostName);
            }
          }
        });
      };
      rmCookie();
      window.addEventListener('beforeunload', rmCookie);
    }
    removeCookie$1.names = ['remove-cookie',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'cookie-remover.js', 'ubo-cookie-remover.js', 'ubo-cookie-remover'];
    removeCookie$1.injections = [toRegExp, hit];

    /* eslint-disable max-len */
    /**
     * @scriptlet prevent-addEventListener
     *
     * @description
     * Prevents adding event listeners for the specified events and callbacks.
     *
     * Related UBO scriptlet:
     * https://github.com/gorhill/uBlock/wiki/Resources-Library#addeventlistener-defuserjs-
     *
     * ### Syntax
     *
     * ```text
     * example.org#%#//scriptlet('prevent-addEventListener'[, typeSearch[, listenerSearch]])
     * ```
     *
     * - `typeSearch` — optional, string or regular expression matching the type (event name);
     *   defaults to match all types; invalid regular expression will cause exit and rule will not work
     * - `listenerSearch` — optional, string or regular expression matching the listener function body;
     *   defaults to match all listeners; invalid regular expression will cause exit and rule will not work
     *
     * ### Examples
     *
     * 1. Prevent all `click` listeners
     *
     *     ```adblock
     *     example.org#%#//scriptlet('prevent-addEventListener', 'click')
     *     ```
     *
     * 1. Prevent 'click' listeners with the callback body containing `searchString`
     *
     *     ```adblock
     *     example.org#%#//scriptlet('prevent-addEventListener', 'click', 'searchString')
     *     ```
     *
     *     For instance, this listener will not be called:
     *
     *     ```javascript
     *     el.addEventListener('click', () => {
     *         window.test = 'searchString';
     *     });
     *     ```
     *
     * @added v1.0.4.
     */
    /* eslint-enable max-len */
    function preventAddEventListener$1(source, typeSearch, listenerSearch) {
      const typeSearchRegexp = toRegExp(typeSearch);
      const listenerSearchRegexp = toRegExp(listenerSearch);
      const nativeAddEventListener = window.EventTarget.prototype.addEventListener;
      function addEventListenerWrapper(type, listener) {
        var _this$constructor;
        let shouldPrevent = false;
        if (validateType(type) && validateListener(listener)) {
          shouldPrevent = typeSearchRegexp.test(type.toString()) && listenerSearchRegexp.test(listenerToString(listener));
        }
        if (shouldPrevent) {
          hit(source);
          return undefined;
        }

        // Avoid illegal invocations due to lost context
        // https://github.com/AdguardTeam/Scriptlets/issues/271
        let context = this;
        if (this && ((_this$constructor = this.constructor) === null || _this$constructor === void 0 ? void 0 : _this$constructor.name) === 'Window' && this !== window) {
          context = window;
        }
        for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
          args[_key - 2] = arguments[_key];
        }
        return nativeAddEventListener.apply(context, [type, listener, ...args]);
      }
      const descriptor = {
        configurable: true,
        set: function set() {},
        get: function get() {
          return addEventListenerWrapper;
        }
      };
      // https://github.com/AdguardTeam/Scriptlets/issues/215
      // https://github.com/AdguardTeam/Scriptlets/issues/143
      Object.defineProperty(window.EventTarget.prototype, 'addEventListener', descriptor);
      Object.defineProperty(window, 'addEventListener', descriptor);
      Object.defineProperty(document, 'addEventListener', descriptor);
    }
    preventAddEventListener$1.names = ['prevent-addEventListener',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'addEventListener-defuser.js', 'ubo-addEventListener-defuser.js', 'aeld.js', 'ubo-aeld.js', 'ubo-addEventListener-defuser', 'ubo-aeld'];
    preventAddEventListener$1.injections = [hit, toRegExp, validateType, validateListener, listenerToString];

    /* eslint-disable consistent-return, no-eval */

    /**
     * @scriptlet prevent-bab
     *
     * @description
     * Prevents BlockAdblock script from detecting an ad blocker.
     *
     * Related UBO scriptlet:
     * https://github.com/gorhill/uBlock/wiki/Resources-Library#bab-defuserjs-
     *
     * It also can be used as `$redirect` sometimes.
     * See [redirect description](../wiki/about-redirects.md#prevent-bab).
     *
     * ### Syntax
     *
     * ```adblock
     * example.org#%#//scriptlet('prevent-bab')
     * ```
     *
     * @added v1.0.4.
     */
    function preventBab$2(source) {
      const nativeSetTimeout = window.setTimeout;
      const babRegex = /\.bab_elementid.$/;
      const timeoutWrapper = function timeoutWrapper(callback) {
        if (typeof callback !== 'string' || !babRegex.test(callback)) {
          for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
            args[_key - 1] = arguments[_key];
          }
          return nativeSetTimeout.apply(window, [callback, ...args]);
        }
        hit(source);
      };
      window.setTimeout = timeoutWrapper;
      const signatures = [['blockadblock'], ['babasbm'], [/getItem\('babn'\)/], ['getElementById', 'String.fromCharCode', 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 'charAt', 'DOMContentLoaded', 'AdBlock', 'addEventListener', 'doScroll', 'fromCharCode', '<<2|r>>4', 'sessionStorage', 'clientWidth', 'localStorage', 'Math', 'random']];
      const check = function check(str) {
        if (typeof str !== 'string') {
          return false;
        }
        for (let i = 0; i < signatures.length; i += 1) {
          const tokens = signatures[i];
          let match = 0;
          for (let j = 0; j < tokens.length; j += 1) {
            const token = tokens[j];
            const found = token instanceof RegExp ? token.test(str) : str.includes(token);
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
      const nativeEval = window.eval;
      const evalWrapper = function evalWrapper(str) {
        if (!check(str)) {
          return nativeEval(str);
        }
        hit(source);
        const bodyEl = document.body;
        if (bodyEl) {
          bodyEl.style.removeProperty('visibility');
        }
        const el = document.getElementById('babasbmsgx');
        if (el) {
          el.parentNode.removeChild(el);
        }
      };
      window.eval = evalWrapper.bind(window);
    }
    preventBab$2.names = ['prevent-bab'
    // there is no aliases for this scriptlet
    ];

    preventBab$2.injections = [hit];

    /* eslint-disable no-unused-vars, no-extra-bind, func-names */

    /* eslint-disable max-len */
    /**
     * @scriptlet nowebrtc
     *
     * @description
     * Disables WebRTC by overriding `RTCPeerConnection`.
     * The overridden function will log every attempt to create a new connection.
     *
     * Related UBO scriptlet:
     * https://github.com/gorhill/uBlock/wiki/Resources-Library#nowebrtcjs-
     *
     * ### Syntax
     *
     * ```adblock
     * example.org#%#//scriptlet('nowebrtc')
     * ```
     *
     * @added v1.0.4.
     */
    /* eslint-enable max-len */
    function nowebrtc$1(source) {
      let propertyName = '';
      if (window.RTCPeerConnection) {
        propertyName = 'RTCPeerConnection';
      } else if (window.webkitRTCPeerConnection) {
        propertyName = 'webkitRTCPeerConnection';
      }
      if (propertyName === '') {
        return;
      }
      const rtcReplacement = function rtcReplacement(config) {
        // eslint-disable-next-line max-len
        const message = "Document tried to create an RTCPeerConnection: ".concat(convertRtcConfigToString(config));
        logMessage(source, message);
        hit(source);
      };
      rtcReplacement.prototype = {
        close: noopFunc,
        createDataChannel: noopFunc,
        createOffer: noopFunc,
        setRemoteDescription: noopFunc
      };
      const rtc = window[propertyName];
      window[propertyName] = rtcReplacement;
      if (rtc.prototype) {
        rtc.prototype.createDataChannel = function (a, b) {
          return {
            close: noopFunc,
            send: noopFunc
          };
        }.bind(null);
      }
    }
    nowebrtc$1.names = ['nowebrtc',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'nowebrtc.js', 'ubo-nowebrtc.js', 'ubo-nowebrtc'];
    nowebrtc$1.injections = [hit, noopFunc, logMessage, convertRtcConfigToString];

    /**
     * @scriptlet log-addEventListener
     *
     * @description
     * Logs all addEventListener calls to the console.
     *
     * Related UBO scriptlet:
     * https://github.com/gorhill/uBlock/wiki/Resources-Library#addeventlistener-loggerjs-
     *
     * ### Syntax
     *
     * ```adblock
     * example.org#%#//scriptlet('log-addEventListener')
     * ```
     *
     * @added v1.0.4.
     */
    function logAddEventListener$1(source) {
      const nativeAddEventListener = window.EventTarget.prototype.addEventListener;
      function addEventListenerWrapper(type, listener) {
        var _this$constructor;
        if (validateType(type) && validateListener(listener)) {
          const message = "addEventListener(\"".concat(type, "\", ").concat(listenerToString(listener), ")");
          logMessage(source, message, true);
          hit(source);
        }

        // logging while debugging
        const message = "Invalid event type or listener passed to addEventListener:\ntype: ".concat(convertTypeToString(type), "\nlistener: ").concat(convertTypeToString(listener));
        logMessage(source, message, true);

        // Avoid illegal invocations due to lost context
        // https://github.com/AdguardTeam/Scriptlets/issues/271
        let context = this;
        if (this && ((_this$constructor = this.constructor) === null || _this$constructor === void 0 ? void 0 : _this$constructor.name) === 'Window' && this !== window) {
          context = window;
        }
        for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
          args[_key - 2] = arguments[_key];
        }
        return nativeAddEventListener.apply(context, [type, listener, ...args]);
      }
      const descriptor = {
        configurable: true,
        set: function set() {},
        get: function get() {
          return addEventListenerWrapper;
        }
      };
      // https://github.com/AdguardTeam/Scriptlets/issues/215
      // https://github.com/AdguardTeam/Scriptlets/issues/143
      Object.defineProperty(window.EventTarget.prototype, 'addEventListener', descriptor);
      Object.defineProperty(window, 'addEventListener', descriptor);
      Object.defineProperty(document, 'addEventListener', descriptor);
    }
    logAddEventListener$1.names = ['log-addEventListener',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'addEventListener-logger.js', 'ubo-addEventListener-logger.js', 'aell.js', 'ubo-aell.js', 'ubo-addEventListener-logger', 'ubo-aell'];
    logAddEventListener$1.injections = [hit, validateType, validateListener, listenerToString, convertTypeToString, logMessage, objectToString, isEmptyObject];

    /* eslint-disable no-eval */

    /**
     * @scriptlet log-eval
     *
     * @description
     * Logs all `eval()` or `new Function()` calls to the console.
     *
     * ### Syntax
     *
     * ```adblock
     * example.org#%#//scriptlet('log-eval')
     * ```
     *
     * @added v1.0.4.
     */
    function logEval$1(source) {
      // wrap eval function
      const nativeEval = window.eval;
      function evalWrapper(str) {
        hit(source);
        logMessage(source, "eval(\"".concat(str, "\")"), true);
        return nativeEval(str);
      }
      window.eval = evalWrapper;

      // wrap new Function
      const nativeFunction = window.Function;
      function FunctionWrapper() {
        hit(source);
        for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }
        logMessage(source, "new Function(".concat(args.join(', '), ")"), true);
        return nativeFunction.apply(this, [...args]);
      }
      FunctionWrapper.prototype = Object.create(nativeFunction.prototype);
      FunctionWrapper.prototype.constructor = FunctionWrapper;
      window.Function = FunctionWrapper;
    }
    logEval$1.names = ['log-eval'];
    logEval$1.injections = [hit, logMessage];

    /**
     * @scriptlet log
     *
     * @description
     * A simple scriptlet which only purpose is to print arguments to console.
     * This scriptlet can be helpful for debugging and troubleshooting other scriptlets.
     *
     * ### Examples
     *
     * ```adblock
     * example.org#%#//scriptlet('log', 'arg1', 'arg2')
     * ```
     *
     * @added v1.0.4.
     */
    function log$1() {
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }
      console.log(args); // eslint-disable-line no-console
    }

    log$1.names = ['log'];

    /* eslint-disable no-eval, no-extra-bind */

    /**
     * @scriptlet noeval
     *
     * @description
     * Prevents page to use eval.
     * Notifies about attempts in the console
     *
     * Related UBO scriptlet:
     * https://github.com/gorhill/uBlock/wiki/Resources-Library#noevaljs-
     *
     * It also can be used as `$redirect` rules sometimes.
     * See [redirect description](../wiki/about-redirects.md#noeval).
     *
     * ### Syntax
     *
     * ```adblock
     * example.org#%#//scriptlet('noeval')
     * ```
     *
     * @added v1.0.4.
     */
    function noeval$1(source) {
      window.eval = function evalWrapper(s) {
        hit(source);
        logMessage(source, "AdGuard has prevented eval:\n".concat(s), true);
      }.bind();
    }
    noeval$1.names = ['noeval',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'noeval.js', 'silent-noeval.js', 'ubo-noeval.js', 'ubo-silent-noeval.js', 'ubo-noeval', 'ubo-silent-noeval'];
    noeval$1.injections = [hit, logMessage];

    /* eslint-disable no-eval, no-extra-bind, func-names */

    /**
     * @scriptlet prevent-eval-if
     *
     * @description
     * Prevents page to use eval matching payload.
     *
     * Related UBO scriptlet:
     * https://github.com/gorhill/uBlock/wiki/Resources-Library#noeval-ifjs-
     *
     * ### Syntax
     *
     * ```text
     * example.org#%#//scriptlet('prevent-eval-if'[, search])
     * ```
     *
     * - `search` — optional, string or regular expression matching the stringified eval payload;
     *   defaults to match all stringified eval payloads;
     *   invalid regular expression will cause exit and rule will not work
     *
     * ### Examples
     *
     * ```adblock
     * ! Prevents eval if it matches 'test'
     * example.org#%#//scriptlet('prevent-eval-if', 'test')
     * ```
     *
     * @added v1.0.4.
     */
    function preventEvalIf$1(source, search) {
      const searchRegexp = toRegExp(search);
      const nativeEval = window.eval;
      window.eval = function (payload) {
        if (!searchRegexp.test(payload.toString())) {
          return nativeEval.call(window, payload);
        }
        hit(source);
        return undefined;
      }.bind(window);
    }
    preventEvalIf$1.names = ['prevent-eval-if',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'noeval-if.js', 'ubo-noeval-if.js', 'ubo-noeval-if'];
    preventEvalIf$1.injections = [toRegExp, hit];

    /* eslint-disable func-names, no-multi-assign */

    /**
     * @scriptlet prevent-fab-3.2.0
     *
     * @description
     * Prevents execution of the FAB script v3.2.0.
     *
     * Related UBO scriptlet:
     * https://github.com/gorhill/uBlock/wiki/Resources-Library#fuckadblockjs-320-
     *
     * ### Syntax
     *
     * ```adblock
     * example.org#%#//scriptlet('prevent-fab-3.2.0')
     * ```
     *
     * @added v1.0.4.
     */
    function preventFab$1(source) {
      hit(source);

      // redefines Fab function for adblock detection
      const Fab = function Fab() {};
      Fab.prototype.check = noopFunc;
      Fab.prototype.clearEvent = noopFunc;
      Fab.prototype.emitEvent = noopFunc;
      Fab.prototype.on = function (a, b) {
        if (!a) {
          b();
        }
        return this;
      };
      Fab.prototype.onDetected = noopThis;
      Fab.prototype.onNotDetected = function (a) {
        a();
        return this;
      };
      Fab.prototype.setOption = noopFunc;
      Fab.prototype.options = {
        set: noopFunc,
        get: noopFunc
      };
      const fab = new Fab();
      const getSetFab = {
        get() {
          return Fab;
        },
        set() {}
      };
      const getsetfab = {
        get() {
          return fab;
        },
        set() {}
      };

      // redefined Fab data properties which if 'FuckAdBlock' variable exists
      if (Object.prototype.hasOwnProperty.call(window, 'FuckAdBlock')) {
        window.FuckAdBlock = Fab;
      } else {
        // or redefined Fab accessor properties
        Object.defineProperty(window, 'FuckAdBlock', getSetFab);
      }
      if (Object.prototype.hasOwnProperty.call(window, 'BlockAdBlock')) {
        window.BlockAdBlock = Fab;
      } else {
        Object.defineProperty(window, 'BlockAdBlock', getSetFab);
      }
      if (Object.prototype.hasOwnProperty.call(window, 'SniffAdBlock')) {
        window.SniffAdBlock = Fab;
      } else {
        Object.defineProperty(window, 'SniffAdBlock', getSetFab);
      }
      if (Object.prototype.hasOwnProperty.call(window, 'fuckAdBlock')) {
        window.fuckAdBlock = fab;
      } else {
        Object.defineProperty(window, 'fuckAdBlock', getsetfab);
      }
      if (Object.prototype.hasOwnProperty.call(window, 'blockAdBlock')) {
        window.blockAdBlock = fab;
      } else {
        Object.defineProperty(window, 'blockAdBlock', getsetfab);
      }
      if (Object.prototype.hasOwnProperty.call(window, 'sniffAdBlock')) {
        window.sniffAdBlock = fab;
      } else {
        Object.defineProperty(window, 'sniffAdBlock', getsetfab);
      }
    }
    preventFab$1.names = ['prevent-fab-3.2.0',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'nofab.js', 'ubo-nofab.js', 'fuckadblock.js-3.2.0', 'ubo-fuckadblock.js-3.2.0', 'ubo-nofab'];
    preventFab$1.injections = [hit, noopFunc, noopThis];

    /* eslint-disable func-names, no-multi-assign */

    /**
     * @scriptlet set-popads-dummy
     *
     * @description
     * Sets static properties PopAds and popns.
     *
     * Related UBO scriptlet:
     * https://github.com/gorhill/uBlock/wiki/Resources-Library#popads-dummyjs-
     *
     * ### Syntax
     *
     * ```adblock
     * example.org#%#//scriptlet('set-popads-dummy')
     * ```
     *
     * @added v1.0.4.
     */
    function setPopadsDummy$1(source) {
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
    setPopadsDummy$1.names = ['set-popads-dummy',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'popads-dummy.js', 'ubo-popads-dummy.js', 'ubo-popads-dummy'];
    setPopadsDummy$1.injections = [hit];

    /**
     * @scriptlet prevent-popads-net
     *
     * @description
     * Aborts on property write (PopAds, popns), throws reference error with random id.
     *
     * Related UBO scriptlet:
     * https://github.com/gorhill/uBlock/wiki/Resources-Library#popadsnetjs-
     *
     * ### Syntax
     *
     * ```adblock
     * example.org#%#//scriptlet('prevent-popads-net')
     * ```
     *
     * @added v1.0.4.
     */
    function preventPopadsNet$1(source) {
      const rid = randomId();
      const throwError = function throwError() {
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
    preventPopadsNet$1.names = ['prevent-popads-net',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'popads.net.js', 'ubo-popads.net.js', 'ubo-popads.net'];
    preventPopadsNet$1.injections = [createOnErrorHandler, randomId, hit];

    /* eslint-disable func-names */

    /**
     * @scriptlet prevent-adfly
     *
     * @description
     * Prevents anti-adblock scripts on adfly short links.
     *
     * Related UBO scriptlet:
     * https://github.com/gorhill/uBlock/wiki/Resources-Library#adfly-defuserjs-
     *
     * ### Syntax
     *
     * ```adblock
     * example.org#%#//scriptlet('prevent-adfly')
     * ```
     *
     * @added v1.0.4.
     */
    function preventAdfly$1(source) {
      const isDigit = function isDigit(data) {
        return /^\d$/.test(data);
      };
      const handler = function handler(encodedURL) {
        let evenChars = '';
        let oddChars = '';
        for (let i = 0; i < encodedURL.length; i += 1) {
          if (i % 2 === 0) {
            evenChars += encodedURL.charAt(i);
          } else {
            oddChars = encodedURL.charAt(i) + oddChars;
          }
        }
        let data = (evenChars + oddChars).split('');
        for (let i = 0; i < data.length; i += 1) {
          if (isDigit(data[i])) {
            for (let ii = i + 1; ii < data.length; ii += 1) {
              if (isDigit(data[ii])) {
                // eslint-disable-next-line no-bitwise
                const temp = parseInt(data[i], 10) ^ parseInt(data[ii], 10);
                if (temp < 10) {
                  data[i] = temp.toString();
                }
                i = ii;
                break;
              }
            }
          }
        }
        data = data.join('');
        const decodedURL = window.atob(data).slice(16, -16);
        if (window.stop) {
          window.stop();
        }
        window.onbeforeunload = null;
        window.location.href = decodedURL;
      };
      let val;
      // Do not apply handler more than one time
      let applyHandler = true;
      const result = setPropertyAccess(window, 'ysmm', {
        configurable: false,
        set: function set(value) {
          if (applyHandler) {
            applyHandler = false;
            try {
              if (typeof value === 'string') {
                handler(value);
              }
            } catch (err) {} // eslint-disable-line no-empty
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
        logMessage(source, 'Failed to set up prevent-adfly scriptlet');
      }
    }
    preventAdfly$1.names = ['prevent-adfly',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'adfly-defuser.js', 'ubo-adfly-defuser.js', 'ubo-adfly-defuser'];
    preventAdfly$1.injections = [setPropertyAccess, hit, logMessage];

    /* eslint-disable max-len */
    /**
     * @scriptlet debug-on-property-read
     *
     * @description
     * This scriptlet is basically the same as [abort-on-property-read](#abort-on-property-read),
     * but instead of aborting it starts the debugger.
     *
     * > It is not allowed for prod versions of filter lists.
     *
     * ### Examples
     *
     * ```adblock
     * ! Debug script if it tries to access `window.alert`
     * example.org#%#//scriptlet('debug-on-property-read', 'alert')
     *
     * ! or `window.open`
     * example.org#%#//scriptlet('debug-on-property-read', 'open')
     * ```
     *
     * @added v1.0.4.
     */
    /* eslint-enable max-len */
    function debugOnPropertyRead$1(source, property) {
      if (!property) {
        return;
      }
      const rid = randomId();
      const abort = function abort() {
        hit(source);
        debugger; // eslint-disable-line no-debugger
      };

      const setChainPropAccess = function setChainPropAccess(owner, property) {
        const chainInfo = getPropertyInChain(owner, property);
        let base = chainInfo.base;
        const prop = chainInfo.prop,
          chain = chainInfo.chain;
        if (chain) {
          const setter = function setter(a) {
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
          set: noopFunc
        });
      };
      setChainPropAccess(window, property);
      window.onerror = createOnErrorHandler(rid).bind();
    }
    debugOnPropertyRead$1.names = ['debug-on-property-read'];
    debugOnPropertyRead$1.injections = [randomId, setPropertyAccess, getPropertyInChain, createOnErrorHandler, hit, noopFunc, isEmptyObject];

    /* eslint-disable max-len */
    /**
     * @scriptlet debug-on-property-write
     *
     * @description
     * This scriptlet is basically the same as [abort-on-property-write](#abort-on-property-write),
     * but instead of aborting it starts the debugger.
     *
     * > It is not allowed for prod versions of filter lists.
     *
     * ### Examples
     *
     * ```adblock
     * ! Aborts script when it tries to write in property `window.test`
     * example.org#%#//scriptlet('debug-on-property-write', 'test')
     * ```
     *
     * @added v1.0.4.
     */
    /* eslint-enable max-len */
    function debugOnPropertyWrite$1(source, property) {
      if (!property) {
        return;
      }
      const rid = randomId();
      const abort = function abort() {
        hit(source);
        debugger; // eslint-disable-line no-debugger
      };

      const setChainPropAccess = function setChainPropAccess(owner, property) {
        const chainInfo = getPropertyInChain(owner, property);
        let base = chainInfo.base;
        const prop = chainInfo.prop,
          chain = chainInfo.chain;
        if (chain) {
          const setter = function setter(a) {
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
    debugOnPropertyWrite$1.names = ['debug-on-property-write'];
    debugOnPropertyWrite$1.injections = [randomId, setPropertyAccess, getPropertyInChain, createOnErrorHandler, hit, isEmptyObject];

    /* eslint-disable max-len */
    /**
     * @scriptlet debug-current-inline-script
     *
     * @description
     * This scriptlet is basically the same as [abort-current-inline-script](#abort-current-inline-script),
     * but instead of aborting it starts the debugger.
     *
     * > It is not allowed for prod versions of filter lists.
     *
     * ### Examples
     *
     * ```adblock
     * ! Aborts script when it tries to access `window.alert`
     * example.org#%#//scriptlet('debug-current-inline-script', 'alert')
     * ```
     *
     * @added v1.0.4.
     */
    /* eslint-enable max-len */
    function debugCurrentInlineScript$1(source, property, search) {
      const searchRegexp = toRegExp(search);
      const rid = randomId();
      const getCurrentScript = function getCurrentScript() {
        if ('currentScript' in document) {
          return document.currentScript;
        }
        const scripts = document.getElementsByTagName('script');
        return scripts[scripts.length - 1];
      };
      const ourScript = getCurrentScript();
      const abort = function abort() {
        const scriptEl = getCurrentScript();
        if (!scriptEl) {
          return;
        }
        let content = scriptEl.textContent;

        // We are using Node.prototype.textContent property descriptor
        // to get the real script content
        // even when document.currentScript.textContent is replaced.
        // https://github.com/AdguardTeam/Scriptlets/issues/57#issuecomment-593638991
        try {
          const textContentGetter = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent').get;
          content = textContentGetter.call(scriptEl);
        } catch (e) {} // eslint-disable-line no-empty

        if (scriptEl instanceof HTMLScriptElement && content.length > 0 && scriptEl !== ourScript && searchRegexp.test(content)) {
          hit(source);
          debugger; // eslint-disable-line no-debugger
        }
      };

      const setChainPropAccess = function setChainPropAccess(owner, property) {
        const chainInfo = getPropertyInChain(owner, property);
        let base = chainInfo.base;
        const prop = chainInfo.prop,
          chain = chainInfo.chain;

        // The scriptlet might be executed before the chain property has been created
        // (for instance, document.body before the HTML body was loaded).
        // In this case we're checking whether the base element exists or not
        // and if not, we simply exit without overriding anything.
        // e.g. https://github.com/AdguardTeam/Scriptlets/issues/57#issuecomment-575841092
        if (base instanceof Object === false && base === null) {
          const props = property.split('.');
          const propIndex = props.indexOf(prop);
          const baseName = props[propIndex - 1];
          const message = "The scriptlet had been executed before the ".concat(baseName, " was loaded.");
          logMessage(message, source.verbose);
          return;
        }
        if (chain) {
          const setter = function setter(a) {
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
        let currentValue = base[prop];
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
    debugCurrentInlineScript$1.names = ['debug-current-inline-script'];
    debugCurrentInlineScript$1.injections = [randomId, setPropertyAccess, getPropertyInChain, toRegExp, createOnErrorHandler, hit, logMessage, isEmptyObject];

    /* eslint-disable max-len */
    /**
     * @scriptlet remove-attr
     *
     * @description
     * Removes the specified attributes from DOM nodes. This scriptlet runs once when the page loads
     * and after that periodically in order to DOM tree changes by default,
     * or as specified by applying argument.
     *
     * Related UBO scriptlet:
     * https://github.com/gorhill/uBlock/wiki/Resources-Library#remove-attrjs-
     *
     * ### Syntax
     *
     * ```text
     * example.org#%#//scriptlet('remove-attr', attrs[, selector, applying])
     * ```
     *
     * - `attrs` — required, attribute or list of attributes joined by '|'
     * - `selector` — optional, CSS selector, specifies DOM nodes from which the attributes will be removed
     * - `applying` — optional, one or more space-separated flags that describe the way scriptlet apply,
     *   defaults to 'asap stay'; possible flags:
     *     - `asap` — runs as fast as possible **once**
     *     - `complete` — runs **once** after the whole page has been loaded
     *     - `stay` — as fast as possible **and** stays on the page observing possible DOM changes
     *
     * ### Examples
     *
     * 1. Removes by attribute
     *
     *     ```adblock
     *     example.org#%#//scriptlet('remove-attr', 'example|test')
     *     ```
     *
     *     ```html
     *     <!-- before -->
     *     <div example="true" test="true">Some text</div>
     *
     *     <!-- after -->
     *     <div>Some text</div>
     *     ```
     *
     * 1. Removes with specified selector
     *
     *     ```adblock
     *     example.org#%#//scriptlet('remove-attr', 'example', 'div[class="inner"]')
     *     ```
     *
     *     ```html
     *     <!-- before -->
     *     <div class="wrapper" example="true">
     *         <div class="inner" example="true">Some text</div>
     *     </div>
     *
     *     <!-- after -->
     *     <div class="wrapper" example="true">
     *         <div class="inner">Some text</div>
     *     </div>
     *     ```
     *
     * 1. Using flags
     *
     *     ```adblock
     *     example.org#%#//scriptlet('remove-attr', 'example', 'html', 'asap complete')
     *     ```
     *
     * @added v1.0.4.
     */
    /* eslint-enable max-len */
    function removeAttr$1(source, attrs, selector) {
      let applying = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'asap stay';
      if (!attrs) {
        return;
      }
      attrs = attrs.split(/\s*\|\s*/);
      if (!selector) {
        selector = "[".concat(attrs.join('],['), "]");
      }
      const rmattr = function rmattr() {
        let nodes = [];
        try {
          nodes = [].slice.call(document.querySelectorAll(selector));
        } catch (e) {
          logMessage(source, "Invalid selector arg: '".concat(selector, "'"));
        }
        let removed = false;
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
      const flags = parseFlags(applying);
      const run = function run() {
        rmattr();
        if (!flags.hasFlag(flags.STAY)) {
          return;
        }
        // 'true' for observing attributes
        observeDOMChanges(rmattr, true);
      };
      if (flags.hasFlag(flags.ASAP)) {
        // https://github.com/AdguardTeam/Scriptlets/issues/245
        // Call rmattr on DOM content loaded
        // to ensure that target node is present on the page
        if (document.readyState === 'loading') {
          window.addEventListener('DOMContentLoaded', rmattr, {
            once: true
          });
        } else {
          rmattr();
        }
      }
      if (document.readyState !== 'complete' && flags.hasFlag(flags.COMPLETE)) {
        window.addEventListener('load', run, {
          once: true
        });
      } else if (flags.hasFlag(flags.STAY)) {
        // Only call rmattr for single 'stay' flag
        if (!applying.includes(' ')) {
          rmattr();
        }
        // 'true' for observing attributes
        observeDOMChanges(rmattr, true);
      }
    }
    removeAttr$1.names = ['remove-attr',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'remove-attr.js', 'ubo-remove-attr.js', 'ra.js', 'ubo-ra.js', 'ubo-remove-attr', 'ubo-ra'];
    removeAttr$1.injections = [hit, observeDOMChanges, parseFlags, logMessage,
    // following helpers should be imported and injected
    // because they are used by helpers above
    throttle];

    /* eslint-disable max-len */
    /**
     * @scriptlet set-attr
     *
     * @description
     * Sets the specified attribute on the specified elements. This scriptlet runs once when the page loads
     * and after that and after that on DOM tree changes.
     *
     * ### Syntax
     *
     * ```text
     * example.org#%#//scriptlet('set-attr', selector, attr[, value])
     * ```
     *
     * - `selector` — required, CSS selector, specifies DOM nodes to set attributes on
     * - `attr` — required, attribute to be set
     * - `value` — the value to assign to the attribute, defaults to ''. Possible values:
     *     - `''` — empty string
     *     - positive decimal integer `<= 32767`
     *     - `true` / `false` in any case variation
     *
     * ### Examples
     *
     * 1. Set attribute by selector
     *
     *     ```adblock
     *     example.org#%#//scriptlet('set-attr', 'div.class > a.class', 'test-attribute', '0')
     *     ```
     *
     *     ```html
     *     <!-- before -->
     *     <a class="class">Some text</div>
     *
     *     <!-- after -->
     *     <a class="class" test-attribute="0">Some text</div>
     *     ```
     *
     * 1. Set attribute without value
     *
     *     ```adblock
     *     example.org#%#//scriptlet('set-attr', 'div.class > a.class', 'test-attribute')
     *     ```
     *
     *     ```html
     *     <!-- before -->
     *     <a class="class">Some text</div>
     *
     *     <!-- after -->
     *     <a class="class" test-attribute>Some text</div>
     *     ```
     *
     * 1. Set attribute value to `TRUE`
     *
     *     ```adblock
     *     example.org#%#//scriptlet('set-attr', 'div.class > a.class', 'test-attribute', 'TRUE')
     *     ```
     *
     *     ```html
     *     <!-- before -->
     *     <a class="class">Some text</div>
     *
     *     <!-- after -->
     *     <a class="class" test-attribute="TRUE">Some text</div>
     *     ```
     *
     * 1. Set attribute value to `fAlse`
     *
     *     ```adblock
     *     example.org#%#//scriptlet('set-attr', 'div.class > a.class', 'test-attribute', 'fAlse')
     *     ```
     *
     *     ```html
     *     <!-- before -->
     *     <a class="class">Some text</div>
     *
     *     <!-- after -->
     *     <a class="class" test-attribute="fAlse">Some text</div>
     *     ```
     *
     * @added v1.5.0.
     */
    /* eslint-enable max-len */
    function setAttr$1(source, selector, attr) {
      let value = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : '';
      if (!selector || !attr) {
        return;
      }
      const allowedValues = ['true', 'false'];

      // Drop strings that cant be parsed into number, negative numbers and numbers below 32767
      if (value.length !== 0 && (nativeIsNaN(parseInt(value, 10)) || parseInt(value, 10) < 0 || parseInt(value, 10) > 32767) && !allowedValues.includes(value.toLowerCase())) {
        return;
      }
      const setAttr = function setAttr() {
        const nodes = [].slice.call(document.querySelectorAll(selector));
        let set = false;
        nodes.forEach(function (node) {
          node.setAttribute(attr, value);
          set = true;
        });
        if (set) {
          hit(source);
        }
      };
      setAttr();
      observeDOMChanges(setAttr, true);
    }
    setAttr$1.names = ['set-attr'];
    setAttr$1.injections = [hit, observeDOMChanges, nativeIsNaN,
    // following helpers should be imported and injected
    // because they are used by helpers above
    throttle];

    /* eslint-disable max-len */
    /**
     * @scriptlet remove-class
     *
     * @description
     * Removes the specified classes from DOM nodes. This scriptlet runs once after the page loads
     * and after that periodically in order to DOM tree changes.
     *
     * Related UBO scriptlet:
     * https://github.com/gorhill/uBlock/wiki/Resources-Library#remove-classjs-
     *
     * ### Syntax
     *
     * ```text
     * example.org#%#//scriptlet('remove-class', classes[, selector, applying])
     * ```
     *
     * - `classes` — required, class or list of classes separated by '|'
     * - `selector` — optional, CSS selector, specifies DOM nodes from which the classes will be removed.
     *   If there is no `selector`, each class of `classes` independently will be removed from all nodes which has one
     * - `applying` — optional, one or more space-separated flags that describe the way scriptlet apply,
     *   defaults to 'asap stay'; possible flags:
     *     - `asap` — runs as fast as possible **once**
     *     - `complete` — runs **once** after the whole page has been loaded
     *     - `stay` — as fast as possible **and** stays on the page observing possible DOM changes
     *
     * ### Examples
     *
     * 1. Removes by classes
     *
     *     ```adblock
     *     example.org#%#//scriptlet('remove-class', 'example|test')
     *     ```
     *
     *     ```html
     *     <!-- before -->
     *     <div id="first" class="nice test">Some text</div>
     *     <div id="second" class="rare example for test">Some text</div>
     *     <div id="third" class="testing better example">Some text</div>
     *
     *     <!-- after -->
     *     <div id="first" class="nice">Some text</div>
     *     <div id="second" class="rare for">Some text</div>
     *     <div id="third" class="testing better">Some text</div>
     *     ```
     *
     * 1. Removes with specified selector
     *
     *     ```adblock
     *     example.org#%#//scriptlet('remove-class', 'branding', 'div[class^="inner"]')
     *     ```
     *
     *     ```html
     *     <!-- before -->
     *     <div class="wrapper true branding">
     *         <div class="inner bad branding">Some text</div>
     *     </div>
     *
     *     <!-- after -->
     *     <div class="wrapper true branding">
     *         <div class="inner bad">Some text</div>
     *     </div>
     *     ```
     *
     * 1. Using flags
     *
     *     ```adblock
     *     example.org#%#//scriptlet('remove-class', 'branding', 'div[class^="inner"]', 'asap complete')
     *     ```
     *
     * @added v1.1.1.
     */
    /* eslint-enable max-len */

    function removeClass$1(source, classNames, selector) {
      let applying = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'asap stay';
      if (!classNames) {
        return;
      }
      classNames = classNames.split(/\s*\|\s*/);
      let selectors = [];
      if (!selector) {
        selectors = classNames.map(function (className) {
          return ".".concat(className);
        });
      }
      const removeClassHandler = function removeClassHandler() {
        const nodes = new Set();
        if (selector) {
          let foundNodes = [];
          try {
            foundNodes = [].slice.call(document.querySelectorAll(selector));
          } catch (e) {
            logMessage(source, "Invalid selector arg: '".concat(selector, "'"));
          }
          foundNodes.forEach(function (n) {
            return nodes.add(n);
          });
        } else if (selectors.length > 0) {
          selectors.forEach(function (s) {
            const elements = document.querySelectorAll(s);
            for (let i = 0; i < elements.length; i += 1) {
              const element = elements[i];
              nodes.add(element);
            }
          });
        }
        let removed = false;
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
      const CLASS_ATTR_NAME = ['class'];
      const flags = parseFlags(applying);
      const run = function run() {
        removeClassHandler();
        if (!flags.hasFlag(flags.STAY)) {
          return;
        }
        // 'true' for observing attributes
        // 'class' for observing only classes
        observeDOMChanges(removeClassHandler, true, CLASS_ATTR_NAME);
      };
      if (flags.hasFlag(flags.ASAP)) {
        // https://github.com/AdguardTeam/Scriptlets/issues/245
        // Call removeClassHandler on DOM content loaded
        // to ensure that target node is present on the page
        if (document.readyState === 'loading') {
          window.addEventListener('DOMContentLoaded', removeClassHandler, {
            once: true
          });
        } else {
          removeClassHandler();
        }
      }
      if (document.readyState !== 'complete' && flags.hasFlag(flags.COMPLETE)) {
        window.addEventListener('load', run, {
          once: true
        });
      } else if (flags.hasFlag(flags.STAY)) {
        // Only call removeClassHandler for single 'stay' flag
        if (!applying.includes(' ')) {
          removeClassHandler();
        }
        observeDOMChanges(removeClassHandler, true, CLASS_ATTR_NAME);
      }
    }
    removeClass$1.names = ['remove-class',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'remove-class.js', 'ubo-remove-class.js', 'rc.js', 'ubo-rc.js', 'ubo-remove-class', 'ubo-rc'];
    removeClass$1.injections = [hit, logMessage, observeDOMChanges, parseFlags,
    // following helpers should be imported and injected
    // because they are used by helpers above
    throttle];

    /**
     * @scriptlet disable-newtab-links
     *
     * @description
     * Prevents opening new tabs and windows if there is `target` attribute in element.
     *
     * Related UBO scriptlet:
     * https://github.com/gorhill/uBlock/wiki/Resources-Library#disable-newtab-linksjs-
     *
     * ### Syntax
     *
     * ```adblock
     * example.org#%#//scriptlet('disable-newtab-links')
     * ```
     *
     * @added v1.0.4.
     */
    function disableNewtabLinks$1(source) {
      document.addEventListener('click', function (ev) {
        let target = ev.target;
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
    disableNewtabLinks$1.names = ['disable-newtab-links',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'disable-newtab-links.js', 'ubo-disable-newtab-links.js', 'ubo-disable-newtab-links'];
    disableNewtabLinks$1.injections = [hit];

    /* eslint-disable max-len */
    /**
     * @scriptlet adjust-setInterval
     *
     * @description
     * Adjusts delay for specified setInterval() callbacks.
     *
     * Related UBO scriptlet:
     * https://github.com/gorhill/uBlock/wiki/Resources-Library#nano-setinterval-boosterjs-
     *
     * ### Syntax
     *
     * ```text
     * example.org#%#//scriptlet('adjust-setInterval'[, matchCallback [, matchDelay[, boost]]])
     * ```
     *
     * - `matchCallback` — optional, string or regular expression for stringified callback matching;
     *   defaults to match all callbacks; invalid regular expression will cause exit and rule will not work
     * - `matchDelay` — optional, defaults to 1000, matching setInterval delay; decimal integer OR '*' for any delay
     * - `boost` — optional, default to 0.05, float,
     *   capped at 1000 times for up and 50 for down (0.001...50), setInterval delay multiplier
     *
     * ### Examples
     *
     * 1. Adjust all setInterval() x20 times where delay equal 1000ms
     *
     *     ```adblock
     *     example.org#%#//scriptlet('adjust-setInterval')
     *     ```
     *
     * 1. Adjust all setInterval() x20 times where callback matched with `example` and delay equal 1000ms
     *
     *     ```adblock
     *     example.org#%#//scriptlet('adjust-setInterval', 'example')
     *     ```
     *
     * 1. Adjust all setInterval() x20 times where callback matched with `example` and delay equal 400ms
     *
     *     ```adblock
     *     example.org#%#//scriptlet('adjust-setInterval', 'example', '400')
     *     ```
     *
     * 1. Slow down setInterval() x2 times where callback matched with `example` and delay equal 1000ms
     *
     *     ```adblock
     *     example.org#%#//scriptlet('adjust-setInterval', 'example', '', '2')
     *     ```
     *
     * 1. Adjust all setInterval() x50 times where delay equal 2000ms
     *
     *     ```adblock
     *     example.org#%#//scriptlet('adjust-setInterval', '', '2000', '0.02')
     *     ```
     *
     * 1. Adjust all setInterval() x1000 times where delay equal 2000ms
     *
     *     ```adblock
     *     example.org#%#//scriptlet('adjust-setInterval', '', '2000', '0.001')
     *     ```
     *
     * 1. Adjust all setInterval() x50 times where delay is randomized
     *
     *     ```adblock
     *     example.org#%#//scriptlet('adjust-setInterval', '', '*', '0.02')
     *     ```
     *
     * @added v1.0.4.
     */
    /* eslint-enable max-len */
    function adjustSetInterval$1(source, matchCallback, matchDelay, boost) {
      const nativeSetInterval = window.setInterval;
      const matchRegexp = toRegExp(matchCallback);
      const intervalWrapper = function intervalWrapper(callback, delay) {
        // https://github.com/AdguardTeam/Scriptlets/issues/221
        if (!isValidCallback(callback)) {
          // eslint-disable-next-line max-len
          const message = "Scriptlet can't be applied because of invalid callback: '".concat(String(callback), "'");
          logMessage(source, message);
        } else if (matchRegexp.test(callback.toString()) && isDelayMatched(matchDelay, delay)) {
          delay *= getBoostMultiplier(boost);
          hit(source);
        }
        for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
          args[_key - 2] = arguments[_key];
        }
        return nativeSetInterval.apply(window, [callback, delay, ...args]);
      };
      window.setInterval = intervalWrapper;
    }
    adjustSetInterval$1.names = ['adjust-setInterval',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'nano-setInterval-booster.js', 'ubo-nano-setInterval-booster.js', 'nano-sib.js', 'ubo-nano-sib.js', 'ubo-nano-setInterval-booster', 'ubo-nano-sib'];
    adjustSetInterval$1.injections = [hit, isValidCallback, toRegExp, getBoostMultiplier, isDelayMatched, logMessage,
    // following helpers should be injected as helpers above use them
    nativeIsNaN, nativeIsFinite, getMatchDelay, shouldMatchAnyDelay];

    /* eslint-disable max-len */
    /**
     * @scriptlet adjust-setTimeout
     *
     * @description
     * Adjusts delay for specified setTimeout() callbacks.
     *
     * Related UBO scriptlet:
     * https://github.com/gorhill/uBlock/wiki/Resources-Library#nano-settimeout-boosterjs-
     *
     * ### Syntax
     *
     * ```text
     * example.org#%#//scriptlet('adjust-setTimeout'[, matchCallback [, matchDelay[, boost]]])
     * ```
     *
     * - `matchCallback` — optional, string or regular expression for stringified callback matching;
     *   defaults to match all callbacks; invalid regular expression will cause exit and rule will not work
     * - `matchDelay` — optional, defaults to 1000, matching setTimeout delay; decimal integer OR '*' for any delay
     * - `boost` — optional, default to 0.05, float,
     *   capped at 1000 times for up and 50 for down (0.001...50), setTimeout delay multiplier
     *
     * ### Examples
     *
     * 1. Adjust all setTimeout() x20 times where timeout equal 1000ms
     *
     *     ```adblock
     *     example.org#%#//scriptlet('adjust-setTimeout')
     *     ```
     *
     * 1. Adjust all setTimeout() x20 times where callback matched with `example` and timeout equal 1000ms
     *
     *     ```adblock
     *     example.org#%#//scriptlet('adjust-setTimeout', 'example')
     *     ```
     *
     * 1. Adjust all setTimeout() x20 times where callback matched with `example` and timeout equal 400ms
     *
     *     ```adblock
     *     example.org#%#//scriptlet('adjust-setTimeout', 'example', '400')
     *     ```
     *
     * 1. Slow down setTimeout() x2 times where callback matched with `example` and timeout equal 1000ms
     *
     *     ```adblock
     *     example.org#%#//scriptlet('adjust-setTimeout', 'example', '', '2')
     *     ```
     *
     * 1. Adjust all setTimeout() x50 times where timeout equal 2000ms
     *
     *     ```adblock
     *     example.org#%#//scriptlet('adjust-setTimeout', '', '2000', '0.02')
     *     ```
     *
     * 1. Adjust all setTimeout() x1000 times where timeout equal 2000ms
     *
     *     ```adblock
     *     example.org#%#//scriptlet('adjust-setTimeout', '', '2000', '0.001')
     *     ```
     *
     * 1. Adjust all setTimeout() x20 times where callback matched with `test` and timeout is randomized
     *
     *     ```adblock
     *     example.org#%#//scriptlet('adjust-setTimeout', 'test', '*')
     *     ```
     *
     * @added v1.0.4.
     */
    /* eslint-enable max-len */
    function adjustSetTimeout$1(source, matchCallback, matchDelay, boost) {
      const nativeSetTimeout = window.setTimeout;
      const matchRegexp = toRegExp(matchCallback);
      const timeoutWrapper = function timeoutWrapper(callback, delay) {
        // https://github.com/AdguardTeam/Scriptlets/issues/221
        if (!isValidCallback(callback)) {
          // eslint-disable-next-line max-len
          const message = "Scriptlet can't be applied because of invalid callback: '".concat(String(callback), "'");
          logMessage(source, message);
        } else if (matchRegexp.test(callback.toString()) && isDelayMatched(matchDelay, delay)) {
          delay *= getBoostMultiplier(boost);
          hit(source);
        }
        for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
          args[_key - 2] = arguments[_key];
        }
        return nativeSetTimeout.apply(window, [callback, delay, ...args]);
      };
      window.setTimeout = timeoutWrapper;
    }
    adjustSetTimeout$1.names = ['adjust-setTimeout',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'nano-setTimeout-booster.js', 'ubo-nano-setTimeout-booster.js', 'nano-stb.js', 'ubo-nano-stb.js', 'ubo-nano-setTimeout-booster', 'ubo-nano-stb'];
    adjustSetTimeout$1.injections = [hit, isValidCallback, toRegExp, getBoostMultiplier, isDelayMatched, logMessage,
    // following helpers should be injected as helpers above use them
    nativeIsNaN, nativeIsFinite, getMatchDelay, shouldMatchAnyDelay];

    /* eslint-disable max-len */
    /**
     * @scriptlet dir-string
     *
     * @description
     * Wraps the `console.dir` API to call the `toString` method of the argument.
     * There are several adblock circumvention systems that detect browser devtools
     * and hide themselves. Therefore, if we force them to think
     * that devtools are open (using this scriptlet),
     * it will automatically disable the adblock circumvention script.
     *
     * ### Syntax
     *
     * ```text
     * example.org#%#//scriptlet('dir-string'[, times])
     * ```
     *
     * - `times` — optional, the number of times to call the `toString` method of the argument to `console.dir`
     *
     * ### Examples
     *
     * ```adblock
     * ! Run 2 times
     * example.org#%#//scriptlet('dir-string', '2')
     * ```
     *
     * @added v1.0.4.
     */
    /* eslint-enable max-len */
    function dirString$1(source, times) {
      const _console = console,
        dir = _console.dir;
      function dirWrapper(object) {
        if (typeof dir === 'function') {
          dir.call(this, object);
        }
        hit(source);
      }
      // eslint-disable-next-line no-console
      console.dir = dirWrapper;
    }
    dirString$1.names = ['dir-string'];
    dirString$1.injections = [hit];

    /* eslint-disable max-len */
    /**
     * @scriptlet json-prune
     *
     * @description
     * Removes specified properties from the result of calling JSON.parse and returns the caller.
     *
     * Related UBO scriptlet:
     * https://github.com/gorhill/uBlock/wiki/Resources-Library#json-prunejs-
     *
     * Related ABP source:
     * https://gitlab.com/eyeo/snippets/-/blob/main/source/behavioral/json-prune.js
     *
     * ### Syntax
     *
     * ```text
     * example.org#%#//scriptlet('json-prune'[, propsToRemove [, obligatoryProps [, stack]]])
     * ```
     *
     * - `propsToRemove` — optional, string of space-separated properties to remove
     * - `obligatoryProps` — optional, string of space-separated properties
     *   which must be all present for the pruning to occur
     * - `stack` — optional, string or regular expression that must match the current function call stack trace;
     *   if regular expression is invalid it will be skipped
     *
     * > Note please that you can use wildcard `*` for chain property name,
     * > e.g. `ad.*.src` instead of `ad.0.src ad.1.src ad.2.src`.
     *
     * ### Examples
     *
     * 1. Removes property `example` from the results of JSON.parse call
     *
     *     ```adblock
     *     example.org#%#//scriptlet('json-prune', 'example')
     *     ```
     *
     *     For instance, the following call will return `{ one: 1}`
     *
     *     ```html
     *     JSON.parse('{"one":1,"example":true}')
     *     ```
     *
     * 1. If there are no specified properties in the result of JSON.parse call, pruning will NOT occur
     *
     *     ```adblock
     *     example.org#%#//scriptlet('json-prune', 'one', 'obligatoryProp')
     *     ```
     *
     *     For instance, the following call will return `{ one: 1, two: 2}`
     *
     *     ```html
     *     JSON.parse('{"one":1,"two":2}')
     *     ```
     *
     * 1. A property in a list of properties can be a chain of properties
     *
     *     ```adblock
     *     example.org#%#//scriptlet('json-prune', 'a.b', 'ads.url.first')
     *     ```
     *
     * 1. Removes property `content.ad` from the results of JSON.parse call if its error stack trace contains `test.js`
     *
     *     ```adblock
     *     example.org#%#//scriptlet('json-prune', 'content.ad', '', 'test.js')
     *     ```
     *
     * 1. A property in a list of properties can be a chain of properties with wildcard in it
     *
     *     ```adblock
     *     example.org#%#//scriptlet('json-prune', 'content.*.media.src', 'content.*.media.ad')
     *     ```
     *
     * 1. Call with no arguments will log the current hostname and json payload at the console
     *
     *     ```adblock
     *     example.org#%#//scriptlet('json-prune')
     *     ```
     *
     * 1. Call with only second argument will log the current hostname and matched json payload at the console
     *
     *     ```adblock
     *     example.org#%#//scriptlet('json-prune', '', '"id":"117458"')
     *     ```
     *
     * @added v1.1.0.
     */
    /* eslint-enable max-len */
    function jsonPrune$1(source, propsToRemove, requiredInitialProps, stack) {
      if (!!stack && !matchStackTrace(stack, new Error().stack)) {
        return;
      }
      const prunePaths = propsToRemove !== undefined && propsToRemove !== '' ? propsToRemove.split(/ +/) : [];
      const requiredPaths = requiredInitialProps !== undefined && requiredInitialProps !== '' ? requiredInitialProps.split(/ +/) : [];
      const nativeJSONParse = JSON.parse;
      const jsonParseWrapper = function jsonParseWrapper() {
        for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }
        // dealing with stringified json in args, which should be parsed.
        // so we call nativeJSONParse as JSON.parse which is bound to JSON object
        const root = nativeJSONParse.apply(JSON, args);
        return jsonPruner(source, root, prunePaths, requiredPaths);
      };

      // JSON.parse mocking
      jsonParseWrapper.toString = nativeJSONParse.toString.bind(nativeJSONParse);
      JSON.parse = jsonParseWrapper;
      const nativeResponseJson = Response.prototype.json;
      // eslint-disable-next-line func-names
      const responseJsonWrapper = function responseJsonWrapper() {
        const promise = nativeResponseJson.apply(this);
        return promise.then(function (obj) {
          return jsonPruner(source, obj, prunePaths, requiredPaths);
        });
      };

      // do nothing if browser does not support Response (e.g. Internet Explorer)
      // https://developer.mozilla.org/en-US/docs/Web/API/Response
      if (typeof Response === 'undefined') {
        return;
      }
      Response.prototype.json = responseJsonWrapper;
    }
    jsonPrune$1.names = ['json-prune',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'json-prune.js', 'ubo-json-prune.js', 'ubo-json-prune', 'abp-json-prune'];
    jsonPrune$1.injections = [hit, matchStackTrace, getWildcardPropertyInChain, logMessage, isPruningNeeded, jsonPruner,
    // following helpers are needed for helpers above
    toRegExp, getNativeRegexpTest, shouldAbortInlineOrInjectedScript];

    /* eslint-disable max-len */
    /**
     * @scriptlet prevent-requestAnimationFrame
     *
     * @description
     * Prevents a `requestAnimationFrame` call
     * if the text of the callback is matching the specified search string which does not start with `!`;
     * otherwise mismatched calls should be defused.
     *
     * Related UBO scriptlet:
     * https://github.com/gorhill/uBlock/wiki/Resources-Library#no-requestanimationframe-ifjs-
     *
     * ### Syntax
     *
     * ```text
     * example.org#%#//scriptlet('prevent-requestAnimationFrame'[, search])
     * ```
     *
     * - `search` — optional, string or regular expression;
     *   invalid regular expression will be skipped and all callbacks will be matched.
     *   If starts with `!`, scriptlet will not match the stringified callback but all other will be defused.
     *   If do not start with `!`, the stringified callback will be matched.
     *
     * > Call with no argument will log all requestAnimationFrame calls,
     * > it may be useful for debugging but it is not allowed for prod versions of filter lists.
     *
     * ### Examples
     *
     * 1. Prevents `requestAnimationFrame` calls if the callback matches `/\.test/`
     *
     *     ```adblock
     *     example.org#%#//scriptlet('prevent-requestAnimationFrame', '/\.test/')
     *     ```
     *
     *     For instance, the following call will be prevented:
     *
     *     ```javascript
     *     var times = 0;
     *     requestAnimationFrame(function change() {
     *         window.test = 'new value';
     *         if (times < 2) {
     *             times += 1;
     *             requestAnimationFrame(change);
     *         }
     *     });
     *     ```
     *
     * 1. Prevents `requestAnimationFrame` calls if **does not match** 'check'
     *
     *     ```adblock
     *     example.org#%#//scriptlet('prevent-requestAnimationFrame', '!check')
     *     ```
     *
     *     For instance, only the first call will be prevented:
     *
     *     ```javascript
     *     var timesFirst = 0;
     *     requestAnimationFrame(function changeFirst() {
     *         window.check = 'should not be prevented';
     *         if (timesFirst < 2) {
     *             timesFirst += 1;
     *             requestAnimationFrame(changeFirst);
     *         }
     *     });
     *
     *     var timesSecond = 0;
     *     requestAnimationFrame(function changeSecond() {
     *         window.second = 'should be prevented';
     *         if (timesSecond < 2) {
     *             timesSecond += 1;
     *             requestAnimationFrame(changeSecond);
     *         }
     *     });
     *     ```
     *
     * @added v1.1.15.
     */
    /* eslint-enable max-len */

    function preventRequestAnimationFrame$1(source, match) {
      const nativeRequestAnimationFrame = window.requestAnimationFrame;

      // logs requestAnimationFrame to console if no arguments have been specified
      const shouldLog = typeof match === 'undefined';
      const _parseMatchArg = parseMatchArg(match),
        isInvertedMatch = _parseMatchArg.isInvertedMatch,
        matchRegexp = _parseMatchArg.matchRegexp;
      const rafWrapper = function rafWrapper(callback) {
        let shouldPrevent = false;
        if (shouldLog) {
          hit(source);
          logMessage(source, "requestAnimationFrame(".concat(String(callback), ")"), true);
        } else if (isValidCallback(callback) && isValidStrPattern(match)) {
          shouldPrevent = matchRegexp.test(callback.toString()) !== isInvertedMatch;
        }
        if (shouldPrevent) {
          hit(source);
          return nativeRequestAnimationFrame(noopFunc);
        }
        for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
          args[_key - 1] = arguments[_key];
        }
        return nativeRequestAnimationFrame.apply(window, [callback, ...args]);
      };
      window.requestAnimationFrame = rafWrapper;
    }
    preventRequestAnimationFrame$1.names = ['prevent-requestAnimationFrame',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'no-requestAnimationFrame-if.js', 'ubo-no-requestAnimationFrame-if.js', 'norafif.js', 'ubo-norafif.js', 'ubo-no-requestAnimationFrame-if', 'ubo-norafif'];
    preventRequestAnimationFrame$1.injections = [hit, noopFunc, parseMatchArg, isValidStrPattern, isValidCallback, logMessage,
    // following helpers should be injected as helpers above use them
    escapeRegExp, toRegExp];

    /* eslint-disable max-len */
    /**
     * @scriptlet set-cookie
     *
     * @description
     * Sets a cookie with the specified name, value, and path.
     *
     * ### Syntax
     *
     * ```text
     * example.org#%#//scriptlet('set-cookie', name, value[, path])
     * ```
     *
     * - `name` — required, cookie name to be set
     * - `value` — required, cookie value; possible values:
     *     - number `>= 0 && <= 15`
     *     - one of the predefined constants:
     *         - `true` / `True`
     *         - `false` / `False`
     *         - `yes` / `Yes` / `Y`
     *         - `no`
     *         - `ok` / `OK`
     * - `path` — optional, cookie path, defaults to `/`; possible values:
     *     - `/` — root path
     *     - `none` — to set no path at all
     *
     * > Note that the scriptlet encodes cookie names and values,
     * > e.g value `"{ test: 'value'}"` becomes `%7B%20test%3A%20'value'%7D`.
     *
     * ### Examples
     *
     * ```adblock
     * example.org#%#//scriptlet('set-cookie', 'CookieConsent', '1')
     *
     * example.org#%#//scriptlet('set-cookie', 'gdpr-settings-cookie', 'true')
     *
     * example.org#%#//scriptlet('set-cookie', 'cookie_consent', 'ok', 'none')
     * ```
     *
     * @added v1.2.3.
     */
    /* eslint-enable max-len */
    function setCookie$1(source, name, value) {
      let path = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : '/';
      const validValue = getLimitedCookieValue(value);
      if (validValue === null) {
        logMessage(source, "Invalid cookie value: '".concat(validValue, "'"));
        return;
      }
      if (!isValidCookiePath(path)) {
        logMessage(source, "Invalid cookie path: '".concat(path, "'"));
        return;
      }
      const cookieToSet = concatCookieNameValuePath(name, validValue, path);
      if (!cookieToSet) {
        logMessage(source, 'Invalid cookie name or value');
        return;
      }
      hit(source);
      document.cookie = cookieToSet;
    }
    setCookie$1.names = ['set-cookie'];
    setCookie$1.injections = [hit, logMessage, nativeIsNaN, isCookieSetWithValue, getLimitedCookieValue, concatCookieNameValuePath, isValidCookiePath, getCookiePath];

    /**
     * @scriptlet set-cookie-reload
     *
     * @description
     * Sets a cookie with the specified name and value, and path,
     * and reloads the current page after the cookie setting.
     * If reloading option is not needed, use [set-cookie](#set-cookie) scriptlet.
     *
     * ### Syntax
     *
     * ```text
     * example.org#%#//scriptlet('set-cookie-reload', name, value[, path])
     * ```
     *
     * - `name` — required, cookie name to be set
     * - `value` — required, cookie value; possible values:
     *     - number `>= 0 && <= 15`
     *     - one of the predefined constants:
     *         - `true` / `True`
     *         - `false` / `False`
     *         - `yes` / `Yes` / `Y`
     *         - `no`
     *         - `ok` / `OK`
     * - `path` — optional, cookie path, defaults to `/`; possible values:
     *     - `/` — root path
     *     - `none` — to set no path at all
     *
     * > Note that the scriptlet encodes cookie names and values,
     * > e.g value `"{ test: 'value'}"` becomes `%7B%20test%3A%20'value'%7D`.
     *
     * ### Examples
     *
     * ```adblock
     * example.org#%#//scriptlet('set-cookie-reload', 'checking', 'ok')
     *
     * example.org#%#//scriptlet('set-cookie-reload', 'gdpr-settings-cookie', '1')
     *
     * example.org#%#//scriptlet('set-cookie-reload', 'cookie-set', 'true', 'none')
     * ```
     *
     * @added v1.3.14.
     */
    function setCookieReload$1(source, name, value) {
      let path = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : '/';
      if (isCookieSetWithValue(document.cookie, name, value)) {
        return;
      }
      const validValue = getLimitedCookieValue(value);
      if (validValue === null) {
        logMessage(source, "Invalid cookie value: '".concat(value, "'"));
        return;
      }
      if (!isValidCookiePath(path)) {
        logMessage(source, "Invalid cookie path: '".concat(path, "'"));
        return;
      }
      const cookieToSet = concatCookieNameValuePath(name, validValue, path);
      if (!cookieToSet) {
        logMessage(source, 'Invalid cookie name or value');
        return;
      }
      document.cookie = cookieToSet;
      hit(source);

      // Only reload the page if cookie was set
      // https://github.com/AdguardTeam/Scriptlets/issues/212
      if (isCookieSetWithValue(document.cookie, name, value)) {
        window.location.reload();
      }
    }
    setCookieReload$1.names = ['set-cookie-reload'];
    setCookieReload$1.injections = [hit, logMessage, nativeIsNaN, isCookieSetWithValue, getLimitedCookieValue, concatCookieNameValuePath, isValidCookiePath, getCookiePath];

    /**
     * @scriptlet hide-in-shadow-dom
     *
     * @description
     * Hides elements inside open shadow DOM elements.
     *
     * ### Syntax
     *
     * ```text
     * example.org#%#//scriptlet('hide-in-shadow-dom', selector[, baseSelector])
     * ```
     *
     * - `selector` — required, CSS selector of element in shadow-dom to hide
     * - `baseSelector` — optional, selector of specific page DOM element,
     *   narrows down the part of the page DOM where shadow-dom host supposed to be,
     *   defaults to document.documentElement
     *
     * > `baseSelector` should match element of the page DOM, but not of shadow DOM.
     *
     * ### Examples
     *
     * ```adblock
     * ! hides menu bar
     * example.com#%#//scriptlet('hide-in-shadow-dom', '.storyAd', '#app')
     *
     * ! hides floating element
     * example.com#%#//scriptlet('hide-in-shadow-dom', '.contact-fab')
     * ```
     *
     * @added v1.3.0.
     */
    function hideInShadowDom$1(source, selector, baseSelector) {
      // do nothing if browser does not support ShadowRoot
      // https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot
      if (!Element.prototype.attachShadow) {
        return;
      }
      const hideElement = function hideElement(targetElement) {
        const DISPLAY_NONE_CSS = 'display:none!important;';
        targetElement.style.cssText = DISPLAY_NONE_CSS;
      };

      /**
       * Handles shadow-dom piercing and hiding of found elements
       */
      const hideHandler = function hideHandler() {
        // start value of shadow-dom hosts for the page dom
        let hostElements = !baseSelector ? findHostElements(document.documentElement) : document.querySelectorAll(baseSelector);

        // if there is shadow-dom host, they should be explored
        while (hostElements.length !== 0) {
          let isHidden = false;
          const _pierceShadowDom = pierceShadowDom(selector, hostElements),
            targets = _pierceShadowDom.targets,
            innerHosts = _pierceShadowDom.innerHosts;
          targets.forEach(function (targetEl) {
            hideElement(targetEl);
            isHidden = true;
          });
          if (isHidden) {
            hit(source);
          }

          // continue to pierce for inner shadow-dom hosts
          // and search inside them while the next iteration
          hostElements = innerHosts;
        }
      };
      hideHandler();
      observeDOMChanges(hideHandler, true);
    }
    hideInShadowDom$1.names = ['hide-in-shadow-dom'];
    hideInShadowDom$1.injections = [hit, observeDOMChanges, findHostElements, pierceShadowDom,
    // following helpers should be imported and injected
    // because they are used by helpers above
    flatten, throttle];

    /**
     * @scriptlet remove-in-shadow-dom
     *
     * @description
     * Removes elements inside open shadow DOM elements.
     *
     * ### Syntax
     *
     * ```text
     * example.org#%#//scriptlet('remove-in-shadow-dom', selector[, baseSelector])
     * ```
     *
     * - `selector` — required, CSS selector of element in shadow-dom to remove
     * - `baseSelector` — optional, selector of specific page DOM element,
     * narrows down the part of the page DOM where shadow-dom host supposed to be,
     * defaults to document.documentElement
     *
     * > `baseSelector` should match element of the page DOM, but not of shadow DOM.
     *
     * ### Examples
     *
     * ```adblock
     * ! removes menu bar
     * virustotal.com#%#//scriptlet('remove-in-shadow-dom', 'iron-pages', 'vt-virustotal-app')
     *
     * ! removes floating element
     * virustotal.com#%#//scriptlet('remove-in-shadow-dom', 'vt-ui-contact-fab')
     * ```
     *
     * @added v1.3.14.
     */
    function removeInShadowDom$1(source, selector, baseSelector) {
      // do nothing if browser does not support ShadowRoot
      // https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot
      if (!Element.prototype.attachShadow) {
        return;
      }
      const removeElement = function removeElement(targetElement) {
        targetElement.remove();
      };

      /**
       * Handles shadow-dom piercing and removing of found elements
       */
      const removeHandler = function removeHandler() {
        // start value of shadow-dom hosts for the page dom
        let hostElements = !baseSelector ? findHostElements(document.documentElement) : document.querySelectorAll(baseSelector);

        // if there is shadow-dom host, they should be explored
        while (hostElements.length !== 0) {
          let isRemoved = false;
          const _pierceShadowDom = pierceShadowDom(selector, hostElements),
            targets = _pierceShadowDom.targets,
            innerHosts = _pierceShadowDom.innerHosts;
          targets.forEach(function (targetEl) {
            removeElement(targetEl);
            isRemoved = true;
          });
          if (isRemoved) {
            hit(source);
          }

          // continue to pierce for inner shadow-dom hosts
          // and search inside them while the next iteration
          hostElements = innerHosts;
        }
      };
      removeHandler();
      observeDOMChanges(removeHandler, true);
    }
    removeInShadowDom$1.names = ['remove-in-shadow-dom'];
    removeInShadowDom$1.injections = [hit, observeDOMChanges, findHostElements, pierceShadowDom,
    // following helpers should be imported and injected
    // because they are used by helpers above
    flatten, throttle];

    /* eslint-disable max-len */
    /**
     * @scriptlet prevent-fetch
     *
     * @description
     * Prevents `fetch` calls if **all** given parameters match.
     *
     * Related UBO scriptlet:
     * https://github.com/gorhill/uBlock/wiki/Resources-Library#no-fetch-ifjs-
     *
     * ### Syntax
     *
     * ```text
     * example.org#%#//scriptlet('prevent-fetch'[, propsToMatch[, responseBody[, responseType]]])
     * ```
     *
     * - `propsToMatch` — optional, string of space-separated properties to match; possible props:
     *     - string or regular expression for matching the URL passed to fetch call;
     *       empty string, wildcard `*` or invalid regular expression will match all fetch calls
     *     - colon-separated pairs `name:value` where
     *         <!-- markdownlint-disable-next-line line-length -->
     *         - `name` is [`init` option name](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters)
     *         - `value` is string or regular expression for matching the value of the option passed to fetch call;
     *           invalid regular expression will cause any value matching
     * - `responseBody` — optional, string for defining response body value,
     *   defaults to `emptyObj`. Possible values:
     *     - `emptyObj` — empty object
     *     - `emptyArr` — empty array
     * - `responseType` — optional, string for defining response type,
     *   original response type is used if not specified. Possible values:
     *     - `default`
     *     - `opaque`
     *
     * > Usage with no arguments will log fetch calls to browser console;
     * > it may be useful for debugging but it is not allowed for prod versions of filter lists.
     *
     * ### Examples
     *
     * 1. Log all fetch calls
     *
     *     ```adblock
     *     example.org#%#//scriptlet('prevent-fetch')
     *     ```
     *
     * 1. Prevent all fetch calls
     *
     *     ```adblock
     *     example.org#%#//scriptlet('prevent-fetch', '*')
     *     ! or
     *     example.org#%#//scriptlet('prevent-fetch', '')
     *     ```
     *
     * 1. Prevent fetch call for specific url
     *
     *     ```adblock
     *     example.org#%#//scriptlet('prevent-fetch', '/url\\.part/')
     *     ```
     *
     * 1. Prevent fetch call for specific request method
     *
     *     ```adblock
     *     example.org#%#//scriptlet('prevent-fetch', 'method:HEAD')
     *     ```
     *
     * 1. Prevent fetch call for specific url and request method
     *
     *     ```adblock
     *     example.org#%#//scriptlet('prevent-fetch', '/specified_url_part/ method:/HEAD|GET/')
     *     ```
     *
     * 1. Prevent fetch call and specify response body value
     *
     *     ```adblock
     *     ! Specify response body for fetch call to a specific url
     *     example.org#%#//scriptlet('prevent-fetch', '/specified_url_part/ method:/HEAD|GET/', 'emptyArr')
     *
     *     ! Specify response body for all fetch calls
     *     example.org#%#//scriptlet('prevent-fetch', '', 'emptyArr')
     *     ```
     *
     * 1. Prevent all fetch calls and specify response type value
     *
     *     ```adblock
     *     example.org#%#//scriptlet('prevent-fetch', '*', '', 'opaque')
     *     ```
     *
     * @added v1.3.18.
     */
    /* eslint-enable max-len */
    function preventFetch$1(source, propsToMatch) {
      let responseBody = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'emptyObj';
      let responseType = arguments.length > 3 ? arguments[3] : undefined;
      // do nothing if browser does not support fetch or Proxy (e.g. Internet Explorer)
      // https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
      if (typeof fetch === 'undefined' || typeof Proxy === 'undefined' || typeof Response === 'undefined') {
        return;
      }
      let strResponseBody;
      if (responseBody === '' || responseBody === 'emptyObj') {
        strResponseBody = '{}';
      } else if (responseBody === 'emptyArr') {
        strResponseBody = '[]';
      } else {
        logMessage(source, "Invalid responseBody parameter: '".concat(responseBody, "'"));
        return;
      }
      const isResponseTypeSpecified = typeof responseType !== 'undefined';
      const isResponseTypeSupported = function isResponseTypeSupported(responseType) {
        const SUPPORTED_TYPES = ['default', 'opaque'];
        return SUPPORTED_TYPES.includes(responseType);
      };
      // Skip disallowed response types,
      // specified responseType has limited list of possible values
      if (isResponseTypeSpecified && !isResponseTypeSupported(responseType)) {
        logMessage(source, "Invalid responseType parameter: '".concat(responseType, "'"));
        return;
      }
      const handlerWrapper = async function handlerWrapper(target, thisArg, args) {
        let shouldPrevent = false;
        const fetchData = getFetchData(args);
        if (typeof propsToMatch === 'undefined') {
          logMessage(source, "fetch( ".concat(objectToString(fetchData), " )"), true);
          hit(source);
          return Reflect.apply(target, thisArg, args);
        }
        shouldPrevent = matchRequestProps(source, propsToMatch, fetchData);
        if (shouldPrevent) {
          hit(source);
          const origResponse = await Reflect.apply(target, thisArg, args);
          return modifyResponse(origResponse, {
            body: strResponseBody,
            type: responseType
          });
        }
        return Reflect.apply(target, thisArg, args);
      };
      const fetchHandler = {
        apply: handlerWrapper
      };
      fetch = new Proxy(fetch, fetchHandler); // eslint-disable-line no-global-assign
    }

    preventFetch$1.names = ['prevent-fetch',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'no-fetch-if.js', 'ubo-no-fetch-if.js', 'ubo-no-fetch-if'];
    preventFetch$1.injections = [hit, getFetchData, objectToString, matchRequestProps, logMessage, modifyResponse, toRegExp, isValidStrPattern, escapeRegExp, isEmptyObject, getRequestData, getRequestProps, parseMatchProps, validateParsedData, getMatchPropsData];

    /* eslint-disable max-len */
    /**
     * @scriptlet set-local-storage-item
     *
     * @description
     * Adds specified key and its value to localStorage object, or updates the value of the key if it already exists.
     * Scriptlet won't set item if storage is full.
     *
     * ### Syntax
     *
     * ```text
     * example.com#%#//scriptlet('set-local-storage-item', 'key', 'value')
     * ```
     *
     * - `key` — required, key name to be set.
     * - `value` — required, key value; possible values:
     *     - positive decimal integer `<= 32767`
     *     - one of the predefined constants:
     *         - `undefined`
     *         - `false`
     *         - `true`
     *         - `null`
     *         - `emptyObj` — empty object
     *         - `emptyArr` — empty array
     *         - `''` — empty string
     *         - `yes`
     *         - `no`
     *
     * ### Examples
     *
     * ```adblock
     * example.org#%#//scriptlet('set-local-storage-item', 'player.live.current.mute', 'false')
     *
     * example.org#%#//scriptlet('set-local-storage-item', 'exit-intent-marketing', '1')
     * ```
     *
     * @added v1.4.3.
     */
    /* eslint-enable max-len */

    function setLocalStorageItem$1(source, key, value) {
      if (typeof key === 'undefined') {
        logMessage(source, 'Item key should be specified.');
        return;
      }
      let validValue;
      try {
        validValue = getLimitedStorageItemValue(value);
      } catch (_unused) {
        logMessage(source, "Invalid storage item value: '".concat(value, "'"));
        return;
      }
      const _window = window,
        localStorage = _window.localStorage;
      setStorageItem(source, localStorage, key, validValue);
      hit(source);
    }
    setLocalStorageItem$1.names = ['set-local-storage-item'];
    setLocalStorageItem$1.injections = [hit, logMessage, nativeIsNaN, setStorageItem, getLimitedStorageItemValue];

    /* eslint-disable max-len */
    /**
     * @scriptlet set-session-storage-item
     *
     * @description
     * Adds specified key and its value to sessionStorage object, or updates the value of the key if it already exists.
     * Scriptlet won't set item if storage is full.
     *
     * ### Syntax
     *
     * ```text
     * example.com#%#//scriptlet('set-session-storage-item', 'key', 'value')
     * ```
     *
     * - `key` — required, key name to be set.
     * - `value` — required, key value; possible values:
     *     - positive decimal integer `<= 32767`
     *     - one of the predefined constants:
     *         - `undefined`
     *         - `false`
     *         - `true`
     *         - `null`
     *         - `emptyObj` — empty object
     *         - `emptyArr` — empty array
     *         - `''` — empty string
     *         - `yes`
     *         - `no`
     *
     * ### Examples
     *
     * ```adblock
     * example.org#%#//scriptlet('set-session-storage-item', 'player.live.current.mute', 'false')
     *
     * example.org#%#//scriptlet('set-session-storage-item', 'exit-intent-marketing', '1')
     * ```
     *
     * @added v1.4.3.
     */
    /* eslint-enable max-len */

    function setSessionStorageItem$1(source, key, value) {
      if (typeof key === 'undefined') {
        logMessage(source, 'Item key should be specified.');
        return;
      }
      let validValue;
      try {
        validValue = getLimitedStorageItemValue(value);
      } catch (_unused) {
        logMessage(source, "Invalid storage item value: '".concat(value, "'"));
        return;
      }
      const _window = window,
        sessionStorage = _window.sessionStorage;
      setStorageItem(source, sessionStorage, key, validValue);
      hit(source);
    }
    setSessionStorageItem$1.names = ['set-session-storage-item'];
    setSessionStorageItem$1.injections = [hit, logMessage, nativeIsNaN, setStorageItem, getLimitedStorageItemValue];

    /* eslint-disable max-len */
    /**
     * @scriptlet abort-on-stack-trace
     *
     * @description
     * Aborts a script when it attempts to utilize (read or write to) the specified property
     * and it's error stack trace contains given value.
     *
     * Related UBO scriptlet:
     * https://github.com/gorhill/uBlock-for-firefox-legacy/commit/7099186ae54e70b588d5e99554a05d783cabc8ff
     *
     * ### Syntax
     *
     * ```text
     * example.com#%#//scriptlet('abort-on-stack-trace', property, stack)
     * ```
     *
     * - `property` — required, path to a property. The property must be attached to window.
     * - `stack` — required, string that must match the current function call stack trace.
     *     - values to abort inline or injected script, accordingly:
     *         - `inlineScript`
     *         - `injectedScript`
     *
     * ### Examples
     *
     * 1. Aborts script when it tries to access `window.Ya` and it's error stack trace contains `test.js`
     *
     *     ```adblock
     *     example.org#%#//scriptlet('abort-on-stack-trace', 'Ya', 'test.js')
     *     ```
     *
     * 1. Aborts script when it tries to access `window.Ya.videoAd` and it's error stack trace contains `test.js`
     *
     *     ```adblock
     *     example.org#%#//scriptlet('abort-on-stack-trace', 'Ya.videoAd', 'test.js')
     *     ```
     *
     * 1. Aborts script when stack trace matches with any of these parameters
     *
     *     ```adblock
     *     example.org#%#//scriptlet('abort-on-stack-trace', 'Ya', 'yandexFuncName')
     *     example.org#%#//scriptlet('abort-on-stack-trace', 'Ya', 'yandexScriptName')
     *     ```
     *
     * 1. Aborts script when it tries to access `window.Ya` and it's an inline script
     *
     *     ```adblock
     *     example.org#%#//scriptlet('abort-on-stack-trace', 'Ya', 'inlineScript')
     *     ```
     *
     * 1. Aborts script when it tries to access `window.Ya` and it's an injected script
     *
     *      ```adblock
     *      example.org#%#//scriptlet('abort-on-stack-trace', 'Ya', 'injectedScript')
     *      ```
     *
     * @added v1.5.0.
     */
    /* eslint-enable max-len */
    function abortOnStackTrace$1(source, property, stack) {
      if (!property || !stack) {
        return;
      }
      const rid = randomId();
      const abort = function abort() {
        hit(source);
        throw new ReferenceError(rid);
      };
      const setChainPropAccess = function setChainPropAccess(owner, property) {
        const chainInfo = getPropertyInChain(owner, property);
        let base = chainInfo.base;
        const prop = chainInfo.prop,
          chain = chainInfo.chain;
        if (chain) {
          const setter = function setter(a) {
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
        if (!stack.match(/^(inlineScript|injectedScript)$/) && !isValidStrPattern(stack)) {
          logMessage(source, "Invalid parameter: ".concat(stack));
          return;
        }

        // Prevent infinite loops when trapping prop used by helpers in getter/setter
        const descriptorWrapper = Object.assign(getDescriptorAddon(), {
          value: base[prop],
          get() {
            if (!this.isAbortingSuspended && this.isolateCallback(matchStackTrace, stack, new Error().stack)) {
              abort();
            }
            return this.value;
          },
          set(newValue) {
            if (!this.isAbortingSuspended && this.isolateCallback(matchStackTrace, stack, new Error().stack)) {
              abort();
            }
            this.value = newValue;
          }
        });
        setPropertyAccess(base, prop, {
          // Call wrapped getter and setter to keep isAbortingSuspended & isolateCallback values
          get() {
            return descriptorWrapper.get.call(descriptorWrapper);
          },
          set(newValue) {
            descriptorWrapper.set.call(descriptorWrapper, newValue);
          }
        });
      };
      setChainPropAccess(window, property);
      window.onerror = createOnErrorHandler(rid).bind();
    }
    abortOnStackTrace$1.names = ['abort-on-stack-trace',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'abort-on-stack-trace.js', 'ubo-abort-on-stack-trace.js', 'aost.js', 'ubo-aost.js', 'ubo-abort-on-stack-trace', 'ubo-aost', 'abp-abort-on-stack-trace'];
    abortOnStackTrace$1.injections = [randomId, setPropertyAccess, getPropertyInChain, createOnErrorHandler, hit, isValidStrPattern, escapeRegExp, matchStackTrace, getDescriptorAddon, logMessage, toRegExp, isEmptyObject, getNativeRegexpTest, shouldAbortInlineOrInjectedScript];

    /* eslint-disable max-len */
    /**
     * @scriptlet log-on-stack-trace
     *
     * @description
     * This scriptlet is basically the same as [abort-on-stack-trace](#abort-on-stack-trace),
     * but instead of aborting it logs:
     *
     * - function and source script names pairs that access the given property
     * - was that get or set attempt
     * - script being injected or inline
     *
     * ### Syntax
     *
     * ```text
     * example.com#%#//scriptlet('log-on-stack-trace', 'property')
     * ```
     *
     * - `property` — required, path to a property. The property must be attached to window.
     *
     * @added v1.5.0.
     */
    /* eslint-enable max-len */
    function logOnStacktrace$1(source, property) {
      if (!property) {
        return;
      }
      const refineStackTrace = function refineStackTrace(stackString) {
        // Split stack trace string by lines and remove first two elements ('Error' and getter call)
        // Remove '    at ' at the start of each string
        const stackSteps = stackString.split('\n').slice(2).map(function (line) {
          return line.replace(/ {4}at /, '');
        });
        // Trim each line extracting funcName : fullPath pair
        const logInfoArray = stackSteps.map(function (line) {
          let funcName;
          let funcFullPath;
          /* eslint-disable-next-line no-useless-escape */
          const reg = /\(([^\)]+)\)/;
          const regFirefox = /(.*?@)(\S+)(:\d+):\d+\)?$/;
          if (line.match(reg)) {
            funcName = line.split(' ').slice(0, -1).join(' ');
            /* eslint-disable-next-line prefer-destructuring */
            funcFullPath = line.match(reg)[1];
          } else if (line.match(regFirefox)) {
            funcName = line.split('@').slice(0, -1).join(' ');
            /* eslint-disable-next-line prefer-destructuring */
            funcFullPath = line.match(regFirefox)[2];
          } else {
            // For when func name is not available
            funcName = 'function name is not available';
            funcFullPath = line;
          }
          return [funcName, funcFullPath];
        });
        // Convert array into object for better display using console.table
        const logInfoObject = {};
        logInfoArray.forEach(function (pair) {
          /* eslint-disable-next-line prefer-destructuring */
          logInfoObject[pair[0]] = pair[1];
        });
        return logInfoObject;
      };
      const setChainPropAccess = function setChainPropAccess(owner, property) {
        const chainInfo = getPropertyInChain(owner, property);
        let base = chainInfo.base;
        const prop = chainInfo.prop,
          chain = chainInfo.chain;
        if (chain) {
          const setter = function setter(a) {
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
        let value = base[prop];
        /* eslint-disable no-console */
        setPropertyAccess(base, prop, {
          get() {
            hit(source);
            logMessage(source, "Get ".concat(prop), true);
            console.table(refineStackTrace(new Error().stack));
            return value;
          },
          set(newValue) {
            hit(source);
            logMessage(source, "Set ".concat(prop), true);
            console.table(refineStackTrace(new Error().stack));
            value = newValue;
          }
        });
        /* eslint-enable no-console */
      };

      setChainPropAccess(window, property);
    }
    logOnStacktrace$1.names = ['log-on-stack-trace'];
    logOnStacktrace$1.injections = [getPropertyInChain, setPropertyAccess, hit, logMessage, isEmptyObject];

    /* eslint-disable max-len */
    /**
     * @scriptlet prevent-xhr
     *
     * @description
     * Prevents `xhr` calls if **all** given parameters match.
     *
     * Related UBO scriptlet:
     * https://github.com/gorhill/uBlock/wiki/Resources-Library#no-xhr-ifjs-
     *
     * ### Syntax
     *
     * ```text
     * example.org#%#//scriptlet('prevent-xhr'[, propsToMatch[, randomize]])
     * ```
     *
     * - `propsToMatch` — optional, string of space-separated properties to match; possible props:
     *     - string or regular expression for matching the URL passed to `XMLHttpRequest.open()` call;
     *       empty string or wildcard `*` for all `XMLHttpRequest.open()` calls match
     *         - colon-separated pairs `name:value` where
     *             - `name` is XMLHttpRequest object property name
     *             - `value` is string or regular expression for matching the value of the option
     *     passed to `XMLHttpRequest.open()` call
     * - `randomize` — defaults to `false` for empty responseText,
     *   optional argument to randomize responseText of matched XMLHttpRequest's response; possible values:
     *     - `true` to randomize responseText, random alphanumeric string of 10 symbols
     *     - colon-separated pair `name:value` string value to customize responseText data where
     *         - `name` — only `length` supported for now
     *         - `value` — range on numbers, for example `100-300`, limited to 500000 characters
     *
     * > Usage with no arguments will log XMLHttpRequest objects to browser console;
     * > it may be useful for debugging but it is not allowed for prod versions of filter lists.
     *
     * ### Examples
     *
     * 1. Log all XMLHttpRequests
     *
     *     ```adblock
     *     example.org#%#//scriptlet('prevent-xhr')
     *     ```
     *
     * 1. Prevent all XMLHttpRequests
     *
     *     ```adblock
     *     example.org#%#//scriptlet('prevent-xhr', '*')
     *     example.org#%#//scriptlet('prevent-xhr', '')
     *     ```
     *
     * 1. Prevent XMLHttpRequests for specific url
     *
     *     ```adblock
     *     example.org#%#//scriptlet('prevent-xhr', 'example.org')
     *     ```
     *
     * 1. Prevent XMLHttpRequests for specific request method
     *
     *     ```adblock
     *     example.org#%#//scriptlet('prevent-xhr', 'method:HEAD')
     *     ```
     *
     * 1. Prevent XMLHttpRequests for specific url and specified request methods
     *
     *     ```adblock
     *     example.org#%#//scriptlet('prevent-xhr', 'example.org method:/HEAD|GET/')
     *     ```
     *
     * 1. Prevent XMLHttpRequests for specific url and randomize it's response text
     *
     *     ```adblock
     *     example.org#%#//scriptlet('prevent-xhr', 'example.org', 'true')
     *     ```
     *
     * 1. Prevent XMLHttpRequests for specific url and randomize it's response text with range
     *
     *     ```adblock
     *    example.org#%#//scriptlet('prevent-xhr', 'example.org', 'length:100-300')
     *     ```
     *
     * @added v1.5.0.
     */
    /* eslint-enable max-len */
    function preventXHR$1(source, propsToMatch, customResponseText) {
      // do nothing if browser does not support Proxy (e.g. Internet Explorer)
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
      if (typeof Proxy === 'undefined') {
        return;
      }
      const nativeOpen = window.XMLHttpRequest.prototype.open;
      const nativeSend = window.XMLHttpRequest.prototype.send;
      let xhrData;
      let modifiedResponse = '';
      let modifiedResponseText = '';
      const openWrapper = function openWrapper(target, thisArg, args) {
        // Get original request properties
        // eslint-disable-next-line prefer-spread
        xhrData = getXhrData.apply(null, args);
        if (typeof propsToMatch === 'undefined') {
          // Log if no propsToMatch given
          logMessage(source, "xhr( ".concat(objectToString(xhrData), " )"), true);
          hit(source);
        } else if (matchRequestProps(source, propsToMatch, xhrData)) {
          thisArg.shouldBePrevented = true;
        }

        // Trap setRequestHeader of target xhr object to mimic request headers later;
        // needed for getResponseHeader() and getAllResponseHeaders() methods
        if (thisArg.shouldBePrevented) {
          thisArg.collectedHeaders = [];
          const setRequestHeaderWrapper = function setRequestHeaderWrapper(target, thisArg, args) {
            // Collect headers
            thisArg.collectedHeaders.push(args);
            return Reflect.apply(target, thisArg, args);
          };
          const setRequestHeaderHandler = {
            apply: setRequestHeaderWrapper
          };
          // setRequestHeader() can only be called on xhr.open(),
          // so we can safely proxy it here
          thisArg.setRequestHeader = new Proxy(thisArg.setRequestHeader, setRequestHeaderHandler);
        }
        return Reflect.apply(target, thisArg, args);
      };
      const sendWrapper = function sendWrapper(target, thisArg, args) {
        if (!thisArg.shouldBePrevented) {
          return Reflect.apply(target, thisArg, args);
        }
        if (thisArg.responseType === 'blob') {
          modifiedResponse = new Blob();
        }
        if (thisArg.responseType === 'arraybuffer') {
          modifiedResponse = new ArrayBuffer();
        }
        if (customResponseText) {
          const randomText = generateRandomResponse(customResponseText);
          if (randomText) {
            modifiedResponseText = randomText;
          } else {
            logMessage(source, "Invalid randomize parameter: '".concat(customResponseText, "'"));
          }
        }

        /**
         * Create separate XHR request with original request's input
         * to be able to collect response data without triggering
         * listeners on original XHR object
         */
        const forgedRequest = new XMLHttpRequest();
        forgedRequest.addEventListener('readystatechange', function () {
          if (forgedRequest.readyState !== 4) {
            return;
          }
          const readyState = forgedRequest.readyState,
            responseURL = forgedRequest.responseURL,
            responseXML = forgedRequest.responseXML,
            status = forgedRequest.status,
            statusText = forgedRequest.statusText;

          // Mock response object
          Object.defineProperties(thisArg, {
            // original values
            readyState: {
              value: readyState,
              writable: false
            },
            status: {
              value: status,
              writable: false
            },
            statusText: {
              value: statusText,
              writable: false
            },
            responseURL: {
              value: responseURL,
              writable: false
            },
            responseXML: {
              value: responseXML,
              writable: false
            },
            // modified values
            response: {
              value: modifiedResponse,
              writable: false
            },
            responseText: {
              value: modifiedResponseText,
              writable: false
            }
          });

          // Mock events
          setTimeout(function () {
            const stateEvent = new Event('readystatechange');
            thisArg.dispatchEvent(stateEvent);
            const loadEvent = new Event('load');
            thisArg.dispatchEvent(loadEvent);
            const loadEndEvent = new Event('loadend');
            thisArg.dispatchEvent(loadEndEvent);
          }, 1);
          hit(source);
        });
        nativeOpen.apply(forgedRequest, [xhrData.method, xhrData.url]);

        // Mimic request headers before sending
        // setRequestHeader can only be called on open request objects
        thisArg.collectedHeaders.forEach(function (header) {
          const name = header[0];
          const value = header[1];
          forgedRequest.setRequestHeader(name, value);
        });
        try {
          nativeSend.call(forgedRequest, args);
        } catch (_unused) {
          return Reflect.apply(target, thisArg, args);
        }
        return undefined;
      };

      /**
       * Mock XMLHttpRequest.prototype.getHeaderHandler() to avoid adblocker detection.
       *
       * @param {Function} target XMLHttpRequest.prototype.getHeaderHandler().
       * @param {XMLHttpRequest} thisArg The request.
       * @param {string[]} args Header name is passed as first argument.
       *
       * @returns {string|null} Header value or null if header is not set.
       */
      const getHeaderWrapper = function getHeaderWrapper(target, thisArg, args) {
        if (!thisArg.collectedHeaders.length) {
          return null;
        }
        // The search for the header name is case-insensitive
        // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/getResponseHeader
        const searchHeaderName = args[0].toLowerCase();
        const matchedHeader = thisArg.collectedHeaders.find(function (header) {
          const headerName = header[0].toLowerCase();
          return headerName === searchHeaderName;
        });
        return matchedHeader ? matchedHeader[1] : null;
      };

      /**
       * Mock XMLHttpRequest.prototype.getAllResponseHeaders() to avoid adblocker detection.
       *
       * @param {Function} target XMLHttpRequest.prototype.getAllResponseHeaders().
       * @param {XMLHttpRequest} thisArg The request.
       *
       * @returns {string} All headers as a string. For no headers an empty string is returned.
       */
      const getAllHeadersWrapper = function getAllHeadersWrapper(target, thisArg) {
        if (!thisArg.collectedHeaders.length) {
          return '';
        }
        const allHeadersStr = thisArg.collectedHeaders.map(function (header) {
          /**
           * TODO: array destructuring may be used here
           * after the typescript implementation and bundling refactoring
           * as now there is an error: slicedToArray is not defined
           */
          const headerName = header[0];
          const headerValue = header[1];
          // In modern browsers, the header names are returned in all lower case, as per the latest spec.
          // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/getAllResponseHeaders
          return "".concat(headerName.toLowerCase(), ": ").concat(headerValue);
        }).join('\r\n');
        return allHeadersStr;
      };
      const openHandler = {
        apply: openWrapper
      };
      const sendHandler = {
        apply: sendWrapper
      };
      const getHeaderHandler = {
        apply: getHeaderWrapper
      };
      const getAllHeadersHandler = {
        apply: getAllHeadersWrapper
      };
      XMLHttpRequest.prototype.open = new Proxy(XMLHttpRequest.prototype.open, openHandler);
      XMLHttpRequest.prototype.send = new Proxy(XMLHttpRequest.prototype.send, sendHandler);
      XMLHttpRequest.prototype.getResponseHeader = new Proxy(XMLHttpRequest.prototype.getResponseHeader, getHeaderHandler);
      XMLHttpRequest.prototype.getAllResponseHeaders = new Proxy(XMLHttpRequest.prototype.getAllResponseHeaders, getAllHeadersHandler);
    }
    preventXHR$1.names = ['prevent-xhr',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'no-xhr-if.js', 'ubo-no-xhr-if.js', 'ubo-no-xhr-if'];
    preventXHR$1.injections = [hit, objectToString, generateRandomResponse, matchRequestProps, getXhrData, logMessage, toRegExp, isValidStrPattern, escapeRegExp, isEmptyObject, getNumberFromString, nativeIsFinite, nativeIsNaN, parseMatchProps, validateParsedData, getMatchPropsData, getRequestProps, getRandomIntInclusive, getRandomStrByLength];

    /**
     * @scriptlet close-window
     *
     * @description
     * Closes the browser tab immediately.
     *
     * > `window.close()` usage is restricted in the Chrome browser.
     * > In this case tab will only be closed when using AdGuard Browser extension.
     *
     * ### Syntax
     *
     * ```text
     * example.org#%#//scriptlet('close-window'[, path])
     * ```
     *
     * - `path` — optional, string or regular expression
     *   matching the current location's path: `window.location.pathname` + `window.location.search`.
     *   Defaults to execute on every page.
     *
     * ### Examples
     *
     * ```adblock
     * ! closes any example.org tab
     * example.org#%#//scriptlet('close-window')
     *
     * ! closes specific example.org tab
     * example.org#%#//scriptlet('close-window', '/example-page.html')
     * ```
     *
     * @added v1.5.0.
     */
    function forceWindowClose$1(source) {
      let path = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
      // https://github.com/AdguardTeam/Scriptlets/issues/158#issuecomment-993423036
      if (typeof window.close !== 'function') {
        const message = 'window.close() is not a function so \'close-window\' scriptlet is unavailable';
        logMessage(source, message);
        return;
      }
      const closeImmediately = function closeImmediately() {
        try {
          hit(source);
          window.close();
        } catch (e) {
          // log the error if window closing is impossible
          // https://developer.mozilla.org/en-US/docs/Web/API/Window/close
          logMessage(source, e);
        }
      };
      const closeByExtension = function closeByExtension() {
        const extCall = function extCall() {
          dispatchEvent(new Event('adguard:scriptlet-close-window'));
        };
        window.addEventListener('adguard:subscribed-to-close-window', extCall, {
          once: true
        });
        setTimeout(function () {
          window.removeEventListener('adguard:subscribed-to-close-window', extCall, {
            once: true
          });
        }, 5000);
      };
      const shouldClose = function shouldClose() {
        if (path === '') {
          return true;
        }
        const pathRegexp = toRegExp(path);
        const currentPath = "".concat(window.location.pathname).concat(window.location.search);
        return pathRegexp.test(currentPath);
      };
      if (shouldClose()) {
        closeImmediately();
        if (navigator.userAgent.includes('Chrome')) {
          closeByExtension();
        }
      }
    }
    forceWindowClose$1.names = ['close-window', 'window-close-if.js', 'ubo-window-close-if.js', 'ubo-window-close-if'];
    forceWindowClose$1.injections = [hit, toRegExp, logMessage];

    /* eslint-disable max-len */
    /**
     * @scriptlet prevent-refresh
     *
     * @description
     * Prevents reloading of a document through a meta "refresh" tag.
     *
     * Related UBO scriptlet:
     * https://github.com/gorhill/uBlock/wiki/Resources-Library#refresh-defuserjs-
     *
     * ### Syntax
     *
     * ```text
     * example.org#%#//scriptlet('prevent-refresh'[, delay])
     * ```
     *
     * - `delay` — optional, number of seconds for delay that indicates when scriptlet should run.
     *   If not set, source tag value will be applied.
     *
     * ### Examples
     *
     * 1. Prevent reloading of a document through a meta "refresh" tag
     *
     *     ```adblock
     *     example.org#%#//scriptlet('prevent-refresh')
     *     ```
     *
     * 1. Prevent reloading of a document with delay
     *
     *     ```adblock
     *     example.com#%#//scriptlet('prevent-refresh', 3)
     *     ```
     *
     * @added v1.6.2.
     */
    /* eslint-enable max-len */
    function preventRefresh$1(source, delaySec) {
      const getMetaElements = function getMetaElements() {
        let metaNodes = [];
        try {
          metaNodes = document.querySelectorAll('meta[http-equiv="refresh" i][content]');
        } catch (e) {
          // 'i' attribute flag is problematic in Edge 15
          try {
            metaNodes = document.querySelectorAll('meta[http-equiv="refresh"][content]');
          } catch (e) {
            logMessage(source, e);
          }
        }
        return Array.from(metaNodes);
      };
      const getMetaContentDelay = function getMetaContentDelay(metaElements) {
        const delays = metaElements.map(function (meta) {
          const contentString = meta.getAttribute('content');
          if (contentString.length === 0) {
            return null;
          }
          let contentDelay;
          // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta#attr-http-equiv
          const limiterIndex = contentString.indexOf(';');
          if (limiterIndex !== -1) {
            const delaySubstring = contentString.substring(0, limiterIndex);
            contentDelay = getNumberFromString(delaySubstring);
          } else {
            contentDelay = getNumberFromString(contentString);
          }
          return contentDelay;
        }).filter(function (delay) {
          return delay !== null;
        });
        // Check if "delays" array is empty, may happens when meta's content is invalid
        // and reduce() method cannot be used with empty arrays without initial value
        if (!delays.length) {
          return null;
        }
        // Get smallest delay of all metas on the page
        const minDelay = delays.reduce(function (a, b) {
          return Math.min(a, b);
        });
        // eslint-disable-next-line consistent-return
        return minDelay;
      };
      const stop = function stop() {
        const metaElements = getMetaElements();
        if (metaElements.length === 0) {
          return;
        }
        let secondsToRun = getNumberFromString(delaySec);
        // Check if argument is provided
        if (secondsToRun === null) {
          secondsToRun = getMetaContentDelay(metaElements);
        }
        // Check if meta tag has delay
        if (secondsToRun === null) {
          return;
        }
        const delayMs = secondsToRun * 1000;
        setTimeout(function () {
          window.stop();
          hit(source);
        }, delayMs);
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', stop, {
          once: true
        });
      } else {
        stop();
      }
    }
    preventRefresh$1.names = ['prevent-refresh',
    // Aliases are needed for matching the related scriptlet converted into our syntax
    // These are used by UBO rules syntax
    // https://github.com/gorhill/uBlock/wiki/Resources-Library#general-purpose-scriptlets
    'refresh-defuser.js', 'refresh-defuser',
    // Prefix 'ubo-' is required to run converted rules
    'ubo-refresh-defuser.js', 'ubo-refresh-defuser'];
    preventRefresh$1.injections = [hit, getNumberFromString, logMessage, nativeIsNaN];

    /* eslint-disable max-len, consistent-return */
    /**
     * @scriptlet prevent-element-src-loading
     *
     * @description
     * Prevents target element source loading without triggering 'onerror' listeners and not breaking 'onload' ones.
     *
     * ### Syntax
     *
     * ```text
     * example.org#%#//scriptlet('prevent-element-src-loading', tagName, match)
     * ```
     *
     * - `tagName` — required, case-insensitive target element tagName
     *   which `src` property resource loading will be silently prevented; possible values:
     *     - `script`
     *     - `img`
     *     - `iframe`
     *     - `link`
     * - `match` — required, string or regular expression for matching the element's URL;
     *
     * ### Examples
     *
     * 1. Prevent script source loading
     *
     *     ```adblock
     *     example.org#%#//scriptlet('prevent-element-src-loading', 'script' ,'adsbygoogle')
     *     ```
     *
     * @added v1.6.2.
     */
    /* eslint-enable max-len */
    function preventElementSrcLoading$1(source, tagName, match) {
      // do nothing if browser does not support Proxy or Reflect
      if (typeof Proxy === 'undefined' || typeof Reflect === 'undefined') {
        return;
      }
      const srcMockData = {
        // "KCk9Pnt9" = "()=>{}"
        script: 'data:text/javascript;base64,KCk9Pnt9',
        // Empty 1x1 image
        img: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==',
        // Empty h1 tag
        iframe: 'data:text/html;base64, PGRpdj48L2Rpdj4=',
        // Empty data
        link: 'data:text/plain;base64,'
      };
      let instance;
      if (tagName === 'script') {
        instance = HTMLScriptElement;
      } else if (tagName === 'img') {
        instance = HTMLImageElement;
      } else if (tagName === 'iframe') {
        instance = HTMLIFrameElement;
      } else if (tagName === 'link') {
        instance = HTMLLinkElement;
      } else {
        return;
      }

      // For websites that use Trusted Types
      // https://w3c.github.io/webappsec-trusted-types/dist/spec/
      const hasTrustedTypes = window.trustedTypes && typeof window.trustedTypes.createPolicy === 'function';
      let policy;
      if (hasTrustedTypes) {
        // The name for the trusted-types policy should only be 'AGPolicy',because corelibs can
        // allow our policy if the server has restricted the creation of a trusted-types policy with
        // the directive 'Content-Security-Policy: trusted-types <policyName>;`.
        // If such a header is presented in the server response, corelibs adds permission to create
        // the 'AGPolicy' policy with the 'allow-duplicates' option to prevent errors.
        // See AG-18204 for details.
        policy = window.trustedTypes.createPolicy('AGPolicy', {
          createScriptURL: function createScriptURL(arg) {
            return arg;
          }
        });
      }
      const SOURCE_PROPERTY_NAME = tagName === 'link' ? 'href' : 'src';
      const ONERROR_PROPERTY_NAME = 'onerror';
      const searchRegexp = toRegExp(match);

      // This will be needed to silent error events on matched element,
      // as url wont be available
      const setMatchedAttribute = function setMatchedAttribute(elem) {
        return elem.setAttribute(source.name, 'matched');
      };
      const setAttributeWrapper = function setAttributeWrapper(target, thisArg, args) {
        // Check if arguments are present
        if (!args[0] || !args[1]) {
          return Reflect.apply(target, thisArg, args);
        }
        const nodeName = thisArg.nodeName.toLowerCase();
        const attrName = args[0].toLowerCase();
        const attrValue = args[1];
        const isMatched = attrName === SOURCE_PROPERTY_NAME && tagName.toLowerCase() === nodeName && srcMockData[nodeName] && searchRegexp.test(attrValue);
        if (!isMatched) {
          return Reflect.apply(target, thisArg, args);
        }
        hit(source);
        setMatchedAttribute(thisArg);
        // Forward the URI that corresponds with element's MIME type
        return Reflect.apply(target, thisArg, [attrName, srcMockData[nodeName]]);
      };
      const setAttributeHandler = {
        apply: setAttributeWrapper
      };
      // eslint-disable-next-line max-len
      instance.prototype.setAttribute = new Proxy(Element.prototype.setAttribute, setAttributeHandler);
      const origSrcDescriptor = safeGetDescriptor(instance.prototype, SOURCE_PROPERTY_NAME);
      if (!origSrcDescriptor) {
        return;
      }
      Object.defineProperty(instance.prototype, SOURCE_PROPERTY_NAME, {
        enumerable: true,
        configurable: true,
        get() {
          return origSrcDescriptor.get.call(this);
        },
        set(urlValue) {
          const nodeName = this.nodeName.toLowerCase();
          const isMatched = tagName.toLowerCase() === nodeName && srcMockData[nodeName] && searchRegexp.test(urlValue);
          if (!isMatched) {
            origSrcDescriptor.set.call(this, urlValue);
            return true;
          }

          // eslint-disable-next-line no-undef
          if (policy && urlValue instanceof TrustedScriptURL) {
            const trustedSrc = policy.createScriptURL(urlValue);
            origSrcDescriptor.set.call(this, trustedSrc);
            hit(source);
            return;
          }
          setMatchedAttribute(this);
          origSrcDescriptor.set.call(this, srcMockData[nodeName]);
          hit(source);
        }
      });

      // https://github.com/AdguardTeam/Scriptlets/issues/228
      // Prevent error event being triggered by other sources
      const origOnerrorDescriptor = safeGetDescriptor(HTMLElement.prototype, ONERROR_PROPERTY_NAME);
      if (!origOnerrorDescriptor) {
        return;
      }
      Object.defineProperty(HTMLElement.prototype, ONERROR_PROPERTY_NAME, {
        enumerable: true,
        configurable: true,
        get() {
          return origOnerrorDescriptor.get.call(this);
        },
        set(cb) {
          const isMatched = this.getAttribute(source.name) === 'matched';
          if (!isMatched) {
            origOnerrorDescriptor.set.call(this, cb);
            return true;
          }
          origOnerrorDescriptor.set.call(this, noopFunc);
          return true;
        }
      });
      const addEventListenerWrapper = function addEventListenerWrapper(target, thisArg, args) {
        // Check if arguments are present
        if (!args[0] || !args[1] || !thisArg) {
          return Reflect.apply(target, thisArg, args);
        }
        const eventName = args[0];
        const isMatched = typeof thisArg.getAttribute === 'function' && thisArg.getAttribute(source.name) === 'matched' && eventName === 'error';
        if (isMatched) {
          return Reflect.apply(target, thisArg, [eventName, noopFunc]);
        }
        return Reflect.apply(target, thisArg, args);
      };
      const addEventListenerHandler = {
        apply: addEventListenerWrapper
      };
      // eslint-disable-next-line max-len
      EventTarget.prototype.addEventListener = new Proxy(EventTarget.prototype.addEventListener, addEventListenerHandler);
      const preventInlineOnerror = function preventInlineOnerror(tagName, src) {
        window.addEventListener('error', function (event) {
          if (!event.target || !event.target.nodeName || event.target.nodeName.toLowerCase() !== tagName || !event.target.src || !src.test(event.target.src)) {
            return;
          }
          hit(source);
          if (typeof event.target.onload === 'function') {
            event.target.onerror = event.target.onload;
            return;
          }
          event.target.onerror = noopFunc;
        }, true);
      };
      preventInlineOnerror(tagName, searchRegexp);
    }
    preventElementSrcLoading$1.names = ['prevent-element-src-loading'];
    preventElementSrcLoading$1.injections = [hit, toRegExp, safeGetDescriptor, noopFunc];

    /**
     * @scriptlet no-topics
     *
     * @description
     * Prevents using the Topics API.
     * https://developer.chrome.com/docs/privacy-sandbox/topics/
     *
     * ### Syntax
     *
     * ```adblock
     * example.org#%#//scriptlet('no-topics')
     * ```
     *
     * @added v1.6.18.
     */
    function noTopics$1(source) {
      const TOPICS_PROPERTY_NAME = 'browsingTopics';
      if (Document instanceof Object === false) {
        return;
      }
      if (!Object.prototype.hasOwnProperty.call(Document.prototype, TOPICS_PROPERTY_NAME) || Document.prototype[TOPICS_PROPERTY_NAME] instanceof Function === false) {
        return;
      }

      // document.browsingTopics() is async function so it's better to return noopPromiseResolve()
      // https://github.com/patcg-individual-drafts/topics#the-api-and-how-it-works
      Document.prototype[TOPICS_PROPERTY_NAME] = function () {
        return noopPromiseResolve('[]');
      };
      hit(source);
    }
    noTopics$1.names = ['no-topics'];
    noTopics$1.injections = [hit, noopPromiseResolve];

    /* eslint-disable max-len */
    /**
     * @trustedScriptlet trusted-replace-xhr-response
     *
     * @description
     * Replaces response content of `xhr` requests if **all** given parameters match.
     *
     * ### Syntax
     *
     * ```text
     * example.org#%#//scriptlet('trusted-replace-xhr-response'[, pattern, replacement[, propsToMatch]])
     * ```
     *
     * - `pattern` — optional, argument for matching contents of responseText that should be replaced.
     *   If set, `replacement` is required. Possible values:
     *     - `*` to match all text content
     *     - non-empty string
     *     - regular expression
     * - `replacement` — optional, should be set if `pattern` is set. String to replace matched content with.
     *   Empty string to remove content.
     * - `propsToMatch` — optional, string of space-separated properties to match for extra condition; possible props:
     *     - string or regular expression for matching the URL passed to `XMLHttpRequest.open()` call;
     *     - colon-separated pairs `name:value` where
     *         - `name` — string or regular expression for matching XMLHttpRequest property name
     *         - `value` — string or regular expression for matching the value of the option
     *           passed to `XMLHttpRequest.open()` call
     *
     * > Usage with no arguments will log XMLHttpRequest objects to browser console;
     * > it may be useful for debugging but it is not allowed for prod versions of filter lists.
     *
     * ### Examples
     *
     * 1. Log all XMLHttpRequests
     *
     *     ```adblock
     *     example.org#%#//scriptlet('trusted-replace-xhr-response')
     *     ```
     *
     * 1. Replace text content of XMLHttpRequests with specific url
     *
     *     <!-- markdownlint-disable line-length -->
     *
     *     ```adblock
     *     example.org#%#//scriptlet('trusted-replace-xhr-response', 'adb_detect:true', 'adb_detect:false', 'example.org')
     *     example.org#%#//scriptlet('trusted-replace-xhr-response', '/#EXT-X-VMAP-AD-BREAK[\s\S]*?/', '#EXT-X-ENDLIST', 'example.org')
     *     ```
     *
     *     <!-- markdownlint-enable line-length -->
     *
     * 1. Remove all text content of XMLHttpRequests with specific request method
     *
     *     ```adblock
     *     example.org#%#//scriptlet('trusted-replace-xhr-response', '*', '', 'method:GET')
     *     ```
     *
     * 1. Replace text content of XMLHttpRequests matching by URL regex and request methods
     *
     *     ```adblock
     *     example.org#%#//scriptlet('trusted-replace-xhr-response', '/#EXT-X-VMAP-AD-BREAK[\s\S]*?/', '#EXT-X-ENDLIST', '/\.m3u8/ method:/GET|HEAD/') <!-- markdownlint-disable-line line-length -->
     *     ```
     *
     * 1. Remove all text content of  all XMLHttpRequests for example.com
     *
     *     ```adblock
     *     example.org#%#//scriptlet('trusted-replace-xhr-response', '*', '', 'example.com')
     *     ```
     *
     * @added v1.7.3.
     */
    /* eslint-enable max-len */
    function trustedReplaceXhrResponse$1(source) {
      let pattern = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
      let replacement = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';
      let propsToMatch = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : '';
      // do nothing if browser does not support Proxy (e.g. Internet Explorer)
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
      if (typeof Proxy === 'undefined') {
        return;
      }

      // Only allow pattern as empty string for logging purposes
      if (pattern === '' && replacement !== '') {
        const message = 'Pattern argument should not be empty string.';
        logMessage(source, message);
        return;
      }
      const shouldLog = pattern === '' && replacement === '';
      const nativeOpen = window.XMLHttpRequest.prototype.open;
      const nativeSend = window.XMLHttpRequest.prototype.send;
      let xhrData;
      const openWrapper = function openWrapper(target, thisArg, args) {
        // eslint-disable-next-line prefer-spread
        xhrData = getXhrData.apply(null, args);
        if (shouldLog) {
          // Log if no propsToMatch given
          const message = "xhr( ".concat(objectToString(xhrData), " )");
          logMessage(source, message, true);
          hit(source);
          return Reflect.apply(target, thisArg, args);
        }
        if (matchRequestProps(source, propsToMatch, xhrData)) {
          thisArg.shouldBePrevented = true;
        }

        // Trap setRequestHeader of target xhr object to mimic request headers later
        if (thisArg.shouldBePrevented) {
          thisArg.collectedHeaders = [];
          const setRequestHeaderWrapper = function setRequestHeaderWrapper(target, thisArg, args) {
            // Collect headers
            thisArg.collectedHeaders.push(args);
            return Reflect.apply(target, thisArg, args);
          };
          const setRequestHeaderHandler = {
            apply: setRequestHeaderWrapper
          };

          // setRequestHeader can only be called on open xhr object,
          // so we can safely proxy it here
          thisArg.setRequestHeader = new Proxy(thisArg.setRequestHeader, setRequestHeaderHandler);
        }
        return Reflect.apply(target, thisArg, args);
      };
      const sendWrapper = function sendWrapper(target, thisArg, args) {
        if (!thisArg.shouldBePrevented) {
          return Reflect.apply(target, thisArg, args);
        }

        /**
         * Create separate XHR request with original request's input
         * to be able to collect response data without triggering
         * listeners on original XHR object
         */
        const forgedRequest = new XMLHttpRequest();
        forgedRequest.addEventListener('readystatechange', function () {
          if (forgedRequest.readyState !== 4) {
            return;
          }
          const readyState = forgedRequest.readyState,
            response = forgedRequest.response,
            responseText = forgedRequest.responseText,
            responseURL = forgedRequest.responseURL,
            responseXML = forgedRequest.responseXML,
            status = forgedRequest.status,
            statusText = forgedRequest.statusText;

          // Extract content from response
          const content = responseText || response;
          if (typeof content !== 'string') {
            return;
          }
          const patternRegexp = pattern === '*' ? /(\n|.)*/ : toRegExp(pattern);
          const modifiedContent = content.replace(patternRegexp, replacement);

          // Manually put required values into target XHR object
          // as thisArg can't be redefined and XHR objects can't be (re)assigned or copied
          Object.defineProperties(thisArg, {
            // original values
            readyState: {
              value: readyState,
              writable: false
            },
            responseURL: {
              value: responseURL,
              writable: false
            },
            responseXML: {
              value: responseXML,
              writable: false
            },
            status: {
              value: status,
              writable: false
            },
            statusText: {
              value: statusText,
              writable: false
            },
            // modified values
            response: {
              value: modifiedContent,
              writable: false
            },
            responseText: {
              value: modifiedContent,
              writable: false
            }
          });

          // Mock events
          setTimeout(function () {
            const stateEvent = new Event('readystatechange');
            thisArg.dispatchEvent(stateEvent);
            const loadEvent = new Event('load');
            thisArg.dispatchEvent(loadEvent);
            const loadEndEvent = new Event('loadend');
            thisArg.dispatchEvent(loadEndEvent);
          }, 1);
          hit(source);
        });
        nativeOpen.apply(forgedRequest, [xhrData.method, xhrData.url]);

        // Mimic request headers before sending
        // setRequestHeader can only be called on open request objects
        thisArg.collectedHeaders.forEach(function (header) {
          const name = header[0];
          const value = header[1];
          forgedRequest.setRequestHeader(name, value);
        });
        thisArg.collectedHeaders = [];
        try {
          nativeSend.call(forgedRequest, args);
        } catch (_unused) {
          return Reflect.apply(target, thisArg, args);
        }
        return undefined;
      };
      const openHandler = {
        apply: openWrapper
      };
      const sendHandler = {
        apply: sendWrapper
      };
      XMLHttpRequest.prototype.open = new Proxy(XMLHttpRequest.prototype.open, openHandler);
      XMLHttpRequest.prototype.send = new Proxy(XMLHttpRequest.prototype.send, sendHandler);
    }
    trustedReplaceXhrResponse$1.names = ['trusted-replace-xhr-response'
    // trusted scriptlets support no aliases
    ];

    trustedReplaceXhrResponse$1.injections = [hit, logMessage, toRegExp, objectToString, matchRequestProps, getXhrData, getMatchPropsData, getRequestProps, validateParsedData, parseMatchProps, isValidStrPattern, escapeRegExp, isEmptyObject];

    /* eslint-disable max-len */
    /**
     * @scriptlet xml-prune
     *
     * @description
     * Removes an element from the specified XML.
     *
     * Related UBO scriptlet:
     * https://github.com/gorhill/uBlock/wiki/Resources-Library#xml-prunejs-
     *
     * ### Syntax
     *
     * ```text
     * example.org#%#//scriptlet('xml-prune'[, propsToMatch[, optionalProp[, urlToMatch]]])
     * ```
     *
     * - `propsToMatch` — optional, selector of elements which will be removed from XML
     * - `optionalProp` — optional, selector of elements that must occur in XML document
     * - `urlToMatch` — optional, string or regular expression for matching the request's URL
     *
     * > Usage with no arguments will log response payload and URL to browser console;
     * > it may be useful for debugging but it is not allowed for prod versions of filter lists.
     *
     * ### Examples
     *
     * 1. Remove `Period` tag whose `id` contains `-ad-` from all requests
     *
     *     ```adblock
     *     example.org#%#//scriptlet('xml-prune', 'Period[id*="-ad-"]')
     *     ```
     *
     * 1. Remove `Period` tag whose `id` contains `-ad-`, only if XML contains `SegmentTemplate`
     *
     *     ```adblock
     *     example.org#%#//scriptlet('xml-prune', 'Period[id*="-ad-"]', 'SegmentTemplate')
     *     ```
     *
     * 1. Remove `Period` tag whose `id` contains `-ad-`, only if request's URL contains `.mpd`
     *
     *     ```adblock
     *     example.org#%#//scriptlet('xml-prune', 'Period[id*="-ad-"]', '', '.mpd')
     *     ```
     *
     * 1. Call with no arguments will log response payload and URL at the console
     *
     *     ```adblock
     *     example.org#%#//scriptlet('xml-prune')
     *     ```
     *
     * 1. Call with only `urlToMatch` argument will log response payload and URL only for the matched URL
     *
     *     ```adblock
     *     example.org#%#//scriptlet('xml-prune', '', '', '.mpd')
     *     ```
     *
     * @added 1.7.3.
     */
    /* eslint-enable max-len */

    function xmlPrune$1(source, propsToRemove) {
      let optionalProp = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';
      let urlToMatch = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : '';
      // do nothing if browser does not support Reflect, fetch or Proxy (e.g. Internet Explorer)
      // https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect
      if (typeof Reflect === 'undefined' || typeof fetch === 'undefined' || typeof Proxy === 'undefined' || typeof Response === 'undefined') {
        return;
      }
      let shouldPruneResponse = false;
      const urlMatchRegexp = toRegExp(urlToMatch);
      const isXML = function isXML(text) {
        // It's necessary to check the type of 'text'
        // because 'text' is obtained from the xhr/fetch response,
        // so it could also be Blob/ArrayBuffer/Object or another type
        if (typeof text === 'string') {
          // Check if "text" starts with "<" and check if it ends with ">"
          // If so, then it might be an XML file and should be pruned or logged
          const trimmedText = text.trim();
          if (trimmedText.startsWith('<') && trimmedText.endsWith('>')) {
            return true;
          }
        }
        return false;
      };
      const createXMLDocument = function createXMLDocument(text) {
        const xmlParser = new DOMParser();
        const xmlDocument = xmlParser.parseFromString(text, 'text/xml');
        return xmlDocument;
      };
      const isPruningNeeded = function isPruningNeeded(response, propsToRemove) {
        if (!isXML(response)) {
          return false;
        }
        const docXML = createXMLDocument(response);
        return !!docXML.querySelector(propsToRemove);
      };
      const pruneXML = function pruneXML(text) {
        if (!isXML(text)) {
          shouldPruneResponse = false;
          return text;
        }
        const xmlDoc = createXMLDocument(text);
        const errorNode = xmlDoc.querySelector('parsererror');
        if (errorNode) {
          return text;
        }
        if (optionalProp !== '' && xmlDoc.querySelector(optionalProp) === null) {
          shouldPruneResponse = false;
          return text;
        }
        const elems = xmlDoc.querySelectorAll(propsToRemove);
        if (!elems.length) {
          shouldPruneResponse = false;
          return text;
        }
        elems.forEach(function (elem) {
          elem.remove();
        });
        const serializer = new XMLSerializer();
        text = serializer.serializeToString(xmlDoc);
        return text;
      };
      const nativeOpen = window.XMLHttpRequest.prototype.open;
      const nativeSend = window.XMLHttpRequest.prototype.send;
      let xhrData;
      const openWrapper = function openWrapper(target, thisArg, args) {
        // eslint-disable-next-line prefer-spread
        xhrData = getXhrData.apply(null, args);
        if (matchRequestProps(source, urlToMatch, xhrData)) {
          thisArg.shouldBePruned = true;
        }

        // Trap setRequestHeader of target xhr object to mimic request headers later
        if (thisArg.shouldBePruned) {
          thisArg.collectedHeaders = [];
          const setRequestHeaderWrapper = function setRequestHeaderWrapper(target, thisArg, args) {
            // Collect headers
            thisArg.collectedHeaders.push(args);
            return Reflect.apply(target, thisArg, args);
          };
          const setRequestHeaderHandler = {
            apply: setRequestHeaderWrapper
          };

          // setRequestHeader can only be called on open xhr object,
          // so we can safely proxy it here
          thisArg.setRequestHeader = new Proxy(thisArg.setRequestHeader, setRequestHeaderHandler);
        }
        return Reflect.apply(target, thisArg, args);
      };
      const sendWrapper = function sendWrapper(target, thisArg, args) {
        const allowedResponseTypeValues = ['', 'text'];
        // Do nothing if request do not match
        // or response type is not a string
        if (!thisArg.shouldBePruned || !allowedResponseTypeValues.includes(thisArg.responseType)) {
          return Reflect.apply(target, thisArg, args);
        }

        /**
         * Create separate XHR request with original request's input
         * to be able to collect response data without triggering
         * listeners on original XHR object
         */
        const forgedRequest = new XMLHttpRequest();
        forgedRequest.addEventListener('readystatechange', function () {
          if (forgedRequest.readyState !== 4) {
            return;
          }
          const readyState = forgedRequest.readyState,
            response = forgedRequest.response,
            responseText = forgedRequest.responseText,
            responseURL = forgedRequest.responseURL,
            responseXML = forgedRequest.responseXML,
            status = forgedRequest.status,
            statusText = forgedRequest.statusText;

          // Extract content from response
          const content = responseText || response;
          if (typeof content !== 'string') {
            return;
          }
          if (!propsToRemove) {
            if (isXML(response)) {
              const message = "XMLHttpRequest.open() URL: ".concat(responseURL, "\nresponse: ").concat(response);
              logMessage(source, message);
              logMessage(source, createXMLDocument(response), true, false);
            }
          } else {
            shouldPruneResponse = isPruningNeeded(response, propsToRemove);
          }
          const responseContent = shouldPruneResponse ? pruneXML(response) : response;
          // Manually put required values into target XHR object
          // as thisArg can't be redefined and XHR objects can't be (re)assigned or copied
          Object.defineProperties(thisArg, {
            // original values
            readyState: {
              value: readyState,
              writable: false
            },
            responseURL: {
              value: responseURL,
              writable: false
            },
            responseXML: {
              value: responseXML,
              writable: false
            },
            status: {
              value: status,
              writable: false
            },
            statusText: {
              value: statusText,
              writable: false
            },
            // modified values
            response: {
              value: responseContent,
              writable: false
            },
            responseText: {
              value: responseContent,
              writable: false
            }
          });

          // Mock events
          setTimeout(function () {
            const stateEvent = new Event('readystatechange');
            thisArg.dispatchEvent(stateEvent);
            const loadEvent = new Event('load');
            thisArg.dispatchEvent(loadEvent);
            const loadEndEvent = new Event('loadend');
            thisArg.dispatchEvent(loadEndEvent);
          }, 1);
          hit(source);
        });
        nativeOpen.apply(forgedRequest, [xhrData.method, xhrData.url]);

        // Mimic request headers before sending
        // setRequestHeader can only be called on open request objects
        thisArg.collectedHeaders.forEach(function (header) {
          const name = header[0];
          const value = header[1];
          forgedRequest.setRequestHeader(name, value);
        });
        thisArg.collectedHeaders = [];
        try {
          nativeSend.call(forgedRequest, args);
        } catch (_unused) {
          return Reflect.apply(target, thisArg, args);
        }
        return undefined;
      };
      const openHandler = {
        apply: openWrapper
      };
      const sendHandler = {
        apply: sendWrapper
      };
      XMLHttpRequest.prototype.open = new Proxy(XMLHttpRequest.prototype.open, openHandler);
      XMLHttpRequest.prototype.send = new Proxy(XMLHttpRequest.prototype.send, sendHandler);
      const nativeFetch = window.fetch;
      const fetchWrapper = async function fetchWrapper(target, thisArg, args) {
        const fetchURL = args[0] instanceof Request ? args[0].url : args[0];
        if (typeof fetchURL !== 'string' || fetchURL.length === 0) {
          return Reflect.apply(target, thisArg, args);
        }
        if (urlMatchRegexp.test(fetchURL)) {
          const response = await nativeFetch(...args);
          // It's required to fix issue with - Request with body": Failed to execute 'fetch' on 'Window':
          // Cannot construct a Request with a Request object that has already been used.
          // For example, it occurs on youtube when scriptlet is used without arguments
          const clonedResponse = response.clone();
          const responseText = await response.text();
          shouldPruneResponse = isPruningNeeded(responseText, propsToRemove);
          if (!shouldPruneResponse) {
            const message = "fetch URL: ".concat(fetchURL, "\nresponse text: ").concat(responseText);
            logMessage(source, message);
            logMessage(source, createXMLDocument(responseText), true, false);
            return clonedResponse;
          }
          const prunedText = pruneXML(responseText);
          if (shouldPruneResponse) {
            hit(source);
            return new Response(prunedText, {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers
            });
          }
          return clonedResponse;
        }
        return Reflect.apply(target, thisArg, args);
      };
      const fetchHandler = {
        apply: fetchWrapper
      };
      window.fetch = new Proxy(window.fetch, fetchHandler);
    }
    xmlPrune$1.names = ['xml-prune',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'xml-prune.js', 'ubo-xml-prune.js', 'ubo-xml-prune'];
    xmlPrune$1.injections = [hit, logMessage, toRegExp, getXhrData, objectToString, matchRequestProps, getMatchPropsData, getRequestProps, validateParsedData, parseMatchProps, isValidStrPattern, escapeRegExp, isEmptyObject];

    /* eslint-disable max-len */
    /**
     * @scriptlet m3u-prune
     *
     * @description
     * Removes content from the specified M3U file.
     *
     * Related UBO scriptlet:
     * https://github.com/gorhill/uBlock/wiki/Resources-Library#m3u-prunejs-
     *
     * ### Syntax
     *
     * ```text
     * example.org#%#//scriptlet('m3u-prune'[, propsToRemove[, urlToMatch]])
     * ```
     *
     * - `propsToRemove` — optional, string or regular expression
     *   to match the URL line (segment) which will be removed alongside with its tags
     * - `urlToMatch` — optional, string or regular expression for matching the request's URL
     *
     * > Usage with no arguments will log response payload and URL to browser console;
     * > it may be useful for debugging but it is not allowed for prod versions of filter lists.
     *
     * ### Examples
     *
     * 1. Removes a tag which contains `example.com/video/`, from all requests
     *
     *     ```adblock
     *     example.org#%#//scriptlet('m3u-prune', 'example.com/video/')
     *     ```
     *
     * 1. Removes a line which contains `example.com/video/`, only if request's URL contains `.m3u8`
     *
     *     ```adblock
     *     example.org#%#//scriptlet('m3u-prune', 'example.com/video/', '.m3u8')
     *     ```
     *
     * 1. Call with no arguments will log response payload and URL at the console
     *
     *     ```adblock
     *     example.org#%#//scriptlet('m3u-prune')
     *     ```
     *
     * 1. Call with only `urlToMatch` argument will log response payload and URL only for the matched URL
     *
     *     ```adblock
     *     example.org#%#//scriptlet('m3u-prune', '', '.m3u8')
     *     ```
     *
     * @added v1.9.1.
     */
    /* eslint-enable max-len */

    function m3uPrune$1(source, propsToRemove) {
      let urlToMatch = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';
      // do nothing if browser does not support fetch or Proxy (e.g. Internet Explorer)
      // https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect
      if (typeof Reflect === 'undefined' || typeof fetch === 'undefined' || typeof Proxy === 'undefined' || typeof Response === 'undefined') {
        return;
      }
      let shouldPruneResponse = false;
      const urlMatchRegexp = toRegExp(urlToMatch);
      const SEGMENT_MARKER = '#';
      const AD_MARKER = {
        ASSET: '#EXT-X-ASSET:',
        CUE: '#EXT-X-CUE:',
        CUE_IN: '#EXT-X-CUE-IN',
        DISCONTINUITY: '#EXT-X-DISCONTINUITY',
        EXTINF: '#EXTINF',
        EXTM3U: '#EXTM3U',
        SCTE35: '#EXT-X-SCTE35:'
      };
      const COMCAST_AD_MARKER = {
        AD: '-AD-',
        VAST: '-VAST-',
        VMAP_AD: '-VMAP-AD-',
        VMAP_AD_BREAK: '#EXT-X-VMAP-AD-BREAK:'
      };

      // List of tags which should not be removed
      const TAGS_ALLOWLIST = ['#EXT-X-TARGETDURATION', '#EXT-X-MEDIA-SEQUENCE', '#EXT-X-DISCONTINUITY-SEQUENCE', '#EXT-X-ENDLIST', '#EXT-X-PLAYLIST-TYPE', '#EXT-X-I-FRAMES-ONLY', '#EXT-X-MEDIA', '#EXT-X-STREAM-INF', '#EXT-X-I-FRAME-STREAM-INF', '#EXT-X-SESSION-DATA', '#EXT-X-SESSION-KEY', '#EXT-X-INDEPENDENT-SEGMENTS', '#EXT-X-START'];
      const isAllowedTag = function isAllowedTag(str) {
        return TAGS_ALLOWLIST.some(function (el) {
          return str.startsWith(el);
        });
      };

      /**
       * Sets an item in array to undefined, if it contains one of the
       * AD_MARKER: AD_MARKER.EXTINF, AD_MARKER.DISCONTINUITY
       *
       * @param {Array} lines
       * @param {number} i
       * @returns {Object} { array, index }
       */
      const pruneExtinfFromVmapBlock = function pruneExtinfFromVmapBlock(lines, i) {
        let array = lines.slice();
        let index = i;
        if (array[index].includes(AD_MARKER.EXTINF)) {
          array[index] = undefined;
          index += 1;
          if (array[index].includes(AD_MARKER.DISCONTINUITY)) {
            array[index] = undefined;
            index += 1;
            const prunedExtinf = pruneExtinfFromVmapBlock(array, index);
            array = prunedExtinf.array;
            index = prunedExtinf.index;
          }
        }
        return {
          array,
          index
        };
      };

      /**
       * Sets an item in array to undefined, if it contains one of the
       * COMCAST_AD_MARKER: COMCAST_AD_MARKER.VMAP_AD, COMCAST_AD_MARKER.VAST, COMCAST_AD_MARKER.AD
       *
       * @param {Array} lines
       * @returns {Array}
       */
      const pruneVmapBlock = function pruneVmapBlock(lines) {
        let array = lines.slice();
        for (let i = 0; i < array.length - 1; i += 1) {
          if (array[i].includes(COMCAST_AD_MARKER.VMAP_AD) || array[i].includes(COMCAST_AD_MARKER.VAST) || array[i].includes(COMCAST_AD_MARKER.AD)) {
            array[i] = undefined;
            if (array[i + 1].includes(AD_MARKER.EXTINF)) {
              i += 1;
              const prunedExtinf = pruneExtinfFromVmapBlock(array, i);
              array = prunedExtinf.array;
              // It's necessary to subtract 1 from "i",
              // otherwise one line will be skipped
              i = prunedExtinf.index - 1;
            }
          }
        }
        return array;
      };

      /**
       * Sets an item in array to undefined, if it contains one of the
       * AD_MARKER: AD_MARKER.CUE, AD_MARKER.ASSET, AD_MARKER.SCTE35, AD_MARKER.CUE_IN
       *
       * @param {string} line
       * @param {number} index
       * @param {Array} array
       * @returns {string|undefined}
       */

      const pruneSpliceoutBlock = function pruneSpliceoutBlock(line, index, array) {
        if (!line.startsWith(AD_MARKER.CUE)) {
          return line;
        }
        line = undefined;
        index += 1;
        if (array[index].startsWith(AD_MARKER.ASSET)) {
          array[index] = undefined;
          index += 1;
        }
        if (array[index].startsWith(AD_MARKER.SCTE35)) {
          array[index] = undefined;
          index += 1;
        }
        if (array[index].startsWith(AD_MARKER.CUE_IN)) {
          array[index] = undefined;
          index += 1;
        }
        if (array[index].startsWith(AD_MARKER.SCTE35)) {
          array[index] = undefined;
        }
        return line;
      };
      const removeM3ULineRegexp = toRegExp(propsToRemove);

      /**
       * Sets an item in array to undefined, if it contains removeM3ULineRegexp and one of the
       * AD_MARKER: AD_MARKER.EXTINF, AD_MARKER.DISCONTINUITY
       *
       * @param {string} line
       * @param {number} index
       * @param {Array} array
       * @returns {string|undefined}
       */

      const pruneInfBlock = function pruneInfBlock(line, index, array) {
        if (!line.startsWith(AD_MARKER.EXTINF)) {
          return line;
        }
        if (!removeM3ULineRegexp.test(array[index + 1])) {
          return line;
        }
        if (!isAllowedTag(array[index])) {
          array[index] = undefined;
        }
        index += 1;
        if (!isAllowedTag(array[index])) {
          array[index] = undefined;
        }
        index += 1;
        if (array[index].startsWith(AD_MARKER.DISCONTINUITY)) {
          array[index] = undefined;
        }
        return line;
      };

      /**
       * Removes block of segments (if it contains removeM3ULineRegexp) until another segment occurs
       *
       * @param {Array} lines
       * @returns {Array}
       */
      const pruneSegments = function pruneSegments(lines) {
        for (let i = 0; i < lines.length - 1; i += 1) {
          var _lines$i;
          if ((_lines$i = lines[i]) !== null && _lines$i !== void 0 && _lines$i.startsWith(SEGMENT_MARKER) && removeM3ULineRegexp.test(lines[i])) {
            const segmentName = lines[i].substring(0, lines[i].indexOf(':'));
            if (!segmentName) {
              return lines;
            }
            lines[i] = undefined;
            i += 1;
            for (let j = i; j < lines.length; j += 1) {
              if (!lines[j].includes(segmentName) && !isAllowedTag(lines[j])) {
                lines[j] = undefined;
              } else {
                i = j - 1;
                break;
              }
            }
          }
        }
        return lines;
      };

      /**
       * Determines if text contains "#EXTM3U" or "VMAP_AD_BREAK"
       *
       * @param {*} text
       * @returns {boolean}
       */
      const isM3U = function isM3U(text) {
        if (typeof text === 'string') {
          // Check if "text" starts with "#EXTM3U" or with "VMAP_AD_BREAK"
          // If so, then it might be an M3U file and should be pruned or logged
          const trimmedText = text.trim();
          return trimmedText.startsWith(AD_MARKER.EXTM3U) || trimmedText.startsWith(COMCAST_AD_MARKER.VMAP_AD_BREAK);
        }
        return false;
      };

      /**
       * Determines if pruning is needed
       *
       * @param {string} text
       * @param {RegExp} regexp
       * @returns {boolean}
       */
      const isPruningNeeded = function isPruningNeeded(text, regexp) {
        return isM3U(text) && regexp.test(text);
      };

      /**
       * Prunes lines which contain removeM3ULineRegexp and specific AD_MARKER
       *
       * @param {string} text
       * @returns {string}
       */
      // TODO: make it compatible with $hls modifier
      const pruneM3U = function pruneM3U(text) {
        let lines = text.split(/\n\r|\n|\r/);
        if (text.includes(COMCAST_AD_MARKER.VMAP_AD_BREAK)) {
          lines = pruneVmapBlock(lines);
          return lines.filter(function (l) {
            return !!l;
          }).join('\n');
        }
        lines = pruneSegments(lines);
        return lines.map(function (line, index, array) {
          if (typeof line === 'undefined') {
            return line;
          }
          line = pruneSpliceoutBlock(line, index, array);
          if (typeof line !== 'undefined') {
            line = pruneInfBlock(line, index, array);
          }
          return line;
        }).filter(function (l) {
          return !!l;
        }).join('\n');
      };
      const nativeOpen = window.XMLHttpRequest.prototype.open;
      const nativeSend = window.XMLHttpRequest.prototype.send;
      let xhrData;
      const openWrapper = function openWrapper(target, thisArg, args) {
        // eslint-disable-next-line prefer-spread
        xhrData = getXhrData.apply(null, args);
        if (matchRequestProps(source, urlToMatch, xhrData)) {
          thisArg.shouldBePruned = true;
        }

        // Trap setRequestHeader of target xhr object to mimic request headers later
        if (thisArg.shouldBePruned) {
          thisArg.collectedHeaders = [];
          const setRequestHeaderWrapper = function setRequestHeaderWrapper(target, thisArg, args) {
            // Collect headers
            thisArg.collectedHeaders.push(args);
            return Reflect.apply(target, thisArg, args);
          };
          const setRequestHeaderHandler = {
            apply: setRequestHeaderWrapper
          };

          // setRequestHeader can only be called on open xhr object,
          // so we can safely proxy it here
          thisArg.setRequestHeader = new Proxy(thisArg.setRequestHeader, setRequestHeaderHandler);
        }
        return Reflect.apply(target, thisArg, args);
      };
      const sendWrapper = function sendWrapper(target, thisArg, args) {
        const allowedResponseTypeValues = ['', 'text'];
        // Do nothing if request do not match
        // or response type is not a string
        if (!thisArg.shouldBePruned || !allowedResponseTypeValues.includes(thisArg.responseType)) {
          return Reflect.apply(target, thisArg, args);
        }

        /**
         * Create separate XHR request with original request's input
         * to be able to collect response data without triggering
         * listeners on original XHR object
         */
        const forgedRequest = new XMLHttpRequest();
        forgedRequest.addEventListener('readystatechange', function () {
          if (forgedRequest.readyState !== 4) {
            return;
          }
          const readyState = forgedRequest.readyState,
            response = forgedRequest.response,
            responseText = forgedRequest.responseText,
            responseURL = forgedRequest.responseURL,
            responseXML = forgedRequest.responseXML,
            status = forgedRequest.status,
            statusText = forgedRequest.statusText;

          // Extract content from response
          const content = responseText || response;
          if (typeof content !== 'string') {
            return;
          }
          if (!propsToRemove) {
            if (isM3U(response)) {
              const message = "XMLHttpRequest.open() URL: ".concat(responseURL, "\nresponse: ").concat(response);
              logMessage(source, message);
            }
          } else {
            shouldPruneResponse = isPruningNeeded(response, removeM3ULineRegexp);
          }
          const responseContent = shouldPruneResponse ? pruneM3U(response) : response;
          // Manually put required values into target XHR object
          // as thisArg can't be redefined and XHR objects can't be (re)assigned or copied
          Object.defineProperties(thisArg, {
            // original values
            readyState: {
              value: readyState,
              writable: false
            },
            responseURL: {
              value: responseURL,
              writable: false
            },
            responseXML: {
              value: responseXML,
              writable: false
            },
            status: {
              value: status,
              writable: false
            },
            statusText: {
              value: statusText,
              writable: false
            },
            // modified values
            response: {
              value: responseContent,
              writable: false
            },
            responseText: {
              value: responseContent,
              writable: false
            }
          });

          // Mock events
          setTimeout(function () {
            const stateEvent = new Event('readystatechange');
            thisArg.dispatchEvent(stateEvent);
            const loadEvent = new Event('load');
            thisArg.dispatchEvent(loadEvent);
            const loadEndEvent = new Event('loadend');
            thisArg.dispatchEvent(loadEndEvent);
          }, 1);
          hit(source);
        });
        nativeOpen.apply(forgedRequest, [xhrData.method, xhrData.url]);

        // Mimic request headers before sending
        // setRequestHeader can only be called on open request objects
        thisArg.collectedHeaders.forEach(function (header) {
          const name = header[0];
          const value = header[1];
          forgedRequest.setRequestHeader(name, value);
        });
        thisArg.collectedHeaders = [];
        try {
          nativeSend.call(forgedRequest, args);
        } catch (_unused) {
          return Reflect.apply(target, thisArg, args);
        }
        return undefined;
      };
      const openHandler = {
        apply: openWrapper
      };
      const sendHandler = {
        apply: sendWrapper
      };
      XMLHttpRequest.prototype.open = new Proxy(XMLHttpRequest.prototype.open, openHandler);
      XMLHttpRequest.prototype.send = new Proxy(XMLHttpRequest.prototype.send, sendHandler);
      const nativeFetch = window.fetch;
      const fetchWrapper = async function fetchWrapper(target, thisArg, args) {
        const fetchURL = args[0] instanceof Request ? args[0].url : args[0];
        if (typeof fetchURL !== 'string' || fetchURL.length === 0) {
          return Reflect.apply(target, thisArg, args);
        }
        if (urlMatchRegexp.test(fetchURL)) {
          const response = await nativeFetch(...args);
          // It's required to fix issue with - Request with body": Failed to execute 'fetch' on 'Window':
          // Cannot construct a Request with a Request object that has already been used.
          // For example, it occurs on youtube when scriptlet is used without arguments
          const clonedResponse = response.clone();
          const responseText = await response.text();
          // If "propsToRemove" is not defined, then response should be logged only
          if (!propsToRemove && isM3U(responseText)) {
            const message = "fetch URL: ".concat(fetchURL, "\nresponse text: ").concat(responseText);
            logMessage(source, message);
            return clonedResponse;
          }
          if (isPruningNeeded(responseText, removeM3ULineRegexp)) {
            const prunedText = pruneM3U(responseText);
            hit(source);
            return new Response(prunedText, {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers
            });
          }
          return clonedResponse;
        }
        return Reflect.apply(target, thisArg, args);
      };
      const fetchHandler = {
        apply: fetchWrapper
      };
      window.fetch = new Proxy(window.fetch, fetchHandler);
    }
    m3uPrune$1.names = ['m3u-prune',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'm3u-prune.js', 'ubo-m3u-prune.js', 'ubo-m3u-prune'];
    m3uPrune$1.injections = [hit, toRegExp, logMessage, getXhrData, objectToString, matchRequestProps, getMatchPropsData, getRequestProps, validateParsedData, parseMatchProps, isValidStrPattern, escapeRegExp, isEmptyObject];

    /* eslint-disable max-len */
    /**
     * @trustedScriptlet trusted-set-cookie
     *
     * @description
     * Sets a cookie with arbitrary name and value,
     * and with optional ability to offset cookie attribute 'expires' and set path.
     *
     * ### Syntax
     *
     * ```text
     * example.org#%#//scriptlet('trusted-set-cookie', name, value[, offsetExpiresSec[, path]])
     * ```
     *
     * - `name` — required, cookie name to be set
     * - `value` — required, cookie value. Possible values:
     *     - arbitrary value
     *     - empty string for no value
     *     - `$now$` keyword for setting current time in ms, e.g 1667915146503
     *     - `$currentDate$` keyword for setting current time as string, e.g 'Tue Nov 08 2022 13:53:19 GMT+0300'
     * - `offsetExpiresSec` — optional, offset from current time in seconds, after which cookie should expire;
     *   defaults to no offset. Possible values:
     *     - positive integer in seconds
     *     - `1year` keyword for setting expiration date to one year
     *     - `1day` keyword for setting expiration date to one day
     * - `path` — optional, argument for setting cookie path, defaults to `/`; possible values:
     *     - `/` — root path
     *     - `none` — to set no path at all
     *
     * > Note that the scriptlet does not encode cookie names and values.
     * > As a result, if a cookie's name or value includes `;`,
     * > the scriptlet will not set the cookie since this may cause the cookie to break.
     *
     * ### Examples
     *
     * 1. Set cookie
     *
     *     ```adblock
     *     example.org#%#//scriptlet('trusted-set-cookie', 'cmpconsent', 'accept')
     *     example.org#%#//scriptlet('trusted-set-cookie', 'cmpconsent', '1-accept_1')
     *     ```
     *
     * 1. Set cookie with `new Date().getTime()` value
     *
     *     ```adblock
     *     example.org#%#//scriptlet('trusted-set-cookie', 'cmpconsent', '$now$')
     *     ```
     *
     * 1. Set cookie which will expire in 3 days
     *
     *     ```adblock
     *     example.org#%#//scriptlet('trusted-set-cookie', 'cmpconsent', 'accept', '259200')
     *     ```
     *
     * 1. Set cookie which will expire in one year
     *
     *     ```adblock
     *     example.org#%#//scriptlet('trusted-set-cookie', 'cmpconsent', 'accept', '1year')
     *     ```
     *
     * 1. Set cookie with no path
     *
     *     ```adblock
     *     example.org#%#//scriptlet('trusted-set-cookie', 'cmpconsent', 'decline', '', 'none')
     *     ```
     *
     * @added v1.7.3.
     */
    /* eslint-enable max-len */

    function trustedSetCookie$1(source, name, value) {
      let offsetExpiresSec = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : '';
      let path = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : '/';
      if (typeof name === 'undefined') {
        logMessage(source, 'Cookie name should be specified');
        return;
      }
      if (typeof value === 'undefined') {
        logMessage(source, 'Cookie value should be specified');
        return;
      }
      const parsedValue = parseKeywordValue(value);
      if (!isValidCookiePath(path)) {
        logMessage(source, "Invalid cookie path: '".concat(path, "'"));
        return;
      }
      let cookieToSet = concatCookieNameValuePath(name, parsedValue, path, false);
      if (!cookieToSet) {
        logMessage(source, 'Invalid cookie name or value');
        return;
      }
      if (offsetExpiresSec) {
        const parsedOffsetMs = getTrustedCookieOffsetMs(offsetExpiresSec);
        if (!parsedOffsetMs) {
          logMessage(source, "Invalid offsetExpiresSec value: ".concat(offsetExpiresSec));
          return;
        }
        const expires = Date.now() + parsedOffsetMs;
        cookieToSet += " expires=".concat(new Date(expires).toUTCString(), ";");
      }
      document.cookie = cookieToSet;
      hit(source);
    }
    trustedSetCookie$1.names = ['trusted-set-cookie'
    // trusted scriptlets support no aliases
    ];

    trustedSetCookie$1.injections = [hit, logMessage, nativeIsNaN, isCookieSetWithValue, concatCookieNameValuePath, isValidCookiePath, getTrustedCookieOffsetMs, parseKeywordValue, getCookiePath];

    /* eslint-disable max-len */
    /**
     * @trustedScriptlet trusted-set-cookie-reload
     *
     * @description
     * Sets a cookie with arbitrary name and value,
     * and with optional ability to offset cookie attribute 'expires' and set path.
     * Also reloads the current page after the cookie setting.
     * If reloading option is not needed, use the [`trusted-set-cookie` scriptlet](#trusted-set-cookie).
     *
     * ### Syntax
     *
     * ```text
     * example.org#%#//scriptlet('trusted-set-cookie-reload', name, value[, offsetExpiresSec[, path]])
     * ```
     *
     * - `name` — required, cookie name to be set
     * - `value` — required, cookie value. Possible values:
     *     - arbitrary value
     *     - empty string for no value
     *     - `$now$` keyword for setting current time in ms, e.g 1667915146503
     *     - `$currentDate$` keyword for setting current time as string, e.g 'Tue Nov 08 2022 13:53:19 GMT+0300'
     * - `offsetExpiresSec` — optional, offset from current time in seconds, after which cookie should expire;
     *   defaults to no offset. Possible values:
     *     - positive integer in seconds
     *     - `1year` keyword for setting expiration date to one year
     *     - `1day` keyword for setting expiration date to one day
     * - `path` — optional, argument for setting cookie path, defaults to `/`; possible values:
     *     - `/` — root path
     *     - `none` — to set no path at all
     *
     * > Note that the scriptlet does not encode cookie names and values.
     * > As a result, if a cookie's name or value includes `;`,
     * > the scriptlet will not set the cookie since this may cause the cookie to break.
     *
     * ### Examples
     *
     * 1. Set cookie and reload the page after it
     *
     *     ```adblock
     *     example.org#%#//scriptlet('trusted-set-cookie-reload', 'cmpconsent', 'accept')
     *     ```
     *
     * 1. Set cookie with `new Date().getTime()` value and reload the page after it
     *
     *     ```adblock
     *     example.org#%#//scriptlet('trusted-set-cookie-reload', 'cmpconsent', '$now$')
     *     ```
     *
     * 1. Set cookie which will expire in 3 days and reload the page after it
     *
     *     ```adblock
     *     example.org#%#//scriptlet('trusted-set-cookie-reload', 'cmpconsent', 'accept', '259200')
     *     ```
     *
     * 1. Set cookie which will expire in one year and reload the page after it
     *
     *     ```adblock
     *     example.org#%#//scriptlet('trusted-set-cookie-reload', 'cmpconsent', 'accept', '1year')
     *     ```
     *
     * 1. Set cookie with no 'expire' and no path, reload the page after it
     *
     *     ```adblock
     *     example.org#%#//scriptlet('trusted-set-cookie-reload', 'cmpconsent', 'decline', '', 'none')
     *     ```
     *
     * @added v1.7.10.
     */
    /* eslint-enable max-len */

    function trustedSetCookieReload$1(source, name, value) {
      let offsetExpiresSec = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : '';
      let path = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : '/';
      if (typeof name === 'undefined') {
        logMessage(source, 'Cookie name should be specified');
        return;
      }
      if (typeof value === 'undefined') {
        logMessage(source, 'Cookie value should be specified');
        return;
      }

      // Prevent infinite reloads if cookie was already set or blocked by the browser
      // https://github.com/AdguardTeam/Scriptlets/issues/212
      if (isCookieSetWithValue(document.cookie, name, value)) {
        return;
      }
      const parsedValue = parseKeywordValue(value);
      if (!isValidCookiePath(path)) {
        logMessage(source, "Invalid cookie path: '".concat(path, "'"));
        return;
      }
      let cookieToSet = concatCookieNameValuePath(name, parsedValue, path, false);
      if (!cookieToSet) {
        logMessage(source, 'Invalid cookie name or value');
        return;
      }
      if (offsetExpiresSec) {
        const parsedOffsetMs = getTrustedCookieOffsetMs(offsetExpiresSec);
        if (!parsedOffsetMs) {
          logMessage(source, "Invalid offsetExpiresSec value: ".concat(offsetExpiresSec));
          return;
        }
        const expires = Date.now() + parsedOffsetMs;
        cookieToSet += " expires=".concat(new Date(expires).toUTCString(), ";");
      }
      document.cookie = cookieToSet;
      hit(source);

      // Get cookie value, it's required for checking purpose
      // in case if $now$ or $currentDate$ value is used
      // https://github.com/AdguardTeam/Scriptlets/issues/291
      const cookieValueToCheck = parseCookieString(document.cookie)[name];

      // Only reload the page if cookie was set
      // https://github.com/AdguardTeam/Scriptlets/issues/212
      if (isCookieSetWithValue(document.cookie, name, cookieValueToCheck)) {
        window.location.reload();
      }
    }
    trustedSetCookieReload$1.names = ['trusted-set-cookie-reload'
    // trusted scriptlets support no aliases
    ];

    trustedSetCookieReload$1.injections = [hit, logMessage, nativeIsNaN, isCookieSetWithValue, concatCookieNameValuePath, isValidCookiePath, getTrustedCookieOffsetMs, parseKeywordValue, parseCookieString, getCookiePath];

    /* eslint-disable max-len */
    /**
     * @trustedScriptlet trusted-replace-fetch-response
     *
     * @description
     * Replaces response text content of `fetch` requests if **all** given parameters match.
     *
     * ### Syntax
     *
     * ```text
     * example.org#%#//scriptlet('trusted-replace-fetch-response'[, pattern, replacement[, propsToMatch]])
     * ```
     *
     * - `pattern` — optional, argument for matching contents of responseText that should be replaced.
     * If set, `replacement` is required. Possible values:
     *     - `*` to match all text content
     *     - non-empty string
     *     - regular expression
     * - `replacement` — optional, should be set if `pattern` is set. String to replace the response text content
     *   matched by `pattern`. Empty string to remove content. Defaults to empty string.
     * - `propsToMatch` — optional, string of space-separated properties to match; possible props:
     *     - string or regular expression for matching the URL passed to fetch call;
     *       empty string, wildcard `*` or invalid regular expression will match all fetch calls
     *     - colon-separated pairs `name:value` where
     *         <!-- markdownlint-disable-next-line line-length -->
     *         - `name` is [`init` option name](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters)
     *         - `value` is string or regular expression for matching the value of the option passed to fetch call;
     *           invalid regular expression will cause any value matching
     *
     * > Usage with no arguments will log fetch calls to browser console;
     * > it may be useful for debugging but it is not allowed for prod versions of filter lists.
     *
     * > Scriptlet does nothing if response body can't be converted to text.
     *
     * ### Examples
     *
     * 1. Log all fetch calls
     *
     *     ```adblock
     *     example.org#%#//scriptlet('trusted-replace-fetch-response')
     *     ```
     *
     * 1. Replace response text content of fetch requests with specific url
     *
     *     <!-- markdownlint-disable line-length -->
     *
     *     ```adblock
     *     example.org#%#//scriptlet('trusted-replace-fetch-response', 'adb_detect:true', 'adb_detect:false', 'example.org')
     *     example.org#%#//scriptlet('trusted-replace-fetch-response', '/#EXT-X-VMAP-AD-BREAK[\s\S]*?/', '#EXT-X-ENDLIST', 'example.org')
     *     ```
     *
     *     <!-- markdownlint-enable line-length -->
     *
     * 1. Remove all text content of fetch responses with specific request method
     *
     *     ```adblock
     *     example.org#%#//scriptlet('trusted-replace-fetch-response', '*', '', 'method:GET')
     *     ```
     *
     * 1. Replace response text content of fetch requests matching by URL regex and request methods
     *
     *     <!-- markdownlint-disable line-length -->
     *
     *     ```adblock
     *     example.org#%#//scriptlet('trusted-replace-fetch-response', '/#EXT-X-VMAP-AD-BREAK[\s\S]*?/', '#EXT-X-ENDLIST', '/\.m3u8/ method:/GET|HEAD/')
     *     ```
     *
     *     <!-- markdownlint-enable line-length -->
     *
     * 1. Remove text content of all fetch responses for example.com
     *
     *     ```adblock
     *     example.org#%#//scriptlet('trusted-replace-fetch-response', '*', '', 'example.com')
     *     ```
     *
     * @added v1.7.3.
     */
    /* eslint-enable max-len */
    function trustedReplaceFetchResponse$1(source) {
      let pattern = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
      let replacement = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';
      let propsToMatch = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : '';
      // do nothing if browser does not support fetch or Proxy (e.g. Internet Explorer)
      // https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
      if (typeof fetch === 'undefined' || typeof Proxy === 'undefined' || typeof Response === 'undefined') {
        return;
      }

      // Only allow pattern as empty string for logging purposes
      if (pattern === '' && replacement !== '') {
        logMessage(source, 'Pattern argument should not be empty string');
        return;
      }
      const shouldLog = pattern === '' && replacement === '';
      const nativeFetch = fetch;
      let shouldReplace = false;
      let fetchData;
      const handlerWrapper = function handlerWrapper(target, thisArg, args) {
        fetchData = getFetchData(args);
        if (shouldLog) {
          // log if no propsToMatch given
          logMessage(source, "fetch( ".concat(objectToString(fetchData), " )"), true);
          hit(source);
          return Reflect.apply(target, thisArg, args);
        }
        shouldReplace = matchRequestProps(source, propsToMatch, fetchData);
        if (!shouldReplace) {
          return Reflect.apply(target, thisArg, args);
        }

        /**
         * Create new Response object using original response' properties
         * and given text as body content
         *
         * @param {Response} response original response to copy properties from
         * @param {string} textContent text to set as body content
         * @returns {Response}
         */
        const forgeResponse = function forgeResponse(response, textContent) {
          const bodyUsed = response.bodyUsed,
            headers = response.headers,
            ok = response.ok,
            redirected = response.redirected,
            status = response.status,
            statusText = response.statusText,
            type = response.type,
            url = response.url;
          const forgedResponse = new Response(textContent, {
            status,
            statusText,
            headers
          });

          // Manually set properties which can't be set by Response constructor
          Object.defineProperties(forgedResponse, {
            url: {
              value: url
            },
            type: {
              value: type
            },
            ok: {
              value: ok
            },
            bodyUsed: {
              value: bodyUsed
            },
            redirected: {
              value: redirected
            }
          });
          return forgedResponse;
        };

        // eslint-disable-next-line prefer-spread
        return nativeFetch.apply(null, args).then(function (response) {
          return response.text().then(function (bodyText) {
            const patternRegexp = pattern === '*' ? /(\n|.)*/ : toRegExp(pattern);
            const modifiedTextContent = bodyText.replace(patternRegexp, replacement);
            const forgedResponse = forgeResponse(response, modifiedTextContent);
            hit(source);
            return forgedResponse;
          }).catch(function () {
            // log if response body can't be converted to a string
            const fetchDataStr = objectToString(fetchData);
            const message = "Response body can't be converted to text: ".concat(fetchDataStr);
            logMessage(source, message);
            return Reflect.apply(target, thisArg, args);
          });
        }).catch(function () {
          return Reflect.apply(target, thisArg, args);
        });
      };
      const fetchHandler = {
        apply: handlerWrapper
      };
      fetch = new Proxy(fetch, fetchHandler); // eslint-disable-line no-global-assign
    }

    trustedReplaceFetchResponse$1.names = ['trusted-replace-fetch-response'
    // trusted scriptlets support no aliases
    ];

    trustedReplaceFetchResponse$1.injections = [hit, logMessage, getFetchData, objectToString, matchRequestProps, toRegExp, isValidStrPattern, escapeRegExp, isEmptyObject, getRequestData, getRequestProps, parseMatchProps, validateParsedData, getMatchPropsData];

    /* eslint-disable max-len */
    /**
     * @trustedScriptlet trusted-set-local-storage-item
     *
     * @description
     * Adds item with arbitrary key and value to localStorage object, or updates the value of the key if it already exists.
     * Scriptlet won't set item if storage is full.
     *
     * ### Syntax
     *
     * ```adblock
     * example.com#%#//scriptlet('trusted-set-local-storage-item', 'key', 'value')
     * ```
     *
     * - `key` — required, key name to be set.
     * - `value` — required, key value; possible values:
     *     - arbitrary value
     *     - `$now$` keyword for setting current time in ms, corresponds to `Date.now()` and `(new Date).getTime()` calls
     *     - `$currentDate$` keyword for setting string representation of the current date and time,
     *       corresponds to `Date()` and `(new Date).toString()` calls
     *
     * ### Examples
     *
     * 1. Set local storage item
     *
     *     ```adblock
     *     example.org#%#//scriptlet('trusted-set-local-storage-item', 'player.live.current.mute', 'false')
     *
     *     example.org#%#//scriptlet('trusted-set-local-storage-item', 'COOKIE_CONSENTS', '{"preferences":3,"flag":false}')
     *
     *     example.org#%#//scriptlet('trusted-set-local-storage-item', 'providers', '[16364,88364]')
     *
     *     example.org#%#//scriptlet('trusted-set-local-storage-item', 'providers', '{"providers":[123,456],"consent":"all"}')
     *     ```
     *
     * 1. Set item with current time since unix epoch in ms
     *
     *     ```adblock
     *     example.org#%#//scriptlet('trusted-set-local-storage-item', 'player.live.current.play', '$now$')
     *     ```
     *
     * 1. Set item with current date, e.g 'Tue Nov 08 2022 13:53:19 GMT+0300'
     *
     *     ```adblock
     *     example.org#%#//scriptlet('trusted-set-local-storage-item', 'player.live.current.play', '$currentDate$')
     *     ```
     *
     * 1. Set item without value
     *
     *     ```adblock
     *     example.org#%#//scriptlet('trusted-set-local-storage-item', 'ppu_main_none', '')
     *     ```
     *
     * @added v1.7.3.
     */
    /* eslint-enable max-len */

    function trustedSetLocalStorageItem$1(source, key, value) {
      if (typeof key === 'undefined') {
        logMessage(source, 'Item key should be specified');
        return;
      }
      if (typeof value === 'undefined') {
        logMessage(source, 'Item value should be specified');
        return;
      }
      const parsedValue = parseKeywordValue(value);
      const _window = window,
        localStorage = _window.localStorage;
      setStorageItem(source, localStorage, key, parsedValue);
      hit(source);
    }
    trustedSetLocalStorageItem$1.names = ['trusted-set-local-storage-item'
    // trusted scriptlets support no aliases
    ];

    trustedSetLocalStorageItem$1.injections = [hit, logMessage, nativeIsNaN, setStorageItem, parseKeywordValue];

    /* eslint-disable max-len */
    /**
     * @trustedScriptlet trusted-set-constant
     *
     * @description
     * Creates a constant property and assigns it a specified value.
     *
     * > Actually, it's not a constant. Please note, that it can be rewritten with a value of a different type.
     *
     * > If empty object is present in chain it will be trapped until chain leftovers appear.
     *
     * > Use [set-constant](./about-scriptlets.md#set-constant) to set predefined values and functions.
     *
     * ### Syntax
     *
     * ```text
     * example.org#%#//scriptlet('trusted-set-constant', property, value[, stack])
     * ```
     *
     * - `property` — required, path to a property (joined with `.` if needed). The property must be attached to `window`.
     * - `value` — required, an arbitrary value to be set; value type is being inferred from the argument,
     *   e.g '500' will be set as number; to set string type value wrap argument into another pair of quotes: `'"500"'`;
     * - `stack` — optional, string or regular expression that must match the current function call stack trace;
     *   if regular expression is invalid it will be skipped
     *
     * ### Examples
     *
     * 1. Set property values of different types
     *
     *     ```adblock
     *     ! Set string value wrapping argument into another pair of quotes
     *     example.org#%#//scriptlet('trusted-set-constant', 'click_r', '"null"')
     *
     *     ✔ window.click_r === 'null'
     *     ✔ typeof window.click_r === 'string'
     *
     *     ! Set inferred null value
     *     example.org#%#//scriptlet('trusted-set-constant', 'click_r', 'null')
     *
     *     ✔ window.click_r === null
     *     ✔ typeof window.click_r === 'object'
     *
     *     ! Set number type value
     *     example.org#%#//scriptlet('trusted-set-constant', 'click_r', '48')
     *
     *     ✔ window.click_r === 48
     *     ✔ typeof window.click_r === 'number'
     *
     *     ! Set array or object as property value, argument should be a JSON string
     *     example.org#%#//scriptlet('trusted-set-constant', 'click_r', '[1,"string"]')
     *     example.org#%#//scriptlet('trusted-set-constant', 'click_r', '{"aaa":123,"bbb":{"ccc":"string"}}')
     *     ```
     *
     * 1. Use script stack matching to set value
     *
     *     ```adblock
     *     ! `document.first` will return `1` if the method is related to `checking.js`
     *     example.org#%#//scriptlet('trusted-set-constant', 'document.first', '1', 'checking.js')
     *
     *     ✔ document.first === 1  // if the condition described above is met
     *     ```
     *
     * @added v1.8.2.
     */
    /* eslint-enable max-len */
    function trustedSetConstant$1(source, property, value, stack) {
      if (!property || !matchStackTrace(stack, new Error().stack)) {
        return;
      }
      let constantValue;
      try {
        constantValue = inferValue(value);
      } catch (e) {
        logMessage(source, e);
        return;
      }
      let canceled = false;
      const mustCancel = function mustCancel(value) {
        if (canceled) {
          return canceled;
        }
        canceled = value !== undefined && constantValue !== undefined && typeof value !== typeof constantValue && value !== null;
        return canceled;
      };

      /**
       * Safely sets property on a given object
       *
       * IMPORTANT! this duplicates corresponding func in set-constant scriptlet as
       * reorganizing this to common helpers will most definitely complicate debugging
       *
       * @param {Object} base arbitrary reachable object
       * @param {string} prop property name
       * @param {boolean} configurable if set property should be configurable
       * @param {Object} handler custom property descriptor object
       * @returns {boolean} true if prop was trapped successfully
       */
      const trapProp = function trapProp(base, prop, configurable, handler) {
        if (!handler.init(base[prop])) {
          return false;
        }
        const origDescriptor = Object.getOwnPropertyDescriptor(base, prop);
        let prevSetter;
        // This is required to prevent scriptlets overwrite each over
        if (origDescriptor instanceof Object) {
          // This check is required to avoid defining non-configurable props
          if (!origDescriptor.configurable) {
            const message = "Property '".concat(prop, "' is not configurable");
            logMessage(source, message);
            return false;
          }
          base[prop] = constantValue;
          if (origDescriptor.set instanceof Function) {
            prevSetter = origDescriptor.set;
          }
        }
        Object.defineProperty(base, prop, {
          configurable,
          get() {
            return handler.get();
          },
          set(a) {
            if (prevSetter !== undefined) {
              prevSetter(a);
            }
            handler.set(a);
          }
        });
        return true;
      };

      /**
       * Traverses given chain to set constant value to its end prop
       * Chains that yet include non-object values (e.g null) are valid and will be
       * traversed when appropriate chain member is set by an external script
       *
       * IMPORTANT! this duplicates corresponding func in set-constant scriptlet as
       * reorganizing this to common helpers will most definitely complicate debugging
       *
       * @param {Object} owner object that owns chain
       * @param {string} property chain of owner properties
       */
      const setChainPropAccess = function setChainPropAccess(owner, property) {
        const chainInfo = getPropertyInChain(owner, property);
        const base = chainInfo.base;
        const prop = chainInfo.prop,
          chain = chainInfo.chain;

        // Handler method init is used to keep track of factual value
        // and apply mustCancel() check only on end prop
        const inChainPropHandler = {
          factValue: undefined,
          init(a) {
            this.factValue = a;
            return true;
          },
          get() {
            return this.factValue;
          },
          set(a) {
            // Prevent breakage due to loop assignments like win.obj = win.obj
            if (this.factValue === a) {
              return;
            }
            this.factValue = a;
            if (a instanceof Object) {
              setChainPropAccess(a, chain);
            }
          }
        };
        const endPropHandler = {
          init(a) {
            if (mustCancel(a)) {
              return false;
            }
            return true;
          },
          get() {
            return constantValue;
          },
          set(a) {
            if (!mustCancel(a)) {
              return;
            }
            constantValue = a;
          }
        };

        // End prop case
        if (!chain) {
          const isTrapped = trapProp(base, prop, false, endPropHandler);
          if (isTrapped) {
            hit(source);
          }
          return;
        }

        // Null prop in chain
        if (base !== undefined && base[prop] === null) {
          trapProp(base, prop, true, inChainPropHandler);
          return;
        }

        // Empty object prop in chain
        if ((base instanceof Object || typeof base === 'object') && isEmptyObject(base)) {
          trapProp(base, prop, true, inChainPropHandler);
        }

        // Defined prop in chain
        const propValue = owner[prop];
        if (propValue instanceof Object || typeof propValue === 'object' && propValue !== null) {
          setChainPropAccess(propValue, chain);
        }

        // Undefined prop in chain
        trapProp(base, prop, true, inChainPropHandler);
      };
      setChainPropAccess(window, property);
    }
    trustedSetConstant$1.names = ['trusted-set-constant'
    // trusted scriptlets support no aliases
    ];

    trustedSetConstant$1.injections = [hit, inferValue, logMessage, noopArray, noopObject, noopFunc, noopCallbackFunc, trueFunc, falseFunc, throwFunc, noopPromiseReject, noopPromiseResolve, getPropertyInChain, setPropertyAccess, toRegExp, matchStackTrace, nativeIsNaN, isEmptyObject, getNativeRegexpTest,
    // following helpers should be imported and injected
    // because they are used by helpers above
    shouldAbortInlineOrInjectedScript];

    /* eslint-disable max-len */
    /**
     * @scriptlet inject-css-in-shadow-dom
     *
     * @description
     * Injects CSS rule into selected Shadow DOM subtrees on a page
     *
     * ### Syntax
     *
     * ```text
     * example.org#%#//scriptlet('inject-css-in-shadow-dom', cssRule[, hostSelector])
     * ```
     *
     * - `cssRule` — required, string representing a single css rule
     * - `hostSelector` — optional, string, selector to match shadow host elements.
     *   CSS rule will be only applied to shadow roots inside these elements.
     *   Defaults to injecting css rule into all available roots.
     *
     * ### Examples
     *
     * 1. Apply style to all shadow dom subtrees
     *
     *     ```adblock
     *     example.org#%#//scriptlet('inject-css-in-shadow-dom', '#advertisement { display: none !important; }')
     *     ```
     *
     * 1. Apply style to a specific shadow dom subtree
     *
     *     ```adblock
     *     example.org#%#//scriptlet('inject-css-in-shadow-dom', '#content { margin-top: 0 !important; }', '#banner')
     *     ```
     *
     * @added v1.8.2.
     */
    /* eslint-enable max-len */

    function injectCssInShadowDom$1(source, cssRule) {
      let hostSelector = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';
      // do nothing if browser does not support ShadowRoot, Proxy or Reflect
      // https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot
      if (!Element.prototype.attachShadow || typeof Proxy === 'undefined' || typeof Reflect === 'undefined') {
        return;
      }

      // Prevent url() and image-set() styles from being applied
      if (cssRule.match(/(url|image-set)\(.*\)/i)) {
        logMessage(source, '"url()" function is not allowed for css rules');
        return;
      }
      const callback = function callback(shadowRoot) {
        try {
          // adoptedStyleSheets and CSSStyleSheet constructor are not yet supported by Safari
          // https://developer.mozilla.org/en-US/docs/Web/API/Document/adoptedStyleSheets
          // https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet/CSSStyleSheet
          const stylesheet = new CSSStyleSheet();
          try {
            stylesheet.insertRule(cssRule);
          } catch (e) {
            logMessage(source, "Unable to apply the rule '".concat(cssRule, "' due to: \n'").concat(e.message, "'"));
            return;
          }
          shadowRoot.adoptedStyleSheets = [...shadowRoot.adoptedStyleSheets, stylesheet];
        } catch (_unused) {
          const styleTag = document.createElement('style');
          styleTag.innerText = cssRule;
          shadowRoot.appendChild(styleTag);
        }
        hit(source);
      };
      hijackAttachShadow(window, hostSelector, callback);
    }
    injectCssInShadowDom$1.names = ['inject-css-in-shadow-dom'];
    injectCssInShadowDom$1.injections = [hit, logMessage, hijackAttachShadow];

    /* eslint-disable max-len */
    /**
     * @scriptlet remove-node-text
     *
     * @description
     * Removes text from DOM nodes.
     *
     * Related UBO scriptlet:
     * https://github.com/gorhill/uBlock/commit/2bb446797a12086f2eebc0c8635b671b8b90c477
     *
     * ### Syntax
     *
     * ```adblock
     * example.org#%#//scriptlet('remove-node-text', nodeName, condition)
     * ```
     *
     * - `nodeName` — required, string or RegExp, specifies DOM node name from which the text will be removed.
     * Must target lowercased node names, e.g `div` instead of `DIV`.
     * - `textMatch` — required, string or RegExp to match against node's text content.
     * If matched, the whole text will be removed. Case sensitive.
     *
     * ### Examples
     *
     * 1. Remove node's text content:
     *
     *     ```adblock
     *     example.org#%#//scriptlet('remove-node-text', 'div', 'some text')
     *     ```
     *
     *     ```html
     *     <!-- before -->
     *     <div>some text</div>
     *     <span>some text</span>
     *
     *     <!-- after -->
     *     <div></div   >
     *     <span>some text</span>
     *     ```
     *
     * 2. Remove node's text content, matching both node name and condition by RegExp:
     *
     *     ```adblock
     *     example.org#%#//scriptlet('remove-node-text', '/[a-z]*[0-9]/', '/text/')
     *     ```
     *
     *     ```html
     *     <!-- before -->
     *     <qrce3>some text</qrce3>
     *     <span>some text</span>
     *
     *     <!-- after -->
     *     <qrce3></qrce3>
     *     <span>some text</span>
     *     ```
     *
     * @added v1.9.37.
     */
    /* eslint-enable max-len */
    function removeNodeText$1(source, nodeName, textMatch) {
      const _parseNodeTextParams = parseNodeTextParams(nodeName, textMatch),
        selector = _parseNodeTextParams.selector,
        nodeNameMatch = _parseNodeTextParams.nodeNameMatch,
        textContentMatch = _parseNodeTextParams.textContentMatch;

      /**
       * Handles nodes by removing text content of matched nodes
       *
       * Note: instead of drilling down all the arguments for both replace-node-text
       * and trusted-replace-node-text scriptlets, only the handler is being passed
       *
       * @param {Node[]} nodes nodes to handle
       * @returns {void}
       */
      const handleNodes = function handleNodes(nodes) {
        return nodes.forEach(function (node) {
          const shouldReplace = isTargetNode(node, nodeNameMatch, textContentMatch);
          if (shouldReplace) {
            const ALL_TEXT_PATTERN = /^[\s\S]*$/;
            const REPLACEMENT = '';
            replaceNodeText(source, node, ALL_TEXT_PATTERN, REPLACEMENT);
          }
        });
      };

      // Apply dedicated handler to already rendered nodes...
      if (document.documentElement) {
        handleExistingNodes(selector, handleNodes);
      }

      // and newly added nodes
      observeDocumentWithTimeout(function (mutations) {
        return handleMutations(mutations, handleNodes);
      }, {
        childList: true,
        subtree: true
      });
    }
    removeNodeText$1.names = ['remove-node-text',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'remove-node-text.js', 'ubo-remove-node-text.js', 'rmnt.js', 'ubo-rmnt.js', 'ubo-remove-node-text', 'ubo-rmnt'];
    removeNodeText$1.injections = [observeDocumentWithTimeout, handleExistingNodes, handleMutations, replaceNodeText, isTargetNode, parseNodeTextParams,
    // following helpers should be imported and injected
    // because they are used by helpers above
    hit, nodeListToArray, getAddedNodes, toRegExp];

    /* eslint-disable max-len */
    /**
     * @trustedScriptlet trusted-replace-node-text
     *
     * @description
     * Replaces text in text content of matched DOM nodes.
     *
     * ### Syntax
     *
     * ```adblock
     * example.org#%#//scriptlet('trusted-replace-node-text', nodeName, textMatch, pattern, replacement)
     * ```
     *
     * - `nodeName` — required, string or RegExp, specifies DOM node name from which the text will be removed.
     * Must target lowercased node names, e.g `div` instead of `DIV`.
     * - `textMatch` — required, string or RegExp to match against node's text content.
     * If matched, the whole text will be removed. Case sensitive.
     * - `pattern` — required, string or regexp for matching contents of `node.textContent` that should be replaced.
     * - `replacement` — required, string to replace text content matched by `pattern`.
     *
     * ### Examples
     *
     * 1. Replace node's text content:
     *
     *     ```adblock
     *     example.org#%#//scriptlet('trusted-replace-node-text', 'div', 'some', 'text', 'other text')
     *     ```
     *
     *     ```html
     *     <!-- before -->
     *     <div>some text</div>
     *     <div>text</div>
     *     <span>some text</span>
     *
     *     <!-- after -->
     *     <div>some other text</div>
     *     <div>text</div>
     *     <span>some text</span>
     *     ```
     *
     * 2. Replace node's text content, matching both node name, text and pattern by RegExp:
     *
     *     ```adblock
     *     example.org#%#//scriptlet('trusted-replace-node-text', '/[a-z]*[0-9]/', '/s\dme/', '/t\dxt/', 'other text')
     *     ```
     *
     *     ```html
     *     <!-- before -->
     *     <qrce3>s0me t3xt</qrce3> // this node is going to be matched by both node name and text
     *     <qrce3>text</qrce3> // this node won't be matched by text content nor text content
     *     <span>some text</span>
     *
     *     <!-- after -->
     *     <qrce3>s0me other text</qrce3> // text content has changed
     *     <qrce3>text</qrce3>
     *     <span>some text</span>
     *     ```
     *
     * @added v1.9.37.
     */
    /* eslint-enable max-len */
    function trustedReplaceNodeText$1(source, nodeName, textMatch, pattern, replacement) {
      const uboAliases = ['replace-node-text.js', 'rpnt.js', 'sed.js'];

      /**
       * UBO replaceNodeText scriptlet has different signature:
       * function replaceNodeText(nodeName, pattern, replacement, ...extraArgs) {...}
       *
       * with extra params being passed as ['paramname', paramvalue]
       */
      if (uboAliases.includes(source.name)) {
        replacement = pattern;
        pattern = textMatch;
        // eslint-disable-next-line prefer-destructuring, prefer-rest-params
        for (var _len = arguments.length, extraArgs = new Array(_len > 5 ? _len - 5 : 0), _key = 5; _key < _len; _key++) {
          extraArgs[_key - 5] = arguments[_key];
        }
        for (let i = 0; i < extraArgs.length; i += 1) {
          const arg = extraArgs[i];
          if (arg === 'condition') {
            textMatch = extraArgs[i + 1];
            break;
          }
        }
      }
      const _parseNodeTextParams = parseNodeTextParams(nodeName, textMatch, pattern),
        selector = _parseNodeTextParams.selector,
        nodeNameMatch = _parseNodeTextParams.nodeNameMatch,
        textContentMatch = _parseNodeTextParams.textContentMatch,
        patternMatch = _parseNodeTextParams.patternMatch;

      /**
       * Handles nodes by removing text content of matched nodes
       *
       * Note: instead of drilling down all the arguments for both replace-node-text
       * and trusted-replace-node-text scriptlets, only the handler is being passed
       *
       * @param {Node[]} nodes nodes to handle
       * @returns {void}
       */
      const handleNodes = function handleNodes(nodes) {
        return nodes.forEach(function (node) {
          const shouldReplace = isTargetNode(node, nodeNameMatch, textContentMatch);
          if (shouldReplace) {
            replaceNodeText(source, node, patternMatch, replacement);
          }
        });
      };

      // Apply dedicated handler to already rendered nodes...
      if (document.documentElement) {
        handleExistingNodes(selector, handleNodes);
      }

      // and newly added nodes
      observeDocumentWithTimeout(function (mutations) {
        return handleMutations(mutations, handleNodes);
      }, {
        childList: true,
        subtree: true
      });
    }
    trustedReplaceNodeText$1.names = ['trusted-replace-node-text'
    // trusted scriptlets support no aliases
    ];

    trustedReplaceNodeText$1.injections = [observeDocumentWithTimeout, handleExistingNodes, handleMutations, replaceNodeText, isTargetNode, parseNodeTextParams,
    // following helpers should be imported and injected
    // because they are used by helpers above
    hit, nodeListToArray, getAddedNodes, toRegExp];

    /* eslint-disable max-len */
    /**
     * @scriptlet evaldata-prune
     *
     * @description
     * Removes specified properties from the result of calling eval (if payloads contains `Object`) and returns to the caller.
     *
     * Related UBO scriptlet:
     * https://github.com/gorhill/uBlock/commit/c8de9041917b61035171e454df886706f27fc4f3
     *
     * ### Syntax
     *
     * ```text
     * example.org#%#//scriptlet('evaldata-prune'[, propsToRemove [, obligatoryProps [, stack]]])
     * ```
     *
     * - `propsToRemove` — optional, string of space-separated properties to remove
     * - `obligatoryProps` — optional, string of space-separated properties
     *   which must be all present for the pruning to occur
     * - `stack` — optional, string or regular expression that must match the current function call stack trace;
     *   if regular expression is invalid it will be skipped
     *
     * > Note please that you can use wildcard `*` for chain property name,
     * > e.g. `ad.*.src` instead of `ad.0.src ad.1.src ad.2.src`.
     *
     * ### Examples
     *
     * 1. Removes property `example` from the payload of the eval call
     *
     *     ```adblock
     *     example.org#%#//scriptlet('evaldata-prune', 'example')
     *     ```
     *
     *     For instance, the following call will return `{ one: 1}`
     *
     *     ```html
     *     eval({ one: 1, example: true })
     *     ```
     *
     * 2. If there are no specified properties in the payload of eval call, pruning will NOT occur
     *
     *     ```adblock
     *     example.org#%#//scriptlet('evaldata-prune', 'one', 'obligatoryProp')
     *     ```
     *
     *     For instance, the following call will return `{ one: 1, two: 2}`
     *
     *     ```html
     *     JSON.parse('{"one":1,"two":2}')
     *     ```
     *
     * 3. A property in a list of properties can be a chain of properties
     *
     *     ```adblock
     *     example.org#%#//scriptlet('evaldata-prune', 'a.b', 'ads.url.first')
     *     ```
     *
     * 4. Removes property `content.ad` from the payload of eval call if its error stack trace contains `test.js`
     *
     *     ```adblock
     *     example.org#%#//scriptlet('evaldata-prune', 'content.ad', '', 'test.js')
     *     ```
     *
     * 5. A property in a list of properties can be a chain of properties with wildcard in it
     *
     *     ```adblock
     *     example.org#%#//scriptlet('evaldata-prune', 'content.*.media.src', 'content.*.media.ad')
     *     ```
     *
     * 6. Call with no arguments will log the current hostname and object payload at the console
     *
     *     ```adblock
     *     example.org#%#//scriptlet('evaldata-prune')
     *     ```
     *
     * 7. Call with only second argument will log the current hostname and matched object payload at the console
     *
     *     ```adblock
     *     example.org#%#//scriptlet('evaldata-prune', '', '"id":"117458"')
     *     ```
     *
     * @added v1.9.37.
     */
    /* eslint-enable max-len */
    function evalDataPrune$1(source, propsToRemove, requiredInitialProps, stack) {
      if (!!stack && !matchStackTrace(stack, new Error().stack)) {
        return;
      }
      const prunePaths = propsToRemove !== undefined && propsToRemove !== '' ? propsToRemove.split(/ +/) : [];
      const requiredPaths = requiredInitialProps !== undefined && requiredInitialProps !== '' ? requiredInitialProps.split(/ +/) : [];
      const evalWrapper = function evalWrapper(target, thisArg, args) {
        let data = Reflect.apply(target, thisArg, args);
        if (typeof data === 'object') {
          data = jsonPruner(source, data, prunePaths, requiredPaths);
        }
        return data;
      };
      const evalHandler = {
        apply: evalWrapper
      };
      // eslint-disable-next-line no-eval
      window.eval = new Proxy(window.eval, evalHandler);
    }
    evalDataPrune$1.names = ['evaldata-prune',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'evaldata-prune.js', 'ubo-evaldata-prune.js', 'ubo-evaldata-prune'];
    evalDataPrune$1.injections = [hit, matchStackTrace, getWildcardPropertyInChain, logMessage, toRegExp, isPruningNeeded, jsonPruner,
    // following helpers are needed for helpers above
    getNativeRegexpTest, shouldAbortInlineOrInjectedScript];

    /**
     * This file must export all scriptlets which should be accessible
     */

    var scriptletList = /*#__PURE__*/Object.freeze({
        __proto__: null,
        trustedClickElement: trustedClickElement$1,
        abortOnPropertyRead: abortOnPropertyRead$1,
        abortOnPropertyWrite: abortOnPropertyWrite$1,
        preventSetTimeout: preventSetTimeout$1,
        preventSetInterval: preventSetInterval$1,
        preventWindowOpen: preventWindowOpen$1,
        abortCurrentInlineScript: abortCurrentInlineScript$1,
        setConstant: setConstant$1,
        removeCookie: removeCookie$1,
        preventAddEventListener: preventAddEventListener$1,
        preventBab: preventBab$2,
        nowebrtc: nowebrtc$1,
        logAddEventListener: logAddEventListener$1,
        logEval: logEval$1,
        log: log$1,
        noeval: noeval$1,
        preventEvalIf: preventEvalIf$1,
        preventFab: preventFab$1,
        setPopadsDummy: setPopadsDummy$1,
        preventPopadsNet: preventPopadsNet$1,
        preventAdfly: preventAdfly$1,
        debugOnPropertyRead: debugOnPropertyRead$1,
        debugOnPropertyWrite: debugOnPropertyWrite$1,
        debugCurrentInlineScript: debugCurrentInlineScript$1,
        removeAttr: removeAttr$1,
        setAttr: setAttr$1,
        removeClass: removeClass$1,
        disableNewtabLinks: disableNewtabLinks$1,
        adjustSetInterval: adjustSetInterval$1,
        adjustSetTimeout: adjustSetTimeout$1,
        dirString: dirString$1,
        jsonPrune: jsonPrune$1,
        preventRequestAnimationFrame: preventRequestAnimationFrame$1,
        setCookie: setCookie$1,
        setCookieReload: setCookieReload$1,
        hideInShadowDom: hideInShadowDom$1,
        removeInShadowDom: removeInShadowDom$1,
        preventFetch: preventFetch$1,
        setLocalStorageItem: setLocalStorageItem$1,
        setSessionStorageItem: setSessionStorageItem$1,
        abortOnStackTrace: abortOnStackTrace$1,
        logOnStacktrace: logOnStacktrace$1,
        preventXHR: preventXHR$1,
        forceWindowClose: forceWindowClose$1,
        preventRefresh: preventRefresh$1,
        preventElementSrcLoading: preventElementSrcLoading$1,
        noTopics: noTopics$1,
        trustedReplaceXhrResponse: trustedReplaceXhrResponse$1,
        xmlPrune: xmlPrune$1,
        m3uPrune: m3uPrune$1,
        trustedSetCookie: trustedSetCookie$1,
        trustedSetCookieReload: trustedSetCookieReload$1,
        trustedReplaceFetchResponse: trustedReplaceFetchResponse$1,
        trustedSetLocalStorageItem: trustedSetLocalStorageItem$1,
        trustedSetConstant: trustedSetConstant$1,
        injectCssInShadowDom: injectCssInShadowDom$1,
        removeNodeText: removeNodeText$1,
        trustedReplaceNodeText: trustedReplaceNodeText$1,
        evalDataPrune: evalDataPrune$1
    });

    /**
     * Store of ADG redirects names and their analogs.
     * As it is not a compatibility table, no need to keep in redirects array third-party redirects.
     *
     * Needed only for conversion purposes.
     * e.g. googletagmanager-gtm is removed and should be removed from compatibility table as well
     * but now it works as alias for google-analytics so it should stay valid for compiler
     */
    const redirects$1 = [{
      adg: '1x1-transparent.gif',
      ubo: '1x1.gif',
      abp: '1x1-transparent-gif'
    }, {
      adg: '2x2-transparent.png',
      ubo: '2x2.png',
      abp: '2x2-transparent-png'
    }, {
      adg: '3x2-transparent.png',
      ubo: '3x2.png',
      abp: '3x2-transparent-png'
    }, {
      adg: '32x32-transparent.png',
      ubo: '32x32.png',
      abp: '32x32-transparent-png'
    }, {
      adg: 'amazon-apstag',
      ubo: 'amazon_apstag.js'
    }, {
      adg: 'ati-smarttag'
    }, {
      adg: 'didomi-loader'
    }, {
      adg: 'click2load.html',
      ubo: 'click2load.html'
    }, {
      adg: 'fingerprintjs2',
      ubo: 'fingerprint2.js'
    }, {
      adg: 'fingerprintjs3',
      ubo: 'fingerprint3.js'
    }, {
      adg: 'google-analytics',
      ubo: 'google-analytics_analytics.js'
    }, {
      adg: 'google-analytics-ga',
      ubo: 'google-analytics_ga.js'
    }, {
      adg: 'googlesyndication-adsbygoogle',
      ubo: 'googlesyndication_adsbygoogle.js'
    }, {
      // https://github.com/AdguardTeam/Scriptlets/issues/162
      adg: 'googlesyndication-adsbygoogle',
      ubo: 'googlesyndication.com/adsbygoogle.js'
    }, {
      // https://github.com/AdguardTeam/Scriptlets/issues/127
      adg: 'googletagmanager-gtm',
      ubo: 'google-analytics_ga.js'
    }, {
      // https://github.com/AdguardTeam/Scriptlets/issues/260
      adg: 'googletagmanager-gtm',
      ubo: 'googletagmanager_gtm.js'
    }, {
      adg: 'googletagservices-gpt',
      ubo: 'googletagservices_gpt.js'
    }, {
      adg: 'google-ima3',
      ubo: 'google-ima.js'
    }, {
      adg: 'gemius'
    }, {
      adg: 'matomo'
    }, {
      adg: 'metrika-yandex-watch'
    }, {
      adg: 'metrika-yandex-tag'
    }, {
      adg: 'naver-wcslog'
    }, {
      adg: 'noeval',
      ubo: 'noeval-silent.js'
    }, {
      adg: 'noopcss',
      ubo: 'noop.css',
      abp: 'blank-css'
    }, {
      adg: 'noopframe',
      ubo: 'noop.html',
      abp: 'blank-html'
    }, {
      adg: 'noopjs',
      ubo: 'noop.js',
      abp: 'blank-js'
    }, {
      adg: 'noopjson'
    }, {
      adg: 'nooptext',
      ubo: 'noop.txt',
      abp: 'blank-text'
    }, {
      adg: 'noopmp3-0.1s',
      ubo: 'noop-0.1s.mp3',
      abp: 'blank-mp3'
    }, {
      adg: 'noopmp4-1s',
      ubo: 'noop-1s.mp4',
      abp: 'blank-mp4'
    }, {
      adg: 'noopvmap-1.0',
      ubo: 'noop-vmap1.0.xml'
    }, {
      adg: 'noopvast-2.0'
    }, {
      adg: 'noopvast-3.0'
    }, {
      adg: 'noopvast-4.0'
    }, {
      adg: 'prebid'
    }, {
      adg: 'pardot-1.0'
    }, {
      adg: 'prevent-bab',
      ubo: 'nobab.js'
    }, {
      adg: 'prevent-bab2',
      ubo: 'nobab2.js'
    }, {
      adg: 'prevent-fab-3.2.0',
      ubo: 'nofab.js'
    }, {
      // AG-15917
      adg: 'prevent-fab-3.2.0',
      ubo: 'fuckadblock.js-3.2.0'
    }, {
      adg: 'prevent-popads-net',
      ubo: 'popads.js'
    }, {
      adg: 'scorecardresearch-beacon',
      ubo: 'scorecardresearch_beacon.js'
    }, {
      adg: 'set-popads-dummy',
      ubo: 'popads-dummy.js'
    }, {
      adg: 'empty',
      ubo: 'empty'
    }, {
      adg: 'prebid-ads',
      ubo: 'prebid-ads.js'
    }];

    const JS_RULE_MARKER = '#%#';
    const COMMENT_MARKER = '!';

    /**
     * Checks if rule text is comment e.g. !!example.org##+js(set-constant.js, test, false)
     *
     * @param {string} rule rule text
     * @returns {boolean} if rule text is comment
     */
    const isComment = function isComment(rule) {
      return rule.startsWith(COMMENT_MARKER);
    };

    /* ************************************************************************
     *
     * Scriptlets
     *
     ************************************************************************** */

    /**
     * uBlock scriptlet rule mask
     */
    const UBO_SCRIPTLET_MASK_REG = /#@?#script:inject|#@?#\s*\+js/;
    const UBO_SCRIPTLET_MASK_1 = '##+js';
    const UBO_SCRIPTLET_MASK_2 = '##script:inject';
    const UBO_SCRIPTLET_EXCEPTION_MASK_1 = '#@#+js';
    const UBO_SCRIPTLET_EXCEPTION_MASK_2 = '#@#script:inject';

    /**
     * AdBlock Plus snippet rule mask
     */
    const ABP_SCRIPTLET_MASK = '#$#';
    const ABP_SCRIPTLET_EXCEPTION_MASK = '#@$#';

    /**
     * AdGuard CSS rule mask
     */
    const ADG_CSS_MASK_REG = /#@?\$#.+?\s*\{.*\}\s*$/g;

    /**
     * Checks if the `rule` is AdGuard scriptlet rule
     *
     * @param {string} rule - rule text
     * @returns {boolean} if given rule is adg rule
     */
    const isAdgScriptletRule = function isAdgScriptletRule(rule) {
      return !isComment(rule) && rule.includes(ADG_SCRIPTLET_MASK);
    };

    /**
     * Checks if the `rule` is uBO scriptlet rule
     *
     * @param {string} rule rule text
     * @returns {boolean} if given rule is ubo rule
     */
    const isUboScriptletRule = function isUboScriptletRule(rule) {
      return (rule.includes(UBO_SCRIPTLET_MASK_1) || rule.includes(UBO_SCRIPTLET_MASK_2) || rule.includes(UBO_SCRIPTLET_EXCEPTION_MASK_1) || rule.includes(UBO_SCRIPTLET_EXCEPTION_MASK_2)) && UBO_SCRIPTLET_MASK_REG.test(rule) && !isComment(rule);
    };

    /**
     * Checks if the `rule` is AdBlock Plus snippet
     *
     * @param {string} rule rule text
     * @returns {boolean} if given rule is abp rule
     */
    const isAbpSnippetRule = function isAbpSnippetRule(rule) {
      return (rule.includes(ABP_SCRIPTLET_MASK) || rule.includes(ABP_SCRIPTLET_EXCEPTION_MASK)) && rule.search(ADG_CSS_MASK_REG) === -1 && !isComment(rule);
    };

    /**
     * Returns array of scriptlet objects.
     * Needed for scriptlet name validation which will check aliases names.
     *
     * @returns {Array<Object>} Array of all scriptlet objects.
     */
    const getScriptletsObjList = function getScriptletsObjList() {
      return Object.values(scriptletList);
    };

    /**
     * Finds scriptlet by the `name`.
     *
     * @param {string} name Scriptlet name.
     * @param {Array<Object>} scriptlets Array of all scriptlet objects.
     * @returns {Function} Scriptlet function.
     */
    const getScriptletByName = function getScriptletByName(name, scriptlets) {
      if (!scriptlets) {
        scriptlets = getScriptletsObjList();
      }
      return scriptlets.find(function (s) {
        return s.names
        // full match name checking
        && (s.names.includes(name)
        // or check ubo alias name without '.js' at the end
        || !name.endsWith('.js') && s.names.includes("".concat(name, ".js")));
      });
    };
    const scriptletObjects = getScriptletsObjList();

    /**
     * Checks whether the scriptlet `name` is valid by checking the scriptlet list object.
     *
     * @param {string} name Scriptlet name.
     * @returns {boolean} True if scriptlet name is valid.
     */
    const isValidScriptletNameNotCached = function isValidScriptletNameNotCached(name) {
      if (!name) {
        return false;
      }
      const scriptlet = getScriptletByName(name, scriptletObjects);
      if (!scriptlet) {
        return false;
      }
      return true;
    };

    /**
     * Cache for better performance of scriptlet name validation.
     */
    const scriptletNameValidationCache = new Map();

    /**
     * Checks whether the `name` is valid scriptlet name.
     * Uses cache for better performance.
     *
     * @param {string} name Scriptlet name.
     * @returns {boolean} True if scriptlet name is valid.
     */
    const isValidScriptletName = function isValidScriptletName(name) {
      if (!name) {
        return false;
      }
      // if there is no cached validation value
      if (!scriptletNameValidationCache.has(name)) {
        // we should calculate it first
        const isValid = isValidScriptletNameNotCached(name);
        // and save it to the cache then
        scriptletNameValidationCache.set(name, isValid);
        return isValid;
      }
      // otherwise return cached validation result
      return scriptletNameValidationCache.get(name);
    };

    /* ************************************************************************
     *
     * Redirects
     *
     ************************************************************************** */

    /**
     * Redirect resources markers
     */
    const ADG_UBO_REDIRECT_MARKER = 'redirect=';
    const ADG_UBO_REDIRECT_RULE_MARKER = 'redirect-rule=';
    const ABP_REDIRECT_MARKER = 'rewrite=abp-resource:';
    const EMPTY_REDIRECT_MARKER = 'empty';
    const VALID_SOURCE_TYPES = ['image', 'media', 'subdocument', 'stylesheet', 'script', 'xmlhttprequest', 'other'];

    /**
     * Source types for redirect rules if there is no one of them.
     * Used for ADG -> UBO conversion.
     */
    const ABSENT_SOURCE_TYPE_REPLACEMENT = [{
      NAME: 'nooptext',
      TYPES: VALID_SOURCE_TYPES
    }, {
      NAME: 'noopcss',
      TYPES: ['stylesheet']
    }, {
      NAME: 'noopjs',
      TYPES: ['script']
    }, {
      NAME: 'noopframe',
      TYPES: ['subdocument']
    }, {
      NAME: '1x1-transparent.gif',
      TYPES: ['image']
    }, {
      NAME: 'noopmp3-0.1s',
      TYPES: ['media']
    }, {
      NAME: 'noopmp4-1s',
      TYPES: ['media']
    }, {
      NAME: 'googlesyndication-adsbygoogle',
      TYPES: ['xmlhttprequest', 'script']
    }, {
      NAME: 'google-analytics',
      TYPES: ['script']
    }, {
      NAME: 'googletagservices-gpt',
      TYPES: ['script']
    }];
    const validAdgRedirects = redirects$1.filter(function (el) {
      return el.adg;
    });

    /**
     * Compatibility object where KEYS = UBO redirect names and VALUES = ADG redirect names
     * It's used for UBO -> ADG converting
     */
    const uboToAdgCompatibility = Object.fromEntries(validAdgRedirects.filter(function (el) {
      return el.ubo;
    }).map(function (el) {
      return [el.ubo, el.adg];
    }));

    /**
     * Compatibility object where KEYS = ABP redirect names and VALUES = ADG redirect names
     * It's used for ABP -> ADG converting
     */
    const abpToAdgCompatibility = Object.fromEntries(validAdgRedirects.filter(function (el) {
      return el.abp;
    }).map(function (el) {
      return [el.abp, el.adg];
    }));

    /**
     * Compatibility object where KEYS = UBO redirect names and VALUES = ADG redirect names
     * It's used for ADG -> UBO converting
     */
    const adgToUboCompatibility = Object.fromEntries(validAdgRedirects.filter(function (el) {
      return el.ubo;
    }).map(function (el) {
      return [el.adg, el.ubo];
    }));

    /**
     * Needed for AdGuard redirect names validation where KEYS = **valid** AdGuard redirect names
     * 'adgToUboCompatibility' is still needed for ADG -> UBO converting
     */
    const validAdgCompatibility = Object.fromEntries(validAdgRedirects.map(function (el) {
      return [el.adg, 'valid adg redirect'];
    }));
    const REDIRECT_RULE_TYPES = {
      VALID_ADG: {
        redirectMarker: ADG_UBO_REDIRECT_MARKER,
        redirectRuleMarker: ADG_UBO_REDIRECT_RULE_MARKER,
        compatibility: validAdgCompatibility
      },
      ADG: {
        redirectMarker: ADG_UBO_REDIRECT_MARKER,
        redirectRuleMarker: ADG_UBO_REDIRECT_RULE_MARKER,
        compatibility: adgToUboCompatibility
      },
      UBO: {
        redirectMarker: ADG_UBO_REDIRECT_MARKER,
        redirectRuleMarker: ADG_UBO_REDIRECT_RULE_MARKER,
        compatibility: uboToAdgCompatibility
      },
      ABP: {
        redirectMarker: ABP_REDIRECT_MARKER,
        compatibility: abpToAdgCompatibility
      }
    };

    /**
     * Parses redirect rule modifiers
     *
     * @param {string} rule rule text
     * @returns {Array} list of rule modifiers
     */
    const parseModifiers = function parseModifiers(rule) {
      return substringAfter$1(rule, '$').split(',');
    };

    /**
     * Gets redirect resource name
     *
     * @param {string} rule rule text
     * @param {string} marker - specific Adg/Ubo or Abp redirect resources marker
     * @returns {string} - redirect resource name
     */
    const getRedirectName = function getRedirectName(rule, marker) {
      const ruleModifiers = parseModifiers(rule);
      const redirectNamePart = ruleModifiers.find(function (el) {
        return el.includes(marker);
      });
      return substringAfter$1(redirectNamePart, marker);
    };

    /**
     * Checks if the `rule` is AdGuard redirect rule.
     * Discards comments and JS rules and checks if the `rule` has 'redirect' modifier.
     *
     * @param {string} rule - rule text
     * @returns {boolean} if given rule is adg redirect
     */
    const isAdgRedirectRule = function isAdgRedirectRule(rule) {
      const MARKER_IN_BASE_PART_MASK = '/((?!\\$|\\,).{1})redirect((-rule)?)=(.{0,}?)\\$(popup)?/';
      return !isComment(rule) && (rule.includes(REDIRECT_RULE_TYPES.ADG.redirectMarker) || rule.includes(REDIRECT_RULE_TYPES.ADG.redirectRuleMarker))
      // some js rules may have 'redirect=' in it, so we should get rid of them
      && !rule.includes(JS_RULE_MARKER)
      // get rid of rules like '_redirect=*://look.$popup'
      && !toRegExp(MARKER_IN_BASE_PART_MASK).test(rule);
    };

    // const getRedirectResourceMarkerData = ()

    /**
     * Checks if the `rule` satisfies the `type`
     *
     * @param {string} rule - rule text
     * @param {'VALID_ADG'|'ADG'|'UBO'|'ABP'} type - type of a redirect rule
     * @returns {boolean} if the `rule` satisfies the `type`
     */
    const isRedirectRuleByType = function isRedirectRuleByType(rule, type) {
      const _REDIRECT_RULE_TYPES$ = REDIRECT_RULE_TYPES[type],
        redirectMarker = _REDIRECT_RULE_TYPES$.redirectMarker,
        redirectRuleMarker = _REDIRECT_RULE_TYPES$.redirectRuleMarker,
        compatibility = _REDIRECT_RULE_TYPES$.compatibility;
      if (rule && !isComment(rule)) {
        let marker;
        // check if there is a $redirect-rule modifier in rule
        let markerIndex = redirectRuleMarker ? rule.indexOf(redirectRuleMarker) : -1;
        if (markerIndex > -1) {
          marker = redirectRuleMarker;
        } else {
          // check if there $redirect modifier in rule
          markerIndex = rule.indexOf(redirectMarker);
          if (markerIndex > -1) {
            marker = redirectMarker;
          } else {
            return false;
          }
        }
        const redirectName = getRedirectName(rule, marker);
        if (!redirectName) {
          return false;
        }
        return redirectName === Object.keys(compatibility).find(function (el) {
          return el === redirectName;
        });
      }
      return false;
    };

    /**
     * Checks if the `rule` is **valid** AdGuard redirect resource rule
     *
     * @param {string} rule - rule text
     * @returns {boolean} if given rule is valid adg redirect
     */
    const isValidAdgRedirectRule = function isValidAdgRedirectRule(rule) {
      return isRedirectRuleByType(rule, 'VALID_ADG');
    };

    /**
     * Checks if the AdGuard redirect `rule` has Ubo analog. Needed for Adg->Ubo conversion
     *
     * @param {string} rule - AdGuard rule text
     * @returns {boolean} - true if the rule can be converted to Ubo
     */
    const isAdgRedirectCompatibleWithUbo = function isAdgRedirectCompatibleWithUbo(rule) {
      return isAdgRedirectRule(rule) && isRedirectRuleByType(rule, 'ADG');
    };

    /**
     * Checks if the Ubo redirect `rule` has AdGuard analog. Needed for Ubo->Adg conversion
     *
     * @param {string} rule - Ubo rule text
     * @returns {boolean} - true if the rule can be converted to AdGuard
     */
    const isUboRedirectCompatibleWithAdg = function isUboRedirectCompatibleWithAdg(rule) {
      return isRedirectRuleByType(rule, 'UBO');
    };

    /**
     * Checks if the Abp redirect `rule` has AdGuard analog. Needed for Abp->Adg conversion
     *
     * @param {string} rule - Abp rule text
     * @returns {boolean} - true if the rule can be converted to AdGuard
     */
    const isAbpRedirectCompatibleWithAdg = function isAbpRedirectCompatibleWithAdg(rule) {
      return isRedirectRuleByType(rule, 'ABP');
    };

    /**
     * Checks if the rule has specified content type before Adg -> Ubo conversion.
     *
     * Used ONLY for Adg -> Ubo conversion
     * because Ubo redirect rules must contain content type, but Adg and Abp must not.
     *
     * Also source type can not be added automatically because of such valid rules:
     * ! Abp:
     * $rewrite=abp-resource:blank-js,xmlhttprequest
     * ! Adg:
     * $script,redirect=noopvast-2.0
     * $xmlhttprequest,redirect=noopvast-2.0
     *
     * @param {string} rule rule text
     * @returns {boolean} if the rule has specified content type before conversion
     */
    const hasValidContentType = function hasValidContentType(rule) {
      const ruleModifiers = parseModifiers(rule);
      // rule can have more than one source type modifier
      const sourceTypes = ruleModifiers.filter(function (el) {
        return VALID_SOURCE_TYPES.includes(el);
      });
      const isSourceTypeSpecified = sourceTypes.length > 0;
      const isEmptyRedirect = ruleModifiers.includes("".concat(ADG_UBO_REDIRECT_MARKER).concat(EMPTY_REDIRECT_MARKER)) || ruleModifiers.includes("".concat(ADG_UBO_REDIRECT_RULE_MARKER).concat(EMPTY_REDIRECT_MARKER));
      if (isEmptyRedirect) {
        // no source type for 'empty' is allowed
        return true;
      }
      return isSourceTypeSpecified;
    };
    const validator = {
      UBO_SCRIPTLET_MASK_REG,
      ABP_SCRIPTLET_MASK,
      ABP_SCRIPTLET_EXCEPTION_MASK,
      isComment,
      isAdgScriptletRule,
      isUboScriptletRule,
      isAbpSnippetRule,
      getScriptletByName,
      isValidScriptletName,
      ADG_UBO_REDIRECT_RULE_MARKER,
      REDIRECT_RULE_TYPES,
      ABSENT_SOURCE_TYPE_REPLACEMENT,
      isAdgRedirectRule,
      isValidAdgRedirectRule,
      isAdgRedirectCompatibleWithUbo,
      isUboRedirectCompatibleWithAdg,
      isAbpRedirectCompatibleWithAdg,
      parseModifiers,
      getRedirectName,
      hasValidContentType
    };

    function _arrayWithHoles(arr) {
      if (Array.isArray(arr)) return arr;
    }
    var arrayWithHoles = _arrayWithHoles;

    function _iterableToArray(iter) {
      if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter);
    }
    var iterableToArray = _iterableToArray;

    function _arrayLikeToArray(arr, len) {
      if (len == null || len > arr.length) len = arr.length;
      for (var i = 0, arr2 = new Array(len); i < len; i++) {
        arr2[i] = arr[i];
      }
      return arr2;
    }
    var arrayLikeToArray = _arrayLikeToArray;

    function _unsupportedIterableToArray(o, minLen) {
      if (!o) return;
      if (typeof o === "string") return arrayLikeToArray(o, minLen);
      var n = Object.prototype.toString.call(o).slice(8, -1);
      if (n === "Object" && o.constructor) n = o.constructor.name;
      if (n === "Map" || n === "Set") return Array.from(o);
      if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return arrayLikeToArray(o, minLen);
    }
    var unsupportedIterableToArray = _unsupportedIterableToArray;

    function _nonIterableRest() {
      throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }
    var nonIterableRest = _nonIterableRest;

    function _toArray(arr) {
      return arrayWithHoles(arr) || iterableToArray(arr) || unsupportedIterableToArray(arr) || nonIterableRest();
    }
    var toArray$1 = _toArray;

    /**
     * AdGuard scriptlet rule
     */
    const ADGUARD_SCRIPTLET_MASK_REG = /#@?%#\/\/scriptlet\(.+\)/;
    // eslint-disable-next-line no-template-curly-in-string
    const ADGUARD_SCRIPTLET_TEMPLATE = '${domains}#%#//scriptlet(${args})';
    // eslint-disable-next-line no-template-curly-in-string
    const ADGUARD_SCRIPTLET_EXCEPTION_TEMPLATE = '${domains}#@%#//scriptlet(${args})';

    /**
     * uBlock scriptlet rule mask
     */
    // eslint-disable-next-line no-template-curly-in-string
    const UBO_SCRIPTLET_TEMPLATE = '${domains}##+js(${args})';
    // eslint-disable-next-line no-template-curly-in-string
    const UBO_SCRIPTLET_EXCEPTION_TEMPLATE = '${domains}#@#+js(${args})';
    const UBO_ALIAS_NAME_MARKER = 'ubo-';
    const UBO_SCRIPTLET_JS_ENDING = '.js';

    // https://github.com/gorhill/uBlock/wiki/Static-filter-syntax#xhr
    const UBO_XHR_TYPE = 'xhr';
    const ADG_XHR_TYPE = 'xmlhttprequest';
    const ADG_SET_CONSTANT_NAME = 'set-constant';
    const ADG_SET_CONSTANT_EMPTY_STRING = '';
    const ADG_SET_CONSTANT_EMPTY_ARRAY = 'emptyArr';
    const ADG_SET_CONSTANT_EMPTY_OBJECT = 'emptyObj';
    const UBO_SET_CONSTANT_EMPTY_STRING = '\'\'';
    const UBO_SET_CONSTANT_EMPTY_ARRAY = '[]';
    const UBO_SET_CONSTANT_EMPTY_OBJECT = '{}';
    const ADG_PREVENT_FETCH_NAME = 'prevent-fetch';
    const ADG_PREVENT_FETCH_EMPTY_STRING = '';
    const ADG_PREVENT_FETCH_WILDCARD = '*';
    const UBO_NO_FETCH_IF_WILDCARD = '/^/';
    const ESCAPED_COMMA_SEPARATOR = '\\,';
    const COMMA_SEPARATOR = ',';
    const REMOVE_ATTR_METHOD = 'removeAttr';
    const REMOVE_CLASS_METHOD = 'removeClass';
    const REMOVE_ATTR_ALIASES = scriptletList[REMOVE_ATTR_METHOD].names;
    const REMOVE_CLASS_ALIASES = scriptletList[REMOVE_CLASS_METHOD].names;
    const ADG_REMOVE_ATTR_NAME = REMOVE_ATTR_ALIASES[0];
    const ADG_REMOVE_CLASS_NAME = REMOVE_CLASS_ALIASES[0];
    const REMOVE_ATTR_CLASS_APPLYING = ['asap', 'stay', 'complete'];

    /**
     * Returns array of strings separated by space which is not in quotes
     *
     * @param {string} str arbitrary string
     * @returns {string[]} result array
     */
    const getSentences = function getSentences(str) {
      const reg = /'.*?'|".*?"|\S+/g;
      return str.match(reg);
    };

    /**
     * Replaces string with data by placeholders
     *
     * @param {string} str string with placeholders
     * @param {Object} data where keys are placeholders names
     * @returns {string} string filled with data
     */
    const replacePlaceholders = function replacePlaceholders(str, data) {
      return Object.keys(data).reduce(function (acc, key) {
        const reg = new RegExp("\\$\\{".concat(key, "\\}"), 'g');
        acc = acc.replace(reg, data[key]);
        return acc;
      }, str);
    };
    const splitArgs = function splitArgs(str) {
      const args = [];
      let prevArgStart = 0;
      for (let i = 0; i < str.length; i += 1) {
        // do not split args by escaped comma
        // https://github.com/AdguardTeam/Scriptlets/issues/133
        if (str[i] === COMMA_SEPARATOR && str[i - 1] !== '\\') {
          args.push(str.slice(prevArgStart, i).trim());
          prevArgStart = i + 1;
        }
      }
      // collect arg after last comma
      args.push(str.slice(prevArgStart, str.length).trim());
      return args;
    };

    /**
     * Validates remove-attr/class scriptlet args
     *
     * @param {string[]} parsedArgs scriptlet arguments
     * @returns {string[]|Error} valid args OR error for invalid selector
     */
    const validateRemoveAttrClassArgs = function validateRemoveAttrClassArgs(parsedArgs) {
      const _parsedArgs = toArray$1(parsedArgs),
        name = _parsedArgs[0],
        value = _parsedArgs[1],
        restArgs = _parsedArgs.slice(2);
      // no extra checking if there are only scriptlet name and value
      // https://github.com/AdguardTeam/Scriptlets/issues/235
      if (restArgs.length === 0) {
        return [name, value];
      }

      // remove-attr/class scriptlet might have multiple selectors separated by comma. so we should:
      // 1. check if last arg is 'applying' parameter
      // 2. join 'selector' into one arg
      // 3. combine all args
      // https://github.com/AdguardTeam/Scriptlets/issues/133
      const lastArg = restArgs.pop();
      let applying;
      // check the last parsed arg for matching possible 'applying' vale
      if (REMOVE_ATTR_CLASS_APPLYING.some(function (el) {
        return lastArg.includes(el);
      })) {
        applying = lastArg;
      } else {
        restArgs.push(lastArg);
      }
      const selector = replaceAll(restArgs.join(', '), ESCAPED_COMMA_SEPARATOR, COMMA_SEPARATOR);
      if (selector.length > 0 && typeof document !== 'undefined') {
        // empty selector is valid for these scriptlets as it applies to all elements,
        // all other selectors should be validated
        // e.g. #%#//scriptlet('ubo-remove-class.js', 'blur', ', html')
        document.querySelectorAll(selector);
      }
      const validArgs = applying ? [name, value, selector, applying] : [name, value, selector];
      return validArgs;
    };

    /**
     * Converts string of UBO scriptlet rule to AdGuard scriptlet rule
     *
     * @param {string} rule UBO scriptlet rule
     * @returns {string[]} array with one AdGuard scriptlet rule
     */
    const convertUboScriptletToAdg = function convertUboScriptletToAdg(rule) {
      const domains = getBeforeRegExp(rule, validator.UBO_SCRIPTLET_MASK_REG);
      const mask = rule.match(validator.UBO_SCRIPTLET_MASK_REG)[0];
      let template;
      if (mask.includes('@')) {
        template = ADGUARD_SCRIPTLET_EXCEPTION_TEMPLATE;
      } else {
        template = ADGUARD_SCRIPTLET_TEMPLATE;
      }
      const argsStr = getStringInBraces(rule);
      let parsedArgs = splitArgs(argsStr);
      const scriptletName = parsedArgs[0].includes(UBO_SCRIPTLET_JS_ENDING) ? "ubo-".concat(parsedArgs[0]) : "ubo-".concat(parsedArgs[0]).concat(UBO_SCRIPTLET_JS_ENDING);
      if (REMOVE_ATTR_ALIASES.includes(scriptletName) || REMOVE_CLASS_ALIASES.includes(scriptletName)) {
        parsedArgs = validateRemoveAttrClassArgs(parsedArgs);
      }
      const args = parsedArgs.map(function (arg, index) {
        let outputArg = arg;
        if (index === 0) {
          outputArg = scriptletName;
        }
        // for example: example.org##+js(abort-current-inline-script, $, popup)
        if (arg === '$') {
          outputArg = '$$';
        }
        return outputArg;
      }).map(function (arg) {
        return wrapInSingleQuotes(arg);
      }).join("".concat(COMMA_SEPARATOR, " "));
      const adgRule = replacePlaceholders(template, {
        domains,
        args
      });
      return [adgRule];
    };

    /**
     * Convert string of ABP snippet rule to AdGuard scriptlet rule
     *
     * @param {string} rule ABP snippet rule
     * @returns {Array} array of AdGuard scriptlet rules, one or few items depends on Abp-rule
     */
    const convertAbpSnippetToAdg = function convertAbpSnippetToAdg(rule) {
      const SEMICOLON_DIVIDER = /;(?=(?:(?:[^"]*"){2})*[^"]*$)/g;
      const mask = rule.includes(validator.ABP_SCRIPTLET_MASK) ? validator.ABP_SCRIPTLET_MASK : validator.ABP_SCRIPTLET_EXCEPTION_MASK;
      const template = mask === validator.ABP_SCRIPTLET_MASK ? ADGUARD_SCRIPTLET_TEMPLATE : ADGUARD_SCRIPTLET_EXCEPTION_TEMPLATE;
      const domains = substringBefore(rule, mask);
      const args = substringAfter$1(rule, mask);
      return args.split(SEMICOLON_DIVIDER)
      // abp-rule may have `;` at the end which makes last array item irrelevant
      // https://github.com/AdguardTeam/Scriptlets/issues/236
      .filter(isExisting).map(function (args) {
        return getSentences(args).map(function (arg, index) {
          return index === 0 ? "abp-".concat(arg) : arg;
        }).map(function (arg) {
          return wrapInSingleQuotes(arg);
        }).join("".concat(COMMA_SEPARATOR, " "));
      }).map(function (args) {
        return replacePlaceholders(template, {
          domains,
          args
        });
      });
    };

    /**
     * Validates ADG scriptlet rule syntax.
     *
     * IMPORTANT! The method is not very fast as it parses the rule and checks its syntax.
     *
     * @param {string} adgRuleText Single ADG scriptlet rule.
     *
     * @returns {boolean} False if ADG scriptlet rule syntax is not valid
     * or `adgRuleText` is not an ADG scriptlet rule.
     */
    const isValidAdgScriptletRuleSyntax = function isValidAdgScriptletRuleSyntax(adgRuleText) {
      if (!adgRuleText) {
        return false;
      }
      if (!validator.isAdgScriptletRule(adgRuleText)) {
        return false;
      }
      // isAdgScriptletRule() does not check the rule syntax
      let parsedRule;
      try {
        // parseRule() ensures that the rule syntax is valid
        // and it will throw an error if it is not
        parsedRule = parseRule(adgRuleText);
        return validator.isValidScriptletName(parsedRule.name);
      } catch (e) {
        return false;
      }
    };

    /**
     * Converts any scriptlet rule into AdGuard syntax rule.
     * Comment is returned as is.
     *
     * @param {string} rule Scriptlet rule.
     *
     * @returns {string[]} Array of AdGuard scriptlet rules: one array item for ADG and UBO or few items for ABP.
     * For the ADG `rule`, validates its syntax and returns an empty array if it is invalid.
     */
    const convertScriptletToAdg = function convertScriptletToAdg(rule) {
      let result;
      // TODO: multiple conditions may be refactored
      if (validator.isUboScriptletRule(rule)) {
        result = convertUboScriptletToAdg(rule);
      } else if (validator.isAbpSnippetRule(rule)) {
        result = convertAbpSnippetToAdg(rule);
      } else if (validator.isAdgScriptletRule(rule)) {
        if (isValidAdgScriptletRuleSyntax(rule)) {
          result = [rule];
        } else {
          // eslint-disable-next-line no-console
          console.log("Invalid AdGuard scriptlet rule: ".concat(rule));
          result = [];
        }
      } else if (validator.isComment(rule)) {
        result = [rule];
      }
      return result;
    };

    /**
     * Converts UBO scriptlet rule to AdGuard one
     *
     * @param {string} rule AdGuard scriptlet rule
     * @returns {string} UBO scriptlet rule
     */
    const convertAdgScriptletToUbo = function convertAdgScriptletToUbo(rule) {
      let res;
      if (validator.isAdgScriptletRule(rule)) {
        const _parseRule = parseRule(rule),
          parsedName = _parseRule.name,
          parsedParams = _parseRule.args;
        let preparedParams;
        if (parsedName === ADG_SET_CONSTANT_NAME
        // https://github.com/AdguardTeam/FiltersCompiler/issues/102
        && parsedParams[1] === ADG_SET_CONSTANT_EMPTY_STRING) {
          preparedParams = [parsedParams[0], UBO_SET_CONSTANT_EMPTY_STRING];
        } else if (parsedName === ADG_SET_CONSTANT_NAME
        // https://github.com/uBlockOrigin/uBlock-issues/issues/2411
        && parsedParams[1] === ADG_SET_CONSTANT_EMPTY_ARRAY) {
          preparedParams = [parsedParams[0], UBO_SET_CONSTANT_EMPTY_ARRAY];
        } else if (parsedName === ADG_SET_CONSTANT_NAME && parsedParams[1] === ADG_SET_CONSTANT_EMPTY_OBJECT) {
          preparedParams = [parsedParams[0], UBO_SET_CONSTANT_EMPTY_OBJECT];
        } else if (parsedName === ADG_PREVENT_FETCH_NAME
        // https://github.com/AdguardTeam/Scriptlets/issues/109
        && (parsedParams[0] === ADG_PREVENT_FETCH_WILDCARD || parsedParams[0] === ADG_PREVENT_FETCH_EMPTY_STRING)) {
          preparedParams = [UBO_NO_FETCH_IF_WILDCARD];
        } else if ((parsedName === ADG_REMOVE_ATTR_NAME || parsedName === ADG_REMOVE_CLASS_NAME) && parsedParams[1] && parsedParams[1].includes(COMMA_SEPARATOR)) {
          preparedParams = [parsedParams[0], replaceAll(parsedParams[1], COMMA_SEPARATOR, ESCAPED_COMMA_SEPARATOR)];
        } else {
          preparedParams = parsedParams;
        }

        // object of name and aliases for the Adg-scriptlet
        const adgScriptletObject = Object.keys(scriptletList).map(function (el) {
          return scriptletList[el];
        }).map(function (s) {
          const _s$names = toArray$1(s.names),
            name = _s$names[0],
            aliases = _s$names.slice(1);
          return {
            name,
            aliases
          };
        }).find(function (el) {
          return el.name === parsedName || el.aliases.includes(parsedName);
        });
        const aliases = adgScriptletObject.aliases;
        if (aliases.length > 0) {
          const uboAlias = adgScriptletObject.aliases
          // eslint-disable-next-line no-restricted-properties
          .find(function (alias) {
            return alias.includes(UBO_ALIAS_NAME_MARKER);
          });
          if (uboAlias) {
            const mask = rule.match(ADGUARD_SCRIPTLET_MASK_REG)[0];
            let template;
            if (mask.includes('@')) {
              template = UBO_SCRIPTLET_EXCEPTION_TEMPLATE;
            } else {
              template = UBO_SCRIPTLET_TEMPLATE;
            }
            const domains = getBeforeRegExp(rule, ADGUARD_SCRIPTLET_MASK_REG);
            const uboName = uboAlias.replace(UBO_ALIAS_NAME_MARKER, '')
            // '.js' in the Ubo scriptlet name can be omitted
            // https://github.com/gorhill/uBlock/wiki/Resources-Library#general-purpose-scriptlets
            .replace(UBO_SCRIPTLET_JS_ENDING, '');
            const args = preparedParams.length > 0 ? "".concat(uboName, ", ").concat(preparedParams.join("".concat(COMMA_SEPARATOR, " "))) : uboName;
            const uboRule = replacePlaceholders(template, {
              domains,
              args
            });
            res = uboRule;
          }
        }
      }
      return res;
    };

    /**
     * Returns scriptlet name from `rule`.
     *
     * @param {string} rule AdGuard syntax scriptlet rule.
     * @returns {string|null} Scriptlet name or null.
     */
    const getAdgScriptletName = function getAdgScriptletName(rule) {
      // get substring after '#//scriptlet('
      let buffer = substringAfter$1(rule, "".concat(ADG_SCRIPTLET_MASK, "("));
      if (!buffer) {
        return null;
      }
      // get the quote used for the first scriptlet parameter which is a name
      const nameQuote = buffer[0];
      // delete the quote from the buffer
      buffer = buffer.slice(1);
      if (!buffer) {
        return null;
      }
      // get a supposed scriptlet name
      const name = substringBefore(buffer, nameQuote);
      return name === buffer ? null : name;
    };

    /**
     * 1. For ADG scriptlet checks whether the scriptlet syntax and name are valid.
     * 2. For UBO and ABP scriptlet first checks their compatibility with ADG
     * by converting them into ADG syntax, and after that checks the name.
     *
     * ADG or UBO rules are "single-scriptlet", but ABP rule may contain more than one snippet
     * so if at least one of them is not valid — whole `ruleText` rule is not valid too.
     *
     * @param {string} ruleText Any scriptlet rule — ADG or UBO or ABP.
     *
     * @returns {boolean} True if scriptlet name is valid in rule.
     */
    const isValidScriptletRule = function isValidScriptletRule(ruleText) {
      if (!ruleText) {
        return false;
      }

      // `ruleText` with ABP syntax may contain more than one snippet in one rule
      const rulesArray = convertScriptletToAdg(ruleText);

      // for ADG rule with invalid syntax convertScriptletToAdg() will return empty array
      if (rulesArray.length === 0) {
        return false;
      }

      // checking if each of parsed scriptlets is valid
      // if at least one of them is not valid - whole `ruleText` is not valid too
      const isValid = rulesArray.every(function (rule) {
        const name = getAdgScriptletName(rule);
        return validator.isValidScriptletName(name);
      });
      return isValid;
    };

    /**
     * Gets index and redirect resource marker from UBO/ADG modifiers array
     *
     * @param {string[]} modifiers rule modifiers
     * @param {Object} redirectsData validator.REDIRECT_RULE_TYPES.(UBO|ADG)
     * @param {string} rule rule string
     * @returns {Object} { index, marker }
     */
    const getMarkerData = function getMarkerData(modifiers, redirectsData, rule) {
      let marker;
      let index = modifiers.findIndex(function (m) {
        return m.includes(redirectsData.redirectRuleMarker);
      });
      if (index > -1) {
        marker = redirectsData.redirectRuleMarker;
      } else {
        index = modifiers.findIndex(function (m) {
          return m.includes(redirectsData.redirectMarker);
        });
        if (index > -1) {
          marker = redirectsData.redirectMarker;
        } else {
          throw new Error("No redirect resource modifier found in rule: ".concat(rule));
        }
      }
      return {
        index,
        marker
      };
    };

    /**
     * Converts Ubo redirect rule to Adg one
     *
     * @param {string} rule ubo redirect rule
     * @returns {string} converted adg rule
     */
    const convertUboRedirectToAdg = function convertUboRedirectToAdg(rule) {
      const firstPartOfRule = substringBefore(rule, '$');
      const uboModifiers = validator.parseModifiers(rule);
      const uboMarkerData = getMarkerData(uboModifiers, validator.REDIRECT_RULE_TYPES.UBO, rule);
      const adgModifiers = uboModifiers.map(function (modifier, index) {
        if (index === uboMarkerData.index) {
          const uboName = substringAfter$1(modifier, uboMarkerData.marker);
          const adgName = validator.REDIRECT_RULE_TYPES.UBO.compatibility[uboName];
          const adgMarker = uboMarkerData.marker === validator.ADG_UBO_REDIRECT_RULE_MARKER ? validator.REDIRECT_RULE_TYPES.ADG.redirectRuleMarker : validator.REDIRECT_RULE_TYPES.ADG.redirectMarker;
          return "".concat(adgMarker).concat(adgName);
        }
        if (modifier === UBO_XHR_TYPE) {
          return ADG_XHR_TYPE;
        }
        return modifier;
      }).join(COMMA_SEPARATOR);
      return "".concat(firstPartOfRule, "$").concat(adgModifiers);
    };

    /**
     * Converts Abp redirect rule to Adg one
     *
     * @param {string} rule abp redirect rule
     * @returns {string} converted adg rule
     */
    const convertAbpRedirectToAdg = function convertAbpRedirectToAdg(rule) {
      const firstPartOfRule = substringBefore(rule, '$');
      const abpModifiers = validator.parseModifiers(rule);
      const adgModifiers = abpModifiers.map(function (modifier) {
        if (modifier.includes(validator.REDIRECT_RULE_TYPES.ABP.redirectMarker)) {
          const abpName = substringAfter$1(modifier, validator.REDIRECT_RULE_TYPES.ABP.redirectMarker);
          const adgName = validator.REDIRECT_RULE_TYPES.ABP.compatibility[abpName];
          return "".concat(validator.REDIRECT_RULE_TYPES.ADG.redirectMarker).concat(adgName);
        }
        return modifier;
      }).join(COMMA_SEPARATOR);
      return "".concat(firstPartOfRule, "$").concat(adgModifiers);
    };

    /**
     * Converts redirect rule to AdGuard one
     *
     * @param {string} rule redirect rule
     * @returns {string} converted adg rule
     */
    const convertRedirectToAdg = function convertRedirectToAdg(rule) {
      let result;
      if (validator.isUboRedirectCompatibleWithAdg(rule)) {
        result = convertUboRedirectToAdg(rule);
      } else if (validator.isAbpRedirectCompatibleWithAdg(rule)) {
        result = convertAbpRedirectToAdg(rule);
      } else if (validator.isValidAdgRedirectRule(rule)) {
        result = rule;
      }
      return result;
    };

    /**
     * Converts Adg redirect rule to Ubo one
     * 1. Checks if there is Ubo analog for Adg rule
     * 2. Parses the rule and checks if there are any source type modifiers which are required by Ubo
     *    and if there are no one we add it manually to the end.
     *    Source types are chosen according to redirect name
     *    e.g. ||ad.com^$redirect=<name>,important  ->>  ||ad.com^$redirect=<name>,important,script
     * 3. Replaces Adg redirect name by Ubo analog
     *
     * @param {string} rule adg rule
     * @returns {string} converted ubo rule
     * @throws on incompatible rule
     */
    const convertAdgRedirectToUbo = function convertAdgRedirectToUbo(rule) {
      if (!validator.isAdgRedirectCompatibleWithUbo(rule)) {
        throw new Error("Unable to convert for uBO - unsupported redirect in rule: ".concat(rule));
      }
      const basePart = substringBefore(rule, '$');
      const adgModifiers = validator.parseModifiers(rule);
      const adgMarkerData = getMarkerData(adgModifiers, validator.REDIRECT_RULE_TYPES.ADG, rule);
      const adgRedirectName = adgModifiers[adgMarkerData.index].slice(adgMarkerData.marker.length);
      if (!validator.hasValidContentType(rule)) {
        // add missed source types as content type modifiers
        const sourceTypesData = validator.ABSENT_SOURCE_TYPE_REPLACEMENT.find(function (el) {
          return el.NAME === adgRedirectName;
        });
        if (typeof sourceTypesData === 'undefined') {
          // eslint-disable-next-line max-len
          throw new Error("Unable to convert for uBO - no types to add for specific redirect in rule: ".concat(rule));
        }
        const additionModifiers = sourceTypesData.TYPES;
        adgModifiers.push(...additionModifiers);
      }
      const uboModifiers = adgModifiers.map(function (el, index) {
        if (index === adgMarkerData.index) {
          const uboMarker = adgMarkerData.marker === validator.ADG_UBO_REDIRECT_RULE_MARKER ? validator.REDIRECT_RULE_TYPES.UBO.redirectRuleMarker : validator.REDIRECT_RULE_TYPES.UBO.redirectMarker;
          // eslint-disable-next-line max-len
          const uboRedirectName = validator.REDIRECT_RULE_TYPES.ADG.compatibility[adgRedirectName];
          return "".concat(uboMarker).concat(uboRedirectName);
        }
        return el;
      }).join(COMMA_SEPARATOR);
      return "".concat(basePart, "$").concat(uboModifiers);
    };

    /**
     * @redirect google-analytics
     *
     * @description
     * Mocks Google's Analytics and Tag Manager APIs.
     * Covers functionality of
     * the [obsolete googletagmanager-gtm redirect](https://github.com/AdguardTeam/Scriptlets/issues/127).
     *
     * Related UBO redirect resource:
     * https://github.com/gorhill/uBlock/blob/master/src/web_accessible_resources/google-analytics_analytics.js
     *
     * ### Examples
     *
     * ```adblock
     * ||google-analytics.com/analytics.js$script,redirect=google-analytics
     * ||googletagmanager.com/gtm.js$script,redirect=google-analytics
     * ```
     *
     * @added v1.0.10.
     */
    function GoogleAnalytics(source) {
      // eslint-disable-next-line func-names
      const Tracker = function Tracker() {}; // constructor
      const proto = Tracker.prototype;
      proto.get = noopFunc;
      proto.set = noopFunc;
      proto.send = noopFunc;
      const googleAnalyticsName = window.GoogleAnalyticsObject || 'ga';
      // a -- fake arg for 'ga.length < 1' antiadblock checking
      // eslint-disable-next-line no-unused-vars
      function ga(a) {
        const len = arguments.length;
        if (len === 0) {
          return;
        }
        // eslint-disable-next-line prefer-rest-params
        const lastArg = arguments[len - 1];
        let replacer;
        if (lastArg instanceof Object && lastArg !== null && typeof lastArg.hitCallback === 'function') {
          replacer = lastArg.hitCallback;
        } else if (typeof lastArg === 'function') {
          // https://github.com/AdguardTeam/Scriptlets/issues/98
          replacer = function replacer() {
            lastArg(ga.create());
          };
        }
        try {
          setTimeout(replacer, 1);
          // eslint-disable-next-line no-empty
        } catch (ex) {}
      }
      ga.create = function () {
        return new Tracker();
      };
      // https://github.com/AdguardTeam/Scriptlets/issues/134
      ga.getByName = function () {
        return new Tracker();
      };
      ga.getAll = function () {
        return [new Tracker()];
      };
      ga.remove = noopFunc;
      ga.loaded = true;
      window[googleAnalyticsName] = ga;
      const _window = window,
        dataLayer = _window.dataLayer,
        google_optimize = _window.google_optimize; // eslint-disable-line camelcase
      if (dataLayer instanceof Object === false) {
        return;
      }
      if (dataLayer.hide instanceof Object && typeof dataLayer.hide.end === 'function') {
        dataLayer.hide.end();
      }

      /**
       * checks data object and delays callback
       *
       * @param {object|Array} dataObj gtag payload
       * @param {string} funcName callback prop name
       */
      const handleCallback = function handleCallback(dataObj, funcName) {
        if (dataObj && typeof dataObj[funcName] === 'function') {
          setTimeout(dataObj[funcName]);
        }
      };
      if (typeof dataLayer.push === 'function') {
        dataLayer.push = function (data) {
          if (data instanceof Object) {
            handleCallback(data, 'eventCallback');
            // eslint-disable-next-line no-restricted-syntax, guard-for-in
            for (const key in data) {
              handleCallback(data[key], 'event_callback');
            }
            // eslint-disable-next-line no-prototype-builtins
            if (!data.hasOwnProperty('eventCallback') && !data.hasOwnProperty('eventCallback')) {
              [].push.call(window.dataLayer, data);
            }
          }
          if (Array.isArray(data)) {
            data.forEach(function (arg) {
              handleCallback(arg, 'callback');
            });
          }
          return noopFunc;
        };
      }

      // https://github.com/AdguardTeam/Scriptlets/issues/81
      // eslint-disable-next-line camelcase
      if (google_optimize instanceof Object && typeof google_optimize.get === 'function') {
        const googleOptimizeWrapper = {
          get: noopFunc
        };
        window.google_optimize = googleOptimizeWrapper;
      }
      hit(source);
    }
    GoogleAnalytics.names = ['google-analytics', 'ubo-google-analytics_analytics.js', 'google-analytics_analytics.js',
    // https://github.com/AdguardTeam/Scriptlets/issues/127
    'googletagmanager-gtm', 'ubo-googletagmanager_gtm.js', 'googletagmanager_gtm.js'];
    GoogleAnalytics.injections = [hit, noopFunc, noopNull, noopArray];

    /* eslint-disable no-underscore-dangle */

    /**
     * @redirect google-analytics-ga
     *
     * @description
     * Mocks old Google Analytics API.
     *
     * Related UBO redirect resource:
     * https://github.com/gorhill/uBlock/blob/master/src/web_accessible_resources/google-analytics_ga.js
     *
     * ### Examples
     *
     * ```adblock
     * ||google-analytics.com/ga.js$script,redirect=google-analytics-ga
     * ```
     *
     * @added v1.0.10.
     */
    function GoogleAnalyticsGa(source) {
      // Gaq constructor
      function Gaq() {}
      Gaq.prototype.Na = noopFunc;
      Gaq.prototype.O = noopFunc;
      Gaq.prototype.Sa = noopFunc;
      Gaq.prototype.Ta = noopFunc;
      Gaq.prototype.Va = noopFunc;
      Gaq.prototype._createAsyncTracker = noopFunc;
      Gaq.prototype._getAsyncTracker = noopFunc;
      Gaq.prototype._getPlugin = noopFunc;
      Gaq.prototype.push = function (data) {
        if (typeof data === 'function') {
          data();
          return;
        }
        if (Array.isArray(data) === false) {
          return;
        }
        // https://developers.google.com/analytics/devguides/collection/gajs/methods/gaJSApiDomainDirectory#_gat.GA_Tracker_._link
        // https://github.com/uBlockOrigin/uBlock-issues/issues/1807
        if (typeof data[0] === 'string' && /(^|\.)_link$/.test(data[0]) && typeof data[1] === 'string') {
          window.location.assign(data[1]);
        }
        // https://github.com/gorhill/uBlock/issues/2162
        if (data[0] === '_set' && data[1] === 'hitCallback' && typeof data[2] === 'function') {
          data[2]();
        }
      };
      const gaq = new Gaq();
      const asyncTrackers = window._gaq || [];
      if (Array.isArray(asyncTrackers)) {
        while (asyncTrackers[0]) {
          gaq.push(asyncTrackers.shift());
        }
      }
      // eslint-disable-next-line no-multi-assign
      window._gaq = gaq.qf = gaq;

      // Gat constructor
      function Gat() {}

      // Mock tracker api
      const api = ['_addIgnoredOrganic', '_addIgnoredRef', '_addItem', '_addOrganic', '_addTrans', '_clearIgnoredOrganic', '_clearIgnoredRef', '_clearOrganic', '_cookiePathCopy', '_deleteCustomVar', '_getName', '_setAccount', '_getAccount', '_getClientInfo', '_getDetectFlash', '_getDetectTitle', '_getLinkerUrl', '_getLocalGifPath', '_getServiceMode', '_getVersion', '_getVisitorCustomVar', '_initData', '_link', '_linkByPost', '_setAllowAnchor', '_setAllowHash', '_setAllowLinker', '_setCampContentKey', '_setCampMediumKey', '_setCampNameKey', '_setCampNOKey', '_setCampSourceKey', '_setCampTermKey', '_setCampaignCookieTimeout', '_setCampaignTrack', '_setClientInfo', '_setCookiePath', '_setCookiePersistence', '_setCookieTimeout', '_setCustomVar', '_setDetectFlash', '_setDetectTitle', '_setDomainName', '_setLocalGifPath', '_setLocalRemoteServerMode', '_setLocalServerMode', '_setReferrerOverride', '_setRemoteServerMode', '_setSampleRate', '_setSessionTimeout', '_setSiteSpeedSampleRate', '_setSessionCookieTimeout', '_setVar', '_setVisitorCookieTimeout', '_trackEvent', '_trackPageLoadTime', '_trackPageview', '_trackSocial', '_trackTiming', '_trackTrans', '_visitCode'];
      const tracker = api.reduce(function (res, funcName) {
        res[funcName] = noopFunc;
        return res;
      }, {});
      tracker._getLinkerUrl = function (a) {
        return a;
      };
      // https://github.com/AdguardTeam/Scriptlets/issues/154
      tracker._link = function (url) {
        if (typeof url !== 'string') {
          return;
        }
        try {
          window.location.assign(url);
        } catch (e) {
          logMessage(source, e);
        }
      };
      Gat.prototype._anonymizeIP = noopFunc;
      Gat.prototype._createTracker = noopFunc;
      Gat.prototype._forceSSL = noopFunc;
      Gat.prototype._getPlugin = noopFunc;
      Gat.prototype._getTracker = function () {
        return tracker;
      };
      Gat.prototype._getTrackerByName = function () {
        return tracker;
      };
      Gat.prototype._getTrackers = noopFunc;
      Gat.prototype.aa = noopFunc;
      Gat.prototype.ab = noopFunc;
      Gat.prototype.hb = noopFunc;
      Gat.prototype.la = noopFunc;
      Gat.prototype.oa = noopFunc;
      Gat.prototype.pa = noopFunc;
      Gat.prototype.u = noopFunc;
      const gat = new Gat();
      window._gat = gat;
      hit(source);
    }
    GoogleAnalyticsGa.names = ['google-analytics-ga', 'ubo-google-analytics_ga.js', 'google-analytics_ga.js'];
    GoogleAnalyticsGa.injections = [hit, noopFunc, logMessage];

    /* eslint-disable max-len */
    /**
     * @redirect googlesyndication-adsbygoogle
     *
     * @description
     * Mocks Google AdSense API.
     *
     * Related UBO redirect resource:
     * https://github.com/gorhill/uBlock/blob/master/src/web_accessible_resources/googlesyndication_adsbygoogle.js
     *
     * ### Examples
     *
     * ```adblock
     * ||pagead2.googlesyndication.com/pagead/js/adsbygoogle.js$script,redirect=googlesyndication-adsbygoogle
     * ```
     *
     * @added v1.0.10.
     */
    /* eslint-enable max-len */
    function GoogleSyndicationAdsByGoogle(source) {
      window.adsbygoogle = {
        // https://github.com/AdguardTeam/Scriptlets/issues/113
        // length: 0,
        loaded: true,
        // https://github.com/AdguardTeam/Scriptlets/issues/184
        push(arg) {
          if (typeof this.length === 'undefined') {
            this.length = 0;
            this.length += 1;
          }
          if (arg !== null && arg instanceof Object && arg.constructor.name === 'Object') {
            // eslint-disable-next-line no-restricted-syntax
            for (var _i = 0, _Object$keys = Object.keys(arg); _i < _Object$keys.length; _i++) {
              const key = _Object$keys[_i];
              if (typeof arg[key] === 'function') {
                try {
                  // https://github.com/AdguardTeam/Scriptlets/issues/252
                  // argument "{}" is needed to fix issue with undefined argument
                  arg[key].call(this, {});
                } catch (_unused) {
                  /* empty */
                }
              }
            }
          }
        }
      };
      const adElems = document.querySelectorAll('.adsbygoogle');
      const css = 'height:1px!important;max-height:1px!important;max-width:1px!important;width:1px!important;';
      const statusAttrName = 'data-adsbygoogle-status';
      const ASWIFT_IFRAME_MARKER = 'aswift_';
      const GOOGLE_ADS_IFRAME_MARKER = 'google_ads_iframe_';
      let executed = false;
      for (let i = 0; i < adElems.length; i += 1) {
        const adElemChildNodes = adElems[i].childNodes;
        const childNodesQuantity = adElemChildNodes.length;
        // childNodes of .adsbygoogle can be defined if scriptlet was executed before
        // so we should check that childNodes are exactly defined by us
        // TODO: remake after scriptlets context developing in 1.3
        let areIframesDefined = false;
        if (childNodesQuantity > 0) {
          // it should be only 2 child iframes if scriptlet was executed
          areIframesDefined = childNodesQuantity === 2
          // the first of child nodes should be aswift iframe
          && adElemChildNodes[0].nodeName.toLowerCase() === 'iframe' && adElemChildNodes[0].id.includes(ASWIFT_IFRAME_MARKER)
          // the second of child nodes should be google_ads iframe
          && adElemChildNodes[1].nodeName.toLowerCase() === 'iframe' && adElemChildNodes[1].id.includes(GOOGLE_ADS_IFRAME_MARKER);
        }
        if (!areIframesDefined) {
          // here we do the job if scriptlet has not been executed earlier
          adElems[i].setAttribute(statusAttrName, 'done');
          const aswiftIframe = document.createElement('iframe');
          aswiftIframe.id = "".concat(ASWIFT_IFRAME_MARKER).concat(i);
          aswiftIframe.style = css;
          adElems[i].appendChild(aswiftIframe);
          const innerAswiftIframe = document.createElement('iframe');
          aswiftIframe.contentWindow.document.body.appendChild(innerAswiftIframe);
          const googleadsIframe = document.createElement('iframe');
          googleadsIframe.id = "".concat(GOOGLE_ADS_IFRAME_MARKER).concat(i);
          googleadsIframe.style = css;
          adElems[i].appendChild(googleadsIframe);
          const innerGoogleadsIframe = document.createElement('iframe');
          googleadsIframe.contentWindow.document.body.appendChild(innerGoogleadsIframe);
          executed = true;
        }
      }
      if (executed) {
        hit(source);
      }
    }
    GoogleSyndicationAdsByGoogle.names = ['googlesyndication-adsbygoogle', 'ubo-googlesyndication_adsbygoogle.js', 'googlesyndication_adsbygoogle.js'];
    GoogleSyndicationAdsByGoogle.injections = [hit];

    /* eslint-disable func-names */

    /**
     * @redirect googletagservices-gpt
     *
     * @description
     * Mocks Google Publisher Tag API.
     *
     * Related UBO redirect resource:
     * https://github.com/gorhill/uBlock/blob/master/src/web_accessible_resources/googletagservices_gpt.js
     *
     * ### Examples
     *
     * ```adblock
     * ||googletagservices.com/tag/js/gpt.js$script,redirect=googletagservices-gpt
     * ```
     *
     * @added v1.0.10.
     */
    function GoogleTagServicesGpt(source) {
      const slots = new Map();
      const slotsById = new Map();
      const slotsPerPath = new Map();
      const slotCreatives = new Map();
      const eventCallbacks = new Map();
      const gTargeting = new Map();
      const addEventListener = function addEventListener(name, listener) {
        if (!eventCallbacks.has(name)) {
          eventCallbacks.set(name, new Set());
        }
        eventCallbacks.get(name).add(listener);
        return this;
      };
      const removeEventListener = function removeEventListener(name, listener) {
        if (eventCallbacks.has(name)) {
          return eventCallbacks.get(name).delete(listener);
        }
        return false;
      };
      const fireSlotEvent = function fireSlotEvent(name, slot) {
        return new Promise(function (resolve) {
          requestAnimationFrame(function () {
            const size = [0, 0];
            const callbacksSet = eventCallbacks.get(name) || [];
            const callbackArray = Array.from(callbacksSet);
            for (let i = 0; i < callbackArray.length; i += 1) {
              callbackArray[i]({
                isEmpty: true,
                size,
                slot
              });
            }
            resolve();
          });
        });
      };
      const emptySlotElement = function emptySlotElement(slot) {
        const node = document.getElementById(slot.getSlotElementId());
        while (node !== null && node !== void 0 && node.lastChild) {
          node.lastChild.remove();
        }
      };
      const recreateIframeForSlot = function recreateIframeForSlot(slot) {
        var _document$getElementB;
        const eid = "google_ads_iframe_".concat(slot.getId());
        (_document$getElementB = document.getElementById(eid)) === null || _document$getElementB === void 0 ? void 0 : _document$getElementB.remove();
        const node = document.getElementById(slot.getSlotElementId());
        if (node) {
          const f = document.createElement('iframe');
          f.id = eid;
          f.srcdoc = '<body></body>';
          f.style = 'position:absolute; width:0; height:0; left:0; right:0; z-index:-1; border:0';
          f.setAttribute('width', 0);
          f.setAttribute('height', 0);
          // https://github.com/AdguardTeam/Scriptlets/issues/259
          f.setAttribute('data-load-complete', true);
          f.setAttribute('data-google-container-id', true);
          f.setAttribute('sandbox', '');
          node.appendChild(f);
        }
      };
      const displaySlot = function displaySlot(slot) {
        if (!slot) {
          return;
        }
        const id = slot.getSlotElementId();
        if (!document.getElementById(id)) {
          return;
        }
        const parent = document.getElementById(id);
        if (parent) {
          parent.appendChild(document.createElement('div'));
        }
        emptySlotElement(slot);
        recreateIframeForSlot(slot);
        fireSlotEvent('slotRenderEnded', slot);
        fireSlotEvent('slotRequested', slot);
        fireSlotEvent('slotResponseReceived', slot);
        fireSlotEvent('slotOnload', slot);
        fireSlotEvent('impressionViewable', slot);
      };
      const companionAdsService = {
        addEventListener,
        removeEventListener,
        enableSyncLoading: noopFunc,
        setRefreshUnfilledSlots: noopFunc,
        getSlots: noopArray
      };
      const contentService = {
        addEventListener,
        removeEventListener,
        setContent: noopFunc
      };
      function PassbackSlot() {} // constructor

      PassbackSlot.prototype.display = noopFunc;
      PassbackSlot.prototype.get = noopNull;
      PassbackSlot.prototype.set = noopThis;
      PassbackSlot.prototype.setClickUrl = noopThis;
      PassbackSlot.prototype.setTagForChildDirectedTreatment = noopThis;
      PassbackSlot.prototype.setTargeting = noopThis;
      PassbackSlot.prototype.updateTargetingFromMap = noopThis;
      function SizeMappingBuilder() {} // constructor
      SizeMappingBuilder.prototype.addSize = noopThis;
      SizeMappingBuilder.prototype.build = noopNull;
      const getTargetingValue = function getTargetingValue(v) {
        if (typeof v === 'string') {
          return [v];
        }
        try {
          return Array.prototype.flat.call(v);
        } catch (_unused) {
          // do nothing
        }
        return [];
      };
      const updateTargeting = function updateTargeting(targeting, map) {
        if (typeof map === 'object') {
          for (const key in map) {
            if (Object.prototype.hasOwnProperty.call(map, key)) {
              targeting.set(key, getTargetingValue(map[key]));
            }
          }
        }
      };
      const defineSlot = function defineSlot(adUnitPath, creatives, optDiv) {
        if (slotsById.has(optDiv)) {
          var _document$getElementB2;
          (_document$getElementB2 = document.getElementById(optDiv)) === null || _document$getElementB2 === void 0 ? void 0 : _document$getElementB2.remove();
          return slotsById.get(optDiv);
        }
        const attributes = new Map();
        const targeting = new Map();
        const exclusions = new Set();
        const response = {
          advertiserId: undefined,
          campaignId: undefined,
          creativeId: undefined,
          creativeTemplateId: undefined,
          lineItemId: undefined
        };
        const sizes = [{
          getHeight: function getHeight() {
            return 2;
          },
          getWidth: function getWidth() {
            return 2;
          }
        }];
        const num = (slotsPerPath.get(adUnitPath) || 0) + 1;
        slotsPerPath.set(adUnitPath, num);
        const id = "".concat(adUnitPath, "_").concat(num);
        let clickUrl = '';
        let collapseEmptyDiv = null;
        const services = new Set();
        const slot = {
          addService(e) {
            services.add(e);
            return slot;
          },
          clearCategoryExclusions: noopThis,
          clearTargeting(k) {
            if (k === undefined) {
              targeting.clear();
            } else {
              targeting.delete(k);
            }
          },
          defineSizeMapping(mapping) {
            slotCreatives.set(optDiv, mapping);
            return this;
          },
          get: function get(k) {
            return attributes.get(k);
          },
          getAdUnitPath: function getAdUnitPath() {
            return adUnitPath;
          },
          getAttributeKeys: function getAttributeKeys() {
            return Array.from(attributes.keys());
          },
          getCategoryExclusions: function getCategoryExclusions() {
            return Array.from(exclusions);
          },
          getClickUrl: function getClickUrl() {
            return clickUrl;
          },
          getCollapseEmptyDiv: function getCollapseEmptyDiv() {
            return collapseEmptyDiv;
          },
          getContentUrl: function getContentUrl() {
            return '';
          },
          getDivStartsCollapsed: function getDivStartsCollapsed() {
            return null;
          },
          getDomId: function getDomId() {
            return optDiv;
          },
          getEscapedQemQueryId: function getEscapedQemQueryId() {
            return '';
          },
          getFirstLook: function getFirstLook() {
            return 0;
          },
          getId: function getId() {
            return id;
          },
          getHtml: function getHtml() {
            return '';
          },
          getName: function getName() {
            return id;
          },
          getOutOfPage: function getOutOfPage() {
            return false;
          },
          getResponseInformation: function getResponseInformation() {
            return response;
          },
          getServices: function getServices() {
            return Array.from(services);
          },
          getSizes: function getSizes() {
            return sizes;
          },
          getSlotElementId: function getSlotElementId() {
            return optDiv;
          },
          getSlotId: function getSlotId() {
            return slot;
          },
          getTargeting: function getTargeting(k) {
            return targeting.get(k) || gTargeting.get(k) || [];
          },
          getTargetingKeys: function getTargetingKeys() {
            return Array.from(new Set(Array.of(...gTargeting.keys(), ...targeting.keys())));
          },
          getTargetingMap: function getTargetingMap() {
            return Object.assign(Object.fromEntries(gTargeting.entries()), Object.fromEntries(targeting.entries()));
          },
          set(k, v) {
            attributes.set(k, v);
            return slot;
          },
          setCategoryExclusion(e) {
            exclusions.add(e);
            return slot;
          },
          setClickUrl(u) {
            clickUrl = u;
            return slot;
          },
          setCollapseEmptyDiv(v) {
            collapseEmptyDiv = !!v;
            return slot;
          },
          setSafeFrameConfig: noopThis,
          setTagForChildDirectedTreatment: noopThis,
          setTargeting(k, v) {
            targeting.set(k, getTargetingValue(v));
            return slot;
          },
          toString: function toString() {
            return id;
          },
          updateTargetingFromMap(map) {
            updateTargeting(targeting, map);
            return slot;
          }
        };
        slots.set(adUnitPath, slot);
        slotsById.set(optDiv, slot);
        slotCreatives.set(optDiv, creatives);
        return slot;
      };
      const pubAdsService = {
        addEventListener,
        removeEventListener,
        clear: noopFunc,
        clearCategoryExclusions: noopThis,
        clearTagForChildDirectedTreatment: noopThis,
        clearTargeting(k) {
          if (k === undefined) {
            gTargeting.clear();
          } else {
            gTargeting.delete(k);
          }
        },
        collapseEmptyDivs: noopFunc,
        defineOutOfPagePassback() {
          return new PassbackSlot();
        },
        definePassback() {
          return new PassbackSlot();
        },
        disableInitialLoad: noopFunc,
        display: noopFunc,
        enableAsyncRendering: noopFunc,
        enableLazyLoad: noopFunc,
        enableSingleRequest: noopFunc,
        enableSyncRendering: noopFunc,
        enableVideoAds: noopFunc,
        get: noopNull,
        getAttributeKeys: noopArray,
        getTargeting: noopArray,
        getTargetingKeys: noopArray,
        getSlots: noopArray,
        isInitialLoadDisabled: trueFunc,
        refresh: noopFunc,
        set: noopThis,
        setCategoryExclusion: noopThis,
        setCentering: noopFunc,
        setCookieOptions: noopThis,
        setForceSafeFrame: noopThis,
        setLocation: noopThis,
        setPublisherProvidedId: noopThis,
        setRequestNonPersonalizedAds: noopThis,
        setSafeFrameConfig: noopThis,
        setTagForChildDirectedTreatment: noopThis,
        setTargeting: noopThis,
        setVideoContent: noopThis,
        updateCorrelator: noopFunc
      };
      const _window = window,
        _window$googletag = _window.googletag,
        googletag = _window$googletag === void 0 ? {} : _window$googletag;
      const _googletag$cmd = googletag.cmd,
        cmd = _googletag$cmd === void 0 ? [] : _googletag$cmd;
      googletag.apiReady = true;
      googletag.cmd = [];
      googletag.cmd.push = function (a) {
        try {
          a();
          // eslint-disable-next-line no-empty
        } catch (ex) {}
        return 1;
      };
      googletag.companionAds = function () {
        return companionAdsService;
      };
      googletag.content = function () {
        return contentService;
      };
      googletag.defineOutOfPageSlot = defineSlot;
      googletag.defineSlot = defineSlot;
      googletag.destroySlots = function () {
        slots.clear();
        slotsById.clear();
      };
      googletag.disablePublisherConsole = noopFunc;
      googletag.display = function (arg) {
        let id;
        if (arg !== null && arg !== void 0 && arg.getSlotElementId) {
          id = arg.getSlotElementId();
        } else if (arg !== null && arg !== void 0 && arg.nodeType) {
          id = arg.id;
        } else {
          id = String(arg);
        }
        displaySlot(slotsById.get(id));
      };
      googletag.enableServices = noopFunc;
      googletag.getVersion = noopStr;
      googletag.pubads = function () {
        return pubAdsService;
      };
      googletag.pubadsReady = true;
      googletag.setAdIframeTitle = noopFunc;
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
    GoogleTagServicesGpt.injections = [hit, noopFunc, noopThis, noopNull, noopArray, noopStr, trueFunc];

    /**
     * @redirect scorecardresearch-beacon
     *
     * @description
     * Mocks Scorecard Research API.
     *
     * Related UBO redirect resource:
     * https://github.com/gorhill/uBlock/blob/master/src/web_accessible_resources/scorecardresearch_beacon.js
     *
     * ### Examples
     *
     * ```adblock
     * ||sb.scorecardresearch.com/beacon.js$script,redirect=scorecardresearch-beacon
     * ```
     *
     * @added v1.0.10.
     */
    function ScoreCardResearchBeacon(source) {
      window.COMSCORE = {
        purge() {
          // eslint-disable-next-line no-underscore-dangle
          window._comscore = [];
        },
        beacon() {}
      };
      hit(source);
    }
    ScoreCardResearchBeacon.names = ['scorecardresearch-beacon', 'ubo-scorecardresearch_beacon.js', 'scorecardresearch_beacon.js'];
    ScoreCardResearchBeacon.injections = [hit];

    /**
     * @redirect metrika-yandex-tag
     *
     * @description
     * Mocks Yandex Metrika API.
     * https://yandex.ru/support/metrica/objects/method-reference.html
     *
     * ### Examples
     *
     * ```adblock
     * ||mc.yandex.ru/metrika/tag.js$script,redirect=metrika-yandex-tag
     * ```
     *
     * @added v1.0.10.
     */
    function metrikaYandexTag(source) {
      const asyncCallbackFromOptions = function asyncCallbackFromOptions(id, param) {
        let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
        let callback = options.callback;
        const ctx = options.ctx;
        if (typeof callback === 'function') {
          callback = ctx !== undefined ? callback.bind(ctx) : callback;
          setTimeout(function () {
            return callback();
          });
        }
      };

      /**
       * https://yandex.ru/support/metrica/objects/addfileextension.html
       */
      const addFileExtension = noopFunc;

      /**
       * https://yandex.ru/support/metrica/objects/extlink.html
       */
      const extLink = asyncCallbackFromOptions;

      /**
       * https://yandex.ru/support/metrica/objects/file.html
       */
      const file = asyncCallbackFromOptions;

      /**
       * https://yandex.ru/support/metrica/objects/get-client-id.html
       *
       * @param {string} id
       * @param {Function} cb
       */
      const getClientID = function getClientID(id, cb) {
        if (!cb) {
          return;
        }
        setTimeout(cb(null));
      };

      /**
       * https://yandex.ru/support/metrica/objects/hit.html
       */
      const hitFunc = asyncCallbackFromOptions;

      /**
       * https://yandex.ru/support/metrica/objects/notbounce.html
       */
      const notBounce = asyncCallbackFromOptions;

      /**
       * https://yandex.ru/support/metrica/objects/params-method.html
       */
      const params = noopFunc;

      /**
       * https://yandex.ru/support/metrica/objects/reachgoal.html
       *
       * @param {string} id
       * @param {string} target
       * @param {Object} params
       * @param {Function} callback
       * @param {any} ctx
       */
      const reachGoal = function reachGoal(id, target, params, callback, ctx) {
        asyncCallbackFromOptions(null, null, {
          callback,
          ctx
        });
      };

      /**
       * https://yandex.ru/support/metrica/objects/set-user-id.html
       */
      const setUserID = noopFunc;

      /**
       * https://yandex.ru/support/metrica/objects/user-params.html
       */
      const userParams = noopFunc;

      // https://github.com/AdguardTeam/Scriptlets/issues/198
      const destruct = noopFunc;
      const api = {
        addFileExtension,
        extLink,
        file,
        getClientID,
        hit: hitFunc,
        notBounce,
        params,
        reachGoal,
        setUserID,
        userParams,
        destruct
      };
      function ym(id, funcName) {
        for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
          args[_key - 2] = arguments[_key];
        }
        return api[funcName] && api[funcName](id, ...args);
      }
      function init(id) {
        // yaCounter object should provide api
        window["yaCounter".concat(id)] = api;
        document.dispatchEvent(new Event("yacounter".concat(id, "inited")));
      }
      if (typeof window.ym === 'undefined') {
        window.ym = ym;
        ym.a = [];
      } else if (window.ym && window.ym.a) {
        // Keep initial counters array intact
        ym.a = window.ym.a;
        window.ym = ym;
        window.ym.a.forEach(function (params) {
          const id = params[0];
          init(id);
        });
      }
      hit(source);
    }
    metrikaYandexTag.names = ['metrika-yandex-tag'];
    metrikaYandexTag.injections = [hit, noopFunc];

    /**
     * @redirect metrika-yandex-watch
     *
     * @description
     * Mocks the old Yandex Metrika API.
     * https://yandex.ru/support/metrica/objects/_method-reference.html
     *
     * ### Examples
     *
     * ```adblock
     * ||mc.yandex.ru/metrika/watch.js$script,redirect=metrika-yandex-watch
     * ```
     *
     * @added v1.0.10.
     */
    function metrikaYandexWatch(source) {
      const cbName = 'yandex_metrika_callbacks';

      /**
       * Gets callback and its context from options and call it in async way
       *
       * @param {Object} options Yandex Metrika API options
       */
      const asyncCallbackFromOptions = function asyncCallbackFromOptions() {
        let options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        let callback = options.callback;
        const ctx = options.ctx;
        if (typeof callback === 'function') {
          callback = ctx !== undefined ? callback.bind(ctx) : callback;
          setTimeout(function () {
            return callback();
          });
        }
      };
      function Metrika() {} // constructor
      Metrika.counters = noopArray;
      // Methods without options
      Metrika.prototype.addFileExtension = noopFunc;
      Metrika.prototype.getClientID = noopFunc;
      Metrika.prototype.setUserID = noopFunc;
      Metrika.prototype.userParams = noopFunc;
      Metrika.prototype.params = noopFunc;
      Metrika.prototype.counters = noopArray;

      // Methods with options
      // The order of arguments should be kept in according to API
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
          ctx
        });
      };
      Metrika.prototype.notBounce = asyncCallbackFromOptions;
      if (window.Ya) {
        window.Ya.Metrika = Metrika;
      } else {
        window.Ya = {
          Metrika
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
    metrikaYandexWatch.injections = [hit, noopFunc, noopArray];

    /* eslint-disable func-names */

    /**
     * @redirect pardot-1.0
     *
     * @description
     * Mocks the pd.js file of Salesforce.
     * https://pi.pardot.com/pd.js
     * https://developer.salesforce.com/docs/marketing/pardot/overview
     *
     * ### Examples
     *
     * ```adblock
     * ||pi.pardot.com/pd.js$script,redirect=pardot
     * ||pacedg.com.au/pd.js$redirect=pardot
     * ```
     *
     * @added v1.6.55.
     */

    function Pardot(source) {
      window.piVersion = '1.0.2';
      window.piScriptNum = 0;
      window.piScriptObj = [];
      window.checkNamespace = noopFunc;
      window.getPardotUrl = noopStr;
      window.piGetParameter = noopNull;
      window.piSetCookie = noopFunc;
      window.piGetCookie = noopStr;
      function piTracker() {
        window.pi = {
          tracker: {
            visitor_id: '',
            visitor_id_sign: '',
            pi_opt_in: '',
            campaign_id: ''
          }
        };
        window.piScriptNum += 1;
      }
      window.piResponse = noopFunc;
      window.piTracker = piTracker;
      piTracker();
      hit(source);
    }
    Pardot.names = ['pardot-1.0'];
    Pardot.injections = [hit, noopFunc, noopStr, noopNull];

    /**
     * @redirect prevent-bab
     *
     * @description
     * Prevents BlockAdblock script from detecting an ad blocker.
     *
     * Mostly it is used as `scriptlet`.
     * See [scriptlet description](../wiki/about-scriptlets.md#prevent-bab).
     *
     * Related UBO redirect resource:
     * https://github.com/gorhill/uBlock/blob/master/src/web_accessible_resources/nobab.js
     *
     * ### Examples
     *
     * ```adblock
     * /blockadblock.$script,redirect=prevent-bab
     * ```
     *
     * @added v1.3.19.
     */
    const preventBab$1 = preventBab$2;
    preventBab$1.names = ['prevent-bab',
    // list of prevent-bab redirect aliases
    'nobab.js', 'ubo-nobab.js', 'bab-defuser.js', 'ubo-bab-defuser.js', 'ubo-nobab', 'ubo-bab-defuser'];

    /**
     * @redirect amazon-apstag
     *
     * @description
     * Mocks Amazon's apstag.js
     *
     * Related UBO redirect resource:
     * https://github.com/gorhill/uBlock/blob/master/src/web_accessible_resources/amazon_apstag.js
     *
     * ### Examples
     *
     * ```adblock
     * ||amazon-adsystem.com/aax2/apstag.js$script,redirect=amazon-apstag
     * ```
     *
     * @added v1.2.3.
     */
    function AmazonApstag(source) {
      const apstagWrapper = {
        fetchBids(a, b) {
          if (typeof b === 'function') {
            b([]);
          }
        },
        init: noopFunc,
        setDisplayBids: noopFunc,
        targetingKeys: noopFunc
      };
      window.apstag = apstagWrapper;
      hit(source);
    }
    AmazonApstag.names = ['amazon-apstag', 'ubo-amazon_apstag.js', 'amazon_apstag.js'];
    AmazonApstag.injections = [hit, noopFunc];

    /* eslint-disable func-names */

    /**
     * @redirect matomo
     *
     * @description
     * Mocks the piwik.js file of Matomo (formerly Piwik).
     *
     * ### Examples
     *
     * ```adblock
     * ||example.org/piwik.js$script,redirect=matomo
     * ```
     *
     * @added v1.5.0.
     */

    function Matomo(source) {
      const Tracker = function Tracker() {};
      Tracker.prototype.setDoNotTrack = noopFunc;
      Tracker.prototype.setDomains = noopFunc;
      Tracker.prototype.setCustomDimension = noopFunc;
      Tracker.prototype.trackPageView = noopFunc;
      const AsyncTracker = function AsyncTracker() {};
      AsyncTracker.prototype.addListener = noopFunc;
      const matomoWrapper = {
        getTracker: Tracker,
        getAsyncTracker: AsyncTracker
      };
      window.Piwik = matomoWrapper;
      hit(source);
    }
    Matomo.names = ['matomo'];
    Matomo.injections = [hit, noopFunc];

    /* eslint-disable func-names */

    /**
     * @redirect fingerprintjs2
     *
     * @description
     * Mocks FingerprintJS v2
     * https://github.com/fingerprintjs
     *
     * Related UBO redirect resource:
     * https://github.com/gorhill/uBlock/blob/master/src/web_accessible_resources/fingerprint2.js
     *
     * ### Examples
     *
     * ```adblock
     * ||example.com/modules/js/lib/fgp/fingerprint2.js$script,redirect=fingerprintjs2
     * ```
     *
     * @added v1.5.0.
     */
    function Fingerprintjs2(source) {
      let browserId = '';
      for (let i = 0; i < 8; i += 1) {
        browserId += (Math.random() * 0x10000 + 0x1000).toString(16).slice(-4);
      }
      const Fingerprint2 = function Fingerprint2() {};
      Fingerprint2.get = function (options, callback) {
        if (!callback) {
          callback = options;
        }
        setTimeout(function () {
          if (callback) {
            callback(browserId, []);
          }
        }, 1);
      };
      Fingerprint2.prototype = {
        get: Fingerprint2.get
      };
      window.Fingerprint2 = Fingerprint2;
      hit(source);
    }
    Fingerprintjs2.names = ['fingerprintjs2',
    // redirect aliases are needed for conversion:
    // prefixed for us
    'ubo-fingerprint2.js',
    // original ubo name
    'fingerprint2.js'];
    Fingerprintjs2.injections = [hit];

    /* eslint-disable func-names */

    /**
     * @redirect fingerprintjs3
     *
     * @description
     * Mocks FingerprintJS v3
     * https://github.com/fingerprintjs
     *
     * Related UBO redirect resource:
     * https://github.com/gorhill/uBlock/blob/master/src/web_accessible_resources/fingerprint3.js
     *
     * ### Examples
     *
     * ```adblock
     * ||example.com/js/ufe/isomorphic/thirdparty/fp.min.js$script,redirect=fingerprintjs3
     * ```
     *
     * @added v1.6.2.
     */
    function Fingerprintjs3(source) {
      const visitorId = function () {
        let id = '';
        for (let i = 0; i < 8; i += 1) {
          id += (Math.random() * 0x10000 + 0x1000).toString(16).slice(-4);
        }
        return id;
      }();
      const FingerprintJS = function FingerprintJS() {};
      FingerprintJS.prototype = {
        load() {
          return Promise.resolve(new FingerprintJS());
        },
        get() {
          return Promise.resolve({
            visitorId
          });
        },
        hashComponents: noopStr
      };
      window.FingerprintJS = new FingerprintJS();
      hit(source);
    }
    Fingerprintjs3.names = ['fingerprintjs3',
    // redirect aliases are needed for conversion:
    // prefixed for us
    'ubo-fingerprint3.js',
    // original ubo name
    'fingerprint3.js'];
    Fingerprintjs3.injections = [hit, noopStr];

    /* eslint-disable func-names */

    /**
     * @redirect gemius
     *
     * @description
     * Mocks Gemius Analytics.
     * https://flowplayer.com/developers/plugins/gemius
     *
     * ### Examples
     *
     * ```adblock
     * ||example.org/gplayer.js$script,redirect=gemius
     * ```
     *
     * @added v1.5.0.
     */
    function Gemius(source) {
      const GemiusPlayer = function GemiusPlayer() {};
      GemiusPlayer.prototype = {
        setVideoObject: noopFunc,
        newProgram: noopFunc,
        programEvent: noopFunc,
        newAd: noopFunc,
        adEvent: noopFunc
      };
      window.GemiusPlayer = GemiusPlayer;
      hit(source);
    }
    Gemius.names = ['gemius'];
    Gemius.injections = [hit, noopFunc];

    /**
     * @redirect ati-smarttag
     *
     * @description
     * Mocks AT Internat SmartTag.
     * https://developers.atinternet-solutions.com/as2-tagging-en/javascript-en/getting-started-javascript-en/tracker-initialisation-javascript-en/
     *
     * ### Examples
     *
     * ```adblock
     * ||example.com/assets/scripts/smarttag.js$script,redirect=ati-smarttag
     * ```
     *
     * @added v1.5.0.
     */
    function ATInternetSmartTag(source) {
      const setNoopFuncWrapper = {
        set: noopFunc
      };
      const sendNoopFuncWrapper = {
        send: noopFunc
      };
      const ecommerceWrapper = {
        displayCart: {
          products: setNoopFuncWrapper,
          cart: setNoopFuncWrapper
        },
        updateCart: {
          cart: setNoopFuncWrapper
        },
        displayProduct: {
          products: setNoopFuncWrapper
        },
        displayPageProduct: {
          products: setNoopFuncWrapper
        },
        addProduct: {
          products: setNoopFuncWrapper
        },
        removeProduct: {
          products: setNoopFuncWrapper
        }
      };

      // eslint-disable-next-line new-cap, func-names
      const tag = function tag() {};
      tag.prototype = {
        setConfig: noopFunc,
        setParam: noopFunc,
        dispatch: noopFunc,
        customVars: setNoopFuncWrapper,
        publisher: setNoopFuncWrapper,
        order: setNoopFuncWrapper,
        click: sendNoopFuncWrapper,
        clickListener: sendNoopFuncWrapper,
        internalSearch: {
          set: noopFunc,
          send: noopFunc
        },
        ecommerce: ecommerceWrapper,
        identifiedVisitor: {
          unset: noopFunc
        },
        page: {
          set: noopFunc,
          send: noopFunc
        },
        selfPromotion: {
          add: noopFunc,
          send: noopFunc
        },
        privacy: {
          setVisitorMode: noopFunc,
          getVisitorMode: noopFunc,
          hit: noopFunc
        },
        richMedia: {
          add: noopFunc,
          send: noopFunc,
          remove: noopFunc,
          removeAll: noopFunc
        }
      };
      const smartTagWrapper = {
        Tracker: {
          Tag: tag
        }
      };
      window.ATInternet = smartTagWrapper;
      hit(source);
    }
    ATInternetSmartTag.names = ['ati-smarttag'];
    ATInternetSmartTag.injections = [hit, noopFunc];

    /* eslint-disable consistent-return, no-eval */

    /**
     * @redirect prevent-bab2
     *
     * @description
     * Prevents BlockAdblock script from detecting an ad blocker.
     *
     * Related UBO redirect:
     * https://github.com/gorhill/uBlock/blob/master/src/web_accessible_resources/nobab2.js
     *
     * See [redirect description](../wiki/about-redirects.md#prevent-bab2).
     *
     * ### Examples
     *
     * ```adblock
     * /blockadblock.$script,redirect=prevent-bab2
     * ```
     *
     * @added v1.5.0.
     */
    function preventBab2(source) {
      const script = document.currentScript;
      if (script === null) {
        return;
      }
      const url = script.src;
      if (typeof url !== 'string') {
        return;
      }
      const domainsStr = ['adclixx\\.net', 'adnetasia\\.com', 'adtrackers\\.net', 'bannertrack\\.net'].join('|');
      const matchStr = "^https?://[\\w-]+\\.(".concat(domainsStr, ")/.");
      const domainsRegex = new RegExp(matchStr);
      if (domainsRegex.test(url) === false) {
        return;
      }
      window.nH7eXzOsG = 858;
      hit(source);
    }
    preventBab2.names = ['prevent-bab2',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'nobab2.js'];
    preventBab2.injections = [hit];

    /* eslint-disable func-names, no-underscore-dangle */

    /**
     * @redirect google-ima3
     *
     * @description
     * Mocks the IMA SDK of Google.
     *
     * ### Examples
     *
     * ```adblock
     * ||imasdk.googleapis.com/js/sdkloader/ima3.js$script,redirect=google-ima3
     * ```
     *
     * @added v1.6.2.
     */

    function GoogleIma3(source) {
      const VERSION = '3.453.0';
      const ima = {};
      const AdDisplayContainer = function AdDisplayContainer() {};
      AdDisplayContainer.prototype.destroy = noopFunc;
      AdDisplayContainer.prototype.initialize = noopFunc;
      const ImaSdkSettings = function ImaSdkSettings() {};
      ImaSdkSettings.CompanionBackfillMode = {
        ALWAYS: 'always',
        ON_MASTER_AD: 'on_master_ad'
      };
      ImaSdkSettings.VpaidMode = {
        DISABLED: 0,
        ENABLED: 1,
        INSECURE: 2
      };
      ImaSdkSettings.prototype = {
        c: true,
        f: {},
        i: false,
        l: '',
        p: '',
        r: 0,
        t: '',
        v: '',
        getCompanionBackfill: noopFunc,
        getDisableCustomPlaybackForIOS10Plus() {
          return this.i;
        },
        getDisabledFlashAds: function getDisabledFlashAds() {
          return true;
        },
        getFeatureFlags() {
          return this.f;
        },
        getLocale() {
          return this.l;
        },
        getNumRedirects() {
          return this.r;
        },
        getPlayerType() {
          return this.t;
        },
        getPlayerVersion() {
          return this.v;
        },
        getPpid() {
          return this.p;
        },
        getVpaidMode() {
          return this.C;
        },
        isCookiesEnabled() {
          return this.c;
        },
        isVpaidAdapter() {
          return this.M;
        },
        setCompanionBackfill: noopFunc,
        setAutoPlayAdBreaks(a) {
          this.K = a;
        },
        setCookiesEnabled(c) {
          this.c = !!c;
        },
        setDisableCustomPlaybackForIOS10Plus(i) {
          this.i = !!i;
        },
        setDisableFlashAds: noopFunc,
        setFeatureFlags(f) {
          this.f = !!f;
        },
        setIsVpaidAdapter(a) {
          this.M = a;
        },
        setLocale(l) {
          this.l = !!l;
        },
        setNumRedirects(r) {
          this.r = !!r;
        },
        setPageCorrelator(a) {
          this.R = a;
        },
        setPlayerType(t) {
          this.t = !!t;
        },
        setPlayerVersion(v) {
          this.v = !!v;
        },
        setPpid(p) {
          this.p = !!p;
        },
        setVpaidMode(a) {
          this.C = a;
        },
        setSessionId: noopFunc,
        setStreamCorrelator: noopFunc,
        setVpaidAllowed: noopFunc,
        CompanionBackfillMode: {
          ALWAYS: 'always',
          ON_MASTER_AD: 'on_master_ad'
        },
        VpaidMode: {
          DISABLED: 0,
          ENABLED: 1,
          INSECURE: 2
        }
      };
      const EventHandler = function EventHandler() {
        this.listeners = new Map();
        this._dispatch = function (e) {
          const listeners = this.listeners.get(e.type) || [];
          // eslint-disable-next-line no-restricted-syntax
          for (var _i = 0, _Array$from = Array.from(listeners); _i < _Array$from.length; _i++) {
            const listener = _Array$from[_i];
            try {
              listener(e);
            } catch (r) {
              logMessage(source, r);
            }
          }
        };
        this.addEventListener = function (t, c) {
          if (!this.listeners.has(t)) {
            this.listeners.set(t, new Set());
          }
          this.listeners.get(t).add(c);
        };
        this.removeEventListener = function (t, c) {
          var _this$listeners$get;
          (_this$listeners$get = this.listeners.get(t)) === null || _this$listeners$get === void 0 ? void 0 : _this$listeners$get.delete(c);
        };
      };
      const AdsManager = new EventHandler();
      /* eslint-disable no-use-before-define */
      AdsManager.volume = 1;
      AdsManager.collapse = noopFunc;
      AdsManager.configureAdsManager = noopFunc;
      AdsManager.destroy = noopFunc;
      AdsManager.discardAdBreak = noopFunc;
      AdsManager.expand = noopFunc;
      AdsManager.focus = noopFunc;
      AdsManager.getAdSkippableState = function () {
        return false;
      };
      AdsManager.getCuePoints = function () {
        return [0];
      };
      AdsManager.getCurrentAd = function () {
        return currentAd;
      };
      AdsManager.getCurrentAdCuePoints = function () {
        return [];
      };
      AdsManager.getRemainingTime = function () {
        return 0;
      };
      AdsManager.getVolume = function () {
        return this.volume;
      };
      AdsManager.init = noopFunc;
      AdsManager.isCustomClickTrackingUsed = function () {
        return false;
      };
      AdsManager.isCustomPlaybackUsed = function () {
        return false;
      };
      AdsManager.pause = noopFunc;
      AdsManager.requestNextAdBreak = noopFunc;
      AdsManager.resize = noopFunc;
      AdsManager.resume = noopFunc;
      AdsManager.setVolume = function (v) {
        this.volume = v;
      };
      AdsManager.skip = noopFunc;
      AdsManager.start = function () {
        // eslint-disable-next-line no-restricted-syntax
        for (var _i2 = 0, _arr = [AdEvent.Type.ALL_ADS_COMPLETED, AdEvent.Type.CONTENT_RESUME_REQUESTED]; _i2 < _arr.length; _i2++) {
          const type = _arr[_i2];
          try {
            this._dispatch(new ima.AdEvent(type));
          } catch (e) {
            logMessage(source, e);
          }
        }
      };
      AdsManager.stop = noopFunc;
      AdsManager.updateAdsRenderingSettings = noopFunc;
      /* eslint-enable no-use-before-define */

      const manager = Object.create(AdsManager);
      const AdsManagerLoadedEvent = function AdsManagerLoadedEvent(type, adsRequest, userRequestContext) {
        this.type = type;
        this.adsRequest = adsRequest;
        this.userRequestContext = userRequestContext;
      };
      AdsManagerLoadedEvent.prototype = {
        getAdsManager: function getAdsManager() {
          return manager;
        },
        getUserRequestContext() {
          if (this.userRequestContext) {
            return this.userRequestContext;
          }
          return {};
        }
      };
      AdsManagerLoadedEvent.Type = {
        ADS_MANAGER_LOADED: 'adsManagerLoaded'
      };
      const AdsLoader = EventHandler;
      AdsLoader.prototype.settings = new ImaSdkSettings();
      AdsLoader.prototype.contentComplete = noopFunc;
      AdsLoader.prototype.destroy = noopFunc;
      AdsLoader.prototype.getSettings = function () {
        return this.settings;
      };
      AdsLoader.prototype.getVersion = function () {
        return VERSION;
      };
      AdsLoader.prototype.requestAds = function (adsRequest, userRequestContext) {
        var _this = this;
        requestAnimationFrame(function () {
          const ADS_MANAGER_LOADED = AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED;
          const event = new ima.AdsManagerLoadedEvent(ADS_MANAGER_LOADED, adsRequest, userRequestContext);
          _this._dispatch(event);
        });
        const e = new ima.AdError('adPlayError', 1205, 1205, 'The browser prevented playback initiated without user interaction.', adsRequest, userRequestContext);
        requestAnimationFrame(function () {
          _this._dispatch(new ima.AdErrorEvent(e));
        });
      };
      const AdsRenderingSettings = noopFunc;
      const AdsRequest = function AdsRequest() {};
      AdsRequest.prototype = {
        setAdWillAutoPlay: noopFunc,
        setAdWillPlayMuted: noopFunc,
        setContinuousPlayback: noopFunc
      };
      const AdPodInfo = function AdPodInfo() {};
      AdPodInfo.prototype = {
        getAdPosition: function getAdPosition() {
          return 1;
        },
        getIsBumper: function getIsBumper() {
          return false;
        },
        getMaxDuration: function getMaxDuration() {
          return -1;
        },
        getPodIndex: function getPodIndex() {
          return 1;
        },
        getTimeOffset: function getTimeOffset() {
          return 0;
        },
        getTotalAds: function getTotalAds() {
          return 1;
        }
      };
      const Ad = function Ad() {};
      Ad.prototype = {
        pi: new AdPodInfo(),
        getAdId: function getAdId() {
          return '';
        },
        getAdPodInfo() {
          return this.pi;
        },
        getAdSystem: function getAdSystem() {
          return '';
        },
        getAdvertiserName: function getAdvertiserName() {
          return '';
        },
        getApiFramework: function getApiFramework() {
          return null;
        },
        getCompanionAds: function getCompanionAds() {
          return [];
        },
        getContentType: function getContentType() {
          return '';
        },
        getCreativeAdId: function getCreativeAdId() {
          return '';
        },
        getDealId: function getDealId() {
          return '';
        },
        getDescription: function getDescription() {
          return '';
        },
        getDuration: function getDuration() {
          return 8.5;
        },
        getHeight: function getHeight() {
          return 0;
        },
        getMediaUrl: function getMediaUrl() {
          return null;
        },
        getMinSuggestedDuration: function getMinSuggestedDuration() {
          return -2;
        },
        getSkipTimeOffset: function getSkipTimeOffset() {
          return -1;
        },
        getSurveyUrl: function getSurveyUrl() {
          return null;
        },
        getTitle: function getTitle() {
          return '';
        },
        getTraffickingParametersString: function getTraffickingParametersString() {
          return '';
        },
        getUiElements: function getUiElements() {
          return [''];
        },
        getUniversalAdIdRegistry: function getUniversalAdIdRegistry() {
          return 'unknown';
        },
        getUniversalAdIds: function getUniversalAdIds() {
          return [''];
        },
        getUniversalAdIdValue: function getUniversalAdIdValue() {
          return 'unknown';
        },
        getVastMediaBitrate: function getVastMediaBitrate() {
          return 0;
        },
        getVastMediaHeight: function getVastMediaHeight() {
          return 0;
        },
        getVastMediaWidth: function getVastMediaWidth() {
          return 0;
        },
        getWidth: function getWidth() {
          return 0;
        },
        getWrapperAdIds: function getWrapperAdIds() {
          return [''];
        },
        getWrapperAdSystems: function getWrapperAdSystems() {
          return [''];
        },
        getWrapperCreativeIds: function getWrapperCreativeIds() {
          return [''];
        },
        isLinear: function isLinear() {
          return true;
        },
        isSkippable() {
          return true;
        }
      };
      const CompanionAd = function CompanionAd() {};
      CompanionAd.prototype = {
        getAdSlotId: function getAdSlotId() {
          return '';
        },
        getContent: function getContent() {
          return '';
        },
        getContentType: function getContentType() {
          return '';
        },
        getHeight: function getHeight() {
          return 1;
        },
        getWidth: function getWidth() {
          return 1;
        }
      };
      const AdError = function AdError(type, code, vast, message, adsRequest, userRequestContext) {
        this.errorCode = code;
        this.message = message;
        this.type = type;
        this.adsRequest = adsRequest;
        this.userRequestContext = userRequestContext;
        this.getErrorCode = function () {
          return this.errorCode;
        };
        this.getInnerError = function () {};
        this.getMessage = function () {
          return this.message;
        };
        this.getType = function () {
          return this.type;
        };
        this.getVastErrorCode = function () {
          return this.vastErrorCode;
        };
        this.toString = function () {
          return "AdError ".concat(this.errorCode, ": ").concat(this.message);
        };
      };
      AdError.ErrorCode = {};
      AdError.Type = {};
      const isEngadget = function isEngadget() {
        try {
          // eslint-disable-next-line no-restricted-syntax
          for (var _i3 = 0, _Object$values = Object.values(window.vidible._getContexts()); _i3 < _Object$values.length; _i3++) {
            var _ctx$getPlayer, _ctx$getPlayer$div;
            const ctx = _Object$values[_i3];
            // eslint-disable-next-line no-restricted-properties
            if ((_ctx$getPlayer = ctx.getPlayer()) !== null && _ctx$getPlayer !== void 0 && (_ctx$getPlayer$div = _ctx$getPlayer.div) !== null && _ctx$getPlayer$div !== void 0 && _ctx$getPlayer$div.innerHTML.includes('www.engadget.com')) {
              return true;
            }
          }
        } catch (e) {} // eslint-disable-line no-empty
        return false;
      };
      const currentAd = isEngadget() ? undefined : new Ad();
      const AdEvent = function AdEvent(type) {
        this.type = type;
      };
      AdEvent.prototype = {
        getAd: function getAd() {
          return currentAd;
        },
        getAdData: function getAdData() {}
      };
      AdEvent.Type = {
        AD_BREAK_READY: 'adBreakReady',
        AD_BUFFERING: 'adBuffering',
        AD_CAN_PLAY: 'adCanPlay',
        AD_METADATA: 'adMetadata',
        AD_PROGRESS: 'adProgress',
        ALL_ADS_COMPLETED: 'allAdsCompleted',
        CLICK: 'click',
        COMPLETE: 'complete',
        CONTENT_PAUSE_REQUESTED: 'contentPauseRequested',
        CONTENT_RESUME_REQUESTED: 'contentResumeRequested',
        DURATION_CHANGE: 'durationChange',
        EXPANDED_CHANGED: 'expandedChanged',
        FIRST_QUARTILE: 'firstQuartile',
        IMPRESSION: 'impression',
        INTERACTION: 'interaction',
        LINEAR_CHANGE: 'linearChange',
        LINEAR_CHANGED: 'linearChanged',
        LOADED: 'loaded',
        LOG: 'log',
        MIDPOINT: 'midpoint',
        PAUSED: 'pause',
        RESUMED: 'resume',
        SKIPPABLE_STATE_CHANGED: 'skippableStateChanged',
        SKIPPED: 'skip',
        STARTED: 'start',
        THIRD_QUARTILE: 'thirdQuartile',
        USER_CLOSE: 'userClose',
        VIDEO_CLICKED: 'videoClicked',
        VIDEO_ICON_CLICKED: 'videoIconClicked',
        VIEWABLE_IMPRESSION: 'viewable_impression',
        VOLUME_CHANGED: 'volumeChange',
        VOLUME_MUTED: 'mute'
      };
      const AdErrorEvent = function AdErrorEvent(error) {
        this.error = error;
        this.type = 'adError';
        this.getError = function () {
          return this.error;
        };
        this.getUserRequestContext = function () {
          var _this$error;
          if ((_this$error = this.error) !== null && _this$error !== void 0 && _this$error.userRequestContext) {
            return this.error.userRequestContext;
          }
          return {};
        };
      };
      AdErrorEvent.Type = {
        AD_ERROR: 'adError'
      };
      const CustomContentLoadedEvent = function CustomContentLoadedEvent() {};
      CustomContentLoadedEvent.Type = {
        CUSTOM_CONTENT_LOADED: 'deprecated-event'
      };
      const CompanionAdSelectionSettings = function CompanionAdSelectionSettings() {};
      CompanionAdSelectionSettings.CreativeType = {
        ALL: 'All',
        FLASH: 'Flash',
        IMAGE: 'Image'
      };
      CompanionAdSelectionSettings.ResourceType = {
        ALL: 'All',
        HTML: 'Html',
        IFRAME: 'IFrame',
        STATIC: 'Static'
      };
      CompanionAdSelectionSettings.SizeCriteria = {
        IGNORE: 'IgnoreSize',
        SELECT_EXACT_MATCH: 'SelectExactMatch',
        SELECT_NEAR_MATCH: 'SelectNearMatch'
      };
      const AdCuePoints = function AdCuePoints() {};
      AdCuePoints.prototype = {
        getCuePoints: function getCuePoints() {
          return [];
        },
        getAdIdRegistry: function getAdIdRegistry() {
          return '';
        },
        getAdIsValue: function getAdIsValue() {
          return '';
        }
      };
      const AdProgressData = noopFunc;
      const UniversalAdIdInfo = function UniversalAdIdInfo() {};
      Object.assign(ima, {
        AdCuePoints,
        AdDisplayContainer,
        AdError,
        AdErrorEvent,
        AdEvent,
        AdPodInfo,
        AdProgressData,
        AdsLoader,
        AdsManager: manager,
        AdsManagerLoadedEvent,
        AdsRenderingSettings,
        AdsRequest,
        CompanionAd,
        CompanionAdSelectionSettings,
        CustomContentLoadedEvent,
        gptProxyInstance: {},
        ImaSdkSettings,
        OmidAccessMode: {
          DOMAIN: 'domain',
          FULL: 'full',
          LIMITED: 'limited'
        },
        settings: new ImaSdkSettings(),
        UiElements: {
          AD_ATTRIBUTION: 'adAttribution',
          COUNTDOWN: 'countdown'
        },
        UniversalAdIdInfo,
        VERSION,
        ViewMode: {
          FULLSCREEN: 'fullscreen',
          NORMAL: 'normal'
        }
      });
      if (!window.google) {
        window.google = {};
      }
      window.google.ima = ima;
      hit(source);
    }
    GoogleIma3.names = ['google-ima3',
    // prefixed name
    'ubo-google-ima.js',
    // original ubo name
    'google-ima.js'];
    GoogleIma3.injections = [hit, noopFunc, logMessage];

    /* eslint-disable func-names, no-underscore-dangle */

    /**
     * @redirect didomi-loader
     *
     * @description
     * Mocks Didomi's CMP loader script.
     * https://developers.didomi.io/
     *
     * ### Examples
     *
     * ```adblock
     * ||sdk.privacy-center.org/fbf86806f86e/loader.js$script,redirect=didomi-loader
     * ```
     *
     * @added v1.6.2.
     */
    function DidomiLoader(source) {
      function UserConsentStatusForVendorSubscribe() {}
      UserConsentStatusForVendorSubscribe.prototype.filter = function () {
        return new UserConsentStatusForVendorSubscribe();
      };
      UserConsentStatusForVendorSubscribe.prototype.subscribe = noopFunc;
      function UserConsentStatusForVendor() {}
      UserConsentStatusForVendor.prototype.first = function () {
        return new UserConsentStatusForVendorSubscribe();
      };
      UserConsentStatusForVendor.prototype.filter = function () {
        return new UserConsentStatusForVendorSubscribe();
      };
      UserConsentStatusForVendor.prototype.subscribe = noopFunc;
      const DidomiWrapper = {
        isConsentRequired: falseFunc,
        getUserConsentStatusForPurpose: trueFunc,
        getUserConsentStatus: trueFunc,
        getUserStatus: noopFunc,
        getRequiredPurposes: noopArray,
        getUserConsentStatusForVendor: trueFunc,
        Purposes: {
          Cookies: 'cookies'
        },
        notice: {
          configure: noopFunc,
          hide: noopFunc,
          isVisible: falseFunc,
          show: noopFunc,
          showDataProcessing: trueFunc
        },
        isUserConsentStatusPartial: falseFunc,
        on() {
          return {
            actions: {},
            emitter: {},
            services: {},
            store: {}
          };
        },
        shouldConsentBeCollected: falseFunc,
        getUserConsentStatusForAll: noopFunc,
        getObservableOnUserConsentStatusForVendor() {
          return new UserConsentStatusForVendor();
        }
      };
      window.Didomi = DidomiWrapper;
      const didomiStateWrapper = {
        didomiExperimentId: '',
        didomiExperimentUserGroup: '',
        didomiGDPRApplies: 1,
        didomiIABConsent: '',
        didomiPurposesConsent: '',
        didomiPurposesConsentDenied: '',
        didomiPurposesConsentUnknown: '',
        didomiVendorsConsent: '',
        didomiVendorsConsentDenied: '',
        didomiVendorsConsentUnknown: '',
        didomiVendorsRawConsent: '',
        didomiVendorsRawConsentDenied: '',
        didomiVendorsRawConsentUnknown: ''
      };
      window.didomiState = didomiStateWrapper;
      const tcData = {
        eventStatus: 'tcloaded',
        gdprApplies: false,
        listenerId: noopFunc,
        vendor: {
          consents: []
        },
        purpose: {
          consents: []
        }
      };

      // https://github.com/InteractiveAdvertisingBureau/GDPR-Transparency-and-Consent-Framework/blob/master/TCFv2/IAB%20Tech%20Lab%20-%20CMP%20API%20v2.md#how-does-the-cmp-provide-the-api
      const __tcfapiWrapper = function __tcfapiWrapper(command, version, callback) {
        if (typeof callback !== 'function' || command === 'removeEventListener') {
          return;
        }
        callback(tcData, true);
      };
      window.__tcfapi = __tcfapiWrapper;
      const didomiEventListenersWrapper = {
        stub: true,
        push: noopFunc
      };
      window.didomiEventListeners = didomiEventListenersWrapper;
      const didomiOnReadyWrapper = {
        stub: true,
        push(arg) {
          if (typeof arg !== 'function') {
            return;
          }
          if (document.readyState !== 'complete') {
            window.addEventListener('load', function () {
              setTimeout(arg(window.Didomi));
            });
          } else {
            setTimeout(arg(window.Didomi));
          }
        }
      };
      window.didomiOnReady = window.didomiOnReady || didomiOnReadyWrapper;
      if (Array.isArray(window.didomiOnReady)) {
        window.didomiOnReady.forEach(function (arg) {
          if (typeof arg === 'function') {
            try {
              setTimeout(arg(window.Didomi));
            } catch (e) {
              /* empty */
            }
          }
        });
      }
      hit(source);
    }
    DidomiLoader.names = ['didomi-loader'];
    DidomiLoader.injections = [hit, noopFunc, noopArray, trueFunc, falseFunc];

    /* eslint-disable func-names */

    /**
     * @redirect prebid
     *
     * @description
     * Mocks the prebid.js header bidding suit.
     * https://docs.prebid.org/
     *
     * ### Examples
     *
     * ```adblock
     * ||example.org/bd/hb/prebid.js$script,redirect=prebid
     * ```
     *
     * @added v1.6.2.
     */

    function Prebid(source) {
      const pushFunction = function pushFunction(arg) {
        if (typeof arg === 'function') {
          try {
            arg.call();
          } catch (ex) {
            /* empty */
          }
        }
      };
      const pbjsWrapper = {
        addAdUnits() {},
        adServers: {
          dfp: {
            // https://docs.prebid.org/dev-docs/publisher-api-reference/adServers.dfp.buildVideoUrl.html
            // returns ad URL
            buildVideoUrl: noopStr
          }
        },
        adUnits: [],
        aliasBidder() {},
        cmd: [],
        enableAnalytics() {},
        getHighestCpmBids: noopArray,
        libLoaded: true,
        que: [],
        requestBids(arg) {
          if (arg instanceof Object && arg.bidsBackHandler) {
            try {
              arg.bidsBackHandler.call(); // https://docs.prebid.org/dev-docs/publisher-api-reference/requestBids.html
            } catch (ex) {
              /* empty */
            }
          }
        },
        removeAdUnit() {},
        setBidderConfig() {},
        setConfig() {},
        setTargetingForGPTAsync() {}
      };
      pbjsWrapper.cmd.push = pushFunction;
      pbjsWrapper.que.push = pushFunction;
      window.pbjs = pbjsWrapper;
      hit(source);
    }
    Prebid.names = ['prebid'];
    Prebid.injections = [hit, noopFunc, noopStr, noopArray];

    /* eslint-disable func-names */

    /**
     * @redirect prebid-ads
     *
     * @description
     * Sets predefined constants on a page:
     *
     * - `canRunAds`: `true`
     * - `isAdBlockActive`: `false`
     *
     * ### Examples
     *
     * ```adblock
     * ||example.org/assets/js/prebid-ads.js$script,redirect=prebid-ads
     * ```
     *
     * @added v1.6.2.
     */
    function prebidAds(source) {
      window.canRunAds = true;
      window.isAdBlockActive = false;
      hit(source);
    }
    prebidAds.names = ['prebid-ads', 'ubo-prebid-ads.js', 'prebid-ads.js'];
    prebidAds.injections = [hit];

    /* eslint-disable func-names */

    /**
     * @redirect naver-wcslog
     *
     * @description
     * Mocks wcslog.js of Naver Analytics.
     *
     * ### Examples
     *
     * ```adblock
     * ||wcs.naver.net/wcslog.js$script,redirect=naver-wcslog
     * ```
     *
     * @added v1.6.2.
     */

    function NaverWcslog(source) {
      window.wcs_add = {};
      window.wcs_do = noopFunc;
      window.wcs = {
        inflow: noopFunc
      };
      hit(source);
    }
    NaverWcslog.names = ['naver-wcslog'];
    NaverWcslog.injections = [hit, noopFunc];

    var redirectsList = /*#__PURE__*/Object.freeze({
        __proto__: null,
        noeval: noeval$1,
        GoogleAnalytics: GoogleAnalytics,
        GoogleAnalyticsGa: GoogleAnalyticsGa,
        GoogleSyndicationAdsByGoogle: GoogleSyndicationAdsByGoogle,
        GoogleTagServicesGpt: GoogleTagServicesGpt,
        ScoreCardResearchBeacon: ScoreCardResearchBeacon,
        metrikaYandexTag: metrikaYandexTag,
        metrikaYandexWatch: metrikaYandexWatch,
        Pardot: Pardot,
        preventFab: preventFab$1,
        preventBab: preventBab$1,
        setPopadsDummy: setPopadsDummy$1,
        preventPopadsNet: preventPopadsNet$1,
        AmazonApstag: AmazonApstag,
        Matomo: Matomo,
        Fingerprintjs2: Fingerprintjs2,
        Fingerprintjs3: Fingerprintjs3,
        Gemius: Gemius,
        ATInternetSmartTag: ATInternetSmartTag,
        preventBab2: preventBab2,
        GoogleIma3: GoogleIma3,
        DidomiLoader: DidomiLoader,
        Prebid: Prebid,
        prebidAds: prebidAds,
        NaverWcslog: NaverWcslog
    });

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

    function isNothing(subject) {
      return typeof subject === 'undefined' || subject === null;
    }
    function isObject(subject) {
      return typeof subject === 'object' && subject !== null;
    }
    function toArray(sequence) {
      if (Array.isArray(sequence)) return sequence;else if (isNothing(sequence)) return [];
      return [sequence];
    }
    function extend(target, source) {
      var index, length, key, sourceKeys;
      if (source) {
        sourceKeys = Object.keys(source);
        for (index = 0, length = sourceKeys.length; index < length; index += 1) {
          key = sourceKeys[index];
          target[key] = source[key];
        }
      }
      return target;
    }
    function repeat(string, count) {
      var result = '',
        cycle;
      for (cycle = 0; cycle < count; cycle += 1) {
        result += string;
      }
      return result;
    }
    function isNegativeZero(number) {
      return number === 0 && Number.NEGATIVE_INFINITY === 1 / number;
    }
    var isNothing_1 = isNothing;
    var isObject_1 = isObject;
    var toArray_1 = toArray;
    var repeat_1 = repeat;
    var isNegativeZero_1 = isNegativeZero;
    var extend_1 = extend;
    var common = {
      isNothing: isNothing_1,
      isObject: isObject_1,
      toArray: toArray_1,
      repeat: repeat_1,
      isNegativeZero: isNegativeZero_1,
      extend: extend_1
    };

    // YAML error class. http://stackoverflow.com/questions/8458984

    function YAMLException$1(reason, mark) {
      // Super constructor
      Error.call(this);
      this.name = 'YAMLException';
      this.reason = reason;
      this.mark = mark;
      this.message = (this.reason || '(unknown reason)') + (this.mark ? ' ' + this.mark.toString() : '');

      // Include stack trace in error object
      if (Error.captureStackTrace) {
        // Chrome and NodeJS
        Error.captureStackTrace(this, this.constructor);
      } else {
        // FF, IE 10+ and Safari 6+. Fallback for others
        this.stack = new Error().stack || '';
      }
    }

    // Inherit from Error
    YAMLException$1.prototype = Object.create(Error.prototype);
    YAMLException$1.prototype.constructor = YAMLException$1;
    YAMLException$1.prototype.toString = function toString(compact) {
      var result = this.name + ': ';
      result += this.reason || '(unknown reason)';
      if (!compact && this.mark) {
        result += ' ' + this.mark.toString();
      }
      return result;
    };
    var exception = YAMLException$1;

    function Mark(name, buffer, position, line, column) {
      this.name = name;
      this.buffer = buffer;
      this.position = position;
      this.line = line;
      this.column = column;
    }
    Mark.prototype.getSnippet = function getSnippet(indent, maxLength) {
      var head, start, tail, end, snippet;
      if (!this.buffer) return null;
      indent = indent || 4;
      maxLength = maxLength || 75;
      head = '';
      start = this.position;
      while (start > 0 && "\0\r\n\x85\u2028\u2029".indexOf(this.buffer.charAt(start - 1)) === -1) {
        start -= 1;
        if (this.position - start > maxLength / 2 - 1) {
          head = ' ... ';
          start += 5;
          break;
        }
      }
      tail = '';
      end = this.position;
      while (end < this.buffer.length && "\0\r\n\x85\u2028\u2029".indexOf(this.buffer.charAt(end)) === -1) {
        end += 1;
        if (end - this.position > maxLength / 2 - 1) {
          tail = ' ... ';
          end -= 5;
          break;
        }
      }
      snippet = this.buffer.slice(start, end);
      return common.repeat(' ', indent) + head + snippet + tail + '\n' + common.repeat(' ', indent + this.position - start + head.length) + '^';
    };
    Mark.prototype.toString = function toString(compact) {
      var snippet,
        where = '';
      if (this.name) {
        where += 'in "' + this.name + '" ';
      }
      where += 'at line ' + (this.line + 1) + ', column ' + (this.column + 1);
      if (!compact) {
        snippet = this.getSnippet();
        if (snippet) {
          where += ':\n' + snippet;
        }
      }
      return where;
    };
    var mark = Mark;

    var TYPE_CONSTRUCTOR_OPTIONS = ['kind', 'resolve', 'construct', 'instanceOf', 'predicate', 'represent', 'defaultStyle', 'styleAliases'];
    var YAML_NODE_KINDS = ['scalar', 'sequence', 'mapping'];
    function compileStyleAliases(map) {
      var result = {};
      if (map !== null) {
        Object.keys(map).forEach(function (style) {
          map[style].forEach(function (alias) {
            result[String(alias)] = style;
          });
        });
      }
      return result;
    }
    function Type$1(tag, options) {
      options = options || {};
      Object.keys(options).forEach(function (name) {
        if (TYPE_CONSTRUCTOR_OPTIONS.indexOf(name) === -1) {
          throw new exception('Unknown option "' + name + '" is met in definition of "' + tag + '" YAML type.');
        }
      });

      // TODO: Add tag format check.
      this.tag = tag;
      this.kind = options['kind'] || null;
      this.resolve = options['resolve'] || function () {
        return true;
      };
      this.construct = options['construct'] || function (data) {
        return data;
      };
      this.instanceOf = options['instanceOf'] || null;
      this.predicate = options['predicate'] || null;
      this.represent = options['represent'] || null;
      this.defaultStyle = options['defaultStyle'] || null;
      this.styleAliases = compileStyleAliases(options['styleAliases'] || null);
      if (YAML_NODE_KINDS.indexOf(this.kind) === -1) {
        throw new exception('Unknown kind "' + this.kind + '" is specified for "' + tag + '" YAML type.');
      }
    }
    var type = Type$1;

    /*eslint-disable max-len*/

    function compileList(schema, name, result) {
      var exclude = [];
      schema.include.forEach(function (includedSchema) {
        result = compileList(includedSchema, name, result);
      });
      schema[name].forEach(function (currentType) {
        result.forEach(function (previousType, previousIndex) {
          if (previousType.tag === currentType.tag && previousType.kind === currentType.kind) {
            exclude.push(previousIndex);
          }
        });
        result.push(currentType);
      });
      return result.filter(function (type, index) {
        return exclude.indexOf(index) === -1;
      });
    }
    function compileMap( /* lists... */
    ) {
      var result = {
          scalar: {},
          sequence: {},
          mapping: {},
          fallback: {}
        },
        index,
        length;
      function collectType(type) {
        result[type.kind][type.tag] = result['fallback'][type.tag] = type;
      }
      for (index = 0, length = arguments.length; index < length; index += 1) {
        arguments[index].forEach(collectType);
      }
      return result;
    }
    function Schema$1(definition) {
      this.include = definition.include || [];
      this.implicit = definition.implicit || [];
      this.explicit = definition.explicit || [];
      this.implicit.forEach(function (type) {
        if (type.loadKind && type.loadKind !== 'scalar') {
          throw new exception('There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.');
        }
      });
      this.compiledImplicit = compileList(this, 'implicit', []);
      this.compiledExplicit = compileList(this, 'explicit', []);
      this.compiledTypeMap = compileMap(this.compiledImplicit, this.compiledExplicit);
    }
    Schema$1.DEFAULT = null;
    Schema$1.create = function createSchema() {
      var schemas, types;
      switch (arguments.length) {
        case 1:
          schemas = Schema$1.DEFAULT;
          types = arguments[0];
          break;
        case 2:
          schemas = arguments[0];
          types = arguments[1];
          break;
        default:
          throw new exception('Wrong number of arguments for Schema.create function');
      }
      schemas = common.toArray(schemas);
      types = common.toArray(types);
      if (!schemas.every(function (schema) {
        return schema instanceof Schema$1;
      })) {
        throw new exception('Specified list of super schemas (or a single Schema object) contains a non-Schema object.');
      }
      if (!types.every(function (type$1) {
        return type$1 instanceof type;
      })) {
        throw new exception('Specified list of YAML types (or a single Type object) contains a non-Type object.');
      }
      return new Schema$1({
        include: schemas,
        explicit: types
      });
    };
    var schema = Schema$1;

    var str = new type('tag:yaml.org,2002:str', {
      kind: 'scalar',
      construct: function construct(data) {
        return data !== null ? data : '';
      }
    });

    var seq = new type('tag:yaml.org,2002:seq', {
      kind: 'sequence',
      construct: function construct(data) {
        return data !== null ? data : [];
      }
    });

    var map = new type('tag:yaml.org,2002:map', {
      kind: 'mapping',
      construct: function construct(data) {
        return data !== null ? data : {};
      }
    });

    var failsafe = new schema({
      explicit: [str, seq, map]
    });

    function resolveYamlNull(data) {
      if (data === null) return true;
      var max = data.length;
      return max === 1 && data === '~' || max === 4 && (data === 'null' || data === 'Null' || data === 'NULL');
    }
    function constructYamlNull() {
      return null;
    }
    function isNull(object) {
      return object === null;
    }
    var _null = new type('tag:yaml.org,2002:null', {
      kind: 'scalar',
      resolve: resolveYamlNull,
      construct: constructYamlNull,
      predicate: isNull,
      represent: {
        canonical: function canonical() {
          return '~';
        },
        lowercase: function lowercase() {
          return 'null';
        },
        uppercase: function uppercase() {
          return 'NULL';
        },
        camelcase: function camelcase() {
          return 'Null';
        }
      },
      defaultStyle: 'lowercase'
    });

    function resolveYamlBoolean(data) {
      if (data === null) return false;
      var max = data.length;
      return max === 4 && (data === 'true' || data === 'True' || data === 'TRUE') || max === 5 && (data === 'false' || data === 'False' || data === 'FALSE');
    }
    function constructYamlBoolean(data) {
      return data === 'true' || data === 'True' || data === 'TRUE';
    }
    function isBoolean(object) {
      return Object.prototype.toString.call(object) === '[object Boolean]';
    }
    var bool = new type('tag:yaml.org,2002:bool', {
      kind: 'scalar',
      resolve: resolveYamlBoolean,
      construct: constructYamlBoolean,
      predicate: isBoolean,
      represent: {
        lowercase: function lowercase(object) {
          return object ? 'true' : 'false';
        },
        uppercase: function uppercase(object) {
          return object ? 'TRUE' : 'FALSE';
        },
        camelcase: function camelcase(object) {
          return object ? 'True' : 'False';
        }
      },
      defaultStyle: 'lowercase'
    });

    function isHexCode(c) {
      return 0x30 /* 0 */ <= c && c <= 0x39 /* 9 */ || 0x41 /* A */ <= c && c <= 0x46 /* F */ || 0x61 /* a */ <= c && c <= 0x66 /* f */;
    }

    function isOctCode(c) {
      return 0x30 /* 0 */ <= c && c <= 0x37 /* 7 */;
    }

    function isDecCode(c) {
      return 0x30 /* 0 */ <= c && c <= 0x39 /* 9 */;
    }

    function resolveYamlInteger(data) {
      if (data === null) return false;
      var max = data.length,
        index = 0,
        hasDigits = false,
        ch;
      if (!max) return false;
      ch = data[index];

      // sign
      if (ch === '-' || ch === '+') {
        ch = data[++index];
      }
      if (ch === '0') {
        // 0
        if (index + 1 === max) return true;
        ch = data[++index];

        // base 2, base 8, base 16

        if (ch === 'b') {
          // base 2
          index++;
          for (; index < max; index++) {
            ch = data[index];
            if (ch === '_') continue;
            if (ch !== '0' && ch !== '1') return false;
            hasDigits = true;
          }
          return hasDigits && ch !== '_';
        }
        if (ch === 'x') {
          // base 16
          index++;
          for (; index < max; index++) {
            ch = data[index];
            if (ch === '_') continue;
            if (!isHexCode(data.charCodeAt(index))) return false;
            hasDigits = true;
          }
          return hasDigits && ch !== '_';
        }

        // base 8
        for (; index < max; index++) {
          ch = data[index];
          if (ch === '_') continue;
          if (!isOctCode(data.charCodeAt(index))) return false;
          hasDigits = true;
        }
        return hasDigits && ch !== '_';
      }

      // base 10 (except 0) or base 60

      // value should not start with `_`;
      if (ch === '_') return false;
      for (; index < max; index++) {
        ch = data[index];
        if (ch === '_') continue;
        if (ch === ':') break;
        if (!isDecCode(data.charCodeAt(index))) {
          return false;
        }
        hasDigits = true;
      }

      // Should have digits and should not end with `_`
      if (!hasDigits || ch === '_') return false;

      // if !base60 - done;
      if (ch !== ':') return true;

      // base60 almost not used, no needs to optimize
      return /^(:[0-5]?[0-9])+$/.test(data.slice(index));
    }
    function constructYamlInteger(data) {
      var value = data,
        sign = 1,
        ch,
        base,
        digits = [];
      if (value.indexOf('_') !== -1) {
        value = value.replace(/_/g, '');
      }
      ch = value[0];
      if (ch === '-' || ch === '+') {
        if (ch === '-') sign = -1;
        value = value.slice(1);
        ch = value[0];
      }
      if (value === '0') return 0;
      if (ch === '0') {
        if (value[1] === 'b') return sign * parseInt(value.slice(2), 2);
        if (value[1] === 'x') return sign * parseInt(value, 16);
        return sign * parseInt(value, 8);
      }
      if (value.indexOf(':') !== -1) {
        value.split(':').forEach(function (v) {
          digits.unshift(parseInt(v, 10));
        });
        value = 0;
        base = 1;
        digits.forEach(function (d) {
          value += d * base;
          base *= 60;
        });
        return sign * value;
      }
      return sign * parseInt(value, 10);
    }
    function isInteger(object) {
      return Object.prototype.toString.call(object) === '[object Number]' && object % 1 === 0 && !common.isNegativeZero(object);
    }
    var int = new type('tag:yaml.org,2002:int', {
      kind: 'scalar',
      resolve: resolveYamlInteger,
      construct: constructYamlInteger,
      predicate: isInteger,
      represent: {
        binary: function binary(obj) {
          return obj >= 0 ? '0b' + obj.toString(2) : '-0b' + obj.toString(2).slice(1);
        },
        octal: function octal(obj) {
          return obj >= 0 ? '0' + obj.toString(8) : '-0' + obj.toString(8).slice(1);
        },
        decimal: function decimal(obj) {
          return obj.toString(10);
        },
        /* eslint-disable max-len */
        hexadecimal: function hexadecimal(obj) {
          return obj >= 0 ? '0x' + obj.toString(16).toUpperCase() : '-0x' + obj.toString(16).toUpperCase().slice(1);
        }
      },
      defaultStyle: 'decimal',
      styleAliases: {
        binary: [2, 'bin'],
        octal: [8, 'oct'],
        decimal: [10, 'dec'],
        hexadecimal: [16, 'hex']
      }
    });

    var YAML_FLOAT_PATTERN = new RegExp(
    // 2.5e4, 2.5 and integers
    '^(?:[-+]?(?:0|[1-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?' +
    // .2e4, .2
    // special case, seems not from spec
    '|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?' +
    // 20:59
    '|[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\\.[0-9_]*' +
    // .inf
    '|[-+]?\\.(?:inf|Inf|INF)' +
    // .nan
    '|\\.(?:nan|NaN|NAN))$');
    function resolveYamlFloat(data) {
      if (data === null) return false;
      if (!YAML_FLOAT_PATTERN.test(data) ||
      // Quick hack to not allow integers end with `_`
      // Probably should update regexp & check speed
      data[data.length - 1] === '_') {
        return false;
      }
      return true;
    }
    function constructYamlFloat(data) {
      var value, sign, base, digits;
      value = data.replace(/_/g, '').toLowerCase();
      sign = value[0] === '-' ? -1 : 1;
      digits = [];
      if ('+-'.indexOf(value[0]) >= 0) {
        value = value.slice(1);
      }
      if (value === '.inf') {
        return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
      } else if (value === '.nan') {
        return NaN;
      } else if (value.indexOf(':') >= 0) {
        value.split(':').forEach(function (v) {
          digits.unshift(parseFloat(v, 10));
        });
        value = 0.0;
        base = 1;
        digits.forEach(function (d) {
          value += d * base;
          base *= 60;
        });
        return sign * value;
      }
      return sign * parseFloat(value, 10);
    }
    var SCIENTIFIC_WITHOUT_DOT = /^[-+]?[0-9]+e/;
    function representYamlFloat(object, style) {
      var res;
      if (isNaN(object)) {
        switch (style) {
          case 'lowercase':
            return '.nan';
          case 'uppercase':
            return '.NAN';
          case 'camelcase':
            return '.NaN';
        }
      } else if (Number.POSITIVE_INFINITY === object) {
        switch (style) {
          case 'lowercase':
            return '.inf';
          case 'uppercase':
            return '.INF';
          case 'camelcase':
            return '.Inf';
        }
      } else if (Number.NEGATIVE_INFINITY === object) {
        switch (style) {
          case 'lowercase':
            return '-.inf';
          case 'uppercase':
            return '-.INF';
          case 'camelcase':
            return '-.Inf';
        }
      } else if (common.isNegativeZero(object)) {
        return '-0.0';
      }
      res = object.toString(10);

      // JS stringifier can build scientific format without dots: 5e-100,
      // while YAML requres dot: 5.e-100. Fix it with simple hack

      return SCIENTIFIC_WITHOUT_DOT.test(res) ? res.replace('e', '.e') : res;
    }
    function isFloat(object) {
      return Object.prototype.toString.call(object) === '[object Number]' && (object % 1 !== 0 || common.isNegativeZero(object));
    }
    var float = new type('tag:yaml.org,2002:float', {
      kind: 'scalar',
      resolve: resolveYamlFloat,
      construct: constructYamlFloat,
      predicate: isFloat,
      represent: representYamlFloat,
      defaultStyle: 'lowercase'
    });

    var json = new schema({
      include: [failsafe],
      implicit: [_null, bool, int, float]
    });

    var core = new schema({
      include: [json]
    });

    var YAML_DATE_REGEXP = new RegExp('^([0-9][0-9][0-9][0-9])' +
    // [1] year
    '-([0-9][0-9])' +
    // [2] month
    '-([0-9][0-9])$'); // [3] day

    var YAML_TIMESTAMP_REGEXP = new RegExp('^([0-9][0-9][0-9][0-9])' +
    // [1] year
    '-([0-9][0-9]?)' +
    // [2] month
    '-([0-9][0-9]?)' +
    // [3] day
    '(?:[Tt]|[ \\t]+)' +
    // ...
    '([0-9][0-9]?)' +
    // [4] hour
    ':([0-9][0-9])' +
    // [5] minute
    ':([0-9][0-9])' +
    // [6] second
    '(?:\\.([0-9]*))?' +
    // [7] fraction
    '(?:[ \\t]*(Z|([-+])([0-9][0-9]?)' +
    // [8] tz [9] tz_sign [10] tz_hour
    '(?::([0-9][0-9]))?))?$'); // [11] tz_minute

    function resolveYamlTimestamp(data) {
      if (data === null) return false;
      if (YAML_DATE_REGEXP.exec(data) !== null) return true;
      if (YAML_TIMESTAMP_REGEXP.exec(data) !== null) return true;
      return false;
    }
    function constructYamlTimestamp(data) {
      var match,
        year,
        month,
        day,
        hour,
        minute,
        second,
        fraction = 0,
        delta = null,
        tz_hour,
        tz_minute,
        date;
      match = YAML_DATE_REGEXP.exec(data);
      if (match === null) match = YAML_TIMESTAMP_REGEXP.exec(data);
      if (match === null) throw new Error('Date resolve error');

      // match: [1] year [2] month [3] day

      year = +match[1];
      month = +match[2] - 1; // JS month starts with 0
      day = +match[3];
      if (!match[4]) {
        // no hour
        return new Date(Date.UTC(year, month, day));
      }

      // match: [4] hour [5] minute [6] second [7] fraction

      hour = +match[4];
      minute = +match[5];
      second = +match[6];
      if (match[7]) {
        fraction = match[7].slice(0, 3);
        while (fraction.length < 3) {
          // milli-seconds
          fraction += '0';
        }
        fraction = +fraction;
      }

      // match: [8] tz [9] tz_sign [10] tz_hour [11] tz_minute

      if (match[9]) {
        tz_hour = +match[10];
        tz_minute = +(match[11] || 0);
        delta = (tz_hour * 60 + tz_minute) * 60000; // delta in mili-seconds
        if (match[9] === '-') delta = -delta;
      }
      date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));
      if (delta) date.setTime(date.getTime() - delta);
      return date;
    }
    function representYamlTimestamp(object /*, style*/) {
      return object.toISOString();
    }
    var timestamp = new type('tag:yaml.org,2002:timestamp', {
      kind: 'scalar',
      resolve: resolveYamlTimestamp,
      construct: constructYamlTimestamp,
      instanceOf: Date,
      represent: representYamlTimestamp
    });

    function resolveYamlMerge(data) {
      return data === '<<' || data === null;
    }
    var merge = new type('tag:yaml.org,2002:merge', {
      kind: 'scalar',
      resolve: resolveYamlMerge
    });

    function commonjsRequire (target) {
    	throw new Error('Could not dynamically require "' + target + '". Please configure the dynamicRequireTargets option of @rollup/plugin-commonjs appropriately for this require call to behave properly.');
    }

    /*eslint-disable no-bitwise*/

    var NodeBuffer;
    try {
      // A trick for browserified version, to not include `Buffer` shim
      var _require$1 = commonjsRequire;
      NodeBuffer = _require$1('buffer').Buffer;
    } catch (__) {}

    // [ 64, 65, 66 ] -> [ padding, CR, LF ]
    var BASE64_MAP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r';
    function resolveYamlBinary(data) {
      if (data === null) return false;
      var code,
        idx,
        bitlen = 0,
        max = data.length,
        map = BASE64_MAP;

      // Convert one by one.
      for (idx = 0; idx < max; idx++) {
        code = map.indexOf(data.charAt(idx));

        // Skip CR/LF
        if (code > 64) continue;

        // Fail on illegal characters
        if (code < 0) return false;
        bitlen += 6;
      }

      // If there are any bits left, source was corrupted
      return bitlen % 8 === 0;
    }
    function constructYamlBinary(data) {
      var idx,
        tailbits,
        input = data.replace(/[\r\n=]/g, ''),
        // remove CR/LF & padding to simplify scan
        max = input.length,
        map = BASE64_MAP,
        bits = 0,
        result = [];

      // Collect by 6*4 bits (3 bytes)

      for (idx = 0; idx < max; idx++) {
        if (idx % 4 === 0 && idx) {
          result.push(bits >> 16 & 0xFF);
          result.push(bits >> 8 & 0xFF);
          result.push(bits & 0xFF);
        }
        bits = bits << 6 | map.indexOf(input.charAt(idx));
      }

      // Dump tail

      tailbits = max % 4 * 6;
      if (tailbits === 0) {
        result.push(bits >> 16 & 0xFF);
        result.push(bits >> 8 & 0xFF);
        result.push(bits & 0xFF);
      } else if (tailbits === 18) {
        result.push(bits >> 10 & 0xFF);
        result.push(bits >> 2 & 0xFF);
      } else if (tailbits === 12) {
        result.push(bits >> 4 & 0xFF);
      }

      // Wrap into Buffer for NodeJS and leave Array for browser
      if (NodeBuffer) {
        // Support node 6.+ Buffer API when available
        return NodeBuffer.from ? NodeBuffer.from(result) : new NodeBuffer(result);
      }
      return result;
    }
    function representYamlBinary(object /*, style*/) {
      var result = '',
        bits = 0,
        idx,
        tail,
        max = object.length,
        map = BASE64_MAP;

      // Convert every three bytes to 4 ASCII characters.

      for (idx = 0; idx < max; idx++) {
        if (idx % 3 === 0 && idx) {
          result += map[bits >> 18 & 0x3F];
          result += map[bits >> 12 & 0x3F];
          result += map[bits >> 6 & 0x3F];
          result += map[bits & 0x3F];
        }
        bits = (bits << 8) + object[idx];
      }

      // Dump tail

      tail = max % 3;
      if (tail === 0) {
        result += map[bits >> 18 & 0x3F];
        result += map[bits >> 12 & 0x3F];
        result += map[bits >> 6 & 0x3F];
        result += map[bits & 0x3F];
      } else if (tail === 2) {
        result += map[bits >> 10 & 0x3F];
        result += map[bits >> 4 & 0x3F];
        result += map[bits << 2 & 0x3F];
        result += map[64];
      } else if (tail === 1) {
        result += map[bits >> 2 & 0x3F];
        result += map[bits << 4 & 0x3F];
        result += map[64];
        result += map[64];
      }
      return result;
    }
    function isBinary(object) {
      return NodeBuffer && NodeBuffer.isBuffer(object);
    }
    var binary = new type('tag:yaml.org,2002:binary', {
      kind: 'scalar',
      resolve: resolveYamlBinary,
      construct: constructYamlBinary,
      predicate: isBinary,
      represent: representYamlBinary
    });

    var _hasOwnProperty$3 = Object.prototype.hasOwnProperty;
    var _toString$2 = Object.prototype.toString;
    function resolveYamlOmap(data) {
      if (data === null) return true;
      var objectKeys = [],
        index,
        length,
        pair,
        pairKey,
        pairHasKey,
        object = data;
      for (index = 0, length = object.length; index < length; index += 1) {
        pair = object[index];
        pairHasKey = false;
        if (_toString$2.call(pair) !== '[object Object]') return false;
        for (pairKey in pair) {
          if (_hasOwnProperty$3.call(pair, pairKey)) {
            if (!pairHasKey) pairHasKey = true;else return false;
          }
        }
        if (!pairHasKey) return false;
        if (objectKeys.indexOf(pairKey) === -1) objectKeys.push(pairKey);else return false;
      }
      return true;
    }
    function constructYamlOmap(data) {
      return data !== null ? data : [];
    }
    var omap = new type('tag:yaml.org,2002:omap', {
      kind: 'sequence',
      resolve: resolveYamlOmap,
      construct: constructYamlOmap
    });

    var _toString$1 = Object.prototype.toString;
    function resolveYamlPairs(data) {
      if (data === null) return true;
      var index,
        length,
        pair,
        keys,
        result,
        object = data;
      result = new Array(object.length);
      for (index = 0, length = object.length; index < length; index += 1) {
        pair = object[index];
        if (_toString$1.call(pair) !== '[object Object]') return false;
        keys = Object.keys(pair);
        if (keys.length !== 1) return false;
        result[index] = [keys[0], pair[keys[0]]];
      }
      return true;
    }
    function constructYamlPairs(data) {
      if (data === null) return [];
      var index,
        length,
        pair,
        keys,
        result,
        object = data;
      result = new Array(object.length);
      for (index = 0, length = object.length; index < length; index += 1) {
        pair = object[index];
        keys = Object.keys(pair);
        result[index] = [keys[0], pair[keys[0]]];
      }
      return result;
    }
    var pairs = new type('tag:yaml.org,2002:pairs', {
      kind: 'sequence',
      resolve: resolveYamlPairs,
      construct: constructYamlPairs
    });

    var _hasOwnProperty$2 = Object.prototype.hasOwnProperty;
    function resolveYamlSet(data) {
      if (data === null) return true;
      var key,
        object = data;
      for (key in object) {
        if (_hasOwnProperty$2.call(object, key)) {
          if (object[key] !== null) return false;
        }
      }
      return true;
    }
    function constructYamlSet(data) {
      return data !== null ? data : {};
    }
    var set = new type('tag:yaml.org,2002:set', {
      kind: 'mapping',
      resolve: resolveYamlSet,
      construct: constructYamlSet
    });

    var default_safe = new schema({
      include: [core],
      implicit: [timestamp, merge],
      explicit: [binary, omap, pairs, set]
    });

    function resolveJavascriptUndefined() {
      return true;
    }
    function constructJavascriptUndefined() {
      /*eslint-disable no-undefined*/
      return undefined;
    }
    function representJavascriptUndefined() {
      return '';
    }
    function isUndefined(object) {
      return typeof object === 'undefined';
    }
    var _undefined = new type('tag:yaml.org,2002:js/undefined', {
      kind: 'scalar',
      resolve: resolveJavascriptUndefined,
      construct: constructJavascriptUndefined,
      predicate: isUndefined,
      represent: representJavascriptUndefined
    });

    function resolveJavascriptRegExp(data) {
      if (data === null) return false;
      if (data.length === 0) return false;
      var regexp = data,
        tail = /\/([gim]*)$/.exec(data),
        modifiers = '';

      // if regexp starts with '/' it can have modifiers and must be properly closed
      // `/foo/gim` - modifiers tail can be maximum 3 chars
      if (regexp[0] === '/') {
        if (tail) modifiers = tail[1];
        if (modifiers.length > 3) return false;
        // if expression starts with /, is should be properly terminated
        if (regexp[regexp.length - modifiers.length - 1] !== '/') return false;
      }
      return true;
    }
    function constructJavascriptRegExp(data) {
      var regexp = data,
        tail = /\/([gim]*)$/.exec(data),
        modifiers = '';

      // `/foo/gim` - tail can be maximum 4 chars
      if (regexp[0] === '/') {
        if (tail) modifiers = tail[1];
        regexp = regexp.slice(1, regexp.length - modifiers.length - 1);
      }
      return new RegExp(regexp, modifiers);
    }
    function representJavascriptRegExp(object /*, style*/) {
      var result = '/' + object.source + '/';
      if (object.global) result += 'g';
      if (object.multiline) result += 'm';
      if (object.ignoreCase) result += 'i';
      return result;
    }
    function isRegExp(object) {
      return Object.prototype.toString.call(object) === '[object RegExp]';
    }
    var regexp = new type('tag:yaml.org,2002:js/regexp', {
      kind: 'scalar',
      resolve: resolveJavascriptRegExp,
      construct: constructJavascriptRegExp,
      predicate: isRegExp,
      represent: representJavascriptRegExp
    });

    var esprima;

    // Browserified version does not have esprima
    //
    // 1. For node.js just require module as deps
    // 2. For browser try to require mudule via external AMD system.
    //    If not found - try to fallback to window.esprima. If not
    //    found too - then fail to parse.
    //
    try {
      // workaround to exclude package from browserify list.
      var _require = commonjsRequire;
      esprima = _require('esprima');
    } catch (_) {
      /* eslint-disable no-redeclare */
      /* global window */
      if (typeof window !== 'undefined') esprima = window.esprima;
    }
    function resolveJavascriptFunction(data) {
      if (data === null) return false;
      try {
        var source = '(' + data + ')',
          ast = esprima.parse(source, {
            range: true
          });
        if (ast.type !== 'Program' || ast.body.length !== 1 || ast.body[0].type !== 'ExpressionStatement' || ast.body[0].expression.type !== 'ArrowFunctionExpression' && ast.body[0].expression.type !== 'FunctionExpression') {
          return false;
        }
        return true;
      } catch (err) {
        return false;
      }
    }
    function constructJavascriptFunction(data) {
      /*jslint evil:true*/

      var source = '(' + data + ')',
        ast = esprima.parse(source, {
          range: true
        }),
        params = [],
        body;
      if (ast.type !== 'Program' || ast.body.length !== 1 || ast.body[0].type !== 'ExpressionStatement' || ast.body[0].expression.type !== 'ArrowFunctionExpression' && ast.body[0].expression.type !== 'FunctionExpression') {
        throw new Error('Failed to resolve function');
      }
      ast.body[0].expression.params.forEach(function (param) {
        params.push(param.name);
      });
      body = ast.body[0].expression.body.range;

      // Esprima's ranges include the first '{' and the last '}' characters on
      // function expressions. So cut them out.
      if (ast.body[0].expression.body.type === 'BlockStatement') {
        /*eslint-disable no-new-func*/
        return new Function(params, source.slice(body[0] + 1, body[1] - 1));
      }
      // ES6 arrow functions can omit the BlockStatement. In that case, just return
      // the body.
      /*eslint-disable no-new-func*/
      return new Function(params, 'return ' + source.slice(body[0], body[1]));
    }
    function representJavascriptFunction(object /*, style*/) {
      return object.toString();
    }
    function isFunction(object) {
      return Object.prototype.toString.call(object) === '[object Function]';
    }
    var _function = new type('tag:yaml.org,2002:js/function', {
      kind: 'scalar',
      resolve: resolveJavascriptFunction,
      construct: constructJavascriptFunction,
      predicate: isFunction,
      represent: representJavascriptFunction
    });

    var default_full = schema.DEFAULT = new schema({
      include: [default_safe],
      explicit: [_undefined, regexp, _function]
    });

    /*eslint-disable max-len,no-use-before-define*/

    var _hasOwnProperty$1 = Object.prototype.hasOwnProperty;
    var CONTEXT_FLOW_IN = 1;
    var CONTEXT_FLOW_OUT = 2;
    var CONTEXT_BLOCK_IN = 3;
    var CONTEXT_BLOCK_OUT = 4;
    var CHOMPING_CLIP = 1;
    var CHOMPING_STRIP = 2;
    var CHOMPING_KEEP = 3;
    var PATTERN_NON_PRINTABLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
    var PATTERN_NON_ASCII_LINE_BREAKS = /[\x85\u2028\u2029]/;
    var PATTERN_FLOW_INDICATORS = /[,\[\]\{\}]/;
    var PATTERN_TAG_HANDLE = /^(?:!|!!|![a-z\-]+!)$/i;
    var PATTERN_TAG_URI = /^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;
    function _class(obj) {
      return Object.prototype.toString.call(obj);
    }
    function is_EOL(c) {
      return c === 0x0A /* LF */ || c === 0x0D /* CR */;
    }

    function is_WHITE_SPACE(c) {
      return c === 0x09 /* Tab */ || c === 0x20 /* Space */;
    }

    function is_WS_OR_EOL(c) {
      return c === 0x09 /* Tab */ || c === 0x20 /* Space */ || c === 0x0A /* LF */ || c === 0x0D /* CR */;
    }

    function is_FLOW_INDICATOR(c) {
      return c === 0x2C /* , */ || c === 0x5B /* [ */ || c === 0x5D /* ] */ || c === 0x7B /* { */ || c === 0x7D /* } */;
    }

    function fromHexCode(c) {
      var lc;
      if (0x30 /* 0 */ <= c && c <= 0x39 /* 9 */) {
        return c - 0x30;
      }

      /*eslint-disable no-bitwise*/
      lc = c | 0x20;
      if (0x61 /* a */ <= lc && lc <= 0x66 /* f */) {
        return lc - 0x61 + 10;
      }
      return -1;
    }
    function escapedHexLen(c) {
      if (c === 0x78 /* x */) {
        return 2;
      }
      if (c === 0x75 /* u */) {
        return 4;
      }
      if (c === 0x55 /* U */) {
        return 8;
      }
      return 0;
    }
    function fromDecimalCode(c) {
      if (0x30 /* 0 */ <= c && c <= 0x39 /* 9 */) {
        return c - 0x30;
      }
      return -1;
    }
    function simpleEscapeSequence(c) {
      /* eslint-disable indent */
      return c === 0x30 /* 0 */ ? '\x00' : c === 0x61 /* a */ ? '\x07' : c === 0x62 /* b */ ? '\x08' : c === 0x74 /* t */ ? '\x09' : c === 0x09 /* Tab */ ? '\x09' : c === 0x6E /* n */ ? '\x0A' : c === 0x76 /* v */ ? '\x0B' : c === 0x66 /* f */ ? '\x0C' : c === 0x72 /* r */ ? '\x0D' : c === 0x65 /* e */ ? '\x1B' : c === 0x20 /* Space */ ? ' ' : c === 0x22 /* " */ ? '\x22' : c === 0x2F /* / */ ? '/' : c === 0x5C /* \ */ ? '\x5C' : c === 0x4E /* N */ ? '\x85' : c === 0x5F /* _ */ ? '\xA0' : c === 0x4C /* L */ ? "\u2028" : c === 0x50 /* P */ ? "\u2029" : '';
    }
    function charFromCodepoint(c) {
      if (c <= 0xFFFF) {
        return String.fromCharCode(c);
      }
      // Encode UTF-16 surrogate pair
      // https://en.wikipedia.org/wiki/UTF-16#Code_points_U.2B010000_to_U.2B10FFFF
      return String.fromCharCode((c - 0x010000 >> 10) + 0xD800, (c - 0x010000 & 0x03FF) + 0xDC00);
    }
    var simpleEscapeCheck = new Array(256); // integer, for fast access
    var simpleEscapeMap = new Array(256);
    for (var i = 0; i < 256; i++) {
      simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
      simpleEscapeMap[i] = simpleEscapeSequence(i);
    }
    function State$1(input, options) {
      this.input = input;
      this.filename = options['filename'] || null;
      this.schema = options['schema'] || default_full;
      this.onWarning = options['onWarning'] || null;
      this.legacy = options['legacy'] || false;
      this.json = options['json'] || false;
      this.listener = options['listener'] || null;
      this.implicitTypes = this.schema.compiledImplicit;
      this.typeMap = this.schema.compiledTypeMap;
      this.length = input.length;
      this.position = 0;
      this.line = 0;
      this.lineStart = 0;
      this.lineIndent = 0;
      this.documents = [];

      /*
      this.version;
      this.checkLineBreaks;
      this.tagMap;
      this.anchorMap;
      this.tag;
      this.anchor;
      this.kind;
      this.result;*/
    }

    function generateError(state, message) {
      return new exception(message, new mark(state.filename, state.input, state.position, state.line, state.position - state.lineStart));
    }
    function throwError(state, message) {
      throw generateError(state, message);
    }
    function throwWarning(state, message) {
      if (state.onWarning) {
        state.onWarning.call(null, generateError(state, message));
      }
    }
    var directiveHandlers = {
      YAML: function handleYamlDirective(state, name, args) {
        var match, major, minor;
        if (state.version !== null) {
          throwError(state, 'duplication of %YAML directive');
        }
        if (args.length !== 1) {
          throwError(state, 'YAML directive accepts exactly one argument');
        }
        match = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);
        if (match === null) {
          throwError(state, 'ill-formed argument of the YAML directive');
        }
        major = parseInt(match[1], 10);
        minor = parseInt(match[2], 10);
        if (major !== 1) {
          throwError(state, 'unacceptable YAML version of the document');
        }
        state.version = args[0];
        state.checkLineBreaks = minor < 2;
        if (minor !== 1 && minor !== 2) {
          throwWarning(state, 'unsupported YAML version of the document');
        }
      },
      TAG: function handleTagDirective(state, name, args) {
        var handle, prefix;
        if (args.length !== 2) {
          throwError(state, 'TAG directive accepts exactly two arguments');
        }
        handle = args[0];
        prefix = args[1];
        if (!PATTERN_TAG_HANDLE.test(handle)) {
          throwError(state, 'ill-formed tag handle (first argument) of the TAG directive');
        }
        if (_hasOwnProperty$1.call(state.tagMap, handle)) {
          throwError(state, 'there is a previously declared suffix for "' + handle + '" tag handle');
        }
        if (!PATTERN_TAG_URI.test(prefix)) {
          throwError(state, 'ill-formed tag prefix (second argument) of the TAG directive');
        }
        state.tagMap[handle] = prefix;
      }
    };
    function captureSegment(state, start, end, checkJson) {
      var _position, _length, _character, _result;
      if (start < end) {
        _result = state.input.slice(start, end);
        if (checkJson) {
          for (_position = 0, _length = _result.length; _position < _length; _position += 1) {
            _character = _result.charCodeAt(_position);
            if (!(_character === 0x09 || 0x20 <= _character && _character <= 0x10FFFF)) {
              throwError(state, 'expected valid JSON character');
            }
          }
        } else if (PATTERN_NON_PRINTABLE.test(_result)) {
          throwError(state, 'the stream contains non-printable characters');
        }
        state.result += _result;
      }
    }
    function mergeMappings(state, destination, source, overridableKeys) {
      var sourceKeys, key, index, quantity;
      if (!common.isObject(source)) {
        throwError(state, 'cannot merge mappings; the provided source object is unacceptable');
      }
      sourceKeys = Object.keys(source);
      for (index = 0, quantity = sourceKeys.length; index < quantity; index += 1) {
        key = sourceKeys[index];
        if (!_hasOwnProperty$1.call(destination, key)) {
          destination[key] = source[key];
          overridableKeys[key] = true;
        }
      }
    }
    function storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, startLine, startPos) {
      var index, quantity;

      // The output is a plain object here, so keys can only be strings.
      // We need to convert keyNode to a string, but doing so can hang the process
      // (deeply nested arrays that explode exponentially using aliases).
      if (Array.isArray(keyNode)) {
        keyNode = Array.prototype.slice.call(keyNode);
        for (index = 0, quantity = keyNode.length; index < quantity; index += 1) {
          if (Array.isArray(keyNode[index])) {
            throwError(state, 'nested arrays are not supported inside keys');
          }
          if (typeof keyNode === 'object' && _class(keyNode[index]) === '[object Object]') {
            keyNode[index] = '[object Object]';
          }
        }
      }

      // Avoid code execution in load() via toString property
      // (still use its own toString for arrays, timestamps,
      // and whatever user schema extensions happen to have @@toStringTag)
      if (typeof keyNode === 'object' && _class(keyNode) === '[object Object]') {
        keyNode = '[object Object]';
      }
      keyNode = String(keyNode);
      if (_result === null) {
        _result = {};
      }
      if (keyTag === 'tag:yaml.org,2002:merge') {
        if (Array.isArray(valueNode)) {
          for (index = 0, quantity = valueNode.length; index < quantity; index += 1) {
            mergeMappings(state, _result, valueNode[index], overridableKeys);
          }
        } else {
          mergeMappings(state, _result, valueNode, overridableKeys);
        }
      } else {
        if (!state.json && !_hasOwnProperty$1.call(overridableKeys, keyNode) && _hasOwnProperty$1.call(_result, keyNode)) {
          state.line = startLine || state.line;
          state.position = startPos || state.position;
          throwError(state, 'duplicated mapping key');
        }
        _result[keyNode] = valueNode;
        delete overridableKeys[keyNode];
      }
      return _result;
    }
    function readLineBreak(state) {
      var ch;
      ch = state.input.charCodeAt(state.position);
      if (ch === 0x0A /* LF */) {
        state.position++;
      } else if (ch === 0x0D /* CR */) {
        state.position++;
        if (state.input.charCodeAt(state.position) === 0x0A /* LF */) {
          state.position++;
        }
      } else {
        throwError(state, 'a line break is expected');
      }
      state.line += 1;
      state.lineStart = state.position;
    }
    function skipSeparationSpace(state, allowComments, checkIndent) {
      var lineBreaks = 0,
        ch = state.input.charCodeAt(state.position);
      while (ch !== 0) {
        while (is_WHITE_SPACE(ch)) {
          ch = state.input.charCodeAt(++state.position);
        }
        if (allowComments && ch === 0x23 /* # */) {
          do {
            ch = state.input.charCodeAt(++state.position);
          } while (ch !== 0x0A /* LF */ && ch !== 0x0D /* CR */ && ch !== 0);
        }
        if (is_EOL(ch)) {
          readLineBreak(state);
          ch = state.input.charCodeAt(state.position);
          lineBreaks++;
          state.lineIndent = 0;
          while (ch === 0x20 /* Space */) {
            state.lineIndent++;
            ch = state.input.charCodeAt(++state.position);
          }
        } else {
          break;
        }
      }
      if (checkIndent !== -1 && lineBreaks !== 0 && state.lineIndent < checkIndent) {
        throwWarning(state, 'deficient indentation');
      }
      return lineBreaks;
    }
    function testDocumentSeparator(state) {
      var _position = state.position,
        ch;
      ch = state.input.charCodeAt(_position);

      // Condition state.position === state.lineStart is tested
      // in parent on each call, for efficiency. No needs to test here again.
      if ((ch === 0x2D /* - */ || ch === 0x2E /* . */) && ch === state.input.charCodeAt(_position + 1) && ch === state.input.charCodeAt(_position + 2)) {
        _position += 3;
        ch = state.input.charCodeAt(_position);
        if (ch === 0 || is_WS_OR_EOL(ch)) {
          return true;
        }
      }
      return false;
    }
    function writeFoldedLines(state, count) {
      if (count === 1) {
        state.result += ' ';
      } else if (count > 1) {
        state.result += common.repeat('\n', count - 1);
      }
    }
    function readPlainScalar(state, nodeIndent, withinFlowCollection) {
      var preceding,
        following,
        captureStart,
        captureEnd,
        hasPendingContent,
        _line,
        _lineStart,
        _lineIndent,
        _kind = state.kind,
        _result = state.result,
        ch;
      ch = state.input.charCodeAt(state.position);
      if (is_WS_OR_EOL(ch) || is_FLOW_INDICATOR(ch) || ch === 0x23 /* # */ || ch === 0x26 /* & */ || ch === 0x2A /* * */ || ch === 0x21 /* ! */ || ch === 0x7C /* | */ || ch === 0x3E /* > */ || ch === 0x27 /* ' */ || ch === 0x22 /* " */ || ch === 0x25 /* % */ || ch === 0x40 /* @ */ || ch === 0x60 /* ` */) {
        return false;
      }
      if (ch === 0x3F /* ? */ || ch === 0x2D /* - */) {
        following = state.input.charCodeAt(state.position + 1);
        if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) {
          return false;
        }
      }
      state.kind = 'scalar';
      state.result = '';
      captureStart = captureEnd = state.position;
      hasPendingContent = false;
      while (ch !== 0) {
        if (ch === 0x3A /* : */) {
          following = state.input.charCodeAt(state.position + 1);
          if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) {
            break;
          }
        } else if (ch === 0x23 /* # */) {
          preceding = state.input.charCodeAt(state.position - 1);
          if (is_WS_OR_EOL(preceding)) {
            break;
          }
        } else if (state.position === state.lineStart && testDocumentSeparator(state) || withinFlowCollection && is_FLOW_INDICATOR(ch)) {
          break;
        } else if (is_EOL(ch)) {
          _line = state.line;
          _lineStart = state.lineStart;
          _lineIndent = state.lineIndent;
          skipSeparationSpace(state, false, -1);
          if (state.lineIndent >= nodeIndent) {
            hasPendingContent = true;
            ch = state.input.charCodeAt(state.position);
            continue;
          } else {
            state.position = captureEnd;
            state.line = _line;
            state.lineStart = _lineStart;
            state.lineIndent = _lineIndent;
            break;
          }
        }
        if (hasPendingContent) {
          captureSegment(state, captureStart, captureEnd, false);
          writeFoldedLines(state, state.line - _line);
          captureStart = captureEnd = state.position;
          hasPendingContent = false;
        }
        if (!is_WHITE_SPACE(ch)) {
          captureEnd = state.position + 1;
        }
        ch = state.input.charCodeAt(++state.position);
      }
      captureSegment(state, captureStart, captureEnd, false);
      if (state.result) {
        return true;
      }
      state.kind = _kind;
      state.result = _result;
      return false;
    }
    function readSingleQuotedScalar(state, nodeIndent) {
      var ch, captureStart, captureEnd;
      ch = state.input.charCodeAt(state.position);
      if (ch !== 0x27 /* ' */) {
        return false;
      }
      state.kind = 'scalar';
      state.result = '';
      state.position++;
      captureStart = captureEnd = state.position;
      while ((ch = state.input.charCodeAt(state.position)) !== 0) {
        if (ch === 0x27 /* ' */) {
          captureSegment(state, captureStart, state.position, true);
          ch = state.input.charCodeAt(++state.position);
          if (ch === 0x27 /* ' */) {
            captureStart = state.position;
            state.position++;
            captureEnd = state.position;
          } else {
            return true;
          }
        } else if (is_EOL(ch)) {
          captureSegment(state, captureStart, captureEnd, true);
          writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
          captureStart = captureEnd = state.position;
        } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
          throwError(state, 'unexpected end of the document within a single quoted scalar');
        } else {
          state.position++;
          captureEnd = state.position;
        }
      }
      throwError(state, 'unexpected end of the stream within a single quoted scalar');
    }
    function readDoubleQuotedScalar(state, nodeIndent) {
      var captureStart, captureEnd, hexLength, hexResult, tmp, ch;
      ch = state.input.charCodeAt(state.position);
      if (ch !== 0x22 /* " */) {
        return false;
      }
      state.kind = 'scalar';
      state.result = '';
      state.position++;
      captureStart = captureEnd = state.position;
      while ((ch = state.input.charCodeAt(state.position)) !== 0) {
        if (ch === 0x22 /* " */) {
          captureSegment(state, captureStart, state.position, true);
          state.position++;
          return true;
        } else if (ch === 0x5C /* \ */) {
          captureSegment(state, captureStart, state.position, true);
          ch = state.input.charCodeAt(++state.position);
          if (is_EOL(ch)) {
            skipSeparationSpace(state, false, nodeIndent);

            // TODO: rework to inline fn with no type cast?
          } else if (ch < 256 && simpleEscapeCheck[ch]) {
            state.result += simpleEscapeMap[ch];
            state.position++;
          } else if ((tmp = escapedHexLen(ch)) > 0) {
            hexLength = tmp;
            hexResult = 0;
            for (; hexLength > 0; hexLength--) {
              ch = state.input.charCodeAt(++state.position);
              if ((tmp = fromHexCode(ch)) >= 0) {
                hexResult = (hexResult << 4) + tmp;
              } else {
                throwError(state, 'expected hexadecimal character');
              }
            }
            state.result += charFromCodepoint(hexResult);
            state.position++;
          } else {
            throwError(state, 'unknown escape sequence');
          }
          captureStart = captureEnd = state.position;
        } else if (is_EOL(ch)) {
          captureSegment(state, captureStart, captureEnd, true);
          writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
          captureStart = captureEnd = state.position;
        } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
          throwError(state, 'unexpected end of the document within a double quoted scalar');
        } else {
          state.position++;
          captureEnd = state.position;
        }
      }
      throwError(state, 'unexpected end of the stream within a double quoted scalar');
    }
    function readFlowCollection(state, nodeIndent) {
      var readNext = true,
        _line,
        _tag = state.tag,
        _result,
        _anchor = state.anchor,
        following,
        terminator,
        isPair,
        isExplicitPair,
        isMapping,
        overridableKeys = {},
        keyNode,
        keyTag,
        valueNode,
        ch;
      ch = state.input.charCodeAt(state.position);
      if (ch === 0x5B /* [ */) {
        terminator = 0x5D; /* ] */
        isMapping = false;
        _result = [];
      } else if (ch === 0x7B /* { */) {
        terminator = 0x7D; /* } */
        isMapping = true;
        _result = {};
      } else {
        return false;
      }
      if (state.anchor !== null) {
        state.anchorMap[state.anchor] = _result;
      }
      ch = state.input.charCodeAt(++state.position);
      while (ch !== 0) {
        skipSeparationSpace(state, true, nodeIndent);
        ch = state.input.charCodeAt(state.position);
        if (ch === terminator) {
          state.position++;
          state.tag = _tag;
          state.anchor = _anchor;
          state.kind = isMapping ? 'mapping' : 'sequence';
          state.result = _result;
          return true;
        } else if (!readNext) {
          throwError(state, 'missed comma between flow collection entries');
        }
        keyTag = keyNode = valueNode = null;
        isPair = isExplicitPair = false;
        if (ch === 0x3F /* ? */) {
          following = state.input.charCodeAt(state.position + 1);
          if (is_WS_OR_EOL(following)) {
            isPair = isExplicitPair = true;
            state.position++;
            skipSeparationSpace(state, true, nodeIndent);
          }
        }
        _line = state.line;
        composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
        keyTag = state.tag;
        keyNode = state.result;
        skipSeparationSpace(state, true, nodeIndent);
        ch = state.input.charCodeAt(state.position);
        if ((isExplicitPair || state.line === _line) && ch === 0x3A /* : */) {
          isPair = true;
          ch = state.input.charCodeAt(++state.position);
          skipSeparationSpace(state, true, nodeIndent);
          composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
          valueNode = state.result;
        }
        if (isMapping) {
          storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode);
        } else if (isPair) {
          _result.push(storeMappingPair(state, null, overridableKeys, keyTag, keyNode, valueNode));
        } else {
          _result.push(keyNode);
        }
        skipSeparationSpace(state, true, nodeIndent);
        ch = state.input.charCodeAt(state.position);
        if (ch === 0x2C /* , */) {
          readNext = true;
          ch = state.input.charCodeAt(++state.position);
        } else {
          readNext = false;
        }
      }
      throwError(state, 'unexpected end of the stream within a flow collection');
    }
    function readBlockScalar(state, nodeIndent) {
      var captureStart,
        folding,
        chomping = CHOMPING_CLIP,
        didReadContent = false,
        detectedIndent = false,
        textIndent = nodeIndent,
        emptyLines = 0,
        atMoreIndented = false,
        tmp,
        ch;
      ch = state.input.charCodeAt(state.position);
      if (ch === 0x7C /* | */) {
        folding = false;
      } else if (ch === 0x3E /* > */) {
        folding = true;
      } else {
        return false;
      }
      state.kind = 'scalar';
      state.result = '';
      while (ch !== 0) {
        ch = state.input.charCodeAt(++state.position);
        if (ch === 0x2B /* + */ || ch === 0x2D /* - */) {
          if (CHOMPING_CLIP === chomping) {
            chomping = ch === 0x2B /* + */ ? CHOMPING_KEEP : CHOMPING_STRIP;
          } else {
            throwError(state, 'repeat of a chomping mode identifier');
          }
        } else if ((tmp = fromDecimalCode(ch)) >= 0) {
          if (tmp === 0) {
            throwError(state, 'bad explicit indentation width of a block scalar; it cannot be less than one');
          } else if (!detectedIndent) {
            textIndent = nodeIndent + tmp - 1;
            detectedIndent = true;
          } else {
            throwError(state, 'repeat of an indentation width identifier');
          }
        } else {
          break;
        }
      }
      if (is_WHITE_SPACE(ch)) {
        do {
          ch = state.input.charCodeAt(++state.position);
        } while (is_WHITE_SPACE(ch));
        if (ch === 0x23 /* # */) {
          do {
            ch = state.input.charCodeAt(++state.position);
          } while (!is_EOL(ch) && ch !== 0);
        }
      }
      while (ch !== 0) {
        readLineBreak(state);
        state.lineIndent = 0;
        ch = state.input.charCodeAt(state.position);
        while ((!detectedIndent || state.lineIndent < textIndent) && ch === 0x20 /* Space */) {
          state.lineIndent++;
          ch = state.input.charCodeAt(++state.position);
        }
        if (!detectedIndent && state.lineIndent > textIndent) {
          textIndent = state.lineIndent;
        }
        if (is_EOL(ch)) {
          emptyLines++;
          continue;
        }

        // End of the scalar.
        if (state.lineIndent < textIndent) {
          // Perform the chomping.
          if (chomping === CHOMPING_KEEP) {
            state.result += common.repeat('\n', didReadContent ? 1 + emptyLines : emptyLines);
          } else if (chomping === CHOMPING_CLIP) {
            if (didReadContent) {
              // i.e. only if the scalar is not empty.
              state.result += '\n';
            }
          }

          // Break this `while` cycle and go to the funciton's epilogue.
          break;
        }

        // Folded style: use fancy rules to handle line breaks.
        if (folding) {
          // Lines starting with white space characters (more-indented lines) are not folded.
          if (is_WHITE_SPACE(ch)) {
            atMoreIndented = true;
            // except for the first content line (cf. Example 8.1)
            state.result += common.repeat('\n', didReadContent ? 1 + emptyLines : emptyLines);

            // End of more-indented block.
          } else if (atMoreIndented) {
            atMoreIndented = false;
            state.result += common.repeat('\n', emptyLines + 1);

            // Just one line break - perceive as the same line.
          } else if (emptyLines === 0) {
            if (didReadContent) {
              // i.e. only if we have already read some scalar content.
              state.result += ' ';
            }

            // Several line breaks - perceive as different lines.
          } else {
            state.result += common.repeat('\n', emptyLines);
          }

          // Literal style: just add exact number of line breaks between content lines.
        } else {
          // Keep all line breaks except the header line break.
          state.result += common.repeat('\n', didReadContent ? 1 + emptyLines : emptyLines);
        }
        didReadContent = true;
        detectedIndent = true;
        emptyLines = 0;
        captureStart = state.position;
        while (!is_EOL(ch) && ch !== 0) {
          ch = state.input.charCodeAt(++state.position);
        }
        captureSegment(state, captureStart, state.position, false);
      }
      return true;
    }
    function readBlockSequence(state, nodeIndent) {
      var _line,
        _tag = state.tag,
        _anchor = state.anchor,
        _result = [],
        following,
        detected = false,
        ch;
      if (state.anchor !== null) {
        state.anchorMap[state.anchor] = _result;
      }
      ch = state.input.charCodeAt(state.position);
      while (ch !== 0) {
        if (ch !== 0x2D /* - */) {
          break;
        }
        following = state.input.charCodeAt(state.position + 1);
        if (!is_WS_OR_EOL(following)) {
          break;
        }
        detected = true;
        state.position++;
        if (skipSeparationSpace(state, true, -1)) {
          if (state.lineIndent <= nodeIndent) {
            _result.push(null);
            ch = state.input.charCodeAt(state.position);
            continue;
          }
        }
        _line = state.line;
        composeNode(state, nodeIndent, CONTEXT_BLOCK_IN, false, true);
        _result.push(state.result);
        skipSeparationSpace(state, true, -1);
        ch = state.input.charCodeAt(state.position);
        if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
          throwError(state, 'bad indentation of a sequence entry');
        } else if (state.lineIndent < nodeIndent) {
          break;
        }
      }
      if (detected) {
        state.tag = _tag;
        state.anchor = _anchor;
        state.kind = 'sequence';
        state.result = _result;
        return true;
      }
      return false;
    }
    function readBlockMapping(state, nodeIndent, flowIndent) {
      var following,
        allowCompact,
        _line,
        _pos,
        _tag = state.tag,
        _anchor = state.anchor,
        _result = {},
        overridableKeys = {},
        keyTag = null,
        keyNode = null,
        valueNode = null,
        atExplicitKey = false,
        detected = false,
        ch;
      if (state.anchor !== null) {
        state.anchorMap[state.anchor] = _result;
      }
      ch = state.input.charCodeAt(state.position);
      while (ch !== 0) {
        following = state.input.charCodeAt(state.position + 1);
        _line = state.line; // Save the current line.
        _pos = state.position;

        //
        // Explicit notation case. There are two separate blocks:
        // first for the key (denoted by "?") and second for the value (denoted by ":")
        //
        if ((ch === 0x3F /* ? */ || ch === 0x3A /* : */) && is_WS_OR_EOL(following)) {
          if (ch === 0x3F /* ? */) {
            if (atExplicitKey) {
              storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null);
              keyTag = keyNode = valueNode = null;
            }
            detected = true;
            atExplicitKey = true;
            allowCompact = true;
          } else if (atExplicitKey) {
            // i.e. 0x3A/* : */ === character after the explicit key.
            atExplicitKey = false;
            allowCompact = true;
          } else {
            throwError(state, 'incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line');
          }
          state.position += 1;
          ch = following;

          //
          // Implicit notation case. Flow-style node as the key first, then ":", and the value.
          //
        } else if (composeNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true)) {
          if (state.line === _line) {
            ch = state.input.charCodeAt(state.position);
            while (is_WHITE_SPACE(ch)) {
              ch = state.input.charCodeAt(++state.position);
            }
            if (ch === 0x3A /* : */) {
              ch = state.input.charCodeAt(++state.position);
              if (!is_WS_OR_EOL(ch)) {
                throwError(state, 'a whitespace character is expected after the key-value separator within a block mapping');
              }
              if (atExplicitKey) {
                storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null);
                keyTag = keyNode = valueNode = null;
              }
              detected = true;
              atExplicitKey = false;
              allowCompact = false;
              keyTag = state.tag;
              keyNode = state.result;
            } else if (detected) {
              throwError(state, 'can not read an implicit mapping pair; a colon is missed');
            } else {
              state.tag = _tag;
              state.anchor = _anchor;
              return true; // Keep the result of `composeNode`.
            }
          } else if (detected) {
            throwError(state, 'can not read a block mapping entry; a multiline key may not be an implicit key');
          } else {
            state.tag = _tag;
            state.anchor = _anchor;
            return true; // Keep the result of `composeNode`.
          }
        } else {
          break; // Reading is done. Go to the epilogue.
        }

        //
        // Common reading code for both explicit and implicit notations.
        //
        if (state.line === _line || state.lineIndent > nodeIndent) {
          if (composeNode(state, nodeIndent, CONTEXT_BLOCK_OUT, true, allowCompact)) {
            if (atExplicitKey) {
              keyNode = state.result;
            } else {
              valueNode = state.result;
            }
          }
          if (!atExplicitKey) {
            storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _line, _pos);
            keyTag = keyNode = valueNode = null;
          }
          skipSeparationSpace(state, true, -1);
          ch = state.input.charCodeAt(state.position);
        }
        if (state.lineIndent > nodeIndent && ch !== 0) {
          throwError(state, 'bad indentation of a mapping entry');
        } else if (state.lineIndent < nodeIndent) {
          break;
        }
      }

      //
      // Epilogue.
      //

      // Special case: last mapping's node contains only the key in explicit notation.
      if (atExplicitKey) {
        storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null);
      }

      // Expose the resulting mapping.
      if (detected) {
        state.tag = _tag;
        state.anchor = _anchor;
        state.kind = 'mapping';
        state.result = _result;
      }
      return detected;
    }
    function readTagProperty(state) {
      var _position,
        isVerbatim = false,
        isNamed = false,
        tagHandle,
        tagName,
        ch;
      ch = state.input.charCodeAt(state.position);
      if (ch !== 0x21 /* ! */) return false;
      if (state.tag !== null) {
        throwError(state, 'duplication of a tag property');
      }
      ch = state.input.charCodeAt(++state.position);
      if (ch === 0x3C /* < */) {
        isVerbatim = true;
        ch = state.input.charCodeAt(++state.position);
      } else if (ch === 0x21 /* ! */) {
        isNamed = true;
        tagHandle = '!!';
        ch = state.input.charCodeAt(++state.position);
      } else {
        tagHandle = '!';
      }
      _position = state.position;
      if (isVerbatim) {
        do {
          ch = state.input.charCodeAt(++state.position);
        } while (ch !== 0 && ch !== 0x3E /* > */);

        if (state.position < state.length) {
          tagName = state.input.slice(_position, state.position);
          ch = state.input.charCodeAt(++state.position);
        } else {
          throwError(state, 'unexpected end of the stream within a verbatim tag');
        }
      } else {
        while (ch !== 0 && !is_WS_OR_EOL(ch)) {
          if (ch === 0x21 /* ! */) {
            if (!isNamed) {
              tagHandle = state.input.slice(_position - 1, state.position + 1);
              if (!PATTERN_TAG_HANDLE.test(tagHandle)) {
                throwError(state, 'named tag handle cannot contain such characters');
              }
              isNamed = true;
              _position = state.position + 1;
            } else {
              throwError(state, 'tag suffix cannot contain exclamation marks');
            }
          }
          ch = state.input.charCodeAt(++state.position);
        }
        tagName = state.input.slice(_position, state.position);
        if (PATTERN_FLOW_INDICATORS.test(tagName)) {
          throwError(state, 'tag suffix cannot contain flow indicator characters');
        }
      }
      if (tagName && !PATTERN_TAG_URI.test(tagName)) {
        throwError(state, 'tag name cannot contain such characters: ' + tagName);
      }
      if (isVerbatim) {
        state.tag = tagName;
      } else if (_hasOwnProperty$1.call(state.tagMap, tagHandle)) {
        state.tag = state.tagMap[tagHandle] + tagName;
      } else if (tagHandle === '!') {
        state.tag = '!' + tagName;
      } else if (tagHandle === '!!') {
        state.tag = 'tag:yaml.org,2002:' + tagName;
      } else {
        throwError(state, 'undeclared tag handle "' + tagHandle + '"');
      }
      return true;
    }
    function readAnchorProperty(state) {
      var _position, ch;
      ch = state.input.charCodeAt(state.position);
      if (ch !== 0x26 /* & */) return false;
      if (state.anchor !== null) {
        throwError(state, 'duplication of an anchor property');
      }
      ch = state.input.charCodeAt(++state.position);
      _position = state.position;
      while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }
      if (state.position === _position) {
        throwError(state, 'name of an anchor node must contain at least one character');
      }
      state.anchor = state.input.slice(_position, state.position);
      return true;
    }
    function readAlias(state) {
      var _position, alias, ch;
      ch = state.input.charCodeAt(state.position);
      if (ch !== 0x2A /* * */) return false;
      ch = state.input.charCodeAt(++state.position);
      _position = state.position;
      while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }
      if (state.position === _position) {
        throwError(state, 'name of an alias node must contain at least one character');
      }
      alias = state.input.slice(_position, state.position);
      if (!_hasOwnProperty$1.call(state.anchorMap, alias)) {
        throwError(state, 'unidentified alias "' + alias + '"');
      }
      state.result = state.anchorMap[alias];
      skipSeparationSpace(state, true, -1);
      return true;
    }
    function composeNode(state, parentIndent, nodeContext, allowToSeek, allowCompact) {
      var allowBlockStyles,
        allowBlockScalars,
        allowBlockCollections,
        indentStatus = 1,
        // 1: this>parent, 0: this=parent, -1: this<parent
        atNewLine = false,
        hasContent = false,
        typeIndex,
        typeQuantity,
        type,
        flowIndent,
        blockIndent;
      if (state.listener !== null) {
        state.listener('open', state);
      }
      state.tag = null;
      state.anchor = null;
      state.kind = null;
      state.result = null;
      allowBlockStyles = allowBlockScalars = allowBlockCollections = CONTEXT_BLOCK_OUT === nodeContext || CONTEXT_BLOCK_IN === nodeContext;
      if (allowToSeek) {
        if (skipSeparationSpace(state, true, -1)) {
          atNewLine = true;
          if (state.lineIndent > parentIndent) {
            indentStatus = 1;
          } else if (state.lineIndent === parentIndent) {
            indentStatus = 0;
          } else if (state.lineIndent < parentIndent) {
            indentStatus = -1;
          }
        }
      }
      if (indentStatus === 1) {
        while (readTagProperty(state) || readAnchorProperty(state)) {
          if (skipSeparationSpace(state, true, -1)) {
            atNewLine = true;
            allowBlockCollections = allowBlockStyles;
            if (state.lineIndent > parentIndent) {
              indentStatus = 1;
            } else if (state.lineIndent === parentIndent) {
              indentStatus = 0;
            } else if (state.lineIndent < parentIndent) {
              indentStatus = -1;
            }
          } else {
            allowBlockCollections = false;
          }
        }
      }
      if (allowBlockCollections) {
        allowBlockCollections = atNewLine || allowCompact;
      }
      if (indentStatus === 1 || CONTEXT_BLOCK_OUT === nodeContext) {
        if (CONTEXT_FLOW_IN === nodeContext || CONTEXT_FLOW_OUT === nodeContext) {
          flowIndent = parentIndent;
        } else {
          flowIndent = parentIndent + 1;
        }
        blockIndent = state.position - state.lineStart;
        if (indentStatus === 1) {
          if (allowBlockCollections && (readBlockSequence(state, blockIndent) || readBlockMapping(state, blockIndent, flowIndent)) || readFlowCollection(state, flowIndent)) {
            hasContent = true;
          } else {
            if (allowBlockScalars && readBlockScalar(state, flowIndent) || readSingleQuotedScalar(state, flowIndent) || readDoubleQuotedScalar(state, flowIndent)) {
              hasContent = true;
            } else if (readAlias(state)) {
              hasContent = true;
              if (state.tag !== null || state.anchor !== null) {
                throwError(state, 'alias node should not have any properties');
              }
            } else if (readPlainScalar(state, flowIndent, CONTEXT_FLOW_IN === nodeContext)) {
              hasContent = true;
              if (state.tag === null) {
                state.tag = '?';
              }
            }
            if (state.anchor !== null) {
              state.anchorMap[state.anchor] = state.result;
            }
          }
        } else if (indentStatus === 0) {
          // Special case: block sequences are allowed to have same indentation level as the parent.
          // http://www.yaml.org/spec/1.2/spec.html#id2799784
          hasContent = allowBlockCollections && readBlockSequence(state, blockIndent);
        }
      }
      if (state.tag !== null && state.tag !== '!') {
        if (state.tag === '?') {
          // Implicit resolving is not allowed for non-scalar types, and '?'
          // non-specific tag is only automatically assigned to plain scalars.
          //
          // We only need to check kind conformity in case user explicitly assigns '?'
          // tag, for example like this: "!<?> [0]"
          //
          if (state.result !== null && state.kind !== 'scalar') {
            throwError(state, 'unacceptable node kind for !<?> tag; it should be "scalar", not "' + state.kind + '"');
          }
          for (typeIndex = 0, typeQuantity = state.implicitTypes.length; typeIndex < typeQuantity; typeIndex += 1) {
            type = state.implicitTypes[typeIndex];
            if (type.resolve(state.result)) {
              // `state.result` updated in resolver if matched
              state.result = type.construct(state.result);
              state.tag = type.tag;
              if (state.anchor !== null) {
                state.anchorMap[state.anchor] = state.result;
              }
              break;
            }
          }
        } else if (_hasOwnProperty$1.call(state.typeMap[state.kind || 'fallback'], state.tag)) {
          type = state.typeMap[state.kind || 'fallback'][state.tag];
          if (state.result !== null && type.kind !== state.kind) {
            throwError(state, 'unacceptable node kind for !<' + state.tag + '> tag; it should be "' + type.kind + '", not "' + state.kind + '"');
          }
          if (!type.resolve(state.result)) {
            // `state.result` updated in resolver if matched
            throwError(state, 'cannot resolve a node with !<' + state.tag + '> explicit tag');
          } else {
            state.result = type.construct(state.result);
            if (state.anchor !== null) {
              state.anchorMap[state.anchor] = state.result;
            }
          }
        } else {
          throwError(state, 'unknown tag !<' + state.tag + '>');
        }
      }
      if (state.listener !== null) {
        state.listener('close', state);
      }
      return state.tag !== null || state.anchor !== null || hasContent;
    }
    function readDocument(state) {
      var documentStart = state.position,
        _position,
        directiveName,
        directiveArgs,
        hasDirectives = false,
        ch;
      state.version = null;
      state.checkLineBreaks = state.legacy;
      state.tagMap = {};
      state.anchorMap = {};
      while ((ch = state.input.charCodeAt(state.position)) !== 0) {
        skipSeparationSpace(state, true, -1);
        ch = state.input.charCodeAt(state.position);
        if (state.lineIndent > 0 || ch !== 0x25 /* % */) {
          break;
        }
        hasDirectives = true;
        ch = state.input.charCodeAt(++state.position);
        _position = state.position;
        while (ch !== 0 && !is_WS_OR_EOL(ch)) {
          ch = state.input.charCodeAt(++state.position);
        }
        directiveName = state.input.slice(_position, state.position);
        directiveArgs = [];
        if (directiveName.length < 1) {
          throwError(state, 'directive name must not be less than one character in length');
        }
        while (ch !== 0) {
          while (is_WHITE_SPACE(ch)) {
            ch = state.input.charCodeAt(++state.position);
          }
          if (ch === 0x23 /* # */) {
            do {
              ch = state.input.charCodeAt(++state.position);
            } while (ch !== 0 && !is_EOL(ch));
            break;
          }
          if (is_EOL(ch)) break;
          _position = state.position;
          while (ch !== 0 && !is_WS_OR_EOL(ch)) {
            ch = state.input.charCodeAt(++state.position);
          }
          directiveArgs.push(state.input.slice(_position, state.position));
        }
        if (ch !== 0) readLineBreak(state);
        if (_hasOwnProperty$1.call(directiveHandlers, directiveName)) {
          directiveHandlers[directiveName](state, directiveName, directiveArgs);
        } else {
          throwWarning(state, 'unknown document directive "' + directiveName + '"');
        }
      }
      skipSeparationSpace(state, true, -1);
      if (state.lineIndent === 0 && state.input.charCodeAt(state.position) === 0x2D /* - */ && state.input.charCodeAt(state.position + 1) === 0x2D /* - */ && state.input.charCodeAt(state.position + 2) === 0x2D /* - */) {
        state.position += 3;
        skipSeparationSpace(state, true, -1);
      } else if (hasDirectives) {
        throwError(state, 'directives end mark is expected');
      }
      composeNode(state, state.lineIndent - 1, CONTEXT_BLOCK_OUT, false, true);
      skipSeparationSpace(state, true, -1);
      if (state.checkLineBreaks && PATTERN_NON_ASCII_LINE_BREAKS.test(state.input.slice(documentStart, state.position))) {
        throwWarning(state, 'non-ASCII line breaks are interpreted as content');
      }
      state.documents.push(state.result);
      if (state.position === state.lineStart && testDocumentSeparator(state)) {
        if (state.input.charCodeAt(state.position) === 0x2E /* . */) {
          state.position += 3;
          skipSeparationSpace(state, true, -1);
        }
        return;
      }
      if (state.position < state.length - 1) {
        throwError(state, 'end of the stream or a document separator is expected');
      } else {
        return;
      }
    }
    function loadDocuments(input, options) {
      input = String(input);
      options = options || {};
      if (input.length !== 0) {
        // Add tailing `\n` if not exists
        if (input.charCodeAt(input.length - 1) !== 0x0A /* LF */ && input.charCodeAt(input.length - 1) !== 0x0D /* CR */) {
          input += '\n';
        }

        // Strip BOM
        if (input.charCodeAt(0) === 0xFEFF) {
          input = input.slice(1);
        }
      }
      var state = new State$1(input, options);
      var nullpos = input.indexOf('\0');
      if (nullpos !== -1) {
        state.position = nullpos;
        throwError(state, 'null byte is not allowed in input');
      }

      // Use 0 as string terminator. That significantly simplifies bounds check.
      state.input += '\0';
      while (state.input.charCodeAt(state.position) === 0x20 /* Space */) {
        state.lineIndent += 1;
        state.position += 1;
      }
      while (state.position < state.length - 1) {
        readDocument(state);
      }
      return state.documents;
    }
    function loadAll$1(input, iterator, options) {
      if (iterator !== null && typeof iterator === 'object' && typeof options === 'undefined') {
        options = iterator;
        iterator = null;
      }
      var documents = loadDocuments(input, options);
      if (typeof iterator !== 'function') {
        return documents;
      }
      for (var index = 0, length = documents.length; index < length; index += 1) {
        iterator(documents[index]);
      }
    }
    function load$1(input, options) {
      var documents = loadDocuments(input, options);
      if (documents.length === 0) {
        /*eslint-disable no-undefined*/
        return undefined;
      } else if (documents.length === 1) {
        return documents[0];
      }
      throw new exception('expected a single document in the stream, but found more');
    }
    function safeLoadAll$1(input, iterator, options) {
      if (typeof iterator === 'object' && iterator !== null && typeof options === 'undefined') {
        options = iterator;
        iterator = null;
      }
      return loadAll$1(input, iterator, common.extend({
        schema: default_safe
      }, options));
    }
    function safeLoad$1(input, options) {
      return load$1(input, common.extend({
        schema: default_safe
      }, options));
    }
    var loadAll_1 = loadAll$1;
    var load_1 = load$1;
    var safeLoadAll_1 = safeLoadAll$1;
    var safeLoad_1 = safeLoad$1;
    var loader = {
      loadAll: loadAll_1,
      load: load_1,
      safeLoadAll: safeLoadAll_1,
      safeLoad: safeLoad_1
    };

    /*eslint-disable no-use-before-define*/

    var _toString = Object.prototype.toString;
    var _hasOwnProperty = Object.prototype.hasOwnProperty;
    var CHAR_TAB = 0x09; /* Tab */
    var CHAR_LINE_FEED = 0x0A; /* LF */
    var CHAR_CARRIAGE_RETURN = 0x0D; /* CR */
    var CHAR_SPACE = 0x20; /* Space */
    var CHAR_EXCLAMATION = 0x21; /* ! */
    var CHAR_DOUBLE_QUOTE = 0x22; /* " */
    var CHAR_SHARP = 0x23; /* # */
    var CHAR_PERCENT = 0x25; /* % */
    var CHAR_AMPERSAND = 0x26; /* & */
    var CHAR_SINGLE_QUOTE = 0x27; /* ' */
    var CHAR_ASTERISK = 0x2A; /* * */
    var CHAR_COMMA = 0x2C; /* , */
    var CHAR_MINUS = 0x2D; /* - */
    var CHAR_COLON = 0x3A; /* : */
    var CHAR_EQUALS = 0x3D; /* = */
    var CHAR_GREATER_THAN = 0x3E; /* > */
    var CHAR_QUESTION = 0x3F; /* ? */
    var CHAR_COMMERCIAL_AT = 0x40; /* @ */
    var CHAR_LEFT_SQUARE_BRACKET = 0x5B; /* [ */
    var CHAR_RIGHT_SQUARE_BRACKET = 0x5D; /* ] */
    var CHAR_GRAVE_ACCENT = 0x60; /* ` */
    var CHAR_LEFT_CURLY_BRACKET = 0x7B; /* { */
    var CHAR_VERTICAL_LINE = 0x7C; /* | */
    var CHAR_RIGHT_CURLY_BRACKET = 0x7D; /* } */

    var ESCAPE_SEQUENCES = {};
    ESCAPE_SEQUENCES[0x00] = '\\0';
    ESCAPE_SEQUENCES[0x07] = '\\a';
    ESCAPE_SEQUENCES[0x08] = '\\b';
    ESCAPE_SEQUENCES[0x09] = '\\t';
    ESCAPE_SEQUENCES[0x0A] = '\\n';
    ESCAPE_SEQUENCES[0x0B] = '\\v';
    ESCAPE_SEQUENCES[0x0C] = '\\f';
    ESCAPE_SEQUENCES[0x0D] = '\\r';
    ESCAPE_SEQUENCES[0x1B] = '\\e';
    ESCAPE_SEQUENCES[0x22] = '\\"';
    ESCAPE_SEQUENCES[0x5C] = '\\\\';
    ESCAPE_SEQUENCES[0x85] = '\\N';
    ESCAPE_SEQUENCES[0xA0] = '\\_';
    ESCAPE_SEQUENCES[0x2028] = '\\L';
    ESCAPE_SEQUENCES[0x2029] = '\\P';
    var DEPRECATED_BOOLEANS_SYNTAX = ['y', 'Y', 'yes', 'Yes', 'YES', 'on', 'On', 'ON', 'n', 'N', 'no', 'No', 'NO', 'off', 'Off', 'OFF'];
    function compileStyleMap(schema, map) {
      var result, keys, index, length, tag, style, type;
      if (map === null) return {};
      result = {};
      keys = Object.keys(map);
      for (index = 0, length = keys.length; index < length; index += 1) {
        tag = keys[index];
        style = String(map[tag]);
        if (tag.slice(0, 2) === '!!') {
          tag = 'tag:yaml.org,2002:' + tag.slice(2);
        }
        type = schema.compiledTypeMap['fallback'][tag];
        if (type && _hasOwnProperty.call(type.styleAliases, style)) {
          style = type.styleAliases[style];
        }
        result[tag] = style;
      }
      return result;
    }
    function encodeHex(character) {
      var string, handle, length;
      string = character.toString(16).toUpperCase();
      if (character <= 0xFF) {
        handle = 'x';
        length = 2;
      } else if (character <= 0xFFFF) {
        handle = 'u';
        length = 4;
      } else if (character <= 0xFFFFFFFF) {
        handle = 'U';
        length = 8;
      } else {
        throw new exception('code point within a string may not be greater than 0xFFFFFFFF');
      }
      return '\\' + handle + common.repeat('0', length - string.length) + string;
    }
    function State(options) {
      this.schema = options['schema'] || default_full;
      this.indent = Math.max(1, options['indent'] || 2);
      this.noArrayIndent = options['noArrayIndent'] || false;
      this.skipInvalid = options['skipInvalid'] || false;
      this.flowLevel = common.isNothing(options['flowLevel']) ? -1 : options['flowLevel'];
      this.styleMap = compileStyleMap(this.schema, options['styles'] || null);
      this.sortKeys = options['sortKeys'] || false;
      this.lineWidth = options['lineWidth'] || 80;
      this.noRefs = options['noRefs'] || false;
      this.noCompatMode = options['noCompatMode'] || false;
      this.condenseFlow = options['condenseFlow'] || false;
      this.implicitTypes = this.schema.compiledImplicit;
      this.explicitTypes = this.schema.compiledExplicit;
      this.tag = null;
      this.result = '';
      this.duplicates = [];
      this.usedDuplicates = null;
    }

    // Indents every line in a string. Empty lines (\n only) are not indented.
    function indentString(string, spaces) {
      var ind = common.repeat(' ', spaces),
        position = 0,
        next = -1,
        result = '',
        line,
        length = string.length;
      while (position < length) {
        next = string.indexOf('\n', position);
        if (next === -1) {
          line = string.slice(position);
          position = length;
        } else {
          line = string.slice(position, next + 1);
          position = next + 1;
        }
        if (line.length && line !== '\n') result += ind;
        result += line;
      }
      return result;
    }
    function generateNextLine(state, level) {
      return '\n' + common.repeat(' ', state.indent * level);
    }
    function testImplicitResolving(state, str) {
      var index, length, type;
      for (index = 0, length = state.implicitTypes.length; index < length; index += 1) {
        type = state.implicitTypes[index];
        if (type.resolve(str)) {
          return true;
        }
      }
      return false;
    }

    // [33] s-white ::= s-space | s-tab
    function isWhitespace(c) {
      return c === CHAR_SPACE || c === CHAR_TAB;
    }

    // Returns true if the character can be printed without escaping.
    // From YAML 1.2: "any allowed characters known to be non-printable
    // should also be escaped. [However,] This isn’t mandatory"
    // Derived from nb-char - \t - #x85 - #xA0 - #x2028 - #x2029.
    function isPrintable(c) {
      return 0x00020 <= c && c <= 0x00007E || 0x000A1 <= c && c <= 0x00D7FF && c !== 0x2028 && c !== 0x2029 || 0x0E000 <= c && c <= 0x00FFFD && c !== 0xFEFF /* BOM */ || 0x10000 <= c && c <= 0x10FFFF;
    }

    // [34] ns-char ::= nb-char - s-white
    // [27] nb-char ::= c-printable - b-char - c-byte-order-mark
    // [26] b-char  ::= b-line-feed | b-carriage-return
    // [24] b-line-feed       ::=     #xA    /* LF */
    // [25] b-carriage-return ::=     #xD    /* CR */
    // [3]  c-byte-order-mark ::=     #xFEFF
    function isNsChar(c) {
      return isPrintable(c) && !isWhitespace(c)
      // byte-order-mark
      && c !== 0xFEFF
      // b-char
      && c !== CHAR_CARRIAGE_RETURN && c !== CHAR_LINE_FEED;
    }

    // Simplified test for values allowed after the first character in plain style.
    function isPlainSafe(c, prev) {
      // Uses a subset of nb-char - c-flow-indicator - ":" - "#"
      // where nb-char ::= c-printable - b-char - c-byte-order-mark.
      return isPrintable(c) && c !== 0xFEFF
      // - c-flow-indicator
      && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET
      // - ":" - "#"
      // /* An ns-char preceding */ "#"
      && c !== CHAR_COLON && (c !== CHAR_SHARP || prev && isNsChar(prev));
    }

    // Simplified test for values allowed as the first character in plain style.
    function isPlainSafeFirst(c) {
      // Uses a subset of ns-char - c-indicator
      // where ns-char = nb-char - s-white.
      return isPrintable(c) && c !== 0xFEFF && !isWhitespace(c) // - s-white
      // - (c-indicator ::=
      // “-” | “?” | “:” | “,” | “[” | “]” | “{” | “}”
      && c !== CHAR_MINUS && c !== CHAR_QUESTION && c !== CHAR_COLON && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET
      // | “#” | “&” | “*” | “!” | “|” | “=” | “>” | “'” | “"”
      && c !== CHAR_SHARP && c !== CHAR_AMPERSAND && c !== CHAR_ASTERISK && c !== CHAR_EXCLAMATION && c !== CHAR_VERTICAL_LINE && c !== CHAR_EQUALS && c !== CHAR_GREATER_THAN && c !== CHAR_SINGLE_QUOTE && c !== CHAR_DOUBLE_QUOTE
      // | “%” | “@” | “`”)
      && c !== CHAR_PERCENT && c !== CHAR_COMMERCIAL_AT && c !== CHAR_GRAVE_ACCENT;
    }

    // Determines whether block indentation indicator is required.
    function needIndentIndicator(string) {
      var leadingSpaceRe = /^\n* /;
      return leadingSpaceRe.test(string);
    }
    var STYLE_PLAIN = 1,
      STYLE_SINGLE = 2,
      STYLE_LITERAL = 3,
      STYLE_FOLDED = 4,
      STYLE_DOUBLE = 5;

    // Determines which scalar styles are possible and returns the preferred style.
    // lineWidth = -1 => no limit.
    // Pre-conditions: str.length > 0.
    // Post-conditions:
    //    STYLE_PLAIN or STYLE_SINGLE => no \n are in the string.
    //    STYLE_LITERAL => no lines are suitable for folding (or lineWidth is -1).
    //    STYLE_FOLDED => a line > lineWidth and can be folded (and lineWidth != -1).
    function chooseScalarStyle(string, singleLineOnly, indentPerLevel, lineWidth, testAmbiguousType) {
      var i;
      var char, prev_char;
      var hasLineBreak = false;
      var hasFoldableLine = false; // only checked if shouldTrackWidth
      var shouldTrackWidth = lineWidth !== -1;
      var previousLineBreak = -1; // count the first line correctly
      var plain = isPlainSafeFirst(string.charCodeAt(0)) && !isWhitespace(string.charCodeAt(string.length - 1));
      if (singleLineOnly) {
        // Case: no block styles.
        // Check for disallowed characters to rule out plain and single.
        for (i = 0; i < string.length; i++) {
          char = string.charCodeAt(i);
          if (!isPrintable(char)) {
            return STYLE_DOUBLE;
          }
          prev_char = i > 0 ? string.charCodeAt(i - 1) : null;
          plain = plain && isPlainSafe(char, prev_char);
        }
      } else {
        // Case: block styles permitted.
        for (i = 0; i < string.length; i++) {
          char = string.charCodeAt(i);
          if (char === CHAR_LINE_FEED) {
            hasLineBreak = true;
            // Check if any line can be folded.
            if (shouldTrackWidth) {
              hasFoldableLine = hasFoldableLine ||
              // Foldable line = too long, and not more-indented.
              i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== ' ';
              previousLineBreak = i;
            }
          } else if (!isPrintable(char)) {
            return STYLE_DOUBLE;
          }
          prev_char = i > 0 ? string.charCodeAt(i - 1) : null;
          plain = plain && isPlainSafe(char, prev_char);
        }
        // in case the end is missing a \n
        hasFoldableLine = hasFoldableLine || shouldTrackWidth && i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== ' ';
      }
      // Although every style can represent \n without escaping, prefer block styles
      // for multiline, since they're more readable and they don't add empty lines.
      // Also prefer folding a super-long line.
      if (!hasLineBreak && !hasFoldableLine) {
        // Strings interpretable as another type have to be quoted;
        // e.g. the string 'true' vs. the boolean true.
        return plain && !testAmbiguousType(string) ? STYLE_PLAIN : STYLE_SINGLE;
      }
      // Edge case: block indentation indicator can only have one digit.
      if (indentPerLevel > 9 && needIndentIndicator(string)) {
        return STYLE_DOUBLE;
      }
      // At this point we know block styles are valid.
      // Prefer literal style unless we want to fold.
      return hasFoldableLine ? STYLE_FOLDED : STYLE_LITERAL;
    }

    // Note: line breaking/folding is implemented for only the folded style.
    // NB. We drop the last trailing newline (if any) of a returned block scalar
    //  since the dumper adds its own newline. This always works:
    //    • No ending newline => unaffected; already using strip "-" chomping.
    //    • Ending newline    => removed then restored.
    //  Importantly, this keeps the "+" chomp indicator from gaining an extra line.
    function writeScalar(state, string, level, iskey) {
      state.dump = function () {
        if (string.length === 0) {
          return "''";
        }
        if (!state.noCompatMode && DEPRECATED_BOOLEANS_SYNTAX.indexOf(string) !== -1) {
          return "'" + string + "'";
        }
        var indent = state.indent * Math.max(1, level); // no 0-indent scalars
        // As indentation gets deeper, let the width decrease monotonically
        // to the lower bound min(state.lineWidth, 40).
        // Note that this implies
        //  state.lineWidth ≤ 40 + state.indent: width is fixed at the lower bound.
        //  state.lineWidth > 40 + state.indent: width decreases until the lower bound.
        // This behaves better than a constant minimum width which disallows narrower options,
        // or an indent threshold which causes the width to suddenly increase.
        var lineWidth = state.lineWidth === -1 ? -1 : Math.max(Math.min(state.lineWidth, 40), state.lineWidth - indent);

        // Without knowing if keys are implicit/explicit, assume implicit for safety.
        var singleLineOnly = iskey
        // No block styles in flow mode.
        || state.flowLevel > -1 && level >= state.flowLevel;
        function testAmbiguity(string) {
          return testImplicitResolving(state, string);
        }
        switch (chooseScalarStyle(string, singleLineOnly, state.indent, lineWidth, testAmbiguity)) {
          case STYLE_PLAIN:
            return string;
          case STYLE_SINGLE:
            return "'" + string.replace(/'/g, "''") + "'";
          case STYLE_LITERAL:
            return '|' + blockHeader(string, state.indent) + dropEndingNewline(indentString(string, indent));
          case STYLE_FOLDED:
            return '>' + blockHeader(string, state.indent) + dropEndingNewline(indentString(foldString(string, lineWidth), indent));
          case STYLE_DOUBLE:
            return '"' + escapeString(string) + '"';
          default:
            throw new exception('impossible error: invalid scalar style');
        }
      }();
    }

    // Pre-conditions: string is valid for a block scalar, 1 <= indentPerLevel <= 9.
    function blockHeader(string, indentPerLevel) {
      var indentIndicator = needIndentIndicator(string) ? String(indentPerLevel) : '';

      // note the special case: the string '\n' counts as a "trailing" empty line.
      var clip = string[string.length - 1] === '\n';
      var keep = clip && (string[string.length - 2] === '\n' || string === '\n');
      var chomp = keep ? '+' : clip ? '' : '-';
      return indentIndicator + chomp + '\n';
    }

    // (See the note for writeScalar.)
    function dropEndingNewline(string) {
      return string[string.length - 1] === '\n' ? string.slice(0, -1) : string;
    }

    // Note: a long line without a suitable break point will exceed the width limit.
    // Pre-conditions: every char in str isPrintable, str.length > 0, width > 0.
    function foldString(string, width) {
      // In folded style, $k$ consecutive newlines output as $k+1$ newlines—
      // unless they're before or after a more-indented line, or at the very
      // beginning or end, in which case $k$ maps to $k$.
      // Therefore, parse each chunk as newline(s) followed by a content line.
      var lineRe = /(\n+)([^\n]*)/g;

      // first line (possibly an empty line)
      var result = function () {
        var nextLF = string.indexOf('\n');
        nextLF = nextLF !== -1 ? nextLF : string.length;
        lineRe.lastIndex = nextLF;
        return foldLine(string.slice(0, nextLF), width);
      }();
      // If we haven't reached the first content line yet, don't add an extra \n.
      var prevMoreIndented = string[0] === '\n' || string[0] === ' ';
      var moreIndented;

      // rest of the lines
      var match;
      while (match = lineRe.exec(string)) {
        var prefix = match[1],
          line = match[2];
        moreIndented = line[0] === ' ';
        result += prefix + (!prevMoreIndented && !moreIndented && line !== '' ? '\n' : '') + foldLine(line, width);
        prevMoreIndented = moreIndented;
      }
      return result;
    }

    // Greedy line breaking.
    // Picks the longest line under the limit each time,
    // otherwise settles for the shortest line over the limit.
    // NB. More-indented lines *cannot* be folded, as that would add an extra \n.
    function foldLine(line, width) {
      if (line === '' || line[0] === ' ') return line;

      // Since a more-indented line adds a \n, breaks can't be followed by a space.
      var breakRe = / [^ ]/g; // note: the match index will always be <= length-2.
      var match;
      // start is an inclusive index. end, curr, and next are exclusive.
      var start = 0,
        end,
        curr = 0,
        next = 0;
      var result = '';

      // Invariants: 0 <= start <= length-1.
      //   0 <= curr <= next <= max(0, length-2). curr - start <= width.
      // Inside the loop:
      //   A match implies length >= 2, so curr and next are <= length-2.
      while (match = breakRe.exec(line)) {
        next = match.index;
        // maintain invariant: curr - start <= width
        if (next - start > width) {
          end = curr > start ? curr : next; // derive end <= length-2
          result += '\n' + line.slice(start, end);
          // skip the space that was output as \n
          start = end + 1; // derive start <= length-1
        }

        curr = next;
      }

      // By the invariants, start <= length-1, so there is something left over.
      // It is either the whole string or a part starting from non-whitespace.
      result += '\n';
      // Insert a break if the remainder is too long and there is a break available.
      if (line.length - start > width && curr > start) {
        result += line.slice(start, curr) + '\n' + line.slice(curr + 1);
      } else {
        result += line.slice(start);
      }
      return result.slice(1); // drop extra \n joiner
    }

    // Escapes a double-quoted string.
    function escapeString(string) {
      var result = '';
      var char, nextChar;
      var escapeSeq;
      for (var i = 0; i < string.length; i++) {
        char = string.charCodeAt(i);
        // Check for surrogate pairs (reference Unicode 3.0 section "3.7 Surrogates").
        if (char >= 0xD800 && char <= 0xDBFF /* high surrogate */) {
          nextChar = string.charCodeAt(i + 1);
          if (nextChar >= 0xDC00 && nextChar <= 0xDFFF /* low surrogate */) {
            // Combine the surrogate pair and store it escaped.
            result += encodeHex((char - 0xD800) * 0x400 + nextChar - 0xDC00 + 0x10000);
            // Advance index one extra since we already used that char here.
            i++;
            continue;
          }
        }
        escapeSeq = ESCAPE_SEQUENCES[char];
        result += !escapeSeq && isPrintable(char) ? string[i] : escapeSeq || encodeHex(char);
      }
      return result;
    }
    function writeFlowSequence(state, level, object) {
      var _result = '',
        _tag = state.tag,
        index,
        length;
      for (index = 0, length = object.length; index < length; index += 1) {
        // Write only valid elements.
        if (writeNode(state, level, object[index], false, false)) {
          if (index !== 0) _result += ',' + (!state.condenseFlow ? ' ' : '');
          _result += state.dump;
        }
      }
      state.tag = _tag;
      state.dump = '[' + _result + ']';
    }
    function writeBlockSequence(state, level, object, compact) {
      var _result = '',
        _tag = state.tag,
        index,
        length;
      for (index = 0, length = object.length; index < length; index += 1) {
        // Write only valid elements.
        if (writeNode(state, level + 1, object[index], true, true)) {
          if (!compact || index !== 0) {
            _result += generateNextLine(state, level);
          }
          if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
            _result += '-';
          } else {
            _result += '- ';
          }
          _result += state.dump;
        }
      }
      state.tag = _tag;
      state.dump = _result || '[]'; // Empty sequence if no valid values.
    }

    function writeFlowMapping(state, level, object) {
      var _result = '',
        _tag = state.tag,
        objectKeyList = Object.keys(object),
        index,
        length,
        objectKey,
        objectValue,
        pairBuffer;
      for (index = 0, length = objectKeyList.length; index < length; index += 1) {
        pairBuffer = '';
        if (index !== 0) pairBuffer += ', ';
        if (state.condenseFlow) pairBuffer += '"';
        objectKey = objectKeyList[index];
        objectValue = object[objectKey];
        if (!writeNode(state, level, objectKey, false, false)) {
          continue; // Skip this pair because of invalid key;
        }

        if (state.dump.length > 1024) pairBuffer += '? ';
        pairBuffer += state.dump + (state.condenseFlow ? '"' : '') + ':' + (state.condenseFlow ? '' : ' ');
        if (!writeNode(state, level, objectValue, false, false)) {
          continue; // Skip this pair because of invalid value.
        }

        pairBuffer += state.dump;

        // Both key and value are valid.
        _result += pairBuffer;
      }
      state.tag = _tag;
      state.dump = '{' + _result + '}';
    }
    function writeBlockMapping(state, level, object, compact) {
      var _result = '',
        _tag = state.tag,
        objectKeyList = Object.keys(object),
        index,
        length,
        objectKey,
        objectValue,
        explicitPair,
        pairBuffer;

      // Allow sorting keys so that the output file is deterministic
      if (state.sortKeys === true) {
        // Default sorting
        objectKeyList.sort();
      } else if (typeof state.sortKeys === 'function') {
        // Custom sort function
        objectKeyList.sort(state.sortKeys);
      } else if (state.sortKeys) {
        // Something is wrong
        throw new exception('sortKeys must be a boolean or a function');
      }
      for (index = 0, length = objectKeyList.length; index < length; index += 1) {
        pairBuffer = '';
        if (!compact || index !== 0) {
          pairBuffer += generateNextLine(state, level);
        }
        objectKey = objectKeyList[index];
        objectValue = object[objectKey];
        if (!writeNode(state, level + 1, objectKey, true, true, true)) {
          continue; // Skip this pair because of invalid key.
        }

        explicitPair = state.tag !== null && state.tag !== '?' || state.dump && state.dump.length > 1024;
        if (explicitPair) {
          if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
            pairBuffer += '?';
          } else {
            pairBuffer += '? ';
          }
        }
        pairBuffer += state.dump;
        if (explicitPair) {
          pairBuffer += generateNextLine(state, level);
        }
        if (!writeNode(state, level + 1, objectValue, true, explicitPair)) {
          continue; // Skip this pair because of invalid value.
        }

        if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
          pairBuffer += ':';
        } else {
          pairBuffer += ': ';
        }
        pairBuffer += state.dump;

        // Both key and value are valid.
        _result += pairBuffer;
      }
      state.tag = _tag;
      state.dump = _result || '{}'; // Empty mapping if no valid pairs.
    }

    function detectType(state, object, explicit) {
      var _result, typeList, index, length, type, style;
      typeList = explicit ? state.explicitTypes : state.implicitTypes;
      for (index = 0, length = typeList.length; index < length; index += 1) {
        type = typeList[index];
        if ((type.instanceOf || type.predicate) && (!type.instanceOf || typeof object === 'object' && object instanceof type.instanceOf) && (!type.predicate || type.predicate(object))) {
          state.tag = explicit ? type.tag : '?';
          if (type.represent) {
            style = state.styleMap[type.tag] || type.defaultStyle;
            if (_toString.call(type.represent) === '[object Function]') {
              _result = type.represent(object, style);
            } else if (_hasOwnProperty.call(type.represent, style)) {
              _result = type.represent[style](object, style);
            } else {
              throw new exception('!<' + type.tag + '> tag resolver accepts not "' + style + '" style');
            }
            state.dump = _result;
          }
          return true;
        }
      }
      return false;
    }

    // Serializes `object` and writes it to global `result`.
    // Returns true on success, or false on invalid object.
    //
    function writeNode(state, level, object, block, compact, iskey) {
      state.tag = null;
      state.dump = object;
      if (!detectType(state, object, false)) {
        detectType(state, object, true);
      }
      var type = _toString.call(state.dump);
      if (block) {
        block = state.flowLevel < 0 || state.flowLevel > level;
      }
      var objectOrArray = type === '[object Object]' || type === '[object Array]',
        duplicateIndex,
        duplicate;
      if (objectOrArray) {
        duplicateIndex = state.duplicates.indexOf(object);
        duplicate = duplicateIndex !== -1;
      }
      if (state.tag !== null && state.tag !== '?' || duplicate || state.indent !== 2 && level > 0) {
        compact = false;
      }
      if (duplicate && state.usedDuplicates[duplicateIndex]) {
        state.dump = '*ref_' + duplicateIndex;
      } else {
        if (objectOrArray && duplicate && !state.usedDuplicates[duplicateIndex]) {
          state.usedDuplicates[duplicateIndex] = true;
        }
        if (type === '[object Object]') {
          if (block && Object.keys(state.dump).length !== 0) {
            writeBlockMapping(state, level, state.dump, compact);
            if (duplicate) {
              state.dump = '&ref_' + duplicateIndex + state.dump;
            }
          } else {
            writeFlowMapping(state, level, state.dump);
            if (duplicate) {
              state.dump = '&ref_' + duplicateIndex + ' ' + state.dump;
            }
          }
        } else if (type === '[object Array]') {
          var arrayLevel = state.noArrayIndent && level > 0 ? level - 1 : level;
          if (block && state.dump.length !== 0) {
            writeBlockSequence(state, arrayLevel, state.dump, compact);
            if (duplicate) {
              state.dump = '&ref_' + duplicateIndex + state.dump;
            }
          } else {
            writeFlowSequence(state, arrayLevel, state.dump);
            if (duplicate) {
              state.dump = '&ref_' + duplicateIndex + ' ' + state.dump;
            }
          }
        } else if (type === '[object String]') {
          if (state.tag !== '?') {
            writeScalar(state, state.dump, level, iskey);
          }
        } else {
          if (state.skipInvalid) return false;
          throw new exception('unacceptable kind of an object to dump ' + type);
        }
        if (state.tag !== null && state.tag !== '?') {
          state.dump = '!<' + state.tag + '> ' + state.dump;
        }
      }
      return true;
    }
    function getDuplicateReferences(object, state) {
      var objects = [],
        duplicatesIndexes = [],
        index,
        length;
      inspectNode(object, objects, duplicatesIndexes);
      for (index = 0, length = duplicatesIndexes.length; index < length; index += 1) {
        state.duplicates.push(objects[duplicatesIndexes[index]]);
      }
      state.usedDuplicates = new Array(length);
    }
    function inspectNode(object, objects, duplicatesIndexes) {
      var objectKeyList, index, length;
      if (object !== null && typeof object === 'object') {
        index = objects.indexOf(object);
        if (index !== -1) {
          if (duplicatesIndexes.indexOf(index) === -1) {
            duplicatesIndexes.push(index);
          }
        } else {
          objects.push(object);
          if (Array.isArray(object)) {
            for (index = 0, length = object.length; index < length; index += 1) {
              inspectNode(object[index], objects, duplicatesIndexes);
            }
          } else {
            objectKeyList = Object.keys(object);
            for (index = 0, length = objectKeyList.length; index < length; index += 1) {
              inspectNode(object[objectKeyList[index]], objects, duplicatesIndexes);
            }
          }
        }
      }
    }
    function dump$1(input, options) {
      options = options || {};
      var state = new State(options);
      if (!state.noRefs) getDuplicateReferences(input, state);
      if (writeNode(state, 0, input, true, true)) return state.dump + '\n';
      return '';
    }
    function safeDump$1(input, options) {
      return dump$1(input, common.extend({
        schema: default_safe
      }, options));
    }
    var dump_1 = dump$1;
    var safeDump_1 = safeDump$1;
    var dumper = {
      dump: dump_1,
      safeDump: safeDump_1
    };

    function deprecated(name) {
      return function () {
        throw new Error('Function ' + name + ' is deprecated and cannot be used.');
      };
    }
    var Type = type;
    var Schema = schema;
    var FAILSAFE_SCHEMA = failsafe;
    var JSON_SCHEMA = json;
    var CORE_SCHEMA = core;
    var DEFAULT_SAFE_SCHEMA = default_safe;
    var DEFAULT_FULL_SCHEMA = default_full;
    var load = loader.load;
    var loadAll = loader.loadAll;
    var safeLoad = loader.safeLoad;
    var safeLoadAll = loader.safeLoadAll;
    var dump = dumper.dump;
    var safeDump = dumper.safeDump;
    var YAMLException = exception;

    // Deprecated schema names from JS-YAML 2.0.x
    var MINIMAL_SCHEMA = failsafe;
    var SAFE_SCHEMA = default_safe;
    var DEFAULT_SCHEMA = default_full;

    // Deprecated functions from JS-YAML 1.x.x
    var scan = deprecated('scan');
    var parse = deprecated('parse');
    var compose = deprecated('compose');
    var addConstructor = deprecated('addConstructor');
    var jsYaml$1 = {
      Type: Type,
      Schema: Schema,
      FAILSAFE_SCHEMA: FAILSAFE_SCHEMA,
      JSON_SCHEMA: JSON_SCHEMA,
      CORE_SCHEMA: CORE_SCHEMA,
      DEFAULT_SAFE_SCHEMA: DEFAULT_SAFE_SCHEMA,
      DEFAULT_FULL_SCHEMA: DEFAULT_FULL_SCHEMA,
      load: load,
      loadAll: loadAll,
      safeLoad: safeLoad,
      safeLoadAll: safeLoadAll,
      dump: dump,
      safeDump: safeDump,
      YAMLException: YAMLException,
      MINIMAL_SCHEMA: MINIMAL_SCHEMA,
      SAFE_SCHEMA: SAFE_SCHEMA,
      DEFAULT_SCHEMA: DEFAULT_SCHEMA,
      scan: scan,
      parse: parse,
      compose: compose,
      addConstructor: addConstructor
    };

    var jsYaml = jsYaml$1;

    function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
    function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

    /**
     * Redirect - object used to redirect some requests
     * e.g.
     * {
     *      title: 1x1-transparent.gif
     *      comment: http://probablyprogramming.com/2009/03/15/the-tiniest-gif-ever
     *      contentType: image/gif;base64
     *      content: R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
     * }
     *
     * @typedef {Object} Redirect
     * @property {string} title resource name
     * @property {string} comment resource description
     * @property {string} content encoded resource content
     * @property {string} contentType MIME type
     * @property {boolean} [isBlocking] e.g click2load redirect
     * @property {string} [sha] hash
     */

    class Redirects {
      /**
       * Converts rawYaml into JS object with sources titles used as keys
       *
       * @param {string} rawYaml
       * @returns {Object<Redirect>} - return object with titles in the keys and RedirectSources
       * in the values
       */
      constructor(rawYaml) {
        try {
          const arrOfRedirects = jsYaml.safeLoad(rawYaml);
          this.redirects = arrOfRedirects.reduce(function (acc, redirect) {
            return _objectSpread(_objectSpread({}, acc), {}, {
              [redirect.title]: redirect
            });
          }, {});
        } catch (e) {
          // eslint-disable-next-line no-console
          console.log("Was unable to load YAML into JS due to: ".concat(e.message));
          throw e;
        }
      }

      /**
       * Returns redirect source object
       *
       * @param {string} title
       * @returns {Redirect|undefined} Found redirect source object, or `undefined` if not found.
       */
      getRedirect(title) {
        var _this = this;
        if (Object.prototype.hasOwnProperty.call(this.redirects, title)) {
          return this.redirects[title];
        }

        // look title among aliases
        const values = Object.keys(this.redirects).map(function (key) {
          return _this.redirects[key];
        });
        return values.find(function (redirect) {
          const aliases = redirect.aliases;
          if (!aliases) {
            return false;
          }
          return aliases.includes(title);
        });
      }

      /**
       * Checks if redirect is blocking like click2load.html
       *
       * @param {string} title Title of the redirect.
       * @returns {boolean} True if redirect is blocking otherwise returns `false` even if redirect name is
       * unknown.
       */
      isBlocking(title) {
        const redirect = this.redirects[title];
        if (redirect) {
          return !!redirect.isBlocking;
        }
        return false;
      }
    }

    const redirectsMap = {
      "1x1-transparent.gif": "1x1-transparent.gif",
      "1x1.gif": "1x1-transparent.gif",
      "1x1-transparent-gif": "1x1-transparent.gif",
      "2x2-transparent.png": "2x2-transparent.png",
      "2x2.png": "2x2-transparent.png",
      "2x2-transparent-png": "2x2-transparent.png",
      "3x2-transparent.png": "3x2-transparent.png",
      "3x2.png": "3x2-transparent.png",
      "3x2-transparent-png": "3x2-transparent.png",
      "32x32-transparent.png": "32x32-transparent.png",
      "32x32.png": "32x32-transparent.png",
      "32x32-transparent-png": "32x32-transparent.png",
      noopframe: "noopframe.html",
      "noop.html": "noopframe.html",
      "blank-html": "noopframe.html",
      noopcss: "noopcss.css",
      "noop.css": "noopcss.css",
      "blank-css": "noopcss.css",
      noopjs: "noopjs.js",
      "noop.js": "noopjs.js",
      "blank-js": "noopjs.js",
      noopjson: "noopjson.json",
      nooptext: "nooptext.js",
      "noop.txt": "nooptext.js",
      "blank-text": "nooptext.js",
      empty: "nooptext.js",
      "noopvmap-1.0": "noopvmap01.xml",
      "noop-vmap1.0.xml": "noopvmap01.xml",
      "noopvast-2.0": "noopvast02.xml",
      "noopvast-3.0": "noopvast03.xml",
      "noopvast-4.0": "noopvast04.xml",
      "noopmp3-0.1s": "noopmp3.mp3",
      "blank-mp3": "noopmp3.mp3",
      "noopmp4-1s": "noopmp4.mp4",
      "noop-1s.mp4": "noopmp4.mp4",
      "blank-mp4": "noopmp4.mp4",
      "click2load.html": "click2load.html",
      "ubo-click2load.html": "click2load.html",
      "amazon-apstag": "amazon-apstag.js",
      "ubo-amazon_apstag.js": "amazon-apstag.js",
      "amazon_apstag.js": "amazon-apstag.js",
      "ati-smarttag": "ati-smarttag.js",
      "didomi-loader": "didomi-loader.js",
      fingerprintjs2: "fingerprintjs2.js",
      "ubo-fingerprint2.js": "fingerprintjs2.js",
      "fingerprint2.js": "fingerprintjs2.js",
      fingerprintjs3: "fingerprintjs3.js",
      "ubo-fingerprint3.js": "fingerprintjs3.js",
      "fingerprint3.js": "fingerprintjs3.js",
      gemius: "gemius.js",
      "google-analytics-ga": "google-analytics-ga.js",
      "ubo-google-analytics_ga.js": "google-analytics-ga.js",
      "google-analytics_ga.js": "google-analytics-ga.js",
      "google-analytics": "google-analytics.js",
      "ubo-google-analytics_analytics.js": "google-analytics.js",
      "google-analytics_analytics.js": "google-analytics.js",
      "googletagmanager-gtm": "google-analytics.js",
      "ubo-googletagmanager_gtm.js": "google-analytics.js",
      "googletagmanager_gtm.js": "google-analytics.js",
      "google-ima3": "google-ima3.js",
      "ubo-google-ima.js": "google-ima3.js",
      "google-ima.js": "google-ima3.js",
      "googlesyndication-adsbygoogle": "googlesyndication-adsbygoogle.js",
      "ubo-googlesyndication_adsbygoogle.js": "googlesyndication-adsbygoogle.js",
      "googlesyndication_adsbygoogle.js": "googlesyndication-adsbygoogle.js",
      "googletagservices-gpt": "googletagservices-gpt.js",
      "ubo-googletagservices_gpt.js": "googletagservices-gpt.js",
      "googletagservices_gpt.js": "googletagservices-gpt.js",
      matomo: "matomo.js",
      "metrika-yandex-tag": "metrika-yandex-tag.js",
      "metrika-yandex-watch": "metrika-yandex-watch.js",
      "naver-wcslog": "naver-wcslog.js",
      noeval: "noeval.js",
      "noeval.js": "noeval.js",
      "silent-noeval.js": "noeval.js",
      "ubo-noeval.js": "noeval.js",
      "ubo-silent-noeval.js": "noeval.js",
      "ubo-noeval": "noeval.js",
      "ubo-silent-noeval": "noeval.js",
      "pardot-1.0": "pardot-1.0.js",
      "prebid-ads": "prebid-ads.js",
      "ubo-prebid-ads.js": "prebid-ads.js",
      "prebid-ads.js": "prebid-ads.js",
      prebid: "prebid.js",
      "prevent-bab": "prevent-bab.js",
      "nobab.js": "prevent-bab.js",
      "ubo-nobab.js": "prevent-bab.js",
      "bab-defuser.js": "prevent-bab.js",
      "ubo-bab-defuser.js": "prevent-bab.js",
      "ubo-nobab": "prevent-bab.js",
      "ubo-bab-defuser": "prevent-bab.js",
      "prevent-bab2": "prevent-bab2.js",
      "nobab2.js": "prevent-bab2.js",
      "prevent-fab-3.2.0": "prevent-fab-3.2.0.js",
      "nofab.js": "prevent-fab-3.2.0.js",
      "ubo-nofab.js": "prevent-fab-3.2.0.js",
      "fuckadblock.js-3.2.0": "prevent-fab-3.2.0.js",
      "ubo-fuckadblock.js-3.2.0": "prevent-fab-3.2.0.js",
      "ubo-nofab": "prevent-fab-3.2.0.js",
      "prevent-popads-net": "prevent-popads-net.js",
      "popads.net.js": "prevent-popads-net.js",
      "ubo-popads.net.js": "prevent-popads-net.js",
      "ubo-popads.net": "prevent-popads-net.js",
      "scorecardresearch-beacon": "scorecardresearch-beacon.js",
      "ubo-scorecardresearch_beacon.js": "scorecardresearch-beacon.js",
      "scorecardresearch_beacon.js": "scorecardresearch-beacon.js",
      "set-popads-dummy": "set-popads-dummy.js",
      "popads-dummy.js": "set-popads-dummy.js",
      "ubo-popads-dummy.js": "set-popads-dummy.js",
      "ubo-popads-dummy": "set-popads-dummy.js"
    };

    /**
     * Finds redirect resource by it's name
     *
     * @param {string} name - redirect name
     * @returns {Function}
     */
    const getRedirectByName = function getRedirectByName(name) {
      const redirects = Object.keys(redirectsList).map(function (key) {
        return redirectsList[key];
      });
      return redirects.find(function (r) {
        return r.names && r.names.includes(name);
      });
    };

    /**
     * @typedef {Object} Source - redirect properties
     * @property {string} name redirect name
     * @property {Array<string>} args Arguments for redirect function
     * @property {'extension'|'test'} [engine] -
     * Defines the final form of redirect string presentation
     * @property {boolean} [verbose] flag to enable printing to console debug information
     */

    /**
     * Returns redirect code by param
     *
     * @param {Source} source
     * @returns {string} redirect code
     */
    const getRedirectCode = function getRedirectCode(source) {
      const redirect = getRedirectByName(source.name);
      let result = attachDependencies(redirect);
      result = addCall(redirect, result);

      // redirect code for different sources is checked in tests
      // so it should be just a code without any source and props passed
      result = source.engine === 'test' ? wrapInNonameFunc(result) : passSourceAndProps(source, result, true);
      return result;
    };
    const getRedirectFilename = function getRedirectFilename(name) {
      return redirectsMap[name];
    };
    const redirects = {
      Redirects,
      getRedirectFilename,
      getCode: getRedirectCode,
      isAdgRedirectRule: validator.isAdgRedirectRule,
      isValidAdgRedirectRule: validator.isValidAdgRedirectRule,
      isAdgRedirectCompatibleWithUbo: validator.isAdgRedirectCompatibleWithUbo,
      isUboRedirectCompatibleWithAdg: validator.isUboRedirectCompatibleWithAdg,
      isAbpRedirectCompatibleWithAdg: validator.isAbpRedirectCompatibleWithAdg,
      convertUboRedirectToAdg,
      convertAbpRedirectToAdg,
      convertRedirectToAdg,
      convertAdgRedirectToUbo
    };

    function abortCurrentInlineScript(source, args) {
      function abortCurrentInlineScript(source, property, search) {
        const searchRegexp = toRegExp(search);
        const rid = randomId();
        const SRC_DATA_MARKER = "data:text/javascript;base64,";
        const getCurrentScript = function getCurrentScript() {
          if ("currentScript" in document) {
            return document.currentScript;
          }
          const scripts = document.getElementsByTagName("script");
          return scripts[scripts.length - 1];
        };
        const ourScript = getCurrentScript();
        const abort = function abort() {
          var _scriptEl$src;
          const scriptEl = getCurrentScript();
          if (!scriptEl) {
            return;
          }
          let content = scriptEl.textContent;
          try {
            const textContentGetter = Object.getOwnPropertyDescriptor(Node.prototype, "textContent").get;
            content = textContentGetter.call(scriptEl);
          } catch (e) {}
          if (content.length === 0 && typeof scriptEl.src !== "undefined" && (_scriptEl$src = scriptEl.src) !== null && _scriptEl$src !== void 0 && _scriptEl$src.startsWith(SRC_DATA_MARKER)) {
            const encodedContent = scriptEl.src.slice(SRC_DATA_MARKER.length);
            content = window.atob(encodedContent);
          }
          if (scriptEl instanceof HTMLScriptElement && content.length > 0 && scriptEl !== ourScript && searchRegexp.test(content)) {
            hit(source);
            throw new ReferenceError(rid);
          }
        };
        const setChainPropAccess = function setChainPropAccess(owner, property) {
          const chainInfo = getPropertyInChain(owner, property);
          let base = chainInfo.base;
          const prop = chainInfo.prop,
            chain = chainInfo.chain;
          if (base instanceof Object === false && base === null) {
            const props = property.split(".");
            const propIndex = props.indexOf(prop);
            const baseName = props[propIndex - 1];
            const message = "The scriptlet had been executed before the ".concat(baseName, " was loaded.");
            logMessage(source, message);
            return;
          }
          if (chain) {
            const setter = function setter(a) {
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
          let currentValue = base[prop];
          let origDescriptor = Object.getOwnPropertyDescriptor(base, prop);
          if (origDescriptor instanceof Object === false || origDescriptor.get instanceof Function === false) {
            currentValue = base[prop];
            origDescriptor = undefined;
          }
          const descriptorWrapper = Object.assign(getDescriptorAddon(), {
            currentValue: currentValue,
            get() {
              if (!this.isAbortingSuspended) {
                this.isolateCallback(abort);
              }
              if (origDescriptor instanceof Object) {
                return origDescriptor.get.call(base);
              }
              return this.currentValue;
            },
            set(newValue) {
              if (!this.isAbortingSuspended) {
                this.isolateCallback(abort);
              }
              if (origDescriptor instanceof Object) {
                origDescriptor.set.call(base, newValue);
              } else {
                this.currentValue = newValue;
              }
            }
          });
          setPropertyAccess(base, prop, {
            get() {
              return descriptorWrapper.get.call(descriptorWrapper);
            },
            set(newValue) {
              descriptorWrapper.set.call(descriptorWrapper, newValue);
            }
          });
        };
        setChainPropAccess(window, property);
        window.onerror = createOnErrorHandler(rid).bind();
      }
      function randomId() {
        return Math.random().toString(36).slice(2, 9);
      }
      function setPropertyAccess(object, property, descriptor) {
        const currentDescriptor = Object.getOwnPropertyDescriptor(object, property);
        if (currentDescriptor && !currentDescriptor.configurable) {
          return false;
        }
        Object.defineProperty(object, property, descriptor);
        return true;
      }
      function getPropertyInChain(base, chain) {
        const pos = chain.indexOf(".");
        if (pos === -1) {
          return {
            base: base,
            prop: chain
          };
        }
        const prop = chain.slice(0, pos);
        if (base === null) {
          return {
            base: base,
            prop: prop,
            chain: chain
          };
        }
        const nextBase = base[prop];
        chain = chain.slice(pos + 1);
        if ((base instanceof Object || typeof base === "object") && isEmptyObject(base)) {
          return {
            base: base,
            prop: prop,
            chain: chain
          };
        }
        if (nextBase === null) {
          return {
            base: base,
            prop: prop,
            chain: chain
          };
        }
        if (nextBase !== undefined) {
          return getPropertyInChain(nextBase, chain);
        }
        Object.defineProperty(base, prop, {
          configurable: true
        });
        return {
          base: base,
          prop: prop,
          chain: chain
        };
      }
      function toRegExp() {
        let input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
        const DEFAULT_VALUE = ".?";
        const FORWARD_SLASH = "/";
        if (input === "") {
          return new RegExp(DEFAULT_VALUE);
        }
        if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
          return new RegExp(input.slice(1, -1));
        }
        const escaped = input.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(escaped);
      }
      function createOnErrorHandler(rid) {
        const nativeOnError = window.onerror;
        return function onError(error) {
          if (typeof error === "string" && error.includes(rid)) {
            return true;
          }
          if (nativeOnError instanceof Function) {
            for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
              args[_key - 1] = arguments[_key];
            }
            return nativeOnError.apply(this, [error, ...args]);
          }
          return false;
        };
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function logMessage(source, message) {
        let forced = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        let convertMessageToString = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        const name = source.name,
          verbose = source.verbose;
        if (!forced && !verbose) {
          return;
        }
        const nativeConsole = console.log;
        if (!convertMessageToString) {
          nativeConsole("".concat(name, ":"), message);
          return;
        }
        nativeConsole("".concat(name, ": ").concat(message));
      }
      function isEmptyObject(obj) {
        return Object.keys(obj).length === 0 && !obj.prototype;
      }
      function getDescriptorAddon() {
        return {
          isAbortingSuspended: false,
          isolateCallback(cb) {
            this.isAbortingSuspended = true;
            try {
              for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                args[_key - 1] = arguments[_key];
              }
              const result = cb(...args);
              this.isAbortingSuspended = false;
              return result;
            } catch (_unused) {
              const rid = randomId();
              this.isAbortingSuspended = false;
              throw new ReferenceError(rid);
            }
          }
        };
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        abortCurrentInlineScript.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function abortOnPropertyRead(source, args) {
      function abortOnPropertyRead(source, property) {
        if (!property) {
          return;
        }
        const rid = randomId();
        const abort = function abort() {
          hit(source);
          throw new ReferenceError(rid);
        };
        const setChainPropAccess = function setChainPropAccess(owner, property) {
          const chainInfo = getPropertyInChain(owner, property);
          let base = chainInfo.base;
          const prop = chainInfo.prop,
            chain = chainInfo.chain;
          if (chain) {
            const setter = function setter(a) {
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
      function randomId() {
        return Math.random().toString(36).slice(2, 9);
      }
      function setPropertyAccess(object, property, descriptor) {
        const currentDescriptor = Object.getOwnPropertyDescriptor(object, property);
        if (currentDescriptor && !currentDescriptor.configurable) {
          return false;
        }
        Object.defineProperty(object, property, descriptor);
        return true;
      }
      function getPropertyInChain(base, chain) {
        const pos = chain.indexOf(".");
        if (pos === -1) {
          return {
            base: base,
            prop: chain
          };
        }
        const prop = chain.slice(0, pos);
        if (base === null) {
          return {
            base: base,
            prop: prop,
            chain: chain
          };
        }
        const nextBase = base[prop];
        chain = chain.slice(pos + 1);
        if ((base instanceof Object || typeof base === "object") && isEmptyObject(base)) {
          return {
            base: base,
            prop: prop,
            chain: chain
          };
        }
        if (nextBase === null) {
          return {
            base: base,
            prop: prop,
            chain: chain
          };
        }
        if (nextBase !== undefined) {
          return getPropertyInChain(nextBase, chain);
        }
        Object.defineProperty(base, prop, {
          configurable: true
        });
        return {
          base: base,
          prop: prop,
          chain: chain
        };
      }
      function createOnErrorHandler(rid) {
        const nativeOnError = window.onerror;
        return function onError(error) {
          if (typeof error === "string" && error.includes(rid)) {
            return true;
          }
          if (nativeOnError instanceof Function) {
            for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
              args[_key - 1] = arguments[_key];
            }
            return nativeOnError.apply(this, [error, ...args]);
          }
          return false;
        };
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function isEmptyObject(obj) {
        return Object.keys(obj).length === 0 && !obj.prototype;
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        abortOnPropertyRead.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function abortOnPropertyWrite(source, args) {
      function abortOnPropertyWrite(source, property) {
        if (!property) {
          return;
        }
        const rid = randomId();
        const abort = function abort() {
          hit(source);
          throw new ReferenceError(rid);
        };
        const setChainPropAccess = function setChainPropAccess(owner, property) {
          const chainInfo = getPropertyInChain(owner, property);
          let base = chainInfo.base;
          const prop = chainInfo.prop,
            chain = chainInfo.chain;
          if (chain) {
            const setter = function setter(a) {
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
      function randomId() {
        return Math.random().toString(36).slice(2, 9);
      }
      function setPropertyAccess(object, property, descriptor) {
        const currentDescriptor = Object.getOwnPropertyDescriptor(object, property);
        if (currentDescriptor && !currentDescriptor.configurable) {
          return false;
        }
        Object.defineProperty(object, property, descriptor);
        return true;
      }
      function getPropertyInChain(base, chain) {
        const pos = chain.indexOf(".");
        if (pos === -1) {
          return {
            base: base,
            prop: chain
          };
        }
        const prop = chain.slice(0, pos);
        if (base === null) {
          return {
            base: base,
            prop: prop,
            chain: chain
          };
        }
        const nextBase = base[prop];
        chain = chain.slice(pos + 1);
        if ((base instanceof Object || typeof base === "object") && isEmptyObject(base)) {
          return {
            base: base,
            prop: prop,
            chain: chain
          };
        }
        if (nextBase === null) {
          return {
            base: base,
            prop: prop,
            chain: chain
          };
        }
        if (nextBase !== undefined) {
          return getPropertyInChain(nextBase, chain);
        }
        Object.defineProperty(base, prop, {
          configurable: true
        });
        return {
          base: base,
          prop: prop,
          chain: chain
        };
      }
      function createOnErrorHandler(rid) {
        const nativeOnError = window.onerror;
        return function onError(error) {
          if (typeof error === "string" && error.includes(rid)) {
            return true;
          }
          if (nativeOnError instanceof Function) {
            for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
              args[_key - 1] = arguments[_key];
            }
            return nativeOnError.apply(this, [error, ...args]);
          }
          return false;
        };
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function isEmptyObject(obj) {
        return Object.keys(obj).length === 0 && !obj.prototype;
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        abortOnPropertyWrite.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function abortOnStackTrace(source, args) {
      function abortOnStackTrace(source, property, stack) {
        if (!property || !stack) {
          return;
        }
        const rid = randomId();
        const abort = function abort() {
          hit(source);
          throw new ReferenceError(rid);
        };
        const setChainPropAccess = function setChainPropAccess(owner, property) {
          const chainInfo = getPropertyInChain(owner, property);
          let base = chainInfo.base;
          const prop = chainInfo.prop,
            chain = chainInfo.chain;
          if (chain) {
            const setter = function setter(a) {
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
          if (!stack.match(/^(inlineScript|injectedScript)$/) && !isValidStrPattern(stack)) {
            logMessage(source, "Invalid parameter: ".concat(stack));
            return;
          }
          const descriptorWrapper = Object.assign(getDescriptorAddon(), {
            value: base[prop],
            get() {
              if (!this.isAbortingSuspended && this.isolateCallback(matchStackTrace, stack, new Error().stack)) {
                abort();
              }
              return this.value;
            },
            set(newValue) {
              if (!this.isAbortingSuspended && this.isolateCallback(matchStackTrace, stack, new Error().stack)) {
                abort();
              }
              this.value = newValue;
            }
          });
          setPropertyAccess(base, prop, {
            get() {
              return descriptorWrapper.get.call(descriptorWrapper);
            },
            set(newValue) {
              descriptorWrapper.set.call(descriptorWrapper, newValue);
            }
          });
        };
        setChainPropAccess(window, property);
        window.onerror = createOnErrorHandler(rid).bind();
      }
      function randomId() {
        return Math.random().toString(36).slice(2, 9);
      }
      function setPropertyAccess(object, property, descriptor) {
        const currentDescriptor = Object.getOwnPropertyDescriptor(object, property);
        if (currentDescriptor && !currentDescriptor.configurable) {
          return false;
        }
        Object.defineProperty(object, property, descriptor);
        return true;
      }
      function getPropertyInChain(base, chain) {
        const pos = chain.indexOf(".");
        if (pos === -1) {
          return {
            base: base,
            prop: chain
          };
        }
        const prop = chain.slice(0, pos);
        if (base === null) {
          return {
            base: base,
            prop: prop,
            chain: chain
          };
        }
        const nextBase = base[prop];
        chain = chain.slice(pos + 1);
        if ((base instanceof Object || typeof base === "object") && isEmptyObject(base)) {
          return {
            base: base,
            prop: prop,
            chain: chain
          };
        }
        if (nextBase === null) {
          return {
            base: base,
            prop: prop,
            chain: chain
          };
        }
        if (nextBase !== undefined) {
          return getPropertyInChain(nextBase, chain);
        }
        Object.defineProperty(base, prop, {
          configurable: true
        });
        return {
          base: base,
          prop: prop,
          chain: chain
        };
      }
      function createOnErrorHandler(rid) {
        const nativeOnError = window.onerror;
        return function onError(error) {
          if (typeof error === "string" && error.includes(rid)) {
            return true;
          }
          if (nativeOnError instanceof Function) {
            for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
              args[_key - 1] = arguments[_key];
            }
            return nativeOnError.apply(this, [error, ...args]);
          }
          return false;
        };
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function isValidStrPattern(input) {
        const FORWARD_SLASH = "/";
        let str = escapeRegExp(input);
        if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
          str = input.slice(1, -1);
        }
        let isValid;
        try {
          isValid = new RegExp(str);
          isValid = true;
        } catch (e) {
          isValid = false;
        }
        return isValid;
      }
      function escapeRegExp(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }
      function matchStackTrace(stackMatch, stackTrace) {
        if (!stackMatch || stackMatch === "") {
          return true;
        }
        if (shouldAbortInlineOrInjectedScript(stackMatch, stackTrace)) {
          return true;
        }
        const stackRegexp = toRegExp(stackMatch);
        const refinedStackTrace = stackTrace.split("\n").slice(2).map(function (line) {
          return line.trim();
        }).join("\n");
        return getNativeRegexpTest().call(stackRegexp, refinedStackTrace);
      }
      function getDescriptorAddon() {
        return {
          isAbortingSuspended: false,
          isolateCallback(cb) {
            this.isAbortingSuspended = true;
            try {
              for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                args[_key - 1] = arguments[_key];
              }
              const result = cb(...args);
              this.isAbortingSuspended = false;
              return result;
            } catch (_unused) {
              const rid = randomId();
              this.isAbortingSuspended = false;
              throw new ReferenceError(rid);
            }
          }
        };
      }
      function logMessage(source, message) {
        let forced = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        let convertMessageToString = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        const name = source.name,
          verbose = source.verbose;
        if (!forced && !verbose) {
          return;
        }
        const nativeConsole = console.log;
        if (!convertMessageToString) {
          nativeConsole("".concat(name, ":"), message);
          return;
        }
        nativeConsole("".concat(name, ": ").concat(message));
      }
      function toRegExp() {
        let input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
        const DEFAULT_VALUE = ".?";
        const FORWARD_SLASH = "/";
        if (input === "") {
          return new RegExp(DEFAULT_VALUE);
        }
        if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
          return new RegExp(input.slice(1, -1));
        }
        const escaped = input.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(escaped);
      }
      function isEmptyObject(obj) {
        return Object.keys(obj).length === 0 && !obj.prototype;
      }
      function getNativeRegexpTest() {
        return Object.getOwnPropertyDescriptor(RegExp.prototype, "test").value;
      }
      function shouldAbortInlineOrInjectedScript(stackMatch, stackTrace) {
        const INLINE_SCRIPT_STRING = "inlineScript";
        const INJECTED_SCRIPT_STRING = "injectedScript";
        const INJECTED_SCRIPT_MARKER = "<anonymous>";
        const isInlineScript = function isInlineScript(stackMatch) {
          return stackMatch.includes(INLINE_SCRIPT_STRING);
        };
        const isInjectedScript = function isInjectedScript(stackMatch) {
          return stackMatch.includes(INJECTED_SCRIPT_STRING);
        };
        if (!(isInlineScript(stackMatch) || isInjectedScript(stackMatch))) {
          return false;
        }
        let documentURL = window.location.href;
        const pos = documentURL.indexOf("#");
        if (pos !== -1) {
          documentURL = documentURL.slice(0, pos);
        }
        const stackSteps = stackTrace.split("\n").slice(2).map(function (line) {
          return line.trim();
        });
        const stackLines = stackSteps.map(function (line) {
          let stack;
          const getStackTraceURL = /(.*?@)?(\S+)(:\d+):\d+\)?$/.exec(line);
          if (getStackTraceURL) {
            var _stackURL, _stackURL2;
            let stackURL = getStackTraceURL[2];
            if ((_stackURL = stackURL) !== null && _stackURL !== void 0 && _stackURL.startsWith("(")) {
              stackURL = stackURL.slice(1);
            }
            if ((_stackURL2 = stackURL) !== null && _stackURL2 !== void 0 && _stackURL2.startsWith(INJECTED_SCRIPT_MARKER)) {
              var _stackFunction;
              stackURL = INJECTED_SCRIPT_STRING;
              let stackFunction = getStackTraceURL[1] !== undefined ? getStackTraceURL[1].slice(0, -1) : line.slice(0, getStackTraceURL.index).trim();
              if ((_stackFunction = stackFunction) !== null && _stackFunction !== void 0 && _stackFunction.startsWith("at")) {
                stackFunction = stackFunction.slice(2).trim();
              }
              stack = "".concat(stackFunction, " ").concat(stackURL).trim();
            } else {
              stack = stackURL;
            }
          } else {
            stack = line;
          }
          return stack;
        });
        if (stackLines) {
          for (let index = 0; index < stackLines.length; index += 1) {
            if (isInlineScript(stackMatch) && documentURL === stackLines[index]) {
              return true;
            }
            if (isInjectedScript(stackMatch) && stackLines[index].startsWith(INJECTED_SCRIPT_STRING)) {
              return true;
            }
          }
        }
        return false;
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        abortOnStackTrace.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function adjustSetInterval(source, args) {
      function adjustSetInterval(source, matchCallback, matchDelay, boost) {
        const nativeSetInterval = window.setInterval;
        const matchRegexp = toRegExp(matchCallback);
        const intervalWrapper = function intervalWrapper(callback, delay) {
          if (!isValidCallback(callback)) {
            const message = "Scriptlet can't be applied because of invalid callback: '".concat(String(callback), "'");
            logMessage(source, message);
          } else if (matchRegexp.test(callback.toString()) && isDelayMatched(matchDelay, delay)) {
            delay *= getBoostMultiplier(boost);
            hit(source);
          }
          for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
            args[_key - 2] = arguments[_key];
          }
          return nativeSetInterval.apply(window, [callback, delay, ...args]);
        };
        window.setInterval = intervalWrapper;
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function isValidCallback(callback) {
        return callback instanceof Function || typeof callback === "string";
      }
      function toRegExp() {
        let input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
        const DEFAULT_VALUE = ".?";
        const FORWARD_SLASH = "/";
        if (input === "") {
          return new RegExp(DEFAULT_VALUE);
        }
        if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
          return new RegExp(input.slice(1, -1));
        }
        const escaped = input.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(escaped);
      }
      function getBoostMultiplier(boost) {
        const DEFAULT_MULTIPLIER = .05;
        const MIN_MULTIPLIER = .001;
        const MAX_MULTIPLIER = 50;
        const parsedBoost = parseFloat(boost);
        let boostMultiplier = nativeIsNaN(parsedBoost) || !nativeIsFinite(parsedBoost) ? DEFAULT_MULTIPLIER : parsedBoost;
        if (boostMultiplier < MIN_MULTIPLIER) {
          boostMultiplier = MIN_MULTIPLIER;
        }
        if (boostMultiplier > MAX_MULTIPLIER) {
          boostMultiplier = MAX_MULTIPLIER;
        }
        return boostMultiplier;
      }
      function isDelayMatched(inputDelay, realDelay) {
        return shouldMatchAnyDelay(inputDelay) || realDelay === getMatchDelay(inputDelay);
      }
      function logMessage(source, message) {
        let forced = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        let convertMessageToString = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        const name = source.name,
          verbose = source.verbose;
        if (!forced && !verbose) {
          return;
        }
        const nativeConsole = console.log;
        if (!convertMessageToString) {
          nativeConsole("".concat(name, ":"), message);
          return;
        }
        nativeConsole("".concat(name, ": ").concat(message));
      }
      function nativeIsNaN(num) {
        const native = Number.isNaN || window.isNaN;
        return native(num);
      }
      function nativeIsFinite(num) {
        const native = Number.isFinite || window.isFinite;
        return native(num);
      }
      function getMatchDelay(delay) {
        const DEFAULT_DELAY = 1e3;
        const parsedDelay = parseInt(delay, 10);
        const delayMatch = nativeIsNaN(parsedDelay) ? DEFAULT_DELAY : parsedDelay;
        return delayMatch;
      }
      function shouldMatchAnyDelay(delay) {
        return delay === "*";
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        adjustSetInterval.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function adjustSetTimeout(source, args) {
      function adjustSetTimeout(source, matchCallback, matchDelay, boost) {
        const nativeSetTimeout = window.setTimeout;
        const matchRegexp = toRegExp(matchCallback);
        const timeoutWrapper = function timeoutWrapper(callback, delay) {
          if (!isValidCallback(callback)) {
            const message = "Scriptlet can't be applied because of invalid callback: '".concat(String(callback), "'");
            logMessage(source, message);
          } else if (matchRegexp.test(callback.toString()) && isDelayMatched(matchDelay, delay)) {
            delay *= getBoostMultiplier(boost);
            hit(source);
          }
          for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
            args[_key - 2] = arguments[_key];
          }
          return nativeSetTimeout.apply(window, [callback, delay, ...args]);
        };
        window.setTimeout = timeoutWrapper;
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function isValidCallback(callback) {
        return callback instanceof Function || typeof callback === "string";
      }
      function toRegExp() {
        let input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
        const DEFAULT_VALUE = ".?";
        const FORWARD_SLASH = "/";
        if (input === "") {
          return new RegExp(DEFAULT_VALUE);
        }
        if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
          return new RegExp(input.slice(1, -1));
        }
        const escaped = input.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(escaped);
      }
      function getBoostMultiplier(boost) {
        const DEFAULT_MULTIPLIER = .05;
        const MIN_MULTIPLIER = .001;
        const MAX_MULTIPLIER = 50;
        const parsedBoost = parseFloat(boost);
        let boostMultiplier = nativeIsNaN(parsedBoost) || !nativeIsFinite(parsedBoost) ? DEFAULT_MULTIPLIER : parsedBoost;
        if (boostMultiplier < MIN_MULTIPLIER) {
          boostMultiplier = MIN_MULTIPLIER;
        }
        if (boostMultiplier > MAX_MULTIPLIER) {
          boostMultiplier = MAX_MULTIPLIER;
        }
        return boostMultiplier;
      }
      function isDelayMatched(inputDelay, realDelay) {
        return shouldMatchAnyDelay(inputDelay) || realDelay === getMatchDelay(inputDelay);
      }
      function logMessage(source, message) {
        let forced = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        let convertMessageToString = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        const name = source.name,
          verbose = source.verbose;
        if (!forced && !verbose) {
          return;
        }
        const nativeConsole = console.log;
        if (!convertMessageToString) {
          nativeConsole("".concat(name, ":"), message);
          return;
        }
        nativeConsole("".concat(name, ": ").concat(message));
      }
      function nativeIsNaN(num) {
        const native = Number.isNaN || window.isNaN;
        return native(num);
      }
      function nativeIsFinite(num) {
        const native = Number.isFinite || window.isFinite;
        return native(num);
      }
      function getMatchDelay(delay) {
        const DEFAULT_DELAY = 1e3;
        const parsedDelay = parseInt(delay, 10);
        const delayMatch = nativeIsNaN(parsedDelay) ? DEFAULT_DELAY : parsedDelay;
        return delayMatch;
      }
      function shouldMatchAnyDelay(delay) {
        return delay === "*";
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        adjustSetTimeout.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function debugCurrentInlineScript(source, args) {
      function debugCurrentInlineScript(source, property, search) {
        const searchRegexp = toRegExp(search);
        const rid = randomId();
        const getCurrentScript = function getCurrentScript() {
          if ("currentScript" in document) {
            return document.currentScript;
          }
          const scripts = document.getElementsByTagName("script");
          return scripts[scripts.length - 1];
        };
        const ourScript = getCurrentScript();
        const abort = function abort() {
          const scriptEl = getCurrentScript();
          if (!scriptEl) {
            return;
          }
          let content = scriptEl.textContent;
          try {
            const textContentGetter = Object.getOwnPropertyDescriptor(Node.prototype, "textContent").get;
            content = textContentGetter.call(scriptEl);
          } catch (e) {}
          if (scriptEl instanceof HTMLScriptElement && content.length > 0 && scriptEl !== ourScript && searchRegexp.test(content)) {
            hit(source);
            debugger;
          }
        };
        const setChainPropAccess = function setChainPropAccess(owner, property) {
          const chainInfo = getPropertyInChain(owner, property);
          let base = chainInfo.base;
          const prop = chainInfo.prop,
            chain = chainInfo.chain;
          if (base instanceof Object === false && base === null) {
            const props = property.split(".");
            const propIndex = props.indexOf(prop);
            const baseName = props[propIndex - 1];
            const message = "The scriptlet had been executed before the ".concat(baseName, " was loaded.");
            logMessage(message, source.verbose);
            return;
          }
          if (chain) {
            const setter = function setter(a) {
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
          let currentValue = base[prop];
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
      function randomId() {
        return Math.random().toString(36).slice(2, 9);
      }
      function setPropertyAccess(object, property, descriptor) {
        const currentDescriptor = Object.getOwnPropertyDescriptor(object, property);
        if (currentDescriptor && !currentDescriptor.configurable) {
          return false;
        }
        Object.defineProperty(object, property, descriptor);
        return true;
      }
      function getPropertyInChain(base, chain) {
        const pos = chain.indexOf(".");
        if (pos === -1) {
          return {
            base: base,
            prop: chain
          };
        }
        const prop = chain.slice(0, pos);
        if (base === null) {
          return {
            base: base,
            prop: prop,
            chain: chain
          };
        }
        const nextBase = base[prop];
        chain = chain.slice(pos + 1);
        if ((base instanceof Object || typeof base === "object") && isEmptyObject(base)) {
          return {
            base: base,
            prop: prop,
            chain: chain
          };
        }
        if (nextBase === null) {
          return {
            base: base,
            prop: prop,
            chain: chain
          };
        }
        if (nextBase !== undefined) {
          return getPropertyInChain(nextBase, chain);
        }
        Object.defineProperty(base, prop, {
          configurable: true
        });
        return {
          base: base,
          prop: prop,
          chain: chain
        };
      }
      function toRegExp() {
        let input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
        const DEFAULT_VALUE = ".?";
        const FORWARD_SLASH = "/";
        if (input === "") {
          return new RegExp(DEFAULT_VALUE);
        }
        if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
          return new RegExp(input.slice(1, -1));
        }
        const escaped = input.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(escaped);
      }
      function createOnErrorHandler(rid) {
        const nativeOnError = window.onerror;
        return function onError(error) {
          if (typeof error === "string" && error.includes(rid)) {
            return true;
          }
          if (nativeOnError instanceof Function) {
            for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
              args[_key - 1] = arguments[_key];
            }
            return nativeOnError.apply(this, [error, ...args]);
          }
          return false;
        };
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function logMessage(source, message) {
        let forced = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        let convertMessageToString = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        const name = source.name,
          verbose = source.verbose;
        if (!forced && !verbose) {
          return;
        }
        const nativeConsole = console.log;
        if (!convertMessageToString) {
          nativeConsole("".concat(name, ":"), message);
          return;
        }
        nativeConsole("".concat(name, ": ").concat(message));
      }
      function isEmptyObject(obj) {
        return Object.keys(obj).length === 0 && !obj.prototype;
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        debugCurrentInlineScript.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function debugOnPropertyRead(source, args) {
      function debugOnPropertyRead(source, property) {
        if (!property) {
          return;
        }
        const rid = randomId();
        const abort = function abort() {
          hit(source);
          debugger;
        };
        const setChainPropAccess = function setChainPropAccess(owner, property) {
          const chainInfo = getPropertyInChain(owner, property);
          let base = chainInfo.base;
          const prop = chainInfo.prop,
            chain = chainInfo.chain;
          if (chain) {
            const setter = function setter(a) {
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
            set: noopFunc
          });
        };
        setChainPropAccess(window, property);
        window.onerror = createOnErrorHandler(rid).bind();
      }
      function randomId() {
        return Math.random().toString(36).slice(2, 9);
      }
      function setPropertyAccess(object, property, descriptor) {
        const currentDescriptor = Object.getOwnPropertyDescriptor(object, property);
        if (currentDescriptor && !currentDescriptor.configurable) {
          return false;
        }
        Object.defineProperty(object, property, descriptor);
        return true;
      }
      function getPropertyInChain(base, chain) {
        const pos = chain.indexOf(".");
        if (pos === -1) {
          return {
            base: base,
            prop: chain
          };
        }
        const prop = chain.slice(0, pos);
        if (base === null) {
          return {
            base: base,
            prop: prop,
            chain: chain
          };
        }
        const nextBase = base[prop];
        chain = chain.slice(pos + 1);
        if ((base instanceof Object || typeof base === "object") && isEmptyObject(base)) {
          return {
            base: base,
            prop: prop,
            chain: chain
          };
        }
        if (nextBase === null) {
          return {
            base: base,
            prop: prop,
            chain: chain
          };
        }
        if (nextBase !== undefined) {
          return getPropertyInChain(nextBase, chain);
        }
        Object.defineProperty(base, prop, {
          configurable: true
        });
        return {
          base: base,
          prop: prop,
          chain: chain
        };
      }
      function createOnErrorHandler(rid) {
        const nativeOnError = window.onerror;
        return function onError(error) {
          if (typeof error === "string" && error.includes(rid)) {
            return true;
          }
          if (nativeOnError instanceof Function) {
            for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
              args[_key - 1] = arguments[_key];
            }
            return nativeOnError.apply(this, [error, ...args]);
          }
          return false;
        };
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function noopFunc() {}
      function isEmptyObject(obj) {
        return Object.keys(obj).length === 0 && !obj.prototype;
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        debugOnPropertyRead.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function debugOnPropertyWrite(source, args) {
      function debugOnPropertyWrite(source, property) {
        if (!property) {
          return;
        }
        const rid = randomId();
        const abort = function abort() {
          hit(source);
          debugger;
        };
        const setChainPropAccess = function setChainPropAccess(owner, property) {
          const chainInfo = getPropertyInChain(owner, property);
          let base = chainInfo.base;
          const prop = chainInfo.prop,
            chain = chainInfo.chain;
          if (chain) {
            const setter = function setter(a) {
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
      function randomId() {
        return Math.random().toString(36).slice(2, 9);
      }
      function setPropertyAccess(object, property, descriptor) {
        const currentDescriptor = Object.getOwnPropertyDescriptor(object, property);
        if (currentDescriptor && !currentDescriptor.configurable) {
          return false;
        }
        Object.defineProperty(object, property, descriptor);
        return true;
      }
      function getPropertyInChain(base, chain) {
        const pos = chain.indexOf(".");
        if (pos === -1) {
          return {
            base: base,
            prop: chain
          };
        }
        const prop = chain.slice(0, pos);
        if (base === null) {
          return {
            base: base,
            prop: prop,
            chain: chain
          };
        }
        const nextBase = base[prop];
        chain = chain.slice(pos + 1);
        if ((base instanceof Object || typeof base === "object") && isEmptyObject(base)) {
          return {
            base: base,
            prop: prop,
            chain: chain
          };
        }
        if (nextBase === null) {
          return {
            base: base,
            prop: prop,
            chain: chain
          };
        }
        if (nextBase !== undefined) {
          return getPropertyInChain(nextBase, chain);
        }
        Object.defineProperty(base, prop, {
          configurable: true
        });
        return {
          base: base,
          prop: prop,
          chain: chain
        };
      }
      function createOnErrorHandler(rid) {
        const nativeOnError = window.onerror;
        return function onError(error) {
          if (typeof error === "string" && error.includes(rid)) {
            return true;
          }
          if (nativeOnError instanceof Function) {
            for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
              args[_key - 1] = arguments[_key];
            }
            return nativeOnError.apply(this, [error, ...args]);
          }
          return false;
        };
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function isEmptyObject(obj) {
        return Object.keys(obj).length === 0 && !obj.prototype;
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        debugOnPropertyWrite.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function dirString(source, args) {
      function dirString(source, times) {
        const _console = console,
          dir = _console.dir;
        function dirWrapper(object) {
          if (typeof dir === "function") {
            dir.call(this, object);
          }
          hit(source);
        }
        console.dir = dirWrapper;
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        dirString.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function disableNewtabLinks(source, args) {
      function disableNewtabLinks(source) {
        document.addEventListener("click", function (ev) {
          let target = ev.target;
          while (target !== null) {
            if (target.localName === "a" && target.hasAttribute("target")) {
              ev.stopPropagation();
              ev.preventDefault();
              hit(source);
              break;
            }
            target = target.parentNode;
          }
        });
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        disableNewtabLinks.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function evalDataPrune(source, args) {
      function evalDataPrune(source, propsToRemove, requiredInitialProps, stack) {
        if (!!stack && !matchStackTrace(stack, new Error().stack)) {
          return;
        }
        const prunePaths = propsToRemove !== undefined && propsToRemove !== "" ? propsToRemove.split(/ +/) : [];
        const requiredPaths = requiredInitialProps !== undefined && requiredInitialProps !== "" ? requiredInitialProps.split(/ +/) : [];
        const evalWrapper = function evalWrapper(target, thisArg, args) {
          let data = Reflect.apply(target, thisArg, args);
          if (typeof data === "object") {
            data = jsonPruner(source, data, prunePaths, requiredPaths);
          }
          return data;
        };
        const evalHandler = {
          apply: evalWrapper
        };
        window.eval = new Proxy(window.eval, evalHandler);
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function matchStackTrace(stackMatch, stackTrace) {
        if (!stackMatch || stackMatch === "") {
          return true;
        }
        if (shouldAbortInlineOrInjectedScript(stackMatch, stackTrace)) {
          return true;
        }
        const stackRegexp = toRegExp(stackMatch);
        const refinedStackTrace = stackTrace.split("\n").slice(2).map(function (line) {
          return line.trim();
        }).join("\n");
        return getNativeRegexpTest().call(stackRegexp, refinedStackTrace);
      }
      function getWildcardPropertyInChain(base, chain) {
        let lookThrough = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        let output = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [];
        const pos = chain.indexOf(".");
        if (pos === -1) {
          if (chain === "*" || chain === "[]") {
            for (const key in base) {
              if (Object.prototype.hasOwnProperty.call(base, key)) {
                output.push({
                  base: base,
                  prop: key
                });
              }
            }
          } else {
            output.push({
              base: base,
              prop: chain
            });
          }
          return output;
        }
        const prop = chain.slice(0, pos);
        const shouldLookThrough = prop === "[]" && Array.isArray(base) || prop === "*" && base instanceof Object;
        if (shouldLookThrough) {
          const nextProp = chain.slice(pos + 1);
          const baseKeys = Object.keys(base);
          baseKeys.forEach(function (key) {
            const item = base[key];
            getWildcardPropertyInChain(item, nextProp, lookThrough, output);
          });
        }
        const nextBase = base[prop];
        chain = chain.slice(pos + 1);
        if (nextBase !== undefined) {
          getWildcardPropertyInChain(nextBase, chain, lookThrough, output);
        }
        return output;
      }
      function logMessage(source, message) {
        let forced = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        let convertMessageToString = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        const name = source.name,
          verbose = source.verbose;
        if (!forced && !verbose) {
          return;
        }
        const nativeConsole = console.log;
        if (!convertMessageToString) {
          nativeConsole("".concat(name, ":"), message);
          return;
        }
        nativeConsole("".concat(name, ": ").concat(message));
      }
      function toRegExp() {
        let input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
        const DEFAULT_VALUE = ".?";
        const FORWARD_SLASH = "/";
        if (input === "") {
          return new RegExp(DEFAULT_VALUE);
        }
        if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
          return new RegExp(input.slice(1, -1));
        }
        const escaped = input.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(escaped);
      }
      function isPruningNeeded(source, root, prunePaths, requiredPaths) {
        if (!root) {
          return false;
        }
        let shouldProcess;
        if (prunePaths.length === 0 && requiredPaths.length > 0) {
          const rootString = JSON.stringify(root);
          const matchRegex = toRegExp(requiredPaths.join(""));
          const shouldLog = matchRegex.test(rootString);
          if (shouldLog) {
            logMessage(source, "".concat(window.location.hostname, "\n").concat(JSON.stringify(root, null, 2)), true);
            if (root && typeof root === "object") {
              logMessage(source, root, true, false);
            }
            shouldProcess = false;
            return shouldProcess;
          }
        }
        const wildcardSymbols = [".*.", "*.", ".*", ".[].", "[].", ".[]"];
        for (let i = 0; i < requiredPaths.length; i += 1) {
          const requiredPath = requiredPaths[i];
          const lastNestedPropName = requiredPath.split(".").pop();
          const hasWildcard = wildcardSymbols.some(function (symbol) {
            return requiredPath.includes(symbol);
          });
          const details = getWildcardPropertyInChain(root, requiredPath, hasWildcard);
          shouldProcess = !hasWildcard;
          for (let i = 0; i < details.length; i += 1) {
            if (hasWildcard) {
              shouldProcess = !(details[i].base[lastNestedPropName] === undefined) || shouldProcess;
            } else {
              shouldProcess = !(details[i].base[lastNestedPropName] === undefined) && shouldProcess;
            }
          }
        }
        return shouldProcess;
      }
      function jsonPruner(source, root, prunePaths, requiredPaths) {
        if (prunePaths.length === 0 && requiredPaths.length === 0) {
          logMessage(source, "".concat(window.location.hostname, "\n").concat(JSON.stringify(root, null, 2)), true);
          if (root && typeof root === "object") {
            logMessage(source, root, true, false);
          }
          return root;
        }
        try {
          if (isPruningNeeded(source, root, prunePaths, requiredPaths) === false) {
            return root;
          }
          prunePaths.forEach(function (path) {
            const ownerObjArr = getWildcardPropertyInChain(root, path, true);
            ownerObjArr.forEach(function (ownerObj) {
              if (ownerObj !== undefined && ownerObj.base) {
                delete ownerObj.base[ownerObj.prop];
                hit(source);
              }
            });
          });
        } catch (e) {
          logMessage(source, e);
        }
        return root;
      }
      function getNativeRegexpTest() {
        return Object.getOwnPropertyDescriptor(RegExp.prototype, "test").value;
      }
      function shouldAbortInlineOrInjectedScript(stackMatch, stackTrace) {
        const INLINE_SCRIPT_STRING = "inlineScript";
        const INJECTED_SCRIPT_STRING = "injectedScript";
        const INJECTED_SCRIPT_MARKER = "<anonymous>";
        const isInlineScript = function isInlineScript(stackMatch) {
          return stackMatch.includes(INLINE_SCRIPT_STRING);
        };
        const isInjectedScript = function isInjectedScript(stackMatch) {
          return stackMatch.includes(INJECTED_SCRIPT_STRING);
        };
        if (!(isInlineScript(stackMatch) || isInjectedScript(stackMatch))) {
          return false;
        }
        let documentURL = window.location.href;
        const pos = documentURL.indexOf("#");
        if (pos !== -1) {
          documentURL = documentURL.slice(0, pos);
        }
        const stackSteps = stackTrace.split("\n").slice(2).map(function (line) {
          return line.trim();
        });
        const stackLines = stackSteps.map(function (line) {
          let stack;
          const getStackTraceURL = /(.*?@)?(\S+)(:\d+):\d+\)?$/.exec(line);
          if (getStackTraceURL) {
            var _stackURL, _stackURL2;
            let stackURL = getStackTraceURL[2];
            if ((_stackURL = stackURL) !== null && _stackURL !== void 0 && _stackURL.startsWith("(")) {
              stackURL = stackURL.slice(1);
            }
            if ((_stackURL2 = stackURL) !== null && _stackURL2 !== void 0 && _stackURL2.startsWith(INJECTED_SCRIPT_MARKER)) {
              var _stackFunction;
              stackURL = INJECTED_SCRIPT_STRING;
              let stackFunction = getStackTraceURL[1] !== undefined ? getStackTraceURL[1].slice(0, -1) : line.slice(0, getStackTraceURL.index).trim();
              if ((_stackFunction = stackFunction) !== null && _stackFunction !== void 0 && _stackFunction.startsWith("at")) {
                stackFunction = stackFunction.slice(2).trim();
              }
              stack = "".concat(stackFunction, " ").concat(stackURL).trim();
            } else {
              stack = stackURL;
            }
          } else {
            stack = line;
          }
          return stack;
        });
        if (stackLines) {
          for (let index = 0; index < stackLines.length; index += 1) {
            if (isInlineScript(stackMatch) && documentURL === stackLines[index]) {
              return true;
            }
            if (isInjectedScript(stackMatch) && stackLines[index].startsWith(INJECTED_SCRIPT_STRING)) {
              return true;
            }
          }
        }
        return false;
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        evalDataPrune.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function forceWindowClose(source, args) {
      function forceWindowClose(source) {
        let path = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "";
        if (typeof window.close !== "function") {
          const message = "window.close() is not a function so 'close-window' scriptlet is unavailable";
          logMessage(source, message);
          return;
        }
        const closeImmediately = function closeImmediately() {
          try {
            hit(source);
            window.close();
          } catch (e) {
            logMessage(source, e);
          }
        };
        const closeByExtension = function closeByExtension() {
          const extCall = function extCall() {
            dispatchEvent(new Event("adguard:scriptlet-close-window"));
          };
          window.addEventListener("adguard:subscribed-to-close-window", extCall, {
            once: true
          });
          setTimeout(function () {
            window.removeEventListener("adguard:subscribed-to-close-window", extCall, {
              once: true
            });
          }, 5e3);
        };
        const shouldClose = function shouldClose() {
          if (path === "") {
            return true;
          }
          const pathRegexp = toRegExp(path);
          const currentPath = "".concat(window.location.pathname).concat(window.location.search);
          return pathRegexp.test(currentPath);
        };
        if (shouldClose()) {
          closeImmediately();
          if (navigator.userAgent.includes("Chrome")) {
            closeByExtension();
          }
        }
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function toRegExp() {
        let input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
        const DEFAULT_VALUE = ".?";
        const FORWARD_SLASH = "/";
        if (input === "") {
          return new RegExp(DEFAULT_VALUE);
        }
        if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
          return new RegExp(input.slice(1, -1));
        }
        const escaped = input.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(escaped);
      }
      function logMessage(source, message) {
        let forced = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        let convertMessageToString = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        const name = source.name,
          verbose = source.verbose;
        if (!forced && !verbose) {
          return;
        }
        const nativeConsole = console.log;
        if (!convertMessageToString) {
          nativeConsole("".concat(name, ":"), message);
          return;
        }
        nativeConsole("".concat(name, ": ").concat(message));
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        forceWindowClose.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function hideInShadowDom(source, args) {
      function hideInShadowDom(source, selector, baseSelector) {
        if (!Element.prototype.attachShadow) {
          return;
        }
        const hideElement = function hideElement(targetElement) {
          const DISPLAY_NONE_CSS = "display:none!important;";
          targetElement.style.cssText = DISPLAY_NONE_CSS;
        };
        const hideHandler = function hideHandler() {
          let hostElements = !baseSelector ? findHostElements(document.documentElement) : document.querySelectorAll(baseSelector);
          while (hostElements.length !== 0) {
            let isHidden = false;
            const _pierceShadowDom = pierceShadowDom(selector, hostElements),
              targets = _pierceShadowDom.targets,
              innerHosts = _pierceShadowDom.innerHosts;
            targets.forEach(function (targetEl) {
              hideElement(targetEl);
              isHidden = true;
            });
            if (isHidden) {
              hit(source);
            }
            hostElements = innerHosts;
          }
        };
        hideHandler();
        observeDOMChanges(hideHandler, true);
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function observeDOMChanges(callback) {
        let observeAttrs = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
        let attrsToObserve = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
        const THROTTLE_DELAY_MS = 20;
        const observer = new MutationObserver(throttle(callbackWrapper, THROTTLE_DELAY_MS));
        const connect = function connect() {
          if (attrsToObserve.length > 0) {
            observer.observe(document.documentElement, {
              childList: true,
              subtree: true,
              attributes: observeAttrs,
              attributeFilter: attrsToObserve
            });
          } else {
            observer.observe(document.documentElement, {
              childList: true,
              subtree: true,
              attributes: observeAttrs
            });
          }
        };
        const disconnect = function disconnect() {
          observer.disconnect();
        };
        function callbackWrapper() {
          disconnect();
          callback();
          connect();
        }
        connect();
      }
      function findHostElements(rootElement) {
        const hosts = [];
        const domElems = rootElement.querySelectorAll("*");
        domElems.forEach(function (el) {
          if (el.shadowRoot) {
            hosts.push(el);
          }
        });
        return hosts;
      }
      function pierceShadowDom(selector, hostElements) {
        let targets = [];
        const innerHostsAcc = [];
        hostElements.forEach(function (host) {
          const simpleElems = host.querySelectorAll(selector);
          targets = targets.concat([].slice.call(simpleElems));
          const shadowRootElem = host.shadowRoot;
          const shadowChildren = shadowRootElem.querySelectorAll(selector);
          targets = targets.concat([].slice.call(shadowChildren));
          innerHostsAcc.push(findHostElements(shadowRootElem));
        });
        const innerHosts = flatten(innerHostsAcc);
        return {
          targets: targets,
          innerHosts: innerHosts
        };
      }
      function flatten(input) {
        const stack = [];
        input.forEach(function (el) {
          return stack.push(el);
        });
        const res = [];
        while (stack.length) {
          const next = stack.pop();
          if (Array.isArray(next)) {
            next.forEach(function (el) {
              return stack.push(el);
            });
          } else {
            res.push(next);
          }
        }
        return res.reverse();
      }
      function throttle(cb, delay) {
        let wait = false;
        let savedArgs;
        const wrapper = function wrapper() {
          for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }
          if (wait) {
            savedArgs = args;
            return;
          }
          cb(...args);
          wait = true;
          setTimeout(function () {
            wait = false;
            if (savedArgs) {
              wrapper(...savedArgs);
              savedArgs = null;
            }
          }, delay);
        };
        return wrapper;
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        hideInShadowDom.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function injectCssInShadowDom(source, args) {
      function injectCssInShadowDom(source, cssRule) {
        let hostSelector = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "";
        if (!Element.prototype.attachShadow || typeof Proxy === "undefined" || typeof Reflect === "undefined") {
          return;
        }
        if (cssRule.match(/(url|image-set)\(.*\)/i)) {
          logMessage(source, '"url()" function is not allowed for css rules');
          return;
        }
        const callback = function callback(shadowRoot) {
          try {
            const stylesheet = new CSSStyleSheet();
            try {
              stylesheet.insertRule(cssRule);
            } catch (e) {
              logMessage(source, "Unable to apply the rule '".concat(cssRule, "' due to: \n'").concat(e.message, "'"));
              return;
            }
            shadowRoot.adoptedStyleSheets = [...shadowRoot.adoptedStyleSheets, stylesheet];
          } catch (_unused) {
            const styleTag = document.createElement("style");
            styleTag.innerText = cssRule;
            shadowRoot.appendChild(styleTag);
          }
          hit(source);
        };
        hijackAttachShadow(window, hostSelector, callback);
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function logMessage(source, message) {
        let forced = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        let convertMessageToString = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        const name = source.name,
          verbose = source.verbose;
        if (!forced && !verbose) {
          return;
        }
        const nativeConsole = console.log;
        if (!convertMessageToString) {
          nativeConsole("".concat(name, ":"), message);
          return;
        }
        nativeConsole("".concat(name, ": ").concat(message));
      }
      function hijackAttachShadow(context, hostSelector, callback) {
        const handlerWrapper = function handlerWrapper(target, thisArg, args) {
          const shadowRoot = Reflect.apply(target, thisArg, args);
          if (thisArg && thisArg.matches(hostSelector || "*")) {
            callback(shadowRoot);
          }
          return shadowRoot;
        };
        const attachShadowHandler = {
          apply: handlerWrapper
        };
        context.Element.prototype.attachShadow = new Proxy(context.Element.prototype.attachShadow, attachShadowHandler);
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        injectCssInShadowDom.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function jsonPrune(source, args) {
      function jsonPrune(source, propsToRemove, requiredInitialProps, stack) {
        if (!!stack && !matchStackTrace(stack, new Error().stack)) {
          return;
        }
        const prunePaths = propsToRemove !== undefined && propsToRemove !== "" ? propsToRemove.split(/ +/) : [];
        const requiredPaths = requiredInitialProps !== undefined && requiredInitialProps !== "" ? requiredInitialProps.split(/ +/) : [];
        const nativeJSONParse = JSON.parse;
        const jsonParseWrapper = function jsonParseWrapper() {
          for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }
          const root = nativeJSONParse.apply(JSON, args);
          return jsonPruner(source, root, prunePaths, requiredPaths);
        };
        jsonParseWrapper.toString = nativeJSONParse.toString.bind(nativeJSONParse);
        JSON.parse = jsonParseWrapper;
        const nativeResponseJson = Response.prototype.json;
        const responseJsonWrapper = function responseJsonWrapper() {
          const promise = nativeResponseJson.apply(this);
          return promise.then(function (obj) {
            return jsonPruner(source, obj, prunePaths, requiredPaths);
          });
        };
        if (typeof Response === "undefined") {
          return;
        }
        Response.prototype.json = responseJsonWrapper;
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function matchStackTrace(stackMatch, stackTrace) {
        if (!stackMatch || stackMatch === "") {
          return true;
        }
        if (shouldAbortInlineOrInjectedScript(stackMatch, stackTrace)) {
          return true;
        }
        const stackRegexp = toRegExp(stackMatch);
        const refinedStackTrace = stackTrace.split("\n").slice(2).map(function (line) {
          return line.trim();
        }).join("\n");
        return getNativeRegexpTest().call(stackRegexp, refinedStackTrace);
      }
      function getWildcardPropertyInChain(base, chain) {
        let lookThrough = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        let output = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [];
        const pos = chain.indexOf(".");
        if (pos === -1) {
          if (chain === "*" || chain === "[]") {
            for (const key in base) {
              if (Object.prototype.hasOwnProperty.call(base, key)) {
                output.push({
                  base: base,
                  prop: key
                });
              }
            }
          } else {
            output.push({
              base: base,
              prop: chain
            });
          }
          return output;
        }
        const prop = chain.slice(0, pos);
        const shouldLookThrough = prop === "[]" && Array.isArray(base) || prop === "*" && base instanceof Object;
        if (shouldLookThrough) {
          const nextProp = chain.slice(pos + 1);
          const baseKeys = Object.keys(base);
          baseKeys.forEach(function (key) {
            const item = base[key];
            getWildcardPropertyInChain(item, nextProp, lookThrough, output);
          });
        }
        const nextBase = base[prop];
        chain = chain.slice(pos + 1);
        if (nextBase !== undefined) {
          getWildcardPropertyInChain(nextBase, chain, lookThrough, output);
        }
        return output;
      }
      function logMessage(source, message) {
        let forced = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        let convertMessageToString = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        const name = source.name,
          verbose = source.verbose;
        if (!forced && !verbose) {
          return;
        }
        const nativeConsole = console.log;
        if (!convertMessageToString) {
          nativeConsole("".concat(name, ":"), message);
          return;
        }
        nativeConsole("".concat(name, ": ").concat(message));
      }
      function isPruningNeeded(source, root, prunePaths, requiredPaths) {
        if (!root) {
          return false;
        }
        let shouldProcess;
        if (prunePaths.length === 0 && requiredPaths.length > 0) {
          const rootString = JSON.stringify(root);
          const matchRegex = toRegExp(requiredPaths.join(""));
          const shouldLog = matchRegex.test(rootString);
          if (shouldLog) {
            logMessage(source, "".concat(window.location.hostname, "\n").concat(JSON.stringify(root, null, 2)), true);
            if (root && typeof root === "object") {
              logMessage(source, root, true, false);
            }
            shouldProcess = false;
            return shouldProcess;
          }
        }
        const wildcardSymbols = [".*.", "*.", ".*", ".[].", "[].", ".[]"];
        for (let i = 0; i < requiredPaths.length; i += 1) {
          const requiredPath = requiredPaths[i];
          const lastNestedPropName = requiredPath.split(".").pop();
          const hasWildcard = wildcardSymbols.some(function (symbol) {
            return requiredPath.includes(symbol);
          });
          const details = getWildcardPropertyInChain(root, requiredPath, hasWildcard);
          shouldProcess = !hasWildcard;
          for (let i = 0; i < details.length; i += 1) {
            if (hasWildcard) {
              shouldProcess = !(details[i].base[lastNestedPropName] === undefined) || shouldProcess;
            } else {
              shouldProcess = !(details[i].base[lastNestedPropName] === undefined) && shouldProcess;
            }
          }
        }
        return shouldProcess;
      }
      function jsonPruner(source, root, prunePaths, requiredPaths) {
        if (prunePaths.length === 0 && requiredPaths.length === 0) {
          logMessage(source, "".concat(window.location.hostname, "\n").concat(JSON.stringify(root, null, 2)), true);
          if (root && typeof root === "object") {
            logMessage(source, root, true, false);
          }
          return root;
        }
        try {
          if (isPruningNeeded(source, root, prunePaths, requiredPaths) === false) {
            return root;
          }
          prunePaths.forEach(function (path) {
            const ownerObjArr = getWildcardPropertyInChain(root, path, true);
            ownerObjArr.forEach(function (ownerObj) {
              if (ownerObj !== undefined && ownerObj.base) {
                delete ownerObj.base[ownerObj.prop];
                hit(source);
              }
            });
          });
        } catch (e) {
          logMessage(source, e);
        }
        return root;
      }
      function toRegExp() {
        let input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
        const DEFAULT_VALUE = ".?";
        const FORWARD_SLASH = "/";
        if (input === "") {
          return new RegExp(DEFAULT_VALUE);
        }
        if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
          return new RegExp(input.slice(1, -1));
        }
        const escaped = input.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(escaped);
      }
      function getNativeRegexpTest() {
        return Object.getOwnPropertyDescriptor(RegExp.prototype, "test").value;
      }
      function shouldAbortInlineOrInjectedScript(stackMatch, stackTrace) {
        const INLINE_SCRIPT_STRING = "inlineScript";
        const INJECTED_SCRIPT_STRING = "injectedScript";
        const INJECTED_SCRIPT_MARKER = "<anonymous>";
        const isInlineScript = function isInlineScript(stackMatch) {
          return stackMatch.includes(INLINE_SCRIPT_STRING);
        };
        const isInjectedScript = function isInjectedScript(stackMatch) {
          return stackMatch.includes(INJECTED_SCRIPT_STRING);
        };
        if (!(isInlineScript(stackMatch) || isInjectedScript(stackMatch))) {
          return false;
        }
        let documentURL = window.location.href;
        const pos = documentURL.indexOf("#");
        if (pos !== -1) {
          documentURL = documentURL.slice(0, pos);
        }
        const stackSteps = stackTrace.split("\n").slice(2).map(function (line) {
          return line.trim();
        });
        const stackLines = stackSteps.map(function (line) {
          let stack;
          const getStackTraceURL = /(.*?@)?(\S+)(:\d+):\d+\)?$/.exec(line);
          if (getStackTraceURL) {
            var _stackURL, _stackURL2;
            let stackURL = getStackTraceURL[2];
            if ((_stackURL = stackURL) !== null && _stackURL !== void 0 && _stackURL.startsWith("(")) {
              stackURL = stackURL.slice(1);
            }
            if ((_stackURL2 = stackURL) !== null && _stackURL2 !== void 0 && _stackURL2.startsWith(INJECTED_SCRIPT_MARKER)) {
              var _stackFunction;
              stackURL = INJECTED_SCRIPT_STRING;
              let stackFunction = getStackTraceURL[1] !== undefined ? getStackTraceURL[1].slice(0, -1) : line.slice(0, getStackTraceURL.index).trim();
              if ((_stackFunction = stackFunction) !== null && _stackFunction !== void 0 && _stackFunction.startsWith("at")) {
                stackFunction = stackFunction.slice(2).trim();
              }
              stack = "".concat(stackFunction, " ").concat(stackURL).trim();
            } else {
              stack = stackURL;
            }
          } else {
            stack = line;
          }
          return stack;
        });
        if (stackLines) {
          for (let index = 0; index < stackLines.length; index += 1) {
            if (isInlineScript(stackMatch) && documentURL === stackLines[index]) {
              return true;
            }
            if (isInjectedScript(stackMatch) && stackLines[index].startsWith(INJECTED_SCRIPT_STRING)) {
              return true;
            }
          }
        }
        return false;
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        jsonPrune.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function log(source, args) {
      function log() {
        for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }
        console.log(args);
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        log.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function logAddEventListener(source, args) {
      function logAddEventListener(source) {
        const nativeAddEventListener = window.EventTarget.prototype.addEventListener;
        function addEventListenerWrapper(type, listener) {
          var _this$constructor;
          if (validateType(type) && validateListener(listener)) {
            const message = 'addEventListener("'.concat(type, '", ').concat(listenerToString(listener), ")");
            logMessage(source, message, true);
            hit(source);
          }
          const message = "Invalid event type or listener passed to addEventListener:\ntype: ".concat(convertTypeToString(type), "\nlistener: ").concat(convertTypeToString(listener));
          logMessage(source, message, true);
          let context = this;
          if (this && ((_this$constructor = this.constructor) === null || _this$constructor === void 0 ? void 0 : _this$constructor.name) === "Window" && this !== window) {
            context = window;
          }
          for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
            args[_key - 2] = arguments[_key];
          }
          return nativeAddEventListener.apply(context, [type, listener, ...args]);
        }
        const descriptor = {
          configurable: true,
          set: function set() {},
          get: function get() {
            return addEventListenerWrapper;
          }
        };
        Object.defineProperty(window.EventTarget.prototype, "addEventListener", descriptor);
        Object.defineProperty(window, "addEventListener", descriptor);
        Object.defineProperty(document, "addEventListener", descriptor);
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function validateType(type) {
        return typeof type !== "undefined";
      }
      function validateListener(listener) {
        return typeof listener !== "undefined" && (typeof listener === "function" || typeof listener === "object" && listener !== null && typeof listener.handleEvent === "function");
      }
      function listenerToString(listener) {
        return typeof listener === "function" ? listener.toString() : listener.handleEvent.toString();
      }
      function convertTypeToString(value) {
        let output;
        if (typeof value === "undefined") {
          output = "undefined";
        } else if (typeof value === "object") {
          if (value === null) {
            output = "null";
          } else {
            output = objectToString(value);
          }
        } else {
          output = value.toString();
        }
        return output;
      }
      function logMessage(source, message) {
        let forced = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        let convertMessageToString = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        const name = source.name,
          verbose = source.verbose;
        if (!forced && !verbose) {
          return;
        }
        const nativeConsole = console.log;
        if (!convertMessageToString) {
          nativeConsole("".concat(name, ":"), message);
          return;
        }
        nativeConsole("".concat(name, ": ").concat(message));
      }
      function objectToString(obj) {
        if (!obj || typeof obj !== "object") {
          return String(obj);
        }
        return isEmptyObject(obj) ? "{}" : Object.entries(obj).map(function (pair) {
          const key = pair[0];
          const value = pair[1];
          let recordValueStr = value;
          if (value instanceof Object) {
            recordValueStr = "{ ".concat(objectToString(value), " }");
          }
          return "".concat(key, ':"').concat(recordValueStr, '"');
        }).join(" ");
      }
      function isEmptyObject(obj) {
        return Object.keys(obj).length === 0 && !obj.prototype;
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        logAddEventListener.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function logEval(source, args) {
      function logEval(source) {
        const nativeEval = window.eval;
        function evalWrapper(str) {
          hit(source);
          logMessage(source, 'eval("'.concat(str, '")'), true);
          return nativeEval(str);
        }
        window.eval = evalWrapper;
        const nativeFunction = window.Function;
        function FunctionWrapper() {
          hit(source);
          for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }
          logMessage(source, "new Function(".concat(args.join(", "), ")"), true);
          return nativeFunction.apply(this, [...args]);
        }
        FunctionWrapper.prototype = Object.create(nativeFunction.prototype);
        FunctionWrapper.prototype.constructor = FunctionWrapper;
        window.Function = FunctionWrapper;
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function logMessage(source, message) {
        let forced = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        let convertMessageToString = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        const name = source.name,
          verbose = source.verbose;
        if (!forced && !verbose) {
          return;
        }
        const nativeConsole = console.log;
        if (!convertMessageToString) {
          nativeConsole("".concat(name, ":"), message);
          return;
        }
        nativeConsole("".concat(name, ": ").concat(message));
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        logEval.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function logOnStacktrace(source, args) {
      function logOnStacktrace(source, property) {
        if (!property) {
          return;
        }
        const refineStackTrace = function refineStackTrace(stackString) {
          const stackSteps = stackString.split("\n").slice(2).map(function (line) {
            return line.replace(/ {4}at /, "");
          });
          const logInfoArray = stackSteps.map(function (line) {
            let funcName;
            let funcFullPath;
            const reg = /\(([^\)]+)\)/;
            const regFirefox = /(.*?@)(\S+)(:\d+):\d+\)?$/;
            if (line.match(reg)) {
              funcName = line.split(" ").slice(0, -1).join(" ");
              funcFullPath = line.match(reg)[1];
            } else if (line.match(regFirefox)) {
              funcName = line.split("@").slice(0, -1).join(" ");
              funcFullPath = line.match(regFirefox)[2];
            } else {
              funcName = "function name is not available";
              funcFullPath = line;
            }
            return [funcName, funcFullPath];
          });
          const logInfoObject = {};
          logInfoArray.forEach(function (pair) {
            logInfoObject[pair[0]] = pair[1];
          });
          return logInfoObject;
        };
        const setChainPropAccess = function setChainPropAccess(owner, property) {
          const chainInfo = getPropertyInChain(owner, property);
          let base = chainInfo.base;
          const prop = chainInfo.prop,
            chain = chainInfo.chain;
          if (chain) {
            const setter = function setter(a) {
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
          let value = base[prop];
          setPropertyAccess(base, prop, {
            get() {
              hit(source);
              logMessage(source, "Get ".concat(prop), true);
              console.table(refineStackTrace(new Error().stack));
              return value;
            },
            set(newValue) {
              hit(source);
              logMessage(source, "Set ".concat(prop), true);
              console.table(refineStackTrace(new Error().stack));
              value = newValue;
            }
          });
        };
        setChainPropAccess(window, property);
      }
      function getPropertyInChain(base, chain) {
        const pos = chain.indexOf(".");
        if (pos === -1) {
          return {
            base: base,
            prop: chain
          };
        }
        const prop = chain.slice(0, pos);
        if (base === null) {
          return {
            base: base,
            prop: prop,
            chain: chain
          };
        }
        const nextBase = base[prop];
        chain = chain.slice(pos + 1);
        if ((base instanceof Object || typeof base === "object") && isEmptyObject(base)) {
          return {
            base: base,
            prop: prop,
            chain: chain
          };
        }
        if (nextBase === null) {
          return {
            base: base,
            prop: prop,
            chain: chain
          };
        }
        if (nextBase !== undefined) {
          return getPropertyInChain(nextBase, chain);
        }
        Object.defineProperty(base, prop, {
          configurable: true
        });
        return {
          base: base,
          prop: prop,
          chain: chain
        };
      }
      function setPropertyAccess(object, property, descriptor) {
        const currentDescriptor = Object.getOwnPropertyDescriptor(object, property);
        if (currentDescriptor && !currentDescriptor.configurable) {
          return false;
        }
        Object.defineProperty(object, property, descriptor);
        return true;
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function logMessage(source, message) {
        let forced = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        let convertMessageToString = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        const name = source.name,
          verbose = source.verbose;
        if (!forced && !verbose) {
          return;
        }
        const nativeConsole = console.log;
        if (!convertMessageToString) {
          nativeConsole("".concat(name, ":"), message);
          return;
        }
        nativeConsole("".concat(name, ": ").concat(message));
      }
      function isEmptyObject(obj) {
        return Object.keys(obj).length === 0 && !obj.prototype;
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        logOnStacktrace.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function m3uPrune(source, args) {
      function m3uPrune(source, propsToRemove) {
        let urlToMatch = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "";
        if (typeof Reflect === "undefined" || typeof fetch === "undefined" || typeof Proxy === "undefined" || typeof Response === "undefined") {
          return;
        }
        let shouldPruneResponse = false;
        const urlMatchRegexp = toRegExp(urlToMatch);
        const SEGMENT_MARKER = "#";
        const AD_MARKER = {
          ASSET: "#EXT-X-ASSET:",
          CUE: "#EXT-X-CUE:",
          CUE_IN: "#EXT-X-CUE-IN",
          DISCONTINUITY: "#EXT-X-DISCONTINUITY",
          EXTINF: "#EXTINF",
          EXTM3U: "#EXTM3U",
          SCTE35: "#EXT-X-SCTE35:"
        };
        const COMCAST_AD_MARKER = {
          AD: "-AD-",
          VAST: "-VAST-",
          VMAP_AD: "-VMAP-AD-",
          VMAP_AD_BREAK: "#EXT-X-VMAP-AD-BREAK:"
        };
        const TAGS_ALLOWLIST = ["#EXT-X-TARGETDURATION", "#EXT-X-MEDIA-SEQUENCE", "#EXT-X-DISCONTINUITY-SEQUENCE", "#EXT-X-ENDLIST", "#EXT-X-PLAYLIST-TYPE", "#EXT-X-I-FRAMES-ONLY", "#EXT-X-MEDIA", "#EXT-X-STREAM-INF", "#EXT-X-I-FRAME-STREAM-INF", "#EXT-X-SESSION-DATA", "#EXT-X-SESSION-KEY", "#EXT-X-INDEPENDENT-SEGMENTS", "#EXT-X-START"];
        const isAllowedTag = function isAllowedTag(str) {
          return TAGS_ALLOWLIST.some(function (el) {
            return str.startsWith(el);
          });
        };
        const pruneExtinfFromVmapBlock = function pruneExtinfFromVmapBlock(lines, i) {
          let array = lines.slice();
          let index = i;
          if (array[index].includes(AD_MARKER.EXTINF)) {
            array[index] = undefined;
            index += 1;
            if (array[index].includes(AD_MARKER.DISCONTINUITY)) {
              array[index] = undefined;
              index += 1;
              const prunedExtinf = pruneExtinfFromVmapBlock(array, index);
              array = prunedExtinf.array;
              index = prunedExtinf.index;
            }
          }
          return {
            array: array,
            index: index
          };
        };
        const pruneVmapBlock = function pruneVmapBlock(lines) {
          let array = lines.slice();
          for (let i = 0; i < array.length - 1; i += 1) {
            if (array[i].includes(COMCAST_AD_MARKER.VMAP_AD) || array[i].includes(COMCAST_AD_MARKER.VAST) || array[i].includes(COMCAST_AD_MARKER.AD)) {
              array[i] = undefined;
              if (array[i + 1].includes(AD_MARKER.EXTINF)) {
                i += 1;
                const prunedExtinf = pruneExtinfFromVmapBlock(array, i);
                array = prunedExtinf.array;
                i = prunedExtinf.index - 1;
              }
            }
          }
          return array;
        };
        const pruneSpliceoutBlock = function pruneSpliceoutBlock(line, index, array) {
          if (!line.startsWith(AD_MARKER.CUE)) {
            return line;
          }
          line = undefined;
          index += 1;
          if (array[index].startsWith(AD_MARKER.ASSET)) {
            array[index] = undefined;
            index += 1;
          }
          if (array[index].startsWith(AD_MARKER.SCTE35)) {
            array[index] = undefined;
            index += 1;
          }
          if (array[index].startsWith(AD_MARKER.CUE_IN)) {
            array[index] = undefined;
            index += 1;
          }
          if (array[index].startsWith(AD_MARKER.SCTE35)) {
            array[index] = undefined;
          }
          return line;
        };
        const removeM3ULineRegexp = toRegExp(propsToRemove);
        const pruneInfBlock = function pruneInfBlock(line, index, array) {
          if (!line.startsWith(AD_MARKER.EXTINF)) {
            return line;
          }
          if (!removeM3ULineRegexp.test(array[index + 1])) {
            return line;
          }
          if (!isAllowedTag(array[index])) {
            array[index] = undefined;
          }
          index += 1;
          if (!isAllowedTag(array[index])) {
            array[index] = undefined;
          }
          index += 1;
          if (array[index].startsWith(AD_MARKER.DISCONTINUITY)) {
            array[index] = undefined;
          }
          return line;
        };
        const pruneSegments = function pruneSegments(lines) {
          for (let i = 0; i < lines.length - 1; i += 1) {
            var _lines$i;
            if ((_lines$i = lines[i]) !== null && _lines$i !== void 0 && _lines$i.startsWith(SEGMENT_MARKER) && removeM3ULineRegexp.test(lines[i])) {
              const segmentName = lines[i].substring(0, lines[i].indexOf(":"));
              if (!segmentName) {
                return lines;
              }
              lines[i] = undefined;
              i += 1;
              for (let j = i; j < lines.length; j += 1) {
                if (!lines[j].includes(segmentName) && !isAllowedTag(lines[j])) {
                  lines[j] = undefined;
                } else {
                  i = j - 1;
                  break;
                }
              }
            }
          }
          return lines;
        };
        const isM3U = function isM3U(text) {
          if (typeof text === "string") {
            const trimmedText = text.trim();
            return trimmedText.startsWith(AD_MARKER.EXTM3U) || trimmedText.startsWith(COMCAST_AD_MARKER.VMAP_AD_BREAK);
          }
          return false;
        };
        const isPruningNeeded = function isPruningNeeded(text, regexp) {
          return isM3U(text) && regexp.test(text);
        };
        const pruneM3U = function pruneM3U(text) {
          let lines = text.split(/\n\r|\n|\r/);
          if (text.includes(COMCAST_AD_MARKER.VMAP_AD_BREAK)) {
            lines = pruneVmapBlock(lines);
            return lines.filter(function (l) {
              return !!l;
            }).join("\n");
          }
          lines = pruneSegments(lines);
          return lines.map(function (line, index, array) {
            if (typeof line === "undefined") {
              return line;
            }
            line = pruneSpliceoutBlock(line, index, array);
            if (typeof line !== "undefined") {
              line = pruneInfBlock(line, index, array);
            }
            return line;
          }).filter(function (l) {
            return !!l;
          }).join("\n");
        };
        const nativeOpen = window.XMLHttpRequest.prototype.open;
        const nativeSend = window.XMLHttpRequest.prototype.send;
        let xhrData;
        const openWrapper = function openWrapper(target, thisArg, args) {
          xhrData = getXhrData.apply(null, args);
          if (matchRequestProps(source, urlToMatch, xhrData)) {
            thisArg.shouldBePruned = true;
          }
          if (thisArg.shouldBePruned) {
            thisArg.collectedHeaders = [];
            const setRequestHeaderWrapper = function setRequestHeaderWrapper(target, thisArg, args) {
              thisArg.collectedHeaders.push(args);
              return Reflect.apply(target, thisArg, args);
            };
            const setRequestHeaderHandler = {
              apply: setRequestHeaderWrapper
            };
            thisArg.setRequestHeader = new Proxy(thisArg.setRequestHeader, setRequestHeaderHandler);
          }
          return Reflect.apply(target, thisArg, args);
        };
        const sendWrapper = function sendWrapper(target, thisArg, args) {
          const allowedResponseTypeValues = ["", "text"];
          if (!thisArg.shouldBePruned || !allowedResponseTypeValues.includes(thisArg.responseType)) {
            return Reflect.apply(target, thisArg, args);
          }
          const forgedRequest = new XMLHttpRequest();
          forgedRequest.addEventListener("readystatechange", function () {
            if (forgedRequest.readyState !== 4) {
              return;
            }
            const readyState = forgedRequest.readyState,
              response = forgedRequest.response,
              responseText = forgedRequest.responseText,
              responseURL = forgedRequest.responseURL,
              responseXML = forgedRequest.responseXML,
              status = forgedRequest.status,
              statusText = forgedRequest.statusText;
            const content = responseText || response;
            if (typeof content !== "string") {
              return;
            }
            if (!propsToRemove) {
              if (isM3U(response)) {
                const message = "XMLHttpRequest.open() URL: ".concat(responseURL, "\nresponse: ").concat(response);
                logMessage(source, message);
              }
            } else {
              shouldPruneResponse = isPruningNeeded(response, removeM3ULineRegexp);
            }
            const responseContent = shouldPruneResponse ? pruneM3U(response) : response;
            Object.defineProperties(thisArg, {
              readyState: {
                value: readyState,
                writable: false
              },
              responseURL: {
                value: responseURL,
                writable: false
              },
              responseXML: {
                value: responseXML,
                writable: false
              },
              status: {
                value: status,
                writable: false
              },
              statusText: {
                value: statusText,
                writable: false
              },
              response: {
                value: responseContent,
                writable: false
              },
              responseText: {
                value: responseContent,
                writable: false
              }
            });
            setTimeout(function () {
              const stateEvent = new Event("readystatechange");
              thisArg.dispatchEvent(stateEvent);
              const loadEvent = new Event("load");
              thisArg.dispatchEvent(loadEvent);
              const loadEndEvent = new Event("loadend");
              thisArg.dispatchEvent(loadEndEvent);
            }, 1);
            hit(source);
          });
          nativeOpen.apply(forgedRequest, [xhrData.method, xhrData.url]);
          thisArg.collectedHeaders.forEach(function (header) {
            const name = header[0];
            const value = header[1];
            forgedRequest.setRequestHeader(name, value);
          });
          thisArg.collectedHeaders = [];
          try {
            nativeSend.call(forgedRequest, args);
          } catch (_unused) {
            return Reflect.apply(target, thisArg, args);
          }
          return undefined;
        };
        const openHandler = {
          apply: openWrapper
        };
        const sendHandler = {
          apply: sendWrapper
        };
        XMLHttpRequest.prototype.open = new Proxy(XMLHttpRequest.prototype.open, openHandler);
        XMLHttpRequest.prototype.send = new Proxy(XMLHttpRequest.prototype.send, sendHandler);
        const nativeFetch = window.fetch;
        const fetchWrapper = async function fetchWrapper(target, thisArg, args) {
          const fetchURL = args[0] instanceof Request ? args[0].url : args[0];
          if (typeof fetchURL !== "string" || fetchURL.length === 0) {
            return Reflect.apply(target, thisArg, args);
          }
          if (urlMatchRegexp.test(fetchURL)) {
            const response = await nativeFetch(...args);
            const clonedResponse = response.clone();
            const responseText = await response.text();
            if (!propsToRemove && isM3U(responseText)) {
              const message = "fetch URL: ".concat(fetchURL, "\nresponse text: ").concat(responseText);
              logMessage(source, message);
              return clonedResponse;
            }
            if (isPruningNeeded(responseText, removeM3ULineRegexp)) {
              const prunedText = pruneM3U(responseText);
              hit(source);
              return new Response(prunedText, {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers
              });
            }
            return clonedResponse;
          }
          return Reflect.apply(target, thisArg, args);
        };
        const fetchHandler = {
          apply: fetchWrapper
        };
        window.fetch = new Proxy(window.fetch, fetchHandler);
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function toRegExp() {
        let input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
        const DEFAULT_VALUE = ".?";
        const FORWARD_SLASH = "/";
        if (input === "") {
          return new RegExp(DEFAULT_VALUE);
        }
        if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
          return new RegExp(input.slice(1, -1));
        }
        const escaped = input.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(escaped);
      }
      function logMessage(source, message) {
        let forced = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        let convertMessageToString = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        const name = source.name,
          verbose = source.verbose;
        if (!forced && !verbose) {
          return;
        }
        const nativeConsole = console.log;
        if (!convertMessageToString) {
          nativeConsole("".concat(name, ":"), message);
          return;
        }
        nativeConsole("".concat(name, ": ").concat(message));
      }
      function getXhrData(method, url, async, user, password) {
        return {
          method: method,
          url: url,
          async: async,
          user: user,
          password: password
        };
      }
      function matchRequestProps(source, propsToMatch, requestData) {
        if (propsToMatch === "" || propsToMatch === "*") {
          return true;
        }
        let isMatched;
        const parsedData = parseMatchProps(propsToMatch);
        if (!validateParsedData(parsedData)) {
          logMessage(source, "Invalid parameter: ".concat(propsToMatch));
          isMatched = false;
        } else {
          const matchData = getMatchPropsData(parsedData);
          isMatched = Object.keys(matchData).every(function (matchKey) {
            const matchValue = matchData[matchKey];
            return Object.prototype.hasOwnProperty.call(requestData, matchKey) && matchValue.test(requestData[matchKey]);
          });
        }
        return isMatched;
      }
      function getMatchPropsData(data) {
        const matchData = {};
        Object.keys(data).forEach(function (key) {
          matchData[key] = toRegExp(data[key]);
        });
        return matchData;
      }
      function getRequestProps() {
        return ["url", "method", "headers", "body", "mode", "credentials", "cache", "redirect", "referrer", "referrerPolicy", "integrity", "keepalive", "signal"];
      }
      function validateParsedData(data) {
        return Object.values(data).every(function (value) {
          return isValidStrPattern(value);
        });
      }
      function parseMatchProps(propsToMatchStr) {
        const PROPS_DIVIDER = " ";
        const PAIRS_MARKER = ":";
        const LEGAL_MATCH_PROPS = getRequestProps();
        const propsObj = {};
        const props = propsToMatchStr.split(PROPS_DIVIDER);
        props.forEach(function (prop) {
          const dividerInd = prop.indexOf(PAIRS_MARKER);
          const key = prop.slice(0, dividerInd);
          const hasLegalMatchProp = LEGAL_MATCH_PROPS.includes(key);
          if (hasLegalMatchProp) {
            const value = prop.slice(dividerInd + 1);
            propsObj[key] = value;
          } else {
            propsObj.url = prop;
          }
        });
        return propsObj;
      }
      function isValidStrPattern(input) {
        const FORWARD_SLASH = "/";
        let str = escapeRegExp(input);
        if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
          str = input.slice(1, -1);
        }
        let isValid;
        try {
          isValid = new RegExp(str);
          isValid = true;
        } catch (e) {
          isValid = false;
        }
        return isValid;
      }
      function escapeRegExp(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        m3uPrune.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function noTopics(source, args) {
      function noTopics(source) {
        const TOPICS_PROPERTY_NAME = "browsingTopics";
        if (Document instanceof Object === false) {
          return;
        }
        if (!Object.prototype.hasOwnProperty.call(Document.prototype, TOPICS_PROPERTY_NAME) || Document.prototype[TOPICS_PROPERTY_NAME] instanceof Function === false) {
          return;
        }
        Document.prototype[TOPICS_PROPERTY_NAME] = function () {
          return noopPromiseResolve("[]");
        };
        hit(source);
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function noopPromiseResolve() {
        let responseBody = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "{}";
        let responseUrl = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "";
        let responseType = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "default";
        if (typeof Response === "undefined") {
          return;
        }
        const response = new Response(responseBody, {
          status: 200,
          statusText: "OK"
        });
        Object.defineProperties(response, {
          url: {
            value: responseUrl
          },
          type: {
            value: responseType
          }
        });
        return Promise.resolve(response);
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        noTopics.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function noeval(source, args) {
      function noeval(source) {
        window.eval = function evalWrapper(s) {
          hit(source);
          logMessage(source, "AdGuard has prevented eval:\n".concat(s), true);
        }.bind();
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function logMessage(source, message) {
        let forced = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        let convertMessageToString = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        const name = source.name,
          verbose = source.verbose;
        if (!forced && !verbose) {
          return;
        }
        const nativeConsole = console.log;
        if (!convertMessageToString) {
          nativeConsole("".concat(name, ":"), message);
          return;
        }
        nativeConsole("".concat(name, ": ").concat(message));
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        noeval.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function nowebrtc(source, args) {
      function nowebrtc(source) {
        let propertyName = "";
        if (window.RTCPeerConnection) {
          propertyName = "RTCPeerConnection";
        } else if (window.webkitRTCPeerConnection) {
          propertyName = "webkitRTCPeerConnection";
        }
        if (propertyName === "") {
          return;
        }
        const rtcReplacement = function rtcReplacement(config) {
          const message = "Document tried to create an RTCPeerConnection: ".concat(convertRtcConfigToString(config));
          logMessage(source, message);
          hit(source);
        };
        rtcReplacement.prototype = {
          close: noopFunc,
          createDataChannel: noopFunc,
          createOffer: noopFunc,
          setRemoteDescription: noopFunc
        };
        const rtc = window[propertyName];
        window[propertyName] = rtcReplacement;
        if (rtc.prototype) {
          rtc.prototype.createDataChannel = function (a, b) {
            return {
              close: noopFunc,
              send: noopFunc
            };
          }.bind(null);
        }
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function noopFunc() {}
      function logMessage(source, message) {
        let forced = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        let convertMessageToString = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        const name = source.name,
          verbose = source.verbose;
        if (!forced && !verbose) {
          return;
        }
        const nativeConsole = console.log;
        if (!convertMessageToString) {
          nativeConsole("".concat(name, ":"), message);
          return;
        }
        nativeConsole("".concat(name, ": ").concat(message));
      }
      function convertRtcConfigToString(config) {
        const UNDEF_STR = "undefined";
        let str = UNDEF_STR;
        if (config === null) {
          str = "null";
        } else if (config instanceof Object) {
          const SERVERS_PROP_NAME = "iceServers";
          const URLS_PROP_NAME = "urls";
          if (Object.prototype.hasOwnProperty.call(config, SERVERS_PROP_NAME) && Object.prototype.hasOwnProperty.call(config[SERVERS_PROP_NAME][0], URLS_PROP_NAME) && !!config[SERVERS_PROP_NAME][0][URLS_PROP_NAME]) {
            str = config[SERVERS_PROP_NAME][0][URLS_PROP_NAME].toString();
          }
        }
        return str;
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        nowebrtc.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function preventAddEventListener(source, args) {
      function preventAddEventListener(source, typeSearch, listenerSearch) {
        const typeSearchRegexp = toRegExp(typeSearch);
        const listenerSearchRegexp = toRegExp(listenerSearch);
        const nativeAddEventListener = window.EventTarget.prototype.addEventListener;
        function addEventListenerWrapper(type, listener) {
          var _this$constructor;
          let shouldPrevent = false;
          if (validateType(type) && validateListener(listener)) {
            shouldPrevent = typeSearchRegexp.test(type.toString()) && listenerSearchRegexp.test(listenerToString(listener));
          }
          if (shouldPrevent) {
            hit(source);
            return undefined;
          }
          let context = this;
          if (this && ((_this$constructor = this.constructor) === null || _this$constructor === void 0 ? void 0 : _this$constructor.name) === "Window" && this !== window) {
            context = window;
          }
          for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
            args[_key - 2] = arguments[_key];
          }
          return nativeAddEventListener.apply(context, [type, listener, ...args]);
        }
        const descriptor = {
          configurable: true,
          set: function set() {},
          get: function get() {
            return addEventListenerWrapper;
          }
        };
        Object.defineProperty(window.EventTarget.prototype, "addEventListener", descriptor);
        Object.defineProperty(window, "addEventListener", descriptor);
        Object.defineProperty(document, "addEventListener", descriptor);
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function toRegExp() {
        let input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
        const DEFAULT_VALUE = ".?";
        const FORWARD_SLASH = "/";
        if (input === "") {
          return new RegExp(DEFAULT_VALUE);
        }
        if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
          return new RegExp(input.slice(1, -1));
        }
        const escaped = input.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(escaped);
      }
      function validateType(type) {
        return typeof type !== "undefined";
      }
      function validateListener(listener) {
        return typeof listener !== "undefined" && (typeof listener === "function" || typeof listener === "object" && listener !== null && typeof listener.handleEvent === "function");
      }
      function listenerToString(listener) {
        return typeof listener === "function" ? listener.toString() : listener.handleEvent.toString();
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        preventAddEventListener.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function preventAdfly(source, args) {
      function preventAdfly(source) {
        const isDigit = function isDigit(data) {
          return /^\d$/.test(data);
        };
        const handler = function handler(encodedURL) {
          let evenChars = "";
          let oddChars = "";
          for (let i = 0; i < encodedURL.length; i += 1) {
            if (i % 2 === 0) {
              evenChars += encodedURL.charAt(i);
            } else {
              oddChars = encodedURL.charAt(i) + oddChars;
            }
          }
          let data = (evenChars + oddChars).split("");
          for (let i = 0; i < data.length; i += 1) {
            if (isDigit(data[i])) {
              for (let ii = i + 1; ii < data.length; ii += 1) {
                if (isDigit(data[ii])) {
                  const temp = parseInt(data[i], 10) ^ parseInt(data[ii], 10);
                  if (temp < 10) {
                    data[i] = temp.toString();
                  }
                  i = ii;
                  break;
                }
              }
            }
          }
          data = data.join("");
          const decodedURL = window.atob(data).slice(16, -16);
          if (window.stop) {
            window.stop();
          }
          window.onbeforeunload = null;
          window.location.href = decodedURL;
        };
        let val;
        let applyHandler = true;
        const result = setPropertyAccess(window, "ysmm", {
          configurable: false,
          set: function set(value) {
            if (applyHandler) {
              applyHandler = false;
              try {
                if (typeof value === "string") {
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
          logMessage(source, "Failed to set up prevent-adfly scriptlet");
        }
      }
      function setPropertyAccess(object, property, descriptor) {
        const currentDescriptor = Object.getOwnPropertyDescriptor(object, property);
        if (currentDescriptor && !currentDescriptor.configurable) {
          return false;
        }
        Object.defineProperty(object, property, descriptor);
        return true;
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function logMessage(source, message) {
        let forced = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        let convertMessageToString = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        const name = source.name,
          verbose = source.verbose;
        if (!forced && !verbose) {
          return;
        }
        const nativeConsole = console.log;
        if (!convertMessageToString) {
          nativeConsole("".concat(name, ":"), message);
          return;
        }
        nativeConsole("".concat(name, ": ").concat(message));
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        preventAdfly.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function preventBab(source, args) {
      function preventBab(source) {
        const nativeSetTimeout = window.setTimeout;
        const babRegex = /\.bab_elementid.$/;
        const timeoutWrapper = function timeoutWrapper(callback) {
          if (typeof callback !== "string" || !babRegex.test(callback)) {
            for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
              args[_key - 1] = arguments[_key];
            }
            return nativeSetTimeout.apply(window, [callback, ...args]);
          }
          hit(source);
        };
        window.setTimeout = timeoutWrapper;
        const signatures = [["blockadblock"], ["babasbm"], [/getItem\('babn'\)/], ["getElementById", "String.fromCharCode", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", "charAt", "DOMContentLoaded", "AdBlock", "addEventListener", "doScroll", "fromCharCode", "<<2|r>>4", "sessionStorage", "clientWidth", "localStorage", "Math", "random"]];
        const check = function check(str) {
          if (typeof str !== "string") {
            return false;
          }
          for (let i = 0; i < signatures.length; i += 1) {
            const tokens = signatures[i];
            let match = 0;
            for (let j = 0; j < tokens.length; j += 1) {
              const token = tokens[j];
              const found = token instanceof RegExp ? token.test(str) : str.includes(token);
              if (found) {
                match += 1;
              }
            }
            if (match / tokens.length >= .8) {
              return true;
            }
          }
          return false;
        };
        const nativeEval = window.eval;
        const evalWrapper = function evalWrapper(str) {
          if (!check(str)) {
            return nativeEval(str);
          }
          hit(source);
          const bodyEl = document.body;
          if (bodyEl) {
            bodyEl.style.removeProperty("visibility");
          }
          const el = document.getElementById("babasbmsgx");
          if (el) {
            el.parentNode.removeChild(el);
          }
        };
        window.eval = evalWrapper.bind(window);
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        preventBab.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function preventElementSrcLoading(source, args) {
      function preventElementSrcLoading(source, tagName, match) {
        if (typeof Proxy === "undefined" || typeof Reflect === "undefined") {
          return;
        }
        const srcMockData = {
          script: "data:text/javascript;base64,KCk9Pnt9",
          img: "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==",
          iframe: "data:text/html;base64, PGRpdj48L2Rpdj4=",
          link: "data:text/plain;base64,"
        };
        let instance;
        if (tagName === "script") {
          instance = HTMLScriptElement;
        } else if (tagName === "img") {
          instance = HTMLImageElement;
        } else if (tagName === "iframe") {
          instance = HTMLIFrameElement;
        } else if (tagName === "link") {
          instance = HTMLLinkElement;
        } else {
          return;
        }
        const hasTrustedTypes = window.trustedTypes && typeof window.trustedTypes.createPolicy === "function";
        let policy;
        if (hasTrustedTypes) {
          policy = window.trustedTypes.createPolicy("AGPolicy", {
            createScriptURL: function createScriptURL(arg) {
              return arg;
            }
          });
        }
        const SOURCE_PROPERTY_NAME = tagName === "link" ? "href" : "src";
        const ONERROR_PROPERTY_NAME = "onerror";
        const searchRegexp = toRegExp(match);
        const setMatchedAttribute = function setMatchedAttribute(elem) {
          return elem.setAttribute(source.name, "matched");
        };
        const setAttributeWrapper = function setAttributeWrapper(target, thisArg, args) {
          if (!args[0] || !args[1]) {
            return Reflect.apply(target, thisArg, args);
          }
          const nodeName = thisArg.nodeName.toLowerCase();
          const attrName = args[0].toLowerCase();
          const attrValue = args[1];
          const isMatched = attrName === SOURCE_PROPERTY_NAME && tagName.toLowerCase() === nodeName && srcMockData[nodeName] && searchRegexp.test(attrValue);
          if (!isMatched) {
            return Reflect.apply(target, thisArg, args);
          }
          hit(source);
          setMatchedAttribute(thisArg);
          return Reflect.apply(target, thisArg, [attrName, srcMockData[nodeName]]);
        };
        const setAttributeHandler = {
          apply: setAttributeWrapper
        };
        instance.prototype.setAttribute = new Proxy(Element.prototype.setAttribute, setAttributeHandler);
        const origSrcDescriptor = safeGetDescriptor(instance.prototype, SOURCE_PROPERTY_NAME);
        if (!origSrcDescriptor) {
          return;
        }
        Object.defineProperty(instance.prototype, SOURCE_PROPERTY_NAME, {
          enumerable: true,
          configurable: true,
          get() {
            return origSrcDescriptor.get.call(this);
          },
          set(urlValue) {
            const nodeName = this.nodeName.toLowerCase();
            const isMatched = tagName.toLowerCase() === nodeName && srcMockData[nodeName] && searchRegexp.test(urlValue);
            if (!isMatched) {
              origSrcDescriptor.set.call(this, urlValue);
              return true;
            }
            if (policy && urlValue instanceof TrustedScriptURL) {
              const trustedSrc = policy.createScriptURL(urlValue);
              origSrcDescriptor.set.call(this, trustedSrc);
              hit(source);
              return;
            }
            setMatchedAttribute(this);
            origSrcDescriptor.set.call(this, srcMockData[nodeName]);
            hit(source);
          }
        });
        const origOnerrorDescriptor = safeGetDescriptor(HTMLElement.prototype, ONERROR_PROPERTY_NAME);
        if (!origOnerrorDescriptor) {
          return;
        }
        Object.defineProperty(HTMLElement.prototype, ONERROR_PROPERTY_NAME, {
          enumerable: true,
          configurable: true,
          get() {
            return origOnerrorDescriptor.get.call(this);
          },
          set(cb) {
            const isMatched = this.getAttribute(source.name) === "matched";
            if (!isMatched) {
              origOnerrorDescriptor.set.call(this, cb);
              return true;
            }
            origOnerrorDescriptor.set.call(this, noopFunc);
            return true;
          }
        });
        const addEventListenerWrapper = function addEventListenerWrapper(target, thisArg, args) {
          if (!args[0] || !args[1] || !thisArg) {
            return Reflect.apply(target, thisArg, args);
          }
          const eventName = args[0];
          const isMatched = typeof thisArg.getAttribute === "function" && thisArg.getAttribute(source.name) === "matched" && eventName === "error";
          if (isMatched) {
            return Reflect.apply(target, thisArg, [eventName, noopFunc]);
          }
          return Reflect.apply(target, thisArg, args);
        };
        const addEventListenerHandler = {
          apply: addEventListenerWrapper
        };
        EventTarget.prototype.addEventListener = new Proxy(EventTarget.prototype.addEventListener, addEventListenerHandler);
        const preventInlineOnerror = function preventInlineOnerror(tagName, src) {
          window.addEventListener("error", function (event) {
            if (!event.target || !event.target.nodeName || event.target.nodeName.toLowerCase() !== tagName || !event.target.src || !src.test(event.target.src)) {
              return;
            }
            hit(source);
            if (typeof event.target.onload === "function") {
              event.target.onerror = event.target.onload;
              return;
            }
            event.target.onerror = noopFunc;
          }, true);
        };
        preventInlineOnerror(tagName, searchRegexp);
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function toRegExp() {
        let input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
        const DEFAULT_VALUE = ".?";
        const FORWARD_SLASH = "/";
        if (input === "") {
          return new RegExp(DEFAULT_VALUE);
        }
        if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
          return new RegExp(input.slice(1, -1));
        }
        const escaped = input.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(escaped);
      }
      function safeGetDescriptor(obj, prop) {
        const descriptor = Object.getOwnPropertyDescriptor(obj, prop);
        if (descriptor && descriptor.configurable) {
          return descriptor;
        }
        return null;
      }
      function noopFunc() {}
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        preventElementSrcLoading.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function preventEvalIf(source, args) {
      function preventEvalIf(source, search) {
        const searchRegexp = toRegExp(search);
        const nativeEval = window.eval;
        window.eval = function (payload) {
          if (!searchRegexp.test(payload.toString())) {
            return nativeEval.call(window, payload);
          }
          hit(source);
          return undefined;
        }.bind(window);
      }
      function toRegExp() {
        let input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
        const DEFAULT_VALUE = ".?";
        const FORWARD_SLASH = "/";
        if (input === "") {
          return new RegExp(DEFAULT_VALUE);
        }
        if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
          return new RegExp(input.slice(1, -1));
        }
        const escaped = input.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(escaped);
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        preventEvalIf.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function preventFab(source, args) {
      function preventFab(source) {
        hit(source);
        const Fab = function Fab() {};
        Fab.prototype.check = noopFunc;
        Fab.prototype.clearEvent = noopFunc;
        Fab.prototype.emitEvent = noopFunc;
        Fab.prototype.on = function (a, b) {
          if (!a) {
            b();
          }
          return this;
        };
        Fab.prototype.onDetected = noopThis;
        Fab.prototype.onNotDetected = function (a) {
          a();
          return this;
        };
        Fab.prototype.setOption = noopFunc;
        Fab.prototype.options = {
          set: noopFunc,
          get: noopFunc
        };
        const fab = new Fab();
        const getSetFab = {
          get() {
            return Fab;
          },
          set() {}
        };
        const getsetfab = {
          get() {
            return fab;
          },
          set() {}
        };
        if (Object.prototype.hasOwnProperty.call(window, "FuckAdBlock")) {
          window.FuckAdBlock = Fab;
        } else {
          Object.defineProperty(window, "FuckAdBlock", getSetFab);
        }
        if (Object.prototype.hasOwnProperty.call(window, "BlockAdBlock")) {
          window.BlockAdBlock = Fab;
        } else {
          Object.defineProperty(window, "BlockAdBlock", getSetFab);
        }
        if (Object.prototype.hasOwnProperty.call(window, "SniffAdBlock")) {
          window.SniffAdBlock = Fab;
        } else {
          Object.defineProperty(window, "SniffAdBlock", getSetFab);
        }
        if (Object.prototype.hasOwnProperty.call(window, "fuckAdBlock")) {
          window.fuckAdBlock = fab;
        } else {
          Object.defineProperty(window, "fuckAdBlock", getsetfab);
        }
        if (Object.prototype.hasOwnProperty.call(window, "blockAdBlock")) {
          window.blockAdBlock = fab;
        } else {
          Object.defineProperty(window, "blockAdBlock", getsetfab);
        }
        if (Object.prototype.hasOwnProperty.call(window, "sniffAdBlock")) {
          window.sniffAdBlock = fab;
        } else {
          Object.defineProperty(window, "sniffAdBlock", getsetfab);
        }
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function noopFunc() {}
      function noopThis() {
        return this;
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        preventFab.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function preventFetch(source, args) {
      function preventFetch(source, propsToMatch) {
        let responseBody = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "emptyObj";
        let responseType = arguments.length > 3 ? arguments[3] : undefined;
        if (typeof fetch === "undefined" || typeof Proxy === "undefined" || typeof Response === "undefined") {
          return;
        }
        let strResponseBody;
        if (responseBody === "" || responseBody === "emptyObj") {
          strResponseBody = "{}";
        } else if (responseBody === "emptyArr") {
          strResponseBody = "[]";
        } else {
          logMessage(source, "Invalid responseBody parameter: '".concat(responseBody, "'"));
          return;
        }
        const isResponseTypeSpecified = typeof responseType !== "undefined";
        const isResponseTypeSupported = function isResponseTypeSupported(responseType) {
          const SUPPORTED_TYPES = ["default", "opaque"];
          return SUPPORTED_TYPES.includes(responseType);
        };
        if (isResponseTypeSpecified && !isResponseTypeSupported(responseType)) {
          logMessage(source, "Invalid responseType parameter: '".concat(responseType, "'"));
          return;
        }
        const handlerWrapper = async function handlerWrapper(target, thisArg, args) {
          let shouldPrevent = false;
          const fetchData = getFetchData(args);
          if (typeof propsToMatch === "undefined") {
            logMessage(source, "fetch( ".concat(objectToString(fetchData), " )"), true);
            hit(source);
            return Reflect.apply(target, thisArg, args);
          }
          shouldPrevent = matchRequestProps(source, propsToMatch, fetchData);
          if (shouldPrevent) {
            hit(source);
            const origResponse = await Reflect.apply(target, thisArg, args);
            return modifyResponse(origResponse, {
              body: strResponseBody,
              type: responseType
            });
          }
          return Reflect.apply(target, thisArg, args);
        };
        const fetchHandler = {
          apply: handlerWrapper
        };
        fetch = new Proxy(fetch, fetchHandler);
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function getFetchData(args) {
        const fetchPropsObj = {};
        let fetchUrl;
        let fetchInit;
        if (args[0] instanceof Request) {
          const requestData = getRequestData(args[0]);
          fetchUrl = requestData.url;
          fetchInit = requestData;
        } else {
          fetchUrl = args[0];
          fetchInit = args[1];
        }
        fetchPropsObj.url = fetchUrl;
        if (fetchInit instanceof Object) {
          Object.keys(fetchInit).forEach(function (prop) {
            fetchPropsObj[prop] = fetchInit[prop];
          });
        }
        return fetchPropsObj;
      }
      function objectToString(obj) {
        if (!obj || typeof obj !== "object") {
          return String(obj);
        }
        return isEmptyObject(obj) ? "{}" : Object.entries(obj).map(function (pair) {
          const key = pair[0];
          const value = pair[1];
          let recordValueStr = value;
          if (value instanceof Object) {
            recordValueStr = "{ ".concat(objectToString(value), " }");
          }
          return "".concat(key, ':"').concat(recordValueStr, '"');
        }).join(" ");
      }
      function matchRequestProps(source, propsToMatch, requestData) {
        if (propsToMatch === "" || propsToMatch === "*") {
          return true;
        }
        let isMatched;
        const parsedData = parseMatchProps(propsToMatch);
        if (!validateParsedData(parsedData)) {
          logMessage(source, "Invalid parameter: ".concat(propsToMatch));
          isMatched = false;
        } else {
          const matchData = getMatchPropsData(parsedData);
          isMatched = Object.keys(matchData).every(function (matchKey) {
            const matchValue = matchData[matchKey];
            return Object.prototype.hasOwnProperty.call(requestData, matchKey) && matchValue.test(requestData[matchKey]);
          });
        }
        return isMatched;
      }
      function logMessage(source, message) {
        let forced = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        let convertMessageToString = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        const name = source.name,
          verbose = source.verbose;
        if (!forced && !verbose) {
          return;
        }
        const nativeConsole = console.log;
        if (!convertMessageToString) {
          nativeConsole("".concat(name, ":"), message);
          return;
        }
        nativeConsole("".concat(name, ": ").concat(message));
      }
      function modifyResponse(origResponse) {
        var _origResponse$headers;
        let replacement = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {
          body: "{}"
        };
        const headers = {};
        origResponse === null || origResponse === void 0 ? void 0 : (_origResponse$headers = origResponse.headers) === null || _origResponse$headers === void 0 ? void 0 : _origResponse$headers.forEach(function (value, key) {
          headers[key] = value;
        });
        const modifiedResponse = new Response(replacement.body, {
          status: origResponse.status,
          statusText: origResponse.statusText,
          headers: headers
        });
        Object.defineProperties(modifiedResponse, {
          url: {
            value: origResponse.url
          },
          type: {
            value: replacement.type || origResponse.type
          }
        });
        return modifiedResponse;
      }
      function toRegExp() {
        let input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
        const DEFAULT_VALUE = ".?";
        const FORWARD_SLASH = "/";
        if (input === "") {
          return new RegExp(DEFAULT_VALUE);
        }
        if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
          return new RegExp(input.slice(1, -1));
        }
        const escaped = input.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(escaped);
      }
      function isValidStrPattern(input) {
        const FORWARD_SLASH = "/";
        let str = escapeRegExp(input);
        if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
          str = input.slice(1, -1);
        }
        let isValid;
        try {
          isValid = new RegExp(str);
          isValid = true;
        } catch (e) {
          isValid = false;
        }
        return isValid;
      }
      function escapeRegExp(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }
      function isEmptyObject(obj) {
        return Object.keys(obj).length === 0 && !obj.prototype;
      }
      function getRequestData(request) {
        const requestInitOptions = getRequestProps();
        const entries = requestInitOptions.map(function (key) {
          const value = request[key];
          return [key, value];
        });
        return Object.fromEntries(entries);
      }
      function getRequestProps() {
        return ["url", "method", "headers", "body", "mode", "credentials", "cache", "redirect", "referrer", "referrerPolicy", "integrity", "keepalive", "signal"];
      }
      function parseMatchProps(propsToMatchStr) {
        const PROPS_DIVIDER = " ";
        const PAIRS_MARKER = ":";
        const LEGAL_MATCH_PROPS = getRequestProps();
        const propsObj = {};
        const props = propsToMatchStr.split(PROPS_DIVIDER);
        props.forEach(function (prop) {
          const dividerInd = prop.indexOf(PAIRS_MARKER);
          const key = prop.slice(0, dividerInd);
          const hasLegalMatchProp = LEGAL_MATCH_PROPS.includes(key);
          if (hasLegalMatchProp) {
            const value = prop.slice(dividerInd + 1);
            propsObj[key] = value;
          } else {
            propsObj.url = prop;
          }
        });
        return propsObj;
      }
      function validateParsedData(data) {
        return Object.values(data).every(function (value) {
          return isValidStrPattern(value);
        });
      }
      function getMatchPropsData(data) {
        const matchData = {};
        Object.keys(data).forEach(function (key) {
          matchData[key] = toRegExp(data[key]);
        });
        return matchData;
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        preventFetch.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function preventPopadsNet(source, args) {
      function preventPopadsNet(source) {
        const rid = randomId();
        const throwError = function throwError() {
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
      function createOnErrorHandler(rid) {
        const nativeOnError = window.onerror;
        return function onError(error) {
          if (typeof error === "string" && error.includes(rid)) {
            return true;
          }
          if (nativeOnError instanceof Function) {
            for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
              args[_key - 1] = arguments[_key];
            }
            return nativeOnError.apply(this, [error, ...args]);
          }
          return false;
        };
      }
      function randomId() {
        return Math.random().toString(36).slice(2, 9);
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        preventPopadsNet.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function preventRefresh(source, args) {
      function preventRefresh(source, delaySec) {
        const getMetaElements = function getMetaElements() {
          let metaNodes = [];
          try {
            metaNodes = document.querySelectorAll('meta[http-equiv="refresh" i][content]');
          } catch (e) {
            try {
              metaNodes = document.querySelectorAll('meta[http-equiv="refresh"][content]');
            } catch (e) {
              logMessage(source, e);
            }
          }
          return Array.from(metaNodes);
        };
        const getMetaContentDelay = function getMetaContentDelay(metaElements) {
          const delays = metaElements.map(function (meta) {
            const contentString = meta.getAttribute("content");
            if (contentString.length === 0) {
              return null;
            }
            let contentDelay;
            const limiterIndex = contentString.indexOf(";");
            if (limiterIndex !== -1) {
              const delaySubstring = contentString.substring(0, limiterIndex);
              contentDelay = getNumberFromString(delaySubstring);
            } else {
              contentDelay = getNumberFromString(contentString);
            }
            return contentDelay;
          }).filter(function (delay) {
            return delay !== null;
          });
          if (!delays.length) {
            return null;
          }
          const minDelay = delays.reduce(function (a, b) {
            return Math.min(a, b);
          });
          return minDelay;
        };
        const stop = function stop() {
          const metaElements = getMetaElements();
          if (metaElements.length === 0) {
            return;
          }
          let secondsToRun = getNumberFromString(delaySec);
          if (secondsToRun === null) {
            secondsToRun = getMetaContentDelay(metaElements);
          }
          if (secondsToRun === null) {
            return;
          }
          const delayMs = secondsToRun * 1e3;
          setTimeout(function () {
            window.stop();
            hit(source);
          }, delayMs);
        };
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", stop, {
            once: true
          });
        } else {
          stop();
        }
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function getNumberFromString(rawString) {
        const parsedDelay = parseInt(rawString, 10);
        const validDelay = nativeIsNaN(parsedDelay) ? null : parsedDelay;
        return validDelay;
      }
      function logMessage(source, message) {
        let forced = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        let convertMessageToString = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        const name = source.name,
          verbose = source.verbose;
        if (!forced && !verbose) {
          return;
        }
        const nativeConsole = console.log;
        if (!convertMessageToString) {
          nativeConsole("".concat(name, ":"), message);
          return;
        }
        nativeConsole("".concat(name, ": ").concat(message));
      }
      function nativeIsNaN(num) {
        const native = Number.isNaN || window.isNaN;
        return native(num);
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        preventRefresh.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function preventRequestAnimationFrame(source, args) {
      function preventRequestAnimationFrame(source, match) {
        const nativeRequestAnimationFrame = window.requestAnimationFrame;
        const shouldLog = typeof match === "undefined";
        const _parseMatchArg = parseMatchArg(match),
          isInvertedMatch = _parseMatchArg.isInvertedMatch,
          matchRegexp = _parseMatchArg.matchRegexp;
        const rafWrapper = function rafWrapper(callback) {
          let shouldPrevent = false;
          if (shouldLog) {
            hit(source);
            logMessage(source, "requestAnimationFrame(".concat(String(callback), ")"), true);
          } else if (isValidCallback(callback) && isValidStrPattern(match)) {
            shouldPrevent = matchRegexp.test(callback.toString()) !== isInvertedMatch;
          }
          if (shouldPrevent) {
            hit(source);
            return nativeRequestAnimationFrame(noopFunc);
          }
          for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
            args[_key - 1] = arguments[_key];
          }
          return nativeRequestAnimationFrame.apply(window, [callback, ...args]);
        };
        window.requestAnimationFrame = rafWrapper;
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function noopFunc() {}
      function parseMatchArg(match) {
        const INVERT_MARKER = "!";
        const isInvertedMatch = match ? match === null || match === void 0 ? void 0 : match.startsWith(INVERT_MARKER) : false;
        const matchValue = isInvertedMatch ? match.slice(1) : match;
        const matchRegexp = toRegExp(matchValue);
        return {
          isInvertedMatch: isInvertedMatch,
          matchRegexp: matchRegexp,
          matchValue: matchValue
        };
      }
      function isValidStrPattern(input) {
        const FORWARD_SLASH = "/";
        let str = escapeRegExp(input);
        if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
          str = input.slice(1, -1);
        }
        let isValid;
        try {
          isValid = new RegExp(str);
          isValid = true;
        } catch (e) {
          isValid = false;
        }
        return isValid;
      }
      function isValidCallback(callback) {
        return callback instanceof Function || typeof callback === "string";
      }
      function logMessage(source, message) {
        let forced = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        let convertMessageToString = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        const name = source.name,
          verbose = source.verbose;
        if (!forced && !verbose) {
          return;
        }
        const nativeConsole = console.log;
        if (!convertMessageToString) {
          nativeConsole("".concat(name, ":"), message);
          return;
        }
        nativeConsole("".concat(name, ": ").concat(message));
      }
      function escapeRegExp(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }
      function toRegExp() {
        let input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
        const DEFAULT_VALUE = ".?";
        const FORWARD_SLASH = "/";
        if (input === "") {
          return new RegExp(DEFAULT_VALUE);
        }
        if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
          return new RegExp(input.slice(1, -1));
        }
        const escaped = input.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(escaped);
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        preventRequestAnimationFrame.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function preventSetInterval(source, args) {
      function preventSetInterval(source, matchCallback, matchDelay) {
        const shouldLog = typeof matchCallback === "undefined" && typeof matchDelay === "undefined";
        const handlerWrapper = function handlerWrapper(target, thisArg, args) {
          const callback = args[0];
          const delay = args[1];
          let shouldPrevent = false;
          if (shouldLog) {
            hit(source);
            logMessage(source, "setInterval(".concat(String(callback), ", ").concat(delay, ")"), true);
          } else {
            shouldPrevent = isPreventionNeeded({
              callback: callback,
              delay: delay,
              matchCallback: matchCallback,
              matchDelay: matchDelay
            });
          }
          if (shouldPrevent) {
            hit(source);
            args[0] = noopFunc;
          }
          return target.apply(thisArg, args);
        };
        const setIntervalHandler = {
          apply: handlerWrapper
        };
        window.setInterval = new Proxy(window.setInterval, setIntervalHandler);
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function noopFunc() {}
      function isPreventionNeeded(_ref) {
        let callback = _ref.callback,
          delay = _ref.delay,
          matchCallback = _ref.matchCallback,
          matchDelay = _ref.matchDelay;
        if (!isValidCallback(callback)) {
          return false;
        }
        if (!isValidMatchStr(matchCallback) || matchDelay && !isValidMatchNumber(matchDelay)) {
          return false;
        }
        const _parseMatchArg = parseMatchArg(matchCallback),
          isInvertedMatch = _parseMatchArg.isInvertedMatch,
          matchRegexp = _parseMatchArg.matchRegexp;
        const _parseDelayArg = parseDelayArg(matchDelay),
          isInvertedDelayMatch = _parseDelayArg.isInvertedDelayMatch,
          delayMatch = _parseDelayArg.delayMatch;
        const parsedDelay = parseRawDelay(delay);
        let shouldPrevent = false;
        const callbackStr = String(callback);
        if (delayMatch === null) {
          shouldPrevent = matchRegexp.test(callbackStr) !== isInvertedMatch;
        } else if (!matchCallback) {
          shouldPrevent = parsedDelay === delayMatch !== isInvertedDelayMatch;
        } else {
          shouldPrevent = matchRegexp.test(callbackStr) !== isInvertedMatch && parsedDelay === delayMatch !== isInvertedDelayMatch;
        }
        return shouldPrevent;
      }
      function logMessage(source, message) {
        let forced = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        let convertMessageToString = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        const name = source.name,
          verbose = source.verbose;
        if (!forced && !verbose) {
          return;
        }
        const nativeConsole = console.log;
        if (!convertMessageToString) {
          nativeConsole("".concat(name, ":"), message);
          return;
        }
        nativeConsole("".concat(name, ": ").concat(message));
      }
      function toRegExp() {
        let input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
        const DEFAULT_VALUE = ".?";
        const FORWARD_SLASH = "/";
        if (input === "") {
          return new RegExp(DEFAULT_VALUE);
        }
        if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
          return new RegExp(input.slice(1, -1));
        }
        const escaped = input.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(escaped);
      }
      function nativeIsNaN(num) {
        const native = Number.isNaN || window.isNaN;
        return native(num);
      }
      function parseMatchArg(match) {
        const INVERT_MARKER = "!";
        const isInvertedMatch = match ? match === null || match === void 0 ? void 0 : match.startsWith(INVERT_MARKER) : false;
        const matchValue = isInvertedMatch ? match.slice(1) : match;
        const matchRegexp = toRegExp(matchValue);
        return {
          isInvertedMatch: isInvertedMatch,
          matchRegexp: matchRegexp,
          matchValue: matchValue
        };
      }
      function parseDelayArg(delay) {
        const INVERT_MARKER = "!";
        const isInvertedDelayMatch = delay === null || delay === void 0 ? void 0 : delay.startsWith(INVERT_MARKER);
        let delayValue = isInvertedDelayMatch ? delay.slice(1) : delay;
        delayValue = parseInt(delayValue, 10);
        const delayMatch = nativeIsNaN(delayValue) ? null : delayValue;
        return {
          isInvertedDelayMatch: isInvertedDelayMatch,
          delayMatch: delayMatch
        };
      }
      function isValidCallback(callback) {
        return callback instanceof Function || typeof callback === "string";
      }
      function isValidMatchStr(match) {
        const INVERT_MARKER = "!";
        let str = match;
        if (match !== null && match !== void 0 && match.startsWith(INVERT_MARKER)) {
          str = match.slice(1);
        }
        return isValidStrPattern(str);
      }
      function isValidStrPattern(input) {
        const FORWARD_SLASH = "/";
        let str = escapeRegExp(input);
        if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
          str = input.slice(1, -1);
        }
        let isValid;
        try {
          isValid = new RegExp(str);
          isValid = true;
        } catch (e) {
          isValid = false;
        }
        return isValid;
      }
      function escapeRegExp(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }
      function nativeIsFinite(num) {
        const native = Number.isFinite || window.isFinite;
        return native(num);
      }
      function isValidMatchNumber(match) {
        const INVERT_MARKER = "!";
        let str = match;
        if (match !== null && match !== void 0 && match.startsWith(INVERT_MARKER)) {
          str = match.slice(1);
        }
        const num = parseFloat(str);
        return !nativeIsNaN(num) && nativeIsFinite(num);
      }
      function parseRawDelay(delay) {
        const parsedDelay = Math.floor(parseInt(delay, 10));
        return typeof parsedDelay === "number" && !nativeIsNaN(parsedDelay) ? parsedDelay : delay;
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        preventSetInterval.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function preventSetTimeout(source, args) {
      function preventSetTimeout(source, matchCallback, matchDelay) {
        const shouldLog = typeof matchCallback === "undefined" && typeof matchDelay === "undefined";
        const handlerWrapper = function handlerWrapper(target, thisArg, args) {
          const callback = args[0];
          const delay = args[1];
          let shouldPrevent = false;
          if (shouldLog) {
            hit(source);
            logMessage(source, "setTimeout(".concat(String(callback), ", ").concat(delay, ")"), true);
          } else {
            shouldPrevent = isPreventionNeeded({
              callback: callback,
              delay: delay,
              matchCallback: matchCallback,
              matchDelay: matchDelay
            });
          }
          if (shouldPrevent) {
            hit(source);
            args[0] = noopFunc;
          }
          return target.apply(thisArg, args);
        };
        const setTimeoutHandler = {
          apply: handlerWrapper
        };
        window.setTimeout = new Proxy(window.setTimeout, setTimeoutHandler);
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function noopFunc() {}
      function isPreventionNeeded(_ref) {
        let callback = _ref.callback,
          delay = _ref.delay,
          matchCallback = _ref.matchCallback,
          matchDelay = _ref.matchDelay;
        if (!isValidCallback(callback)) {
          return false;
        }
        if (!isValidMatchStr(matchCallback) || matchDelay && !isValidMatchNumber(matchDelay)) {
          return false;
        }
        const _parseMatchArg = parseMatchArg(matchCallback),
          isInvertedMatch = _parseMatchArg.isInvertedMatch,
          matchRegexp = _parseMatchArg.matchRegexp;
        const _parseDelayArg = parseDelayArg(matchDelay),
          isInvertedDelayMatch = _parseDelayArg.isInvertedDelayMatch,
          delayMatch = _parseDelayArg.delayMatch;
        const parsedDelay = parseRawDelay(delay);
        let shouldPrevent = false;
        const callbackStr = String(callback);
        if (delayMatch === null) {
          shouldPrevent = matchRegexp.test(callbackStr) !== isInvertedMatch;
        } else if (!matchCallback) {
          shouldPrevent = parsedDelay === delayMatch !== isInvertedDelayMatch;
        } else {
          shouldPrevent = matchRegexp.test(callbackStr) !== isInvertedMatch && parsedDelay === delayMatch !== isInvertedDelayMatch;
        }
        return shouldPrevent;
      }
      function logMessage(source, message) {
        let forced = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        let convertMessageToString = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        const name = source.name,
          verbose = source.verbose;
        if (!forced && !verbose) {
          return;
        }
        const nativeConsole = console.log;
        if (!convertMessageToString) {
          nativeConsole("".concat(name, ":"), message);
          return;
        }
        nativeConsole("".concat(name, ": ").concat(message));
      }
      function parseMatchArg(match) {
        const INVERT_MARKER = "!";
        const isInvertedMatch = match ? match === null || match === void 0 ? void 0 : match.startsWith(INVERT_MARKER) : false;
        const matchValue = isInvertedMatch ? match.slice(1) : match;
        const matchRegexp = toRegExp(matchValue);
        return {
          isInvertedMatch: isInvertedMatch,
          matchRegexp: matchRegexp,
          matchValue: matchValue
        };
      }
      function parseDelayArg(delay) {
        const INVERT_MARKER = "!";
        const isInvertedDelayMatch = delay === null || delay === void 0 ? void 0 : delay.startsWith(INVERT_MARKER);
        let delayValue = isInvertedDelayMatch ? delay.slice(1) : delay;
        delayValue = parseInt(delayValue, 10);
        const delayMatch = nativeIsNaN(delayValue) ? null : delayValue;
        return {
          isInvertedDelayMatch: isInvertedDelayMatch,
          delayMatch: delayMatch
        };
      }
      function toRegExp() {
        let input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
        const DEFAULT_VALUE = ".?";
        const FORWARD_SLASH = "/";
        if (input === "") {
          return new RegExp(DEFAULT_VALUE);
        }
        if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
          return new RegExp(input.slice(1, -1));
        }
        const escaped = input.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(escaped);
      }
      function nativeIsNaN(num) {
        const native = Number.isNaN || window.isNaN;
        return native(num);
      }
      function isValidCallback(callback) {
        return callback instanceof Function || typeof callback === "string";
      }
      function isValidMatchStr(match) {
        const INVERT_MARKER = "!";
        let str = match;
        if (match !== null && match !== void 0 && match.startsWith(INVERT_MARKER)) {
          str = match.slice(1);
        }
        return isValidStrPattern(str);
      }
      function escapeRegExp(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }
      function isValidStrPattern(input) {
        const FORWARD_SLASH = "/";
        let str = escapeRegExp(input);
        if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
          str = input.slice(1, -1);
        }
        let isValid;
        try {
          isValid = new RegExp(str);
          isValid = true;
        } catch (e) {
          isValid = false;
        }
        return isValid;
      }
      function nativeIsFinite(num) {
        const native = Number.isFinite || window.isFinite;
        return native(num);
      }
      function isValidMatchNumber(match) {
        const INVERT_MARKER = "!";
        let str = match;
        if (match !== null && match !== void 0 && match.startsWith(INVERT_MARKER)) {
          str = match.slice(1);
        }
        const num = parseFloat(str);
        return !nativeIsNaN(num) && nativeIsFinite(num);
      }
      function parseRawDelay(delay) {
        const parsedDelay = Math.floor(parseInt(delay, 10));
        return typeof parsedDelay === "number" && !nativeIsNaN(parsedDelay) ? parsedDelay : delay;
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        preventSetTimeout.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function preventWindowOpen(source, args) {
      function preventWindowOpen(source) {
        let match = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "*";
        let delay = arguments.length > 2 ? arguments[2] : undefined;
        let replacement = arguments.length > 3 ? arguments[3] : undefined;
        const nativeOpen = window.open;
        const isNewSyntax = match !== "0" && match !== "1";
        const oldOpenWrapper = function oldOpenWrapper(str) {
          match = Number(match) > 0;
          for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
            args[_key - 1] = arguments[_key];
          }
          if (!isValidStrPattern(delay)) {
            logMessage(source, "Invalid parameter: ".concat(delay));
            return nativeOpen.apply(window, [str, ...args]);
          }
          const searchRegexp = toRegExp(delay);
          if (match !== searchRegexp.test(str)) {
            return nativeOpen.apply(window, [str, ...args]);
          }
          hit(source);
          return handleOldReplacement(replacement);
        };
        const newOpenWrapper = function newOpenWrapper(url) {
          const shouldLog = replacement && replacement.includes("log");
          for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
            args[_key2 - 1] = arguments[_key2];
          }
          if (shouldLog) {
            const argsStr = args && args.length > 0 ? ", ".concat(args.join(", ")) : "";
            const message = "".concat(url).concat(argsStr);
            logMessage(source, message, true);
            hit(source);
          }
          let shouldPrevent = false;
          if (match === "*") {
            shouldPrevent = true;
          } else if (isValidMatchStr(match)) {
            const _parseMatchArg = parseMatchArg(match),
              isInvertedMatch = _parseMatchArg.isInvertedMatch,
              matchRegexp = _parseMatchArg.matchRegexp;
            shouldPrevent = matchRegexp.test(url) !== isInvertedMatch;
          } else {
            logMessage(source, "Invalid parameter: ".concat(match));
            shouldPrevent = false;
          }
          if (shouldPrevent) {
            const parsedDelay = parseInt(delay, 10);
            let result;
            if (nativeIsNaN(parsedDelay)) {
              result = noopNull();
            } else {
              const decoyArgs = {
                replacement: replacement,
                url: url,
                delay: parsedDelay
              };
              const decoy = createDecoy(decoyArgs);
              let popup = decoy.contentWindow;
              if (typeof popup === "object" && popup !== null) {
                Object.defineProperty(popup, "closed", {
                  value: false
                });
                Object.defineProperty(popup, "opener", {
                  value: window
                });
                Object.defineProperty(popup, "frameElement", {
                  value: null
                });
              } else {
                const nativeGetter = decoy.contentWindow && decoy.contentWindow.get;
                Object.defineProperty(decoy, "contentWindow", {
                  get: getPreventGetter(nativeGetter)
                });
                popup = decoy.contentWindow;
              }
              result = popup;
            }
            hit(source);
            return result;
          }
          return nativeOpen.apply(window, [url, ...args]);
        };
        window.open = isNewSyntax ? newOpenWrapper : oldOpenWrapper;
        window.open.toString = nativeOpen.toString.bind(nativeOpen);
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function isValidStrPattern(input) {
        const FORWARD_SLASH = "/";
        let str = escapeRegExp(input);
        if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
          str = input.slice(1, -1);
        }
        let isValid;
        try {
          isValid = new RegExp(str);
          isValid = true;
        } catch (e) {
          isValid = false;
        }
        return isValid;
      }
      function escapeRegExp(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }
      function isValidMatchStr(match) {
        const INVERT_MARKER = "!";
        let str = match;
        if (match !== null && match !== void 0 && match.startsWith(INVERT_MARKER)) {
          str = match.slice(1);
        }
        return isValidStrPattern(str);
      }
      function toRegExp() {
        let input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
        const DEFAULT_VALUE = ".?";
        const FORWARD_SLASH = "/";
        if (input === "") {
          return new RegExp(DEFAULT_VALUE);
        }
        if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
          return new RegExp(input.slice(1, -1));
        }
        const escaped = input.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(escaped);
      }
      function nativeIsNaN(num) {
        const native = Number.isNaN || window.isNaN;
        return native(num);
      }
      function parseMatchArg(match) {
        const INVERT_MARKER = "!";
        const isInvertedMatch = match ? match === null || match === void 0 ? void 0 : match.startsWith(INVERT_MARKER) : false;
        const matchValue = isInvertedMatch ? match.slice(1) : match;
        const matchRegexp = toRegExp(matchValue);
        return {
          isInvertedMatch: isInvertedMatch,
          matchRegexp: matchRegexp,
          matchValue: matchValue
        };
      }
      function handleOldReplacement(replacement) {
        let result;
        if (!replacement) {
          result = noopFunc;
        } else if (replacement === "trueFunc") {
          result = trueFunc;
        } else if (replacement.includes("=")) {
          const isProp = replacement.startsWith("{") && replacement.endsWith("}");
          if (isProp) {
            const propertyPart = replacement.slice(1, -1);
            const propertyName = substringBefore(propertyPart, "=");
            const propertyValue = substringAfter(propertyPart, "=");
            if (propertyValue === "noopFunc") {
              result = {};
              result[propertyName] = noopFunc;
            }
          }
        }
        return result;
      }
      function createDecoy(args) {
        const OBJECT_TAG_NAME = "object";
        const OBJECT_URL_PROP_NAME = "data";
        const IFRAME_TAG_NAME = "iframe";
        const IFRAME_URL_PROP_NAME = "src";
        const replacement = args.replacement,
          url = args.url,
          delay = args.delay;
        let tag;
        let urlProp;
        if (replacement === "obj") {
          tag = OBJECT_TAG_NAME;
          urlProp = OBJECT_URL_PROP_NAME;
        } else {
          tag = IFRAME_TAG_NAME;
          urlProp = IFRAME_URL_PROP_NAME;
        }
        const decoy = document.createElement(tag);
        decoy[urlProp] = url;
        decoy.style.setProperty("height", "1px", "important");
        decoy.style.setProperty("position", "fixed", "important");
        decoy.style.setProperty("top", "-1px", "important");
        decoy.style.setProperty("width", "1px", "important");
        document.body.appendChild(decoy);
        setTimeout(function () {
          return decoy.remove();
        }, delay * 1e3);
        return decoy;
      }
      function getPreventGetter(nativeGetter) {
        const preventGetter = function preventGetter(target, prop) {
          if (prop && prop === "closed") {
            return false;
          }
          if (typeof nativeGetter === "function") {
            return noopFunc;
          }
          return prop && target[prop];
        };
        return preventGetter;
      }
      function noopNull() {
        return null;
      }
      function logMessage(source, message) {
        let forced = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        let convertMessageToString = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        const name = source.name,
          verbose = source.verbose;
        if (!forced && !verbose) {
          return;
        }
        const nativeConsole = console.log;
        if (!convertMessageToString) {
          nativeConsole("".concat(name, ":"), message);
          return;
        }
        nativeConsole("".concat(name, ": ").concat(message));
      }
      function noopFunc() {}
      function trueFunc() {
        return true;
      }
      function substringBefore(str, separator) {
        if (!str || !separator) {
          return str;
        }
        const index = str.indexOf(separator);
        return index < 0 ? str : str.substring(0, index);
      }
      function substringAfter(str, separator) {
        if (!str) {
          return str;
        }
        const index = str.indexOf(separator);
        return index < 0 ? "" : str.substring(index + separator.length);
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        preventWindowOpen.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function preventXHR(source, args) {
      function preventXHR(source, propsToMatch, customResponseText) {
        if (typeof Proxy === "undefined") {
          return;
        }
        const nativeOpen = window.XMLHttpRequest.prototype.open;
        const nativeSend = window.XMLHttpRequest.prototype.send;
        let xhrData;
        let modifiedResponse = "";
        let modifiedResponseText = "";
        const openWrapper = function openWrapper(target, thisArg, args) {
          xhrData = getXhrData.apply(null, args);
          if (typeof propsToMatch === "undefined") {
            logMessage(source, "xhr( ".concat(objectToString(xhrData), " )"), true);
            hit(source);
          } else if (matchRequestProps(source, propsToMatch, xhrData)) {
            thisArg.shouldBePrevented = true;
          }
          if (thisArg.shouldBePrevented) {
            thisArg.collectedHeaders = [];
            const setRequestHeaderWrapper = function setRequestHeaderWrapper(target, thisArg, args) {
              thisArg.collectedHeaders.push(args);
              return Reflect.apply(target, thisArg, args);
            };
            const setRequestHeaderHandler = {
              apply: setRequestHeaderWrapper
            };
            thisArg.setRequestHeader = new Proxy(thisArg.setRequestHeader, setRequestHeaderHandler);
          }
          return Reflect.apply(target, thisArg, args);
        };
        const sendWrapper = function sendWrapper(target, thisArg, args) {
          if (!thisArg.shouldBePrevented) {
            return Reflect.apply(target, thisArg, args);
          }
          if (thisArg.responseType === "blob") {
            modifiedResponse = new Blob();
          }
          if (thisArg.responseType === "arraybuffer") {
            modifiedResponse = new ArrayBuffer();
          }
          if (customResponseText) {
            const randomText = generateRandomResponse(customResponseText);
            if (randomText) {
              modifiedResponseText = randomText;
            } else {
              logMessage(source, "Invalid randomize parameter: '".concat(customResponseText, "'"));
            }
          }
          const forgedRequest = new XMLHttpRequest();
          forgedRequest.addEventListener("readystatechange", function () {
            if (forgedRequest.readyState !== 4) {
              return;
            }
            const readyState = forgedRequest.readyState,
              responseURL = forgedRequest.responseURL,
              responseXML = forgedRequest.responseXML,
              status = forgedRequest.status,
              statusText = forgedRequest.statusText;
            Object.defineProperties(thisArg, {
              readyState: {
                value: readyState,
                writable: false
              },
              status: {
                value: status,
                writable: false
              },
              statusText: {
                value: statusText,
                writable: false
              },
              responseURL: {
                value: responseURL,
                writable: false
              },
              responseXML: {
                value: responseXML,
                writable: false
              },
              response: {
                value: modifiedResponse,
                writable: false
              },
              responseText: {
                value: modifiedResponseText,
                writable: false
              }
            });
            setTimeout(function () {
              const stateEvent = new Event("readystatechange");
              thisArg.dispatchEvent(stateEvent);
              const loadEvent = new Event("load");
              thisArg.dispatchEvent(loadEvent);
              const loadEndEvent = new Event("loadend");
              thisArg.dispatchEvent(loadEndEvent);
            }, 1);
            hit(source);
          });
          nativeOpen.apply(forgedRequest, [xhrData.method, xhrData.url]);
          thisArg.collectedHeaders.forEach(function (header) {
            const name = header[0];
            const value = header[1];
            forgedRequest.setRequestHeader(name, value);
          });
          try {
            nativeSend.call(forgedRequest, args);
          } catch (_unused) {
            return Reflect.apply(target, thisArg, args);
          }
          return undefined;
        };
        const getHeaderWrapper = function getHeaderWrapper(target, thisArg, args) {
          if (!thisArg.collectedHeaders.length) {
            return null;
          }
          const searchHeaderName = args[0].toLowerCase();
          const matchedHeader = thisArg.collectedHeaders.find(function (header) {
            const headerName = header[0].toLowerCase();
            return headerName === searchHeaderName;
          });
          return matchedHeader ? matchedHeader[1] : null;
        };
        const getAllHeadersWrapper = function getAllHeadersWrapper(target, thisArg) {
          if (!thisArg.collectedHeaders.length) {
            return "";
          }
          const allHeadersStr = thisArg.collectedHeaders.map(function (header) {
            const headerName = header[0];
            const headerValue = header[1];
            return "".concat(headerName.toLowerCase(), ": ").concat(headerValue);
          }).join("\r\n");
          return allHeadersStr;
        };
        const openHandler = {
          apply: openWrapper
        };
        const sendHandler = {
          apply: sendWrapper
        };
        const getHeaderHandler = {
          apply: getHeaderWrapper
        };
        const getAllHeadersHandler = {
          apply: getAllHeadersWrapper
        };
        XMLHttpRequest.prototype.open = new Proxy(XMLHttpRequest.prototype.open, openHandler);
        XMLHttpRequest.prototype.send = new Proxy(XMLHttpRequest.prototype.send, sendHandler);
        XMLHttpRequest.prototype.getResponseHeader = new Proxy(XMLHttpRequest.prototype.getResponseHeader, getHeaderHandler);
        XMLHttpRequest.prototype.getAllResponseHeaders = new Proxy(XMLHttpRequest.prototype.getAllResponseHeaders, getAllHeadersHandler);
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function objectToString(obj) {
        if (!obj || typeof obj !== "object") {
          return String(obj);
        }
        return isEmptyObject(obj) ? "{}" : Object.entries(obj).map(function (pair) {
          const key = pair[0];
          const value = pair[1];
          let recordValueStr = value;
          if (value instanceof Object) {
            recordValueStr = "{ ".concat(objectToString(value), " }");
          }
          return "".concat(key, ':"').concat(recordValueStr, '"');
        }).join(" ");
      }
      function generateRandomResponse(customResponseText) {
        let customResponse = customResponseText;
        if (customResponse === "true") {
          customResponse = Math.random().toString(36).slice(-10);
          return customResponse;
        }
        customResponse = customResponse.replace("length:", "");
        const rangeRegex = /^\d+-\d+$/;
        if (!rangeRegex.test(customResponse)) {
          return null;
        }
        let rangeMin = getNumberFromString(customResponse.split("-")[0]);
        let rangeMax = getNumberFromString(customResponse.split("-")[1]);
        if (!nativeIsFinite(rangeMin) || !nativeIsFinite(rangeMax)) {
          return null;
        }
        if (rangeMin > rangeMax) {
          const temp = rangeMin;
          rangeMin = rangeMax;
          rangeMax = temp;
        }
        const LENGTH_RANGE_LIMIT = 500 * 1e3;
        if (rangeMax > LENGTH_RANGE_LIMIT) {
          return null;
        }
        const length = getRandomIntInclusive(rangeMin, rangeMax);
        customResponse = getRandomStrByLength(length);
        return customResponse;
      }
      function matchRequestProps(source, propsToMatch, requestData) {
        if (propsToMatch === "" || propsToMatch === "*") {
          return true;
        }
        let isMatched;
        const parsedData = parseMatchProps(propsToMatch);
        if (!validateParsedData(parsedData)) {
          logMessage(source, "Invalid parameter: ".concat(propsToMatch));
          isMatched = false;
        } else {
          const matchData = getMatchPropsData(parsedData);
          isMatched = Object.keys(matchData).every(function (matchKey) {
            const matchValue = matchData[matchKey];
            return Object.prototype.hasOwnProperty.call(requestData, matchKey) && matchValue.test(requestData[matchKey]);
          });
        }
        return isMatched;
      }
      function getXhrData(method, url, async, user, password) {
        return {
          method: method,
          url: url,
          async: async,
          user: user,
          password: password
        };
      }
      function logMessage(source, message) {
        let forced = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        let convertMessageToString = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        const name = source.name,
          verbose = source.verbose;
        if (!forced && !verbose) {
          return;
        }
        const nativeConsole = console.log;
        if (!convertMessageToString) {
          nativeConsole("".concat(name, ":"), message);
          return;
        }
        nativeConsole("".concat(name, ": ").concat(message));
      }
      function toRegExp() {
        let input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
        const DEFAULT_VALUE = ".?";
        const FORWARD_SLASH = "/";
        if (input === "") {
          return new RegExp(DEFAULT_VALUE);
        }
        if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
          return new RegExp(input.slice(1, -1));
        }
        const escaped = input.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(escaped);
      }
      function isValidStrPattern(input) {
        const FORWARD_SLASH = "/";
        let str = escapeRegExp(input);
        if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
          str = input.slice(1, -1);
        }
        let isValid;
        try {
          isValid = new RegExp(str);
          isValid = true;
        } catch (e) {
          isValid = false;
        }
        return isValid;
      }
      function escapeRegExp(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }
      function isEmptyObject(obj) {
        return Object.keys(obj).length === 0 && !obj.prototype;
      }
      function getNumberFromString(rawString) {
        const parsedDelay = parseInt(rawString, 10);
        const validDelay = nativeIsNaN(parsedDelay) ? null : parsedDelay;
        return validDelay;
      }
      function nativeIsFinite(num) {
        const native = Number.isFinite || window.isFinite;
        return native(num);
      }
      function nativeIsNaN(num) {
        const native = Number.isNaN || window.isNaN;
        return native(num);
      }
      function parseMatchProps(propsToMatchStr) {
        const PROPS_DIVIDER = " ";
        const PAIRS_MARKER = ":";
        const LEGAL_MATCH_PROPS = getRequestProps();
        const propsObj = {};
        const props = propsToMatchStr.split(PROPS_DIVIDER);
        props.forEach(function (prop) {
          const dividerInd = prop.indexOf(PAIRS_MARKER);
          const key = prop.slice(0, dividerInd);
          const hasLegalMatchProp = LEGAL_MATCH_PROPS.includes(key);
          if (hasLegalMatchProp) {
            const value = prop.slice(dividerInd + 1);
            propsObj[key] = value;
          } else {
            propsObj.url = prop;
          }
        });
        return propsObj;
      }
      function validateParsedData(data) {
        return Object.values(data).every(function (value) {
          return isValidStrPattern(value);
        });
      }
      function getMatchPropsData(data) {
        const matchData = {};
        Object.keys(data).forEach(function (key) {
          matchData[key] = toRegExp(data[key]);
        });
        return matchData;
      }
      function getRequestProps() {
        return ["url", "method", "headers", "body", "mode", "credentials", "cache", "redirect", "referrer", "referrerPolicy", "integrity", "keepalive", "signal"];
      }
      function getRandomIntInclusive(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1) + min);
      }
      function getRandomStrByLength(length) {
        let result = "";
        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+=~";
        const charactersLength = characters.length;
        for (let i = 0; i < length; i += 1) {
          result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        preventXHR.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function removeAttr(source, args) {
      function removeAttr(source, attrs, selector) {
        let applying = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : "asap stay";
        if (!attrs) {
          return;
        }
        attrs = attrs.split(/\s*\|\s*/);
        if (!selector) {
          selector = "[".concat(attrs.join("],["), "]");
        }
        const rmattr = function rmattr() {
          let nodes = [];
          try {
            nodes = [].slice.call(document.querySelectorAll(selector));
          } catch (e) {
            logMessage(source, "Invalid selector arg: '".concat(selector, "'"));
          }
          let removed = false;
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
        const flags = parseFlags(applying);
        const run = function run() {
          rmattr();
          if (!flags.hasFlag(flags.STAY)) {
            return;
          }
          observeDOMChanges(rmattr, true);
        };
        if (flags.hasFlag(flags.ASAP)) {
          if (document.readyState === "loading") {
            window.addEventListener("DOMContentLoaded", rmattr, {
              once: true
            });
          } else {
            rmattr();
          }
        }
        if (document.readyState !== "complete" && flags.hasFlag(flags.COMPLETE)) {
          window.addEventListener("load", run, {
            once: true
          });
        } else if (flags.hasFlag(flags.STAY)) {
          if (!applying.includes(" ")) {
            rmattr();
          }
          observeDOMChanges(rmattr, true);
        }
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function observeDOMChanges(callback) {
        let observeAttrs = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
        let attrsToObserve = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
        const THROTTLE_DELAY_MS = 20;
        const observer = new MutationObserver(throttle(callbackWrapper, THROTTLE_DELAY_MS));
        const connect = function connect() {
          if (attrsToObserve.length > 0) {
            observer.observe(document.documentElement, {
              childList: true,
              subtree: true,
              attributes: observeAttrs,
              attributeFilter: attrsToObserve
            });
          } else {
            observer.observe(document.documentElement, {
              childList: true,
              subtree: true,
              attributes: observeAttrs
            });
          }
        };
        const disconnect = function disconnect() {
          observer.disconnect();
        };
        function callbackWrapper() {
          disconnect();
          callback();
          connect();
        }
        connect();
      }
      function parseFlags(flags) {
        const FLAGS_DIVIDER = " ";
        const ASAP_FLAG = "asap";
        const COMPLETE_FLAG = "complete";
        const STAY_FLAG = "stay";
        const VALID_FLAGS = [STAY_FLAG, ASAP_FLAG, COMPLETE_FLAG];
        const passedFlags = flags.trim().split(FLAGS_DIVIDER).filter(function (f) {
          return VALID_FLAGS.includes(f);
        });
        return {
          ASAP: ASAP_FLAG,
          COMPLETE: COMPLETE_FLAG,
          STAY: STAY_FLAG,
          hasFlag(flag) {
            return passedFlags.includes(flag);
          }
        };
      }
      function logMessage(source, message) {
        let forced = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        let convertMessageToString = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        const name = source.name,
          verbose = source.verbose;
        if (!forced && !verbose) {
          return;
        }
        const nativeConsole = console.log;
        if (!convertMessageToString) {
          nativeConsole("".concat(name, ":"), message);
          return;
        }
        nativeConsole("".concat(name, ": ").concat(message));
      }
      function throttle(cb, delay) {
        let wait = false;
        let savedArgs;
        const wrapper = function wrapper() {
          for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }
          if (wait) {
            savedArgs = args;
            return;
          }
          cb(...args);
          wait = true;
          setTimeout(function () {
            wait = false;
            if (savedArgs) {
              wrapper(...savedArgs);
              savedArgs = null;
            }
          }, delay);
        };
        return wrapper;
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        removeAttr.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function removeClass(source, args) {
      function removeClass(source, classNames, selector) {
        let applying = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : "asap stay";
        if (!classNames) {
          return;
        }
        classNames = classNames.split(/\s*\|\s*/);
        let selectors = [];
        if (!selector) {
          selectors = classNames.map(function (className) {
            return ".".concat(className);
          });
        }
        const removeClassHandler = function removeClassHandler() {
          const nodes = new Set();
          if (selector) {
            let foundNodes = [];
            try {
              foundNodes = [].slice.call(document.querySelectorAll(selector));
            } catch (e) {
              logMessage(source, "Invalid selector arg: '".concat(selector, "'"));
            }
            foundNodes.forEach(function (n) {
              return nodes.add(n);
            });
          } else if (selectors.length > 0) {
            selectors.forEach(function (s) {
              const elements = document.querySelectorAll(s);
              for (let i = 0; i < elements.length; i += 1) {
                const element = elements[i];
                nodes.add(element);
              }
            });
          }
          let removed = false;
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
        const CLASS_ATTR_NAME = ["class"];
        const flags = parseFlags(applying);
        const run = function run() {
          removeClassHandler();
          if (!flags.hasFlag(flags.STAY)) {
            return;
          }
          observeDOMChanges(removeClassHandler, true, CLASS_ATTR_NAME);
        };
        if (flags.hasFlag(flags.ASAP)) {
          if (document.readyState === "loading") {
            window.addEventListener("DOMContentLoaded", removeClassHandler, {
              once: true
            });
          } else {
            removeClassHandler();
          }
        }
        if (document.readyState !== "complete" && flags.hasFlag(flags.COMPLETE)) {
          window.addEventListener("load", run, {
            once: true
          });
        } else if (flags.hasFlag(flags.STAY)) {
          if (!applying.includes(" ")) {
            removeClassHandler();
          }
          observeDOMChanges(removeClassHandler, true, CLASS_ATTR_NAME);
        }
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function logMessage(source, message) {
        let forced = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        let convertMessageToString = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        const name = source.name,
          verbose = source.verbose;
        if (!forced && !verbose) {
          return;
        }
        const nativeConsole = console.log;
        if (!convertMessageToString) {
          nativeConsole("".concat(name, ":"), message);
          return;
        }
        nativeConsole("".concat(name, ": ").concat(message));
      }
      function observeDOMChanges(callback) {
        let observeAttrs = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
        let attrsToObserve = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
        const THROTTLE_DELAY_MS = 20;
        const observer = new MutationObserver(throttle(callbackWrapper, THROTTLE_DELAY_MS));
        const connect = function connect() {
          if (attrsToObserve.length > 0) {
            observer.observe(document.documentElement, {
              childList: true,
              subtree: true,
              attributes: observeAttrs,
              attributeFilter: attrsToObserve
            });
          } else {
            observer.observe(document.documentElement, {
              childList: true,
              subtree: true,
              attributes: observeAttrs
            });
          }
        };
        const disconnect = function disconnect() {
          observer.disconnect();
        };
        function callbackWrapper() {
          disconnect();
          callback();
          connect();
        }
        connect();
      }
      function parseFlags(flags) {
        const FLAGS_DIVIDER = " ";
        const ASAP_FLAG = "asap";
        const COMPLETE_FLAG = "complete";
        const STAY_FLAG = "stay";
        const VALID_FLAGS = [STAY_FLAG, ASAP_FLAG, COMPLETE_FLAG];
        const passedFlags = flags.trim().split(FLAGS_DIVIDER).filter(function (f) {
          return VALID_FLAGS.includes(f);
        });
        return {
          ASAP: ASAP_FLAG,
          COMPLETE: COMPLETE_FLAG,
          STAY: STAY_FLAG,
          hasFlag(flag) {
            return passedFlags.includes(flag);
          }
        };
      }
      function throttle(cb, delay) {
        let wait = false;
        let savedArgs;
        const wrapper = function wrapper() {
          for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }
          if (wait) {
            savedArgs = args;
            return;
          }
          cb(...args);
          wait = true;
          setTimeout(function () {
            wait = false;
            if (savedArgs) {
              wrapper(...savedArgs);
              savedArgs = null;
            }
          }, delay);
        };
        return wrapper;
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        removeClass.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function removeCookie(source, args) {
      function removeCookie(source, match) {
        const matchRegexp = toRegExp(match);
        const removeCookieFromHost = function removeCookieFromHost(cookieName, hostName) {
          const cookieSpec = "".concat(cookieName, "=");
          const domain1 = "; domain=".concat(hostName);
          const domain2 = "; domain=.".concat(hostName);
          const path = "; path=/";
          const expiration = "; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          document.cookie = cookieSpec + expiration;
          document.cookie = cookieSpec + domain1 + expiration;
          document.cookie = cookieSpec + domain2 + expiration;
          document.cookie = cookieSpec + path + expiration;
          document.cookie = cookieSpec + domain1 + path + expiration;
          document.cookie = cookieSpec + domain2 + path + expiration;
          hit(source);
        };
        const rmCookie = function rmCookie() {
          document.cookie.split(";").forEach(function (cookieStr) {
            const pos = cookieStr.indexOf("=");
            if (pos === -1) {
              return;
            }
            const cookieName = cookieStr.slice(0, pos).trim();
            if (!matchRegexp.test(cookieName)) {
              return;
            }
            const hostParts = document.location.hostname.split(".");
            for (let i = 0; i <= hostParts.length - 1; i += 1) {
              const hostName = hostParts.slice(i).join(".");
              if (hostName) {
                removeCookieFromHost(cookieName, hostName);
              }
            }
          });
        };
        rmCookie();
        window.addEventListener("beforeunload", rmCookie);
      }
      function toRegExp() {
        let input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
        const DEFAULT_VALUE = ".?";
        const FORWARD_SLASH = "/";
        if (input === "") {
          return new RegExp(DEFAULT_VALUE);
        }
        if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
          return new RegExp(input.slice(1, -1));
        }
        const escaped = input.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(escaped);
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        removeCookie.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function removeInShadowDom(source, args) {
      function removeInShadowDom(source, selector, baseSelector) {
        if (!Element.prototype.attachShadow) {
          return;
        }
        const removeElement = function removeElement(targetElement) {
          targetElement.remove();
        };
        const removeHandler = function removeHandler() {
          let hostElements = !baseSelector ? findHostElements(document.documentElement) : document.querySelectorAll(baseSelector);
          while (hostElements.length !== 0) {
            let isRemoved = false;
            const _pierceShadowDom = pierceShadowDom(selector, hostElements),
              targets = _pierceShadowDom.targets,
              innerHosts = _pierceShadowDom.innerHosts;
            targets.forEach(function (targetEl) {
              removeElement(targetEl);
              isRemoved = true;
            });
            if (isRemoved) {
              hit(source);
            }
            hostElements = innerHosts;
          }
        };
        removeHandler();
        observeDOMChanges(removeHandler, true);
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function observeDOMChanges(callback) {
        let observeAttrs = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
        let attrsToObserve = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
        const THROTTLE_DELAY_MS = 20;
        const observer = new MutationObserver(throttle(callbackWrapper, THROTTLE_DELAY_MS));
        const connect = function connect() {
          if (attrsToObserve.length > 0) {
            observer.observe(document.documentElement, {
              childList: true,
              subtree: true,
              attributes: observeAttrs,
              attributeFilter: attrsToObserve
            });
          } else {
            observer.observe(document.documentElement, {
              childList: true,
              subtree: true,
              attributes: observeAttrs
            });
          }
        };
        const disconnect = function disconnect() {
          observer.disconnect();
        };
        function callbackWrapper() {
          disconnect();
          callback();
          connect();
        }
        connect();
      }
      function findHostElements(rootElement) {
        const hosts = [];
        const domElems = rootElement.querySelectorAll("*");
        domElems.forEach(function (el) {
          if (el.shadowRoot) {
            hosts.push(el);
          }
        });
        return hosts;
      }
      function pierceShadowDom(selector, hostElements) {
        let targets = [];
        const innerHostsAcc = [];
        hostElements.forEach(function (host) {
          const simpleElems = host.querySelectorAll(selector);
          targets = targets.concat([].slice.call(simpleElems));
          const shadowRootElem = host.shadowRoot;
          const shadowChildren = shadowRootElem.querySelectorAll(selector);
          targets = targets.concat([].slice.call(shadowChildren));
          innerHostsAcc.push(findHostElements(shadowRootElem));
        });
        const innerHosts = flatten(innerHostsAcc);
        return {
          targets: targets,
          innerHosts: innerHosts
        };
      }
      function flatten(input) {
        const stack = [];
        input.forEach(function (el) {
          return stack.push(el);
        });
        const res = [];
        while (stack.length) {
          const next = stack.pop();
          if (Array.isArray(next)) {
            next.forEach(function (el) {
              return stack.push(el);
            });
          } else {
            res.push(next);
          }
        }
        return res.reverse();
      }
      function throttle(cb, delay) {
        let wait = false;
        let savedArgs;
        const wrapper = function wrapper() {
          for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }
          if (wait) {
            savedArgs = args;
            return;
          }
          cb(...args);
          wait = true;
          setTimeout(function () {
            wait = false;
            if (savedArgs) {
              wrapper(...savedArgs);
              savedArgs = null;
            }
          }, delay);
        };
        return wrapper;
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        removeInShadowDom.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function removeNodeText(source, args) {
      function removeNodeText(source, nodeName, textMatch) {
        const _parseNodeTextParams = parseNodeTextParams(nodeName, textMatch),
          selector = _parseNodeTextParams.selector,
          nodeNameMatch = _parseNodeTextParams.nodeNameMatch,
          textContentMatch = _parseNodeTextParams.textContentMatch;
        const handleNodes = function handleNodes(nodes) {
          return nodes.forEach(function (node) {
            const shouldReplace = isTargetNode(node, nodeNameMatch, textContentMatch);
            if (shouldReplace) {
              const ALL_TEXT_PATTERN = /^[\s\S]*$/;
              const REPLACEMENT = "";
              replaceNodeText(source, node, ALL_TEXT_PATTERN, REPLACEMENT);
            }
          });
        };
        if (document.documentElement) {
          handleExistingNodes(selector, handleNodes);
        }
        observeDocumentWithTimeout(function (mutations) {
          return handleMutations(mutations, handleNodes);
        }, {
          childList: true,
          subtree: true
        });
      }
      function observeDocumentWithTimeout(callback, options) {
        let timeout = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1e4;
        const observer = new MutationObserver(function (mutations, observer) {
          observer.disconnect();
          callback(mutations);
          observer.observe(document.documentElement, options);
        });
        observer.observe(document.documentElement, options);
        if (typeof timeout === "number") {
          setTimeout(function () {
            return observer.disconnect();
          }, timeout);
        }
      }
      function handleExistingNodes(selector, handler) {
        const nodeList = document.querySelectorAll(selector);
        const nodes = nodeListToArray(nodeList);
        handler(nodes);
      }
      function handleMutations(mutations, handler) {
        const addedNodes = getAddedNodes(mutations);
        handler(addedNodes);
      }
      function replaceNodeText(source, node, pattern, replacement) {
        node.textContent = node.textContent.replace(pattern, replacement);
        hit(source);
      }
      function isTargetNode(node, nodeNameMatch, textContentMatch) {
        const nodeName = node.nodeName,
          textContent = node.textContent;
        const nodeNameLowerCase = nodeName.toLowerCase();
        return textContent !== "" && (nodeNameMatch instanceof RegExp ? nodeNameMatch.test(nodeNameLowerCase) : nodeNameMatch === nodeNameLowerCase) && (textContentMatch instanceof RegExp ? textContentMatch.test(textContent) : textContent.includes(textContentMatch));
      }
      function parseNodeTextParams(nodeName, textMatch) {
        let pattern = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
        const REGEXP_START_MARKER = "/";
        const isStringNameMatch = !(nodeName.startsWith(REGEXP_START_MARKER) && nodeName.endsWith(REGEXP_START_MARKER));
        const selector = isStringNameMatch ? nodeName : "*";
        const nodeNameMatch = isStringNameMatch ? nodeName : toRegExp(nodeName);
        const textContentMatch = !textMatch.startsWith(REGEXP_START_MARKER) ? textMatch : toRegExp(textMatch);
        let patternMatch;
        if (pattern) {
          patternMatch = !pattern.startsWith(REGEXP_START_MARKER) ? pattern : toRegExp(pattern);
        }
        return {
          selector: selector,
          nodeNameMatch: nodeNameMatch,
          textContentMatch: textContentMatch,
          patternMatch: patternMatch
        };
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function nodeListToArray(nodeList) {
        const nodes = [];
        for (let i = 0; i < nodeList.length; i += 1) {
          nodes.push(nodeList[i]);
        }
        return nodes;
      }
      function getAddedNodes(mutations) {
        const nodes = [];
        for (let i = 0; i < mutations.length; i += 1) {
          const addedNodes = mutations[i].addedNodes;
          for (let j = 0; j < addedNodes.length; j += 1) {
            nodes.push(addedNodes[j]);
          }
        }
        return nodes;
      }
      function toRegExp() {
        let input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
        const DEFAULT_VALUE = ".?";
        const FORWARD_SLASH = "/";
        if (input === "") {
          return new RegExp(DEFAULT_VALUE);
        }
        if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
          return new RegExp(input.slice(1, -1));
        }
        const escaped = input.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(escaped);
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        removeNodeText.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function setAttr(source, args) {
      function setAttr(source, selector, attr) {
        let value = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : "";
        if (!selector || !attr) {
          return;
        }
        const allowedValues = ["true", "false"];
        if (value.length !== 0 && (nativeIsNaN(parseInt(value, 10)) || parseInt(value, 10) < 0 || parseInt(value, 10) > 32767) && !allowedValues.includes(value.toLowerCase())) {
          return;
        }
        const setAttr = function setAttr() {
          const nodes = [].slice.call(document.querySelectorAll(selector));
          let set = false;
          nodes.forEach(function (node) {
            node.setAttribute(attr, value);
            set = true;
          });
          if (set) {
            hit(source);
          }
        };
        setAttr();
        observeDOMChanges(setAttr, true);
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function observeDOMChanges(callback) {
        let observeAttrs = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
        let attrsToObserve = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
        const THROTTLE_DELAY_MS = 20;
        const observer = new MutationObserver(throttle(callbackWrapper, THROTTLE_DELAY_MS));
        const connect = function connect() {
          if (attrsToObserve.length > 0) {
            observer.observe(document.documentElement, {
              childList: true,
              subtree: true,
              attributes: observeAttrs,
              attributeFilter: attrsToObserve
            });
          } else {
            observer.observe(document.documentElement, {
              childList: true,
              subtree: true,
              attributes: observeAttrs
            });
          }
        };
        const disconnect = function disconnect() {
          observer.disconnect();
        };
        function callbackWrapper() {
          disconnect();
          callback();
          connect();
        }
        connect();
      }
      function nativeIsNaN(num) {
        const native = Number.isNaN || window.isNaN;
        return native(num);
      }
      function throttle(cb, delay) {
        let wait = false;
        let savedArgs;
        const wrapper = function wrapper() {
          for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }
          if (wait) {
            savedArgs = args;
            return;
          }
          cb(...args);
          wait = true;
          setTimeout(function () {
            wait = false;
            if (savedArgs) {
              wrapper(...savedArgs);
              savedArgs = null;
            }
          }, delay);
        };
        return wrapper;
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        setAttr.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function setConstant(source, args) {
      function setConstant(source, property, value) {
        let stack = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : "";
        let valueWrapper = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : "";
        const uboAliases = ["set-constant.js", "ubo-set-constant.js", "set.js", "ubo-set.js", "ubo-set-constant", "ubo-set"];
        if (uboAliases.includes(source.name)) {
          if (stack.length !== 1 && !getNumberFromString(stack)) {
            valueWrapper = stack;
          }
          stack = undefined;
        }
        if (!property || !matchStackTrace(stack, new Error().stack)) {
          return;
        }
        const emptyArr = noopArray();
        const emptyObj = noopObject();
        let constantValue;
        if (value === "undefined") {
          constantValue = undefined;
        } else if (value === "false") {
          constantValue = false;
        } else if (value === "true") {
          constantValue = true;
        } else if (value === "null") {
          constantValue = null;
        } else if (value === "emptyArr") {
          constantValue = emptyArr;
        } else if (value === "emptyObj") {
          constantValue = emptyObj;
        } else if (value === "noopFunc") {
          constantValue = noopFunc;
        } else if (value === "noopCallbackFunc") {
          constantValue = noopCallbackFunc;
        } else if (value === "trueFunc") {
          constantValue = trueFunc;
        } else if (value === "falseFunc") {
          constantValue = falseFunc;
        } else if (value === "throwFunc") {
          constantValue = throwFunc;
        } else if (value === "noopPromiseResolve") {
          constantValue = noopPromiseResolve;
        } else if (value === "noopPromiseReject") {
          constantValue = noopPromiseReject;
        } else if (/^\d+$/.test(value)) {
          constantValue = parseFloat(value);
          if (nativeIsNaN(constantValue)) {
            return;
          }
          if (Math.abs(constantValue) > 32767) {
            return;
          }
        } else if (value === "-1") {
          constantValue = -1;
        } else if (value === "") {
          constantValue = "";
        } else if (value === "yes") {
          constantValue = "yes";
        } else if (value === "no") {
          constantValue = "no";
        } else {
          return;
        }
        const valueWrapperNames = ["asFunction", "asCallback", "asResolved", "asRejected"];
        if (valueWrapperNames.includes(valueWrapper)) {
          const valueWrappersMap = {
            asFunction(v) {
              return function () {
                return v;
              };
            },
            asCallback(v) {
              return function () {
                return function () {
                  return v;
                };
              };
            },
            asResolved(v) {
              return Promise.resolve(v);
            },
            asRejected(v) {
              return Promise.reject(v);
            }
          };
          constantValue = valueWrappersMap[valueWrapper](constantValue);
        }
        let canceled = false;
        const mustCancel = function mustCancel(value) {
          if (canceled) {
            return canceled;
          }
          canceled = value !== undefined && constantValue !== undefined && typeof value !== typeof constantValue && value !== null;
          return canceled;
        };
        const trapProp = function trapProp(base, prop, configurable, handler) {
          if (!handler.init(base[prop])) {
            return false;
          }
          const origDescriptor = Object.getOwnPropertyDescriptor(base, prop);
          let prevSetter;
          if (origDescriptor instanceof Object) {
            if (!origDescriptor.configurable) {
              const message = "Property '".concat(prop, "' is not configurable");
              logMessage(source, message);
              return false;
            }
            base[prop] = constantValue;
            if (origDescriptor.set instanceof Function) {
              prevSetter = origDescriptor.set;
            }
          }
          Object.defineProperty(base, prop, {
            configurable: configurable,
            get() {
              return handler.get();
            },
            set(a) {
              if (prevSetter !== undefined) {
                prevSetter(a);
              }
              handler.set(a);
            }
          });
          return true;
        };
        const setChainPropAccess = function setChainPropAccess(owner, property) {
          const chainInfo = getPropertyInChain(owner, property);
          const base = chainInfo.base;
          const prop = chainInfo.prop,
            chain = chainInfo.chain;
          const inChainPropHandler = {
            factValue: undefined,
            init(a) {
              this.factValue = a;
              return true;
            },
            get() {
              return this.factValue;
            },
            set(a) {
              if (this.factValue === a) {
                return;
              }
              this.factValue = a;
              if (a instanceof Object) {
                setChainPropAccess(a, chain);
              }
            }
          };
          const endPropHandler = {
            init(a) {
              if (mustCancel(a)) {
                return false;
              }
              return true;
            },
            get() {
              return constantValue;
            },
            set(a) {
              if (!mustCancel(a)) {
                return;
              }
              constantValue = a;
            }
          };
          if (!chain) {
            const isTrapped = trapProp(base, prop, false, endPropHandler);
            if (isTrapped) {
              hit(source);
            }
            return;
          }
          if (base !== undefined && base[prop] === null) {
            trapProp(base, prop, true, inChainPropHandler);
            return;
          }
          if ((base instanceof Object || typeof base === "object") && isEmptyObject(base)) {
            trapProp(base, prop, true, inChainPropHandler);
          }
          const propValue = owner[prop];
          if (propValue instanceof Object || typeof propValue === "object" && propValue !== null) {
            setChainPropAccess(propValue, chain);
          }
          trapProp(base, prop, true, inChainPropHandler);
        };
        setChainPropAccess(window, property);
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function logMessage(source, message) {
        let forced = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        let convertMessageToString = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        const name = source.name,
          verbose = source.verbose;
        if (!forced && !verbose) {
          return;
        }
        const nativeConsole = console.log;
        if (!convertMessageToString) {
          nativeConsole("".concat(name, ":"), message);
          return;
        }
        nativeConsole("".concat(name, ": ").concat(message));
      }
      function getNumberFromString(rawString) {
        const parsedDelay = parseInt(rawString, 10);
        const validDelay = nativeIsNaN(parsedDelay) ? null : parsedDelay;
        return validDelay;
      }
      function noopArray() {
        return [];
      }
      function noopObject() {
        return {};
      }
      function noopFunc() {}
      function noopCallbackFunc() {
        return noopFunc;
      }
      function trueFunc() {
        return true;
      }
      function falseFunc() {
        return false;
      }
      function throwFunc() {
        throw new Error();
      }
      function noopPromiseReject() {
        return Promise.reject();
      }
      function noopPromiseResolve() {
        let responseBody = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "{}";
        let responseUrl = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "";
        let responseType = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "default";
        if (typeof Response === "undefined") {
          return;
        }
        const response = new Response(responseBody, {
          status: 200,
          statusText: "OK"
        });
        Object.defineProperties(response, {
          url: {
            value: responseUrl
          },
          type: {
            value: responseType
          }
        });
        return Promise.resolve(response);
      }
      function getPropertyInChain(base, chain) {
        const pos = chain.indexOf(".");
        if (pos === -1) {
          return {
            base: base,
            prop: chain
          };
        }
        const prop = chain.slice(0, pos);
        if (base === null) {
          return {
            base: base,
            prop: prop,
            chain: chain
          };
        }
        const nextBase = base[prop];
        chain = chain.slice(pos + 1);
        if ((base instanceof Object || typeof base === "object") && isEmptyObject(base)) {
          return {
            base: base,
            prop: prop,
            chain: chain
          };
        }
        if (nextBase === null) {
          return {
            base: base,
            prop: prop,
            chain: chain
          };
        }
        if (nextBase !== undefined) {
          return getPropertyInChain(nextBase, chain);
        }
        Object.defineProperty(base, prop, {
          configurable: true
        });
        return {
          base: base,
          prop: prop,
          chain: chain
        };
      }
      function matchStackTrace(stackMatch, stackTrace) {
        if (!stackMatch || stackMatch === "") {
          return true;
        }
        if (shouldAbortInlineOrInjectedScript(stackMatch, stackTrace)) {
          return true;
        }
        const stackRegexp = toRegExp(stackMatch);
        const refinedStackTrace = stackTrace.split("\n").slice(2).map(function (line) {
          return line.trim();
        }).join("\n");
        return getNativeRegexpTest().call(stackRegexp, refinedStackTrace);
      }
      function nativeIsNaN(num) {
        const native = Number.isNaN || window.isNaN;
        return native(num);
      }
      function isEmptyObject(obj) {
        return Object.keys(obj).length === 0 && !obj.prototype;
      }
      function shouldAbortInlineOrInjectedScript(stackMatch, stackTrace) {
        const INLINE_SCRIPT_STRING = "inlineScript";
        const INJECTED_SCRIPT_STRING = "injectedScript";
        const INJECTED_SCRIPT_MARKER = "<anonymous>";
        const isInlineScript = function isInlineScript(stackMatch) {
          return stackMatch.includes(INLINE_SCRIPT_STRING);
        };
        const isInjectedScript = function isInjectedScript(stackMatch) {
          return stackMatch.includes(INJECTED_SCRIPT_STRING);
        };
        if (!(isInlineScript(stackMatch) || isInjectedScript(stackMatch))) {
          return false;
        }
        let documentURL = window.location.href;
        const pos = documentURL.indexOf("#");
        if (pos !== -1) {
          documentURL = documentURL.slice(0, pos);
        }
        const stackSteps = stackTrace.split("\n").slice(2).map(function (line) {
          return line.trim();
        });
        const stackLines = stackSteps.map(function (line) {
          let stack;
          const getStackTraceURL = /(.*?@)?(\S+)(:\d+):\d+\)?$/.exec(line);
          if (getStackTraceURL) {
            var _stackURL, _stackURL2;
            let stackURL = getStackTraceURL[2];
            if ((_stackURL = stackURL) !== null && _stackURL !== void 0 && _stackURL.startsWith("(")) {
              stackURL = stackURL.slice(1);
            }
            if ((_stackURL2 = stackURL) !== null && _stackURL2 !== void 0 && _stackURL2.startsWith(INJECTED_SCRIPT_MARKER)) {
              var _stackFunction;
              stackURL = INJECTED_SCRIPT_STRING;
              let stackFunction = getStackTraceURL[1] !== undefined ? getStackTraceURL[1].slice(0, -1) : line.slice(0, getStackTraceURL.index).trim();
              if ((_stackFunction = stackFunction) !== null && _stackFunction !== void 0 && _stackFunction.startsWith("at")) {
                stackFunction = stackFunction.slice(2).trim();
              }
              stack = "".concat(stackFunction, " ").concat(stackURL).trim();
            } else {
              stack = stackURL;
            }
          } else {
            stack = line;
          }
          return stack;
        });
        if (stackLines) {
          for (let index = 0; index < stackLines.length; index += 1) {
            if (isInlineScript(stackMatch) && documentURL === stackLines[index]) {
              return true;
            }
            if (isInjectedScript(stackMatch) && stackLines[index].startsWith(INJECTED_SCRIPT_STRING)) {
              return true;
            }
          }
        }
        return false;
      }
      function getNativeRegexpTest() {
        return Object.getOwnPropertyDescriptor(RegExp.prototype, "test").value;
      }
      function toRegExp() {
        let input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
        const DEFAULT_VALUE = ".?";
        const FORWARD_SLASH = "/";
        if (input === "") {
          return new RegExp(DEFAULT_VALUE);
        }
        if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
          return new RegExp(input.slice(1, -1));
        }
        const escaped = input.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(escaped);
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        setConstant.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function setCookie(source, args) {
      function setCookie(source, name, value) {
        let path = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : "/";
        const validValue = getLimitedCookieValue(value);
        if (validValue === null) {
          logMessage(source, "Invalid cookie value: '".concat(validValue, "'"));
          return;
        }
        if (!isValidCookiePath(path)) {
          logMessage(source, "Invalid cookie path: '".concat(path, "'"));
          return;
        }
        const cookieToSet = concatCookieNameValuePath(name, validValue, path);
        if (!cookieToSet) {
          logMessage(source, "Invalid cookie name or value");
          return;
        }
        hit(source);
        document.cookie = cookieToSet;
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function logMessage(source, message) {
        let forced = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        let convertMessageToString = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        const name = source.name,
          verbose = source.verbose;
        if (!forced && !verbose) {
          return;
        }
        const nativeConsole = console.log;
        if (!convertMessageToString) {
          nativeConsole("".concat(name, ":"), message);
          return;
        }
        nativeConsole("".concat(name, ": ").concat(message));
      }
      function nativeIsNaN(num) {
        const native = Number.isNaN || window.isNaN;
        return native(num);
      }
      function getLimitedCookieValue(value) {
        if (!value) {
          return null;
        }
        let validValue;
        if (value === "true") {
          validValue = "true";
        } else if (value === "True") {
          validValue = "True";
        } else if (value === "false") {
          validValue = "false";
        } else if (value === "False") {
          validValue = "False";
        } else if (value === "yes") {
          validValue = "yes";
        } else if (value === "Yes") {
          validValue = "Yes";
        } else if (value === "Y") {
          validValue = "Y";
        } else if (value === "no") {
          validValue = "no";
        } else if (value === "ok") {
          validValue = "ok";
        } else if (value === "OK") {
          validValue = "OK";
        } else if (/^\d+$/.test(value)) {
          validValue = parseFloat(value);
          if (nativeIsNaN(validValue)) {
            return null;
          }
          if (Math.abs(validValue) < 0 || Math.abs(validValue) > 15) {
            return null;
          }
        } else {
          return null;
        }
        return validValue;
      }
      function concatCookieNameValuePath(rawName, rawValue, rawPath) {
        let shouldEncode = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        const COOKIE_BREAKER = ";";
        if (!shouldEncode && (rawName.includes(COOKIE_BREAKER) || "".concat(rawValue).includes(COOKIE_BREAKER))) {
          return null;
        }
        const name = shouldEncode ? encodeURIComponent(rawName) : rawName;
        const value = shouldEncode ? encodeURIComponent(rawValue) : rawValue;
        return "".concat(name, "=").concat(value, "; ").concat(getCookiePath(rawPath), ";");
      }
      function isValidCookiePath(rawPath) {
        return rawPath === "/" || rawPath === "none";
      }
      function getCookiePath(rawPath) {
        if (rawPath === "/") {
          return "path=/";
        }
        return "";
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        setCookie.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function setCookieReload(source, args) {
      function setCookieReload(source, name, value) {
        let path = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : "/";
        if (isCookieSetWithValue(document.cookie, name, value)) {
          return;
        }
        const validValue = getLimitedCookieValue(value);
        if (validValue === null) {
          logMessage(source, "Invalid cookie value: '".concat(value, "'"));
          return;
        }
        if (!isValidCookiePath(path)) {
          logMessage(source, "Invalid cookie path: '".concat(path, "'"));
          return;
        }
        const cookieToSet = concatCookieNameValuePath(name, validValue, path);
        if (!cookieToSet) {
          logMessage(source, "Invalid cookie name or value");
          return;
        }
        document.cookie = cookieToSet;
        hit(source);
        if (isCookieSetWithValue(document.cookie, name, value)) {
          window.location.reload();
        }
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function logMessage(source, message) {
        let forced = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        let convertMessageToString = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        const name = source.name,
          verbose = source.verbose;
        if (!forced && !verbose) {
          return;
        }
        const nativeConsole = console.log;
        if (!convertMessageToString) {
          nativeConsole("".concat(name, ":"), message);
          return;
        }
        nativeConsole("".concat(name, ": ").concat(message));
      }
      function nativeIsNaN(num) {
        const native = Number.isNaN || window.isNaN;
        return native(num);
      }
      function isCookieSetWithValue(cookieString, name, value) {
        return cookieString.split(";").some(function (cookieStr) {
          const pos = cookieStr.indexOf("=");
          if (pos === -1) {
            return false;
          }
          const cookieName = cookieStr.slice(0, pos).trim();
          const cookieValue = cookieStr.slice(pos + 1).trim();
          return name === cookieName && value === cookieValue;
        });
      }
      function getLimitedCookieValue(value) {
        if (!value) {
          return null;
        }
        let validValue;
        if (value === "true") {
          validValue = "true";
        } else if (value === "True") {
          validValue = "True";
        } else if (value === "false") {
          validValue = "false";
        } else if (value === "False") {
          validValue = "False";
        } else if (value === "yes") {
          validValue = "yes";
        } else if (value === "Yes") {
          validValue = "Yes";
        } else if (value === "Y") {
          validValue = "Y";
        } else if (value === "no") {
          validValue = "no";
        } else if (value === "ok") {
          validValue = "ok";
        } else if (value === "OK") {
          validValue = "OK";
        } else if (/^\d+$/.test(value)) {
          validValue = parseFloat(value);
          if (nativeIsNaN(validValue)) {
            return null;
          }
          if (Math.abs(validValue) < 0 || Math.abs(validValue) > 15) {
            return null;
          }
        } else {
          return null;
        }
        return validValue;
      }
      function concatCookieNameValuePath(rawName, rawValue, rawPath) {
        let shouldEncode = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        const COOKIE_BREAKER = ";";
        if (!shouldEncode && (rawName.includes(COOKIE_BREAKER) || "".concat(rawValue).includes(COOKIE_BREAKER))) {
          return null;
        }
        const name = shouldEncode ? encodeURIComponent(rawName) : rawName;
        const value = shouldEncode ? encodeURIComponent(rawValue) : rawValue;
        return "".concat(name, "=").concat(value, "; ").concat(getCookiePath(rawPath), ";");
      }
      function isValidCookiePath(rawPath) {
        return rawPath === "/" || rawPath === "none";
      }
      function getCookiePath(rawPath) {
        if (rawPath === "/") {
          return "path=/";
        }
        return "";
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        setCookieReload.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function setLocalStorageItem(source, args) {
      function setLocalStorageItem(source, key, value) {
        if (typeof key === "undefined") {
          logMessage(source, "Item key should be specified.");
          return;
        }
        let validValue;
        try {
          validValue = getLimitedStorageItemValue(value);
        } catch (_unused) {
          logMessage(source, "Invalid storage item value: '".concat(value, "'"));
          return;
        }
        const _window = window,
          localStorage = _window.localStorage;
        setStorageItem(source, localStorage, key, validValue);
        hit(source);
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function logMessage(source, message) {
        let forced = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        let convertMessageToString = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        const name = source.name,
          verbose = source.verbose;
        if (!forced && !verbose) {
          return;
        }
        const nativeConsole = console.log;
        if (!convertMessageToString) {
          nativeConsole("".concat(name, ":"), message);
          return;
        }
        nativeConsole("".concat(name, ": ").concat(message));
      }
      function nativeIsNaN(num) {
        const native = Number.isNaN || window.isNaN;
        return native(num);
      }
      function setStorageItem(source, storage, key, value) {
        try {
          storage.setItem(key, value);
        } catch (e) {
          const message = "Unable to set sessionStorage item due to: ".concat(e.message);
          logMessage(source, message);
        }
      }
      function getLimitedStorageItemValue(value) {
        if (typeof value !== "string") {
          throw new Error("Invalid value");
        }
        let validValue;
        if (value === "undefined") {
          validValue = undefined;
        } else if (value === "false") {
          validValue = false;
        } else if (value === "true") {
          validValue = true;
        } else if (value === "null") {
          validValue = null;
        } else if (value === "emptyArr") {
          validValue = "[]";
        } else if (value === "emptyObj") {
          validValue = "{}";
        } else if (value === "") {
          validValue = "";
        } else if (/^\d+$/.test(value)) {
          validValue = parseFloat(value);
          if (nativeIsNaN(validValue)) {
            throw new Error("Invalid value");
          }
          if (Math.abs(validValue) > 32767) {
            throw new Error("Invalid value");
          }
        } else if (value === "yes") {
          validValue = "yes";
        } else if (value === "no") {
          validValue = "no";
        } else {
          throw new Error("Invalid value");
        }
        return validValue;
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        setLocalStorageItem.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function setPopadsDummy(source, args) {
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
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        setPopadsDummy.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function setSessionStorageItem(source, args) {
      function setSessionStorageItem(source, key, value) {
        if (typeof key === "undefined") {
          logMessage(source, "Item key should be specified.");
          return;
        }
        let validValue;
        try {
          validValue = getLimitedStorageItemValue(value);
        } catch (_unused) {
          logMessage(source, "Invalid storage item value: '".concat(value, "'"));
          return;
        }
        const _window = window,
          sessionStorage = _window.sessionStorage;
        setStorageItem(source, sessionStorage, key, validValue);
        hit(source);
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function logMessage(source, message) {
        let forced = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        let convertMessageToString = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        const name = source.name,
          verbose = source.verbose;
        if (!forced && !verbose) {
          return;
        }
        const nativeConsole = console.log;
        if (!convertMessageToString) {
          nativeConsole("".concat(name, ":"), message);
          return;
        }
        nativeConsole("".concat(name, ": ").concat(message));
      }
      function nativeIsNaN(num) {
        const native = Number.isNaN || window.isNaN;
        return native(num);
      }
      function setStorageItem(source, storage, key, value) {
        try {
          storage.setItem(key, value);
        } catch (e) {
          const message = "Unable to set sessionStorage item due to: ".concat(e.message);
          logMessage(source, message);
        }
      }
      function getLimitedStorageItemValue(value) {
        if (typeof value !== "string") {
          throw new Error("Invalid value");
        }
        let validValue;
        if (value === "undefined") {
          validValue = undefined;
        } else if (value === "false") {
          validValue = false;
        } else if (value === "true") {
          validValue = true;
        } else if (value === "null") {
          validValue = null;
        } else if (value === "emptyArr") {
          validValue = "[]";
        } else if (value === "emptyObj") {
          validValue = "{}";
        } else if (value === "") {
          validValue = "";
        } else if (/^\d+$/.test(value)) {
          validValue = parseFloat(value);
          if (nativeIsNaN(validValue)) {
            throw new Error("Invalid value");
          }
          if (Math.abs(validValue) > 32767) {
            throw new Error("Invalid value");
          }
        } else if (value === "yes") {
          validValue = "yes";
        } else if (value === "no") {
          validValue = "no";
        } else {
          throw new Error("Invalid value");
        }
        return validValue;
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        setSessionStorageItem.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function trustedClickElement(source, args) {
      function trustedClickElement(source, selectors) {
        let extraMatch = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "";
        let delay = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : NaN;
        if (!selectors) {
          return;
        }
        const OBSERVER_TIMEOUT_MS = 1e4;
        const THROTTLE_DELAY_MS = 20;
        const STATIC_CLICK_DELAY_MS = 150;
        const COOKIE_MATCH_MARKER = "cookie:";
        const LOCAL_STORAGE_MATCH_MARKER = "localStorage:";
        const SELECTORS_DELIMITER = ",";
        const COOKIE_STRING_DELIMITER = ";";
        const EXTRA_MATCH_DELIMITER = /(,\s*){1}(?=!?cookie:|!?localStorage:)/;
        const sleep = function sleep(delayMs) {
          return new Promise(function (resolve) {
            return setTimeout(resolve, delayMs);
          });
        };
        let parsedDelay;
        if (delay) {
          parsedDelay = parseInt(delay, 10);
          const isValidDelay = !Number.isNaN(parsedDelay) || parsedDelay < OBSERVER_TIMEOUT_MS;
          if (!isValidDelay) {
            const message = "Passed delay '".concat(delay, "' is invalid or bigger than ").concat(OBSERVER_TIMEOUT_MS, " ms");
            logMessage(source, message);
            return;
          }
        }
        let canClick = !parsedDelay;
        const cookieMatches = [];
        const localStorageMatches = [];
        let isInvertedMatchCookie = false;
        let isInvertedMatchLocalStorage = false;
        if (extraMatch) {
          const parsedExtraMatch = extraMatch.split(EXTRA_MATCH_DELIMITER).map(function (matchStr) {
            return matchStr.trim();
          });
          parsedExtraMatch.forEach(function (matchStr) {
            if (matchStr.includes(COOKIE_MATCH_MARKER)) {
              const _parseMatchArg = parseMatchArg(matchStr),
                isInvertedMatch = _parseMatchArg.isInvertedMatch,
                matchValue = _parseMatchArg.matchValue;
              isInvertedMatchCookie = isInvertedMatch;
              const cookieMatch = matchValue.replace(COOKIE_MATCH_MARKER, "");
              cookieMatches.push(cookieMatch);
            }
            if (matchStr.includes(LOCAL_STORAGE_MATCH_MARKER)) {
              const _parseMatchArg2 = parseMatchArg(matchStr),
                isInvertedMatch = _parseMatchArg2.isInvertedMatch,
                matchValue = _parseMatchArg2.matchValue;
              isInvertedMatchLocalStorage = isInvertedMatch;
              const localStorageMatch = matchValue.replace(LOCAL_STORAGE_MATCH_MARKER, "");
              localStorageMatches.push(localStorageMatch);
            }
          });
        }
        if (cookieMatches.length > 0) {
          const parsedCookieMatches = parseCookieString(cookieMatches.join(COOKIE_STRING_DELIMITER));
          const parsedCookies = parseCookieString(document.cookie);
          const cookieKeys = Object.keys(parsedCookies);
          if (cookieKeys.length === 0) {
            return;
          }
          const cookiesMatched = Object.keys(parsedCookieMatches).every(function (key) {
            const valueMatch = parsedCookieMatches[key] ? toRegExp(parsedCookieMatches[key]) : null;
            const keyMatch = toRegExp(key);
            return cookieKeys.some(function (key) {
              const keysMatched = keyMatch.test(key);
              if (!keysMatched) {
                return false;
              }
              if (!valueMatch) {
                return true;
              }
              return valueMatch.test(parsedCookies[key]);
            });
          });
          const shouldRun = cookiesMatched !== isInvertedMatchCookie;
          if (!shouldRun) {
            return;
          }
        }
        if (localStorageMatches.length > 0) {
          const localStorageMatched = localStorageMatches.every(function (str) {
            const itemValue = window.localStorage.getItem(str);
            return itemValue || itemValue === "";
          });
          const shouldRun = localStorageMatched !== isInvertedMatchLocalStorage;
          if (!shouldRun) {
            return;
          }
        }
        let selectorsSequence = selectors.split(SELECTORS_DELIMITER).map(function (selector) {
          return selector.trim();
        });
        const createElementObj = function createElementObj(element) {
          return {
            element: element || null,
            clicked: false
          };
        };
        const elementsSequence = Array(selectorsSequence.length).fill(createElementObj());
        const clickElementsBySequence = async function clickElementsBySequence() {
          for (let i = 0; i < elementsSequence.length; i += 1) {
            const elementObj = elementsSequence[i];
            if (i >= 1) {
              await sleep(STATIC_CLICK_DELAY_MS);
            }
            if (!elementObj.element) {
              break;
            }
            if (!elementObj.clicked) {
              elementObj.element.click();
              elementObj.clicked = true;
            }
          }
          const allElementsClicked = elementsSequence.every(function (elementObj) {
            return elementObj.clicked === true;
          });
          if (allElementsClicked) {
            hit(source);
          }
        };
        const handleElement = function handleElement(element, i) {
          const elementObj = createElementObj(element);
          elementsSequence[i] = elementObj;
          if (canClick) {
            clickElementsBySequence();
          }
        };
        const findElements = function findElements(mutations, observer) {
          const fulfilledSelectors = [];
          selectorsSequence.forEach(function (selector, i) {
            if (!selector) {
              return;
            }
            const element = document.querySelector(selector);
            if (!element) {
              return;
            }
            handleElement(element, i);
            fulfilledSelectors.push(selector);
          });
          selectorsSequence = selectorsSequence.map(function (selector) {
            return fulfilledSelectors.includes(selector) ? null : selector;
          });
          const allSelectorsFulfilled = selectorsSequence.every(function (selector) {
            return selector === null;
          });
          if (allSelectorsFulfilled) {
            observer.disconnect();
          }
        };
        const observer = new MutationObserver(throttle(findElements, THROTTLE_DELAY_MS));
        observer.observe(document.documentElement, {
          attributes: true,
          childList: true,
          subtree: true
        });
        if (parsedDelay) {
          setTimeout(function () {
            clickElementsBySequence();
            canClick = true;
          }, parsedDelay);
        }
        setTimeout(function () {
          return observer.disconnect();
        }, OBSERVER_TIMEOUT_MS);
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function toRegExp() {
        let input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
        const DEFAULT_VALUE = ".?";
        const FORWARD_SLASH = "/";
        if (input === "") {
          return new RegExp(DEFAULT_VALUE);
        }
        if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
          return new RegExp(input.slice(1, -1));
        }
        const escaped = input.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(escaped);
      }
      function parseCookieString(cookieString) {
        const COOKIE_DELIMITER = "=";
        const COOKIE_PAIRS_DELIMITER = ";";
        const cookieChunks = cookieString.split(COOKIE_PAIRS_DELIMITER);
        const cookieData = {};
        cookieChunks.forEach(function (singleCookie) {
          let cookieKey;
          let cookieValue;
          const delimiterIndex = singleCookie.indexOf(COOKIE_DELIMITER);
          if (delimiterIndex === -1) {
            cookieKey = singleCookie.trim();
          } else {
            cookieKey = singleCookie.slice(0, delimiterIndex).trim();
            cookieValue = singleCookie.slice(delimiterIndex + 1);
          }
          cookieData[cookieKey] = cookieValue || null;
        });
        return cookieData;
      }
      function throttle(cb, delay) {
        let wait = false;
        let savedArgs;
        const wrapper = function wrapper() {
          for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }
          if (wait) {
            savedArgs = args;
            return;
          }
          cb(...args);
          wait = true;
          setTimeout(function () {
            wait = false;
            if (savedArgs) {
              wrapper(...savedArgs);
              savedArgs = null;
            }
          }, delay);
        };
        return wrapper;
      }
      function logMessage(source, message) {
        let forced = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        let convertMessageToString = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        const name = source.name,
          verbose = source.verbose;
        if (!forced && !verbose) {
          return;
        }
        const nativeConsole = console.log;
        if (!convertMessageToString) {
          nativeConsole("".concat(name, ":"), message);
          return;
        }
        nativeConsole("".concat(name, ": ").concat(message));
      }
      function parseMatchArg(match) {
        const INVERT_MARKER = "!";
        const isInvertedMatch = match ? match === null || match === void 0 ? void 0 : match.startsWith(INVERT_MARKER) : false;
        const matchValue = isInvertedMatch ? match.slice(1) : match;
        const matchRegexp = toRegExp(matchValue);
        return {
          isInvertedMatch: isInvertedMatch,
          matchRegexp: matchRegexp,
          matchValue: matchValue
        };
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        trustedClickElement.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function trustedReplaceFetchResponse(source, args) {
      function trustedReplaceFetchResponse(source) {
        let pattern = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "";
        let replacement = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "";
        let propsToMatch = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : "";
        if (typeof fetch === "undefined" || typeof Proxy === "undefined" || typeof Response === "undefined") {
          return;
        }
        if (pattern === "" && replacement !== "") {
          logMessage(source, "Pattern argument should not be empty string");
          return;
        }
        const shouldLog = pattern === "" && replacement === "";
        const nativeFetch = fetch;
        let shouldReplace = false;
        let fetchData;
        const handlerWrapper = function handlerWrapper(target, thisArg, args) {
          fetchData = getFetchData(args);
          if (shouldLog) {
            logMessage(source, "fetch( ".concat(objectToString(fetchData), " )"), true);
            hit(source);
            return Reflect.apply(target, thisArg, args);
          }
          shouldReplace = matchRequestProps(source, propsToMatch, fetchData);
          if (!shouldReplace) {
            return Reflect.apply(target, thisArg, args);
          }
          const forgeResponse = function forgeResponse(response, textContent) {
            const bodyUsed = response.bodyUsed,
              headers = response.headers,
              ok = response.ok,
              redirected = response.redirected,
              status = response.status,
              statusText = response.statusText,
              type = response.type,
              url = response.url;
            const forgedResponse = new Response(textContent, {
              status: status,
              statusText: statusText,
              headers: headers
            });
            Object.defineProperties(forgedResponse, {
              url: {
                value: url
              },
              type: {
                value: type
              },
              ok: {
                value: ok
              },
              bodyUsed: {
                value: bodyUsed
              },
              redirected: {
                value: redirected
              }
            });
            return forgedResponse;
          };
          return nativeFetch.apply(null, args).then(function (response) {
            return response.text().then(function (bodyText) {
              const patternRegexp = pattern === "*" ? /(\n|.)*/ : toRegExp(pattern);
              const modifiedTextContent = bodyText.replace(patternRegexp, replacement);
              const forgedResponse = forgeResponse(response, modifiedTextContent);
              hit(source);
              return forgedResponse;
            }).catch(function () {
              const fetchDataStr = objectToString(fetchData);
              const message = "Response body can't be converted to text: ".concat(fetchDataStr);
              logMessage(source, message);
              return Reflect.apply(target, thisArg, args);
            });
          }).catch(function () {
            return Reflect.apply(target, thisArg, args);
          });
        };
        const fetchHandler = {
          apply: handlerWrapper
        };
        fetch = new Proxy(fetch, fetchHandler);
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function logMessage(source, message) {
        let forced = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        let convertMessageToString = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        const name = source.name,
          verbose = source.verbose;
        if (!forced && !verbose) {
          return;
        }
        const nativeConsole = console.log;
        if (!convertMessageToString) {
          nativeConsole("".concat(name, ":"), message);
          return;
        }
        nativeConsole("".concat(name, ": ").concat(message));
      }
      function getFetchData(args) {
        const fetchPropsObj = {};
        let fetchUrl;
        let fetchInit;
        if (args[0] instanceof Request) {
          const requestData = getRequestData(args[0]);
          fetchUrl = requestData.url;
          fetchInit = requestData;
        } else {
          fetchUrl = args[0];
          fetchInit = args[1];
        }
        fetchPropsObj.url = fetchUrl;
        if (fetchInit instanceof Object) {
          Object.keys(fetchInit).forEach(function (prop) {
            fetchPropsObj[prop] = fetchInit[prop];
          });
        }
        return fetchPropsObj;
      }
      function objectToString(obj) {
        if (!obj || typeof obj !== "object") {
          return String(obj);
        }
        return isEmptyObject(obj) ? "{}" : Object.entries(obj).map(function (pair) {
          const key = pair[0];
          const value = pair[1];
          let recordValueStr = value;
          if (value instanceof Object) {
            recordValueStr = "{ ".concat(objectToString(value), " }");
          }
          return "".concat(key, ':"').concat(recordValueStr, '"');
        }).join(" ");
      }
      function matchRequestProps(source, propsToMatch, requestData) {
        if (propsToMatch === "" || propsToMatch === "*") {
          return true;
        }
        let isMatched;
        const parsedData = parseMatchProps(propsToMatch);
        if (!validateParsedData(parsedData)) {
          logMessage(source, "Invalid parameter: ".concat(propsToMatch));
          isMatched = false;
        } else {
          const matchData = getMatchPropsData(parsedData);
          isMatched = Object.keys(matchData).every(function (matchKey) {
            const matchValue = matchData[matchKey];
            return Object.prototype.hasOwnProperty.call(requestData, matchKey) && matchValue.test(requestData[matchKey]);
          });
        }
        return isMatched;
      }
      function toRegExp() {
        let input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
        const DEFAULT_VALUE = ".?";
        const FORWARD_SLASH = "/";
        if (input === "") {
          return new RegExp(DEFAULT_VALUE);
        }
        if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
          return new RegExp(input.slice(1, -1));
        }
        const escaped = input.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(escaped);
      }
      function isValidStrPattern(input) {
        const FORWARD_SLASH = "/";
        let str = escapeRegExp(input);
        if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
          str = input.slice(1, -1);
        }
        let isValid;
        try {
          isValid = new RegExp(str);
          isValid = true;
        } catch (e) {
          isValid = false;
        }
        return isValid;
      }
      function escapeRegExp(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }
      function isEmptyObject(obj) {
        return Object.keys(obj).length === 0 && !obj.prototype;
      }
      function getRequestData(request) {
        const requestInitOptions = getRequestProps();
        const entries = requestInitOptions.map(function (key) {
          const value = request[key];
          return [key, value];
        });
        return Object.fromEntries(entries);
      }
      function getRequestProps() {
        return ["url", "method", "headers", "body", "mode", "credentials", "cache", "redirect", "referrer", "referrerPolicy", "integrity", "keepalive", "signal"];
      }
      function parseMatchProps(propsToMatchStr) {
        const PROPS_DIVIDER = " ";
        const PAIRS_MARKER = ":";
        const LEGAL_MATCH_PROPS = getRequestProps();
        const propsObj = {};
        const props = propsToMatchStr.split(PROPS_DIVIDER);
        props.forEach(function (prop) {
          const dividerInd = prop.indexOf(PAIRS_MARKER);
          const key = prop.slice(0, dividerInd);
          const hasLegalMatchProp = LEGAL_MATCH_PROPS.includes(key);
          if (hasLegalMatchProp) {
            const value = prop.slice(dividerInd + 1);
            propsObj[key] = value;
          } else {
            propsObj.url = prop;
          }
        });
        return propsObj;
      }
      function validateParsedData(data) {
        return Object.values(data).every(function (value) {
          return isValidStrPattern(value);
        });
      }
      function getMatchPropsData(data) {
        const matchData = {};
        Object.keys(data).forEach(function (key) {
          matchData[key] = toRegExp(data[key]);
        });
        return matchData;
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        trustedReplaceFetchResponse.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function trustedReplaceNodeText(source, args) {
      function trustedReplaceNodeText(source, nodeName, textMatch, pattern, replacement) {
        const uboAliases = ["replace-node-text.js", "rpnt.js", "sed.js"];
        if (uboAliases.includes(source.name)) {
          replacement = pattern;
          pattern = textMatch;
          for (var _len = arguments.length, extraArgs = new Array(_len > 5 ? _len - 5 : 0), _key = 5; _key < _len; _key++) {
            extraArgs[_key - 5] = arguments[_key];
          }
          for (let i = 0; i < extraArgs.length; i += 1) {
            const arg = extraArgs[i];
            if (arg === "condition") {
              textMatch = extraArgs[i + 1];
              break;
            }
          }
        }
        const _parseNodeTextParams = parseNodeTextParams(nodeName, textMatch, pattern),
          selector = _parseNodeTextParams.selector,
          nodeNameMatch = _parseNodeTextParams.nodeNameMatch,
          textContentMatch = _parseNodeTextParams.textContentMatch,
          patternMatch = _parseNodeTextParams.patternMatch;
        const handleNodes = function handleNodes(nodes) {
          return nodes.forEach(function (node) {
            const shouldReplace = isTargetNode(node, nodeNameMatch, textContentMatch);
            if (shouldReplace) {
              replaceNodeText(source, node, patternMatch, replacement);
            }
          });
        };
        if (document.documentElement) {
          handleExistingNodes(selector, handleNodes);
        }
        observeDocumentWithTimeout(function (mutations) {
          return handleMutations(mutations, handleNodes);
        }, {
          childList: true,
          subtree: true
        });
      }
      function observeDocumentWithTimeout(callback, options) {
        let timeout = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1e4;
        const observer = new MutationObserver(function (mutations, observer) {
          observer.disconnect();
          callback(mutations);
          observer.observe(document.documentElement, options);
        });
        observer.observe(document.documentElement, options);
        if (typeof timeout === "number") {
          setTimeout(function () {
            return observer.disconnect();
          }, timeout);
        }
      }
      function handleExistingNodes(selector, handler) {
        const nodeList = document.querySelectorAll(selector);
        const nodes = nodeListToArray(nodeList);
        handler(nodes);
      }
      function handleMutations(mutations, handler) {
        const addedNodes = getAddedNodes(mutations);
        handler(addedNodes);
      }
      function replaceNodeText(source, node, pattern, replacement) {
        node.textContent = node.textContent.replace(pattern, replacement);
        hit(source);
      }
      function isTargetNode(node, nodeNameMatch, textContentMatch) {
        const nodeName = node.nodeName,
          textContent = node.textContent;
        const nodeNameLowerCase = nodeName.toLowerCase();
        return textContent !== "" && (nodeNameMatch instanceof RegExp ? nodeNameMatch.test(nodeNameLowerCase) : nodeNameMatch === nodeNameLowerCase) && (textContentMatch instanceof RegExp ? textContentMatch.test(textContent) : textContent.includes(textContentMatch));
      }
      function parseNodeTextParams(nodeName, textMatch) {
        let pattern = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
        const REGEXP_START_MARKER = "/";
        const isStringNameMatch = !(nodeName.startsWith(REGEXP_START_MARKER) && nodeName.endsWith(REGEXP_START_MARKER));
        const selector = isStringNameMatch ? nodeName : "*";
        const nodeNameMatch = isStringNameMatch ? nodeName : toRegExp(nodeName);
        const textContentMatch = !textMatch.startsWith(REGEXP_START_MARKER) ? textMatch : toRegExp(textMatch);
        let patternMatch;
        if (pattern) {
          patternMatch = !pattern.startsWith(REGEXP_START_MARKER) ? pattern : toRegExp(pattern);
        }
        return {
          selector: selector,
          nodeNameMatch: nodeNameMatch,
          textContentMatch: textContentMatch,
          patternMatch: patternMatch
        };
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function nodeListToArray(nodeList) {
        const nodes = [];
        for (let i = 0; i < nodeList.length; i += 1) {
          nodes.push(nodeList[i]);
        }
        return nodes;
      }
      function getAddedNodes(mutations) {
        const nodes = [];
        for (let i = 0; i < mutations.length; i += 1) {
          const addedNodes = mutations[i].addedNodes;
          for (let j = 0; j < addedNodes.length; j += 1) {
            nodes.push(addedNodes[j]);
          }
        }
        return nodes;
      }
      function toRegExp() {
        let input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
        const DEFAULT_VALUE = ".?";
        const FORWARD_SLASH = "/";
        if (input === "") {
          return new RegExp(DEFAULT_VALUE);
        }
        if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
          return new RegExp(input.slice(1, -1));
        }
        const escaped = input.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(escaped);
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        trustedReplaceNodeText.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function trustedReplaceXhrResponse(source, args) {
      function trustedReplaceXhrResponse(source) {
        let pattern = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "";
        let replacement = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "";
        let propsToMatch = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : "";
        if (typeof Proxy === "undefined") {
          return;
        }
        if (pattern === "" && replacement !== "") {
          const message = "Pattern argument should not be empty string.";
          logMessage(source, message);
          return;
        }
        const shouldLog = pattern === "" && replacement === "";
        const nativeOpen = window.XMLHttpRequest.prototype.open;
        const nativeSend = window.XMLHttpRequest.prototype.send;
        let xhrData;
        const openWrapper = function openWrapper(target, thisArg, args) {
          xhrData = getXhrData.apply(null, args);
          if (shouldLog) {
            const message = "xhr( ".concat(objectToString(xhrData), " )");
            logMessage(source, message, true);
            hit(source);
            return Reflect.apply(target, thisArg, args);
          }
          if (matchRequestProps(source, propsToMatch, xhrData)) {
            thisArg.shouldBePrevented = true;
          }
          if (thisArg.shouldBePrevented) {
            thisArg.collectedHeaders = [];
            const setRequestHeaderWrapper = function setRequestHeaderWrapper(target, thisArg, args) {
              thisArg.collectedHeaders.push(args);
              return Reflect.apply(target, thisArg, args);
            };
            const setRequestHeaderHandler = {
              apply: setRequestHeaderWrapper
            };
            thisArg.setRequestHeader = new Proxy(thisArg.setRequestHeader, setRequestHeaderHandler);
          }
          return Reflect.apply(target, thisArg, args);
        };
        const sendWrapper = function sendWrapper(target, thisArg, args) {
          if (!thisArg.shouldBePrevented) {
            return Reflect.apply(target, thisArg, args);
          }
          const forgedRequest = new XMLHttpRequest();
          forgedRequest.addEventListener("readystatechange", function () {
            if (forgedRequest.readyState !== 4) {
              return;
            }
            const readyState = forgedRequest.readyState,
              response = forgedRequest.response,
              responseText = forgedRequest.responseText,
              responseURL = forgedRequest.responseURL,
              responseXML = forgedRequest.responseXML,
              status = forgedRequest.status,
              statusText = forgedRequest.statusText;
            const content = responseText || response;
            if (typeof content !== "string") {
              return;
            }
            const patternRegexp = pattern === "*" ? /(\n|.)*/ : toRegExp(pattern);
            const modifiedContent = content.replace(patternRegexp, replacement);
            Object.defineProperties(thisArg, {
              readyState: {
                value: readyState,
                writable: false
              },
              responseURL: {
                value: responseURL,
                writable: false
              },
              responseXML: {
                value: responseXML,
                writable: false
              },
              status: {
                value: status,
                writable: false
              },
              statusText: {
                value: statusText,
                writable: false
              },
              response: {
                value: modifiedContent,
                writable: false
              },
              responseText: {
                value: modifiedContent,
                writable: false
              }
            });
            setTimeout(function () {
              const stateEvent = new Event("readystatechange");
              thisArg.dispatchEvent(stateEvent);
              const loadEvent = new Event("load");
              thisArg.dispatchEvent(loadEvent);
              const loadEndEvent = new Event("loadend");
              thisArg.dispatchEvent(loadEndEvent);
            }, 1);
            hit(source);
          });
          nativeOpen.apply(forgedRequest, [xhrData.method, xhrData.url]);
          thisArg.collectedHeaders.forEach(function (header) {
            const name = header[0];
            const value = header[1];
            forgedRequest.setRequestHeader(name, value);
          });
          thisArg.collectedHeaders = [];
          try {
            nativeSend.call(forgedRequest, args);
          } catch (_unused) {
            return Reflect.apply(target, thisArg, args);
          }
          return undefined;
        };
        const openHandler = {
          apply: openWrapper
        };
        const sendHandler = {
          apply: sendWrapper
        };
        XMLHttpRequest.prototype.open = new Proxy(XMLHttpRequest.prototype.open, openHandler);
        XMLHttpRequest.prototype.send = new Proxy(XMLHttpRequest.prototype.send, sendHandler);
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function logMessage(source, message) {
        let forced = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        let convertMessageToString = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        const name = source.name,
          verbose = source.verbose;
        if (!forced && !verbose) {
          return;
        }
        const nativeConsole = console.log;
        if (!convertMessageToString) {
          nativeConsole("".concat(name, ":"), message);
          return;
        }
        nativeConsole("".concat(name, ": ").concat(message));
      }
      function toRegExp() {
        let input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
        const DEFAULT_VALUE = ".?";
        const FORWARD_SLASH = "/";
        if (input === "") {
          return new RegExp(DEFAULT_VALUE);
        }
        if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
          return new RegExp(input.slice(1, -1));
        }
        const escaped = input.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(escaped);
      }
      function objectToString(obj) {
        if (!obj || typeof obj !== "object") {
          return String(obj);
        }
        return isEmptyObject(obj) ? "{}" : Object.entries(obj).map(function (pair) {
          const key = pair[0];
          const value = pair[1];
          let recordValueStr = value;
          if (value instanceof Object) {
            recordValueStr = "{ ".concat(objectToString(value), " }");
          }
          return "".concat(key, ':"').concat(recordValueStr, '"');
        }).join(" ");
      }
      function matchRequestProps(source, propsToMatch, requestData) {
        if (propsToMatch === "" || propsToMatch === "*") {
          return true;
        }
        let isMatched;
        const parsedData = parseMatchProps(propsToMatch);
        if (!validateParsedData(parsedData)) {
          logMessage(source, "Invalid parameter: ".concat(propsToMatch));
          isMatched = false;
        } else {
          const matchData = getMatchPropsData(parsedData);
          isMatched = Object.keys(matchData).every(function (matchKey) {
            const matchValue = matchData[matchKey];
            return Object.prototype.hasOwnProperty.call(requestData, matchKey) && matchValue.test(requestData[matchKey]);
          });
        }
        return isMatched;
      }
      function getXhrData(method, url, async, user, password) {
        return {
          method: method,
          url: url,
          async: async,
          user: user,
          password: password
        };
      }
      function getMatchPropsData(data) {
        const matchData = {};
        Object.keys(data).forEach(function (key) {
          matchData[key] = toRegExp(data[key]);
        });
        return matchData;
      }
      function getRequestProps() {
        return ["url", "method", "headers", "body", "mode", "credentials", "cache", "redirect", "referrer", "referrerPolicy", "integrity", "keepalive", "signal"];
      }
      function validateParsedData(data) {
        return Object.values(data).every(function (value) {
          return isValidStrPattern(value);
        });
      }
      function parseMatchProps(propsToMatchStr) {
        const PROPS_DIVIDER = " ";
        const PAIRS_MARKER = ":";
        const LEGAL_MATCH_PROPS = getRequestProps();
        const propsObj = {};
        const props = propsToMatchStr.split(PROPS_DIVIDER);
        props.forEach(function (prop) {
          const dividerInd = prop.indexOf(PAIRS_MARKER);
          const key = prop.slice(0, dividerInd);
          const hasLegalMatchProp = LEGAL_MATCH_PROPS.includes(key);
          if (hasLegalMatchProp) {
            const value = prop.slice(dividerInd + 1);
            propsObj[key] = value;
          } else {
            propsObj.url = prop;
          }
        });
        return propsObj;
      }
      function isValidStrPattern(input) {
        const FORWARD_SLASH = "/";
        let str = escapeRegExp(input);
        if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
          str = input.slice(1, -1);
        }
        let isValid;
        try {
          isValid = new RegExp(str);
          isValid = true;
        } catch (e) {
          isValid = false;
        }
        return isValid;
      }
      function escapeRegExp(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }
      function isEmptyObject(obj) {
        return Object.keys(obj).length === 0 && !obj.prototype;
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        trustedReplaceXhrResponse.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function trustedSetConstant(source, args) {
      function trustedSetConstant(source, property, value, stack) {
        if (!property || !matchStackTrace(stack, new Error().stack)) {
          return;
        }
        let constantValue;
        try {
          constantValue = inferValue(value);
        } catch (e) {
          logMessage(source, e);
          return;
        }
        let canceled = false;
        const mustCancel = function mustCancel(value) {
          if (canceled) {
            return canceled;
          }
          canceled = value !== undefined && constantValue !== undefined && typeof value !== typeof constantValue && value !== null;
          return canceled;
        };
        const trapProp = function trapProp(base, prop, configurable, handler) {
          if (!handler.init(base[prop])) {
            return false;
          }
          const origDescriptor = Object.getOwnPropertyDescriptor(base, prop);
          let prevSetter;
          if (origDescriptor instanceof Object) {
            if (!origDescriptor.configurable) {
              const message = "Property '".concat(prop, "' is not configurable");
              logMessage(source, message);
              return false;
            }
            base[prop] = constantValue;
            if (origDescriptor.set instanceof Function) {
              prevSetter = origDescriptor.set;
            }
          }
          Object.defineProperty(base, prop, {
            configurable: configurable,
            get() {
              return handler.get();
            },
            set(a) {
              if (prevSetter !== undefined) {
                prevSetter(a);
              }
              handler.set(a);
            }
          });
          return true;
        };
        const setChainPropAccess = function setChainPropAccess(owner, property) {
          const chainInfo = getPropertyInChain(owner, property);
          const base = chainInfo.base;
          const prop = chainInfo.prop,
            chain = chainInfo.chain;
          const inChainPropHandler = {
            factValue: undefined,
            init(a) {
              this.factValue = a;
              return true;
            },
            get() {
              return this.factValue;
            },
            set(a) {
              if (this.factValue === a) {
                return;
              }
              this.factValue = a;
              if (a instanceof Object) {
                setChainPropAccess(a, chain);
              }
            }
          };
          const endPropHandler = {
            init(a) {
              if (mustCancel(a)) {
                return false;
              }
              return true;
            },
            get() {
              return constantValue;
            },
            set(a) {
              if (!mustCancel(a)) {
                return;
              }
              constantValue = a;
            }
          };
          if (!chain) {
            const isTrapped = trapProp(base, prop, false, endPropHandler);
            if (isTrapped) {
              hit(source);
            }
            return;
          }
          if (base !== undefined && base[prop] === null) {
            trapProp(base, prop, true, inChainPropHandler);
            return;
          }
          if ((base instanceof Object || typeof base === "object") && isEmptyObject(base)) {
            trapProp(base, prop, true, inChainPropHandler);
          }
          const propValue = owner[prop];
          if (propValue instanceof Object || typeof propValue === "object" && propValue !== null) {
            setChainPropAccess(propValue, chain);
          }
          trapProp(base, prop, true, inChainPropHandler);
        };
        setChainPropAccess(window, property);
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function inferValue(value) {
        if (value === "undefined") {
          return undefined;
        }
        if (value === "false") {
          return false;
        }
        if (value === "true") {
          return true;
        }
        if (value === "null") {
          return null;
        }
        if (value === "NaN") {
          return NaN;
        }
        const MAX_ALLOWED_NUM = 32767;
        const numVal = Number(value);
        if (!nativeIsNaN(numVal)) {
          if (Math.abs(numVal) > MAX_ALLOWED_NUM) {
            throw new Error("number values bigger than 32767 are not allowed");
          }
          return numVal;
        }
        let errorMessage = "'".concat(value, "' value type can't be inferred");
        try {
          const parsableVal = JSON.parse(value);
          if (parsableVal instanceof Object || typeof parsableVal === "string") {
            return parsableVal;
          }
        } catch (e) {
          errorMessage += ": ".concat(e);
        }
        throw new TypeError(errorMessage);
      }
      function logMessage(source, message) {
        let forced = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        let convertMessageToString = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        const name = source.name,
          verbose = source.verbose;
        if (!forced && !verbose) {
          return;
        }
        const nativeConsole = console.log;
        if (!convertMessageToString) {
          nativeConsole("".concat(name, ":"), message);
          return;
        }
        nativeConsole("".concat(name, ": ").concat(message));
      }
      function getPropertyInChain(base, chain) {
        const pos = chain.indexOf(".");
        if (pos === -1) {
          return {
            base: base,
            prop: chain
          };
        }
        const prop = chain.slice(0, pos);
        if (base === null) {
          return {
            base: base,
            prop: prop,
            chain: chain
          };
        }
        const nextBase = base[prop];
        chain = chain.slice(pos + 1);
        if ((base instanceof Object || typeof base === "object") && isEmptyObject(base)) {
          return {
            base: base,
            prop: prop,
            chain: chain
          };
        }
        if (nextBase === null) {
          return {
            base: base,
            prop: prop,
            chain: chain
          };
        }
        if (nextBase !== undefined) {
          return getPropertyInChain(nextBase, chain);
        }
        Object.defineProperty(base, prop, {
          configurable: true
        });
        return {
          base: base,
          prop: prop,
          chain: chain
        };
      }
      function toRegExp() {
        let input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
        const DEFAULT_VALUE = ".?";
        const FORWARD_SLASH = "/";
        if (input === "") {
          return new RegExp(DEFAULT_VALUE);
        }
        if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
          return new RegExp(input.slice(1, -1));
        }
        const escaped = input.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(escaped);
      }
      function matchStackTrace(stackMatch, stackTrace) {
        if (!stackMatch || stackMatch === "") {
          return true;
        }
        if (shouldAbortInlineOrInjectedScript(stackMatch, stackTrace)) {
          return true;
        }
        const stackRegexp = toRegExp(stackMatch);
        const refinedStackTrace = stackTrace.split("\n").slice(2).map(function (line) {
          return line.trim();
        }).join("\n");
        return getNativeRegexpTest().call(stackRegexp, refinedStackTrace);
      }
      function nativeIsNaN(num) {
        const native = Number.isNaN || window.isNaN;
        return native(num);
      }
      function isEmptyObject(obj) {
        return Object.keys(obj).length === 0 && !obj.prototype;
      }
      function getNativeRegexpTest() {
        return Object.getOwnPropertyDescriptor(RegExp.prototype, "test").value;
      }
      function shouldAbortInlineOrInjectedScript(stackMatch, stackTrace) {
        const INLINE_SCRIPT_STRING = "inlineScript";
        const INJECTED_SCRIPT_STRING = "injectedScript";
        const INJECTED_SCRIPT_MARKER = "<anonymous>";
        const isInlineScript = function isInlineScript(stackMatch) {
          return stackMatch.includes(INLINE_SCRIPT_STRING);
        };
        const isInjectedScript = function isInjectedScript(stackMatch) {
          return stackMatch.includes(INJECTED_SCRIPT_STRING);
        };
        if (!(isInlineScript(stackMatch) || isInjectedScript(stackMatch))) {
          return false;
        }
        let documentURL = window.location.href;
        const pos = documentURL.indexOf("#");
        if (pos !== -1) {
          documentURL = documentURL.slice(0, pos);
        }
        const stackSteps = stackTrace.split("\n").slice(2).map(function (line) {
          return line.trim();
        });
        const stackLines = stackSteps.map(function (line) {
          let stack;
          const getStackTraceURL = /(.*?@)?(\S+)(:\d+):\d+\)?$/.exec(line);
          if (getStackTraceURL) {
            var _stackURL, _stackURL2;
            let stackURL = getStackTraceURL[2];
            if ((_stackURL = stackURL) !== null && _stackURL !== void 0 && _stackURL.startsWith("(")) {
              stackURL = stackURL.slice(1);
            }
            if ((_stackURL2 = stackURL) !== null && _stackURL2 !== void 0 && _stackURL2.startsWith(INJECTED_SCRIPT_MARKER)) {
              var _stackFunction;
              stackURL = INJECTED_SCRIPT_STRING;
              let stackFunction = getStackTraceURL[1] !== undefined ? getStackTraceURL[1].slice(0, -1) : line.slice(0, getStackTraceURL.index).trim();
              if ((_stackFunction = stackFunction) !== null && _stackFunction !== void 0 && _stackFunction.startsWith("at")) {
                stackFunction = stackFunction.slice(2).trim();
              }
              stack = "".concat(stackFunction, " ").concat(stackURL).trim();
            } else {
              stack = stackURL;
            }
          } else {
            stack = line;
          }
          return stack;
        });
        if (stackLines) {
          for (let index = 0; index < stackLines.length; index += 1) {
            if (isInlineScript(stackMatch) && documentURL === stackLines[index]) {
              return true;
            }
            if (isInjectedScript(stackMatch) && stackLines[index].startsWith(INJECTED_SCRIPT_STRING)) {
              return true;
            }
          }
        }
        return false;
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        trustedSetConstant.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function trustedSetCookie(source, args) {
      function trustedSetCookie(source, name, value) {
        let offsetExpiresSec = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : "";
        let path = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : "/";
        if (typeof name === "undefined") {
          logMessage(source, "Cookie name should be specified");
          return;
        }
        if (typeof value === "undefined") {
          logMessage(source, "Cookie value should be specified");
          return;
        }
        const parsedValue = parseKeywordValue(value);
        if (!isValidCookiePath(path)) {
          logMessage(source, "Invalid cookie path: '".concat(path, "'"));
          return;
        }
        let cookieToSet = concatCookieNameValuePath(name, parsedValue, path, false);
        if (!cookieToSet) {
          logMessage(source, "Invalid cookie name or value");
          return;
        }
        if (offsetExpiresSec) {
          const parsedOffsetMs = getTrustedCookieOffsetMs(offsetExpiresSec);
          if (!parsedOffsetMs) {
            logMessage(source, "Invalid offsetExpiresSec value: ".concat(offsetExpiresSec));
            return;
          }
          const expires = Date.now() + parsedOffsetMs;
          cookieToSet += " expires=".concat(new Date(expires).toUTCString(), ";");
        }
        document.cookie = cookieToSet;
        hit(source);
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function logMessage(source, message) {
        let forced = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        let convertMessageToString = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        const name = source.name,
          verbose = source.verbose;
        if (!forced && !verbose) {
          return;
        }
        const nativeConsole = console.log;
        if (!convertMessageToString) {
          nativeConsole("".concat(name, ":"), message);
          return;
        }
        nativeConsole("".concat(name, ": ").concat(message));
      }
      function concatCookieNameValuePath(rawName, rawValue, rawPath) {
        let shouldEncode = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        const COOKIE_BREAKER = ";";
        if (!shouldEncode && (rawName.includes(COOKIE_BREAKER) || "".concat(rawValue).includes(COOKIE_BREAKER))) {
          return null;
        }
        const name = shouldEncode ? encodeURIComponent(rawName) : rawName;
        const value = shouldEncode ? encodeURIComponent(rawValue) : rawValue;
        return "".concat(name, "=").concat(value, "; ").concat(getCookiePath(rawPath), ";");
      }
      function isValidCookiePath(rawPath) {
        return rawPath === "/" || rawPath === "none";
      }
      function getTrustedCookieOffsetMs(offsetExpiresSec) {
        const ONE_YEAR_EXPIRATION_KEYWORD = "1year";
        const ONE_DAY_EXPIRATION_KEYWORD = "1day";
        const MS_IN_SEC = 1e3;
        const SECONDS_IN_YEAR = 365 * 24 * 60 * 60;
        const SECONDS_IN_DAY = 24 * 60 * 60;
        let parsedSec;
        if (offsetExpiresSec === ONE_YEAR_EXPIRATION_KEYWORD) {
          parsedSec = SECONDS_IN_YEAR;
        } else if (offsetExpiresSec === ONE_DAY_EXPIRATION_KEYWORD) {
          parsedSec = SECONDS_IN_DAY;
        } else {
          parsedSec = Number.parseInt(offsetExpiresSec, 10);
          if (Number.isNaN(parsedSec)) {
            return null;
          }
        }
        return parsedSec * MS_IN_SEC;
      }
      function parseKeywordValue(rawValue) {
        const NOW_VALUE_KEYWORD = "$now$";
        const CURRENT_DATE_KEYWORD = "$currentDate$";
        let parsedValue = rawValue;
        if (rawValue === NOW_VALUE_KEYWORD) {
          parsedValue = Date.now().toString();
        } else if (rawValue === CURRENT_DATE_KEYWORD) {
          parsedValue = Date();
        }
        return parsedValue;
      }
      function getCookiePath(rawPath) {
        if (rawPath === "/") {
          return "path=/";
        }
        return "";
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        trustedSetCookie.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function trustedSetCookieReload(source, args) {
      function trustedSetCookieReload(source, name, value) {
        let offsetExpiresSec = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : "";
        let path = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : "/";
        if (typeof name === "undefined") {
          logMessage(source, "Cookie name should be specified");
          return;
        }
        if (typeof value === "undefined") {
          logMessage(source, "Cookie value should be specified");
          return;
        }
        if (isCookieSetWithValue(document.cookie, name, value)) {
          return;
        }
        const parsedValue = parseKeywordValue(value);
        if (!isValidCookiePath(path)) {
          logMessage(source, "Invalid cookie path: '".concat(path, "'"));
          return;
        }
        let cookieToSet = concatCookieNameValuePath(name, parsedValue, path, false);
        if (!cookieToSet) {
          logMessage(source, "Invalid cookie name or value");
          return;
        }
        if (offsetExpiresSec) {
          const parsedOffsetMs = getTrustedCookieOffsetMs(offsetExpiresSec);
          if (!parsedOffsetMs) {
            logMessage(source, "Invalid offsetExpiresSec value: ".concat(offsetExpiresSec));
            return;
          }
          const expires = Date.now() + parsedOffsetMs;
          cookieToSet += " expires=".concat(new Date(expires).toUTCString(), ";");
        }
        document.cookie = cookieToSet;
        hit(source);
        const cookieValueToCheck = parseCookieString(document.cookie)[name];
        if (isCookieSetWithValue(document.cookie, name, cookieValueToCheck)) {
          window.location.reload();
        }
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function logMessage(source, message) {
        let forced = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        let convertMessageToString = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        const name = source.name,
          verbose = source.verbose;
        if (!forced && !verbose) {
          return;
        }
        const nativeConsole = console.log;
        if (!convertMessageToString) {
          nativeConsole("".concat(name, ":"), message);
          return;
        }
        nativeConsole("".concat(name, ": ").concat(message));
      }
      function isCookieSetWithValue(cookieString, name, value) {
        return cookieString.split(";").some(function (cookieStr) {
          const pos = cookieStr.indexOf("=");
          if (pos === -1) {
            return false;
          }
          const cookieName = cookieStr.slice(0, pos).trim();
          const cookieValue = cookieStr.slice(pos + 1).trim();
          return name === cookieName && value === cookieValue;
        });
      }
      function concatCookieNameValuePath(rawName, rawValue, rawPath) {
        let shouldEncode = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        const COOKIE_BREAKER = ";";
        if (!shouldEncode && (rawName.includes(COOKIE_BREAKER) || "".concat(rawValue).includes(COOKIE_BREAKER))) {
          return null;
        }
        const name = shouldEncode ? encodeURIComponent(rawName) : rawName;
        const value = shouldEncode ? encodeURIComponent(rawValue) : rawValue;
        return "".concat(name, "=").concat(value, "; ").concat(getCookiePath(rawPath), ";");
      }
      function isValidCookiePath(rawPath) {
        return rawPath === "/" || rawPath === "none";
      }
      function getTrustedCookieOffsetMs(offsetExpiresSec) {
        const ONE_YEAR_EXPIRATION_KEYWORD = "1year";
        const ONE_DAY_EXPIRATION_KEYWORD = "1day";
        const MS_IN_SEC = 1e3;
        const SECONDS_IN_YEAR = 365 * 24 * 60 * 60;
        const SECONDS_IN_DAY = 24 * 60 * 60;
        let parsedSec;
        if (offsetExpiresSec === ONE_YEAR_EXPIRATION_KEYWORD) {
          parsedSec = SECONDS_IN_YEAR;
        } else if (offsetExpiresSec === ONE_DAY_EXPIRATION_KEYWORD) {
          parsedSec = SECONDS_IN_DAY;
        } else {
          parsedSec = Number.parseInt(offsetExpiresSec, 10);
          if (Number.isNaN(parsedSec)) {
            return null;
          }
        }
        return parsedSec * MS_IN_SEC;
      }
      function parseKeywordValue(rawValue) {
        const NOW_VALUE_KEYWORD = "$now$";
        const CURRENT_DATE_KEYWORD = "$currentDate$";
        let parsedValue = rawValue;
        if (rawValue === NOW_VALUE_KEYWORD) {
          parsedValue = Date.now().toString();
        } else if (rawValue === CURRENT_DATE_KEYWORD) {
          parsedValue = Date();
        }
        return parsedValue;
      }
      function parseCookieString(cookieString) {
        const COOKIE_DELIMITER = "=";
        const COOKIE_PAIRS_DELIMITER = ";";
        const cookieChunks = cookieString.split(COOKIE_PAIRS_DELIMITER);
        const cookieData = {};
        cookieChunks.forEach(function (singleCookie) {
          let cookieKey;
          let cookieValue;
          const delimiterIndex = singleCookie.indexOf(COOKIE_DELIMITER);
          if (delimiterIndex === -1) {
            cookieKey = singleCookie.trim();
          } else {
            cookieKey = singleCookie.slice(0, delimiterIndex).trim();
            cookieValue = singleCookie.slice(delimiterIndex + 1);
          }
          cookieData[cookieKey] = cookieValue || null;
        });
        return cookieData;
      }
      function getCookiePath(rawPath) {
        if (rawPath === "/") {
          return "path=/";
        }
        return "";
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        trustedSetCookieReload.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function trustedSetLocalStorageItem(source, args) {
      function trustedSetLocalStorageItem(source, key, value) {
        if (typeof key === "undefined") {
          logMessage(source, "Item key should be specified");
          return;
        }
        if (typeof value === "undefined") {
          logMessage(source, "Item value should be specified");
          return;
        }
        const parsedValue = parseKeywordValue(value);
        const _window = window,
          localStorage = _window.localStorage;
        setStorageItem(source, localStorage, key, parsedValue);
        hit(source);
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function logMessage(source, message) {
        let forced = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        let convertMessageToString = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        const name = source.name,
          verbose = source.verbose;
        if (!forced && !verbose) {
          return;
        }
        const nativeConsole = console.log;
        if (!convertMessageToString) {
          nativeConsole("".concat(name, ":"), message);
          return;
        }
        nativeConsole("".concat(name, ": ").concat(message));
      }
      function setStorageItem(source, storage, key, value) {
        try {
          storage.setItem(key, value);
        } catch (e) {
          const message = "Unable to set sessionStorage item due to: ".concat(e.message);
          logMessage(source, message);
        }
      }
      function parseKeywordValue(rawValue) {
        const NOW_VALUE_KEYWORD = "$now$";
        const CURRENT_DATE_KEYWORD = "$currentDate$";
        let parsedValue = rawValue;
        if (rawValue === NOW_VALUE_KEYWORD) {
          parsedValue = Date.now().toString();
        } else if (rawValue === CURRENT_DATE_KEYWORD) {
          parsedValue = Date();
        }
        return parsedValue;
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        trustedSetLocalStorageItem.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    function xmlPrune(source, args) {
      function xmlPrune(source, propsToRemove) {
        let optionalProp = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "";
        let urlToMatch = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : "";
        if (typeof Reflect === "undefined" || typeof fetch === "undefined" || typeof Proxy === "undefined" || typeof Response === "undefined") {
          return;
        }
        let shouldPruneResponse = false;
        const urlMatchRegexp = toRegExp(urlToMatch);
        const isXML = function isXML(text) {
          if (typeof text === "string") {
            const trimmedText = text.trim();
            if (trimmedText.startsWith("<") && trimmedText.endsWith(">")) {
              return true;
            }
          }
          return false;
        };
        const createXMLDocument = function createXMLDocument(text) {
          const xmlParser = new DOMParser();
          const xmlDocument = xmlParser.parseFromString(text, "text/xml");
          return xmlDocument;
        };
        const isPruningNeeded = function isPruningNeeded(response, propsToRemove) {
          if (!isXML(response)) {
            return false;
          }
          const docXML = createXMLDocument(response);
          return !!docXML.querySelector(propsToRemove);
        };
        const pruneXML = function pruneXML(text) {
          if (!isXML(text)) {
            shouldPruneResponse = false;
            return text;
          }
          const xmlDoc = createXMLDocument(text);
          const errorNode = xmlDoc.querySelector("parsererror");
          if (errorNode) {
            return text;
          }
          if (optionalProp !== "" && xmlDoc.querySelector(optionalProp) === null) {
            shouldPruneResponse = false;
            return text;
          }
          const elems = xmlDoc.querySelectorAll(propsToRemove);
          if (!elems.length) {
            shouldPruneResponse = false;
            return text;
          }
          elems.forEach(function (elem) {
            elem.remove();
          });
          const serializer = new XMLSerializer();
          text = serializer.serializeToString(xmlDoc);
          return text;
        };
        const nativeOpen = window.XMLHttpRequest.prototype.open;
        const nativeSend = window.XMLHttpRequest.prototype.send;
        let xhrData;
        const openWrapper = function openWrapper(target, thisArg, args) {
          xhrData = getXhrData.apply(null, args);
          if (matchRequestProps(source, urlToMatch, xhrData)) {
            thisArg.shouldBePruned = true;
          }
          if (thisArg.shouldBePruned) {
            thisArg.collectedHeaders = [];
            const setRequestHeaderWrapper = function setRequestHeaderWrapper(target, thisArg, args) {
              thisArg.collectedHeaders.push(args);
              return Reflect.apply(target, thisArg, args);
            };
            const setRequestHeaderHandler = {
              apply: setRequestHeaderWrapper
            };
            thisArg.setRequestHeader = new Proxy(thisArg.setRequestHeader, setRequestHeaderHandler);
          }
          return Reflect.apply(target, thisArg, args);
        };
        const sendWrapper = function sendWrapper(target, thisArg, args) {
          const allowedResponseTypeValues = ["", "text"];
          if (!thisArg.shouldBePruned || !allowedResponseTypeValues.includes(thisArg.responseType)) {
            return Reflect.apply(target, thisArg, args);
          }
          const forgedRequest = new XMLHttpRequest();
          forgedRequest.addEventListener("readystatechange", function () {
            if (forgedRequest.readyState !== 4) {
              return;
            }
            const readyState = forgedRequest.readyState,
              response = forgedRequest.response,
              responseText = forgedRequest.responseText,
              responseURL = forgedRequest.responseURL,
              responseXML = forgedRequest.responseXML,
              status = forgedRequest.status,
              statusText = forgedRequest.statusText;
            const content = responseText || response;
            if (typeof content !== "string") {
              return;
            }
            if (!propsToRemove) {
              if (isXML(response)) {
                const message = "XMLHttpRequest.open() URL: ".concat(responseURL, "\nresponse: ").concat(response);
                logMessage(source, message);
                logMessage(source, createXMLDocument(response), true, false);
              }
            } else {
              shouldPruneResponse = isPruningNeeded(response, propsToRemove);
            }
            const responseContent = shouldPruneResponse ? pruneXML(response) : response;
            Object.defineProperties(thisArg, {
              readyState: {
                value: readyState,
                writable: false
              },
              responseURL: {
                value: responseURL,
                writable: false
              },
              responseXML: {
                value: responseXML,
                writable: false
              },
              status: {
                value: status,
                writable: false
              },
              statusText: {
                value: statusText,
                writable: false
              },
              response: {
                value: responseContent,
                writable: false
              },
              responseText: {
                value: responseContent,
                writable: false
              }
            });
            setTimeout(function () {
              const stateEvent = new Event("readystatechange");
              thisArg.dispatchEvent(stateEvent);
              const loadEvent = new Event("load");
              thisArg.dispatchEvent(loadEvent);
              const loadEndEvent = new Event("loadend");
              thisArg.dispatchEvent(loadEndEvent);
            }, 1);
            hit(source);
          });
          nativeOpen.apply(forgedRequest, [xhrData.method, xhrData.url]);
          thisArg.collectedHeaders.forEach(function (header) {
            const name = header[0];
            const value = header[1];
            forgedRequest.setRequestHeader(name, value);
          });
          thisArg.collectedHeaders = [];
          try {
            nativeSend.call(forgedRequest, args);
          } catch (_unused) {
            return Reflect.apply(target, thisArg, args);
          }
          return undefined;
        };
        const openHandler = {
          apply: openWrapper
        };
        const sendHandler = {
          apply: sendWrapper
        };
        XMLHttpRequest.prototype.open = new Proxy(XMLHttpRequest.prototype.open, openHandler);
        XMLHttpRequest.prototype.send = new Proxy(XMLHttpRequest.prototype.send, sendHandler);
        const nativeFetch = window.fetch;
        const fetchWrapper = async function fetchWrapper(target, thisArg, args) {
          const fetchURL = args[0] instanceof Request ? args[0].url : args[0];
          if (typeof fetchURL !== "string" || fetchURL.length === 0) {
            return Reflect.apply(target, thisArg, args);
          }
          if (urlMatchRegexp.test(fetchURL)) {
            const response = await nativeFetch(...args);
            const clonedResponse = response.clone();
            const responseText = await response.text();
            shouldPruneResponse = isPruningNeeded(responseText, propsToRemove);
            if (!shouldPruneResponse) {
              const message = "fetch URL: ".concat(fetchURL, "\nresponse text: ").concat(responseText);
              logMessage(source, message);
              logMessage(source, createXMLDocument(responseText), true, false);
              return clonedResponse;
            }
            const prunedText = pruneXML(responseText);
            if (shouldPruneResponse) {
              hit(source);
              return new Response(prunedText, {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers
              });
            }
            return clonedResponse;
          }
          return Reflect.apply(target, thisArg, args);
        };
        const fetchHandler = {
          apply: fetchWrapper
        };
        window.fetch = new Proxy(window.fetch, fetchHandler);
      }
      function hit(source) {
        if (source.verbose !== true) {
          return;
        }
        try {
          const log = console.log.bind(console);
          const trace = console.trace.bind(console);
          let prefix = source.ruleText || "";
          if (source.domainName) {
            const AG_SCRIPTLET_MARKER = "#%#//";
            const UBO_SCRIPTLET_MARKER = "##+js";
            let ruleStartIndex;
            if (source.ruleText.includes(AG_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.includes(UBO_SCRIPTLET_MARKER)) {
              ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            const rulePart = source.ruleText.slice(ruleStartIndex);
            prefix = "".concat(source.domainName).concat(rulePart);
          }
          log("".concat(prefix, " trace start"));
          if (trace) {
            trace();
          }
          log("".concat(prefix, " trace end"));
        } catch (e) {}
        if (typeof window.__debug === "function") {
          window.__debug(source);
        }
      }
      function logMessage(source, message) {
        let forced = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        let convertMessageToString = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        const name = source.name,
          verbose = source.verbose;
        if (!forced && !verbose) {
          return;
        }
        const nativeConsole = console.log;
        if (!convertMessageToString) {
          nativeConsole("".concat(name, ":"), message);
          return;
        }
        nativeConsole("".concat(name, ": ").concat(message));
      }
      function toRegExp() {
        let input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
        const DEFAULT_VALUE = ".?";
        const FORWARD_SLASH = "/";
        if (input === "") {
          return new RegExp(DEFAULT_VALUE);
        }
        if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
          return new RegExp(input.slice(1, -1));
        }
        const escaped = input.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(escaped);
      }
      function getXhrData(method, url, async, user, password) {
        return {
          method: method,
          url: url,
          async: async,
          user: user,
          password: password
        };
      }
      function matchRequestProps(source, propsToMatch, requestData) {
        if (propsToMatch === "" || propsToMatch === "*") {
          return true;
        }
        let isMatched;
        const parsedData = parseMatchProps(propsToMatch);
        if (!validateParsedData(parsedData)) {
          logMessage(source, "Invalid parameter: ".concat(propsToMatch));
          isMatched = false;
        } else {
          const matchData = getMatchPropsData(parsedData);
          isMatched = Object.keys(matchData).every(function (matchKey) {
            const matchValue = matchData[matchKey];
            return Object.prototype.hasOwnProperty.call(requestData, matchKey) && matchValue.test(requestData[matchKey]);
          });
        }
        return isMatched;
      }
      function getMatchPropsData(data) {
        const matchData = {};
        Object.keys(data).forEach(function (key) {
          matchData[key] = toRegExp(data[key]);
        });
        return matchData;
      }
      function getRequestProps() {
        return ["url", "method", "headers", "body", "mode", "credentials", "cache", "redirect", "referrer", "referrerPolicy", "integrity", "keepalive", "signal"];
      }
      function validateParsedData(data) {
        return Object.values(data).every(function (value) {
          return isValidStrPattern(value);
        });
      }
      function parseMatchProps(propsToMatchStr) {
        const PROPS_DIVIDER = " ";
        const PAIRS_MARKER = ":";
        const LEGAL_MATCH_PROPS = getRequestProps();
        const propsObj = {};
        const props = propsToMatchStr.split(PROPS_DIVIDER);
        props.forEach(function (prop) {
          const dividerInd = prop.indexOf(PAIRS_MARKER);
          const key = prop.slice(0, dividerInd);
          const hasLegalMatchProp = LEGAL_MATCH_PROPS.includes(key);
          if (hasLegalMatchProp) {
            const value = prop.slice(dividerInd + 1);
            propsObj[key] = value;
          } else {
            propsObj.url = prop;
          }
        });
        return propsObj;
      }
      function isValidStrPattern(input) {
        const FORWARD_SLASH = "/";
        let str = escapeRegExp(input);
        if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
          str = input.slice(1, -1);
        }
        let isValid;
        try {
          isValid = new RegExp(str);
          isValid = true;
        } catch (e) {
          isValid = false;
        }
        return isValid;
      }
      function escapeRegExp(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }
      const updatedArgs = args ? [].concat(source).concat(args) : [source];
      try {
        xmlPrune.apply(this, updatedArgs);
      } catch (e) {
        console.log(e);
      }
    }
    const scriptletsMap = {
      "abort-current-inline-script": abortCurrentInlineScript,
      "abort-current-script.js": abortCurrentInlineScript,
      "ubo-abort-current-script.js": abortCurrentInlineScript,
      "acs.js": abortCurrentInlineScript,
      "ubo-acs.js": abortCurrentInlineScript,
      "ubo-abort-current-script": abortCurrentInlineScript,
      "ubo-acs": abortCurrentInlineScript,
      "abort-current-inline-script.js": abortCurrentInlineScript,
      "ubo-abort-current-inline-script.js": abortCurrentInlineScript,
      "acis.js": abortCurrentInlineScript,
      "ubo-acis.js": abortCurrentInlineScript,
      "ubo-abort-current-inline-script": abortCurrentInlineScript,
      "ubo-acis": abortCurrentInlineScript,
      "abp-abort-current-inline-script": abortCurrentInlineScript,
      "abort-on-property-read": abortOnPropertyRead,
      "abort-on-property-read.js": abortOnPropertyRead,
      "ubo-abort-on-property-read.js": abortOnPropertyRead,
      "aopr.js": abortOnPropertyRead,
      "ubo-aopr.js": abortOnPropertyRead,
      "ubo-abort-on-property-read": abortOnPropertyRead,
      "ubo-aopr": abortOnPropertyRead,
      "abp-abort-on-property-read": abortOnPropertyRead,
      "abort-on-property-write": abortOnPropertyWrite,
      "abort-on-property-write.js": abortOnPropertyWrite,
      "ubo-abort-on-property-write.js": abortOnPropertyWrite,
      "aopw.js": abortOnPropertyWrite,
      "ubo-aopw.js": abortOnPropertyWrite,
      "ubo-abort-on-property-write": abortOnPropertyWrite,
      "ubo-aopw": abortOnPropertyWrite,
      "abp-abort-on-property-write": abortOnPropertyWrite,
      "abort-on-stack-trace": abortOnStackTrace,
      "abort-on-stack-trace.js": abortOnStackTrace,
      "ubo-abort-on-stack-trace.js": abortOnStackTrace,
      "aost.js": abortOnStackTrace,
      "ubo-aost.js": abortOnStackTrace,
      "ubo-abort-on-stack-trace": abortOnStackTrace,
      "ubo-aost": abortOnStackTrace,
      "abp-abort-on-stack-trace": abortOnStackTrace,
      "adjust-setInterval": adjustSetInterval,
      "nano-setInterval-booster.js": adjustSetInterval,
      "ubo-nano-setInterval-booster.js": adjustSetInterval,
      "nano-sib.js": adjustSetInterval,
      "ubo-nano-sib.js": adjustSetInterval,
      "ubo-nano-setInterval-booster": adjustSetInterval,
      "ubo-nano-sib": adjustSetInterval,
      "adjust-setTimeout": adjustSetTimeout,
      "nano-setTimeout-booster.js": adjustSetTimeout,
      "ubo-nano-setTimeout-booster.js": adjustSetTimeout,
      "nano-stb.js": adjustSetTimeout,
      "ubo-nano-stb.js": adjustSetTimeout,
      "ubo-nano-setTimeout-booster": adjustSetTimeout,
      "ubo-nano-stb": adjustSetTimeout,
      "debug-current-inline-script": debugCurrentInlineScript,
      "debug-on-property-read": debugOnPropertyRead,
      "debug-on-property-write": debugOnPropertyWrite,
      "dir-string": dirString,
      "disable-newtab-links": disableNewtabLinks,
      "disable-newtab-links.js": disableNewtabLinks,
      "ubo-disable-newtab-links.js": disableNewtabLinks,
      "ubo-disable-newtab-links": disableNewtabLinks,
      "evaldata-prune": evalDataPrune,
      "evaldata-prune.js": evalDataPrune,
      "ubo-evaldata-prune.js": evalDataPrune,
      "ubo-evaldata-prune": evalDataPrune,
      "close-window": forceWindowClose,
      "window-close-if.js": forceWindowClose,
      "ubo-window-close-if.js": forceWindowClose,
      "ubo-window-close-if": forceWindowClose,
      "hide-in-shadow-dom": hideInShadowDom,
      "inject-css-in-shadow-dom": injectCssInShadowDom,
      "json-prune": jsonPrune,
      "json-prune.js": jsonPrune,
      "ubo-json-prune.js": jsonPrune,
      "ubo-json-prune": jsonPrune,
      "abp-json-prune": jsonPrune,
      log: log,
      "log-addEventListener": logAddEventListener,
      "addEventListener-logger.js": logAddEventListener,
      "ubo-addEventListener-logger.js": logAddEventListener,
      "aell.js": logAddEventListener,
      "ubo-aell.js": logAddEventListener,
      "ubo-addEventListener-logger": logAddEventListener,
      "ubo-aell": logAddEventListener,
      "log-eval": logEval,
      "log-on-stack-trace": logOnStacktrace,
      "m3u-prune": m3uPrune,
      "m3u-prune.js": m3uPrune,
      "ubo-m3u-prune.js": m3uPrune,
      "ubo-m3u-prune": m3uPrune,
      "no-topics": noTopics,
      noeval: noeval,
      "noeval.js": noeval,
      "silent-noeval.js": noeval,
      "ubo-noeval.js": noeval,
      "ubo-silent-noeval.js": noeval,
      "ubo-noeval": noeval,
      "ubo-silent-noeval": noeval,
      nowebrtc: nowebrtc,
      "nowebrtc.js": nowebrtc,
      "ubo-nowebrtc.js": nowebrtc,
      "ubo-nowebrtc": nowebrtc,
      "prevent-addEventListener": preventAddEventListener,
      "addEventListener-defuser.js": preventAddEventListener,
      "ubo-addEventListener-defuser.js": preventAddEventListener,
      "aeld.js": preventAddEventListener,
      "ubo-aeld.js": preventAddEventListener,
      "ubo-addEventListener-defuser": preventAddEventListener,
      "ubo-aeld": preventAddEventListener,
      "prevent-adfly": preventAdfly,
      "adfly-defuser.js": preventAdfly,
      "ubo-adfly-defuser.js": preventAdfly,
      "ubo-adfly-defuser": preventAdfly,
      "prevent-bab": preventBab,
      "prevent-element-src-loading": preventElementSrcLoading,
      "prevent-eval-if": preventEvalIf,
      "noeval-if.js": preventEvalIf,
      "ubo-noeval-if.js": preventEvalIf,
      "ubo-noeval-if": preventEvalIf,
      "prevent-fab-3.2.0": preventFab,
      "nofab.js": preventFab,
      "ubo-nofab.js": preventFab,
      "fuckadblock.js-3.2.0": preventFab,
      "ubo-fuckadblock.js-3.2.0": preventFab,
      "ubo-nofab": preventFab,
      "prevent-fetch": preventFetch,
      "no-fetch-if.js": preventFetch,
      "ubo-no-fetch-if.js": preventFetch,
      "ubo-no-fetch-if": preventFetch,
      "prevent-popads-net": preventPopadsNet,
      "popads.net.js": preventPopadsNet,
      "ubo-popads.net.js": preventPopadsNet,
      "ubo-popads.net": preventPopadsNet,
      "prevent-refresh": preventRefresh,
      "refresh-defuser.js": preventRefresh,
      "refresh-defuser": preventRefresh,
      "ubo-refresh-defuser.js": preventRefresh,
      "ubo-refresh-defuser": preventRefresh,
      "prevent-requestAnimationFrame": preventRequestAnimationFrame,
      "no-requestAnimationFrame-if.js": preventRequestAnimationFrame,
      "ubo-no-requestAnimationFrame-if.js": preventRequestAnimationFrame,
      "norafif.js": preventRequestAnimationFrame,
      "ubo-norafif.js": preventRequestAnimationFrame,
      "ubo-no-requestAnimationFrame-if": preventRequestAnimationFrame,
      "ubo-norafif": preventRequestAnimationFrame,
      "prevent-setInterval": preventSetInterval,
      "no-setInterval-if.js": preventSetInterval,
      "ubo-no-setInterval-if.js": preventSetInterval,
      "setInterval-defuser.js": preventSetInterval,
      "ubo-setInterval-defuser.js": preventSetInterval,
      "nosiif.js": preventSetInterval,
      "ubo-nosiif.js": preventSetInterval,
      "sid.js": preventSetInterval,
      "ubo-sid.js": preventSetInterval,
      "ubo-no-setInterval-if": preventSetInterval,
      "ubo-setInterval-defuser": preventSetInterval,
      "ubo-nosiif": preventSetInterval,
      "ubo-sid": preventSetInterval,
      "prevent-setTimeout": preventSetTimeout,
      "no-setTimeout-if.js": preventSetTimeout,
      "ubo-no-setTimeout-if.js": preventSetTimeout,
      "nostif.js": preventSetTimeout,
      "ubo-nostif.js": preventSetTimeout,
      "ubo-no-setTimeout-if": preventSetTimeout,
      "ubo-nostif": preventSetTimeout,
      "setTimeout-defuser.js": preventSetTimeout,
      "ubo-setTimeout-defuser.js": preventSetTimeout,
      "ubo-setTimeout-defuser": preventSetTimeout,
      "std.js": preventSetTimeout,
      "ubo-std.js": preventSetTimeout,
      "ubo-std": preventSetTimeout,
      "prevent-window-open": preventWindowOpen,
      "window.open-defuser.js": preventWindowOpen,
      "ubo-window.open-defuser.js": preventWindowOpen,
      "ubo-window.open-defuser": preventWindowOpen,
      "nowoif.js": preventWindowOpen,
      "ubo-nowoif.js": preventWindowOpen,
      "ubo-nowoif": preventWindowOpen,
      "prevent-xhr": preventXHR,
      "no-xhr-if.js": preventXHR,
      "ubo-no-xhr-if.js": preventXHR,
      "ubo-no-xhr-if": preventXHR,
      "remove-attr": removeAttr,
      "remove-attr.js": removeAttr,
      "ubo-remove-attr.js": removeAttr,
      "ra.js": removeAttr,
      "ubo-ra.js": removeAttr,
      "ubo-remove-attr": removeAttr,
      "ubo-ra": removeAttr,
      "remove-class": removeClass,
      "remove-class.js": removeClass,
      "ubo-remove-class.js": removeClass,
      "rc.js": removeClass,
      "ubo-rc.js": removeClass,
      "ubo-remove-class": removeClass,
      "ubo-rc": removeClass,
      "remove-cookie": removeCookie,
      "cookie-remover.js": removeCookie,
      "ubo-cookie-remover.js": removeCookie,
      "ubo-cookie-remover": removeCookie,
      "remove-in-shadow-dom": removeInShadowDom,
      "remove-node-text": removeNodeText,
      "remove-node-text.js": removeNodeText,
      "ubo-remove-node-text.js": removeNodeText,
      "rmnt.js": removeNodeText,
      "ubo-rmnt.js": removeNodeText,
      "ubo-remove-node-text": removeNodeText,
      "ubo-rmnt": removeNodeText,
      "set-attr": setAttr,
      "set-constant": setConstant,
      "set-constant.js": setConstant,
      "ubo-set-constant.js": setConstant,
      "set.js": setConstant,
      "ubo-set.js": setConstant,
      "ubo-set-constant": setConstant,
      "ubo-set": setConstant,
      "abp-override-property-read": setConstant,
      "set-cookie": setCookie,
      "set-cookie-reload": setCookieReload,
      "set-local-storage-item": setLocalStorageItem,
      "set-popads-dummy": setPopadsDummy,
      "popads-dummy.js": setPopadsDummy,
      "ubo-popads-dummy.js": setPopadsDummy,
      "ubo-popads-dummy": setPopadsDummy,
      "set-session-storage-item": setSessionStorageItem,
      "trusted-click-element": trustedClickElement,
      "trusted-replace-fetch-response": trustedReplaceFetchResponse,
      "trusted-replace-node-text": trustedReplaceNodeText,
      "trusted-replace-xhr-response": trustedReplaceXhrResponse,
      "trusted-set-constant": trustedSetConstant,
      "trusted-set-cookie": trustedSetCookie,
      "trusted-set-cookie-reload": trustedSetCookieReload,
      "trusted-set-local-storage-item": trustedSetLocalStorageItem,
      "xml-prune": xmlPrune,
      "xml-prune.js": xmlPrune,
      "ubo-xml-prune.js": xmlPrune,
      "ubo-xml-prune": xmlPrune
    };
    var getScriptletFunction = function getScriptletFunction(name) {
      return scriptletsMap[name];
    };

    /**
     * @typedef {Object} Source Scriptlet properties.
     * @property {string} name Scriptlet name.
     * @property {Array<string>} args Arguments for scriptlet function.
     * @property {'extension'|'corelibs'|'test'} engine Defines the final form of scriptlet string presentation.
     * @property {string} [version] Extension version.
     * @property {boolean} [verbose] Flag to enable debug information printing to console.
     * @property {string} [ruleText] Source rule text, needed for debug purposes.
     * @property {string} [domainName] Domain name where scriptlet is applied, needed for debug purposes.
     */

    /**
     * Returns scriptlet code by `source`.
     *
     * @param {Source} source Scriptlet properties.
     *
     * @returns {string|null} Scriptlet code.
     * @throws An error on unknown scriptlet name.
     */
    function getScriptletCode(source) {
      if (!validator.isValidScriptletName(source.name)) {
        return null;
      }
      const scriptletFunction = getScriptletFunction(source.name);
      // In case isValidScriptletName check will pass invalid scriptlet name,
      // for example when there is a bad alias
      if (typeof scriptletFunction !== 'function') {
        throw new Error("Error: cannot invoke scriptlet with name: '".concat(source.name, "'"));
      }
      const scriptletFunctionString = scriptletFunction.toString();
      const result = source.engine === 'corelibs' || source.engine === 'test' ? wrapInNonameFunc(scriptletFunctionString) : passSourceAndProps(source, scriptletFunctionString);
      return result;
    }

    /**
     * Scriptlets variable
     *
     * @returns {Object} object with methods:
     * `invoke` method receives one argument with `Source` type
     * `validate` method receives one argument with `String` type
     */
    const scriptletsObject = function () {
      return {
        invoke: getScriptletCode,
        getScriptletFunction,
        isValidScriptletName: validator.isValidScriptletName,
        isValidScriptletRule,
        isAdgScriptletRule: validator.isAdgScriptletRule,
        isUboScriptletRule: validator.isUboScriptletRule,
        isAbpSnippetRule: validator.isAbpSnippetRule,
        convertUboToAdg: convertUboScriptletToAdg,
        convertAbpToAdg: convertAbpSnippetToAdg,
        convertScriptletToAdg,
        convertAdgToUbo: convertAdgScriptletToUbo,
        redirects
      };
    }();

    /**
     * Add module exports to be used as node package
     */
    module.exports = scriptletsObject;

}));

/**
 * -------------------------------------------
 * |                                         |
 * |  If you want to add your own scriptlet  |
 * |  please put your code below             |
 * |                                         |
 * -------------------------------------------
 */
