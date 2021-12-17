/* eslint-disable no-underscore-dangle, no-console */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'set-constant';

const nativeConsole = console.log;

const afterEach = () => {
    console.log = nativeConsole;
    clearGlobalProps('hit', '__debug', 'counter');
};

module(name, { afterEach });

const createScriptletRunner = (counter) => (...args) => {
    runScriptlet(name, args);
    counter += 1;
    return counter;
};

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const uboParams = {
        name: 'ubo-set-constant.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByUboParams = window.scriptlets.invoke(uboParams);

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

test('sets values correctly', (assert) => {
    window.__debug = () => {
        window.counter = window.counter ? window.counter + 1 : 1;
    };
    const runSetConstantScriptlet = createScriptletRunner(0);
    let counter;
    // settings constant to true;
    const trueProp = 'trueProp01';
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

    // setting constant to empty array
    const emptyArr = 'emptyArr';
    counter = runSetConstantScriptlet(emptyArr, 'emptyArr');
    assert.ok(window[emptyArr] instanceof Array);
    assert.strictEqual(window[emptyArr].length, 0);
    assert.strictEqual(window.counter, counter);
    clearGlobalProps(emptyArr);

    // setting constant to empty object
    const emptyObj = 'emptyObj';
    counter = runSetConstantScriptlet(emptyObj, 'emptyObj');
    assert.ok(window[emptyObj] instanceof Object);
    assert.strictEqual(Object.keys(window[emptyObj]).length, 0);
    assert.strictEqual(window.counter, counter);
    clearGlobalProps(emptyObj);

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
    clearGlobalProps(minusOneProp);

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
    window.__debug = () => {
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
    window.__debug = () => {
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

test('sets values correctly + stack match', (assert) => {
    window.__debug = () => {
        window.counter = window.counter ? window.counter + 1 : 1;
    };
    const stackMatch = 'set-constant';
    const runSetConstantScriptlet = createScriptletRunner(0);
    let counter;

    const trueProp = 'trueProp02';
    counter = runSetConstantScriptlet(trueProp, 'true', stackMatch);
    assert.strictEqual(window[trueProp], true, 'stack match: trueProp - ok');
    assert.strictEqual(window.counter, counter);
    clearGlobalProps(trueProp);

    const numProp = 'numProp';
    counter = runSetConstantScriptlet(numProp, 123, stackMatch);
    assert.strictEqual(window[numProp], 123, 'stack match: numProp - ok');
    assert.strictEqual(window.counter, counter);
    clearGlobalProps(numProp);
});

test('sets values correctly + no stack match', (assert) => {
    window.__debug = () => {
        window.counter = window.counter ? window.counter + 1 : 1;
    };
    window.chained = { property: {} };
    const stackNoMatch = 'no_match.js';

    runScriptlet(name, ['chained.property.aaa', 'true', stackNoMatch]);

    assert.strictEqual(window.chained.property.aaa, undefined);
    assert.strictEqual(window.counter, undefined);
    clearGlobalProps('chained');

    const property = 'customProp';
    const firstValue = 10;

    runScriptlet(name, [property, firstValue, stackNoMatch]);

    assert.strictEqual(window[property], undefined);
    assert.strictEqual(window.counter, undefined);
    clearGlobalProps(property);
});

test('set-constant: does not work - invalid regexp pattern for stack arg', (assert) => {
    window.__debug = () => {
        window.counter = window.counter ? window.counter + 1 : 1;
    };
    const stackArg = '/\\/';

    const property = 'customProp';
    const value = 10;

    runScriptlet(name, [property, value, stackArg]);

    assert.strictEqual(window[property], undefined, 'property should not be set');
    assert.strictEqual(window.counter, undefined);
    clearGlobalProps(property);
});

test('no value setting if chain is not relevant', (assert) => {
    window.chain = { property: {} };
    runScriptlet(name, ['noprop.property.aaa', 'true']);
    assert.deepEqual(window.chain.property, {}, 'predefined obj was not changed');
    assert.strictEqual(window.noprop, undefined, '"noprop" was not set');
    clearGlobalProps('chain');
});

test('no value setting if some property in chain is undefined while loading', (assert) => {
    const testObj = { prop: undefined };
    window.chain = testObj;
    runScriptlet(name, ['chain.prop.aaa', 'true']);
    assert.deepEqual(window.chain, testObj, 'predefined obj was not changed');
    clearGlobalProps('chain');
});

test('no value setting if first property in chain is null', (assert) => {
    window.chain = null;
    runScriptlet(name, ['chain.property.aaa', 'true']);
    assert.strictEqual(window.chain, null, 'predefined obj was not changed');
    clearGlobalProps('chain');
});

// for now the scriptlet does not set the chained property if one of chain prop is null.
// that might happen, for example, while loading the page.
// after the needed property is loaded, the scriptlet does not check it and do not set the value
// https://github.com/AdguardTeam/Scriptlets/issues/128
test('set value after timeout if it was null earlier', (assert) => {
    window.chain = null;
    runScriptlet(name, ['chain.property.aaa', 'true']);
    assert.strictEqual(window.chain, null, 'predefined obj was not changed');

    const done = assert.async();

    setTimeout(() => {
        window.chain = { property: {} };
    }, 50);

    setTimeout(() => {
        assert.strictEqual(window.chain.property.aaa, undefined, 'chained prop was NOT set after delay');
        done();
    }, 100);

    clearGlobalProps('chain');
});
