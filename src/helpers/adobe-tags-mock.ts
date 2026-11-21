/* eslint-disable no-underscore-dangle */
// `_satellite`, `__satelliteLoaded` and `_c` are names of Adobe Tags and of the Visitor API, which page code reads.
import { createAdobeVisitorInstance } from './adobe-visitor-mock';
import { noopFunc } from './noop-utils';

type AnyRecord = Record<string, unknown>;

/**
 * Installs a mock of `_satellite`, the API of Adobe Tags (formerly Launch), as the library, version 29,
 * defines it for a library without rules, data elements and extensions: page code which calls it,
 * e.g. `_satellite.track('event')` or `_satellite.pageBottom()`, does not throw, and nothing is run or sent.
 * An existing `_satellite` object, e.g. one which the page has created, is completed in place, as by the library,
 * unless it already has `track()`, e.g. the real library or this mock loaded before.
 *
 * `getVar()` returns the values set by `setVar()`, as there are no data elements, and `cookie.get()`
 * and `readCookie()` read the cookies of the page, but no cookies are written. `getVisitorId()` returns
 * the first instance of the Visitor API on the page, e.g. created by its code, otherwise an instance
 * of the mock of the Visitor API without an organization, whose ids are empty strings,
 * so that e.g. `_satellite.getVisitorId().getMarketingCloudVisitorID()` does not throw.
 * `window.__satelliteLoaded` is set, as by the library, so that a real library loaded later is not run.
 *
 * Requires `createAdobeVisitorInstance()`, `noopFunc()` and `runProtected()` to be injected as well.
 *
 * @returns `true` if the mock was installed.
 */
export function mockAdobeSatellite(): boolean {
    const w = window as unknown as AnyRecord;
    const existing = w._satellite;
    const isObject = !!existing && (typeof existing === 'object' || typeof existing === 'function');
    if (isObject && typeof (existing as AnyRecord).track === 'function') {
        return false;
    }
    // Members are plain own properties, as pages copy the object, e.g. by `{ ...window._satellite }`.
    const satellite: AnyRecord = isObject ? existing as AnyRecord : {};
    const customVars: AnyRecord = {};
    let visitorInstance: AnyRecord | null = null;

    /**
     * Returns the value at a path of properties, as `getVar()` of the library: `getAttribute(<name>)` calls
     * the method of an element, and with `supportSpecial`, `@text` and `@cleanText` return its text.
     *
     * @param host Object to start from.
     * @param chain Names of the properties.
     * @param supportSpecial Whether `@text` and `@cleanText` are supported.
     * @returns The value, or `undefined` if a part of the path is missing.
     */
    const getProperty = (host: unknown, chain: string[], supportSpecial?: boolean): unknown => {
        let value = host as AnyRecord | null | undefined;
        for (let i = 0; i < chain.length; i += 1) {
            if (value === null || value === undefined) {
                return undefined;
            }
            const prop = chain[i];
            const attributeMatch = /^getAttribute\((.+)\)$/.exec(prop);
            if (supportSpecial && prop.charAt(0) === '@') {
                const text = (value as unknown as Node).textContent;
                if (prop === '@text') {
                    value = text as unknown as AnyRecord;
                } else if (prop === '@cleanText') {
                    const clean = typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : text;
                    value = clean as unknown as AnyRecord;
                } else {
                    // the library throws for an unknown special property
                    return undefined;
                }
            } else if (typeof value.getAttribute === 'function' && attributeMatch) {
                value = (value as unknown as Element).getAttribute(attributeMatch[1]) as unknown as AnyRecord;
            } else {
                value = value[prop] as AnyRecord;
            }
        }
        return value;
    };

    /**
     * Returns the value of a variable as `_satellite.getVar()` of a library without data elements:
     * a variable set by `setVar()`, or a property of the event of a rule, e.g. `event.type`, `this.id`
     * or `target.href`, if it is passed.
     *
     * @param variable Name of the variable, with a path of properties, e.g. `name.prop`.
     * @param syntheticEvent Event of a rule.
     * @returns The value, or `undefined` if there is none.
     */
    const getVar = (variable: unknown, syntheticEvent?: unknown): unknown => {
        if (typeof variable !== 'string') {
            return undefined;
        }
        const chain = variable.split('.');
        const hostName = chain.shift() as string;
        const event = syntheticEvent as AnyRecord | undefined;
        if (hostName === 'this') {
            return event ? getProperty(event.element, chain, true) : undefined;
        }
        if (hostName === 'event') {
            return event ? getProperty(event, chain) : undefined;
        }
        if (hostName === 'target') {
            return event ? getProperty(event.target, chain) : undefined;
        }
        if (!Object.prototype.hasOwnProperty.call(customVars, hostName)) {
            return undefined;
        }
        return getProperty(customVars[hostName], chain);
    };

    /**
     * Sets a variable, or each property of an object as a variable, as `_satellite.setVar()`.
     *
     * @param name Name of the variable, or an object with variables.
     * @param value Value of the variable.
     */
    const setVar = (name: unknown, value?: unknown) => {
        if (typeof name === 'string') {
            customVars[name] = value;
        } else if (name && typeof name === 'object') {
            Object.keys(name).forEach((key) => {
                customVars[key] = (name as AnyRecord)[key];
            });
        }
    };

    /**
     * Returns a cookie of the page, or all of them, as `_satellite.cookie.get()`, i.e. js-cookie 2.
     *
     * @param key Name of the cookie.
     * @returns Value of the cookie, `undefined` if it is missing, or an object with all cookies without a name.
     */
    const getCookie = (key?: unknown): unknown => {
        const jar: AnyRecord = {};
        let cookies: string[] = [];
        try {
            cookies = window.document.cookie ? window.document.cookie.split('; ') : [];
        } catch (e) {
            // cookies may not be available, e.g. in a sandboxed frame
        }
        const decode = (str: string) => str.replace(/(%[0-9A-Z]{2})+/g, decodeURIComponent);
        for (let i = 0; i < cookies.length; i += 1) {
            const parts = cookies[i].split('=');
            let cookie = parts.slice(1).join('=');
            if (cookie.charAt(0) === '"') {
                cookie = cookie.slice(1, -1);
            }
            try {
                const name = decode(parts[0]);
                jar[name] = decode(cookie);
                if (key === name) {
                    break;
                }
            } catch (e) {
                // as js-cookie, a cookie which cannot be decoded is skipped
            }
        }
        return key ? jar[key as string] : jar;
    };

    /**
     * Returns the instance of the Visitor API, as `_satellite.getVisitorId()` of the Experience Cloud ID
     * extension: the first one on the page, e.g. created by its code, as the organization of the library
     * is not known, otherwise an instance of the mock without an organization, not registered in `s_c_il`,
     * so that the page can still get its own instance.
     *
     * @returns Visitor instance.
     */
    const getVisitorId = (): AnyRecord => {
        const instances = Array.isArray(w.s_c_il) ? w.s_c_il as AnyRecord[] : [];
        for (let i = 0; i < instances.length; i += 1) {
            const instance = instances[i];
            if (instance && instance._c === 'Visitor') {
                return instance;
            }
        }
        if (!visitorInstance) {
            visitorInstance = createAdobeVisitorInstance('');
        }
        return visitorInstance;
    };

    // As the direct call rules of the library; the parameters are declared, as pages may check `track.length`.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    satellite.track = (identifier: unknown, detail?: unknown) => {
        // no rules are run
    };
    satellite.getVar = getVar;
    satellite.setVar = setVar;
    satellite.getVisitorId = getVisitorId;
    // as the library without debugging enabled: nothing is logged
    satellite.logger = {
        log: noopFunc,
        info: noopFunc,
        debug: noopFunc,
        warn: noopFunc,
        error: noopFunc,
    };
    satellite.notify = noopFunc;
    satellite.cookie = {
        get: getCookie,
        set: noopFunc,
        remove: noopFunc,
    };
    satellite.readCookie = (name: unknown) => getCookie(name);
    satellite.setCookie = noopFunc;
    satellite.removeCookie = noopFunc;
    satellite.pageBottom = noopFunc;
    satellite.setDebug = noopFunc;
    satellite.buildInfo = {
        buildDate: '2026-06-04T21:23:22Z',
        minified: true,
        turbineBuildDate: '2026-06-04T21:23:22Z',
        turbineVersion: '29.0.0',
    };
    satellite.environment = { id: '', stage: 'production' };
    satellite.property = { id: '', name: '' };
    satellite.company = { orgId: '', dynamicCdnEnabled: false };
    w._satellite = satellite;
    w.__satelliteLoaded = true;
    return true;
}
