import {
    afterEach,
    beforeEach,
    describe,
    expect,
    test,
    vi,
} from 'vitest';

import {
    getAdgAttrSettings,
    getUboAttrSettings,
    setAttrBySettings,
    type AttrSettings,
} from '../../src/helpers/set-attr-utils';
import { type Source } from '../../src/scriptlets';
import { trackMutationObservers } from '../vitest-helpers';

const adgSource = { name: 'trusted-set-attr', verbose: false } as unknown as Source;
const uboSource = { name: 'ubo-trusted-set-attr', verbose: false } as unknown as Source;
const adgSetAttrSource = { name: 'set-attr', verbose: false } as unknown as Source;
const uboSetAttrSource = { name: 'ubo-set-attr', verbose: false } as unknown as Source;

/**
 * Returns the settings of the attribute, and fails if they are `null`.
 *
 * @param settings Settings returned by a parser.
 * @returns Settings of the attribute.
 */
const getSettings = (settings: AttrSettings | null): AttrSettings => {
    expect(settings).not.toBeNull();
    return settings as AttrSettings;
};

let disconnectObservers: () => void;

beforeEach(() => {
    // Throttled callbacks of the observers are not run after the test
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    // Observers of `setAttrBySettings()` are disconnected after each test, so they do not process the next ones
    disconnectObservers = trackMutationObservers();
});

afterEach(() => {
    disconnectObservers();
    vi.useRealTimers();
    document.body.innerHTML = '';
});

describe('getAdgAttrSettings', () => {
    test('real rule is applied immediately and observes attributes', () => {
        // tempmail.ninja#%#//scriptlet('trusted-set-attr', 'ins.adsbygoogle', 'data-ad-status', 'unfilled')
        const settings = getSettings(getAdgAttrSettings(
            adgSource,
            'ins.adsbygoogle',
            'data-ad-status',
            'unfilled',
            [],
            true,
        ));

        expect(settings.runAt).toBeUndefined();
        expect(settings.copiedAttr).toBeNull();
        expect(settings.shouldObserveAttributes).toBe(true);
        expect(settings.isEventHandlerSkipped).toBe(false);
    });

    test.each([
        { title: 'without selector', args: ['', 'data-x', '1'] },
        { title: 'without attribute', args: ['div', '', '1'] },
        { title: 'with invalid selector', args: ['#[', 'data-x', '1'] },
    ])('rule $title is not applied', ({ args }) => {
        expect(getAdgAttrSettings(adgSource, ...(args as [string, string, string]), [], true)).toBeNull();
    });
});

describe('getUboAttrSettings', () => {
    test('real rule waits for the complete document by default, as in uBO', () => {
        // pvpoke-re.com##+js(trusted-set-attr, ins.adsbygoogle:has(> #aswift_0_host), data-ad-status, unfilled)
        const settings = getSettings(getUboAttrSettings(
            uboSource,
            'ins.adsbygoogle:has(> #aswift_0_host)',
            'data-ad-status',
            'unfilled',
            [],
            true,
        ));

        expect(settings.runAt).toBe('idle');
        expect(settings.shouldObserveAttributes).toBe(false);
        expect(settings.isEventHandlerSkipped).toBe(true);
    });

    test.each([
        { args: ['runAt', 'interactive'], expected: 'interactive' },
        { args: ['runAt', '2'], expected: 2 },
        // As in uBO, `0` is falsy, so it is the default
        { args: ['runAt', '0'], expected: 'idle' },
    ])('runAt option $args', ({ args, expected }) => {
        expect(getSettings(getUboAttrSettings(uboSource, '#countdown', 'data-status', 'active', args, true)).runAt)
            .toBe(expected);
    });

    test('omitted value is empty', () => {
        expect(getSettings(getUboAttrSettings(uboSource, '#countdown', 'data-status', undefined, [], true)).value)
            .toBe('');
    });
});

describe('setAttrBySettings', () => {
    test('uBO rule sets the attribute when the document is ready', () => {
        // cloubix.com##+js(trusted-set-attr, #countdown, data-status, active), with `runAt`
        let readyState = 'loading';
        Object.defineProperty(document, 'readyState', { configurable: true, get: () => readyState });
        try {
            document.body.innerHTML = '<div id="countdown" data-status="waiting"></div>';
            const settings = getUboAttrSettings(uboSource, '#countdown', 'data-status', 'active', [
                'runAt',
                'interactive',
            ], true);
            setAttrBySettings(uboSource, getSettings(settings));
            expect(document.getElementById('countdown')?.getAttribute('data-status')).toBe('waiting');

            readyState = 'interactive';
            document.dispatchEvent(new Event('readystatechange'));
            expect(document.getElementById('countdown')?.getAttribute('data-status')).toBe('active');
        } finally {
            // @ts-expect-error -- the own property is removed, so the property of the prototype is used again
            delete document.readyState;
        }
    });

    test('uBO rule does not set an event handler, an AdGuard rule does', () => {
        // rehouse.co.jp#%#//scriptlet('trusted-set-attr', 'main[oncontextmenu]', 'oncontextmenu', 'return true;')
        document.body.innerHTML = '<main oncontextmenu="return false;"></main>';
        const main = document.querySelector('main') as HTMLElement;

        setAttrBySettings(uboSource, getSettings(getUboAttrSettings(
            uboSource,
            'main[oncontextmenu]',
            'oncontextmenu',
            'return true;',
            ['runAt', 'loading'],
            true,
        )));
        expect(main.getAttribute('oncontextmenu')).toBe('return false;');

        setAttrBySettings(adgSource, getSettings(getAdgAttrSettings(
            adgSource,
            'main[oncontextmenu]',
            'oncontextmenu',
            'return true;',
            [],
            true,
        )));
        expect(main.getAttribute('oncontextmenu')).toBe('return true;');
    });
});

describe('getAdgAttrSettings of set-attr', () => {
    test('real rules: value or the attribute to copy the value from', () => {
        // animegratis.org#%#//scriptlet('set-attr', 'iframe[data-src]', 'src', '[data-src]')
        const copy = getSettings(getAdgAttrSettings(
            adgSetAttrSource,
            'iframe[data-src]',
            'src',
            '[data-src]',
            [],
            false,
        ));
        expect(copy.copiedAttr).toBe('data-src');
        expect(copy.missingCopiedValue).toBe('null');
        expect(copy.runAt).toBeUndefined();
        expect(copy.shouldObserveAttributes).toBe(true);
        expect(copy.isEventHandlerSkipped).toBe(false);

        // apkmoddone.com#%#//scriptlet('set-attr', '.adsbygoogle', 'data-ad-status', '0')
        const number = getSettings(getAdgAttrSettings(
            adgSetAttrSource,
            '.adsbygoogle',
            'data-ad-status',
            '0',
            [],
            false,
        ));
        expect(number.value).toBe('0');
        expect(number.copiedAttr).toBeNull();
    });

    test.each([
        // 9gag.com#%#//scriptlet('set-attr', 'video[poster]:not([controls])', 'controls', 'true')
        { value: 'true', expected: 'true' },
        { value: 'fAlse', expected: 'fAlse' },
        { value: '', expected: '' },
        { value: '32767', expected: '32767' },
        // As before, the value is checked by `parseInt()`, and set as it is
        { value: '007', expected: '007' },
        { value: '12abc', expected: '12abc' },
    ])('value $value is set as $expected, as before', ({ value, expected }) => {
        expect(getSettings(getAdgAttrSettings(adgSetAttrSource, 'video', 'controls', value, [], false)).value)
            .toBe(expected);
    });

    test.each(['32768', '-1', 'yes', '[a b]', '[]'])('invalid value %j is not applied', (value) => {
        expect(getAdgAttrSettings(adgSetAttrSource, 'video', 'controls', value, [], false)).toBeNull();
    });

    test('value of trusted-set-attr is not copied from another attribute', () => {
        const settings = getSettings(getAdgAttrSettings(adgSource, 'iframe[data-src]', 'src', '[data-src]', [], true));
        expect(settings.value).toBe('[data-src]');
        expect(settings.copiedAttr).toBeNull();
    });

    test.each([
        { args: ['runAt', 'interactive'], expected: 'interactive' },
        { args: ['runAt', '2'], expected: 2 },
        { args: [], expected: undefined },
    ])('runAt option $args', ({ args, expected }) => {
        expect(getSettings(getAdgAttrSettings(adgSetAttrSource, 'iframe[data-src]', 'src', '[data-src]', args, false))
            .runAt).toBe(expected);
        expect(getSettings(getAdgAttrSettings(adgSource, '#countdown', 'data-status', 'active', args, true)).runAt)
            .toBe(expected);
    });
});

describe('getUboAttrSettings of set-attr', () => {
    test('real rule which copies the value', () => {
        // salzburg.info##+js(set-attr, img.js-lazy-img[src^="data:image/"], src, [data-src])
        const settings = getSettings(getUboAttrSettings(
            uboSetAttrSource,
            'img.js-lazy-img[src^="data:image/"]',
            'src',
            '[data-src]',
            [],
            false,
        ));

        expect(settings.copiedAttr).toBe('data-src');
        expect(settings.missingCopiedValue).toBe('');
        expect(settings.runAt).toBe('idle');
        expect(settings.shouldObserveAttributes).toBe(false);
        expect(settings.isEventHandlerSkipped).toBe(true);
    });

    test.each([
        // www.google.*##+js(set-attr, c-wiz[data-p] [data-query] a[target="_blank"][role="link"], rlhc, 1)
        { value: '1', expected: '1' },
        // As in uBO, a number is set without leading zeros
        { value: '007', expected: '7' },
        { value: '32767', expected: '32767' },
        { value: 'TRUE', expected: 'TRUE' },
        { value: '', expected: '' },
    ])('value $value is set as $expected', ({ value, expected }) => {
        expect(getSettings(getUboAttrSettings(uboSetAttrSource, 'a', 'rlhc', value, [], false)).value).toBe(expected);
    });

    test.each(['32768', '12abc', '-1', 'yes', '[]'])('invalid value %j is not applied, as in uBO', (value) => {
        expect(getUboAttrSettings(uboSetAttrSource, 'a', 'rlhc', value, [], false)).toBeNull();
    });

    test('name of the attribute to copy the value from is not validated, as in uBO', () => {
        expect(getSettings(getUboAttrSettings(uboSetAttrSource, 'a', 'rlhc', '[a b]', [], false)).copiedAttr)
            .toBe('a b');
    });
});

describe('setAttrBySettings of set-attr', () => {
    test('missing attribute to copy the value from is null as text in AdGuard syntax, and empty in uBO', () => {
        // statisticsanddata.org##+js(set-attr, iframe[data-src-cmplz][src="about:blank"], src, [data-src-cmplz])
        document.body.innerHTML = `<iframe id="ubo" src="about:blank"></iframe>
            <iframe class="adg" src="about:blank"></iframe>
            <iframe class="adg" src="about:blank" data-src-cmplz="https://example.org/"></iframe>`;
        const ubo = document.getElementById('ubo') as HTMLIFrameElement;
        const adg = document.querySelectorAll('.adg');

        setAttrBySettings(uboSetAttrSource, getSettings(getUboAttrSettings(
            uboSetAttrSource,
            '#ubo[src="about:blank"]',
            'src',
            '[data-src-cmplz]',
            ['runAt', 'loading'],
            false,
        )));
        expect(ubo.getAttribute('src')).toBe('');

        setAttrBySettings(adgSetAttrSource, getSettings(getAdgAttrSettings(
            adgSetAttrSource,
            '.adg[src="about:blank"]',
            'src',
            '[data-src-cmplz]',
            [],
            false,
        )));
        expect(adg[0].getAttribute('src')).toBe('null');
        expect(adg[1].getAttribute('src')).toBe('https://example.org/');
    });

    test('uBO rule does not copy a value to an event handler, an AdGuard rule does', () => {
        document.body.innerHTML = '<a data-x="alert(1)">x</a>';
        const link = document.querySelector('a') as HTMLAnchorElement;

        setAttrBySettings(uboSetAttrSource, getSettings(getUboAttrSettings(
            uboSetAttrSource,
            'a',
            'onclick',
            '[data-x]',
            ['runAt', 'loading'],
            false,
        )));
        expect(link.hasAttribute('onclick')).toBe(false);

        setAttrBySettings(adgSetAttrSource, getSettings(getAdgAttrSettings(
            adgSetAttrSource,
            'a',
            'onclick',
            '[data-x]',
            [],
            false,
        )));
        expect(link.getAttribute('onclick')).toBe('alert(1)');
    });

    test('AdGuard rule with runAt sets the attribute when the document is ready', () => {
        // animegratis.org#%#//scriptlet('set-attr', 'iframe[data-src]', 'src', '[data-src]'), with `runAt`
        let readyState = 'loading';
        Object.defineProperty(document, 'readyState', { configurable: true, get: () => readyState });
        try {
            document.body.innerHTML = '<iframe data-src="https://example.org/"></iframe>';
            const iframe = document.querySelector('iframe') as HTMLIFrameElement;
            setAttrBySettings(adgSetAttrSource, getSettings(getAdgAttrSettings(
                adgSetAttrSource,
                'iframe[data-src]',
                'src',
                '[data-src]',
                ['runAt', 'interactive'],
                false,
            )));
            expect(iframe.hasAttribute('src')).toBe(false);

            readyState = 'interactive';
            document.dispatchEvent(new Event('readystatechange'));
            expect(iframe.getAttribute('src')).toBe('https://example.org/');
        } finally {
            // @ts-expect-error -- the own property is removed, so the property of the prototype is used again
            delete document.readyState;
        }
    });
});
