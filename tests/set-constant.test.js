/* global QUnit */
/* eslint-disable no-eval, no-underscore-dangle */
import { clearProperties } from './helpers';

const { test, module, testDone } = QUnit;
const name = 'set-constant';

module(name);

const evalWrapper = eval;

const createScriptletRunner = counter => (property, value, hit) => {
    const params = {
        name,
        args: [property, value],
        hit,
    };
    const resultString = window.scriptlets.invoke(params);
    evalWrapper(resultString);
    counter += 1;
    return counter;
};

testDone(() => {
    delete window.hit;
    delete window.counter;
});

const hit = () => {
    window.counter = window.counter ? window.counter + 1 : 1;
};

test('ubo alias works', (assert) => {
    const value = 'false';
    const property = 'aaa';
    const params = {
        name: 'ubo-set-constant.js',
        args: ['aaa', value],
        hit: () => {
            window.hit = 'FIRED';
        },
    };
    const resString = window.scriptlets.invoke(params);

    evalWrapper(resString);

    assert.strictEqual(window[property], false);
    assert.strictEqual(window.hit, 'FIRED');
    clearProperties(property);
});

test('sets values correctly', (assert) => {
    const runSetConstantScriptlet = createScriptletRunner(0);
    let counter;
    // settings constant to true;
    const trueProp = 'trueProp';
    counter = runSetConstantScriptlet(trueProp, 'true', hit);
    assert.strictEqual(window[trueProp], true);
    assert.strictEqual(window.counter, counter);
    clearProperties(trueProp);

    // setting constant to false;
    const falseProp = 'falseProp';
    counter = runSetConstantScriptlet(falseProp, 'false', hit);
    assert.strictEqual(window[falseProp], false);
    assert.strictEqual(window.counter, counter);
    clearProperties(falseProp);

    // setting constant to undefined;
    const undefinedProp = 'undefinedProp';
    counter = runSetConstantScriptlet(undefinedProp, 'undefined', hit);
    assert.strictEqual(window[undefinedProp], undefined);
    assert.strictEqual(window.counter, counter);
    clearProperties(undefinedProp);

    // setting constant to null;
    const nullProp = 'nullProp';
    counter = runSetConstantScriptlet(nullProp, 'null', hit);
    assert.strictEqual(window[nullProp], null);
    assert.strictEqual(window.counter, counter);
    clearProperties(nullProp);

    // setting constant to noopFunc;
    const noopFuncProp = 'noopFuncProp';
    counter = runSetConstantScriptlet(noopFuncProp, 'noopFunc', hit);
    assert.strictEqual(window[noopFuncProp](), undefined);
    assert.strictEqual(window.counter, counter);
    clearProperties(noopFuncProp);

    // setting constant to trueFunc;
    const trueFuncProp = 'trueFuncProp';
    counter = runSetConstantScriptlet(trueFuncProp, 'trueFunc', hit);
    assert.strictEqual(window[trueFuncProp](), true);
    assert.strictEqual(window.counter, counter);
    clearProperties(trueFuncProp);

    // setting constant to falseFunc;
    const falseFuncProp = 'falseFuncProp';
    counter = runSetConstantScriptlet(falseFuncProp, 'falseFunc', hit);
    assert.strictEqual(window[falseFuncProp](), false);
    assert.strictEqual(window.counter, counter);
    clearProperties(falseFuncProp);

    // setting constant to number;
    const numberProp = 'numberProp';
    counter = runSetConstantScriptlet(numberProp, 111, hit);
    assert.strictEqual(window[numberProp], 111);
    assert.strictEqual(window.counter, counter);
    clearProperties(numberProp);

    // setting constant to empty string;
    const emptyStringProp = 'emptyStringProp';
    counter = runSetConstantScriptlet(emptyStringProp, '', hit);
    assert.strictEqual(window[emptyStringProp], '');
    assert.strictEqual(window.counter, counter);
    clearProperties(emptyStringProp);

    // setting constant to illegalNumber doesn't works;
    const illegalNumberProp = 'illegalNumberProp';
    counter = runSetConstantScriptlet(illegalNumberProp, 32768, hit);
    assert.strictEqual(window[illegalNumberProp], undefined);
    assert.strictEqual(window.counter, counter - 1);
});

test('sets values to the chained properties', (assert) => {
    const runSetConstantScriptlet = createScriptletRunner(0);
    window.chained = { property: {} };
    const counter = runSetConstantScriptlet('chained.property.aaa', 'true', hit);
    assert.strictEqual(window.chained.property.aaa, true);
    assert.strictEqual(window.counter, counter);
    clearProperties('chained');
});

test('values with same types are not overwritten, values with different types are overwritten', (assert) => {
    const runSetConstantScriptlet = createScriptletRunner(0);
    const property = 'customProperty';
    const firstValue = 10;
    const anotherValue = 100;
    const anotherTypeValue = true;
    const counter = runSetConstantScriptlet(property, firstValue, hit);
    assert.strictEqual(window[property], firstValue);
    assert.strictEqual(window.counter, counter);
    window[property] = anotherValue;
    assert.strictEqual(window[property], firstValue, 'values with same types are not overwritten');
    window[property] = anotherTypeValue;
    assert.strictEqual(window[property], anotherTypeValue, 'values with different types are overwritten');
    clearProperties(property);
});
