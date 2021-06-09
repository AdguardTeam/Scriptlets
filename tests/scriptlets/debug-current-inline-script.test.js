/* eslint-disable no-underscore-dangle */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'debug-current-inline-script';

const changingGlobals = ['hit', '__debug'];

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps(...changingGlobals);
};

module(name, { beforeEach, afterEach });

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
    window.onerror = onError(assert);
    const property = '___aaa';
    const scriptletArgs = [property];
    runScriptlet(name, scriptletArgs);

    addAndRemoveInlineScript('window.___aaa;');

    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('works with chained properties', (assert) => {
    window.onerror = onError(assert);
    const chainProperty = 'aaa.bbb.ccc';
    const scriptletArgs = [chainProperty];
    runScriptlet(name, scriptletArgs);

    addAndRemoveInlineScript(`
        var aaa = {};
        aaa.bbb = {};
        aaa.bbb.ccc = 'test';
    `);

    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('doesnt aborts script which is not specified by search', (assert) => {
    const property = '___aaa';
    const search = 'some search';
    const scriptletArgs = [property, search];
    runScriptlet(name, scriptletArgs);

    addAndRemoveInlineScript(`window.${property};`);

    assert.notStrictEqual(window.hit, undefined, 'hit should NOT fire');
});

test('searches script by regexp', (assert) => {
    window.onerror = onError(assert);
    const property = '___aaa';
    const search = '/a{3}/';
    const scriptletArgs = [property, search];
    runScriptlet(name, scriptletArgs);

    addAndRemoveInlineScript(`window.${property};`);

    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});
