/* eslint-disable no-underscore-dangle */
import { parseCookieString } from '../../src/helpers';
import {
    runScriptlet,
    clearGlobalProps,
    clearCookie,
} from '../helpers';

const { test, module } = QUnit;
const name = 'trusted-set-cookie';

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
};

module(name, { beforeEach, afterEach });

test('Set cookie string', (assert) => {
    let cName = '__test-cookie_OK';
    let cValue = 'OK';
    runScriptlet(name, [cName, cValue]);
    assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
    assert.strictEqual(document.cookie.includes(cName), true, "Cookie with name '__test-cookie_OK' has been set");
    assert.strictEqual(document.cookie.includes(cValue), true, 'Cookie value has been set to OK');
    clearCookie(cName);

    cName = '__test-cookie_0';
    cValue = 0;
    runScriptlet(name, [cName, cValue]);
    assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
    assert.strictEqual(document.cookie.includes(cName), true, "Cookie with name '__test-cookie_0' has been set");
    assert.strictEqual(document.cookie.includes(cValue), true, 'Cookie value has been set to 0');
    clearCookie(cName);

    cName = 'trackingSettings';
    cValue = '{%22ads%22:false%2C%22performance%22:false}';
    runScriptlet(name, [cName, cValue]);

    assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
    assert.strictEqual(document.cookie.includes(cName), true, "Cookie with name 'trackingSettings' has been set");
    assert.strictEqual(document.cookie.includes(cValue), true, 'Cookie value set to encoded object-like string');
    clearCookie(cName);

    cName = 'CookieConsentV2';
    cValue = 'YES%2CTOI%2CANA%2CKOH';
    runScriptlet(name, [cName, cValue]);

    assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
    assert.strictEqual(document.cookie.includes(cName), true, "Cookie with name 'CookieConsentV2' has been set");
    assert.strictEqual(document.cookie.includes(cValue), true, 'Cookie value has been set to encoded string');
    clearCookie(cName);
});

test('Set cookie with current time value', (assert) => {
    const cName = '__test-cookie_current_time';
    const cValue = '$now$';

    runScriptlet(name, [cName, cValue]);

    assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
    assert.strictEqual(document.cookie.includes(cName), true, 'Cookie name has been set');

    // Some time will pass between calling scriptlet
    // and qunit running assertion
    const tolerance = 125;
    const cookieValue = parseCookieString(document.cookie)[cName];
    const currentTime = new Date().getTime();
    const timeDiff = currentTime - cookieValue;

    assert.ok(timeDiff < tolerance, 'Cookie value has been set to current time');
    clearCookie(cName);
});

test('Set cookie with expires', (assert) => {
    const cName = '__test-cookie_expires';
    const cValue = 'expires';
    const expiresSec = 2;

    runScriptlet(name, [cName, cValue, `${expiresSec}`]);

    assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
    assert.strictEqual(document.cookie.includes(cName), true, 'Cookie name has been set');
    assert.strictEqual(document.cookie.includes(cValue), true, 'Cookie value has been set');

    const done = assert.async();

    setTimeout(() => {
        assert.strictEqual(document.cookie.includes(cName), false, 'Cookie name has been deleted');
        assert.strictEqual(document.cookie.includes(cValue), false, 'Cookie value has been deleted');
        clearCookie(cName);
        done();
    }, expiresSec * 1000);
});

test('Set cookie with negative expires', (assert) => {
    const cName = '__test-cookie_expires_negative';
    const cValue = 'expires';
    const expiresSec = -2;

    runScriptlet(name, [cName, cValue, `${expiresSec}`]);

    assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
    assert.strictEqual(document.cookie.includes(cName), false, 'Cookie name has not been set');
    assert.strictEqual(document.cookie.includes(cValue), false, 'Cookie value has not been set');
    clearCookie(cName);
});

test('Set cookie with invalid expires', (assert) => {
    const cName = '__test-cookie_expires_invalid';
    const cValue = 'expires';
    const expiresSec = 'invalid_value';
    assert.expect(4);
    // eslint-disable-next-line no-console
    console.log = function log(input) {
        if (input.includes('trace')) {
            return;
        }
        assert.strictEqual(
            input,
            `${name}: Invalid offsetExpiresSec value: ${expiresSec}`,
            'logs correctly on invalid offsetExpiresSec',
        );
    };
    runScriptlet(name, [cName, cValue, `${expiresSec}`]);

    assert.strictEqual(window.hit, undefined, 'Hit was not fired');
    assert.strictEqual(document.cookie.includes(cName), false, 'Cookie name has not been set');
    assert.strictEqual(document.cookie.includes(cValue), false, 'Cookie value has not been set');
    clearCookie(cName);
});
