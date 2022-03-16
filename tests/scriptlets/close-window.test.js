/* eslint-disable no-underscore-dangle */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'close-window';

const nativeWindowClose = window.close;

const TEST_PROP = 'run';

const mockedWindowClose = () => {
    window[TEST_PROP] = true;
};

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'value';
    };
    window.close = mockedWindowClose;
    window[TEST_PROP] = false;
};

const afterEach = () => {
    window.close = nativeWindowClose;
    clearGlobalProps('hit', '__debug', TEST_PROP);
};

module(name, { beforeEach, afterEach });

test('works: no args', (assert) => {
    assert.equal(window.hit, undefined, 'Hit function not executed yet');

    const scriptletArgs = [''];
    runScriptlet(name, scriptletArgs);

    assert.equal(window.hit, 'value', 'Hit function was executed');
    // scriptlet calls window.close which is mocked for test purposes
    assert.strictEqual(window[TEST_PROP], true, 'mocked window.close() has been called');
});

// TODO fix test running in browserstack
// test('works: string path', (assert) => {
//     assert.equal(window.hit, undefined, 'Hit function not executed yet');
//
//     const scriptletArgs = ['test'];
//     runScriptlet(name, scriptletArgs);
//
//     assert.equal(window.hit, 'value', 'Hit function was executed');
//     // scriptlet calls window.close which is mocked for test purposes
//     assert.strictEqual(window[TEST_PROP], true, 'mocked window.close() has been called');
// });

test('does not work: window.close is not a function', (assert) => {
    assert.equal(window.hit, undefined, 'Hit function not executed yet');

    window.close = {
        isFunction: false,
    };

    const scriptletArgs = [''];
    runScriptlet(name, scriptletArgs);

    assert.equal(window.hit, undefined, 'Hit should not be executed');
    assert.strictEqual(window[TEST_PROP], false, 'mockedWindowClose() was not called');
});

test('does not work: invalid regexp pattern', (assert) => {
    assert.equal(window.hit, undefined, 'Hit function not executed yet');

    const scriptletArgs = ['/*/'];
    runScriptlet(name, scriptletArgs);

    assert.equal(window.hit, undefined, 'Hit should not be executed');
    assert.strictEqual(window[TEST_PROP], false, 'mocked window.close() was not called');
});
