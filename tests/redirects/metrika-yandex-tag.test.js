/* eslint-disable eqeqeq, no-underscore-dangle, no-eval */
import { runRedirect, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'metrika-yandex-tag';

const changingProps = ['hit', '__debug', 'ym'];

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps(...changingProps);
};

module(name, { beforeEach, afterEach });

test('API mocking test', (assert) => {
    assert.expect(6);

    // Mock case: window.ym === 'undefined'
    runRedirect(name);

    assert.ok(window.ym, 'Metrika function was created');

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
    clearGlobalProps('hit', 'ym');

    // Mock case: ym and ym.a are predefined
    const counterId1 = 111;
    const counterId2 = 222;
    window.ym = () => {};
    window.ym.a = [[counterId1], [counterId2]];

    runRedirect(name);

    assert.ok(window.ym, 'Metrika function was created');
    assert.ok(typeof window[`yaCounter${counterId1}`] === 'object', 'yaCounter1 was created');
    assert.ok(typeof window[`yaCounter${counterId1}`] === 'object', 'yaCounter2 was created');

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
    clearGlobalProps(`yaCounter${counterId1}`, `yaCounter${counterId1}`);
});

test('ym: API methods test', (assert) => {
    assert.expect(5);

    runRedirect(name);

    assert.ok(window.ym, 'Metrika function was created');

    // extLink
    const done = assert.async();
    function extLinkCb() {
        assert.ok(this == 123, 'cb was executed and context changed');
        done();
    }
    window.ym(1, 'extLink', 'params', {
        callback: extLinkCb,
        ctx: 123,
    });

    // getClientID
    const done1 = assert.async();
    function getClientIDCb(data) {
        assert.strictEqual(data, null, 'getClientID returns null');
        done1();
    }
    window.ym(1, 'getClientID', getClientIDCb);

    // reachGoal
    const done2 = assert.async();
    function reachGoalCb() {
        // eslint-disable-next-line eqeqeq
        assert.ok(this == 123, 'context was changed');
        done2();
    }
    window.ym(1, 'reachGoal', 'target', 'params', reachGoalCb, 123);

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
});

test('yaCounter: API methods test', (assert) => {
    assert.expect(6);

    const id = 111;
    window.ym = () => {};
    window.ym.a = [[id]];

    runRedirect(name);

    assert.ok(window.ym, 'Metrika function was created');
    assert.ok(typeof window[`yaCounter${id}`] === 'object', 'yaCounter1 was created');

    const yaCounter = window[`yaCounter${id}`];
    // extLink
    const done = assert.async();
    function extLinkCb() {
        assert.ok(this == 123, 'cb was executed and context changed');
        done();
    }
    yaCounter.extLink(1, 'params', {
        callback: extLinkCb,
        ctx: 123,
    });

    // getClientID
    const done1 = assert.async();
    function getClientIDCb(data) {
        assert.strictEqual(data, null, 'getClientID returns null');
        done1();
    }
    yaCounter.getClientID(1, getClientIDCb);

    // reachGoal
    const done2 = assert.async();
    function reachGoalCb() {
        // eslint-disable-next-line eqeqeq
        assert.ok(this == 123, 'context was changed');
        done2();
    }
    yaCounter.reachGoal(1, 'target', 'params', reachGoalCb, 123);

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
    clearGlobalProps(`yaCounter${id}`);
});
