/* eslint-disable no-underscore-dangle */
import { clearGlobalProps, runScriptlet } from '../helpers';

const { test, module } = QUnit;
const name = 'piano-analytics';

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug', 'pa', 'pianoAnalytics', '_paq');
};

module(name, { beforeEach, afterEach });

test('Installs the API, which the page then uses', (assert) => {
    runScriptlet(name);
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');

    // as the page code of campusfrance.org after the blocked SDK
    const { pa } = window;
    pa.setConfigurations({ site: 1, collectDomain: 'https://log.xiti.com' });
    pa.setProperties({ page_type: 'catalog' });
    pa.sendEvent('page.display', { page: 'catalog' });
    window._paq = window._paq || [];
    window._paq.push(['consent.setMode', 'essential']);
    assert.strictEqual(pa.consent.getMode(), 'essential', 'queue pushed after the scriptlet is run');
});

test('Is not applied twice, and keeps the SDK', (assert) => {
    runScriptlet(name);
    const first = window.pa;
    clearGlobalProps('hit');
    runScriptlet(name);
    assert.strictEqual(window.pa, first, 'second run keeps the first mock');
    assert.strictEqual(window.hit, undefined, 'hit function not fired again');
});
