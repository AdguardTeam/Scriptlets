/* eslint-disable no-console */

import { logMessage } from '../../src/helpers';

const nativeConsole = console.log;

const RULE_TEXT = 'example.org#%#//scriptlet(\'set-cookie\', \'name\', \'value\')';
const SCRIPTLET_NAME = 'set-cookie';
const MESSAGE = 'arbitrary text message';

describe('Test logMessage', () => {
    afterEach(() => {
        console.log = nativeConsole;
    });

    test('Logs message conditionally', async () => {
        console.log = jest.fn();

        let forced;
        let source;

        // Log forced message
        forced = true;
        source = {
            name: SCRIPTLET_NAME,
            ruleText: RULE_TEXT,
            verbose: false,
        };
        logMessage(source, MESSAGE, forced);
        expect(console.log.mock.calls[0][0].includes(`${SCRIPTLET_NAME}: ${MESSAGE}`)).toBeTruthy();

        // Log message on verbose
        forced = false;
        source = {
            name: SCRIPTLET_NAME,
            ruleText: RULE_TEXT,
            verbose: true,
        };
        logMessage(source, MESSAGE, forced);
        expect(console.log.mock.calls[0][0].includes(`${SCRIPTLET_NAME}: ${MESSAGE}`)).toBeTruthy();

        // Message should not be logged this time,
        // so after the first call, there should be 2 calls in total
        forced = false;
        source = {
            name: SCRIPTLET_NAME,
            ruleText: RULE_TEXT,
            verbose: false,
        };
        logMessage(source, MESSAGE, forced);

        expect(console.log).toHaveBeenCalledTimes(2);
    });

    test('Logs message without ruleText', async () => {
        console.log = jest.fn();

        const FORCED = true;
        const source = {
            name: SCRIPTLET_NAME,
            verbose: false,
        };
        logMessage(source, MESSAGE, FORCED);

        expect(console.log.mock.calls[0][0].includes(`${SCRIPTLET_NAME}: ${MESSAGE}`)).toBeTruthy();
        expect(console.log).toHaveBeenCalledTimes(1);
    });
});
