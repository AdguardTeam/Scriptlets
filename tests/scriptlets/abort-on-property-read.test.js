/* eslint-disable no-underscore-dangle */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'abort-on-property-read';
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
        name: 'ubo-aopr',
        engine: 'test',
        verbose: true,
    };
    const abpParams = {
        name: 'abp-abort-on-property-read',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByUboParams = window.scriptlets.invoke(uboParams);
    const codeByAbpParams = window.scriptlets.invoke(abpParams);

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
    assert.strictEqual(codeByAdgParams, codeByAbpParams, 'abp name - ok');
});

test('simple', (assert) => {
    window[PROPERTY] = 'value';
    const scriptletArgs = [PROPERTY];
    runScriptlet(name, scriptletArgs);

    assert.throws(
        () => window[PROPERTY],
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
        () => window.aaa.bbb,
        /ReferenceError/,
        `should throw Reference error when try to access property ${CHAIN_PROPERTY}`,
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('dot notation deferred defenition', (assert) => {
    const scriptletArgs = [CHAIN_PROPERTY];
    runScriptlet(name, scriptletArgs);

    window.aaa = {};
    window.aaa.bbb = 'value';
    assert.throws(
        () => window.aaa.bbb,
        /ReferenceError/,
        `should throw Reference error when try to access property ${CHAIN_PROPERTY}`,
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('Works with an empty object in chain', (assert) => {
    window.aaa = {};
    const scriptletArgs = [CHAIN_PROPERTY];
    runScriptlet(name, scriptletArgs);

    window.aaa.bbb = 'value';

    assert.throws(
        () => window.aaa.bbb,
        /ReferenceError/,
        `should throw Reference error when try to access property ${CHAIN_PROPERTY}`,
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});
