/* eslint-disable no-underscore-dangle */
// `_il`, `_in` and `_c` are properties of AppMeasurement instances, which other code reads.
import { appMeasurementUnescape, getAppMeasurementQueryParam } from './app-measurement-utils';
import { noopFunc } from './noop-utils';
import { runProtected } from './run-protected';

type AnyRecord = Record<string, unknown>;

/**
 * Installs a mock of AppMeasurement, the library of Adobe Analytics, as version 2.22.1 behaves,
 * without sending any data: the `AppMeasurement` constructor, `s_gi()`, `s_pgicq()`, the instance list
 * `s_c_il` and the ActivityMap module, each only if it is missing.
 * Tracking calls do nothing, except that `tl()` runs its done action, e.g. navigates to the link, as the real one,
 * and no cookies are written. The tracker `s` is not created, as the library does not create it either.
 *
 * Requires `noopFunc()`, `runProtected()`, `appMeasurementUnescape()` and `getAppMeasurementQueryParam()`
 * to be injected as well.
 *
 * @returns `true` if anything was installed.
 */
export function mockAdobeAnalytics(): boolean {
    const w = window as unknown as AnyRecord;
    const doc = window.document;
    let installed = false;

    // Variables which `clearVars()` clears besides `prop<n>`, `eVar<n>`, `hier<n>` and `list<n>`.
    const CLEARED_VARS = [
        'channel',
        'events',
        'eventList',
        'products',
        'productList',
        'purchaseID',
        'transactionID',
        'state',
        'zip',
        'campaign',
    ];
    const CLEARED_VAR_RE = /^(prop|eVar|hier|list)\d+$/;
    const LINK_DOWNLOAD_FILE_TYPES = 'exe,zip,wav,mp3,mov,mpg,avi,wmv,pdf,doc,docx,xls,xlsx,ppt,pptx';

    /**
     * Encodes a value as `escape()` of AppMeasurement: `encodeURIComponent()`
     * with `+~!*()'` encoded as well.
     *
     * @param value Value to encode.
     * @returns Encoded value, or the value itself if it is empty.
     */
    const amEscape = (value: unknown): unknown => {
        if (!value) {
            return value;
        }
        let encoded = encodeURIComponent(String(value));
        const special = "+~!*()'";
        for (let i = 0; i < special.length; i += 1) {
            const char = special.charAt(i);
            encoded = encoded.split(char).join(`%${char.charCodeAt(0).toString(16).toUpperCase()}`);
        }
        return encoded;
    };

    /**
     * Replaces all occurrences of a string, as `replace()` of AppMeasurement.
     *
     * @param value Value to change.
     * @param search String to replace.
     * @param replacement Replacement.
     * @returns Changed value, or the value itself if it does not contain the string.
     */
    const replace = (value: unknown, search: unknown, replacement: unknown): unknown => {
        if (!value || String(value).indexOf(String(search)) < 0) {
            return value;
        }
        return String(value).split(String(search)).join(String(replacement));
    };

    /**
     * Reads a cookie as `cookieRead()` of AppMeasurement: the name is escaped, the value unescaped,
     * and the empty value written by the library, `[[B]]`, is returned as `''`.
     *
     * @param name Cookie name.
     * @returns Cookie value, or `''` if there is none.
     */
    const cookieRead = (name: unknown): string => {
        const key = amEscape(name);
        const cookies = ` ${doc.cookie}`;
        const start = cookies.indexOf(` ${key}=`);
        if (start < 0) {
            return '';
        }
        const end = cookies.indexOf(';', start);
        const value = appMeasurementUnescape(
            cookies.substring(start + 2 + String(key).length, end < 0 ? cookies.length : end),
        );
        return value !== '[[B]]' ? value : '';
    };

    /**
     * Returns the report suites of an account, separated by commas.
     *
     * @param account Account, e.g. `rsid1,rsid2`.
     * @returns Report suites.
     */
    const splitAccounts = (account: unknown): string[] => String(account).split(',');

    /**
     * Constructor of AppMeasurement instances, `new AppMeasurement(account)`.
     * A plain function, as a class would need Babel helpers which are not in the built resources.
     *
     * @param this Created instance.
     * @param account Report suite ids, separated by commas.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AppMeasurement = function AppMeasurement(this: any, account?: unknown) {
        const s = this as AnyRecord;
        // registration in the list of instances, with the quirk of the real one
        if (!w.s_c_in) {
            w.s_c_il = [];
            w.s_c_in = 0;
        }
        s._il = w.s_c_il;
        s._in = w.s_c_in;
        (w.s_c_il as unknown[])[w.s_c_in as number] = s;
        w.s_c_in = (w.s_c_in as number) + 1;
        s._c = 's_c';

        s.version = '2.22.1';
        s.usePostbacks = 0;
        s.tagContainerMarker = '';
        s.ssl = w.location ? (w.location as Location).protocol === 'https:' : false;
        s.charSet = 'UTF-8';
        s.contextData = {};
        s.writeSecureCookies = false;
        s.offlineThrottleDelay = 0;
        s.offlineFilename = 'AppMeasurement.offline';
        s.linkDownloadFileTypes = LINK_DOWNLOAD_FILE_TYPES;
        s.maxDelay = 250;
        s.useForcedLinkTracking = 1;

        const modules: AnyRecord = {};

        // As the real one, the report suites of the previous accounts are kept, sorted and without duplicates,
        // so that `s_gi()` still returns this instance for them.
        s.setAccount = (newAccount: unknown) => {
            s.account = newAccount;
            const suites = Array.isArray(s.allAccounts)
                ? (s.allAccounts as string[]).concat(splitAccounts(newAccount)).sort()
                : splitAccounts(newAccount);
            s.allAccounts = suites.filter((suite, index) => index === 0 || suites[index - 1] !== suite);
        };
        s.sa = s.setAccount;
        s.setTagContainer = noopFunc;
        s.forceOnline = noopFunc;
        s.forceOffline = noopFunc;
        // no requests are buffered or sent, AppMeasurement 2.25+
        s.bufferRequests = noopFunc;
        s.delayReady = noopFunc;
        s.doPostbacks = noopFunc;
        // no variables are tracked
        s.foreachVar = noopFunc;
        // debug logging of AppMeasurement 2.27+
        s.log = noopFunc;
        s.escape = amEscape;
        s.unescape = appMeasurementUnescape;
        s.replace = replace;
        s.cookieRead = cookieRead;
        s.c_r = cookieRead;
        // no cookie is written, as when cookies are not available
        s.cookieWrite = () => false;
        s.c_w = s.cookieWrite;
        // no hit is tracked, so these callbacks are never called
        s.registerPreTrackCallback = noopFunc;
        s.registerPostTrackCallback = noopFunc;
        s.isReadyToTrack = () => true;
        s.callbackWhenReadyToTrack = (receiver: unknown, callback: unknown, args: unknown) => {
            if (typeof callback !== 'function') {
                return;
            }
            window.setTimeout(() => {
                try {
                    callback.apply(receiver, Array.isArray(args) ? args : []);
                } catch (e) {
                    // ignore errors of the page callback
                }
            }, 0);
        };
        s.t = () => undefined;
        s.track = s.t;
        s.trackLight = (profileId: unknown, storeForSeconds: unknown, incrementBy: unknown) => {
            s.lightProfileID = profileId;
            s.lightStoreForSeconds = storeForSeconds;
            s.lightIncrementBy = incrementBy;
        };
        s.tl = (
            linkObject: unknown,
            linkType: unknown,
            linkName: unknown,
            variableOverrides: unknown,
            doneAction: unknown,
        ) => {
            s.linkObject = linkObject;
            s.linkType = linkType;
            s.linkName = linkName;
            if (!doneAction) {
                return;
            }
            // as the real one once the hit has been sent: a function is called, otherwise the link is followed
            window.setTimeout(() => {
                if (typeof doneAction === 'function') {
                    runProtected(doneAction, []);
                    return;
                }
                const href = linkObject && (linkObject as AnyRecord).href;
                if (href) {
                    doc.location.href = String(href);
                }
            }, 0);
        };
        s.trackLink = s.tl;
        s.clearVars = () => {
            Object.keys(s).forEach((key) => {
                if (CLEARED_VAR_RE.test(key) || CLEARED_VARS.indexOf(key) >= 0) {
                    s[key] = undefined;
                }
            });
        };
        s.loadModule = (name: unknown, onLoad?: unknown) => {
            const moduleName = String(name);
            let module = modules[moduleName] as AnyRecord | undefined;
            if (!module) {
                module = {};
                const ModuleConstructor = w[`AppMeasurement_Module_${moduleName}`];
                if (typeof ModuleConstructor === 'function') {
                    try {
                        // eslint-disable-next-line new-cap
                        module = new (ModuleConstructor as new (tracker: unknown) => AnyRecord)(s);
                    } catch (e) {
                        // a real module may need the real library
                        module = {};
                    }
                }
                const loaded = module as AnyRecord;
                modules[moduleName] = loaded;
                s[moduleName] = loaded;
                let onLoadCallback: unknown;
                try {
                    // as the real one: a callback assigned to `onLoad` is called at once
                    Object.defineProperty(loaded, 'onLoad', {
                        configurable: true,
                        get: () => onLoadCallback,
                        set: (callback: unknown) => {
                            onLoadCallback = callback;
                            runProtected(callback, [s, loaded]);
                        },
                    });
                } catch (e) {
                    // a module object of the page may not allow it
                }
            }
            runProtected(onLoad, [s, module]);
        };
        s.Util = {
            urlEncode: amEscape,
            urlDecode: appMeasurementUnescape,
            cookieRead,
            cookieWrite: s.cookieWrite,
            getQueryParam: (key: unknown, url?: unknown, delimiter?: unknown, undefinedIfEmpty?: unknown) => {
                const target = url || s.pageURL || w.location;
                return getAppMeasurementQueryParam(key, target, delimiter, undefinedIfEmpty);
            },
            getIeVersion: () => (doc as Document & { documentMode?: number }).documentMode || null,
        };

        if (account) {
            (s.setAccount as (suites: unknown) => void)(account);
        }
        (s.loadModule as (name: string) => void)('ActivityMap');
    };

    /**
     * Calls a method of a tracker as a method, i.e. with the tracker as its receiver, as AppMeasurement does,
     * e.g. of a tracker of the page in `s_c_il`, and catches its errors.
     *
     * @param tracker Tracker.
     * @param name Name of the method.
     * @param args Arguments.
     */
    const callMethod = (tracker: unknown, name: string, args: unknown[]) => {
        const method = tracker ? (tracker as AnyRecord)[name] : undefined;
        if (typeof method !== 'function') {
            return;
        }
        try {
            method.apply(tracker, args);
        } catch (e) {
            // ignore errors of a tracker of the page
        }
    };

    /**
     * Returns the instance for the report suites as `s_gi()` of AppMeasurement:
     * an existing instance with the same account or a common report suite, otherwise a new one.
     *
     * @param account Report suite ids, separated by commas.
     * @returns AppMeasurement instance.
     */
    const sGi = (account: unknown): unknown => {
        const instances = Array.isArray(w.s_c_il) ? w.s_c_il as AnyRecord[] : [];
        const wanted = splitAccounts(account);
        for (let i = 0; i < instances.length; i += 1) {
            const instance = instances[i];
            if (instance && instance._c === 's_c' && (instance.account || instance.oun)) {
                let matches = !!instance.account && instance.account === account;
                if (!matches) {
                    const own = Array.isArray(instance.allAccounts)
                        ? instance.allAccounts as unknown[]
                        : splitAccounts(instance.account || instance.oun);
                    matches = wanted.some((suite) => own.indexOf(suite) >= 0);
                }
                if (matches) {
                    callMethod(instance, 'setAccount', [account]);
                    return instance;
                }
            }
        }
        // eslint-disable-next-line new-cap
        return new (AppMeasurement as unknown as new (suites: unknown) => unknown)(account);
    };

    if (typeof w.AppMeasurement !== 'function') {
        (AppMeasurement as unknown as AnyRecord).getInstance = sGi;
        w.AppMeasurement = AppMeasurement;
        installed = true;
    }
    if (typeof w.s_gi !== 'function') {
        w.s_gi = sGi;
        installed = true;
    }
    if (typeof w.s_pgicq !== 'function') {
        // runs the queue of the legacy H code, as the real one when it is loaded
        w.s_pgicq = () => {
            const queue = w.s_giq;
            if (Array.isArray(queue)) {
                queue.forEach((item: AnyRecord) => {
                    const tracker = (w.s_gi as (account: unknown) => AnyRecord)(item && item.oun);
                    callMethod(tracker, 'setAccount', [item && item.un]);
                    callMethod(tracker, 'setTagContainer', [item && item.tagContainerName]);
                });
            }
            w.s_giq = 0;
        };
        runProtected(w.s_pgicq, []);
        installed = true;
    }
    if (w.s_objectID === undefined) {
        w.s_objectID = 0;
    }
    if (typeof w.AppMeasurement_Module_ActivityMap !== 'function') {
        w.AppMeasurement_Module_ActivityMap = function AppMeasurementModuleActivityMap() {
            // an empty module: links are not tracked
        };
        installed = true;
    }
    return installed;
}
