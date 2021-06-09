/* eslint-disable no-underscore-dangle, no-console */
import { runScriptlet, clearGlobalProps } from '../helpers';
import { startsWith } from '../../src/helpers/string-utils';

const { test, module } = QUnit;
const name = 'prevent-fetch';

const FETCH_OBJECTS_PATH = './fetch-objects';
const nativeFetch = fetch;
const nativeConsole = console.log;
const nativeResponseJson = Response.prototype.json; // eslint-disable-line compat/compat

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
    fetch = nativeFetch; // eslint-disable-line no-global-assign
    console.log = nativeConsole;
    Response.prototype.json = nativeResponseJson; // eslint-disable-line compat/compat
};

module(name, { beforeEach, afterEach });

const isSupported = typeof fetch !== 'undefined' && typeof Proxy !== 'undefined';
if (!isSupported) {
    // run only this one test if browser does not support it
    test.only('not supported', (assert) => {
        assert.ok(true, 'Browser does not support it');
    });
}

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const uboParams = {
        name: 'ubo-no-fetch-if.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByUboParams = window.scriptlets.invoke(uboParams);

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

test('simple fetch - no args - logging', async (assert) => {
    const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/test01.json`;
    const TEST_METHOD = 'POST';
    const init = {
        method: TEST_METHOD,
    };
    const expectedJson = {
        a1: 1,
        b2: 'test',
        c3: 3,
    };
    const done = assert.async();

    // mock console.log function for log checking
    console.log = function log(input) {
        if (input.indexOf('trace') > -1) {
            return;
        }
        const EXPECTED_LOG_STR_START = `fetch( url:"${INPUT_JSON_PATH}" method:"${TEST_METHOD}"`;
        assert.ok(startsWith(input, EXPECTED_LOG_STR_START), 'console.hit input');
    };

    // no args -> just logging, no preventing
    runScriptlet(name);

    const response = await fetch(INPUT_JSON_PATH, init);
    const actualJson = await response.json();

    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    assert.deepEqual(actualJson, expectedJson);
    done();
});

test('fetch request - no args - logging', async (assert) => {
    const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/test01.json`;
    const inputRequest = new Request(INPUT_JSON_PATH); // eslint-disable-line compat/compat
    const expectedJson = {
        a1: 1,
        b2: 'test',
        c3: 3,
    };
    const done = assert.async();

    // mock console.log function for log checking
    console.log = function log(input) {
        if (input.indexOf('trace') > -1) {
            return;
        }
        const strToCheck = INPUT_JSON_PATH.slice(1);
        assert.ok(input.indexOf(strToCheck) > -1, 'console.hit input');
    };

    // no args -> just logging, no preventing
    runScriptlet(name);

    const response = await fetch(inputRequest);
    const actualJson = await response.json();

    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    assert.deepEqual(actualJson, expectedJson);
    done();
});

test('prevent any fetch call', async (assert) => {
    const INPUT_JSON_PATH_1 = `${FETCH_OBJECTS_PATH}/test01.json`;
    const inputRequest1 = new Request(INPUT_JSON_PATH_1); // eslint-disable-line compat/compat

    const INPUT_JSON_PATH_2 = `${FETCH_OBJECTS_PATH}/test02.json`;
    const init2 = {
        method: 'GET',
    };
    // eslint-disable-next-line compat/compat
    const inputRequest2 = new Request(INPUT_JSON_PATH_2, init2);

    // match any fetch
    runScriptlet(name, ['*']);
    const done = assert.async(2);

    const response1 = await fetch(inputRequest1);

    assert.equal(response1.body, null, 'first response is mocked');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    done();
    clearGlobalProps('hit');

    const response2 = await fetch(inputRequest2);

    assert.equal(response2.body, null, 'second response is mocked');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    done();
});

test('simple fetch - match single pair prop', async (assert) => {
    const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/test03.json`;
    const options = {
        method: 'HEAD',
    };

    runScriptlet(name, ['method:HEAD']);
    const done = assert.async();

    const response = await fetch(INPUT_JSON_PATH, options);

    assert.equal(response.body, null, 'Response is mocked');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    done();
});

test('simple fetch - match few props', async (assert) => {
    const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/test04.json`;
    const init = {
        method: 'POST',
    };

    runScriptlet(name, ['/test04/ method:POST']);
    const done = assert.async();

    const response = await fetch(INPUT_JSON_PATH, init);

    assert.equal(response.body, null, 'Response is mocked');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    done();
});

test('fetch request - match few props', async (assert) => {
    const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/test02.json`;
    const init = {
        method: 'HEAD',
    };
    const inputRequest = new Request(INPUT_JSON_PATH, init); // eslint-disable-line compat/compat

    runScriptlet(name, ['/02\\.json/ method:/GET|HEAD/']);
    const done = assert.async();

    const response = await fetch(inputRequest);

    assert.equal(response.body, null, 'Response is mocked');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    done();
});

test('simple fetch - no match props - no prevent', async (assert) => {
    const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/test01.json`;
    const init = {
        method: 'POST',
    };
    const expectedJson = {
        a1: 1,
        b2: 'test',
        c3: 3,
    };

    // no url match
    runScriptlet(name, ['/test06/ method:POST']);
    const done = assert.async();

    const response = await fetch(INPUT_JSON_PATH, init);
    const actualJson = await response.json();

    assert.deepEqual(actualJson, expectedJson);
    assert.strictEqual(window.hit, undefined, 'hit should not fire');
    done();
});

test('fetch request - no match at all', async (assert) => {
    const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/test01.json`;
    const init = {
        method: 'GET',
    };
    const inputRequest = new Request(INPUT_JSON_PATH, init); // eslint-disable-line compat/compat
    const expectedJson = {
        a1: 1,
        b2: 'test',
        c3: 3,
    };

    // no match at all
    runScriptlet(name, ['/06\\.json/ method:/HEAD|POST/']);
    const done = assert.async();

    const response = await fetch(inputRequest);
    const actualJson = await response.json();

    assert.deepEqual(actualJson, expectedJson);
    assert.strictEqual(window.hit, undefined, 'hit should not fire');
    done();
});
