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

test('ubo alias', (assert) => {
    createHit();
    const params = {
        name: 'ubo-disable-newtab-links.js',
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

test('adg alias', (assert) => {
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
