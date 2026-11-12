import { describe, test, expect } from 'vitest';

import { parseUboOptions } from '../../src/helpers/ubo-utils';

describe('parseUboOptions', () => {
    test.each([
        { args: [], expected: {} },
        { args: ['reload', '1'], expected: { reload: 1 } },
        { args: ['reload', '0'], expected: { reload: 0 } },
        { args: ['domain', '.example.org', 'reload', '1'], expected: { domain: '.example.org', reload: 1 } },
        // only digits are converted to numbers
        { args: ['domain', '/^www/', 'reload', '1s'], expected: { domain: '/^www/', reload: '1s' } },
        // key without a value
        { args: ['reload'], expected: {} },
        { args: ['reload', '1', 'domain'], expected: { reload: 1 } },
        // empty key
        { args: ['', '1'], expected: {} },
        // later value wins
        { args: ['reload', '1', 'reload', '0'], expected: { reload: 0 } },
    ])('$args', ({ args, expected }) => {
        expect({ ...parseUboOptions(args) }).toEqual(expected);
    });

    test('key cannot change the prototype', () => {
        const options = parseUboOptions(['__proto__', 'polluted']);
        expect(Object.getPrototypeOf(options)).toBe(null);
        expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });
});
