/* eslint-disable no-eval, no-underscore-dangle */
import { clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'abort-on-property-write';
const PROPERTY = 'aaa';
const CHAIN_PROPERTY = 'aaa.bbb';

// copy eval to prevent rollup warnings
const evalWrap = eval;

const changingProps = [PROPERTY, 'hit', '__debug'];

module(name);
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

test('abort-on-property-write: adg alias, set prop for existed prop', (assert) => {
    const params = {
        name,
        args: [PROPERTY],
        verbose: true,
    };
    window.__debug = () => {
        window.hit = 'value';
    };
    window[PROPERTY] = 'value';
    const resString = window.scriptlets.invoke(params);
    evalWrap(resString);
    assert.throws(
        () => {
            window[PROPERTY] = 'new value';
        },
        /ReferenceError/,
        `should throw Reference error when try to access property ${PROPERTY}`,
    );
    assert.equal(window.hit, 'value', 'Hit function was executed');
    clearGlobalProps(...changingProps);
});

test('abort-on-property-write dot notation', (assert) => {
    const params = {
        name,
        args: [CHAIN_PROPERTY],
        verbose: true,
    };
    window.__debug = () => {
        window.hit = 'value';
    };
    window.aaa = {
        bbb: 'value',
    };
    const resString = window.scriptlets.invoke(params);
    evalWrap(resString);
    assert.throws(
        () => {
            window.aaa.bbb = 'new value';
        },
        /ReferenceError/,
        `should throw Reference error when try to access property ${CHAIN_PROPERTY}`,
    );
    assert.equal(window.hit, 'value', 'Hit function was executed');
    clearGlobalProps(...changingProps);
});

test('abort-on-property-write dot notation deferred defenition', (assert) => {
    const params = {
        name,
        args: [CHAIN_PROPERTY],
        verbose: true,
    };
    window.__debug = () => {
        window.hit = 'value';
    };
    const resString = window.scriptlets.invoke(params);
    evalWrap(resString);
    window.aaa = {};
    assert.throws(
        () => {
            window.aaa.bbb = 'new value';
        },
        /ReferenceError/,
        `should throw Reference error when try to access property ${CHAIN_PROPERTY}`,
    );
    assert.equal(window.hit, 'value', 'Hit function was executed');
    clearGlobalProps(...changingProps);
});

test('abort-on-property-write: matches stack', (assert) => {
    const params = {
        name,
        args: [
            [PROPERTY],
            'tests.js',
        ],
        verbose: true,
    };
    window.__debug = () => {
        window.hit = 'value';
    };
    window[PROPERTY] = 'value';
    const resString = window.scriptlets.invoke(params);
    evalWrap(resString);
    assert.throws(
        () => {
            window[PROPERTY] = 'new value';
        },
        /ReferenceError/,
        `should throw Reference error when try to access property ${PROPERTY}`,
    );
    assert.equal(window.hit, 'value', 'Hit function was executed');
    clearGlobalProps(...changingProps);
});

test('abort-on-property-write: does NOT match stack', (assert) => {
    const params = {
        name,
        args: [
            [PROPERTY],
            'no_match.js',
        ],
        verbose: true,
    };
    window.__debug = () => {
        window.hit = 'value';
    };
    window[PROPERTY] = 'value';
    const resString = window.scriptlets.invoke(params);
    evalWrap(resString);

    assert.equal(window.hit, undefined, 'Hit function was NOT executed');
    clearGlobalProps(...changingProps);
});
