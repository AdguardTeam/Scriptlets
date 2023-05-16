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
    clearGlobalProps('hit', '__debug', 'elem', 'scriptLoaded', 'scriptBlocked');
};

const SET_SRC_ATTRIBUTE = 'setSrcAttribute';
const SET_SRC_PROP = 'srcProp';
const SET_LINK_HREF_ATTRIBUTE = 'linkHrefAttribute';
const SET_LINK_HREF_PROP = 'linkHrefProp';
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
        case SET_LINK_HREF_PROP: {
            node.href = url;
            node.rel = 'preload';
            node.as = 'script';
            break;
        }
        case SET_LINK_HREF_ATTRIBUTE: {
            node.setAttribute('href', url);
            node.setAttribute('rel', 'preload');
            node.setAttribute('as', 'script');
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

const onErrorTestTag = (assert, url, testPassed, shouldLoad) => {
    const done = assert.async();
    // Used in onload event
    window.scriptLoaded = () => {
        if (shouldLoad) {
            testPassed = true;
            assert.strictEqual(testPassed, true, 'onload event fired');
            assert.strictEqual(window.hit, 'FIRED', 'hit fired');
        } else {
            assert.strictEqual(window.hit, undefined, 'hit should NOT fire');
        }
        done();
    };
    // Used in onerror event
    window.scriptBlocked = () => {
        if (shouldLoad) {
            assert.strictEqual(testPassed, true, 'onload event fired');
            assert.strictEqual(window.hit, 'FIRED', 'hit fired');
        } else {
            assert.strictEqual(window.hit, undefined, 'hit should NOT fire');
        }
        done();
    };
    const html = `<script src="${url}" onload="scriptLoaded()" onerror="scriptBlocked()"><\\/script>`;
    const scriptEl = document.createRange().createContextualFragment(html);
    document.body.appendChild(scriptEl);
};

const srcMockData = {
    script: 'data:text/javascript;base64,KCk9Pnt9',
    img: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==',
    iframe: 'data:text/html;base64, PGRpdj48L2Rpdj4=',
    link: 'data:text/plain;base64,',
};
const TEST_FILES_DIR = './test-files/';
const TEST_SCRIPT01_FILENAME = 'test-script01.js';
const TEST_SCRIPT02_FILENAME = 'test-script02.js';
const TEST_IMAGE_FILENAME = 'test-image.jpeg';
const TEST_IFRAME_FILENAME = 'empty.html';
const SCRIPT_TARGET_NODE = 'script';
const IMG_TARGET_NODE = 'img';
const IFRAME_TARGET_NODE = 'iframe';
const LINK_TARGET_NODE = 'link';

module(name, { beforeEach, afterEach });

test('setAttribute, matching script element', (assert) => {
    const SOURCE_PATH = `${TEST_FILES_DIR}${TEST_SCRIPT01_FILENAME}`;
    const scriptletArgs = [SCRIPT_TARGET_NODE, TEST_SCRIPT01_FILENAME];
    runScriptlet(name, scriptletArgs);

    var elem = createTestTag(
        assert,
        SCRIPT_TARGET_NODE,
        SOURCE_PATH,
        SET_SRC_ATTRIBUTE,
        ONERROR_PROP,
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

test('setAttribute, matching link element', (assert) => {
    const SOURCE_PATH = `${TEST_FILES_DIR}${TEST_SCRIPT01_FILENAME}`;
    const scriptletArgs = [LINK_TARGET_NODE, TEST_SCRIPT01_FILENAME];
    runScriptlet(name, scriptletArgs);

    var elem = createTestTag(
        assert,
        LINK_TARGET_NODE,
        SOURCE_PATH,
        SET_LINK_HREF_ATTRIBUTE,
        ONERROR_PROP,
    );
    assert.strictEqual(elem.href, srcMockData[LINK_TARGET_NODE], 'src was mocked');
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

test('src prop, matching link element', (assert) => {
    const SOURCE_PATH = `${TEST_FILES_DIR}${TEST_SCRIPT01_FILENAME}`;
    const scriptletArgs = [LINK_TARGET_NODE, TEST_SCRIPT01_FILENAME];
    runScriptlet(name, scriptletArgs);

    var elem = createTestTag(
        assert,
        LINK_TARGET_NODE,
        SOURCE_PATH,
        SET_LINK_HREF_PROP,
        ONERROR_PROP,
    );
    assert.strictEqual(elem.href, srcMockData[LINK_TARGET_NODE], 'href was mocked');
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
    assert.ok(window.elem.src.includes(TEST_SCRIPT02_FILENAME), 'src was NOT mocked');
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
    assert.ok(window.elem.src.includes(TEST_SCRIPT02_FILENAME), 'src was NOT mocked');
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
        SET_SRC_ATTRIBUTE,
        ONERROR_PROP,
    );
    // It's intentionally used without a specific target (like window/document) before addEventListener
    // because in such case, thisArg in the addEventListenerWrapper is undefined
    // https://github.com/AdguardTeam/Scriptlets/issues/270
    addEventListener('visibilitychange', () => { });
    assert.strictEqual(elem.src, srcMockData[SCRIPT_TARGET_NODE], 'src was mocked');
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('onerror inline, matching node and source', (assert) => {
    const SOURCE_PATH = '/adscript1.js';
    const scriptletArgs = [SCRIPT_TARGET_NODE, SOURCE_PATH];
    var testPassed = false;
    var shouldLoad = true;
    runScriptlet(name, scriptletArgs);

    // onload event should be fired
    onErrorTestTag(assert, SOURCE_PATH, testPassed, shouldLoad);
});

test('onerror inline, do not match node', (assert) => {
    const SOURCE_PATH = '/adscript2.js';
    const scriptletArgs = [LINK_TARGET_NODE, SOURCE_PATH];
    var testPassed = false;
    var shouldLoad = false;
    runScriptlet(name, scriptletArgs);

    // onerror event should be fired
    // and window.hit should not be fired
    onErrorTestTag(assert, SOURCE_PATH, testPassed, shouldLoad);
});

test('onerror inline, do not match source', (assert) => {
    const SOURCE_PATH = '/not-existing-script.js';
    const scriptletArgs = [SCRIPT_TARGET_NODE, 'test.js'];
    var testPassed = false;
    var shouldLoad = false;
    runScriptlet(name, scriptletArgs);

    // onerror event should be fired
    // and window.hit should not be fired
    onErrorTestTag(assert, SOURCE_PATH, testPassed, shouldLoad);
});
