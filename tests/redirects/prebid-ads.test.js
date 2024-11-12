import { evalWrapper, getRedirectsInstance } from '../helpers';

const { test, module } = QUnit;
const name = 'prebid-ads';

let redirects;
const before = async () => {
    redirects = await getRedirectsInstance();
};

module(name, { before });

test('constants are set', (assert) => {
    evalWrapper(redirects.getRedirect(name).content);

    assert.true(window.canRunAds, 'window.canRunAds created');
    assert.false(window.isAdBlockActive, 'Piwik.isAdBlockActive created');
});
