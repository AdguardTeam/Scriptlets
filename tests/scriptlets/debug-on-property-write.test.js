/* eslint-disable no-underscore-dangle */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'debug-on-property-write';
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

test('set prop for existed prop', (assert) => {
    window[PROPERTY] = 'value';
    const scriptletArgs = [PROPERTY];
    runScriptlet(name, scriptletArgs);

    window[PROPERTY] = 'new value';
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('dot notation', (assert) => {
    window.aaa = {
        bbb: 'value',
    };
    const scriptletArgs = [CHAIN_PROPERTY];
    runScriptlet(name, scriptletArgs);

    window.aaa.bbb = 'new value';
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('dot notation deferred defenition', (assert) => {
    const scriptletArgs = [CHAIN_PROPERTY];
    runScriptlet(name, scriptletArgs);

    window.aaa = {};
    window.aaa.bbb = 'new value';
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('works with an empty object in chain', (assert) => {
    const scriptletArgs = [CHAIN_PROPERTY];

    window.aaa = {};
    runScriptlet(name, scriptletArgs);
    window.aaa.bbb = 'value';

    window.aaa.bbb = 'new value';
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});
