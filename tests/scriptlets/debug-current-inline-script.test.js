/* global QUnit */
/* eslint-disable no-eval, no-underscore-dangle */
import { clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'debug-current-inline-script';

module(name);

const evalWrapper = eval;

const changingGlobals = ['hit', '__debug'];

const onError = (assert) => (message) => {
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

test('works', (assert) => {
    const property = '___aaa';
    const params = {
        name,
        args: [property],
        verbose: true,
    };
    window.__debug = () => {
        window.hit = 'FIRED';
    };
    const resString = window.scriptlets.invoke(params);

    window.onerror = onError(assert);

    evalWrapper(resString);
    addAndRemoveInlineScript('window.___aaa;');

    assert.strictEqual(window.hit, 'FIRED');
    clearGlobalProps(...changingGlobals);
});

test('works with chained properties', (assert) => {
    const chainProperty = 'aaa.bbb.ccc';
    const params = {
        name,
        args: [chainProperty],
        verbose: true,
    };
    window.__debug = () => {
        window.hit = 'FIRED';
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
    clearGlobalProps(...changingGlobals);
});

test('doesnt aborts script which is not specified by search', (assert) => {
    const property = '___aaa';
    const search = 'some search';
    const params = {
        name,
        args: [property, search],
        verbose: true,
    };
    window.__debug = () => {
        window.hit = 'FIRED';
    };
    const resString = window.scriptlets.invoke(params);

    evalWrapper(resString);
    addAndRemoveInlineScript(`window.${property};`);

    assert.notStrictEqual(window.hit, undefined);
    clearGlobalProps(...changingGlobals);
});

test('searches script by regexp', (assert) => {
    const property = '___aaa';
    const search = '/a{3}/';
    const params = {
        name,
        args: [property, search],
        verbose: true,
    };
    window.__debug = () => {
        window.hit = 'FIRED';
    };
    const resString = window.scriptlets.invoke(params);

    window.onerror = onError(assert);

    evalWrapper(resString);
    addAndRemoveInlineScript(`window.${property};`);

    assert.strictEqual(window.hit, 'FIRED');
    clearGlobalProps(...changingGlobals);
});
