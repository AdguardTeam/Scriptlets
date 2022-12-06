/* eslint-disable no-underscore-dangle */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'abort-on-property-write';
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

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const uboParams = {
        name: 'ubo-abort-on-property-write.js',
        engine: 'test',
        verbose: true,
    };
    const abpParams = {
        name: 'abp-abort-on-property-write',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByUboParams = window.scriptlets.invoke(uboParams);
    const codeByAbpParams = window.scriptlets.invoke(abpParams);

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
    assert.strictEqual(codeByAdgParams, codeByAbpParams, 'abp name - ok');
});

test('adg alias, set prop for existed prop', (assert) => {
    window[PROPERTY] = 'value';
    const scriptletArgs = [PROPERTY];
    runScriptlet(name, scriptletArgs);

    assert.throws(
        () => {
            window[PROPERTY] = 'new value';
        },
        /ReferenceError/,
        `should throw Reference error when try to access property ${PROPERTY}`,
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('dot notation', (assert) => {
    window.aaa = {
        bbb: 'value',
    };
    const scriptletArgs = [CHAIN_PROPERTY];
    runScriptlet(name, scriptletArgs);

    assert.throws(
        () => {
            window.aaa.bbb = 'new value';
        },
        /ReferenceError/,
        `should throw Reference error when try to access property ${CHAIN_PROPERTY}`,
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('dot notation deferred defenition', (assert) => {
    const scriptletArgs = [CHAIN_PROPERTY];
    runScriptlet(name, scriptletArgs);

    window.aaa = {};

    assert.throws(
        () => {
            window.aaa.bbb = 'new value';
        },
        /ReferenceError/,
        `should throw Reference error when try to access property ${CHAIN_PROPERTY}`,
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('Works with an empty object in chain', (assert) => {
    const CHAIN_PROPERTY = 'window.aaa.bbb';
    const scriptletArgs = [CHAIN_PROPERTY];
    window.aaa = {};
    runScriptlet(name, scriptletArgs);

    assert.throws(
        () => {
            window.aaa.bbb = 'value';
        },
        /ReferenceError/,
        `should throw Reference error when try to access property ${CHAIN_PROPERTY}`,
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});
