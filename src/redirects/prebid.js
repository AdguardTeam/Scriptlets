/* eslint-disable func-names */
import {
    hit,
    noopFunc,
    noopStr,
    noopArray,
} from '../helpers/index';

/**
 * @redirect prebid
 *
 * @description
 * Mocks the prebid.js header bidding suit.
 * https://docs.prebid.org/
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
    const pushFunction = function (arg) {
        if (typeof arg === 'function') {
            try {
                arg.call();
            } catch (ex) {
                /* empty */
            }
        }
    };

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
    };
    pbjsWrapper.cmd.push = pushFunction;
    pbjsWrapper.que.push = pushFunction;

    window.pbjs = pbjsWrapper;

    hit(source);
}

Prebid.names = ['prebid'];

Prebid.injections = [hit, noopFunc, noopStr, noopArray];
