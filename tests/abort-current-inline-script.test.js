/* global QUnit */
/* eslint-disable no-eval, no-underscore-dangle */
const { test, module, testDone } = QUnit;
const name = 'abort-current-inline-script';

module(name);

testDone(() => {
    delete window.hit;
});

const onError = assert => (message) => {
    const browserErrorMessage = 'Script error.';
    const nodePuppeteerErrorMessageRgx = /Reference error/g;
    const checkResult = message === browserErrorMessage
        || message.test(nodePuppeteerErrorMessageRgx);
    assert.ok(checkResult);
};

const addAndRemoveInlineScript = (scriptText) => {
    const scriptElement = document.createElement('script');
    scriptElement.type = 'text/javascript';
    scriptElement.innerText = scriptText;
    document.body.appendChild(scriptElement);
    scriptElement.parentNode.removeChild(scriptElement);
};

test('abort-current-inline-script ubo alias works', (assert) => {
    const property = '___aaa';
    const params = {
        name: 'ubo-abort-current-inline-script.js',
        args: [property],
        hit: () => {
            window.hit = 'FIRED';
        },
    };
    window[property] = 'value';
    const resString = window.scriptlets.invoke(params);

    window.onerror = onError(assert);

    eval(resString);
    addAndRemoveInlineScript('window.___aaa;');

    assert.strictEqual(window.hit, 'FIRED');
});

test('abort-current-inline-script abp alias works', (assert) => {
    const property = '___aaa';
    const params = {
        name: 'abp-abort-current-inline-script',
        args: [property],
        hit: () => {
            window.hit = 'FIRED';
        },
    };
    window[property] = 'value';
    const resString = window.scriptlets.invoke(params);

    window.onerror = onError(assert);

    eval(resString);
    addAndRemoveInlineScript('window.___aaa;');

    assert.strictEqual(window.hit, 'FIRED');
});

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

    window.onerror = onError(assert);

    eval(resString);
    addAndRemoveInlineScript('window.___aaa;');

    assert.strictEqual(window.hit, 'FIRED');
});

test('abort-current-inline-script works, and aborts script by search', (assert) => {
    const property = '___aaa';
    const search = 'const someVar';
    const params = {
        name,
        args: ['___aaa', 'const someVar'],
        hit: () => {
            window.hit = 'FIRED';
        },
    };
    window[property] = 'value';
    const resString = window.scriptlets.invoke(params);

    window.onerror = onError(assert);

    eval(resString);
    addAndRemoveInlineScript(`${search} = window.___aaa;`);

    assert.strictEqual(window.hit, 'FIRED');
});


test('abort-current-inline-script doesnt aborts function which is not specified by search', (assert) => {
    const property = '___aaa';
    const search = 'blabla';
    const params = {
        name,
        args: [property, search],
        hit: () => {
            window.hit = 'FIRED';
        },
    };
    window[property] = 'value';
    const resString = window.scriptlets.invoke(params);

    eval(resString);
    addAndRemoveInlineScript('window.___aaa;');

    assert.strictEqual(window.hit, undefined);
});

test('abort-current-inline-script searches function by regexp', (assert) => {
    const property = '___aaa';
    const search = '/a{3}/';
    const params = {
        name,
        args: [property, search],
        hit: () => {
            window.hit = 'FIRED';
        },
    };
    window[property] = 'value';
    const resString = window.scriptlets.invoke(params);

    window.onerror = onError(assert);

    eval(resString);
    addAndRemoveInlineScript('window.___aaa;');

    assert.strictEqual(window.hit, 'FIRED');
});
