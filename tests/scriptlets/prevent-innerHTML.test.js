/* eslint-disable no-underscore-dangle */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'prevent-innerHTML';

const nativeDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('__debug', 'hit');
    Object.defineProperty(Element.prototype, 'innerHTML', nativeDescriptor);
};

module(name, { beforeEach, afterEach });

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const aliasParams = {
        name: 'ubo-prevent-innerHTML.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByAliasParams = window.scriptlets.invoke(aliasParams);

    assert.strictEqual(codeByAdgParams, codeByAliasParams);
});

test('prevents all innerHTML assignments when no args', (assert) => {
    runScriptlet(name);

    const element = document.createElement('div');
    element.innerHTML = '<span>test</span>';

    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    assert.strictEqual(element.innerHTML, '', 'innerHTML should be empty');
});

test('prevents innerHTML assignment when selector matches', (assert) => {
    runScriptlet(name, ['#test-id']);

    const matchingElement = document.createElement('div');
    matchingElement.id = 'test-id';
    document.body.appendChild(matchingElement);

    const nonMatchingElement = document.createElement('div');
    nonMatchingElement.id = 'other-id';
    document.body.appendChild(nonMatchingElement);

    matchingElement.innerHTML = '<span>blocked</span>';
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired for matching element');
    assert.strictEqual(matchingElement.innerHTML, '', 'innerHTML should be empty for matching element');

    clearGlobalProps('hit');

    nonMatchingElement.innerHTML = '<span>allowed</span>';
    assert.strictEqual(window.hit, undefined, 'hit should not fire for non-matching element');
    assert.strictEqual(
        nonMatchingElement.innerHTML,
        '<span>allowed</span>',
        'innerHTML should be set for non-matching element',
    );

    matchingElement.remove();
    nonMatchingElement.remove();
});

test('prevents innerHTML assignment when pattern matches', (assert) => {
    runScriptlet(name, ['', 'blocked']);

    const element = document.createElement('div');

    element.innerHTML = '<span>blocked content</span>';
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired for matching pattern');
    assert.strictEqual(element.innerHTML, '', 'innerHTML should be empty for matching pattern');

    clearGlobalProps('hit');

    element.innerHTML = '<span>allowed content</span>';
    assert.strictEqual(window.hit, undefined, 'hit should not fire for non-matching pattern');
    assert.strictEqual(
        element.innerHTML,
        '<span>allowed content</span>',
        'innerHTML should be set for non-matching pattern',
    );
});

test('prevents innerHTML assignment when selector and pattern both match', (assert) => {
    runScriptlet(name, ['.ad-container', 'advertisement']);

    const matchingElement = document.createElement('div');
    matchingElement.className = 'ad-container';
    document.body.appendChild(matchingElement);

    const otherElement = document.createElement('div');
    otherElement.className = 'content';
    document.body.appendChild(otherElement);

    // Matching selector and pattern
    matchingElement.innerHTML = '<span>advertisement</span>';
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    assert.strictEqual(matchingElement.innerHTML, '', 'innerHTML should be empty');

    clearGlobalProps('hit');

    // Matching selector but not pattern
    matchingElement.innerHTML = '<span>other content</span>';
    assert.strictEqual(window.hit, undefined, 'hit should not fire');
    assert.strictEqual(matchingElement.innerHTML, '<span>other content</span>', 'innerHTML should be set');

    clearGlobalProps('hit');

    // Not matching selector but matching pattern
    otherElement.innerHTML = '<span>advertisement</span>';
    assert.strictEqual(window.hit, undefined, 'hit should not fire');
    assert.strictEqual(otherElement.innerHTML, '<span>advertisement</span>', 'innerHTML should be set');

    matchingElement.remove();
    otherElement.remove();
});

test('prevents innerHTML assignment when pattern is regex', (assert) => {
    runScriptlet(name, ['', '/ad-\\d+/']);

    const element = document.createElement('div');

    element.innerHTML = '<div class="ad-123">content</div>';
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired for regex match');
    assert.strictEqual(element.innerHTML, '', 'innerHTML should be empty');

    clearGlobalProps('hit');

    element.innerHTML = '<div class="content">content</div>';
    assert.strictEqual(window.hit, undefined, 'hit should not fire for non-matching regex');
    assert.strictEqual(element.innerHTML, '<div class="content">content</div>', 'innerHTML should be set');
});

test('inverted pattern match with ! prefix', (assert) => {
    runScriptlet(name, ['', '!safe-content']);

    const element = document.createElement('div');

    // Should be blocked because it does NOT contain 'safe-content'
    element.innerHTML = '<span>unsafe</span>';
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired for inverted match');
    assert.strictEqual(element.innerHTML, '', 'innerHTML should be empty');

    clearGlobalProps('hit');

    // Should be allowed because it DOES contain 'safe-content'
    element.innerHTML = '<span>safe-content here</span>';
    assert.strictEqual(window.hit, undefined, 'hit should not fire');
    assert.strictEqual(element.innerHTML, '<span>safe-content here</span>', 'innerHTML should be set');
});

test('innerHTML getter still works', (assert) => {
    const element = document.createElement('div');
    // Set innerHTML before running scriptlet
    element.innerHTML = '<span>existing</span>';

    runScriptlet(name, ['', 'blocked']);

    // Getter should still return the value
    assert.strictEqual(element.innerHTML, '<span>existing</span>', 'innerHTML getter should work');
});

test('does not break when element.matches is not a function', (assert) => {
    runScriptlet(name, ['#test']);

    // Create a text node which doesn't have matches method
    const textNode = document.createTextNode('test');
    const element = document.createElement('div');
    element.appendChild(textNode);

    // This should not throw
    element.innerHTML = '<span>new content</span>';

    assert.strictEqual(window.hit, undefined, 'hit should not fire');
    assert.strictEqual(element.innerHTML, '<span>new content</span>', 'innerHTML should be set');
});

test('does not throw on invalid selector', (assert) => {
    runScriptlet(name, ['[invalid selector///']);
    const element = document.createElement('div');
    element.innerHTML = '<span>content</span>';
    assert.strictEqual(window.hit, undefined, 'hit should not fire for invalid selector');
    assert.strictEqual(element.innerHTML, '<span>content</span>', 'innerHTML should be set');
});

test('getter replacement returns empty string when pattern matches', (assert) => {
    const element = document.createElement('div');
    element.innerHTML = 'delete window test';
    runScriptlet(name, ['', 'delete window', '']);
    assert.strictEqual(element.innerHTML, '', 'innerHTML getter should return empty string');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('getter replacement returns custom value when pattern matches', (assert) => {
    const element = document.createElement('div');
    element.innerHTML = 'evil-code here';
    runScriptlet(name, ['', 'evil-code', 'safe-replacement']);
    assert.strictEqual(element.innerHTML, 'safe-replacement', 'innerHTML getter should return replacement');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('getter replacement does not affect non-matching content', (assert) => {
    const element = document.createElement('div');
    element.innerHTML = 'safe content';
    runScriptlet(name, ['', 'evil-code', '']);
    assert.strictEqual(element.innerHTML, 'safe content', 'innerHTML getter should return original');
    assert.strictEqual(window.hit, undefined, 'hit should not fire');
});

test('getter replacement works with selector filter', (assert) => {
    const matchingElement = document.createElement('div');
    matchingElement.className = 'target';
    matchingElement.innerHTML = 'delete window';
    document.body.appendChild(matchingElement);
    const nonMatchingElement = document.createElement('div');
    nonMatchingElement.className = 'other';
    nonMatchingElement.innerHTML = 'delete window';
    document.body.appendChild(nonMatchingElement);
    runScriptlet(name, ['.target', 'delete window', '']);
    assert.strictEqual(matchingElement.innerHTML, '', 'getter returns empty for matching element');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    clearGlobalProps('hit');
    assert.strictEqual(nonMatchingElement.innerHTML, 'delete window', 'getter returns original for non-matching');
    assert.strictEqual(window.hit, undefined, 'hit should not fire for non-matching element');
    matchingElement.remove();
    nonMatchingElement.remove();
});

test('getter replacement works with regex pattern', (assert) => {
    const element = document.createElement('div');
    element.innerHTML = 'delete window.prop123';
    runScriptlet(name, ['', '/delete window\\.\\w+/', '']);
    assert.strictEqual(element.innerHTML, '', 'innerHTML getter should return empty string');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('setter still prevents when replacement is specified', (assert) => {
    runScriptlet(name, ['', 'blocked', '']);
    const element = document.createElement('div');
    element.innerHTML = 'blocked content';
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired for setter');
    assert.strictEqual(element.innerHTML, '', 'innerHTML should be empty after blocked set');
    clearGlobalProps('hit');
    element.innerHTML = 'allowed content';
    assert.strictEqual(window.hit, undefined, 'hit should not fire for allowed content');
    assert.strictEqual(element.innerHTML, 'allowed content', 'innerHTML should be set');
});

test('real-world script injection prevention via getter', (assert) => {
    const div = document.createElement('div');
    div.textContent = 'alert("ad script")';
    runScriptlet(name, ['', 'alert', '']);
    const scriptContent = div.innerHTML;
    assert.strictEqual(scriptContent, '', 'innerHTML getter returns empty string');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});
