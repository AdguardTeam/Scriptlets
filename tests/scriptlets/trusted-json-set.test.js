/* eslint-disable no-underscore-dangle, no-console */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'trusted-json-set';

const nativeStringify = JSON.stringify;
const nativeParse = JSON.parse;

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
    JSON.stringify = nativeStringify;
    JSON.parse = nativeParse;
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
