/* eslint-disable no-underscore-dangle, no-console */
import { clearGlobalProps } from '../helpers';
import { nativeIsNaN } from '../../src/helpers';

const { test, module } = QUnit;
const name = 'trusted-set-constant';

const nativeConsole = console.log;

const afterEach = () => {
    console.log = nativeConsole;
    clearGlobalProps('hit', '__debug', 'counter');
};

module(name, { afterEach });

const runScriptletFromTag = (...args) => {
    const params = {
        name,
        args,
        verbose: true,
    };
    const script = document.createElement('script');
    script.textContent = window.scriptlets.invoke(params);
    document.body.append(script);
};

const addSetPropTag = (property, value) => {
    const script = document.createElement('script');
    script.textContent = `window['${property}'] = ${value};`;
    document.body.append(script);
};

/**
 * document.body.append does not work in Edge 15
 * https://caniuse.com/mdn-api_element_append
 */
const isSupported = (() => typeof document.body.append !== 'undefined')();

if (!isSupported) {
    test('unsupported', (assert) => {
        assert.ok(true, 'Browser does not support it');
    });
} else {
    test('Infer and set values correctly', (assert) => {
        // setting constant to true
        const trueProp = 'trueProp';
        runScriptletFromTag(trueProp, 'true');
        assert.strictEqual(window[trueProp], true, '"true" is set as boolean');
        clearGlobalProps(trueProp);

        // setting constant to false
        const falseProp = 'falseProp';
        runScriptletFromTag(falseProp, 'false');
        assert.strictEqual(window[falseProp], false, '"false" is set as boolean');
        clearGlobalProps(falseProp);

        // setting constant to undefined
        const undefinedProp = 'undefinedProp';
        runScriptletFromTag(undefinedProp, 'undefined');
        assert.strictEqual(window[undefinedProp], undefined, '"undefined" is set as undefined');
        clearGlobalProps(undefinedProp);

        // setting constant to null
        const nullProp1 = 'nullProp';
        runScriptletFromTag(nullProp1, 'null');
        assert.strictEqual(window[nullProp1], null, '"null" is set as null');
        clearGlobalProps(nullProp1);

        // setting constant to string
        const stringProp1 = 'stringProp1';
        runScriptletFromTag(stringProp1, '"123arbitrary string"');
        assert.strictEqual(window[stringProp1], '123arbitrary string', 'arbitrary type value is set');
        clearGlobalProps(stringProp1);

        const stringProp2 = 'stringProp2';
        runScriptletFromTag(stringProp2, '"true"');
        assert.strictEqual(window[stringProp2], 'true', '"true" is set as string');
        clearGlobalProps(stringProp2);

        const stringProp3 = 'stringProp3';
        runScriptletFromTag(stringProp3, '"NaN"');
        assert.strictEqual(window[stringProp3], 'NaN', '"NaN" is set as string');
        clearGlobalProps(stringProp3);

        const stringProp4 = 'stringProp4';
        runScriptletFromTag(stringProp4, '"undefined"');
        assert.strictEqual(window[stringProp4], 'undefined', '"undefined" is set as string');
        clearGlobalProps(stringProp4);

        const stringProp5 = 'stringProp5';
        runScriptletFromTag(stringProp5, '"null"');
        assert.strictEqual(window[stringProp5], 'null', '"null" is set as string');
        clearGlobalProps(stringProp5);

        // setting constant to NaN
        const nanProp1 = 'nanProp';
        runScriptletFromTag(nanProp1, 'NaN');
        assert.ok(nativeIsNaN(window[nanProp1]), '"NaN" is set as NaN');
        clearGlobalProps(nanProp1);

        // setting constant to number
        const numberProp = 'numberProp';
        runScriptletFromTag(numberProp, '1234');
        assert.strictEqual(window[numberProp], 1234, '"1234" is set as number');
        clearGlobalProps(numberProp);

        // setting constant to a negative number
        const minusOneProp = 'minusOneProp';
        runScriptletFromTag(minusOneProp, '-12.34');
        assert.strictEqual(window[minusOneProp], -12.34, '"-12.34" is set as number');
        clearGlobalProps(minusOneProp);

        // setting constant to array
        const arrayProp = 'arrayProp';
        runScriptletFromTag(arrayProp, '[1,2,3,"string"]');
        assert.deepEqual(window[arrayProp], [1, 2, 3, 'string'], '"[1,2,3,"string"]" is set as array');
        clearGlobalProps(arrayProp);

        // setting constant to array
        const objectProp = 'objectProp';
        const expected = {
            aaa: 123,
            bbb: {
                ccc: 'string',
            },
        };
        runScriptletFromTag(objectProp, '{"aaa":123,"bbb":{"ccc":"string"}}');
        assert.deepEqual(window[objectProp], expected, '"{"aaa":123,"bbb":{"ccc":"string"}}" is set as object');
        clearGlobalProps(objectProp);
    });

    test('illegal values are handled', (assert) => {
        assert.expect(4);
        const illegalProp = 'illegalProp';

        console.log = function log(input) {
            if (typeof input !== 'string') {
                return;
            }
            const messageLogged = input.includes('number values bigger than 32767 are not allowed')
                || input.includes('value type can\'t be inferred');

            assert.ok(messageLogged, 'appropriate message is logged');
        };

        // not setting constant to illegalNumber
        runScriptletFromTag(illegalProp, 32768);
        assert.strictEqual(window[illegalProp], undefined);
        clearGlobalProps(illegalProp);

        // not setting constant to unknown value
        runScriptletFromTag(illegalProp, '{|');
        assert.strictEqual(window[illegalProp], undefined);
        clearGlobalProps(illegalProp);
    });

    test('keep other keys after setting a value', (assert) => {
        window.testObj = {
            testChain: null,
        };
        runScriptletFromTag('testObj.testChain.testProp', 'true');
        window.testObj.testChain = {
            testProp: false,
            otherProp: 'someValue',
            testMethod: () => { },
        };
        assert.strictEqual(window.testObj.testChain.testProp, true, 'target prop set');
        assert.strictEqual(window.testObj.testChain.otherProp, 'someValue', 'sibling value property is kept');
        assert.strictEqual(typeof window.testObj.testChain.testMethod, 'function', 'sibling function property is kept');
        clearGlobalProps('testObj');
    });

    test('set value on null prop', (assert) => {
        // end prop is null
        window.nullProp2 = null;
        runScriptletFromTag('nullProp2', '15');
        assert.strictEqual(window.nullProp2, 15, 'null end prop changed');
        clearGlobalProps('nullProp2');
    });

    test('set value through chain with empty object', (assert) => {
        window.emptyObj = {};
        runScriptletFromTag('emptyObj.a.prop', '"true"');
        window.emptyObj.a = {};
        assert.strictEqual(window.emptyObj.a.prop, 'true', 'target prop set');
        clearGlobalProps('emptyObj');
    });

    test('set value through chain with null', (assert) => {
        // null prop in chain
        window.nullChain = {
            nullProp: null,
        };
        runScriptletFromTag('nullChain.nullProp.endProp', 'true');
        window.nullChain.nullProp = {
            endProp: false,
        };
        assert.strictEqual(window.nullChain.nullProp.endProp, true, 'chain with null trapped');
        clearGlobalProps('nullChain');
    });

    test('sets values to the chained properties', (assert) => {
        window.chained = { property: {} };
        runScriptletFromTag('chained.property.aaa', 'true');
        assert.strictEqual(window.chained.property.aaa, true);
        clearGlobalProps('chained');
    });

    test('sets values on the same chain (defined)', (assert) => {
        window.chained = { property: {} };
        runScriptletFromTag('chained.property.aaa', 'true');
        runScriptletFromTag('chained.property.bbb', '10');

        assert.strictEqual(window.chained.property.aaa, true);
        assert.strictEqual(window.chained.property.bbb, 10);

        clearGlobalProps('chained');
    });

    test('sets values on the same chain (undefined)', (assert) => {
        runScriptletFromTag('chained.property.aaa', 'true');
        runScriptletFromTag('chained.property.bbb', '10');
        window.chained = { property: {} };

        assert.strictEqual(window.chained.property.aaa, true);
        assert.strictEqual(window.chained.property.bbb, 10);

        clearGlobalProps('chained');
    });

    test('values with same types are not overwritten, values with different types are overwritten', (assert) => {
        const property = 'customProperty';
        const firstValue = 10;
        const anotherValue = 100;
        const anotherTypeValue = true;

        runScriptletFromTag(property, firstValue);
        assert.strictEqual(window[property], firstValue);

        addSetPropTag(property, anotherValue);
        assert.strictEqual(window[property], firstValue, 'values with same types are not overwritten');

        addSetPropTag(property, anotherTypeValue);
        assert.strictEqual(window[property], anotherTypeValue, 'values with different types are overwritten');

        clearGlobalProps(property);
    });

    test('sets values correctly + stack match', (assert) => {
        const stackMatch = 'trusted-set-constant';
        const trueProp = 'trueProp02';
        runScriptletFromTag(trueProp, 'true', stackMatch);
        assert.strictEqual(window[trueProp], true, 'stack match: trueProp - ok');
        clearGlobalProps(trueProp);

        const numProp = 'numProp';
        runScriptletFromTag(numProp, '123', stackMatch);
        assert.strictEqual(window[numProp], 123, 'stack match: numProp - ok');
        clearGlobalProps(numProp);
    });

    test('sets values correctly + no stack match', (assert) => {
        window.chained = { property: {} };
        const stackNoMatch = 'no_match.js';

        runScriptletFromTag('chained.property.aaa', 'true', stackNoMatch);

        assert.strictEqual(window.chained.property.aaa, undefined);
        clearGlobalProps('chained');

        const property = 'customProp';
        const firstValue = 10;

        runScriptletFromTag(property, firstValue, stackNoMatch);

        assert.strictEqual(window[property], undefined);
        clearGlobalProps(property);
    });

    test('trusted-set-constant: does not work - invalid regexp pattern for stack arg', (assert) => {
        const stackArg = '/\\/';

        const property = 'customProp';
        const value = '10';

        runScriptletFromTag(property, value, stackArg);

        assert.strictEqual(window[property], undefined, 'property should not be set');
        clearGlobalProps(property);
    });

    test('no value setting if chain is not relevant', (assert) => {
        window.chain = { property: {} };
        runScriptletFromTag('noprop.property.aaa', 'true');
        assert.deepEqual(window.chain.property, {}, 'predefined obj was not changed');
        assert.strictEqual(window.noprop, undefined, '"noprop" was not set');
        clearGlobalProps('chain');
    });

    test('no value setting if some property in chain is undefined while loading', (assert) => {
        const testObj = { prop: undefined };
        window.chain = testObj;
        runScriptletFromTag('chain.prop.aaa', 'true');
        assert.deepEqual(window.chain, testObj, 'predefined obj was not changed');
        clearGlobalProps('chain');
    });

    test('no value setting if first property in chain is null', (assert) => {
        window.chain = null;
        runScriptletFromTag('chain.property.aaa', 'true');
        assert.strictEqual(window.chain, null, 'predefined obj was not changed');
        clearGlobalProps('chain');
    });

    // for now the scriptlet does not set the chained property if one of chain prop is null.
    // that might happen, for example, while loading the page.
    // after the needed property is loaded, the scriptlet does not check it and do not set the value
    // https://github.com/AdguardTeam/Scriptlets/issues/128
    test('set value after timeout if it was null earlier', (assert) => {
        window.chain = null;
        runScriptletFromTag('chain.property.aaa', 'true');
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

    test('set value after loop reassignment', (assert) => {
        window.loopObj = {
            chainProp: {
                aaa: true,
            },
        };
        runScriptletFromTag('loopObj.chainProp.bbb', '1');
        // eslint-disable-next-line no-self-assign
        window.loopObj = window.loopObj;
        window.loopObj.chainProp.bbb = 0;
        assert.strictEqual(window.loopObj.chainProp.bbb, 1, 'value set after loop reassignment');
        clearGlobalProps('loopObj');
    });

    test('trying to set non-configurable silently exits', (assert) => {
        assert.expect(2);
        console.log = function log(input) {
            if (typeof input !== 'string') {
                return;
            }
            assert.ok(input.includes('testProp'), 'non-configurable prop logged');
        };
        Object.defineProperty(window, 'testProp', {
            value: 5,
            configurable: false,
        });
        runScriptletFromTag('window.testProp', '0');
        assert.strictEqual(window.testProp, 5, 'error avoided');
        clearGlobalProps('testProp');
    });
}
