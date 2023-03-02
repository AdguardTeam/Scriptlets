/* eslint-disable no-underscore-dangle, no-restricted-globals, vars-on-top, no-var */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'prevent-element-src-loading';

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    if (window.elem) {
        window.elem.remove();
    }
    clearGlobalProps('hit', '__debug', 'elem');
};

const SET_SRC_ATTRIBUTE = 'setSrcAttribute';
const SET_SRC_PROP = 'srcProp';
const ONERROR_PROP = 'onerrorProp';
const ERROR_LISTENER = 'addErrorListener';

// Create tag using combination of different methods
const createTestTag = (assert, nodeName, url, srcMethod, onerrorMethod) => {
    const done = assert.async();
    const node = document.createElement(nodeName);

    // Set url with .src or .setAttribute
    switch (srcMethod) {
        case SET_SRC_PROP: {
            node.src = url;
            break;
        }
        case SET_SRC_ATTRIBUTE: {
            node.setAttribute('src', url);
            break;
        }
        default:
        // do nothing
    }

    // Set onerror callback with .onerror or .addEventListener
    const onerrorHandler = () => assert.ok(false, '.onerror should not have been triggered');
    switch (onerrorMethod) {
        case ONERROR_PROP: {
            node.onerror = onerrorHandler;
            break;
        }
        case ERROR_LISTENER: {
            node.addEventListener('error', onerrorHandler);
            break;
        }
        default:
        // do nothing
    }

    node.onload = () => {
        assert.ok(true, '.onload triggered');
        done();
    };

    document.body.appendChild(node);
    return node;
};

const srcMockData = {
    script: 'data:text/javascript;base64,KCk9Pnt9',
    img: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==',
    iframe: 'data:text/html;base64, PGRpdj48L2Rpdj4=',
};
const TEST_FILES_DIR = './test-files/';
const TEST_SCRIPT01_FILENAME = 'test-script01.js';
const TEST_SCRIPT02_FILENAME = 'test-script02.js';
const TEST_IMAGE_FILENAME = 'test-image.jpeg';
const TEST_IFRAME_FILENAME = 'empty.html';
const SCRIPT_TARGET_NODE = 'script';
const IMG_TARGET_NODE = 'img';
const IFRAME_TARGET_NODE = 'iframe';

module(name, { beforeEach, afterEach });

test('setAttribute, matching script element', (assert) => {
    const SOURCE_PATH = `${TEST_FILES_DIR}${TEST_SCRIPT01_FILENAME}`;
    const scriptletArgs = [SCRIPT_TARGET_NODE, TEST_SCRIPT01_FILENAME];
    runScriptlet(name, scriptletArgs);

    var elem = createTestTag(
        assert,
        SCRIPT_TARGET_NODE,
        SOURCE_PATH,
        SET_SRC_ATTRIBUTE, ONERROR_PROP,
    );
    assert.strictEqual(elem.src, srcMockData[SCRIPT_TARGET_NODE], 'src was mocked');
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('setAttribute, matching image element', (assert) => {
    const SOURCE_PATH = `${TEST_FILES_DIR}${TEST_IMAGE_FILENAME}`;
    const scriptletArgs = [IMG_TARGET_NODE, TEST_IMAGE_FILENAME];
    runScriptlet(name, scriptletArgs);

    window.elem = createTestTag(
        assert,
        IMG_TARGET_NODE,
        SOURCE_PATH,
        SET_SRC_ATTRIBUTE,
        ONERROR_PROP,
    );
    assert.strictEqual(window.elem.src, srcMockData[IMG_TARGET_NODE], 'src was mocked');
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('setAttribute, matching iframe element', (assert) => {
    const SOURCE_PATH = `${TEST_FILES_DIR}${TEST_IFRAME_FILENAME}`;
    const scriptletArgs = [IFRAME_TARGET_NODE, 'empty.html'];
    runScriptlet(name, scriptletArgs);

    window.elem = createTestTag(
        assert,
        IFRAME_TARGET_NODE,
        SOURCE_PATH,
        SET_SRC_ATTRIBUTE,
        ONERROR_PROP,
    );
    assert.ok(
        window.elem.src === srcMockData[IFRAME_TARGET_NODE]
        // there is no space in Firefox 52
        || window.elem.src === srcMockData[IFRAME_TARGET_NODE].split(' ').join(''),
        'src was mocked',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('src prop, matching script element', (assert) => {
    const SOURCE_PATH = `${TEST_FILES_DIR}${TEST_SCRIPT01_FILENAME}`;
    const scriptletArgs = [SCRIPT_TARGET_NODE, TEST_SCRIPT01_FILENAME];
    runScriptlet(name, scriptletArgs);

    var elem = createTestTag(
        assert,
        SCRIPT_TARGET_NODE,
        SOURCE_PATH,
        SET_SRC_PROP,
        ONERROR_PROP,
    );
    assert.strictEqual(elem.src, srcMockData[SCRIPT_TARGET_NODE], 'src was mocked');
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('src prop, matching image element', (assert) => {
    const SOURCE_PATH = `${TEST_FILES_DIR}${TEST_IMAGE_FILENAME}`;
    const scriptletArgs = [IMG_TARGET_NODE, TEST_IMAGE_FILENAME];
    runScriptlet(name, scriptletArgs);

    window.elem = createTestTag(
        assert,
        IMG_TARGET_NODE,
        SOURCE_PATH,
        SET_SRC_PROP,
        ONERROR_PROP,
    );
    assert.strictEqual(window.elem.src, srcMockData[IMG_TARGET_NODE], 'src was mocked');
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('src prop, matching iframe element', (assert) => {
    const SOURCE_PATH = `${TEST_FILES_DIR}${TEST_IFRAME_FILENAME}`;
    const scriptletArgs = [IFRAME_TARGET_NODE, 'empty.html'];
    runScriptlet(name, scriptletArgs);

    window.elem = createTestTag(
        assert,
        IFRAME_TARGET_NODE,
        SOURCE_PATH,
        SET_SRC_PROP,
        ONERROR_PROP,
    );
    assert.ok(
        window.elem.src === srcMockData[IFRAME_TARGET_NODE]
        // there is no space in Firefox 52
        || window.elem.src === srcMockData[IFRAME_TARGET_NODE].split(' ').join(''),
        'src was mocked',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('setAttribute, mismatching element', (assert) => {
    const SOURCE_PATH = `${TEST_FILES_DIR}${TEST_SCRIPT02_FILENAME}`;
    const scriptletArgs = [SCRIPT_TARGET_NODE, 'not-test-script.js'];
    runScriptlet(name, scriptletArgs);

    window.elem = createTestTag(
        assert,
        SCRIPT_TARGET_NODE,
        SOURCE_PATH,
        SET_SRC_ATTRIBUTE,
        ONERROR_PROP,
    );
    assert.ok(window.elem.src.indexOf(TEST_SCRIPT02_FILENAME) !== -1, 'src was NOT mocked');
    assert.strictEqual(window.hit, undefined, 'hit should NOT fire');
});

test('src prop, mismatching element', (assert) => {
    const SOURCE_PATH = `${TEST_FILES_DIR}${TEST_SCRIPT02_FILENAME}`;
    const scriptletArgs = [SCRIPT_TARGET_NODE, 'not-test-script.js'];
    runScriptlet(name, scriptletArgs);

    window.elem = createTestTag(
        assert,
        SCRIPT_TARGET_NODE,
        SOURCE_PATH,
        SET_SRC_PROP,
        ONERROR_PROP,
    );
    assert.ok(window.elem.src.indexOf(TEST_SCRIPT02_FILENAME) !== -1, 'src was NOT mocked');
    assert.strictEqual(window.hit, undefined, 'hit should NOT fire');
});

test('setAttribute, falsy arguments', (assert) => {
    const scriptletArgs = [SCRIPT_TARGET_NODE, 'test-string'];
    runScriptlet(name, scriptletArgs);

    const node = document.createElement(SCRIPT_TARGET_NODE);
    node.setAttribute(null, undefined);
    document.body.appendChild(node);
    assert.strictEqual(node.getAttribute('null'), 'undefined', 'falsy attr value passed');
    node.remove();

    const node2 = document.createElement(SCRIPT_TARGET_NODE);
    node2.setAttribute(null, 0);
    document.body.appendChild(node2);
    assert.strictEqual(node2.getAttribute('null'), '0', 'falsy attr value passed');
    node2.remove();

    assert.strictEqual(window.hit, undefined, 'hit should NOT fire');
});

test('setAttribute, prevent error trigger, srcProp & onerrorProp', (assert) => {
    const BAD_URL = 'bad_url';
    const scriptletArgs = [SCRIPT_TARGET_NODE, BAD_URL];
    runScriptlet(name, scriptletArgs);

    var elem = createTestTag(assert, SCRIPT_TARGET_NODE, BAD_URL, SET_SRC_PROP, ONERROR_PROP);
    elem.onerror();

    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('setAttribute, prevent error trigger, setSrcAttribute & onerrorProp', (assert) => {
    const BAD_URL = 'bad_url';
    const scriptletArgs = [SCRIPT_TARGET_NODE, BAD_URL];
    runScriptlet(name, scriptletArgs);

    var elem = createTestTag(
        assert,
        SCRIPT_TARGET_NODE,
        BAD_URL,
        SET_SRC_ATTRIBUTE,
        ONERROR_PROP,
    );
    elem.onerror();

    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('setAttribute, prevent error trigger, srcProp & addErrorListener', (assert) => {
    const BAD_URL = 'bad_url';
    const scriptletArgs = [SCRIPT_TARGET_NODE, BAD_URL];
    runScriptlet(name, scriptletArgs);

    var elem = createTestTag(assert, SCRIPT_TARGET_NODE, BAD_URL, SET_SRC_PROP, ERROR_LISTENER);
    dispatchEvent.call(elem, new Event('error'));

    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('setAttribute, prevent error trigger, setSrcAttribute & addErrorListener', (assert) => {
    const BAD_URL = 'bad_url';
    const scriptletArgs = [SCRIPT_TARGET_NODE, BAD_URL];
    runScriptlet(name, scriptletArgs);

    var elem = createTestTag(
        assert,
        SCRIPT_TARGET_NODE,
        BAD_URL,
        SET_SRC_ATTRIBUTE,
        ERROR_LISTENER,
    );
    dispatchEvent.call(elem, new Event('error'));

    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('setAttribute, matching script element, test addEventListener', (assert) => {
    const SOURCE_PATH = `${TEST_FILES_DIR}${TEST_SCRIPT01_FILENAME}`;
    const scriptletArgs = [SCRIPT_TARGET_NODE, TEST_SCRIPT01_FILENAME];
    runScriptlet(name, scriptletArgs);

    var elem = createTestTag(
        assert,
        SCRIPT_TARGET_NODE,
        SOURCE_PATH,
        SET_SRC_ATTRIBUTE, ONERROR_PROP,
    );
    // It's intentionally used without a specific target (like window/document) before addEventListener
    // because in such case, thisArg in the addEventListenerWrapper is undefined
    // https://github.com/AdguardTeam/Scriptlets/issues/270
    addEventListener('visibilitychange', () => {});
    assert.strictEqual(elem.src, srcMockData[SCRIPT_TARGET_NODE], 'src was mocked');
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});
