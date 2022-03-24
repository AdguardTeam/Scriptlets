/* eslint-disable no-underscore-dangle */
import { runRedirect, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'google-ima3';

const changingProps = ['hit', '__debug'];

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps(...changingProps);
};

module(name, { beforeEach, afterEach });

test('Ima mocked', (assert) => {
    assert.expect(25);

    runRedirect(name);

    assert.ok(window.google, 'window.google created');
    assert.ok(window.google.ima, 'Ima created');
    // eslint-disable-next-line no-restricted-syntax
    for (const key of Object.keys(window.google.ima)) {
        assert.ok(window.google.ima[key], `ima.${key} mocked`);
    }
});
