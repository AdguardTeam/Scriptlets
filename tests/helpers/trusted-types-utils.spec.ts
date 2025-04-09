import {
    afterEach,
    beforeEach,
    describe,
    expect,
    test,
    vi,
} from 'vitest';

import { getTrustedTypesApi, type PolicyApi } from '../../src/helpers/trusted-types-utils';

const EXPECTED_POLICY_NAME = 'AGPolicy';

describe('Test Trusted Types Utils', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    test('api provided', () => {
        const mockSource = {
            api: {
                policy: {
                    name: 'AGPolicy',
                },
            },
        };
        // @ts-expect-error - mockSource is not a valid Source type
        const policy = getTrustedTypesApi(mockSource);

        expect(policy).toBe(mockSource.api.policy);
    });

    describe('api not provided - trusted types not supported', () => {
        let policy: PolicyApi;
        const testHtml = '<div>test not supported</div>';
        const testScript = 'console.log("test not supported")';
        const testScriptUrl = 'https://example.com/test-not-supported.js';

        beforeEach(() => {
            vi.stubGlobal('trustedTypes', undefined);
            policy = getTrustedTypesApi();
        });

        test('fields are correctly set', () => {
            expect(policy).toBeDefined();
            expect(policy.name).toBe(EXPECTED_POLICY_NAME);
            expect(policy.isSupported).toBe(false);
            expect(policy.TrustedType.HTML).toBe('TrustedHTML');
            expect(policy.TrustedType.Script).toBe('TrustedScript');
            expect(policy.TrustedType.ScriptURL).toBe('TrustedScriptURL');
        });

        test('"create" methods should return input as-is', () => {
            expect(policy.createHTML(testHtml)).toBe(testHtml);
            expect(policy.createScript(testScript)).toBe(testScript);
            expect(policy.createScriptURL(testScriptUrl)).toBe(testScriptUrl);

            expect(policy.create(policy.TrustedType.HTML, testHtml)).toBe(testHtml);
            expect(policy.create(policy.TrustedType.Script, testScript)).toBe(testScript);
            expect(policy.create(policy.TrustedType.ScriptURL, testScriptUrl)).toBe(testScriptUrl);

            // no matter on arguments passed, methods should return input as-is
            // @ts-expect-error
            expect(policy.create(undefined, testHtml)).toBe(testHtml);
        });

        test('"getType" methods should always return `null`', () => {
            expect(policy.getAttributeType('script', 'src')).toBe(null);
            expect(policy.getPropertyType('script', 'textContent')).toBe(null);

            // no matter on arguments passed, methods should return `null`
            // @ts-expect-error
            expect(policy.getPropertyType()).toBe(null);
            // @ts-expect-error
            expect(policy.getAttributeType()).toBe(null);
        });

        test('"convert" methods should return input as-is', () => {
            expect(policy.convertAttributeToTrusted('script', 'src', testScriptUrl)).toBe(testScriptUrl);
            expect(policy.convertPropertyToTrusted('script', 'textContent', testScript)).toBe(testScript);

            // no matter on arguments passed, methods should return input as-is
            // @ts-expect-error
            expect(policy.convertAttributeToTrusted(undefined, undefined, testScriptUrl)).toBe(testScriptUrl);
            // @ts-expect-error
            expect(policy.convertPropertyToTrusted(undefined, undefined, testScript)).toBe(testScript);
        });

        test('"is" methods should always return `false`', () => {
            expect(policy.isHTML(testHtml)).toBe(false);
            expect(policy.isScript(testScript)).toBe(false);
            expect(policy.isScriptURL(testScriptUrl)).toBe(false);

            // no matter on arguments passed, methods should return `false`
            // @ts-expect-error
            expect(policy.isHTML()).toBe(false);
            // @ts-expect-error
            expect(policy.isScript()).toBe(false);
            // @ts-expect-error
            expect(policy.isScriptURL()).toBe(false);
        });
    });

    describe('api not provided - trusted types supported', () => {
        let policy: PolicyApi;

        const testHtml = '<div>test supported</div>';
        const testMockPrefixHtml = 'mocked html: ';
        const testMockedHtml = `${testMockPrefixHtml}${testHtml}`;

        const testScript = 'console.log("test supported")';
        const testMockPrefixScript = 'mocked script: ';
        const testMockedScript = `${testMockPrefixScript}${testScript}`;

        const testScriptUrl = 'https://example.com/test-supported.js';
        const testMockPrefixScriptUrl = 'mocked script url: ';
        const testMockedScriptUrl = `${testMockPrefixScriptUrl}${testScriptUrl}`;

        const createPolicyMock = vi.fn((name: string, options: any) => ({
            name,
            createHTML: (input: string) => `${testMockPrefixHtml}${options.createHTML(input)}`,
            createScript: (input: string) => `${testMockPrefixScript}${options.createScript(input)}`,
            createScriptURL: (input: string) => `${testMockPrefixScriptUrl}${options.createScriptURL(input)}`,
        }));
        const getAttributeTypeMock = vi.fn(() => null as string | null);
        const getPropertyTypeMock = vi.fn(() => null as string | null);
        const isHTMLMock = vi.fn((value: unknown) => {
            if (typeof value !== 'string') {
                return false;
            }
            return value.startsWith(testMockPrefixHtml);
        });
        const isScriptMock = vi.fn((value: unknown) => {
            if (typeof value !== 'string') {
                return false;
            }
            return value.startsWith(testMockPrefixScript);
        });
        const isScriptURLMock = vi.fn((value: unknown) => {
            if (typeof value !== 'string') {
                return false;
            }
            return value.startsWith(testMockPrefixScriptUrl);
        });

        beforeEach(() => {
            vi.stubGlobal('trustedTypes', {
                createPolicy: createPolicyMock,
                getAttributeType: getAttributeTypeMock,
                getPropertyType: getPropertyTypeMock,
                isHTML: isHTMLMock,
                isScript: isScriptMock,
                isScriptURL: isScriptURLMock,
            });
            policy = getTrustedTypesApi();
        });

        test('fields are correctly set', () => {
            expect(policy).toBeDefined();
            expect(policy.name).toBe(EXPECTED_POLICY_NAME);
            expect(policy.isSupported).toBe(true);
            expect(policy.TrustedType.HTML).toBe('TrustedHTML');
            expect(policy.TrustedType.Script).toBe('TrustedScript');
            expect(policy.TrustedType.ScriptURL).toBe('TrustedScriptURL');
        });

        test('"create" methods should work properly', () => {
            expect(createPolicyMock).toHaveBeenCalledTimes(1);

            expect(policy.createHTML(testHtml)).toBe(testMockedHtml);
            expect(policy.createScript(testScript)).toBe(testMockedScript);
            expect(policy.createScriptURL(testScriptUrl)).toBe(testMockedScriptUrl);

            expect(policy.create(policy.TrustedType.HTML, testHtml)).toBe(testMockedHtml);
            expect(policy.create(policy.TrustedType.Script, testScript)).toBe(testMockedScript);
            expect(policy.create(policy.TrustedType.ScriptURL, testScriptUrl)).toBe(testMockedScriptUrl);
        });

        test('"getType" methods should work properly', () => {
            getAttributeTypeMock.mockReturnValue('TrustedScriptURL');
            expect(policy.getAttributeType('script', 'src')).toBe('TrustedScriptURL');
            expect(getAttributeTypeMock).toHaveBeenCalledWith('script', 'src');
            expect(getAttributeTypeMock).toHaveBeenCalledTimes(1);

            getPropertyTypeMock.mockReturnValue('TrustedHTML');
            expect(policy.getPropertyType('div', 'textContent')).toBe('TrustedHTML');
            expect(getPropertyTypeMock).toHaveBeenCalledWith('div', 'textContent');
            expect(getPropertyTypeMock).toHaveBeenCalledTimes(1);
        });

        test('"convert" methods should work properly', () => {
            getAttributeTypeMock.mockReturnValue('TrustedScriptURL');
            expect(policy.convertAttributeToTrusted('script', 'src', testScriptUrl)).toBe(testMockedScriptUrl);
            expect(getAttributeTypeMock).toHaveBeenCalledWith('script', 'src', undefined, undefined);
            expect(getAttributeTypeMock).toHaveBeenCalledTimes(1);

            getPropertyTypeMock.mockReturnValue('TrustedHTML');
            expect(policy.convertPropertyToTrusted('div', 'textContent', testHtml)).toBe(testMockedHtml);
            expect(getPropertyTypeMock).toHaveBeenCalledWith('div', 'textContent', undefined);
            expect(getPropertyTypeMock).toHaveBeenCalledTimes(1);
        });

        test('"is" methods should work properly', () => {
            expect(policy.isHTML(testHtml)).toBe(false);
            expect(policy.isHTML(testMockedHtml)).toBe(true);
            expect(isHTMLMock).toHaveBeenCalledTimes(2);

            expect(policy.isScript(testScript)).toBe(false);
            expect(policy.isScript(testMockedScript)).toBe(true);
            expect(isScriptMock).toHaveBeenCalledTimes(2);

            expect(policy.isScriptURL(testScriptUrl)).toBe(false);
            expect(policy.isScriptURL(testMockedScriptUrl)).toBe(true);
            expect(isScriptURLMock).toHaveBeenCalledTimes(2);
        });
    });
});
