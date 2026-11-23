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
 * ### Examples
 *
 * ```adblock
 * ||example.org/bd/hb/prebid.js$script,redirect=prebid
 * ```
 *
 * @added v1.6.2.
 */

export function Prebid(source) {
    // as Prebid, a command of the queue is called without a receiver, and its error does not stop the others
    const pushFunction = (arg) => runProtected(arg, []);

    const pbjsWrapper = {
        addAdUnits() { },
        adServers: {
            dfp: {
                // https://docs.prebid.org/dev-docs/publisher-api-reference/adServers.dfp.buildVideoUrl.html
                // returns ad URL
                buildVideoUrl: noopStr,
            },
        },
        adUnits: [],
        aliasBidder() { },
        cmd: [],
        enableAnalytics() { },
        getHighestCpmBids: noopArray,
        libLoaded: true,
        que: [],
        requestBids(arg) {
            if (arg instanceof Object && arg.bidsBackHandler) {
                try {
                    arg.bidsBackHandler.call(); // https://docs.prebid.org/dev-docs/publisher-api-reference/requestBids.html
                } catch (ex) {
                    /* empty */
                }
            }
        },
        removeAdUnit() { },
        setBidderConfig() { },
        setConfig() { },
        setTargetingForGPTAsync() { },
        // https://github.com/AdguardTeam/AdguardFilters/issues/161263
        // https://github.com/AdguardTeam/AdguardFilters/issues/180487
        rp: {
            requestVideoBids(arg) {
                // not `instanceof Object`, as the player may call it from its frame,
                // e.g. `parent.window.pbjs.rp.requestVideoBids()` of worldsurfleague.com
                if (arg !== null && typeof arg === 'object') {
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
    pbjsWrapper.cmd.push = pushFunction;
    pbjsWrapper.que.push = pushFunction;

    window.pbjs = pbjsWrapper;

    hit(source);
}

export const PrebidNames = ['prebid'];

// eslint-disable-next-line prefer-destructuring
Prebid.primaryName = PrebidNames[0];

Prebid.injections = [hit, noopFunc, noopStr, noopArray, runProtected];
