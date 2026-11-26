import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vitest';

import { getDataFromFiles } from '../../scripts/helpers';
import {
    REDIRECTS_SRC_RELATIVE_DIR_PATH,
    SCRIPTLETS_SRC_RELATIVE_DIR_PATH,
    redirectsFilenames,
    scriptletsFilenames,
    trustedScriptletsFilenames,
} from '../../scripts/constants';

// `@added v1.2.3.` or `@added unknown.` before the release
const VERSION_ADDED_REGEXP = /^(v\d+\.\d+\.\d+|unknown)\.?$/;

describe('JSDoc comments of scriptlets and redirects for the wiki', () => {
    const lists: [string, string[], string][] = [
        ['scriptlets', scriptletsFilenames, SCRIPTLETS_SRC_RELATIVE_DIR_PATH],
        ['trusted scriptlets', trustedScriptletsFilenames, SCRIPTLETS_SRC_RELATIVE_DIR_PATH],
        ['redirects', redirectsFilenames, REDIRECTS_SRC_RELATIVE_DIR_PATH],
    ];

    it('start the description of each redirect with a sentence on its first line', () => {
        // the first line of the description is the `comment` of the redirect in `dist/redirects.yml`,
        // see `getComment()` in `scripts/build-redirects.js`
        const data = getDataFromFiles(redirectsFilenames, REDIRECTS_SRC_RELATIVE_DIR_PATH);
        data.forEach(({ name, description }) => {
            const firstLine = description.split('\n').find((line: string) => line !== '');
            expect(firstLine, `first line of @description of ${name}`).toMatch(/[.:]$/);
        });
    });

    it.each(lists)('are parsed for all %s', (title, filenames, relativeDirPath) => {
        expect(filenames.length).toBeGreaterThan(0);
        // the parser throws for a comment with other tags, e.g. made of a line which starts with `@`
        const data = getDataFromFiles(filenames, relativeDirPath);
        data.forEach(({ name, description, versionAdded }) => {
            expect(description, `@description of ${name}`).not.toBe('');
            expect(versionAdded, `@added of ${name}`).toMatch(VERSION_ADDED_REGEXP);
        });
    });

    describe('invalid comments', () => {
        let dir = '';

        afterEach(() => {
            fs.rmSync(dir, { recursive: true, force: true });
        });

        const parse = (comment: string) => {
            dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-comments-'));
            fs.writeFileSync(path.join(dir, 'test.ts'), `${comment}\nexport const test = 1;\n`);
            return () => getDataFromFiles(['test.ts'], dir);
        };

        it('reject a line of the description which starts with "@", e.g. an exception rule', () => {
            expect(parse([
                '/**',
                ' * @redirect test',
                ' *',
                ' * @description',
                ' * Test.',
                ' *',
                ' * ```adblock',
                ' * @@||example.org/test.js$xmlhttprequest',
                ' * ```',
                ' *',
                ' * @added unknown.',
                ' */',
            ].join('\n'))).toThrow('Unexpected tags for test');
        });

        it('accept the rule inside a line', () => {
            const data = parse([
                '/**',
                ' * @redirect test',
                ' *',
                ' * @description',
                ' * Test, allowed by the exception rule',
                ' * `@@||example.org/test.js$xmlhttprequest`.',
                ' *',
                ' * @added unknown.',
                ' */',
            ].join('\n'))();
            expect(data[0].description).toContain('`@@||example.org/test.js$xmlhttprequest`');
            expect(data[0].versionAdded).toBe('unknown.');
        });

        it('reject a comment without @added', () => {
            expect(parse([
                '/**',
                ' * @redirect test',
                ' *',
                ' * @description',
                ' * Test.',
                ' */',
            ].join('\n'))).toThrow('Unexpected tags for test');
        });
    });
});
