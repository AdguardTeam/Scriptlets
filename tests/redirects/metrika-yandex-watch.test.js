/* eslint-disable no-underscore-dangle */
import { runRedirect, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'metrika-yandex-watch';

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

test('AdGuard: yandex metrika watch.js', (assert) => {
    assert.expect(14);

    // yandex_metrika_callbacks: these callbacks needed for
    // creating an instance of Ya.Metrika after script loading
    window.yandex_metrika_callbacks = [
        () => assert.ok(true, 'yandex_metrika_callbacks were executed'),
    ];

    runRedirect(name);

    const { Metrika } = window.Ya;
    assert.ok(Metrika, 'Metrika function was created');
    assert.ok(Metrika.counters().length === 0, 'Metrika.counters returns empty array');

    const ya = new Metrika();
    assert.notOk(ya.addFileExtension(), 'addFileExtension function created and executed');
    assert.ok(ya.counters().length === 0, 'ya.counters returns empty array');

    // no-options methods test
    assert.notOk(ya.addFileExtension(), 'addFileExtension function created and executed');
    assert.notOk(ya.getClientID(), 'getClientID function created and executed');
    assert.notOk(ya.setUserID(), 'setUserID function created and executed');
    assert.notOk(ya.userParams(), 'userParams function created and executed');
    assert.notOk(ya.params(), 'params function created and executed');

    // reachGoal method test
    const done = assert.async();
    function reachGoalCb() {
        // eslint-disable-next-line eqeqeq
        assert.ok(this == 123, 'context was changed');
        assert.ok(true, 'callback passed in reachGoal method was executed');
        done();
    }
    ya.reachGoal('some target', 'some param', reachGoalCb, 123);

    const done1 = assert.async();
    function extLinkCb() {
        // eslint-disable-next-line eqeqeq
        assert.ok(this == 123, 'extLinkCb was executed and context was changed');
        done1();
    }
    ya.extLink('some url', { callback: extLinkCb, ctx: 123 });

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
});
