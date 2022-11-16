/* eslint-disable no-underscore-dangle, no-console */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'debug-on-property-read';
const PROPERTY = 'aaa';
const CHAIN_PROPERTY = 'aaa.bbb';

const changingProps = [PROPERTY, 'hit', '__debug'];

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps(...changingProps);
};

module(name, { beforeEach, afterEach });

test('simple', (assert) => {
    window[PROPERTY] = 'value';
    const scriptletArgs = [PROPERTY];
    runScriptlet(name, scriptletArgs);

    console.log(window[PROPERTY]);
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('dot notation', (assert) => {
    window.aaa = {
        bbb: 'value',
    };
    const scriptletArgs = [CHAIN_PROPERTY];
    runScriptlet(name, scriptletArgs);

    console.log(window.aaa.bbb);
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('dot notation deferred defenition', (assert) => {
    window.aaa = {};
    window.aaa.bbb = 'value';
    const scriptletArgs = [CHAIN_PROPERTY];
    runScriptlet(name, scriptletArgs);

    console.log(window.aaa.bbb);
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('works with an empty object in chain', (assert) => {
    const scriptletArgs = [CHAIN_PROPERTY];

    window.aaa = {};
    runScriptlet(name, scriptletArgs);
    window.aaa.bbb = 'value';

    console.log(window.aaa.bbb);
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});
