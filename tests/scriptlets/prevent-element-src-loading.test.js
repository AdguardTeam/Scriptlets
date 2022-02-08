/* eslint-disable no-underscore-dangle, no-restricted-globals */
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

const createTagWithSetAttr = (src, nodeName, assert) => {
    const done1 = assert.async();

    const node = document.createElement(nodeName);
    node.onload = () => {
        assert.ok(true, '.onload triggered');
        done1();
    };
    node.setAttribute('src', src);
    document.body.append(node);
    return node;
};

const createTagWithSrcProp = (src, nodeName, assert) => {
    const done1 = assert.async();

    const node = document.createElement(nodeName);
    node.onload = () => {
        assert.ok(true, '.onload triggered');
        done1();
    };
    node.src = src;
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
    const scriptletArgs = [targetNode, 'test-script.js'];
    runScriptlet(name, scriptletArgs);

    window.elem = createTagWithSetAttr('./test-files/test-script.js', targetNode, assert);
    assert.strictEqual(window.elem.src, srcMockData[targetNode], 'src was mocked');
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('setAttribute, matching image element', (assert) => {
    const targetNode = 'img';
    const scriptletArgs = [targetNode, 'test-image.jpeg'];
    runScriptlet(name, scriptletArgs);

    window.elem = createTagWithSetAttr('./test-files/test-image.jpeg', targetNode, assert);
    assert.strictEqual(window.elem.src, srcMockData[targetNode], 'src was mocked');
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('setAttribute, matching iframe element', (assert) => {
    const targetNode = 'iframe';
    const scriptletArgs = [targetNode, 'empty.html'];
    runScriptlet(name, scriptletArgs);

    window.elem = createTagWithSetAttr('./test-files/empty.html', targetNode, assert);
    assert.strictEqual(window.elem.src, srcMockData[targetNode], 'src was mocked');
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('src prop, matching script element', (assert) => {
    const targetNode = 'script';
    const scriptletArgs = [targetNode, 'test-script.js'];
    runScriptlet(name, scriptletArgs);

    window.elem = createTagWithSrcProp('./test-files/test-script.js', targetNode, assert);
    assert.strictEqual(window.elem.src, srcMockData[targetNode], 'src was mocked');
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('src prop, matching image element', (assert) => {
    const targetNode = 'img';
    const scriptletArgs = [targetNode, 'test-image.jpeg'];
    runScriptlet(name, scriptletArgs);

    window.elem = createTagWithSrcProp('./test-files/test-image.jpeg', targetNode, assert);
    assert.strictEqual(window.elem.src, srcMockData[targetNode], 'src was mocked');
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('src prop, matching iframe element', (assert) => {
    const targetNode = 'iframe';
    const scriptletArgs = [targetNode, 'empty.html'];
    runScriptlet(name, scriptletArgs);

    window.elem = createTagWithSrcProp('./test-files/empty.html', targetNode, assert);
    assert.strictEqual(window.elem.src, srcMockData[targetNode], 'src was mocked');
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});
