/* global QUnit */
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


test('ubo alias', (assert) => {
    createHit();
    const params = {
        name: 'abp-dir-string',
        args: [],
        verbose: true,
    };
    const resString = window.scriptlets.invoke(params);
    evalWrapper(resString);

    console.dir({});
    assert.strictEqual(window.hit, 'FIRED', 'Console dir was updated and invoked');
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
