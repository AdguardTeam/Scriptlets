/* eslint-disable no-underscore-dangle */
import { runRedirect, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'tagcommander';

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

test('tagcommander works', (assert) => {
    runRedirect(name);

    assert.ok(window.tC, 'window.tC exists');
    assert.ok(window.tc_events_global, 'tc_events_global exists');

    const tc = window.tC;
    assert.ok(Array.isArray(tc.privacy.getOptinCategories()), undefined, 'privacy.getOptinCategories() is mocked.');
    assert.ok(tc.privacy.cookieData().length === 0, 'privacy.cookieData() is mocked.');
    assert.equal(tc.addConsentChangeListener(), undefined, 'addConsentChangeListener() is mocked.');
    assert.equal(tc.removeConsentChangeListener(), undefined, 'removeConsentChangeListener() is mocked.');
    assert.equal(tc.container.reload(), undefined, 'container.reload() is mocked.');

    assert.equal(window.tc_events_global(), undefined, 'getTracker.trackPageView() is mocked.');

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
});
