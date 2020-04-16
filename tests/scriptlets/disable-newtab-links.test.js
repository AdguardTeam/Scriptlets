/* eslint-disable no-eval, no-underscore-dangle */
import { clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'disable-newtab-links';

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

const createLink = () => {
    const elem = document.createElement('a');
    elem.setAttribute('target', '_blank');
    document.body.appendChild(elem);

    return elem;
};

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const uboParams = {
        name: 'ubo-disable-newtab-links.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByUboParams = window.scriptlets.invoke(uboParams);

    assert.strictEqual(codeByAdgParams.toString(), codeByUboParams.toString(), 'ubo name - ok');
});

test('adg works', (assert) => {
    createHit();
    const params = {
        name,
        args: [],
        verbose: true,
    };

    const elem = createLink();
    const resString = window.scriptlets.invoke(params);

    evalWrapper(resString);
    elem.click();

    const done = assert.async();
    setTimeout(() => {
        assert.strictEqual(window.hit, 'FIRED');
        done();
    });
});
