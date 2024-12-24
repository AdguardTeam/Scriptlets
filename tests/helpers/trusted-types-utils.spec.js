import {
    describe,
    test,
    expect,
    afterEach,
    vi,
} from 'vitest';

import {
    extractOrCreatePolicy,
    createTrustedHTML,
    createTrustedScript,
    createTrustedScriptURL,
} from '../../src/helpers';

const trustedTypesMock = {
    createPolicy: (name, options) => {
        return {
            name,
            createHTML: (input, ...args) => ({
                api: false,
                type: 'html',
                result: options.createHTML(input, ...args),
            }),
            createScript: (input, ...args) => ({
                api: false,
                type: 'script',
                result: options.createScript(input, ...args),
            }),
            createScriptURL: (input, ...args) => ({
                api: false,
                type: 'script-url',
                result: options.createScriptURL(input, ...args),
            }),
        };
    },
};

const mockSource = {
    api: {
        policyApi: {
            name: 'AGPolicy',
            isSupported: true,
            TrustedType: {
                HTML: 'TrustedHTML',
                Script: 'TrustedScript',
                ScriptURL: 'TrustedScriptURL',
            },
            createHTML: (input, ...args) => ({
                api: true,
                type: 'html',
                result: input,
                args: { ...args },
            }),
            createScript: (input, ...args) => ({
                api: true,
                type: 'script',
                result: input,
                args: { ...args },
            }),
            createScriptURL: (input, ...args) => ({
                api: true,
                type: 'script-url',
                result: input,
                args: { ...args },
            }),
            // TODO: Add more methods (create, getAttributeType, etc.) here as needed
        },
        shared: {},
    },
};

describe('extractOrCreatePolicy', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    test('api provided', () => {
        const policy = extractOrCreatePolicy(mockSource);

        expect(policy).toBe(mockSource.api.policyApi);
    });

    test('api not provided - trusted types supported', () => {
        vi.stubGlobal('trustedTypes', trustedTypesMock);

        const createPolicySpy = vi.spyOn(trustedTypesMock, 'createPolicy');
        const policy = extractOrCreatePolicy({});

        expect(createPolicySpy).toHaveBeenCalledTimes(1);
        expect(policy).not.toBe(mockSource.api.policyApi);
        expect(policy.name).toBe('AGPolicy');
        expect(policy.createHTML).toBeDefined();
        expect(policy.createScript).toBeDefined();
        expect(policy.createScriptURL).toBeDefined();
    });

    test('api not provided - trusted types not supported', () => {
        vi.stubGlobal('trustedTypes', undefined);

        const policy = extractOrCreatePolicy({});

        expect(policy).toBe(null);
    });
});

describe('createTrustedHTML', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    test('api provided', () => {
        const input = '<div>test: api provided</div>';
        const createHtmlSpy = vi.spyOn(mockSource.api.policyApi, 'createHTML');
        const result = createTrustedHTML(mockSource, input);

        expect(createHtmlSpy).toHaveBeenCalledTimes(1);
        expect(result.api).toBe(true);
        expect(result.type).toBe('html');
        expect(result.result).toBe(input);
        expect(result.args).toEqual({});
    });

    test('api not provided - trusted types supported', () => {
        vi.stubGlobal('trustedTypes', trustedTypesMock);

        const input = '<div>test: api not provided - trusted types supported</div>';
        const createHtmlSpy = vi.spyOn(mockSource.api.policyApi, 'createHTML');
        const result = createTrustedHTML({}, input);

        expect(createHtmlSpy).not.toHaveBeenCalled();
        expect(result.api).toBe(false);
        expect(result.type).toBe('html');
        expect(result.result).toBe(input);
        expect(result.args).not.toBeDefined();
    });

    test('api not provided - trusted types not supported', () => {
        vi.stubGlobal('trustedTypes', undefined);

        const input = '<div>test: api not provided - trusted types not supported</div>';
        const result = createTrustedHTML({}, input);

        expect(result).toBe(input);
    });
});

describe('createTrustedScript', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    test('api provided', () => {
        const input = 'console.log("test: api provided");';
        const createScriptSpy = vi.spyOn(mockSource.api.policyApi, 'createScript');
        const result = createTrustedScript(mockSource, input);

        expect(createScriptSpy).toHaveBeenCalledTimes(1);
        expect(result.api).toBe(true);
        expect(result.type).toBe('script');
        expect(result.result).toBe(input);
        expect(result.args).toEqual({});
    });

    test('api not provided - trusted types supported', () => {
        vi.stubGlobal('trustedTypes', trustedTypesMock);

        const input = 'console.log("test: api not provided - trusted types supported");';
        const createScriptSpy = vi.spyOn(mockSource.api.policyApi, 'createScript');
        const result = createTrustedScript({}, input);

        expect(createScriptSpy).not.toHaveBeenCalled();
        expect(result.api).toBe(false);
        expect(result.type).toBe('script');
        expect(result.result).toBe(input);
        expect(result.args).not.toBeDefined();
    });

    test('api not provided - trusted types not supported', () => {
        vi.stubGlobal('trustedTypes', undefined);

        const input = 'console.log("test: api not provided - trusted types not supported");';
        const result = createTrustedScript({}, input);

        expect(result).toBe(input);
    });
});

describe('createTrustedScriptURL', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    test('api provided', () => {
        const input = 'https://example.com/script.js?param=apiProvided';
        const createScriptUrlSpy = vi.spyOn(mockSource.api.policyApi, 'createScriptURL');
        const result = createTrustedScriptURL(mockSource, input);

        expect(createScriptUrlSpy).toHaveBeenCalledTimes(1);
        expect(result.api).toBe(true);
        expect(result.type).toBe('script-url');
        expect(result.result).toBe(input);
        expect(result.args).toEqual({});
    });

    test('api not provided - trusted types supported', () => {
        vi.stubGlobal('trustedTypes', trustedTypesMock);

        const input = 'https://example.com/script.js?param=apiNotProvidedTrustedTypesSupported';
        const createScriptUrlSpy = vi.spyOn(mockSource.api.policyApi, 'createScriptURL');
        const result = createTrustedScriptURL({}, input);

        expect(createScriptUrlSpy).not.toHaveBeenCalled();
        expect(result.api).toBe(false);
        expect(result.type).toBe('script-url');
        expect(result.result).toBe(input);
        expect(result.args).not.toBeDefined();
    });

    test('api not provided - trusted types not supported', () => {
        vi.stubGlobal('trustedTypes', undefined);

        const input = 'https://example.com/script.js?param=apiNotProvidedTrustedTypesNotSupported';
        const result = createTrustedScriptURL({}, input);

        expect(result).toBe(input);
    });
});
