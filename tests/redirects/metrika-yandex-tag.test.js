/* eslint-disable eqeqeq, no-underscore-dangle, no-eval */
import { clearGlobalProps, getRedirectsInstance, evalWrapper } from '../helpers';

const { test, module } = QUnit;
const name = 'metrika-yandex-tag';

const changingProps = ['ym'];

const afterEach = () => {
    clearGlobalProps(...changingProps);
};

let redirects;
const before = async () => {
    redirects = await getRedirectsInstance();
};

module(name, { before, afterEach });

test('API mocking test', (assert) => {
    assert.expect(4);

    // Mock case: window.ym === 'undefined'
    evalWrapper(redirects.getRedirect(name).content);

    assert.ok(window.ym, 'Metrika function was created');

    clearGlobalProps('hit', 'ym');

    // Mock case: ym and ym.a are predefined
    const counterId1 = 111;
    const counterId2 = 222;
    window.ym = () => {};
    window.ym.a = [[counterId1], [counterId2]];

    evalWrapper(redirects.getRedirect(name).content);

    assert.ok(window.ym, 'Metrika function was created');
    assert.ok(typeof window[`yaCounter${counterId1}`] === 'object', 'yaCounter1 was created');
    assert.ok(typeof window[`yaCounter${counterId1}`] === 'object', 'yaCounter2 was created');

    clearGlobalProps(`yaCounter${counterId1}`, `yaCounter${counterId1}`);
});

test('Init mocking test - when it is used as a scriptlet', (assert) => {
    let testPassed = false;

    evalWrapper(redirects.getRedirect(name).content);

    window.ym = window.ym || function YandexMetrika(...args) {
        (window.ym.a = window.ym.a || []).push(...args);
    };

    const counterId = 28510826;

    window.ym(counterId, 'init', {
        clickmap: true,
        trackLinks: true,
        accurateTrackBounce: true,
        webvisor: true,
        ecommerce: 'dataLayer',
    });

    try {
        window.yaCounter28510826.reachGoal('login');
        testPassed = true;
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`yaCounter${counterId} is not defined:`, error);
    }

    assert.ok(window.ym, 'Metrika function was created');
    assert.ok(typeof window[`yaCounter${counterId}`] === 'object', 'yaCounter was created');
    assert.strictEqual(testPassed, true, 'testPassed is true');

    clearGlobalProps(`yaCounter${counterId}`);
});

test('ym: API methods test', (assert) => {
    assert.expect(4);

    evalWrapper(redirects.getRedirect(name).content);

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
});

test('yaCounter: API methods test', (assert) => {
    assert.expect(11);

    const id = 111;
    window.ym = () => {};
    window.ym.a = [[id]];
    const eventHandler = () => {
        assert.ok(true, 'Counter event dispatched');
    };
    document.addEventListener(`yacounter${id}inited`, eventHandler);

    evalWrapper(redirects.getRedirect(name).content);

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

    // noop methods
    assert.strictEqual(yaCounter.destruct(), undefined, 'api destruct() is mocked');
    assert.strictEqual(yaCounter.addFileExtension(), undefined, 'api addFileExtension() is mocked');
    assert.strictEqual(yaCounter.params(), undefined, 'api params() is mocked');
    assert.strictEqual(yaCounter.setUserID(), undefined, 'api setUserID() is mocked');
    assert.strictEqual(yaCounter.userParams(), undefined, 'api userParams() is mocked');

    document.removeEventListener(`yacounter${id}inited`, eventHandler);
    clearGlobalProps(`yaCounter${id}`);
});
