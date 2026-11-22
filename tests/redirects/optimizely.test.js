import { evalWrapper, getRedirectsInstance } from '../helpers';

const { test, module } = QUnit;
const name = 'optimizely';

let redirects;
const before = async () => {
    redirects = await getRedirectsInstance();
};

const afterEach = () => {
    delete window.optimizely;
};

module(name, { before, afterEach });

const runRedirect = () => {
    evalWrapper(redirects.getRedirect(name).content);
};

test('Optimizely works', (assert) => {
    runRedirect();

    const { optimizely } = window;
    assert.strictEqual(typeof optimizely, 'object', 'optimizely mocked');
    assert.strictEqual(optimizely.initialized, true, 'client reports itself initialized');
    assert.strictEqual(typeof optimizely.push, 'function', 'push mocked');
    assert.strictEqual(typeof optimizely.get, 'function', 'get mocked');
});

test('Queued commands are drained and push keeps working', (assert) => {
    window.optimizely = [];
    window.optimizely.push({ type: 'activate' });
    runRedirect();

    const { optimizely } = window;
    assert.strictEqual(typeof optimizely.get, 'function', 'the array stub is replaced by the api');
    assert.strictEqual(optimizely.push({ type: 'activate' }), true, 'a known command is accepted');
    assert.strictEqual(optimizely.push({ type: 'nonExistentCommand' }), false, 'an unknown command is refused');
});

test('get() answers the modules a page asks for', (assert) => {
    runRedirect();

    const { optimizely } = window;
    assert.deepEqual(optimizely.get('state').getVariationMap(), {}, 'no variations');
    assert.deepEqual(optimizely.get('state').getCampaignStates(), {}, 'no campaigns');
    assert.deepEqual(optimizely.get('state').getActiveExperimentIds(), [], 'no active experiments');
    assert.strictEqual(optimizely.get('state').getRedirectInfo(), null, 'no redirect experiment');
    assert.strictEqual(optimizely.get('visitor').location.country, '', 'no visitor location');
    assert.strictEqual(typeof optimizely.get('visitor_id').randomId, 'string', 'visitor id mocked');
    assert.deepEqual(optimizely.get('data').experiments, {}, 'no experiment data');
    assert.strictEqual(typeof optimizely.get('utils').waitForElement, 'function', 'utils mocked');
    assert.strictEqual(typeof optimizely.get('event_emitter').emit, 'function', 'event_emitter mocked');
});

test('Lifecycle listeners are called', (assert) => {
    assert.expect(1);
    const done = assert.async();

    runRedirect();

    window.optimizely.push({
        type: 'addListener',
        filter: { type: 'lifecycle', name: 'initialized' },
        handler: () => {
            assert.ok(true, 'initialized listener is called');
            done();
        },
    });
});

test('utils.waitForElement resolves', (assert) => {
    assert.expect(1);
    const done = assert.async();

    runRedirect();

    window.optimizely.get('utils').waitForElement('body').then((element) => {
        assert.strictEqual(element, document.body, 'waitForElement resolves with the element');
        done();
    });
});

test('Classic api is answered for pre-migration snippets', (assert) => {
    runRedirect();

    const { optimizely } = window;
    assert.strictEqual(typeof optimizely.data, 'object', 'classic data mocked');
    assert.deepEqual(optimizely.activeExperiments, [], 'classic activeExperiments mocked');
    assert.strictEqual(typeof optimizely.getAccountId, 'function', 'classic getAccountId mocked');
    assert.deepEqual(optimizely.data.state.activeExperiments, [], 'classic data.state mocked');
});
