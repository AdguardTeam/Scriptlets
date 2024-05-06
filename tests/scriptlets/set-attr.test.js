/* eslint-disable no-underscore-dangle */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'set-attr';

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
