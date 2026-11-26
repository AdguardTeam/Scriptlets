import {
    afterEach,
    describe,
    expect,
    test,
    vi,
} from 'vitest';

import { randomUuid } from '../../src/helpers/random-id';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('randomUuid', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test('returns the UUID of crypto.randomUUID() if it is available', () => {
        const randomUUID = vi.fn(() => '3b241101-e2bb-4255-8caf-4136c566a962');
        vi.stubGlobal('crypto', { randomUUID });
        expect(randomUuid()).toBe('3b241101-e2bb-4255-8caf-4136c566a962');
        expect(randomUUID).toHaveBeenCalledTimes(1);
    });

    test('returns a UUID of the bytes of crypto.getRandomValues() without crypto.randomUUID()', () => {
        const getRandomValues = vi.fn((bytes: Uint8Array) => bytes.fill(0xff));
        vi.stubGlobal('crypto', { getRandomValues });
        // version `4` and variant `b`, i.e. `10` in the highest bits, are set in the random bytes
        expect(randomUuid()).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
        getRandomValues.mockImplementation((bytes: Uint8Array) => bytes.fill(0));
        expect(randomUuid()).toBe('00000000-0000-4000-8000-000000000000');
        expect(getRandomValues).toHaveBeenCalledTimes(2);
    });

    test.each([
        ['without crypto', undefined],
        ['if crypto.getRandomValues() throws', {
            getRandomValues: () => {
                throw new Error('replaced by the page');
            },
        }],
        ['with crypto without randomUUID() and getRandomValues()', {}],
        ['if crypto.randomUUID() throws', {
            randomUUID: () => {
                throw new Error('replaced by the page');
            },
        }],
    ])('returns a random UUID of version 4 of Math.random() %s', (title, crypto) => {
        vi.stubGlobal('crypto', crypto);
        const ids = Array.from({ length: 200 }, () => randomUuid());
        ids.forEach((id) => expect(id).toMatch(UUID_V4));
        expect(new Set(ids).size).toBe(ids.length);
        // the variant digit takes all of its four values
        expect(new Set(ids.map((id) => id[19])).size).toBe(4);
    });
});
