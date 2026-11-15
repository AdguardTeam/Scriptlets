/* eslint-disable no-underscore-dangle, no-console */
import {
    runScriptlet,
    clearGlobalProps,
    useFirefoxStackTraceFormat,
    useThrowingErrorConstructor,
    useUnreadableStackTrace,
    saveStorageMethods,
} from '../helpers';

const { test, module } = QUnit;
const name = 'trusted-replace-outbound-text';

const nativeConsole = console.log;
const nativeAtob = atob;
const nativeJSONStringify = JSON.stringify;
const nativeArrayJoin = Array.prototype.join;
const nativeArrayShift = Array.prototype.shift;
const nativeStringTrim = String.prototype.trim;
const nativeStringConcat = String.prototype.concat;
const nativeDecodeURIComponent = decodeURIComponent;
const nativeHeadersGet = Headers.prototype.get;
const nativeTextDecoderDecode = TextDecoder.prototype.decode;

// Scriptlets replace methods of storages in Storage.prototype
const restoreStorage = saveStorageMethods();

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
    console.log = nativeConsole;
    window.atob = nativeAtob;
    window.JSON.stringify = nativeJSONStringify;
    window.Array.prototype.join = nativeArrayJoin;
    window.Array.prototype.shift = nativeArrayShift;
    window.String.prototype.trim = nativeStringTrim;
    window.String.prototype.concat = nativeStringConcat;
    window.decodeURIComponent = nativeDecodeURIComponent;
    window.Headers.prototype.get = nativeHeadersGet;
    window.TextDecoder.prototype.decode = nativeTextDecoderDecode;
    restoreStorage();
};

module(name, { beforeEach, afterEach });

/**
 * Calls the function while the stack trace cannot be created or read.
 *
 * @param {Function} func function to call
 * @param {Function} [useStackTraceFailure] function which makes creating or reading the stack trace throw
 * and returns a function which restores it
 * @returns {*} result of the function
 */
const callWithStackTraceFailure = (func, useStackTraceFailure = useUnreadableStackTrace) => {
    const restoreStackTrace = useStackTraceFailure();
    try {
        return func();
    } finally {
        restoreStackTrace();
    }
};

test('logs text if invoked with only first arg - atob', (assert) => {
    assert.expect(2);
    console.log = (...args) => {
        if (args.length === 1 && args[0].includes('text content:')) {
            assert.ok(args[0].includes('This is a test'), 'should log text in console');
        }
        nativeConsole(...args);
    };

    runScriptlet(name, ['atob']);

    const text = btoa('This is a test');
    const result = atob(text);
    assert.deepEqual(result, 'This is a test', 'Text content is intact');
});

test('logs information that content is not a string - JSON.parse', (assert) => {
    assert.expect(2);
    console.log = (...args) => {
        if (args.length === 1 && args[0].includes('Content is not a string')) {
            assert.ok(args[0].includes('Content is not a string'), 'should log text in console');
        }
        nativeConsole(...args);
    };

    runScriptlet(name, ['JSON.parse', 'foo', 'bar']);

    const expected = { foo: 'bar' };

    const result = JSON.parse('{"foo":"bar"}');
    assert.deepEqual(result, expected, 'Content is intact');
});

test('replace text - atob', (assert) => {
    runScriptlet(name, ['atob', 'foo bar', 'one two']);
    const text = btoa('foo bar');
    const result = atob(text);
    assert.deepEqual(result, 'one two', '"foo bar" replaced with "one two"');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('replace text - log original and modified content - atob', (assert) => {
    console.log = (...args) => {
        if (args.length === 1 && args[0].includes('Original text content:')) {
            assert.ok(args[0].includes('Start advertisement end.'), 'should log original text in console');
        }
        if (args.length === 1 && args[0].includes('Modified text content:')) {
            assert.ok(args[0].includes('Start end.'), 'should log modified text in console');
        }
        nativeConsole(...args);
    };

    runScriptlet(name, ['atob', ' advertisement', '', '', '', 'true']);

    const text = btoa('Start advertisement end.');
    const result = atob(text);
    assert.deepEqual(result, 'Start end.', '" advertisement" replaced with " "');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('text not matched - log original content and information about not modified content - atob', (assert) => {
    // Both log assertions should run, as they are conditional
    assert.expect(4);
    console.log = (...args) => {
        if (args.length === 1 && args[0].includes('Original text content:')) {
            assert.ok(args[0].includes('Text not matched.'), 'should log original text in console');
        }
        if (args.length === 1 && args[0].includes('not modified')) {
            assert.ok(args[0].includes('Text content was not modified'), 'log information about not modified content');
        }
        nativeConsole(...args);
    };

    runScriptlet(name, ['atob', 'NOT_MATCH', '', '', '', 'true']);

    const text = btoa('Text not matched.');
    const result = atob(text);
    assert.deepEqual(result, 'Text not matched.', 'Text content is intact');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('replace text - regular expression - atob', (assert) => {
    runScriptlet(name, ['atob', '/for.*?-/', 'regexp -']);
    const text = btoa('Test for regular expression - foo bar');
    const result = atob(text);
    assert.deepEqual(result, 'Test regexp - foo bar', '"for regular expression -" replaced with "regexp -"');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('replace text - JSON.stringify', (assert) => {
    runScriptlet(name, ['JSON.stringify', 'advertisement', 'no_ads']);
    const result = JSON.stringify({ advertisement: true, video: 'foo' });
    assert.deepEqual(result, '{"no_ads":true,"video":"foo"}', '"advertisement" replaced with "no_ads"');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('replace text - JSON.stringify - match stack', (assert) => {
    runScriptlet(name, ['JSON.stringify', '"loadAds":true', '"loadAds":false', '', 'testStackFunction']);
    const testStackFunction = () => {
        const result = JSON.stringify({ loadAds: true, content: 'bar' });
        assert.deepEqual(
            result,
            '{"loadAds":false,"content":"bar"}',
            'Content modified - ""loadAds":true" replaced with ""loadAds":false"',
        );
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    };
    testStackFunction();
});

test('replace text - JSON.stringify - match stack in Firefox stack trace format', (assert) => {
    runScriptlet(name, ['JSON.stringify', '"loadAds":true', '"loadAds":false', '', 'testStackFunction']);
    const testStackFunction = () => JSON.stringify({ loadAds: true, content: 'bar' });

    // Stack trace of Firefox and Safari has no error message line,
    // so the frame of the function which calls the method should not be removed as the scriptlet's own one
    const restoreStackTraceFormat = useFirefoxStackTraceFormat();
    let result;
    try {
        result = testStackFunction();
    } finally {
        restoreStackTraceFormat();
    }

    assert.strictEqual(result, '{"loadAds":false,"content":"bar"}', 'Content modified');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('replace text - JSON.stringify - match stack after a call with NOT matching stack', (assert) => {
    runScriptlet(name, ['JSON.stringify', '"loadAds":true', '"loadAds":false', '', 'testStackFunction']);
    const otherFunction = () => JSON.stringify({ loadAds: true });
    const testStackFunction = () => JSON.stringify({ loadAds: true });

    assert.strictEqual(otherFunction(), '{"loadAds":true}', 'Content not modified for NOT matching stack');
    assert.strictEqual(window.hit, undefined, 'hit function should not fire for NOT matching stack');
    assert.strictEqual(testStackFunction(), '{"loadAds":false}', 'Content modified for matching stack after it');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired for matching stack');
});

test('replace text - JSON.stringify - after a call which throws', (assert) => {
    runScriptlet(name, ['JSON.stringify', '"loadAds":true', '"loadAds":false']);
    const circular = {};
    circular.self = circular;

    assert.throws(() => JSON.stringify(circular), TypeError, 'Error of the method thrown');
    assert.strictEqual(
        JSON.stringify({ loadAds: true }),
        '{"loadAds":false}',
        'Content modified for the next call',
    );
});

test('replace text - JSON.stringify - match stack - stack trace cannot be read', (assert) => {
    runScriptlet(name, ['JSON.stringify', '"loadAds":true', '"loadAds":false', '', 'testStackFunction']);
    const testStackFunction = () => JSON.stringify({ loadAds: true });

    const result = callWithStackTraceFailure(testStackFunction);

    assert.strictEqual(result, '{"loadAds":true}', 'Result of the call returned, content not modified');
    assert.strictEqual(window.hit, undefined, 'hit function should not fire');
    assert.strictEqual(testStackFunction(), '{"loadAds":false}', 'Content modified for the next call');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired for the next call');
});

test('replace text - JSON.stringify - match stack - Error replaced by the page', (assert) => {
    runScriptlet(name, ['JSON.stringify', '"loadAds":true', '"loadAds":false', '', 'testStackFunction']);
    const testStackFunction = () => JSON.stringify({ loadAds: true });

    const result = callWithStackTraceFailure(testStackFunction, useThrowingErrorConstructor);

    assert.strictEqual(result, '{"loadAds":true}', 'Result of the call returned, content not modified');
    assert.strictEqual(window.hit, undefined, 'hit function should not fire');
    assert.strictEqual(testStackFunction(), '{"loadAds":false}', 'Content modified for the next call');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired for the next call');
});

test('replace text - invalid stack', (assert) => {
    // Not JSON.stringify, as QUnit uses it, so an error thrown by it would stop the test run
    window.getText = () => 'loadAds:true';
    runScriptlet(name, ['getText', 'loadAds:true', 'loadAds:false', '', '/(/']);

    const result = window.getText();

    assert.strictEqual(result, 'loadAds:true', 'Result of the call returned, content not modified');
    assert.strictEqual(window.hit, undefined, 'hit function should not fire');

    clearGlobalProps('getText');
});

test('toString() of the intercepted method returns the original value', (assert) => {
    const nativeFunction = function getText() {
        return 'loadAds:true';
    };
    window.getText = nativeFunction;
    runScriptlet(name, ['getText', 'loadAds:true', 'loadAds:false']);

    assert.notStrictEqual(window.getText, nativeFunction, 'Method intercepted');
    assert.strictEqual(window.getText.toString(), nativeFunction.toString(), 'toString() returns the original value');

    clearGlobalProps('getText');
});

test('replace text - invalid textToReplace', (assert) => {
    // Not JSON.stringify, as QUnit uses it, so an error thrown by it would stop the test run
    window.getText = () => 'loadAds:true';
    runScriptlet(name, ['getText', '/(/', 'loadAds:false']);

    const result = window.getText();

    assert.strictEqual(result, 'loadAds:true', 'Result of the call returned, content not modified');
    assert.strictEqual(window.hit, undefined, 'hit function should not fire');

    clearGlobalProps('getText');
});

test('replace text - JSON.stringify - Error replaced by the page - without stack', (assert) => {
    runScriptlet(name, ['JSON.stringify', '"loadAds":true', '"loadAds":false']);

    const result = callWithStackTraceFailure(() => JSON.stringify({ loadAds: true }), useThrowingErrorConstructor);

    assert.strictEqual(result, '{"loadAds":false}', 'Content modified');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('test stack - JSON.stringify - NOT match stack', (assert) => {
    runScriptlet(name, ['JSON.stringify', 'true', 'false', '', 'notMatchStack']);
    const testFunction = () => {
        const result = JSON.stringify({ foo: true, bar: false });
        assert.deepEqual(
            result,
            '{"foo":true,"bar":false}',
            'Content not modified',
        );
        assert.strictEqual(window.hit, undefined, 'hit function should not fire');
    };
    testFunction();
});

test('replace text decode - Array.prototype.join - not valid base64', (assert) => {
    runScriptlet(name, ['Array.prototype.join', '', '', 'base64']);
    const expectedText = 'pressed';
    const splittedText = expectedText.split('');
    const result = splittedText.join('');
    assert.deepEqual(result, expectedText, 'Text content is intact');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('replace text decode - Array.prototype.join - not valid base64', (assert) => {
    runScriptlet(name, ['Array.prototype.join', '', '', 'base64', '', 'true']);
    const expectedText = 'BxgRVNwwmOgk3v1n';
    const splittedText = expectedText.split('');
    const result = splittedText.join('');
    assert.deepEqual(result, expectedText, 'Text content is intact');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('replace text - Array.prototype.join, decode base64', (assert) => {
    runScriptlet(name, ['Array.prototype.join', 'disable_ads:false', 'disable_ads:true', 'base64']);
    const expectedText = 'disable_ads:true,video:foo';
    const expectedTextInBase64 = btoa(expectedText);
    const text = 'disable_ads:false,video:foo';
    const textInBase64 = btoa(text);
    const splittedText = textInBase64.split('');
    const result = splittedText.join('');
    const decodedResult = atob(result);
    assert.deepEqual(result, expectedTextInBase64, 'content in base64 is modified');
    assert.deepEqual(decodedResult, expectedText, 'content is modified');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('replace text - Array.prototype.join, decode base64, test for padding "="', (assert) => {
    runScriptlet(name, ['Array.prototype.join', 'fooBarTest=', 'Test=', 'base64']);
    const expectedText = 'Test=';
    const expectedTextInBase64 = btoa(expectedText);
    const textInBase64 = 'Zm9vQmFyVGVzdD0';
    const splittedText = textInBase64.split('');
    const result = splittedText.join('');
    const decodedResult = atob(result);
    assert.deepEqual(result, expectedTextInBase64, 'content in base64 is modified');
    assert.deepEqual(decodedResult, expectedText, 'content is modified');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('replace text decode - Array.prototype.join, match stack', (assert) => {
    runScriptlet(name, ['Array.prototype.join', 'disable_ads:false', 'disable_ads:true', 'base64', 'decodeStackFunc']);
    const decodeStackFunc = () => {
        const expectedText = 'disable_ads:true,video:foo';
        const expectedTextInBase64 = btoa(expectedText);
        const text = 'disable_ads:false,video:foo';
        const textInBase64 = btoa(text);
        const splittedText = textInBase64.split('');
        const result = splittedText.join('');
        const decodedResult = atob(result);
        assert.deepEqual(result, expectedTextInBase64, 'content in base64 is modified');
        assert.deepEqual(decodedResult, expectedText, 'content is modified');
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    };
    decodeStackFunc();
});

test('log - Array.prototype.join, base64', (assert) => {
    assert.expect(8);

    console.log = (...args) => {
        const argsLength = args.length;
        const consoleContent = args[0];
        if (argsLength === 1 && consoleContent.includes('Original text content:')) {
            assert.ok(consoleContent.includes('Original text content:'), '1 should log original text in console');
            assert.ok(consoleContent.includes('Zm9vOmJhcixxd2VydHk6MTIzNA=='), '2 should log original text in console');
        }
        if (argsLength === 1 && consoleContent.includes('Decoded text content:')) {
            assert.ok(consoleContent.includes('Decoded text content:'), '1 log information about decoded content');
            assert.ok(consoleContent.includes('foo:bar,qwerty:1234'), '2 log information about decoded content');
        }
        if (argsLength === 1 && consoleContent.includes('Decoded text content was not modified')) {
            assert.ok(
                consoleContent.includes('Decoded text content was not modified'),
                'log information about not modified content',
            );
        }
        nativeConsole(...args);
    };

    runScriptlet(name, ['Array.prototype.join', '', '', 'base64', '', 'true']);
    const expectedText = 'foo:bar,qwerty:1234';
    const expectedTextInBase64 = btoa(expectedText);
    const text = 'foo:bar,qwerty:1234';
    const textInBase64 = btoa(text);
    const splittedText = textInBase64.split('');
    const result = splittedText.join('');
    const decodedResult = atob(result);
    assert.deepEqual(result, expectedTextInBase64, 'Encoded text content is intact');
    assert.deepEqual(decodedResult, expectedText, 'Decoded text content is intact');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('Storage method: replaces the text returned by localStorage.getItem', (assert) => {
    runScriptlet(name, ['localStorage.getItem', '"ads":true', '"ads":false']);
    localStorage.setItem('config', '{"ads":true}');
    sessionStorage.setItem('config', '{"ads":true}');

    assert.strictEqual(localStorage.getItem('config'), '{"ads":false}', 'Text replaced');
    assert.strictEqual(sessionStorage.getItem('config'), '{"ads":true}', 'Text of sessionStorage not replaced');
    assert.strictEqual(localStorage.getItem('getItem'), null, 'Item named after the method was not stored');
    assert.notOk(Object.prototype.hasOwnProperty.call(localStorage, 'getItem'), 'Storage has no own method');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('Storage method: replaces the text returned by an own localStorage.getItem of the page', (assert) => {
    // Page may assign its own method to the storage in Chrome before the scriptlet runs,
    // while in Firefox it stores an item instead
    const nativeGetItem = Storage.prototype.getItem;
    localStorage.getItem = function getItem(key) {
        return nativeGetItem.call(this, key);
    };

    try {
        runScriptlet(name, ['localStorage.getItem', '"ads":true', '"ads":false']);
        localStorage.setItem('config', '{"ads":true}');

        assert.strictEqual(localStorage.getItem('config'), '{"ads":false}', 'Text replaced');
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    } finally {
        delete localStorage.getItem;
    }
});

test('AdGuard rule: replaces the text decoded by TextDecoder', (assert) => {
    // eslint-disable-next-line max-len
    // chatgpt.com#%#//scriptlet('trusted-replace-outbound-text', 'TextDecoder.prototype.decode', '"type":"ads","visibility":{"status":"allowed"', '"type":"ads","visibility":{"status":"hidden"')
    runScriptlet(name, [
        'TextDecoder.prototype.decode',
        '"type":"ads","visibility":{"status":"allowed"',
        '"type":"ads","visibility":{"status":"hidden"',
    ]);
    const bytes = new TextEncoder().encode('{"type":"ads","visibility":{"status":"allowed"}}');

    assert.strictEqual(
        new TextDecoder().decode(bytes),
        '{"type":"ads","visibility":{"status":"hidden"}}',
        'Text replaced',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('AdGuard rule: condition option', (assert) => {
    // eslint-disable-next-line max-len
    // uploadmall.com#%#//scriptlet('trusted-replace-outbound-text', 'atob', '//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', 'data:text/javascript;base64,KCk9Pnt9'),
    // with `condition`
    runScriptlet(name, [
        'atob',
        '//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
        'data:text/javascript;base64,KCk9Pnt9',
        '',
        '',
        '',
        'condition',
        '/\\.src = /',
    ]);
    // the test code is inlined in the test page, so it cannot contain a closing script tag
    const script = 's.src = "//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";';
    const url = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';

    assert.strictEqual(
        atob(btoa(script)),
        's.src = "data:text/javascript;base64,KCk9Pnt9";',
        'Text which matches the condition replaced',
    );
    assert.strictEqual(atob(btoa(url)), url, 'Text which does not match the condition not replaced');
});

test('AdGuard rule: invalid condition, rule is not applied', (assert) => {
    runScriptlet(name, ['atob', 'foo', 'bar', '', '', '', 'condition', '/[/']);

    assert.strictEqual(atob(btoa('foo')), 'foo', 'Text not replaced');
    assert.strictEqual(window.hit, undefined, 'hit function not fired');
});

test('uBO rule: condition, text replaced with an empty string', (assert) => {
    // animefire.io##+js(trusted-replace-outbound-text, atob, /.+/, , condition, /www|cloudfront/)
    runScriptlet('ubo-trusted-replace-outbound-text.js', ['atob', '/.+/', '', 'condition', '/www|cloudfront/']);
    const script = 'https://d1abc.cloudfront.net/ads.js';
    const config = '{"player":"main"}';

    assert.strictEqual(atob(btoa(script)), '', 'Text which matches the condition replaced');
    assert.strictEqual(atob(btoa(config)), config, 'Text which does not match the condition not replaced');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('uBO rule: quotes escaped by the converter are unescaped', (assert) => {
    // eslint-disable-next-line max-len
    // infinityscans.xyz,infinityscans.net,infinityscans.org##+js(trusted-replace-outbound-text, atob, window.matchMedia('(display-mode: standalone)').matches, true),
    // converted by AGTree to `window.matchMedia(\'(display-mode: standalone)\').matches`
    runScriptlet('ubo-trusted-replace-outbound-text', [
        'atob',
        "window.matchMedia(\\'(display-mode: standalone)\\').matches",
        'true',
    ]);
    const code = "if (window.matchMedia('(display-mode: standalone)').matches) { showApp(); }";

    assert.strictEqual(atob(btoa(code)), 'if (true) { showApp(); }', 'Text replaced');
});

test('uBO rule: a string pattern is replaced once', (assert) => {
    // shein.com##+js(trusted-replace-outbound-text, String.prototype.trim, iframe, nonframe)
    runScriptlet('ubo-trusted-replace-outbound-text.js', ['String.prototype.trim', 'iframe', 'nonframe']);

    assert.strictEqual(' iframe iframe '.trim(), 'nonframe iframe', 'First occurrence replaced');
    assert.strictEqual(' div '.trim(), 'div', 'Other text not replaced');
});

test('uBO rule: String.prototype.trim, which the scriptlet may use itself', (assert) => {
    // funradio.fr##+js(trusted-replace-outbound-text, String.prototype.trim, /^STOP_GTM_WARNING$/, IMA_ADS)
    runScriptlet('ubo-trusted-replace-outbound-text.js', [
        'String.prototype.trim',
        '/^STOP_GTM_WARNING$/',
        'IMA_ADS',
    ]);

    assert.strictEqual(' STOP_GTM_WARNING '.trim(), 'IMA_ADS', 'Text replaced');
    assert.strictEqual(' STOP_GTM_WARNING_2 '.trim(), 'STOP_GTM_WARNING_2', 'Other text not replaced');
});

test('uBO rule: String.prototype.concat, which the scriptlet may use itself', (assert) => {
    // eslint-disable-next-line max-len
    // th.gl##+js(trusted-replace-outbound-text, String.prototype.concat, /.+/, adBlockerDismissed, condition, adBlockerDismissed_)
    runScriptlet('ubo-trusted-replace-outbound-text.js', [
        'String.prototype.concat',
        '/.+/',
        'adBlockerDismissed',
        'condition',
        'adBlockerDismissed_',
    ]);

    assert.strictEqual('adBlockerDismissed_'.concat('1700000000'), 'adBlockerDismissed', 'Text replaced');
    assert.strictEqual('user_'.concat('42'), 'user_42', 'Other text not replaced');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('uBO rule: Array.prototype.shift, a result which is not a string is returned as it is', (assert) => {
    // rufiiguta.com##+js(trusted-replace-outbound-text, Array.prototype.shift, /^.+$/s, '', condition, https)
    runScriptlet('ubo-trusted-replace-outbound-text.js', [
        'Array.prototype.shift',
        '/^.+$/s',
        '',
        'condition',
        'https',
    ]);
    const nested = ['https://example.org/'];

    assert.strictEqual(['https://example.org/ad.js', 'b'].shift(), '', 'Text replaced');
    assert.strictEqual(['local.js', 'b'].shift(), 'local.js', 'Other text not replaced');
    // uBO throws `TypeError` to the page then, as it calls `replace()` of the array
    assert.strictEqual([nested].shift(), nested, 'Array returned as it is');
});

test('uBO rule: Headers.prototype.get, null is returned as it is', (assert) => {
    // eslint-disable-next-line max-len
    // omuzaani.me##+js(trusted-replace-outbound-text, Headers.prototype.get, /.+/, image/png., condition, /^text\/plain;charset=UTF-8$/)
    runScriptlet('ubo-trusted-replace-outbound-text.js', [
        'Headers.prototype.get',
        '/.+/',
        'image/png.',
        'condition',
        '/^text\\/plain;charset=UTF-8$/',
    ]);
    const headers = new Headers({ 'Content-Type': 'text/plain;charset=UTF-8', 'X-Id': '42' });

    assert.strictEqual(headers.get('Content-Type'), 'image/png.', 'Text replaced');
    assert.strictEqual(headers.get('X-Id'), '42', 'Other text not replaced');
    assert.strictEqual(headers.get('X-Missing'), null, 'null returned as it is');
});

test('uBO rule: decodeURIComponent', (assert) => {
    // pahe.ink##+js(trusted-replace-outbound-text, decodeURIComponent, /^__x[0-9a-f]{7}$/, document)
    runScriptlet('ubo-trusted-replace-outbound-text.js', ['decodeURIComponent', '/^__x[0-9a-f]{7}$/', 'document']);

    assert.strictEqual(decodeURIComponent('__x1a2b3c4'), 'document', 'Text replaced');
    assert.strictEqual(decodeURIComponent('a%20b'), 'a b', 'Other text not replaced');
});

test('uBO rule: encoding option', (assert) => {
    // No uBO rule uses the option
    runScriptlet('ubo-trusted-replace-outbound-text.js', [
        'Array.prototype.join',
        'disable_ads:false',
        'disable_ads:true',
        'encoding',
        'base64',
    ]);
    const encoded = btoa('disable_ads:false');
    // `atob()` decodes base64 text with whitespaces and without padding as well
    const unpadded = `${btoa('ads:1').replace(/=+$/, '')} `;

    assert.strictEqual(atob([encoded].join('')), 'disable_ads:true', 'Decoded text replaced');
    assert.strictEqual([unpadded].join(''), unpadded, 'Text which is not replaced returned as it is');
    assert.strictEqual(['!!!'].join(''), '!!!', 'Text which cannot be decoded returned as it is');
});

test('uBO rule: json: replacement', (assert) => {
    // No uBO rule uses JSON replacement
    runScriptlet('ubo-trusted-replace-outbound-text.js', ['atob', '/"ads":\\d+/', 'json:"\\"ads\\":0"']);

    assert.strictEqual(atob(btoa('{"ads":3}')), '{"ads":0}', 'Text replaced with the parsed value');
});

test('uBO rule: invalid regular expression, rule is not applied', (assert) => {
    // uBO would match any text by it, i.e. insert the replacement before any text
    runScriptlet('ubo-trusted-replace-outbound-text.js', ['atob', '/[/', 'bar']);

    assert.strictEqual(atob(btoa('foo')), 'foo', 'Text not replaced');
    assert.strictEqual(window.hit, undefined, 'hit function not fired');
});
