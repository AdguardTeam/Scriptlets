/* eslint-disable no-eval, no-console, no-underscore-dangle */
import { clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'log-addEventListener';

const hit = () => {
    window.hit = 'FIRED';
};

const changingProps = ['hit', '__debug'];

const evalWrapper = eval;

const nativeAddEventListener = window.EventTarget.prototype.addEventListener;
const nativeConsole = console.log;


const beforeEach = () => {
    window.__debug = hit;
};

const afterEach = () => {
    console.log = nativeConsole;
    window.EventTarget.prototype.addEventListener = nativeAddEventListener;
    clearGlobalProps(...changingProps);
};

module(name, { beforeEach, afterEach });

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const aliasParams = {
        name: 'aell.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByAliasParams = window.scriptlets.invoke(aliasParams);

    assert.strictEqual(codeByAdgParams, codeByAliasParams);
});

test('logs events to console', (assert) => {
    const agLogAddEventListenerProp = 'agLogAddEventListenerProp';
    const eventName = 'click';
    const callback = function callback() {
        window[agLogAddEventListenerProp] = 'clicked';
    };
    console.log = function log(input) {
        // Ignore hit messages with "trace"
        if (input.indexOf('trace') > -1) {
            return;
        }
        assert.strictEqual(input, `addEventListener("${eventName}", ${callback.toString()})`, 'console.hit input should be equal');
    };

    const params = {
        name,
        verbose: true,
    };
    const resString = window.scriptlets.invoke(params);
    evalWrapper(resString);

    const element = document.createElement('div');
    element.addEventListener(eventName, callback);
    element.click();

    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    assert.strictEqual(window[agLogAddEventListenerProp], 'clicked', 'property should change');
    clearGlobalProps(agLogAddEventListenerProp);
});

test('logs events to console -- callback = null', (assert) => {
    const eventName = 'click';
    const callback = null;

    console.log = function log(input) {
        // Ignore hit messages with "trace"
        if (input.indexOf('trace') > -1) {
            return;
        }
        assert.strictEqual(input, `addEventListener("${eventName}", ${null})`, 'console.hit input should be equal');
    };

    const params = {
        name,
        verbose: true,
    };
    const resString = window.scriptlets.invoke(params);
    evalWrapper(resString);

    const element = document.createElement('div');
    element.addEventListener(eventName, callback);
    element.click();

    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});
