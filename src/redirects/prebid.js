/* eslint-disable func-names */
import {
    hit,
    noopFunc,
    noopStr,
    noopArray,
    runProtected,
} from '../helpers';

/**
 * @redirect prebid
 *
 * @description
 * Mocks the prebid.js header bidding suit.
 * https://docs.prebid.org/
 *
 * Also mocks `pbjs.rp` of the Prebid wrapper of Magnite (Rubicon Project), i.e. its Demand Manager, e.g.
 * `micro.rubiconproject.com/prebid/dynamic/<id>.js`. Its `requestVideoBids()` calls the `callback` of the page
 * without an argument, as the wrapper does if there is no ad unit for the video, so that video players which wait
 * for it, e.g. of tyla.com and worldsurfleague.com, are started without an ad.
 *
 * As Prebid.js, the resource keeps the `pbjs` object of the page and its `que` and `cmd` queues, and runs the
 * commands which the page has queued before, e.g. `pbjs.que.push(function () { pbjs.requestBids(…); })`.
 * Commands which they push are run after them. `addAdUnits()` and `removeAdUnit()` change `pbjs.adUnits`.
 * `requestBids()` calls `bidsBackHandler` and returns a promise as Prebid.js when no bid is received, i.e.
 * with empty bids if there are ad units, or without bids if there are none.
 * As Prebid.js, the resource does nothing if `pbjs` is already loaded, e.g. by a scriptlet.
 *
 * ### Examples
 *
 * ```adblock
 * ||example.org/bd/hb/prebid.js$script,redirect=prebid
 * ```
 *
 * @added v1.6.2.
 */

export function Prebid(source) {
    const existing = window.pbjs;
    const isObject = (value) => value !== null && (typeof value === 'object' || typeof value === 'function');
    // as Prebid.js, a copy is not loaded if one has already been loaded, e.g. this resource run as a scriptlet
    if (isObject(existing) && existing.libLoaded) {
        return;
    }

    // as Prebid.js, commands pushed while the commands queued before are run, are run after all of them
    let isStarting = true;
    const pushedOnStart = [];
    // as Prebid, a command of the queue is called without a receiver, and its error does not stop the others
    const pushFunction = (arg) => {
        if (isStarting) {
            pushedOnStart.push(arg);
            return;
        }
        runProtected(arg, []);
    };

    // as Prebid.js, the object of the page is kept, e.g. `var pbjs = pbjs || {}`, and its queues and ad units
    const pbjsWrapper = isObject(existing) ? existing : {};
    const que = Array.isArray(pbjsWrapper.que) ? pbjsWrapper.que : [];
    const cmd = Array.isArray(pbjsWrapper.cmd) ? pbjsWrapper.cmd : [];
    const adUnits = Array.isArray(pbjsWrapper.adUnits) ? pbjsWrapper.adUnits : [];

    /**
     * Returns an id of an auction as `generateUUID()` of Prebid.js, i.e. a random UUID of version 4,
     * e.g. `3b241101-e2bb-4255-8caf-4136c566a962`, so that a page which uses the id of an auction,
     * e.g. checks its format, gets the same kind of value as from Prebid.js.
     *
     * As Prebid.js, `crypto.randomUUID()` is used if it is available, i.e. in a secure context,
     * and otherwise the template, in which `x` is replaced with a random hexadecimal digit, `4` is the version
     * of the UUID, and `y` is replaced with `8`, `9`, `a` or `b`, as its two highest bits are always `10`,
     * i.e. its variant. `Math.random()` is enough for the template, as the id is not secret.
     *
     * @returns {string} Random UUID.
     */
    const generateAuctionId = () => {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
            return window.crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
            const random = Math.floor(Math.random() * 16);
            return (char === 'x' ? random : ((random % 4) + 8)).toString(16);
        });
    };

    const api = {
        // https://docs.prebid.org/dev-docs/publisher-api-reference/addAdUnits.html
        addAdUnits(units) {
            // a copy, as Prebid.js, e.g. if the page passes `pbjs.adUnits` itself
            const list = Array.isArray(units) ? units.slice() : [units];
            for (let i = 0; i < list.length; i += 1) {
                pbjsWrapper.adUnits.push(list[i]);
            }
        },
        adServers: {
            dfp: {
                // https://docs.prebid.org/dev-docs/publisher-api-reference/adServers.dfp.buildVideoUrl.html
                // returns ad URL
                buildVideoUrl: noopStr,
            },
        },
        adUnits,
        aliasBidder() { },
        cmd,
        enableAnalytics() { },
        getHighestCpmBids: noopArray,
        libLoaded: true,
        que,
        // https://docs.prebid.org/dev-docs/publisher-api-reference/requestBids.html
        requestBids(arg) {
            // not `instanceof Object`, as the page may call it from its frame
            const options = isObject(arg) ? arg : {};
            const units = options.adUnits || pbjsWrapper.adUnits;
            let list = Array.isArray(units) ? units : [units];
            const codes = options.adUnitCodes;
            // as Prebid.js, an empty list of codes selects all ad units
            const codeList = Array.isArray(codes) ? codes : [codes];
            if (codes && codeList.length > 0) {
                list = list.filter((unit) => isObject(unit) && codeList.indexOf(unit.code) !== -1);
            }
            // as Prebid.js when no bid is received: empty bids of an auction, or none without ad units
            const hasAdUnits = list.some(isObject);
            const bids = hasAdUnits ? {} : undefined;
            const timedOut = hasAdUnits ? false : undefined;
            // as Prebid.js, the id of the auction which the page passes is kept
            let auctionId;
            if (hasAdUnits) {
                auctionId = options.auctionId || generateAuctionId();
            }
            runProtected(options.bidsBackHandler, [bids, timedOut, auctionId]);
            return Promise.resolve({ bids, timedOut, auctionId });
        },
        // https://docs.prebid.org/dev-docs/publisher-api-reference/removeAdUnit.html
        removeAdUnit(codes) {
            if (!codes) {
                pbjsWrapper.adUnits = [];
                return;
            }
            const codeList = Array.isArray(codes) ? codes : [codes];
            const units = pbjsWrapper.adUnits;
            for (let i = units.length - 1; i >= 0; i -= 1) {
                if (isObject(units[i]) && codeList.indexOf(units[i].code) !== -1) {
                    units.splice(i, 1);
                }
            }
        },
        setBidderConfig() { },
        setConfig() { },
        setTargetingForGPTAsync() { },
        // https://github.com/AdguardTeam/AdguardFilters/issues/161263
        // https://github.com/AdguardTeam/AdguardFilters/issues/180487
        rp: {
            requestVideoBids(arg) {
                // not `instanceof Object`, as the player may call it from its frame,
                // e.g. `parent.window.pbjs.rp.requestVideoBids()` of worldsurfleague.com
                if (isObject(arg)) {
                    runProtected(arg.callback, []);
                }
            },
            requestBids: noopFunc,
            onEvent: noopFunc,
            offEvent: noopFunc,
            addAdunitPatterns: noopFunc,
            addSizeMappings: noopFunc,
            setCustomMappingFunction: noopFunc,
            setCustomPbAdSlotFunction: noopFunc,
        },
    };
    Object.keys(api).forEach((key) => {
        pbjsWrapper[key] = api[key];
    });
    cmd.push = pushFunction;
    que.push = pushFunction;
    window.pbjs = pbjsWrapper;

    // as Prebid.js, the commands which the page has queued before are run, `que` first, and the ones which they
    // push after them; a command is marked as `called` once it has run, so that it is not run again,
    // e.g. if `que` and `cmd` are the same array, as `runCommand()` of Prebid.js, so not by `runProtected()`
    const queued = que.slice().concat(cmd.slice());
    for (let i = 0; i < queued.length; i += 1) {
        const command = queued[i];
        if (typeof command === 'function' && typeof command.called === 'undefined') {
            try {
                command.call();
                command.called = true;
            } catch (e) {
                // as Prebid.js, an error of a command does not stop the next ones
            }
        }
    }
    // in the order in which they were pushed, also the ones which they push
    for (let i = 0; i < pushedOnStart.length; i += 1) {
        runProtected(pushedOnStart[i], []);
    }
    isStarting = false;
    // the page may release the commands which have run
    pushedOnStart.length = 0;

    hit(source);
}

export const PrebidNames = ['prebid'];

// eslint-disable-next-line prefer-destructuring
Prebid.primaryName = PrebidNames[0];

Prebid.injections = [hit, noopFunc, noopStr, noopArray, runProtected];
