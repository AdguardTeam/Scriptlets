import { hit, noopFunc, runProtected } from '../helpers';
import { type Source } from '../scriptlets';

/**
 * @redirect jad
 *
 * @description
 * Mocks JAD, the ad library of Webedia, i.e. `cdn.lib.getjad.io/library/…`.
 * It is used e.g. by jeuxvideo.com, allocine.fr, purepeople.com, ozap.com, xataka.com, 3djuegos.com, sensacine.com,
 * moviepilot.de and filmstarts.de.
 *
 * Should be used if a rule blocks the library and the page breaks without it, as pages queue commands
 * in `jad.cmd` and start their Dailymotion videos only in the callback of
 * `jad.public.getDailymotionAdsParamsForScript()`, which is never called if the library is blocked,
 * so that the player stays empty.
 * The rule should be limited to `$script`, as pages may check whether the library is blocked by a request
 * of another type, e.g. jeuxvideo.com by `fetch()`, and wait for the library for 10 seconds if it is not.
 *
 * `jad.public` has all methods of the library, and answers as the library does when ads are disabled:
 * - `getDailymotionAdsParamsForScript()` and `getDailymotionCustomConfig()` call their callback with `premium`,
 *   the keyword of the library for no ads, for each position key, e.g. `{ 'preroll/player-1': 'premium' }`,
 *   or with `premium` for a single key,
 * - `getDailymotionCustomConfigObject()` calls its callback with `{ customParams: 'premium' }` for each key,
 * - `getTrailers()` calls its callback with no sponsored trailers, i.e. `[]`,
 * - `getVastUrl()` and `getVideoAdUrl()` call their callback with no ad URL, i.e. an empty string,
 *   for each key, `getGeoloc()` with `null`, and `isGdprCompliant()` with `false`,
 * - `createNewPosition()` returns `false`, and the methods which set up or show ads do nothing.
 * The commands queued in `jad.cmd` are run, and the ones pushed later are run at once.
 * If the library is already on the page, nothing is changed.
 * No requests are sent, and no cookies or storage items are set.
 *
 * ### Examples
 *
 * ```adblock
 * ||cdn.lib.getjad.io/library/$script,redirect=jad
 * ```
 *
 * @added unknown.
 */

type AnyRecord = Record<string, any>;

export function Jad(source: Source) {
    const w = window as unknown as AnyRecord;
    const isObject = (value: unknown): value is AnyRecord => !!value && typeof value === 'object';

    // the library, or the mock
    if (isObject(w.jad) && isObject(w.jad.public) && typeof w.jad.public.setConfig === 'function') {
        return;
    }
    const jad: AnyRecord = isObject(w.jad) ? w.jad : {};

    // `jad.config.merged.dailymotion.noAdsKeyword` of the library
    const NO_ADS = 'premium';

    /**
     * Returns an object with a value for each position key, as the library does for an array of keys.
     *
     * @param keys Position keys of the page, e.g. `['preroll/player-1']`.
     * @param getValue Returns the value for a key.
     * @returns Object.
     */
    const getValuesByKey = (keys: unknown[], getValue: () => unknown): AnyRecord => {
        const values: AnyRecord = {};
        for (let i = 0; i < keys.length; i += 1) {
            values[String(keys[i])] = getValue();
        }
        return values;
    };

    /**
     * Calls the callback with the value for each key if the keys are an array, or with the value otherwise.
     *
     * @param keys Position keys of the page, or a single key.
     * @param callback Callback of the page.
     * @param getValue Returns the value.
     */
    const answer = (keys: unknown, callback: unknown, getValue: () => unknown) => {
        runProtected(callback, [Array.isArray(keys) ? getValuesByKey(keys, getValue) : getValue()]);
    };
    const getNoAds = () => NO_ADS;
    const getNoAdUrl = () => '';
    const getDailymotionCustomConfig = (keys: unknown, callback: unknown) => {
        answer(keys, callback, getNoAds);
    };
    const getVastUrl = (keys: unknown, callback: unknown) => {
        answer(keys, callback, getNoAdUrl);
    };
    const returnEmptyString = () => '';
    const returnEmptyObject = () => ({});

    jad.public = {
        addEventListener: noopFunc,
        addTargeting: noopFunc,
        clearTargeting: noopFunc,
        createNewPosition: () => false,
        disableAutoRefreshOnPosition: noopFunc,
        displayPositions: noopFunc,
        getAdsFromWebediads: noopFunc,
        getConfig: returnEmptyObject,
        getDailymotionAdsParamsForScript: getDailymotionCustomConfig,
        getDailymotionCustomConfig,
        getDailymotionCustomConfigObject: (keys: unknown, callback: unknown) => {
            if (Array.isArray(keys)) {
                runProtected(callback, [getValuesByKey(keys, () => ({ customParams: NO_ADS }))]);
            }
        },
        getDefaultDailymotionAdsParamsForScript: (keys: unknown) => {
            return Array.isArray(keys) ? getValuesByKey(keys, getNoAds) : {};
        },
        getDefaultVideoAdUrl: (keys: unknown) => {
            return Array.isArray(keys) ? getValuesByKey(keys, getNoAdUrl) : {};
        },
        getGeoloc: (callback: unknown) => runProtected(callback, [null]),
        getNetwork: returnEmptyString,
        getPage: returnEmptyString,
        getSite: returnEmptyString,
        getTargetingOnPosition: returnEmptyObject,
        getTrailers: (callback: unknown) => runProtected(callback, [[]]),
        getVastUrl,
        getVideoAdUrl: getVastUrl,
        isGdprCompliant: (vendor: unknown, callback: unknown) => runProtected(callback, [false]),
        loadPositions: noopFunc,
        refreshAds: noopFunc,
        removePosition: noopFunc,
        setConfig: noopFunc,
        setHashedId: noopFunc,
        setTargetingOnPosition: noopFunc,
        xplnGetVideoDailymotionPositions: () => [],
    };

    /**
     * Runs a command of the page, e.g. `() => jad.public.setConfig({ page: '/1234/site/home' })`.
     *
     * @param command Command of the page.
     */
    const runCommand = (command: unknown) => {
        if (typeof command !== 'function') {
            return;
        }
        // Called directly, as by `jad.scheduler.runCmd()` of the library, so `this` of a command
        // in strict code is `undefined`, and a command whose own `apply` is replaced is run as well.
        try {
            command();
        } catch (e) {
            // an error of a command does not stop the other commands
        }
    };
    const queue: unknown[] = Array.isArray(jad.cmd) ? jad.cmd : [];
    // as the library, the commands are removed from the queue when they are run
    while (queue.length) {
        runCommand(queue.shift());
    }
    Object.defineProperty(queue, 'push', {
        configurable: true,
        writable: true,
        value(...commands: unknown[]) {
            commands.forEach(runCommand);
            return queue.length;
        },
    });
    jad.cmd = queue;
    w.jad = jad;

    hit(source);
}

export const JadNames = [
    'jad',
];

// eslint-disable-next-line prefer-destructuring
Jad.primaryName = JadNames[0];

Jad.injections = [
    hit,
    noopFunc,
    runProtected,
];
