/* eslint-disable no-underscore-dangle */
import { runRedirect, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'constant-detection-stubs';

const changingProps = ['hit', '__debug'];

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps(...changingProps);
};

module(name, { beforeEach, afterEach });

test('constants are set', (assert) => {
    runRedirect(name);

    assert.true(window.canRunAds, 'window.Piwik exists');
    assert.false(window.isAdBlockActive, 'Piwik.getTracker exists');

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
});
