import { describe, test, expect } from 'vitest';

import { matchStackTrace, addStackTraceMessageLine } from '../../src/helpers';

test('matchStackTrace() for working with getNativeRegexpTest() helper', async () => {
    expect(matchStackTrace('vitest', new Error().stack)).toBeTruthy();
    expect(matchStackTrace('not_present', new Error().stack)).toBeFalsy();
});

describe('addStackTraceMessageLine()', () => {
    // Stack traces of an error created by the wrapper of the intercepted method,
    // which is called by the 'loadAdsConfig' function of the page
    const CHROME_STACK_TRACE = [
        'Error',
        '    at Object.objectWrapper [as apply] (https://example.org/scriptlet.js:10:20)',
        '    at loadAdsConfig (https://example.org/app.js:5:10)',
        '    at https://example.org/app.js:8:1',
    ].join('\n');
    const FIREFOX_STACK_TRACE = [
        'objectWrapper@https://example.org/scriptlet.js:10:20',
        'loadAdsConfig@https://example.org/app.js:5:10',
        '@https://example.org/app.js:8:1',
    ].join('\n');
    const SAFARI_STACK_TRACE = [
        'objectWrapper@https://example.org/scriptlet.js:10:20',
        'loadAdsConfig@https://example.org/app.js:5:10',
        'global code@https://example.org/app.js:8:1',
    ].join('\n');

    test('keeps stack trace with the error message line unchanged', () => {
        expect(addStackTraceMessageLine(CHROME_STACK_TRACE)).toBe(CHROME_STACK_TRACE);
    });

    test.each([
        { browser: 'Firefox', stackTrace: FIREFOX_STACK_TRACE },
        { browser: 'Safari', stackTrace: SAFARI_STACK_TRACE },
    ])('adds the error message line to $browser stack trace', ({ stackTrace }) => {
        expect(addStackTraceMessageLine(stackTrace)).toBe(`Error\n${stackTrace}`);
    });

    test('adds the error message line to an empty stack trace', () => {
        expect(addStackTraceMessageLine('')).toBe('Error\n');
        expect(matchStackTrace('loadAdsConfig', addStackTraceMessageLine(''))).toBe(false);
    });

    test.each([
        { browser: 'Chrome', stackTrace: CHROME_STACK_TRACE },
        { browser: 'Firefox', stackTrace: FIREFOX_STACK_TRACE },
        { browser: 'Safari', stackTrace: SAFARI_STACK_TRACE },
    ])('lets matchStackTrace() match the caller of the wrapper in $browser', ({ stackTrace }) => {
        const normalizedStackTrace = addStackTraceMessageLine(stackTrace);

        expect(matchStackTrace('loadAdsConfig', normalizedStackTrace)).toBe(true);
        expect(matchStackTrace('app.js:5', normalizedStackTrace)).toBe(true);
        // Frame of the wrapper itself is still removed
        expect(matchStackTrace('objectWrapper', normalizedStackTrace)).toBe(false);
    });

    test('is needed for matchStackTrace() to match the caller of the wrapper in Firefox', () => {
        expect(matchStackTrace('loadAdsConfig', FIREFOX_STACK_TRACE)).toBe(false);
    });

    test('does not change RegExp static properties of the page', () => {
        /(page-match)/.exec('page-match');

        addStackTraceMessageLine(FIREFOX_STACK_TRACE);
        addStackTraceMessageLine(CHROME_STACK_TRACE);

        expect(RegExp.$1).toBe('page-match');
    });
});
