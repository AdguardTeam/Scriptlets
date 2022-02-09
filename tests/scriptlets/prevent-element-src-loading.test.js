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

module(name, { beforeEach, afterEach });

test('setAttribute, matching script element', (assert) => {
    const targetNode = 'script';
    const scriptletArgs = [targetNode, 'test-script01.js'];
    runScriptlet(name, scriptletArgs);

    var elem = createTagWithSetAttr(assert, targetNode, './test-files/test-script01.js');
    assert.strictEqual(elem.src, srcMockData[targetNode], 'src was mocked');
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('setAttribute, matching image element', (assert) => {
    const targetNode = 'img';
    const scriptletArgs = [targetNode, 'test-image.jpeg'];
    runScriptlet(name, scriptletArgs);

    window.elem = createTagWithSetAttr(assert, targetNode, './test-files/test-image.jpeg');
    assert.strictEqual(window.elem.src, srcMockData[targetNode], 'src was mocked');
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('setAttribute, matching iframe element', (assert) => {
    const targetNode = 'iframe';
    const scriptletArgs = [targetNode, 'empty.html'];
    runScriptlet(name, scriptletArgs);

    window.elem = createTagWithSetAttr(assert, targetNode, './test-files/empty.html');
    assert.strictEqual(window.elem.src, srcMockData[targetNode], 'src was mocked');
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('src prop, matching script element', (assert) => {
    const targetNode = 'script';
    const scriptletArgs = [targetNode, 'test-script01.js'];
    runScriptlet(name, scriptletArgs);

    window.elem = createTagWithSrcProp(assert, targetNode, './test-files/test-script01.js');
    assert.strictEqual(window.elem.src, srcMockData[targetNode], 'src was mocked');
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('src prop, matching image element', (assert) => {
    const targetNode = 'img';
    const scriptletArgs = [targetNode, 'test-image.jpeg'];
    runScriptlet(name, scriptletArgs);

    window.elem = createTagWithSrcProp(assert, targetNode, './test-files/test-image.jpeg');
    assert.strictEqual(window.elem.src, srcMockData[targetNode], 'src was mocked');
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('src prop, matching iframe element', (assert) => {
    const targetNode = 'iframe';
    const scriptletArgs = [targetNode, 'empty.html'];
    runScriptlet(name, scriptletArgs);

    window.elem = createTagWithSrcProp(assert, targetNode, './test-files/empty.html');
    assert.strictEqual(window.elem.src, srcMockData[targetNode], 'src was mocked');
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('setAttribute, mismatching element', (assert) => {
    const targetNode = 'script';
    const scriptletArgs = [targetNode, 'not-test-script.js'];
    runScriptlet(name, scriptletArgs);

    window.elem = createTagWithSetAttr(assert, targetNode, './test-files/test-script02.js');
    assert.ok(window.elem.src.indexOf('test-script02.js') !== -1, 'src was NOT mocked');
    assert.strictEqual(window.hit, undefined, 'hit should NOT fire');
});

test('src prop, mismatching element', (assert) => {
    const targetNode = 'script';
    const scriptletArgs = [targetNode, 'not-test-script.js'];
    runScriptlet(name, scriptletArgs);

    window.elem = createTagWithSrcProp(assert, targetNode, './test-files/test-script02.js');
    assert.ok(window.elem.src.indexOf('test-script02.js') !== -1, 'src was NOT mocked');
    assert.strictEqual(window.hit, undefined, 'hit should NOT fire');
});

test('setAttribute, falsy arguments', (assert) => {
    const targetNode = 'script';
    const scriptletArgs = [targetNode, 'test-script.js'];
    runScriptlet(name, scriptletArgs);

    const node = document.createElement(targetNode);
    node.setAttribute(null, undefined);
    document.body.append(node);

    assert.strictEqual(node.getAttribute('null'), 'undefined', 'falsy attr value passed');
    assert.strictEqual(window.hit, undefined, 'hit should NOT fire');
});
