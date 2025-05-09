/* eslint-disable no-underscore-dangle */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'abort-on-stack-trace';
const PROPERTY = 'Ya';
const CHAIN_PROPERTY = 'Ya.videoAds';

const changingProps = [PROPERTY, 'hit', '__debug', 'onerror', 'testPassed'];

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps(...changingProps);
};

module(name, { beforeEach, afterEach });

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const uboParams = {
        name: 'ubo-aost',
        engine: 'test',
        verbose: true,
    };
    const abpParams = {
        name: 'abp-abort-on-stack-trace',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByUboParams = window.scriptlets.invoke(uboParams);
    const codeByAbpParams = window.scriptlets.invoke(abpParams);

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
    assert.strictEqual(codeByAdgParams, codeByAbpParams, 'abp name - ok');
});

test('simple, matches stack', (assert) => {
    window[PROPERTY] = 'value';
    const stackMatch = 'abort-on-stack';
    const scriptletArgs = [PROPERTY, stackMatch];
    runScriptlet(name, scriptletArgs);

    assert.throws(
        () => window[PROPERTY],
        /ReferenceError/,
        `Reference error thrown when trying to access property ${PROPERTY}`,
    );
    assert.throws(
        // eslint-disable-next-line no-return-assign
        () => window[PROPERTY] = 'new value',
        /ReferenceError/,
        `Reference error thrown when trying to reassign property ${PROPERTY}`,
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('simple, matches stack with an empty object in chain', (assert) => {
    const PROPERTY = 'window.aaa.bbb';
    const stackArg = 'abort-on-stack-trace';
    window.aaa = {
        bbb: 'value',
    };
    const scriptletArgs = [PROPERTY, stackArg];
    runScriptlet(name, scriptletArgs);

    assert.throws(
        () => window.aaa.bbb,
        /ReferenceError/,
        `Reference error thrown when trying to access property ${PROPERTY}`,
    );
    assert.throws(
        // eslint-disable-next-line no-return-assign
        () => window.aaa.bbb = 'new value',
        /ReferenceError/,
        `Reference error thrown when trying to reassign property ${PROPERTY}`,
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('simple, does NOT match stack', (assert) => {
    window[PROPERTY] = 'value';
    const noStackMatch = 'no_match.js';
    const scriptletArgs = [PROPERTY, noStackMatch];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(
        window[PROPERTY],
        'value',
        'Property is accessible',
    );

    window[PROPERTY] = 'reassigned';
    assert.strictEqual(
        window[PROPERTY],
        'reassigned',
        'Property is writeable',
    );

    assert.strictEqual(window.hit, undefined, 'hit should NOT fire');
});

test('simple, does NOT work - invalid regexp pattern', (assert) => {
    window[PROPERTY] = 'value';
    const stackArg = '/*/';
    const scriptletArgs = [PROPERTY, stackArg];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(window[PROPERTY], 'value', 'Property is accessible');

    window[PROPERTY] = 'reassigned';
    assert.strictEqual(window[PROPERTY], 'reassigned', 'Property is writeable');

    assert.strictEqual(window.hit, undefined, 'hit should NOT fire');
});

test('simple, matches stack of our own script', (assert) => {
    window[PROPERTY] = 'value';
    const noStackMatch = 'abortOnStackTrace';
    const scriptletArgs = [PROPERTY, noStackMatch];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(
        window[PROPERTY],
        'value',
        'Property is accessible',
    );

    window[PROPERTY] = 'reassigned';
    assert.strictEqual(
        window[PROPERTY],
        'reassigned',
        'Property is writeable',
    );

    assert.strictEqual(window.hit, undefined, 'hit should NOT fire');
});

test('dot notation, matches stack', (assert) => {
    window.Ya = {
        videoAds: 'value',
    };
    const stackMatch = 'abort-on-stack';
    const scriptletArgs = [CHAIN_PROPERTY, stackMatch];
    runScriptlet(name, scriptletArgs);

    assert.throws(
        () => window.Ya.videoAds,
        /ReferenceError/,
        `Reference error thrown when trying to access property ${PROPERTY}`,
    );

    assert.throws(
        // eslint-disable-next-line no-return-assign
        () => window.Ya.videoAds = 'new value',
        /ReferenceError/,
        `Reference error thrown when trying to reassign property ${PROPERTY}`,
    );

    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('dot notation, does NOT match stack', (assert) => {
    window.Ya = {
        videoAds: 'value',
    };
    const stackMatch = 'no_match.js';
    const scriptletArgs = [CHAIN_PROPERTY, stackMatch];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(
        window.Ya.videoAds,
        'value',
        'Property is accessible',
    );

    window.Ya.videoAds = 'reassigned';
    assert.strictEqual(
        window.Ya.videoAds,
        'reassigned',
        'Property is writeable',
    );

    assert.strictEqual(window.hit, undefined, 'hit should NOT fire');
});

test('dot notation, matches stack of our own script', (assert) => {
    window.Ya = {
        videoAds: 'value',
    };
    const stackMatch = 'abortOnStackTrace';
    const scriptletArgs = [CHAIN_PROPERTY, stackMatch];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(
        window.Ya.videoAds,
        'value',
        'Property is accessible',
    );

    window.Ya.videoAds = 'reassigned';
    assert.strictEqual(
        window.Ya.videoAds,
        'reassigned',
        'Property is writeable',
    );

    assert.strictEqual(window.hit, undefined, 'hit should NOT fire');
});

test('dot notation deferred definition, matches stack', (assert) => {
    window.Ya = {};
    window.Ya.videoAds = 'value';
    const stackMatch = 'abort-on-stack';
    const scriptletArgs = [CHAIN_PROPERTY, stackMatch];
    runScriptlet(name, scriptletArgs);

    assert.throws(
        () => window.Ya.videoAds,
        /ReferenceError/,
        `Reference error thrown when trying to access property ${PROPERTY}`,
    );
    assert.throws(
        // eslint-disable-next-line no-return-assign
        () => window.Ya.videoAds = 'new value',
        /ReferenceError/,
        `Reference error thrown when trying to reassign property ${PROPERTY}`,
    );

    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('dot notation deferred definition, does NOT match stack', (assert) => {
    window.Ya = {};
    window.Ya.videoAds = 'value';
    const stackMatch = 'no_match.js';
    const scriptletArgs = [CHAIN_PROPERTY, stackMatch];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(
        window.Ya.videoAds,
        'value',
        'Property is accessible',
    );

    window.Ya.videoAds = 'reassigned';
    assert.strictEqual(
        window.Ya.videoAds,
        'reassigned',
        'Property is writeable',
    );

    assert.strictEqual(window.hit, undefined, 'hit should NOT fire');
});

test('dot notation deferred definition, matches stack of our own script', (assert) => {
    window.Ya = {};
    window.Ya.videoAds = 'value';
    const stackMatch = 'abortOnStackTrace';
    const scriptletArgs = [CHAIN_PROPERTY, stackMatch];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(
        window.Ya.videoAds,
        'value',
        'Property is accessible',
    );

    window.Ya.videoAds = 'reassigned';
    assert.strictEqual(
        window.Ya.videoAds,
        'reassigned',
        'Property is writeable',
    );

    assert.strictEqual(window.hit, undefined, 'hit should NOT fire');
});

test('Protected from infinite loop when prop is used in a helper', (assert) => {
    const property = 'RegExp';
    const stackMatch = 'no_match.js';
    const scriptletArgs = [property, stackMatch];
    runScriptlet(name, scriptletArgs);

    // eslint-disable-next-line prefer-regex-literals
    const regExpStr = new RegExp('test').toString();

    assert.strictEqual(regExpStr, '/test/', 'Property is accessible');
    assert.strictEqual(window.hit, undefined, 'hit should NOT fire');
});

test('abort Math.random, injected script', (assert) => {
    const property = 'Math.random';
    const stackMatch = 'injectedScript';
    const scriptletArgs = [property, stackMatch];
    runScriptlet(name, scriptletArgs);

    window.testPassed = false;
    const scriptElement = document.createElement('script');
    scriptElement.type = 'text/javascript';
    // set window.testPassed to true if script is aborted
    // eslint-disable-next-line max-len
    scriptElement.innerText = 'try { Math.random(); } catch(error) { window.testPassed = true; console.log("Script aborted:", error); }';
    document.body.appendChild(scriptElement);
    scriptElement.parentNode.removeChild(scriptElement);

    assert.strictEqual(window.testPassed, true, 'testPassed set to true, script has been aborted');
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('abort Math.ceil, injected script with line number', (assert) => {
    const property = 'Math.ceil';
    const stackMatch = 'injectedScript:1';
    const scriptletArgs = [property, stackMatch];
    runScriptlet(name, scriptletArgs);

    window.testPassed = false;
    const scriptElement = document.createElement('script');
    scriptElement.type = 'text/javascript';
    // set window.testPassed to true if script is aborted
    // eslint-disable-next-line max-len
    scriptElement.innerText = 'try { Math.ceil(2.1); } catch(error) { window.testPassed = true; console.log("Script aborted:", error); }';
    document.body.appendChild(scriptElement);
    scriptElement.parentNode.removeChild(scriptElement);

    assert.strictEqual(window.testPassed, true, 'testPassed set to true, script has been aborted');
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('abort Math.floor, injected script with line number regexp', (assert) => {
    const property = 'Math.floor';
    const stackMatch = '/injectedScript:\\d:\\d/';
    const scriptletArgs = [property, stackMatch];
    runScriptlet(name, scriptletArgs);

    window.testPassed = false;
    const scriptElement = document.createElement('script');
    scriptElement.type = 'text/javascript';
    // set window.testPassed to true if script is aborted
    // eslint-disable-next-line max-len
    scriptElement.innerText = 'try { Math.floor(1.1); } catch(error) { window.testPassed = true; console.log("Script aborted:", error); }';
    document.body.appendChild(scriptElement);
    scriptElement.parentNode.removeChild(scriptElement);

    assert.strictEqual(window.testPassed, true, 'testPassed set to true, script has been aborted');
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('abort Math.pow, injected script with line number regexp, two scripts abort only first', (assert) => {
    const property = 'Math.pow';
    const stackMatch = '/injectedScript:\\d:1/';
    const scriptletArgs = [property, stackMatch];
    runScriptlet(name, scriptletArgs);

    window.testPassed = false;
    const scriptElement1 = document.createElement('script');
    scriptElement1.type = 'text/javascript';
    // set window.testPassed to true if script is aborted
    // eslint-disable-next-line max-len
    scriptElement1.innerText = 'try { Math.pow(2, 2); } catch(error) { window.testPassed = true; console.log("Script aborted:", error); }';
    document.body.appendChild(scriptElement1);
    scriptElement1.parentNode.removeChild(scriptElement1);

    const scriptElement2 = document.createElement('script');
    scriptElement2.type = 'text/javascript';
    // This script should not be aborted, so set window.testPassed to false if script is aborted
    // eslint-disable-next-line max-len
    scriptElement2.innerText = 'try { (()=>{ const test1 = 1; const test2 = 2; const test3 = 3; const test4 = Math.pow(2, 2); })() } catch(error) { window.testPassed = false; }';
    document.body.appendChild(scriptElement2);
    scriptElement2.parentNode.removeChild(scriptElement2);

    assert.strictEqual(window.testPassed, true, 'testPassed set to true, only first script has been aborted');
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('abort String.fromCharCode, inline script', (assert) => {
    const property = 'String.fromCharCode';
    const stackMatch = 'inlineScript';
    const scriptletArgs = [property, stackMatch];
    runScriptlet(name, scriptletArgs);
    assert.throws(
        () => String.fromCharCode(65),
        /ReferenceError/,
        'Reference error thrown when trying to access property String.fromCharCode',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('abort String.fromCodePoint, inline script line number regexp', (assert) => {
    const property = 'String.fromCodePoint';
    const stackMatch = '/inlineScript:\\d/';
    const scriptletArgs = [property, stackMatch];
    runScriptlet(name, scriptletArgs);
    assert.throws(
        () => String.fromCodePoint(65),
        /ReferenceError/,
        'Reference error thrown when trying to access property String.fromCodePoint',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('abort JSON.parse, inline script line number regexp, two scripts abort only second', (assert) => {
    const property = 'JSON.parse';
    const stackMatch = '/inlineScript:38/';
    const scriptletArgs = [property, stackMatch];
    runScriptlet(name, scriptletArgs);

    let obj = {};

    // This should not be aborted
    try {
        obj = JSON.parse('{"test":true}');
    } catch (error) {
        /* empty */
    }

    assert.throws(
        () => {
            const objString = '{}';
            JSON.parse(objString);
        },
        /ReferenceError/,
        'Reference error thrown when trying to access property JSON.parse',
    );
    assert.strictEqual(obj.test, true, 'obj.test is true');
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('do NOT abort Math.round, test for injected script', (assert) => {
    const property = 'Math.round';
    const stackMatch = 'injectedScript';
    const scriptletArgs = [property, stackMatch];
    runScriptlet(name, scriptletArgs);

    let testPassed = false;
    try {
        const testNumber = Math.round(1.5);
        // eslint-disable-next-line no-console
        console.log('Number:', testNumber);
        testPassed = true;
    } catch (error) {
        // eslint-disable-next-line no-console
        console.log('Something went wrong', error);
    }
    assert.strictEqual(testPassed, true, 'testPassed set to true, script has not been aborted');
    assert.strictEqual(window.hit, undefined, 'hit should NOT fire');
});

test('abort Math.max in injected script, but not abort inline script', (assert) => {
    const property = 'Math.max';
    const stackMatch = 'injectedScript';
    const scriptletArgs = [property, stackMatch];
    runScriptlet(name, scriptletArgs);

    window.testPassed = false;
    const number = Math.max(20, 10);
    if (number) {
        const scriptElement = document.createElement('script');
        scriptElement.type = 'text/javascript';
        // set window.testPassed to true if script is aborted
        // eslint-disable-next-line max-len
        scriptElement.innerText = 'try { Math.max(10, 20); } catch(error) { window.testPassed = true; console.log("Script aborted:", error); }';
        document.body.appendChild(scriptElement);
        scriptElement.parentNode.removeChild(scriptElement);
    }
    assert.strictEqual(window.testPassed, true, 'testPassed set to true, script has been aborted');
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('abort RegExp, matches stack', (assert) => {
    const property = 'RegExp';
    const stackMatch = 'triggerFunc';
    const scriptletArgs = [property, stackMatch];
    runScriptlet(name, scriptletArgs);
    function triggerFunc() {
        // eslint-disable-next-line prefer-regex-literals
        const triggerProp = new RegExp('test');
        return triggerProp;
    }
    assert.throws(
        triggerFunc,
        /ReferenceError/,
        'Reference error thrown when trying to access property RegExp',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('abort document.createElement, matches stack', (assert) => {
    const property = 'document.createElement';
    const stackMatch = 'Object.createElemenTest';
    const scriptletArgs = [property, stackMatch];
    let testPassed = false;

    runScriptlet(name, scriptletArgs);

    function testCreateElement() {
        const regExp = /(\w+)\s(\w+)/;
        const string = 'div a';
        const testString = string.replace(regExp, '$2, $1');
        const div = document.createElement(RegExp.$1);
        div.textContent = testString;
        testPassed = true;
    }

    const matchTestCreateElement = {
        createElemenTest: () => {
            const regExp = /(\w+)\s(\w+)/;
            const string = 'div a';
            const testString = string.replace(regExp, '$2, $1');
            const div = document.createElement(RegExp.$1);
            div.textContent = testString;
        },
    };

    testCreateElement();

    assert.throws(
        matchTestCreateElement.createElemenTest,
        /ReferenceError/,
        `Reference error thrown when trying to access property ${property}`,
    );
    assert.strictEqual(testPassed, true, 'testPassed set to true');
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});
