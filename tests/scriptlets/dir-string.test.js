/* eslint-disable no-underscore-dangle */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'dir-string';

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
};

module(name, { beforeEach, afterEach });

test('Adg rule times = 2', (assert) => {
    const scriptletArgs = [2];
    runScriptlet(name, scriptletArgs);

    // eslint-disable-next-line no-console
    console.dir({});
    assert.strictEqual(window.hit, 'FIRED', 'Console dir was updated and invoked');
});
