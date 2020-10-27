/* eslint-disable no-eval, no-underscore-dangle */
import { clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'abort-current-inline-script';

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

test('should not work if chained properties are undefined', (assert) => {
    const chainProperty = 'a.b.c';
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
        var aa = {};
        aa.bb = {};
        aa.bb.cc = 'test';
    `);

    assert.strictEqual(window.hit, undefined, 'should not hit');
    clearGlobalProps(...changingGlobals);
});

test('aborts script by search', (assert) => {
    const property = '___aaa';
    const search = 'const someVar';
    const params = {
        name,
        args: [property, 'const someVar'],
        verbose: true,
    };
    window.__debug = () => {
        window.hit = 'FIRED';
    };
    const resString = window.scriptlets.invoke(params);

    window.onerror = onError(assert);

    evalWrapper(resString);
    addAndRemoveInlineScript(`${search} = window.${property};`);

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

test('Patched textContent', (assert) => {
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
    addAndRemoveInlineScript(`
        Object.defineProperty(document.currentScript, 'textContent', {
            get: () => '',
        });
        window.${property};
    `);

    assert.strictEqual(window.hit, 'FIRED');
    clearGlobalProps(...changingGlobals);
});

test('Patched textContent', (assert) => {
    const property = 'alert';
    const search = 'test';
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

    assert.strictEqual(window.hit, 'FIRED');
    clearGlobalProps(...changingGlobals);
});

test('abort self-cleaning and self-removing iife', (assert) => {
    const property = 'alert';
    const search = 'test';
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
    addAndRemoveInlineScript(`!(function () {
        var t, e = window.document;
        debugger;
        try {
            (t = e.currentScript).textContent = "";
        } catch (t) {}
        
        try {
            t.parentNode.removeChild(t);
        } catch (t) {}
        
        ${property}("${search}");
        })();`);

    assert.strictEqual(window.hit, 'FIRED');
    clearGlobalProps(...changingGlobals);
});
