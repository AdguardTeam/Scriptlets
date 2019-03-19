/* global QUnit */
/* eslint-disable no-eval, no-underscore-dangle */
const { test, module, testDone } = QUnit;
const name = 'set-constant';

module(name);

const evalWrapper = eval;

testDone(() => {
    delete window.hit;
});

// test('ubo alias', (assert) => {
//     const property = 'aaa';
//     const value = 'undefined';
//     const params = {
//         name: 'ubo-set-constant.js',
//         args: [property],
//         hit: () => {
//             window.hit = 'FIRED';
//         },
//     };
//     const resString = window.scriptlets.invoke(params);
//
//     window.onerror = onError(assert);
//
//     evalWrapper(resString);
//     addAndRemoveInlineScript('window.___aaa;');
//
//     assert.strictEqual(window.hit, 'FIRED');
// });

test('sets values', (assert) => {
    const property = 'aaa';
    const value = 'true';
    const params = {
        name,
        args: [property, value],
        hit: () => {
            window.hit = 'FIRED';
        },
    };
    const resString = window.scriptlets.invoke(params);
    console.log(resString);

    evalWrapper(resString);

    assert.strictEqual(window[property], true);
    assert.strictEqual(window.hit, 'FIRED');
});

// TODO maximtop check that doesn't rewrites existing properties

// test('works with chained properties', (assert) => {
//     const chainProperty = 'aaa.bbb.ccc';
//     const params = {
//         name,
//         args: [chainProperty],
//         hit: () => {
//             window.hit = 'FIRED';
//         },
//     };
//     const resString = window.scriptlets.invoke(params);
//
//     window.onerror = onError(assert);
//
//     evalWrapper(resString);
//     addAndRemoveInlineScript(`
//         var aaa = {};
//         aaa.bbb = {};
//         aaa.bbb.ccc = 'test';
//     `);
//
//     assert.strictEqual(window.hit, 'FIRED');
// });
