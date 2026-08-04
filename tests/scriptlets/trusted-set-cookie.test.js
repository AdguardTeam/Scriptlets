/* eslint-disable no-underscore-dangle */
import { parseCookieString } from '../../src/helpers';
import { runScriptlet, clearGlobalProps, clearCookie } from '../helpers';

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

test('Set cookie with current date value', (assert) => {
    const cName = '__test-cookie_current_date';
    const cValue = '$currentDate$';

    runScriptlet(name, [cName, cValue]);

    assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
    assert.strictEqual(document.cookie.includes(cName), true, 'Cookie name has been set');

    const cookieValue = parseCookieString(document.cookie)[cName];
    const currentDate = Date();
    // Check only first 4 parts of the date (e.g. 'Tue Nov 08 2022')
    const dateToCheck = currentDate.split(' ', 4).join(' ');

    assert.ok(cookieValue.startsWith(dateToCheck), 'Cookie value has been set to current date');
    clearCookie(cName);
});

test('Set cookie with current ISO time value', (assert) => {
    const cName = '__test-cookie_current_iso_date';
    const cValue = '$currentISODate$';

    runScriptlet(name, [cName, cValue]);

    assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
    assert.strictEqual(document.cookie.includes(cName), true, 'Cookie name has been set');

    const cookieValue = parseCookieString(document.cookie)[cName];
    const currentIsoTime = new Date().toISOString();
    // Check only the date part of the ISO time (e.g. '2022-11-08')
    const isoTimeToCheck = currentIsoTime.split('T')[0];

    assert.ok(cookieValue.startsWith(isoTimeToCheck), 'Cookie value has been set to current ISO time');
    clearCookie(cName);
});

test('Set cookie with current time value as a part of the value', (assert) => {
    // https://github.com/AdguardTeam/Scriptlets/issues/573
    const cName = '__test-cookie_now_in_value';
    const cValue = '{"count":1,"firstTime":$now$}';

    runScriptlet(name, [cName, cValue]);

    assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
    assert.strictEqual(document.cookie.includes(cName), true, 'Cookie name has been set');

    // Some time will pass between calling scriptlet
    // and qunit running assertion
    const tolerance = 125;
    const cookieValue = JSON.parse(parseCookieString(document.cookie)[cName]);

    assert.strictEqual(cookieValue.count, 1, 'Other parts of the value have not been modified');
    assert.ok(Date.now() - cookieValue.firstTime < tolerance, 'Keyword has been replaced with current time');
    clearCookie(cName);
});

test('Set cookie with current time value as a part of the simple value', (assert) => {
    // https://github.com/AdguardTeam/Scriptlets/issues/573
    const cName = '__test-cookie_now_in_simple_value';
    const prefix = 'time_now:';
    const cValue = `${prefix}$now$`;

    runScriptlet(name, [cName, cValue]);

    assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
    assert.strictEqual(document.cookie.includes(cName), true, 'Cookie name has been set');

    // Some time will pass between calling scriptlet
    // and qunit running assertion
    const tolerance = 125;
    const cookieValue = parseCookieString(document.cookie)[cName];

    assert.ok(cookieValue.startsWith(prefix), 'Other parts of the value have not been modified');

    const timeValue = cookieValue.slice(prefix.length);
    assert.ok(/^\d+$/.test(timeValue), 'Keyword has been replaced with time in ms');
    assert.ok(Date.now() - timeValue < tolerance, 'Keyword has been replaced with current time');
    clearCookie(cName);
});

test('Set cookie with current time value surrounded by the text', (assert) => {
    // https://github.com/AdguardTeam/Scriptlets/issues/573
    const cName = '__test-cookie_now_surrounded_by_text';
    const prefix = 'accepted at ';
    const postfix = ' ms';
    const cValue = `${prefix}$now$${postfix}`;

    runScriptlet(name, [cName, cValue]);

    assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');

    const tolerance = 125;
    const cookieValue = parseCookieString(document.cookie)[cName];

    assert.ok(cookieValue.startsWith(prefix), 'Text before the keyword has not been modified');
    assert.ok(cookieValue.endsWith(postfix), 'Text after the keyword has not been modified');

    const timeValue = cookieValue.slice(prefix.length, -postfix.length);
    assert.ok(Date.now() - timeValue < tolerance, 'Keyword has been replaced with current time');
    clearCookie(cName);
});

test('Set cookie with current date value as a part of the simple value', (assert) => {
    // https://github.com/AdguardTeam/Scriptlets/issues/573
    const cName = '__test-cookie_current_date_in_simple_value';
    const prefix = 'date:';
    const cValue = `${prefix}$currentDate$`;

    runScriptlet(name, [cName, cValue]);

    assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');

    const cookieValue = parseCookieString(document.cookie)[cName];
    assert.ok(cookieValue.startsWith(prefix), 'Other parts of the value have not been modified');

    const dateValue = cookieValue.slice(prefix.length);
    // Check only first 4 parts of the date (e.g. 'Tue Nov 08 2022')
    const dateToCheck = Date().split(' ', 4).join(' ');
    assert.ok(dateValue.startsWith(dateToCheck), 'Keyword has been replaced with current date');
    clearCookie(cName);
});

test('Set cookie with the same keyword used more than once', (assert) => {
    // https://github.com/AdguardTeam/Scriptlets/issues/573
    const cName = '__test-cookie_same_keyword_twice';
    const cValue = '$now$-$now$';

    runScriptlet(name, [cName, cValue]);

    assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');

    const tolerance = 125;
    const cookieValue = parseCookieString(document.cookie)[cName];
    const [firstTime, secondTime] = cookieValue.split('-');

    assert.ok(/^\d+$/.test(firstTime), 'First keyword has been replaced with time in ms');
    assert.strictEqual(firstTime, secondTime, 'Both keywords have been replaced with the same time');
    assert.ok(Date.now() - firstTime < tolerance, 'Keywords have been replaced with current time');
    clearCookie(cName);
});

test('Set cookie with keyword-like values which are not modified', (assert) => {
    // https://github.com/AdguardTeam/Scriptlets/issues/573
    const notKeywords = [
        '$now',
        'now$',
        '$NOW$',
        '$now2$',
        '$current-date$',
        '$$',
    ];

    notKeywords.forEach((cValue, index) => {
        const cName = `__test-cookie_not_keyword_${index}`;

        runScriptlet(name, [cName, cValue]);

        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(
            parseCookieString(document.cookie)[cName],
            cValue,
            `Value '${cValue}' has not been modified`,
        );
        clearCookie(cName);
    });
});

test('Set cookie with multiple keywords as a part of the value', (assert) => {
    // https://github.com/AdguardTeam/Scriptlets/issues/573
    const cName = '__test-cookie_multiple_keywords_in_value';
    const cValue = '{"count":1,"firstTime":$now$,"date":"$currentISODate$"}';

    runScriptlet(name, [cName, cValue]);

    assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
    assert.strictEqual(document.cookie.includes(cName), true, 'Cookie name has been set');

    const tolerance = 125;
    const cookieValue = JSON.parse(parseCookieString(document.cookie)[cName]);

    assert.strictEqual(cookieValue.count, 1, 'Other parts of the value have not been modified');
    assert.ok(
        Date.now() - cookieValue.firstTime < tolerance,
        '$now$ keyword has been replaced with current time',
    );
    assert.ok(
        Date.now() - new Date(cookieValue.date).getTime() < tolerance,
        '$currentISODate$ keyword has been replaced with current ISO date',
    );
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
        // It looks like Chrome is caching `document.cookie` and value is not updated,
        // so as a workaround we remove dummy cookie to force update of `document.cookie`
        clearCookie('dummyCookie');
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
