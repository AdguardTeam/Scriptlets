/* global QUnit */
/* eslint-disable no-eval, no-underscore-dangle */
import { clearGlobalProps } from './helpers';

const { test, module } = QUnit;
const name = 'set-constant';

const afterEach = () => {
    clearGlobalProps('hit', '__debugScriptlets', 'counter');
};

module(name, { afterEach });

const evalWrapper = eval;

const createScriptletRunner = (counter) => (property, value) => {
    const params = {
        name,
        args: [property, value],
        verbose: true,
    };
    const resultString = window.scriptlets.invoke(params);
    evalWrapper(resultString);
    counter += 1;
    return counter;
};

test('ubo alias works', (assert) => {
    window.__debugScriptlets = () => {
        window.hit = 'FIRED';
    };

    const value = 'false';
    const property = 'ubo';
    const params = {
        name: 'ubo-set-constant.js',
        args: [property, value],
        verbose: true,
    };

    const resString = window.scriptlets.invoke(params);

    evalWrapper(resString);

    assert.strictEqual(window[property], false);
    assert.strictEqual(window.hit, 'FIRED');
    clearGlobalProps(property);
});

test('sets values correctly', (assert) => {
    window.__debugScriptlets = () => {
        window.counter = window.counter ? window.counter + 1 : 1;
    };
    const runSetConstantScriptlet = createScriptletRunner(0);
    let counter;
    // settings constant to true;
    const trueProp = 'trueProp';
    counter = runSetConstantScriptlet(trueProp, 'true');
    assert.strictEqual(window[trueProp], true);
    assert.strictEqual(window.counter, counter);
    clearGlobalProps(trueProp);

    // setting constant to false;
    const falseProp = 'falseProp';
    counter = runSetConstantScriptlet(falseProp, 'false');
    assert.strictEqual(window[falseProp], false);
    assert.strictEqual(window.counter, counter);
    clearGlobalProps(falseProp);

    // setting constant to undefined;
    const undefinedProp = 'undefinedProp';
    counter = runSetConstantScriptlet(undefinedProp, 'undefined');
    assert.strictEqual(window[undefinedProp], undefined);
    assert.strictEqual(window.counter, counter);
    clearGlobalProps(undefinedProp);

    // setting constant to null;
    const nullProp = 'nullProp';
    counter = runSetConstantScriptlet(nullProp, 'null');
    assert.strictEqual(window[nullProp], null);
    assert.strictEqual(window.counter, counter);
    clearGlobalProps(nullProp);

    // setting constant to noopFunc;
    const noopFuncProp = 'noopFuncProp';
    counter = runSetConstantScriptlet(noopFuncProp, 'noopFunc');
    assert.strictEqual(window[noopFuncProp](), undefined);
    assert.strictEqual(window.counter, counter);
    clearGlobalProps(noopFuncProp);

    // setting constant to trueFunc;
    const trueFuncProp = 'trueFuncProp';
    counter = runSetConstantScriptlet(trueFuncProp, 'trueFunc');
    assert.strictEqual(window[trueFuncProp](), true);
    assert.strictEqual(window.counter, counter);
    clearGlobalProps(trueFuncProp);

    // setting constant to falseFunc;
    const falseFuncProp = 'falseFuncProp';
    counter = runSetConstantScriptlet(falseFuncProp, 'falseFunc');
    assert.strictEqual(window[falseFuncProp](), false);
    assert.strictEqual(window.counter, counter);
    clearGlobalProps(falseFuncProp);

    // setting constant to number;
    const numberProp = 'numberProp';
    counter = runSetConstantScriptlet(numberProp, 111);
    assert.strictEqual(window[numberProp], 111);
    assert.strictEqual(window.counter, counter);
    clearGlobalProps(numberProp);

    // setting constant to -1;
    const minusOneProp = 'minusOneProp';
    counter = runSetConstantScriptlet(minusOneProp, '-1');
    assert.strictEqual(window[minusOneProp], -1);
    assert.strictEqual(window.counter, counter);
    clearGlobalProps(minusOneProp)

    // setting constant to empty string;
    const emptyStringProp = 'emptyStringProp';
    counter = runSetConstantScriptlet(emptyStringProp, '');
    assert.strictEqual(window[emptyStringProp], '');
    assert.strictEqual(window.counter, counter);
    clearGlobalProps(emptyStringProp);

    // setting constant to illegalNumber doesn't works;
    const illegalNumberProp = 'illegalNumberProp';
    counter = runSetConstantScriptlet(illegalNumberProp, 32768);
    assert.strictEqual(window[illegalNumberProp], undefined);
    assert.strictEqual(window.counter, counter - 1);
});

test('sets values to the chained properties', (assert) => {
    window.__debugScriptlets = () => {
        window.counter = window.counter ? window.counter + 1 : 1;
    };
    const runSetConstantScriptlet = createScriptletRunner(0);
    window.chained = { property: {} };
    const counter = runSetConstantScriptlet('chained.property.aaa', 'true');
    assert.strictEqual(window.chained.property.aaa, true);
    assert.strictEqual(window.counter, counter);
    clearGlobalProps('chained');
});

test('values with same types are not overwritten, values with different types are overwritten', (assert) => {
    window.__debugScriptlets = () => {
        window.counter = window.counter ? window.counter + 1 : 1;
    };
    const runSetConstantScriptlet = createScriptletRunner(0);
    const property = 'customProperty';
    const firstValue = 10;
    const anotherValue = 100;
    const anotherTypeValue = true;
    const counter = runSetConstantScriptlet(property, firstValue);
    assert.strictEqual(window[property], firstValue);
    assert.strictEqual(window.counter, counter);
    window[property] = anotherValue;
    assert.strictEqual(window[property], firstValue, 'values with same types are not overwritten');
    window[property] = anotherTypeValue;
    assert.strictEqual(window[property], anotherTypeValue, 'values with different types are overwritten');
    clearGlobalProps(property);
});
