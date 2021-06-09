/* eslint-disable no-underscore-dangle */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'abort-current-inline-script';

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

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const uboParams = {
        name: 'ubo-abort-current-inline-script',
        engine: 'test',
        verbose: true,
    };
    const abpParams = {
        name: 'abp-abort-current-inline-script',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByUboParams = window.scriptlets.invoke(uboParams);
    const codeByAbpParams = window.scriptlets.invoke(abpParams);

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
    assert.strictEqual(codeByAdgParams, codeByAbpParams, 'abp name - ok');
});

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

test('should not work if chained properties are undefined', (assert) => {
    window.onerror = onError(assert);
    const chainProperty = 'a.b.c';
    const scriptletArgs = [chainProperty];
    runScriptlet(name, scriptletArgs);

    addAndRemoveInlineScript(`
        var aa = {};
        aa.bb = {};
        aa.bb.cc = 'test';
    `);

    assert.strictEqual(window.hit, undefined, 'should not hit');
});

test('aborts script by search', (assert) => {
    window.onerror = onError(assert);
    const property = '___aaa';
    const search = 'const someVar';
    const scriptletArgs = [property, search];
    runScriptlet(name, scriptletArgs);

    addAndRemoveInlineScript(`${search} = window.${property};`);

    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('does not abort script which is not matched by search', (assert) => {
    const property = '___aaa';
    const search = 'some search';
    const scriptletArgs = [property, search];
    runScriptlet(name, scriptletArgs);

    addAndRemoveInlineScript(`window.${property};`);

    assert.notStrictEqual(window.hit, undefined, 'should not hit');
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

test('Patched textContent', (assert) => {
    window.onerror = onError(assert);
    const property = '___aaa';
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
});

test('Patched textContent', (assert) => {
    window.onerror = onError(assert);
    const property = 'alert';
    const search = 'test';
    const scriptletArgs = [property, search];
    runScriptlet(name, scriptletArgs);

    addAndRemoveInlineScript(`
    function generateContent() {
        return void 0 === generateContent.val && (generateContent.val = " \nwindow.${property}('blablabla');");
      }
      
      (function () {
        try {
          Object.defineProperty(document.currentScript, "textContent", {
            get: generateContent
          });
        } catch (e) {}
      
        ${property}("test");
      })();
    `);

    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});
