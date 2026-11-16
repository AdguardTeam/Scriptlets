import {
    describe,
    expect,
    test,
    vi,
} from 'vitest';

import {
    getAdgPreventXhrSettings,
    getUboPreventXhrSettings,
    type PreventXhrSettings,
} from '../../src/helpers/prevent-xhr-utils';
import { type Source } from '../../src/scriptlets';

const adgSource = { name: 'trusted-prevent-xhr', verbose: false } as unknown as Source;
const uboSource = { name: 'ubo-trusted-prevent-xhr', verbose: false } as unknown as Source;

/**
 * Returns the settings of the rule, and fails if they are `null`.
 *
 * @param settings Settings returned by a parser.
 * @returns Settings of the rule.
 */
const getSettings = (settings: PreventXhrSettings | null): PreventXhrSettings => {
    expect(settings).not.toBeNull();
    return settings as PreventXhrSettings;
};

/**
 * Returns the data of `open()` for the request.
 *
 * @param url URL of the request.
 * @param method Method of the request.
 * @returns Data of the request.
 */
const getXhrData = (url: string, method = 'GET') => ({
    method,
    url,
    async: true,
    user: undefined,
    password: undefined,
});

describe('getUboPreventXhrSettings', () => {
    test('real rule with a regular expression', () => {
        // namiko.net##+js(trusted-prevent-xhr, /googlesyndication|doubleclick/, "dataset.namikoVisitProbe='ready'")
        const settings = getSettings(getUboPreventXhrSettings(
            uboSource,
            '/googlesyndication|doubleclick/',
            "dataset.namikoVisitProbe='ready'",
            true,
        ));

        expect(settings.shouldLogRequests).toBe(false);
        expect(settings.isRequestMatched(getXhrData('https://pagead2.googlesyndication.com/pagead/js/a.js'))).toBe(true);
        expect(settings.isRequestMatched(getXhrData('https://example.org/'))).toBe(false);
        expect(settings.getText()).toBe("dataset.namikoVisitProbe='ready'");
    });

    test('real rule with a text of the URL, and json response', () => {
        // eslint-disable-next-line max-len
        // sbs.com.au##+js(trusted-prevent-xhr, securepubads.g.doubleclick.net/pagead/ima_ppub_config?ippd=https%3A%2F%2Fwww.sbs.com.au%2Fondemand%2F&ord=, ["4117"])
        const props = 'securepubads.g.doubleclick.net/pagead/ima_ppub_config'
            + '?ippd=https%3A%2F%2Fwww.sbs.com.au%2Fondemand%2F&ord=';
        const settings = getSettings(getUboPreventXhrSettings(uboSource, props, '["4117"]', true));

        expect(settings.isRequestMatched(getXhrData(`https://${props}123`))).toBe(true);
        // A text is not a regular expression, so `?` is matched as it is
        expect(settings.isRequestMatched(getXhrData(`https://${props.replace('?', '')}123`))).toBe(false);
        expect(settings.getText()).toBe('["4117"]');
        // As in uBO, the response of `json` as `responseType` is always an empty object
        expect(settings.getJsonText()).toBe('{}');
    });

    // propsToMatch, method and URL of the request, whether it is prevented
    test.each([
        ['ads method:POST', 'POST', '/ads', true],
        ['ads method:POST', 'GET', '/ads', false],
        ['ads method:!POST', 'GET', '/ads', true],
        ['!ads', 'GET', '/other', true],
        ['!ads', 'GET', '/ads', false],
        ['/ADS/i', 'GET', '/ads', true],
        // `*` is a text, as in uBO
        ['*', 'GET', '/ads', false],
        ['', 'GET', '/ads', true],
    ])('propsToMatch %j, %s %s', (props, method, url, expected) => {
        const settings = getSettings(getUboPreventXhrSettings(uboSource, props, 'x', true));
        expect(settings.isRequestMatched(getXhrData(url, method))).toBe(expected);
    });

    test('requests are logged only if both arguments are empty', () => {
        expect(getSettings(getUboPreventXhrSettings(uboSource, '', '', true)).shouldLogRequests).toBe(true);
        expect(getSettings(getUboPreventXhrSettings(uboSource, undefined, undefined, true)).shouldLogRequests)
            .toBe(true);
        expect(getSettings(getUboPreventXhrSettings(uboSource, '', 'x', true)).shouldLogRequests).toBe(false);
    });

    test('rule with an invalid regular expression is not applied', () => {
        expect(getUboPreventXhrSettings(uboSource, '/[/', 'x', true)).toBeNull();
    });

    test('response headers as in uBO', () => {
        vi.useFakeTimers();
        vi.setSystemTime(1700000000000);
        try {
            const settings = getSettings(getUboPreventXhrSettings(uboSource, 'ads', 'emptyObj', true));
            const getHeaders = settings.getResponseHeaders as NonNullable<PreventXhrSettings['getResponseHeaders']>;

            expect(getHeaders('', '{}')).toEqual([
                ['date', 'Tue, 14 Nov 2023 22:13:20 GMT'],
                ['content-type', 'text/plain'],
                ['content-length', '2'],
            ]);
            // As in uBO, the length is the one of the response converted to a string
            expect(getHeaders('json', {})).toEqual([
                ['date', 'Tue, 14 Nov 2023 22:13:20 GMT'],
                ['content-type', 'application/json'],
                ['content-length', '15'],
            ]);
            // An empty length is not returned, and neither the type of a text without a directive
            const withoutDirective = getSettings(getUboPreventXhrSettings(uboSource, 'ads', '', true));
            expect((withoutDirective.getResponseHeaders as NonNullable<PreventXhrSettings['getResponseHeaders']>)(
                'text',
                '',
            )).toEqual([['date', 'Tue, 14 Nov 2023 22:13:20 GMT']]);
        } finally {
            vi.useRealTimers();
        }
    });
});

describe('getAdgPreventXhrSettings', () => {
    test('rule without propsToMatch logs requests', () => {
        expect(getAdgPreventXhrSettings(adgSource, undefined, undefined, true).shouldLogRequests).toBe(true);
        expect(getAdgPreventXhrSettings(adgSource, '', undefined, true).shouldLogRequests).toBe(false);
    });

    test('`*` matches all requests, and the request headers are the response headers, as before', () => {
        const settings = getAdgPreventXhrSettings(adgSource, '*', 'x', true);

        expect(settings.isRequestMatched(getXhrData('/ads'))).toBe(true);
        expect(settings.getResponseHeaders).toBeNull();
    });

    test('json response is parsed from the directive, or an empty object without it', () => {
        expect(getAdgPreventXhrSettings(adgSource, 'ads', '["4117"]', true).getJsonText()).toBe('["4117"]');
        expect(getAdgPreventXhrSettings(adgSource, 'ads', undefined, true).getJsonText()).toBe('{}');
    });

    test('invalid directive is an empty text, and an empty object for json', () => {
        const settings = getAdgPreventXhrSettings(adgSource, 'ads', 'length:600000', true);

        expect(settings.getText()).toBe('');
        expect(settings.getJsonText()).toBe('{}');
    });

    test('literal text of prevent-xhr is empty', () => {
        expect(getAdgPreventXhrSettings(adgSource, 'ads', 'body', false).getText()).toBe('');
        expect(getAdgPreventXhrSettings(adgSource, 'ads', 'body', true).getText()).toBe('body');
    });
});
