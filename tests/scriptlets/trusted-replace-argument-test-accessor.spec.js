/* eslint-disable no-extend-native */
import {
    afterEach,
    describe,
    expect,
    test,
} from 'vitest';

import { abortCurrentInlineScript } from '../../src/scriptlets/abort-current-inline-script';
import { setConstant } from '../../src/scriptlets/set-constant';
import { trustedReplaceArgument } from '../../src/scriptlets/trusted-replace-argument';
import { trustedReplaceOutboundText } from '../../src/scriptlets/trusted-replace-outbound-text';

// Rules which are applied while `RegExp.prototype.test` is an accessor, defined by another rule before,
// so they are tested in a separate page of Vitest, as the accessor of `set-constant` cannot be removed

const nativeTest = RegExp.prototype.test;
const nativeGetElementById = Document.prototype.getElementById;
const nativeReplaceState = History.prototype.replaceState;
const nativeAtob = window.atob;

const adgSource = { name: 'trusted-replace-argument', verbose: false };
const uboSource = { name: 'ubo-trusted-replace-argument', verbose: false };

/**
 * Defines `RegExp.prototype.test` as an accessor, by a real rule:
 * cricket365.com,football365.com,…#%#//scriptlet('abort-current-inline-script', 'RegExp.prototype.test', '_0x')
 */
const defineTestAccessor = () => {
    abortCurrentInlineScript(
        { name: 'abort-current-inline-script', verbose: false },
        'RegExp.prototype.test',
        '_0x',
    );
    expect(Object.getOwnPropertyDescriptor(RegExp.prototype, 'test')?.get).toBeTypeOf('function');
};

afterEach(() => {
    // Assigning the method would call the setter of the accessor instead,
    // and the accessor of `set-constant` cannot be redefined
    if (Object.getOwnPropertyDescriptor(RegExp.prototype, 'test')?.configurable) {
        Object.defineProperty(RegExp.prototype, 'test', {
            value: nativeTest,
            writable: true,
            configurable: true,
            enumerable: false,
        });
    }
    Document.prototype.getElementById = nativeGetElementById;
    // uBO rule replaces the method in `document` itself
    delete document.getElementById;
    History.prototype.replaceState = nativeReplaceState;
    delete window.history.replaceState;
    window.atob = nativeAtob;
    document.body.innerHTML = '';
});

describe('RegExp.prototype.test is an accessor of abort-current-inline-script', () => {
    test('AdGuard rule without pattern', () => {
        // eslint-disable-next-line max-len
        // bilibili.com#%#//scriptlet('trusted-replace-argument', 'history.replaceState', '2', 'replace:/(?<=[?&])(?:vd_source|trackid|spm_id_from)=[^&#]*&?//g')
        const calls = [];
        History.prototype.replaceState = function replaceState(...args) {
            calls.push(args[2]);
        };
        defineTestAccessor();
        trustedReplaceArgument(
            adgSource,
            'history.replaceState',
            '2',
            'replace:/(?<=[?&])(?:vd_source|trackid|spm_id_from)=[^&#]*&?//g',
        );

        window.history.replaceState(null, '', '/video/BV1?p=1&vd_source=abc&spm_id_from=x');

        expect(calls).toEqual(['/video/BV1?p=1&']);
    });

    test('AdGuard rule with pattern', () => {
        // eslint-disable-next-line max-len
        // daily.co.jp#%#//scriptlet('trusted-replace-argument', 'Document.prototype.getElementById', '0', 'dspc-bottomRecommend', 'dspc-inread')
        document.body.innerHTML = '<div id="dspc-bottomRecommend"></div><div id="other"></div>';
        defineTestAccessor();
        trustedReplaceArgument(
            adgSource,
            'Document.prototype.getElementById',
            '0',
            'dspc-bottomRecommend',
            'dspc-inread',
        );

        expect(document.getElementById('dspc-inread')?.id).toBe('dspc-bottomRecommend');
        expect(document.getElementById('other')?.id).toBe('other');
    });

    test('uBO rule with condition', () => {
        // eslint-disable-next-line max-len
        // enternity.gr##+js(trusted-replace-argument, document.getElementById, 0, json:"header", condition, /^[A-Za-z]{12}$/)
        document.body.innerHTML = '<div id="header"></div><div id="content"></div>';
        defineTestAccessor();
        trustedReplaceArgument(
            uboSource,
            'document.getElementById',
            '0',
            'json:"header"',
            'condition',
            '/^[A-Za-z]{12}$/',
        );

        expect(document.getElementById('AbCdEfGhIjKl')?.id).toBe('header');
        expect(document.getElementById('content')?.id).toBe('content');
    });

    test('uBO rule which intercepts RegExp.prototype.test itself', () => {
        // mega.nz##+js(trusted-replace-argument, RegExp.prototype.test, 0, repl:/\.mp4$/.mp3/, condition, .mp4)
        defineTestAccessor();
        trustedReplaceArgument(
            uboSource,
            'RegExp.prototype.test',
            '0',
            'repl:/\\.mp4$/.mp3/',
            'condition',
            '.mp4',
        );

        // The method is replaced through the setter of the accessor, and its condition is matched by `test()`
        // of the accessor, i.e. the method of the rule itself, which passes the nested call through
        expect(/\.mp3$/.test('video.mp4')).toBe(true);
        expect(/\.mp3$/.test('video.webm')).toBe(false);
    });

    test('rule installed before the accessor still uses the saved method', () => {
        // eslint-disable-next-line max-len
        // daily.co.jp#%#//scriptlet('trusted-replace-argument', 'Document.prototype.getElementById', '0', 'dspc-bottomRecommend', 'dspc-inread')
        document.body.innerHTML = '<div id="dspc-bottomRecommend"></div>';
        trustedReplaceArgument(
            adgSource,
            'Document.prototype.getElementById',
            '0',
            'dspc-bottomRecommend',
            'dspc-inread',
        );
        defineTestAccessor();

        expect(document.getElementById('dspc-inread')?.id).toBe('dspc-bottomRecommend');
    });

    test('error thrown by the accessor is logged and the original argument is passed', () => {
        document.body.innerHTML = '<div id="dspc-inread"></div>';
        defineTestAccessor();
        trustedReplaceArgument(
            adgSource,
            'Document.prototype.getElementById',
            '0',
            'dspc-bottomRecommend',
            'dspc-inread',
        );
        // e.g. the page replaces the method later with one which throws
        RegExp.prototype.test = () => {
            throw new Error('page error');
        };

        expect(document.getElementById('dspc-inread')?.id).toBe('dspc-inread');
    });

    test('trusted-replace-outbound-text with condition', () => {
        // animefire.io##+js(trusted-replace-outbound-text, atob, /.+/, , condition, /www|cloudfront/)
        defineTestAccessor();
        trustedReplaceOutboundText(
            { name: 'ubo-trusted-replace-outbound-text.js', verbose: false },
            'atob',
            '/.+/',
            '',
            'condition',
            '/www|cloudfront/',
        );

        expect(atob(btoa('https://d1abc.cloudfront.net/ads.js'))).toBe('');
        expect(atob(btoa('{"player":"main"}'))).toBe('{"player":"main"}');
    });
});

describe('test() of an accessor throws', () => {
    test('trusted-replace-outbound-text with condition returns the text as it is', () => {
        // e.g. the page replaces the method of the accessor with one which throws, only for the condition here,
        // as other code, e.g. of Vitest, uses the method as well
        Object.defineProperty(RegExp.prototype, 'test', {
            configurable: true,
            get() {
                return function test(text) {
                    if (this.source === 'www|cloudfront') {
                        throw new Error('page error');
                    }
                    return nativeTest.call(this, text);
                };
            },
        });
        // animefire.io##+js(trusted-replace-outbound-text, atob, /.+/, , condition, /www|cloudfront/)
        trustedReplaceOutboundText(
            { name: 'ubo-trusted-replace-outbound-text.js', verbose: false },
            'atob',
            '/.+/',
            '',
            'condition',
            '/www|cloudfront/',
        );

        expect(atob(btoa('https://d1abc.cloudfront.net/ads.js'))).toBe('https://d1abc.cloudfront.net/ads.js');
    });
});

// The accessor of `set-constant` cannot be removed, so this test is the last one of the page
describe('RegExp.prototype.test is an accessor of set-constant', () => {
    test('rule without pattern is applied', () => {
        // The case of the review, for which there is no rule in the filter lists
        setConstant({ name: 'set-constant', verbose: false }, 'RegExp.prototype.test', 'trueFunc');
        window.probeMethod = (arg) => arg;
        trustedReplaceArgument(adgSource, 'probeMethod', '0', 'null');

        expect(window.probeMethod('original')).toBeNull();
        delete window.probeMethod;
    });
});
