/**
 * Returns the JSON request of a Cxense (Piano) site search request for JSONP, which the `cxense` resource
 * sends with `fetch()` instead, so that no code of the response is run: pages build the search query
 * with `cX.JSON.stringify()` and send it with `cX.jsonpRequest()` to `https://api.cxense.com/document/search`
 * with a `callback` parameter, without which the endpoint returns the same data as JSON.
 *
 * The URL is parsed, and its protocol, host and path must match exactly, so that the same path
 * in a parameter or in another host is not matched. The `callback` parameter, the name of a global
 * function, is removed, and the other parameters are kept as they are, i.e. not encoded again.
 *
 * @param url URL passed to `cX.jsonpRequest()`, with its callback placeholder already replaced;
 * it may be relative to the page, e.g. protocol-relative.
 * @returns URL to fetch and name of the callback, or `null` if the URL is not a search request
 * with a valid callback name.
 */
export function getCxenseSearchRequest(url: unknown): { url: string; callbackName: string } | null {
    if (typeof url !== 'string') {
        return null;
    }
    let parsed: URL;
    try {
        parsed = new URL(url, window.location.href);
    } catch (e) {
        return null;
    }
    const isSearch = (parsed.protocol === 'https:' || parsed.protocol === 'http:')
        && parsed.hostname === 'api.cxense.com'
        && parsed.port === ''
        && parsed.username === ''
        && parsed.password === ''
        && parsed.pathname === '/document/search';
    if (!isSearch) {
        return null;
    }
    let callbackName: string | null = null;
    const kept: string[] = [];
    const parts = parsed.search.slice(1).split('&');
    for (let i = 0; i < parts.length; i += 1) {
        const part = parts[i];
        if (part === '') {
            continue;
        }
        const index = part.indexOf('=');
        const key = index === -1 ? part : part.slice(0, index);
        if (key === 'callback') {
            if (callbackName === null) {
                let value = index === -1 ? '' : part.slice(index + 1);
                try {
                    value = decodeURIComponent(value);
                } catch (e) {
                    return null;
                }
                callbackName = value;
            }
        } else {
            kept.push(part);
        }
    }
    if (callbackName === null || !/^[A-Za-z_$][\w$]*$/.test(callbackName)) {
        return null;
    }
    parsed.search = kept.length > 0 ? `?${kept.join('&')}` : '';
    parsed.hash = '';
    return { url: parsed.href, callbackName };
}

/**
 * Item of a Cxense widget which the `cxense` resource shows.
 */
export type CxenseWidgetItem = {
    /**
     * URL of the recommended page, of the same site as the page.
     */
    url: string;

    /**
     * Title of the recommended page.
     */
    title: string;

    /**
     * URL of the image of the recommended page, or `null` if there is no allowed one.
     */
    image: string | null;
};

/**
 * Returns the items of a Cxense (Piano) widget which the `cxense` resource shows as a list of links,
 * from the JSON response of `https://api.cxense.com/public/widget/data`. Only data of the response
 * is used, i.e. neither its `template`, which is code, nor its `style`, nor the `click_url` of an item.
 *
 * Only recommended pages of the same site are returned. An item is skipped if it:
 * - is placed by hand, i.e. has a `slot`, as sponsored items are,
 * - has a `type` for which the library shows nothing, e.g. `free` or `abTest`, or keeps the content
 *   of the page, i.e. `ctrl`,
 * - has no `title` or `recs-rawtitle`, as banners,
 * - has no `url` of the same site as the page, with the `http:` or `https:` protocol and no credentials.
 *
 * A host is of the same site only if it is the host of the page, without `www.`, or its subdomain;
 * `www.` is not removed from a host with one more label only, e.g. `www.com`, and a host with a trailing dot,
 * i.e. a fully qualified domain name, e.g. `www.com.`, is the same host as without it.
 * There is no list of public suffixes here, and guessing the registrable domain of a host would take
 * unrelated sites of one suffix for the same site, e.g. `a.github.io` and `b.github.io`, so hosts
 * with another subdomain of the same domain, or with its parent domain, are not of the same site.
 *
 * The image of an item is its `og-image` or `dominantimage`, if it is of the same site, or of a host
 * from which the page already shows images, and never of Cxense, e.g. `dominantthumbnail`.
 *
 * @param data Parsed response.
 * @param pageUrl URL of the page.
 * @param imageHosts Hosts of the images of the page.
 * @returns Items to show, at most 30.
 */
export function getCxenseWidgetItems(
    data: unknown,
    pageUrl: string,
    imageHosts: string[] = [],
): CxenseWidgetItem[] {
    const MAX_ITEMS = 30;
    // types of `cX.CCE._isEmptyType()` of cx.cce.js, and the control variant of a test
    const SKIPPED_TYPES = ['noImpact', 'noVisual', 'free', 'abTest', 'piano', 'ctrl'];
    const IMAGE_FIELDS = ['og-image', 'dominantimage'];
    // also as a fully qualified domain name, i.e. with a trailing dot
    const CXENSE_HOST_REGEXP = /(^|\.)(cxense|cxpublic)\.com\.?$/;

    const result: CxenseWidgetItem[] = [];
    let page: URL;
    try {
        page = new URL(pageUrl);
    } catch (e) {
        return result;
    }
    const items = data && typeof data === 'object' ? (data as Record<string, unknown>).items : null;
    if (!Array.isArray(items)) {
        return result;
    }

    const hasOwn = (obj: unknown, key: string): boolean => Object.prototype.hasOwnProperty.call(obj, key);
    // a host written as a fully qualified domain name, i.e. with a trailing dot, is the same host,
    // e.g. `www.com.`, which would be `com.` without `www.` otherwise
    const withoutTrailingDot = (hostname: string): string => {
        return hostname.slice(-1) === '.' ? hostname.slice(0, -1) : hostname;
    };
    // `www.` is kept if the rest is a single label, e.g. `www.com`, as otherwise each host
    // with that suffix would be of the same site
    const withoutWww = (hostname: string): string => {
        return hostname.indexOf('www.') === 0 && hostname.indexOf('.', 4) !== -1 ? hostname.slice(4) : hostname;
    };
    const pageHost = withoutWww(withoutTrailingDot(page.hostname));
    const pageImageHosts = imageHosts.map(withoutTrailingDot);
    // `www.` of the host is its subdomain, so only the one of the page is removed
    const isSameSite = (hostname: string): boolean => {
        const host = withoutTrailingDot(hostname);
        return pageHost !== ''
            && (host === pageHost || host.slice(-pageHost.length - 1) === `.${pageHost}`);
    };
    const isImageHost = (hostname: string): boolean => {
        return !CXENSE_HOST_REGEXP.test(hostname)
            && (isSameSite(hostname) || pageImageHosts.indexOf(withoutTrailingDot(hostname)) !== -1);
    };

    /**
     * Returns the URL if it is an HTTP one without credentials and its host is allowed.
     *
     * @param value Value of the item.
     * @param isAllowedHost Function which checks the host.
     * @param isImage If `http:` is allowed only on a page with this protocol.
     * @returns URL, or `null`.
     */
    const getUrl = (value: unknown, isAllowedHost: (hostname: string) => boolean, isImage: boolean) => {
        if (typeof value !== 'string' || value === '') {
            return null;
        }
        let parsed: URL;
        try {
            parsed = new URL(value, page.href);
        } catch (e) {
            return null;
        }
        const isHttp = parsed.protocol === 'http:' && (!isImage || page.protocol === 'http:');
        if ((parsed.protocol !== 'https:' && !isHttp)
            || parsed.username !== ''
            || parsed.password !== ''
            || parsed.hostname === ''
            || !isAllowedHost(parsed.hostname)) {
            return null;
        }
        return parsed.href;
    };
    const getTitle = (item: Record<string, unknown>): string => {
        const title = typeof item.title === 'string' ? item.title.trim() : '';
        if (title !== '') {
            return title;
        }
        return typeof item['recs-rawtitle'] === 'string' ? item['recs-rawtitle'].trim() : '';
    };

    for (let i = 0; i < items.length && result.length < MAX_ITEMS; i += 1) {
        const item = items[i] as Record<string, unknown>;
        if (!item || typeof item !== 'object') {
            continue;
        }
        if ((hasOwn(item, 'slot') && item.slot !== undefined && item.slot !== null)
            || SKIPPED_TYPES.indexOf(item.type as string) !== -1) {
            continue;
        }
        const title = getTitle(item);
        const url = getUrl(item.url, isSameSite, false);
        if (title === '' || url === null) {
            continue;
        }
        let image: string | null = null;
        for (let j = 0; j < IMAGE_FIELDS.length && image === null; j += 1) {
            image = getUrl(item[IMAGE_FIELDS[j]], isImageHost, true);
        }
        result.push({ url, title, image });
    }
    return result;
}
