import { describe, test, expect } from 'vitest';

import {
    copyResponseHeaders,
    createResponse,
    defineReadonlyResponseProps,
    getFilteredResponseDefaults,
    getResolvedResponseConfig,
    getSafeResponseStatus,
    isSuccessResponseStatus,
    isValidResponseStatus,
    modifyResponse,
    parseResponseConfig,
} from '../../src/helpers';

describe('Response utils tests', () => {
    test('Copies response headers', () => {
        const headers = new Headers({
            'Content-Type': 'text/plain',
            'X-Test': '1',
        });

        expect(copyResponseHeaders(headers)).toStrictEqual({
            'content-type': 'text/plain',
            'x-test': '1',
        });
    });

    test.each([
        { actual: 200, expected: true },
        { actual: 299, expected: true },
        { actual: 199, expected: false },
        { actual: 404, expected: false },
    ])('Checks successful response status: $actual', ({ actual, expected }) => {
        expect(isSuccessResponseStatus(actual)).toBe(expected);
    });

    test.each([
        { actual: 0, expected: 0 },
        { actual: 100, expected: 100 },
        { actual: 200, expected: 200 },
        { actual: 599, expected: 599 },
        // Invalid status values should be coerced to 200, which is the default status for synthetic responses.
        { actual: 666, expected: 200 },
        { actual: undefined, expected: 200 },
    ])('Checks safe response status: $actual', ({ actual, expected }) => {
        expect(getSafeResponseStatus(actual)).toBe(expected);
    });

    test.each([
        { actual: 0, expected: true },
        { actual: 100, expected: true },
        { actual: 599, expected: true },
        { actual: -1, expected: false },
        { actual: 600, expected: false },
        { actual: 200.5, expected: false },
        { actual: '200', expected: false },
    ])('Checks valid response status override: $actual', ({ actual, expected }) => {
        expect(isValidResponseStatus(actual)).toBe(expected);
    });

    test('Parses shorthand response config', () => {
        expect(parseResponseConfig('opaque')).toStrictEqual({
            type: 'opaque',
        });
    });

    test('Parses structured response config', () => {
        expect(parseResponseConfig('{"status":404,"statusText":"Not Found","ok":false}')).toStrictEqual({
            ok: false,
            status: 404,
            statusText: 'Not Found',
        });
    });

    test('Reports invalid response config', () => {
        const invalidValues = [];

        expect(parseResponseConfig('{"status":"invalid"}', (value) => invalidValues.push(value))).toBeNull();
        expect(invalidValues).toStrictEqual(['{"status":"invalid"}']);
    });

    test('Resolves response config with fallback type', () => {
        expect(getResolvedResponseConfig(undefined, 'cors')).toStrictEqual({
            type: 'cors',
        });

        expect(getResolvedResponseConfig({
            ok: false,
            type: 'opaque',
        }, 'cors')).toStrictEqual({
            ok: false,
            type: 'opaque',
        });
    });

    test('Defines readonly response properties', () => {
        const response = new Response('body', {
            status: 200,
            statusText: 'OK',
        });

        defineReadonlyResponseProps(response, {
            body: null,
            ok: false,
            redirected: true,
            status: 404,
            statusText: 'Not Found',
            type: 'opaque',
            url: 'https://example.org/test',
        });

        expect(response.body).toBe(null);
        expect(response.ok).toBe(false);
        expect(response.redirected).toBe(true);
        expect(response.status).toBe(404);
        expect(response.statusText).toBe('Not Found');
        expect(response.type).toBe('opaque');
        expect(response.url).toBe('https://example.org/test');
    });

    test.each([
        {
            actual: 'basic',
            expected: {},
        },
        {
            actual: 'opaque',
            expected: {
                body: null,
                ok: false,
                status: 0,
                statusText: '',
                url: '',
            },
        },
    ])('Gets filtered response defaults for $actual', ({ actual, expected }) => {
        expect(getFilteredResponseDefaults(actual)).toStrictEqual(expected);
    });

    test('Modifies response preserving original properties by default', async () => {
        const response = new Response('{"value":1}', {
            headers: {
                'Content-Type': 'application/json',
                'X-Test': '1',
            },
            status: 201,
            statusText: 'Created',
        });

        Object.defineProperties(response, {
            ok: { value: false },
            redirected: { value: true },
            type: { value: 'cors' },
            url: { value: 'https://example.org/data' },
        });

        const modifiedResponse = modifyResponse(response, {
            body: '[]',
        });

        expect(await modifiedResponse.text()).toStrictEqual('[]');
        expect(modifiedResponse.headers.get('content-type')).toStrictEqual('application/json');
        expect(modifiedResponse.headers.get('x-test')).toStrictEqual('1');
        expect(modifiedResponse.ok).toBeFalsy();
        expect(modifiedResponse.redirected).toBeTruthy();
        expect(modifiedResponse.status).toStrictEqual(201);
        expect(modifiedResponse.statusText).toStrictEqual('Created');
        expect(modifiedResponse.type).toStrictEqual('cors');
        expect(modifiedResponse.url).toStrictEqual('https://example.org/data');
    });

    test('Modifies response overriding provided properties', async () => {
        const response = new Response('source', {
            headers: {
                'X-Test': '1',
            },
            status: 200,
            statusText: 'OK',
        });

        Object.defineProperties(response, {
            redirected: { value: false },
            type: { value: 'basic' },
            url: { value: 'https://example.org/data' },
        });

        const modifiedResponse = modifyResponse(response, {
            body: 'blocked',
            ok: false,
            redirected: true,
            status: 404,
            statusText: 'Not Found',
            type: 'cors',
        });

        expect(await modifiedResponse.text()).toStrictEqual('blocked');
        expect(modifiedResponse.headers.get('x-test')).toStrictEqual('1');
        expect(modifiedResponse.ok).toBeFalsy();
        expect(modifiedResponse.redirected).toBeTruthy();
        expect(modifiedResponse.status).toStrictEqual(404);
        expect(modifiedResponse.statusText).toStrictEqual('Not Found');
        expect(modifiedResponse.type).toStrictEqual('cors');
        expect(modifiedResponse.url).toStrictEqual('https://example.org/data');
    });

    test('Modifies response applying filtered defaults for opaque type', async () => {
        const response = new Response('source', {
            headers: {
                'X-Test': '1',
            },
            status: 200,
            statusText: 'OK',
        });

        Object.defineProperties(response, {
            redirected: { value: false },
            type: { value: 'basic' },
            url: { value: 'https://example.org/data' },
        });

        const modifiedResponse = modifyResponse(response, {
            type: 'opaque',
        });

        expect(modifiedResponse.body).toBeNull();
        expect(modifiedResponse.headers.get('x-test')).toBeNull();
        expect(modifiedResponse.ok).toBeFalsy();
        expect(modifiedResponse.redirected).toBeFalsy();
        expect(modifiedResponse.status).toStrictEqual(0);
        expect(modifiedResponse.statusText).toStrictEqual('');
        expect(modifiedResponse.type).toStrictEqual('opaque');
        expect(modifiedResponse.url).toStrictEqual('');
    });

    test('Modifies response applying filtered defaults for error type', async () => {
        const response = new Response('source', {
            headers: {
                'X-Test': '1',
            },
            status: 200,
            statusText: 'OK',
        });

        Object.defineProperties(response, {
            redirected: { value: false },
            type: { value: 'basic' },
            url: { value: 'https://example.org/data' },
        });

        const modifiedResponse = modifyResponse(response, {
            type: 'error',
        });

        expect(modifiedResponse.body).toBeNull();
        expect(modifiedResponse.headers.get('x-test')).toBeNull();
        expect(modifiedResponse.ok).toBeFalsy();
        expect(modifiedResponse.redirected).toBeFalsy();
        expect(modifiedResponse.status).toStrictEqual(0);
        expect(modifiedResponse.statusText).toStrictEqual('');
        expect(modifiedResponse.type).toStrictEqual('error');
        expect(modifiedResponse.url).toStrictEqual('');
    });

    test('Modifies response allowing informational status override', async () => {
        const response = new Response('source', {
            status: 200,
            statusText: 'OK',
        });

        Object.defineProperties(response, {
            redirected: { value: false },
            type: { value: 'basic' },
            url: { value: 'https://example.org/data' },
        });

        const modifiedResponse = modifyResponse(response, {
            body: 'processing',
            status: 100,
            statusText: 'Continue',
            type: 'cors',
        });

        expect(await modifiedResponse.text()).toStrictEqual('processing');
        expect(modifiedResponse.ok).toBeFalsy();
        expect(modifiedResponse.redirected).toBeFalsy();
        expect(modifiedResponse.status).toStrictEqual(100);
        expect(modifiedResponse.statusText).toStrictEqual('Continue');
        expect(modifiedResponse.type).toStrictEqual('cors');
        expect(modifiedResponse.url).toStrictEqual('https://example.org/data');
    });

    test('Modifies response allowing zero status override', async () => {
        const response = new Response('source', {
            status: 200,
            statusText: 'OK',
        });

        Object.defineProperties(response, {
            redirected: { value: false },
            type: { value: 'basic' },
            url: { value: 'https://example.org/data' },
        });

        const modifiedResponse = modifyResponse(response, {
            body: 'blocked',
            status: 0,
            statusText: '',
            type: 'basic',
        });

        expect(await modifiedResponse.text()).toStrictEqual('blocked');
        expect(modifiedResponse.ok).toBeFalsy();
        expect(modifiedResponse.redirected).toBeFalsy();
        expect(modifiedResponse.status).toStrictEqual(0);
        expect(modifiedResponse.statusText).toStrictEqual('');
        expect(modifiedResponse.type).toStrictEqual('basic');
        expect(modifiedResponse.url).toStrictEqual('https://example.org/data');
    });

    test('Creates synthetic basic response with defaults', async () => {
        const response = createResponse({
            body: 'test',
            requestUrl: 'https://example.org/data',
        });

        expect(await response.text()).toStrictEqual('test');
        expect(response.headers.get('content-length')).toStrictEqual('4');
        expect(response.ok).toBeTruthy();
        expect(response.redirected).toBeFalsy();
        expect(response.status).toStrictEqual(200);
        expect(response.statusText).toStrictEqual('OK');
        expect(response.type).toStrictEqual('basic');
        expect(response.url).toStrictEqual('https://example.org/data');
    });

    test('Creates filtered synthetic response with overrides', async () => {
        const response = createResponse({
            body: 'test',
            ok: true,
            redirected: true,
            requestUrl: 'https://example.org/data',
            status: 100,
            statusText: 'Continue',
            type: 'error',
        });

        // Body and content-length should be filtered out for error responses.
        expect(response.body).toBeNull();
        expect(response.headers.get('content-length')).toBeNull();
        expect(response.ok).toBeTruthy();
        expect(response.redirected).toBeTruthy();
        expect(response.status).toStrictEqual(100);
        expect(response.statusText).toStrictEqual('Continue');
        expect(response.type).toStrictEqual('error');
        expect(response.url).toStrictEqual('');
    });

    test('Creates filtered synthetic response hiding provided headers', () => {
        const response = createResponse({
            body: 'test',
            headers: {
                'Content-Length': '4',
                'X-Test': '1',
            },
            type: 'opaque',
        });

        // All headers should be filtered out for opaque responses.
        expect(response.headers.get('content-length')).toBeNull();
        expect(response.headers.get('x-test')).toBeNull();
    });

    test('Creates synthetic response with correct byte-length Content-Length for multi-byte body', async () => {
        // Emoji '😀' is 2 UTF-16 code units but 4 UTF-8 bytes.
        // Content-Length must reflect byte count, not code-unit count.
        const response = createResponse({
            body: '😀',
            requestUrl: 'https://example.org/data',
        });

        expect(await response.text()).toStrictEqual('😀');
        expect(response.headers.get('content-length')).toStrictEqual('4');
    });

    test('Creates synthetic response allowing zero status override', async () => {
        const response = createResponse({
            body: 'test',
            requestUrl: 'https://example.org/data',
            status: 0,
            statusText: '',
            type: 'basic',
        });

        expect(await response.text()).toStrictEqual('test');
        expect(response.headers.get('content-length')).toStrictEqual('4');
        expect(response.ok).toBeFalsy();
        expect(response.redirected).toBeFalsy();
        expect(response.status).toStrictEqual(0);
        expect(response.statusText).toStrictEqual('');
        expect(response.type).toStrictEqual('basic');
        expect(response.url).toStrictEqual('https://example.org/data');
    });
});
