/* eslint-disable no-underscore-dangle, no-console */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'prevent-navigation';

const nativeConsoleLog = window.console.log;

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
    window.console.log = nativeConsoleLog;
};

module(name, { beforeEach, afterEach });

const isSupported = typeof navigation !== 'undefined';

if (!isSupported) {
    test('unsupported', (assert) => {
        assert.ok(true, 'Browser does not support it');
    });
} else {
    test('Prevent website reload', (assert) => {
        const url = 'location.href';

        const scriptletArgs = [url];
        runScriptlet(name, scriptletArgs);

        window.location.reload();

        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    });

    test('Prevent navigation to "advert" URL', (assert) => {
        const url = 'advert';

        const scriptletArgs = [url];
        runScriptlet(name, scriptletArgs);

        window.location.href = '/advert';

        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    });

    test('Prevent navigation - regex', (assert) => {
        const url = '/adblock.*enabled/';

        const scriptletArgs = [url];
        runScriptlet(name, scriptletArgs);

        window.location.href = '/adblock-test-foo-bar-enabled';

        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    });

    test('Prevent navigation - URL does not match', (assert) => {
        const url = 'SHOULD_NOT_MATCH';
        const redirectUrl = '/test-foo';

        const scriptletArgs = [url];
        runScriptlet(name, scriptletArgs);

        // Prevent navigation to "redirectUrl", if it's not blocked by the scriptlet
        // When it's blocked by the scriptlet, the test will fail as "hit" will be set to "FIRED"
        window.navigation.addEventListener('navigate', (event) => {
            const { url } = event.destination;
            if (url.includes(redirectUrl)) {
                event.preventDefault();
            }
        });

        window.location.href = redirectUrl;

        assert.strictEqual(window.hit, undefined, 'hit should NOT fire');
    });

    test('Log navigation URL to console', (assert) => {
        assert.expect(2);
        const redirectUrl = '/log-navigation-test';
        const expectedMessage = 'log-navigation-test';
        let testPassed = false;

        runScriptlet(name);

        // Need to prevent navigation to "redirectUrl", because it's not blocked by the scriptlet
        window.navigation.addEventListener('navigate', (event) => {
            const { url } = event.destination;
            if (url.includes(redirectUrl)) {
                event.preventDefault();
            }
        });

        // Override "console.log" to check if the log contains the expected messages
        const wrapperLog = (target, thisArg, args) => {
            const logContent = args[0];
            if (logContent.includes(expectedMessage)) {
                testPassed = true;
            }
            return Reflect.apply(target, thisArg, args);
        };
        const handlerLog = {
            apply: wrapperLog,
        };
        window.console.log = new Proxy(window.console.log, handlerLog);

        window.location.href = redirectUrl;

        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        assert.ok(testPassed, 'log should contain the expected message');
    });
}
