/* eslint-disable no-underscore-dangle */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'disable-newtab-links';

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
};

module(name, { beforeEach, afterEach });

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

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

test('adg works', (assert) => {
    runScriptlet(name);

    const elem = createLink();
    elem.click();

    const done = assert.async();
    setTimeout(() => {
        assert.strictEqual(window.hit, 'FIRED', 'hit fired');
        done();
    });
});
