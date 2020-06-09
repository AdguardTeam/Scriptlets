/* eslint-disable no-eval, no-underscore-dangle */
import { clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'prevent-addEventListener';

const originalEventLister = window.addEventListener;

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('__debug', 'hit');
    window.addEventListener = originalEventLister;
};

module(name, { beforeEach, afterEach });

const evalWrapper = eval;

const runScriptlet = (event, func) => {
    const params = {
        name,
        args: [event, func],
        verbose: true,
    };
    const resultString = window.scriptlets.invoke(params);
    evalWrapper(resultString);
};

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const aliasParams = {
        name: 'ubo-addEventListener-defuser.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByAliasParams = window.scriptlets.invoke(aliasParams);

    assert.strictEqual(codeByAdgParams, codeByAliasParams);
});

test('should not prevent addEventListener if callback = null', (assert) => {
    runScriptlet('testPassive', 'clicked');

    const element = document.createElement('div');
    element.addEventListener('testPassive', null);
    element.click();

    assert.strictEqual(window.hit, undefined, 'hit function is not fired');
});

test('does not allow to add event listener', (assert) => {
    runScriptlet('click', 'clicked');

    const testProp = 'testProp';
    const element = document.createElement('div');
    element.addEventListener('click', () => {
        window[testProp] = 'clicked';
    });
    element.click();

    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    assert.strictEqual(window[testProp], undefined, 'property should be undefined');
    clearGlobalProps(testProp);
});

test('event listeners not corresponding to scriptlet arguments should be added correctly', (assert) => {
    runScriptlet('click', undefined);

    const focusProp = 'focusProp';
    const element = document.createElement('div');
    element.addEventListener('focus', () => {
        window[focusProp] = 'focused';
    });

    element.dispatchEvent(new Event('focus'));
    assert.strictEqual(window.hit, undefined, 'hit function not fired');
    assert.strictEqual(window[focusProp], 'focused', 'property should change');

    const clickProp = 'clickProp';
    element.addEventListener('click', () => {
        window[clickProp] = 'clicked';
    });
    element.click();
    assert.strictEqual(window.hit, 'FIRED', 'hit function should fire');
    assert.strictEqual(window[clickProp], undefined, 'property should be undefined');
    clearGlobalProps(clickProp, focusProp);
});

test('event listeners with handlers matched with regexp not added', (assert) => {
    runScriptlet(undefined, '/click/');

    const element = document.createElement('div');

    const clickProp = 'clickProp';
    element.addEventListener('click', () => {
        window[clickProp] = 'clicked'; // this string matches with regex
    });
    element.click();
    assert.strictEqual(window.hit, 'FIRED', 'hit function should not fire');
    assert.strictEqual(window[clickProp], undefined, 'property should be undefined');
    clearGlobalProps('hit');

    const focusProp = 'focusProp';
    element.addEventListener('focus', () => {
        window[focusProp] = 'clicked'; // this string matches with regex
    });
    element.dispatchEvent(new Event('focus'));
    assert.strictEqual(window.hit, 'FIRED', 'hit function not fired');
    assert.strictEqual(window[focusProp], undefined, 'property should be undefined');
    clearGlobalProps('hit');

    // this event listener should work correctly
    element.addEventListener('click', () => {
        window[focusProp] = 'focus'; // this string doesn't match with regex
    });
    element.click();
    assert.strictEqual(window.hit, undefined, 'hit function should not fire');
    assert.strictEqual(window[focusProp], 'focus', 'property should change');

    clearGlobalProps(clickProp, focusProp);
});
