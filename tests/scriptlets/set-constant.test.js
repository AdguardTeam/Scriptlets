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

const runUboAliasFromTag = (...args) => {
    const params = {
        name: 'ubo-set-constant',
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
        const nullProp1 = 'nullProp1';
        runScriptletFromTag(nullProp1, 'null');
        assert.strictEqual(window[nullProp1], null);
        clearGlobalProps(nullProp1);

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

        // setting constant to noopCallbackFunc;
        const noopCallbackFuncProp = 'noopCallbackFunc';
        runScriptletFromTag(noopCallbackFuncProp, 'noopCallbackFunc');
        const noopFuncCb = window[noopCallbackFuncProp]();
        assert.ok(typeof noopFuncCb === 'function', 'returns function');
        assert.strictEqual(noopFuncCb(), undefined, 'function returns undefined');
        clearGlobalProps(noopCallbackFuncProp);

        // setting constant to noopCallbackFunc;
        const throwFuncProp = 'throwFunc';
        runScriptletFromTag(throwFuncProp, 'throwFunc');
        assert.throws(() => window[throwFuncProp]()(), 'throwFuncProp throws an error');
        clearGlobalProps(throwFuncProp);

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
        clearGlobalProps(illegalNumberProp);
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
        runScriptletFromTag('nullProp2', 15);
        assert.strictEqual(window.nullProp2, 15, 'null end prop changed');
        clearGlobalProps('nullProp2');
    });

    test('set value through chain with empty object', (assert) => {
        window.emptyObj = {};
        runScriptletFromTag('emptyObj.a.prop', 'true');
        window.emptyObj.a = {};
        assert.strictEqual(window.emptyObj.a.prop, true, 'target prop set');
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

    test('value wrappers returning correct values', (assert) => {
        // Test asFunc
        window.funcProp = null;
        runScriptletFromTag('window.funcProp', 'yes', '', 'asFunction');

        let func = window.funcProp;
        assert.strictEqual(typeof func, 'function', 'Function was set');

        let value = func();
        assert.strictEqual(value, 'yes', 'function returns correct value');

        // Test asCallback
        window.callbackProp = null;
        runScriptletFromTag('window.callbackProp', 'emptyArr', '', 'asCallback');

        func = window.callbackProp;
        assert.strictEqual(typeof func, 'function', 'Function was set');

        const callback = func();
        assert.strictEqual(typeof callback, 'function', 'Function returns callback');

        value = callback();
        assert.ok(Array.isArray(value), 'callback returns array');
        assert.strictEqual(value.length, 0, 'callback returns empty array');

        // Test asResolved
        window.resolvedPromise = null;
        runScriptletFromTag('window.resolvedPromise', 'noopFunc', '', 'asResolved');

        window.resolvedPromise.then((func) => {
            assert.strictEqual(typeof func, 'function', 'Promise resolved with correct value');
            assert.strictEqual(func(), undefined, 'function', 'Promise resolved with correct value');
        });

        // Test asRejected
        window.rejectedPromise = null;
        runScriptletFromTag('window.rejectedPromise', 42, '', 'asRejected');

        window.rejectedPromise
            .catch((reason) => {
                assert.strictEqual(reason, 42, 'Promise rejected with correct value');
            });

        clearGlobalProps('funcProp', 'callbackProp', 'resolvedPromise', 'rejectedPromise');
    });

    test('value wrapper argument correctly reorganized for ubo-set-constant', (assert) => {
        // 'asFunction' will be moved from third argument (stack) to fourth argument (valueWrapper)
        runUboAliasFromTag('window.funcProp', 'yes', 'asFunction');

        let func = window.funcProp;
        assert.strictEqual(typeof func, 'function', 'Function was set');
        assert.strictEqual(func(), 'yes', 'get correct value after arguments swap');

        clearGlobalProps('funcProp');

        // '3' will be discarded
        runUboAliasFromTag('window.funcProp', 'yes', '3');

        func = window.funcProp;
        assert.strictEqual(typeof func, 'function', 'Function was set');
        assert.strictEqual(func(), 'yes', 'get correct value after skipping defer arg');

        clearGlobalProps('funcProp');
    });

    // https://github.com/AdguardTeam/Scriptlets/issues/330
    test('Check overriden value - array', (assert) => {
        runScriptletFromTag('pageData.__banners.0.commercial.mediaUrl', '', '', '', 'true');
        const done = assert.async();
        window.pageData = {
            __banners: [{
                commercial: {
                    mediaUrl: 'test',
                },
            }, {
                commercial: {
                    mediaUrl: 'test',
                },
            }],
        };

        setTimeout(() => {
            window.pageData.__banners = [{
                commercial: {
                    mediaUrl: 'test',
                },
            }, {
                commercial: {
                    mediaUrl: 'test',
                },
            }];
        }, 50);

        setTimeout(() => {
            const result = window.pageData.__banners[0].commercial.mediaUrl;
            assert.strictEqual(result, '', 'pageData.__banners.0.commercial.mediaUrl was set to empty string');
            done();
            clearGlobalProps('pageData');
        }, 100);
    });

    // https://github.com/AdguardTeam/Scriptlets/issues/330
    test('Check overriden - array 2', (assert) => {
        runScriptletFromTag('pageData.__banners.0.commercial.mediaUrl', '', '', '', 'true');
        const done = assert.async();
        window.pageData = {
            __banners: [{
                commercial: {
                    mediaUrl: 'test',
                    jumpUrl: 'test',
                    title: 'test',
                    notChange: 'test',
                    update: false,
                },
            }, {
                commercial: {
                    mediaUrl: 'test',
                },
            }],
        };

        setTimeout(() => {
            window.pageData.__banners = [{
                commercial: {
                    mediaUrl: 'test',
                    jumpUrl: 'test1',
                    title: 'test1',
                    notChange: 'test',
                    asdf: 'test',
                    update: true,
                },
            }, {
                commercial: {
                    mediaUrl: 'test',
                    foo: 1,
                },
            }];
        }, 50);

        setTimeout(() => {
            // Should be changed
            const result1 = window.pageData.__banners[0].commercial.mediaUrl;
            assert.strictEqual(result1, '', 'pageData.__banners.0.commercial.mediaUrl was set to empty string');
            // Should NOT be changed by scriptlet
            const result2 = window.pageData.__banners[0].commercial.jumpUrl;
            const result3 = window.pageData.__banners[0].commercial.title;
            const result4 = window.pageData.__banners[0].commercial.notChange;
            const result5 = window.pageData.__banners[0].commercial.asdf;
            const result6 = window.pageData.__banners[0].commercial.update;
            const result7 = window.pageData.__banners[1].commercial.mediaUrl;
            const result8 = window.pageData.__banners[1].commercial.foo;
            // eslint-disable-next-line max-len
            assert.strictEqual(result2, 'test1', 'pageData.__banners.0.commercial.jumpUrl was not changed by scriptlet');
            assert.strictEqual(result3, 'test1', 'pageData.__banners.0.commercial.title was not changed by scriptlet');
            assert.strictEqual(result4, 'test', 'pageData.__banners.0.commercial.notChange was not changed');
            assert.strictEqual(result5, 'test', 'pageData.__banners.0.commercial.asdf was not changed');
            assert.strictEqual(result6, true, 'pageData.__banners.0.commercial.update was not changed by scriptlet');
            assert.strictEqual(result7, 'test', 'pageData.__banners.1.commercial.mediaUrl was not changed');
            assert.strictEqual(result8, 1, 'pageData.__banners.1.commercial.foo was not changed');
            done();
            clearGlobalProps('pageData');
        }, 100);
    });

    // Fixing this issue will require synchronization between the scriptlets
    // TODO: uncomment test when synchronization between the scriptlets is added
    // https://github.com/AdguardTeam/Scriptlets/issues/330
    // test('Check overriden few values - array', (assert) => {
    //     runScriptletFromTag('pageData.__banners.0.commercial.mediaUrl', '');
    //     runScriptletFromTag('pageData.__banners.0.commercial.jumpUrl', '');
    //     runScriptletFromTag('pageData.__banners.0.commercial.title', '');
    //     runScriptletFromTag('abcd.__banners.0.commercial.update', '');
    //     const done = assert.async();
    //     window.pageData = {
    //         __banners: [{
    //             commercial: {
    //                 mediaUrl: 'test',
    //                 jumpUrl: 'test',
    //                 title: 'test',
    //                 notChange: 'test',
    //                 update: false,
    //             },
    //         }, {
    //             commercial: {
    //                 mediaUrl: 'test',
    //             },
    //         }],
    //     };

    //     setTimeout(() => {
    //         window.pageData.__banners = [{
    //             commercial: {
    //                 mediaUrl: 'test',
    //                 jumpUrl: 'test',
    //                 title: 'test',
    //                 notChange: 'test',
    //                 asdf: 'test',
    //                 update: true,
    //             },
    //         }, {
    //             commercial: {
    //                 mediaUrl: 'test',
    //                 foo: 1,
    //             },
    //         }];
    //     }, 50);

    //     setTimeout(() => {
    //         // Should be changed
    //         const result1 = window.pageData.__banners[0].commercial.mediaUrl;
    //         const result2 = window.pageData.__banners[0].commercial.jumpUrl;
    //         const result3 = window.pageData.__banners[0].commercial.title;
    //         assert.strictEqual(result1, '', 'pageData.__banners.0.commercial.mediaUrl was set to empty string');
    //         assert.strictEqual(result2, '', 'pageData.__banners.0.commercial.jumpUrl was set to empty string');
    //         assert.strictEqual(result3, '', 'pageData.__banners.0.commercial.title was set to empty string');
    //         // Should NOT be changed by scriptlet
    //         const result4 = window.pageData.__banners[0].commercial.notChange;
    //         const result5 = window.pageData.__banners[0].commercial.asdf;
    //         const result6 = window.pageData.__banners[0].commercial.update;
    //         const result7 = window.pageData.__banners[1].commercial.mediaUrl;
    //         const result8 = window.pageData.__banners[1].commercial.foo;
    //         assert.strictEqual(result4, 'test', 'pageData.__banners.0.commercial.notChange was not changed');
    //         assert.strictEqual(result5, 'test', 'pageData.__banners.0.commercial.asdf was not changed');
    //         assert.strictEqual(result6, true, 'pageData.__banners.0.commercial.update was not changed by scriptlet');
    //         assert.strictEqual(result7, 'test', 'pageData.__banners.1.commercial.mediaUrl was not changed');
    //         assert.strictEqual(result8, 1, 'pageData.__banners.1.commercial.foo was not changed');
    //         done();
    //         clearGlobalProps('pageData');
    //     }, 100);
    // });

    // https://github.com/AdguardTeam/Scriptlets/issues/330
    test('Check overriden value - object', (assert) => {
        runScriptletFromTag('foo.prototype.abc.qwerty', 'false', '', '', 'true');
        window.foo = function name() { };
        window.foo.prototype = { bar: 1 };
        window.foo.prototype.abc = {
            qwerty: true,
        };
        const result = window.foo.prototype.abc.qwerty;
        assert.strictEqual(result, false, 'foo.prototype.abc.qwerty was set to false');
        clearGlobalProps('foo');
    });

    // https://github.com/AdguardTeam/Scriptlets/issues/330
    test('Override value 2 times - object', (assert) => {
        runScriptletFromTag('foo.prototype.abc.qwerty', 'false', '', '', 'true');
        window.foo = function name() { };
        window.foo.prototype = { bar: 1 };
        window.foo.prototype.abc = {
            boo: true,
        };
        window.foo.prototype.abc = {
            qwerty: true,
        };
        const result = window.foo.prototype.abc.qwerty;
        assert.strictEqual(result, false, 'foo.prototype.abc.qwerty was set to false');
        clearGlobalProps('foo');
    });

    // Fixing this issue will require synchronization between the scriptlets
    // TODO: uncomment test when synchronization between the scriptlets is added
    // https://github.com/AdguardTeam/Scriptlets/issues/330
    // test('Check overriden few values - object', (assert) => {
    //     runScriptletFromTag('foo.prototype.abc.qwerty', 'false');
    //     runScriptletFromTag('foo.prototype.bar', '0');
    //     window.foo = function name() { };
    //     window.foo.prototype = { bar: 1 };
    //     window.foo.prototype.abc = {
    //         qwerty: true,
    //     };
    //     const result1 = window.foo.prototype.abc.qwerty;
    //     const result2 = window.foo.prototype.bar;
    //     assert.strictEqual(result1, false, 'foo.prototype.abc.qwerty was set to false');
    //     assert.strictEqual(result2, 0, 'foo.prototype.bar was set to 0');
    //     clearGlobalProps('foo');
    // });

    // https://github.com/AdguardTeam/Scriptlets/issues/330
    test('Check overriden value - object + similar object which should not be overriden', (assert) => {
        runScriptletFromTag('foo.prototype.abc.qwerty', 'false', '', '', 'true');
        window.foo = function name() { };
        window.foo.prototype = { bar: 1 };
        window.foo.prototype.abc = {
            qwerty: true,
        };
        window.foo.prototype.zxc = {
            abc: {
                qwerty: true,
            },
        };
        const result1 = window.foo.prototype.abc.qwerty;
        assert.strictEqual(result1, false, 'foo.prototype.abc.qwerty was set to false');
        const result2 = window.foo.prototype.zxc.abc.qwerty;
        assert.strictEqual(result2, true, 'foo.prototype.zxc.abc.qwerty was not changed');
        clearGlobalProps('foo');
    });

    // https://github.com/AdguardTeam/Scriptlets/issues/330
    test('Check overriden value - object, do not overwrite', (assert) => {
        runScriptletFromTag('foo.prototype.abc.qwerty', 'false');
        runScriptletFromTag('baz.prototype.not.qwerty', 'false');
        window.baz = function name() { };
        window.baz.prototype = { bar: 1 };
        window.baz.prototype.abc = {
            qwerty: true,
        };
        const result = window.baz.prototype.abc.qwerty;
        assert.strictEqual(result, true, 'baz.prototype.abc.qwerty was not changed');
        clearGlobalProps('baz');
    });

    test('Check if Object.prototype.<property> has been overwriten', (assert) => {
        runScriptletFromTag('Object.prototype.withAds', 'false');
        let result;
        (() => {
            const testFunc = function test() { };
            testFunc.prototype.withAds = true;
            result = testFunc.prototype.withAds;
            testFunc();
        })();
        assert.strictEqual(result, false, 'Object.prototype.withAds was set to false');
    });

    test('Check if property chain has been created', (assert) => {
        runScriptletFromTag('ads', 'noopFunc');
        runScriptletFromTag('ads.videoAd', 'noopFunc');
        runScriptletFromTag('ads.videoAd.loadModule', 'trueFunc');
        assert.strictEqual(typeof window.ads === 'function', true, 'ads was set to function');
        assert.strictEqual(typeof window.ads.videoAd === 'function', true, 'ads.videoAd was set to function');
        // eslint-disable-next-line max-len
        assert.strictEqual(window.ads.videoAd.loadModule(), true, 'ads.videoAd.loadModule was set to function which returns true');
    });

    test('Test for reassignment 1', (assert) => {
        runScriptletFromTag('zxcv.test.bar.qw', 'trueFunc', '', '', 'true');
        const funcOne = () => 1;
        window.zxcv = {};
        // Reassign
        window.zxcv = {};
        window.zxcv.mnb = true;
        window.zxcv.test = {
            bar: {
                qw: funcOne,
            },
        };
        const result = window.zxcv.test.bar.qw();
        assert.strictEqual(window.zxcv.mnb, true, 'redefined correctly');
        assert.strictEqual(result, true, 'redefined correctly by scriptlet');
        clearGlobalProps('zxcv');
    });

    test('Test for reassignment 2', (assert) => {
        runScriptletFromTag('WO.adblock.useAdblocker', 'false', '', '', 'true');

        window.WO = window.WO || {};
        window.WO.strings = window.WO.strings || {};
        // Reassign
        window.WO = window.WO || {};
        window.WO.strings = window.WO.strings || {};
        window.WO.test = 1;
        window.WO.adblock = {
            useAdblocker: true,
        };
        assert.strictEqual(window.WO.test, 1, 'WO.test redefined correctly');
        assert.strictEqual(window.WO.adblock.useAdblocker, false, 'WO.adblock.useAdblocker set to false by scriptlet');
        clearGlobalProps('WO');
    });

    test('Should not set', (assert) => {
        runScriptletFromTag('something.start.stop', 'false');

        window.something = window.something || {};
        assert.strictEqual(window.something.start, undefined, 'something.start was not set');
        clearGlobalProps('something');
    });

    test('Check if proxy was not set many times', (assert) => {
        runScriptletFromTag('proxy.test.abc', 'trueFunc', '', '', 'true');

        // Expected number of calls to getOwnPropertyDescriptor
        const EXPECTED_NUMBER = 4;

        let number = 0;
        window.proxy = window.proxy || {};

        const handler = {
            getOwnPropertyDescriptor(target, prop) {
                number += 1;
                return Reflect.getOwnPropertyDescriptor(target, prop);
            },
        };

        window.proxy = new Proxy(window.proxy, handler);

        // Access object 100 times, if getOwnPropertyDescriptor was called more than 4 times
        // it means that proxy was set more than once
        for (let index = 0; index < 100; index += 1) {
            if (number > EXPECTED_NUMBER) {
                break;
            }
            window.proxy = window.proxy || {};
        }
        window.proxy.test = {
            abc: () => false,
        };
        const result = window.proxy.test.abc();
        assert.strictEqual(result, true, 'proxy.test.abc set to true by scriptlet');
        assert.strictEqual(number, EXPECTED_NUMBER, `getOwnPropertyDescriptor was called ${EXPECTED_NUMBER} times`);
        clearGlobalProps('proxy');
    });
}
