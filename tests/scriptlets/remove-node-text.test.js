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

/**
 * Adds a node to the document body with className if provided.
 * @param {string} nodeName - the type of node to create
 * @param {string} textContent - the text content of the node
 * @param {string} className - the class name of the node, optional
 * @returns {HTMLElement} - the created node
 */
const addNode = (nodeName, textContent, className) => {
    const node = document.createElement(nodeName);
    node.textContent = textContent;
    if (className) {
        node.className = className;
    }
    elements.push(node);
    document.body.appendChild(node);
    return node;
};

/**
 * Appends multiple child elements to a parent element.
 * @param {HTMLElement} parent - the parent element
 * @param  {HTMLElement} children - the child elements to append
 */
const appendChildren = (parent, ...children) => {
    children.forEach((child) => parent.appendChild(child));
};

/**
 * Creates a div element with the specified class name.
 * @param {*} className - the class name of the div
 * @returns {HTMLDivElement} - the created div element
 */
const createDiv = (className) => {
    const div = document.createElement('div');
    div.className = className;
    return div;
};

/**
 * Creates a text node with the specified content
 * @param {string} text - the text content of the node
 * @returns {HTMLDivElement} - the created text node
 */
const createTextNode = (text) => {
    return document.createTextNode(text);
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

test('removes matched #text in .content element after text node has been added', (assert) => {
    const done = assert.async();
    const targetText = 'Advert';
    const safeText = 'Content';

    runScriptlet(name, ['#text', targetText, '.content']);

    const contentElement = createDiv('content');
    const contentTextNode = createTextNode(safeText);
    const advertTextNode = createTextNode(targetText);
    appendChildren(document.body, contentElement);

    setTimeout(() => {
        appendChildren(contentElement, contentTextNode);
        appendChildren(contentElement, advertTextNode);
    }, 1);

    setTimeout(() => {
        assert.strictEqual(advertTextNode.nodeValue, '', 'Target text node should be removed');
        assert.strictEqual(contentTextNode.nodeValue, safeText, 'Safe text node should not be affected');
        assert.strictEqual(window.hit, 'FIRED', 'hit function should fire');
        done();
    }, 10);
});

test('case with text node with specified parent and similar text in other children.', (assert) => {
    const done = assert.async();
    const text = 'text';
    const text1 = 'text1';
    const text2 = 'text2';

    runScriptlet(name, ['#text', text, '.container']);

    const parentElement = createDiv('container');

    const targetTextNode = createTextNode(text);

    const child1 = createDiv('child1');
    child1.textContent = text1;

    const child2 = createDiv('child2');
    child2.textContent = text2;

    appendChildren(document.body, parentElement);
    appendChildren(parentElement, targetTextNode, child1, child2);

    setTimeout(() => {
        assert.strictEqual(targetTextNode.nodeValue, '', 'text should be removed');
        assert.strictEqual(child1.textContent, text1, 'non-matched node should not be affected');
        assert.strictEqual(child2.textContent, text2, 'non-matched node should not be affected');
        assert.strictEqual(window.hit, 'FIRED', 'hit function should fire');
        done();
    }, 1);
});

test('removes matched #text in body after elements are added', (assert) => {
    const done = assert.async();
    const targetText = 'text1';
    const safeText = 'text2';
    // body > .safe-div > #node + a
    const safeElement = createDiv('safe-div');
    const safeTextNode = createTextNode(safeText);
    const link = document.createElement('a');
    appendChildren(safeElement, safeTextNode, link);
    appendChildren(document.body, safeElement);

    runScriptlet(name, ['#text', 'text', 'body']);

    // body > #node
    const targetTextNode = createTextNode(targetText);
    appendChildren(document.body, targetTextNode);

    assert.strictEqual(targetTextNode.nodeValue, targetText, 'Target text node should contain correct text');
    assert.strictEqual(safeTextNode.nodeValue, safeText, 'Safe text node should contain correct text');

    setTimeout(() => {
        assert.strictEqual(targetTextNode.nodeValue, '', 'Target text node should be removed');
        assert.strictEqual(safeTextNode.nodeValue, safeText, 'Safe text node should not be affected');
        assert.strictEqual(window.hit, 'FIRED', 'hit function should fire');
        done();
    }, 1);
});

test('case with parent selector option and #text node with rendering after scriptlet start', (assert) => {
    const done = assert.async();
    const text = 'content!1';

    // Create text nodes
    const textNode = createTextNode(text);
    const secondTextNode = createTextNode(text);

    // Create parent container with class 'container'
    const parentElement = createDiv('container');

    // Create a link element
    const link = document.createElement('a');
    link.href = 'link';
    link.textContent = text;

    runScriptlet(name, ['#text', 'content!', 'body']);

    appendChildren(parentElement, secondTextNode, link);

    appendChildren(document.body, parentElement, textNode);

    assert.strictEqual(textNode.nodeValue, text, 'Text node should contain correct text');
    assert.strictEqual(secondTextNode.nodeValue, text, 'Second text node should contain correct text');

    setTimeout(() => {
        assert.strictEqual(textNode.nodeValue, '', 'Text should be removed');
        assert.strictEqual(secondTextNode.nodeValue, text, 'Non-matched node should not be affected');
        assert.strictEqual(link.textContent, text, 'Non-matched node should not be affected');
        assert.strictEqual(window.hit, 'FIRED', 'hit function should fire');
        done();
    }, 1);
});

test('case when text node is changing after scriptlet is start', (assert) => {
    const done = assert.async();
    const initialText = 'test';
    const matchingText = 'content!';
    const updatedText = 'updated';

    const targetParentElement = createDiv('container');
    // body > .container
    appendChildren(document.body, targetParentElement);

    const targetElement = createDiv();
    targetElement.textContent = initialText;

    // body > .container > div (test)
    appendChildren(targetParentElement, targetElement);

    // start scriptlet
    runScriptlet(name, ['div', matchingText, 'div.container']);

    assert.strictEqual(targetElement.textContent, initialText, 'text node should not be removed as it does not match');

    // .non-matching-container > div (content!)
    const safeParentElement = createDiv('non-matching-container');
    appendChildren(document.body, safeParentElement);

    // change DOM, create div with other class
    const safeElement = createDiv();
    // body > .non-matching-container (content!)
    appendChildren(safeParentElement, safeElement);

    // change text to match in other div element
    // .non-matching-container > div (content!)
    safeElement.textContent = matchingText;
    assert.strictEqual(safeElement.textContent, matchingText, 'text node should not be removed as parent does not match');
    targetElement.textContent = updatedText;
    assert.strictEqual(targetElement.textContent, updatedText, 'target element contains updated text, should not be removed');
    // update targetTextNode node to match text
    targetElement.textContent = matchingText;

    setTimeout(() => {
        // body > .container (content!)
        // should be matched by scriptlet
        assert.strictEqual(targetElement.textContent, '', 'text node should be removed as text now matches');
        assert.strictEqual(window.hit, 'FIRED', 'hit function should fire');
        done();
    }, 100);
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

/**
 * Adds a script node which is not executed, to the end of the body.
 *
 * @param {string} textContent Text of the script.
 *
 * @returns {HTMLScriptElement} Added script node.
 */
const addInertScript = (textContent) => {
    const node = document.createElement('script');
    node.type = 'text/plain';
    node.textContent = textContent;
    elements.push(node);
    document.body.appendChild(node);
    return node;
};

// Rules from AdGuard filter lists
module(`${name} with AdGuard rules`, { beforeEach, afterEach });

test('present text nodes are removed', (assert) => {
    // betweenjpandkr.blog#%#//scriptlet('remove-node-text', '#text', 'PR:')
    const element = addNode('div', 'PR: sponsored adg-1');
    const textNode = element.firstChild;

    runScriptlet(name, ['#text', 'PR:']);

    assert.strictEqual(textNode.textContent, '', 'present text node removed');
    assert.strictEqual(window.hit, 'FIRED', 'hit function should fire');
});

test('present text nodes of the parent are removed', (assert) => {
    // devonlive.com#%#//scriptlet('remove-node-text', '#text', 'Follow Devon Live:', 'section[data-testid="social-follow"]')
    const parent = document.createElement('section');
    parent.setAttribute('data-testid', 'social-follow');
    parent.appendChild(document.createTextNode('Follow Devon Live: adg-2'));
    elements.push(parent);
    document.body.appendChild(parent);
    const outside = addNode('div', 'Follow Devon Live: adg-2');

    runScriptlet(name, ['#text', 'Follow Devon Live:', 'section[data-testid="social-follow"]']);

    assert.strictEqual(parent.textContent, '', 'text of the parent removed');
    assert.strictEqual(outside.textContent, 'Follow Devon Live: adg-2', 'text outside of the parent not removed');
});

test('regular expression with `g` flag matches each node', (assert) => {
    // qr.quel.jp#%#//scriptlet('remove-node-text', 'div', '/シェアする/g')
    const nodes = [
        addNode('div', 'シェアする adg-3'),
        addNode('div', 'before シェアする after adg-3'),
        addNode('div', '  シェアする  adg-3'),
    ];

    runScriptlet(name, ['div', '/シェアする/g']);

    nodes.forEach((node) => assert.strictEqual(node.textContent, '', 'text removed'));
});

test('options: `excludes`, `sedCount` and `quitAfter`', (assert) => {
    const done = assert.async();
    // elamigosgamez.net#%#//scriptlet('remove-node-text', 'script', 'checkAdblockUser'), with the options added
    const excluded = addInertScript('checkAdblockUser(); nonce // adg-4');
    const first = addInertScript('checkAdblockUser(); // adg-4');
    const second = addInertScript('checkAdblockUser(); // adg-4');

    runScriptlet(name, ['script', 'checkAdblockUser', '', 'excludes', 'nonce', 'sedCount', '2', 'quitAfter', '0']);
    const added = addInertScript('checkAdblockUser(); // adg-4');

    setTimeout(() => {
        assert.strictEqual(excluded.textContent, 'checkAdblockUser(); nonce // adg-4', 'excluded');
        assert.strictEqual(first.textContent, '', 'first matched node removed');
        assert.strictEqual(second.textContent, '', 'second matched node removed');
        assert.strictEqual(added.textContent, 'checkAdblockUser(); // adg-4', 'added node not removed');
        done();
    }, 10);
});

test('`stay` option removes text of nodes added later', (assert) => {
    const done = assert.async();
    runScriptlet(name, ['script', 'adg-5-adblock', '', 'stay', '1']);
    const added = addInertScript('adg-5-adblock();');

    setTimeout(() => {
        assert.strictEqual(added.textContent, '', 'added node removed');
        done();
    }, 10);
});

test('invalid parent selector is not applied', (assert) => {
    const node = addNode('div', 'adg-6 text');

    runScriptlet(name, ['div', 'adg-6', 'div[']);

    assert.strictEqual(node.textContent, 'adg-6 text', 'not removed');
});

// Rules from uBO filter lists and converted uBO rules from AdGuard filter lists,
// with arguments as converted to AdGuard syntax by AGTree
module(`${name} with uBO arguments`, { beforeEach, afterEach });

test('`excludes` option', (assert) => {
    // baseball-reference.com,…##+js(rmnt, script, reviveScroll, excludes, self.__next)
    const matched = addInertScript('reviveScroll(); // ubo-1');
    const excluded = addInertScript('self.__next_f.push(reviveScroll); // ubo-1');

    runScriptlet('ubo-rmnt', ['script', 'reviveScroll', 'excludes', 'self.__next']);

    assert.strictEqual(matched.textContent, '', 'removed');
    assert.strictEqual(excluded.textContent, 'self.__next_f.push(reviveScroll); // ubo-1', 'excluded');
    assert.strictEqual(window.hit, 'FIRED', 'hit function should fire');
});

test('`includes` option replaces the second argument', (assert) => {
    // epiotrkow.pl#%#//scriptlet('ubo-rmnt', 'script', 'testScript.onerror', 'includes', 'adblock')
    const matched = addInertScript('if (adblock) { warn(); } // ubo-2');
    const notMatched = addInertScript('testScript.onerror = f; // ubo-2');

    runScriptlet('ubo-rmnt', ['script', 'testScript.onerror', 'includes', 'adblock']);

    assert.strictEqual(matched.textContent, '', 'matched by includes option removed');
    assert.strictEqual(notMatched.textContent, 'testScript.onerror = f; // ubo-2', 'second argument is replaced');
});

test('`condition` option is not used with `includes`', (assert) => {
    // gramedia.com#%#//scriptlet('ubo-rmnt', 'script', 'replaceState', 'condition', 'shope.ee')
    const matched = addInertScript('history.replaceState(null, ""); // ubo-3');

    runScriptlet('ubo-rmnt', ['script', 'replaceState', 'condition', 'shope.ee']);

    assert.strictEqual(matched.textContent, '', 'matched by includes removed, condition is not checked');
});

test('no `includes` removes text of all nodes with the name', (assert) => {
    // dinbyggare.se#%#//scriptlet('ubo-rmnt', 'noscript')
    const node = addNode('noscript', 'Enable JavaScript ubo-4');

    runScriptlet('ubo-rmnt', ['noscript']);

    assert.strictEqual(node.textContent, '', 'removed');
});

test('nodes added after the document is interactive are not removed by default', (assert) => {
    const done = assert.async();
    // canale-tv.net,cool-tv.net##+js(rmnt, script, .preventDefault(), includes, contextmenu)
    const present = addInertScript('addEventListener("contextmenu", (e) => e.preventDefault()); // ubo-5');
    runScriptlet('ubo-rmnt', ['script', '.preventDefault()', 'includes', 'contextmenu']);
    const added = addInertScript('addEventListener("contextmenu", (e) => e.preventDefault()); // ubo-5');

    setTimeout(() => {
        assert.strictEqual(present.textContent, '', 'present node removed');
        assert.strictEqual(
            added.textContent,
            'addEventListener("contextmenu", (e) => e.preventDefault()); // ubo-5',
            'added node not removed',
        );
        done();
    }, 10);
});

test('`stay` option removes text of nodes added later', (assert) => {
    const done = assert.async();
    // multishows.top##+js(rmnt, script, /adbl/i, stay, 1)
    runScriptlet('ubo-rmnt', ['script', '/adbl/i', 'stay', '1']);
    const added = addInertScript('if (ADBLOCK) { warn(); } // ubo-6');

    setTimeout(() => {
        assert.strictEqual(added.textContent, '', 'added node removed');
        done();
    }, 10);
});

test('`#text` node name with regular expression', (assert) => {
    // resizer.myct.jp##+js(rmnt, #text, /スポンサーリンク|Sponsored Link|广告/)
    const element = addNode('div', 'Sponsored Link ubo-7');
    const textNode = element.firstChild;

    runScriptlet('ubo-rmnt', ['#text', '/スポンサーリンク|Sponsored Link|广告/']);

    assert.strictEqual(textNode.textContent, '', 'text node removed');
});

test.each('uBO names', [
    'ubo-remove-node-text.js',
    'ubo-remove-node-text',
    'ubo-rmnt.js',
    'ubo-rmnt',
], (assert, uboName) => {
    // baseball-reference.com,…##+js(rmnt, script, reviveScroll, excludes, self.__next)
    const excluded = addInertScript(`self.__next_f.push(reviveScroll); // ${uboName}`);

    runScriptlet(uboName, ['script', 'reviveScroll', 'excludes', 'self.__next']);

    assert.strictEqual(excluded.textContent, `self.__next_f.push(reviveScroll); // ${uboName}`, 'uBO arguments are used');
});
