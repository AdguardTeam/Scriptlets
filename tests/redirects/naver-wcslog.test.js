import { getRedirectsInstance, evalWrapper } from '../helpers';
import { isEmptyObject } from '../../src/helpers';

const { test, module } = QUnit;
const name = 'naver-wcslog';

let redirects;
const before = async () => {
    redirects = await getRedirectsInstance();
};

module(name, { before });

test('wcslog works', (assert) => {
    evalWrapper(redirects.getRedirect(name).content);

    assert.ok(window.wcs, 'wcs created');
    assert.ok(window.wcs.inflow() === undefined, 'wcs.inflow mocked');
    assert.ok(isEmptyObject(window.wcs_add), 'wcs_add mocked');
    assert.ok(window.wcs_do() === undefined, 'wcs_do mocked');
});
