/* eslint-disable no-underscore-dangle, no-console */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'trusted-create-element';

const IFRAME_WINDOW_NAME = 'trusted-create-element-window';

const ROOT_ID = 'root-id';
const ROOT_SELECTOR = `#${ROOT_ID}`;

const createRoot = (id) => {
    const root = document.createElement('div');
    root.id = id;
    document.body.append(root);
    return root;
};

const removeRoot = () => {
    const root = document.querySelector(ROOT_SELECTOR);
    root?.remove();
};

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    removeRoot();
    clearGlobalProps('hit', '__debug');
};

module(name, { beforeEach, afterEach });

test('creating empty div', (assert) => {
    const { children } = createRoot(ROOT_ID);

    const childTagName = 'div';

    assert.strictEqual(children.length, 0, 'Parent element has no children before scriptlet is run');

    runScriptlet(name, [ROOT_SELECTOR, childTagName]);

    assert.strictEqual(children.length, 1, 'Only specified child was appended');

    const child = children[0];

    assert.strictEqual(child.tagName.toLowerCase(), childTagName, 'Tag name is set correctly');
    assert.strictEqual(child.textContent, '', 'Text content is set correctly');
    assert.strictEqual(child.attributes.length, 0, 'No attributes were set');

    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('setting text content', (assert) => {
    const { children } = createRoot(ROOT_ID);

    const childTagName = 'DIV';
    const textContent = 'this is text content of an element';

    assert.strictEqual(children.length, 0, 'Parent element has no children before scriptlet is run');

    runScriptlet(name, [ROOT_SELECTOR, childTagName, '', textContent]);

    assert.strictEqual(children.length, 1, 'Only specified child was appended');

    const child = children[0];

    assert.strictEqual(child.tagName.toLowerCase(), childTagName.toLowerCase(), 'Tag name is set correctly');
    assert.strictEqual(child.textContent, textContent, 'Text content is set correctly');
    assert.strictEqual(child.attributes.length, 0, 'No attributes were set');

    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('setting single attribute', (assert) => {
    const { children } = createRoot(ROOT_ID);

    const childTagName = 'img';
    const attributeName = 'src';
    const attributeValue = './test-files/test-image.jpeg';
    const attributesParam = `${attributeName}="${attributeValue}"`;

    assert.strictEqual(children.length, 0, 'Parent element has no children before scriptlet is run');

    runScriptlet(name, [ROOT_SELECTOR, childTagName, attributesParam]);

    assert.strictEqual(children.length, 1, 'Only specified child was appended');

    const child = children[0];

    assert.strictEqual(child.tagName.toLowerCase(), childTagName, 'Tag name is set correctly');
    assert.strictEqual(child.textContent, '', 'Text content is set correctly');

    assert.strictEqual(child.getAttribute(attributeName), attributeValue, 'Attribute is set correctly');
    assert.strictEqual(child.getAttributeNames().length, 1, 'Specified amount of attributes were set');

    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('multiple attributes with space in value', (assert) => {
    const { children } = createRoot(ROOT_ID);

    const childTagName = 'div';
    const attributeName1 = 'class';
    const attributeValue1 = 'adsbygoogle adsbygoogle-noablate';
    const attributeName2 = 'data-adsbygoogle-status';
    const attributeValue2 = 'done';
    const attributeName3 = 'data-ad-status';
    const attributeValue3 = 'filled';
    // eslint-disable-next-line max-len
    const attributesParam = `${attributeName1}="${attributeValue1}" ${attributeName2}="${attributeValue2}" ${attributeName3}="${attributeValue3}"`;
    const textContent = 'this is text content of an element';

    assert.strictEqual(children.length, 0, 'Parent element has no children before scriptlet is run');

    runScriptlet(name, [ROOT_SELECTOR, childTagName, attributesParam, textContent]);

    assert.strictEqual(children.length, 1, 'Only specified child was appended');

    const child = children[0];

    assert.strictEqual(child.tagName.toLowerCase(), childTagName, 'Tag name is set correctly');
    assert.strictEqual(child.textContent, textContent, 'Text content is set correctly');

    assert.strictEqual(child.getAttribute(attributeName1), attributeValue1, 'Attribute 1 is set correctly');
    assert.strictEqual(child.getAttribute(attributeName2), attributeValue2, 'Attribute 2 is set correctly');
    assert.strictEqual(child.getAttribute(attributeName3), attributeValue3, 'Attribute 3 is set correctly');
    assert.strictEqual(child.getAttributeNames().length, 3, 'Specified amount of attributes were set');

    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('multiple attributes + attribute with no value', (assert) => {
    const { children } = createRoot(ROOT_ID);

    const childTagName = 'p';
    const attributeName1 = 'aria-hidden';
    const attributeValue1 = 'true';
    const attributeName2 = 'style';
    const attributeValue2 = 'width:0px';
    const attributeWithoutValue = 'attr3';
    // eslint-disable-next-line max-len
    const attributesParam = `${attributeName1}="${attributeValue1}" ${attributeName2}="${attributeValue2}" ${attributeWithoutValue}`;
    const textContent = 'this is text content of an element';

    assert.strictEqual(children.length, 0, 'Parent element has no children before scriptlet is run');

    runScriptlet(name, [ROOT_SELECTOR, childTagName, attributesParam, textContent]);

    assert.strictEqual(children.length, 1, 'Only specified child was appended');

    const child = children[0];

    assert.strictEqual(child.tagName.toLowerCase(), childTagName, 'Tag name is set correctly');
    assert.strictEqual(child.textContent, textContent, 'Text content is set correctly');

    assert.strictEqual(child.getAttribute(attributeName1), attributeValue1, 'Attribute 1 is set correctly');
    assert.strictEqual(child.getAttribute(attributeName2), attributeValue2, 'Attribute 2 is set correctly');
    assert.strictEqual(child.getAttribute(attributeWithoutValue), '', 'Attribute 3 is set correctly');
    assert.strictEqual(child.getAttributeNames().length, 3, 'Specified amount of attributes were set');

    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('element cleanup by timeout', (assert) => {
    const { children } = createRoot(ROOT_ID);

    const childTagName = 'DIV';
    const cleanupDelayMs = 50;

    assert.strictEqual(children.length, 0, 'Parent element has no children before scriptlet is run');

    runScriptlet(name, [ROOT_SELECTOR, childTagName, '', '', cleanupDelayMs]);

    assert.strictEqual(children.length, 1, 'Only specified child was appended');

    const child = children[0];

    assert.strictEqual(child.tagName, childTagName, 'Tag name is set correctly');
    assert.strictEqual(child.textContent, '', 'Text content is set correctly');

    assert.strictEqual(window.hit, 'FIRED', 'hit fired');

    const done = assert.async();
    setTimeout(() => {
        assert.strictEqual(children.length, 0, 'Child element was removed after timeout');
        done();
    }, cleanupDelayMs + 10);
});

test('element cleanup by timeout, check if element was not added again', (assert) => {
    // If element is re-added in a loop, then it will stuck on this test

    const childTagName = 'SPAN';
    const cleanupDelayMs = 100;

    runScriptlet(name, [ROOT_SELECTOR, childTagName, '', '', cleanupDelayMs]);

    const done = assert.async();

    let child;
    let children;
    const rootElement = createRoot(ROOT_ID);

    setTimeout(() => {
        children = rootElement.children;
        // eslint-disable-next-line prefer-destructuring
        child = children[0];
        assert.strictEqual(window.hit, 'FIRED', 'hit fired');
        assert.strictEqual(children.length, 1, 'Only specified child was appended');
        assert.strictEqual(child.tagName, childTagName, 'Tag name is set correctly');
    }, cleanupDelayMs / 2);

    setTimeout(() => {
        assert.strictEqual(children.length, 0, 'Child element was removed after timeout');
        done();
    }, cleanupDelayMs + 10);
});

test('running scriptlet before root element is created', (assert) => {
    const childTagName = 'div';

    runScriptlet(name, [ROOT_SELECTOR, childTagName]);

    const { children } = createRoot(ROOT_ID);

    const done = assert.async();
    setTimeout(() => {
        assert.strictEqual(children.length, 1, 'Only specified child was appended');

        const child = children[0];

        assert.strictEqual(child.tagName.toLowerCase(), childTagName, 'Tag name is set correctly');
        assert.strictEqual(child.textContent, '', 'Text content is set correctly');

        assert.strictEqual(window.hit, 'FIRED', 'hit fired');
        done();
    }, 10);
});

test('creating iframe', (assert) => {
    const { children } = createRoot(ROOT_ID);

    const childTagName = 'IFRAME';

    assert.strictEqual(children.length, 0, 'Parent element has no children before scriptlet is run');

    runScriptlet(name, [ROOT_SELECTOR, childTagName]);

    assert.strictEqual(children.length, 1, 'Only specified child was appended');

    const child = children[0];

    assert.strictEqual(child.tagName, childTagName, 'Tag name is set correctly');
    assert.strictEqual(child.textContent, '', 'Text content is set correctly');
    assert.strictEqual(child.contentWindow.name, IFRAME_WINDOW_NAME, 'window.name is set correctly');

    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});
