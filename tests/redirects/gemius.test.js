/* eslint-disable no-underscore-dangle, no-eval */
import { clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'gemius';

module(name);

const evalWrapper = eval;

test('Gemius works', (assert) => {
    const params = {
        name,
        verbose: true,
    };
    window.__debug = () => { window.hit = 'FIRED'; };

    // run scriptlet
    const resString = window.scriptlets.redirects.getCode(params);
    evalWrapper(resString);

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
