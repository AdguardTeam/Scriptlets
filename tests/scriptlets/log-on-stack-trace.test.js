/* eslint-disable no-console, no-underscore-dangle */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'log-on-stack-trace';
const PROPERTY = 'testMe';
const nativeConsole = console.log;

const changingProps = [PROPERTY, 'hit', '__debug'];

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps(...changingProps);
    console.log = nativeConsole;
};

module(name, { beforeEach, afterEach });

test('can get property', (assert) => {
    window[PROPERTY] = 'value';
    const scriptletArgs = [PROPERTY];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(
        window[PROPERTY],
        'value',
        'Property is accessible',
    );

    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('can set property', (assert) => {
    window[PROPERTY] = 'value';
    const scriptletArgs = [PROPERTY];
    runScriptlet(name, scriptletArgs);

    window[PROPERTY] = 'new value';
    assert.strictEqual(
        window[PROPERTY],
        'new value',
        'Property is writeable',
    );

    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('logs specific message', (assert) => {
    assert.expect(2);
    const scriptletArgs = [PROPERTY];
    const setProp = (prop) => {
        window[prop] = 'init';
    };
    runScriptlet(name, scriptletArgs);

    console.log = function log(input) {
        // Ignore hit messages with "trace"
        if (input.indexOf('trace') > -1) {
            return;
        }
        assert.strictEqual(input, `%cSet %c${PROPERTY}`, 'Log message is correct');
    };
    setProp(PROPERTY);

    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});
