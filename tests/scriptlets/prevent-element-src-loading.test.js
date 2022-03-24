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

const createTagWithSetAttr = (assert, nodeName, url) => {
    const done = assert.async();

    const node = document.createElement(nodeName);
    node.onload = () => {
        assert.ok(true, '.onload triggered');
        done();
    };
    node.onerror = () => {
        assert.ok(false, '.onerror triggered');
    };
    node.setAttribute('src', url);
    document.body.append(node);
    return node;
};

const createTagWithSrcProp = (assert, nodeName, url) => {
    const done = assert.async();

    const node = document.createElement(nodeName);
    node.onload = () => {
        assert.ok(true, '.onload triggered');
        done();
    };
    node.onerror = () => {
        assert.ok(false, '.onerror triggered');
    };

    node.src = url;
    document.body.append(node);
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

    var elem = createTagWithSetAttr(assert, SCRIPT_TARGET_NODE, SOURCE_PATH);
    assert.strictEqual(elem.src, srcMockData[SCRIPT_TARGET_NODE], 'src was mocked');
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('setAttribute, matching image element', (assert) => {
    const SOURCE_PATH = `${TEST_FILES_DIR}${TEST_IMAGE_FILENAME}`;
    const scriptletArgs = [IMG_TARGET_NODE, TEST_IMAGE_FILENAME];
    runScriptlet(name, scriptletArgs);

    window.elem = createTagWithSetAttr(assert, IMG_TARGET_NODE, SOURCE_PATH);
    assert.strictEqual(window.elem.src, srcMockData[IMG_TARGET_NODE], 'src was mocked');
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('setAttribute, matching iframe element', (assert) => {
    const SOURCE_PATH = `${TEST_FILES_DIR}${TEST_IFRAME_FILENAME}`;
    const scriptletArgs = [IFRAME_TARGET_NODE, 'empty.html'];
    runScriptlet(name, scriptletArgs);

    window.elem = createTagWithSetAttr(assert, IFRAME_TARGET_NODE, SOURCE_PATH);
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

    var elem = createTagWithSrcProp(assert, SCRIPT_TARGET_NODE, SOURCE_PATH);
    assert.strictEqual(elem.src, srcMockData[SCRIPT_TARGET_NODE], 'src was mocked');
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('src prop, matching image element', (assert) => {
    const SOURCE_PATH = `${TEST_FILES_DIR}${TEST_IMAGE_FILENAME}`;
    const scriptletArgs = [IMG_TARGET_NODE, TEST_IMAGE_FILENAME];
    runScriptlet(name, scriptletArgs);

    window.elem = createTagWithSrcProp(assert, IMG_TARGET_NODE, SOURCE_PATH);
    assert.strictEqual(window.elem.src, srcMockData[IMG_TARGET_NODE], 'src was mocked');
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('src prop, matching iframe element', (assert) => {
    const SOURCE_PATH = `${TEST_FILES_DIR}${TEST_IFRAME_FILENAME}`;
    const scriptletArgs = [IFRAME_TARGET_NODE, 'empty.html'];
    runScriptlet(name, scriptletArgs);

    window.elem = createTagWithSrcProp(assert, IFRAME_TARGET_NODE, SOURCE_PATH);
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

    window.elem = createTagWithSetAttr(assert, SCRIPT_TARGET_NODE, SOURCE_PATH);
    assert.ok(window.elem.src.indexOf(TEST_SCRIPT02_FILENAME) !== -1, 'src was NOT mocked');
    assert.strictEqual(window.hit, undefined, 'hit should NOT fire');
});

test('src prop, mismatching element', (assert) => {
    const SOURCE_PATH = `${TEST_FILES_DIR}${TEST_SCRIPT02_FILENAME}`;
    const scriptletArgs = [SCRIPT_TARGET_NODE, 'not-test-script.js'];
    runScriptlet(name, scriptletArgs);

    window.elem = createTagWithSrcProp(assert, SCRIPT_TARGET_NODE, SOURCE_PATH);
    assert.ok(window.elem.src.indexOf(TEST_SCRIPT02_FILENAME) !== -1, 'src was NOT mocked');
    assert.strictEqual(window.hit, undefined, 'hit should NOT fire');
});

test('setAttribute, falsy arguments', (assert) => {
    const scriptletArgs = [SCRIPT_TARGET_NODE, 'test-string'];
    runScriptlet(name, scriptletArgs);

    const node = document.createElement(SCRIPT_TARGET_NODE);
    node.setAttribute(null, undefined);
    document.body.append(node);
    assert.strictEqual(node.getAttribute('null'), 'undefined', 'falsy attr value passed');
    node.remove();

    const node2 = document.createElement(SCRIPT_TARGET_NODE);
    node2.setAttribute(null, 0);
    document.body.append(node2);
    assert.strictEqual(node2.getAttribute('null'), '0', 'falsy attr value passed');
    node2.remove();

    assert.strictEqual(window.hit, undefined, 'hit should NOT fire');
});
