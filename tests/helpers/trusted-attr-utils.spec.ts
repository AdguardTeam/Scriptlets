import {
    afterEach,
    describe,
    expect,
    test,
} from 'vitest';

import {
    getAdgAttrSettings,
    getUboAttrSettings,
    setAttrBySettings,
    type AttrSettings,
} from '../../src/helpers/trusted-attr-utils';
import { type Source } from '../../src/scriptlets';

const adgSource = { name: 'trusted-set-attr', verbose: false } as unknown as Source;
const uboSource = { name: 'ubo-trusted-set-attr', verbose: false } as unknown as Source;

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

afterEach(() => {
    document.body.innerHTML = '';
});

describe('getAdgAttrSettings', () => {
    test('real rule is applied immediately and observes attributes', () => {
        // tempmail.ninja#%#//scriptlet('trusted-set-attr', 'ins.adsbygoogle', 'data-ad-status', 'unfilled')
        const settings = getSettings(getAdgAttrSettings(adgSource, 'ins.adsbygoogle', 'data-ad-status', 'unfilled'));

        expect(settings.runAt).toBeNull();
        expect(settings.shouldObserveAttributes).toBe(true);
        expect(settings.isEventHandlerSkipped).toBe(false);
    });

    test.each([
        { title: 'without selector', args: ['', 'data-x', '1'] },
        { title: 'without attribute', args: ['div', '', '1'] },
        { title: 'with invalid selector', args: ['#[', 'data-x', '1'] },
    ])('rule $title is not applied', ({ args }) => {
        expect(getAdgAttrSettings(adgSource, ...(args as [string, string, string]))).toBeNull();
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
        expect(getSettings(getUboAttrSettings(uboSource, '#countdown', 'data-status', 'active', args)).runAt)
            .toBe(expected);
    });

    test('omitted value is empty', () => {
        expect(getSettings(getUboAttrSettings(uboSource, '#countdown', 'data-status', undefined, [])).value).toBe('');
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
            ]);
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
        )));
        expect(main.getAttribute('oncontextmenu')).toBe('return false;');

        setAttrBySettings(adgSource, getSettings(getAdgAttrSettings(
            adgSource,
            'main[oncontextmenu]',
            'oncontextmenu',
            'return true;',
        )));
        expect(main.getAttribute('oncontextmenu')).toBe('return true;');
    });
});
