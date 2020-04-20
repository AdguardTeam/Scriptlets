/* eslint-disable no-eval, no-underscore-dangle, no-console */
import { clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'dir-string';

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
};

module(name, { afterEach });

const createHit = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const evalWrapper = eval;

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const abpParams = {
        name: 'abp-dir-string',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByAbpParams = window.scriptlets.invoke(abpParams);

    assert.strictEqual(codeByAdgParams, codeByAbpParams, 'abp name - ok');
});

test('Adg rule times = 2', (assert) => {
    createHit();
    const params = {
        name,
        args: [2],
        verbose: true,
    };
    const resString = window.scriptlets.invoke(params);
    evalWrapper(resString);

    console.dir({});
    assert.strictEqual(window.hit, 'FIRED', 'Console dir was updated and invoked');
});
