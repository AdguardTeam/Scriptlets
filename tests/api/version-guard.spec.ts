import { describe, expect, it } from 'vitest';

import {
    deriveDevVersion,
    getBuildVersion,
    getRedirectsYmlVersion,
    resolveBuildVersion,
    verifyBuiltVersions,
} from '../../scripts/helpers';

const banner = (version: string): string => `#
#    AdGuard Scriptlets (Redirects Source)
#    Version ${version}
#
`;

describe('version guard', () => {
    describe('getRedirectsYmlVersion', () => {
        it('extracts the version from the redirects.yml banner', () => {
            expect(getRedirectsYmlVersion(banner('2.5.0'))).toBe('2.5.0');
        });

        it('extracts a pre-release version', () => {
            expect(getRedirectsYmlVersion(banner('2.5.0-beta.1'))).toBe('2.5.0-beta.1');
        });

        it('returns undefined when the banner is missing', () => {
            expect(getRedirectsYmlVersion('- title: noop-v1\n')).toBeUndefined();
        });

        it('returns undefined for empty input', () => {
            expect(getRedirectsYmlVersion('')).toBeUndefined();
        });
    });

    describe('deriveDevVersion', () => {
        it('increments the latest released changelog patch and appends -dev', () => {
            const changelog = '## [Unreleased]\n\n## [2.4.3] - 2026-06-24\n';
            expect(deriveDevVersion(changelog)).toBe('2.4.4-dev');
        });

        it('uses the numeric core of a prerelease heading', () => {
            const changelog = '## [Unreleased]\n\n## [2.5.0-beta.1] - 2026-07-16\n';
            expect(deriveDevVersion(changelog)).toBe('2.5.1-dev');
        });

        it('throws when no released version can be parsed', () => {
            expect(() => deriveDevVersion('## [Unreleased]\n')).toThrow(
                'Unable to derive a development version from CHANGELOG.md',
            );
        });
    });

    describe('resolveBuildVersion', () => {
        const changelog = '## [Unreleased]\n\n## [2.4.3] - 2026-06-24\n';

        it('derives a dev version when package.json is versionless', () => {
            expect(resolveBuildVersion(undefined, changelog)).toBe('2.4.4-dev');
        });

        it('preserves workflow-stamped release and prerelease versions', () => {
            expect(resolveBuildVersion('2.5.0', changelog)).toBe('2.5.0');
            expect(resolveBuildVersion('2.5.0-beta.1', changelog)).toBe('2.5.0-beta.1');
            expect(resolveBuildVersion('2.4.4-dev', changelog)).toBe('2.4.4-dev');
        });

        it('throws on an invalid stamped version', () => {
            expect(() => resolveBuildVersion('2.4', changelog)).toThrow();
            expect(() => resolveBuildVersion('foo', changelog)).toThrow();
        });
    });

    describe('getBuildVersion', () => {
        it('derives the current repository dev version without a package stamp', () => {
            expect(getBuildVersion(undefined)).toBe('2.4.4-dev');
        });
    });

    describe('verifyBuiltVersions', () => {
        const corelibs = (version: string): string => JSON.stringify({
            version,
            scriptlets: [],
        });

        it('returns no errors when both artifacts match the stamped version', () => {
            expect(verifyBuiltVersions({
                version: '2.5.0',
                redirectsYml: banner('2.5.0'),
                corelibsScriptletsJson: corelibs('2.5.0'),
            })).toEqual([]);
        });

        it('reports a mismatched redirects.yml banner version (0.0.0 vs stamped)', () => {
            const errors = verifyBuiltVersions({
                version: '2.5.0',
                redirectsYml: banner('0.0.0'),
                corelibsScriptletsJson: corelibs('2.5.0'),
            });
            expect(errors).toHaveLength(1);
            expect(errors[0]).toContain('redirects.yml');
        });

        it('reports a missing redirects.yml banner version', () => {
            const errors = verifyBuiltVersions({
                version: '2.5.0',
                redirectsYml: '- title: noop-v1\n',
                corelibsScriptletsJson: corelibs('2.5.0'),
            });
            expect(errors).toHaveLength(1);
            expect(errors[0]).toContain('redirects.yml');
        });

        it('reports a mismatched scriptlets.corelibs.json version', () => {
            const errors = verifyBuiltVersions({
                version: '2.5.0',
                redirectsYml: banner('2.5.0'),
                corelibsScriptletsJson: corelibs('2.4.3'),
            });
            expect(errors).toHaveLength(1);
            expect(errors[0]).toContain('scriptlets.corelibs.json');
        });

        it('reports both mismatches', () => {
            const errors = verifyBuiltVersions({
                version: '2.5.0',
                redirectsYml: banner('2.4.3'),
                corelibsScriptletsJson: corelibs('2.4.3'),
            });
            expect(errors).toHaveLength(2);
        });

        it('reports a corelibs json that fails to parse', () => {
            const errors = verifyBuiltVersions({
                version: '2.5.0',
                redirectsYml: banner('2.5.0'),
                corelibsScriptletsJson: 'not json',
            });
            expect(errors).toHaveLength(1);
            expect(errors[0]).toContain('scriptlets.corelibs.json');
        });
    });
});
