import { evalWrapper, getRedirectsInstance } from '../helpers';

const { test, module } = QUnit;
const name = 'amazon-apstag';

let redirects;
const before = async () => {
    redirects = await getRedirectsInstance();
};

module(name, { before });

test('Checking if alias name works', async (assert) => {
    const codeByAdgParams = redirects.getRedirect(name).content;
    const codeByUboParams = redirects.getRedirect('ubo-amazon_apstag.js').content;

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

test('amazon-apstag: works', (assert) => {
    evalWrapper(redirects.getRedirect(name).content);

    assert.ok(window.apstag, 'window.apstag exists');
    assert.ok(window.apstag.fetchBids, 'apstag.fetchBids exists');
    assert.equal(window.apstag.init(), undefined, 'apstag.init() is mocked');
    assert.equal(window.apstag.setDisplayBids(), undefined, 'apstag.setDisplayBids() is mocked');
    assert.equal(window.apstag.targetingKeys(), undefined, 'apstag.targetingKeys() is mocked');
});
