/* eslint-disable no-underscore-dangle */
import {
    runScriptlet,
    clearGlobalProps,
    ATTR_SETTLE_DELAY_MS,
    createAttrMutationCounter,
    checkTwoAttrRulesSettle,
    checkAttrErrorForOneElement,
    countLogsAfterDomChange,
} from '../helpers';

const { test, module } = QUnit;
const name = 'trusted-set-attr';

const TARGET_ELEM_ID = 'target';
const MISMATCH_ELEM_ID = 'mismatch';
const TARGET_ATTR_NAME = 'test-attr';
const TARGET_ELEM_BAIT_ATTR = 'another-attr-value';

let context;
let testCaseCount = 0;

const createElement = (id) => {
    const elem = document.createElement('div');
    elem.id = id;
    document.body.appendChild(elem);
    return elem;
};

const createContext = () => {
    // This prevents multiple observers from tinkering with other tests
    testCaseCount += 1;

    const targetUID = `${TARGET_ELEM_ID}-${testCaseCount}`;
    const mismatchUID = `${MISMATCH_ELEM_ID}-${testCaseCount}`;

    return {
        targetSelector: `#${targetUID}`,
        targetElem: createElement(targetUID),
        mismatchElem: createElement(mismatchUID),
        changeTargetAttribute(attributeName) {
            return this.targetElem.setAttribute(attributeName, TARGET_ELEM_BAIT_ATTR);
        },
    };
};

const clearContext = () => {
    context.targetElem.remove();
    context.mismatchElem.remove();
    context = null;
};

const beforeEach = () => {
    context = createContext();
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearContext();
    clearGlobalProps('hit', '__debug');
};

module(name, { beforeEach, afterEach });

test('setting arbitrary value', (assert) => {
    const value = '{ playbackRate: 1.5 }';
    const { targetSelector, targetElem, mismatchElem } = context;
    const scriptletArgs = [targetSelector, TARGET_ATTR_NAME, value];

    runScriptlet(name, scriptletArgs);

    assert.strictEqual(targetElem.getAttribute(TARGET_ATTR_NAME), value, `New attr value ${value} is correct`);
    assert.strictEqual(
        mismatchElem.getAttribute(TARGET_ATTR_NAME),
        null,
        `Attr ${TARGET_ATTR_NAME} is not added to mismatch element`,
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function has been called');

    clearGlobalProps('hit');

    context.changeTargetAttribute(TARGET_ATTR_NAME);

    const done = assert.async();
    setTimeout(() => {
        assert.strictEqual(targetElem.getAttribute(TARGET_ATTR_NAME), value, `New attr val ${value} is still correct`);
        assert.strictEqual(window.hit, 'FIRED', 'hit function has been called again');
        done();
    }, 30);
});

test('setting empty string', (assert) => {
    const value = '';
    const { targetSelector, targetElem, mismatchElem } = context;
    const scriptletArgs = [targetSelector, TARGET_ATTR_NAME, value];

    runScriptlet(name, scriptletArgs);

    assert.strictEqual(targetElem.getAttribute(TARGET_ATTR_NAME), value, `New attr value ${value} is correct`);
    assert.strictEqual(
        mismatchElem.getAttribute(TARGET_ATTR_NAME),
        null,
        `Attr ${TARGET_ATTR_NAME} is not added to mismatch element`,
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function has been called');

    clearGlobalProps('hit');

    context.changeTargetAttribute(TARGET_ATTR_NAME);

    const done = assert.async();
    setTimeout(() => {
        assert.strictEqual(targetElem.getAttribute(TARGET_ATTR_NAME), value, `New attr val ${value} is still correct`);
        assert.strictEqual(window.hit, 'FIRED', 'hit function has been called again');
        done();
    }, 30);
});

test('setting attribute without value', (assert) => {
    const { targetSelector, targetElem, mismatchElem } = context;
    const scriptletArgs = [targetSelector, TARGET_ATTR_NAME];

    runScriptlet(name, scriptletArgs);

    assert.strictEqual(targetElem.getAttribute(TARGET_ATTR_NAME), '', 'New attr set without value');
    assert.strictEqual(
        mismatchElem.getAttribute(TARGET_ATTR_NAME),
        null,
        `Attr ${TARGET_ATTR_NAME} is not added to mismatch element`,
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function has been called');

    clearGlobalProps('hit');

    context.changeTargetAttribute(TARGET_ATTR_NAME);

    const done = assert.async();
    setTimeout(() => {
        assert.strictEqual(targetElem.getAttribute(TARGET_ATTR_NAME), '', 'New attr state is still correct');
        assert.strictEqual(window.hit, 'FIRED', 'hit function has been called again');
        done();
    }, 30);
});

test('two rules on same element settle, logging enabled', async (assert) => {
    const { targetElem } = context;
    await checkTwoAttrRulesSettle(assert, name, { firstElem: targetElem, secondElem: targetElem });
});

test('two rules on same element settle, logging disabled', async (assert) => {
    const { targetElem } = context;
    await checkTwoAttrRulesSettle(assert, name, { firstElem: targetElem, secondElem: targetElem, verbose: false });
});

test('two rules on different elements settle, logging enabled', async (assert) => {
    const { targetElem, mismatchElem } = context;
    await checkTwoAttrRulesSettle(assert, name, { firstElem: targetElem, secondElem: mismatchElem });
});

test('two rules on different elements settle, logging disabled', async (assert) => {
    const { targetElem, mismatchElem } = context;
    await checkTwoAttrRulesSettle(assert, name, { firstElem: targetElem, secondElem: mismatchElem, verbose: false });
});

test('attribute is not re-set and hit is not called if value already matches', (assert) => {
    const value = 'already-set';
    const { targetSelector, targetElem } = context;
    targetElem.setAttribute(TARGET_ATTR_NAME, value);

    const counter = createAttrMutationCounter([targetElem], [TARGET_ATTR_NAME]);

    runScriptlet(name, [targetSelector, TARGET_ATTR_NAME, value]);

    const done = assert.async();
    // mutation observer callbacks are async, so wait for them
    setTimeout(() => {
        const mutations = counter.count;
        counter.disconnect();
        assert.strictEqual(targetElem.getAttribute(TARGET_ATTR_NAME), value, 'attr value is unchanged');
        assert.strictEqual(mutations, 0, 'setAttribute is not called for matching value');
        assert.strictEqual(window.hit, undefined, 'hit function has not been called');
        done();
    }, ATTR_SETTLE_DELAY_MS);
});

test('two rules: newly inserted elements and page changes are still handled', (assert) => {
    const { targetElem } = context;
    const className = `ag-test-class-${testCaseCount}`;
    const selector = `.${className}`;
    const attrA = 'data-ag-test-a';
    const attrB = 'data-ag-test-b';
    const value = '1';

    targetElem.classList.add(className);

    runScriptlet(name, [selector, attrA, value]);
    runScriptlet(name, [selector, attrB, value]);

    assert.strictEqual(targetElem.getAttribute(attrA), value, `${attrA} is set on existing element`);
    assert.strictEqual(targetElem.getAttribute(attrB), value, `${attrB} is set on existing element`);

    const done = assert.async();
    let newElem;
    setTimeout(() => {
        clearGlobalProps('hit');
        // page inserts a new matching element
        newElem = document.createElement('div');
        newElem.classList.add(className);
        document.body.appendChild(newElem);
        // page changes target attributes
        targetElem.setAttribute(attrA, 'changed-by-page');
        targetElem.removeAttribute(attrB);

        setTimeout(() => {
            assert.strictEqual(newElem.getAttribute(attrA), value, `${attrA} is set on new element`);
            assert.strictEqual(newElem.getAttribute(attrB), value, `${attrB} is set on new element`);
            assert.strictEqual(targetElem.getAttribute(attrA), value, `${attrA} is restored after page change`);
            assert.strictEqual(targetElem.getAttribute(attrB), value, `${attrB} is restored after removal`);
            assert.strictEqual(window.hit, 'FIRED', 'hit function has been called again');
            newElem.remove();
            targetElem.classList.remove(className);
            done();
        }, ATTR_SETTLE_DELAY_MS);
    }, ATTR_SETTLE_DELAY_MS);
});

test('invalid selector is logged only once', async (assert) => {
    const selector = '..ag-test-invalid-selector';
    const count = await countLogsAfterDomChange(
        name,
        [selector, TARGET_ATTR_NAME, '1'],
        `${name}: Invalid selector arg: '${selector}'`,
    );
    assert.strictEqual(count, 1, 'invalid selector is logged once');
    assert.strictEqual(window.hit, undefined, 'hit function has not been called');
});

test('invalid attribute name is logged only once', async (assert) => {
    const { targetSelector, targetElem } = context;
    const attr = 'ag-test invalid';
    const count = await countLogsAfterDomChange(
        name,
        [targetSelector, attr, '1'],
        `${name}: Invalid attribute name: '${attr}'`,
    );
    assert.strictEqual(count, 1, 'invalid attribute name is logged once');
    assert.strictEqual(targetElem.attributes.length, 1, 'no attribute has been set');
    assert.strictEqual(window.hit, undefined, 'hit function has not been called');
});

test('error for one element does not stop setting attribute on other elements and is logged once', async (assert) => {
    await checkAttrErrorForOneElement(assert, name);
});

/**
 * Waits for the observers of the rules, which are throttled.
 *
 * @returns {Promise<void>} promise which is resolved after the delay
 */
const waitForObservers = () => new Promise((resolve) => {
    setTimeout(resolve, ATTR_SETTLE_DELAY_MS);
});

test.each('uBO rule: sets the attribute', ['ubo-trusted-set-attr.js', 'ubo-trusted-set-attr'], (assert, uboName) => {
    // cloubix.com##+js(trusted-set-attr, #countdown, data-status, active)
    const elem = createElement('countdown');
    elem.setAttribute('data-status', 'waiting');
    // The document of the test page is complete, so the attribute is set immediately
    runScriptlet(uboName, ['#countdown', 'data-status', 'active']);

    assert.strictEqual(elem.getAttribute('data-status'), 'active', 'Attribute set');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    elem.remove();
});

test('uBO rule keeps the value set by the page, as in uBO, an AdGuard rule sets its own one again', async (assert) => {
    // cloubix.com##+js(trusted-set-attr, #countdown, data-status, active)
    const uboElem = createElement('countdown');
    runScriptlet('ubo-trusted-set-attr', ['#countdown', 'data-status', 'active']);
    // hk.yahoo.com,tw.yahoo.com#%#//scriptlet('trusted-set-attr', 'div#Homepage', 'data-top-center-ad-type', 'noAd')
    const adgElem = createElement('Homepage');
    runScriptlet(name, ['div#Homepage', 'data-top-center-ad-type', 'noAd']);
    // Adding the element is a change of the DOM, after which the uBO rule sets the attribute again as well,
    // so the page changes the attributes only after that
    await waitForObservers();

    uboElem.setAttribute('data-status', 'paused');
    adgElem.setAttribute('data-top-center-ad-type', 'banner');
    await waitForObservers();

    assert.strictEqual(uboElem.getAttribute('data-status'), 'paused', 'Value of the page kept by the uBO rule');
    assert.strictEqual(adgElem.getAttribute('data-top-center-ad-type'), 'noAd', 'Value set again by the AdGuard rule');
    uboElem.remove();
    adgElem.remove();
});

test('uBO rule does not set an event handler, as in uBO, an AdGuard rule does', (assert) => {
    const main = document.createElement('main');
    main.setAttribute('oncontextmenu', 'return false;');
    document.body.appendChild(main);

    // rehouse.co.jp#%#//scriptlet('trusted-set-attr', 'main[oncontextmenu]', 'oncontextmenu', 'return true;'),
    // in uBO syntax
    runScriptlet('ubo-trusted-set-attr', ['main[oncontextmenu]', 'oncontextmenu', 'return true;']);
    assert.strictEqual(main.getAttribute('oncontextmenu'), 'return false;', 'Event handler not set by the uBO rule');

    // rehouse.co.jp#%#//scriptlet('trusted-set-attr', 'main[oncontextmenu]', 'oncontextmenu', 'return true;')
    runScriptlet(name, ['main[oncontextmenu]', 'oncontextmenu', 'return true;']);
    assert.strictEqual(main.getAttribute('oncontextmenu'), 'return true;', 'Event handler set by the AdGuard rule');
    main.remove();
});

test('uBO rule: quotes escaped by the converter are unescaped', (assert) => {
    // A value with `'`, e.g. `it's`, is converted by AGTree to `it\'s`, which CoreLibs passes as it is
    const elem = createElement('apostrophe-target');
    runScriptlet('ubo-trusted-set-attr', ['#apostrophe-target', 'title', "it\\'s"]);

    assert.strictEqual(elem.getAttribute('title'), "it's", 'Escape removed');
    elem.remove();
});
