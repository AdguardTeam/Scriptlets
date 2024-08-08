/* eslint-disable no-underscore-dangle, no-console, max-len */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'trusted-replace-node-text';

const elements = [];

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const nativeConsole = console.log;

const afterEach = () => {
    elements.forEach((element) => element.remove());
    clearGlobalProps('hit', '__debug');
    console.log = nativeConsole;
};

module(name, { beforeEach, afterEach });

const addNode = (nodeName, textContent) => {
    const node = document.createElement(nodeName);
    node.textContent = textContent;
    elements.push(node);
    document.body.appendChild(node);
    return node;
};

test('simple case', (assert) => {
    const done = assert.async();

    const nodeName = 'div';
    const textMatch = 'content!';
    const pattern = 'content';
    const replacement = 'replaced';

    const text = 'content!1';
    const expectedText = 'replaced!1';

    const nodeBefore = addNode('div', text);
    const safeNodeBefore = addNode('a', text);

    runScriptlet(name, [nodeName, textMatch, pattern, replacement]);

    const nodeAfter = addNode('div', text);
    const safeNodeAfter = addNode('span', text);
    setTimeout(() => {
        assert.strictEqual(nodeAfter.textContent, expectedText, 'text content should be modified');
        assert.strictEqual(nodeBefore.textContent, expectedText, 'text content should be modified');

        assert.strictEqual(safeNodeAfter.textContent, text, 'non-matched node should not be affected');
        assert.strictEqual(safeNodeBefore.textContent, text, 'non-matched node should not be affected');

        assert.strictEqual(window.hit, 'FIRED', 'hit function should fire');
        done();
    }, 1);
});

test('using matchers as regexes', (assert) => {
    const done = assert.async();

    const nodeName = String.raw`/d\dv/`;
    const textMatch = String.raw`/content[$&+,:;=?@#|'<>.^*()%!-]/`;
    const pattern = '/content/';
    const replacement = 'replaced';

    const text = 'content!1';
    const expectedText = 'replaced!1';

    const nodeBefore = addNode('d1v', text);
    const safeNodeBefore = addNode('a', text);

    runScriptlet(name, [nodeName, textMatch, pattern, replacement]);

    const nodeAfter = addNode('d3v', text);
    const safeNodeAfter = addNode('span', text);
    setTimeout(() => {
        assert.strictEqual(nodeAfter.textContent, expectedText, 'text content should be modified');
        assert.strictEqual(nodeBefore.textContent, expectedText, 'text content should be modified');

        assert.strictEqual(safeNodeAfter.textContent, text, 'non-matched node should not be affected');
        assert.strictEqual(safeNodeBefore.textContent, text, 'non-matched node should not be affected');

        assert.strictEqual(window.hit, 'FIRED', 'hit function should fire');
        done();
    }, 1);
});

test('arguments correctly reorganizing for ubo replace-node-text.js', (assert) => {
    const done = assert.async();
    const uboAlias = 'rpnt.js';

    const nodeName = 'div';
    const textMatch = 'content!';
    const pattern = 'content';
    const replacement = 'replaced';

    const text = 'content!1';
    const expectedText = 'replaced!1';

    const nodeBefore = addNode('div', text);
    const safeNodeBefore = addNode('a', text);

    /**
     * UBO replaceNodeText scriptlet has different signature:
     * function replaceNodeText(nodeName, pattern, replacement, ...extraArgs) {...}
     */
    runScriptlet(uboAlias, [nodeName, pattern, replacement, 'condition', textMatch]);

    const nodeAfter = addNode('div', text);
    const safeNodeAfter = addNode('span', text);
    setTimeout(() => {
        assert.strictEqual(nodeAfter.textContent, expectedText, 'text content should be modified');
        assert.strictEqual(nodeBefore.textContent, expectedText, 'text content should be modified');

        assert.strictEqual(safeNodeAfter.textContent, text, 'non-matched node should not be affected');
        assert.strictEqual(safeNodeBefore.textContent, text, 'non-matched node should not be affected');

        assert.strictEqual(window.hit, 'FIRED', 'hit function should fire');
        done();
    }, 1);
});

test('Log content', (assert) => {
    // There are 7 "asserts" in test but node is modified two times
    // so it's logged twice, that's why 9 is expected
    assert.expect(9);

    console.log = (...args) => {
        if (args.length === 1 && args[0].includes('foo log')) {
            assert.ok(args[0].includes('foo log'), 'should log text in console');
        }
        if (args.length === 1 && args[0].includes('bar log')) {
            assert.ok(args[0].includes('bar log'), 'should log text in console');
        }
        nativeConsole(...args);
    };

    const done = assert.async();

    const nodeName = 'div';
    const textMatch = 'log';
    const pattern = 'foo';
    const replacement = 'bar';
    const verbose = 'verbose';

    const text = 'foo log';
    const expectedText = 'bar log';

    const nodeBefore = addNode('div', text);
    const safeNodeBefore = addNode('a', text);

    runScriptlet(name, [nodeName, textMatch, pattern, replacement, verbose]);

    const nodeAfter = addNode('div', text);
    const safeNodeAfter = addNode('span', text);
    setTimeout(() => {
        assert.strictEqual(nodeAfter.textContent, expectedText, 'text content should be modified');
        assert.strictEqual(nodeBefore.textContent, expectedText, 'text content should be modified');

        assert.strictEqual(safeNodeAfter.textContent, text, 'non-matched node should not be affected');
        assert.strictEqual(safeNodeBefore.textContent, text, 'non-matched node should not be affected');

        assert.strictEqual(window.hit, 'FIRED', 'hit function should fire');
        done();
    }, 1);
});
