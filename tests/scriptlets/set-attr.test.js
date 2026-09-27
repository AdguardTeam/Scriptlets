/* eslint-disable no-underscore-dangle, no-console */
import {
    runScriptlet,
    clearGlobalProps,
    ATTR_SETTLE_DELAY_MS,
    createAttrMutationCounter,
    runAttrRulesAndCountIdleChanges,
    checkTwoAttrRulesSettle,
    countLogsAfterDomChange,
} from '../helpers';

const { test, module } = QUnit;
const name = 'set-attr';

const TARGET_ELEM_ID = 'target';
const MISMATCH_ELEM_ID = 'mismatch';
const TARGET_ATTR_NAME = 'test-attr';
const TARGET_ELEM_BAIT_ATTR = 'another-attr-value';

const nativeConsole = console.log;

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
    console.log = nativeConsole;
};

module(name, { beforeEach, afterEach });

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const uboParams = {
        name: 'ubo-set-attr.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByUboParams = window.scriptlets.invoke(uboParams);

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

test('selector + attr + eligible number', (assert) => {
    const value = '1234';
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

test('selector + attr + 0 (minimum possible value)', (assert) => {
    const value = '0';
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
});

test('selector + attr + 32767 (maximum possible value)', (assert) => {
    const value = '32767';
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
});

test('selector + attr + empty string', (assert) => {
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
});

test('selector + attr + true', (assert) => {
    const value = 'true';
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

test('selector + attr + False', (assert) => {
    const value = 'False';
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

test('selector + attr + negative number', (assert) => {
    const value = '-100';
    const { targetSelector, targetElem, mismatchElem } = context;
    const scriptletArgs = [targetSelector, TARGET_ATTR_NAME, value];

    runScriptlet(name, scriptletArgs);

    assert.strictEqual(targetElem.getAttribute(TARGET_ATTR_NAME), null, `Attr ${TARGET_ATTR_NAME} is not added`);
    assert.strictEqual(
        mismatchElem.getAttribute(TARGET_ATTR_NAME),
        null,
        `Attr ${TARGET_ATTR_NAME} is not added to mismatch element either`,
    );
    assert.strictEqual(window.hit, undefined, 'hit function has not been called');
});

test('selector + attr + too big of a number', (assert) => {
    const value = '33000';
    const { targetSelector, targetElem, mismatchElem } = context;
    const scriptletArgs = [targetSelector, TARGET_ATTR_NAME, value];

    runScriptlet(name, scriptletArgs);

    assert.strictEqual(targetElem.getAttribute(TARGET_ATTR_NAME), null, `Attr ${TARGET_ATTR_NAME} is not added`);
    assert.strictEqual(
        mismatchElem.getAttribute(TARGET_ATTR_NAME),
        null,
        `Attr ${TARGET_ATTR_NAME} is not added to mismatch element either`,
    );
    assert.strictEqual(window.hit, undefined, 'hit function has not been called');
});

test('selector + attr + not allowed string', (assert) => {
    const value = 'trueNotAllowed';
    const { targetSelector, targetElem, mismatchElem } = context;
    const scriptletArgs = [targetSelector, TARGET_ATTR_NAME, value];

    runScriptlet(name, scriptletArgs);

    assert.strictEqual(targetElem.getAttribute(TARGET_ATTR_NAME), null, `Attr ${TARGET_ATTR_NAME} is not added`);
    assert.strictEqual(
        mismatchElem.getAttribute(TARGET_ATTR_NAME),
        null,
        `Attr ${TARGET_ATTR_NAME} is not added to mismatch element either`,
    );
    assert.strictEqual(window.hit, undefined, 'hit function has not been called');
});

test('copying another attribute value', (assert) => {
    const ANOTHER_ATTRIBUTE_NAME = 'another-attr';
    const ANOTHER_ATTRIBUTE_VALUE = '1234';
    const SPECIAL_VALUE = `[${ANOTHER_ATTRIBUTE_NAME}]`;

    const { targetSelector, targetElem, mismatchElem } = context;
    const scriptletArgs = [targetSelector, TARGET_ATTR_NAME, SPECIAL_VALUE];

    targetElem.setAttribute(ANOTHER_ATTRIBUTE_NAME, ANOTHER_ATTRIBUTE_VALUE);

    runScriptlet(name, scriptletArgs);

    assert.strictEqual(
        targetElem.getAttribute(TARGET_ATTR_NAME),
        ANOTHER_ATTRIBUTE_VALUE,
        `Value ${ANOTHER_ATTRIBUTE_VALUE} has been copied correctly`,
    );
    assert.strictEqual(
        targetElem.getAttribute(ANOTHER_ATTRIBUTE_NAME),
        ANOTHER_ATTRIBUTE_VALUE,
        'Another attribute is intact',
    );
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
        assert.strictEqual(
            targetElem.getAttribute(TARGET_ATTR_NAME),
            ANOTHER_ATTRIBUTE_VALUE,
            `New attr val ${ANOTHER_ATTRIBUTE_VALUE} is still correct`,
        );
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

test('two rules on different elements settle', async (assert) => {
    const { targetElem, mismatchElem } = context;
    await checkTwoAttrRulesSettle(assert, name, { firstElem: targetElem, secondElem: mismatchElem });
});

test('two rules on same element settle, one of them copies attribute value', async (assert) => {
    const { targetElem } = context;
    targetElem.setAttribute('data-source', 'copied');
    await checkTwoAttrRulesSettle(assert, name, {
        firstElem: targetElem,
        secondElem: targetElem,
        secondValue: '[data-source]',
        secondExpected: 'copied',
    });
});

test('two rules on different elements settle, one of them copies attribute value', async (assert) => {
    const { targetElem, mismatchElem } = context;
    mismatchElem.setAttribute('data-source', 'copied');
    await checkTwoAttrRulesSettle(assert, name, {
        firstElem: targetElem,
        secondElem: mismatchElem,
        secondValue: '[data-source]',
        secondExpected: 'copied',
    });
});

test('copying missing attribute value settles and logs it only once', async (assert) => {
    const { targetElem } = context;
    // existing value should be overwritten once and not on each mutation
    targetElem.setAttribute(TARGET_ATTR_NAME, 'initial');
    let missingAttrLogCount = 0;
    console.log = (...args) => {
        if (typeof args[0] === 'string' && args[0].includes('No element attribute found to copy value from')) {
            missingAttrLogCount += 1;
        }
        nativeConsole(...args);
    };

    const { initialMutations, mutations, hits } = await runAttrRulesAndCountIdleChanges(name, [
        { elem: targetElem, attr: TARGET_ATTR_NAME, value: '[data-missing]' },
    ]);

    assert.ok(initialMutations > 0, 'initial attribute change is counted');
    assert.strictEqual(mutations, 0, 'no attribute mutations while page is idle');
    assert.strictEqual(hits, 0, 'hit is not called while page is idle');
    assert.strictEqual(missingAttrLogCount, 1, 'missing attribute is logged only on the initial change');
});

test('attribute is not re-set and hit is not called if value already matches', (assert) => {
    const { targetSelector, targetElem } = context;
    const plainAttr = 'data-ag-test-a';
    const copyAttr = 'data-ag-test-b';
    targetElem.setAttribute(plainAttr, '1');
    targetElem.setAttribute('data-source', 'copied');
    targetElem.setAttribute(copyAttr, 'copied');

    const counter = createAttrMutationCounter([targetElem], [plainAttr, copyAttr]);

    runScriptlet(name, [targetSelector, plainAttr, '1']);
    runScriptlet(name, [targetSelector, copyAttr, '[data-source]']);

    const done = assert.async();
    // mutation observer callbacks are async, so wait for them
    setTimeout(() => {
        const mutations = counter.count;
        counter.disconnect();
        assert.strictEqual(targetElem.getAttribute(plainAttr), '1', `${plainAttr} value is unchanged`);
        assert.strictEqual(targetElem.getAttribute(copyAttr), 'copied', `${copyAttr} value is unchanged`);
        assert.strictEqual(mutations, 0, 'setAttribute is not called for matching values');
        assert.strictEqual(window.hit, undefined, 'hit function has not been called');
        done();
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
