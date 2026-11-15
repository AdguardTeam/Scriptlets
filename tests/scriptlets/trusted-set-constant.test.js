/* eslint-disable no-underscore-dangle, no-console */
import { clearGlobalProps, runScriptlet } from '../helpers';
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

        // setting constant to simple string without quotes
        const stringProp6 = 'stringProp6';
        runScriptletFromTag(stringProp6, 'no');
        assert.strictEqual(window[stringProp6], 'no', '"no" is inferred as string');
        clearGlobalProps(stringProp6);

        const stringProp7 = 'stringProp7';
        runScriptletFromTag(stringProp7, 'yes');
        assert.strictEqual(window[stringProp7], 'yes', '"yes" is inferred as string');
        clearGlobalProps(stringProp7);

        const stringProp8 = 'stringProp8';
        runScriptletFromTag(stringProp8, 'allow');
        assert.strictEqual(window[stringProp8], 'allow', '"allow" is inferred as string');
        clearGlobalProps(stringProp8);

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
        assert.expect(2);
        const illegalProp = 'illegalProp';

        console.log = function log(input) {
            if (typeof input !== 'string') {
                return;
            }
            const messageLogged = input.includes('number values bigger than 32767 are not allowed');

            assert.ok(messageLogged, 'appropriate message is logged');
        };

        // not setting constant to illegalNumber
        runScriptletFromTag(illegalProp, '32768');
        assert.strictEqual(window[illegalProp], undefined);
        clearGlobalProps(illegalProp);
    });

    test('non-parseable values are treated as strings', (assert) => {
        // Previously non-parseable values like '{|' would throw errors
        // Now they are treated as strings
        const stringProp = 'stringProp';
        runScriptletFromTag(stringProp, '{|');
        assert.strictEqual(window[stringProp], '{|', 'non-parseable value is set as string');
        clearGlobalProps(stringProp);
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
        const firstValue = '10';
        const anotherValue = '100';
        const anotherTypeValue = 'true';

        runScriptletFromTag(property, firstValue);
        assert.strictEqual(window[property], Number(firstValue), 'initial value is set');

        addSetPropTag(property, anotherValue);
        assert.strictEqual(window[property], Number(firstValue), 'values with same types are not overwritten');

        addSetPropTag(property, anotherTypeValue);
        assert.strictEqual(window[property], true, 'values with different types are overwritten');

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

    // https://github.com/AdguardTeam/Scriptlets/issues/500
    test('stack matching prevents value access from arrow function caller', (assert) => {
        window.stackArrowProp = 'original';

        // 'arrowCaller' in stack arg should match the arrow function name in the call stack
        runScriptletFromTag('stackArrowProp', '"replaced"', 'arrowCaller');

        const script = document.createElement('script');
        script.textContent = `
            const arrowCaller = (arg = 'test') => {
                window._resultFromCaller = window.stackArrowProp;
            };
            arrowCaller();
            window._resultFromOther = window.stackArrowProp;
        `;
        document.body.append(script);

        assert.strictEqual(window._resultFromCaller, 'replaced', 'constant returned from matching arrow caller');
        assert.strictEqual(window._resultFromOther, 'original', 'original returned from non-matching context');

        clearGlobalProps('stackArrowProp', '_resultFromCaller', '_resultFromOther');
    });

    test('stack matching with named function caller', (assert) => {
        const prop = 'stackNamedFuncProp';
        window[prop] = 'original';

        // Stack arg 'myTargetFunc' should match when property is accessed from myTargetFunc
        runScriptletFromTag(prop, '"modified"', 'myTargetFunc');

        // Access from a named function that matches the stack pattern
        const script = document.createElement('script');
        script.textContent = `
            function myTargetFunc() {
                window._resultFromTarget = window.${prop};
            }
            myTargetFunc();
            window._resultFromOther = window.${prop};
        `;
        document.body.append(script);

        assert.strictEqual(window._resultFromTarget, 'modified', 'constant returned from matching func');
        assert.strictEqual(window._resultFromOther, 'original', 'original returned from non-matching context');

        clearGlobalProps(prop, '_resultFromTarget', '_resultFromOther');
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

// Rules from AdGuard filter lists, with the cases in which uBO arguments differ
module(`${name} with AdGuard rules`, { afterEach });

test('JSON string', (assert) => {
    // letv8.cc,zhibo1.cc#%#//scriptlet('trusted-set-constant', 'adsv', '"Y"')
    runScriptlet(name, ['adsv', '"Y"']);

    assert.strictEqual(window.adsv, 'Y', 'string set');
    // the page cancels the constant by a value of another type
    window.adsv = 5;
    assert.strictEqual(window.adsv, 5, 'value of another type replaces the constant');
});

test('JSON object is set as a whole', (assert) => {
    // lexlege.pl#%#//scriptlet('trusted-set-constant', 'gapi', '{"plusone": {}}')
    runScriptlet(name, ['gapi', '{"plusone": {}}']);

    assert.deepEqual(window.gapi, { plusone: {} }, 'object set');
});

test('plain text is set as a string', (assert) => {
    // otakufilmes.org#%#//scriptlet('trusted-set-constant', 'otakuAdsState', 'clear')
    runScriptlet(name, ['otakuAdsState', 'clear']);

    assert.strictEqual(window.otakuAdsState, 'clear', 'text set');
});

test('valueWrapper, as in set-constant', (assert) => {
    // lexlege.pl#%#//scriptlet('trusted-set-constant', 'gapi', '{"plusone": {}}'), with `asFunction`
    // and another property, as `gapi` is already set by the test above
    runScriptlet(name, ['gapiFunction', '{"plusone": {}}', '', 'asFunction']);

    assert.strictEqual(typeof window.gapiFunction, 'function', 'function set');
    assert.deepEqual(window.gapiFunction(), { plusone: {} }, 'function returns the value');
});

// Rules from uBO filter lists, converted to AdGuard syntax by AGTree,
// so that their arguments are the same as received by the scriptlet
module(`${name} with uBO arguments`, { afterEach });

test('{"value": …} sets the value, not the object', (assert) => {
    // octopusenergy.de##+js(trusted-set, cmp_importvendors, '{"value": ["s23","s2564"]}')
    runScriptlet('ubo-trusted-set', ['cmp_importvendors', '{"value": ["s23","s2564"]}']);

    assert.deepEqual(window.cmp_importvendors, ['s23', 's2564'], 'value set');
});

test('json: in a chain created later', (assert) => {
    // littlebigsnake.com##+js(trusted-set, ADS.STATUS_ERROR, json:"COMPLETE")
    runScriptlet('ubo-trusted-set', ['ADS.STATUS_ERROR', 'json:"COMPLETE"']);
    window.ADS = { STATUS_ERROR: 'ERROR' };

    assert.strictEqual(window.ADS.STATUS_ERROR, 'COMPLETE', 'value set in the chain');
});

test('writes of the page are ignored, also of another type', (assert) => {
    // savefrom.net##+js(trusted-set, clickAds.banner.urls, 'json:[{"url":{"limit":0,"url":""}}]')
    runScriptlet('ubo-trusted-set', ['clickAds.banner.urls', 'json:[{"url":{"limit":0,"url":""}}]']);
    window.clickAds = { banner: { urls: [{ url: 'https://ads.example' }] } };
    const expected = [{ url: { limit: 0, url: '' } }];

    assert.deepEqual(window.clickAds.banner.urls, expected, 'value set');
    window.clickAds.banner.urls = 'https://ads.example';
    assert.deepEqual(window.clickAds.banner.urls, expected, 'write of another type ignored');
});

test('as, function', (assert) => {
    // funradio.fr##+js(trusted-set, getUserConsentStatus, json:{"dailymotion":true}, as, function)
    runScriptlet('ubo-trusted-set', ['getUserConsentStatus', 'json:{"dailymotion":true}', 'as', 'function']);

    assert.strictEqual(typeof window.getUserConsentStatus, 'function', 'function set');
    assert.deepEqual(window.getUserConsentStatus(), { dailymotion: true }, 'function returns the value');
});

test('other text is undefined, as in uBO', (assert) => {
    // emturbovid.com,…##+js(trusted-set, premium, "'1'"), converted by AGTree to `\'1\'`
    window.premium = 0;
    runScriptlet('ubo-trusted-set', ['premium', "\\'1\\'"]);

    assert.strictEqual(window.premium, undefined, 'undefined set');
    window.premium = 1;
    assert.strictEqual(window.premium, undefined, 'write ignored');
});

test('trueFunc looks like a native function named as the property', (assert) => {
    // synthetic, no uBO rule of trusted-set uses noopFunc, trueFunc or falseFunc yet,
    // e.g. example.org##+js(trusted-set, uboCloakTest.isEnabled, trueFunc)
    runScriptlet('ubo-trusted-set', ['uboCloakTest.isEnabled', 'trueFunc']);
    window.uboCloakTest = {};

    const fn = window.uboCloakTest.isEnabled;
    assert.strictEqual(fn(), true, 'function returns true');
    assert.strictEqual(fn.name, 'isEnabled', 'named as the property');
    assert.strictEqual(fn.toString(), 'function isEnabled() { [native code] }', 'looks like a native function');
});

test.each('uBO names', [
    ['ubo-trusted-set-constant.js', 'uboNameTest1'],
    ['ubo-trusted-set-constant', 'uboNameTest2'],
    ['ubo-trusted-set.js', 'uboNameTest3'],
    ['ubo-trusted-set', 'uboNameTest4'],
], (assert, [uboName, property]) => {
    // octopusenergy.de##+js(trusted-set, cmp_importvendors, '{"value": ["s23","s2564"]}'), with another property
    runScriptlet(uboName, [property, '{"value": ["s23","s2564"]}']);

    assert.deepEqual(window[property], ['s23', 's2564'], 'uBO arguments are used');
});
