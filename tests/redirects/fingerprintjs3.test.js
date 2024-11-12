/* eslint-disable no-underscore-dangle */
import { evalWrapper, getRedirectsInstance } from '../helpers';

const { test, module } = QUnit;
const name = 'fingerprintjs3';

let redirects;
const before = async () => {
    redirects = await getRedirectsInstance();
};

module(name, { before });

test('Checking if alias name works', (assert) => {
    const codeByAdgParams = redirects.getRedirect(name).content;
    const codeByUboParams = redirects.getRedirect('ubo-fingerprint3.js').content;

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

test('Fingerprint3 works', (assert) => {
    evalWrapper(redirects.getRedirect(name).content);

    assert.expect(6);

    const { FingerprintJS } = window;

    assert.ok(FingerprintJS, 'FingerprintJS object was created');
    assert.strictEqual(FingerprintJS.hashComponents(), '', 'hashComponents() mocked');
    FingerprintJS.load().then((response) => {
        assert.ok(response, 'load() request fulfilled');
    });
    FingerprintJS.get().then((response) => {
        assert.ok(response, 'get() request fulfilled');
        assert.ok(response.visitorId, 'visitorId mocked');
        assert.strictEqual(typeof response.visitorId, 'string', 'visitorId is a string');
    });
});
