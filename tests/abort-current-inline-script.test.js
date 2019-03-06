/* global QUnit */
/* eslint-disable no-eval, no-underscore-dangle */
const { test, module, testDone } = QUnit;
const name = 'abort-current-inline-script';

module(name);

testDone(() => {
    delete window.hit;
});

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
        hit: () => {
            window.hit = 'FIRED';
        },
    };
    window[property] = 'value';
    const resString = window.scriptlets.invoke(params);

    window.onerror = (message) => {
        const browserErrorMessage = 'Script error.';
        const nodePuppeteerErrorMessageRgx = /Reference error/g;
        const checkResult = message === browserErrorMessage
            || message.test(nodePuppeteerErrorMessageRgx);
        assert.ok(checkResult);
    };

    eval(resString);
    const scriptElement = document.createElement('script');
    scriptElement.type = 'text/javascript';
    scriptElement.innerText = 'const test = window.___aaa;';
    document.body.appendChild(scriptElement);

    assert.strictEqual(window.hit, 'FIRED');
});

test('abort-current-inline-script works, and aborts script by search', (assert) => {
    const property = '___aaa';
    const search = 'const search';
    const params = {
        name,
        args: ['___aaa', 'const search'],
        hit: () => {
            window.hit = 'FIRED';
        },
    };
    window[property] = 'value';
    const resString = window.scriptlets.invoke(params);

    window.onerror = (message) => {
        const browserErrorMessage = 'Script error.';
        const nodePuppeteerErrorMessageRgx = /Reference error/g;
        const checkResult = message === browserErrorMessage
            || message.test(nodePuppeteerErrorMessageRgx);
        assert.ok(checkResult);
    };

    eval(resString);
    const scriptElement = document.createElement('script');
    scriptElement.type = 'text/javascript';
    scriptElement.innerText = `${search} = window.___aaa;`;
    document.body.appendChild(scriptElement);

    assert.strictEqual(window.hit, 'FIRED');
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
