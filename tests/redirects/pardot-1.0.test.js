/* eslint-disable no-underscore-dangle */
import { runRedirect, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'pardot-1.0';

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

test('pardot works', (assert) => {
    runRedirect(name);

    const {
        piVersion,
        piScriptNum,
        piScriptObj,
        checkNamespace,
        getPardotUrl,
        piGetParameter,
        piSetCookie,
        piGetCookie,
        piResponse,
        piTracker,
    } = window;

    assert.strictEqual(piTracker(), undefined, 'piTracker mocked');
    assert.strictEqual(piResponse(), undefined, 'piResponse mocked');

    assert.strictEqual(checkNamespace(), undefined, 'checkNamespace mocked');
    assert.strictEqual(getPardotUrl(), '', 'getPardotUrl mocked');
    assert.strictEqual(piGetParameter(), null, 'piGetParameter mocked');
    assert.strictEqual(piSetCookie(), undefined, 'piSetCookie mocked');
    assert.strictEqual(piGetCookie(), '', 'piGetCookie mocked');

    assert.ok(piVersion);
    assert.ok(piScriptObj);
    assert.strictEqual(piScriptNum, 1);

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
    clearGlobalProps('__debug', 'hit', 'GemiusPlayer');
});
