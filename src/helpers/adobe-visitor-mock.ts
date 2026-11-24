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
 * `getInstance()` call, as by the library, or at once with `isOptInCreated`, as by the library of Adobe Tags,
 * whose Experience Cloud ID extension calls `getInstance()` when it is loaded.
 * The opt-in service follows the configuration of the first `getInstance()` call, as the library:
 * with `doesOptInApply`, only the categories of `preOptInApprovals` and of `previousPermissions`, i.e. of the saved
 * decision of the visitor, are approved until the page approves the other ones, e.g. by its consent manager,
 * otherwise all categories are approved. Permissions are not stored, i.e. as with `isOptInStorageEnabled: false`.
 * Created at once, its configuration is not known, so opt-in applies and no category is approved,
 * so that the page is not told that the visitor has consented.
 * Ids are empty strings, also in the callbacks, which are called asynchronously, and URLs are returned unchanged
 * by `appendVisitorIDsTo()`, while the library generates a local id and appends it to URLs.
 * As the library stores the id in the `AMCV_<orgId>` cookie, `getInstance()` sets a session cookie with a dummy
 * id, the same for every visitor, if the organization has no such cookie, as some sites read the id from it
 * directly and do not work without it, e.g. the video player of `play.history.com`, see `setDummyIdCookie()`.
 *
 * Requires `createAdobeVisitorInstance()`, `noopFunc()` and `runProtected()` to be injected as well.
 *
 * @param isOptInCreated Whether `adobe.optIn` is created at once if `Visitor` is installed by this call,
 * i.e. not if it is a library of the page, which creates its own one.
 * @returns `true` if anything was installed.
 */
export function mockAdobeVisitor(isOptInCreated?: boolean): boolean {
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
     * Creates `adobe.optIn` as `OptIn` of the library, version 5.5.0, but without its storage, i.e. as with
     * `isOptInStorageEnabled: false`, and without the IAB plugin:
     * - if opt-in does not apply, all categories are approved; otherwise none is, except the ones
     *   of `preOptInApprovals`, and then the ones of `previousPermissions`, i.e. the saved decision of the visitor,
     *   which may also deny a pre-approved category;
     * - the status is `complete` if valid `previousPermissions` are passed, otherwise `pending`;
     * - `approve()` and `deny()` change the permissions when they are completed, at once or by `complete()`;
     * - `fetchPermissions()` calls the callback at once if opt-in does not apply, the status is `complete`
     *   or `preOptInApprovals` are passed, otherwise once, when the permissions are completed.
     *
     * @param doesOptInApply Whether opt-in applies, i.e. categories need the consent of the visitor.
     * @param previousPermissions Saved permissions of the visitor, e.g. `{ aa: false }`, or their JSON.
     * @param preOptInApprovals Categories approved before the consent, e.g. `{ aa: true }`, or their JSON.
     * @returns Opt-in service.
     */
    const createOptIn = (
        doesOptInApply: boolean,
        previousPermissions?: unknown,
        preOptInApprovals?: unknown,
    ): AnyRecord => {
        const values = Object.keys(CATEGORIES).map((key) => CATEGORIES[key]) as string[];
        // other names which the library accepts in permissions
        const OTHER_NAMES = ['videoaa', 'iabConsentHash'];

        /**
         * Returns permissions passed as an object or as its JSON, as the library.
         *
         * @param value Permissions of the configuration.
         * @returns Permissions by category, empty if they are not valid.
         */
        const toPermissions = (value: unknown): AnyRecord => {
            let result = value;
            if (typeof result === 'string') {
                try {
                    result = JSON.parse(result);
                } catch (e) {
                    return {};
                }
            }
            return result !== null && typeof result === 'object' && !Array.isArray(result)
                ? result as AnyRecord
                : {};
        };
        const previous = toPermissions(previousPermissions);
        const preApprovals = toPermissions(preOptInApprovals);
        const previousNames = Object.keys(previous);
        // as the library, a saved decision completes the opt-in if it has only names of categories
        const hasPrevious = previousNames.length > 0
            && previousNames.every((name) => values.indexOf(name) > -1 || OTHER_NAMES.indexOf(name) > -1);

        // the current permissions, and the ones with the changes waiting for `complete()`,
        // which become the current ones then, as in the library
        let permissions: AnyRecord = {};
        values.forEach((category) => {
            permissions[category] = !doesOptInApply;
        });
        if (doesOptInApply) {
            [preApprovals, previous].forEach((source) => {
                Object.keys(source).forEach((name) => {
                    permissions[name] = source[name];
                });
            });
        }
        const changedPermissions: AnyRecord = {};
        Object.keys(permissions).forEach((name) => {
            changedPermissions[name] = permissions[name];
        });

        const listeners: Array<{ event: unknown; callback: unknown; context: unknown }> = [];
        // callbacks of `fetchPermissions()` waiting for the permissions to be completed
        let waitingCallbacks: unknown[] = [];
        const optIn: AnyRecord = {
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
        setStatus(hasPrevious ? 'complete' : 'pending');
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
        const areApproved = (categories: unknown, approvals: AnyRecord): boolean => {
            const list = toList(categories);
            if (list.length > 0) {
                return list.every((category) => !!approvals[category as string]);
            }
            const names = Object.keys(approvals);
            return names.length > 0 && names.every((name) => approvals[name] === true);
        };
        /**
         * Completes the changes of the permissions, notifies the listeners of `complete`,
         * and then the callbacks of `fetchPermissions()` which wait for it, once.
         */
        const complete = () => {
            permissions = changedPermissions;
            optIn.permissions = permissions;
            setStatus('complete');
            // a copy, as a listener may remove itself
            listeners.slice().forEach((listener) => {
                if (listener.event === 'complete') {
                    callWith(listener.context, listener.callback, [permissions]);
                }
            });
            const callbacks = waitingCallbacks;
            waitingCallbacks = [];
            callbacks.forEach((callback) => runProtected(callback, [permissions]));
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
            });
            if (!shouldWaitForComplete) {
                complete();
            }
            return optIn;
        };
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
        optIn.on = (event: unknown, callback: unknown, context?: unknown) => {
            if (typeof callback !== 'function') {
                // as the library
                throw new Error('[ON] Callback should be a function.');
            }
            const listener = { event, callback, context };
            listeners.push(listener);
            return () => {
                const index = listeners.indexOf(listener);
                if (index >= 0) {
                    listeners.splice(index, 1);
                }
            };
        };
        // as the library, only the listeners with the callback are removed, so none without a callback
        optIn.off = (event: unknown, callback: unknown) => {
            for (let i = listeners.length - 1; i >= 0; i -= 1) {
                if (listeners[i].event === event && listeners[i].callback === callback) {
                    listeners.splice(i, 1);
                }
            }
        };
        optIn.fetchPermissions = (callback: unknown, shouldAutoSubscribe?: unknown) => {
            const unsubscribe = shouldAutoSubscribe
                ? (optIn.on as (event: string, listener: unknown) => () => void)('complete', callback)
                : noopFunc;
            if (!doesOptInApply || optIn.isComplete || !!preOptInApprovals) {
                runProtected(callback, [permissions]);
            } else if (!shouldAutoSubscribe) {
                // the visitor has not decided yet
                waitingCallbacks.push(callback);
            }
            return unsubscribe;
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
    const getOptInConfig = (config: unknown): AnyRecord => {
        const result: AnyRecord = { doesOptInApply: false, hasFailed: false };
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
            return Object.prototype.propertyIsEnumerable.call(config, name) ? (config as AnyRecord)[name] : undefined;
        };
        try {
            let doesOptInApply = getOwn('doesOptInApply');
            if (typeof doesOptInApply === 'function') {
                doesOptInApply = doesOptInApply();
            }
            result.doesOptInApply = !!normalize(doesOptInApply);
            result.previousPermissions = normalize(getOwn('previousPermissions'));
            result.preOptInApprovals = normalize(getOwn('preOptInApprovals'));
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
    const getInstance = (orgId: unknown, config?: unknown): AnyRecord => {
        if (!orgId) {
            throw new Error('Visitor requires Adobe Marketing Cloud Org ID.');
        }
        const id = String(orgId).indexOf('@') < 0 ? `${orgId}@AdobeOrg` : String(orgId);
        setDummyIdCookie(id);
        const instances = Array.isArray(w.s_c_il) ? w.s_c_il as AnyRecord[] : [];
        for (let i = 0; i < instances.length; i += 1) {
            const instance = instances[i];
            if (instance && instance._c === 'Visitor' && instance.marketingCloudOrgID === id) {
                return instance;
            }
        }
        // as the library, the configuration is read for each new instance
        const optInConfig = getOptInConfig(config);
        const adobe = getAdobe();
        if (!adobe.optIn) {
            // as the library, saved permissions may be a function, which is called when the opt-in is created
            let { previousPermissions } = optInConfig;
            if (typeof previousPermissions === 'function' && !optInConfig.hasFailed) {
                try {
                    previousPermissions = previousPermissions();
                } catch (e) {
                    optInConfig.hasFailed = true;
                }
            }
            // The library throws if a function of the configuration throws, so there is no opt-in then.
            // Here it is still created, so that page code does not throw, but as the decision of the visitor
            // is not known, opt-in applies and no category is approved, also not a pre-approved one.
            adobe.optIn = optInConfig.hasFailed
                ? createOptIn(true)
                : createOptIn(
                    optInConfig.doesOptInApply as boolean,
                    previousPermissions,
                    optInConfig.preOptInApprovals,
                );
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
        if (isOptInCreated) {
            const adobeObject = getAdobe();
            if (!adobeObject.optIn) {
                // the configuration of the site is not known, so no consent is assumed
                adobeObject.optIn = createOptIn(true);
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
