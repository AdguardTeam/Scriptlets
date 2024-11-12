import { clearGlobalProps, getRedirectsInstance, evalWrapper } from '../helpers';

const { test, module } = QUnit;
const name = 'scorecardresearch-beacon';

const changingProps = ['COMSCORE', '_comscore'];

const afterEach = () => {
    clearGlobalProps(...changingProps);
};

let redirects;
const before = async () => {
    redirects = await getRedirectsInstance();
};

module(name, { before, afterEach });

test('Checking if alias name works', (assert) => {
    const codeByAdgParams = redirects.getRedirect(name).content;
    const codeByUboParams = redirects.getRedirect('ubo-scorecardresearch_beacon.js').content;

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

test('AdGuard Syntax', (assert) => {
    evalWrapper(redirects.getRedirect(name).content);

    assert.ok(window.COMSCORE, 'COMSCORE object was created');
    window.COMSCORE.purge();
    // eslint-disable-next-line no-underscore-dangle
    assert.strictEqual(window._comscore.length, 0, 'purge function reset _compscore var to []');
    assert.notOk(window.COMSCORE.beacon(), 'becacon function was mocked');
});
