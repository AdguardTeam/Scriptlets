/* eslint-disable no-underscore-dangle, max-len */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'remove-node-text';

const elements = [];

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    elements.forEach((element) => element.remove());
    clearGlobalProps('hit', '__debug');
};

module(name, { beforeEach, afterEach });

const addNode = (nodeName, textContent) => {
    const node = document.createElement(nodeName);
    node.textContent = textContent;
    elements.push(node);
    document.body.appendChild(node);
    return node;
};

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const uboParams = {
        name: 'ubo-remove-node-text.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByUboParams = window.scriptlets.invoke(uboParams);

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

test('simple case', (assert) => {
    const done = assert.async();
    const text = 'content!1';

    const nodeBefore = addNode('div', text);
    const safeNodeBefore = addNode('a', text);

    runScriptlet(name, ['div', 'content!']);

    const nodeAfter = addNode('div', text);
    const safeNodeAfter = addNode('span', text);
    setTimeout(() => {
        assert.strictEqual(nodeAfter.textContent, '', 'text should be removed');
        assert.strictEqual(nodeBefore.textContent, '', 'text should be removed');

        assert.strictEqual(safeNodeAfter.textContent, text, 'non-matched node should not be affected');
        assert.strictEqual(safeNodeBefore.textContent, text, 'non-matched node should not be affected');

        assert.strictEqual(window.hit, 'FIRED', 'hit function should fire');
        done();
    }, 1);
});

test('nodeName matcher working as regexp', (assert) => {
    const done = assert.async();
    const text = 'content!2';

    const nodeBefore = addNode('div', text);
    const safeNodeBefore = addNode('a', text);

    runScriptlet(name, ['/test/', 'content!']);

    const nodeAfter = addNode('div', text);
    const safeNodeAfter = addNode('span', text);
    setTimeout(() => {
        assert.strictEqual(nodeAfter.textContent, '', 'text should be removed');
        assert.strictEqual(nodeBefore.textContent, '', 'text should be removed');

        assert.strictEqual(safeNodeAfter.textContent, text, 'non-matched node should not be affected');
        assert.strictEqual(safeNodeBefore.textContent, text, 'non-matched node should not be affected');

        assert.strictEqual(window.hit, 'FIRED', 'hit function should fire');
        done();
    }, 1);
});

test('textContent matcher working as regexp', (assert) => {
    const done = assert.async();
    const text = 'content!3';

    const nodeBefore = addNode('div', text);
    const safeNodeBefore = addNode('a', text);

    runScriptlet(name, ['test', '/content!/']);

    const nodeAfter = addNode('div', text);
    const safeNodeAfter = addNode('span', text);
    setTimeout(() => {
        assert.strictEqual(nodeAfter.textContent, '', 'text should be removed');
        assert.strictEqual(nodeBefore.textContent, '', 'text should be removed');

        assert.strictEqual(safeNodeAfter.textContent, text, 'non-matched node should not be affected');
        assert.strictEqual(safeNodeBefore.textContent, text, 'non-matched node should not be affected');

        assert.strictEqual(window.hit, 'FIRED', 'hit function should fire');
        done();
    }, 1);
});

test('both matchers working as regexes', (assert) => {
    const done = assert.async();
    const text = 'content!4';

    const nodeBefore = addNode('div', text);
    const safeNodeBefore = addNode('a', text);

    runScriptlet(name, ['/test/', '/content!/']);

    const nodeAfter = addNode('div', text);
    const safeNodeAfter = addNode('span', text);
    setTimeout(() => {
        assert.strictEqual(nodeAfter.textContent, '', 'text should be removed');
        assert.strictEqual(nodeBefore.textContent, '', 'text should be removed');

        assert.strictEqual(safeNodeAfter.textContent, text, 'non-matched node should not be affected');
        assert.strictEqual(safeNodeBefore.textContent, text, 'non-matched node should not be affected');

        assert.strictEqual(window.hit, 'FIRED', 'hit function should fire');
        done();
    }, 1);
});
