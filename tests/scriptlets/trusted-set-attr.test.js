/* eslint-disable no-underscore-dangle */
import {
    runScriptlet,
    clearGlobalProps,
    ATTR_SETTLE_DELAY_MS,
    createAttrMutationCounter,
    checkTwoAttrRulesSettle,
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
