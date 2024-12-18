import { test, expect } from 'vitest';

import { matchStackTrace } from '../../src/helpers';

test('matchStackTrace() for working with getNativeRegexpTest() helper', async () => {
    expect(matchStackTrace('vitest', new Error().stack)).toBeTruthy();
    expect(matchStackTrace('not_present', new Error().stack)).toBeFalsy();
});
