/* eslint-disable no-underscore-dangle, no-console */
import {
    runScriptlet,
    clearGlobalProps,
    saveStorageMethods,
    useThrowingErrorConstructor,
    useThrowingMethod,
    useUnreadableStackTrace,
} from '../helpers';

const { test, module } = QUnit;
const name = 'trusted-json-set';

const nativeStringify = JSON.stringify;
const nativeParse = JSON.parse;
const nativeString = String;
const nativeHasOwnProperty = Object.prototype.hasOwnProperty;
const nativeConsole = console.log;
const nativeResponseJson = Response.prototype.json;
const nativeResponseText = Response.prototype.text;
const nativeRequestJson = Request.prototype.json;
const nativeIsArray = Array.isArray;

// Scriptlets replace methods of storages in Storage.prototype
const restoreStorage = saveStorageMethods();

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
    JSON.stringify = nativeStringify;
    JSON.parse = nativeParse;
    window.String = nativeString;
    // eslint-disable-next-line no-extend-native
    Object.prototype.hasOwnProperty = nativeHasOwnProperty;
    console.log = nativeConsole;
    Response.prototype.json = nativeResponseJson;
    Response.prototype.text = nativeResponseText;
    Request.prototype.json = nativeRequestJson;
    Array.isArray = nativeIsArray;
    restoreStorage();
};

module(name, { beforeEach, afterEach });

test('sets a new deeply-nested path — JSON.stringify', (assert) => {
    runScriptlet(name, ['JSON.stringify', 'foo.qwerty.abc', 'true']);
    const result = JSON.stringify({ foo: { q: 1 }, bar: 2 });
    assert.deepEqual(
        nativeParse(result),
        { foo: { q: 1, qwerty: { abc: true } }, bar: 2 },
        'should create missing intermediate objects and set the value',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('modifies an existing path — JSON.stringify', (assert) => {
    runScriptlet(name, ['JSON.stringify', 'foo.bar', 'true']);
    const result = JSON.stringify({ foo: { bar: false, abc: 1 } });
    assert.deepEqual(
        nativeParse(result),
        { foo: { bar: true, abc: 1 } },
        'should overwrite the existing property value',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('sets a top-level property — JSON.stringify', (assert) => {
    runScriptlet(name, ['JSON.stringify', 'baz', '42']);
    const result = JSON.stringify({ foo: 1 });
    assert.deepEqual(
        nativeParse(result),
        { foo: 1, baz: 42 },
        'should add a top-level property',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('sets null value — JSON.stringify', (assert) => {
    runScriptlet(name, ['JSON.stringify', 'foo', 'null']);
    const result = JSON.stringify({ foo: 1, bar: 2 });
    assert.deepEqual(
        nativeParse(result),
        { foo: null, bar: 2 },
        'should set property to null',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('sets false value — JSON.stringify', (assert) => {
    runScriptlet(name, ['JSON.stringify', 'enabled', 'false']);
    const result = JSON.stringify({ enabled: true });
    assert.deepEqual(
        nativeParse(result),
        { enabled: false },
        'should set property to false',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('sets string value — JSON.stringify', (assert) => {
    runScriptlet(name, ['JSON.stringify', 'name', 'hello']);
    const result = JSON.stringify({ name: 'world' });
    assert.deepEqual(
        nativeParse(result),
        { name: 'hello' },
        'should set property to a string value',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('sets a new nested path — JSON.parse result', (assert) => {
    runScriptlet(name, ['JSON.parse', 'foo.qwerty.abc', 'true']);
    const result = JSON.parse('{"foo":{"q":1},"bar":2}');
    assert.deepEqual(
        result,
        { foo: { q: 1, qwerty: { abc: true } }, bar: 2 },
        'should create missing intermediate objects in the parsed result',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('sets a new nested path with empty string value — JSON.parse result', (assert) => {
    runScriptlet(name, ['JSON.parse', 'foo.qwerty.abc', '']);
    const result = JSON.parse('{"foo":{"q":1},"bar":2}');
    assert.deepEqual(
        result,
        { foo: { q: 1, qwerty: { abc: '' } }, bar: 2 },
        'should create missing intermediate objects in the parsed result',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('modifies an existing path — JSON.parse result', (assert) => {
    runScriptlet(name, ['JSON.parse', 'foo.bar', 'true']);
    const result = JSON.parse('{"foo":{"bar":false,"abc":1}}');
    assert.deepEqual(
        result,
        { foo: { bar: true, abc: 1 } },
        'should overwrite the existing property in the parsed result',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('modifies an existing path — JSON.parse result replace', (assert) => {
    runScriptlet(name, ['JSON.parse', 'foo.bar', 'replace:/advertisement/test/']);
    const result = JSON.parse('{"foo":{"bar":"advertisement","abc":1}}');
    assert.deepEqual(
        result,
        { foo: { bar: 'test', abc: 1 } },
        'should overwrite the existing property in the parsed result',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('modifies line-delimited JSON returned as a string', (assert) => {
    window.getJsonLinesPayload = () => [
        '{"ads":{"enabled":true},"id":1}',
        '{"ads":{"enabled":true},"id":2}',
        'plain-text',
    ].join('\r\n');

    runScriptlet(name, ['window.getJsonLinesPayload', 'ads.enabled', 'false']);

    const result = window.getJsonLinesPayload();

    assert.strictEqual(
        result,
        [
            '{"ads":{"enabled":false},"id":1}',
            '{"ads":{"enabled":false},"id":2}',
            'plain-text',
        ].join('\r\n'),
        'should modify each JSON line and preserve line separators',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');

    clearGlobalProps('getJsonLinesPayload');
});

test('sets value only when requiredInitialProps are present — JSON.stringify', (assert) => {
    runScriptlet(name, ['JSON.stringify', 'y', 'true', 'x']);
    assert.deepEqual(
        nativeParse(JSON.stringify({ x: 1, y: false })),
        { x: 1, y: true },
        'should set when required prop exists',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('does NOT set value when requiredInitialProps are absent — JSON.stringify', (assert) => {
    runScriptlet(name, ['JSON.stringify', 'y', 'true', 'z']);
    assert.deepEqual(
        nativeParse(JSON.stringify({ x: 1, y: false })),
        { x: 1, y: false },
        'should not set when required prop is missing',
    );
    assert.strictEqual(window.hit, undefined, 'hit function should not fire');
});

test('logs original result content when only methodPath is set', (assert) => {
    assert.expect(5);

    let logCount = 0;
    console.log = function log(...input) {
        const message = input[0];
        console.debug(...input);
        if (
            input.length === 1
            && typeof message === 'string'
            && message.includes('Original content string of JSON.parse')
        ) {
            logCount += 1;
            assert.notOk(message.includes('(propsPath:'), 'should omit empty props and value details');
            assert.ok(message.includes(window.location.hostname), 'should log hostname in console');
            assert.ok(message.includes('"a": 1'), 'should log the original JSON payload');
        }
    };

    runScriptlet(name, ['JSON.parse']);

    const result = JSON.parse('{"a":1}');

    assert.deepEqual(result, { a: 1 }, 'should leave the payload unchanged in log-only mode');
    assert.strictEqual(logCount, 1, 'should log the original payload once');
});

test('logs original result content only when it matches requiredInitialProps in log-only mode', (assert) => {
    assert.expect(5);

    let logCount = 0;
    console.log = function log(...input) {
        console.debug(...input);
        const message = input[0];
        if (
            input.length === 1
            && typeof message === 'string'
            && message.includes('Original content string of JSON.parse')
        ) {
            logCount += 1;
            assert.ok(message.includes('(requiredInitialProps: "a":1)'), 'should log requiredInitialProps details');
            assert.ok(message.includes(window.location.hostname), 'should log hostname for matching payloads');
            assert.ok(message.includes('"a": 1'), 'should log only the matching JSON payload');
            assert.notOk(message.includes('"b": 2'), 'should not log non-matching payloads');
        }
    };

    runScriptlet(name, ['JSON.parse', '', '', '"a":1']);

    JSON.parse('{"a":1}');
    JSON.parse('{"b":2}');

    assert.strictEqual(logCount, 1, 'should not log payloads that do not match the filter');
});

test('logs original result content only when it matches stack trace in log-only mode', (assert) => {
    assert.expect(6);

    let logCount = 0;
    console.log = function log(...input) {
        console.debug(...input);
        const message = input[0];
        if (
            input.length === 1
            && typeof message === 'string'
            && message.includes('Original content string of JSON.parse')
        ) {
            logCount += 1;
            assert.ok(message.includes(window.location.hostname), 'should log hostname for matching payloads');
            assert.ok(message.includes('"a": 1'), 'should log only the matching JSON payload');
            assert.notOk(message.includes('"b": 2'), 'should not log non-matching payloads');
        }
    };

    runScriptlet(name, ['JSON.parse', '', '', '', 'result', 'callStackMatch']);

    const callStackMatch = () => JSON.parse('{"a":1}');
    const callStackNoMatch = () => JSON.parse('{"b":2}');

    assert.deepEqual(callStackMatch(), { a: 1 }, 'should return the correct result for matching stack');
    assert.deepEqual(callStackNoMatch(), { b: 2 }, 'should return the correct result for non-matching stack');
    assert.strictEqual(logCount, 1, 'should not log payloads that do not match the filter');
});

test('logs original result content only when it matches requiredInitialProps and stack in log-only mode', (assert) => {
    assert.expect(10);

    let logCount = 0;
    console.log = function log(...input) {
        console.debug(...input);
        const message = input[0];
        if (
            input.length === 1
            && typeof message === 'string'
            && message.includes('Original content string of JSON.parse')
        ) {
            logCount += 1;
            assert.ok(message.includes('(requiredInitialProps: $.a)'), 'should log requiredInitialProps details');
            assert.ok(message.includes(window.location.hostname), 'should log hostname for matching payloads');
            assert.ok(message.includes('"a": 1'), 'should log only the matching JSON payload');
            assert.notOk(message.includes('"a": 3'), 'should not log non-matching payloads');
            assert.notOk(message.includes('"b": 2'), 'should not log non-matching payloads');
        }
    };

    runScriptlet(name, ['JSON.parse', '', '', '$.a', 'result', 'callStackMatch']);

    const callStackMatchOne = () => JSON.parse('{"a":1}');
    const callStackMatchTwo = () => JSON.parse('{"b":2}');
    const callStackNoMatchOne = () => JSON.parse('{"c":3}');
    const callStackNoMatchTwo = () => JSON.parse('{"a":3}');

    assert.deepEqual(callStackMatchOne(), { a: 1 }, 'should return the correct result for matching stack');
    assert.deepEqual(callStackMatchTwo(), { b: 2 }, 'should return the correct result for matching stack');
    assert.deepEqual(callStackNoMatchOne(), { c: 3 }, 'should return the correct result for non-matching stack');
    assert.deepEqual(callStackNoMatchTwo(), { a: 3 }, 'should return the correct result for non-matching stack');
    assert.strictEqual(logCount, 1, 'should not log payloads that do not match the filter');
});

test('logs original result content only when requiredInitialProps JSONPath matches in log-only mode', (assert) => {
    assert.expect(4);

    let logCount = 0;
    console.log = function log(...input) {
        console.debug(...input);
        const message = input[0];
        if (
            input.length === 1
            && typeof message === 'string'
            && message.includes('Original content string of JSON.parse')
        ) {
            logCount += 1;
            assert.ok(
                message.includes('(requiredInitialProps: $.tracking.enabled)'),
                'should log requiredInitialProps JSONPath details',
            );
            assert.ok(message.includes(window.location.hostname), 'should log hostname for JSONPath matches');
            assert.ok(message.includes('"enabled": true'), 'should log only the matching JSONPath payload');
        }
    };

    runScriptlet(name, ['JSON.parse', '', '', '$.tracking.enabled']);

    JSON.parse('{"tracking":{"enabled":true},"meta":{"v":1}}');
    JSON.parse('{"meta":{"v":1}}');

    assert.strictEqual(logCount, 1, 'should not log payloads that do not match the JSONPath filter');
});

test('sets value only when stack matches — JSON.stringify', (assert) => {
    const callStringify = () => JSON.stringify({ flag: false });
    runScriptlet(name, ['JSON.stringify', 'flag', 'true', '', 'result', 'callStringify']);
    assert.deepEqual(
        nativeParse(callStringify()),
        { flag: true },
        'should set value when stack matches',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('does NOT set value when stack does NOT match — JSON.stringify', (assert) => {
    runScriptlet(name, ['JSON.stringify', 'flag', 'true', '', 'result', 'noMatchFunction']);
    assert.deepEqual(
        nativeParse(JSON.stringify({ flag: false })),
        { flag: false },
        'should not set value when stack does not match',
    );
    assert.strictEqual(window.hit, undefined, 'hit function should not fire');
});

test('sets value on all wildcard-matched children — JSON.stringify', (assert) => {
    runScriptlet(name, ['JSON.stringify', 'foo.bar.*.test', 'false']);
    const input = {
        foo: {
            bar: {
                a: { test: true },
                b: { test: true },
            },
        },
    };
    const result = nativeParse(JSON.stringify(input));
    assert.deepEqual(
        result,
        { foo: { bar: { a: { test: false }, b: { test: false } } } },
        'should set test to false on every child of foo.bar.*',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('sets value only on wildcard children matching value filter — JSON.stringify', (assert) => {
    runScriptlet(name, ['JSON.stringify', 'foo.bar.*.test.[=].true', 'false']);
    const input = {
        foo: {
            bar: {
                a: { test: 1 },
                b: { test: true },
                c: { test: 2 },
            },
        },
        abc: 1,
    };
    const result = nativeParse(JSON.stringify(input));
    assert.deepEqual(
        result,
        {
            foo: {
                bar: {
                    a: { test: 1 },
                    b: { test: false },
                    c: { test: 2 },
                },
            },
            abc: 1,
        },
        'should only change the child whose test value was true',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('does NOT set value when value filter has no matches — JSON.stringify', (assert) => {
    runScriptlet(name, ['JSON.stringify', 'foo.bar.[=].99', 'true']);
    const input = { foo: { bar: 1 } };
    const result = nativeParse(JSON.stringify(input));
    assert.deepEqual(result, { foo: { bar: 1 } }, 'should leave object unchanged');
    assert.strictEqual(window.hit, undefined, 'hit function should not fire');
});

test('sets value on array wildcard children — JSON.stringify', (assert) => {
    runScriptlet(name, ['JSON.stringify', 'items.[].enabled', 'false']);
    const input = {
        items: [
            { enabled: true, id: 1 },
            { enabled: true, id: 2 },
        ],
    };
    const result = nativeParse(JSON.stringify(input));
    assert.deepEqual(
        result,
        { items: [{ enabled: false, id: 1 }, { enabled: false, id: 2 }] },
        'should set enabled=false on every array element',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('supports explicit jsonpath mode — JSON.parse result', (assert) => {
    runScriptlet(name, ['JSON.parse', '$..*[?(@==8.99)]', '10', '', 'result', '', 'jsonpath']);

    const result = JSON.parse(`
        {
            "store": {
                "book": [
                    { "title": "One", "price": 8.99 },
                    { "title": "Two", "price": 12.99 }
                ],
                "bicycle": { "price": 8.99, "color": "red" },
                "food": { "fast": { "pizza": 8.99, "hotDog": 2.66 } }
            }
        }
    `);

    assert.deepEqual(result, {
        store: {
            book: [
                { title: 'One', price: 10 },
                { title: 'Two', price: 12.99 },
            ],
            bicycle: { color: 'red', price: 10 },
            food: { fast: { pizza: 10, hotDog: 2.66 } },
        },
    }, 'should update every value matched through jsonpath mode');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('supports inline JSONPath mutation expressions without argumentValue — JSON.parse result', (assert) => {
    const args = ['JSON.parse', '$..*[?(@.price==8.99)].price=10', '', '', 'result', '', 'jsonpath'];
    runScriptlet(name, args);

    const result = JSON.parse(`
        {
            "items": [
                { "id": 1, "price": 8.99 },
                { "id": 2, "price": 12.99 }
            ],
            "basket": { "price": 8.99, "color": "red" }
        }
    `);

    assert.deepEqual(result, {
        items: [
            { id: 1, price: 10 },
            { id: 2, price: 12.99 },
        ],
        basket: { price: 10, color: 'red' },
    }, 'should update every value matched through jsonpath mode');

    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('supports root append JSONPath mutation expressions without argumentValue — JSON.parse result', (assert) => {
    runScriptlet(name, ['JSON.parse', '$.+={"ads":"false"}', '', '', 'result', '', 'jsonpath']);

    const result = JSON.parse('{}');

    assert.deepEqual(result, {
        ads: 'false',
    }, 'should append properties to the root object');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('auto-detects inline JSONPath mutation expressions without argumentValue — JSON.parse result', (assert) => {
    runScriptlet(name, ['JSON.parse', '$..*[?(@.price==8.99)].price=10', '']);

    const result = JSON.parse(`
        {
            "items": [
                { "id": 1, "price": 8.99 },
                { "id": 2, "price": 12.99 }
            ],
            "basket": { "price": 8.99, "color": "red" }
        }
    `);

    assert.deepEqual(result, {
        items: [
            { id: 1, price: 10 },
            { id: 2, price: 12.99 },
        ],
        basket: { price: 10, color: 'red' },
    }, 'should update every value matched through jsonpath mode');

    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('removes matched properties when argumentValue is $remove$ in JSONPath mode', (assert) => {
    runScriptlet(name, ['JSON.parse', '$.ads', '$remove$']);

    const result = JSON.parse('{"ads":{"enabled":true,"type":"banner"},"content":"article"}');

    assert.deepEqual(result, {
        content: 'article',
    }, 'should remove matched properties instead of setting them');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('Sets ads to false when argumentValue is $remove$ and there is value to set in JSONPath expression', (assert) => {
    runScriptlet(name, ['JSON.parse', '$.ads=false', '$remove$']);

    const result = JSON.parse('{"ads":true,"content":"article"}');

    assert.deepEqual(result, {
        ads: false,
        content: 'article',
    }, 'should set ads to false when argumentValue is $remove$ and there is value to set in JSONPath expression');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('supports JSONPath syntax with stack match — JSON.parse result', (assert) => {
    runScriptlet(name, ['JSON.parse', '$..*[?(@==8.99)]', '10', '', 'result', 'jsonPathSetStack', 'jsonpath']);

    const jsonPathSetStack = () => JSON.parse('{"price":8.99,"nested":{"price":8.99},"other":1}');

    assert.deepEqual(jsonPathSetStack(), {
        price: 10,
        nested: { price: 10 },
        other: 1,
    }, 'should set values when jsonpath mode stack matches');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('Sets price of first item to empty string', (assert) => {
    runScriptlet(name, ['JSON.parse', '$.items[0].price', '']);

    const result = JSON.parse(`
        {
            "items": [
                { "id": 1, "price": 8.99 },
                { "id": 2, "price": 12.99 }
            ],
            "basket": { "price": 8.99, "color": "red" }
        }
    `);

    assert.deepEqual(result, {
        items: [
            { id: 1, price: '' },
            { id: 2, price: 12.99 },
        ],
        basket: { price: 8.99, color: 'red' },
    }, 'should update every value matched through jsonpath mode');

    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('supports inline JSONPath mutation expressions with stack match — JSON.parse result', (assert) => {
    runScriptlet(
        name,
        ['JSON.parse', '$..*[?(@.price==8.99)].price=10', '', '', 'result', 'jsonPathInlineSetStack', 'jsonpath'],
    );

    const jsonPathInlineSetStack = () => JSON.parse('{"items":[{"id":1,"price":8.99}],"basket":{"price":8.99}}');

    const result = jsonPathInlineSetStack();

    assert.deepEqual(result, {
        items: [
            { id: 1, price: 10 },
        ],
        basket: { price: 10 },
    }, 'should update the matching values when stack matches');

    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('supports inline JSONPath guards with inline mutation expressions — JSON.parse result', (assert) => {
    runScriptlet(
        name,
        ['JSON.parse', '[?(@.meta.ready)]$..*[?(@.price==8.99)].price=10', '', '', 'result', '', 'jsonpath'],
    );

    const matchingResult = JSON.parse('{"meta":{"ready":true},"price":8.99,"nested":{"price":8.99}}');
    const nonMatchingResult = JSON.parse('{"meta":{},"price":8.99,"nested":{"price":8.99}}');

    assert.deepEqual(matchingResult, {
        meta: { ready: true },
        price: 8.99,
        nested: { price: 10 },
    }, 'should apply the inline mutation when the leading guard matches');
    assert.deepEqual(nonMatchingResult, {
        meta: {},
        price: 8.99,
        nested: { price: 8.99 },
    }, 'should skip the inline mutation when the leading guard does not match');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired for the matching payload');
});

test('supports inline JSONPath guards with inline mutation expressions on price fields', (assert) => {
    runScriptlet(
        name,
        ['JSON.parse', '[?(@.meta.ready)]$..price[?(@==8.99)]=10', '', '', 'result', '', 'jsonpath'],
    );

    const matchingResult = JSON.parse('{"meta":{"ready":true},"price":8.99,"nested":{"price":8.99}}');
    const nonMatchingResult = JSON.parse('{"meta":{},"price":8.99,"nested":{"price":8.99}}');

    assert.deepEqual(matchingResult, {
        meta: { ready: true },
        price: 10,
        nested: { price: 10 },
    }, 'should apply the inline mutation when the leading guard matches');
    assert.deepEqual(nonMatchingResult, {
        meta: {},
        price: 8.99,
        nested: { price: 8.99 },
    }, 'should skip the inline mutation when the leading guard does not match');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired for the matching payload');
});

test('does not set values with JSONPath syntax when stack does not match — JSON.parse result', (assert) => {
    runScriptlet(
        name,
        ['JSON.parse', '$..*[?(@==8.99)]', '10', '', 'result', 'missingJsonPathSetStack', 'jsonpath'],
    );

    const jsonPathSetNoStackMatch = () => JSON.parse('{"price":8.99,"nested":{"price":8.99},"other":1}');

    assert.deepEqual(jsonPathSetNoStackMatch(), {
        price: 8.99,
        nested: { price: 8.99 },
        other: 1,
    }, 'should leave values unchanged when jsonpath mode stack does not match');
    assert.strictEqual(window.hit, undefined, 'hit function should not fire');
});

test('auto-detects jsonpath syntax — JSON.parse result', (assert) => {
    runScriptlet(name, ['JSON.parse', '$..*[?(@==8.99)]', '10']);

    const result = JSON.parse('{"price":8.99,"nested":{"price":8.99},"other":1}');

    assert.deepEqual(result, {
        price: 10,
        nested: { price: 10 },
        other: 1,
    }, 'should choose jsonpath mode automatically when selector starts with `$`');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('supports JSONPath guards instead of requiredInitialProps — JSON.parse result', (assert) => {
    runScriptlet(
        name,
        ['JSON.parse', '[?(@.meta.ready)]$..*[?(@==8.99)]', '10', '', 'result', '', 'jsonpath'],
    );

    const matchingResult = JSON.parse('{"meta":{"ready":true},"price":8.99,"nested":{"price":8.99}}');
    const nonMatchingResult = JSON.parse('{"meta":{},"price":8.99,"nested":{"price":8.99}}');

    assert.deepEqual(matchingResult, {
        meta: { ready: true },
        price: 10,
        nested: { price: 10 },
    }, 'should set values when the leading guard matches');
    assert.deepEqual(nonMatchingResult, {
        meta: {},
        price: 8.99,
        nested: { price: 8.99 },
    }, 'should leave values unchanged when the leading guard does not match');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired for the matching payload');
});

test('should log message when input looks like JSON but is not valid JSON', (assert) => {
    assert.expect(2);

    // Message of the scriptlet, not of the JSON.parse error, as the latter differs between browsers,
    // e.g. 'is not valid JSON' is in Chrome only
    const message = 'Error parsing JSON string';
    // mock console.log function for log checking
    console.log = function log(input) {
        if (input.includes('trace')) {
            return;
        }
        console.debug(input);
        assert.ok(input.includes(message), 'should log message in console');
    };

    runScriptlet(name, ['String', '$.ads.enabled', '$remove$', '', 'result', '', 'jsonpath']);

    const input = '{plain-text\r\nplain-text';
    const result = String(input);

    assert.deepEqual(result, input, 'should leave values unchanged when input is not valid JSON');
});

test('should not log a string without an object or an array, which is not JSON', (assert) => {
    const logs = [];
    console.log = function log(input) {
        if (!input.includes('trace')) {
            logs.push(input);
        }
    };

    runScriptlet(name, ['String', '$.ads.enabled', '$remove$', '', 'result', '', 'jsonpath', 'true']);

    const input = 'plain-text\r\nplain-text\r\nplain-text';
    const result = String(input);

    assert.deepEqual(result, input, 'should leave values unchanged');
    assert.deepEqual(logs, [], 'should log nothing');
});

test('should remove "ads" properties when using JSONPath syntax — String input', (assert) => {
    runScriptlet(name, ['String', '$..ads', '$remove$', '', 'result', '', 'jsonpath']);

    const input = '{"ads":true}\r\n{"content":{"ads":"enabled","article":"test"}}\r\nplain-text';

    const expectedResult = '{}\r\n{"content":{"article":"test"}}\r\nplain-text';

    const result = String(input);

    assert.deepEqual(result, expectedResult, 'should remove "ads" properties');
});

test('supports explicit legacy mode — JSON.parse result', (assert) => {
    runScriptlet(name, ['JSON.parse', 'foo.bar', 'true', '', 'result', '', 'legacy']);

    const result = JSON.parse('{"foo":{"bar":false,"abc":1}}');

    assert.deepEqual(
        result,
        { foo: { abc: 1, bar: true } },
        'should keep legacy parsing when mode is forced explicitly',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('modifies thisArg when jsonSource is this', (assert) => {
    window.contextHolder = {
        state: {
            enabled: true,
            version: 1,
        },
        readState() {
            return this.state;
        },
    };

    runScriptlet(name, ['window.contextHolder.readState', 'state.enabled', 'false', '', 'this']);

    const result = window.contextHolder.readState();
    assert.deepEqual(
        result,
        { enabled: false, version: 1 },
        'should modify the method thisArg before invocation',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');

    clearGlobalProps('contextHolder');
});

test('does not abort thisArg mutation when debug logging cannot clone function-valued properties', (assert) => {
    window.nonCloneableContextHolder = {
        state: {
            enabled: true,
            version: 2,
        },
        readState() {
            return this.state;
        },
        helper() {
            return 'helper';
        },
    };

    runScriptlet(name, ['window.nonCloneableContextHolder.readState', 'state.enabled', 'false', '', 'this']);

    const result = window.nonCloneableContextHolder.readState();

    assert.deepEqual(result, { enabled: false, version: 2 }, 'should still mutate thisArg state');
    assert.strictEqual(
        window.nonCloneableContextHolder.helper(),
        'helper',
        'should preserve function-valued properties on the original object',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');

    clearGlobalProps('nonCloneableContextHolder');
});

test('does not abort result mutation when debug logging cannot clone function-valued properties', (assert) => {
    window.getNonCloneablePayload = () => ({
        ads: {
            enabled: true,
        },
        helper() {
            return 'helper';
        },
    });

    runScriptlet(name, ['window.getNonCloneablePayload', 'ads.enabled', 'false']);

    const result = window.getNonCloneablePayload();

    assert.strictEqual(result.ads.enabled, false, 'should still mutate the result payload');
    assert.strictEqual(result.helper(), 'helper', 'should preserve function-valued properties on the result');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');

    clearGlobalProps('getNonCloneablePayload');
});

test('checks if structuredClone logging works correctly', (assert) => {
    assert.expect(6);

    const originalContentMessage = 'Original content object of';
    const modifiedContentMessage = 'Modified content object of';
    const originalObject = JSON.parse('{"ads":{"enabled":true,"type":"banner"},"content":"article"}');
    let originalObjectFromLog;

    // mock console.log function for log checking
    console.log = function log(...input) {
        console.debug(...input);
        if (input.some((msg) => msg?.includes?.(originalContentMessage))) {
            assert.ok(input.some((msg) => msg?.includes?.(originalContentMessage)), 'should log message in console');
            // input[2] is the original content object passed to the console.log
            assert.deepEqual(input[2], originalObject, 'should log the original content object');
            // eslint-disable-next-line prefer-destructuring
            originalObjectFromLog = input[2];
        }

        if (input.some((msg) => msg?.includes?.(modifiedContentMessage))) {
            assert.ok(input.some((msg) => msg?.includes?.(modifiedContentMessage)), 'should log message in console');
        }
    };

    runScriptlet(name, ['JSON.parse', '$.ads', '$remove$', '', '', '', '', 'true']);

    const result = JSON.parse('{"ads":{"enabled":true,"type":"banner"},"content":"article"}');

    assert.deepEqual(result, {
        content: 'article',
    }, 'should remove matched properties instead of setting them');
    // Check that the original content object logged is the same as the one we expect
    assert.deepEqual(originalObjectFromLog, originalObject, 'should log the original content object');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('marks verbose modified logs as changed when a mutation happens', (assert) => {
    assert.expect(4);

    let changedLogCount = 0;
    console.log = function log(...input) {
        console.debug(...input);
        if (input.some((msg) => msg?.includes?.('Modified content object of JSON.parse'))) {
            changedLogCount += 1;
            assert.ok(
                input.some((msg) => msg?.includes?.('(propsPath: ads.enabled, argumentValue: false)')),
                'should include propsPath and argumentValue details for mutation logs',
            );
            assert.ok(true, 'should log changed status for modified object output');
        }
    };

    runScriptlet(name, ['JSON.parse', 'ads.enabled', 'false', '', 'result', '', '', 'true']);

    const result = JSON.parse('{"ads":{"enabled":true}}');

    assert.deepEqual(result, { ads: { enabled: false } }, 'should modify the payload');
    assert.strictEqual(changedLogCount, 1, 'should log one modified object entry for changed content');
});

test('logs only original content when verbose mode does not modify an object payload', (assert) => {
    assert.expect(4);

    let originalLogCount = 0;
    let modifiedLogCount = 0;
    console.log = function log(...input) {
        console.debug(...input);
        if (input.some((msg) => msg?.includes?.('Original content object of JSON.parse'))) {
            originalLogCount += 1;
        }

        if (input.some((msg) => msg?.includes?.('Modified content object of JSON.parse'))) {
            modifiedLogCount += 1;
        }
    };

    runScriptlet(name, ['JSON.parse', 'ads.enabled.[=].false', 'true', '', 'result', '', '', 'true']);

    const result = JSON.parse('{"ads":{"enabled":true}}');

    assert.deepEqual(result, { ads: { enabled: true } }, 'should leave the payload unchanged');
    assert.strictEqual(window.hit, undefined, 'hit function should not fire when nothing changes');
    assert.strictEqual(originalLogCount, 0, 'should not log original object output');
    assert.strictEqual(modifiedLogCount, 0, 'should not log modified object output');
});

test('logs only original content when verbose mode does not modify line-delimited JSON', (assert) => {
    assert.expect(3);

    let originalLogCount = 0;
    let modifiedLogCount = 0;

    window.getUnchangedJsonLinesPayload = () => [
        '{"ads":{"enabled":true},"id":1}',
        '{"ads":{"enabled":true},"id":2}',
    ].join('\r\n');

    console.log = function log(...input) {
        console.debug(...input);
        const message = input[0];

        if (
            input.length === 1
            && typeof message === 'string'
            && message.includes('Original content string of window.getUnchangedJsonLinesPayload')
        ) {
            originalLogCount += 1;
        }

        if (
            input.length === 1
            && typeof message === 'string'
            && message.includes('Modified content string of window.getUnchangedJsonLinesPayload')
        ) {
            modifiedLogCount += 1;
        }
    };

    runScriptlet(
        name,
        ['window.getUnchangedJsonLinesPayload', 'ads.enabled.[=].false', 'true', '', 'result', '', '', 'true'],
    );

    const result = window.getUnchangedJsonLinesPayload();

    assert.strictEqual(
        result,
        [
            '{"ads":{"enabled":true},"id":1}',
            '{"ads":{"enabled":true},"id":2}',
        ].join('\r\n'),
        'should leave line-delimited JSON unchanged',
    );
    assert.strictEqual(originalLogCount, 0, 'should not log original string output');
    assert.strictEqual(modifiedLogCount, 0, 'should not log modified string output');

    clearGlobalProps('getUnchangedJsonLinesPayload');
});

test('modifies all JSON sources when jsonSource is all', (assert) => {
    window.applyAllSources = function applyAllSources(payload) {
        return {
            payload,
            foo: { enabled: true },
        };
    };

    const context = {
        foo: {
            enabled: true,
        },
    };

    runScriptlet(name, ['window.applyAllSources', 'foo.enabled', 'false', '', 'all']);

    const arg = { foo: { enabled: true } };
    const output = window.applyAllSources.call(context, arg);

    assert.deepEqual(arg, { foo: { enabled: false } }, 'argument should be modified');
    assert.deepEqual(context.foo, { enabled: false }, 'thisArg should be modified');
    assert.deepEqual(output.foo, { enabled: false }, 'result should be modified');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');

    clearGlobalProps('applyAllSources');
});

test('sets emptyObj constant', (assert) => {
    runScriptlet(name, ['JSON.parse', 'settings', 'emptyObj']);
    const result = JSON.parse('{"settings":{"enabled":true},"x":1}');
    assert.deepEqual(result, { settings: {}, x: 1 }, 'should set empty object value');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('sets trueFunc constant', (assert) => {
    runScriptlet(name, ['JSON.parse', 'handler', 'trueFunc']);
    const result = JSON.parse('{"handler":"old","x":1}');
    assert.strictEqual(typeof result.handler, 'function', 'handler should become a function');
    assert.strictEqual(result.handler(), true, 'trueFunc should return true');
    assert.strictEqual(result.x, 1, 'other properties stay intact');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('replaces part of a string value', (assert) => {
    runScriptlet(name, ['JSON.parse', 'content', 'replace:/advertisement/article/']);
    const result = JSON.parse('{"content":"The advertisement block"}');
    assert.deepEqual(result, { content: 'The article block' }, 'should replace substring in string value');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('merges parsed json value into an existing object', (assert) => {
    runScriptlet(name, ['JSON.parse', 'foo', 'json:{"a":{"test":1},"b":{"c":1}}']);
    const result = JSON.parse('{"foo":{"bar":1},"x":1}');
    assert.deepEqual(
        result,
        {
            foo: {
                bar: 1,
                a: { test: 1 },
                b: { c: 1 },
            },
            x: 1,
        },
        'should merge parsed json object into existing target object',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('does not replace non-string values with replace syntax', (assert) => {
    runScriptlet(name, ['JSON.parse', 'content', 'replace:/1/2/']);
    const result = JSON.parse('{"content":123,"other":1}');
    assert.deepEqual(result, { content: 123, other: 1 }, 'non-string values should stay unchanged');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('invalid replace regex does not install wrapper', (assert) => {
    runScriptlet(name, ['JSON.parse', 'content', 'replace:/(/bar/']);
    const result = JSON.parse('{"content":"value"}');
    assert.deepEqual(result, { content: 'value' }, 'content should stay unchanged');
    assert.strictEqual(window.hit, undefined, 'hit function should not fire');
});

test('supports stacked trusted-json-set wrappers on the same method', (assert) => {
    window.getPayload = () => ({ bar: 1 });

    runScriptlet(name, ['window.getPayload', 'foo.ads', 'false']);
    runScriptlet(name, ['window.getPayload', 'foo.enabled', 'true']);

    const result = window.getPayload();
    assert.deepEqual(
        result,
        {
            bar: 1,
            foo: {
                ads: false,
                enabled: true,
            },
        },
        'both wrappers should apply their modifications',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');

    clearGlobalProps('getPayload');
});

test('modifies only the selected second argument with arg:1', (assert) => {
    window.getSecondArg = (firstArg, secondArg) => secondArg;

    runScriptlet(name, ['window.getSecondArg', 'enabled', 'false', '', 'arg:1']);

    const firstArg = { enabled: true, untouched: 1 };
    const secondArg = { enabled: true, touched: 1 };
    const result = window.getSecondArg(firstArg, secondArg);

    assert.deepEqual(firstArg, { enabled: true, untouched: 1 }, 'first argument should stay unchanged');
    assert.deepEqual(result, { enabled: false, touched: 1 }, 'second argument should be modified');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');

    clearGlobalProps('getSecondArg');
});

test('modifies selected arguments with arg:0|1', (assert) => {
    window.mergeArgs = (firstArg, secondArg) => ({
        firstArg,
        secondArg,
    });

    runScriptlet(name, ['window.mergeArgs', 'ads.enabled', 'false', '', 'arg:0|1']);

    const firstArg = { ads: { enabled: true } };
    const secondArg = { ads: { enabled: true } };
    const result = window.mergeArgs(firstArg, secondArg);

    assert.deepEqual(result, {
        firstArg: { ads: { enabled: false } },
        secondArg: { ads: { enabled: false } },
    }, 'both selected arguments should be modified');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');

    clearGlobalProps('mergeArgs');
});

test('modifies selected arguments with arg:0|2', (assert) => {
    window.mergeArgs = (firstArg, secondArg, thirdArg) => ({
        firstArg,
        secondArg,
        thirdArg,
    });

    runScriptlet(name, ['window.mergeArgs', 'ads.enabled', 'false', '', 'arg:0|2']);

    const firstArg = { ads: { enabled: true } };
    const secondArg = { ads: { enabled: true } };
    const thirdArg = { ads: { enabled: true } };
    const result = window.mergeArgs(firstArg, secondArg, thirdArg);

    assert.deepEqual(result, {
        firstArg: { ads: { enabled: false } },
        secondArg: { ads: { enabled: true } },
        thirdArg: { ads: { enabled: false } },
    }, 'only the first and third arguments should be modified');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');

    clearGlobalProps('mergeArgs');
});

test('creates missing nested path in JSON.parse result after earlier parse error', (assert) => {
    runScriptlet(name, ['JSON.parse', 'zxc.qwerty.abc', 'true']);
    try {
        JSON.parse();
    } catch (error) {
        console.error('Error during JSON.parse:', error);
    }
    const result = JSON.parse('{"zxc":{"q":1},"bar":2}');
    assert.deepEqual(
        result,
        { zxc: { q: 1, qwerty: { abc: true } }, bar: 2 },
        'should create missing intermediate objects in the parsed result',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('modifies thisArg when jsonSource is this and uses property used inside scriptlet', (assert) => {
    runScriptlet(name, ['Object.prototype.hasOwnProperty', '$.*.foo.bar', '$remove$', '', 'this']);

    const obj = {
        test: {
            foo: {
                bar: 1,
                baz: 1,
            },
        },
        qwerty: 1,
    };

    // To test if "Maximum call stack size exceeded" error is avoided
    // when the scriptlet uses a property that is also used inside the scriptlet code
    Object.prototype.hasOwnProperty.call(window, 'whatever');

    // eslint-disable-next-line no-prototype-builtins
    const result = obj.hasOwnProperty('test');
    assert.strictEqual(result, true, 'should check if the object has the property');
    assert.deepEqual(obj, {
        test: {
            foo: {
                baz: 1,
            },
        },
        qwerty: 1,
    }, 'should modify the thisArg object by removing the specified property');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

// https://github.com/AdguardTeam/Scriptlets/issues/573
test('sets $now$ keyword value — JSON.stringify', (assert) => {
    runScriptlet(name, ['JSON.stringify', 'foo.firstTime', '$now$']);
    const result = nativeParse(JSON.stringify({ foo: { bar: 1 } }));

    // Some time will pass between calling scriptlet
    // and qunit running assertion
    const tolerance = 125;
    assert.strictEqual(result.foo.bar, 1, 'other properties have not been modified');
    assert.strictEqual(typeof result.foo.firstTime, 'number', 'keyword has been set as a number');
    assert.ok(Date.now() - result.foo.firstTime < tolerance, 'keyword has been replaced with current time');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('sets keyword as a part of the string value — JSON.stringify', (assert) => {
    runScriptlet(name, ['JSON.stringify', 'foo.consent', 'accepted at $now$']);
    const result = nativeParse(JSON.stringify({ foo: { bar: 1 } }));

    assert.ok(/^accepted at \d+$/.test(result.foo.consent), 'keyword has been replaced inside the value');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('sets multiple keywords inside json: value — JSON.stringify', (assert) => {
    runScriptlet(name, [
        'JSON.stringify',
        'foo',
        'json:{"count":1,"firstTime":$now$,"lastTime":$now$,"date":"$currentISODate$"}',
    ]);
    const result = nativeParse(JSON.stringify({ foo: { bar: 1 } }));

    const tolerance = 125;
    assert.strictEqual(result.foo.bar, 1, 'json value has been merged into the current one');
    assert.strictEqual(result.foo.count, 1, 'other properties of the json value have not been modified');
    assert.strictEqual(result.foo.firstTime, result.foo.lastTime, 'same keywords have got the same time');
    assert.strictEqual(
        new Date(result.foo.date).getTime(),
        result.foo.firstTime,
        'different keywords have got the same time',
    );
    assert.ok(Date.now() - result.foo.firstTime < tolerance, 'keywords have been replaced with current time');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('does not modify keyword-like value — JSON.stringify', (assert) => {
    runScriptlet(name, ['JSON.stringify', 'foo.bar', '$now']);
    const result = nativeParse(JSON.stringify({ foo: { bar: 1 } }));

    assert.strictEqual(result.foo.bar, '$now', 'value has not been modified');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

// https://github.com/AdguardTeam/Scriptlets/issues/585
const ADS_JSON = '{"ads":{"enabled":true},"content":"article"}';

test('modifies value of the promise returned by Response.prototype.json', async (assert) => {
    runScriptlet(name, ['Response.prototype.json', 'ads.enabled', 'false']);

    const promise = new Response(ADS_JSON).json();

    assert.ok(promise instanceof Promise, 'should return a promise');
    assert.notOk(Object.prototype.hasOwnProperty.call(promise, 'ads'), 'should not modify the promise itself');
    assert.deepEqual(
        await promise,
        { ads: { enabled: false }, content: 'article' },
        'should modify the value the promise is fulfilled with',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('modifies value of the promise returned by Response.prototype.json — JSONPath', async (assert) => {
    runScriptlet(name, ['Response.prototype.json', '$.ads.enabled', 'false']);

    const promise = new Response(ADS_JSON).json();

    assert.notOk(Object.prototype.hasOwnProperty.call(promise, 'ads'), 'should not modify the promise itself');
    assert.deepEqual(
        await promise,
        { ads: { enabled: false }, content: 'article' },
        'should modify the value the promise is fulfilled with',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('modifies value of the promise returned by Request.prototype.json', async (assert) => {
    runScriptlet(name, ['Request.prototype.json', 'ads.enabled', 'false']);

    const request = new Request('https://example.org/', { method: 'POST', body: ADS_JSON });
    const promise = request.json();

    assert.notOk(Object.prototype.hasOwnProperty.call(promise, 'ads'), 'should not modify the promise itself');
    assert.deepEqual(
        await promise,
        { ads: { enabled: false }, content: 'article' },
        'should modify the value the promise is fulfilled with',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('modifies values of Request.prototype.json and Response.prototype.json promises together', async (assert) => {
    runScriptlet(name, ['Request.prototype.json', 'ads.enabled', 'false']);
    runScriptlet(name, ['Response.prototype.json', 'ads.visible', 'false']);

    const request = new Request('https://example.org/', { method: 'POST', body: ADS_JSON });
    const requestPromise = request.json();
    const responsePromise = new Response(ADS_JSON).json();

    assert.notOk(
        Object.prototype.hasOwnProperty.call(requestPromise, 'ads'),
        'should not modify the promise of Request.prototype.json itself',
    );
    assert.notOk(
        Object.prototype.hasOwnProperty.call(responsePromise, 'ads'),
        'should not modify the promise of Response.prototype.json itself',
    );
    assert.deepEqual(
        await requestPromise,
        { ads: { enabled: false }, content: 'article' },
        'should modify the value of Request.prototype.json by its rule only',
    );
    assert.deepEqual(
        await responsePromise,
        { ads: { enabled: true, visible: false }, content: 'article' },
        'should modify the value of Response.prototype.json by its rule only',
    );
});

test('modifies JSON string the promise returned by Response.prototype.text is fulfilled with', async (assert) => {
    runScriptlet(name, ['Response.prototype.text', 'ads.enabled', 'false']);

    const result = await new Response(ADS_JSON).text();

    assert.strictEqual(typeof result, 'string', 'should fulfill the promise with a string');
    assert.deepEqual(
        nativeParse(result),
        { ads: { enabled: false }, content: 'article' },
        'should modify the JSON string',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('modifies values of several pending promises returned by Response.prototype.json', async (assert) => {
    runScriptlet(name, ['Response.prototype.json', 'ads.enabled', 'false']);

    const results = await Promise.all([
        new Response('{"ads":{"enabled":true},"id":1}').json(),
        new Response('{"ads":{"enabled":true},"id":2}').json(),
    ]);
    // Matching should not be suspended after the promises are fulfilled
    const nextResult = await new Response('{"ads":{"enabled":true},"id":3}').json();

    assert.deepEqual(results[0], { ads: { enabled: false }, id: 1 }, 'should modify the first value');
    assert.deepEqual(results[1], { ads: { enabled: false }, id: 2 }, 'should modify the second value');
    assert.deepEqual(nextResult, { ads: { enabled: false }, id: 3 }, 'should modify the next value');
});

test('passes rejection of the promise returned by Response.prototype.json through', async (assert) => {
    runScriptlet(name, ['Response.prototype.json', 'ads.enabled', 'false']);

    await assert.rejects(
        new Response('not a JSON').json(),
        SyntaxError,
        'should reject with the original error',
    );
    assert.strictEqual(window.hit, undefined, 'hit function should not fire');
});

test('modifies value of the promise returned by Response.prototype.json when stack matches', async (assert) => {
    runScriptlet(name, ['Response.prototype.json', 'ads.enabled', 'false', '', 'result', 'loadAdsConfig']);

    // Stack is matched when the method is called, as the caller is no longer in the stack on promise fulfillment
    const loadAdsConfig = () => new Response(ADS_JSON).json();

    assert.deepEqual(
        await loadAdsConfig(),
        { ads: { enabled: false }, content: 'article' },
        'should modify the value when stack matches',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('does NOT modify value of the promise returned by Response.prototype.json — no stack match', async (assert) => {
    runScriptlet(name, ['Response.prototype.json', 'ads.enabled', 'false', '', 'result', 'loadAdsConfig']);

    const loadContent = () => new Response(ADS_JSON).json();
    const promise = loadContent();

    assert.notOk(Object.prototype.hasOwnProperty.call(promise, 'ads'), 'should not modify the promise itself');
    assert.deepEqual(
        await promise,
        { ads: { enabled: true }, content: 'article' },
        'should not modify the value when stack does not match',
    );
    assert.strictEqual(window.hit, undefined, 'hit function should not fire');
});

test('logs value of the promise returned by Response.prototype.json in log-only mode', async (assert) => {
    assert.expect(5);

    let logCount = 0;
    console.log = function log(...input) {
        console.debug(...input);
        const message = input[0];
        if (
            input.length === 1
            && typeof message === 'string'
            && message.includes('Original content string of Response.prototype.json')
        ) {
            logCount += 1;
            assert.ok(message.includes('"enabled": true'), 'should log the value the promise is fulfilled with');
            assert.ok(
                message.includes('logAdsConfig'),
                'should log the stack trace captured when the method is called',
            );
        }
    };

    runScriptlet(name, ['Response.prototype.json']);

    const logAdsConfig = () => new Response(ADS_JSON).json();
    const promise = logAdsConfig();

    assert.strictEqual(logCount, 0, 'should not log the promise itself');
    assert.deepEqual(
        await promise,
        { ads: { enabled: true }, content: 'article' },
        'should leave the value unchanged in log-only mode',
    );
    assert.strictEqual(logCount, 1, 'should log the value once');
});

test('does not replace promise returned by the method when jsonSource is arg', async (assert) => {
    let returnedPromise;
    window.sendPayload = (payload) => {
        returnedPromise = Promise.resolve(payload);
        return returnedPromise;
    };
    runScriptlet(name, ['window.sendPayload', 'ads.enabled', 'false', '', 'arg:0']);

    const promise = window.sendPayload({ ads: { enabled: true } });

    assert.strictEqual(promise, returnedPromise, 'should return the original promise');
    assert.deepEqual(await promise, { ads: { enabled: false } }, 'should modify the argument');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');

    clearGlobalProps('sendPayload');
});

test('modifies arguments and value of the returned promise when jsonSource is all', async (assert) => {
    let receivedPayload;
    window.sendPayload = (payload) => {
        receivedPayload = payload;
        return Promise.resolve({ ads: { enabled: true } });
    };
    runScriptlet(name, ['window.sendPayload', 'ads.enabled', 'false', '', 'all']);

    const result = await window.sendPayload({ ads: { enabled: true } });

    assert.deepEqual(receivedPayload, { ads: { enabled: false } }, 'should modify the argument');
    assert.deepEqual(result, { ads: { enabled: false } }, 'should modify the value the promise is fulfilled with');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');

    clearGlobalProps('sendPayload');
});

test('modifies value of the promise returned by Response.prototype.json after Promise is replaced', async (assert) => {
    runScriptlet(name, ['Response.prototype.json', 'ads.enabled', 'false']);

    const NativePromise = window.Promise;
    // Promise implementation of a polyfill or a library which replaces window.Promise,
    // e.g. 'ZoneAwarePromise' of zone.js
    function PolyfillPromise(executor) {
        this.nativePromise = new NativePromise(executor);
    }
    PolyfillPromise.prototype.then = function then(onFulfilled, onRejected) {
        return this.nativePromise.then(onFulfilled, onRejected);
    };

    let promise;
    window.Promise = PolyfillPromise;
    try {
        // Native APIs return native promises regardless of window.Promise
        promise = new Response(ADS_JSON).json();
    } finally {
        window.Promise = NativePromise;
    }

    assert.ok(promise instanceof NativePromise, 'should return a native promise');
    assert.notOk(Object.prototype.hasOwnProperty.call(promise, 'ads'), 'should not modify the promise itself');
    assert.deepEqual(
        await promise,
        { ads: { enabled: false }, content: 'article' },
        'should modify the value the promise is fulfilled with',
    );
});

test('Storage method: modifies the JSON read by localStorage.getItem', (assert) => {
    runScriptlet(name, ['localStorage.getItem', 'ads.enabled', 'false']);
    localStorage.setItem('config', '{"ads":{"enabled":true}}');
    sessionStorage.setItem('config', '{"ads":{"enabled":true}}');

    assert.deepEqual(nativeParse(localStorage.getItem('config')), { ads: { enabled: false } }, 'JSON modified');
    assert.deepEqual(
        nativeParse(sessionStorage.getItem('config')),
        { ads: { enabled: true } },
        'JSON read by sessionStorage.getItem not modified',
    );
    assert.strictEqual(localStorage.getItem('getItem'), null, 'Item named after the method was not stored');
    assert.notOk(Object.prototype.hasOwnProperty.call(localStorage, 'getItem'), 'Storage has no own method');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

/**
 * Parses the JSON text with `JSON.parse` while the stack trace cannot be created or read.
 *
 * @param {string} text JSON text to parse
 * @param {Function} [useStackTraceFailure] function which makes creating or reading the stack trace throw
 * and returns a function which restores it
 * @returns {any} parsed value
 */
const parseWithStackTraceFailure = (text, useStackTraceFailure = useUnreadableStackTrace) => {
    const restoreStackTrace = useStackTraceFailure();
    try {
        return JSON.parse(text);
    } finally {
        restoreStackTrace();
    }
};

test('modifies the value without stack if the stack trace cannot be read', (assert) => {
    runScriptlet(name, ['JSON.parse', 'ads.enabled', 'false']);

    const result = parseWithStackTraceFailure('{"ads":{"enabled":true}}');

    assert.deepEqual(result, { ads: { enabled: false } }, 'should modify the payload');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('modifies the value without stack if the stack trace cannot be read — JSONPath', (assert) => {
    runScriptlet(name, ['JSON.parse', '$.ads.enabled', 'false']);

    const result = parseWithStackTraceFailure('{"ads":{"enabled":true}}');

    assert.deepEqual(result, { ads: { enabled: false } }, 'should modify the payload');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('modifies the value without stack if the page has replaced Error', (assert) => {
    runScriptlet(name, ['JSON.parse', 'ads.enabled', 'false']);

    const result = parseWithStackTraceFailure('{"ads":{"enabled":true}}', useThrowingErrorConstructor);

    assert.deepEqual(result, { ads: { enabled: false } }, 'should modify the payload');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('JSONPath: the value is set by each of several queries', (assert) => {
    runScriptlet(name, ['JSON.parse', '$.ads.enabled $..preroll', 'false']);

    const result = JSON.parse('{"ads":{"enabled":true},"player":{"preroll":true,"autoplay":true}}');

    assert.deepEqual(result, {
        ads: { enabled: false },
        player: { preroll: false, autoplay: true },
    }, 'each query should set the value');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('JSONPath: several queries with their own values are applied in order', (assert) => {
    runScriptlet(name, ['JSON.parse', '$.flag=true [?(@.flag==true)]$.count=0 $.title=Hello world']);

    const result = JSON.parse('{"flag":false,"count":5,"title":"x"}');

    assert.deepEqual(result, { flag: true, count: 0, title: 'Hello world' }, 'queries should be applied in order');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('JSONPath: none of several queries is applied if one of them has no value', (assert) => {
    runScriptlet(name, ['JSON.parse', '$.b $.a=1']);

    const result = JSON.parse('{"a":0,"b":0}');

    assert.deepEqual(result, { a: 0, b: 0 }, 'rule should not be applied');
    assert.strictEqual(window.hit, undefined, 'hit function should not fire');
});

[
    ['$.ads=$remove$ $..banner=false'],
    ['$..banner=false $.ads=$remove$'],
    // an empty value is not set by expressions with their own values
    ['$.ads=$remove$ $..banner=false', ''],
    // a value of the separate argument is set by an expression without its own one, also after `$remove$`
    ['$.ads=$remove$ $..banner', 'false'],
    ['$..banner $.ads=$remove$', 'false'],
    ['$.ads $..banner=false', '$remove$'],
].forEach((args) => {
    test(`JSONPath: '${args.join("', '")}' removes a property and sets other ones`, (assert) => {
        runScriptlet(name, ['JSON.parse', ...args]);

        const result = JSON.parse('{"ads":[1],"banner":true,"page":{"banner":true,"title":"t"}}');

        assert.deepEqual(
            result,
            { banner: false, page: { banner: false, title: 't' } },
            '`ads` should be removed and each `banner` set to false',
        );
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    });
});

test('JSONPath: `$remove$` as a value of an expression is applied with stack', (assert) => {
    runScriptlet(
        name,
        ['JSON.parse', '$.ads=$remove$ $..banner=false', '', '', 'result', 'removeValueStack'],
    );

    const removeValueStack = () => JSON.parse('{"ads":[1],"banner":true}');
    const otherStack = () => JSON.parse('{"ads":[1],"banner":true}');

    assert.deepEqual(otherStack(), { ads: [1], banner: true }, 'should not be applied if stack does not match');
    assert.strictEqual(window.hit, undefined, 'hit function should not fire');
    assert.deepEqual(removeValueStack(), { banner: false }, 'should remove `ads` and set `banner` if stack matches');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('JSONPath: text with `$remove$` is set as before, also by `json:` and `++=`', (assert) => {
    // `++=` is the previous `+=`, which appends a text, while `+=` merges only objects, as uBO
    runScriptlet(name, ['JSON.parse', '$.a=json:"$remove$" $.b="$remove$" $.c++=$remove$ $.d=$remove$ them']);

    const result = JSON.parse('{"a":1,"b":1,"c":[1],"d":1}');

    assert.deepEqual(result, {
        a: '$remove$',
        b: '"$remove$"',
        c: [1, '$remove$'],
        d: '$remove$ them',
    }, 'text values should be set');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('JSONPath: empty value of the separate argument is set, not removed', (assert) => {
    runScriptlet(name, ['JSON.parse', '$.ads $..banner=false', '']);

    const result = JSON.parse('{"ads":[1],"banner":true}');

    assert.deepEqual(result, { ads: '', banner: false }, 'empty string should be set');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('JSONPath: value of a separate argument is not split into queries', (assert) => {
    runScriptlet(name, ['JSON.parse', '$.title', 'see $.ads ...']);

    const result = JSON.parse('{"title":"x","ads":1}');

    assert.deepEqual(result, { title: 'see $.ads ...', ads: 1 }, 'whole value should be set, and ads kept');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('JSONPath: text value with spaces before a dot or the root is one value', (assert) => {
    runScriptlet(name, ['JSON.parse', '$.title=visit example .com', '']);
    runScriptlet(name, ['JSON.parse', '$.ad=replace:/Ad .*/none/']);

    const result = JSON.parse('{"title":"x","ad":"Ad here","com":1}');

    assert.deepEqual(result, { title: 'visit example .com', ad: 'none', com: 1 }, 'values should be set as a whole');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

/**
 * Creates a value like a big payload of a page, with ads in some of its items if `withAds` is set.
 *
 * @param {boolean} withAds Whether some items have `adSlot`.
 * @returns {object} Value with 2000 items.
 */
const createBigValue = (withAds) => {
    const items = [];
    for (let i = 0; i < 2000; i += 1) {
        const meta = { n: i, title: `item ${i}` };
        if (withAds && i % 100 === 0) {
            meta.adSlot = { id: i };
        }
        items.push({ id: i, tags: ['a', i], meta });
    }
    return { items, config: { list: [1, 2] } };
};

test('JSONPath: Array.isArray is called many times with big values, results are not changed', (assert) => {
    let hitCount = 0;
    window.__debug = () => {
        hitCount += 1;
    };
    runScriptlet(name, ['Array.isArray', '$..adSlot', '$remove$', '', 'arg']);

    const withAds = createBigValue(true);
    const withoutAds = createBigValue(false);
    const values = [withAds, withoutAds, withAds.items, withoutAds.items, 'text', '{"a":[1]}', 1, null, []];
    const expected = values.map((value) => nativeIsArray(value));
    const results = [];
    // `Array.isArray` is restored before assertions, as QUnit calls it, and logs of verbose mode are not printed
    console.log = () => {};
    try {
        for (let i = 0; i < 20; i += 1) {
            results.push(values.map((value) => Array.isArray(value)));
        }
    } finally {
        Array.isArray = nativeIsArray;
        console.log = nativeConsole;
    }

    for (let i = 0; i < results.length; i += 1) {
        assert.deepEqual(results[i], expected, `results of calls ${i + 1} should not be changed`);
    }
    assert.notOk(nativeStringify(withAds).includes('adSlot'), 'ads should be removed from the value');
    assert.deepEqual(withoutAds, createBigValue(false), 'value without ads should not be changed');
    assert.strictEqual(hitCount, 1, 'hit function should fire once, when the value with ads is modified');
});

test('JSONPath: Array.isArray modifies each big value once, on its first call', (assert) => {
    let hitCount = 0;
    window.__debug = () => {
        hitCount += 1;
    };
    runScriptlet(name, ['Array.isArray', '$.items[?(@.meta.adSlot)]', '$remove$', '', 'arg']);

    const values = [createBigValue(true), createBigValue(true), createBigValue(true)];
    const results = [];
    try {
        for (let i = 0; i < 3; i += 1) {
            values.forEach((value) => results.push(Array.isArray(value)));
        }
    } finally {
        Array.isArray = nativeIsArray;
    }

    assert.ok(results.every((result) => result === false), 'results should not be changed');
    values.forEach((value) => {
        assert.strictEqual(value.items.length, 1980, 'items with ads should be removed');
    });
    assert.strictEqual(hitCount, 3, 'hit function should fire once for each value');
});

test('string without { and [ is not parsed as JSON', (assert) => {
    let parseCount = 0;
    JSON.parse = (...args) => {
        parseCount += 1;
        return nativeParse(...args);
    };
    // the scriptlet saves `JSON.parse` of the page, i.e. the counting one
    runScriptlet(name, ['String', '$.ads', '$remove$', '', 'result']);
    JSON.parse = nativeParse;

    const text = String('plain text, 5 $');
    assert.strictEqual(parseCount, 0, 'text should not be parsed');
    const json = String('{"ads":1,"a":[1]}');
    assert.ok(parseCount > 0, 'JSON should be parsed');

    assert.strictEqual(text, 'plain text, 5 $', 'text should not be changed');
    assert.deepEqual(nativeParse(json), { a: [1] }, 'JSON should be modified');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

// Expressions of rules of facebook.com which hook `Array.isArray` and froze the page as separate rules,
// as each rule processed the calls of the method which the other rules made themselves
const FACEBOOK_SPONSORED_FILTER = '[?(@.category=="SPONSORED"||@.node.*.__typename=="SponsoredData"'
    + '||@.__typename=="AdsSideFeedUnit"||@.item_collection.nodes.*.sponsored_data.ad_id=~/.+/)]';
/* eslint-disable max-len */
const FACEBOOK_RULES = [
    `[?(@.data||@.__bbox||@.result||@.*.data)]$..[?(@.data&&!(@.edges&&@.require))].data..[node,edges,nodes]${FACEBOOK_SPONSORED_FILTER}`,
    '[?(@.data||@.__bbox||@.result||@.*.data)]$..[?(@.data&&!(@.edges&&@.require))].data[?(@.category=="SPONSORED")].node',
    `$[?(@.data&&!(@.edges&&@.require))].data.viewer[news_feed,auxColumnUnits][edges,nodes]${FACEBOOK_SPONSORED_FILTER}`,
    '$[?(@.data&&!(@.edges&&@.require))].data[?(@.category=="SPONSORED"||@.node.*.__typename=="SponsoredData")].node',
    `$[?(@.__bbox)].__bbox.result.data.viewer[news_feed,auxColumnUnits][edges,nodes]${FACEBOOK_SPONSORED_FILTER}`,
    '$[?(@.__bbox)].__bbox.result[?(!(@.edges&&@.require))].data[?(@.category=="SPONSORED"||@.node.*.__typename=="SponsoredData")].node',
];
/* eslint-enable max-len */

/**
 * Creates a viewer of a response of facebook.com with sponsored items of all kinds the rules match.
 *
 * @param {boolean} withAds Whether the sponsored items are included.
 * @returns {object} Viewer with the feed and the side column.
 */
const createFacebookViewer = (withAds) => {
    const edges = [{ category: 'ORGANIC', node: { __typename: 'Story', id: '1' } }];
    const nodes = [{ __typename: 'Unit', id: 'c', item_collection: { nodes: [{ sponsored_data: { ad_id: '' } }] } }];
    if (withAds) {
        edges.push({ category: 'SPONSORED', node: { __typename: 'Story', id: '2' } });
        edges.push({
            category: 'ORGANIC',
            node: { __typename: 'Story', id: '3', ad: { __typename: 'SponsoredData' } },
        });
        nodes.unshift({ __typename: 'AdsSideFeedUnit', id: 'a' });
        nodes.push({ __typename: 'Unit', id: 'b', item_collection: { nodes: [{ sponsored_data: { ad_id: '9' } }] } });
    }
    return { news_feed: { edges }, auxColumnUnits: { nodes } };
};

/**
 * Applies rules of `trusted-json-set` which hook `Array.isArray`, and restores it after `callback`,
 * as QUnit calls it in assertions.
 *
 * @param {string[]} paths JSONPath expressions of the rules.
 * @param {Function} callback Function which calls `Array.isArray`.
 */
const withArrayIsArrayRules = (paths, callback) => {
    paths.forEach((path) => {
        runScriptlet(name, ['Array.isArray', path, '$remove$', '', 'arg:0', '', 'jsonpath']);
    });
    console.log = () => {};
    try {
        callback();
    } finally {
        Array.isArray = nativeIsArray;
        console.log = nativeConsole;
    }
};

test('JSONPath: one rule with expressions of facebook.com rules on Array.isArray removes ads', (assert) => {
    const responses = [
        { data: { viewer: createFacebookViewer(true) }, extensions: {} },
        { __bbox: { result: { data: { viewer: createFacebookViewer(true) } } } },
    ];
    const patches = [
        { data: { category: 'SPONSORED', node: { id: 'p' } }, label: 'x' },
        { __bbox: { result: { data: { category: 'SPONSORED', node: { id: 'q' } } } } },
    ];
    const results = [];
    // one rule with several expressions processes each value once
    withArrayIsArrayRules([FACEBOOK_RULES.join(' ')], () => {
        responses.concat(patches).forEach((value) => results.push(Array.isArray(value)));
    });

    assert.deepEqual(results, [false, false, false, false], 'results should not be changed');
    assert.deepEqual(responses[0].data.viewer, createFacebookViewer(false), 'ads of the response should be removed');
    assert.deepEqual(
        responses[1].__bbox.result.data.viewer,
        createFacebookViewer(false),
        'ads of the initial response should be removed',
    );
    assert.deepEqual(patches[0], { data: { category: 'SPONSORED' }, label: 'x' }, 'node of a patch should be removed');
    assert.deepEqual(
        patches[1],
        { __bbox: { result: { data: { category: 'SPONSORED' } } } },
        'node of the initial patch should be removed',
    );
});

test('JSONPath: one rule with several expressions calls the method linearly', (assert) => {
    let nativeCallCount = 0;
    // counts the calls of the native method, which the rule calls
    Array.isArray = (value) => {
        nativeCallCount += 1;
        return nativeIsArray(value);
    };
    const counts = [];
    withArrayIsArrayRules([FACEBOOK_RULES.slice(2).join(' ')], () => {
        [{ props: { text: 'x' } }, [1, [2]], 'text', undefined].forEach((value) => {
            nativeCallCount = 0;
            Array.isArray(value);
            counts.push(nativeCallCount);
        });
    });

    // The call of the page, and one call by the filter of each of 4 expressions at most,
    // while 4 separate rules process the calls of each other, i.e. 2 ** 4 calls for one call
    counts.forEach((count) => {
        assert.ok(count <= 1 + 4, `native method should be called ${count} <= 5 times for one call`);
    });
});

test('JSONPath: replacement with a space and a query in it is one value', (assert) => {
    runScriptlet(name, ['JSON.parse', '$.a=replace({"regex":"x","replacement":"see $.b=1"})']);
    runScriptlet(name, ['JSON.parse', '$.c=replace:/x/see $.b=1/']);

    const result = JSON.parse('{"a":"x","b":7,"c":"x"}');

    assert.deepEqual(result, { a: 'see $.b=1', b: 7, c: 'see $.b=1' }, 'b should not be changed');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('JSONPath: documented rules with a quote in a regular expression of guards', (assert) => {
    const rules = [
        // each expression has its own guard, with `\x27` instead of the quote
        '[?(@.title=/it\\x27s/)]$.ads=false [?(@.title=/it\\x27s/)]$.banner=false',
        // one expression with both properties, in which the quote may be raw
        '[?(@.title=/it\'s/)]$["ads","banner"]=false',
    ];
    rules.forEach((rule) => {
        // the hook of the previous rule is removed first
        JSON.parse = nativeParse;
        runScriptlet(name, ['JSON.parse', rule]);
        assert.deepEqual(
            JSON.parse('{"title":"it\'s an ad","ads":true,"banner":true}'),
            { title: "it's an ad", ads: false, banner: false },
            `${rule} should set both`,
        );
        assert.deepEqual(
            JSON.parse('{"title":"News","ads":true,"banner":true}'),
            { title: 'News', ads: true, banner: true },
            `${rule} should set neither for News`,
        );
    });
});

test('JSONPath: regular expression with a raw quote makes the argument one expression', (assert) => {
    runScriptlet(name, ['JSON.parse', "[?(@.title=/it's/)]$.ads=false [?(@.title=/it's/)]$.banner=false"]);

    const result = JSON.parse('{"title":"it\'s an ad","ads":true,"banner":true}');

    assert.deepEqual(result, { title: "it's an ad", ads: true, banner: true }, 'neither property should be set');
});

test('JSONPath: documented examples of repl() and call() values, and of a regular expression of keys', (assert) => {
    const examples = [
        {
            rule: '$.items.*.title=repl({"regex":"^sponsored: ","flags":"i","replacement":""})',
            input: '{"items":[{"title":"Sponsored: Shoes"},{"title":"SPONSORED: Bags"},{"title":"News"}]}',
            output: { items: [{ title: 'Shoes' }, { title: 'Bags' }, { title: 'News' }] },
        },
        {
            rule: '$..title=repl({"pattern":" (Ad)","replacement":""})',
            input: '{"a":{"title":"News (Ad)"},"b":{"title":"Weather"},"c":{"title":3}}',
            output: { a: { title: 'News' }, b: { title: 'Weather' }, c: { title: 3 } },
        },
        {
            // eslint-disable-next-line no-template-curly-in-string
            rule: '$..playlist=call(["${val}","splice",0,1])',
            input: '{"a":{"playlist":["ad","video1"]},"b":{"playlist":["ad","video2"]}}',
            output: { a: { playlist: ['video1'] }, b: { playlist: ['video2'] } },
        },
        {
            rule: '$.param_stores.*./^interstitial_/.value.shouldShow=false',
            input: '{"param_stores":{"store":{"interstitial_a":{"value":{"shouldShow":true}},'
                + '"banner":{"value":{"shouldShow":true}}}}}',
            output: {
                param_stores: {
                    store: {
                        interstitial_a: { value: { shouldShow: false } },
                        banner: { value: { shouldShow: true } },
                    },
                },
            },
        },
    ];
    examples.forEach(({ rule, input, output }) => {
        // the hook of the previous rule is removed first
        JSON.parse = nativeParse;
        runScriptlet(name, ['JSON.parse', rule]);
        assert.deepEqual(JSON.parse(input), output, rule);
    });
});

test('ubo-trusted-json-edit with real uBO rules sets values of the result of JSON.parse()', (assert) => {
    [
        // deezer.com##+js(trusted-json-edit, ..ads_audio=false)
        ['..ads_audio=false', '{"user":{"ads_audio":true,"id":1}}', { user: { ads_audio: false, id: 1 } }],
        // kijk.nl##+js(trusted-json-edit, .features.*[?.slug=="adblock-detection"].enabled=false)
        [
            '.features.*[?.slug=="adblock-detection"].enabled=false',
            '{"features":[{"slug":"adblock-detection","enabled":true},{"slug":"other","enabled":true}]}',
            { features: [{ slug: 'adblock-detection', enabled: false }, { slug: 'other', enabled: true }] },
        ],
    ].forEach(([query, input, output]) => {
        JSON.parse = nativeParse;
        runScriptlet('ubo-trusted-json-edit', [query]);
        assert.deepEqual(JSON.parse(input), output, query);
    });
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('ubo-trusted-json-edit.js removes what a query without its own value matches', (assert) => {
    runScriptlet('ubo-trusted-json-edit.js', ['..ads', 'matches', 'ads']);

    assert.deepEqual(JSON.parse('{"a":{"ads":1,"b":2}}'), { a: { b: 2 } }, 'matching text should be modified');
    assert.deepEqual(JSON.parse('{"a":{"b":2}}'), { a: { b: 2 } }, 'other text should not');
});

test('matches with targets tests the first argument, another one, this, or the result', async (assert) => {
    runScriptlet(name, ['JSON.parse', '$.ads', 'false', '', 'result', '', '', '', 'matches', 'adSlot']);
    assert.deepEqual(JSON.parse('{"ads":true,"adSlot":1}'), { ads: false, adSlot: 1 }, 'text should be matched');
    assert.deepEqual(JSON.parse('{"ads":true}'), { ads: true }, 'other text should not');

    JSON.parse = nativeParse;
    window.__getPayload = (text, payload) => payload;
    runScriptlet(name, ['__getPayload', '$.ads', 'false', '', 'arg:1', '', '', '', 'matches arg:0', 'ads']);
    assert.strictEqual(window.__getPayload('ads', '{"ads":true}'), '{"ads":false}', 'arg:0 should be matched');
    assert.strictEqual(window.__getPayload('x', '{"ads":true}'), '{"ads":true}', 'other arg:0 should not');

    // e.g. a method which the page calls on a JSON text
    window.__parseThis = function parseThis() { return nativeParse(this); };
    runScriptlet(name, ['__parseThis', '$.ads', 'false', '', 'result', '', '', '', 'matches this', 'adSlot']);
    assert.deepEqual(window.__parseThis.call('{"ads":true,"adSlot":1}'), { ads: false, adSlot: 1 }, 'this is matched');

    Response.prototype.text = nativeResponseText;
    runScriptlet(name, [
        'Response.prototype.text',
        '$.ads',
        'false',
        '',
        'result',
        '',
        '',
        '',
        'matches result',
        'adSlot',
    ]);
    const matchedText = await new Response('{"ads":true,"adSlot":1}').text();
    assert.strictEqual(matchedText, '{"ads":false,"adSlot":1}', 'value of the promise should be matched');
    assert.strictEqual(await new Response('{"ads":true}').text(), '{"ads":true}', 'other result should not');
    clearGlobalProps('__getPayload', '__parseThis');
});

test('ubo-trusted-json-edit reads values as JSON, as uBO, and merges by += in place', (assert) => {
    // chatgpt.com##+js(trusted-json-edit, [?.type=="ads"].visibility.status="hidden")
    runScriptlet('ubo-trusted-json-edit', ['[?.type=="ads"].visibility.status="hidden"']);
    assert.deepEqual(
        JSON.parse('{"type":"ads","visibility":{"status":"shown"}}'),
        { type: 'ads', visibility: { status: 'hidden' } },
        'the text "hidden" should be set without its quotes',
    );

    JSON.parse = nativeParse;
    runScriptlet('ubo-trusted-json-edit', ['$.config+={"ads":false}']);
    assert.deepEqual(
        JSON.parse('{"config":{"id":1},"title":"x"}'),
        { config: { id: 1, ads: false }, title: 'x' },
        'the object should be merged',
    );

    // a value which is not JSON, which uBO does not apply either
    JSON.parse = nativeParse;
    runScriptlet('ubo-trusted-json-edit', ['$.status=hidden']);
    assert.deepEqual(JSON.parse('{"status":"shown"}'), { status: 'shown' }, 'the rule should not be applied');
});

test('ubo-trusted-json-edit evaluates filters as uBO', (assert) => {
    // chatgpt.com##+js(trusted-json-edit, [?.type=="ads"].visibility.status="hidden"), on an array root,
    // whose matching items a leading filter selects, as in uBO
    runScriptlet('ubo-trusted-json-edit', ['[?.type=="ads"].visibility.status="hidden"']);
    const text = '[{"type":"ads","visibility":{"status":"shown"}},{"type":"post","visibility":{"status":"shown"}}]';
    assert.deepEqual(
        JSON.parse(text),
        [{ type: 'ads', visibility: { status: 'hidden' } }, { type: 'post', visibility: { status: 'shown' } }],
        'only the item of ads should be changed',
    );

    // a recursive filter does not test the root, as in uBO
    JSON.parse = nativeParse;
    runScriptlet('ubo-trusted-json-edit', ['..[?.ad]="removed"']);
    assert.deepEqual(
        JSON.parse('{"ad":1,"slot":{"ad":2}}'),
        { ad: 1, slot: 'removed' },
        'only the descendant should be replaced',
    );

    // a leading filter of an AdGuard rule is a guard of the root, as before
    JSON.parse = nativeParse;
    runScriptlet(name, ['JSON.parse', '[?.type=="ads"].visibility.status=hidden']);
    assert.deepEqual(
        JSON.parse(text),
        [{ type: 'ads', visibility: { status: 'shown' } }, { type: 'post', visibility: { status: 'shown' } }],
        'an AdGuard rule should not change the items',
    );
});

test('ubo-trusted-json-edit is applied if RegExp.prototype.test throws while it runs', (assert) => {
    // as by `abort-current-inline-script` with `RegExp.prototype.test`, which aborts the script of the rule,
    // while the query, whose parsing calls it, e.g. for `[0]`, is parsed for the first value, as before
    const restoreTest = useThrowingMethod(RegExp.prototype, 'test');
    try {
        runScriptlet('ubo-trusted-json-edit', ['.items[0].ad']);
    } finally {
        restoreTest();
    }

    assert.deepEqual(JSON.parse('{"items":[{"ad":1,"id":2}]}'), { items: [{ id: 2 }] }, 'ad should be removed');
});

test('+= of a recursive query merges a node before the nodes which contain it, as uBO', (assert) => {
    runScriptlet(name, ['JSON.parse', '..config+={"config":{"active":true}}']);
    assert.strictEqual(
        nativeStringify(JSON.parse('{"config":{"config":{"old":1}}}')),
        '{"config":{"config":{"active":true}}}',
        'the result should be the one of uBO, not a circular object',
    );
});

test('+= merges only objects and arrays, and ++= is the previous +=', (assert) => {
    runScriptlet(name, ['JSON.parse', '$.title+=" (ad)" $.list+=[2]']);
    assert.deepEqual(
        JSON.parse('{"title":"News","list":[1]}'),
        { title: 'News', list: [1, 2] },
        '+= should not join strings, as uBO',
    );

    JSON.parse = nativeParse;
    runScriptlet(name, ['JSON.parse', '$.title++=!']);
    assert.deepEqual(JSON.parse('{"title":"News"}'), { title: 'News!' }, '++= should join strings, as += did');
});

test('+= changes an object which the page holds in place, ++= puts a new one', (assert) => {
    // e.g. a method of the page which gets its config, while the page keeps a reference to its settings
    const settings = { theme: 'dark' };
    const config = { settings };
    window.__applyConfig = (value) => value;

    runScriptlet(name, ['__applyConfig', '$.settings+={"ads":false}', '', '', 'arg:0']);
    window.__applyConfig(config);
    assert.deepEqual(settings, { theme: 'dark', ads: false }, '+= should change the object which the page holds');
    assert.strictEqual(config.settings, settings, 'and keep it at its path');

    const otherSettings = { theme: 'dark' };
    const otherConfig = { settings: otherSettings };
    window.__applyConfig = (value) => value;
    runScriptlet(name, ['__applyConfig', '$.settings++={"ads":false}', '', '', 'arg:0']);
    window.__applyConfig(otherConfig);
    assert.deepEqual(otherSettings, { theme: 'dark' }, '++= should not change the object which the page holds');
    assert.deepEqual(otherConfig.settings, { theme: 'dark', ads: false }, 'but put a new merged one at its path');

    clearGlobalProps('__applyConfig');
});
