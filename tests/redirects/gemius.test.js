/* eslint-disable no-underscore-dangle */
import { runRedirect, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'gemius';

const changingProps = ['hit', '__debug', 'GemiusPlayer'];

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps(...changingProps);
};

module(name, { beforeEach, afterEach });

test('Gemius works', (assert) => {
    runRedirect(name);

    const gemius = new window.GemiusPlayer();
    assert.ok(gemius, 'gemiusPlayer was created');

    assert.notOk(gemius.setVideoObject(), 'setVideoObject function mocked');
    assert.notOk(gemius.newProgram(), 'newProgram function mocked');
    assert.notOk(gemius.programEvent(), 'programEvent function mocked');
    assert.notOk(gemius.newAd(), 'newAd function mocked');
    assert.notOk(gemius.adEvent(), 'adEvent function mocked');

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
    clearGlobalProps('__debug', 'hit', 'GemiusPlayer');
});
