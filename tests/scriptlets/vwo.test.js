/* eslint-disable no-underscore-dangle */
import { clearGlobalProps, evalWrapper, runScriptlet } from '../helpers';

const { test, module } = QUnit;
const name = 'vwo';

const GLOBALS = [
    'hit',
    '__debug',
    'VWO',
    'Wingify',
    '_vwo_code',
    'vwo_libExecuted',
    '_vwo_exp',
    '_vwo_exp_ids',
    '_vis_opt_queue',
    '_vis_opt_goal_conversion',
    '_vis_opt_revenue_conversion',
    '_vis_opt_register_conversion',
    '_vis_opt_createCookie',
    '_vis_opt_element_loaded',
    '_vis_opt_readCookie',
    'vwoTestSmartCodeRan',
];

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps(...GLOBALS);
};

module(name, { beforeEach, afterEach });

test('Installs the library globals', (assert) => {
    runScriptlet(name);

    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    assert.strictEqual(window.vwo_libExecuted, true, 'vwo_libExecuted');
    assert.strictEqual(window._vwo_code.finished(), true, '_vwo_code is defined');

    // the page initializes the queue after the scriptlet, as in the VWO docs
    const calls = [];
    window.VWO = window.VWO || [];
    window.VWO.push(['onLibLoaded', (data) => calls.push(data)]);
    assert.deepEqual(calls, [[{}, []]], 'callbacks pushed by the page are called at once');
});

test('Asynchronous SmartCode which runs after the scriptlet is skipped', (assert) => {
    runScriptlet(name);
    // as the SmartCode: window._vwo_code || function () { ... hides the page ... }();
    evalWrapper('window._vwo_code || (function () { window.vwoTestSmartCodeRan = true; })();');
    assert.strictEqual(window.vwoTestSmartCodeRan, undefined, 'SmartCode does not run, so it does not hide the page');
});

test('Keeps the real library and is not applied twice', (assert) => {
    window.vwo_libExecuted = true;
    runScriptlet(name);
    assert.strictEqual(window.VWO, undefined, 'nothing is installed after the library');
    assert.strictEqual(window.hit, undefined, 'hit function not fired');

    clearGlobalProps('vwo_libExecuted');
    runScriptlet(name);
    const first = window.VWO;
    runScriptlet(name);
    assert.strictEqual(window.VWO, first, 'second run keeps the first queue');
});
