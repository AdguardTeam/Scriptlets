/* eslint-disable no-underscore-dangle */
import { clearGlobalProps, getRedirectsInstance, evalWrapper } from '../helpers';

const { test, module } = QUnit;
const name = 'pardot-1.0';

let redirects;
const before = async () => {
    redirects = await getRedirectsInstance();
};

module(name, { before });

test('pardot works', (assert) => {
    evalWrapper(redirects.getRedirect(name).content);

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

    clearGlobalProps('GemiusPlayer');
});
