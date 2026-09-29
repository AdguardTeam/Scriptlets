/* eslint-disable no-underscore-dangle */
import {
    runScriptlet,
    clearGlobalProps,
    runRulesAndCountIdleChanges,
    countLogsAfterDomChange,
} from '../helpers';

const { test, module } = QUnit;
const name = 'remove-attr';

// eslint-disable-next-line no-console
const nativeConsole = console.log;

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
    // observers of rules from previous tests are still active and may log,
    // so console.log overridden by a test should not outlive it
    // eslint-disable-next-line no-console
    console.log = nativeConsole;
};

module(name, { afterEach });

const createHit = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const createElem = (className, attrs) => {
    const elem = document.createElement('div');
    if (className) elem.classList.add(className);
    attrs.forEach((a) => elem.setAttribute(a, true));
    document.body.appendChild(elem);

    return elem;
};

function addAttr(elem, attr) {
    elem.setAttribute(attr, true);
}

let uniqueClassCount = 0;

/**
 * Returns a unique class name, so rules from previous tests, whose observers are still active,
 * do not match elements of the current test.
 *
 * @returns {string} class name
 */
const getUniqueClassName = () => {
    uniqueClassCount += 1;
    return `ag-test-remove-attr-${uniqueClassCount}`;
};

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const uboParams = {
        name: 'ubo-remove-attr.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByUboParams = window.scriptlets.invoke(uboParams);

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

test('no selector + multiple attrs for one element', (assert) => {
    createHit();
    const attrs = ['test1', 'test2'];

    const elem = createElem(null, attrs);

    const scriptletArgs = [attrs.join('|')];
    runScriptlet(name, scriptletArgs);

    attrs.forEach((a) => {
        assert.notOk(elem.getAttribute(a), `Attr ${a} removed - first time`);
    });
    assert.strictEqual(window.hit, 'FIRED');
    clearGlobalProps('hit');

    const done = assert.async();

    setTimeout(() => { addAttr(elem, attrs[0]); }, 20);
    setTimeout(() => { addAttr(elem, attrs[1]); }, 40);

    setTimeout(() => {
        attrs.forEach((a) => {
            assert.notOk(elem.getAttribute(a), `Attr ${a} removed - again after timeout`);
        });
        assert.strictEqual(window.hit, 'FIRED');
        // clean up test element
        elem.remove();
        done();
    }, 250);
});

test('no selector + multiple attrs for different elements', (assert) => {
    createHit();
    const attrs = ['test0', 'test1'];

    const elem0 = createElem(null, [attrs[0]]);
    const elem1 = createElem(null, [attrs[1]]);

    const scriptletArgs = [attrs.join('|')];
    runScriptlet(name, scriptletArgs);

    attrs.forEach((a) => {
        assert.notOk(elem0.getAttribute(a), `Attr ${a} removed`);
        assert.notOk(elem1.getAttribute(a), `Attr ${a} removed`);
    });
    assert.strictEqual(window.hit, 'FIRED');
    clearGlobalProps('hit');

    const done = assert.async();

    setTimeout(() => { addAttr(elem0, attrs[0]); }, 20);
    setTimeout(() => { addAttr(elem1, attrs[1]); }, 40);

    setTimeout(() => {
        attrs.forEach((a) => {
            assert.notOk(elem0.getAttribute(a), `Attr ${a} removed`);
            assert.notOk(elem1.getAttribute(a), `Attr ${a} removed`);
        });
        assert.strictEqual(window.hit, 'FIRED');
        // clean up test element
        elem0.remove();
        elem1.remove();
    }, 150);

    setTimeout(() => {
        // clean up test element
        elem0.remove();
        elem1.remove();
        done();
    }, 250);
});

test('single attr + single selector', (assert) => {
    createHit();
    const attrs = ['testAttr'];
    const matchClassName = 'match';
    const mismatchClassName = 'none';

    const matchElem = createElem(matchClassName, attrs);
    const mismatchElem = createElem(mismatchClassName, attrs);

    const scriptletArgs = [attrs.join('|'), `.${matchClassName}`];
    runScriptlet(name, scriptletArgs);

    attrs.forEach((a) => {
        assert.notOk(matchElem.getAttribute(a), `Attr ${a} removed for selector-matched element`);
        assert.ok(mismatchElem.getAttribute(a), `Attr ${a} not removed for mismatched elements`);
    });
    assert.strictEqual(window.hit, 'FIRED');
    clearGlobalProps('hit');

    const done = assert.async();

    setTimeout(() => { addAttr(matchElem, attrs[0]); }, 60);

    setTimeout(() => {
        attrs.forEach((a) => {
            assert.notOk(matchElem.getAttribute(a), `Attr ${a} removed`);
        });
        assert.strictEqual(window.hit, 'FIRED');
        // clean up test element
        matchElem.remove();
        done();
    }, 100);
});

test('single attr + multiple selectors', (assert) => {
    createHit();
    const attrs = ['testAttr'];
    const className0 = 'testClass0';
    const className1 = 'testClass1';

    const elem0 = createElem(className0, attrs);
    const elem1 = createElem(className1, attrs);

    const selectors = `.${className0}, .${className1}`;
    const scriptletArgs = [attrs.join('|'), selectors];
    runScriptlet(name, scriptletArgs);

    attrs.forEach((a) => {
        assert.notOk(elem0.getAttribute(a), `Attr ${a} removed for "${elem0}" element`);
        assert.notOk(elem1.getAttribute(a), `Attr ${a} removed for "${elem1}" element`);
    });
    assert.strictEqual(window.hit, 'FIRED');
    clearGlobalProps('hit');

    const done = assert.async();

    setTimeout(() => {
        addAttr(elem0, attrs[0]);
        addAttr(elem1, attrs[0]);
    }, 60);

    setTimeout(() => {
        attrs.forEach((a) => {
            assert.notOk(elem0.getAttribute(a), `Attr ${a} removed for "${elem0}" element`);
            assert.notOk(elem1.getAttribute(a), `Attr ${a} removed for "${elem1}" element`);
        });
        assert.strictEqual(window.hit, 'FIRED');
        // clean up test element
        elem0.remove();
        elem1.remove();
        done();
    }, 100);
});

test('multiple attrs + multiple selectors', (assert) => {
    createHit();
    const attrs = ['test0', 'test1'];
    const className0 = 'testClass0';
    const className1 = 'testClass1';

    const elem0 = createElem(className0, attrs);
    const elem1 = createElem(className1, attrs);

    const selectors = `.${className0}, .${className1}`;

    const scriptletArgs = [attrs.join('|'), selectors];
    runScriptlet(name, scriptletArgs);

    attrs.forEach((a) => {
        assert.notOk(elem0.getAttribute(a), `Attr ${a} removed for "${elem0}" element`);
        assert.notOk(elem1.getAttribute(a), `Attr ${a} removed for "${elem1}" element`);
    });
    assert.strictEqual(window.hit, 'FIRED');
    clearGlobalProps('hit');

    const done = assert.async();

    setTimeout(() => {
        addAttr(elem0, attrs[0]);
        addAttr(elem1, attrs[0]);
    }, 60);

    setTimeout(() => {
        attrs.forEach((a) => {
            assert.notOk(elem0.getAttribute(a), `Attr ${a} removed for "${elem0}" element`);
            assert.notOk(elem1.getAttribute(a), `Attr ${a} removed for "${elem1}" element`);
        });
        assert.strictEqual(window.hit, 'FIRED');
        // clean up test element
        elem0.remove();
        elem1.remove();
        done();
    }, 100);
});

// Only 'asap' and 'asap stay' cases were tested as test suit is loaded on 'complete' page state
// and 'loading' and 'interactive' states are unavailable.
test('single attr + single selector, asap', (assert) => {
    createHit();
    const attrs = ['test'];
    const className = 'testClass';

    const elem = createElem(className, attrs);

    const selector = `.${className}`;
    const applying = 'asap';

    const scriptletArgs = [attrs.join('|'), selector, applying];
    runScriptlet(name, scriptletArgs);

    attrs.forEach((a) => {
        assert.notOk(elem.getAttribute(a), `Attr ${a} removed for "${elem}" element`);
    });
    assert.strictEqual(window.hit, 'FIRED');
    // clean up test element
    elem.remove();
    clearGlobalProps('hit');
});

test('single attr + single selector, asap stay', (assert) => {
    createHit();
    const attrs = ['test'];
    const className = 'testClass';

    const elem = createElem(className, attrs);

    const selector = `.${className}`;
    const applying = 'asap stay';

    const scriptletArgs = [attrs.join('|'), selector, applying];
    runScriptlet(name, scriptletArgs);

    attrs.forEach((a) => {
        assert.notOk(elem.getAttribute(a), `Attr ${a} removed for "${elem}" element`);
    });
    assert.strictEqual(window.hit, 'FIRED');
    clearGlobalProps('hit');

    const done = assert.async();

    setTimeout(() => {
        addAttr(elem, attrs[0]);
    }, 60);

    setTimeout(() => {
        attrs.forEach((a) => {
            assert.notOk(elem.getAttribute(a), `Attr ${a} removed for "${elem}" element`);
        });
        assert.strictEqual(window.hit, 'FIRED');
        // clean up test element
        elem.remove();
        clearGlobalProps('hit');
        done();
    }, 100);
});

test('invalid selector — no match', (assert) => {
    createHit();
    const attrs = ['testAttr'];
    const selector = '..test';
    const scriptletArgs = [attrs.join('|'), `${selector}`];

    // eslint-disable-next-line no-console
    console.log = function log(input) {
        if (input.includes('trace')) {
            return;
        }
        assert.strictEqual(
            input,
            `${name}: Invalid selector arg: '${selector}'`,
            'logged error for invalid remove-attr selector;',
        );
    };

    runScriptlet(name, scriptletArgs);

    assert.strictEqual(window.hit, undefined, 'hit SHOULD NOT fire');
    clearGlobalProps('hit');
});

test('hit is not called on unrelated DOM mutation if attribute is already removed', async (assert) => {
    const attr = 'data-ag-test';
    const className = getUniqueClassName();
    // selector matches the element even after the attribute is removed
    const elem = createElem(className, [attr]);
    createHit();
    const testDebug = window.__debug;

    const { initialMutations, mutations, hits } = await runRulesAndCountIdleChanges(name, [
        { elem, attr, args: [attr, `.${className}`] },
    ]);

    assert.notOk(elem.hasAttribute(attr), `Attr ${attr} removed`);
    assert.ok(initialMutations > 0, 'initial attribute removal is counted');
    assert.strictEqual(mutations, 0, 'no attribute mutations while page is idle');
    assert.strictEqual(hits, 0, 'hit is not called while page is idle');
    assert.strictEqual(window.hit, 'FIRED', 'hit is still reported to the test');
    assert.strictEqual(window.__debug, testDebug, '__debug of the test is restored');
    elem.remove();
});

test('hit is not called if matched elements do not have the attribute', (assert) => {
    createHit();
    const attr = 'data-ag-test';
    const className = getUniqueClassName();
    const elem = createElem(className, []);

    runScriptlet(name, [attr, `.${className}`]);

    assert.notOk(elem.hasAttribute(attr), `Attr ${attr} is still missing`);
    assert.strictEqual(window.hit, undefined, 'hit function has not been called');
    elem.remove();
});

test('invalid selector is logged only once', async (assert) => {
    const selector = '..ag-test-invalid-selector';
    const count = await countLogsAfterDomChange(
        name,
        ['data-ag-test', selector],
        `${name}: Invalid selector arg: '${selector}'`,
    );
    assert.strictEqual(count, 1, 'invalid selector is logged once');
});

test('attribute names which are not valid CSS identifiers are removed', (assert) => {
    createHit();
    // e.g. Alpine.js and Vue attribute names
    const attrs = ['x-on:click', '@click', ':class'];
    const wrapper = document.createElement('div');
    // attributes are created by the HTML parser, since setAttribute() may reject such names in some browsers
    wrapper.innerHTML = '<div x-on:click="a" @click="b" :class="c" data-ag-test-kept="d"></div>';
    const elem = wrapper.firstElementChild;
    document.body.appendChild(wrapper);

    runScriptlet(name, [attrs.join('|')]);

    attrs.forEach((attr) => {
        assert.notOk(elem.hasAttribute(attr), `attribute '${attr}' has been removed`);
    });
    assert.ok(elem.hasAttribute('data-ag-test-kept'), 'other attribute is kept');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    wrapper.remove();
});
