/* global QUnit */
/* eslint-disable no-eval, no-underscore-dangle */
const { test, module } = QUnit;
const name = 'abort-current-inline-script';

module(name);

// test('abort-on-property-read simple check ubo alias', (assert) => {
//     const property = '___aaa';
//     const params = {
//         name: `ubo-${name}.js`,
//         args: [property],
//     };
//     window[property] = 'value';
//     const resString = window.scriptlets.invoke(params);
//     eval(resString);
//     assert.throws(
//         () => window[property],
//         /ReferenceError/,
//         `should throw Reference error when try to access property ${property}`,
//     );
// });

// test('abort-on-property-read simple check abp alias', (assert) => {
//     const property = '___aaa';
//     const params = {
//         name: `abp-${name}`,
//         args: [property],
//     };
//     window[property] = 'value';
//     const resString = window.scriptlets.invoke(params);
//     eval(resString);
//     assert.throws(
//         () => window[property],
//         /ReferenceError/,
//         `should throw Reference error when try to access property ${property}`,
//     );
// });
//
test('abort-current-inline-script works', (assert) => {
    const property = '___aaa';
    const params = {
        name,
        args: [property],
    };
    window[property] = 'value';
    const resString = window.scriptlets.invoke(params);
    console.log(resString);
    eval(resString);
    // assert.ok(true);
    assert.throws(
        () => {
            const scriptElement = document.createElement('script');
            scriptElement.type = 'text/javascript';
            scriptElement.innerText = 'const test = window.___aaa;';
            document.body.appendChild(scriptElement);
        },
        /ReferenceError/,
        `should throw Reference error when try to access property ${property}`,
    );
});

// test('abort-on-property-read dot notation', (assert) => {
//     const property = '___bbb.___ccc';
//     const params = { name, args: [property] };
//     window.___bbb = {
//         ___ccc: 'value',
//     };
//     const resString = window.scriptlets.invoke(params);
//     eval(resString);
//     assert.throws(
//         () => window.___bbb.___ccc,
//         /ReferenceError/,
//         `should throw Reference error when try to access property ${property}`,
//     );
// });
//
// test('abort-on-property-read dot notation deferred defenition', (assert) => {
//     const property = '___ddd.___eee';
//     const params = { name, args: [property] };
//     const resString = window.scriptlets.invoke(params);
//     eval(resString);
//     window.___ddd = {};
//     window.___ddd.___eee = 'value';
//     assert.throws(
//         () => window.___ddd.___eee,
//         /ReferenceError/,
//         `should throw Reference error when try to access property ${property}`,
//     );
// });
