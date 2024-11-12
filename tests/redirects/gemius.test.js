/* eslint-disable no-underscore-dangle */
import { evalWrapper, getRedirectsInstance } from '../helpers';

const { test, module } = QUnit;
const name = 'gemius';

let redirects;
const before = async () => {
    redirects = await getRedirectsInstance();
};

module(name, { before });

test('Gemius works', (assert) => {
    evalWrapper(redirects.getRedirect(name).content);

    const gemius = new window.GemiusPlayer();
    assert.ok(gemius, 'gemiusPlayer was created');

    assert.notOk(gemius.setVideoObject(), 'setVideoObject function mocked');
    assert.notOk(gemius.newProgram(), 'newProgram function mocked');
    assert.notOk(gemius.programEvent(), 'programEvent function mocked');
    assert.notOk(gemius.newAd(), 'newAd function mocked');
    assert.notOk(gemius.adEvent(), 'adEvent function mocked');
});
