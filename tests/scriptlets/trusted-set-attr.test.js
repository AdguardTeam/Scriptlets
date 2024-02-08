/* eslint-disable no-underscore-dangle */
import { runScriptlet, clearGlobalProps } from '../helpers';

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
