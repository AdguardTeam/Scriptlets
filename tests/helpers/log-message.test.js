/* eslint-disable no-console */
import {
    logMessage,
} from '../../src/helpers';

const { test, module } = QUnit;
const name = 'scriptlets-redirects helpers';
const nativeConsole = console.log;

const afterEach = () => {
    console.log = nativeConsole;
};

module(name, { afterEach });

const RULE_TEXT = 'example.org#%#//scriptlet(\'set-cookie\', \'name\', \'value\')';
const SCRIPTLET_NAME = 'set-cookie';
const MESSAGE = 'arbitrary text message';

test('Logs message conditionally', async (assert) => {
    // eslint-disable-next-line no-console
    console.log = function log(input) {
        if (input.includes('trace')) {
            return;
        }
        assert.strictEqual(
            input,
            `${SCRIPTLET_NAME}: ${MESSAGE}`,
            'message logged correctly',
        );
    };

    assert.expect(2);

    // Log forced message
    let forced = true;
    let source = {
        name: SCRIPTLET_NAME,
        ruleText: RULE_TEXT,
        verbose: false,
    };
    logMessage(source, MESSAGE, forced);

    // Log message on verbose
    forced = false;
    source = {
        name: SCRIPTLET_NAME,
        ruleText: RULE_TEXT,
        verbose: true,
    };
    logMessage(source, MESSAGE, forced);

    // Message should not be logged this time, thus expected 2 asserts
    forced = false;
    source = {
        name: SCRIPTLET_NAME,
        ruleText: RULE_TEXT,
        verbose: false,
    };
    logMessage(source, MESSAGE, forced);
});

test('Logs message without ruleText', async (assert) => {
    // eslint-disable-next-line no-console
    console.log = function log(input) {
        if (input.includes('trace')) {
            return;
        }
        assert.strictEqual(
            input,
            `${SCRIPTLET_NAME}: ${MESSAGE}`,
            'message logged correctly',
        );
    };

    const FORCED = true;
    const source = {
        name: SCRIPTLET_NAME,
        verbose: false,
    };
    logMessage(source, MESSAGE, FORCED);
});
