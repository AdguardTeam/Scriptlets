/* eslint-disable no-underscore-dangle, no-console */
import {
    runScriptlet,
    clearGlobalProps,
    useFirefoxStackTraceFormat,
    saveStorageMethods,
} from '../helpers';

const { test, module } = QUnit;
const name = 'trusted-replace-outbound-text';

const nativeConsole = console.log;
const nativeAtob = atob;
const nativeJSONStringify = JSON.stringify;
const nativeArrayJoin = Array.prototype.join;

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
    restoreStorage();
};

module(name, { beforeEach, afterEach });

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
