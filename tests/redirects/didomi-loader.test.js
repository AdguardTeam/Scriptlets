import { evalWrapper, getRedirectsInstance } from '../helpers';

const { test, module } = QUnit;
const name = 'didomi-loader';

let redirects;
const before = async () => {
    redirects = await getRedirectsInstance();
};

module(name, { before });

test('Didomi-loader works', (assert) => {
    evalWrapper(redirects.getRedirect(name).content);

    assert.expect(9);
    const done1 = assert.async();
    const done2 = assert.async();

    const {
        Didomi, didomiState, didomiEventListeners, didomiOnReady, __tcfapi,
    } = window;
    // Main wrappers
    assert.strictEqual(typeof Didomi, 'object', 'Didomi mocked');
    assert.strictEqual(typeof Didomi.getObservableOnUserConsentStatusForVendor(), 'object', 'Didomi mocked');
    assert.strictEqual(typeof didomiState, 'object', 'didomiState mocked');
    assert.strictEqual(typeof didomiEventListeners, 'object', 'didomiEventListeners mocked');
    assert.strictEqual(typeof didomiOnReady, 'object', 'didomiOnReady mocked');
    assert.strictEqual(typeof __tcfapi, 'function', '__tcfapi mocked');
    // Callbacks
    assert.strictEqual(typeof didomiOnReady.push, 'function', 'didomiOnReady.push mocked');
    didomiOnReady.push(() => {
        assert.ok(Didomi, 'callback is called');
        done1();
    });
    __tcfapi('addEventListener', 1, (tcData) => {
        assert.ok(typeof tcData, 'object', 'callback is called');
        done2();
    });
    __tcfapi('removeEventListener', 1, () => {
        throw new Error();
    });
});
