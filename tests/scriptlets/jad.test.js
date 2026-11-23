/* eslint-disable no-underscore-dangle */
import { clearGlobalProps, runScriptlet } from '../helpers';

const { test, module } = QUnit;
const name = 'jad';

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug', 'jad');
};

module(name, { beforeEach, afterEach });

test('Installs the API, which the page then uses', (assert) => {
    runScriptlet(name);
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');

    // as the page code of ozap.com after the scriptlet
    window.jad = window.jad || {};
    window.jad.cmd = window.jad.cmd || [];
    const params = [];
    window.jad.cmd.push(() => {
        window.jad.public.setConfig({ page: '/120157152/PUREMEDIAS_FR_WEB/home' });
        window.jad.public.addEventListener('positionRenderEnded', () => {});
        window.jad.public.loadPositions();
        window.jad.public.displayPositions();
    });
    window.jad.cmd.push(() => {
        const key = 'preroll_playercontent/wb-player-1';
        window.jad.public.getDailymotionAdsParamsForScript([key], (res) => params.push(res[key]));
    });
    assert.deepEqual(params, ['premium'], 'commands pushed after the scriptlet is run are run at once');
});

test('Is not applied twice', (assert) => {
    runScriptlet(name);
    const first = window.jad;
    clearGlobalProps('hit');
    runScriptlet(name);
    assert.strictEqual(window.jad, first, 'second run keeps the first mock');
    assert.strictEqual(window.hit, undefined, 'hit function not fired again');
});
