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
    clearGlobalProps('___aaa');
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
    clearGlobalProps('aaa');
});

test('works with an empty object in chain', (assert) => {
    window.onerror = onError(assert);
    const property = 'window.aaa.bbb';
    const scriptletArgs = [property];

    window.aaa = {};
    runScriptlet(name, scriptletArgs);
    window.aaa.bbb = 'value';

    addAndRemoveInlineScript('window.aaa.bbb;');

    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
    clearGlobalProps('aaa');
});

test('does not abort script which is not specified by search', (assert) => {
    const property = '___aaa';
    const search = 'some search';
    const scriptletArgs = [property, search];
    runScriptlet(name, scriptletArgs);

    addAndRemoveInlineScript(`window.${property};`);

    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
    clearGlobalProps('___aaa');
});

test('searches script by regexp', (assert) => {
    window.onerror = onError(assert);
    const property = '___aaa';
    const search = '/a{3}/';
    const scriptletArgs = [property, search];
    runScriptlet(name, scriptletArgs);

    addAndRemoveInlineScript(`window.${property};`);

    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
    clearGlobalProps('___aaa');
});

test('Patched textContent', (assert) => {
    window.onerror = onError(assert);
    const property = '___aaa5';
    const search = '/a{3}/';
    const scriptletArgs = [property, search];
    runScriptlet(name, scriptletArgs);

    addAndRemoveInlineScript(`
        Object.defineProperty(document.currentScript, 'textContent', {
            get: () => '',
        });
        window.${property};
    `);

    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
    clearGlobalProps('___aaa5');
});

test('does not abort script -- invalid regexp pattern', (assert) => {
    window.onerror = onError(assert);
    const property = '___aaa6';
    const search = '/\\/';
    const scriptletArgs = [property, search];
    runScriptlet(name, scriptletArgs, false);

    addAndRemoveInlineScript(`window.${property};`);

    assert.strictEqual(window.hit, undefined, 'should not hit');
    clearGlobalProps('___aaa6');
});
