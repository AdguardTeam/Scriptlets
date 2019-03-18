/* global QUnit */
/* eslint-disable no-eval, no-underscore-dangle */
const { test, module, testDone } = QUnit;
const name = 'abort-current-inline-script';

module(name);

const evalWrapper = eval;

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

test('ubo alias', (assert) => {
    const property = '___aaa';
    const params = {
        name: 'ubo-abort-current-inline-script.js',
        args: [property],
        hit: () => {
            window.hit = 'FIRED';
        },
    };
    const resString = window.scriptlets.invoke(params);

    window.onerror = onError(assert);

    evalWrapper(resString);
    addAndRemoveInlineScript('window.___aaa;');

    assert.strictEqual(window.hit, 'FIRED');
});

test('abp alias', (assert) => {
    const property = '___aaa';
    const params = {
        name: 'abp-abort-current-inline-script',
        args: [property],
        hit: () => {
            window.hit = 'FIRED';
        },
    };
    const resString = window.scriptlets.invoke(params);

    window.onerror = onError(assert);

    evalWrapper(resString);
    addAndRemoveInlineScript('window.___aaa;');

    assert.strictEqual(window.hit, 'FIRED');
});

test('works', (assert) => {
    const property = '___aaa';
    const params = {
        name,
        args: [property],
        hit: () => {
            window.hit = 'FIRED';
        },
    };
    const resString = window.scriptlets.invoke(params);

    window.onerror = onError(assert);

    evalWrapper(resString);
    addAndRemoveInlineScript('window.___aaa;');

    assert.strictEqual(window.hit, 'FIRED');
});

test('works with chained properties', (assert) => {
    const chainProperty = 'aaa.bbb.ccc';
    const params = {
        name,
        args: [chainProperty],
        hit: () => {
            window.hit = 'FIRED';
        },
    };
    const resString = window.scriptlets.invoke(params);

    window.onerror = onError(assert);

    evalWrapper(resString);
    addAndRemoveInlineScript(`
        var aaa = {};
        aaa.bbb = {};
        aaa.bbb.ccc = 'test';
    `);

    assert.strictEqual(window.hit, 'FIRED');
});

test('aborts script by search', (assert) => {
    const property = '___aaa';
    const search = 'const someVar';
    const params = {
        name,
        args: [property, 'const someVar'],
        hit: () => {
            window.hit = 'FIRED';
        },
    };
    const resString = window.scriptlets.invoke(params);

    window.onerror = onError(assert);

    evalWrapper(resString);
    addAndRemoveInlineScript(`${search} = window.${property};`);

    assert.strictEqual(window.hit, 'FIRED');
});


test('doesnt aborts script which is not specified by search', (assert) => {
    const property = '___aaa';
    const search = 'some search';
    const params = {
        name,
        args: [property, search],
        hit: () => {
            window.hit = 'FIRED';
        },
    };
    const resString = window.scriptlets.invoke(params);

    evalWrapper(resString);
    addAndRemoveInlineScript(`window.${property};`);

    assert.notStrictEqual(window.hit, undefined);
});

test('searches script by regexp', (assert) => {
    const property = '___aaa';
    const search = '/a{3}/';
    const params = {
        name,
        args: [property, search],
        hit: () => {
            window.hit = 'FIRED';
        },
    };
    const resString = window.scriptlets.invoke(params);

    window.onerror = onError(assert);

    evalWrapper(resString);
    addAndRemoveInlineScript(`window.${property};`);

    assert.strictEqual(window.hit, 'FIRED');
});
