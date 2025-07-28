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

let policy;
if (window.trustedTypes) {
    policy = window.trustedTypes.createPolicy('myEscapePolicy', {
        createHTML: (string) => string,
        createScript: (string) => string,
    });
}

const addNode = (nodeName, textContent) => {
    const node = document.createElement(nodeName);
    if (nodeName === 'script' && policy) {
        node.textContent = policy.createScript(textContent);
    } else {
        node.textContent = textContent;
    }
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

test('simple case - should not throw error when pattern and replacement are not provided', (assert) => {
    const done = assert.async();

    const nodeName = 'div';
    const textMatch = 'qwerty!';

    const text = 'qwerty!1';
    const expectedText = 'qwerty!1';

    const nodeBefore = addNode('div', text);
    const safeNodeBefore = addNode('a', text);

    runScriptlet(name, [nodeName, textMatch]);

    const nodeAfter = addNode('div', text);
    const safeNodeAfter = addNode('span', text);
    setTimeout(() => {
        assert.strictEqual(nodeAfter.textContent, expectedText, 'text content should not be modified');
        assert.strictEqual(nodeBefore.textContent, expectedText, 'text content should not be modified');

        assert.strictEqual(safeNodeAfter.textContent, text, 'non-matched node should not be affected');
        assert.strictEqual(safeNodeBefore.textContent, text, 'non-matched node should not be affected');

        assert.strictEqual(window.hit, 'FIRED', 'hit function should fire');
        done();
    }, 1);
});

test('simple case - check if quotes are correctly escaped in pattern and replacement', (assert) => {
    const done = assert.async();

    const nodeName = 'div';
    const textMatch = 'alert';
    const pattern = '/alert\\(\\\'test\\\'\\)/';
    const replacement = 'alert(\\\'replaced\\\')';
    const text = "alert('test')";
    const expectedText = "alert('replaced')";

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

test('simple case - check if quotes are correctly escaped in result', (assert) => {
    const done = assert.async();

    const nodeName = 'div';
    const textMatch = 'alert';
    const pattern = 'foo';
    const replacement = 'bar';
    const text = 'alert("\\"foo\\"")';
    const expectedText = 'alert("\\"bar\\"")';

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

test('CSP require-trusted-types-for "script" - replace script content', (assert) => {
    const done = assert.async();

    // QUnit uses innerHTML to render tests, so we need to override it and add trusted types policy
    const nativeInnerHTMLSet = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML').set;
    Object.defineProperty(Element.prototype, 'innerHTML', {
        set(html) {
            if (policy) {
                const sanitizedHTML = policy.createHTML(html);
                // eslint-disable-next-line no-setter-return
                return nativeInnerHTMLSet.call(this, sanitizedHTML);
            }
            // eslint-disable-next-line no-setter-return
            return nativeInnerHTMLSet.call(this, html);
        },
    });

    const meta = document.createElement('meta');
    document.head.appendChild(meta);
    meta.setAttribute('http-equiv', 'Content-Security-Policy');
    meta.setAttribute('content', "require-trusted-types-for 'script'");

    const nodeName = 'script';
    const textMatch = 'window.showAds';
    const pattern = 'window.showAds = true';
    const replacement = 'window.showAds = false';

    const expectedText = 'window.showAds = false;';

    runScriptlet(name, [nodeName, textMatch, pattern, replacement]);

    const nodeAfter = addNode('script', 'window.showAds = true;');
    setTimeout(() => {
        assert.strictEqual(nodeAfter.textContent, expectedText, 'text content should be modified');
        assert.strictEqual(window.hit, 'FIRED', 'hit function should fire');
        clearGlobalProps('showAds');
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
