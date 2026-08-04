/* eslint-disable no-underscore-dangle */
import {
    beforeEach,
    afterEach,
    describe,
    test,
    expect,
    vi,
} from 'vitest';

import { trustedJsonSetFetchResponse } from '../../src/scriptlets/trusted-json-set-fetch-response';
import { clearGlobalProps } from '../helpers';

const nativeFetch = window.fetch;

// Time of the scriptlet run, i.e. when 'fetch' is intercepted
const SCRIPTLET_RUN_TIME = '2026-07-28T12:00:00.000Z';
// Time of the first intercepted response, 10 minutes after the scriptlet run
const FIRST_RESPONSE_TIME = '2026-07-28T12:10:00.000Z';
// Time of the second intercepted response, 20 minutes after the scriptlet run
const SECOND_RESPONSE_TIME = '2026-07-28T12:20:00.000Z';

const TEST_URL = 'https://example.org/api';

const sourceParams = {
    name: 'trusted-json-set-fetch-response',
    verbose: true,
};

beforeEach(() => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
    // Mocking console.trace() because it causes noisy output in tests
    window.console.trace = vi.fn();

    window.fetch = vi.fn(() => Promise.resolve(new Response(
        JSON.stringify({ data: { time: 0 } }),
        { headers: { 'Content-Type': 'application/json' } },
    )));

    // Only Date is faked, so promises and streams of the intercepted response are not affected
    vi.useFakeTimers({ toFake: ['Date'] });
});

afterEach(() => {
    vi.useRealTimers();
    window.fetch = nativeFetch;
    clearGlobalProps('hit', '__debug');
});

/**
 * Fetches the test url at the given time and returns the modified response content.
 *
 * @param {string} time ISO time to set as the current one
 * @returns {Promise<object>} parsed content of the intercepted response
 */
const fetchAt = async (time) => {
    vi.setSystemTime(new Date(time));
    const response = await fetch(TEST_URL);
    return response.json();
};

// https://github.com/AdguardTeam/Scriptlets/issues/573
describe('Test trusted-json-set-fetch-response time keywords are not frozen', () => {
    test('legacy mode resolves $now$ on every intercepted response', async () => {
        vi.setSystemTime(new Date(SCRIPTLET_RUN_TIME));
        trustedJsonSetFetchResponse(sourceParams, 'data.time', '$now$');

        const firstContent = await fetchAt(FIRST_RESPONSE_TIME);
        const secondContent = await fetchAt(SECOND_RESPONSE_TIME);

        // Time of the response is set, not the time of the scriptlet run
        expect(firstContent.data.time).toBe(Date.parse(FIRST_RESPONSE_TIME));
        expect(secondContent.data.time).toBe(Date.parse(SECOND_RESPONSE_TIME));
    });

    test('jsonpath mode resolves $now$ on every intercepted response', async () => {
        vi.setSystemTime(new Date(SCRIPTLET_RUN_TIME));
        trustedJsonSetFetchResponse(sourceParams, '$.data.time', '$now$');

        const firstContent = await fetchAt(FIRST_RESPONSE_TIME);
        const secondContent = await fetchAt(SECOND_RESPONSE_TIME);

        expect(firstContent.data.time).toBe(Date.parse(FIRST_RESPONSE_TIME));
        expect(secondContent.data.time).toBe(Date.parse(SECOND_RESPONSE_TIME));
    });

    test('legacy mode resolves keywords inside json: value on every intercepted response', async () => {
        vi.setSystemTime(new Date(SCRIPTLET_RUN_TIME));
        trustedJsonSetFetchResponse(sourceParams, 'data', 'json:{"count":1,"firstTime":$now$}');

        const firstContent = await fetchAt(FIRST_RESPONSE_TIME);
        const secondContent = await fetchAt(SECOND_RESPONSE_TIME);

        expect(firstContent.data.count).toBe(1);
        expect(firstContent.data.firstTime).toBe(Date.parse(FIRST_RESPONSE_TIME));
        expect(secondContent.data.firstTime).toBe(Date.parse(SECOND_RESPONSE_TIME));
    });

    test('legacy mode sets the same value for a value without keywords', async () => {
        vi.setSystemTime(new Date(SCRIPTLET_RUN_TIME));
        trustedJsonSetFetchResponse(sourceParams, 'data.time', '42');

        const firstContent = await fetchAt(FIRST_RESPONSE_TIME);
        const secondContent = await fetchAt(SECOND_RESPONSE_TIME);

        expect(firstContent.data.time).toBe(42);
        expect(secondContent.data.time).toBe(42);
    });
});
