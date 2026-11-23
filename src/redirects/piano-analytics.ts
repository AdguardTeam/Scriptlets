import { hit, noopFunc, runProtected } from '../helpers';
import { type Source } from '../scriptlets';

/**
 * @redirect piano-analytics
 *
 * @description
 * Mocks the JavaScript SDK of Piano Analytics (formerly AT Internet), e.g. `tag.aticdn.net/piano-analytics.js`,
 * i.e. the `pa` global, which is also `pianoAnalytics`. As by the SDK, the configuration of the page
 * in `_pac` and in the `data-config` attribute of the script is applied, so the names of the global
 * and of the queue may be changed by `globalVarName` and `queueVarName`.
 * See the SDK: https://developers.piano.io/analytics/data-collection/sdks/javascript/
 *
 * Should be used if a rule blocks the SDK and the page breaks without it, as page code usually calls it
 * without a check, e.g. `pa.setConfigurations()`, `pa.setProperties()` or `pa.sendEvent()`, so that the rest
 * of the page code is not run.
 *
 * Events are not sent, and properties, the user and the visitor id are not stored. As by the SDK:
 * - `getConfiguration()` returns the values set by `setConfiguration()` and `setConfigurations()`,
 * - `getVisitorId()` returns the id set by `setVisitorId()`, or `null`, and calls its callback with it,
 * - `getUser()` calls its callback with `null`, and `deleteUser()` calls its callback,
 * - `privacy` and `consent` keep the mode set by `setMode()`, `optin` or `opt-in` by default,
 *   and allow all events, properties and storage keys,
 * - `avInsights.Media` creates media objects whose methods do nothing,
 * - the commands queued in `_paq`, or in the queue named by `queueVarName`,
 *   e.g. `['sendEvent', 'page.display', {}]`, are run, and the ones pushed later are run at once.
 * If the global is already the SDK, e.g. as the real one is loaded, nothing is changed.
 * No requests are sent, and no cookies or storage items are set.
 *
 * ### Examples
 *
 * ```adblock
 * ||tag.aticdn.net/piano-analytics.js$script,redirect=piano-analytics
 * ```
 *
 * @added unknown.
 */

type AnyRecord = Record<string, any>;

export function PianoAnalytics(source: Source) {
    const w = window as unknown as AnyRecord;
    const isObject = (value: unknown): value is AnyRecord => !!value && typeof value === 'object';
    const hasOwn = (obj: unknown, key: string): boolean => Object.prototype.hasOwnProperty.call(obj, key);

    const configuration: AnyRecord = {
        globalVarName: 'pa',
        queueVarName: '_paq',
    };

    /**
     * Applies a configuration of the page, except its privacy modes, as the SDK does.
     *
     * @param values Configuration of the page.
     */
    const applyConfiguration = (values: unknown) => {
        if (!isObject(values)) {
            return;
        }
        Object.keys(values).forEach((name) => {
            if (name !== 'privacy') {
                configuration[name] = values[name];
            }
        });
    };
    // as the SDK, the configuration of the page in the `data-config` attribute of the script, as JSON,
    // and in `_pac`, which may change the names of the global and of the queue
    try {
        const script = w.document.currentScript;
        if (script && script.dataset && typeof script.dataset.config === 'string') {
            applyConfiguration(JSON.parse(script.dataset.config));
        }
    } catch (e) {
        // invalid configuration of the page
    }
    // eslint-disable-next-line no-underscore-dangle
    applyConfiguration(w._pac);
    const globalName = typeof configuration.globalVarName === 'string' && configuration.globalVarName
        ? configuration.globalVarName
        : 'pa';
    const queueName = typeof configuration.queueVarName === 'string' && configuration.queueVarName
        ? configuration.queueVarName
        : '_paq';

    // the SDK, or the mock
    if (isObject(w[globalName]) && typeof w[globalName].sendEvent === 'function') {
        return;
    }
    let visitorId: unknown = null;
    const returnTrue = () => true;
    const returnArgument = (value: unknown) => value;
    const returnEmptyObject = () => ({});

    const pa: AnyRecord = {};
    pa.setConfiguration = (name: unknown, value: unknown) => {
        if (typeof name === 'string') {
            configuration[name] = value;
        }
    };
    pa.setConfigurations = (values: unknown) => {
        if (isObject(values)) {
            Object.keys(values).forEach((name) => {
                configuration[name] = values[name];
            });
        }
    };
    pa.getConfiguration = (name: unknown) => (typeof name === 'string' ? configuration[name] : undefined);
    pa.sendEvent = noopFunc;
    pa.sendEvents = noopFunc;
    pa.setProperty = noopFunc;
    pa.setProperties = noopFunc;
    pa.deleteProperty = noopFunc;
    pa.setContentProperty = noopFunc;
    pa.setContentProperties = noopFunc;
    pa.refresh = noopFunc;
    pa.setUser = noopFunc;
    pa.getUser = (callback: unknown) => runProtected(callback, [null]);
    pa.deleteUser = (callback: unknown) => runProtected(callback, []);
    pa.setVisitorId = (value: unknown) => {
        visitorId = value;
    };
    pa.getVisitorId = (callback?: unknown) => {
        runProtected(callback, [visitorId]);
        return callback === undefined ? visitorId : undefined;
    };

    /**
     * Returns an object with the methods of `include` or `exclude` of `privacy`, which do nothing.
     *
     * @returns Object.
     */
    const createPrivacyRules = () => ({
        properties: noopFunc,
        property: noopFunc,
        storageKeys: noopFunc,
        storageKey: noopFunc,
        events: noopFunc,
        event: noopFunc,
    });

    // `privacy` of the SDK, i.e. the privacy modes of AT Internet
    const privacy: AnyRecord = {
        currentMode: '',
        modes: {},
        include: createPrivacyRules(),
        exclude: createPrivacyRules(),
        init: noopFunc,
        createMode: noopFunc,
        setMode(mode: unknown) {
            if (typeof mode === 'string') {
                privacy.currentMode = mode;
            }
        },
        getMode: () => privacy.currentMode || 'optin',
        getModeMetadata: returnEmptyObject,
        isEventAllowed: returnTrue,
        isPropAllowed: returnTrue,
        isKeyAllowed: returnTrue,
        filterProps: returnArgument,
        filterEvents: returnArgument,
        filterKeys: noopFunc,
        setItem: (key: unknown, value: unknown, expiration: unknown, callback: unknown) => {
            runProtected(callback, []);
        },
    };
    pa.privacy = privacy;

    // `consent` of the SDK, i.e. the consent modes of Piano
    let consentMode = '';
    pa.consent = {
        init: noopFunc,
        initMode: noopFunc,
        setMode(mode: unknown) {
            if (typeof mode === 'string') {
                consentMode = mode;
            }
        },
        getMode: () => consentMode || 'opt-in',
        setPresets: noopFunc,
        setCustomModeMetadata: noopFunc,
        setAllPurposes: noopFunc,
        setByPurpose: noopFunc,
        getByPurpose: returnEmptyObject,
        getModeMetadata: returnEmptyObject,
        getConsentItems: returnEmptyObject,
        isPAConsentDisabled: () => false,
        isEventAllowed: returnTrue,
        isPropAllowed: returnTrue,
        isKeyAllowed: returnTrue,
        filterProps: returnArgument,
        filterEvents: returnArgument,
        filterKeys: noopFunc,
        setItem: (key: unknown, value: unknown, expiration: unknown, callback: unknown) => {
            runProtected(callback, []);
        },
    };

    /**
     * Media of AV Insights, whose methods do nothing; the getters return no values.
     */
    // eslint-disable-next-line func-names
    const Media = function () {} as unknown as { prototype: AnyRecord };
    const MEDIA_METHODS = [
        'set', 'setProps', 'del', 'delProps', 'track', 'heartbeat', 'bufferHeartbeat', 'rebufferHeartbeat',
        'play', 'bufferStart', 'playbackStart', 'playbackResumed', 'playbackPaused', 'playbackStopped',
        'playbackKill', 'seek', 'seekBackward', 'seekForward', 'seekStart', 'adClick', 'adSkip', 'error',
        'display', 'close', 'volume', 'subtitleOn', 'subtitleOff', 'fullscreenOn', 'fullscreenOff', 'quality',
        'speed', 'share', 'setPlaybackSpeed',
    ];
    MEDIA_METHODS.forEach((name) => {
        Media.prototype[name] = noopFunc;
    });
    Media.prototype.get = noopFunc;
    Media.prototype.getProps = returnEmptyObject;
    Media.prototype.getSessionID = () => '';
    pa.avInsights = { Media };

    // as the SDK, the global is not replaced if the page has defined it, e.g. as its own object
    if (!w[globalName]) {
        w[globalName] = pa;
    }
    if (!isObject(w.pianoAnalytics) || typeof w.pianoAnalytics.sendEvent !== 'function') {
        w.pianoAnalytics = pa;
    }

    /**
     * Runs a command of the queue, e.g. `['sendEvent', 'page.display', {}]`, or `['consent.setMode', 'essential']`,
     * as the SDK does.
     *
     * @param command Command of the page.
     */
    const runCommand = (command: unknown) => {
        if (!Array.isArray(command) || typeof command[0] !== 'string') {
            return;
        }
        const path = command[0].split('.');
        let owner: AnyRecord = pa;
        for (let i = 0; i < path.length - 1; i += 1) {
            if (!isObject(owner) || !hasOwn(owner, path[i])) {
                return;
            }
            owner = owner[path[i]];
        }
        const name = path[path.length - 1];
        if (isObject(owner) && hasOwn(owner, name) && typeof owner[name] === 'function') {
            try {
                // a spread call would need a Babel helper which is not in the built resources
                // eslint-disable-next-line prefer-spread
                owner[name].apply(owner, command.slice(1));
            } catch (e) {
                // ignore invalid arguments of the page
            }
        }
    };
    const queue = Array.isArray(w[queueName]) ? w[queueName] : [];
    queue.slice().forEach(runCommand);
    Object.defineProperty(queue, 'push', {
        configurable: true,
        writable: true,
        value(...commands: unknown[]) {
            commands.forEach(runCommand);
            return Array.prototype.push.apply(queue, commands);
        },
    });
    w[queueName] = queue;

    hit(source);
}

export const PianoAnalyticsNames = [
    'piano-analytics',
    'ubo-piano-analytics.js',
    'piano-analytics.js',
];

// eslint-disable-next-line prefer-destructuring
PianoAnalytics.primaryName = PianoAnalyticsNames[0];

PianoAnalytics.injections = [
    hit,
    noopFunc,
    runProtected,
];
