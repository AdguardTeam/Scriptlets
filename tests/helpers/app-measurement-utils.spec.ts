import { describe, expect, test } from 'vitest';

import { appMeasurementUnescape, getAppMeasurementQueryParam } from '../../src/helpers/app-measurement-utils';

describe('appMeasurementUnescape', () => {
    test.each([
        ['', ''],
        ['a+b', 'a b'],
        ['%20%2B', ' +'],
        ['%E2%82%AC', '€'],
        // malformed UTF-8: the legacy unescape(), as AppMeasurement
        ['%E2%82', 'â\u0082'],
    ])('%j → %j', (value, expected) => {
        expect(appMeasurementUnescape(value)).toBe(expected);
    });
});

describe('getAppMeasurementQueryParam', () => {
    // Expected values are the results of `Util.getQueryParam()` of the real AppMeasurement 2.22.1
    // for the same arguments.
    test.each([
        [['a', 'https://x.org/p?a=1&b=2'], '1'],
        [['b', 'https://x.org/p?a=1&b=2'], '2'],
        [['c', 'https://x.org/p?a=1&b=2'], ''],
        [['a', 'https://x.org/p'], ''],
        [['a', 'https://x.org/p?a='], ''],
        [['a', 'https://x.org/p?a'], ''],
        [['a', 'https://x.org/p?a', '&', true], undefined],
        [['a', 'https://x.org/p?a=', '&', true], undefined],
        [['a', 'https://x.org/p?a=1', '&', true], '1'],
        [['a', 'https://x.org/p?a=1#h'], '1'],
        [['a', 'https://x.org/p?b=2#a=3'], ''],
        [['a', 'https://x.org/p#x?a=1'], '1'],
        [['a', 'https://x.org/p?a=x+y%20z'], 'x y z'],
        [['a', 'https://x.org/p?a=%E2%82%AC'], '€'],
        [['a', 'https://x.org/p?a=%E2%82'], 'â\u0082'],
        [['a', 'https://x.org/p?xa=1&a=2'], '2'],
        [['a', 'https://x.org/p?A=1'], ''],
        [['a', 'https://x.org/p?a=1&a=2'], '1'],
        [['a', 'https://x.org/p?b=1;a=2', ';'], '2'],
        [['a', 'https://x.org/p?a=1;b=2', ';'], '1'],
        [['a', 'p?a=5'], '5'],
        [['a', '?a=6'], '6'],
        [['a', 'a=7'], ''],
        [['', 'https://x.org/p?a=1'], ''],
        [['a', ''], ''],
        [['a', 'https://x.org/p?a=1&&b'], '1'],
        [['a', 'https://x.org/p??a=1'], ''],
        [['a', 'https://x.org/p?a==1'], '=1'],
    ])('%j → %j', (args, expected) => {
        // eslint-disable-next-line prefer-spread
        expect(getAppMeasurementQueryParam.apply(null, args as Parameters<typeof getAppMeasurementQueryParam>))
            .toBe(expected);
    });

    test('non-string arguments are converted as by the real one', () => {
        expect(getAppMeasurementQueryParam('n', { toString: () => 'https://x.org/?n=3' })).toBe('3');
        expect(getAppMeasurementQueryParam(null, 'https://x.org/?n=3')).toBe('');
        expect(getAppMeasurementQueryParam('n', undefined)).toBe('');
    });
});
