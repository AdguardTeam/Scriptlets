/* eslint-disable no-underscore-dangle */
import { runRedirect, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'matomo';

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

test('matomo works', (assert) => {
    runRedirect(name);

    assert.ok(window.Piwik, 'window.Piwik exists');
    assert.ok(window.Piwik.getTracker, 'Piwik.getTracker exists');
    assert.ok(window.Piwik.getAsyncTracker, 'Piwik.getTracker exists');

    // eslint-disable-next-line new-cap
    const tracker = new window.Piwik.getTracker();
    assert.equal(tracker.setDoNotTrack(), undefined, 'getTracker.setDoNotTrack() is mocked.');
    assert.equal(tracker.setDomains(), undefined, 'getTracker.setDomains() is mocked.');
    assert.equal(tracker.setCustomDimension(), undefined, 'getTracker.setCustomDimension() is mocked.');
    assert.equal(tracker.trackPageView(), undefined, 'getTracker.trackPageView() is mocked.');

    // eslint-disable-next-line new-cap
    const asyncTracker = new window.Piwik.getAsyncTracker();
    assert.equal(asyncTracker.addListener(), undefined, 'getAsyncTracker.addListener() is mocked.');

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
});
