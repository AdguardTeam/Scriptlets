import { describe, test, expect } from 'vitest';

import { doesElementContainText } from '../../src/helpers';

describe('doesElementContainText', () => {
    test.each([
        { name: 'g flag', matchRegexp: /Reject/g },
        { name: 'y flag', matchRegexp: /Reject/y },
    ])('regexp with $name matches the same text each time', ({ matchRegexp }) => {
        const element = document.createElement('button');
        element.textContent = 'Reject';

        expect(doesElementContainText(element, matchRegexp)).toBe(true);
        expect(doesElementContainText(element, matchRegexp)).toBe(true);
    });

    test('regexp with g flag matches shorter text after longer one', () => {
        const matchRegexp = /Reject/g;
        const longer = document.createElement('button');
        longer.textContent = 'Reject Reject';
        const shorter = document.createElement('button');
        shorter.textContent = 'Reject';

        expect(doesElementContainText(longer, matchRegexp)).toBe(true);
        expect(doesElementContainText(longer, matchRegexp)).toBe(true);
        expect(doesElementContainText(shorter, matchRegexp)).toBe(true);
    });

    test('element without text does not match', () => {
        expect(doesElementContainText(document.createElement('button'), /.*/)).toBe(false);
    });
});
