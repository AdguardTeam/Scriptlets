/* eslint-disable no-underscore-dangle */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'abort-on-stack-trace';
const PROPERTY = 'Ya';
const CHAIN_PROPERTY = 'Ya.videoAds';

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
        name: 'ubo-aost',
        engine: 'test',
        verbose: true,
    };
    const abpParams = {
        name: 'abp-abort-on-stack-trace',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByUboParams = window.scriptlets.invoke(uboParams);
    const codeByAbpParams = window.scriptlets.invoke(abpParams);

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
    assert.strictEqual(codeByAdgParams, codeByAbpParams, 'abp name - ok');
});

test('simple, matches stack', (assert) => {
    window[PROPERTY] = 'value';
    const stackMatch = 'tests.js';
    const scriptletArgs = [PROPERTY, stackMatch];
    runScriptlet(name, scriptletArgs);

    assert.throws(
        () => window[PROPERTY],
        /ReferenceError/,
        `Reference error thrown when trying to access property ${PROPERTY}`,
    );
    assert.throws(
        // eslint-disable-next-line no-return-assign
        () => window[PROPERTY] = 'new value',
        /ReferenceError/,
        `Reference error thrown when trying to reassign property ${PROPERTY}`,
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('simple, does NOT match stack', (assert) => {
    window[PROPERTY] = 'value';
    const noStackMatch = 'no_match.js';
    const scriptletArgs = [PROPERTY, noStackMatch];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(
        window[PROPERTY],
        'value',
        'Property is accessible',
    );

    window[PROPERTY] = 'reassigned';
    assert.strictEqual(
        window[PROPERTY],
        'reassigned',
        'Property is writeable',
    );

    assert.strictEqual(window.hit, undefined, 'hit should NOT fire');
});

test('simple, matches stack of our own script', (assert) => {
    window[PROPERTY] = 'value';
    const noStackMatch = 'abortOnPropertyRead';
    const scriptletArgs = [PROPERTY, noStackMatch];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(
        window[PROPERTY],
        'value',
        'Property is accessible',
    );

    window[PROPERTY] = 'reassigned';
    assert.strictEqual(
        window[PROPERTY],
        'reassigned',
        'Property is writeable',
    );

    assert.strictEqual(window.hit, undefined, 'hit should NOT fire');
});

test('dot notation, matches stack', (assert) => {
    window.Ya = {
        videoAds: 'value',
    };
    const stackMatch = 'tests.js';
    const scriptletArgs = [CHAIN_PROPERTY, stackMatch];
    runScriptlet(name, scriptletArgs);

    assert.throws(
        () => window.Ya.videoAds,
        /ReferenceError/,
        `Reference error thrown when trying to access property ${PROPERTY}`,
    );

    assert.throws(
        // eslint-disable-next-line no-return-assign
        () => window.Ya.videoAds = 'new value',
        /ReferenceError/,
        `Reference error thrown when trying to reassign property ${PROPERTY}`,
    );

    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('dot notation, does NOT match stack', (assert) => {
    window.Ya = {
        videoAds: 'value',
    };
    const stackMatch = 'no_match.js';
    const scriptletArgs = [CHAIN_PROPERTY, stackMatch];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(
        window.Ya.videoAds,
        'value',
        'Property is accessible',
    );

    window.Ya.videoAds = 'reassigned';
    assert.strictEqual(
        window.Ya.videoAds,
        'reassigned',
        'Property is writeable',
    );

    assert.strictEqual(window.hit, undefined, 'hit should NOT fire');
});

test('dot notation, matches stack of our own script', (assert) => {
    window.Ya = {
        videoAds: 'value',
    };
    const stackMatch = 'abortOnPropertyRead';
    const scriptletArgs = [CHAIN_PROPERTY, stackMatch];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(
        window.Ya.videoAds,
        'value',
        'Property is accessible',
    );

    window.Ya.videoAds = 'reassigned';
    assert.strictEqual(
        window.Ya.videoAds,
        'reassigned',
        'Property is writeable',
    );

    assert.strictEqual(window.hit, undefined, 'hit should NOT fire');
});

test('dot notation deferred defenition, matches stack', (assert) => {
    window.Ya = {};
    window.Ya.videoAds = 'value';
    const stackMatch = 'tests.js';
    const scriptletArgs = [CHAIN_PROPERTY, stackMatch];
    runScriptlet(name, scriptletArgs);

    assert.throws(
        () => window.Ya.videoAds,
        /ReferenceError/,
        `Reference error thrown when trying to access property ${PROPERTY}`,
    );
    assert.throws(
        // eslint-disable-next-line no-return-assign
        () => window.Ya.videoAds = 'new value',
        /ReferenceError/,
        `Reference error thrown when trying to reassign property ${PROPERTY}`,
    );

    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('dot notation deferred defenition, does NOT match stack', (assert) => {
    window.Ya = {};
    window.Ya.videoAds = 'value';
    const stackMatch = 'no_match.js';
    const scriptletArgs = [CHAIN_PROPERTY, stackMatch];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(
        window.Ya.videoAds,
        'value',
        'Property is accessible',
    );

    window.Ya.videoAds = 'reassigned';
    assert.strictEqual(
        window.Ya.videoAds,
        'reassigned',
        'Property is writeable',
    );

    assert.strictEqual(window.hit, undefined, 'hit should NOT fire');
});

test('dot notation deferred defenition, matches stack of our own script', (assert) => {
    window.Ya = {};
    window.Ya.videoAds = 'value';
    const stackMatch = 'abortOnPropertyRead';
    const scriptletArgs = [CHAIN_PROPERTY, stackMatch];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(
        window.Ya.videoAds,
        'value',
        'Property is accessible',
    );

    window.Ya.videoAds = 'reassigned';
    assert.strictEqual(
        window.Ya.videoAds,
        'reassigned',
        'Property is writeable',
    );

    assert.strictEqual(window.hit, undefined, 'hit should NOT fire');
});
