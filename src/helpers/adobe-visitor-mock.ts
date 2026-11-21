/* eslint-disable no-underscore-dangle */
// `_c` is a property of instances in `s_c_il`, which AppMeasurement and `Visitor.getInstance()` read.
import { noopFunc } from './noop-utils';
import { runProtected } from './run-protected';

type AnyRecord = Record<string, unknown>;

/**
 * Creates an instance of the mock of `Visitor` of the Experience Cloud Identity Service of Adobe,
 * as `Visitor.getInstance()` of `mockAdobeVisitor()` returns it, but not registered in `s_c_il`,
 * and without the cookie of the organization, e.g. for `_satellite.getVisitorId()` of a mock of Adobe Tags,
 * whose organization is not known.
 * Ids are empty strings, also in the callbacks, which are called asynchronously, as the library does
 * once its requests have failed, and URLs are returned unchanged.
 *
 * Requires `noopFunc()` and `runProtected()` to be injected as well.
 *
 * @param orgId Organization id, e.g. `ABC@AdobeOrg`.
 * @param config Configuration of the page, copied to the instance.
 * @returns Visitor instance.
 */
export function createAdobeVisitorInstance(orgId: string, config?: unknown): AnyRecord {
    const FIELDS = ['MCMID', 'MCOPTOUT', 'MCAID', 'MCAAMLH', 'MCAAMB'];

    /**
     * Calls a callback of the page with a receiver, and catches its errors.
     *
     * @param receiver Receiver of the call.
     * @param callback Callback of the page.
     * @param args Arguments of the callback.
     */
    const callWith = (receiver: unknown, callback: unknown, args: unknown[]) => {
        if (typeof callback !== 'function') {
            return;
        }
        try {
            callback.apply(receiver, args);
        } catch (e) {
            // ignore errors of the page callback
        }
    };

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
            window.setTimeout(() => callWith(receiver, fn, args), 0);
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

    const visitor: AnyRecord = {};
    if (config && typeof config === 'object') {
        Object.keys(config).forEach((key) => {
            visitor[key] = (config as AnyRecord)[key];
        });
        visitor.configs = config;
    }
    visitor._c = 'Visitor';
    visitor.version = '5.5.0';
    visitor.marketingCloudOrgID = orgId;
    visitor.cookieName = `AMCV_${orgId}`;
    visitor.sessionCookieName = `AMCVS_${orgId}`;
    visitor.loadTimeout = 30000;
    visitor.FIELDS = {};
    FIELDS.forEach((field) => {
        (visitor.FIELDS as AnyRecord)[field] = field;
    });
    const customerIds: AnyRecord = {};

    visitor.getMarketingCloudVisitorID = emptyId;
    visitor.getAnalyticsVisitorID = emptyId;
    visitor.getAudienceManagerLocationHint = emptyId;
    visitor.getAudienceManagerBlob = emptyId;
    visitor.getLocationHint = emptyId;
    visitor.getOptOut = emptyId;
    // no supplemental data id is generated
    visitor.getSupplementalDataID = () => '';
    visitor.getVisitorValues = (callback: unknown, fields?: unknown) => {
        const values: AnyRecord = {};
        (Array.isArray(fields) ? fields : FIELDS).forEach((field) => {
            values[String(field)] = '';
        });
        callLater(callback, [values]);
    };
    visitor.isOptedOut = (callback?: unknown) => {
        callLater(callback, [false]);
        return null;
    };
    visitor.isAllowed = () => true;
    visitor.isClientSideMarketingCloudVisitorID = () => null;
    visitor.getCustomerIDs = () => {
        const copy: AnyRecord = {};
        Object.keys(customerIds).forEach((key) => {
            const entry = customerIds[key] as AnyRecord;
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
            const value = (ids as AnyRecord)[key];
            if (value && typeof value === 'object') {
                const { authState } = value as AnyRecord;
                customerIds[key] = {
                    id: (value as AnyRecord).id,
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
 * Installs a mock of the Experience Cloud Identity Service of Adobe, `VisitorAPI.js`, as version 5.5 behaves
 * when its requests are blocked, but without any visitor id: the `Visitor` global with `Visitor.getInstance()`
 * and `adobe.OptInCategories`, each only if it is missing; `adobe.optIn` is created by the first
 * `getInstance()` call, as by the library.
 * Ids are empty strings, also in the callbacks, which are called asynchronously, and URLs are returned unchanged
 * by `appendVisitorIDsTo()`, while the library generates a local id and appends it to URLs.
 * As the library stores the id in the `AMCV_<orgId>` cookie, `getInstance()` sets a session cookie with a dummy
 * id, the same for every visitor, if the organization has no such cookie, as some sites read the id from it
 * directly and do not work without it, e.g. the video player of `play.history.com`, see `setDummyIdCookie()`.
 *
 * Requires `createAdobeVisitorInstance()`, `noopFunc()` and `runProtected()` to be injected as well.
 *
 * @returns `true` if anything was installed.
 */
export function mockAdobeVisitor(): boolean {
    const w = window as unknown as AnyRecord;
    let installed = false;

    const CATEGORIES: AnyRecord = {
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

    /**
     * Calls a callback of the page with a receiver, and catches its errors.
     *
     * @param receiver Receiver of the call.
     * @param callback Callback of the page.
     * @param args Arguments of the callback.
     */
    const callWith = (receiver: unknown, callback: unknown, args: unknown[]) => {
        if (typeof callback !== 'function') {
            return;
        }
        try {
            callback.apply(receiver, args);
        } catch (e) {
            // ignore errors of the page callback
        }
    };

    /**
     * Creates `adobe.optIn` of the library, as it is when opt-in does not apply: all categories are approved,
     * the status is `pending`, and permissions are passed to callbacks at once.
     *
     * @returns Opt-in service.
     */
    const createOptIn = (): AnyRecord => {
        const values = Object.keys(CATEGORIES).map((key) => CATEGORIES[key]);
        const permissions: AnyRecord = {};
        values.forEach((category) => {
            permissions[category as string] = true;
        });
        // changes waiting for `complete()`
        let pendingChanges: AnyRecord = {};
        const listeners: Array<{ event: unknown; callback: unknown; context: unknown }> = [];
        const optIn: AnyRecord = {
            Categories: CATEGORIES,
            permissions,
            doesOptInApply: false,
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
         * Returns the categories of a call as a list and checks them, as the library does.
         *
         * @param categories Category or list of categories.
         * @returns List of categories.
         * @throws Error for an unknown category, as the library.
         */
        const toList = (categories: unknown): unknown[] => {
            const list = Array.isArray(categories) ? categories : [categories];
            if (list.length === 0 || list.some((category) => values.indexOf(category) < 0)) {
                throw new Error('[OptIn] Invalid category(-ies). Please use the `OptIn.Categories` enum.');
            }
            return list;
        };
        /**
         * Completes pending changes of the permissions and notifies the listeners of `complete`.
         */
        const complete = () => {
            Object.keys(pendingChanges).forEach((category) => {
                permissions[category] = pendingChanges[category];
            });
            pendingChanges = {};
            setStatus('complete');
            // a copy, as a listener may remove itself
            listeners.slice().forEach((listener) => {
                if (listener.event === 'complete') {
                    callWith(listener.context, listener.callback, [permissions]);
                }
            });
        };
        /**
         * Sets the permission of categories, as `approve()` and `deny()` of the library.
         *
         * @param categories Category or list of categories.
         * @param approved Whether they are approved.
         * @param shouldWaitForComplete Whether to wait for `complete()`.
         * @returns The opt-in service.
         */
        const setPermissions = (categories: unknown, approved: boolean, shouldWaitForComplete: unknown) => {
            // as documented, deferred changes are applied by `complete()`
            toList(categories).forEach((category) => {
                pendingChanges[category as string] = approved;
            });
            setStatus('changed');
            if (!shouldWaitForComplete) {
                complete();
            }
            return optIn;
        };
        optIn.approve = (categories: unknown, wait?: unknown) => setPermissions(categories, true, wait);
        optIn.deny = (categories: unknown, wait?: unknown) => setPermissions(categories, false, wait);
        optIn.approveAll = () => setPermissions(values, true, false);
        optIn.denyAll = () => setPermissions(values, false, false);
        optIn.complete = () => {
            if (optIn.status === 'changed') {
                complete();
            }
        };
        optIn.isApproved = (categories: unknown) => {
            const list = Array.isArray(categories) ? categories : [categories];
            return list.every((category) => permissions[category as string] === true);
        };
        optIn.isPreApproved = () => false;
        optIn.on = (event: unknown, callback: unknown, context?: unknown) => {
            const listener = { event, callback, context };
            listeners.push(listener);
            return () => {
                const index = listeners.indexOf(listener);
                if (index >= 0) {
                    listeners.splice(index, 1);
                }
            };
        };
        optIn.off = (event: unknown, callback: unknown) => {
            for (let i = listeners.length - 1; i >= 0; i -= 1) {
                if (listeners[i].event === event && (!callback || listeners[i].callback === callback)) {
                    listeners.splice(i, 1);
                }
            }
        };
        // as the library when opt-in does not apply: the permissions are passed at once
        optIn.fetchPermissions = (callback: unknown, shouldAutoSubscribe?: unknown) => {
            runProtected(callback, [permissions]);
            if (!shouldAutoSubscribe) {
                return noopFunc;
            }
            return (optIn.on as (event: string, listener: unknown) => () => void)('complete', callback);
        };
        optIn.execute = noopFunc;
        optIn.publish = noopFunc;
        optIn.registerPlugin = noopFunc;
        optIn.memoizeContent = noopFunc;
        optIn.getMemoizedContent = noopFunc;
        return optIn;
    };

    /**
     * Returns the `adobe` global, created if it is missing, keeping its other parts, e.g. `adobe.target`.
     *
     * @returns The `adobe` object.
     */
    const getAdobe = (): AnyRecord => {
        if (!w.adobe || typeof w.adobe !== 'object') {
            w.adobe = {};
        }
        return w.adobe as AnyRecord;
    };

    /**
     * Creates a visitor instance for an organization, registered in `s_c_il` as by the library.
     *
     * @param orgId Organization id, e.g. `ABC@AdobeOrg`.
     * @param config Configuration of the page, copied to the instance.
     * @returns Visitor instance.
     */
    const createInstance = (orgId: string, config: unknown): AnyRecord => {
        const visitor = createAdobeVisitorInstance(orgId, config);
        if (!w.s_c_in) {
            w.s_c_il = [];
            w.s_c_in = 0;
        }
        (w.s_c_il as unknown[])[w.s_c_in as number] = visitor;
        w.s_c_in = (w.s_c_in as number) + 1;
        return visitor;
    };

    /**
     * Returns the instance for an organization as `Visitor.getInstance()`: an existing one from `s_c_il`,
     * otherwise a new one; the opt-in service is created by the first call, as by the library.
     *
     * @param orgId Organization id, `@AdobeOrg` is appended if it is missing.
     * @param config Configuration of the page.
     * @returns Visitor instance.
     * @throws Error without an organization id, as the library.
     */
    const getInstance = (orgId: unknown, config?: unknown): AnyRecord => {
        if (!orgId) {
            throw new Error('Visitor requires Adobe Marketing Cloud Org ID.');
        }
        const id = String(orgId).indexOf('@') < 0 ? `${orgId}@AdobeOrg` : String(orgId);
        setDummyIdCookie(id);
        const adobe = getAdobe();
        if (!adobe.optIn) {
            adobe.optIn = createOptIn();
        }
        const instances = Array.isArray(w.s_c_il) ? w.s_c_il as AnyRecord[] : [];
        for (let i = 0; i < instances.length; i += 1) {
            const instance = instances[i];
            if (instance && instance._c === 'Visitor' && instance.marketingCloudOrgID === id) {
                return instance;
            }
        }
        return createInstance(id, config);
    };

    if (typeof w.Visitor !== 'function') {
        /**
         * The `Visitor` global; instances are created by `Visitor.getInstance()`, as the library requires.
         */
        const Visitor = function Visitor() {
            // instances are created by getInstance()
        } as unknown as AnyRecord;
        Visitor.getInstance = getInstance;
        Visitor.AuthState = { UNKNOWN: 0, AUTHENTICATED: 1, LOGGED_OUT: 2 };
        Visitor.OptOut = { GLOBAL: 'global' };
        Visitor.version = '5.5.0';
        Visitor.windowLoaded = false;
        Visitor.codeLoadEnd = Date.now();
        w.Visitor = Visitor;
        installed = true;
    }
    const adobe = getAdobe();
    if (!adobe.OptInCategories) {
        adobe.OptInCategories = CATEGORIES;
        installed = true;
    }
    return installed;
}
