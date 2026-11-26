import { hit, noopFunc, runProtected } from '../helpers';
import { type Source } from '../scriptlets';

/**
 * @redirect piano-analytics
 *
 * @description
 * Mocks the JavaScript SDK of Piano Analytics (formerly AT Internet), e.g. `tag.aticdn.net/piano-analytics.js`.
 * It defines the `pa` global, and `pianoAnalytics`, the module of the SDK, whose `pianoAnalytics` is the same object
 * as `pa`. As by the SDK, the configuration of the page in `_pac` and in the `data-config` attribute
 * of the script is applied, so the names of the global and of the queue may be changed by `globalVarName`
 * and `queueVarName`.
 * See the SDK: https://developers.piano.io/analytics/data-collection/sdks/javascript/
 *
 * Should be used if a rule blocks the SDK and the page breaks without it, as page code usually calls it
 * without a check, e.g. `pa.setConfigurations()`, `pa.setProperties()` or `pa.sendEvent()`, so that the rest
 * of the page code is not run.
 *
 * Events are not sent, and properties, the user and the visitor id are not stored. As by the SDK:
 * - `getConfiguration()` returns the values set by `setConfiguration()` and `setConfigurations()`, which ignore
 *   empty values, i.e. `null`, `undefined` and an empty string, or `null` for an unknown name,
 * - `getVisitorId()` returns the id set by `setVisitorId()`, or `null`, and calls its callback with it,
 * - `getUser()` calls its callback with `null`, and `deleteUser()` calls its callback,
 * - `privacy` and `consent` keep the mode set by `setMode()`, `optin` or `opt-in` by default,
 *   and allow all events, properties and storage keys,
 * - `avInsights.Media` creates media objects whose methods do nothing,
 * - the commands queued in `_paq`, or in the queue named by `queueVarName`,
 *   e.g. `['sendEvent', 'page.display', {}]`, are run, also the ones which they push, and the ones pushed later
 *   are run at once.
 * If the SDK is already on the page, e.g. as the real one is loaded, nothing is changed. An object of the page,
 * e.g. `pa` defined by the page, is neither replaced nor used: as by the SDK, the commands of the queue
 * are run by the object of the resource, which is in `pianoAnalytics.pianoAnalytics`.
 * If the resource has already run, e.g. the scriptlet before the redirect resource, a queue which it has
 * already taken is not run again: the object which has taken it is used for the global of this run,
 * e.g. of another name in `data-config`, and the values which it already has are kept, so, unlike by the SDK,
 * the global of this run has the values of the earlier one, e.g. its `site`. A queue of another name,
 * or one which the page has replaced, gets its own object, as by the SDK. To find the object of a queue,
 * it is kept in the queue as a non-enumerable property, so the commands of a queue which cannot have it,
 * e.g. a frozen one, are run again by another run, as by the SDK.
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
    const hasOwn = (obj: unknown, key: PropertyKey): boolean => Object.prototype.hasOwnProperty.call(obj, key);

    const configuration: AnyRecord = {
        globalVarName: 'pa',
        queueVarName: '_paq',
    };
    // the configuration of the page when the SDK is loaded, see `applyConfiguration()`
    const startConfiguration: AnyRecord = {};

    /**
     * Checks whether a configuration value is empty, i.e. `null`, `undefined` or an empty string.
     *
     * @param value Value of the page.
     * @returns `true` if it is empty.
     */
    const isEmpty = (value: unknown) => value === null || value === undefined || value === '';

    /**
     * Sets a value of the configuration, as `setConfiguration()` of the SDK: empty values,
     * i.e. `null`, `undefined` and an empty string, are ignored.
     *
     * @param name Name of the value.
     * @param value Value of the page.
     */
    const setConfigurationValue = (name: unknown, value: unknown) => {
        if (typeof name === 'string' && !isEmpty(value)) {
            configuration[name] = value;
        }
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
            if (name === 'privacy') {
                return;
            }
            // read once, as it may be a getter of the page
            const value = values[name];
            if (!isEmpty(value)) {
                setConfigurationValue(name, value);
                startConfiguration[name] = value;
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

    /**
     * Checks whether the value is the SDK, or the mock.
     *
     * @param value Value of the page.
     * @returns `true` if it is.
     */
    const isSdk = (value: unknown) => isObject(value) && typeof value.sendEvent === 'function';
    // the SDK, whose objects have its constructor, takes its global and its queue itself; its object
    // is in the module `pianoAnalytics`, also if the global is an object of the page
    const isRealSdk = (value: unknown) => isSdk(value) && typeof (value as AnyRecord).PA === 'function';
    if (isRealSdk(w[globalName]) || (isObject(w.pianoAnalytics) && isRealSdk(w.pianoAnalytics.pianoAnalytics))) {
        return;
    }

    /**
     * Creates the object of the mock, with the configuration of this run.
     *
     * @returns Object of the mock.
     */
    const createInstance = (): AnyRecord => {
        let visitorId: unknown = null;
        const returnTrue = () => true;
        const returnArgument = (value: unknown) => value;
        const returnEmptyObject = () => ({});

        const pa: AnyRecord = {};
        pa.setConfiguration = setConfigurationValue;
        pa.setConfigurations = (values: unknown) => {
            if (isObject(values)) {
                Object.keys(values).forEach((name) => {
                    setConfigurationValue(name, values[name]);
                });
            }
        };
        // as the SDK, `null` for an unknown name
        pa.getConfiguration = (name: unknown) => {
            const value = typeof name === 'string' ? configuration[name] : undefined;
            return value === undefined ? null : value;
        };
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
        return pa;
    };

    /**
     * Runs a command of the queue, e.g. `['sendEvent', 'page.display', {}]`, or `['consent.setMode', 'essential']`,
     * as the SDK does.
     *
     * @param instance Object of the mock.
     * @param command Command of the page.
     */
    const runCommand = (instance: AnyRecord, command: unknown) => {
        if (!Array.isArray(command) || typeof command[0] !== 'string') {
            return;
        }
        const path = command[0].split('.');
        let owner: AnyRecord = instance;
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
    // The object of the mock which has taken a queue is kept in the queue, in a record which is a non-enumerable
    // property, so that another run of the mock, e.g. the redirect resource after the scriptlet, which shares
    // nothing else with it, neither runs the commands of the queue again nor takes an object or a `push()`
    // of the page for the ones of the mock. As by the SDK, each queue has its own object.
    const QUEUE_RECORD_KEY = Symbol.for('adguard.piano-analytics.queue-owner');
    const pageQueue = w[queueName];
    const queue: any = Array.isArray(pageQueue) ? pageQueue : [];

    // at most this many commands which a `push()` of the mock has run, but which are not seen in the queue yet,
    // e.g. as a `push()` of the page adds them later, are remembered; an older one is then taken for a new one
    const MAX_COMMANDS_IN_TRANSIT = 100;

    /**
     * Returns the record of the queue, if the mock has already taken it:
     * - `pa`: the object of the mock,
     * - `push`: the `push()` which the mock has installed last,
     * - `accounted`: weak references to the items of the queue which are run, at their indexes, so that
     *   the commands are not kept in memory when the page removes them from the queue: an item is run
     *   only if it is the one at its index here, so items which the page has added itself, also to a queue
     *   which it has emptied, are run by another run of the mock, and an item which cannot be proved
     *   to be run is run again, as by the SDK, which runs all items when it is loaded again,
     * - `transit`: weak references to the commands which a `push()` of the mock has run, and which are not seen
     *   in the queue yet; a command which the page does not keep, e.g. as it adds a copy of it to the queue,
     *   is not kept by the mock either, so a copy which the page adds after the command is released is run again.
     *
     * @returns Record, or `null`.
     */
    const getQueueRecord = (): AnyRecord | null => {
        const value = hasOwn(queue, QUEUE_RECORD_KEY) ? queue[QUEUE_RECORD_KEY] : null;
        const isRecord = isObject(value)
            && isSdk(value.pa)
            && typeof value.pa.getConfiguration === 'function'
            && typeof value.pa.setConfiguration === 'function'
            && Array.isArray(value.accounted)
            && Array.isArray(value.transit);
        return isRecord ? value : null;
    };

    /**
     * Checks whether a command is another one, or its copy, e.g. made by a `push()` of the page.
     * Items of the arrays are compared only if they are data properties: a getter of the page is not called,
     * as it may return its value once, e.g. a callback which the SDK reads when it runs the command,
     * so such an array is not taken for a copy.
     *
     * @param command Command.
     * @param other Other command.
     * @returns `true` if they are the same array, or arrays of the same items.
     */
    const isSameCommand = (command: unknown, other: unknown): boolean => {
        if (command === other) {
            return true;
        }
        if (!Array.isArray(command) || !Array.isArray(other) || command.length !== other.length) {
            return false;
        }
        for (let i = 0; i < command.length; i += 1) {
            const item = Object.getOwnPropertyDescriptor(command, i);
            const otherItem = Object.getOwnPropertyDescriptor(other, i);
            if (!item || !otherItem || !hasOwn(item, 'value') || !hasOwn(otherItem, 'value')
                || item.value !== otherItem.value) {
                return false;
            }
        }
        return true;
    };

    /**
     * Returns a weak reference to the object, so that the page can release it,
     * or a reference which keeps it where weak references are not supported.
     *
     * @param value Object of the page.
     * @returns Reference, whose `deref()` returns the object, or `undefined` if it is released.
     */
    const createReference = (value: object): AnyRecord => {
        return typeof w.WeakRef === 'function' ? new w.WeakRef(value) : { deref: () => value };
    };

    /**
     * Returns the index of the command, or of its copy, in the commands which are run by a `push()`
     * of the mock and are not seen in the queue yet. The references to released commands are removed.
     *
     * @param record Record of the queue.
     * @param command Command.
     * @returns Index, or `-1`.
     */
    const getTransitIndex = (record: AnyRecord, command: unknown): number => {
        for (let i = 0; i < record.transit.length; i += 1) {
            const reference = record.transit[i];
            const original = isObject(reference) && typeof reference.deref === 'function'
                ? reference.deref()
                : undefined;
            if (original === undefined) {
                record.transit.splice(i, 1);
                i -= 1;
            } else if (isSameCommand(original, command)) {
                return i;
            }
        }
        return -1;
    };

    /**
     * Remembers that the item of the queue at the index is run, by a weak reference to it,
     * or by the item itself where weak references are not supported.
     *
     * @param record Record of the queue.
     * @param index Index of the item.
     * @param item Item of the queue, an object.
     */
    const setAccounted = (record: AnyRecord, index: number, item: object) => {
        record.accounted[index] = createReference(item);
    };

    /**
     * Checks whether the item is the one which is run at the index.
     *
     * @param record Record of the queue.
     * @param index Index of the item.
     * @param item Item of the queue.
     * @returns `true` if it is.
     */
    const isAccounted = (record: AnyRecord, index: number, item: unknown): boolean => {
        const reference = record.accounted[index];
        return isObject(reference) && typeof reference.deref === 'function' && reference.deref() === item;
    };

    /**
     * Accounts an item of the queue if it is a command which a `push()` of the mock has run,
     * and which is seen in the queue now.
     *
     * @param record Record of the queue.
     * @param index Index of the item.
     * @param item Item of the queue, an object.
     * @returns `true` if the item is such a command.
     */
    const accountCommandInTransit = (record: AnyRecord, index: number, item: object): boolean => {
        const transitIndex = getTransitIndex(record, item);
        if (transitIndex === -1) {
            return false;
        }
        record.transit.splice(transitIndex, 1);
        setAccounted(record, index, item);
        return true;
    };

    /**
     * Runs the items of the queue which are not run yet: all items of a queue which is taken now, and,
     * in another run of the mock, the ones which the page has added to a taken queue itself, e.g. with
     * a `push()` which has replaced the one of the mock, which the SDK runs as well when it is loaded again.
     * Each item is run, also if the same command is in the queue more than once, as by the SDK.
     * As by the SDK, the commands which the run ones add to the queue, e.g. in a callback, are run as well,
     * and each item is read once, as it may be a getter of the page. An item which is not an object
     * is not a command.
     *
     * @param record Record of the queue.
     */
    const runPendingCommands = (record: AnyRecord) => {
        for (let i = 0; i < queue.length; i += 1) {
            const item = queue[i];
            if (!isAccounted(record, i, item)) {
                // the item which was run at the index is not there anymore, e.g. the page has replaced it,
                // so the same command at the index later is another item
                record.accounted[i] = undefined;
                if (isObject(item) && !accountCommandInTransit(record, i, item)) {
                    setAccounted(record, i, item);
                    runCommand(record.pa, item);
                }
            }
        }
        record.accounted.length = queue.length;
    };

    /**
     * Replaces `push()` of the queue with one which runs the pushed commands and then calls the replaced one,
     * e.g. the one of the page, as the SDK does. The page may wrap a `push()` of the mock, and another run
     * of the mock then replaces the wrapper, so a command which the newer `push()` of the mock has run
     * gets to the older one, also as a copy, or later: the older one does not run such a command again,
     * but runs any other one, e.g. if the page calls it directly.
     * As by the SDK, a property of the page is assigned, so it keeps its attributes, e.g. if it is not
     * configurable. Nothing is changed if it cannot be replaced, e.g. in a frozen queue.
     *
     * @param record Record of the queue.
     */
    const installPush = (record: AnyRecord) => {
        const replaced = typeof queue.push === 'function' ? queue.push : Array.prototype.push;
        const handler = function push(...commands: unknown[]) {
            const isNewest = record.push === handler;
            commands.forEach((command) => {
                if (!isNewest && getTransitIndex(record, command) !== -1) {
                    return;
                }
                if (isObject(command)) {
                    record.transit.push(createReference(command));
                    if (record.transit.length > MAX_COMMANDS_IN_TRANSIT) {
                        record.transit.shift();
                    }
                }
                runCommand(record.pa, command);
            });
            const length = queue.length;
            // e.g. the page has emptied the queue: items which were run at the indexes of the added ones
            // are not there anymore, so the same command added there is another item
            if (record.accounted.length > length) {
                record.accounted.length = length;
            }
            try {
                return replaced.apply(queue, commands);
            } finally {
                try {
                    // only the added items which are the run commands, or their copies, are accounted:
                    // other items which a `push()` of the page adds are run by another run of the mock;
                    // an item which is a getter of the page is not read here, but only by that run, as the SDK
                    // does, as it may return the item once, or throw
                    for (let i = length; i < queue.length; i += 1) {
                        const descriptor = Object.getOwnPropertyDescriptor(queue, i);
                        const item = descriptor && hasOwn(descriptor, 'value') ? descriptor.value : undefined;
                        if (isObject(item) && !isAccounted(record, i, item)) {
                            accountCommandInTransit(record, i, item);
                        }
                    }
                    // e.g. the replaced `push()` has removed items
                    if (record.accounted.length > queue.length) {
                        record.accounted.length = queue.length;
                    }
                } catch (e) {
                    // e.g. an added item of the page whose items throw: the result of the replaced `push()` is returned
                }
            }
        };
        if (hasOwn(queue, 'push')) {
            try {
                queue.push = handler;
            } catch (e) {
                // not writable
            }
        }
        if (queue.push !== handler) {
            try {
                Object.defineProperty(queue, 'push', { configurable: true, writable: true, value: handler });
            } catch (e) {
                // not configurable, or the queue is frozen
            }
        }
        if (queue.push === handler) {
            record.push = handler;
        }
    };

    let record = getQueueRecord();
    let isChanged = false;
    if (record) {
        // the queue is already taken: values which its object already has, e.g. set by a command
        // of the queue, are kept, so only new values of this run are set
        const taken = record.pa;
        Object.keys(startConfiguration).forEach((name) => {
            if (taken.getConfiguration(name) === null) {
                taken.setConfiguration(name, startConfiguration[name]);
            }
        });
    } else {
        record = {
            pa: createInstance(),
            push: null,
            accounted: [],
            transit: [],
        };
        try {
            Object.defineProperty(queue, QUEUE_RECORD_KEY, { value: record });
        } catch (e) {
            // e.g. a frozen queue, whose commands are run anyway, but again by another run
        }
        isChanged = true;
    }
    const instance: AnyRecord = record.pa;
    try {
        // as the SDK, `push()` is replaced only after the commands are run
        runPendingCommands(record);
        // also if the page has replaced or wrapped `push()` of a taken queue since
        if (queue.push !== record.push) {
            installPush(record);
        }
    } catch (e) {
        // e.g. a getter of the queue which throws: the global is installed anyway
    }
    if (isChanged) {
        w[queueName] = queue;
        // as the SDK, its module has the object which is created last
        w.pianoAnalytics = { pianoAnalytics: instance };
    }
    // as the SDK, the global is not replaced if the page has defined it, e.g. as its own object
    if (!w[globalName]) {
        w[globalName] = instance;
        isChanged = true;
    }

    if (isChanged) {
        hit(source);
    }
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
