/* eslint-disable no-underscore-dangle, no-console */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'trusted-json-set';

const nativeStringify = JSON.stringify;
const nativeParse = JSON.parse;
const nativeConsole = console.log;

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
    JSON.stringify = nativeStringify;
    JSON.parse = nativeParse;
    console.log = nativeConsole;
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

test('should log message when input is not valid JSON', (assert) => {
    assert.expect(2);

    const message = 'is not valid JSON';
    // mock console.log function for log checking
    console.log = function log(input) {
        if (input.includes('trace')) {
            return;
        }
        console.debug(input);
        assert.ok(input.includes(message), 'should log message in console');
    };

    runScriptlet(name, ['String', '$.ads.enabled', '$remove$', '', 'result', '', 'jsonpath']);

    const input = 'plain-text\r\nplain-text\r\nplain-text';
    const result = String(input);

    assert.deepEqual(result, input, 'should leave values unchanged when input is not valid JSON');
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
