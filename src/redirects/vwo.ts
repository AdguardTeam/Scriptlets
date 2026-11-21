import {
    hit,
    noopFunc,
    noopNull,
    runProtected,
} from '../helpers';
import { type Source } from '../scriptlets';

/**
 * @redirect vwo
 *
 * @description
 * Mocks the library of VWO (Visual Website Optimizer, Wingify), loaded by the VWO SmartCode,
 * e.g. `dev.visualwebsiteoptimizer.com/tag/<accountId>.js`.
 *
 * It shows the page hidden by the SmartCode at once, instead of after its settings timeout:
 * the asynchronous SmartCode 3.0 hides the page until the library has loaded or the timeout,
 * 2 seconds by default, has expired, also if the library is blocked.
 * Commands queued in `window.VWO` and `window.Wingify` are run, and the ones pushed later are run at once:
 * `onLibLoaded` and `onCampaignsLoaded` callbacks are called without campaigns,
 * other commands, e.g. `onVariationApplied` or `event`, do nothing.
 * `getCrossDomainInfo()` of both returns the query parameter for links to other domains without a visitor id,
 * e.g. `{ q: 'vwo_q', d: '' }`, `visitorConfig.destroySession()` returns a promise resolved at once,
 * and `visitorConfig.getInfo()` returns no location, `{ loc: {} }`.
 * No campaigns or variations are applied, no data is sent and no cookies or storage items are set.
 *
 * ### Examples
 *
 * ```adblock
 * ||dev.visualwebsiteoptimizer.com/tag/$script,redirect=vwo
 * ||dev.visualwebsiteoptimizer.com/lib/$script,redirect=vwo
 * ||dev.visualwebsiteoptimizer.com/j.php$script,redirect=vwo
 * ```
 *
 * @added unknown.
 */

type VwoWindow = typeof window & {
    VWO?: unknown;
    Wingify?: unknown;
    _vwo_code?: unknown;
    _vwo_settings_timer?: unknown;
    _vwo_library_timer?: unknown;
    vwo_libExecuted?: unknown;
    _vis_opt_queue?: unknown;
};

interface SmartCode {
    libExecuted?: boolean;
    finish?: unknown;
}

type Queue = unknown[] & {
    _?: unknown;
    event?: unknown;
    visitor?: unknown;
    getCrossDomainInfo?: unknown;
    visitorConfig?: unknown;
};

/* eslint-disable no-underscore-dangle */
export function Vwo(source: Source) {
    const w = window as VwoWindow;
    const doc = w.document;
    const existingCode = w._vwo_code as SmartCode | undefined;
    // The real library, or this resource loaded before, is kept.
    if (w.vwo_libExecuted === true || (existingCode && existingCode.libExecuted === true)) {
        return;
    }

    // Anti-flicker of the SmartCode: show the page at once, as the library does when it has loaded.
    if (existingCode && typeof existingCode === 'object') {
        // stops the SmartCode from inserting the hiding style again on each animation frame
        existingCode.libExecuted = true;
        if (typeof w._vwo_settings_timer === 'number') {
            w.clearTimeout(w._vwo_settings_timer);
        }
        if (typeof w._vwo_library_timer === 'number') {
            w.clearTimeout(w._vwo_library_timer);
        }
        // without an argument, as with one the SmartCode sends an error beacon
        runProtected(existingCode.finish, []);
    } else {
        // The synchronous SmartCode is the library itself, and an asynchronous one which runs later,
        // e.g. after the scriptlet, is skipped if `_vwo_code` exists, so it does not hide the page then.
        w._vwo_code = {
            libExecuted: true,
            addScript: noopFunc,
            finish: noopFunc,
            finished: () => true,
            getSettings: noopFunc,
            getVersion: () => 3,
            hideEl: () => '',
            hide_element: () => '',
            hide_element_style: () => '',
            init: noopFunc,
            library_tolerance: noopFunc,
            load: noopFunc,
            settings_tolerance: () => 0,
            use_existing_jquery: () => false,
        };
    }
    const hidingElement = doc.getElementById('_vis_opt_path_hides');
    if (hidingElement && hidingElement.parentNode) {
        hidingElement.parentNode.removeChild(hidingElement);
    }
    w.vwo_libExecuted = true;

    // Names of the callbacks of the library being loaded and of the campaigns being loaded,
    // also the legacy ones, which the library calls with the same data.
    const LIB_LOADED = ['onLibLoaded', 'onVWOLoaded'];
    const CAMPAIGNS_LOADED = ['onCampaignsLoaded', 'onVWOCampaignsLoaded'];

    /**
     * Checks whether a queued command is a callback of the given names, e.g. `['onLibLoaded', callback]`.
     *
     * @param command Queued command.
     * @param names Command names.
     * @returns `true` if the command has one of the names.
     */
    const isCommand = (command: unknown, names: string[]): boolean => {
        return Array.isArray(command) && names.indexOf(command[0]) !== -1;
    };

    /**
     * Runs a command of the `VWO` or `Wingify` queue, e.g. `['onLibLoaded', callback]`.
     * Only the callbacks of the library and of the campaigns being loaded are called, without campaigns,
     * as no campaigns are run; other commands do nothing.
     *
     * @param command Queued command.
     */
    const runCommand = (command: unknown) => {
        if (isCommand(command, LIB_LOADED)) {
            // executed campaigns and delayed campaigns
            runProtected((command as unknown[])[1], [[{}, []]]);
        } else if (isCommand(command, CAMPAIGNS_LOADED)) {
            runProtected((command as unknown[])[1], [{ bucketed_campaigns: [] }]);
        }
    };

    /**
     * Returns the query parameter which carries the visitor to another domain, as `getCrossDomainInfo()`
     * of the library without the cross-domain module: its name, `vwo_q` unless the SmartCode has set
     * another prefix, and an empty value, as no visitor id is passed.
     *
     * @returns Name and value of the parameter, e.g. `{ q: 'vwo_q', d: '' }`.
     */
    const getCrossDomainInfo = (): Record<string, string> => {
        const queue = w.VWO as Queue | undefined;
        const internal = queue && queue._ as Record<string, unknown> | undefined;
        const prefix = internal && typeof internal.sKP === 'string' && internal.sKP ? internal.sKP : 'vwo';
        return { q: `${prefix}_q`, d: '' };
    };

    /**
     * Makes `push()` of a queue run commands at once, and returns its queued commands, which are run later,
     * once all queues and globals of the library are installed, as queued callbacks may use them.
     * The library returns the length from `push()`, so does this one.
     *
     * @param queueName Name of the global queue, `VWO` or `Wingify`.
     * @returns Commands queued before.
     */
    const setupQueue = (queueName: 'VWO' | 'Wingify'): unknown[] => {
        const existing = w[queueName];
        const queue: Queue = Array.isArray(existing) ? existing : [];
        const queued = queue.splice(0, queue.length);
        Object.defineProperty(queue, 'push', {
            configurable: true,
            writable: true,
            value(...commands: unknown[]) {
                commands.forEach(runCommand);
                return queue.length;
            },
        });
        if (typeof queue.event !== 'function') {
            queue.event = noopFunc;
        }
        if (typeof queue.visitor !== 'function') {
            queue.visitor = noopFunc;
        }
        if (typeof queue.getCrossDomainInfo !== 'function') {
            queue.getCrossDomainInfo = getCrossDomainInfo;
        }
        // An object of the page is completed in place.
        const config = queue.visitorConfig && typeof queue.visitorConfig === 'object'
            ? queue.visitorConfig as Record<string, unknown>
            : {};
        if (typeof config.destroySession !== 'function') {
            // there is no session to clear; the library returns a promise, which pages may await
            config.destroySession = () => Promise.resolve();
        }
        if (typeof config.getInfo !== 'function') {
            // as the library without location data
            config.getInfo = () => ({ loc: {} });
        }
        queue.visitorConfig = config;
        w[queueName] = queue;
        return queued;
    };
    const queuedCommands = setupQueue('VWO').concat(setupQueue('Wingify'));

    /**
     * Defines a global of the library if the page has not defined it.
     *
     * @param name Global name.
     * @param value Value.
     */
    const defineGlobal = (name: string, value: unknown) => {
        if ((w as unknown as Record<string, unknown>)[name] === undefined) {
            (w as unknown as Record<string, unknown>)[name] = value;
        }
    };
    defineGlobal('_vwo_exp', {});
    defineGlobal('_vwo_exp_ids', []);
    defineGlobal('_vis_opt_goal_conversion', noopFunc);
    defineGlobal('_vis_opt_revenue_conversion', noopFunc);
    defineGlobal('_vis_opt_register_conversion', noopFunc);
    defineGlobal('_vis_opt_createCookie', noopFunc);
    defineGlobal('_vis_opt_element_loaded', noopFunc);
    defineGlobal('_vis_opt_readCookie', noopNull);

    // Legacy queue of functions, e.g. `_vis_opt_queue.push(function () { _vis_opt_revenue_conversion(10); })`.
    const legacyQueue: unknown[] = Array.isArray(w._vis_opt_queue) ? w._vis_opt_queue : [];
    const legacyQueued = legacyQueue.splice(0, legacyQueue.length);
    Object.defineProperty(legacyQueue, 'push', {
        configurable: true,
        writable: true,
        value(...items: unknown[]) {
            items.forEach((item) => runProtected(item, []));
            return legacyQueue.length;
        },
    });
    w._vis_opt_queue = legacyQueue;

    // Queued commands run once everything is installed. As the library, the callbacks of the library
    // being loaded run first, of `VWO` then of `Wingify`, and then the ones of the campaigns being loaded.
    queuedCommands.filter((command) => isCommand(command, LIB_LOADED)).forEach(runCommand);
    queuedCommands.filter((command) => isCommand(command, CAMPAIGNS_LOADED)).forEach(runCommand);
    legacyQueued.forEach((item) => runProtected(item, []));

    hit(source);
}
/* eslint-enable no-underscore-dangle */

export const VwoNames = [
    'vwo',
];

// eslint-disable-next-line prefer-destructuring
Vwo.primaryName = VwoNames[0];

Vwo.injections = [
    hit,
    noopFunc,
    noopNull,
    runProtected,
];
