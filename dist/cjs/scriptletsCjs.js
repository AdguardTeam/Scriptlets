
/**
 * AdGuard Scriptlets
 * Version 1.1.3
 */

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
  return (typeof subject === 'undefined') || (subject === null);
}


function isObject(subject) {
  return (typeof subject === 'object') && (subject !== null);
}


function toArray(sequence) {
  if (Array.isArray(sequence)) return sequence;
  else if (isNothing(sequence)) return [];

  return [ sequence ];
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
  var result = '', cycle;

  for (cycle = 0; cycle < count; cycle += 1) {
    result += string;
  }

  return result;
}


function isNegativeZero(number) {
  return (number === 0) && (Number.NEGATIVE_INFINITY === 1 / number);
}


var isNothing_1      = isNothing;
var isObject_1       = isObject;
var toArray_1        = toArray;
var repeat_1         = repeat;
var isNegativeZero_1 = isNegativeZero;
var extend_1         = extend;

var common = {
	isNothing: isNothing_1,
	isObject: isObject_1,
	toArray: toArray_1,
	repeat: repeat_1,
	isNegativeZero: isNegativeZero_1,
	extend: extend_1
};

// YAML error class. http://stackoverflow.com/questions/8458984

function YAMLException(reason, mark) {
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
    this.stack = (new Error()).stack || '';
  }
}


// Inherit from Error
YAMLException.prototype = Object.create(Error.prototype);
YAMLException.prototype.constructor = YAMLException;


YAMLException.prototype.toString = function toString(compact) {
  var result = this.name + ': ';

  result += this.reason || '(unknown reason)';

  if (!compact && this.mark) {
    result += ' ' + this.mark.toString();
  }

  return result;
};


var exception = YAMLException;

var TYPE_CONSTRUCTOR_OPTIONS = [
  'kind',
  'resolve',
  'construct',
  'instanceOf',
  'predicate',
  'represent',
  'defaultStyle',
  'styleAliases'
];

var YAML_NODE_KINDS = [
  'scalar',
  'sequence',
  'mapping'
];

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

function Type(tag, options) {
  options = options || {};

  Object.keys(options).forEach(function (name) {
    if (TYPE_CONSTRUCTOR_OPTIONS.indexOf(name) === -1) {
      throw new exception('Unknown option "' + name + '" is met in definition of "' + tag + '" YAML type.');
    }
  });

  // TODO: Add tag format check.
  this.tag          = tag;
  this.kind         = options['kind']         || null;
  this.resolve      = options['resolve']      || function () { return true; };
  this.construct    = options['construct']    || function (data) { return data; };
  this.instanceOf   = options['instanceOf']   || null;
  this.predicate    = options['predicate']    || null;
  this.represent    = options['represent']    || null;
  this.defaultStyle = options['defaultStyle'] || null;
  this.styleAliases = compileStyleAliases(options['styleAliases'] || null);

  if (YAML_NODE_KINDS.indexOf(this.kind) === -1) {
    throw new exception('Unknown kind "' + this.kind + '" is specified for "' + tag + '" YAML type.');
  }
}

var type = Type;

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


function compileMap(/* lists... */) {
  var result = {
        scalar: {},
        sequence: {},
        mapping: {},
        fallback: {}
      }, index, length;

  function collectType(type) {
    result[type.kind][type.tag] = result['fallback'][type.tag] = type;
  }

  for (index = 0, length = arguments.length; index < length; index += 1) {
    arguments[index].forEach(collectType);
  }
  return result;
}


function Schema(definition) {
  this.include  = definition.include  || [];
  this.implicit = definition.implicit || [];
  this.explicit = definition.explicit || [];

  this.implicit.forEach(function (type) {
    if (type.loadKind && type.loadKind !== 'scalar') {
      throw new exception('There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.');
    }
  });

  this.compiledImplicit = compileList(this, 'implicit', []);
  this.compiledExplicit = compileList(this, 'explicit', []);
  this.compiledTypeMap  = compileMap(this.compiledImplicit, this.compiledExplicit);
}


Schema.DEFAULT = null;


Schema.create = function createSchema() {
  var schemas, types;

  switch (arguments.length) {
    case 1:
      schemas = Schema.DEFAULT;
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

  if (!schemas.every(function (schema) { return schema instanceof Schema; })) {
    throw new exception('Specified list of super schemas (or a single Schema object) contains a non-Schema object.');
  }

  if (!types.every(function (type$1) { return type$1 instanceof type; })) {
    throw new exception('Specified list of YAML types (or a single Type object) contains a non-Type object.');
  }

  return new Schema({
    include: schemas,
    explicit: types
  });
};


var schema = Schema;

var str = new type('tag:yaml.org,2002:str', {
  kind: 'scalar',
  construct: function (data) { return data !== null ? data : ''; }
});

var seq = new type('tag:yaml.org,2002:seq', {
  kind: 'sequence',
  construct: function (data) { return data !== null ? data : []; }
});

var map = new type('tag:yaml.org,2002:map', {
  kind: 'mapping',
  construct: function (data) { return data !== null ? data : {}; }
});

var failsafe = new schema({
  explicit: [
    str,
    seq,
    map
  ]
});

function resolveYamlNull(data) {
  if (data === null) return true;

  var max = data.length;

  return (max === 1 && data === '~') ||
         (max === 4 && (data === 'null' || data === 'Null' || data === 'NULL'));
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
    canonical: function () { return '~';    },
    lowercase: function () { return 'null'; },
    uppercase: function () { return 'NULL'; },
    camelcase: function () { return 'Null'; }
  },
  defaultStyle: 'lowercase'
});

function resolveYamlBoolean(data) {
  if (data === null) return false;

  var max = data.length;

  return (max === 4 && (data === 'true' || data === 'True' || data === 'TRUE')) ||
         (max === 5 && (data === 'false' || data === 'False' || data === 'FALSE'));
}

function constructYamlBoolean(data) {
  return data === 'true' ||
         data === 'True' ||
         data === 'TRUE';
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
    lowercase: function (object) { return object ? 'true' : 'false'; },
    uppercase: function (object) { return object ? 'TRUE' : 'FALSE'; },
    camelcase: function (object) { return object ? 'True' : 'False'; }
  },
  defaultStyle: 'lowercase'
});

function isHexCode(c) {
  return ((0x30/* 0 */ <= c) && (c <= 0x39/* 9 */)) ||
         ((0x41/* A */ <= c) && (c <= 0x46/* F */)) ||
         ((0x61/* a */ <= c) && (c <= 0x66/* f */));
}

function isOctCode(c) {
  return ((0x30/* 0 */ <= c) && (c <= 0x37/* 7 */));
}

function isDecCode(c) {
  return ((0x30/* 0 */ <= c) && (c <= 0x39/* 9 */));
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
  var value = data, sign = 1, ch, base, digits = [];

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
      value += (d * base);
      base *= 60;
    });

    return sign * value;

  }

  return sign * parseInt(value, 10);
}

function isInteger(object) {
  return (Object.prototype.toString.call(object)) === '[object Number]' &&
         (object % 1 === 0 && !common.isNegativeZero(object));
}

var int_1 = new type('tag:yaml.org,2002:int', {
  kind: 'scalar',
  resolve: resolveYamlInteger,
  construct: constructYamlInteger,
  predicate: isInteger,
  represent: {
    binary:      function (obj) { return obj >= 0 ? '0b' + obj.toString(2) : '-0b' + obj.toString(2).slice(1); },
    octal:       function (obj) { return obj >= 0 ? '0'  + obj.toString(8) : '-0'  + obj.toString(8).slice(1); },
    decimal:     function (obj) { return obj.toString(10); },
    /* eslint-disable max-len */
    hexadecimal: function (obj) { return obj >= 0 ? '0x' + obj.toString(16).toUpperCase() :  '-0x' + obj.toString(16).toUpperCase().slice(1); }
  },
  defaultStyle: 'decimal',
  styleAliases: {
    binary:      [ 2,  'bin' ],
    octal:       [ 8,  'oct' ],
    decimal:     [ 10, 'dec' ],
    hexadecimal: [ 16, 'hex' ]
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

  value  = data.replace(/_/g, '').toLowerCase();
  sign   = value[0] === '-' ? -1 : 1;
  digits = [];

  if ('+-'.indexOf(value[0]) >= 0) {
    value = value.slice(1);
  }

  if (value === '.inf') {
    return (sign === 1) ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;

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
      case 'lowercase': return '.nan';
      case 'uppercase': return '.NAN';
      case 'camelcase': return '.NaN';
    }
  } else if (Number.POSITIVE_INFINITY === object) {
    switch (style) {
      case 'lowercase': return '.inf';
      case 'uppercase': return '.INF';
      case 'camelcase': return '.Inf';
    }
  } else if (Number.NEGATIVE_INFINITY === object) {
    switch (style) {
      case 'lowercase': return '-.inf';
      case 'uppercase': return '-.INF';
      case 'camelcase': return '-.Inf';
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
  return (Object.prototype.toString.call(object) === '[object Number]') &&
         (object % 1 !== 0 || common.isNegativeZero(object));
}

var float_1 = new type('tag:yaml.org,2002:float', {
  kind: 'scalar',
  resolve: resolveYamlFloat,
  construct: constructYamlFloat,
  predicate: isFloat,
  represent: representYamlFloat,
  defaultStyle: 'lowercase'
});

var json = new schema({
  include: [
    failsafe
  ],
  implicit: [
    _null,
    bool,
    int_1,
    float_1
  ]
});

var core = new schema({
  include: [
    json
  ]
});

var YAML_DATE_REGEXP = new RegExp(
  '^([0-9][0-9][0-9][0-9])'          + // [1] year
  '-([0-9][0-9])'                    + // [2] month
  '-([0-9][0-9])$');                   // [3] day

var YAML_TIMESTAMP_REGEXP = new RegExp(
  '^([0-9][0-9][0-9][0-9])'          + // [1] year
  '-([0-9][0-9]?)'                   + // [2] month
  '-([0-9][0-9]?)'                   + // [3] day
  '(?:[Tt]|[ \\t]+)'                 + // ...
  '([0-9][0-9]?)'                    + // [4] hour
  ':([0-9][0-9])'                    + // [5] minute
  ':([0-9][0-9])'                    + // [6] second
  '(?:\\.([0-9]*))?'                 + // [7] fraction
  '(?:[ \\t]*(Z|([-+])([0-9][0-9]?)' + // [8] tz [9] tz_sign [10] tz_hour
  '(?::([0-9][0-9]))?))?$');           // [11] tz_minute

function resolveYamlTimestamp(data) {
  if (data === null) return false;
  if (YAML_DATE_REGEXP.exec(data) !== null) return true;
  if (YAML_TIMESTAMP_REGEXP.exec(data) !== null) return true;
  return false;
}

function constructYamlTimestamp(data) {
  var match, year, month, day, hour, minute, second, fraction = 0,
      delta = null, tz_hour, tz_minute, date;

  match = YAML_DATE_REGEXP.exec(data);
  if (match === null) match = YAML_TIMESTAMP_REGEXP.exec(data);

  if (match === null) throw new Error('Date resolve error');

  // match: [1] year [2] month [3] day

  year = +(match[1]);
  month = +(match[2]) - 1; // JS month starts with 0
  day = +(match[3]);

  if (!match[4]) { // no hour
    return new Date(Date.UTC(year, month, day));
  }

  // match: [4] hour [5] minute [6] second [7] fraction

  hour = +(match[4]);
  minute = +(match[5]);
  second = +(match[6]);

  if (match[7]) {
    fraction = match[7].slice(0, 3);
    while (fraction.length < 3) { // milli-seconds
      fraction += '0';
    }
    fraction = +fraction;
  }

  // match: [8] tz [9] tz_sign [10] tz_hour [11] tz_minute

  if (match[9]) {
    tz_hour = +(match[10]);
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

function commonjsRequire () {
	throw new Error('Dynamic requires are not currently supported by rollup-plugin-commonjs');
}

/*eslint-disable no-bitwise*/

var NodeBuffer;

try {
  // A trick for browserified version, to not include `Buffer` shim
  var _require = commonjsRequire;
  NodeBuffer = _require('buffer').Buffer;
} catch (__) {}




// [ 64, 65, 66 ] -> [ padding, CR, LF ]
var BASE64_MAP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r';


function resolveYamlBinary(data) {
  if (data === null) return false;

  var code, idx, bitlen = 0, max = data.length, map = BASE64_MAP;

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
  return (bitlen % 8) === 0;
}

function constructYamlBinary(data) {
  var idx, tailbits,
      input = data.replace(/[\r\n=]/g, ''), // remove CR/LF & padding to simplify scan
      max = input.length,
      map = BASE64_MAP,
      bits = 0,
      result = [];

  // Collect by 6*4 bits (3 bytes)

  for (idx = 0; idx < max; idx++) {
    if ((idx % 4 === 0) && idx) {
      result.push((bits >> 16) & 0xFF);
      result.push((bits >> 8) & 0xFF);
      result.push(bits & 0xFF);
    }

    bits = (bits << 6) | map.indexOf(input.charAt(idx));
  }

  // Dump tail

  tailbits = (max % 4) * 6;

  if (tailbits === 0) {
    result.push((bits >> 16) & 0xFF);
    result.push((bits >> 8) & 0xFF);
    result.push(bits & 0xFF);
  } else if (tailbits === 18) {
    result.push((bits >> 10) & 0xFF);
    result.push((bits >> 2) & 0xFF);
  } else if (tailbits === 12) {
    result.push((bits >> 4) & 0xFF);
  }

  // Wrap into Buffer for NodeJS and leave Array for browser
  if (NodeBuffer) {
    // Support node 6.+ Buffer API when available
    return NodeBuffer.from ? NodeBuffer.from(result) : new NodeBuffer(result);
  }

  return result;
}

function representYamlBinary(object /*, style*/) {
  var result = '', bits = 0, idx, tail,
      max = object.length,
      map = BASE64_MAP;

  // Convert every three bytes to 4 ASCII characters.

  for (idx = 0; idx < max; idx++) {
    if ((idx % 3 === 0) && idx) {
      result += map[(bits >> 18) & 0x3F];
      result += map[(bits >> 12) & 0x3F];
      result += map[(bits >> 6) & 0x3F];
      result += map[bits & 0x3F];
    }

    bits = (bits << 8) + object[idx];
  }

  // Dump tail

  tail = max % 3;

  if (tail === 0) {
    result += map[(bits >> 18) & 0x3F];
    result += map[(bits >> 12) & 0x3F];
    result += map[(bits >> 6) & 0x3F];
    result += map[bits & 0x3F];
  } else if (tail === 2) {
    result += map[(bits >> 10) & 0x3F];
    result += map[(bits >> 4) & 0x3F];
    result += map[(bits << 2) & 0x3F];
    result += map[64];
  } else if (tail === 1) {
    result += map[(bits >> 2) & 0x3F];
    result += map[(bits << 4) & 0x3F];
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

var _hasOwnProperty = Object.prototype.hasOwnProperty;
var _toString       = Object.prototype.toString;

function resolveYamlOmap(data) {
  if (data === null) return true;

  var objectKeys = [], index, length, pair, pairKey, pairHasKey,
      object = data;

  for (index = 0, length = object.length; index < length; index += 1) {
    pair = object[index];
    pairHasKey = false;

    if (_toString.call(pair) !== '[object Object]') return false;

    for (pairKey in pair) {
      if (_hasOwnProperty.call(pair, pairKey)) {
        if (!pairHasKey) pairHasKey = true;
        else return false;
      }
    }

    if (!pairHasKey) return false;

    if (objectKeys.indexOf(pairKey) === -1) objectKeys.push(pairKey);
    else return false;
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

  var index, length, pair, keys, result,
      object = data;

  result = new Array(object.length);

  for (index = 0, length = object.length; index < length; index += 1) {
    pair = object[index];

    if (_toString$1.call(pair) !== '[object Object]') return false;

    keys = Object.keys(pair);

    if (keys.length !== 1) return false;

    result[index] = [ keys[0], pair[keys[0]] ];
  }

  return true;
}

function constructYamlPairs(data) {
  if (data === null) return [];

  var index, length, pair, keys, result,
      object = data;

  result = new Array(object.length);

  for (index = 0, length = object.length; index < length; index += 1) {
    pair = object[index];

    keys = Object.keys(pair);

    result[index] = [ keys[0], pair[keys[0]] ];
  }

  return result;
}

var pairs = new type('tag:yaml.org,2002:pairs', {
  kind: 'sequence',
  resolve: resolveYamlPairs,
  construct: constructYamlPairs
});

var _hasOwnProperty$1 = Object.prototype.hasOwnProperty;

function resolveYamlSet(data) {
  if (data === null) return true;

  var key, object = data;

  for (key in object) {
    if (_hasOwnProperty$1.call(object, key)) {
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
  include: [
    core
  ],
  implicit: [
    timestamp,
    merge
  ],
  explicit: [
    binary,
    omap,
    pairs,
    set
  ]
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
      tail   = /\/([gim]*)$/.exec(data),
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
      tail   = /\/([gim]*)$/.exec(data),
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
  var _require$1 = commonjsRequire;
  esprima = _require$1('esprima');
} catch (_) {
  /*global window */
  if (typeof window !== 'undefined') esprima = window.esprima;
}



function resolveJavascriptFunction(data) {
  if (data === null) return false;

  try {
    var source = '(' + data + ')',
        ast    = esprima.parse(source, { range: true });

    if (ast.type                    !== 'Program'             ||
        ast.body.length             !== 1                     ||
        ast.body[0].type            !== 'ExpressionStatement' ||
        (ast.body[0].expression.type !== 'ArrowFunctionExpression' &&
          ast.body[0].expression.type !== 'FunctionExpression')) {
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
      ast    = esprima.parse(source, { range: true }),
      params = [],
      body;

  if (ast.type                    !== 'Program'             ||
      ast.body.length             !== 1                     ||
      ast.body[0].type            !== 'ExpressionStatement' ||
      (ast.body[0].expression.type !== 'ArrowFunctionExpression' &&
        ast.body[0].expression.type !== 'FunctionExpression')) {
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
  include: [
    default_safe
  ],
  explicit: [
    _undefined,
    regexp,
    _function
  ]
});

function simpleEscapeSequence(c) {
  /* eslint-disable indent */
  return (c === 0x30/* 0 */) ? '\x00' :
        (c === 0x61/* a */) ? '\x07' :
        (c === 0x62/* b */) ? '\x08' :
        (c === 0x74/* t */) ? '\x09' :
        (c === 0x09/* Tab */) ? '\x09' :
        (c === 0x6E/* n */) ? '\x0A' :
        (c === 0x76/* v */) ? '\x0B' :
        (c === 0x66/* f */) ? '\x0C' :
        (c === 0x72/* r */) ? '\x0D' :
        (c === 0x65/* e */) ? '\x1B' :
        (c === 0x20/* Space */) ? ' ' :
        (c === 0x22/* " */) ? '\x22' :
        (c === 0x2F/* / */) ? '/' :
        (c === 0x5C/* \ */) ? '\x5C' :
        (c === 0x4E/* N */) ? '\x85' :
        (c === 0x5F/* _ */) ? '\xA0' :
        (c === 0x4C/* L */) ? '\u2028' :
        (c === 0x50/* P */) ? '\u2029' : '';
}

var simpleEscapeCheck = new Array(256); // integer, for fast access
var simpleEscapeMap = new Array(256);
for (var i = 0; i < 256; i++) {
  simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
  simpleEscapeMap[i] = simpleEscapeSequence(i);
}

/**
 * Generate random six symbols id
 */
function randomId() {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * Set getter and setter to property if it's configurable
 * @param {Object} object target object with property
 * @param {string} property property name
 * @param {Object} descriptor contains getter and setter functions
 * @returns {boolean} is operation successful
 */
function setPropertyAccess(object, property, descriptor) {
  var currentDescriptor = Object.getOwnPropertyDescriptor(object, property);

  if (currentDescriptor && !currentDescriptor.configurable) {
    return false;
  }

  Object.defineProperty(object, property, descriptor);
  return true;
}

/**
 * @typedef Chain
 * @property {Object} base
 * @property {string} prop
 * @property {string} [chain]
 */

/**
 * Check is property exist in base object recursively
 *
 * If property doesn't exist in base object,
 * defines this property (for addProp = true)
 * and returns base, property name and remaining part of property chain
 *
 * @param {Object} base
 * @param {string} chain
 * @param {Booleam} addProp - defines is nonexistent base property should be assigned as 'undefined'
 * @returns {Chain}
 */
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

/**
 * Escapes special chars in string
 * @param {string} str
 * @returns {string}
 */
var escapeRegExp = function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};
/**
 * Converts search string to the regexp
 * TODO think about nested dependencies, but be careful with dependency loops
 * @param {string} str search string
 * @returns {RegExp}
 */

var toRegExp = function toRegExp(str) {
  if (str[0] === '/' && str[str.length - 1] === '/') {
    return new RegExp(str.slice(1, -1));
  }

  var escaped = str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped);
};
/**
 * Get string before regexp first match
 * @param {string} str
 * @param {RegExp} rx
 */

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
/**
 * Wrap str in double qoutes and replaces single quotes if need
 * @param {string} str
 */

var wrapInDoubleQuotes = function wrapInDoubleQuotes(str) {
  if (str[0] === '\'' && str[str.length - 1] === '\'') {
    str = str.substring(1, str.length - 1); // eslint-disable-next-line no-useless-escape

    str = str.replace(/\"/g, '\\"');
  } else if (str[0] === '"' && str[str.length - 1] === '"') {
    str = str.substring(1, str.length - 1); // eslint-disable-next-line no-useless-escape

    str = str.replace(/\'/g, '\\\'');
  }

  return "\"".concat(str, "\"");
};
/**
 * Returns substring enclosed in the widest braces
 * @param {string} str
 */

var getStringInBraces = function getStringInBraces(str) {
  var firstIndex = str.indexOf('(');
  var lastIndex = str.lastIndexOf(')');
  return str.substring(firstIndex + 1, lastIndex);
};

/**
 * Generates function which silents global errors on page generated by scriptlet
 * If error doesn't belong to our error we transfer it to the native onError handler
 * @param {string} rid - unique identifier of scriptlet
 * @return {onError}
 */
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

/**
 * Noop function
 */
var noop = function noop() {};
/**
 * Function returns null
 */

var noopNull = function noopNull() {
  return null;
};
/**
 * Function returns this
 */

function noopThis() {
  return this;
}
/**
 * Function returns empty array
 */

var noopArray = function noopArray() {
  return [];
};
/**
 * Function returns empty string
 */

var noopStr = function noopStr() {
  return '';
};

/* eslint-disable no-console, no-underscore-dangle */

/**
 * Hit used only for debug purposes now
 * @param {Source} source
 * @param {string} message optional message
 */
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
  } catch (e) {} // try catch for Edge 15
  // In according to this issue https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/14495220/
  // console.log throws an error
  // This is necessary for unit-tests only!


  if (typeof window.__debugScriptlets === 'function') {
    window.__debugScriptlets(source);
  }
};

/**
 * DOM tree changes observer. Used for 'remove-attr' and 'remove-class' scriptlets
 * @param {Function} callback
 * @param {Boolean} observeAttrs - optional parameter - should observer check attibutes changes
 */
var observeDOMChanges = function observeDOMChanges(callback) {
  var observeAttrs = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
  var attrsToObserv = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];

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
  // eslint-disable-next-line no-use-before-define

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

/**
 * This file must export all used dependencies
 */

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
  wrapInDoubleQuotes: wrapInDoubleQuotes,
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

/**
 * Concat dependencies to scriptlet code
 * @param {string} scriptlet string view of scriptlet
 */

function attachDependencies(scriptlet) {
  var _scriptlet$injections = scriptlet.injections,
      injections = _scriptlet$injections === void 0 ? [] : _scriptlet$injections;
  return injections.reduce(function (accum, dep) {
    return "".concat(accum, "\n").concat(dependencies[dep.name]);
  }, scriptlet.toString());
}
/**
 * Add scriptlet call to existing code
 * @param {Function} scriptlet
 * @param {string} code
 */

function addCall(scriptlet, code) {
  return "".concat(code, ";\n        const updatedArgs = args ? [].concat(source).concat(args) : [source];\n        ").concat(scriptlet.name, ".apply(this, updatedArgs);\n    ");
}
/**
 * Wrap function into IIFE (Immediately invoked function expression)
 *
 * @param {Source} source - object with scriptlet properties
 * @param {string} code - scriptlet source code with dependencies
 *
 * @returns {string} full scriptlet code
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
 */

function passSourceAndProps(source, code) {
  if (source.hit) {
    source.hit = source.hit.toString();
  }

  var sourceString = JSON.stringify(source);
  var argsString = source.args ? "[".concat(source.args.map(JSON.stringify), "]") : undefined;
  var params = argsString ? "".concat(sourceString, ", ").concat(argsString) : sourceString;
  return "(function(source, args){\n".concat(code, "\n})(").concat(params, ");");
}
/**
 * Wrap code in no name function
 * @param {string} code which must be wrapped
 */

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

/**
 * Iterate over iterable argument and evaluate current state with transitions
 * @param {string} init first transition name
 * @param {Array|Collection|string} iterable
 * @param {Object} transitions transtion functions
 * @param {any} args arguments which should be passed to transition functions
 */
function iterateWithTransitions(iterable, transitions, init, args) {
  var state = init || Object.keys(transitions)[0];

  for (var i = 0; i < iterable.length; i += 1) {
    state = transitions[state](iterable, i, args);
  }

  return state;
}
/**
 * AdGuard scriptlet rule mask
 */


var ADG_SCRIPTLET_MASK = '#//scriptlet';
/**
 * Helper to accumulate an array of strings char by char
 */

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
/**
 * Parse and validate scriptlet rule
 * @param {*} ruleText
 * @returns {{name: string, args: Array<string>}}
 */


var parseRule = function parseRule(ruleText) {
  var _transitions;

  ruleText = substringAfter$1(ruleText, ADG_SCRIPTLET_MASK);
  /**
   * Transition names
   */

  var TRANSITION = {
    OPENED: 'opened',
    PARAM: 'param',
    CLOSED: 'closed'
  };
  /**
   * Transition function: the current index position in start, end or between params
   * @param {string} rule
   * @param {number} index
   * @param {Object} Object
   * @property {Object} Object.sep contains prop symb with current separator char
   */

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
  /**
   * Transition function: the current index position inside param
   * @param {string} rule
   * @param {number} index
   * @param {Object} Object
   * @property {Object} Object.sep contains prop `symb` with current separator char
   * @property {Object} Object.saver helper which allow to save strings by car by char
   */


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
      // eslint-disable-next-line no-fallthrough

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
 * https://github.com/adblockplus/adblockpluscore/blob/6b2a309054cc23432102b85d13f12559639ef495/lib/content/snippets.js#L864
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet("abort-on-property-read", <property>)
 * ```
 *
 * **Parameters**
 * - `property` (required) path to a property (joined with `.` if needed). The property must be attached to `window`.
 *
 * **Examples**
 * ```
 * ! Aborts script when it tries to access `window.alert`
 * example.org#%#//scriptlet("abort-on-property-read", "alert")
 *
 * ! Aborts script when it tries to access `navigator.language`
 * example.org#%#//scriptlet("abort-on-property-read", "navigator.language")
 * ```
 */

/* eslint-enable max-len */

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
 * https://github.com/adblockplus/adblockpluscore/blob/6b2a309054cc23432102b85d13f12559639ef495/lib/content/snippets.js#L896
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet("abort-on-property-write", <property>)
 * ```
 *
 * **Parameters**
 * - `property` (required) path to a property (joined with `.` if needed). The property must be attached to `window`.
 *
 * **Examples**
 * ```
 * ! Aborts all inline scripts trying to access `window.alert`
 * utils.escape('<script></script>')
 * // => '&lt;script&gt;&lt;/script&gt;'
 * ```
 */

/* eslint-enable max-len */

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

/* eslint-disable max-len */

/**
 * @scriptlet prevent-setTimeout
 *
 * @description
 * Prevents a `setTimeout` call if:
 * 1) the text of the callback is matching the specified search string/regexp which does not start with `!`;
 * otherwise mismatched calls should be defused;
 * 2) the timeout is matching the specified delay; otherwise mismatched calls should be defused.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#no-settimeout-ifjs-
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet("prevent-setTimeout"[, <search>[, <delay>]])
 * ```
 *
 * **Parameters**
 *
 * Call with no arguments will log calls to setTimeout while debugging (`log-setTimeout` superseding),
 * so production filter lists' rules definitely require at least one of the parameters:
 * - `search` (optional) string or regular expression.
 * If starts with `!`, scriptlet will not match the stringified callback but all other will be defused.
 * If do not start with `!`, the stringified callback will be matched.
 * If not set, prevents all `setTimeout` calls due to specified `delay`.
 * - `delay` (optional) must be an integer.
 * If starts with `!`, scriptlet will not match the delay but all other will be defused.
 * If do not start with `!`, the delay passed to the `setTimeout` call will be matched.
 *
 * **Examples**
 *
 * 1. Prevents `setTimeout` calls if the callback matches `/\.test/` regardless of the delay.
 *     ```bash
 *     example.org#%#//scriptlet("prevent-setTimeout", "/\.test/")
 *     ```
 *
 *     For instance, the following call will be prevented:
 *     ```javascript
 *     setTimeout(function () {
 *         window.test = "value";
 *     }, 100);
 *     ```
 *
 * 2. Prevents `setTimeout` calls if the callback does not contain `value`.
 *     ```
 *     example.org#%#//scriptlet("prevent-setTimeout", "!value")
 *     ```
 *
 *     For instance, only the first of the following calls will be prevented:
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
 * 3. Prevents `setTimeout` calls if the callback contains `value` and the delay is not set to `300`.
 *     ```
 *     example.org#%#//scriptlet("prevent-setTimeout", "value", "!300")
 *     ```
 *
 *     For instance, only the first of the following calls will not be prevented:
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
 * 4. Prevents `setTimeout` calls if the callback does not contain `value` and the delay is not set to `300`.
 *     ```
 *     example.org#%#//scriptlet("prevent-setTimeout", "!value", "!300")
 *     ```
 *
 *     For instance, only the second of the following calls will be prevented:
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
 */

/* eslint-enable max-len */

function preventSetTimeout(source, match, delay) {
  var nativeTimeout = window.setTimeout;
  var nativeIsNaN = Number.isNaN || window.isNaN; // eslint-disable-line compat/compat

  var log = console.log.bind(console); // eslint-disable-line no-console
  // logs setTimeouts to console if no arguments have been specified

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
preventSetTimeout.names = ['prevent-setTimeout', 'no-setTimeout-if.js', // new implementation of setTimeout-defuser.js
'ubo-no-setTimeout-if.js', 'setTimeout-defuser.js', // old name should be supported as well
'ubo-setTimeout-defuser.js', 'nostif.js', // new short name of no-setTimeout-if
'ubo-nostif.js', 'std.js', // old short scriptlet name
'ubo-std.js'];
preventSetTimeout.injections = [toRegExp, startsWith, hit];

/* eslint-disable max-len */

/**
 * @scriptlet prevent-setInterval
 *
 * @description
 * Prevents a `setInterval` call if:
 * 1) the text of the callback is matching the specified `search` string/regexp which does not start with `!`;
 * otherwise mismatched calls should be defused;
 * 2) the interval is matching the specified `delay`; otherwise mismatched calls should be defused.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#no-setinterval-ifjs-
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet("prevent-setInterval"[, <search>[, <delay>]])
 * ```
 *
 * **Parameters**
 *
 * Call with no arguments will log calls to setInterval while debugging (`log-setInterval` superseding),
 * so production filter lists' rules definitely require at least one of the parameters:
 * - `search` (optional) string or regular expression.
 * If starts with `!`, scriptlet will not match the stringified callback but all other will be defused.
 * If do not start with `!`, the stringified callback will be matched.
 * If not set, prevents all `setInterval` calls due to specified `delay`.
 * - `delay` (optional) must be an integer.
 * If starts with `!`, scriptlet will not match the delay but all other will be defused.
 * If do not start with `!`, the delay passed to the `setInterval` call will be matched.
 *
 *  **Examples**
 *
 * 1. Prevents `setInterval` calls if the callback matches `/\.test/` regardless of the delay.
 *     ```bash
 *     example.org#%#//scriptlet("prevent-setInterval", "/\.test/")
 *     ```
 *
 *     For instance, the following call will be prevented:
 *     ```javascript
 *     setInterval(function () {
 *         window.test = "value";
 *     }, 100);
 *     ```
 *
 * 2. Prevents `setInterval` calls if the callback does not contain `value`.
 *     ```
 *     example.org#%#//scriptlet("prevent-setInterval", "!value")
 *     ```
 *
 *     For instance, only the first of the following calls will be prevented:
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
 * 3. Prevents `setInterval` calls if the callback contains `value` and the delay is not set to `300`.
 *     ```
 *     example.org#%#//scriptlet("prevent-setInterval", "value", "!300")
 *     ```
 *
 *     For instance, only the first of the following calls will not be prevented:
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
 * 4. Prevents `setInterval` calls if the callback does not contain `value` and the delay is not set to `300`.
 *     ```
 *     example.org#%#//scriptlet("prevent-setInterval", "!value", "!300")
 *     ```
 *
 *     For instance, only the second of the following calls will be prevented:
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
 */

/* eslint-enable max-len */

function preventSetInterval(source, match, delay) {
  var nativeInterval = window.setInterval;
  var nativeIsNaN = Number.isNaN || window.isNaN; // eslint-disable-line compat/compat

  var log = console.log.bind(console); // eslint-disable-line no-console
  // logs setIntervals to console if no arguments have been specified

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
preventSetInterval.names = ['prevent-setInterval', 'no-setInterval-if.js', // new implementation of setInterval-defuser.js
'ubo-no-setInterval-if.js', 'setInterval-defuser.js', // old name should be supported as well
'ubo-setInterval-defuser.js', 'nosiif.js', // new short name of no-setInterval-if
'ubo-nosiif.js', 'sid.js', // old short scriptlet name
'ubo-sid.js'];
preventSetInterval.injections = [toRegExp, startsWith, hit];

/* eslint-disable max-len */

/**
 * @scriptlet prevent-window-open
 *
 * @description
 * Prevents `window.open` calls when URL either matches or not matches the specified string/regexp. Using it without parameters prevents all `window.open` calls.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#windowopen-defuserjs-
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet("prevent-window-open"[, <match>[, <search>]])
 * ```
 *
 * **Parameters**
 * - `match` (optional) defaults to "matching", any positive number for "matching", 0 or any string for "not matching",
 * - `search` (optional) string or regexp for matching the URL passed to `window.open` call.
 *
 * **Example**
 *
 * 1. Prevent all `window.open` calls:
 * ```
 *     example.org#%#//scriptlet("prevent-window-open")
 * ```
 *
 * 2. Prevent `window.open` for all URLs containing `example`:
 * ```
 *     example.org#%#//scriptlet("prevent-window-open", "1", "example")
 * ```
 *
 * 3. Prevent `window.open` for all URLs matching RegExp `/example\./`:
 * ```
 *     example.org#%#//scriptlet("prevent-window-open", "1", "/example\./")
 * ```
 *
 * 4. Prevent `window.open` for all URLs **NOT** containing `example`:
 * ```
 *     example.org#%#//scriptlet("prevent-window-open", "0", "example")
 * ```
 */

/* eslint-enable max-len */

function preventWindowOpen(source, inverse, match) {
  var nativeOpen = window.open;
  inverse = inverse ? !+inverse : !!inverse;
  match = match ? toRegExp(match) : toRegExp('/.?/'); // eslint-disable-next-line consistent-return

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

/* eslint-disable no-new-func */
/* eslint-disable max-len */

/**
 * @scriptlet abort-current-inline-script
 *
 * @description
 * Aborts an inline script when it attempts to **read** the specified property
 * AND when the contents of the `<script>` element contains the specified
 * text or matches the regular expression.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#abort-current-inline-scriptjs-
 *
 * Related ABP source:
 * https://github.com/adblockplus/adblockpluscore/blob/6b2a309054cc23432102b85d13f12559639ef495/lib/content/snippets.js#L928
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet("abort-current-inline-script", <property> [, <search>])
 * ```
 *
 * **Parameters**
 * - `property` (required) path to a property (joined with `.` if needed). The property must be attached to `window`.
 * - `search` (optional) string or regular expression that must match the inline script contents. If not set, abort all inline scripts which are trying to access the specified property.
 *
 * **Examples**
 * 1. Aborts all inline scripts trying to access `window.alert`
 *     ```
 *     example.org#%#//scriptlet("abort-current-inline-script", "alert")
 *     ```
 *
 * 2. Aborts inline scripts which are trying to access `window.alert` and contain `Hello, world`.
 *     ```
 *     example.org#%#//scriptlet("abort-current-inline-script", "alert", "Hello, world")
 *     ```
 *
 *     For instance, the following script will be aborted
 *     ```html
 *     <script>alert("Hello, world");</script>
 *     ```
 *
 * 3. Aborts inline scripts which are trying to access `window.alert` and match this regexp: `/Hello.+world/`.
 *     ```
 *     example.org#%#//scriptlet("abort-current-inline-script", "alert", "/Hello.+world/")
 *     ```
 *
 *     For instance, the following scripts will be aborted:
 *     ```html
 *     <script>alert("Hello, big world");</script>
 *     ```
 *     ```html
 *     <script>alert("Hello, little world");</script>
 *     ```
 *
 *     This script will not be aborted:
 *     ```html
 *     <script>alert("Hi, little world");</script>
 *     ```
 */

/* eslint-enable max-len */

function abortCurrentInlineScript(source, property) {
  var search = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
  var regex = search ? toRegExp(search) : null;
  var rid = randomId();

  var getCurrentScript = function getCurrentScript() {
    if (!document.currentScript) {
      // eslint-disable-line compat/compat
      var scripts = document.getElementsByTagName('script');
      return scripts[scripts.length - 1];
    }

    return document.currentScript; // eslint-disable-line compat/compat
  };

  var ourScript = getCurrentScript();

  var abort = function abort() {
    var scriptEl = getCurrentScript();
    var content = scriptEl.textContent;

    try {
      var textContentGetter = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent').get;
      content = textContentGetter.call(scriptEl); // eslint-disable-next-line no-empty
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

/* eslint-disable max-len */

/**
 * @scriptlet set-constant
 *
 * @description
 * Creates a constant property and assigns it one of the values from the predefined list.
 *
 * > Actually, it's not a constant. Please note, that it can be rewritten with a value of a different type.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#set-constantjs-
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet("set-constant", <property>, <value>)
 * ```
 *
 * **Parameters**
 * - `property` (required) path to a property (joined with `.` if needed). The property must be attached to `window`.
 * - `value` (required). Possible values:
 *     - positive decimal integer `<= 32767`
 *     - one of the predefined constants:
 *         - `undefined`
 *         - `false`
 *         - `true`
 *         - `null`
 *         - `noopFunc` - function with empty body
 *         - `trueFunc` - function returning true
 *         - `falseFunc` - function returning false
 *         - `''` - empty string
 *         - `-1` - number value `-1`
 *
 * **Examples**
 * ```
 * ! window.firstConst === false // this comparision will return true
 * example.org#%#//scriptlet("set-constant", "firstConst", "false")
 *
 * ! window.secondConst() === true // call to the secondConst will return true
 * example.org#%#//scriptlet("set-constant", "secondConst", "trueFunc")
 * ```
 */

/* eslint-enable max-len */

function setConstant(source, property, value) {
  if (!property) {
    return;
  }

  var nativeIsNaN = Number.isNaN || window.isNaN; // eslint-disable-line compat/compat

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

/* eslint-disable max-len */

/**
 * @scriptlet remove-cookie
 *
 * @description
 * Removes current page cookies by passed string matching with name. For current domain and subdomains. Runs on load and before unload.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#cookie-removerjs-
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet("remove-cookie"[, match])
 * ```
 *
 * **Parameters**
 * - `match` (optional) String or regex matching the cookie name. If not specified all accessible cookies will be removed.
 *
 * **Examples**
 * 1. Removes all cookies:
 * ```
 *     example.org#%#//scriptlet("remove-cookie")
 * ```
 *
 * 2. Removes cookies which name contains `example` string.
 * ```
 *     example.org#%#//scriptlet("remove-cookie", "example")
 * ```
 *
 *     For instance this cookie will be removed
 *     ```javascript
 *     document.cookie = '__example=randomValue';
 *     ```
 */

/* eslint-enable max-len */

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
 * **Syntax**
 * ```
 * example.org#%#//scriptlet("prevent-addEventListener"[, eventSearch[, functionSearch]])
 * ```
 *
 * **Parameters**
 * - `eventSearch` (optional) String or regex matching the event name. If not specified, the scriptlets prevents all event listeners.
 * - `functionSearch` (optional) String or regex matching the event listener function body. If not set, the scriptlet prevents all event listeners with event name matching `eventSearch`.
 *
 * **Examples**
 * 1. Prevent all `click` listeners:
 * ```
 *     example.org#%#//scriptlet("prevent-addEventListener", "click")
 * ```

2. Prevent 'click' listeners with the callback body containing `searchString`.
 * ```
 *     example.org#%#//scriptlet("prevent-addEventListener", "click", "searchString")
 * ```
 *
 *     For instance, this listener will not be called:
 * ```javascript
 *     el.addEventListener('click', () => {
 *         window.test = 'searchString';
 *     });
 * ```
 */

/* eslint-enable max-len */

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
 * **Syntax**
 * ```
 * example.org#%#//scriptlet("prevent-bab")
 * ```
 */

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

/* eslint-disable no-unused-vars, no-extra-bind, func-names */
/* eslint-disable max-len */

/**
 * @scriptlet nowebrtc
 *
 * @description
 * Disables WebRTC by overriding `RTCPeerConnection`. The overriden function will log every attempt to create a new connection.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#nowebrtcjs-
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet("nowebrtc")
 * ```
 */

/* eslint-enable max-len */

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

/* eslint-disable no-console */
/**
 * @scriptlet log-addEventListener
 *
 * @description
 * Logs all addEventListener calls to the console.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#addeventlistener-loggerjs-
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet("log-addEventListener")
 * ```
 */

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

/* eslint-disable no-console, no-eval */
/**
 * @scriptlet log-eval
 *
 * @description
 * Logs all `eval()` or `new Function()` calls to the console.
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet("log-eval")
 * ```
 */

function logEval(source) {
  var log = console.log.bind(console); // wrap eval function

  var nativeEval = window.eval;

  function evalWrapper(str) {
    hit(source);
    log("eval(\"".concat(str, "\")"));
    return nativeEval(str);
  }

  window.eval = evalWrapper; // wrap new Function

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

/**
 * @scriptlet log
 *
 * @description
 * A simple scriptlet which only purpose is to print arguments to console.
 * This scriptlet can be helpful for debugging and troubleshooting other scriptlets.
 * **Example**
 * ```
 * example.org#%#//scriptlet("log", "arg1", "arg2")
 * ```
 */
function log() {
  for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  console.log(args); // eslint-disable-line no-console
}
log.names = ['log'];

/* eslint-disable no-eval, no-extra-bind */
/**
 * @scriptlet noeval
 *
 * @description
 * Prevents page to use eval.
 * Notifies about attempts in the console
 *
 * It is mostly used for `$redirect` rules.
 * See [redirect description](../wiki/about-redirects.md#noeval).
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet("noeval")
 * ```
 */

function noeval(source) {
  window.eval = function evalWrapper(s) {
    hit(source, "AdGuard has prevented eval:\n".concat(s));
  }.bind();
}
noeval.names = ['noeval', 'noeval.js', 'silent-noeval.js', 'ubo-noeval.js', 'ubo-silent-noeval.js'];
noeval.injections = [hit];

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
 * **Parameters**
 * - `search` string or regexp matching stringified eval payload
 *
 * **Examples**
 * ```
 * !
 * ```
 *
 * @param {string|RegExp} [search] string or regexp matching stringified eval payload
 */

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

/* eslint-disable no-console, func-names, no-multi-assign */
/**
 * @scriptlet prevent-fab-3.2.0
 *
 * @description
 * Prevents execution of the FAB script v3.2.0.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#fuckadblockjs-320-
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet("prevent-fab-3.2.0")
 * ```
 */

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
  window.FuckAdBlock = window.BlockAdBlock = Fab; //

  window.fuckAdBlock = window.blockAdBlock = new Fab();
}
preventFab.names = ['prevent-fab-3.2.0', 'fuckadblock.js-3.2.0', 'ubo-fuckadblock.js-3.2.0', 'nofab.js', 'ubo-nofab.js'];
preventFab.injections = [noop, hit];

/* eslint-disable no-console, func-names, no-multi-assign */
/**
 * @scriptlet set-popads-dummy
 *
 * @description
 * Sets static properties PopAds and popns.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#popads-dummyjs-
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet("set-popads-dummy")
 * ```
 */

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

/**
 * @scriptlet prevent-popads-net
 *
 * @description
 * Aborts on property write (PopAds, popns), throws reference error with random id.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#popadsnetjs-
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet("prevent-popads-net")
 * ```
 */

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
 * **Syntax**
 * ```
 * example.org#%#//scriptlet("prevent-adfly")
 * ```
 */

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

  var val; // Do not apply handler more than one time

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
preventAdfly.names = ['prevent-adfly', 'adfly-defuser.js', 'ubo-adfly-defuser.js'];
preventAdfly.injections = [setPropertyAccess, hit];

/* eslint-disable max-len */

/**
 * @scriptlet debug-on-property-read
 *
 * @description
 * This scriptlet is basically the same as [abort-on-property-read](#abort-on-property-read), but instead of aborting it starts the debugger.
 *
 * **It is not supposed to be used in production filter lists!**
 *
 * **Syntax**
 * ```
 * ! Aborts script when it tries to access `window.alert`
 * example.org#%#//scriptlet("debug-on-property-read", "alert")
 * ```
 */

/* eslint-enable max-len */

function debugOnPropertyRead(source, property) {
  if (!property) {
    return;
  }

  var rid = randomId();

  var abort = function abort() {
    hit(source); // eslint-disable-next-line no-debugger

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

/* eslint-disable max-len */

/**
 * @scriptlet debug-on-property-write
 *
 * @description
 * This scriptlet is basically the same as [abort-on-property-write](#abort-on-property-write), but instead of aborting it starts the debugger.
 *
 * **It is not supposed to be used in production filter lists!**
 *
 * **Syntax**
 * ```
 * ! Aborts script when it tries to write in property `window.test`
 * example.org#%#//scriptlet("debug-on-property-write", "test")
 * ```
 */

/* eslint-enable max-len */

function debugOnPropertyWrite(source, property) {
  if (!property) {
    return;
  }

  var rid = randomId();

  var abort = function abort() {
    hit(source); // eslint-disable-next-line no-debugger

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

/* eslint-disable no-new-func */
/* eslint-disable max-len */

/**
 * @scriptlet debug-current-inline-script
 *
 * @description
 * This scriptlet is basically the same as [abort-current-inline-script](#abort-current-inline-script), but instead of aborting it starts the debugger.
 *
 * **It is not supposed to be used in production filter lists!**
 *
 * **Syntax**
 *```
 * ! Aborts script when it tries to access `window.alert`
 * example.org#%#//scriptlet("debug-current-inline-script", "alert")
 * ```
 */

/* eslint-enable max-len */

function debugCurrentInlineScript(source, property) {
  var search = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
  var regex = search ? toRegExp(search) : null;
  var rid = randomId();

  var getCurrentScript = function getCurrentScript() {
    if (!document.currentScript) {
      // eslint-disable-line compat/compat
      var scripts = document.getElementsByTagName('script');
      return scripts[scripts.length - 1];
    }

    return document.currentScript; // eslint-disable-line compat/compat
  };

  var ourScript = getCurrentScript();

  var abort = function abort() {
    var scriptEl = getCurrentScript();

    if (scriptEl instanceof HTMLScriptElement && scriptEl.textContent.length > 0 && scriptEl !== ourScript && (!regex || regex.test(scriptEl.textContent))) {
      hit(source); // eslint-disable-next-line no-debugger

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

/* eslint-disable max-len */

/**
 * @scriptlet remove-attr
 *
 * @description
 * Removes the specified attributes from DOM nodes. This scriptlet runs once when the page loads
 * and after that periodically in order to DOM tree changes.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#remove-attrjs-
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet("remove-attr", attrs[, selector])
 * ```
 *
 * - `attrs` — required, attribute or list of attributes joined by '|';
 * - `selector` — optional, CSS selector, specifies DOM nodes from which the attributes will be removed
 *
 * **Examples**
 * 1.  Removes by attribute
 *     ```
 *     example.org#%#//scriptlet("remove-attr", "example|test")
 *     ```
 *
 *     ```html
 *     <!-- before  -->
 *     <div example="true" test="true">Some text</div>
 *
 *     <!-- after -->
 *     <div>Some text</div>
 *     ```
 *
 * 2. Removes with specified selector
 *     ```
 *     example.org#%#//scriptlet("remove-attr", "example", ".inner")
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
 */

/* eslint-enable max-len */

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

  rmattr(); // 'true' for observing attributes

  observeDOMChanges(rmattr, true);
}
removeAttr.names = ['remove-attr', 'remove-attr.js', 'ubo-remove-attr.js', 'ra.js', 'ubo-ra.js'];
removeAttr.injections = [hit, observeDOMChanges];

/* eslint-disable max-len */

/**
 * @scriptlet remove-class
 *
 * @description
 * Removes the specified classes from DOM nodes. This scriptlet runs once after the page loads
 * and after that periodically in order to DOM tree changes.
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet("remove-class", classes[, selector])
 * ```
 *
 * - `classes` — required, class or list of classes separated by '|';
 * - `selector` — optional, CSS selector, specifies DOM nodes from which the classes will be removed;
 * if there is no selector, every class independently will be removed from all nodes which has one
 *
 * **Examples**
 * 1.  Removes by classes
 *     ```
 *     example.org#%#//scriptlet("remove-class", "example|test")
 *     ```
 *
 *     ```html
 *     <!-- before  -->
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
 * 2. Removes with specified selector
 *     ```
 *     example.org#%#//scriptlet("remove-class", "branding", ".inner")
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
 */

/* eslint-enable max-len */

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
  var CLASS_ATTR_NAME = ['class']; // 'true' for observing attributes
  // 'class' for observing only classes

  observeDOMChanges(removeClassHandler, true, CLASS_ATTR_NAME);
}
removeClass.names = ['remove-class'];
removeClass.injections = [hit, observeDOMChanges];

/**
 * @scriptlet disable-newtab-links
 *
 * @description
 * Prevents opening new tabs and windows if there is `target` attribute in element.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#disable-newtab-linksjs-
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet("disable-newtab-links")
 * ```
 */

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

/* eslint-disable max-len */

/**
 * @scriptlet adjust-setInterval
 *
 * @description
 * Adjusts interval for specified setInterval() callbacks.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#nano-setinterval-boosterjs-
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet("adjust-setInterval"[, match [, interval[, boost]]])
 * ```
 *
 * - `match` - optional, string/regular expression, matching in stringified callback function
 * - `interval` - optional, defaults to 1000, decimal integer, matching interval
 * - `boost` - optional, default to 0.05, float, capped at 50 times for up and down, interval multiplier
 *
 * **Examples**
 * 1. Adjust all setInterval() x20 times where interval equal 1000ms:
 *     ```
 *     example.org#%#//scriptlet("adjust-setInterval")
 *     ```
 *
 * 2. Adjust all setInterval() x20 times where callback mathed with `example` and interval equal 1000ms
 *     ```
 *     example.org#%#//scriptlet("adjust-setInterval", "example")
 *     ```
 *
 * 3. Adjust all setInterval() x20 times where callback mathed with `example` and interval equal 400ms
 *     ```
 *     example.org#%#//scriptlet("adjust-setInterval", "example", "400")
 *     ```
 *
 * 4. Slow down setInterval() x2 times where callback matched with `example` and interval equal 400ms
 *     ```
 *     example.org#%#//scriptlet("adjust-setInterval", "example", "400", "2")
 *     ```
 */

/* eslint-enable max-len */

function adjustSetInterval(source, match, interval, boost) {
  var nativeInterval = window.setInterval;
  var nativeIsNaN = Number.isNaN || window.isNaN; // eslint-disable-line compat/compat

  var nativeIsFinite = Number.isFinite || window.isFinite; // eslint-disable-line compat/compat

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

/* eslint-disable max-len */

/**
 * @scriptlet adjust-setTimeout
 *
 * @description
 * Adjusts timeout for specified setTimout() callbacks.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#nano-settimeout-boosterjs-
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet("adjust-setTimeout"[, match [, timeout[, boost]]])
 * ```
 *
 * - `match` - optional, string/regular expression, matching in stringified callback function
 * - `timeout` - optional, defaults to 1000, decimal integer, matching interval
 * - `boost` - optional, default to 0.05, float, capped at 50 times for up and down, interval multiplier
 *
 * **Examples**
 * 1. Adjust all setTimeout() x20 times where interval equal 1000ms:
 *     ```
 *     example.org#%#//scriptlet("adjust-setTimeout")
 *     ```
 *
 * 2. Adjust all setTimeout() x20 times where callback mathed with `example` and interval equal 1000ms
 *     ```
 *     example.org#%#//scriptlet("adjust-setTimeout", "example")
 *     ```
 *
 * 3. Adjust all setTimeout() x20 times where callback mathed with `example` and interval equal 400ms
 *     ```
 *     example.org#%#//scriptlet("adjust-setTimeout", "example", "400")
 *     ```
 *
 * 4. Slow down setTimeout() x2 times where callback matched with `example` and interval equal 400ms
 *     ```
 *     example.org#%#//scriptlet("adjust-setTimeout", "example", "400", "2")
 *     ```
 */

/* eslint-enable max-len */

function adjustSetTimeout(source, match, timeout, boost) {
  var nativeTimeout = window.setTimeout;
  var nativeIsNaN = Number.isNaN || window.isNaN; // eslint-disable-line compat/compat

  var nativeIsFinite = Number.isFinite || window.isFinite; // eslint-disable-line compat/compat

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

/* eslint-disable max-len */

/**
 * @scriptlet dir-string
 *
 * @description
 * Wraps the `console.dir` API to call the `toString` method of the argument.
 * There are several adblock circumvention systems that detect browser devtools
 * and hide themselves. Therefore, if we force them to think
 * that devtools are open (using this scrciptlet),
 * it will automatically disable the adblock circumvention script.
 *
 * Related ABP source:
 * https://github.com/adblockplus/adblockpluscore/blob/6b2a309054cc23432102b85d13f12559639ef495/lib/content/snippets.js#L766
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet("dir-string"[, times])
 * ```
 * - `times` - optional, the number of times to call the `toString` method of the argument to `console.dir`
 *
 * **Example**
 * ```
 * ! Run 2 times
 * example.org#%#//scriptlet("dir-string", "2")
 * ```
 */

/* eslint-enable max-len */

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
  } // eslint-disable-next-line no-console


  console.dir = dirWrapper;
}
dirString.names = ['dir-string', 'abp-dir-string'];
dirString.injections = [hit];

/* eslint-disable max-len */

/**
 * @scriptlet json-prune
 *
 * @description
 * Removes specified properties from the result of calling JSON.parse and returns the caller
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet("json-prune"[, propsToRemove [, obligatoryProps]])
 * ```
 *
 * - `propsToRemove` - string of space-separated properties to remove
 * - `obligatoryProps` - optional, string of space-separated properties which must be all present for the pruning to occur
 *
 * **Examples**
 * 1. Removes property `example` from the results of JSON.parse call
 *     ```
 *     example.org#%#//scriptlet("json-prune", "example")
 *     ```
 *
 *     For instance, the following call will return `{ one: 1}`
 *
 *     ```html
 *     JSON.parse('{"one":1,"example":true}')
 *     ```
 *
 * 2. If there are no specified properties in the result of JSON.parse call, pruning will NOT occur
 *     ```
 *     example.org#%#//scriptlet("json-prune", "one", "obligatoryProp")
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
 *     ```
 *     example.org#%#//scriptlet("json-prune", "a.b", "adpath.url.first")
 *     ```
 *
 * 4. Call with no arguments will log the current hostname and json payload at the console
 *     ```
 *     example.org#%#//scriptlet("json-prune")
 *     ```
 */

/* eslint-enable max-len */

function jsonPrune(source, propsToRemove, requiredInitialProps) {
  // eslint-disable-next-line no-console
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
      var nestedPropName = needlePath.split('').pop();

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

/**
 * This file must export all scriptlets which should be accessible
 */

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
/**
 * Checks if rule text is comment e.g. !!example.org##+js(set-constant.js, test, false)
 * @param {string} rule
 * @return {boolean}
 */

var isComment = function isComment(rule) {
  return startsWith(rule, COMMENT_MARKER);
};
/* ************************************************************************
 *
 * Scriptlets
 *
 ************************************************************************** */

/**
 * uBlock scriptlet rule mask
 */

var UBO_SCRIPTLET_MASK_REG = /#@?#script:inject|#@?#\s*\+js/;
var UBO_SCRIPTLET_MASK_1 = '##+js';
var UBO_SCRIPTLET_MASK_2 = '##script:inject';
var UBO_SCRIPTLET_EXCEPTION_MASK_1 = '#@#+js';
var UBO_SCRIPTLET_EXCEPTION_MASK_2 = '#@#script:inject';
/**
 * AdBlock Plus snippet rule mask
 */

var ABP_SCRIPTLET_MASK = '#$#';
var ABP_SCRIPTLET_EXCEPTION_MASK = '#@$#';
/**
 * AdGuard CSS rule mask
 */

var ADG_CSS_MASK_REG = /#@?\$#.+?\s*\{.*\}\s*$/g;
/**
 * Checks is AdGuard scriptlet rule
 * @param {string} rule rule text
 */

var isAdgScriptletRule = function isAdgScriptletRule(rule) {
  return !isComment(rule) && rule.indexOf(ADG_SCRIPTLET_MASK) > -1;
};
/**
 * Checks is uBO scriptlet rule
 * @param {string} rule rule text
 */

var isUboScriptletRule = function isUboScriptletRule(rule) {
  return (rule.indexOf(UBO_SCRIPTLET_MASK_1) > -1 || rule.indexOf(UBO_SCRIPTLET_MASK_2) > -1 || rule.indexOf(UBO_SCRIPTLET_EXCEPTION_MASK_1) > -1 || rule.indexOf(UBO_SCRIPTLET_EXCEPTION_MASK_2) > -1) && UBO_SCRIPTLET_MASK_REG.test(rule) && !isComment(rule);
};
/**
 * Checks is AdBlock Plus snippet
 * @param {string} rule rule text
 */

var isAbpSnippetRule = function isAbpSnippetRule(rule) {
  return (rule.indexOf(ABP_SCRIPTLET_MASK) > -1 || rule.indexOf(ABP_SCRIPTLET_EXCEPTION_MASK) > -1) && rule.search(ADG_CSS_MASK_REG) === -1 && !isComment(rule);
};
/**
 * Find scriptlet by it's name
 * @param {string} name
 */

var getScriptletByName = function getScriptletByName(name) {
  var scriptlets = Object.keys(scriptletList).map(function (key) {
    return scriptletList[key];
  });
  return scriptlets.find(function (s) {
    return s.names && s.names.indexOf(name) > -1;
  });
};
/**
 * Checks if the scriptlet name is valid
 * @param {string} name - Scriptlet name
 */

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
/* ************************************************************************
 *
 * Redirects
 *
 ************************************************************************** */

/**
 * Redirect resources markers
 */

var ADG_UBO_REDIRECT_RESOURCE_MARKER = 'redirect=';
var ABP_REDIRECT_RESOURCE_MARKER = 'rewrite=abp-resource:';
var VALID_SOURCE_TYPES = ['image', 'subdocument', 'stylesheet', 'script', 'xmlhttprequest', 'media'];
var validAdgRedirects = redirects.filter(function (el) {
  return el.adg;
});
/**
 * Converts array of pairs to object.
 * Sort of Object.fromEntries() polyfill.
 * @param {Array} pairs - array of pairs
 * @returns {Object}
 */

var arrayOfPairsToObject = function arrayOfPairsToObject(pairs) {
  var output = pairs.reduce(function (acc, el) {
    var _el = slicedToArray(el, 2),
        key = _el[0],
        value = _el[1];

    acc[key] = value;
    return acc;
  }, {});
  return output;
};
/**
 * Compatibility object where KEYS = UBO redirect names and VALUES = ADG redirect names
 * It's used for UBO -> ADG  converting
 */


var uboToAdgCompatibility = arrayOfPairsToObject(validAdgRedirects.filter(function (el) {
  return el.ubo;
}).map(function (el) {
  return [el.ubo, el.adg];
}));
/**
 * Compatibility object where KEYS = ABP redirect names and VALUES = ADG redirect names
 * It's used for ABP -> ADG  converting
 */

var abpToAdgCompatibility = arrayOfPairsToObject(validAdgRedirects.filter(function (el) {
  return el.abp;
}).map(function (el) {
  return [el.abp, el.adg];
}));
/**
 * Compatibility object where KEYS = UBO redirect names and VALUES = ADG redirect names
 * It's used for ADG -> UBO  converting
 */

var adgToUboCompatibility = validAdgRedirects.filter(function (el) {
  return el.ubo;
}).map(function (el) {
  return [el.adg, el.ubo];
}).reduce(function (acc, el) {
  var _el2 = slicedToArray(el, 2),
      key = _el2[0],
      value = _el2[1];

  acc[key] = value;
  return acc;
}, {});
/**
 * Parse redirect rule modifiers
 * @param {string} rule
 * @returns {Array}
 */

var parseModifiers = function parseModifiers(rule) {
  return substringAfter(rule, '$').split(',');
};
/**
 * Gets redirect resource name
 * @param {string} rule
 * @param {string} marker - specific Adg/Ubo or Abp redirect resources marker
 * @returns {string} - redirect resource name
 */

var getRedirectName = function getRedirectName(rule, marker) {
  var ruleModifiers = parseModifiers(rule);
  var redirectNamePart = ruleModifiers.find(function (el) {
    return el.indexOf(marker) > -1;
  });
  return substringAfter(redirectNamePart, marker);
};
/**
 * Checks is ADG redirect resource rule
 * @param {string} rule rule text
 */

var isAdgRedirectResourceRule = function isAdgRedirectResourceRule(rule) {
  if (!isComment(rule) && rule.indexOf('||') > -1 && rule.indexOf(ADG_UBO_REDIRECT_RESOURCE_MARKER) > -1) {
    var redirectName = getRedirectName(rule, ADG_UBO_REDIRECT_RESOURCE_MARKER);
    return redirectName === Object.keys(adgToUboCompatibility).find(function (el) {
      return el === redirectName;
    });
  }

  return false;
};
/**
 * Checks is UBO redirect resource rule
 * @param {string} rule rule text
 */

var isUboRedirectResourceRule = function isUboRedirectResourceRule(rule) {
  if (!isComment(rule) && rule.indexOf('||') > -1 && rule.indexOf(ADG_UBO_REDIRECT_RESOURCE_MARKER) > -1) {
    var redirectName = getRedirectName(rule, ADG_UBO_REDIRECT_RESOURCE_MARKER);
    return redirectName === Object.keys(uboToAdgCompatibility).find(function (el) {
      return el === redirectName;
    });
  }

  return false;
};
/**
 * Checks is ABP rewrite resource rule
 * @param {string} rule rule text
 */

var isAbpRewriteResourceRule = function isAbpRewriteResourceRule(rule) {
  if (!isComment(rule) && rule.indexOf('||') > -1 && rule.indexOf(ABP_REDIRECT_RESOURCE_MARKER) > -1) {
    var redirectName = getRedirectName(rule, ABP_REDIRECT_RESOURCE_MARKER);
    return redirectName === Object.keys(abpToAdgCompatibility).find(function (el) {
      return el === redirectName;
    });
  }

  return false;
};
/**
 * Validates rule for Adg -> Ubo convertation
 *
 * Used ONLY for Adg -> Ubo convertation
 * because Ubo redirect rules must contain source type, but Adg and Abp must not.
 *
 * Also source type can not be added automatically because of such valid rules
 * ! Abp:
 * $rewrite=abp-resource:blank-js,xmlhttprequest
 * ! Adg:
 * $script,redirect=noopvast-2.0
 * $xmlhttprequest,redirect=noopvast-2.0
 *
 * @param {string} rule
 * @returns {boolean}
 */

var isValidRedirectRule = function isValidRedirectRule(rule) {
  if (isAdgRedirectResourceRule(rule)) {
    var ruleModifiers = parseModifiers(rule);
    var sourceType = ruleModifiers.find(function (el) {
      return VALID_SOURCE_TYPES.indexOf(el) > -1;
    });
    return sourceType !== undefined;
  }

  return false;
};

function _iterableToArray(iter) {
  if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter);
}

var iterableToArray = _iterableToArray;

function _toArray(arr) {
  return arrayWithHoles(arr) || iterableToArray(arr) || nonIterableRest();
}

var toArray$1 = _toArray;

/**
 * AdGuard scriptlet rule
 */

var ADGUARD_SCRIPTLET_MASK_REG = /#@?%#\/\/scriptlet\(.+\)/; // eslint-disable-next-line no-template-curly-in-string

var ADGUARD_SCRIPTLET_TEMPLATE = '${domains}#%#//scriptlet(${args})'; // eslint-disable-next-line no-template-curly-in-string

var ADGUARD_SCRIPTLET_EXCEPTION_TEMPLATE = '${domains}#@%#//scriptlet(${args})';
/**
 * uBlock scriptlet rule mask
 */
// eslint-disable-next-line no-template-curly-in-string

var UBO_SCRIPTLET_TEMPLATE = '${domains}##+js(${args})'; // eslint-disable-next-line no-template-curly-in-string

var UBO_SCRIPTLET_EXCEPTION_TEMPLATE = '${domains}#@#+js(${args})';
var UBO_ALIAS_NAME_MARKER = 'ubo-'; // https://github.com/gorhill/uBlock/wiki/Static-filter-syntax#xhr

var UBO_XHR_TYPE = 'xhr';
var ADG_XHR_TYPE = 'xmlhttprequest';
/**
 * Returns array of strings separated by space which not in quotes
 * @param {string} str
 */

var getSentences = function getSentences(str) {
  var reg = /'.*?'|".*?"|\S+/g;
  return str.match(reg);
};
/**
 * Replaces string with data by placeholders
 * @param {string} str
 * @param {Object} data - where keys are placeholders names
 */


var replacePlaceholders = function replacePlaceholders(str, data) {
  return Object.keys(data).reduce(function (acc, key) {
    var reg = new RegExp("\\$\\{".concat(key, "\\}"), 'g');
    acc = acc.replace(reg, data[key]);
    return acc;
  }, str);
};
/**
 * Converts string of UBO scriptlet rule to AdGuard scritlet rule
 * @param {string} rule - UBO scriptlet rule
 * @returns {Array} - array with one AdGuard scriptlet rule
 */


var convertUboScriptletToAdg = function convertUboScriptletToAdg(rule) {
  var domains = getBeforeRegExp(rule, UBO_SCRIPTLET_MASK_REG);
  var mask = rule.match(UBO_SCRIPTLET_MASK_REG)[0];
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

    return outputArg;
  }).map(function (arg) {
    return wrapInDoubleQuotes(arg);
  }).join(', ');
  var adgRule = replacePlaceholders(template, {
    domains: domains,
    args: args
  });
  return [adgRule];
};
/**
 * Convert string of ABP snippet rule to AdGuard scritlet rule
 * @param {string} rule - ABP snippet rule
 * @returns {Array} - array of AdGuard scriptlet rules -
 * one or few items depends on Abp-rule
 */

var convertAbpSnippetToAdg = function convertAbpSnippetToAdg(rule) {
  var SEMICOLON_DIVIDER = /;(?=(?:(?:[^"]*"){2})*[^"]*$)/g;
  var mask = rule.indexOf(ABP_SCRIPTLET_MASK) > -1 ? ABP_SCRIPTLET_MASK : ABP_SCRIPTLET_EXCEPTION_MASK;
  var template = mask === ABP_SCRIPTLET_MASK ? ADGUARD_SCRIPTLET_TEMPLATE : ADGUARD_SCRIPTLET_EXCEPTION_TEMPLATE;
  var domains = substringBefore(rule, mask);
  var args = substringAfter(rule, mask);
  return args.split(SEMICOLON_DIVIDER).map(function (args) {
    return getSentences(args).filter(function (arg) {
      return arg;
    }).map(function (arg, index) {
      return index === 0 ? "abp-".concat(arg) : arg;
    }).map(function (arg) {
      return wrapInDoubleQuotes(arg);
    }).join(', ');
  }).map(function (args) {
    return replacePlaceholders(template, {
      domains: domains,
      args: args
    });
  });
};
/**
 * Converts scriptlet rule to AdGuard one
 * @param {string} rule
 * @returns {Array} - array of AdGuard scriptlet rules -
 * one item for Adg and Ubo or few items for Abp
 */

var convertScriptletToAdg = function convertScriptletToAdg(rule) {
  var result;

  if (isUboScriptletRule(rule)) {
    result = convertUboScriptletToAdg(rule);
  } else if (isAbpSnippetRule(rule)) {
    result = convertAbpSnippetToAdg(rule);
  } else if (isAdgScriptletRule(rule) || isComment(rule)) {
    result = [rule];
  }

  return result;
};
/**
 * Converts UBO scriptlet rule to AdGuard one
 * @param {string} rule - AdGuard scriptlet rule
 * @returns {string} - UBO scriptlet rule
 */

var convertAdgScriptletToUbo = function convertAdgScriptletToUbo(rule) {
  var res;

  if (isAdgScriptletRule(rule)) {
    var _parseRule = parseRule(rule),
        parsedName = _parseRule.name,
        parsedParams = _parseRule.args; // object of name and aliases for the Adg-scriptlet


    var adgScriptletObject = Object.keys(scriptletList).map(function (el) {
      return scriptletList[el];
    }).map(function (s) {
      var _s$names = toArray$1(s.names),
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
      var uboAlias = adgScriptletObject.aliases // eslint-disable-next-line no-restricted-properties
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
        var uboName = uboAlias.replace(UBO_ALIAS_NAME_MARKER, '') // '.js' in the Ubo scriptlet name can be omitted
        // https://github.com/gorhill/uBlock/wiki/Resources-Library#general-purpose-scriptlets
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
/**
 * Validates any scriptlet rule
 * @param {string} input - can be Adguard or Ubo or Abp scriptlet rule
 */

var isValidScriptletRule = function isValidScriptletRule(input) {
  if (!input) {
    return false;
  } // ABP 'input' rule may contain more than one snippet


  var rulesArray = convertScriptletToAdg(input); // checking if each of parsed scriptlets is valid
  // if at least one of them is not valid - whole 'input' rule is not valid too

  var isValid = rulesArray.reduce(function (acc, rule) {
    var parsedRule = parseRule(rule);
    return isValidScriptletName(parsedRule.name) && acc;
  }, true);
  return isValid;
};
/**
 * Converts Ubo redirect rule to Adg one
 * @param {string} rule
 * @returns {string}
 */

var convertUboRedirectToAdg = function convertUboRedirectToAdg(rule) {
  var firstPartOfRule = substringBefore(rule, '$');
  var uboModifiers = parseModifiers(rule);
  var adgModifiers = uboModifiers.map(function (el) {
    if (el.indexOf(ADG_UBO_REDIRECT_RESOURCE_MARKER) > -1) {
      var uboName = getRedirectName(rule, ADG_UBO_REDIRECT_RESOURCE_MARKER);
      var adgName = uboToAdgCompatibility["".concat(uboName)]; // redirect names may contain '-'

      return "".concat(ADG_UBO_REDIRECT_RESOURCE_MARKER).concat(adgName);
    }

    if (el === UBO_XHR_TYPE) {
      return ADG_XHR_TYPE;
    }

    return el;
  }).join(',');
  return "".concat(firstPartOfRule, "$").concat(adgModifiers);
};
/**
 * Converts Abp redirect rule to Adg one
 * @param {string} rule
 * @returns {string}
 */

var convertAbpRedirectToAdg = function convertAbpRedirectToAdg(rule) {
  var firstPartOfRule = substringBefore(rule, '$');
  var abpModifiers = parseModifiers(rule);
  var adgModifiers = abpModifiers.map(function (el) {
    if (el.indexOf(ABP_REDIRECT_RESOURCE_MARKER) > -1) {
      var abpName = getRedirectName(rule, ABP_REDIRECT_RESOURCE_MARKER);
      var adgName = abpToAdgCompatibility["".concat(abpName)]; // redirect names may contain '-'

      return "".concat(ADG_UBO_REDIRECT_RESOURCE_MARKER).concat(adgName);
    }

    return el;
  }).join(',');
  return "".concat(firstPartOfRule, "$").concat(adgModifiers);
};
/**
 * Converts redirect rule to AdGuard one
 * @param {string} rule
 * @returns {string}
 */

var convertRedirectToAdg = function convertRedirectToAdg(rule) {
  var result;

  if (isUboRedirectResourceRule(rule)) {
    result = convertUboRedirectToAdg(rule);
  } else if (isAbpRewriteResourceRule(rule)) {
    result = convertAbpRedirectToAdg(rule);
  } else if (isAdgRedirectResourceRule(rule) || isComment(rule)) {
    result = rule;
  }

  return result;
};
/**
 * Converts Adg redirect rule to Ubo one
 * @param {string} rule
 * @returns {string}
 */

var convertAdgRedirectToUbo = function convertAdgRedirectToUbo(rule) {
  if (!isValidRedirectRule(rule)) {
    throw new Error("Rule is not valid for converting to Ubo.\nSource type is not specified in the rule: ".concat(rule));
  } else {
    var firstPartOfRule = substringBefore(rule, '$');
    var uboModifiers = parseModifiers(rule);
    var adgModifiers = uboModifiers.map(function (el) {
      if (el.indexOf(ADG_UBO_REDIRECT_RESOURCE_MARKER) > -1) {
        var adgName = getRedirectName(rule, ADG_UBO_REDIRECT_RESOURCE_MARKER);
        var uboName = adgToUboCompatibility["".concat(adgName)]; // redirect names may contain '-'

        return "".concat(ADG_UBO_REDIRECT_RESOURCE_MARKER).concat(uboName);
      }

      return el;
    }).join(',');
    return "".concat(firstPartOfRule, "$").concat(adgModifiers);
  }
};

/**
 * @redirect google-analytics
 *
 * @description
 * Mocks Google Analytics API.
 *
 * Related UBO redirect resource:
 * https://github.com/gorhill/uBlock/blob/a94df7f3b27080ae2dcb3b914ace39c0c294d2f6/src/web_accessible_resources/google-analytics_analytics.js
 *
 * **Example**
 * ```
 * ||example.org/index.js$script,redirect=google-analytics
 * ```
 */

function GoogleAnalytics(source) {
  // eslint-disable-next-line func-names
  var Tracker = function Tracker() {}; // constructor


  var proto = Tracker.prototype;
  proto.get = noop;
  proto.set = noop;
  proto.send = noop;
  var googleAnalyticsName = window.GoogleAnalyticsObject || 'ga';

  function ga() {
    var len = arguments.length;

    if (len === 0) {
      return;
    } // eslint-disable-next-line prefer-rest-params


    var lastArg = arguments[len - 1];

    if (typeof lastArg !== 'object' || lastArg === null || typeof lastArg.hitCallback !== 'function') {
      return;
    }

    try {
      lastArg.hitCallback(); // eslint-disable-next-line no-empty
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

/* eslint-disable no-underscore-dangle */
/**
 * @redirect google-analytics-ga
 *
 * @description
 * Mocks old Google Analytics API.
 *
 * Related UBO redirect resource:
 * https://github.com/gorhill/uBlock/blob/a94df7f3b27080ae2dcb3b914ace39c0c294d2f6/src/web_accessible_resources/google-analytics_ga.js
 *
 * **Example**
 * ```
 * ||example.org/index.js$script,redirect=google-analytics-ga
 * ```
 */

function GoogleAnalyticsGa(source) {
  // Gaq constructor
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
    } // https://developers.google.com/analytics/devguides/collection/gajs/methods/gaJSApiDomainDirectory#_gat.GA_Tracker_._link


    if (data[0] === '_link' && typeof data[1] === 'string') {
      window.location.assign(data[1]);
    } // https://github.com/gorhill/uBlock/issues/2162


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
  } // eslint-disable-next-line no-multi-assign


  window._gaq = gaq.qf = gaq; // Gat constructor

  function Gat() {} // Mock tracker api


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

/**
 * @redirect googlesyndication-adsbygoogle
 *
 * @description
 * Mocks Google AdSense API.
 *
 * Related UBO redirect resource:
 * https://github.com/gorhill/uBlock/blob/a94df7f3b27080ae2dcb3b914ace39c0c294d2f6/src/web_accessible_resources/googlesyndication_adsbygoogle.js
 *
 * **Example**
 * ```
 * ||example.org/index.js$script,redirect=googlesyndication-adsbygoogle
 * ```
 */

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

/**
 * @redirect googletagmanager-gtm
 *
 * @description
 * Mocks Google Tag Manager API.
 *
 * Related UBO redirect resource:
 * https://github.com/gorhill/uBlock/blob/a94df7f3b27080ae2dcb3b914ace39c0c294d2f6/src/web_accessible_resources/googletagmanager_gtm.js
 *
 * **Example**
 * ```
 * ||example.org/index.js$script,redirect=googletagmanager-gtm
 * ```
 */

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

/**
 * @redirect googletagservices-gpt
 *
 * @description
 * Mocks Google Publisher Tag API.
 *
 * Related UBO redirect resource:
 * https://github.com/gorhill/uBlock/blob/a94df7f3b27080ae2dcb3b914ace39c0c294d2f6/src/web_accessible_resources/googletagservices_gpt.js
 *
 * **Example**
 * ```
 * ||example.org/index.js$script,redirect=googletagservices-gpt
 * ```
 */

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

  function PassbackSlot() {} // constructor


  PassbackSlot.prototype.display = noop;
  PassbackSlot.prototype.get = noopNull;
  PassbackSlot.prototype.set = noopThis;
  PassbackSlot.prototype.setClickUrl = noopThis;
  PassbackSlot.prototype.setTagForChildDirectedTreatment = noopThis;
  PassbackSlot.prototype.setTargeting = noopThis;
  PassbackSlot.prototype.updateTargetingFromMap = noopThis;

  function SizeMappingBuilder() {} // constructor


  SizeMappingBuilder.prototype.addSize = noopThis;
  SizeMappingBuilder.prototype.build = noopNull;

  function Slot() {} // constructor


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
      a(); // eslint-disable-next-line no-empty
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

/**
 * @redirect scorecardresearch-beacon
 *
 * @description
 * Mocks Scorecard Research API.
 *
 * Related UBO redirect resource:
 * https://github.com/gorhill/uBlock/blob/a94df7f3b27080ae2dcb3b914ace39c0c294d2f6/src/web_accessible_resources/scorecardresearch_beacon.js
 *
 * **Example**
 * ```
 * ||example.org/index.js$script,redirect=scorecardresearch-beacon
 * ```
 */

function ScoreCardResearchBeacon(source) {
  window.COMSCORE = {
    purge: function purge() {
      // eslint-disable-next-line no-underscore-dangle
      window._comscore = [];
    },
    beacon: function beacon() {}
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
 * **Example**
 * ```
 * ||example.org/index.js$script,redirect=metrika-yandex-tag
 * ```
 */

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
  /**
   * https://yandex.ru/support/metrica/objects/addfileextension.html
   */

  var addFileExtension = noop;
  /**
   * https://yandex.ru/support/metrica/objects/extlink.html
   */

  var extLink = asyncCallbackFromOptions;
  /**
   * https://yandex.ru/support/metrica/objects/file.html
   */

  var file = asyncCallbackFromOptions;
  /**
   * https://yandex.ru/support/metrica/objects/get-client-id.html
   * @param {Function} cb
   */

  var getClientID = function getClientID(cb) {
    setTimeout(cb(null));
  };
  /**
   * https://yandex.ru/support/metrica/objects/hit.html
   */


  var hitFunc = asyncCallbackFromOptions;
  /**
   * https://yandex.ru/support/metrica/objects/notbounce.html
   */

  var notBounce = asyncCallbackFromOptions;
  /**
   * https://yandex.ru/support/metrica/objects/params-method.html
   */

  var params = noop;
  /**
   * https://yandex.ru/support/metrica/objects/reachgoal.html
   * @param {string} target
   * @param {Object} params
   * @param {Function} callback
   * @param {any} ctx
   */

  var reachGoal = function reachGoal(target, params, callback, ctx) {
    asyncCallbackFromOptions(null, {
      callback: callback,
      ctx: ctx
    });
  };
  /**
   * https://yandex.ru/support/metrica/objects/set-user-id.html
   */


  var setUserID = noop;
  /**
   * https://yandex.ru/support/metrica/objects/user-params.html
   */

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

/**
 * @redirect metrika-yandex-watch
 *
 * @description
 * Mocks the old Yandex Metrika API.
 * https://yandex.ru/support/metrica/objects/_method-reference.html
 *
 * **Example**
 * ```
 * ||example.org/index.js$script,redirect=metrika-yandex-watch
 * ```
 */

function metrikaYandexWatch(source) {
  var cbName = 'yandex_metrika_callbacks';
  /**
   * Gets callback and its context from options and call it in async way
   * @param {Object} options Yandex Metrika API options
   */

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

  function Metrika() {} // constructor
  // Methods without options


  Metrika.prototype.addFileExtension = noop;
  Metrika.prototype.getClientID = noop;
  Metrika.prototype.setUserID = noop;
  Metrika.prototype.userParams = noop; // Methods with options
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

var getRedirectByName = function getRedirectByName(redirectsList, name) {
  // eslint-disable-next-line compat/compat
  var redirects = Object.values(redirectsList);
  return redirects.find(function (r) {
    return r.names && r.names.indexOf(name) > -1;
  });
};

var getRedirectCode = function getRedirectCode(name) {
  var redirect = getRedirectByName(redirectsList, name);
  var result = attachDependencies(redirect);
  result = addCall(redirect, result);
  return passSourceAndProps({
    name: name
  }, result);
};

var redirectsCjs = {
  getCode: getRedirectCode,
  isAdgRedirectResourceRule: isAdgRedirectResourceRule,
  isUboRedirectResourceRule: isUboRedirectResourceRule,
  isAbpRewriteResourceRule: isAbpRewriteResourceRule,
  convertUboRedirectToAdg: convertUboRedirectToAdg,
  convertAbpRedirectToAdg: convertAbpRedirectToAdg,
  convertRedirectToAdg: convertRedirectToAdg,
  isValidRedirectRule: isValidRedirectRule,
  convertAdgRedirectToUbo: convertAdgRedirectToUbo
};

/**
 * @typedef {Object} Source - scriptlet properties
 * @property {string} name Scriptlet name
 * @property {Array<string>} args Arguments for scriptlet function
 * @property {'extension'|'corelibs'} engine Defines the final form of scriptlet string presentation
 * @property {string} [version]
 * @property {boolean} [verbose] flag to enable printing to console debug information
 * @property {string} [ruleText] Source rule text is used for debugging purposes
 */

/**
* Returns scriptlet code by param
* @param {Source} source
*/

function getScriptletCode(source) {
  if (!isValidScriptletName(source.name)) {
    return null;
  }

  var scriptlet = getScriptletByName(source.name);
  var result = attachDependencies(scriptlet);
  result = addCall(scriptlet, result);
  result = source.engine === 'corelibs' ? wrapInNonameFunc(result) : passSourceAndProps(source, result);
  return result;
}
/**
 * Global scriptlet variable
 *
 * @returns {Object} object with methods:
 * `invoke` method receives one argument with `Source` type
 * `validate` method receives one argument with `String` type
 */
// eslint-disable-next-line no-undef


scriptlets = function () {
  return {
    invoke: getScriptletCode,
    validateName: isValidScriptletName,
    validateRule: isValidScriptletRule,
    isAdgScriptletRule: isAdgScriptletRule,
    isUboScriptletRule: isUboScriptletRule,
    isAbpSnippetRule: isAbpSnippetRule,
    convertUboToAdg: convertUboScriptletToAdg,
    convertAbpToAdg: convertAbpSnippetToAdg,
    convertScriptletToAdg: convertScriptletToAdg,
    convertAdgToUbo: convertAdgScriptletToUbo,
    redirects: redirectsCjs
  };
}();
 // eslint-disable-line no-undef

module.exports = scriptlets;

/**
 * -------------------------------------------
 * |                                         |
 * |  If you want to add your own scriptlet  |
 * |  please put your code below             |
 * |                                         |
 * -------------------------------------------
 */
//# sourceMappingURL=scriptletsCjs.js.map
