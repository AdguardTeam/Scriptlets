/* eslint-disable no-underscore-dangle */
import { clearGlobalProps, runScriptlet } from '../helpers';

const { test, module } = QUnit;
const name = 'adobe-analytics';

const GLOBALS = [
    'hit',
    '__debug',
    'AppMeasurement',
    'AppMeasurement_Module_ActivityMap',
    's_gi',
    's_pgicq',
    's_giq',
    's_objectID',
    's_c_il',
    's_c_in',
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

test('Installs AppMeasurement', (assert) => {
    runScriptlet(name);
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    const s = window.s_gi('rsid');
    assert.ok(s instanceof window.AppMeasurement, 's_gi() returns an instance');
    assert.strictEqual(s.t(), undefined, 'page code calling t() does not throw');
});

test('Keeps the real library and is not applied twice', (assert) => {
    const real = () => {};
    window.AppMeasurement = real;
    window.s_gi = real;
    window.s_pgicq = real;
    window.AppMeasurement_Module_ActivityMap = real;
    runScriptlet(name);
    assert.strictEqual(window.AppMeasurement, real, 'existing library is kept');
    assert.strictEqual(window.hit, undefined, 'hit function not fired');

    clearGlobalProps(...GLOBALS);
    window.__debug = () => {
        window.hit = 'FIRED';
    };
    runScriptlet(name);
    const first = window.AppMeasurement;
    runScriptlet(name);
    assert.strictEqual(window.AppMeasurement, first, 'second run keeps the first library');
});
