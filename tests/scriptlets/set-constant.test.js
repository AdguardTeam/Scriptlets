/* eslint-disable no-underscore-dangle, no-console */
import { clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'set-constant';

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

if (!isSupported) {
    test('unsupported', (assert) => {
        assert.ok(true, 'Browser does not support it');
    });
} else {
    test('sets values correctly', (assert) => {
        // settings constant to true;
        const trueProp = 'trueProp01';
        runScriptletFromTag(trueProp, 'true');
        assert.strictEqual(window[trueProp], true);
        clearGlobalProps(trueProp);

        // setting constant to false;
        const falseProp = 'falseProp';
        runScriptletFromTag(falseProp, 'false');
        assert.strictEqual(window[falseProp], false);
        clearGlobalProps(falseProp);

        // setting constant to undefined;
        const undefinedProp = 'undefinedProp';
        runScriptletFromTag(undefinedProp, 'undefined');
        assert.strictEqual(window[undefinedProp], undefined);
        clearGlobalProps(undefinedProp);

        // setting constant to null;
        const nullProp = 'nullProp';
        runScriptletFromTag(nullProp, 'null');
        assert.strictEqual(window[nullProp], null);
        clearGlobalProps(nullProp);

        // setting constant to empty array
        const emptyArr = 'emptyArr';
        runScriptletFromTag(emptyArr, 'emptyArr');
        assert.ok(window[emptyArr] instanceof Array);
        assert.strictEqual(window[emptyArr].length, 0);
        clearGlobalProps(emptyArr);

        // setting constant to empty object
        const emptyObj = 'emptyObj';
        runScriptletFromTag(emptyObj, 'emptyObj');
        assert.ok(window[emptyObj] instanceof Object);
        assert.strictEqual(Object.keys(window[emptyObj]).length, 0);
        clearGlobalProps(emptyObj);

        // setting constant to noopFunc;
        const noopFuncProp = 'noopFuncProp';
        runScriptletFromTag(noopFuncProp, 'noopFunc');
        assert.strictEqual(window[noopFuncProp](), undefined);
        clearGlobalProps(noopFuncProp);

        // setting constant to trueFunc;
        const trueFuncProp = 'trueFuncProp';
        runScriptletFromTag(trueFuncProp, 'trueFunc');
        assert.strictEqual(window[trueFuncProp](), true);
        clearGlobalProps(trueFuncProp);

        // setting constant to falseFunc;
        const falseFuncProp = 'falseFuncProp';
        runScriptletFromTag(falseFuncProp, 'falseFunc');
        assert.strictEqual(window[falseFuncProp](), false);
        clearGlobalProps(falseFuncProp);

        // setting constant to noopPromiseReject;
        const noopPromiseRejectProp = 'noopPromiseRejectProp';
        runScriptletFromTag(noopPromiseRejectProp, 'noopPromiseReject');
        assert.rejects(window[noopPromiseRejectProp]());
        clearGlobalProps(noopPromiseRejectProp);

        // setting constant to noopPromiseResolve;
        const noopPromiseResolveProp = 'noopPromiseResolveProp';
        runScriptletFromTag(noopPromiseResolveProp, 'noopPromiseResolve');
        window[noopPromiseResolveProp]().then((response) => {
            assert.ok(response);
        });
        clearGlobalProps(noopPromiseResolveProp);

        // setting constant to number;
        const numberProp = 'numberProp';
        runScriptletFromTag(numberProp, 111);
        assert.strictEqual(window[numberProp], 111);
        clearGlobalProps(numberProp);

        // setting constant to -1;
        const minusOneProp = 'minusOneProp';
        runScriptletFromTag(minusOneProp, '-1');
        assert.strictEqual(window[minusOneProp], -1);
        clearGlobalProps(minusOneProp);

        // setting constant to empty string;
        const emptyStringProp = 'emptyStringProp';
        runScriptletFromTag(emptyStringProp, '');
        assert.strictEqual(window[emptyStringProp], '');
        clearGlobalProps(emptyStringProp);

        // setting constant to 'yes';
        const yesStringProp = 'yesStringProp';
        runScriptletFromTag(yesStringProp, 'yes');
        assert.strictEqual(window[yesStringProp], 'yes');
        clearGlobalProps(yesStringProp);

        // setting constant to 'no';
        const noStringProp = 'noStringProp';
        runScriptletFromTag(noStringProp, 'no');
        assert.strictEqual(window[noStringProp], 'no');
        clearGlobalProps(noStringProp);

        // setting constant to illegalNumber doesn't works;
        const illegalNumberProp = 'illegalNumberProp';
        runScriptletFromTag(illegalNumberProp, 32768);
        assert.strictEqual(window[illegalNumberProp], undefined);
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
        runScriptletFromTag('chained.property.bbb', 10);

        assert.strictEqual(window.chained.property.aaa, true);
        assert.strictEqual(window.chained.property.bbb, 10);

        clearGlobalProps('chained');
    });

    test('sets values on the same chain (undefined)', (assert) => {
        runScriptletFromTag('chained.property.aaa', 'true');
        runScriptletFromTag('chained.property.bbb', 10);
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
        const stackMatch = 'set-constant';

        const trueProp = 'trueProp02';
        runScriptletFromTag(trueProp, 'true', stackMatch);
        assert.strictEqual(window[trueProp], true, 'stack match: trueProp - ok');
        clearGlobalProps(trueProp);

        const numProp = 'numProp';
        runScriptletFromTag(numProp, 123, stackMatch);
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

    test('set-constant: does not work - invalid regexp pattern for stack arg', (assert) => {
        const stackArg = '/\\/';

        const property = 'customProp';
        const value = 10;

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

    test('set value after undef object been created by new Function()', (assert) => {
        function InitFunc() {
            this.testFunc = () => 5;
        }

        runScriptletFromTag('window.a.b.c.testFunc', 'noopFunc');

        window.a = {
            b: {},
        };
        window.a.b.c = new InitFunc();

        const result = window.a.b.c.testFunc();
        assert.strictEqual(result, undefined, 'Value was set');
        clearGlobalProps('a');
    });
}
