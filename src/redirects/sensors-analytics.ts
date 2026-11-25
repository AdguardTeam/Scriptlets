import { hit, noopFunc, runProtected } from '../helpers';
import { type Source } from '../scriptlets';

/**
 * @redirect sensors-analytics
 *
 * @description
 * Mocks the JavaScript SDK of Sensors Analytics (Sensors Data, 神策数据), e.g. `sensorsdata.min.js`
 * of `sa-sdk-javascript`, i.e. the `sensorsDataAnalytic201505` global.
 * See the SDK: https://github.com/sensorsdata/sa-sdk-javascript
 *
 * Should be used if a rule blocks the SDK and the page breaks without it, as page code usually calls it
 * without a check, e.g. `var sensors = sensorsDataAnalytic201505; sensors.init({ ... });`,
 * so that the rest of the page code is not run.
 *
 * The public methods of the SDK do nothing, and no data is sent, so `track()` and `quick('autoTrack')`
 * send no events and `login()` stores no id. Callbacks of the page are called as by the SDK when its request
 * is done, i.e. without arguments: the ones of `track()`, `trackSignup()`, `login()`, the profile methods,
 * e.g. `setProfile()`, of `quick('autoTrack')`, and of `quick('trackHeatMap')` and `quick('trackAllHeatMap')`
 * for the elements whose click they send, asynchronously, and the one of `quick('isReady')` at once,
 * while `trackLink()` and `trackLinks()` do not change links, so they are followed at once.
 * Ids are empty, e.g. of `quick('getAnonymousID')` and `store.getDistinctId()`, and `getPresetProperties()`
 * returns no properties of the visitor. As by the SDK, callbacks of the calls made while it is disabled
 * by `disableSDK()` are not called.
 *
 * If the SDK is loaded by the snippet of the SDK, i.e. `sensorsDataAnalytic201505` is the name of the global
 * which it has defined, e.g. `sensors`, it is replaced and the commands which it has queued are run,
 * as by the SDK. If the SDK or the mock is already on the page, nothing is changed.
 * No requests are sent, and no cookies or storage items are set.
 *
 * ### Examples
 *
 * ```adblock
 * ||example.org/js/sensorsdata.min.js$script,redirect=sensors-analytics
 * /sensorsdata.min.js$script,redirect=sensors-analytics,domain=example.org
 * ```
 *
 * @added unknown.
 */

type AnyRecord = Record<string, any>;

export function SensorsAnalytics(source: Source) {
    const w = window as unknown as AnyRecord;
    const GLOBAL_NAME = 'sensorsDataAnalytic201505';
    const isObject = (value: unknown): value is AnyRecord => !!value && typeof value === 'object';
    const hasOwn = (obj: unknown, key: string): boolean => Object.prototype.hasOwnProperty.call(obj, key);
    const isPlainObject = (value: unknown): value is AnyRecord => {
        return Object.prototype.toString.call(value) === '[object Object]';
    };
    // attribute of the elements whose clicks the click listener of the SDK sends
    const DEFAULT_TRACK_ATTRIBUTE = 'data-sensors-click';

    const existing = w[GLOBAL_NAME];
    // the SDK, e.g. one bundled in the page code, or the mock is already on the page
    if (isObject(existing)) {
        return;
    }
    // name of the global of the snippet of the SDK, e.g. `sensors`
    const snippetName = typeof existing === 'string' && existing !== GLOBAL_NAME ? existing : '';

    const sd: AnyRecord = {};

    // Public methods of the SDK 1.28.2 which do nothing here; some are replaced below.
    const METHODS = [
        'addReferrerHost', 'appendProfile', 'bind', 'checkLatestProps', 'clearAllRegister', 'clearPageRegister',
        'deleteItem', 'deleteProfile', 'detectMode', 'disableLocalLog', 'disableSDK', 'enableLocalLog',
        'enableSDK', 'getAppStatus', 'getCurrentDomain', 'getDisabled', 'getPresetProperties', 'identify',
        'incrementProfile', 'init', 'initLatestProps', 'initPara', 'isNewUser', 'log', 'login', 'loginWithKey',
        'logout', 'on', 'quick', 'register', 'registerFeature', 'registerInterceptor', 'registerOnce',
        'registerPage', 'registerPropertyPlugin', 'registerSession', 'registerSessionOnce',
        'resetAnonymousIdentity', 'setInitVar', 'setItem', 'setOnceProfile', 'setProfile', 'track', 'trackLink',
        'trackLinks', 'trackSignup', 'unbind', 'unsetProfile', 'use',
    ];
    METHODS.forEach((name) => {
        sd[name] = noopFunc;
    });

    /**
     * Calls a callback of the page asynchronously, as the SDK calls it after its request is done.
     *
     * @param callback Callback of the page.
     */
    const callLater = (callback: unknown) => {
        if (typeof callback === 'function') {
            w.setTimeout(() => runProtected(callback, []), 0);
        }
    };

    // methods with a callback, and the index of the callback in their arguments
    const CALLBACK_INDEXES: Record<string, number> = {
        track: 2,
        trackSignup: 3,
        login: 1,
        setProfile: 1,
        setOnceProfile: 1,
        appendProfile: 1,
        incrementProfile: 1,
        unsetProfile: 1,
        deleteProfile: 0,
    };
    Object.keys(CALLBACK_INDEXES).forEach((name) => {
        sd[name] = function callbackMethod() {
            // eslint-disable-next-line prefer-rest-params
            callLater(arguments[CALLBACK_INDEXES[name]]);
        };
    });

    const STATE_TYPE = { 1: '1-init未开始', 2: '2-init开始', 3: '3-store完成' };
    const readyState = {
        state: 0,
        stateType: STATE_TYPE,
        historyState: [] as string[],
        getState() {
            return this.historyState.join('\n');
        },
        setState(state: unknown) {
            if (hasOwn(STATE_TYPE, String(state))) {
                this.state = Number(state);
                this.historyState.push(STATE_TYPE[state as 1 | 2 | 3]);
            }
        },
    };
    sd.readyState = readyState;
    sd.para = {};

    /**
     * Initializes the SDK: only the options of the page are kept, and nothing is sent.
     *
     * @param para Options of the page, e.g. `{ server_url, heatmap }`.
     */
    sd.init = (para?: unknown) => {
        if (readyState.state >= 2) {
            return;
        }
        if (isObject(para)) {
            sd.para = para;
        }
        // As the SDK, which keeps only the names in an array of `track_attr`, and always adds its own one.
        const { heatmap } = sd.para;
        if (isPlainObject(heatmap)) {
            const isName = (attributeName: unknown) => !!attributeName && typeof attributeName === 'string';
            const attributes = Array.isArray(heatmap.track_attr) ? heatmap.track_attr.filter(isName) : [];
            attributes.push(DEFAULT_TRACK_ATTRIBUTE);
            heatmap.track_attr = attributes;
        }
        readyState.setState(2);
        readyState.setState(3);
    };

    // as the SDK without the bridge of an app: the status is not known, and the function is not called
    sd.getAppStatus = () => null;
    sd.getCurrentDomain = () => w.location.hostname;
    sd.isNewUser = () => false;
    sd.getPresetProperties = () => ({ identities: {} });

    /**
     * Calls the callback of a click on an element as `heatmap.start()` of the SDK, which sends `$WebClick`
     * by `track()`, which calls the callback, unless `para.heatmap.collect_element()` of the page excludes
     * the element, or a link is sent by `trackLink()`, which has no callback, as `para.heatmap.isTrackLink`
     * is set. As by the SDK, the callback may be passed instead of the properties.
     *
     * @param element Clicked element.
     * @param tagName Tag name of the element, in lower case.
     * @param props Properties of the event, or the callback.
     * @param callback Callback of the page.
     */
    const trackClick = (element: AnyRecord, tagName: string, props: unknown, callback: unknown) => {
        const { heatmap } = sd.para;
        const isCollected = isPlainObject(heatmap) && typeof heatmap.collect_element === 'function'
            ? heatmap.collect_element(element)
            : true;
        if (!isCollected) {
            return;
        }
        if (tagName === 'a' && heatmap && heatmap.isTrackLink === true) {
            return;
        }
        let clickCallback;
        if (typeof callback === 'function') {
            clickCallback = callback;
        } else if (typeof props === 'function') {
            clickCallback = props;
        }
        // The SDK creates the properties of the event, so the object of the page is not passed.
        // As by the SDK, properties which are `undefined` are not copied. They are defined, not assigned,
        // so that a `__proto__` property of the page does not change the prototype of the object.
        const clickProps: AnyRecord = {};
        if (isPlainObject(props)) {
            Object.keys(props).forEach((key) => {
                if (props[key] !== undefined) {
                    Object.defineProperty(clickProps, key, {
                        value: props[key],
                        writable: true,
                        enumerable: true,
                        configurable: true,
                    });
                }
            });
        }
        // By `track()` of the SDK object, as the SDK, so nothing is called if the SDK is disabled,
        // e.g. by `collect_element()`, or if this is called as a method of `commonWays` then.
        sd.track('$WebClick', clickProps, clickCallback);
    };

    /**
     * Checks whether an element has one of the attributes which mark it for the click listener of the SDK,
     * so that `trackHeatMap()` does not send its click, as the SDK.
     *
     * @param element Element.
     * @param names Names of the attributes, or one name, which the page may set after `init()`.
     * @returns `true` if the element has one of them.
     */
    const hasTrackAttribute = (element: AnyRecord, names: unknown): boolean => {
        const list = typeof names === 'string' ? [names] : names;
        if (!Array.isArray(list) || typeof element.hasAttribute !== 'function') {
            return false;
        }
        return list.some((attributeName) => element.hasAttribute(attributeName));
    };

    const CLICKABLE_TAGS = ['button', 'a', 'input', 'textarea'];

    const loadTime = Date.now();
    // commands of `quick()`
    const commonWays: AnyRecord = {
        autoTrackIsUsed: false,
        isReady: (callback: unknown) => runProtected(callback, []),
        getUtm: () => ({}),
        getStayTime: () => (Date.now() - loadTime) / 1000,
        setProfileLocal: noopFunc,
        setInitReferrer: noopFunc,
        setSessionReferrer: noopFunc,
        setDefaultAttr: noopFunc,
        // As the SDK, which sends the click only on an element which its own click listener does not send,
        // i.e. not on a button, an input, a text area or a link, an element in a link or a button,
        // or an element with `data-sensors-click` or another attribute of `para.heatmap.track_attr`.
        trackHeatMap: (element: unknown, props: unknown, callback: unknown) => {
            if (!isObject(element) || !element.tagName) {
                return;
            }
            const parent = element.parentNode;
            if (!parent || parent.nodeType !== 1) {
                return;
            }
            const tagName = String(element.tagName).toLowerCase();
            const parentTagName = String(parent.tagName).toLowerCase();
            const { heatmap } = sd.para;
            const attributes = heatmap && heatmap.track_attr ? heatmap.track_attr : [DEFAULT_TRACK_ATTRIBUTE];
            if (
                CLICKABLE_TAGS.indexOf(tagName) === -1
                && parentTagName !== 'a'
                && parentTagName !== 'button'
                && !hasTrackAttribute(element, attributes)
            ) {
                trackClick(element, tagName, props, callback);
            }
        },
        // as the SDK, which sends a click on any element
        trackAllHeatMap: (element: unknown, props: unknown, callback: unknown) => {
            if (isObject(element) && element.tagName) {
                trackClick(element, String(element.tagName).toLowerCase(), props, callback);
            }
        },
        autoTrack: (para: unknown, callback: unknown) => callLater(callback),
        autoTrackSinglePage: (para: unknown, callback: unknown) => callLater(callback),
        autoTrackWithoutProfile: (para: unknown, callback: unknown) => callLater(callback),
        getAnonymousID: () => '',
        setPlugin: noopFunc,
        useModulePlugin: noopFunc,
        useAppPlugin: noopFunc,
    };
    sd.commonWays = commonWays;

    /**
     * Runs a command of the SDK, as `quick()`: a function is called with the SDK as `this`.
     *
     * @param command Name of the command, e.g. `autoTrack`, or a function of the page.
     * @returns Result of the command.
     */
    sd.quick = function quick(command: unknown) {
        // eslint-disable-next-line prefer-rest-params
        const args = Array.prototype.slice.call(arguments, 1);
        if (typeof command === 'string' && hasOwn(commonWays, command) && typeof commonWays[command] === 'function') {
            // a spread call would need a Babel helper which is not in the built resources
            // eslint-disable-next-line prefer-spread
            return commonWays[command].apply(commonWays, args);
        }
        if (typeof command === 'function') {
            try {
                command.apply(sd, args);
            } catch (e) {
                // ignore errors of the page function
            }
        }
        return undefined;
    };

    sd.store = {
        getProps: () => ({}),
        getSessionProps: () => ({}),
        getOriginDistinctId: () => '',
        getOriginUnionId: () => ({ anonymous_id: '' }),
        getIdentities: () => ({}),
        getAnonymousId: () => '',
        getDistinctId: () => '',
        getUnionId: () => ({ anonymous_id: '' }),
        getFirstId: () => '',
        getCookieName: () => 'sensorsdata2015jssdkcross',
        readObjectVal: () => null,
        initSessionState: noopFunc,
        setOnce: noopFunc,
        set: noopFunc,
        change: noopFunc,
        setSessionProps: noopFunc,
        setSessionPropsOnce: noopFunc,
        setProps: noopFunc,
        setPropsOnce: noopFunc,
        clearAllProps: noopFunc,
        sessionSave: noopFunc,
        save: noopFunc,
        init: noopFunc,
        saveObjectVal: noopFunc,
    };
    sd.modules = {};
    sd.lib_version = '1.28.2';
    sd.DEFAULT_SEND_TYPE = 'image';

    // As the SDK, whose methods which send or store data do nothing while it is disabled by `disableSDK()`,
    // so that no callback or function of the page, e.g. `para.heatmap.collect_element()`, is called then.
    let isDisabled = false;
    sd.disableSDK = () => {
        isDisabled = true;
    };
    sd.enableSDK = () => {
        isDisabled = false;
    };
    sd.getDisabled = () => isDisabled;
    const DISABLED_METHODS = [
        'appendProfile', 'bind', 'clearAllRegister', 'clearPageRegister', 'deleteItem', 'deleteProfile',
        'getAppStatus', 'identify', 'incrementProfile', 'login', 'loginWithKey', 'logout', 'quick', 'register',
        'registerOnce', 'registerPage', 'resetAnonymousIdentity', 'setItem', 'setOnceProfile', 'setProfile',
        'track', 'trackLink', 'trackSignup', 'unbind', 'unsetProfile',
    ];
    DISABLED_METHODS.forEach((name) => {
        const method = sd[name];
        sd[name] = function disabledMethod() {
            if (isDisabled) {
                return undefined;
            }
            // eslint-disable-next-line prefer-rest-params
            return method.apply(sd, arguments);
        };
    });

    w[GLOBAL_NAME] = sd;

    if (snippetName) {
        // as the SDK loaded by its snippet: the options and the queue of the snippet are taken over
        const snippet = w[snippetName];
        if (snippet && isObject(snippet.para)) {
            sd.para = snippet.para;
        }
        // eslint-disable-next-line no-underscore-dangle
        const queue = snippet && Array.isArray(snippet._q) ? snippet._q : [];
        w[snippetName] = sd;
        sd.init();
        queue.forEach((command: unknown) => {
            if (!Array.isArray(command) || typeof command[0] !== 'string') {
                return;
            }
            const method = sd[command[0]];
            if (hasOwn(sd, command[0]) && typeof method === 'function') {
                try {
                    method.apply(sd, Array.prototype.slice.call(command[1] || []));
                } catch (e) {
                    // ignore invalid arguments of the page
                }
            }
        });
    }

    hit(source);
}

export const SensorsAnalyticsNames = [
    'sensors-analytics',
    'ubo-sensors-analytics.js',
    'sensors-analytics.js',
];

// eslint-disable-next-line prefer-destructuring
SensorsAnalytics.primaryName = SensorsAnalyticsNames[0];

SensorsAnalytics.injections = [
    hit,
    noopFunc,
    runProtected,
];
