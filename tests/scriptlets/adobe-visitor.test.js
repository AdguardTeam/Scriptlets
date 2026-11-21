/* eslint-disable no-underscore-dangle */
import { clearGlobalProps, runScriptlet } from '../helpers';

const { test, module } = QUnit;
const name = 'adobe-visitor';

const GLOBALS = ['hit', '__debug', 'Visitor', 'adobe', 's_c_il', 's_c_in'];

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps(...GLOBALS);
};

module(name, { beforeEach, afterEach });

test('Installs Visitor', (assert) => {
    runScriptlet(name);
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    const visitor = window.Visitor.getInstance('ABC@AdobeOrg');
    assert.strictEqual(visitor.getMarketingCloudVisitorID(), '', 'page code calling the instance does not throw');
});

test('Keeps the real library and is not applied twice', (assert) => {
    const real = () => {};
    window.Visitor = real;
    window.adobe = { OptInCategories: {} };
    runScriptlet(name);
    assert.strictEqual(window.Visitor, real, 'existing library is kept');
    assert.strictEqual(window.hit, undefined, 'hit function not fired');

    clearGlobalProps(...GLOBALS);
    window.__debug = () => {
        window.hit = 'FIRED';
    };
    runScriptlet(name);
    const first = window.Visitor;
    runScriptlet(name);
    assert.strictEqual(window.Visitor, first, 'second run keeps the first library');
});
