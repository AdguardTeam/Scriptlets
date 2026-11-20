/* eslint-disable no-underscore-dangle */
import { clearGlobalProps, runScriptlet, sleep } from '../helpers';

const { test, module } = QUnit;
const name = 'optimizely';

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug', 'optimizely');
};

module(name, { beforeEach, afterEach });

test('Checking if alias names work', (assert) => {
    const getCode = (scriptletName) => window.scriptlets.invoke({
        name: scriptletName,
        engine: 'test',
        verbose: true,
    });
    const code = getCode(name);
    assert.strictEqual(getCode('ubo-optimizely.js'), code, 'ubo- prefixed name - ok');
    assert.strictEqual(getCode('optimizely.js'), code, 'ubo name - ok');
});

test('Installs the API without project identity', async (assert) => {
    const initialized = [];
    window.optimizely = [{
        type: 'addListener',
        filter: { type: 'lifecycle', name: 'initialized' },
        handler: (event) => initialized.push(event.name),
    }];

    runScriptlet(name);

    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    const api = window.optimizely;
    assert.strictEqual(typeof api.get, 'function', 'get is a function');
    assert.strictEqual(api.initialized, true, 'initialized is set');
    assert.deepEqual(api.get('state').getVariationMap(), {}, 'state answers');
    const data = api.get('data');
    assert.strictEqual(data.projectId, null, 'project id is not known');
    assert.strictEqual(data.accountId, null, 'account id is not known');

    await sleep(20);
    assert.deepEqual(initialized, ['initialized'], 'queued listener is called');
});

const getScriptletCode = () => window.scriptlets.invoke({ name, args: [], verbose: false });

const getIdentity = () => {
    const data = window.optimizely.get('data');
    return { accountId: data.accountId, projectId: data.projectId, revision: data.revision };
};

const NO_IDENTITY = { accountId: null, projectId: null, revision: null };

test('Project identity is not known if injected by an inline script', (assert) => {
    // as the browser extension injects scriptlets in MV2
    const script = document.createElement('script');
    script.textContent = getScriptletCode();
    document.documentElement.appendChild(script);
    script.remove();

    assert.strictEqual(typeof window.optimizely.get, 'function', 'API is installed');
    assert.deepEqual(getIdentity(), NO_IDENTITY, 'no project identity');
});

test('Project identity is not known if injected by a script with src', async (assert) => {
    const url = URL.createObjectURL(new Blob([getScriptletCode()], { type: 'text/javascript' }));
    await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
    URL.revokeObjectURL(url);

    assert.strictEqual(typeof window.optimizely.get, 'function', 'API is installed');
    assert.deepEqual(getIdentity(), NO_IDENTITY, 'no project identity');
});

test('Keeps an initialized client and is not applied twice', (assert) => {
    const client = { get: () => 'page client' };
    window.optimizely = client;
    runScriptlet(name);
    assert.strictEqual(window.optimizely, client, 'existing client is kept');
    assert.strictEqual(window.hit, undefined, 'hit function not fired');

    clearGlobalProps('optimizely');
    runScriptlet(name);
    const first = window.optimizely;
    runScriptlet(name);
    assert.strictEqual(window.optimizely, first, 'second run keeps the first API');
});
