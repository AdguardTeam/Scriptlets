import { describe, expect, it } from 'vitest';

import { convertTsFileNameToJs } from '../../scripts/helpers';

describe('redirect build', () => {
    it('converts TypeScript redirect source filename to .js extension', () => {
        expect(convertTsFileNameToJs('google-ima3-dai.ts')).toBe('google-ima3-dai.js');
    });

    it('leaves JavaScript redirect filenames unchanged', () => {
        expect(convertTsFileNameToJs('google-ima3.js')).toBe('google-ima3.js');
    });

    it('leaves filenames without a recognized extension unchanged', () => {
        expect(convertTsFileNameToJs('nooptext.txt')).toBe('nooptext.txt');
    });
});
