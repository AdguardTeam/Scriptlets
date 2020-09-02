
/**
 * AdGuard Scriptlets
 * Version 1.1.3
 */

(function () {
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

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }
  var classCallCheck = _classCallCheck;

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }
  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
  }
  var createClass = _createClass;

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

  function YAMLException(reason, mark) {
    Error.call(this);
    this.name = 'YAMLException';
    this.reason = reason;
    this.mark = mark;
    this.message = (this.reason || '(unknown reason)') + (this.mark ? ' ' + this.mark.toString() : '');
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = (new Error()).stack || '';
    }
  }
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

  function Mark(name, buffer, position, line, column) {
    this.name     = name;
    this.buffer   = buffer;
    this.position = position;
    this.line     = line;
    this.column   = column;
  }
  Mark.prototype.getSnippet = function getSnippet(indent, maxLength) {
    var head, start, tail, end, snippet;
    if (!this.buffer) return null;
    indent = indent || 4;
    maxLength = maxLength || 75;
    head = '';
    start = this.position;
    while (start > 0 && '\x00\r\n\x85\u2028\u2029'.indexOf(this.buffer.charAt(start - 1)) === -1) {
      start -= 1;
      if (this.position - start > (maxLength / 2 - 1)) {
        head = ' ... ';
        start += 5;
        break;
      }
    }
    tail = '';
    end = this.position;
    while (end < this.buffer.length && '\x00\r\n\x85\u2028\u2029'.indexOf(this.buffer.charAt(end)) === -1) {
      end += 1;
      if (end - this.position > (maxLength / 2 - 1)) {
        tail = ' ... ';
        end -= 5;
        break;
      }
    }
    snippet = this.buffer.slice(start, end);
    return common.repeat(' ', indent) + head + snippet + tail + '\n' +
           common.repeat(' ', indent + this.position - start + head.length) + '^';
  };
  Mark.prototype.toString = function toString(compact) {
    var snippet, where = '';
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
  function compileMap() {
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
    return ((0x30 <= c) && (c <= 0x39)) ||
           ((0x41 <= c) && (c <= 0x46)) ||
           ((0x61 <= c) && (c <= 0x66));
  }
  function isOctCode(c) {
    return ((0x30 <= c) && (c <= 0x37));
  }
  function isDecCode(c) {
    return ((0x30 <= c) && (c <= 0x39));
  }
  function resolveYamlInteger(data) {
    if (data === null) return false;
    var max = data.length,
        index = 0,
        hasDigits = false,
        ch;
    if (!max) return false;
    ch = data[index];
    if (ch === '-' || ch === '+') {
      ch = data[++index];
    }
    if (ch === '0') {
      if (index + 1 === max) return true;
      ch = data[++index];
      if (ch === 'b') {
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
        index++;
        for (; index < max; index++) {
          ch = data[index];
          if (ch === '_') continue;
          if (!isHexCode(data.charCodeAt(index))) return false;
          hasDigits = true;
        }
        return hasDigits && ch !== '_';
      }
      for (; index < max; index++) {
        ch = data[index];
        if (ch === '_') continue;
        if (!isOctCode(data.charCodeAt(index))) return false;
        hasDigits = true;
      }
      return hasDigits && ch !== '_';
    }
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
    if (!hasDigits || ch === '_') return false;
    if (ch !== ':') return true;
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
    '^(?:[-+]?(?:0|[1-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?' +
    '|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?' +
    '|[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\\.[0-9_]*' +
    '|[-+]?\\.(?:inf|Inf|INF)' +
    '|\\.(?:nan|NaN|NAN))$');
  function resolveYamlFloat(data) {
    if (data === null) return false;
    if (!YAML_FLOAT_PATTERN.test(data) ||
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
    '^([0-9][0-9][0-9][0-9])'          +
    '-([0-9][0-9])'                    +
    '-([0-9][0-9])$');
  var YAML_TIMESTAMP_REGEXP = new RegExp(
    '^([0-9][0-9][0-9][0-9])'          +
    '-([0-9][0-9]?)'                   +
    '-([0-9][0-9]?)'                   +
    '(?:[Tt]|[ \\t]+)'                 +
    '([0-9][0-9]?)'                    +
    ':([0-9][0-9])'                    +
    ':([0-9][0-9])'                    +
    '(?:\\.([0-9]*))?'                 +
    '(?:[ \\t]*(Z|([-+])([0-9][0-9]?)' +
    '(?::([0-9][0-9]))?))?$');
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
    year = +(match[1]);
    month = +(match[2]) - 1;
    day = +(match[3]);
    if (!match[4]) {
      return new Date(Date.UTC(year, month, day));
    }
    hour = +(match[4]);
    minute = +(match[5]);
    second = +(match[6]);
    if (match[7]) {
      fraction = match[7].slice(0, 3);
      while (fraction.length < 3) {
        fraction += '0';
      }
      fraction = +fraction;
    }
    if (match[9]) {
      tz_hour = +(match[10]);
      tz_minute = +(match[11] || 0);
      delta = (tz_hour * 60 + tz_minute) * 60000;
      if (match[9] === '-') delta = -delta;
    }
    date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));
    if (delta) date.setTime(date.getTime() - delta);
    return date;
  }
  function representYamlTimestamp(object ) {
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

  var NodeBuffer;
  try {
    var _require = commonjsRequire;
    NodeBuffer = _require('buffer').Buffer;
  } catch (__) {}
  var BASE64_MAP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r';
  function resolveYamlBinary(data) {
    if (data === null) return false;
    var code, idx, bitlen = 0, max = data.length, map = BASE64_MAP;
    for (idx = 0; idx < max; idx++) {
      code = map.indexOf(data.charAt(idx));
      if (code > 64) continue;
      if (code < 0) return false;
      bitlen += 6;
    }
    return (bitlen % 8) === 0;
  }
  function constructYamlBinary(data) {
    var idx, tailbits,
        input = data.replace(/[\r\n=]/g, ''),
        max = input.length,
        map = BASE64_MAP,
        bits = 0,
        result = [];
    for (idx = 0; idx < max; idx++) {
      if ((idx % 4 === 0) && idx) {
        result.push((bits >> 16) & 0xFF);
        result.push((bits >> 8) & 0xFF);
        result.push(bits & 0xFF);
      }
      bits = (bits << 6) | map.indexOf(input.charAt(idx));
    }
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
    if (NodeBuffer) {
      return NodeBuffer.from ? NodeBuffer.from(result) : new NodeBuffer(result);
    }
    return result;
  }
  function representYamlBinary(object ) {
    var result = '', bits = 0, idx, tail,
        max = object.length,
        map = BASE64_MAP;
    for (idx = 0; idx < max; idx++) {
      if ((idx % 3 === 0) && idx) {
        result += map[(bits >> 18) & 0x3F];
        result += map[(bits >> 12) & 0x3F];
        result += map[(bits >> 6) & 0x3F];
        result += map[bits & 0x3F];
      }
      bits = (bits << 8) + object[idx];
    }
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
    if (regexp[0] === '/') {
      if (tail) modifiers = tail[1];
      if (modifiers.length > 3) return false;
      if (regexp[regexp.length - modifiers.length - 1] !== '/') return false;
    }
    return true;
  }
  function constructJavascriptRegExp(data) {
    var regexp = data,
        tail   = /\/([gim]*)$/.exec(data),
        modifiers = '';
    if (regexp[0] === '/') {
      if (tail) modifiers = tail[1];
      regexp = regexp.slice(1, regexp.length - modifiers.length - 1);
    }
    return new RegExp(regexp, modifiers);
  }
  function representJavascriptRegExp(object ) {
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
  try {
    var _require$1 = commonjsRequire;
    esprima = _require$1('esprima');
  } catch (_) {
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
    if (ast.body[0].expression.body.type === 'BlockStatement') {
      return new Function(params, source.slice(body[0] + 1, body[1] - 1));
    }
    return new Function(params, 'return ' + source.slice(body[0], body[1]));
  }
  function representJavascriptFunction(object ) {
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

  var _hasOwnProperty$2 = Object.prototype.hasOwnProperty;
  var CONTEXT_FLOW_IN   = 1;
  var CONTEXT_FLOW_OUT  = 2;
  var CONTEXT_BLOCK_IN  = 3;
  var CONTEXT_BLOCK_OUT = 4;
  var CHOMPING_CLIP  = 1;
  var CHOMPING_STRIP = 2;
  var CHOMPING_KEEP  = 3;
  var PATTERN_NON_PRINTABLE         = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
  var PATTERN_NON_ASCII_LINE_BREAKS = /[\x85\u2028\u2029]/;
  var PATTERN_FLOW_INDICATORS       = /[,\[\]\{\}]/;
  var PATTERN_TAG_HANDLE            = /^(?:!|!!|![a-z\-]+!)$/i;
  var PATTERN_TAG_URI               = /^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;
  function _class(obj) { return Object.prototype.toString.call(obj); }
  function is_EOL(c) {
    return (c === 0x0A) || (c === 0x0D);
  }
  function is_WHITE_SPACE(c) {
    return (c === 0x09) || (c === 0x20);
  }
  function is_WS_OR_EOL(c) {
    return (c === 0x09) ||
           (c === 0x20) ||
           (c === 0x0A) ||
           (c === 0x0D);
  }
  function is_FLOW_INDICATOR(c) {
    return c === 0x2C ||
           c === 0x5B ||
           c === 0x5D ||
           c === 0x7B ||
           c === 0x7D;
  }
  function fromHexCode(c) {
    var lc;
    if ((0x30 <= c) && (c <= 0x39)) {
      return c - 0x30;
    }
    lc = c | 0x20;
    if ((0x61 <= lc) && (lc <= 0x66)) {
      return lc - 0x61 + 10;
    }
    return -1;
  }
  function escapedHexLen(c) {
    if (c === 0x78) { return 2; }
    if (c === 0x75) { return 4; }
    if (c === 0x55) { return 8; }
    return 0;
  }
  function fromDecimalCode(c) {
    if ((0x30 <= c) && (c <= 0x39)) {
      return c - 0x30;
    }
    return -1;
  }
  function simpleEscapeSequence(c) {
    return (c === 0x30) ? '\x00' :
          (c === 0x61) ? '\x07' :
          (c === 0x62) ? '\x08' :
          (c === 0x74) ? '\x09' :
          (c === 0x09) ? '\x09' :
          (c === 0x6E) ? '\x0A' :
          (c === 0x76) ? '\x0B' :
          (c === 0x66) ? '\x0C' :
          (c === 0x72) ? '\x0D' :
          (c === 0x65) ? '\x1B' :
          (c === 0x20) ? ' ' :
          (c === 0x22) ? '\x22' :
          (c === 0x2F) ? '/' :
          (c === 0x5C) ? '\x5C' :
          (c === 0x4E) ? '\x85' :
          (c === 0x5F) ? '\xA0' :
          (c === 0x4C) ? '\u2028' :
          (c === 0x50) ? '\u2029' : '';
  }
  function charFromCodepoint(c) {
    if (c <= 0xFFFF) {
      return String.fromCharCode(c);
    }
    return String.fromCharCode(
      ((c - 0x010000) >> 10) + 0xD800,
      ((c - 0x010000) & 0x03FF) + 0xDC00
    );
  }
  var simpleEscapeCheck = new Array(256);
  var simpleEscapeMap = new Array(256);
  for (var i = 0; i < 256; i++) {
    simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
    simpleEscapeMap[i] = simpleEscapeSequence(i);
  }
  function State(input, options) {
    this.input = input;
    this.filename  = options['filename']  || null;
    this.schema    = options['schema']    || default_full;
    this.onWarning = options['onWarning'] || null;
    this.legacy    = options['legacy']    || false;
    this.json      = options['json']      || false;
    this.listener  = options['listener']  || null;
    this.implicitTypes = this.schema.compiledImplicit;
    this.typeMap       = this.schema.compiledTypeMap;
    this.length     = input.length;
    this.position   = 0;
    this.line       = 0;
    this.lineStart  = 0;
    this.lineIndent = 0;
    this.documents = [];
  }
  function generateError(state, message) {
    return new exception(
      message,
      new mark(state.filename, state.input, state.position, state.line, (state.position - state.lineStart)));
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
      state.checkLineBreaks = (minor < 2);
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
      if (_hasOwnProperty$2.call(state.tagMap, handle)) {
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
          if (!(_character === 0x09 ||
                (0x20 <= _character && _character <= 0x10FFFF))) {
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
      if (!_hasOwnProperty$2.call(destination, key)) {
        destination[key] = source[key];
        overridableKeys[key] = true;
      }
    }
  }
  function storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, startLine, startPos) {
    var index, quantity;
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
      if (!state.json &&
          !_hasOwnProperty$2.call(overridableKeys, keyNode) &&
          _hasOwnProperty$2.call(_result, keyNode)) {
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
    if (ch === 0x0A) {
      state.position++;
    } else if (ch === 0x0D) {
      state.position++;
      if (state.input.charCodeAt(state.position) === 0x0A) {
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
      if (allowComments && ch === 0x23) {
        do {
          ch = state.input.charCodeAt(++state.position);
        } while (ch !== 0x0A && ch !== 0x0D && ch !== 0);
      }
      if (is_EOL(ch)) {
        readLineBreak(state);
        ch = state.input.charCodeAt(state.position);
        lineBreaks++;
        state.lineIndent = 0;
        while (ch === 0x20) {
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
    if ((ch === 0x2D || ch === 0x2E) &&
        ch === state.input.charCodeAt(_position + 1) &&
        ch === state.input.charCodeAt(_position + 2)) {
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
    if (is_WS_OR_EOL(ch)      ||
        is_FLOW_INDICATOR(ch) ||
        ch === 0x23    ||
        ch === 0x26    ||
        ch === 0x2A    ||
        ch === 0x21    ||
        ch === 0x7C    ||
        ch === 0x3E    ||
        ch === 0x27    ||
        ch === 0x22    ||
        ch === 0x25    ||
        ch === 0x40    ||
        ch === 0x60) {
      return false;
    }
    if (ch === 0x3F || ch === 0x2D) {
      following = state.input.charCodeAt(state.position + 1);
      if (is_WS_OR_EOL(following) ||
          withinFlowCollection && is_FLOW_INDICATOR(following)) {
        return false;
      }
    }
    state.kind = 'scalar';
    state.result = '';
    captureStart = captureEnd = state.position;
    hasPendingContent = false;
    while (ch !== 0) {
      if (ch === 0x3A) {
        following = state.input.charCodeAt(state.position + 1);
        if (is_WS_OR_EOL(following) ||
            withinFlowCollection && is_FLOW_INDICATOR(following)) {
          break;
        }
      } else if (ch === 0x23) {
        preceding = state.input.charCodeAt(state.position - 1);
        if (is_WS_OR_EOL(preceding)) {
          break;
        }
      } else if ((state.position === state.lineStart && testDocumentSeparator(state)) ||
                 withinFlowCollection && is_FLOW_INDICATOR(ch)) {
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
    var ch,
        captureStart, captureEnd;
    ch = state.input.charCodeAt(state.position);
    if (ch !== 0x27) {
      return false;
    }
    state.kind = 'scalar';
    state.result = '';
    state.position++;
    captureStart = captureEnd = state.position;
    while ((ch = state.input.charCodeAt(state.position)) !== 0) {
      if (ch === 0x27) {
        captureSegment(state, captureStart, state.position, true);
        ch = state.input.charCodeAt(++state.position);
        if (ch === 0x27) {
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
    var captureStart,
        captureEnd,
        hexLength,
        hexResult,
        tmp,
        ch;
    ch = state.input.charCodeAt(state.position);
    if (ch !== 0x22) {
      return false;
    }
    state.kind = 'scalar';
    state.result = '';
    state.position++;
    captureStart = captureEnd = state.position;
    while ((ch = state.input.charCodeAt(state.position)) !== 0) {
      if (ch === 0x22) {
        captureSegment(state, captureStart, state.position, true);
        state.position++;
        return true;
      } else if (ch === 0x5C) {
        captureSegment(state, captureStart, state.position, true);
        ch = state.input.charCodeAt(++state.position);
        if (is_EOL(ch)) {
          skipSeparationSpace(state, false, nodeIndent);
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
        _tag     = state.tag,
        _result,
        _anchor  = state.anchor,
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
    if (ch === 0x5B) {
      terminator = 0x5D;
      isMapping = false;
      _result = [];
    } else if (ch === 0x7B) {
      terminator = 0x7D;
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
      if (ch === 0x3F) {
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
      if ((isExplicitPair || state.line === _line) && ch === 0x3A) {
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
      if (ch === 0x2C) {
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
        chomping       = CHOMPING_CLIP,
        didReadContent = false,
        detectedIndent = false,
        textIndent     = nodeIndent,
        emptyLines     = 0,
        atMoreIndented = false,
        tmp,
        ch;
    ch = state.input.charCodeAt(state.position);
    if (ch === 0x7C) {
      folding = false;
    } else if (ch === 0x3E) {
      folding = true;
    } else {
      return false;
    }
    state.kind = 'scalar';
    state.result = '';
    while (ch !== 0) {
      ch = state.input.charCodeAt(++state.position);
      if (ch === 0x2B || ch === 0x2D) {
        if (CHOMPING_CLIP === chomping) {
          chomping = (ch === 0x2B) ? CHOMPING_KEEP : CHOMPING_STRIP;
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
      do { ch = state.input.charCodeAt(++state.position); }
      while (is_WHITE_SPACE(ch));
      if (ch === 0x23) {
        do { ch = state.input.charCodeAt(++state.position); }
        while (!is_EOL(ch) && (ch !== 0));
      }
    }
    while (ch !== 0) {
      readLineBreak(state);
      state.lineIndent = 0;
      ch = state.input.charCodeAt(state.position);
      while ((!detectedIndent || state.lineIndent < textIndent) &&
             (ch === 0x20)) {
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
      if (state.lineIndent < textIndent) {
        if (chomping === CHOMPING_KEEP) {
          state.result += common.repeat('\n', didReadContent ? 1 + emptyLines : emptyLines);
        } else if (chomping === CHOMPING_CLIP) {
          if (didReadContent) {
            state.result += '\n';
          }
        }
        break;
      }
      if (folding) {
        if (is_WHITE_SPACE(ch)) {
          atMoreIndented = true;
          state.result += common.repeat('\n', didReadContent ? 1 + emptyLines : emptyLines);
        } else if (atMoreIndented) {
          atMoreIndented = false;
          state.result += common.repeat('\n', emptyLines + 1);
        } else if (emptyLines === 0) {
          if (didReadContent) {
            state.result += ' ';
          }
        } else {
          state.result += common.repeat('\n', emptyLines);
        }
      } else {
        state.result += common.repeat('\n', didReadContent ? 1 + emptyLines : emptyLines);
      }
      didReadContent = true;
      detectedIndent = true;
      emptyLines = 0;
      captureStart = state.position;
      while (!is_EOL(ch) && (ch !== 0)) {
        ch = state.input.charCodeAt(++state.position);
      }
      captureSegment(state, captureStart, state.position, false);
    }
    return true;
  }
  function readBlockSequence(state, nodeIndent) {
    var _line,
        _tag      = state.tag,
        _anchor   = state.anchor,
        _result   = [],
        following,
        detected  = false,
        ch;
    if (state.anchor !== null) {
      state.anchorMap[state.anchor] = _result;
    }
    ch = state.input.charCodeAt(state.position);
    while (ch !== 0) {
      if (ch !== 0x2D) {
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
      if ((state.line === _line || state.lineIndent > nodeIndent) && (ch !== 0)) {
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
        _tag          = state.tag,
        _anchor       = state.anchor,
        _result       = {},
        overridableKeys = {},
        keyTag        = null,
        keyNode       = null,
        valueNode     = null,
        atExplicitKey = false,
        detected      = false,
        ch;
    if (state.anchor !== null) {
      state.anchorMap[state.anchor] = _result;
    }
    ch = state.input.charCodeAt(state.position);
    while (ch !== 0) {
      following = state.input.charCodeAt(state.position + 1);
      _line = state.line;
      _pos = state.position;
      if ((ch === 0x3F || ch === 0x3A) && is_WS_OR_EOL(following)) {
        if (ch === 0x3F) {
          if (atExplicitKey) {
            storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null);
            keyTag = keyNode = valueNode = null;
          }
          detected = true;
          atExplicitKey = true;
          allowCompact = true;
        } else if (atExplicitKey) {
          atExplicitKey = false;
          allowCompact = true;
        } else {
          throwError(state, 'incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line');
        }
        state.position += 1;
        ch = following;
      } else if (composeNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true)) {
        if (state.line === _line) {
          ch = state.input.charCodeAt(state.position);
          while (is_WHITE_SPACE(ch)) {
            ch = state.input.charCodeAt(++state.position);
          }
          if (ch === 0x3A) {
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
            return true;
          }
        } else if (detected) {
          throwError(state, 'can not read a block mapping entry; a multiline key may not be an implicit key');
        } else {
          state.tag = _tag;
          state.anchor = _anchor;
          return true;
        }
      } else {
        break;
      }
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
      if (state.lineIndent > nodeIndent && (ch !== 0)) {
        throwError(state, 'bad indentation of a mapping entry');
      } else if (state.lineIndent < nodeIndent) {
        break;
      }
    }
    if (atExplicitKey) {
      storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null);
    }
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
        isNamed    = false,
        tagHandle,
        tagName,
        ch;
    ch = state.input.charCodeAt(state.position);
    if (ch !== 0x21) return false;
    if (state.tag !== null) {
      throwError(state, 'duplication of a tag property');
    }
    ch = state.input.charCodeAt(++state.position);
    if (ch === 0x3C) {
      isVerbatim = true;
      ch = state.input.charCodeAt(++state.position);
    } else if (ch === 0x21) {
      isNamed = true;
      tagHandle = '!!';
      ch = state.input.charCodeAt(++state.position);
    } else {
      tagHandle = '!';
    }
    _position = state.position;
    if (isVerbatim) {
      do { ch = state.input.charCodeAt(++state.position); }
      while (ch !== 0 && ch !== 0x3E);
      if (state.position < state.length) {
        tagName = state.input.slice(_position, state.position);
        ch = state.input.charCodeAt(++state.position);
      } else {
        throwError(state, 'unexpected end of the stream within a verbatim tag');
      }
    } else {
      while (ch !== 0 && !is_WS_OR_EOL(ch)) {
        if (ch === 0x21) {
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
    } else if (_hasOwnProperty$2.call(state.tagMap, tagHandle)) {
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
    var _position,
        ch;
    ch = state.input.charCodeAt(state.position);
    if (ch !== 0x26) return false;
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
    var _position, alias,
        ch;
    ch = state.input.charCodeAt(state.position);
    if (ch !== 0x2A) return false;
    ch = state.input.charCodeAt(++state.position);
    _position = state.position;
    while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
      ch = state.input.charCodeAt(++state.position);
    }
    if (state.position === _position) {
      throwError(state, 'name of an alias node must contain at least one character');
    }
    alias = state.input.slice(_position, state.position);
    if (!state.anchorMap.hasOwnProperty(alias)) {
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
        atNewLine  = false,
        hasContent = false,
        typeIndex,
        typeQuantity,
        type,
        flowIndent,
        blockIndent;
    if (state.listener !== null) {
      state.listener('open', state);
    }
    state.tag    = null;
    state.anchor = null;
    state.kind   = null;
    state.result = null;
    allowBlockStyles = allowBlockScalars = allowBlockCollections =
      CONTEXT_BLOCK_OUT === nodeContext ||
      CONTEXT_BLOCK_IN  === nodeContext;
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
        if (allowBlockCollections &&
            (readBlockSequence(state, blockIndent) ||
             readBlockMapping(state, blockIndent, flowIndent)) ||
            readFlowCollection(state, flowIndent)) {
          hasContent = true;
        } else {
          if ((allowBlockScalars && readBlockScalar(state, flowIndent)) ||
              readSingleQuotedScalar(state, flowIndent) ||
              readDoubleQuotedScalar(state, flowIndent)) {
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
        hasContent = allowBlockCollections && readBlockSequence(state, blockIndent);
      }
    }
    if (state.tag !== null && state.tag !== '!') {
      if (state.tag === '?') {
        for (typeIndex = 0, typeQuantity = state.implicitTypes.length; typeIndex < typeQuantity; typeIndex += 1) {
          type = state.implicitTypes[typeIndex];
          if (type.resolve(state.result)) {
            state.result = type.construct(state.result);
            state.tag = type.tag;
            if (state.anchor !== null) {
              state.anchorMap[state.anchor] = state.result;
            }
            break;
          }
        }
      } else if (_hasOwnProperty$2.call(state.typeMap[state.kind || 'fallback'], state.tag)) {
        type = state.typeMap[state.kind || 'fallback'][state.tag];
        if (state.result !== null && type.kind !== state.kind) {
          throwError(state, 'unacceptable node kind for !<' + state.tag + '> tag; it should be "' + type.kind + '", not "' + state.kind + '"');
        }
        if (!type.resolve(state.result)) {
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
    return state.tag !== null ||  state.anchor !== null || hasContent;
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
      if (state.lineIndent > 0 || ch !== 0x25) {
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
        if (ch === 0x23) {
          do { ch = state.input.charCodeAt(++state.position); }
          while (ch !== 0 && !is_EOL(ch));
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
      if (_hasOwnProperty$2.call(directiveHandlers, directiveName)) {
        directiveHandlers[directiveName](state, directiveName, directiveArgs);
      } else {
        throwWarning(state, 'unknown document directive "' + directiveName + '"');
      }
    }
    skipSeparationSpace(state, true, -1);
    if (state.lineIndent === 0 &&
        state.input.charCodeAt(state.position)     === 0x2D &&
        state.input.charCodeAt(state.position + 1) === 0x2D &&
        state.input.charCodeAt(state.position + 2) === 0x2D) {
      state.position += 3;
      skipSeparationSpace(state, true, -1);
    } else if (hasDirectives) {
      throwError(state, 'directives end mark is expected');
    }
    composeNode(state, state.lineIndent - 1, CONTEXT_BLOCK_OUT, false, true);
    skipSeparationSpace(state, true, -1);
    if (state.checkLineBreaks &&
        PATTERN_NON_ASCII_LINE_BREAKS.test(state.input.slice(documentStart, state.position))) {
      throwWarning(state, 'non-ASCII line breaks are interpreted as content');
    }
    state.documents.push(state.result);
    if (state.position === state.lineStart && testDocumentSeparator(state)) {
      if (state.input.charCodeAt(state.position) === 0x2E) {
        state.position += 3;
        skipSeparationSpace(state, true, -1);
      }
      return;
    }
    if (state.position < (state.length - 1)) {
      throwError(state, 'end of the stream or a document separator is expected');
    } else {
      return;
    }
  }
  function loadDocuments(input, options) {
    input = String(input);
    options = options || {};
    if (input.length !== 0) {
      if (input.charCodeAt(input.length - 1) !== 0x0A &&
          input.charCodeAt(input.length - 1) !== 0x0D) {
        input += '\n';
      }
      if (input.charCodeAt(0) === 0xFEFF) {
        input = input.slice(1);
      }
    }
    var state = new State(input, options);
    state.input += '\0';
    while (state.input.charCodeAt(state.position) === 0x20) {
      state.lineIndent += 1;
      state.position += 1;
    }
    while (state.position < (state.length - 1)) {
      readDocument(state);
    }
    return state.documents;
  }
  function loadAll(input, iterator, options) {
    var documents = loadDocuments(input, options), index, length;
    if (typeof iterator !== 'function') {
      return documents;
    }
    for (index = 0, length = documents.length; index < length; index += 1) {
      iterator(documents[index]);
    }
  }
  function load(input, options) {
    var documents = loadDocuments(input, options);
    if (documents.length === 0) {
      return undefined;
    } else if (documents.length === 1) {
      return documents[0];
    }
    throw new exception('expected a single document in the stream, but found more');
  }
  function safeLoadAll(input, output, options) {
    if (typeof output === 'function') {
      loadAll(input, output, common.extend({ schema: default_safe }, options));
    } else {
      return loadAll(input, common.extend({ schema: default_safe }, options));
    }
  }
  function safeLoad(input, options) {
    return load(input, common.extend({ schema: default_safe }, options));
  }
  var loadAll_1     = loadAll;
  var load_1        = load;
  var safeLoadAll_1 = safeLoadAll;
  var safeLoad_1    = safeLoad;
  var loader = {
  	loadAll: loadAll_1,
  	load: load_1,
  	safeLoadAll: safeLoadAll_1,
  	safeLoad: safeLoad_1
  };

  var _toString$2       = Object.prototype.toString;
  var _hasOwnProperty$3 = Object.prototype.hasOwnProperty;
  var CHAR_TAB                  = 0x09;
  var CHAR_LINE_FEED            = 0x0A;
  var CHAR_SPACE                = 0x20;
  var CHAR_EXCLAMATION          = 0x21;
  var CHAR_DOUBLE_QUOTE         = 0x22;
  var CHAR_SHARP                = 0x23;
  var CHAR_PERCENT              = 0x25;
  var CHAR_AMPERSAND            = 0x26;
  var CHAR_SINGLE_QUOTE         = 0x27;
  var CHAR_ASTERISK             = 0x2A;
  var CHAR_COMMA                = 0x2C;
  var CHAR_MINUS                = 0x2D;
  var CHAR_COLON                = 0x3A;
  var CHAR_GREATER_THAN         = 0x3E;
  var CHAR_QUESTION             = 0x3F;
  var CHAR_COMMERCIAL_AT        = 0x40;
  var CHAR_LEFT_SQUARE_BRACKET  = 0x5B;
  var CHAR_RIGHT_SQUARE_BRACKET = 0x5D;
  var CHAR_GRAVE_ACCENT         = 0x60;
  var CHAR_LEFT_CURLY_BRACKET   = 0x7B;
  var CHAR_VERTICAL_LINE        = 0x7C;
  var CHAR_RIGHT_CURLY_BRACKET  = 0x7D;
  var ESCAPE_SEQUENCES = {};
  ESCAPE_SEQUENCES[0x00]   = '\\0';
  ESCAPE_SEQUENCES[0x07]   = '\\a';
  ESCAPE_SEQUENCES[0x08]   = '\\b';
  ESCAPE_SEQUENCES[0x09]   = '\\t';
  ESCAPE_SEQUENCES[0x0A]   = '\\n';
  ESCAPE_SEQUENCES[0x0B]   = '\\v';
  ESCAPE_SEQUENCES[0x0C]   = '\\f';
  ESCAPE_SEQUENCES[0x0D]   = '\\r';
  ESCAPE_SEQUENCES[0x1B]   = '\\e';
  ESCAPE_SEQUENCES[0x22]   = '\\"';
  ESCAPE_SEQUENCES[0x5C]   = '\\\\';
  ESCAPE_SEQUENCES[0x85]   = '\\N';
  ESCAPE_SEQUENCES[0xA0]   = '\\_';
  ESCAPE_SEQUENCES[0x2028] = '\\L';
  ESCAPE_SEQUENCES[0x2029] = '\\P';
  var DEPRECATED_BOOLEANS_SYNTAX = [
    'y', 'Y', 'yes', 'Yes', 'YES', 'on', 'On', 'ON',
    'n', 'N', 'no', 'No', 'NO', 'off', 'Off', 'OFF'
  ];
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
      if (type && _hasOwnProperty$3.call(type.styleAliases, style)) {
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
  function State$1(options) {
    this.schema        = options['schema'] || default_full;
    this.indent        = Math.max(1, (options['indent'] || 2));
    this.noArrayIndent = options['noArrayIndent'] || false;
    this.skipInvalid   = options['skipInvalid'] || false;
    this.flowLevel     = (common.isNothing(options['flowLevel']) ? -1 : options['flowLevel']);
    this.styleMap      = compileStyleMap(this.schema, options['styles'] || null);
    this.sortKeys      = options['sortKeys'] || false;
    this.lineWidth     = options['lineWidth'] || 80;
    this.noRefs        = options['noRefs'] || false;
    this.noCompatMode  = options['noCompatMode'] || false;
    this.condenseFlow  = options['condenseFlow'] || false;
    this.implicitTypes = this.schema.compiledImplicit;
    this.explicitTypes = this.schema.compiledExplicit;
    this.tag = null;
    this.result = '';
    this.duplicates = [];
    this.usedDuplicates = null;
  }
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
  function isWhitespace(c) {
    return c === CHAR_SPACE || c === CHAR_TAB;
  }
  function isPrintable(c) {
    return  (0x00020 <= c && c <= 0x00007E)
        || ((0x000A1 <= c && c <= 0x00D7FF) && c !== 0x2028 && c !== 0x2029)
        || ((0x0E000 <= c && c <= 0x00FFFD) && c !== 0xFEFF )
        ||  (0x10000 <= c && c <= 0x10FFFF);
  }
  function isPlainSafe(c) {
    return isPrintable(c) && c !== 0xFEFF
      && c !== CHAR_COMMA
      && c !== CHAR_LEFT_SQUARE_BRACKET
      && c !== CHAR_RIGHT_SQUARE_BRACKET
      && c !== CHAR_LEFT_CURLY_BRACKET
      && c !== CHAR_RIGHT_CURLY_BRACKET
      && c !== CHAR_COLON
      && c !== CHAR_SHARP;
  }
  function isPlainSafeFirst(c) {
    return isPrintable(c) && c !== 0xFEFF
      && !isWhitespace(c)
      && c !== CHAR_MINUS
      && c !== CHAR_QUESTION
      && c !== CHAR_COLON
      && c !== CHAR_COMMA
      && c !== CHAR_LEFT_SQUARE_BRACKET
      && c !== CHAR_RIGHT_SQUARE_BRACKET
      && c !== CHAR_LEFT_CURLY_BRACKET
      && c !== CHAR_RIGHT_CURLY_BRACKET
      && c !== CHAR_SHARP
      && c !== CHAR_AMPERSAND
      && c !== CHAR_ASTERISK
      && c !== CHAR_EXCLAMATION
      && c !== CHAR_VERTICAL_LINE
      && c !== CHAR_GREATER_THAN
      && c !== CHAR_SINGLE_QUOTE
      && c !== CHAR_DOUBLE_QUOTE
      && c !== CHAR_PERCENT
      && c !== CHAR_COMMERCIAL_AT
      && c !== CHAR_GRAVE_ACCENT;
  }
  function needIndentIndicator(string) {
    var leadingSpaceRe = /^\n* /;
    return leadingSpaceRe.test(string);
  }
  var STYLE_PLAIN   = 1,
      STYLE_SINGLE  = 2,
      STYLE_LITERAL = 3,
      STYLE_FOLDED  = 4,
      STYLE_DOUBLE  = 5;
  function chooseScalarStyle(string, singleLineOnly, indentPerLevel, lineWidth, testAmbiguousType) {
    var i;
    var char;
    var hasLineBreak = false;
    var hasFoldableLine = false;
    var shouldTrackWidth = lineWidth !== -1;
    var previousLineBreak = -1;
    var plain = isPlainSafeFirst(string.charCodeAt(0))
            && !isWhitespace(string.charCodeAt(string.length - 1));
    if (singleLineOnly) {
      for (i = 0; i < string.length; i++) {
        char = string.charCodeAt(i);
        if (!isPrintable(char)) {
          return STYLE_DOUBLE;
        }
        plain = plain && isPlainSafe(char);
      }
    } else {
      for (i = 0; i < string.length; i++) {
        char = string.charCodeAt(i);
        if (char === CHAR_LINE_FEED) {
          hasLineBreak = true;
          if (shouldTrackWidth) {
            hasFoldableLine = hasFoldableLine ||
              (i - previousLineBreak - 1 > lineWidth &&
               string[previousLineBreak + 1] !== ' ');
            previousLineBreak = i;
          }
        } else if (!isPrintable(char)) {
          return STYLE_DOUBLE;
        }
        plain = plain && isPlainSafe(char);
      }
      hasFoldableLine = hasFoldableLine || (shouldTrackWidth &&
        (i - previousLineBreak - 1 > lineWidth &&
         string[previousLineBreak + 1] !== ' '));
    }
    if (!hasLineBreak && !hasFoldableLine) {
      return plain && !testAmbiguousType(string)
        ? STYLE_PLAIN : STYLE_SINGLE;
    }
    if (indentPerLevel > 9 && needIndentIndicator(string)) {
      return STYLE_DOUBLE;
    }
    return hasFoldableLine ? STYLE_FOLDED : STYLE_LITERAL;
  }
  function writeScalar(state, string, level, iskey) {
    state.dump = (function () {
      if (string.length === 0) {
        return "''";
      }
      if (!state.noCompatMode &&
          DEPRECATED_BOOLEANS_SYNTAX.indexOf(string) !== -1) {
        return "'" + string + "'";
      }
      var indent = state.indent * Math.max(1, level);
      var lineWidth = state.lineWidth === -1
        ? -1 : Math.max(Math.min(state.lineWidth, 40), state.lineWidth - indent);
      var singleLineOnly = iskey
        || (state.flowLevel > -1 && level >= state.flowLevel);
      function testAmbiguity(string) {
        return testImplicitResolving(state, string);
      }
      switch (chooseScalarStyle(string, singleLineOnly, state.indent, lineWidth, testAmbiguity)) {
        case STYLE_PLAIN:
          return string;
        case STYLE_SINGLE:
          return "'" + string.replace(/'/g, "''") + "'";
        case STYLE_LITERAL:
          return '|' + blockHeader(string, state.indent)
            + dropEndingNewline(indentString(string, indent));
        case STYLE_FOLDED:
          return '>' + blockHeader(string, state.indent)
            + dropEndingNewline(indentString(foldString(string, lineWidth), indent));
        case STYLE_DOUBLE:
          return '"' + escapeString(string) + '"';
        default:
          throw new exception('impossible error: invalid scalar style');
      }
    }());
  }
  function blockHeader(string, indentPerLevel) {
    var indentIndicator = needIndentIndicator(string) ? String(indentPerLevel) : '';
    var clip =          string[string.length - 1] === '\n';
    var keep = clip && (string[string.length - 2] === '\n' || string === '\n');
    var chomp = keep ? '+' : (clip ? '' : '-');
    return indentIndicator + chomp + '\n';
  }
  function dropEndingNewline(string) {
    return string[string.length - 1] === '\n' ? string.slice(0, -1) : string;
  }
  function foldString(string, width) {
    var lineRe = /(\n+)([^\n]*)/g;
    var result = (function () {
      var nextLF = string.indexOf('\n');
      nextLF = nextLF !== -1 ? nextLF : string.length;
      lineRe.lastIndex = nextLF;
      return foldLine(string.slice(0, nextLF), width);
    }());
    var prevMoreIndented = string[0] === '\n' || string[0] === ' ';
    var moreIndented;
    var match;
    while ((match = lineRe.exec(string))) {
      var prefix = match[1], line = match[2];
      moreIndented = (line[0] === ' ');
      result += prefix
        + (!prevMoreIndented && !moreIndented && line !== ''
          ? '\n' : '')
        + foldLine(line, width);
      prevMoreIndented = moreIndented;
    }
    return result;
  }
  function foldLine(line, width) {
    if (line === '' || line[0] === ' ') return line;
    var breakRe = / [^ ]/g;
    var match;
    var start = 0, end, curr = 0, next = 0;
    var result = '';
    while ((match = breakRe.exec(line))) {
      next = match.index;
      if (next - start > width) {
        end = (curr > start) ? curr : next;
        result += '\n' + line.slice(start, end);
        start = end + 1;
      }
      curr = next;
    }
    result += '\n';
    if (line.length - start > width && curr > start) {
      result += line.slice(start, curr) + '\n' + line.slice(curr + 1);
    } else {
      result += line.slice(start);
    }
    return result.slice(1);
  }
  function escapeString(string) {
    var result = '';
    var char, nextChar;
    var escapeSeq;
    for (var i = 0; i < string.length; i++) {
      char = string.charCodeAt(i);
      if (char >= 0xD800 && char <= 0xDBFF) {
        nextChar = string.charCodeAt(i + 1);
        if (nextChar >= 0xDC00 && nextChar <= 0xDFFF) {
          result += encodeHex((char - 0xD800) * 0x400 + nextChar - 0xDC00 + 0x10000);
          i++; continue;
        }
      }
      escapeSeq = ESCAPE_SEQUENCES[char];
      result += !escapeSeq && isPrintable(char)
        ? string[i]
        : escapeSeq || encodeHex(char);
    }
    return result;
  }
  function writeFlowSequence(state, level, object) {
    var _result = '',
        _tag    = state.tag,
        index,
        length;
    for (index = 0, length = object.length; index < length; index += 1) {
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
        _tag    = state.tag,
        index,
        length;
    for (index = 0, length = object.length; index < length; index += 1) {
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
    state.dump = _result || '[]';
  }
  function writeFlowMapping(state, level, object) {
    var _result       = '',
        _tag          = state.tag,
        objectKeyList = Object.keys(object),
        index,
        length,
        objectKey,
        objectValue,
        pairBuffer;
    for (index = 0, length = objectKeyList.length; index < length; index += 1) {
      pairBuffer = state.condenseFlow ? '"' : '';
      if (index !== 0) pairBuffer += ', ';
      objectKey = objectKeyList[index];
      objectValue = object[objectKey];
      if (!writeNode(state, level, objectKey, false, false)) {
        continue;
      }
      if (state.dump.length > 1024) pairBuffer += '? ';
      pairBuffer += state.dump + (state.condenseFlow ? '"' : '') + ':' + (state.condenseFlow ? '' : ' ');
      if (!writeNode(state, level, objectValue, false, false)) {
        continue;
      }
      pairBuffer += state.dump;
      _result += pairBuffer;
    }
    state.tag = _tag;
    state.dump = '{' + _result + '}';
  }
  function writeBlockMapping(state, level, object, compact) {
    var _result       = '',
        _tag          = state.tag,
        objectKeyList = Object.keys(object),
        index,
        length,
        objectKey,
        objectValue,
        explicitPair,
        pairBuffer;
    if (state.sortKeys === true) {
      objectKeyList.sort();
    } else if (typeof state.sortKeys === 'function') {
      objectKeyList.sort(state.sortKeys);
    } else if (state.sortKeys) {
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
        continue;
      }
      explicitPair = (state.tag !== null && state.tag !== '?') ||
                     (state.dump && state.dump.length > 1024);
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
        continue;
      }
      if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
        pairBuffer += ':';
      } else {
        pairBuffer += ': ';
      }
      pairBuffer += state.dump;
      _result += pairBuffer;
    }
    state.tag = _tag;
    state.dump = _result || '{}';
  }
  function detectType(state, object, explicit) {
    var _result, typeList, index, length, type, style;
    typeList = explicit ? state.explicitTypes : state.implicitTypes;
    for (index = 0, length = typeList.length; index < length; index += 1) {
      type = typeList[index];
      if ((type.instanceOf  || type.predicate) &&
          (!type.instanceOf || ((typeof object === 'object') && (object instanceof type.instanceOf))) &&
          (!type.predicate  || type.predicate(object))) {
        state.tag = explicit ? type.tag : '?';
        if (type.represent) {
          style = state.styleMap[type.tag] || type.defaultStyle;
          if (_toString$2.call(type.represent) === '[object Function]') {
            _result = type.represent(object, style);
          } else if (_hasOwnProperty$3.call(type.represent, style)) {
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
  function writeNode(state, level, object, block, compact, iskey) {
    state.tag = null;
    state.dump = object;
    if (!detectType(state, object, false)) {
      detectType(state, object, true);
    }
    var type = _toString$2.call(state.dump);
    if (block) {
      block = (state.flowLevel < 0 || state.flowLevel > level);
    }
    var objectOrArray = type === '[object Object]' || type === '[object Array]',
        duplicateIndex,
        duplicate;
    if (objectOrArray) {
      duplicateIndex = state.duplicates.indexOf(object);
      duplicate = duplicateIndex !== -1;
    }
    if ((state.tag !== null && state.tag !== '?') || duplicate || (state.indent !== 2 && level > 0)) {
      compact = false;
    }
    if (duplicate && state.usedDuplicates[duplicateIndex]) {
      state.dump = '*ref_' + duplicateIndex;
    } else {
      if (objectOrArray && duplicate && !state.usedDuplicates[duplicateIndex]) {
        state.usedDuplicates[duplicateIndex] = true;
      }
      if (type === '[object Object]') {
        if (block && (Object.keys(state.dump).length !== 0)) {
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
        var arrayLevel = (state.noArrayIndent && (level > 0)) ? level - 1 : level;
        if (block && (state.dump.length !== 0)) {
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
    var objectKeyList,
        index,
        length;
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
  function dump(input, options) {
    options = options || {};
    var state = new State$1(options);
    if (!state.noRefs) getDuplicateReferences(input, state);
    if (writeNode(state, 0, input, true, true)) return state.dump + '\n';
    return '';
  }
  function safeDump(input, options) {
    return dump(input, common.extend({ schema: default_safe }, options));
  }
  var dump_1     = dump;
  var safeDump_1 = safeDump;
  var dumper = {
  	dump: dump_1,
  	safeDump: safeDump_1
  };

  function deprecated(name) {
    return function () {
      throw new Error('Function ' + name + ' is deprecated and cannot be used.');
    };
  }
  var Type$1                = type;
  var Schema$1              = schema;
  var FAILSAFE_SCHEMA     = failsafe;
  var JSON_SCHEMA         = json;
  var CORE_SCHEMA         = core;
  var DEFAULT_SAFE_SCHEMA = default_safe;
  var DEFAULT_FULL_SCHEMA = default_full;
  var load$1                = loader.load;
  var loadAll$1             = loader.loadAll;
  var safeLoad$1            = loader.safeLoad;
  var safeLoadAll$1         = loader.safeLoadAll;
  var dump$1                = dumper.dump;
  var safeDump$1            = dumper.safeDump;
  var YAMLException$1       = exception;
  var MINIMAL_SCHEMA = failsafe;
  var SAFE_SCHEMA    = default_safe;
  var DEFAULT_SCHEMA = default_full;
  var scan           = deprecated('scan');
  var parse          = deprecated('parse');
  var compose        = deprecated('compose');
  var addConstructor = deprecated('addConstructor');
  var jsYaml = {
  	Type: Type$1,
  	Schema: Schema$1,
  	FAILSAFE_SCHEMA: FAILSAFE_SCHEMA,
  	JSON_SCHEMA: JSON_SCHEMA,
  	CORE_SCHEMA: CORE_SCHEMA,
  	DEFAULT_SAFE_SCHEMA: DEFAULT_SAFE_SCHEMA,
  	DEFAULT_FULL_SCHEMA: DEFAULT_FULL_SCHEMA,
  	load: load$1,
  	loadAll: loadAll$1,
  	safeLoad: safeLoad$1,
  	safeLoadAll: safeLoadAll$1,
  	dump: dump$1,
  	safeDump: safeDump$1,
  	YAMLException: YAMLException$1,
  	MINIMAL_SCHEMA: MINIMAL_SCHEMA,
  	SAFE_SCHEMA: SAFE_SCHEMA,
  	DEFAULT_SCHEMA: DEFAULT_SCHEMA,
  	scan: scan,
  	parse: parse,
  	compose: compose,
  	addConstructor: addConstructor
  };

  var jsYaml$1 = jsYaml;

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
  var wrapInDoubleQuotes = function wrapInDoubleQuotes(str) {
    if (str[0] === '\'' && str[str.length - 1] === '\'') {
      str = str.substring(1, str.length - 1);
      str = str.replace(/\"/g, '\\"');
    } else if (str[0] === '"' && str[str.length - 1] === '"') {
      str = str.substring(1, str.length - 1);
      str = str.replace(/\'/g, '\\\'');
    }
    return "\"".concat(str, "\"");
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
  var ADG_UBO_REDIRECT_RESOURCE_MARKER = 'redirect=';
  var ABP_REDIRECT_RESOURCE_MARKER = 'rewrite=abp-resource:';
  var VALID_SOURCE_TYPES = ['image', 'subdocument', 'stylesheet', 'script', 'xmlhttprequest', 'media'];
  var validAdgRedirects = redirects.filter(function (el) {
    return el.adg;
  });
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
  var uboToAdgCompatibility = arrayOfPairsToObject(validAdgRedirects.filter(function (el) {
    return el.ubo;
  }).map(function (el) {
    return [el.ubo, el.adg];
  }));
  var abpToAdgCompatibility = arrayOfPairsToObject(validAdgRedirects.filter(function (el) {
    return el.abp;
  }).map(function (el) {
    return [el.abp, el.adg];
  }));
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
  var isAdgRedirectResourceRule = function isAdgRedirectResourceRule(rule) {
    if (!isComment(rule) && rule.indexOf('||') > -1 && rule.indexOf(ADG_UBO_REDIRECT_RESOURCE_MARKER) > -1) {
      var redirectName = getRedirectName(rule, ADG_UBO_REDIRECT_RESOURCE_MARKER);
      return redirectName === Object.keys(adgToUboCompatibility).find(function (el) {
        return el === redirectName;
      });
    }
    return false;
  };
  var isUboRedirectResourceRule = function isUboRedirectResourceRule(rule) {
    if (!isComment(rule) && rule.indexOf('||') > -1 && rule.indexOf(ADG_UBO_REDIRECT_RESOURCE_MARKER) > -1) {
      var redirectName = getRedirectName(rule, ADG_UBO_REDIRECT_RESOURCE_MARKER);
      return redirectName === Object.keys(uboToAdgCompatibility).find(function (el) {
        return el === redirectName;
      });
    }
    return false;
  };
  var isAbpRewriteResourceRule = function isAbpRewriteResourceRule(rule) {
    if (!isComment(rule) && rule.indexOf('||') > -1 && rule.indexOf(ABP_REDIRECT_RESOURCE_MARKER) > -1) {
      var redirectName = getRedirectName(rule, ABP_REDIRECT_RESOURCE_MARKER);
      return redirectName === Object.keys(abpToAdgCompatibility).find(function (el) {
        return el === redirectName;
      });
    }
    return false;
  };
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
  var convertAdgScriptletToUbo = function convertAdgScriptletToUbo(rule) {
    var res;
    if (isAdgScriptletRule(rule)) {
      var _parseRule = parseRule(rule),
          parsedName = _parseRule.name,
          parsedParams = _parseRule.args;
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
      return isValidScriptletName(parsedRule.name) && acc;
    }, true);
    return isValid;
  };
  var convertUboRedirectToAdg = function convertUboRedirectToAdg(rule) {
    var firstPartOfRule = substringBefore(rule, '$');
    var uboModifiers = parseModifiers(rule);
    var adgModifiers = uboModifiers.map(function (el) {
      if (el.indexOf(ADG_UBO_REDIRECT_RESOURCE_MARKER) > -1) {
        var uboName = getRedirectName(rule, ADG_UBO_REDIRECT_RESOURCE_MARKER);
        var adgName = uboToAdgCompatibility["".concat(uboName)];
        return "".concat(ADG_UBO_REDIRECT_RESOURCE_MARKER).concat(adgName);
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
    var abpModifiers = parseModifiers(rule);
    var adgModifiers = abpModifiers.map(function (el) {
      if (el.indexOf(ABP_REDIRECT_RESOURCE_MARKER) > -1) {
        var abpName = getRedirectName(rule, ABP_REDIRECT_RESOURCE_MARKER);
        var adgName = abpToAdgCompatibility["".concat(abpName)];
        return "".concat(ADG_UBO_REDIRECT_RESOURCE_MARKER).concat(adgName);
      }
      return el;
    }).join(',');
    return "".concat(firstPartOfRule, "$").concat(adgModifiers);
  };
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
  var convertAdgRedirectToUbo = function convertAdgRedirectToUbo(rule) {
    if (!isValidRedirectRule(rule)) {
      throw new Error("Rule is not valid for converting to Ubo.\nSource type is not specified in the rule: ".concat(rule));
    } else {
      var firstPartOfRule = substringBefore(rule, '$');
      var uboModifiers = parseModifiers(rule);
      var adgModifiers = uboModifiers.map(function (el) {
        if (el.indexOf(ADG_UBO_REDIRECT_RESOURCE_MARKER) > -1) {
          var adgName = getRedirectName(rule, ADG_UBO_REDIRECT_RESOURCE_MARKER);
          var uboName = adgToUboCompatibility["".concat(adgName)];
          return "".concat(ADG_UBO_REDIRECT_RESOURCE_MARKER).concat(uboName);
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

  function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }
  function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }
  var getRedirectByName = function getRedirectByName(redirectsList, name) {
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
  var Redirects =
  function () {
    function Redirects(rawYaml) {
      classCallCheck(this, Redirects);
      try {
        var arrOfRedirects = jsYaml$1.safeLoad(rawYaml);
        this.redirects = arrOfRedirects.reduce(function (acc, redirect) {
          return _objectSpread({}, acc, defineProperty({}, redirect.title, redirect));
        }, {});
      } catch (e) {
        console.log("Was unable to load YAML into JS due to: ".concat(e.message));
        throw e;
      }
    }
    createClass(Redirects, [{
      key: "getRedirect",
      value: function getRedirect(title) {
        var _this = this;
        if (Object.prototype.hasOwnProperty.call(this.redirects, title)) {
          return this.redirects[title];
        }
        var values = Object.keys(this.redirects).map(function (key) {
          return _this.redirects[key];
        });
        return values.find(function (redirect) {
          var aliases = redirect.aliases;
          if (!aliases) {
            return false;
          }
          return aliases.indexOf(title) > -1;
        });
      }
    }]);
    return Redirects;
  }();

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

}());

/**
 * -------------------------------------------
 * |                                         |
 * |  If you want to add your own scriptlet  |
 * |  please put your code below             |
 * |                                         |
 * -------------------------------------------
 */
//# sourceMappingURL=scriptletsWrapper.js.map
