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
    const stackMatch = 'abort-on-stack';
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

test('simple, matches stack with an empty object in chain', (assert) => {
    const PROPERTY = 'window.aaa.bbb';
    window.aaa = {};
    const scriptletArgs = [PROPERTY];
    runScriptlet(name, scriptletArgs);

    window.aaa.bbb = 'value';

    assert.throws(
        () => window.aaa.bbb,
        /ReferenceError/,
        `Reference error thrown when trying to access property ${PROPERTY}`,
    );
    assert.throws(
        // eslint-disable-next-line no-return-assign
        () => window.aaa.bbb = 'new value',
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

test('simple, does NOT work - invalid regexp pattern', (assert) => {
    window[PROPERTY] = 'value';
    const stackArg = '/*/';
    const scriptletArgs = [PROPERTY, stackArg];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(window[PROPERTY], 'value', 'Property is accessible');

    window[PROPERTY] = 'reassigned';
    assert.strictEqual(window[PROPERTY], 'reassigned', 'Property is writeable');

    assert.strictEqual(window.hit, undefined, 'hit should NOT fire');
});

test('simple, matches stack of our own script', (assert) => {
    window[PROPERTY] = 'value';
    const noStackMatch = 'abortOnStackTrace';
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
    const stackMatch = 'abort-on-stack';
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
    const stackMatch = 'abortOnStackTrace';
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

test('dot notation deferred definition, matches stack', (assert) => {
    window.Ya = {};
    window.Ya.videoAds = 'value';
    const stackMatch = 'abort-on-stack';
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

test('dot notation deferred definition, does NOT match stack', (assert) => {
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

test('dot notation deferred definition, matches stack of our own script', (assert) => {
    window.Ya = {};
    window.Ya.videoAds = 'value';
    const stackMatch = 'abortOnStackTrace';
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

test('Protected from infinite loop when prop is used in a helper', (assert) => {
    const property = 'RegExp';
    const stackMatch = 'no_match.js';
    const scriptletArgs = [property, stackMatch];
    runScriptlet(name, scriptletArgs);

    const regExpStr = new RegExp('test').toString();

    assert.strictEqual(regExpStr, '/test/', 'Property is accessible');
    assert.strictEqual(window.hit, undefined, 'hit should NOT fire');
});

test('abort RegExp, matches stack', (assert) => {
    const property = 'RegExp';
    const stackMatch = 'abort-on-stack';
    const scriptletArgs = [property, stackMatch];
    runScriptlet(name, scriptletArgs);
    assert.throws(
        () => new RegExp('test'),
        /ReferenceError/,
        'Reference error thrown when trying to access property RegExp',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});
