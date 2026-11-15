/* eslint-disable no-extend-native, no-console */
import {
    afterEach,
    describe,
    expect,
    test,
} from 'vitest';

import { trustedReplaceArgument } from '../../src/scriptlets/trusted-replace-argument';

const natives = {
    test: RegExp.prototype.test,
    replace: String.prototype.replace,
    stringify: JSON.stringify,
    parse: JSON.parse,
    slice: Array.prototype.slice,
    log: console.log,
};

afterEach(() => {
    RegExp.prototype.test = natives.test;
    String.prototype.replace = natives.replace;
    JSON.stringify = natives.stringify;
    JSON.parse = natives.parse;
    Array.prototype.slice = natives.slice;
    console.log = natives.log;
});

const adgSource = { name: 'trusted-replace-argument', verbose: false };
const uboSource = { name: 'ubo-trusted-replace-argument', verbose: false };

describe('methods which the scriptlet uses itself', () => {
    // The scriptlet calls them while it processes a call, so they are passed through then, without recursion
    test.each([
        {
            title: 'AdGuard RegExp.prototype.test',
            source: adgSource,
            args: ['RegExp.prototype.test', '0', 'replace:/mp4/mp3/', '/mp4/'],
            call: () => /mp3/.test('a.mp4'),
            expected: true,
        },
        {
            // mega.nz##+js(trusted-replace-argument, RegExp.prototype.test, 0, repl:/\.mp4$/.mp3/, condition, .mp4)
            title: 'uBO RegExp.prototype.test',
            source: uboSource,
            args: ['RegExp.prototype.test', '0', 'repl:/\\.mp4$/.mp3/', 'condition', '.mp4'],
            call: () => /\.mp3$/.test('video.mp4'),
            expected: true,
        },
        {
            title: 'AdGuard String.prototype.replace',
            source: adgSource,
            args: ['String.prototype.replace', '1', 'replace:/a/b/', 'a'],
            call: () => 'x'.replace('x', 'a'),
            expected: 'b',
        },
        {
            title: 'uBO String.prototype.replace',
            source: uboSource,
            args: ['String.prototype.replace', '1', 'repl:/a/b/', 'condition', 'a'],
            call: () => 'x'.replace('x', 'a'),
            expected: 'b',
        },
        {
            title: 'AdGuard JSON.stringify with a pattern matched against an object',
            source: adgSource,
            args: ['JSON.stringify', '0', 'emptyObj', 'ads'],
            call: () => JSON.stringify({ ads: 1 }),
            expected: '{}',
        },
        {
            title: 'AdGuard Array.prototype.slice',
            source: adgSource,
            args: ['Array.prototype.slice', '0', '1', '0'],
            call: () => [1, 2, 3].slice(0),
            expected: [2, 3],
        },
    ])('$title', ({
        source,
        args,
        call,
        expected,
    }) => {
        trustedReplaceArgument(source, ...args);
        expect(call()).toEqual(expected);
    });

    test('console.log with verbose', () => {
        const logged = [];
        console.log = (...args) => logged.push(args.join(' '));
        trustedReplaceArgument({ ...adgSource, verbose: true }, 'console.log', '0', 'replaced', 'page', '', 'true');

        console.log('page message');

        expect(logged).toContain('replaced');
        expect(logged.some((message) => message.includes('console.log original arguments'))).toBe(true);
    });
});

describe('uBO arguments', () => {
    test('quotes escaped by the converter are unescaped', () => {
        // www.lenovo.com##+js(trusted-replace-argument, history.replaceState, 2, "''", condition, ?orgRef),
        // converted by AGTree to `\'\'`, which is the empty string constant of uBO, but `undefined` if not unescaped
        const nativeReplaceState = History.prototype.replaceState;
        const calls = [];
        History.prototype.replaceState = function replaceState(...args) {
            calls.push(args);
        };
        try {
            trustedReplaceArgument(uboSource, 'history.replaceState', '2', "\\'\\'", 'condition', '?orgRef');
            window.history.replaceState(null, '', '/product?orgRef=campaign');
            window.history.replaceState(null, '', '/product?page=2');
        } finally {
            // the rule replaces the method in `history` itself
            delete window.history.replaceState;
            History.prototype.replaceState = nativeReplaceState;
        }

        expect(calls).toEqual([[null, '', ''], [null, '', '/product?page=2']]);
    });
});

describe('two rules', () => {
    test('a rule which intercepts RegExp.prototype.test later does not change the matching of another rule', () => {
        // eslint-disable-next-line max-len
        // bild.de##+js(trusted-replace-argument, JSON.parse, 0, repl:/"adBlockWallEnabled":true/"adBlockWallEnabled":false/, condition, adBlockWallEnabled)
        trustedReplaceArgument(
            uboSource,
            'JSON.parse',
            '0',
            'repl:/"adBlockWallEnabled":true/"adBlockWallEnabled":false/',
            'condition',
            'adBlockWallEnabled',
        );
        // replaces any tested text, also of the condition of the rule above if it used the current `test`
        trustedReplaceArgument(uboSource, 'RegExp.prototype.test', '0', 'json:"x"', 'condition', '/./');

        expect(JSON.parse('{"adBlockWallEnabled":true}')).toEqual({ adBlockWallEnabled: false });
    });
});

describe('errors', () => {
    test('error of processing is logged, and the method is called with the original arguments', () => {
        const argument = {
            toString() {
                throw new Error('page error');
            },
        };
        const logged = [];
        console.log = (...args) => logged.push(args.join(' '));
        trustedReplaceArgument({ ...adgSource, verbose: true }, 'JSON.stringify', '0', 'emptyObj', 'ads');

        // the argument is circular, so its JSON is not matched, and converting it to a string throws
        argument.self = argument;
        expect(() => JSON.stringify([argument])).toThrow(TypeError);
        expect(logged.some((message) => message.includes('Unexpected error during argument replacement'))).toBe(true);
    });

    test('the method is called also if logging the error throws', () => {
        const argument = {
            toString() {
                throw new Error('page error');
            },
        };
        argument.self = argument;
        trustedReplaceArgument({ ...adgSource, verbose: true }, 'Array.prototype.includes', '0', 'emptyObj', 'ads');
        console.log = () => {
            throw new Error('console of the page');
        };

        // the original arguments are passed to the method, without an error of the scriptlet
        expect([argument].includes(argument)).toBe(true);
    });
});
