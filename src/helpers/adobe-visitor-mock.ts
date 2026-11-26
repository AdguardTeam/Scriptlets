/* eslint-disable no-underscore-dangle */
// `_c` is a property of instances in `s_c_il`, which AppMeasurement and `Visitor.getInstance()` read.
import { noopFunc } from './noop-utils';
import { runProtected } from './run-protected';

type PlainRecord = Record<string, unknown>;

/**
 * Creates an instance of the mock of `Visitor` of the Experience Cloud Identity Service of Adobe,
 * as `Visitor.getInstance()` of `mockAdobeVisitor()` returns it, but not registered in `s_c_il`,
 * and without the cookie of the organization, e.g. for `_satellite.getVisitorId()` of a mock of Adobe Tags,
 * whose organization is not known.
 * Ids are empty strings, also in the callbacks, which are called asynchronously, as the library does
 * once its requests have failed, and URLs are returned unchanged.
 * As the library, the opt-out of the visitor saved in the `AMCV_<orgId>` cookie of the organization, e.g. by
 * the library on a previous visit, is honored, also if it is saved after the instance is created,
 * see `readSavedOptOut()`; otherwise the opt-out is `NONE`, as the library when the visitor has not opted out.
 *
 * Requires `noopFunc()` and `runProtected()` to be injected as well.
 *
 * @param orgId Organization id, e.g. `ABC@AdobeOrg`.
 * @param config Configuration of the page, copied to the instance, e.g. its `loadTimeout`.
 * @param prototype Prototype of the instance, e.g. of `Visitor`, so that it is an instance of it.
 * @returns Visitor instance.
 */
export function createAdobeVisitorInstance(orgId: string, config?: unknown, prototype?: object): PlainRecord {
    const FIELDS = ['MCMID', 'MCOPTOUT', 'MCAID', 'MCAAMLH', 'MCAAMB'];

    /**
     * Calls a callback of the page asynchronously, as the library does once its requests have failed.
     * As the library, the callback may be a function or a `[receiver, function]` pair.
     *
     * @param callback Callback of the page.
     * @param args Arguments of the callback.
     */
    const callLater = (callback: unknown, args: unknown[]) => {
        if (typeof callback === 'function') {
            window.setTimeout(() => runProtected(callback, args), 0);
        } else if (Array.isArray(callback) && typeof callback[1] === 'function') {
            const receiver = callback[0];
            const fn = callback[1];
            window.setTimeout(() => runProtected(fn, args, receiver), 0);
        }
    };

    /**
     * Returns an empty id as the getters of the library, and passes it to their optional callback.
     *
     * @param callback Optional callback of the page.
     * @returns Empty id.
     */
    const emptyId = (callback?: unknown): string => {
        callLater(callback, ['']);
        return '';
    };

    /**
     * Returns the opt-out saved in the `AMCV_<orgId>` cookie, as `_readVisitor()` of the library reads it:
     * the cookie, whose name is encoded, has `key|value` pairs, possibly after a number, i.e. a digest
     * of the settings, and a key may have an expiry, `<key>-<seconds>`, or `<key>-<seconds>s` which also
     * expires with the session, i.e. without the `AMCVS_<orgId>` cookie. An expired value is ignored.
     * As the library, the names of the configuration are used, i.e. `cookieName` and `sessionCookieName`,
     * and with `useLocalStorage` the values are read from `localStorage` and `sessionStorage` instead.
     * Unlike the library, the digest is not checked, as the settings of the site are not known,
     * so that a saved opt-out is honored. Nothing is written.
     *
     * @param cookieName Name of the cookie of the organization.
     * @param sessionCookieName Name of its session cookie.
     * @param useLocalStorage Whether the values are in the storages instead of cookies.
     * @returns Saved opt-out, e.g. `global` or a list of scopes, or `null` if there is none.
     */
    const readSavedOptOut = (
        cookieName: string,
        sessionCookieName: string,
        useLocalStorage: boolean,
    ): string | null => {
        const getCookie = (name: string): string | null => {
            const prefix = `${encodeURIComponent(name)}=`;
            const cookies = window.document.cookie.split(';');
            for (let i = 0; i < cookies.length; i += 1) {
                const cookie = cookies[i].trim();
                if (cookie.indexOf(prefix) === 0) {
                    return decodeURIComponent(cookie.slice(prefix.length));
                }
            }
            return null;
        };
        // as `cookieRead()` of the library
        const read = (name: string): string | null => {
            if (!useLocalStorage) {
                return getCookie(name);
            }
            return name === sessionCookieName ? window.sessionStorage.getItem(name) : window.localStorage.getItem(name);
        };
        try {
            const value = read(cookieName);
            if (!value) {
                return null;
            }
            const parts = value.split('|');
            if (/^[-0-9]+$/.test(parts[0])) {
                parts.shift();
            }
            for (let i = 0; i + 1 < parts.length; i += 2) {
                const key = parts[i].split('-');
                if (key[0] === 'MCOPTOUT' && parts[i + 1]) {
                    if (key.length > 1) {
                        const expiry = parseInt(key[1], 10);
                        const isSession = key[1].indexOf('s') > 0;
                        if (Date.now() >= expiry * 1000 || (isSession && !read(sessionCookieName))) {
                            return null;
                        }
                    }
                    return parts[i + 1];
                }
            }
        } catch (e) {
            // cookies or storages may not be available, e.g. in a sandboxed frame, or the cookie cannot be decoded
        }
        return null;
    };

    const visitor: PlainRecord = prototype ? Object.create(prototype) : {};
    // default, which the configuration may change, as in the library; the names of the cookies are set below
    visitor.loadTimeout = 30000;
    // the values of the configuration, each read once
    let configValues: PlainRecord = {};
    if (config && typeof config === 'object') {
        // as the library, a copy, whose settings may be changed by the page, see `getInstance()` of the mock;
        // each value is read once here, as a getter of the page may fail on the next read
        const configs = Object.create(null);
        Object.keys(config).forEach((key) => {
            const value = (config as PlainRecord)[key];
            visitor[key] = value;
            configs[key] = value;
        });
        visitor.configs = configs;
        configValues = configs;
    }
    visitor._c = 'Visitor';
    visitor.version = '5.5.0';
    visitor.marketingCloudOrgID = orgId;
    /**
     * Returns a name of a cookie of the configuration, as it has been read, if it is a non-empty string,
     * otherwise the default one, as the library, so neither a name inherited from the prototype of the instance,
     * nor a setter of the prototype which stores the name of the configuration elsewhere, e.g. set by the page,
     * changes the cookie which is read.
     *
     * @param name Name of the setting, e.g. `cookieName`.
     * @param defaultValue Default name.
     * @returns Name of the cookie.
     */
    const getCookieName = (name: string, defaultValue: string): string => {
        const value = Object.prototype.hasOwnProperty.call(configValues, name) ? configValues[name] : undefined;
        return typeof value === 'string' && value !== '' ? value : defaultValue;
    };
    /**
     * Sets the name of a cookie on the instance and returns the name which the instance has then, as the library
     * reads it from the instance, e.g. after a setter of `Visitor.prototype`, set by the page, has changed it.
     *
     * @param name Name of the setting, e.g. `cookieName`.
     * @param value Name of the cookie.
     * @returns Name of the cookie of the instance, or `value` if it is not a non-empty string.
     */
    const setCookieName = (name: string, value: string): string => {
        visitor[name] = value;
        const current = visitor[name];
        return typeof current === 'string' && current !== '' ? current : value;
    };
    const cookieName = setCookieName('cookieName', getCookieName('cookieName', `AMCV_${orgId}`));
    const sessionCookieName = setCookieName(
        'sessionCookieName',
        getCookieName('sessionCookieName', `AMCVS_${orgId}`),
    );
    // as the library reads a boolean setting: a function is called, and the strings `true` and `false`
    // are booleans; any other value which is truthy enables it, e.g. `1`
    let useLocalStorageValue = visitor.useLocalStorage;
    if (typeof useLocalStorageValue === 'function') {
        try {
            useLocalStorageValue = useLocalStorageValue();
        } catch (e) {
            useLocalStorageValue = false;
        }
    }
    if (useLocalStorageValue === 'true') {
        useLocalStorageValue = true;
    } else if (useLocalStorageValue === 'false') {
        useLocalStorageValue = false;
    }
    if (visitor.useLocalStorage !== undefined) {
        visitor.useLocalStorage = useLocalStorageValue;
    }
    const useLocalStorage = !!useLocalStorageValue;
    // the opt-out which has been read, kept as the library keeps it once it is read
    let knownOptOut = 'NONE';
    /**
     * Returns the opt-out of the visitor: the saved one, otherwise `NONE`.
     * It is read when the instance is created, as by the library, and on each call, while the library reads it
     * once, so that an opt-out saved later on the page is honored as well, e.g. by another copy of the library,
     * or before the consent of the visitor is given, which is when the library reads it if opt-in applies.
     * As in the library, an opt-out which has been read is kept while the page is open, also if its cookie
     * expires, is removed or is replaced by a narrower one: scopes are only added, each of them once.
     *
     * @returns Opt-out, e.g. `global`, a list of scopes or `NONE`.
     */
    const getSavedOptOut = (): string => {
        const saved = readSavedOptOut(cookieName, sessionCookieName, useLocalStorage);
        if (saved && saved !== 'NONE' && knownOptOut !== 'global') {
            if (saved === 'global' || knownOptOut === 'NONE') {
                knownOptOut = saved;
            } else {
                const scopes = knownOptOut.split(',');
                saved.split(',').forEach((scope) => {
                    if (scopes.indexOf(scope) === -1) {
                        scopes.push(scope);
                    }
                });
                knownOptOut = scopes.join(',');
            }
        }
        return knownOptOut;
    };
    // as the library, which reads it when the instance is created, unless the consent of the visitor is pending
    getSavedOptOut();

    /**
     * Checks whether the visitor has opted out of a scope, as `isOptedOut()` of the library.
     *
     * @param scope Scope, `global` by default.
     * @returns `true` if the visitor has opted out.
     */
    const isOptedOutOf = (scope?: unknown): boolean => {
        const name = scope ? String(scope) : 'global';
        const optOut = getSavedOptOut();
        return optOut === 'global' || optOut.indexOf(name) >= 0;
    };
    visitor.FIELDS = {};
    FIELDS.forEach((field) => {
        (visitor.FIELDS as PlainRecord)[field] = field;
    });
    const customerIds: PlainRecord = {};

    visitor.getMarketingCloudVisitorID = emptyId;
    visitor.getAnalyticsVisitorID = emptyId;
    visitor.getAudienceManagerLocationHint = emptyId;
    visitor.getAudienceManagerBlob = emptyId;
    visitor.getLocationHint = emptyId;
    visitor.getOptOut = (callback?: unknown): string => {
        const optOut = getSavedOptOut();
        callLater(callback, [optOut]);
        return optOut;
    };
    // no supplemental data id is generated
    visitor.getSupplementalDataID = () => '';
    visitor.getVisitorValues = (callback: unknown, fields?: unknown) => {
        const values: PlainRecord = {};
        (Array.isArray(fields) ? fields : FIELDS).forEach((field) => {
            // as the library, the opt-out is a boolean, of the global scope
            values[String(field)] = field === 'MCOPTOUT' ? isOptedOutOf() : '';
        });
        callLater(callback, [values]);
    };
    visitor.isOptedOut = (callback?: unknown, scope?: unknown) => {
        const isOptedOut = isOptedOutOf(scope);
        callLater(callback, [isOptedOut]);
        return isOptedOut;
    };
    visitor.isAllowed = () => true;
    visitor.isClientSideMarketingCloudVisitorID = () => null;
    visitor.getCustomerIDs = () => {
        const copy: PlainRecord = {};
        Object.keys(customerIds).forEach((key) => {
            const entry = customerIds[key] as PlainRecord;
            copy[key] = { id: entry.id, authState: entry.authState };
        });
        return copy;
    };
    // As the library, ids are added to the previous ones, as `{ id, authState }`,
    // and a string is an id with the unknown authentication state.
    visitor.setCustomerIDs = (ids: unknown) => {
        if (!ids || typeof ids !== 'object') {
            return;
        }
        Object.keys(ids).forEach((key) => {
            const value = (ids as PlainRecord)[key];
            if (value && typeof value === 'object') {
                const { authState } = value as PlainRecord;
                customerIds[key] = {
                    id: (value as PlainRecord).id,
                    authState: authState === undefined ? 0 : authState,
                };
            } else if (value !== undefined && value !== null) {
                customerIds[key] = { id: value, authState: 0 };
            }
        });
    };
    // no ids are appended
    visitor.appendVisitorIDsTo = (url: unknown) => url;
    visitor.appendSupplementalDataIDTo = (url: unknown) => url;
    visitor.cookieRead = () => '';
    visitor.cookieWrite = () => false;
    [
        'init',
        'resetState',
        'removeCookie',
        'idSyncByURL',
        'idSyncByDataSource',
        'idSyncGetOnPageSyncInfo',
        'publishDestinations',
        'setAsCoopSafe',
        'setAsCoopUnsafe',
        'setMarketingCloudVisitorID',
        'setAnalyticsVisitorID',
        'syncIdentity',
        'onReceiveEcid',
        'MCIDCallTimedOut',
        'AnalyticsIDCallTimedOut',
        'AAMIDCallTimedOut',
    ].forEach((name) => {
        visitor[name] = noopFunc;
    });

    return visitor;
}

/**
 * Returns the domain of the `adobeujs-optin` cookie, in which the Visitor API stores the decision of the visitor,
 * as the library chooses it, so that a decision stored by a mock replaces the one which the library has stored,
 * e.g. on another page or another subdomain of the site, instead of being stored next to it:
 * the domain of the configuration, i.e. `optInCookieDomain`, otherwise `cookieDomain`, otherwise the widest domain
 * of the host of the page on which a cookie can be set, e.g. `example.org` on `www.example.org`.
 * As `getDomain()` of the library, the widest domain is found by setting a test cookie on each domain of the host,
 * from the widest one without its top-level domain, which the browser refuses for a public suffix, e.g. `co.uk`,
 * so the registrable domain is not guessed; the test cookie is removed at once.
 *
 * @param configuredDomain Domain of the configuration, if any.
 * @returns Domain for the cookie, or an empty string for a cookie of the host of the page only, also if
 * the domain is the host itself, as by the library.
 */
export function getAdobeOptInCookieDomain(configuredDomain?: unknown): string {
    // as the library, but with a random suffix, so that it is not a cookie of the page
    const TEST_COOKIE_NAME = `TEST_AMCV_COOKIE_WRITE_${Math.random().toString(36).slice(2, 9)}`;
    const { hostname } = window.location;
    let domain = configuredDomain ? String(configuredDomain) : '';
    if (domain === '') {
        const labels = hostname.split('.');
        for (let i = labels.length - 2; i >= 0 && domain === ''; i -= 1) {
            const candidate = labels.slice(i).join('.');
            try {
                window.document.cookie = `${TEST_COOKIE_NAME}=cookie; path=/; domain=${candidate};`;
                if (`; ${window.document.cookie};`.indexOf(`; ${TEST_COOKIE_NAME}=cookie;`) !== -1) {
                    const expires = 'expires=Thu, 01 Jan 1970 00:00:01 GMT';
                    window.document.cookie = `${TEST_COOKIE_NAME}=; path=/; ${expires}; domain=${candidate};`;
                    domain = candidate;
                }
            } catch (e) {
                // cookies may not be available, e.g. in a sandboxed frame
                return '';
            }
        }
    }
    return domain === hostname ? '' : domain;
}

/**
 * Installs a mock of the Experience Cloud Identity Service of Adobe, `VisitorAPI.js`, as version 5.5 behaves
 * when its requests are blocked, but without any visitor id: the `Visitor` global with `Visitor.getInstance()`
 * and `adobe.OptInCategories`, each only if it is missing; `adobe.optIn` is created by the first
 * `getInstance()` call, as by the library, or at once with `isOptInCreated`, as by the library of Adobe Tags,
 * whose Experience Cloud ID extension calls `getInstance()` when it is loaded.
 * The opt-in service follows the configuration of the first `getInstance()` call, as the library:
 * with `doesOptInApply`, only the categories of `preOptInApprovals` and of `previousPermissions`, i.e. of the saved
 * decision of the visitor, are approved until the page approves the other ones, e.g. by its consent manager,
 * otherwise all categories are approved. With `isOptInStorageEnabled`, the decision which the library has stored
 * in the `adobeujs-optin` cookie, e.g. on another page of the site, is applied as well, and the decision is stored
 * there as by the library, see `storePermissions()`.
 * Created at once, its configuration is not known, so opt-in applies and no category is approved,
 * so that the page is not told that the visitor has consented, until the page passes an opt-in configuration
 * to `getInstance()` itself, which is applied then, see `configure()` in `createOptIn()`.
 * Ids are empty strings, also in the callbacks, which are called asynchronously, and URLs are returned unchanged
 * by `appendVisitorIDsTo()`, while the library generates a local id and appends it to URLs.
 * As the library stores the id in the `AMCV_<orgId>` cookie, `getInstance()` sets a session cookie with a dummy
 * id, the same for every visitor, if the organization has no such cookie, as some sites read the id from it
 * directly and do not work without it, e.g. the video player of `play.history.com`, see `setDummyIdCookie()`;
 * as the library, only when the ECID category is approved, see `setDummyIdCookieOfInstance()`.
 *
 * Requires `createAdobeVisitorInstance()`, `getAdobeOptInCookieDomain()`, `noopFunc()` and `runProtected()`
 * to be injected as well.
 *
 * @param isOptInCreated Whether `adobe.optIn` is created at once if `Visitor` is installed by this call,
 * i.e. not if it is a library of the page, which creates its own one.
 * @returns `true` if anything was installed.
 */
export function mockAdobeVisitor(isOptInCreated?: boolean): boolean {
    const w = window as unknown as PlainRecord;
    let installed = false;

    const CATEGORIES: Record<string, string> = {
        AAM: 'aam',
        ADCLOUD: 'adcloud',
        ANALYTICS: 'aa',
        CAMPAIGN: 'campaign',
        ECID: 'ecid',
        LIVEFYRE: 'livefyre',
        TARGET: 'target',
        MEDIA_ANALYTICS: 'mediaaa',
    };
    // a constant id in the format of the library, so it does not identify a visitor
    const DUMMY_ID = '00000000000000000000000000000000000000';

    /**
     * Sets the `AMCV_<orgId>` cookie with a dummy id, if there is no such cookie of the organization,
     * set by the library or by this mock.
     *
     * It is needed by sites which read the id from the cookie directly instead of from `Visitor`, so a mock
     * of `Visitor` alone does not fix them, e.g. the video player of `play.history.com` and other sites
     * of A+E Networks reads it from `AMCV_08AC467352782D0D0A490D45@AdobeOrg` and sends it as the device id
     * to the API of the site, and shows no video without it,
     * see https://github.com/easylist/easylist/issues/24131.
     *
     * It is a session cookie, whose name is not encoded, e.g. `AMCV_ABC@AdobeOrg=MCMID|0…0`,
     * as the library ignores it then, while it would take over the id of a cookie with the encoded name,
     * e.g. `AMCV_ABC%40AdobeOrg`, and send it to Adobe as the id of the visitor.
     *
     * @param orgId Organization id, e.g. `ABC@AdobeOrg`.
     */
    const setDummyIdCookie = (orgId: string) => {
        const rawName = `AMCV_${orgId}`;
        const encodedName = `AMCV_${encodeURIComponent(orgId)}`;
        try {
            const exists = window.document.cookie.split(';').some((cookie) => {
                const name = cookie.split('=')[0].trim();
                return name === rawName || name === encodedName;
            });
            if (!exists) {
                window.document.cookie = `${rawName}=MCMID|${DUMMY_ID}; path=/`;
            }
        } catch (e) {
            // cookies may not be available, e.g. in a sandboxed frame
        }
    };

    // the cookie in which the library stores the decision of the visitor, with `isOptInStorageEnabled`
    const OPT_IN_COOKIE_NAME = 'adobeujs-optin';

    /**
     * Returns the decision of the visitor which the library has stored in the `adobeujs-optin` cookie,
     * i.e. with `isOptInStorageEnabled`, e.g. on another page of the site where the library is not blocked,
     * as its JSON, which the opt-in service applies then, as the library. The cookie is found by its name as it is,
     * as the library writes it, and only its value is decoded.
     *
     * @returns JSON of the stored permissions, `undefined` if there are none, or `null` if the cookies cannot be
     * read, e.g. in a sandboxed frame, or the value cannot be decoded, i.e. a decision which is not known,
     * as the library throws then.
     */
    const readStoredPermissions = (): string | null | undefined => {
        let cookies: string[];
        try {
            cookies = window.document.cookie.split(';');
        } catch (e) {
            // Cookies may not be available, e.g. in a sandboxed frame: the visitor may have stored a decision
            // which cannot be read then, so it is not known, rather than missing.
            return null;
        }
        const prefix = `${OPT_IN_COOKIE_NAME}=`;
        for (let i = 0; i < cookies.length; i += 1) {
            const cookie = cookies[i].trim();
            if (cookie.indexOf(prefix) === 0) {
                try {
                    return decodeURIComponent(cookie.slice(prefix.length));
                } catch (e) {
                    return null;
                }
            }
        }
        return undefined;
    };

    /**
     * Stores the decision of the visitor in the `adobeujs-optin` cookie, as the library does with
     * `isOptInStorageEnabled` once the permissions are completed: merged into the stored ones, as JSON,
     * for `optInStorageExpiry` seconds, by default 34190000, i.e. about 13 months, or not at all with `NONE`,
     * on the domain which the library uses, see `getAdobeOptInCookieDomain()`, which is found when the first
     * decision is stored,
     * with `Secure` and `SameSite` of `secureCookie` and `sameSiteCookie`. So the decision which the visitor
     * makes on a page where the library is blocked holds on the next pages, also where the library is not
     * blocked, as it would read an older decision otherwise, e.g. an approval which the visitor has revoked.
     * No id is generated: it contains the permissions, with the other fields of the permissions of the configuration
     * or of the stored value, if any, which the library keeps as well.
     *
     * @param permissions Permissions by category.
     * @param storage Settings of the storage of the configuration.
     */
    const storePermissions = (permissions: PlainRecord, storage: PlainRecord) => {
        try {
            let stored: PlainRecord = {};
            const json = readStoredPermissions();
            if (typeof json === 'string') {
                try {
                    const parsed = JSON.parse(json);
                    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                        stored = parsed;
                    }
                } catch (e) {
                    // as the library, a value which is not JSON is replaced
                }
            }
            const value = JSON.stringify(Object.assign(stored, permissions));
            const lifetime = storage.expiry || 34190000;
            // as the library, which writes no cookie then
            if (lifetime === 'NONE') {
                return;
            }
            const seconds = parseInt(String(lifetime), 10);
            let cookie = `${encodeURIComponent(OPT_IN_COOKIE_NAME)}=${encodeURIComponent(value)}; path=/;`;
            if (seconds) {
                cookie += ` expires=${new Date(Date.now() + seconds * 1000).toUTCString()};`;
            }
            // found once, and kept in the settings, which are an object of the mock, not of the page
            const settings = storage;
            if (typeof settings.cookieDomain !== 'string') {
                settings.cookieDomain = getAdobeOptInCookieDomain(settings.domain);
            }
            if (settings.cookieDomain) {
                cookie += ` domain=${settings.cookieDomain};`;
            }
            if (storage.sameSite) {
                cookie += `SameSite=${storage.sameSite};`;
            }
            if (storage.secure) {
                cookie += 'Secure';
            }
            window.document.cookie = cookie;
        } catch (e) {
            // cookies may not be available, e.g. in a sandboxed frame
        }
    };

    /**
     * Creates `adobe.optIn` as `OptIn` of the library, version 5.5.0, without the IAB plugin:
     * - if opt-in does not apply, all categories are approved; otherwise none is, except the ones
     *   of `preOptInApprovals`, and then the ones of `previousPermissions`, i.e. the saved decision of the visitor,
     *   and then the ones stored by the library, which may also deny a pre-approved category;
     * - the status is `complete` if valid `previousPermissions` or stored permissions are passed, otherwise `pending`;
     * - `approve()` and `deny()` change the permissions when they are completed, at once or by `complete()`;
     * - `fetchPermissions()` calls the callback at once if opt-in does not apply, the status is `complete`
     *   or `preOptInApprovals` are passed, otherwise once, when the permissions are completed;
     * - with `storage`, i.e. with `isOptInStorageEnabled`, the decision is stored once it is completed,
     *   see `storePermissions()`.
     *
     * @param configuration Opt-in configuration of the page, see `configure()` in the function.
     * @returns The opt-in service, i.e. `adobe.optIn`, and `configure()`, which applies a configuration to it later,
     * for the opt-in service of a mock of Adobe Tags.
     */
    const createOptIn = (configuration: PlainRecord) => {
        const values = Object.values(CATEGORIES);
        // other names which the library accepts in permissions
        const OTHER_NAMES = ['videoaa', 'iabConsentHash'];

        /**
         * Returns permissions passed as an object or as its JSON, as the library.
         *
         * @param value Permissions of the configuration.
         * @returns Permissions by category, empty if they are not valid.
         */
        const toPermissions = (value: unknown): PlainRecord => {
            let result = value;
            if (typeof result === 'string') {
                try {
                    result = JSON.parse(result);
                } catch (e) {
                    return {};
                }
            }
            return result !== null && typeof result === 'object' && !Array.isArray(result)
                ? result as PlainRecord
                : {};
        };
        // as the library, a saved decision completes the opt-in if it has only names of categories
        const isDecision = (permissionsToCheck: PlainRecord): boolean => {
            const names = Object.keys(permissionsToCheck);
            return names.length > 0
                && names.every((name) => values.indexOf(name) > -1 || OTHER_NAMES.indexOf(name) > -1);
        };

        // whether opt-in applies, i.e. categories need the consent of the visitor
        let doesOptInApply = true;
        // The permissions before any change of the page, set by `configure()`: all categories, approved only
        // if opt-in does not apply, otherwise with the ones of the configuration.
        const initialPermissions: PlainRecord = {};
        // The pre-approvals of the configuration, i.e. its own object, which the page may change, as in the library,
        // and whether it has any, also an empty object
        let preApprovals: PlainRecord = {};
        let hasPreApprovals = false;
        // The current permissions, and the ones with the changes waiting for `complete()`. As in the library,
        // they are two objects until the page completes a change, and one object then, so that a change
        // which waits for `complete()` is in the current permissions only after the first completion.
        let permissions: PlainRecord = Object.assign({}, initialPermissions);
        const changedPermissions: PlainRecord = Object.assign({}, initialPermissions);
        // The changes of the page, by category: all of them, and the ones which were completed last,
        // i.e. without the ones waiting for `complete()`. They are kept only for `configure()` called after them.
        const pageChanges: PlainRecord = {};
        let completedChanges: PlainRecord = {};

        const listeners: Array<{ event: unknown; callback: unknown; context: unknown }> = [];
        // Callbacks of `fetchPermissions()` which have not been called yet, as the visitor has not decided:
        // the ones called once, when the permissions are completed, and the subscribed ones, with their listener
        // of `complete`, which are kept only for `configure()` called after them, until they are unsubscribed,
        // as well as whether the opt-in was pending, i.e. the page had changed nothing yet.
        let waitingCallbacks: Array<{ callback: unknown; listener?: object; wasPending: boolean }> = [];
        // settings of the storage, if it is enabled
        let storageSettings: PlainRecord | undefined;
        const optIn: PlainRecord = {
            Categories: CATEGORIES,
            permissions,
            doesOptInApply,
        };
        /**
         * Sets the status and its flags as the library: `isPending` only before any change,
         * `isComplete` only when the changes are completed.
         *
         * @param status `pending`, `changed` or `complete`.
         */
        const setStatus = (status: string) => {
            optIn.status = status;
            optIn.isPending = status === 'pending';
            optIn.isComplete = status === 'complete';
        };
        setStatus('pending');
        /**
         * Checks whether `fetchPermissions()` calls its callback at once, as in the library.
         *
         * @returns `true` if the permissions are known already.
         */
        const isAnsweredAtOnce = (): boolean => !doesOptInApply || !!optIn.isComplete || hasPreApprovals;
        /**
         * Returns the categories of a call as a list, as the library: a list, or a name.
         *
         * @param categories Category or list of categories.
         * @returns List of categories, empty for another value.
         */
        const toList = (categories: unknown): unknown[] => {
            if (Array.isArray(categories)) {
                return categories;
            }
            return typeof categories === 'string' ? [categories] : [];
        };
        /**
         * Checks whether the categories are approved in the permissions, as the library:
         * all of the permissions without categories.
         *
         * @param categories Category or list of categories.
         * @param approvals Permissions by category.
         * @returns `true` if all of them are approved.
         */
        const areApproved = (categories: unknown, approvals: PlainRecord): boolean => {
            const list = toList(categories);
            if (list.length > 0) {
                return list.every((category) => !!approvals[category as string]);
            }
            const names = Object.keys(approvals);
            return names.length > 0 && names.every((name) => approvals[name] === true);
        };
        /**
         * Sets the status `complete` and, in the order of the library, notifies the listeners of `complete`,
         * stores the permissions, and calls the callbacks of `fetchPermissions()` which wait for it, once.
         *
         * @param isStored Whether the permissions are stored, if the storage is enabled.
         */
        const setComplete = (isStored: boolean) => {
            setStatus('complete');
            // a copy, as a listener may remove itself
            listeners.slice().forEach((listener) => {
                if (listener.event === 'complete') {
                    runProtected(listener.callback, [permissions], listener.context);
                }
            });
            if (storageSettings && isStored) {
                storePermissions(permissions, storageSettings);
            }
            // the subscribed ones have been called as listeners
            const callbacks = waitingCallbacks.filter((waiting) => !waiting.listener);
            waitingCallbacks = [];
            callbacks.forEach((waiting) => runProtected(waiting.callback, [permissions]));
        };
        /**
         * Completes the changes of the permissions, which become the current ones, as `complete()`
         * of the library.
         */
        const complete = () => {
            permissions = changedPermissions;
            optIn.permissions = permissions;
            completedChanges = Object.assign({}, pageChanges);
            setComplete(true);
        };
        /**
         * Sets the permission of categories, as `approve()` and `deny()` of the library.
         *
         * @param categories Category or list of categories.
         * @param approved Whether they are approved.
         * @param shouldWaitForComplete Whether to wait for `complete()`.
         * @returns The opt-in service.
         * @throws Error for an unknown category, as the library.
         */
        const setPermissions = (categories: unknown, approved: boolean, shouldWaitForComplete: unknown) => {
            const list = toList(categories);
            const isEmptyList = Array.isArray(categories) && categories.length === 0;
            if (!categories || isEmptyList || list.some((category) => values.indexOf(category as string) < 0)) {
                throw new Error('[OptIn] Invalid category(-ies). Please use the `OptIn.Categories` enum.');
            }
            setStatus('changed');
            list.forEach((category) => {
                changedPermissions[category as string] = approved;
                pageChanges[category as string] = approved;
            });
            if (!shouldWaitForComplete) {
                complete();
            }
            return optIn;
        };
        /**
         * Applies an opt-in configuration of the page to the service, as the library does when it creates it.
         * It is called when the service is created, and once more for the service of a mock of Adobe Tags,
         * which is created without a configuration, when the page passes one to `Visitor.getInstance()`.
         *
         * The service is then as the one of the library would be if it had been created with the configuration,
         * and the page had made its changes after it, whatever the page has done before:
         * - the pre-approvals, the saved decision and, over them, as by the library, the stored decision are applied
         *   to the permissions before the changes of the page, so a change of the page, completed or not, is kept
         *   over them, and a change which waits for `complete()` is not in the current permissions before
         *   the first completion, as in the library;
         * - a saved or stored decision completes an opt-in which is pending, so its listeners and the callbacks
         *   of `fetchPermissions()` which wait for it, which are kept, are notified, although the library,
         *   which reads the decision when the service is created, has none to notify then; otherwise, callbacks
         *   of `fetchPermissions()` which have not been called yet are called if the library would have called
         *   them at once with this configuration, i.e. with pre-approvals, if opt-in does not apply, or, with
         *   a saved or stored decision, if the page had changed nothing before them, and the status is kept;
         * - with the storage, the changes which the page has completed are stored, as the library stores them
         *   when they are completed, without the ones which wait for `complete()`; the next ones are stored as well.
         *
         * @param options Configuration:
         * - `doesOptInApply`: whether opt-in applies, if the configuration sets it; all categories are approved
         *   and the other permissions of the configuration are not used if it does not, as in the library;
         * - `preOptInApprovals`: categories approved before the consent, e.g. `{ aa: true }`, or their JSON;
         * - `previousPermissions`: saved permissions of the visitor, e.g. `{ aa: false }`, or their JSON;
         * - `storedPermissions`: JSON of the decision stored by the library, see `readStoredPermissions()`;
         * - `storage`: settings of the storage, if it is enabled, see `storePermissions()`.
         */
        const configure = (options: PlainRecord) => {
            const wasAnsweredAtOnce = isAnsweredAtOnce();
            if (typeof options.doesOptInApply === 'boolean') {
                doesOptInApply = options.doesOptInApply;
                optIn.doesOptInApply = doesOptInApply;
            }
            if (options.preOptInApprovals) {
                preApprovals = toPermissions(options.preOptInApprovals);
                hasPreApprovals = true;
            }
            const previous = toPermissions(options.previousPermissions);
            const stored = toPermissions(options.storedPermissions);
            storageSettings = (options.storage as PlainRecord | undefined) || storageSettings;
            values.forEach((category) => {
                initialPermissions[category] = !doesOptInApply;
            });
            if (doesOptInApply) {
                Object.assign(initialPermissions, preApprovals, previous, stored);
            }
            // one object once the page has completed a change, see above
            const hasCompleted = permissions === changedPermissions;
            Object.assign(changedPermissions, initialPermissions, pageChanges);
            if (!hasCompleted) {
                Object.assign(permissions, initialPermissions);
            }
            const hasDecision = isDecision(previous) || isDecision(stored);
            if (optIn.status === 'pending' && hasDecision) {
                setComplete(false);
            } else {
                const isAnsweredNow = !wasAnsweredAtOnce && isAnsweredAtOnce();
                const answered = waitingCallbacks.filter((waiting) => {
                    return isAnsweredNow || (hasDecision && waiting.wasPending);
                });
                waitingCallbacks = waitingCallbacks.filter((waiting) => answered.indexOf(waiting) === -1);
                answered.forEach((waiting) => runProtected(waiting.callback, [permissions]));
            }
            if (hasCompleted && storageSettings) {
                storePermissions(Object.assign({}, initialPermissions, completedChanges), storageSettings);
            }
        };
        configure(configuration);
        optIn.approve = (categories: unknown, wait?: unknown) => setPermissions(categories, true, wait);
        optIn.deny = (categories: unknown, wait?: unknown) => setPermissions(categories, false, wait);
        optIn.approveAll = (wait?: unknown) => setPermissions(values, true, wait);
        optIn.denyAll = (wait?: unknown) => setPermissions(values, false, wait);
        optIn.complete = () => {
            if (optIn.status === 'changed') {
                complete();
            }
        };
        optIn.isApproved = (categories: unknown) => areApproved(categories, permissions);
        optIn.isPreApproved = (categories: unknown) => areApproved(categories, preApprovals);
        /**
         * Adds a listener of an event, as `on()` of the library.
         *
         * @param event Name of the event, e.g. `complete`.
         * @param callback Listener of the page.
         * @param context Optional receiver of the listener.
         * @returns The registration of the listener.
         * @throws Error if the listener is not a function, as the library.
         */
        const addListener = (event: unknown, callback: unknown, context?: unknown) => {
            if (typeof callback !== 'function') {
                throw new Error('[ON] Callback should be a function.');
            }
            const listener = { event, callback, context };
            listeners.push(listener);
            return listener;
        };
        /**
         * Removes listeners, and the callbacks of `fetchPermissions()` which wait with them, so that
         * a subscription which the page has canceled is not kept, nor called later.
         *
         * @param isRemoved Returns whether a listener is removed.
         */
        const removeListeners = (isRemoved: (listener: { event: unknown; callback: unknown }) => boolean) => {
            for (let i = listeners.length - 1; i >= 0; i -= 1) {
                if (isRemoved(listeners[i])) {
                    listeners.splice(i, 1);
                }
            }
            waitingCallbacks = waitingCallbacks.filter((waiting) => {
                return !waiting.listener || listeners.indexOf(waiting.listener as typeof listeners[number]) !== -1;
            });
        };
        optIn.on = (event: unknown, callback: unknown, context?: unknown) => {
            const added = addListener(event, callback, context);
            return () => removeListeners((listener) => listener === added);
        };
        // as the library, only the listeners with the callback are removed, so none without a callback
        optIn.off = (event: unknown, callback: unknown) => {
            removeListeners((listener) => listener.event === event && listener.callback === callback);
        };
        optIn.fetchPermissions = (callback: unknown, shouldAutoSubscribe?: unknown) => {
            const added = shouldAutoSubscribe ? addListener('complete', callback) : undefined;
            if (isAnsweredAtOnce()) {
                runProtected(callback, [permissions]);
            } else {
                // the visitor has not decided yet
                waitingCallbacks.push({ callback, listener: added, wasPending: !!optIn.isPending });
            }
            return added ? () => removeListeners((listener) => listener === added) : noopFunc;
        };
        optIn.execute = noopFunc;
        optIn.publish = noopFunc;
        optIn.registerPlugin = noopFunc;
        optIn.memoizeContent = noopFunc;
        optIn.getMemoizedContent = noopFunc;
        return { service: optIn, configure };
    };

    /**
     * Returns the `adobe` global, created if it is missing, keeping its other parts, e.g. `adobe.target`.
     *
     * @returns The `adobe` object.
     */
    const getAdobe = (): PlainRecord => {
        if (!w.adobe || typeof w.adobe !== 'object') {
            w.adobe = {};
        }
        return w.adobe as PlainRecord;
    };

    // the opt-in service which a mock of Adobe Tags creates at once, without the configuration of the site,
    // and its `configure()`, see `createOptIn()`, until the page passes a configuration
    let optInOfUnknownConfig: unknown = null;
    let configureOptInOfUnknownConfig: ((options: PlainRecord) => void) | null = null;

    /**
     * Sets the `AMCV_<orgId>` cookie with a dummy id for a new instance, see `setDummyIdCookie()`, when the library
     * writes its cookie, i.e. as `init()` of an instance of the library, once:
     * - at once if the ECID category is approved by the opt-in service, also if it is only pre-approved,
     *   or approved as opt-in does not apply to the service; the library writes the id only then, also for
     *   an instance to which opt-in does not apply, whose cookie has no id otherwise; never in IAB context,
     *   i.e. if opt-in applies to the instance with `isIabContext`, in which the library waits for the consent
     *   of the IAB consent management platform, which is not mocked;
     * - otherwise not if opt-in does not apply to the instance, or if the opt-in is complete already,
     *   i.e. the visitor has not approved ECID;
     * - otherwise when the opt-in service of the instance is completed, and `adobe.optIn` is complete then,
     *   for the first time, if ECID is approved by `adobe.optIn` then, i.e. the current opt-in service, as the library
     *   reads it; a later decision is ignored, as by the library, which disables an instance whose ECID is denied.
     * Whether opt-in applies is read from the configuration of the instance, as by the library, and is assumed
     * if it is not set and the opt-in service has been created by a mock of Adobe Tags, whose configuration
     * is not known. A configuration which cannot be read, or an opt-in service without its API, e.g. a page object,
     * is a consent which is not known, so no cookie is set. As the library, no cookie is set if the ids are stored
     * in the storages, i.e. with `useLocalStorage`, or if no cookie is written, i.e. with `cookieLifetime: 'NONE'`,
     * also if the page sets them on the instance before the cookie would be written.
     * So no cookie is set before the visitor has consented, also not by a mock of Adobe Tags, whose opt-in
     * applies, see `mockAdobeVisitor()`.
     *
     * @param visitor New instance of the Visitor API.
     * @param optInConfig Opt-in configuration of the instance, see `getOptInConfig()`.
     */
    const setDummyIdCookieOfInstance = (visitor: PlainRecord, optInConfig: PlainRecord) => {
        if (optInConfig.hasFailed) {
            return;
        }
        const orgId = visitor.marketingCloudOrgID as string;
        // as `cookieWrite()` of the library, which reads the settings of the instance when it writes
        const setCookie = () => {
            const lifetime = visitor.cookieLifetime ? String(visitor.cookieLifetime).toUpperCase() : '';
            if (!visitor.useLocalStorage && lifetime !== 'NONE') {
                setDummyIdCookie(orgId);
            }
        };
        // as the library, which keeps the `adobe` object of the page when the instance is created,
        // and reads its current opt-in service
        const adobeOfInstance = getAdobe();
        const getOptIn = (): PlainRecord | null => {
            const current = adobeOfInstance.optIn as PlainRecord | undefined;
            return current && typeof current.isApproved === 'function' ? current : null;
        };
        try {
            const optIn = getOptIn();
            if (optIn === null) {
                return;
            }
            const doesOptInApply = optInConfig.hasDoesOptInApply
                ? !!optInConfig.doesOptInApply
                : optIn === optInOfUnknownConfig;
            // as the library, the IAB context is read from the configuration of the instance when it is decided,
            // so a change of the page is taken into account; a value which cannot be read is an IAB context,
            // whose consent is not known
            const isIabContext = () => {
                if (!doesOptInApply) {
                    return false;
                }
                try {
                    const configs = visitor.configs as PlainRecord | undefined;
                    return !!configs && !!configs.isIabContext;
                } catch (e) {
                    return true;
                }
            };
            // as the library, which writes the id only while ECID is approved, and not in IAB context
            const isEcidApproved = (service: PlainRecord) => {
                return !!(service.isApproved as (category: unknown) => unknown)(CATEGORIES.ECID) && !isIabContext();
            };
            if (isEcidApproved(optIn)) {
                setCookie();
                return;
            }
            if (!doesOptInApply || optIn.isComplete || typeof optIn.on !== 'function') {
                return;
            }
            let isDecided = false;
            const onComplete = () => {
                try {
                    const current = getOptIn();
                    if (isDecided || current === null || !current.isComplete) {
                        return;
                    }
                    isDecided = true;
                    if (typeof optIn.off === 'function') {
                        (optIn.off as (event: string, listener: () => void) => unknown)('complete', onComplete);
                    }
                    if (isEcidApproved(current)) {
                        setCookie();
                    }
                } catch (e) {
                    // e.g. a function of a page object which throws
                }
            };
            (optIn.on as (event: string, listener: () => void) => unknown)('complete', onComplete);
        } catch (e) {
            // e.g. a function of a page object which throws, so the consent is not known
        }
    };

    // prototype of `Visitor` of this mock, set when it is installed
    let visitorPrototype: object | undefined;

    /**
     * Creates a visitor instance for an organization, registered in `s_c_il` as by the library.
     *
     * @param orgId Organization id, e.g. `ABC@AdobeOrg`.
     * @param config Configuration of the page, copied to the instance.
     * @returns Visitor instance.
     */
    const createInstance = (orgId: string, config: unknown): PlainRecord => {
        // as the library, an instance of `Visitor` of this mock
        const visitor = createAdobeVisitorInstance(orgId, config, visitorPrototype);
        if (!w.s_c_in) {
            w.s_c_il = [];
            w.s_c_in = 0;
        }
        (w.s_c_il as unknown[])[w.s_c_in as number] = visitor;
        w.s_c_in = (w.s_c_in as number) + 1;
        return visitor;
    };

    /**
     * Returns the opt-in configuration of the page, i.e. of `Visitor.getInstance()`, as the library reads it:
     * only its own enumerable properties, i.e. not the ones of its prototype, e.g. methods of a class;
     * the strings `true` and `false` are booleans, an empty string is no value, and `doesOptInApply` may be
     * a function, which is called.
     *
     * If the configuration cannot be read, e.g. as a function of the page throws, `hasFailed` is set:
     * the library throws then, while here the opt-in is created with no category approved, see `getInstance()`.
     *
     * @param config Configuration of the page.
     * @returns Whether opt-in applies, and the permissions of the configuration.
     */
    const getOptInConfig = (config: unknown): PlainRecord => {
        const result: PlainRecord = { doesOptInApply: false, hasFailed: false };
        if (!config || typeof config !== 'object') {
            return result;
        }
        const normalize = (value: unknown): unknown => {
            if (value === 'true') {
                return true;
            }
            if (value === 'false') {
                return false;
            }
            return value === '' ? undefined : value;
        };
        // as `Object.keys()` of the library
        const getOwn = (name: string): unknown => {
            return Object.prototype.propertyIsEnumerable.call(config, name) ? (config as PlainRecord)[name] : undefined;
        };
        try {
            // as a boolean setting of the library, a function is called
            const getBoolean = (name: string): unknown => {
                const value = getOwn(name);
                return normalize(typeof value === 'function' ? value() : value);
            };
            const doesOptInApply = getBoolean('doesOptInApply');
            result.doesOptInApply = !!doesOptInApply;
            // whether it is set, i.e. whether the instance does not follow the opt-in service of Adobe Tags
            result.hasDoesOptInApply = doesOptInApply !== undefined;
            result.previousPermissions = normalize(getOwn('previousPermissions'));
            result.preOptInApprovals = normalize(getOwn('preOptInApprovals'));
            result.isIabContext = !!getBoolean('isIabContext');
            result.isOptInStorageEnabled = !!getBoolean('isOptInStorageEnabled');
            // whether it has settings of the opt-in service
            result.hasOptInSettings = result.hasDoesOptInApply
                || result.isOptInStorageEnabled
                || result.previousPermissions !== undefined
                || result.preOptInApprovals !== undefined;
            result.storage = {
                // as the library
                domain: normalize(getOwn('optInCookieDomain')) || normalize(getOwn('cookieDomain')),
                expiry: normalize(getOwn('optInStorageExpiry')),
                secure: !!getBoolean('secureCookie'),
                sameSite: normalize(getOwn('sameSiteCookie')),
            };
        } catch (e) {
            // e.g. a getter or a function of the page which throws
            result.hasFailed = true;
        }
        return result;
    };

    /**
     * Returns the instance for an organization as `Visitor.getInstance()`: an existing one from `s_c_il`,
     * otherwise a new one; the opt-in service is created by the first call, with its configuration,
     * as by the library.
     *
     * @param orgId Organization id, `@AdobeOrg` is appended if it is missing.
     * @param config Configuration of the page.
     * @returns Visitor instance.
     * @throws Error without an organization id, as the library.
     */
    const getInstance = (orgId: unknown, config?: unknown): PlainRecord => {
        if (!orgId) {
            throw new Error('Visitor requires Adobe Marketing Cloud Org ID.');
        }
        const id = String(orgId).indexOf('@') < 0 ? `${orgId}@AdobeOrg` : String(orgId);
        const instances = Array.isArray(w.s_c_il) ? w.s_c_il as PlainRecord[] : [];
        for (let i = 0; i < instances.length; i += 1) {
            const instance = instances[i];
            if (instance && instance._c === 'Visitor' && instance.marketingCloudOrgID === id) {
                return instance;
            }
        }
        // As the library, the configuration is read for each new instance, and before any other code of the page
        // is called, i.e. the function of `previousPermissions`, a listener or a callback of the opt-in service.
        // The instance is registered before them as well, so they get it from `getInstance()`, not a second one.
        const optInConfig = getOptInConfig(config);
        const adobe = getAdobe();
        const isOptInMissing = !adobe.optIn;
        // The opt-in service of a mock of Adobe Tags gets the configuration which the page passes itself, once.
        // It is taken before any code of the page is called, e.g. a function of `previousPermissions` which
        // calls `getInstance()` itself, so that the configuration of this call is applied, as by the library,
        // whose opt-in service of this call replaces the one of such a call.
        let configureOptIn: ((options: PlainRecord) => void) | null = null;
        if (adobe.optIn === optInOfUnknownConfig && optInConfig.hasOptInSettings) {
            configureOptIn = configureOptInOfUnknownConfig;
            configureOptInOfUnknownConfig = null;
        }
        let visitor: PlainRecord;
        try {
            visitor = createInstance(id, config);
        } catch (e) {
            // As the library, which reads the configuration again for the instance, e.g. a getter which throws.
            // The library has no opt-in then, while here it is created with no category approved,
            // so that page code which uses it does not throw.
            if (isOptInMissing) {
                adobe.optIn = createOptIn({ doesOptInApply: true }).service;
            }
            // the configuration is not applied, so the next call may apply its one
            configureOptInOfUnknownConfig = configureOptInOfUnknownConfig || configureOptIn;
            throw e;
        }
        // as the library, the copy of the configuration has the values of the settings, e.g. a function called once
        const configs = visitor.configs as PlainRecord | undefined;
        if (configs && !optInConfig.hasFailed && Object.prototype.hasOwnProperty.call(configs, 'isIabContext')) {
            configs.isIabContext = optInConfig.isIabContext;
        }
        // as the library, saved permissions may be a function, which is called when the opt-in is created
        let { previousPermissions } = optInConfig;
        if ((isOptInMissing || configureOptIn) && typeof previousPermissions === 'function' && !optInConfig.hasFailed) {
            try {
                previousPermissions = previousPermissions();
            } catch (e) {
                optInConfig.hasFailed = true;
            }
        }
        // The stored decision is read last, as by the library, e.g. after a function of `previousPermissions`
        // which stores a decision itself, and for each new instance with the storage, as the library fails
        // each call while it cannot be decoded: it is a decision which is not known then, so no cookie is set.
        const storedPermissions = optInConfig.isOptInStorageEnabled && !optInConfig.hasFailed
            ? readStoredPermissions()
            : undefined;
        if (storedPermissions === null) {
            optInConfig.hasFailed = true;
        }
        const optInOptions: PlainRecord = {
            previousPermissions,
            preOptInApprovals: optInConfig.preOptInApprovals,
            storedPermissions,
            storage: optInConfig.isOptInStorageEnabled ? optInConfig.storage : undefined,
        };
        if (isOptInMissing) {
            // The library throws if the configuration cannot be read, so there is no opt-in then.
            // Here it is still created, so that page code does not throw, but as the decision of the visitor
            // is not known, opt-in applies and no category is approved, also not a pre-approved one.
            optInOptions.doesOptInApply = !!optInConfig.doesOptInApply;
            adobe.optIn = createOptIn(optInConfig.hasFailed ? { doesOptInApply: true } : optInOptions).service;
        } else if (configureOptIn) {
            if (optInConfig.hasFailed) {
                // as the library, whose next call creates the opt-in service
                configureOptInOfUnknownConfig = configureOptInOfUnknownConfig || configureOptIn;
            } else {
                // whether opt-in applies stays as it is, i.e. it applies, unless the configuration sets it
                if (optInConfig.hasDoesOptInApply) {
                    optInOptions.doesOptInApply = !!optInConfig.doesOptInApply;
                }
                configureOptIn(optInOptions);
            }
        }
        setDummyIdCookieOfInstance(visitor, optInConfig);
        return visitor;
    };

    if (typeof w.Visitor !== 'function') {
        /**
         * The `Visitor` global; instances are created by `Visitor.getInstance()`, as the library requires.
         */
        const Visitor = function Visitor() {
            // instances are created by getInstance()
        } as unknown as PlainRecord;
        Visitor.getInstance = getInstance;
        Visitor.AuthState = { UNKNOWN: 0, AUTHENTICATED: 1, LOGGED_OUT: 2 };
        Visitor.OptOut = { GLOBAL: 'global' };
        Visitor.version = '5.5.0';
        Visitor.windowLoaded = false;
        Visitor.codeLoadEnd = Date.now();
        visitorPrototype = Visitor.prototype as object;
        w.Visitor = Visitor;
        installed = true;
        if (isOptInCreated) {
            const adobeObject = getAdobe();
            if (!adobeObject.optIn) {
                // the configuration of the site is not known, so no consent is assumed
                const created = createOptIn({ doesOptInApply: true });
                adobeObject.optIn = created.service;
                optInOfUnknownConfig = created.service;
                configureOptInOfUnknownConfig = created.configure;
            }
        }
    }
    const adobe = getAdobe();
    if (!adobe.OptInCategories) {
        adobe.OptInCategories = CATEGORIES;
        installed = true;
    }
    return installed;
}
