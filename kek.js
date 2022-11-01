function abortCurrentInlineScript(source, args){
function abortCurrentInlineScript(source, property, search) {
  var searchRegexp = toRegExp(search);
  var rid = randomId();
  var SRC_DATA_MARKER = 'data:text/javascript;base64,';
  var getCurrentScript = function getCurrentScript() {
    if ('currentScript' in document) {
      return document.currentScript; // eslint-disable-line compat/compat
    }

    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  };
  var ourScript = getCurrentScript();
  var abort = function abort() {
    var scriptEl = getCurrentScript();
    if (!scriptEl) {
      return;
    }
    var content = scriptEl.textContent;

    // We are using Node.prototype.textContent property descriptor
    // to get the real script content
    // even when document.currentScript.textContent is replaced.
    // https://github.com/AdguardTeam/Scriptlets/issues/57#issuecomment-593638991
    try {
      var textContentGetter = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent').get;
      content = textContentGetter.call(scriptEl);
    } catch (e) {} // eslint-disable-line no-empty

    // https://github.com/AdguardTeam/Scriptlets/issues/130
    if (content.length === 0 && typeof scriptEl.src !== 'undefined' && startsWith(scriptEl.src, SRC_DATA_MARKER)) {
      var encodedContent = scriptEl.src.slice(SRC_DATA_MARKER.length);
      content = window.atob(encodedContent);
    }
    if (scriptEl instanceof HTMLScriptElement && content.length > 0 && scriptEl !== ourScript && searchRegexp.test(content)) {
      hit(source);
      throw new ReferenceError(rid);
    }
  };
  var setChainPropAccess = function setChainPropAccess(owner, property) {
    var chainInfo = getPropertyInChain(owner, property);
    var base = chainInfo.base;
    var prop = chainInfo.prop,
      chain = chainInfo.chain;

    // The scriptlet might be executed before the chain property has been created
    // (for instance, document.body before the HTML body was loaded).
    // In this case we're checking whether the base element exists or not
    // and if not, we simply exit without overriding anything.
    // e.g. https://github.com/AdguardTeam/Scriptlets/issues/57#issuecomment-575841092
    if (base instanceof Object === false && base === null) {
      var props = property.split('.');
      var propIndex = props.indexOf(prop);
      var baseName = props[propIndex - 1];
      console.log("The scriptlet had been executed before the ".concat(baseName, " was loaded.")); // eslint-disable-line no-console, max-len
      return;
    }
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
    var origDescriptor = Object.getOwnPropertyDescriptor(base, prop);
    if (origDescriptor instanceof Object === false || origDescriptor.get instanceof Function === false) {
      currentValue = base[prop];
      origDescriptor = undefined;
    }
    var descriptorWrapper = Object.assign(getDescriptorAddon(), {
      currentValue: currentValue,
      get: function get() {
        if (!this.isAbortingSuspended) {
          this.isolateCallback(abort);
        }
        if (origDescriptor instanceof Object) {
          return origDescriptor.get.call(base);
        }
        return this.currentValue;
      },
      set: function set(newValue) {
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
      get: function get() {
        return descriptorWrapper.get.call(descriptorWrapper);
      },
      set: function set(newValue) {
        descriptorWrapper.set.call(descriptorWrapper, newValue);
      }
    });
  };
  setChainPropAccess(window, property);
  window.onerror = createOnErrorHandler(rid).bind();
}
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
  var pos = chain.indexOf('.');
  if (pos === -1) {
    return {
      base: base,
      prop: chain
    };
  }
  var prop = chain.slice(0, pos);

  // https://github.com/AdguardTeam/Scriptlets/issues/128
  if (base === null) {
    // if base is null, return 'null' as base.
    // it's needed for triggering the reason logging while debugging
    return {
      base: base,
      prop: prop,
      chain: chain
    };
  }
  var nextBase = base[prop];
  chain = chain.slice(pos + 1);
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
  var input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  var DEFAULT_VALUE = '.?';
  var FORWARD_SLASH = '/';
  if (input === '') {
    return new RegExp(DEFAULT_VALUE);
  }
  if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
    return new RegExp(input.slice(1, -1));
  }
  var escaped = input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped);
}
function startsWith(str, prefix) {
  // if str === '', (str && false) will return ''
  // that's why it has to be !!str
  return !!str && str.indexOf(prefix) === 0;
}
function createOnErrorHandler(rid) {
  // eslint-disable-next-line consistent-return
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
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
}
function getDescriptorAddon() {
  return {
    isAbortingSuspended: false,
    isolateCallback: function isolateCallback(cb) {
      this.isAbortingSuspended = true;
      for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }
      var result = cb.apply(void 0, args);
      this.isAbortingSuspended = false;
      return result;
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
function abortOnPropertyRead(source, args){
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
  var pos = chain.indexOf('.');
  if (pos === -1) {
    return {
      base: base,
      prop: chain
    };
  }
  var prop = chain.slice(0, pos);

  // https://github.com/AdguardTeam/Scriptlets/issues/128
  if (base === null) {
    // if base is null, return 'null' as base.
    // it's needed for triggering the reason logging while debugging
    return {
      base: base,
      prop: prop,
      chain: chain
    };
  }
  var nextBase = base[prop];
  chain = chain.slice(pos + 1);
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
  // eslint-disable-next-line consistent-return
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
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        abortOnPropertyRead.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
}
function abortOnPropertyWrite(source, args){
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
  var pos = chain.indexOf('.');
  if (pos === -1) {
    return {
      base: base,
      prop: chain
    };
  }
  var prop = chain.slice(0, pos);

  // https://github.com/AdguardTeam/Scriptlets/issues/128
  if (base === null) {
    // if base is null, return 'null' as base.
    // it's needed for triggering the reason logging while debugging
    return {
      base: base,
      prop: prop,
      chain: chain
    };
  }
  var nextBase = base[prop];
  chain = chain.slice(pos + 1);
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
  // eslint-disable-next-line consistent-return
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
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        abortOnPropertyWrite.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
}
function abortOnStackTrace(source, args){
function abortOnStackTrace(source, property, stack) {
  if (!property || !stack) {
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
    if (!isValidStrPattern(stack)) {
      // eslint-disable-next-line no-console
      console.log("Invalid parameter: ".concat(stack));
      return;
    }

    // Prevent infinite loops when trapping prop used by helpers in getter/setter
    var descriptorWrapper = Object.assign(getDescriptorAddon(), {
      value: base[prop],
      get: function get() {
        if (!this.isAbortingSuspended && this.isolateCallback(matchStackTrace, stack, new Error().stack)) {
          abort();
        }
        return this.value;
      },
      set: function set(newValue) {
        if (!this.isAbortingSuspended && this.isolateCallback(matchStackTrace, stack, new Error().stack)) {
          abort();
        }
        this.value = newValue;
      }
    });
    setPropertyAccess(base, prop, {
      // Call wrapped getter and setter to keep isAbortingSuspended & isolateCallback values
      get: function get() {
        return descriptorWrapper.get.call(descriptorWrapper);
      },
      set: function set(newValue) {
        descriptorWrapper.set.call(descriptorWrapper, newValue);
      }
    });
  };
  setChainPropAccess(window, property);
  window.onerror = createOnErrorHandler(rid).bind();
}
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
  var pos = chain.indexOf('.');
  if (pos === -1) {
    return {
      base: base,
      prop: chain
    };
  }
  var prop = chain.slice(0, pos);

  // https://github.com/AdguardTeam/Scriptlets/issues/128
  if (base === null) {
    // if base is null, return 'null' as base.
    // it's needed for triggering the reason logging while debugging
    return {
      base: base,
      prop: prop,
      chain: chain
    };
  }
  var nextBase = base[prop];
  chain = chain.slice(pos + 1);
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
  // eslint-disable-next-line consistent-return
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
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
}
function isValidStrPattern(input) {
  var FORWARD_SLASH = '/';
  var str = escapeRegExp(input);
  if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
    str = input.slice(1, -1);
  }
  var isValid;
  try {
    isValid = new RegExp(str);
    isValid = true;
  } catch (e) {
    isValid = false;
  }
  return isValid;
}
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function matchStackTrace(stackMatch, stackTrace) {
  if (!stackMatch || stackMatch === '') {
    return true;
  }
  var stackRegexp = toRegExp(stackMatch);
  var refinedStackTrace = stackTrace.split('\n').slice(2) // get rid of our own functions in the stack trace
  .map(function (line) {
    return line.trim();
  }) // trim the lines
  .join('\n');
  return getNativeRegexpTest().call(stackRegexp, refinedStackTrace);
}
function getDescriptorAddon() {
  return {
    isAbortingSuspended: false,
    isolateCallback: function isolateCallback(cb) {
      this.isAbortingSuspended = true;
      for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }
      var result = cb.apply(void 0, args);
      this.isAbortingSuspended = false;
      return result;
    }
  };
}
function toRegExp() {
  var input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  var DEFAULT_VALUE = '.?';
  var FORWARD_SLASH = '/';
  if (input === '') {
    return new RegExp(DEFAULT_VALUE);
  }
  if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
    return new RegExp(input.slice(1, -1));
  }
  var escaped = input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped);
}
function getNativeRegexpTest() {
  return Object.getOwnPropertyDescriptor(RegExp.prototype, 'test').value;
}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        abortOnStackTrace.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
}
function adjustSetInterval(source, args){
function adjustSetInterval(source, matchCallback, matchDelay, boost) {
  var nativeSetInterval = window.setInterval;
  var matchRegexp = toRegExp(matchCallback);
  var intervalWrapper = function intervalWrapper(callback, delay) {
    // https://github.com/AdguardTeam/Scriptlets/issues/221
    if (!isValidCallback(callback)) {
      if (source.verbose) {
        // eslint-disable-next-line no-console, max-len
        console.log("Scriptlet adjust-setInterval can not be applied because of invalid callback: '".concat(String(callback), "'."));
      }
    } else if (matchRegexp.test(callback.toString()) && isDelayMatched(matchDelay, delay)) {
      delay *= getBoostMultiplier(boost);
      hit(source);
    }
    for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
      args[_key - 2] = arguments[_key];
    }
    return nativeSetInterval.apply(window, [callback, delay].concat(args));
  };
  window.setInterval = intervalWrapper;
}
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
}
function isValidCallback(callback) {
  return callback instanceof Function
  // passing string as 'code' arg is not recommended
  // but it is possible and not restricted
  // https://developer.mozilla.org/en-US/docs/Web/API/setTimeout#parameters
  || typeof callback === 'string';
}
function toRegExp() {
  var input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  var DEFAULT_VALUE = '.?';
  var FORWARD_SLASH = '/';
  if (input === '') {
    return new RegExp(DEFAULT_VALUE);
  }
  if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
    return new RegExp(input.slice(1, -1));
  }
  var escaped = input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped);
}
function getBoostMultiplier(boost) {
  var DEFAULT_MULTIPLIER = 0.05;
  var MIN_MULTIPLIER = 0.02;
  var MAX_MULTIPLIER = 50;
  var parsedBoost = parseFloat(boost);
  var boostMultiplier = nativeIsNaN(parsedBoost) || !nativeIsFinite(parsedBoost) ? DEFAULT_MULTIPLIER // default scriptlet value
  : parsedBoost;
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
function nativeIsNaN(num) {
  // eslint-disable-next-line no-restricted-properties
  var native = Number.isNaN || window.isNaN;
  return native(num);
}
function nativeIsFinite(num) {
  // eslint-disable-next-line no-restricted-properties
  var native = Number.isFinite || window.isFinite;
  return native(num);
}
function getMatchDelay(delay) {
  var DEFAULT_DELAY = 1000;
  var parsedDelay = parseInt(delay, 10);
  var delayMatch = nativeIsNaN(parsedDelay) ? DEFAULT_DELAY // default scriptlet value
  : parsedDelay;
  return delayMatch;
}
function getWildcardSymbol() {
  return '*';
}
function shouldMatchAnyDelay(delay) {
  return delay === getWildcardSymbol();
}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        adjustSetInterval.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
}
function adjustSetTimeout(source, args){
function adjustSetTimeout(source, matchCallback, matchDelay, boost) {
  var nativeSetTimeout = window.setTimeout;
  var matchRegexp = toRegExp(matchCallback);
  var timeoutWrapper = function timeoutWrapper(callback, delay) {
    // https://github.com/AdguardTeam/Scriptlets/issues/221
    if (!isValidCallback(callback)) {
      if (source.verbose) {
        // eslint-disable-next-line no-console, max-len
        console.log("Scriptlet adjust-setTimeout can not be applied because of invalid callback: '".concat(String(callback), "'."));
      }
    } else if (matchRegexp.test(callback.toString()) && isDelayMatched(matchDelay, delay)) {
      delay *= getBoostMultiplier(boost);
      hit(source);
    }
    for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
      args[_key - 2] = arguments[_key];
    }
    return nativeSetTimeout.apply(window, [callback, delay].concat(args));
  };
  window.setTimeout = timeoutWrapper;
}
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
}
function isValidCallback(callback) {
  return callback instanceof Function
  // passing string as 'code' arg is not recommended
  // but it is possible and not restricted
  // https://developer.mozilla.org/en-US/docs/Web/API/setTimeout#parameters
  || typeof callback === 'string';
}
function toRegExp() {
  var input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  var DEFAULT_VALUE = '.?';
  var FORWARD_SLASH = '/';
  if (input === '') {
    return new RegExp(DEFAULT_VALUE);
  }
  if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
    return new RegExp(input.slice(1, -1));
  }
  var escaped = input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped);
}
function getBoostMultiplier(boost) {
  var DEFAULT_MULTIPLIER = 0.05;
  var MIN_MULTIPLIER = 0.02;
  var MAX_MULTIPLIER = 50;
  var parsedBoost = parseFloat(boost);
  var boostMultiplier = nativeIsNaN(parsedBoost) || !nativeIsFinite(parsedBoost) ? DEFAULT_MULTIPLIER // default scriptlet value
  : parsedBoost;
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
function nativeIsNaN(num) {
  // eslint-disable-next-line no-restricted-properties
  var native = Number.isNaN || window.isNaN;
  return native(num);
}
function nativeIsFinite(num) {
  // eslint-disable-next-line no-restricted-properties
  var native = Number.isFinite || window.isFinite;
  return native(num);
}
function getMatchDelay(delay) {
  var DEFAULT_DELAY = 1000;
  var parsedDelay = parseInt(delay, 10);
  var delayMatch = nativeIsNaN(parsedDelay) ? DEFAULT_DELAY // default scriptlet value
  : parsedDelay;
  return delayMatch;
}
function getWildcardSymbol() {
  return '*';
}
function shouldMatchAnyDelay(delay) {
  return delay === getWildcardSymbol();
}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        adjustSetTimeout.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
}
function debugCurrentInlineScript(source, args){
function debugCurrentInlineScript(source, property, search) {
  var searchRegexp = toRegExp(search);
  var rid = randomId();
  var getCurrentScript = function getCurrentScript() {
    if ('currentScript' in document) {
      return document.currentScript; // eslint-disable-line compat/compat
    }

    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  };
  var ourScript = getCurrentScript();
  var abort = function abort() {
    var scriptEl = getCurrentScript();
    if (!scriptEl) {
      return;
    }
    var content = scriptEl.textContent;

    // We are using Node.prototype.textContent property descriptor
    // to get the real script content
    // even when document.currentScript.textContent is replaced.
    // https://github.com/AdguardTeam/Scriptlets/issues/57#issuecomment-593638991
    try {
      var textContentGetter = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent').get;
      content = textContentGetter.call(scriptEl);
    } catch (e) {} // eslint-disable-line no-empty

    if (scriptEl instanceof HTMLScriptElement && content.length > 0 && scriptEl !== ourScript && searchRegexp.test(content)) {
      hit(source);
      debugger; // eslint-disable-line no-debugger
    }
  };

  var setChainPropAccess = function setChainPropAccess(owner, property) {
    var chainInfo = getPropertyInChain(owner, property);
    var base = chainInfo.base;
    var prop = chainInfo.prop,
      chain = chainInfo.chain;

    // The scriptlet might be executed before the chain property has been created
    // (for instance, document.body before the HTML body was loaded).
    // In this case we're checking whether the base element exists or not
    // and if not, we simply exit without overriding anything.
    // e.g. https://github.com/AdguardTeam/Scriptlets/issues/57#issuecomment-575841092
    if (base instanceof Object === false && base === null) {
      var props = property.split('.');
      var propIndex = props.indexOf(prop);
      var baseName = props[propIndex - 1];
      console.log("The scriptlet had been executed before the ".concat(baseName, " was loaded.")); // eslint-disable-line no-console, max-len
      return;
    }
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
  var pos = chain.indexOf('.');
  if (pos === -1) {
    return {
      base: base,
      prop: chain
    };
  }
  var prop = chain.slice(0, pos);

  // https://github.com/AdguardTeam/Scriptlets/issues/128
  if (base === null) {
    // if base is null, return 'null' as base.
    // it's needed for triggering the reason logging while debugging
    return {
      base: base,
      prop: prop,
      chain: chain
    };
  }
  var nextBase = base[prop];
  chain = chain.slice(pos + 1);
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
  var input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  var DEFAULT_VALUE = '.?';
  var FORWARD_SLASH = '/';
  if (input === '') {
    return new RegExp(DEFAULT_VALUE);
  }
  if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
    return new RegExp(input.slice(1, -1));
  }
  var escaped = input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped);
}
function createOnErrorHandler(rid) {
  // eslint-disable-next-line consistent-return
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
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        debugCurrentInlineScript.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
}
function debugOnPropertyRead(source, args){
function debugOnPropertyRead(source, property) {
  if (!property) {
    return;
  }
  var rid = randomId();
  var abort = function abort() {
    hit(source);
    debugger; // eslint-disable-line no-debugger
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
      set: noopFunc
    });
  };
  setChainPropAccess(window, property);
  window.onerror = createOnErrorHandler(rid).bind();
}
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
  var pos = chain.indexOf('.');
  if (pos === -1) {
    return {
      base: base,
      prop: chain
    };
  }
  var prop = chain.slice(0, pos);

  // https://github.com/AdguardTeam/Scriptlets/issues/128
  if (base === null) {
    // if base is null, return 'null' as base.
    // it's needed for triggering the reason logging while debugging
    return {
      base: base,
      prop: prop,
      chain: chain
    };
  }
  var nextBase = base[prop];
  chain = chain.slice(pos + 1);
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
  // eslint-disable-next-line consistent-return
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
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
}
function noopFunc() {}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        debugOnPropertyRead.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
}
function debugOnPropertyWrite(source, args){
function debugOnPropertyWrite(source, property) {
  if (!property) {
    return;
  }
  var rid = randomId();
  var abort = function abort() {
    hit(source);
    debugger; // eslint-disable-line no-debugger
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
  var pos = chain.indexOf('.');
  if (pos === -1) {
    return {
      base: base,
      prop: chain
    };
  }
  var prop = chain.slice(0, pos);

  // https://github.com/AdguardTeam/Scriptlets/issues/128
  if (base === null) {
    // if base is null, return 'null' as base.
    // it's needed for triggering the reason logging while debugging
    return {
      base: base,
      prop: prop,
      chain: chain
    };
  }
  var nextBase = base[prop];
  chain = chain.slice(pos + 1);
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
  // eslint-disable-next-line consistent-return
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
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        debugOnPropertyWrite.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
}
function dirString(source, args){
function dirString(source, times) {
  var _console = console,
    dir = _console.dir;
  times = parseInt(times, 10);
  function dirWrapper(object) {
    // eslint-disable-next-line no-unused-vars
    var temp;
    for (var i = 0; i < times; i += 1) {
      // eslint-disable-next-line no-unused-expressions
      temp = "".concat(object);
    }
    if (typeof dir === 'function') {
      dir.call(this, object);
    }
    hit(source, temp);
  }
  // eslint-disable-next-line no-console
  console.dir = dirWrapper;
}
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        dirString.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
}
function disableNewtabLinks(source, args){
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
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        disableNewtabLinks.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
}
function forceWindowClose(source, args){
function forceWindowClose(source) {
  var path = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
  // eslint-disable-next-line no-console
  var log = console.log.bind(console);

  // https://github.com/AdguardTeam/Scriptlets/issues/158#issuecomment-993423036
  if (typeof window.close !== 'function') {
    if (source.verbose) {
      log('window.close() is not a function so \'close-window\' scriptlet is unavailable');
    }
    return;
  }
  var closeImmediately = function closeImmediately() {
    try {
      hit(source);
      window.close();
    } catch (e) {
      // log the error if window closing is impossible
      // https://developer.mozilla.org/en-US/docs/Web/API/Window/close
      log(e);
    }
  };
  var closeByExtension = function closeByExtension() {
    var extCall = function extCall() {
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
  var shouldClose = function shouldClose() {
    if (path === '') {
      return true;
    }
    var pathRegexp = toRegExp(path);
    var currentPath = "".concat(window.location.pathname).concat(window.location.search);
    return pathRegexp.test(currentPath);
  };
  if (shouldClose()) {
    closeImmediately();
    if (navigator.userAgent.indexOf('Chrome') > -1) {
      closeByExtension();
    }
  }
}
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
}
function toRegExp() {
  var input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  var DEFAULT_VALUE = '.?';
  var FORWARD_SLASH = '/';
  if (input === '') {
    return new RegExp(DEFAULT_VALUE);
  }
  if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
    return new RegExp(input.slice(1, -1));
  }
  var escaped = input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped);
}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        forceWindowClose.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
}
function hideInShadowDom(source, args){
function hideInShadowDom(source, selector, baseSelector) {
  // do nothing if browser does not support ShadowRoot
  // https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot
  if (!Element.prototype.attachShadow) {
    return;
  }
  var hideElement = function hideElement(targetElement) {
    var DISPLAY_NONE_CSS = 'display:none!important;';
    targetElement.style.cssText = DISPLAY_NONE_CSS;
  };

  /**
   * Handles shadow-dom piercing and hiding of found elements
   */
  var hideHandler = function hideHandler() {
    // start value of shadow-dom hosts for the page dom
    var hostElements = !baseSelector ? findHostElements(document.documentElement) : document.querySelectorAll(baseSelector);

    // if there is shadow-dom host, they should be explored
    while (hostElements.length !== 0) {
      var isHidden = false;
      var _pierceShadowDom = pierceShadowDom(selector, hostElements),
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
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
}
function observeDOMChanges(callback) {
  var observeAttrs = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
  var attrsToObserve = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
  /**
   * Returns a wrapper, passing the call to 'method' at maximum once per 'delay' milliseconds.
   * Those calls that fall into the "cooldown" period, are ignored
   * @param {Function} method
   * @param {Number} delay - milliseconds
   */
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

  /**
   * 'delay' in milliseconds for 'throttle' method
   */
  var THROTTLE_DELAY_MS = 20;
  /**
   * Used for remove-class
   */
  // eslint-disable-next-line no-use-before-define, compat/compat
  var observer = new MutationObserver(throttle(callbackWrapper, THROTTLE_DELAY_MS));
  var connect = function connect() {
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
  var disconnect = function disconnect() {
    observer.disconnect();
  };
  function callbackWrapper() {
    disconnect();
    callback();
    connect();
  }
  connect();
}
function flatten(input) {
  var stack = [];
  input.forEach(function (el) {
    return stack.push(el);
  });
  var res = [];
  while (stack.length) {
    // pop value from stack
    var next = stack.pop();
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
}
function findHostElements(rootElement) {
  var hosts = [];
  // Element.querySelectorAll() returns list of elements
  // which are defined in DOM of Element.
  // Meanwhile, inner DOM of the element with shadowRoot property
  // is absolutely another DOM and which can not be reached by querySelectorAll('*')
  var domElems = rootElement.querySelectorAll('*');
  domElems.forEach(function (el) {
    if (el.shadowRoot) {
      hosts.push(el);
    }
  });
  return hosts;
}
function pierceShadowDom(selector, hostElements) {
  var targets = [];
  var innerHostsAcc = [];

  // it's possible to get a few hostElements found by baseSelector on the page
  hostElements.forEach(function (host) {
    // check presence of selector element inside base element if it's not in shadow-dom
    var simpleElems = host.querySelectorAll(selector);
    targets = targets.concat([].slice.call(simpleElems));
    var shadowRootElem = host.shadowRoot;
    var shadowChildren = shadowRootElem.querySelectorAll(selector);
    targets = targets.concat([].slice.call(shadowChildren));

    // find inner shadow-dom hosts inside processing shadow-dom
    innerHostsAcc.push(findHostElements(shadowRootElem));
  });

  // if there were more than one host element,
  // innerHostsAcc is an array of arrays and should be flatten
  var innerHosts = flatten(innerHostsAcc);
  return {
    targets: targets,
    innerHosts: innerHosts
  };
}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        hideInShadowDom.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
}
function jsonPrune(source, args){
function jsonPrune(source, propsToRemove, requiredInitialProps, stack) {
  if (!!stack && !matchStackTrace(stack, new Error().stack)) {
    return;
  }
  // eslint-disable-next-line no-console
  var log = console.log.bind(console);
  var prunePaths = propsToRemove !== undefined && propsToRemove !== '' ? propsToRemove.split(/ +/) : [];
  var requiredPaths = requiredInitialProps !== undefined && requiredInitialProps !== '' ? requiredInitialProps.split(/ +/) : [];
  function isPruningNeeded(root) {
    if (!root) {
      return false;
    }
    var shouldProcess;

    // Only log hostname and matched JSON payload if only second argument is present
    if (prunePaths.length === 0 && requiredPaths.length > 0) {
      var rootString = JSON.stringify(root);
      var matchRegex = toRegExp(requiredPaths.join(''));
      var shouldLog = matchRegex.test(rootString);
      if (shouldLog) {
        log(window.location.hostname, root);
        shouldProcess = false;
        return shouldProcess;
      }
    }
    for (var i = 0; i < requiredPaths.length; i += 1) {
      var requiredPath = requiredPaths[i];
      var lastNestedPropName = requiredPath.split('.').pop();
      var hasWildcard = requiredPath.indexOf('.*.') > -1 || requiredPath.indexOf('*.') > -1 || requiredPath.indexOf('.*') > -1 || requiredPath.indexOf('.[].') > -1 || requiredPath.indexOf('[].') > -1 || requiredPath.indexOf('.[]') > -1;

      // if the path has wildcard, getPropertyInChain should 'look through' chain props
      var details = getWildcardPropertyInChain(root, requiredPath, hasWildcard);

      // start value of 'shouldProcess' due to checking below
      shouldProcess = !hasWildcard;
      for (var _i = 0; _i < details.length; _i += 1) {
        if (hasWildcard) {
          // if there is a wildcard,
          // at least one (||) of props chain should be present in object
          shouldProcess = !(details[_i].base[lastNestedPropName] === undefined) || shouldProcess;
        } else {
          // otherwise each one (&&) of them should be there
          shouldProcess = !(details[_i].base[lastNestedPropName] === undefined) && shouldProcess;
        }
      }
    }
    return shouldProcess;
  }

  /**
   * Prunes properties of 'root' object
   * @param {Object} root
   */
  var jsonPruner = function jsonPruner(root) {
    if (prunePaths.length === 0 && requiredPaths.length === 0) {
      log(window.location.hostname, root);
      return root;
    }
    try {
      if (isPruningNeeded(root) === false) {
        return root;
      }

      // if pruning is needed, we check every input pathToRemove
      // and delete it if root has it
      prunePaths.forEach(function (path) {
        var ownerObjArr = getWildcardPropertyInChain(root, path, true);
        ownerObjArr.forEach(function (ownerObj) {
          if (ownerObj !== undefined && ownerObj.base) {
            delete ownerObj.base[ownerObj.prop];
            hit(source);
          }
        });
      });
    } catch (e) {
      log(e.toString());
    }
    return root;
  };
  var nativeJSONParse = JSON.parse;
  var jsonParseWrapper = function jsonParseWrapper() {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    // dealing with stringified json in args, which should be parsed.
    // so we call nativeJSONParse as JSON.parse which is bound to JSON object
    var root = nativeJSONParse.apply(JSON, args);
    return jsonPruner(root);
  };

  // JSON.parse mocking
  jsonParseWrapper.toString = nativeJSONParse.toString.bind(nativeJSONParse);
  JSON.parse = jsonParseWrapper;

  // eslint-disable-next-line compat/compat
  var nativeResponseJson = Response.prototype.json;
  // eslint-disable-next-line func-names
  var responseJsonWrapper = function responseJsonWrapper() {
    var promise = nativeResponseJson.apply(this);
    return promise.then(function (obj) {
      return jsonPruner(obj);
    });
  };

  // do nothing if browser does not support Response (e.g. Internet Explorer)
  // https://developer.mozilla.org/en-US/docs/Web/API/Response
  if (typeof Response === 'undefined') {
    return;
  }

  // eslint-disable-next-line compat/compat
  Response.prototype.json = responseJsonWrapper;
}
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
}
function matchStackTrace(stackMatch, stackTrace) {
  if (!stackMatch || stackMatch === '') {
    return true;
  }
  var stackRegexp = toRegExp(stackMatch);
  var refinedStackTrace = stackTrace.split('\n').slice(2) // get rid of our own functions in the stack trace
  .map(function (line) {
    return line.trim();
  }) // trim the lines
  .join('\n');
  return getNativeRegexpTest().call(stackRegexp, refinedStackTrace);
}
function getWildcardPropertyInChain(base, chain) {
  var lookThrough = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
  var output = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [];
  var pos = chain.indexOf('.');
  if (pos === -1) {
    // for paths like 'a.b.*' every final nested prop should be processed
    if (chain === getWildcardSymbol() || chain === '[]') {
      // eslint-disable-next-line no-restricted-syntax
      for (var key in base) {
        // to process each key in base except inherited ones
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
  var prop = chain.slice(0, pos);
  var shouldLookThrough = prop === '[]' && Array.isArray(base) || prop === getWildcardSymbol() && base instanceof Object;
  if (shouldLookThrough) {
    var nextProp = chain.slice(pos + 1);
    var baseKeys = Object.keys(base);

    // if there is a wildcard prop in input chain (e.g. 'ad.*.src' for 'ad.0.src ad.1.src'),
    // each one of base keys should be considered as a potential chain prop in final path
    baseKeys.forEach(function (key) {
      var item = base[key];
      getWildcardPropertyInChain(item, nextProp, lookThrough, output);
    });
  }
  var nextBase = base[prop];
  chain = chain.slice(pos + 1);
  if (nextBase !== undefined) {
    getWildcardPropertyInChain(nextBase, chain, lookThrough, output);
  }
  return output;
}
function toRegExp() {
  var input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  var DEFAULT_VALUE = '.?';
  var FORWARD_SLASH = '/';
  if (input === '') {
    return new RegExp(DEFAULT_VALUE);
  }
  if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
    return new RegExp(input.slice(1, -1));
  }
  var escaped = input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped);
}
function getWildcardSymbol() {
  return '*';
}
function getNativeRegexpTest() {
  return Object.getOwnPropertyDescriptor(RegExp.prototype, 'test').value;
}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        jsonPrune.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
}
function log(source, args){
function log() {
  for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }
  console.log(args); // eslint-disable-line no-console

  (async function () {
    var a = await fetch('https://example.org');
    return a;
  })();
}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        log.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
}
function logAddEventListener(source, args){
function logAddEventListener(source) {
  // eslint-disable-next-line no-console
  var log = console.log.bind(console);
  var nativeAddEventListener = window.EventTarget.prototype.addEventListener;
  function addEventListenerWrapper(type, listener) {
    if (validateType(type) && validateListener(listener)) {
      var logMessage = "addEventListener(\"".concat(type, "\", ").concat(listenerToString(listener), ")");
      log(logMessage);
      hit(source);
    } else if (source.verbose) {
      // logging while debugging
      var _logMessage = "Invalid event type or listener passed to addEventListener:\ntype: ".concat(convertTypeToString(type), "\nlistener: ").concat(convertTypeToString(listener));
      log(_logMessage);
    }
    for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
      args[_key - 2] = arguments[_key];
    }
    return nativeAddEventListener.apply(this, [type, listener].concat(args));
  }
  window.EventTarget.prototype.addEventListener = addEventListenerWrapper;
}
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
}
function validateType(type) {
  // https://github.com/AdguardTeam/Scriptlets/issues/125
  return typeof type !== 'undefined';
}
function validateListener(listener) {
  // https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#parameters
  return typeof listener !== 'undefined' && (typeof listener === 'function' || _typeof_1(listener) === 'object'
  // https://github.com/AdguardTeam/Scriptlets/issues/76
  && listener !== null && typeof listener.handleEvent === 'function');
}
function listenerToString(listener) {
  return typeof listener === 'function' ? listener.toString() : listener.handleEvent.toString();
}
function convertTypeToString(value) {
  var output;
  if (typeof value === 'undefined') {
    output = 'undefined';
  } else if (_typeof_1(value) === 'object') {
    if (value === null) {
      output = 'null';
    } else {
      output = objectToString(value);
    }
  } else {
    output = value.toString();
  }
  return output;
}
function objectToString(obj) {
  return isEmptyObject(obj) ? '{}' : getObjectEntries(obj).map(function (pair) {
    var key = pair[0];
    var value = pair[1];
    var recordValueStr = value;
    if (value instanceof Object) {
      recordValueStr = "{ ".concat(objectToString(value), " }");
    }
    return "".concat(key, ":\"").concat(recordValueStr, "\"");
  }).join(' ');
}
function isEmptyObject(obj) {
  return Object.keys(obj).length === 0;
}
function getObjectEntries(object) {
  var keys = Object.keys(object);
  var entries = [];
  keys.forEach(function (key) {
    return entries.push([key, object[key]]);
  });
  return entries;
}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        logAddEventListener.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
}
function logEval(source, args){
function logEval(source) {
  var log = console.log.bind(console);
  // wrap eval function
  var nativeEval = window.eval;
  function evalWrapper(str) {
    hit(source);
    log("eval(\"".concat(str, "\")"));
    return nativeEval(str);
  }
  window.eval = evalWrapper;

  // wrap new Function
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
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        logEval.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
}
function logOnStacktrace(source, args){
function logOnStacktrace(source, property) {
  if (!property) {
    return;
  }
  var refineStackTrace = function refineStackTrace(stackString) {
    // Split stack trace string by lines and remove first two elements ('Error' and getter call)
    // Remove '    at ' at the start of each string
    var stackSteps = stackString.split('\n').slice(2).map(function (line) {
      return line.replace(/ {4}at /, '');
    });
    // Trim each line extracting funcName : fullPath pair
    var logInfoArray = stackSteps.map(function (line) {
      var funcName;
      var funcFullPath;
      /* eslint-disable-next-line no-useless-escape */
      var reg = /\(([^\)]+)\)/;
      if (line.match(reg)) {
        funcName = line.split(' ').slice(0, -1).join(' ');
        /* eslint-disable-next-line prefer-destructuring, no-useless-escape */
        funcFullPath = line.match(reg)[1];
      } else {
        // For when func name is not available
        funcName = 'function name is not available';
        funcFullPath = line;
      }
      return [funcName, funcFullPath];
    });
    // Convert array into object for better display using console.table
    var logInfoObject = {};
    logInfoArray.forEach(function (pair) {
      /* eslint-disable-next-line prefer-destructuring */
      logInfoObject[pair[0]] = pair[1];
    });
    return logInfoObject;
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
    var value = base[prop];
    /* eslint-disable no-console, compat/compat */
    setPropertyAccess(base, prop, {
      get: function get() {
        hit(source);
        console.log("%cGet %c".concat(prop), 'color:red;', 'color:green;');
        console.table(refineStackTrace(new Error().stack));
        return value;
      },
      set: function set(newValue) {
        hit(source);
        console.log("%cSet %c".concat(prop), 'color:red;', 'color:green;');
        console.table(refineStackTrace(new Error().stack));
        value = newValue;
      }
    });
    /* eslint-enable no-console, compat/compat */
  };

  setChainPropAccess(window, property);
}
function getPropertyInChain(base, chain) {
  var pos = chain.indexOf('.');
  if (pos === -1) {
    return {
      base: base,
      prop: chain
    };
  }
  var prop = chain.slice(0, pos);

  // https://github.com/AdguardTeam/Scriptlets/issues/128
  if (base === null) {
    // if base is null, return 'null' as base.
    // it's needed for triggering the reason logging while debugging
    return {
      base: base,
      prop: prop,
      chain: chain
    };
  }
  var nextBase = base[prop];
  chain = chain.slice(pos + 1);
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
  var currentDescriptor = Object.getOwnPropertyDescriptor(object, property);
  if (currentDescriptor && !currentDescriptor.configurable) {
    return false;
  }
  Object.defineProperty(object, property, descriptor);
  return true;
}
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        logOnStacktrace.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
}
function noTopics(source, args){
function noTopics(source) {
  var TOPICS_PROPERTY_NAME = 'browsingTopics';
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
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
}
function noopPromiseResolve() {
  var responseBody = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '{}';
  if (typeof Response === 'undefined') {
    return;
  }
  // eslint-disable-next-line compat/compat
  var response = new Response(responseBody, {
    status: 200,
    statusText: 'OK'
  });
  // eslint-disable-next-line compat/compat, consistent-return
  return Promise.resolve(response);
}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        noTopics.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
}
function noeval(source, args){
function noeval(source) {
  window.eval = function evalWrapper(s) {
    hit(source, "AdGuard has prevented eval:\n".concat(s));
  }.bind();
}
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        noeval.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
}
function nowebrtc(source, args){
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
    // eslint-disable-next-line max-len
    hit(source, "Document tried to create an RTCPeerConnection: ".concat(convertRtcConfigToString(config)));
  };
  rtcReplacement.prototype = {
    close: noopFunc,
    createDataChannel: noopFunc,
    createOffer: noopFunc,
    setRemoteDescription: noopFunc
  };
  var rtc = window[propertyName];
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
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
}
function noopFunc() {}
function convertRtcConfigToString(config) {
  var UNDEF_STR = 'undefined';
  var str = UNDEF_STR;
  if (config === null) {
    str = 'null';
  } else if (config instanceof Object) {
    var SERVERS_PROP_NAME = 'iceServers';
    var URLS_PROP_NAME = 'urls';
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
}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        nowebrtc.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
}
function preventAddEventListener(source, args){
function preventAddEventListener(source, typeSearch, listenerSearch) {
  var typeSearchRegexp = toRegExp(typeSearch);
  var listenerSearchRegexp = toRegExp(listenerSearch);
  var nativeAddEventListener = window.EventTarget.prototype.addEventListener;
  function addEventListenerWrapper(type, listener) {
    var shouldPrevent = false;
    if (validateType(type) && validateListener(listener)) {
      shouldPrevent = typeSearchRegexp.test(type.toString()) && listenerSearchRegexp.test(listenerToString(listener));
    }
    if (shouldPrevent) {
      hit(source);
      return undefined;
    }
    for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
      args[_key - 2] = arguments[_key];
    }
    return nativeAddEventListener.apply(this, [type, listener].concat(args));
  }
  window.EventTarget.prototype.addEventListener = addEventListenerWrapper;
  // https://github.com/AdguardTeam/Scriptlets/issues/143
  window.addEventListener = addEventListenerWrapper;
  document.addEventListener = addEventListenerWrapper;
}
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
}
function toRegExp() {
  var input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  var DEFAULT_VALUE = '.?';
  var FORWARD_SLASH = '/';
  if (input === '') {
    return new RegExp(DEFAULT_VALUE);
  }
  if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
    return new RegExp(input.slice(1, -1));
  }
  var escaped = input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped);
}
function validateType(type) {
  // https://github.com/AdguardTeam/Scriptlets/issues/125
  return typeof type !== 'undefined';
}
function validateListener(listener) {
  // https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#parameters
  return typeof listener !== 'undefined' && (typeof listener === 'function' || _typeof_1(listener) === 'object'
  // https://github.com/AdguardTeam/Scriptlets/issues/76
  && listener !== null && typeof listener.handleEvent === 'function');
}
function listenerToString(listener) {
  return typeof listener === 'function' ? listener.toString() : listener.handleEvent.toString();
}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        preventAddEventListener.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
}
function preventAdfly(source, args){
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
            // eslint-disable-next-line no-bitwise
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
    /* eslint-disable compat/compat */
    if (window.stop) {
      window.stop();
    }
    /* eslint-enable compat/compat */
    window.onbeforeunload = null;
    window.location.href = decodedURL;
  };
  var val;
  // Do not apply handler more than one time
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
    window.console.error('Failed to set up prevent-adfly scriptlet');
  }
}
function setPropertyAccess(object, property, descriptor) {
  var currentDescriptor = Object.getOwnPropertyDescriptor(object, property);
  if (currentDescriptor && !currentDescriptor.configurable) {
    return false;
  }
  Object.defineProperty(object, property, descriptor);
  return true;
}
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        preventAdfly.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
}
function preventBab(source, args){
function preventBab(source) {
  var nativeSetTimeout = window.setTimeout;
  var babRegex = /\.bab_elementid.$/;
  var timeoutWrapper = function timeoutWrapper(callback) {
    if (typeof callback !== 'string' || !babRegex.test(callback)) {
      for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }
      return nativeSetTimeout.apply(window, [callback].concat(args));
    }
    hit(source);
  };
  window.setTimeout = timeoutWrapper;
  var signatures = [['blockadblock'], ['babasbm'], [/getItem\('babn'\)/], ['getElementById', 'String.fromCharCode', 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 'charAt', 'DOMContentLoaded', 'AdBlock', 'addEventListener', 'doScroll', 'fromCharCode', '<<2|r>>4', 'sessionStorage', 'clientWidth', 'localStorage', 'Math', 'random']];
  var check = function check(str) {
    if (typeof str !== 'string') {
      return false;
    }
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
  var evalWrapper = function evalWrapper(str) {
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
  window.eval = evalWrapper.bind(window);
}
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        preventBab.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
}
function preventElementSrcLoading(source, args){
function preventElementSrcLoading(source, tagName, match) {
  // do nothing if browser does not support Proxy or Reflect
  if (typeof Proxy === 'undefined' || typeof Reflect === 'undefined') {
    return;
  }
  var srcMockData = {
    // "KCk9Pnt9" = "()=>{}"
    script: 'data:text/javascript;base64,KCk9Pnt9',
    // Empty 1x1 image
    img: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==',
    // Empty h1 tag
    iframe: 'data:text/html;base64, PGRpdj48L2Rpdj4='
  };
  var instance;
  if (tagName === 'script') {
    instance = HTMLScriptElement;
  } else if (tagName === 'img') {
    instance = HTMLImageElement;
  } else if (tagName === 'iframe') {
    instance = HTMLIFrameElement;
  } else {
    return;
  }
  // For websites that use Trusted Types
  // https://w3c.github.io/webappsec-trusted-types/dist/spec/
  var hasTrustedTypes = window.trustedTypes && typeof window.trustedTypes.createPolicy === 'function';
  var policy;
  if (hasTrustedTypes) {
    policy = window.trustedTypes.createPolicy('mock', {
      createScriptURL: function createScriptURL(arg) {
        return arg;
      }
    });
  }
  var SOURCE_PROPERTY_NAME = 'src';
  var searchRegexp = toRegExp(match);
  var setAttributeWrapper = function setAttributeWrapper(target, thisArg, args) {
    // Check if arguments are present
    if (!args[0] || !args[1]) {
      return Reflect.apply(target, thisArg, args);
    }
    var nodeName = thisArg.nodeName.toLowerCase();
    var attrName = args[0].toLowerCase();
    var attrValue = args[1];
    var isMatched = attrName === SOURCE_PROPERTY_NAME && tagName.toLowerCase() === nodeName && srcMockData[nodeName] && searchRegexp.test(attrValue);
    if (!isMatched) {
      return Reflect.apply(target, thisArg, args);
    }
    hit(source);
    // Forward the URI that corresponds with element's MIME type
    return Reflect.apply(target, thisArg, [attrName, srcMockData[nodeName]]);
  };
  var setAttributeHandler = {
    apply: setAttributeWrapper
  };
  // eslint-disable-next-line max-len
  instance.prototype.setAttribute = new Proxy(Element.prototype.setAttribute, setAttributeHandler);
  var origDescriptor = safeGetDescriptor(instance.prototype, SOURCE_PROPERTY_NAME);
  if (!origDescriptor) {
    return;
  }
  Object.defineProperty(instance.prototype, SOURCE_PROPERTY_NAME, {
    enumerable: true,
    configurable: true,
    get: function get() {
      return origDescriptor.get.call(this);
    },
    set: function set(urlValue) {
      var nodeName = this.nodeName.toLowerCase();
      var isMatched = tagName.toLowerCase() === nodeName && srcMockData[nodeName] && searchRegexp.test(urlValue);
      if (!isMatched) {
        origDescriptor.set.call(this, urlValue);
        return;
      }

      // eslint-disable-next-line no-undef
      if (policy && urlValue instanceof TrustedScriptURL) {
        var trustedSrc = policy.createScriptURL(urlValue);
        origDescriptor.set.call(this, trustedSrc);
        hit(source);
        return;
      }
      origDescriptor.set.call(this, srcMockData[nodeName]);
      hit(source);
    }
  });
}
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
}
function toRegExp() {
  var input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  var DEFAULT_VALUE = '.?';
  var FORWARD_SLASH = '/';
  if (input === '') {
    return new RegExp(DEFAULT_VALUE);
  }
  if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
    return new RegExp(input.slice(1, -1));
  }
  var escaped = input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped);
}
function safeGetDescriptor(obj, prop) {
  var descriptor = Object.getOwnPropertyDescriptor(obj, prop);
  if (descriptor && descriptor.configurable) {
    return descriptor;
  }
  return null;
}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        preventElementSrcLoading.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
}
function preventEvalIf(source, args){
function preventEvalIf(source, search) {
  var searchRegexp = toRegExp(search);
  var nativeEval = window.eval;
  window.eval = function (payload) {
    if (!searchRegexp.test(payload.toString())) {
      return nativeEval.call(window, payload);
    }
    hit(source, payload);
    return undefined;
  }.bind(window);
}
function toRegExp() {
  var input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  var DEFAULT_VALUE = '.?';
  var FORWARD_SLASH = '/';
  if (input === '') {
    return new RegExp(DEFAULT_VALUE);
  }
  if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
    return new RegExp(input.slice(1, -1));
  }
  var escaped = input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped);
}
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        preventEvalIf.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
}
function preventFab(source, args){
function preventFab(source) {
  hit(source);

  // redefines Fab function for adblock detection
  var Fab = function Fab() {};
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
  var fab = new Fab();
  var getSetFab = {
    get: function get() {
      return Fab;
    },
    set: function set() {}
  };
  var getsetfab = {
    get: function get() {
      return fab;
    },
    set: function set() {}
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
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
function preventFetch(source, args){
function preventFetch(source, propsToMatch) {
  var responseBody = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'emptyObj';
  // do nothing if browser does not support fetch or Proxy (e.g. Internet Explorer)
  // https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
  if (typeof fetch === 'undefined' || typeof Proxy === 'undefined' || typeof Response === 'undefined') {
    return;
  }
  var strResponseBody;
  if (responseBody === 'emptyObj') {
    strResponseBody = '{}';
  } else if (responseBody === 'emptyArr') {
    strResponseBody = '[]';
  } else {
    return;
  }
  var handlerWrapper = function handlerWrapper(target, thisArg, args) {
    var shouldPrevent = false;
    var fetchData = getFetchData(args);
    if (typeof propsToMatch === 'undefined') {
      // log if no propsToMatch given
      var logMessage = "log: fetch( ".concat(objectToString(fetchData), " )");
      hit(source, logMessage);
    } else if (propsToMatch === '' || propsToMatch === getWildcardSymbol()) {
      // prevent all fetch calls
      shouldPrevent = true;
    } else {
      var parsedData = parseMatchProps(propsToMatch);
      if (!validateParsedData(parsedData)) {
        // eslint-disable-next-line no-console
        console.log("Invalid parameter: ".concat(propsToMatch));
        shouldPrevent = false;
      } else {
        var matchData = getMatchPropsData(parsedData);
        // prevent only if all props match
        shouldPrevent = Object.keys(matchData).every(function (matchKey) {
          var matchValue = matchData[matchKey];
          return Object.prototype.hasOwnProperty.call(fetchData, matchKey) && matchValue.test(fetchData[matchKey]);
        });
      }
    }
    if (shouldPrevent) {
      hit(source);
      return noopPromiseResolve(strResponseBody);
    }
    return Reflect.apply(target, thisArg, args);
  };
  var fetchHandler = {
    apply: handlerWrapper
  };
  fetch = new Proxy(fetch, fetchHandler); // eslint-disable-line no-global-assign
}
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
}
function getFetchData(args) {
  var fetchPropsObj = {};
  var fetchUrl;
  var fetchInit;
  if (args[0] instanceof Request) {
    // if Request passed to fetch, it will be in array
    var requestData = getRequestData(args[0]);
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
}
function objectToString(obj) {
  return isEmptyObject(obj) ? '{}' : getObjectEntries(obj).map(function (pair) {
    var key = pair[0];
    var value = pair[1];
    var recordValueStr = value;
    if (value instanceof Object) {
      recordValueStr = "{ ".concat(objectToString(value), " }");
    }
    return "".concat(key, ":\"").concat(recordValueStr, "\"");
  }).join(' ');
}
function parseMatchProps(propsToMatchStr) {
  var PROPS_DIVIDER = ' ';
  var PAIRS_MARKER = ':';
  var propsObj = {};
  var props = propsToMatchStr.split(PROPS_DIVIDER);
  props.forEach(function (prop) {
    var dividerInd = prop.indexOf(PAIRS_MARKER);
    if (dividerInd === -1) {
      propsObj.url = prop;
    } else {
      var key = prop.slice(0, dividerInd);
      var value = prop.slice(dividerInd + 1);
      propsObj[key] = value;
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
  var matchData = {};
  Object.keys(data).forEach(function (key) {
    matchData[key] = toRegExp(data[key]);
  });
  return matchData;
}
function noopPromiseResolve() {
  var responseBody = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '{}';
  if (typeof Response === 'undefined') {
    return;
  }
  // eslint-disable-next-line compat/compat
  var response = new Response(responseBody, {
    status: 200,
    statusText: 'OK'
  });
  // eslint-disable-next-line compat/compat, consistent-return
  return Promise.resolve(response);
}
function getWildcardSymbol() {
  return '*';
}
function toRegExp() {
  var input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  var DEFAULT_VALUE = '.?';
  var FORWARD_SLASH = '/';
  if (input === '') {
    return new RegExp(DEFAULT_VALUE);
  }
  if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
    return new RegExp(input.slice(1, -1));
  }
  var escaped = input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped);
}
function isValidStrPattern(input) {
  var FORWARD_SLASH = '/';
  var str = escapeRegExp(input);
  if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
    str = input.slice(1, -1);
  }
  var isValid;
  try {
    isValid = new RegExp(str);
    isValid = true;
  } catch (e) {
    isValid = false;
  }
  return isValid;
}
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function isEmptyObject(obj) {
  return Object.keys(obj).length === 0;
}
function getRequestData(request) {
  var REQUEST_INIT_OPTIONS = ['url', 'method', 'headers', 'body', 'mode', 'credentials', 'cache', 'redirect', 'referrer', 'integrity'];
  var entries = REQUEST_INIT_OPTIONS.map(function (key) {
    // if request has no such option, value will be undefined
    var value = request[key];
    return [key, value];
  });
  return getObjectFromEntries(entries);
}
function getObjectEntries(object) {
  var keys = Object.keys(object);
  var entries = [];
  keys.forEach(function (key) {
    return entries.push([key, object[key]]);
  });
  return entries;
}
function getObjectFromEntries(entries) {
  var output = entries.reduce(function (acc, el) {
    var key = el[0];
    var value = el[1];
    acc[key] = value;
    return acc;
  }, {});
  return output;
}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        preventFetch.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
}
function preventPopadsNet(source, args){
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
function createOnErrorHandler(rid) {
  // eslint-disable-next-line consistent-return
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
function randomId() {
  return Math.random().toString(36).substr(2, 9);
}
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        preventPopadsNet.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
}
function preventRefresh(source, args){
function preventRefresh(source, delaySec) {
  var getMetaElements = function getMetaElements() {
    var metaNodes = [];
    try {
      metaNodes = document.querySelectorAll('meta[http-equiv="refresh" i][content]');
    } catch (e) {
      // 'i' attribute flag is problematic in Edge 15
      try {
        metaNodes = document.querySelectorAll('meta[http-equiv="refresh"][content]');
      } catch (e) {
        if (source.verbose) {
          // eslint-disable-next-line no-console
          console.log(e);
        }
      }
    }
    return Array.from(metaNodes);
  };
  var getMetaContentDelay = function getMetaContentDelay(metaElements) {
    var delays = metaElements.map(function (meta) {
      var contentString = meta.getAttribute('content');
      if (contentString.length === 0) {
        return null;
      }
      var contentDelay;
      // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta#attr-http-equiv
      var limiterIndex = contentString.indexOf(';');
      if (limiterIndex !== -1) {
        var delaySubstring = contentString.substring(0, limiterIndex);
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
    var minDelay = delays.reduce(function (a, b) {
      return Math.min(a, b);
    });
    // eslint-disable-next-line consistent-return
    return minDelay;
  };
  var stop = function stop() {
    var metaElements = getMetaElements();
    if (metaElements.length === 0) {
      return;
    }
    var secondsToRun = getNumberFromString(delaySec);
    // Check if argument is provided
    if (secondsToRun === null) {
      secondsToRun = getMetaContentDelay(metaElements);
    }
    // Check if meta tag has delay
    if (secondsToRun === null) {
      return;
    }
    var delayMs = secondsToRun * 1000;
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
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
}
function getNumberFromString(rawString) {
  var parsedDelay = parseInt(rawString, 10);
  var validDelay = nativeIsNaN(parsedDelay) ? null : parsedDelay;
  return validDelay;
}
function nativeIsNaN(num) {
  // eslint-disable-next-line no-restricted-properties
  var native = Number.isNaN || window.isNaN;
  return native(num);
}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        preventRefresh.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
}
function preventRequestAnimationFrame(source, args){
function preventRequestAnimationFrame(source, match) {
  var nativeRequestAnimationFrame = window.requestAnimationFrame;
  var log = console.log.bind(console); // eslint-disable-line no-console

  // logs requestAnimationFrame to console if no arguments have been specified
  var shouldLog = typeof match === 'undefined';
  var _parseMatchArg = parseMatchArg(match),
    isInvertedMatch = _parseMatchArg.isInvertedMatch,
    matchRegexp = _parseMatchArg.matchRegexp;
  var rafWrapper = function rafWrapper(callback) {
    var shouldPrevent = false;
    if (shouldLog) {
      hit(source);
      log("requestAnimationFrame(".concat(String(callback), ")"));
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
    return nativeRequestAnimationFrame.apply(window, [callback].concat(args));
  };
  window.requestAnimationFrame = rafWrapper;
}
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
}
function noopFunc() {}
function parseMatchArg(match) {
  var INVERT_MARKER = '!';
  var isInvertedMatch = startsWith(match, INVERT_MARKER);
  var matchValue = isInvertedMatch ? match.slice(1) : match;
  var matchRegexp = toRegExp(matchValue);
  return {
    isInvertedMatch: isInvertedMatch,
    matchRegexp: matchRegexp
  };
}
function isValidStrPattern(input) {
  var FORWARD_SLASH = '/';
  var str = escapeRegExp(input);
  if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
    str = input.slice(1, -1);
  }
  var isValid;
  try {
    isValid = new RegExp(str);
    isValid = true;
  } catch (e) {
    isValid = false;
  }
  return isValid;
}
function isValidCallback(callback) {
  return callback instanceof Function
  // passing string as 'code' arg is not recommended
  // but it is possible and not restricted
  // https://developer.mozilla.org/en-US/docs/Web/API/setTimeout#parameters
  || typeof callback === 'string';
}
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function toRegExp() {
  var input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  var DEFAULT_VALUE = '.?';
  var FORWARD_SLASH = '/';
  if (input === '') {
    return new RegExp(DEFAULT_VALUE);
  }
  if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
    return new RegExp(input.slice(1, -1));
  }
  var escaped = input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped);
}
function startsWith(str, prefix) {
  // if str === '', (str && false) will return ''
  // that's why it has to be !!str
  return !!str && str.indexOf(prefix) === 0;
}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        preventRequestAnimationFrame.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
}
function preventSetInterval(source, args){
function preventSetInterval(source, matchCallback, matchDelay) {
  // if browser does not support Proxy (e.g. Internet Explorer),
  // we use none-proxy "legacy" wrapper for preventing
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
  var isProxySupported = typeof Proxy !== 'undefined';
  var nativeInterval = window.setInterval;
  var log = console.log.bind(console); // eslint-disable-line no-console

  // logs setIntervals to console if no arguments have been specified
  var shouldLog = typeof matchCallback === 'undefined' && typeof matchDelay === 'undefined';
  var legacyIntervalWrapper = function legacyIntervalWrapper(callback, delay) {
    var shouldPrevent = false;
    if (shouldLog) {
      hit(source);
      // https://github.com/AdguardTeam/Scriptlets/issues/105
      log("setInterval(".concat(String(callback), ", ").concat(delay, ")"));
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
      return nativeInterval(noopFunc, delay);
    }
    for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
      args[_key - 2] = arguments[_key];
    }
    return nativeInterval.apply(window, [callback, delay].concat(args));
  };
  var handlerWrapper = function handlerWrapper(target, thisArg, args) {
    var callback = args[0];
    var delay = args[1];
    var shouldPrevent = false;
    if (shouldLog) {
      hit(source);
      // https://github.com/AdguardTeam/Scriptlets/issues/105
      log("setInterval(".concat(String(callback), ", ").concat(delay, ")"));
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
  var setIntervalHandler = {
    apply: handlerWrapper
  };
  window.setInterval = isProxySupported ? new Proxy(window.setInterval, setIntervalHandler) : legacyIntervalWrapper;
}
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
}
function noopFunc() {}
function isPreventionNeeded(_ref) {
  var callback = _ref.callback,
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
  var _parseMatchArg = parseMatchArg(matchCallback),
    isInvertedMatch = _parseMatchArg.isInvertedMatch,
    matchRegexp = _parseMatchArg.matchRegexp;
  var _parseDelayArg = parseDelayArg(matchDelay),
    isInvertedDelayMatch = _parseDelayArg.isInvertedDelayMatch,
    delayMatch = _parseDelayArg.delayMatch;
  var shouldPrevent = false;
  // https://github.com/AdguardTeam/Scriptlets/issues/105
  var callbackStr = String(callback);
  if (delayMatch === null) {
    shouldPrevent = matchRegexp.test(callbackStr) !== isInvertedMatch;
  } else if (!matchCallback) {
    shouldPrevent = delay === delayMatch !== isInvertedDelayMatch;
  } else {
    shouldPrevent = matchRegexp.test(callbackStr) !== isInvertedMatch && delay === delayMatch !== isInvertedDelayMatch;
  }
  return shouldPrevent;
}
function toRegExp() {
  var input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  var DEFAULT_VALUE = '.?';
  var FORWARD_SLASH = '/';
  if (input === '') {
    return new RegExp(DEFAULT_VALUE);
  }
  if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
    return new RegExp(input.slice(1, -1));
  }
  var escaped = input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped);
}
function startsWith(str, prefix) {
  // if str === '', (str && false) will return ''
  // that's why it has to be !!str
  return !!str && str.indexOf(prefix) === 0;
}
function nativeIsNaN(num) {
  // eslint-disable-next-line no-restricted-properties
  var native = Number.isNaN || window.isNaN;
  return native(num);
}
function parseMatchArg(match) {
  var INVERT_MARKER = '!';
  var isInvertedMatch = startsWith(match, INVERT_MARKER);
  var matchValue = isInvertedMatch ? match.slice(1) : match;
  var matchRegexp = toRegExp(matchValue);
  return {
    isInvertedMatch: isInvertedMatch,
    matchRegexp: matchRegexp
  };
}
function parseDelayArg(delay) {
  var INVERT_MARKER = '!';
  var isInvertedDelayMatch = startsWith(delay, INVERT_MARKER);
  var delayValue = isInvertedDelayMatch ? delay.slice(1) : delay;
  delayValue = parseInt(delayValue, 10);
  var delayMatch = nativeIsNaN(delayValue) ? null : delayValue;
  return {
    isInvertedDelayMatch: isInvertedDelayMatch,
    delayMatch: delayMatch
  };
}
function isValidCallback(callback) {
  return callback instanceof Function
  // passing string as 'code' arg is not recommended
  // but it is possible and not restricted
  // https://developer.mozilla.org/en-US/docs/Web/API/setTimeout#parameters
  || typeof callback === 'string';
}
function isValidMatchStr(match) {
  var INVERT_MARKER = '!';
  var str = match;
  if (startsWith(match, INVERT_MARKER)) {
    str = match.slice(1);
  }
  return isValidStrPattern(str);
}
function isValidStrPattern(input) {
  var FORWARD_SLASH = '/';
  var str = escapeRegExp(input);
  if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
    str = input.slice(1, -1);
  }
  var isValid;
  try {
    isValid = new RegExp(str);
    isValid = true;
  } catch (e) {
    isValid = false;
  }
  return isValid;
}
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function nativeIsFinite(num) {
  // eslint-disable-next-line no-restricted-properties
  var native = Number.isFinite || window.isFinite;
  return native(num);
}
function isValidMatchNumber(match) {
  var INVERT_MARKER = '!';
  var str = match;
  if (startsWith(match, INVERT_MARKER)) {
    str = match.slice(1);
  }
  var num = parseFloat(str);
  return !nativeIsNaN(num) && nativeIsFinite(num);
}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        preventSetInterval.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
}
function preventSetTimeout(source, args){
function preventSetTimeout(source, matchCallback, matchDelay) {
  // if browser does not support Proxy (e.g. Internet Explorer),
  // we use none-proxy "legacy" wrapper for preventing
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
  var isProxySupported = typeof Proxy !== 'undefined';
  var nativeTimeout = window.setTimeout;
  var log = console.log.bind(console); // eslint-disable-line no-console

  // logs setTimeouts to console if no arguments have been specified
  var shouldLog = typeof matchCallback === 'undefined' && typeof matchDelay === 'undefined';
  var legacyTimeoutWrapper = function legacyTimeoutWrapper(callback, delay) {
    var shouldPrevent = false;
    if (shouldLog) {
      hit(source);
      // https://github.com/AdguardTeam/Scriptlets/issues/105
      log("setTimeout(".concat(String(callback), ", ").concat(delay, ")"));
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
      return nativeTimeout(noopFunc, delay);
    }
    for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
      args[_key - 2] = arguments[_key];
    }
    return nativeTimeout.apply(window, [callback, delay].concat(args));
  };
  var handlerWrapper = function handlerWrapper(target, thisArg, args) {
    var callback = args[0];
    var delay = args[1];
    var shouldPrevent = false;
    if (shouldLog) {
      hit(source);
      // https://github.com/AdguardTeam/Scriptlets/issues/105
      log("setTimeout(".concat(String(callback), ", ").concat(delay, ")"));
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
  var setTimeoutHandler = {
    apply: handlerWrapper
  };
  window.setTimeout = isProxySupported ? new Proxy(window.setTimeout, setTimeoutHandler) : legacyTimeoutWrapper;
}
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
}
function noopFunc() {}
function isPreventionNeeded(_ref) {
  var callback = _ref.callback,
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
  var _parseMatchArg = parseMatchArg(matchCallback),
    isInvertedMatch = _parseMatchArg.isInvertedMatch,
    matchRegexp = _parseMatchArg.matchRegexp;
  var _parseDelayArg = parseDelayArg(matchDelay),
    isInvertedDelayMatch = _parseDelayArg.isInvertedDelayMatch,
    delayMatch = _parseDelayArg.delayMatch;
  var shouldPrevent = false;
  // https://github.com/AdguardTeam/Scriptlets/issues/105
  var callbackStr = String(callback);
  if (delayMatch === null) {
    shouldPrevent = matchRegexp.test(callbackStr) !== isInvertedMatch;
  } else if (!matchCallback) {
    shouldPrevent = delay === delayMatch !== isInvertedDelayMatch;
  } else {
    shouldPrevent = matchRegexp.test(callbackStr) !== isInvertedMatch && delay === delayMatch !== isInvertedDelayMatch;
  }
  return shouldPrevent;
}
function parseMatchArg(match) {
  var INVERT_MARKER = '!';
  var isInvertedMatch = startsWith(match, INVERT_MARKER);
  var matchValue = isInvertedMatch ? match.slice(1) : match;
  var matchRegexp = toRegExp(matchValue);
  return {
    isInvertedMatch: isInvertedMatch,
    matchRegexp: matchRegexp
  };
}
function parseDelayArg(delay) {
  var INVERT_MARKER = '!';
  var isInvertedDelayMatch = startsWith(delay, INVERT_MARKER);
  var delayValue = isInvertedDelayMatch ? delay.slice(1) : delay;
  delayValue = parseInt(delayValue, 10);
  var delayMatch = nativeIsNaN(delayValue) ? null : delayValue;
  return {
    isInvertedDelayMatch: isInvertedDelayMatch,
    delayMatch: delayMatch
  };
}
function toRegExp() {
  var input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  var DEFAULT_VALUE = '.?';
  var FORWARD_SLASH = '/';
  if (input === '') {
    return new RegExp(DEFAULT_VALUE);
  }
  if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
    return new RegExp(input.slice(1, -1));
  }
  var escaped = input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped);
}
function startsWith(str, prefix) {
  // if str === '', (str && false) will return ''
  // that's why it has to be !!str
  return !!str && str.indexOf(prefix) === 0;
}
function nativeIsNaN(num) {
  // eslint-disable-next-line no-restricted-properties
  var native = Number.isNaN || window.isNaN;
  return native(num);
}
function isValidCallback(callback) {
  return callback instanceof Function
  // passing string as 'code' arg is not recommended
  // but it is possible and not restricted
  // https://developer.mozilla.org/en-US/docs/Web/API/setTimeout#parameters
  || typeof callback === 'string';
}
function isValidMatchStr(match) {
  var INVERT_MARKER = '!';
  var str = match;
  if (startsWith(match, INVERT_MARKER)) {
    str = match.slice(1);
  }
  return isValidStrPattern(str);
}
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function isValidStrPattern(input) {
  var FORWARD_SLASH = '/';
  var str = escapeRegExp(input);
  if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
    str = input.slice(1, -1);
  }
  var isValid;
  try {
    isValid = new RegExp(str);
    isValid = true;
  } catch (e) {
    isValid = false;
  }
  return isValid;
}
function nativeIsFinite(num) {
  // eslint-disable-next-line no-restricted-properties
  var native = Number.isFinite || window.isFinite;
  return native(num);
}
function isValidMatchNumber(match) {
  var INVERT_MARKER = '!';
  var str = match;
  if (startsWith(match, INVERT_MARKER)) {
    str = match.slice(1);
  }
  var num = parseFloat(str);
  return !nativeIsNaN(num) && nativeIsFinite(num);
}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        preventSetTimeout.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
}
function preventWindowOpen(source, args){
function preventWindowOpen(source) {
  var match = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : getWildcardSymbol();
  var delay = arguments.length > 2 ? arguments[2] : undefined;
  var replacement = arguments.length > 3 ? arguments[3] : undefined;
  // default match value is needed for preventing all window.open calls
  // if scriptlet runs without args
  var nativeOpen = window.open;
  var isNewSyntax = match !== '0' && match !== '1';
  var oldOpenWrapper = function oldOpenWrapper(str) {
    match = Number(match) > 0;
    // 'delay' was 'search' prop for matching in old syntax
    for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      args[_key - 1] = arguments[_key];
    }
    if (!isValidStrPattern(delay)) {
      // eslint-disable-next-line no-console
      console.log("Invalid parameter: ".concat(delay));
      return nativeOpen.apply(window, [str].concat(args));
    }
    var searchRegexp = toRegExp(delay);
    if (match !== searchRegexp.test(str)) {
      return nativeOpen.apply(window, [str].concat(args));
    }
    hit(source);
    return handleOldReplacement(replacement);
  };
  var newOpenWrapper = function newOpenWrapper(url) {
    var shouldLog = replacement && replacement.indexOf('log') > -1;
    for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
      args[_key2 - 1] = arguments[_key2];
    }
    if (shouldLog) {
      var argsStr = args && args.length > 0 ? ", ".concat(args.join(', ')) : '';
      var logMessage = "log: window-open: ".concat(url).concat(argsStr);
      hit(source, logMessage);
    }
    var shouldPrevent = false;
    if (match === getWildcardSymbol()) {
      shouldPrevent = true;
    } else if (isValidMatchStr(match)) {
      var _parseMatchArg = parseMatchArg(match),
        isInvertedMatch = _parseMatchArg.isInvertedMatch,
        matchRegexp = _parseMatchArg.matchRegexp;
      shouldPrevent = matchRegexp.test(url) !== isInvertedMatch;
    } else {
      // eslint-disable-next-line no-console
      console.log("Invalid parameter: ".concat(match));
      shouldPrevent = false;
    }
    if (shouldPrevent) {
      var parsedDelay = parseInt(delay, 10);
      var result;
      if (nativeIsNaN(parsedDelay)) {
        result = noopNull();
      } else {
        var decoyArgs = {
          replacement: replacement,
          url: url,
          delay: parsedDelay
        };
        var decoy = createDecoy(decoyArgs);
        var popup = decoy.contentWindow;
        if (_typeof_1(popup) === 'object' && popup !== null) {
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
          var nativeGetter = decoy.contentWindow && decoy.contentWindow.get;
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
    return nativeOpen.apply(window, [url].concat(args));
  };
  window.open = isNewSyntax ? newOpenWrapper : oldOpenWrapper;

  // Protect window.open from native code check
  window.open.toString = nativeOpen.toString.bind(nativeOpen);
}
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
}
function isValidStrPattern(input) {
  var FORWARD_SLASH = '/';
  var str = escapeRegExp(input);
  if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
    str = input.slice(1, -1);
  }
  var isValid;
  try {
    isValid = new RegExp(str);
    isValid = true;
  } catch (e) {
    isValid = false;
  }
  return isValid;
}
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function isValidMatchStr(match) {
  var INVERT_MARKER = '!';
  var str = match;
  if (startsWith(match, INVERT_MARKER)) {
    str = match.slice(1);
  }
  return isValidStrPattern(str);
}
function toRegExp() {
  var input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  var DEFAULT_VALUE = '.?';
  var FORWARD_SLASH = '/';
  if (input === '') {
    return new RegExp(DEFAULT_VALUE);
  }
  if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
    return new RegExp(input.slice(1, -1));
  }
  var escaped = input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped);
}
function nativeIsNaN(num) {
  // eslint-disable-next-line no-restricted-properties
  var native = Number.isNaN || window.isNaN;
  return native(num);
}
function parseMatchArg(match) {
  var INVERT_MARKER = '!';
  var isInvertedMatch = startsWith(match, INVERT_MARKER);
  var matchValue = isInvertedMatch ? match.slice(1) : match;
  var matchRegexp = toRegExp(matchValue);
  return {
    isInvertedMatch: isInvertedMatch,
    matchRegexp: matchRegexp
  };
}
function handleOldReplacement(replacement) {
  var result;
  // defaults to return noopFunc instead of window.open
  if (!replacement) {
    result = noopFunc;
  } else if (replacement === 'trueFunc') {
    result = trueFunc;
  } else if (replacement.indexOf('=') > -1) {
    // We should return noopFunc instead of window.open
    // but with some property if website checks it (examples 5, 6)
    // https://github.com/AdguardTeam/Scriptlets/issues/71
    var isProp = startsWith(replacement, '{') && endsWith(replacement, '}');
    if (isProp) {
      var propertyPart = replacement.slice(1, -1);
      var propertyName = substringBefore(propertyPart, '=');
      var propertyValue = substringAfter(propertyPart, '=');
      if (propertyValue === 'noopFunc') {
        result = {};
        result[propertyName] = noopFunc;
      }
    }
  }
  return result;
}
function createDecoy(args) {
  var OBJECT_TAG_NAME = 'object';
  var OBJECT_URL_PROP_NAME = 'data';
  var IFRAME_TAG_NAME = 'iframe';
  var IFRAME_URL_PROP_NAME = 'src';
  var replacement = args.replacement,
    url = args.url,
    delay = args.delay;
  var tag;
  var urlProp;
  if (replacement === 'obj') {
    tag = OBJECT_TAG_NAME;
    urlProp = OBJECT_URL_PROP_NAME;
  } else {
    tag = IFRAME_TAG_NAME;
    urlProp = IFRAME_URL_PROP_NAME;
  }
  var decoy = document.createElement(tag);
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
}
function getPreventGetter(nativeGetter) {
  var preventGetter = function preventGetter(target, prop) {
    if (prop && prop === 'closed') {
      return false;
    }
    if (typeof nativeGetter === 'function') {
      return noopFunc;
    }
    return prop && target[prop];
  };
  return preventGetter;
}
function noopNull() {
  return null;
}
function getWildcardSymbol() {
  return '*';
}
function noopFunc() {}
function trueFunc() {
  return true;
}
function startsWith(str, prefix) {
  // if str === '', (str && false) will return ''
  // that's why it has to be !!str
  return !!str && str.indexOf(prefix) === 0;
}
function endsWith(str, ending) {
  // if str === '', (str && false) will return ''
  // that's why it has to be !!str
  return !!str && str.indexOf(ending) === str.length - ending.length;
}
function substringBefore(str, separator) {
  if (!str || !separator) {
    return str;
  }
  var index = str.indexOf(separator);
  return index < 0 ? str : str.substring(0, index);
}
function substringAfter(str, separator) {
  if (!str) {
    return str;
  }
  var index = str.indexOf(separator);
  return index < 0 ? '' : str.substring(index + separator.length);
}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        preventWindowOpen.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
}
function preventXHR(source, args){
function preventXHR(source, propsToMatch, customResponseText) {
  // do nothing if browser does not support Proxy (e.g. Internet Explorer)
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
  if (typeof Proxy === 'undefined') {
    return;
  }
  var shouldPrevent = false;
  var response = '';
  var responseText = '';
  var responseUrl;
  var openWrapper = function openWrapper(target, thisArg, args) {
    // Get method and url from .open()
    var xhrData = {
      method: args[0],
      url: args[1]
    };
    responseUrl = xhrData.url;
    if (typeof propsToMatch === 'undefined') {
      // Log if no propsToMatch given
      var logMessage = "log: xhr( ".concat(objectToString(xhrData), " )");
      hit(source, logMessage);
    } else if (propsToMatch === '' || propsToMatch === getWildcardSymbol()) {
      // Prevent all fetch calls
      shouldPrevent = true;
    } else {
      var parsedData = parseMatchProps(propsToMatch);
      if (!validateParsedData(parsedData)) {
        // eslint-disable-next-line no-console
        console.log("Invalid parameter: ".concat(propsToMatch));
        shouldPrevent = false;
      } else {
        var matchData = getMatchPropsData(parsedData);
        // prevent only if all props match
        shouldPrevent = Object.keys(matchData).every(function (matchKey) {
          var matchValue = matchData[matchKey];
          return Object.prototype.hasOwnProperty.call(xhrData, matchKey) && matchValue.test(xhrData[matchKey]);
        });
      }
    }
    return Reflect.apply(target, thisArg, args);
  };
  var sendWrapper = function sendWrapper(target, thisArg, args) {
    if (!shouldPrevent) {
      return Reflect.apply(target, thisArg, args);
    }
    if (thisArg.responseType === 'blob') {
      response = new Blob();
    }
    if (thisArg.responseType === 'arraybuffer') {
      response = new ArrayBuffer();
    }
    if (customResponseText) {
      var randomText = generateRandomResponse(customResponseText);
      if (randomText) {
        responseText = randomText;
      } else {
        // eslint-disable-next-line no-console
        console.log("Invalid range: ".concat(customResponseText));
      }
    }
    // Mock response object
    Object.defineProperties(thisArg, {
      readyState: {
        value: 4,
        writable: false
      },
      response: {
        value: response,
        writable: false
      },
      responseText: {
        value: responseText,
        writable: false
      },
      responseURL: {
        value: responseUrl,
        writable: false
      },
      responseXML: {
        value: '',
        writable: false
      },
      status: {
        value: 200,
        writable: false
      },
      statusText: {
        value: 'OK',
        writable: false
      }
    });
    // Mock events
    setTimeout(function () {
      var stateEvent = new Event('readystatechange');
      thisArg.dispatchEvent(stateEvent);
      var loadEvent = new Event('load');
      thisArg.dispatchEvent(loadEvent);
      var loadEndEvent = new Event('loadend');
      thisArg.dispatchEvent(loadEndEvent);
    }, 1);
    hit(source);
    return undefined;
  };
  var openHandler = {
    apply: openWrapper
  };
  var sendHandler = {
    apply: sendWrapper
  };
  XMLHttpRequest.prototype.open = new Proxy(XMLHttpRequest.prototype.open, openHandler);
  XMLHttpRequest.prototype.send = new Proxy(XMLHttpRequest.prototype.send, sendHandler);
}
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
}
function objectToString(obj) {
  return isEmptyObject(obj) ? '{}' : getObjectEntries(obj).map(function (pair) {
    var key = pair[0];
    var value = pair[1];
    var recordValueStr = value;
    if (value instanceof Object) {
      recordValueStr = "{ ".concat(objectToString(value), " }");
    }
    return "".concat(key, ":\"").concat(recordValueStr, "\"");
  }).join(' ');
}
function getWildcardSymbol() {
  return '*';
}
function parseMatchProps(propsToMatchStr) {
  var PROPS_DIVIDER = ' ';
  var PAIRS_MARKER = ':';
  var propsObj = {};
  var props = propsToMatchStr.split(PROPS_DIVIDER);
  props.forEach(function (prop) {
    var dividerInd = prop.indexOf(PAIRS_MARKER);
    if (dividerInd === -1) {
      propsObj.url = prop;
    } else {
      var key = prop.slice(0, dividerInd);
      var value = prop.slice(dividerInd + 1);
      propsObj[key] = value;
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
  var matchData = {};
  Object.keys(data).forEach(function (key) {
    matchData[key] = toRegExp(data[key]);
  });
  return matchData;
}
function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min);
}
function getRandomStrByLength(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+=~';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i += 1) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
function generateRandomResponse(customResponseText) {
  var customResponse = customResponseText;
  if (customResponse === 'true') {
    // Generate random alphanumeric string of 10 symbols
    customResponse = Math.random().toString(36).slice(-10);
    return customResponse;
  }
  customResponse = customResponse.replace('length:', '');
  var rangeRegex = /^\d+-\d+$/;
  // Return empty string if range is invalid
  if (!rangeRegex.test(customResponse)) {
    return null;
  }
  var rangeMin = getNumberFromString(customResponse.split('-')[0]);
  var rangeMax = getNumberFromString(customResponse.split('-')[1]);
  if (!nativeIsFinite(rangeMin) || !nativeIsFinite(rangeMax)) {
    return null;
  }

  // If rangeMin > rangeMax, swap variables
  if (rangeMin > rangeMax) {
    var temp = rangeMin;
    rangeMin = rangeMax;
    rangeMax = temp;
  }
  var LENGTH_RANGE_LIMIT = 500 * 1000;
  if (rangeMax > LENGTH_RANGE_LIMIT) {
    return null;
  }
  var length = getRandomIntInclusive(rangeMin, rangeMax);
  customResponse = getRandomStrByLength(length);
  return customResponse;
}
function toRegExp() {
  var input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  var DEFAULT_VALUE = '.?';
  var FORWARD_SLASH = '/';
  if (input === '') {
    return new RegExp(DEFAULT_VALUE);
  }
  if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
    return new RegExp(input.slice(1, -1));
  }
  var escaped = input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped);
}
function isValidStrPattern(input) {
  var FORWARD_SLASH = '/';
  var str = escapeRegExp(input);
  if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
    str = input.slice(1, -1);
  }
  var isValid;
  try {
    isValid = new RegExp(str);
    isValid = true;
  } catch (e) {
    isValid = false;
  }
  return isValid;
}
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function isEmptyObject(obj) {
  return Object.keys(obj).length === 0;
}
function getObjectEntries(object) {
  var keys = Object.keys(object);
  var entries = [];
  keys.forEach(function (key) {
    return entries.push([key, object[key]]);
  });
  return entries;
}
function getNumberFromString(rawString) {
  var parsedDelay = parseInt(rawString, 10);
  var validDelay = nativeIsNaN(parsedDelay) ? null : parsedDelay;
  return validDelay;
}
function nativeIsFinite(num) {
  // eslint-disable-next-line no-restricted-properties
  var native = Number.isFinite || window.isFinite;
  return native(num);
}
function nativeIsNaN(num) {
  // eslint-disable-next-line no-restricted-properties
  var native = Number.isNaN || window.isNaN;
  return native(num);
}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        preventXHR.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
}
function removeAttr(source, args){
function removeAttr(source, attrs, selector) {
  var applying = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'asap stay';
  if (!attrs) {
    return;
  }
  attrs = attrs.split(/\s*\|\s*/);
  if (!selector) {
    selector = "[".concat(attrs.join('],['), "]");
  }
  var rmattr = function rmattr() {
    var nodes = [];
    try {
      nodes = [].slice.call(document.querySelectorAll(selector));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log("Invalid remove-attr selector arg: '".concat(selector, "'"));
    }
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
  var flags = parseFlags(applying);
  var run = function run() {
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
    if (!applying.indexOf(' ') !== -1) {
      rmattr();
    }
    // 'true' for observing attributes
    observeDOMChanges(rmattr, true);
  }
}
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
}
function observeDOMChanges(callback) {
  var observeAttrs = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
  var attrsToObserve = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
  /**
   * Returns a wrapper, passing the call to 'method' at maximum once per 'delay' milliseconds.
   * Those calls that fall into the "cooldown" period, are ignored
   * @param {Function} method
   * @param {Number} delay - milliseconds
   */
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

  /**
   * 'delay' in milliseconds for 'throttle' method
   */
  var THROTTLE_DELAY_MS = 20;
  /**
   * Used for remove-class
   */
  // eslint-disable-next-line no-use-before-define, compat/compat
  var observer = new MutationObserver(throttle(callbackWrapper, THROTTLE_DELAY_MS));
  var connect = function connect() {
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
  var disconnect = function disconnect() {
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
  var FLAGS_DIVIDER = ' ';
  var ASAP_FLAG = 'asap';
  var COMPLETE_FLAG = 'complete';
  var STAY_FLAG = 'stay';
  var VALID_FLAGS = [STAY_FLAG, ASAP_FLAG, COMPLETE_FLAG];
  var passedFlags = flags.trim().split(FLAGS_DIVIDER).filter(function (f) {
    return VALID_FLAGS.indexOf(f) !== -1;
  });
  return {
    ASAP: ASAP_FLAG,
    COMPLETE: COMPLETE_FLAG,
    STAY: STAY_FLAG,
    hasFlag: function hasFlag(flag) {
      return passedFlags.indexOf(flag) !== -1;
    }
  };
}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        removeAttr.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
}
function removeClass(source, args){
function removeClass(source, classNames, selector) {
  var applying = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'asap stay';
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
      var foundNodes = [];
      try {
        foundNodes = [].slice.call(document.querySelectorAll(selector));
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log("Invalid remove-class selector arg: '".concat(selector, "'"));
      }
      foundNodes.forEach(function (n) {
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
  var CLASS_ATTR_NAME = ['class'];
  var flags = parseFlags(applying);
  var run = function run() {
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
    if (!applying.indexOf(' ') !== -1) {
      removeClassHandler();
    }
    observeDOMChanges(removeClassHandler, true, CLASS_ATTR_NAME);
  }
}
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
}
function observeDOMChanges(callback) {
  var observeAttrs = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
  var attrsToObserve = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
  /**
   * Returns a wrapper, passing the call to 'method' at maximum once per 'delay' milliseconds.
   * Those calls that fall into the "cooldown" period, are ignored
   * @param {Function} method
   * @param {Number} delay - milliseconds
   */
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

  /**
   * 'delay' in milliseconds for 'throttle' method
   */
  var THROTTLE_DELAY_MS = 20;
  /**
   * Used for remove-class
   */
  // eslint-disable-next-line no-use-before-define, compat/compat
  var observer = new MutationObserver(throttle(callbackWrapper, THROTTLE_DELAY_MS));
  var connect = function connect() {
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
  var disconnect = function disconnect() {
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
  var FLAGS_DIVIDER = ' ';
  var ASAP_FLAG = 'asap';
  var COMPLETE_FLAG = 'complete';
  var STAY_FLAG = 'stay';
  var VALID_FLAGS = [STAY_FLAG, ASAP_FLAG, COMPLETE_FLAG];
  var passedFlags = flags.trim().split(FLAGS_DIVIDER).filter(function (f) {
    return VALID_FLAGS.indexOf(f) !== -1;
  });
  return {
    ASAP: ASAP_FLAG,
    COMPLETE: COMPLETE_FLAG,
    STAY: STAY_FLAG,
    hasFlag: function hasFlag(flag) {
      return passedFlags.indexOf(flag) !== -1;
    }
  };
}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        removeClass.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
}
function removeCookie(source, args){
function removeCookie(source, match) {
  var matchRegexp = toRegExp(match);
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
      if (!matchRegexp.test(cookieName)) {
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
function toRegExp() {
  var input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  var DEFAULT_VALUE = '.?';
  var FORWARD_SLASH = '/';
  if (input === '') {
    return new RegExp(DEFAULT_VALUE);
  }
  if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
    return new RegExp(input.slice(1, -1));
  }
  var escaped = input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped);
}
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        removeCookie.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
}
function removeInShadowDom(source, args){
function removeInShadowDom(source, selector, baseSelector) {
  // do nothing if browser does not support ShadowRoot
  // https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot
  if (!Element.prototype.attachShadow) {
    return;
  }
  var removeElement = function removeElement(targetElement) {
    targetElement.remove();
  };

  /**
   * Handles shadow-dom piercing and removing of found elements
   */
  var removeHandler = function removeHandler() {
    // start value of shadow-dom hosts for the page dom
    var hostElements = !baseSelector ? findHostElements(document.documentElement) : document.querySelectorAll(baseSelector);

    // if there is shadow-dom host, they should be explored
    while (hostElements.length !== 0) {
      var isRemoved = false;
      var _pierceShadowDom = pierceShadowDom(selector, hostElements),
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
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
}
function observeDOMChanges(callback) {
  var observeAttrs = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
  var attrsToObserve = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
  /**
   * Returns a wrapper, passing the call to 'method' at maximum once per 'delay' milliseconds.
   * Those calls that fall into the "cooldown" period, are ignored
   * @param {Function} method
   * @param {Number} delay - milliseconds
   */
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

  /**
   * 'delay' in milliseconds for 'throttle' method
   */
  var THROTTLE_DELAY_MS = 20;
  /**
   * Used for remove-class
   */
  // eslint-disable-next-line no-use-before-define, compat/compat
  var observer = new MutationObserver(throttle(callbackWrapper, THROTTLE_DELAY_MS));
  var connect = function connect() {
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
  var disconnect = function disconnect() {
    observer.disconnect();
  };
  function callbackWrapper() {
    disconnect();
    callback();
    connect();
  }
  connect();
}
function flatten(input) {
  var stack = [];
  input.forEach(function (el) {
    return stack.push(el);
  });
  var res = [];
  while (stack.length) {
    // pop value from stack
    var next = stack.pop();
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
}
function findHostElements(rootElement) {
  var hosts = [];
  // Element.querySelectorAll() returns list of elements
  // which are defined in DOM of Element.
  // Meanwhile, inner DOM of the element with shadowRoot property
  // is absolutely another DOM and which can not be reached by querySelectorAll('*')
  var domElems = rootElement.querySelectorAll('*');
  domElems.forEach(function (el) {
    if (el.shadowRoot) {
      hosts.push(el);
    }
  });
  return hosts;
}
function pierceShadowDom(selector, hostElements) {
  var targets = [];
  var innerHostsAcc = [];

  // it's possible to get a few hostElements found by baseSelector on the page
  hostElements.forEach(function (host) {
    // check presence of selector element inside base element if it's not in shadow-dom
    var simpleElems = host.querySelectorAll(selector);
    targets = targets.concat([].slice.call(simpleElems));
    var shadowRootElem = host.shadowRoot;
    var shadowChildren = shadowRootElem.querySelectorAll(selector);
    targets = targets.concat([].slice.call(shadowChildren));

    // find inner shadow-dom hosts inside processing shadow-dom
    innerHostsAcc.push(findHostElements(shadowRootElem));
  });

  // if there were more than one host element,
  // innerHostsAcc is an array of arrays and should be flatten
  var innerHosts = flatten(innerHostsAcc);
  return {
    targets: targets,
    innerHosts: innerHosts
  };
}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        removeInShadowDom.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
}
function setAttr(source, args){
function setAttr(source, selector, attr) {
  var value = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : '';
  if (!selector || !attr) {
    return;
  }
  // Drop strings that cant be parsed into number, negative numbers and numbers below 32767
  if (value.length !== 0 && (nativeIsNaN(parseInt(value, 10)) || parseInt(value, 10) < 0 || parseInt(value, 10) > 0x7FFF)) {
    return;
  }
  var setAttr = function setAttr() {
    var nodes = [].slice.call(document.querySelectorAll(selector));
    var set = false;
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
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
}
function observeDOMChanges(callback) {
  var observeAttrs = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
  var attrsToObserve = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
  /**
   * Returns a wrapper, passing the call to 'method' at maximum once per 'delay' milliseconds.
   * Those calls that fall into the "cooldown" period, are ignored
   * @param {Function} method
   * @param {Number} delay - milliseconds
   */
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

  /**
   * 'delay' in milliseconds for 'throttle' method
   */
  var THROTTLE_DELAY_MS = 20;
  /**
   * Used for remove-class
   */
  // eslint-disable-next-line no-use-before-define, compat/compat
  var observer = new MutationObserver(throttle(callbackWrapper, THROTTLE_DELAY_MS));
  var connect = function connect() {
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
  var disconnect = function disconnect() {
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
  // eslint-disable-next-line no-restricted-properties
  var native = Number.isNaN || window.isNaN;
  return native(num);
}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        setAttr.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
}
function setConstant(source, args){
function setConstant(source, property, value, stack) {
  if (!property || !matchStackTrace(stack, new Error().stack)) {
    return;
  }
  // eslint-disable-next-line no-console
  var log = console.log.bind(console);
  var emptyArr = noopArray();
  var emptyObj = noopObject();
  var constantValue;
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
  } else if (value === 'trueFunc') {
    constantValue = trueFunc;
  } else if (value === 'falseFunc') {
    constantValue = falseFunc;
  } else if (value === 'noopPromiseResolve') {
    constantValue = noopPromiseResolve;
  } else if (value === 'noopPromiseReject') {
    constantValue = noopPromiseReject;
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
  } else if (value === 'yes') {
    constantValue = 'yes';
  } else if (value === 'no') {
    constantValue = 'no';
  } else {
    return;
  }
  var canceled = false;
  var mustCancel = function mustCancel(value) {
    if (canceled) {
      return canceled;
    }
    canceled = value !== undefined && constantValue !== undefined && _typeof_1(value) !== _typeof_1(constantValue);
    return canceled;
  };
  var trapProp = function trapProp(base, prop, configurable, handler) {
    if (!handler.init(base[prop])) {
      return false;
    }
    var origDescriptor = Object.getOwnPropertyDescriptor(base, prop);
    var prevSetter;
    // This is required to prevent scriptlets overwrite each over
    if (origDescriptor instanceof Object) {
      // This check is required to avoid defining non-configurable props
      if (!origDescriptor.configurable) {
        if (source.verbose) {
          log("set-constant: property '".concat(prop, "' is not configurable"));
        }
        return false;
      }
      base[prop] = constantValue;
      if (origDescriptor.set instanceof Function) {
        prevSetter = origDescriptor.set;
      }
    }
    Object.defineProperty(base, prop, {
      configurable: configurable,
      get: function get() {
        return handler.get();
      },
      set: function set(a) {
        if (prevSetter !== undefined) {
          prevSetter(a);
        }
        handler.set(a);
      }
    });
    return true;
  };
  var setChainPropAccess = function setChainPropAccess(owner, property) {
    var chainInfo = getPropertyInChain(owner, property);
    var base = chainInfo.base;
    var prop = chainInfo.prop,
      chain = chainInfo.chain;

    // Handler method init is used to keep track of factual value
    // and apply mustCancel() check only on end prop
    var undefPropHandler = {
      factValue: undefined,
      init: function init(a) {
        this.factValue = a;
        return true;
      },
      get: function get() {
        return this.factValue;
      },
      set: function set(a) {
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
    var endPropHandler = {
      init: function init(a) {
        if (mustCancel(a)) {
          return false;
        }
        return true;
      },
      get: function get() {
        return constantValue;
      },
      set: function set(a) {
        if (!mustCancel(a)) {
          return;
        }
        constantValue = a;
      }
    };

    // End prop case
    if (!chain) {
      var isTrapped = trapProp(base, prop, false, endPropHandler);
      if (isTrapped) {
        hit(source);
      }
      return;
    }

    // Defined prop in chain
    var propValue = owner[prop];
    if (propValue instanceof Object || _typeof_1(propValue) === 'object' && propValue !== null) {
      setChainPropAccess(propValue, chain);
    }

    // Undefined prop in chain
    trapProp(base, prop, true, undefPropHandler);
  };
  setChainPropAccess(window, property);
}
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
}
function noopArray() {
  return [];
}
function noopObject() {
  return {};
}
function noopFunc() {}
function trueFunc() {
  return true;
}
function falseFunc() {
  return false;
}
function noopPromiseReject() {
  return Promise.reject();
}
function noopPromiseResolve() {
  var responseBody = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '{}';
  if (typeof Response === 'undefined') {
    return;
  }
  // eslint-disable-next-line compat/compat
  var response = new Response(responseBody, {
    status: 200,
    statusText: 'OK'
  });
  // eslint-disable-next-line compat/compat, consistent-return
  return Promise.resolve(response);
}
function getPropertyInChain(base, chain) {
  var pos = chain.indexOf('.');
  if (pos === -1) {
    return {
      base: base,
      prop: chain
    };
  }
  var prop = chain.slice(0, pos);

  // https://github.com/AdguardTeam/Scriptlets/issues/128
  if (base === null) {
    // if base is null, return 'null' as base.
    // it's needed for triggering the reason logging while debugging
    return {
      base: base,
      prop: prop,
      chain: chain
    };
  }
  var nextBase = base[prop];
  chain = chain.slice(pos + 1);
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
  var currentDescriptor = Object.getOwnPropertyDescriptor(object, property);
  if (currentDescriptor && !currentDescriptor.configurable) {
    return false;
  }
  Object.defineProperty(object, property, descriptor);
  return true;
}
function toRegExp() {
  var input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  var DEFAULT_VALUE = '.?';
  var FORWARD_SLASH = '/';
  if (input === '') {
    return new RegExp(DEFAULT_VALUE);
  }
  if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
    return new RegExp(input.slice(1, -1));
  }
  var escaped = input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped);
}
function matchStackTrace(stackMatch, stackTrace) {
  if (!stackMatch || stackMatch === '') {
    return true;
  }
  var stackRegexp = toRegExp(stackMatch);
  var refinedStackTrace = stackTrace.split('\n').slice(2) // get rid of our own functions in the stack trace
  .map(function (line) {
    return line.trim();
  }) // trim the lines
  .join('\n');
  return getNativeRegexpTest().call(stackRegexp, refinedStackTrace);
}
function nativeIsNaN(num) {
  // eslint-disable-next-line no-restricted-properties
  var native = Number.isNaN || window.isNaN;
  return native(num);
}
function getNativeRegexpTest() {
  return Object.getOwnPropertyDescriptor(RegExp.prototype, 'test').value;
}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        setConstant.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
}
function setCookie(source, args){
function setCookie(source, name, value) {
  var cookieData = prepareCookie(name, value);
  if (cookieData) {
    hit(source);
    document.cookie = cookieData;
  }
}
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
}
function nativeIsNaN(num) {
  // eslint-disable-next-line no-restricted-properties
  var native = Number.isNaN || window.isNaN;
  return native(num);
}
function prepareCookie(name, value) {
  if (!name || !value) {
    return null;
  }
  var valueToSet;
  if (value === 'true') {
    valueToSet = 'true';
  } else if (value === 'True') {
    valueToSet = 'True';
  } else if (value === 'false') {
    valueToSet = 'false';
  } else if (value === 'False') {
    valueToSet = 'False';
  } else if (value === 'yes') {
    valueToSet = 'yes';
  } else if (value === 'Yes') {
    valueToSet = 'Yes';
  } else if (value === 'Y') {
    valueToSet = 'Y';
  } else if (value === 'no') {
    valueToSet = 'no';
  } else if (value === 'ok') {
    valueToSet = 'ok';
  } else if (value === 'OK') {
    valueToSet = 'OK';
  } else if (/^\d+$/.test(value)) {
    valueToSet = parseFloat(value);
    if (nativeIsNaN(valueToSet)) {
      return null;
    }
    if (Math.abs(valueToSet) < 0 || Math.abs(valueToSet) > 15) {
      return null;
    }
  } else {
    return null;
  }
  var pathToSet = 'path=/;';
  // eslint-disable-next-line max-len
  var cookieData = "".concat(encodeURIComponent(name), "=").concat(encodeURIComponent(valueToSet), "; ").concat(pathToSet);
  return cookieData;
}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        setCookie.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
}
function setCookieReload(source, args){
function setCookieReload(source, name, value) {
  var isCookieSetWithValue = function isCookieSetWithValue(name, value) {
    return document.cookie.split(';').some(function (cookieStr) {
      var pos = cookieStr.indexOf('=');
      if (pos === -1) {
        return false;
      }
      var cookieName = cookieStr.slice(0, pos).trim();
      var cookieValue = cookieStr.slice(pos + 1).trim();
      return name === cookieName && value === cookieValue;
    });
  };
  if (isCookieSetWithValue(name, value)) {
    return;
  }
  var cookieData = prepareCookie(name, value);
  if (cookieData) {
    document.cookie = cookieData;
    hit(source);

    // Only reload the page if cookie was set
    // https://github.com/AdguardTeam/Scriptlets/issues/212
    if (isCookieSetWithValue(name, value)) {
      window.location.reload();
    }
  }
}
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
}
function nativeIsNaN(num) {
  // eslint-disable-next-line no-restricted-properties
  var native = Number.isNaN || window.isNaN;
  return native(num);
}
function prepareCookie(name, value) {
  if (!name || !value) {
    return null;
  }
  var valueToSet;
  if (value === 'true') {
    valueToSet = 'true';
  } else if (value === 'True') {
    valueToSet = 'True';
  } else if (value === 'false') {
    valueToSet = 'false';
  } else if (value === 'False') {
    valueToSet = 'False';
  } else if (value === 'yes') {
    valueToSet = 'yes';
  } else if (value === 'Yes') {
    valueToSet = 'Yes';
  } else if (value === 'Y') {
    valueToSet = 'Y';
  } else if (value === 'no') {
    valueToSet = 'no';
  } else if (value === 'ok') {
    valueToSet = 'ok';
  } else if (value === 'OK') {
    valueToSet = 'OK';
  } else if (/^\d+$/.test(value)) {
    valueToSet = parseFloat(value);
    if (nativeIsNaN(valueToSet)) {
      return null;
    }
    if (Math.abs(valueToSet) < 0 || Math.abs(valueToSet) > 15) {
      return null;
    }
  } else {
    return null;
  }
  var pathToSet = 'path=/;';
  // eslint-disable-next-line max-len
  var cookieData = "".concat(encodeURIComponent(name), "=").concat(encodeURIComponent(valueToSet), "; ").concat(pathToSet);
  return cookieData;
}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        setCookieReload.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
}
function setLocalStorageItem(source, args){
function setLocalStorageItem(source, key, value) {
  if (!key || !value && value !== '') {
    return;
  }
  var keyValue;
  if (value === 'undefined') {
    keyValue = undefined;
  } else if (value === 'false') {
    keyValue = false;
  } else if (value === 'true') {
    keyValue = true;
  } else if (value === 'null') {
    keyValue = null;
  } else if (value === 'emptyArr') {
    keyValue = '[]';
  } else if (value === 'emptyObj') {
    keyValue = '{}';
  } else if (value === '') {
    keyValue = '';
  } else if (/^\d+$/.test(value)) {
    keyValue = parseFloat(value);
    if (nativeIsNaN(keyValue)) {
      return;
    }
    if (Math.abs(keyValue) > 0x7FFF) {
      return;
    }
  } else if (value === 'yes') {
    keyValue = 'yes';
  } else if (value === 'no') {
    keyValue = 'no';
  } else {
    return;
  }
  var setItem = function setItem(key, value) {
    var _window = window,
      localStorage = _window.localStorage;
    // setItem() may throw an exception if the storage is full.
    try {
      localStorage.setItem(key, value);
      hit(source);
    } catch (e) {
      if (source.verbose) {
        // eslint-disable-next-line no-console
        console.log("Was unable to set localStorage item due to: ".concat(e.message));
      }
    }
  };
  setItem(key, keyValue);
}
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
}
function nativeIsNaN(num) {
  // eslint-disable-next-line no-restricted-properties
  var native = Number.isNaN || window.isNaN;
  return native(num);
}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        setLocalStorageItem.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
}
function setPopadsDummy(source, args){
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
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        setPopadsDummy.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
}
function setSessionStorageItem(source, args){
function setSessionStorageItem(source, key, value) {
  if (!key || !value && value !== '') {
    return;
  }
  var keyValue;
  if (value === 'undefined') {
    keyValue = undefined;
  } else if (value === 'false') {
    keyValue = false;
  } else if (value === 'true') {
    keyValue = true;
  } else if (value === 'null') {
    keyValue = null;
  } else if (value === 'emptyArr') {
    keyValue = '[]';
  } else if (value === 'emptyObj') {
    keyValue = '{}';
  } else if (value === '') {
    keyValue = '';
  } else if (/^\d+$/.test(value)) {
    keyValue = parseFloat(value);
    if (nativeIsNaN(keyValue)) {
      return;
    }
    if (Math.abs(keyValue) > 0x7FFF) {
      return;
    }
  } else if (value === 'yes') {
    keyValue = 'yes';
  } else if (value === 'no') {
    keyValue = 'no';
  } else {
    return;
  }
  var setItem = function setItem(key, value) {
    var _window = window,
      sessionStorage = _window.sessionStorage;
    // setItem() may throw an exception if the storage is full.
    try {
      sessionStorage.setItem(key, value);
      hit(source);
    } catch (e) {
      if (source.verbose) {
        // eslint-disable-next-line no-console
        console.log("Was unable to set sessionStorage item due to: ".concat(e.message));
      }
    }
  };
  setItem(key, keyValue);
}
function hit(source, message) {
  if (source.verbose !== true) {
    return;
  }
  try {
    var log = console.log.bind(console);
    var trace = console.trace.bind(console); // eslint-disable-line compat/compat

    var prefix = source.ruleText || '';
    if (source.domainName) {
      var AG_SCRIPTLET_MARKER = '#%#//';
      var UBO_SCRIPTLET_MARKER = '##+js';
      var ruleStartIndex;
      if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
      } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
        ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
      }
      // delete all domains from ruleText and leave just rule part
      var rulePart = source.ruleText.slice(ruleStartIndex);
      // prepare applied scriptlet rule for specific domain
      prefix = "".concat(source.domainName).concat(rulePart);
    }

    // Used to check if scriptlet uses 'hit' function for logging
    var LOG_MARKER = 'log: ';
    if (message) {
      if (message.indexOf(LOG_MARKER) === -1) {
        log("".concat(prefix, " message:\n").concat(message));
      } else {
        log(message.slice(LOG_MARKER.length));
      }
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
}
function nativeIsNaN(num) {
  // eslint-disable-next-line no-restricted-properties
  var native = Number.isNaN || window.isNaN;
  return native(num);
}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        setSessionStorageItem.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }
}
const scriptletsMap = {
'abort-current-inline-script': abortCurrentInlineScript,
'abort-current-script.js': abortCurrentInlineScript,
'ubo-abort-current-script.js': abortCurrentInlineScript,
'acs.js': abortCurrentInlineScript,
'ubo-acs.js': abortCurrentInlineScript,
'ubo-abort-current-script': abortCurrentInlineScript,
'ubo-acs': abortCurrentInlineScript,
'abort-current-inline-script.js': abortCurrentInlineScript,
'ubo-abort-current-inline-script.js': abortCurrentInlineScript,
'acis.js': abortCurrentInlineScript,
'ubo-acis.js': abortCurrentInlineScript,
'ubo-abort-current-inline-script': abortCurrentInlineScript,
'ubo-acis': abortCurrentInlineScript,
'abp-abort-current-inline-script': abortCurrentInlineScript,
'abort-on-property-read': abortOnPropertyRead,
'abort-on-property-read.js': abortOnPropertyRead,
'ubo-abort-on-property-read.js': abortOnPropertyRead,
'aopr.js': abortOnPropertyRead,
'ubo-aopr.js': abortOnPropertyRead,
'ubo-abort-on-property-read': abortOnPropertyRead,
'ubo-aopr': abortOnPropertyRead,
'abp-abort-on-property-read': abortOnPropertyRead,
'abort-on-property-write': abortOnPropertyWrite,
'abort-on-property-write.js': abortOnPropertyWrite,
'ubo-abort-on-property-write.js': abortOnPropertyWrite,
'aopw.js': abortOnPropertyWrite,
'ubo-aopw.js': abortOnPropertyWrite,
'ubo-abort-on-property-write': abortOnPropertyWrite,
'ubo-aopw': abortOnPropertyWrite,
'abp-abort-on-property-write': abortOnPropertyWrite,
'abort-on-stack-trace': abortOnStackTrace,
'abort-on-stack-trace.js': abortOnStackTrace,
'ubo-abort-on-stack-trace.js': abortOnStackTrace,
'aost.js': abortOnStackTrace,
'ubo-aost.js': abortOnStackTrace,
'ubo-abort-on-stack-trace': abortOnStackTrace,
'ubo-aost': abortOnStackTrace,
'abp-abort-on-stack-trace': abortOnStackTrace,
'adjust-setInterval': adjustSetInterval,
'nano-setInterval-booster.js': adjustSetInterval,
'ubo-nano-setInterval-booster.js': adjustSetInterval,
'nano-sib.js': adjustSetInterval,
'ubo-nano-sib.js': adjustSetInterval,
'ubo-nano-setInterval-booster': adjustSetInterval,
'ubo-nano-sib': adjustSetInterval,
'adjust-setTimeout': adjustSetTimeout,
'nano-setTimeout-booster.js': adjustSetTimeout,
'ubo-nano-setTimeout-booster.js': adjustSetTimeout,
'nano-stb.js': adjustSetTimeout,
'ubo-nano-stb.js': adjustSetTimeout,
'ubo-nano-setTimeout-booster': adjustSetTimeout,
'ubo-nano-stb': adjustSetTimeout,
'debug-current-inline-script': debugCurrentInlineScript,
'debug-on-property-read': debugOnPropertyRead,
'debug-on-property-write': debugOnPropertyWrite,
'dir-string': dirString,
'abp-dir-string': dirString,
'disable-newtab-links': disableNewtabLinks,
'disable-newtab-links.js': disableNewtabLinks,
'ubo-disable-newtab-links.js': disableNewtabLinks,
'ubo-disable-newtab-links': disableNewtabLinks,
'close-window': forceWindowClose,
'window-close-if.js': forceWindowClose,
'ubo-window-close-if.js': forceWindowClose,
'ubo-window-close-if': forceWindowClose,
'hide-in-shadow-dom': hideInShadowDom,
'json-prune': jsonPrune,
'json-prune.js': jsonPrune,
'ubo-json-prune.js': jsonPrune,
'ubo-json-prune': jsonPrune,
'abp-json-prune': jsonPrune,
'log': log,
'log-addEventListener': logAddEventListener,
'addEventListener-logger.js': logAddEventListener,
'ubo-addEventListener-logger.js': logAddEventListener,
'aell.js': logAddEventListener,
'ubo-aell.js': logAddEventListener,
'ubo-addEventListener-logger': logAddEventListener,
'ubo-aell': logAddEventListener,
'log-eval': logEval,
'log-on-stack-trace': logOnStacktrace,
'no-topics': noTopics,
'noeval': noeval,
'noeval.js': noeval,
'silent-noeval.js': noeval,
'ubo-noeval.js': noeval,
'ubo-silent-noeval.js': noeval,
'ubo-noeval': noeval,
'ubo-silent-noeval': noeval,
'nowebrtc': nowebrtc,
'nowebrtc.js': nowebrtc,
'ubo-nowebrtc.js': nowebrtc,
'ubo-nowebrtc': nowebrtc,
'prevent-addEventListener': preventAddEventListener,
'addEventListener-defuser.js': preventAddEventListener,
'ubo-addEventListener-defuser.js': preventAddEventListener,
'aeld.js': preventAddEventListener,
'ubo-aeld.js': preventAddEventListener,
'ubo-addEventListener-defuser': preventAddEventListener,
'ubo-aeld': preventAddEventListener,
'prevent-adfly': preventAdfly,
'adfly-defuser.js': preventAdfly,
'ubo-adfly-defuser.js': preventAdfly,
'ubo-adfly-defuser': preventAdfly,
'prevent-bab': preventBab,
'nobab.js': preventBab,
'ubo-nobab.js': preventBab,
'bab-defuser.js': preventBab,
'ubo-bab-defuser.js': preventBab,
'ubo-nobab': preventBab,
'ubo-bab-defuser': preventBab,
'prevent-element-src-loading': preventElementSrcLoading,
'prevent-eval-if': preventEvalIf,
'noeval-if.js': preventEvalIf,
'ubo-noeval-if.js': preventEvalIf,
'ubo-noeval-if': preventEvalIf,
'prevent-fab-3.2.0': preventFab,
'nofab.js': preventFab,
'ubo-nofab.js': preventFab,
'fuckadblock.js-3.2.0': preventFab,
'ubo-fuckadblock.js-3.2.0': preventFab,
'ubo-nofab': preventFab,
'prevent-fetch': preventFetch,
'no-fetch-if.js': preventFetch,
'ubo-no-fetch-if.js': preventFetch,
'ubo-no-fetch-if': preventFetch,
'prevent-popads-net': preventPopadsNet,
'popads.net.js': preventPopadsNet,
'ubo-popads.net.js': preventPopadsNet,
'ubo-popads.net': preventPopadsNet,
'prevent-refresh': preventRefresh,
'refresh-defuser.js': preventRefresh,
'refresh-defuser': preventRefresh,
'ubo-refresh-defuser.js': preventRefresh,
'ubo-refresh-defuser': preventRefresh,
'prevent-requestAnimationFrame': preventRequestAnimationFrame,
'no-requestAnimationFrame-if.js': preventRequestAnimationFrame,
'ubo-no-requestAnimationFrame-if.js': preventRequestAnimationFrame,
'norafif.js': preventRequestAnimationFrame,
'ubo-norafif.js': preventRequestAnimationFrame,
'ubo-no-requestAnimationFrame-if': preventRequestAnimationFrame,
'ubo-norafif': preventRequestAnimationFrame,
'prevent-setInterval': preventSetInterval,
'no-setInterval-if.js': preventSetInterval,
'ubo-no-setInterval-if.js': preventSetInterval,
'setInterval-defuser.js': preventSetInterval,
'ubo-setInterval-defuser.js': preventSetInterval,
'nosiif.js': preventSetInterval,
'ubo-nosiif.js': preventSetInterval,
'sid.js': preventSetInterval,
'ubo-sid.js': preventSetInterval,
'ubo-no-setInterval-if': preventSetInterval,
'ubo-setInterval-defuser': preventSetInterval,
'ubo-nosiif': preventSetInterval,
'ubo-sid': preventSetInterval,
'prevent-setTimeout': preventSetTimeout,
'no-setTimeout-if.js': preventSetTimeout,
'ubo-no-setTimeout-if.js': preventSetTimeout,
'nostif.js': preventSetTimeout,
'ubo-nostif.js': preventSetTimeout,
'ubo-no-setTimeout-if': preventSetTimeout,
'ubo-nostif': preventSetTimeout,
'setTimeout-defuser.js': preventSetTimeout,
'ubo-setTimeout-defuser.js': preventSetTimeout,
'ubo-setTimeout-defuser': preventSetTimeout,
'std.js': preventSetTimeout,
'ubo-std.js': preventSetTimeout,
'ubo-std': preventSetTimeout,
'prevent-window-open': preventWindowOpen,
'window.open-defuser.js': preventWindowOpen,
'ubo-window.open-defuser.js': preventWindowOpen,
'ubo-window.open-defuser': preventWindowOpen,
'nowoif.js': preventWindowOpen,
'ubo-nowoif.js': preventWindowOpen,
'ubo-nowoif': preventWindowOpen,
'prevent-xhr': preventXHR,
'no-xhr-if.js': preventXHR,
'ubo-no-xhr-if.js': preventXHR,
'ubo-no-xhr-if': preventXHR,
'remove-attr': removeAttr,
'remove-attr.js': removeAttr,
'ubo-remove-attr.js': removeAttr,
'ra.js': removeAttr,
'ubo-ra.js': removeAttr,
'ubo-remove-attr': removeAttr,
'ubo-ra': removeAttr,
'remove-class': removeClass,
'remove-class.js': removeClass,
'ubo-remove-class.js': removeClass,
'rc.js': removeClass,
'ubo-rc.js': removeClass,
'ubo-remove-class': removeClass,
'ubo-rc': removeClass,
'remove-cookie': removeCookie,
'cookie-remover.js': removeCookie,
'ubo-cookie-remover.js': removeCookie,
'ubo-cookie-remover': removeCookie,
'remove-in-shadow-dom': removeInShadowDom,
'set-attr': setAttr,
'set-constant': setConstant,
'set-constant.js': setConstant,
'ubo-set-constant.js': setConstant,
'set.js': setConstant,
'ubo-set.js': setConstant,
'ubo-set-constant': setConstant,
'ubo-set': setConstant,
'abp-override-property-read': setConstant,
'set-cookie': setCookie,
'set-cookie-reload': setCookieReload,
'set-local-storage-item': setLocalStorageItem,
'set-popads-dummy': setPopadsDummy,
'popads-dummy.js': setPopadsDummy,
'ubo-popads-dummy.js': setPopadsDummy,
'ubo-popads-dummy': setPopadsDummy,
'set-session-storage-item': setSessionStorageItem
}
var getScriptletFunction = (name) => {
        return scriptletsMap[name];
    };
    export { getScriptletFunction };