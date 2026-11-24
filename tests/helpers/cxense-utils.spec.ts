import { describe, expect, test } from 'vitest';

import { getCxenseSearchRequest, getCxenseWidgetItems } from '../../src/helpers/cxense-utils';

const SEARCH = 'https://api.cxense.com/document/search';

describe('getCxenseSearchRequest', () => {
    test.each([
        // search requests of pages, e.g. nikkansports.com and itmedia.co.jp
        [
            `${SEARCH}?callback=cXJsonpCB1&persisted=abc&json=%7B%22q%22%3A%22a%20b%22%7D`,
            `${SEARCH}?persisted=abc&json=%7B%22q%22%3A%22a%20b%22%7D`,
            'cXJsonpCB1',
        ],
        [
            `${SEARCH}?persisted=abc&callback=_cxSearchCallback&json=%7B%7D`,
            `${SEARCH}?persisted=abc&json=%7B%7D`,
            '_cxSearchCallback',
        ],
        [`${SEARCH}?json=%7B%7D&callback=$cb`, `${SEARCH}?json=%7B%7D`, '$cb'],
        [`${SEARCH}?callback=cb`, SEARCH, 'cb'],
        // encoded callback name, other parameters kept as they are
        [`${SEARCH}?callback=_cx%53&json=a+b%2Bc`, `${SEARCH}?json=a+b%2Bc`, '_cxS'],
        // the first callback is used, all are removed
        [`${SEARCH}?callback=first&json=1&callback=second`, `${SEARCH}?json=1`, 'first'],
        // hash is not sent
        [`${SEARCH}?callback=cb&json=1#hash`, `${SEARCH}?json=1`, 'cb'],
        ['http://api.cxense.com/document/search?callback=cb', 'http://api.cxense.com/document/search', 'cb'],
        // protocol-relative, with the protocol of the page
        [
            '//api.cxense.com/document/search?callback=cb',
            `${window.location.protocol}//api.cxense.com/document/search`,
            'cb',
        ],
        ['HTTPS://API.CXENSE.COM/document/search?callback=cb', SEARCH, 'cb'],
    ])('%s → %s, %s', (url, expectedUrl, expectedCallback) => {
        expect(getCxenseSearchRequest(url)).toEqual({ url: expectedUrl, callbackName: expectedCallback });
    });

    test.each([
        // without a valid callback name
        SEARCH,
        `${SEARCH}?json=%7B%7D`,
        `${SEARCH}?callback=&json=1`,
        `${SEARCH}?callback`,
        `${SEARCH}?callback=a.b`,
        `${SEARCH}?callback=a-b`,
        `${SEARCH}?callback=1a`,
        `${SEARCH}?callback=alert(1)`,
        `${SEARCH}?callback=%E0%A4%A`,
        // other endpoints of Cxense
        'https://api.cxense.com/profile/user/segment?callback=cb',
        'https://api.cxense.com/segment/lookup?callback=cb',
        'https://api.cxense.com/public/widget/data?json=%7B%7D&callback=cb',
        'https://api.cxense.com/persisted/execute?json=%7B%7D&callback=cb',
        'https://api.cxense.com/document/search/other?callback=cb',
        'https://api.cxense.com/document/searchx?callback=cb',
        'https://api.cxense.com/Document/Search?callback=cb',
        'https://id.cxense.com/document/search?callback=cb',
        // the path or the host elsewhere
        `https://example.org/?url=${SEARCH}&callback=cb`,
        `https://example.org/?callback=cb#${SEARCH}`,
        'https://example.org/document/search?callback=cb',
        'https://api.cxense.com.example.org/document/search?callback=cb',
        'https://example.org.api.cxense.com/document/search?callback=cb',
        'https://api.cxense.com@example.org/document/search?callback=cb',
        'https://user@api.cxense.com/document/search?callback=cb',
        'https://api.cxense.com:8443/document/search?callback=cb',
        '/document/search?callback=cb',
        // other protocols and invalid values
        // eslint-disable-next-line no-script-url
        'javascript:alert(1)//api.cxense.com/document/search?callback=cb',
        'data:text/javascript,api.cxense.com/document/search?callback=cb',
        'ftp://api.cxense.com/document/search?callback=cb',
        'https://',
        '',
    ])('%s → null', (url) => {
        expect(getCxenseSearchRequest(url)).toBeNull();
    });

    test('a value which is not a string is not a search request', () => {
        expect(getCxenseSearchRequest(undefined)).toBeNull();
        expect(getCxenseSearchRequest(null)).toBeNull();
        expect(getCxenseSearchRequest({ toString: () => `${SEARCH}?callback=cb` })).toBeNull();
    });
});

describe('getCxenseWidgetItems', () => {
    const PAGE = 'https://www.example.org/news/1.html';
    const article = (extra: Record<string, unknown> = {}) => ({
        id: '781682883829c4d42d19e574e6a1994e98727de4',
        title: 'Article',
        url: 'https://www.example.org/articles/1',
        click_url: 'http://api.cxense.com/public/widget/click/abc',
        ...extra,
    });
    const urlsOf = (items: unknown[], page = PAGE) => getCxenseWidgetItems({ items }, page).map((item) => item.url);

    test('returns the title, the URL and the image of recommended pages', () => {
        const data = {
            items: [
                article({ 'og-image': 'https://www.example.org/images/1.jpg' }),
                // as a search widget, whose items have no id
                { _type: 'search', title: ' Program ', url: 'https://www.example.org/program/2' },
                { 'recs-rawtitle': 'Raw title', title: '', url: 'https://www.example.org/articles/3' },
            ],
            template: '<!--% window.pwned = 1; %-->',
            style: 'body { display: none }',
            prnd: 'abc',
        };
        expect(getCxenseWidgetItems(data, PAGE)).toEqual([
            { url: 'https://www.example.org/articles/1', title: 'Article', image: 'https://www.example.org/images/1.jpg' },
            { url: 'https://www.example.org/program/2', title: 'Program', image: null },
            { url: 'https://www.example.org/articles/3', title: 'Raw title', image: null },
        ]);
    });

    test('skips items placed by hand, items which are not shown by the library, and items without a title', () => {
        const items = [
            // sponsored item of president.jp
            {
                slot: '1',
                'recs-rawtitle': 'Sponsored',
                'pst-show-ad': 'Sponsored',
                url: 'https://www.example.org/articles/10?cx_referrertype=pan',
            },
            article({ slot: 0, url: 'https://www.example.org/articles/11' }),
            // brand channel and banner of businessinsider.jp
            { 'article-sponsored': 'Company', 'article1-title': 'Title', url: 'https://www.example.org/special' },
            { templateName: 'banner-ad', banner: 'https://content.cxpublic.com/a', url: 'https://www.example.org/member' },
            // promos without a link
            { type: 'free', campaign: '1' },
            { type: 'abTest' },
            article({ type: 'free', url: 'https://www.example.org/articles/12' }),
            article({ type: 'noImpact', url: 'https://www.example.org/articles/13' }),
            article({ type: 'noVisual', url: 'https://www.example.org/articles/14' }),
            article({ type: 'piano', url: 'https://www.example.org/articles/15' }),
            article({ type: 'ctrl', url: 'https://www.example.org/articles/16' }),
            article({ title: '   ', url: 'https://www.example.org/articles/17' }),
            article({ title: 1, 'recs-rawtitle': null, url: 'https://www.example.org/articles/18' }),
            null,
            'https://www.example.org/articles/19',
            [article()],
            // kept
            article({ slot: null, url: 'https://www.example.org/articles/20' }),
            article({ type: 'other', url: 'https://www.example.org/articles/21' }),
        ];
        expect(urlsOf(items)).toEqual([
            'https://www.example.org/articles/20',
            'https://www.example.org/articles/21',
        ]);
    });

    test.each([
        ['https://www.example.org/a', true],
        ['https://example.org/a', true],
        ['http://www.example.org/a', true],
        ['https://sport.example.org/a', true],
        ['https://a.b.example.org/a', true],
        ['//www.example.org/a', true],
        ['/a?b=1#c', true],
        ['https://WWW.EXAMPLE.ORG/a', true],
        ['https://www.example.org:8443/a', true],
        // other sites
        ['https://example.com/a', false],
        ['https://www.example.org.evil.com/a', false],
        ['https://evil-example.org/a', false],
        ['https://example.org.evil.com/?https://www.example.org/', false],
        ['https://org/a', false],
        ['https://api.cxense.com/public/widget/click/abc', false],
        // credentials, other protocols and invalid values
        ['https://www.example.org@evil.com/a', false],
        ['https://user@www.example.org/a', false],
        ['https://user:password@www.example.org/a', false],
        // eslint-disable-next-line no-script-url
        ['javascript:alert(1)//www.example.org/', false],
        ['data:text/html,https://www.example.org/', false],
        ['ftp://www.example.org/a', false],
        ['https://', false],
        ['', false],
        [undefined, false],
        [{ toString: (): string => 'https://www.example.org/a' }, false],
    ])('item with the URL %s on www.example.org: %s', (url, expected) => {
        expect(urlsOf([article({ url })]).length).toBe(expected ? 1 : 0);
    });

    test.each([
        // page host, host of the item, same site: only the host of the page, without `www.`, and its subdomains
        ['example.org', 'www.example.org', true],
        ['www.example.org', 'example.org', true],
        ['www.example.org', 'sport.example.org', true],
        ['example.org', 'a.b.example.org', true],
        ['style.example.org', 'style.example.org', true],
        ['style.example.org', 'a.style.example.org', true],
        ['www.tv-tokyo.co.jp', 'txbiz.tv-tokyo.co.jp', true],
        ['df.cl', 'noticias.df.cl', true],
        ['localhost', 'localhost', true],
        ['localhost', 'example.localhost', true],
        ['127.0.0.1', '127.0.0.1', true],
        // the parent domain and other subdomains of it: the registrable domain is not guessed
        ['style.example.org', 'example.org', false],
        ['style.example.org', 'www.example.org', false],
        ['a.example.org', 'b.example.org', false],
        ['s.response.jp', 'response.jp', false],
        ['news.example.co.uk', 'example.co.uk', false],
        ['noticias.df.cl', 'deportes.df.cl', false],
        // unrelated sites of one public suffix
        ['victim.github.io', 'other.github.io', false],
        ['victim.github.io', 'github.io', false],
        ['a.blogspot.com', 'b.blogspot.com', false],
        ['www.example.co.uk', 'other.co.uk', false],
        ['example.co.uk', 'co.uk', false],
        ['www.example.com.ar', 'other.com.ar', false],
        ['school1.school.nz', 'school2.school.nz', false],
        ['president.jp', 'president.ismcdn.jp', false],
        ['www.example.org', 'example.net', false],
        ['www.example.org', 'wwwexample.org', false],
        ['127.0.0.1', '127.0.0.2', false],
        ['10.0.0.1', '11.0.0.1', false],
        ['example.org', 'localhost', false],
        // `www.` of a host with one more label is not removed, as each host of the suffix would match
        ['www.com', 'www.com', true],
        ['www.com', 'a.www.com', true],
        ['www.com', 'evil.com', false],
        ['www.com', 'com', false],
        ['www.localhost', 'localhost', false],
        // a trailing dot, i.e. a fully qualified domain name, is the same host
        ['www.com.', 'publisher.com.', false],
        ['www.com.', 'publisher.com', false],
        ['www.com.', 'com.', false],
        ['www.com.', 'www.com', true],
        ['www.example.org.', 'example.org', true],
        ['www.example.org.', 'news.example.org.', true],
        ['example.org', 'example.org.', true],
        ['example.org.', 'other.org.', false],
    ])('page %s, item %s: same site %s', (pageHost, itemHost, expected) => {
        const data = { items: [article({ url: `https://${itemHost}/a`, 'og-image': `https://${itemHost}/a.jpg` })] };
        const items = getCxenseWidgetItems(data, `https://${pageHost}/`);
        expect(items).toEqual(expected ? [{ url: `https://${itemHost}/a`, title: 'Article', image: `https://${itemHost}/a.jpg` }] : []);
        // an image of such a host is not requested for an item of the page's host either
        const image = { items: [article({ url: `https://${pageHost}/a`, 'og-image': `https://${itemHost}/a.jpg` })] };
        expect(getCxenseWidgetItems(image, `https://${pageHost}/`)[0].image).toBe(expected ? `https://${itemHost}/a.jpg` : null);
    });

    test.each([
        // the first allowed image of `og-image` and `dominantimage`
        [{ 'og-image': 'https://www.example.org/og.jpg', dominantimage: 'https://www.example.org/d.jpg' }, [], '/og.jpg'],
        [{ dominantimage: 'https://img.example.org/d.jpg' }, [], 'https://img.example.org/d.jpg'],
        [{ 'og-image': 'https://cdn.example.net/og.jpg', dominantimage: 'https://www.example.org/d.jpg' }, [], '/d.jpg'],
        // a host of the images of the page
        [{ 'og-image': 'https://cdn.example.net/og.jpg' }, ['cdn.example.net'], 'https://cdn.example.net/og.jpg'],
        [{ 'og-image': 'https://cdn.example.net/og.jpg' }, ['other.example.net'], null],
        [{ 'og-image': 'https://sub.cdn.example.net/og.jpg' }, ['cdn.example.net'], null],
        // never of Cxense, also if the page shows its images
        [
            { 'og-image': 'https://content-thumbnail.cxpublic.com/content/dominantthumbnail/1.jpg' },
            ['content-thumbnail.cxpublic.com'],
            null,
        ],
        [{ dominantimage: 'https://cdn.cxense.com/1.jpg' }, ['cdn.cxense.com'], null],
        // also with a trailing dot, i.e. as a fully qualified domain name
        [
            { 'og-image': 'https://content-thumbnail.cxpublic.com./content/dominantthumbnail/1.jpg' },
            ['content-thumbnail.cxpublic.com.'],
            null,
        ],
        [{ dominantimage: 'https://cdn.cxense.com./1.jpg' }, ['cdn.cxense.com.'], null],
        // a host of the images of the page, with or without a trailing dot
        [{ 'og-image': 'https://cdn.example.net./og.jpg' }, ['cdn.example.net'], 'https://cdn.example.net./og.jpg'],
        [{ 'og-image': 'https://cdn.example.net/og.jpg' }, ['cdn.example.net.'], 'https://cdn.example.net/og.jpg'],
        // other fields are not used
        [{ dominantthumbnail: 'https://www.example.org/t.jpg', 'pst-square-image': 'https://www.example.org/s.jpg' }, [], null],
        // not an HTTPS URL without credentials
        [{ 'og-image': 'http://www.example.org/og.jpg' }, [], null],
        [{ 'og-image': 'https://user@www.example.org/og.jpg' }, [], null],
        [{ 'og-image': 'data:image/png;base64,AAAA' }, [], null],
        // eslint-disable-next-line no-script-url
        [{ 'og-image': 'javascript:alert(1)' }, [], null],
        [{ 'og-image': 1 }, [], null],
        [{}, [], null],
    ])('image of %j with the page hosts %j: %s', (fields, imageHosts, expected) => {
        const items = getCxenseWidgetItems({ items: [article(fields)] }, PAGE, imageHosts);
        const image = typeof expected === 'string' && expected[0] === '/' ? `https://www.example.org${expected}` : expected;
        expect(items).toEqual([{ url: 'https://www.example.org/articles/1', title: 'Article', image }]);
    });

    test('an image with the http protocol is allowed only on a page with it', () => {
        const data = { items: [article({ 'og-image': 'http://www.example.org/og.jpg', url: '/a' })] };
        expect(getCxenseWidgetItems(data, 'http://www.example.org/')[0].image).toBe('http://www.example.org/og.jpg');
        expect(getCxenseWidgetItems(data, 'https://www.example.org/')[0].image).toBeNull();
    });

    test('returns at most 30 items', () => {
        const items = [];
        for (let i = 0; i < 40; i += 1) {
            items.push(article({ url: `https://www.example.org/articles/${i}` }));
        }
        items.splice(5, 0, article({ slot: '1' }));
        const result = getCxenseWidgetItems({ items }, PAGE);
        expect(result.length).toBe(30);
        expect(result[29].url).toBe('https://www.example.org/articles/29');
    });

    test.each([
        null,
        undefined,
        '',
        '{"items":[]}',
        [],
        {},
        { items: null },
        { items: {} },
        { items: 'items' },
        // the JSONP response is not the one of the request
        { httpStatus: 200, response: { items: [{ title: 'Article', url: 'https://www.example.org/a' }] } },
        { error: 'Invalid widget id' },
    ])('no items for %j', (data) => {
        expect(getCxenseWidgetItems(data, PAGE)).toEqual([]);
    });

    test('no items for an invalid URL of the page', () => {
        expect(getCxenseWidgetItems({ items: [article()] }, '')).toEqual([]);
        expect(getCxenseWidgetItems({ items: [article({ url: '/a' })] }, 'about:blank')).toEqual([]);
    });
});
