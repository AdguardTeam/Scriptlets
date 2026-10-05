import {
    afterEach,
    describe,
    test,
    expect,
    vi,
} from 'vitest';

import { isValidSelector } from '../../src/helpers';

describe('isValidSelector', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    test.each([
        'div',
        '#id',
        '.class',
        'a[href*="example.org"]',
        'div > p:not(.ad), span + i',
    ])('valid selector: %s', (selector) => {
        expect(isValidSelector(selector)).toBe(true);
    });

    test.each([
        '',
        '..class',
        '.1class',
        'div[',
        'div >',
        '[1a]',
    ])('invalid selector: "%s"', (selector) => {
        expect(isValidSelector(selector)).toBe(false);
    });

    test('does not query the page DOM', () => {
        const querySelectorSpy = vi.spyOn(document, 'querySelector');
        const querySelectorAllSpy = vi.spyOn(document, 'querySelectorAll');

        isValidSelector('div');

        expect(querySelectorSpy).not.toHaveBeenCalled();
        expect(querySelectorAllSpy).not.toHaveBeenCalled();
    });
});
