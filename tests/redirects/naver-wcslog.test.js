/* eslint-disable no-underscore-dangle */
import { runRedirect, clearGlobalProps } from '../helpers';
import { isEmptyObject } from '../../src/helpers';

const { test, module } = QUnit;
const name = 'naver-wcslog';

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

test('wcslog works', (assert) => {
    runRedirect(name);

    assert.ok(window.wcs, 'wcs created');
    assert.ok(window.wcs.inflow() === undefined, 'wcs.inflow mocked');
    assert.ok(isEmptyObject(window.wcs_add), 'wcs_add mocked');
    assert.ok(window.wcs_do() === undefined, 'wcs_do mocked');

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
});
