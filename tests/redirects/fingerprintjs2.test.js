/* eslint-disable no-underscore-dangle */
import { evalWrapper, getRedirectsInstance } from '../helpers';

const { test, module } = QUnit;
const name = 'fingerprintjs2';

let redirects;
const before = async () => {
    redirects = await getRedirectsInstance();
};

module(name, { before });

test('Checking if alias name works', (assert) => {
    const codeByAdgParams = redirects.getRedirect(name).content;
    const codeByUboParams = redirects.getRedirect('fingerprint2.js').content;

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

test('Fingerprint2 works', (assert) => {
    evalWrapper(redirects.getRedirect(name).content);

    const done = assert.async();

    assert.ok(window.Fingerprint2, 'Fingerprint2 object was created');
    assert.notOk(window.Fingerprint2.get(), 'getter returns nothing');

    const cb = () => {
        assert.ok(true, 'callback was executed');
        done();
    };
    window.Fingerprint2.get([], cb);
});
