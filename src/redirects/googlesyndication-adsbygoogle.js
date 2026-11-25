import { hit, runProtected } from '../helpers';

/* eslint-disable max-len */
/**
 * @redirect googlesyndication-adsbygoogle
 *
 * @description
 * Mocks Google AdSense API.
 *
 * `adsbygoogle.push()` calls the functions of the pushed object, and the `google_ad_loaded_callback` of its `params`,
 * which the page passes for a rewarded ad, i.e. `google_ad_format: 'rewarded'`; it is called without an argument,
 * i.e. without an ad to show, so that the page continues as when the ad is not shown.
 *
 * Calls of the Ad Placement API of H5 games, i.e. `adBreak()` and `adConfig()`, which the page passes
 * to `adsbygoogle.push()`, are answered without an ad and without waiting, as by AdSense:
 * - `adConfig()` calls `onReady()` after the call returns,
 * - a break of the `reward` type calls `beforeReward(showAdFn)` before the call returns, so that the game offers
 *   the reward; once the player accepts it, i.e. the game calls `showAdFn()`, `beforeAd()`, `adViewed()`, which
 *   grants the reward, `afterAd()` and `adBreakDone()` with the `viewed` status are called, as for a watched ad;
 *   if the game requests the next break before, `adBreakDone()` of the offered one is called with the `ignored`
 *   status after that call returns,
 * - a break of another type, e.g. `preroll` or `next`, only calls `adBreakDone()` after the call returns,
 *   with the `frequencyCapped` status, as for an ad which is not shown, or `invalid` for a second `preroll`.
 *
 * As by AdSense, an `adsbygoogle` object which is already loaded, e.g. of this resource run as a scriptlet,
 * is kept, so that its state, e.g. an offered reward, is kept as well; an array of the page is replaced.
 *
 * As by AdSense, at most 20 objects which the page has pushed before the resource has run are handled as well.
 * Ad placeholders, i.e. `.adsbygoogle` elements, are filled with empty frames, as by AdSense, also the ones which the
 * page adds later: on each `adsbygoogle.push()`, and once the document is parsed. As by AdSense, a filled placeholder
 * gets `data-adsbygoogle-status="done"` at once, and `data-ad-status="filled"` later, unless it already has
 * `data-ad-status`, e.g. set by the page or another rule, and the frame gets `data-load-complete="true"`,
 * as pages check them to detect whether the ad has been blocked; as by AdSense, `data-ad-status` is not set
 * in a frame which cannot access the top document, e.g. a cross-origin one. A placeholder which AdSense itself
 * has taken, i.e. marked as processed, gets neither, as AdSense sets the result of its ad request itself.
 *
 * Related UBO redirect resource:
 * https://github.com/gorhill/uBlock/blob/master/src/web_accessible_resources/googlesyndication_adsbygoogle.js
 *
 * ### Examples
 *
 * ```adblock
 * ||pagead2.googlesyndication.com/pagead/js/adsbygoogle.js$script,redirect=googlesyndication-adsbygoogle
 * ```
 *
 * @added v1.0.10.
 */
/* eslint-enable max-len */
export function GoogleSyndicationAdsByGoogle(source) {
    const css = 'height:1px!important;max-height:1px!important;max-width:1px!important;width:1px!important;';
    const statusAttrName = 'data-adsbygoogle-status';
    const adStatusAttrName = 'data-ad-status';
    const ASWIFT_IFRAME_MARKER = 'aswift_';
    const GOOGLE_ADS_IFRAME_MARKER = 'google_ads_iframe_';
    let isHitCalled = false;

    /**
     * Calls `hit()` once, when the resource has done something, i.e. filled a placeholder or answered a call.
     */
    const callHit = () => {
        if (!isHitCalled) {
            isHitCalled = true;
            hit(source);
        }
    };

    /**
     * Returns an id for a new frame which no element of the page has, e.g. `aswift_0`.
     *
     * @param {string} marker Prefix of the id.
     * @returns {string} Id.
     */
    const getFreeId = (marker) => {
        let index = 0;
        while (document.getElementById(`${marker}${index}`)) {
            index += 1;
        }
        return `${marker}${index}`;
    };

    /**
     * Checks whether the placeholder has a frame of this resource as its child, also if it has already been run,
     * e.g. as a scriptlet and as a redirect, and the placeholder has other content, e.g. whitespace,
     * so that it is not filled again on each push.
     *
     * @param {Element} adElem Placeholder, i.e. `.adsbygoogle` element.
     * @param {string} marker Prefix of the id of the frame.
     * @returns {boolean} True if the frame is its child.
     */
    const hasOwnFrame = (adElem, marker) => {
        const { children } = adElem;
        for (let i = 0; i < children.length; i += 1) {
            const child = children[i];
            if (child.nodeName.toLowerCase() === 'iframe' && child.id.startsWith(marker)) {
                return true;
            }
        }
        return false;
    };

    /**
     * Appends an empty frame with an empty frame inside to the placeholder.
     *
     * @param {Element} adElem Placeholder, i.e. `.adsbygoogle` element.
     * @param {string} marker Prefix of the id of the frame.
     * @param {boolean} isOwned Whether the placeholder is filled by this resource, not by AdSense,
     * so that the frame is marked as loaded, as AdSense marks its frame.
     */
    const appendFrame = (adElem, marker, isOwned) => {
        const frame = document.createElement('iframe');
        frame.id = getFreeId(marker);
        frame.style = css;
        adElem.appendChild(frame);
        if (isOwned && marker === ASWIFT_IFRAME_MARKER) {
            // as AdSense sets on the load of its frame, which is empty here, so it is loaded at once;
            // set after the frame is inserted, so that an observer of the placeholder sees the change
            frame.setAttribute('data-load-complete', 'true');
        }
        // the frame inside is optional: a frame has no window above the limit of frames of a page,
        // e.g. 1000 in Chromium, i.e. 250 placeholders with two frames, each with a frame inside,
        // and its document cannot be accessed in a frame sandboxed without `allow-same-origin`
        try {
            const frameWindow = frame.contentWindow;
            const frameBody = frameWindow && frameWindow.document && frameWindow.document.body;
            if (frameBody) {
                frameBody.appendChild(document.createElement('iframe'));
            }
        } catch (e) {
            // the frame is kept without a frame inside
        }
    };

    /**
     * Checks whether AdSense itself has taken the placeholder, e.g. if this resource is run as a scriptlet after
     * the script of AdSense, which is not blocked: AdSense has added its `aswift_<index>_host` element to it,
     * or it has marked it as processed, i.e. `data-adsbygoogle-status="done"`, before this resource has filled it,
     * e.g. for a placeholder without a size, to which AdSense adds no element, or as reserved for itself,
     * i.e. `data-adsbygoogle-status="reserved"`. AdSense then sets the result of its ad request,
     * i.e. `data-ad-status`, itself, or none.
     *
     * @param {Element} adElem Placeholder, i.e. `.adsbygoogle` element.
     * @param {boolean} hasOwnFrames Whether the placeholder has a frame of this resource.
     * @returns {boolean} True if AdSense has taken it.
     */
    const isTakenByAdSense = (adElem, hasOwnFrames) => {
        const status = adElem.getAttribute(statusAttrName);
        // `reserved` is set by AdSense on a placeholder which it creates itself, e.g. of Auto ads, before it pushes it
        if (status === 'reserved' || (!hasOwnFrames && status === 'done')) {
            return true;
        }
        const { children } = adElem;
        for (let i = 0; i < children.length; i += 1) {
            if (/^aswift_\d+_host$/.test(children[i].id)) {
                return true;
            }
        }
        return false;
    };

    /**
     * Checks whether the document can access the top document, i.e. it is not in a cross-origin frame,
     * nor in a sandboxed one, as AdSense sets `data-ad-status` only then.
     *
     * @returns {boolean} True if the top document can be accessed.
     */
    const canAccessTopDocument = () => {
        try {
            return !!window.top && !!window.top.document;
        } catch (e) {
            return false;
        }
    };
    const isAdStatusSet = canAccessTopDocument();

    /**
     * Sets `data-ad-status="filled"` on a placeholder in a later task, as AdSense sets it once the ad has been
     * loaded, so that page code which observes the attribute after it pushes the placeholder sees the change.
     * A value which is already set, e.g. by the page or by another rule, is kept, and an error, e.g. caused
     * by the page, is not thrown to it. As by AdSense, it is not set in a frame which cannot access the top
     * document, e.g. a cross-origin one.
     *
     * @param {Element} adElem Placeholder, i.e. `.adsbygoogle` element.
     */
    const setAdStatusLater = (adElem) => {
        if (!isAdStatusSet) {
            return;
        }
        setTimeout(() => {
            try {
                if (!adElem.hasAttribute(adStatusAttrName)) {
                    adElem.setAttribute(adStatusAttrName, 'filled');
                }
            } catch (e) {
                // the placeholder is kept without the status
            }
        }, 0);
    };

    /**
     * Fills the ad placeholders, i.e. `.adsbygoogle` elements, which are not filled yet, with empty frames,
     * as AdSense does.
     */
    const fillPlaceholders = () => {
        const adElems = document.querySelectorAll('.adsbygoogle');
        let executed = false;
        for (let i = 0; i < adElems.length; i += 1) {
            const adElem = adElems[i];
            // an error for one placeholder, e.g. caused by the page, does not stop the other ones,
            // nor is thrown out of `adsbygoogle.push()` to the page; only a missing frame is appended,
            // so that a placeholder is not filled again if appending the other one fails
            try {
                const hasAswiftIframe = hasOwnFrame(adElem, ASWIFT_IFRAME_MARKER);
                const hasGoogleAdsIframe = hasOwnFrame(adElem, GOOGLE_ADS_IFRAME_MARKER);
                if (!hasAswiftIframe || !hasGoogleAdsIframe) {
                    // checked before the placeholder is marked as processed
                    const isOwned = !isTakenByAdSense(adElem, hasAswiftIframe || hasGoogleAdsIframe);
                    // Marked as processed before the frame is appended, as by AdSense, so that the frame is loaded,
                    // and marked as loaded, in a processed placeholder; not marked again with the same value,
                    // which would wake up observers of the page. A placeholder which AdSense has reserved for itself
                    // is not marked, as AdSense processes only a placeholder which is not marked yet.
                    const previousStatus = adElem.getAttribute(statusAttrName);
                    const isMarked = previousStatus !== 'done' && previousStatus !== 'reserved';
                    if (isMarked) {
                        adElem.setAttribute(statusAttrName, 'done');
                    }
                    if (!hasAswiftIframe) {
                        try {
                            appendFrame(adElem, ASWIFT_IFRAME_MARKER, isOwned);
                        } catch (e) {
                            // a placeholder whose first frame fails to be appended, e.g. by an error of the page,
                            // is left as it was, so that it is not taken for one of AdSense when it is filled again
                            if (isMarked) {
                                if (previousStatus === null) {
                                    adElem.removeAttribute(statusAttrName);
                                } else {
                                    adElem.setAttribute(statusAttrName, previousStatus);
                                }
                            }
                            throw e;
                        }
                    }
                    if (!hasGoogleAdsIframe) {
                        appendFrame(adElem, GOOGLE_ADS_IFRAME_MARKER, isOwned);
                    }
                    if (isOwned) {
                        setAdStatusLater(adElem);
                    }
                    executed = true;
                }
            } catch (e) {
                // continue with the other placeholders
            }
        }

        if (executed) {
            callHit();
        }
    };

    let isPrerollRequested = false;
    // a break of the `reward` type whose reward is offered, until the player accepts it or the next break
    let offeredReward = null;

    /**
     * Calls a function after the call of the page returns, as AdSense answers most calls asynchronously.
     *
     * @param {Function} callback Function to call.
     */
    const callLater = (callback) => {
        setTimeout(callback, 0);
    };

    /**
     * Calls `adBreakDone()` of a break with the placement info of the Ad Placement API.
     *
     * @param {object} adBreak Break read by `handleAdBreak()`.
     * @param {string} breakStatus Status of the break, e.g. `viewed`.
     */
    const finishAdBreak = (adBreak, breakStatus) => {
        let breakFormat = 'interstitial';
        if (adBreak.type === 'reward' || adBreak.type === 'preroll') {
            breakFormat = adBreak.type;
        }
        runProtected(adBreak.adBreakDone, [{
            breakType: adBreak.type,
            breakName: adBreak.name,
            breakFormat,
            breakStatus,
        }]);
    };

    /**
     * Answers `adBreak()` of the Ad Placement API without an ad, see the description.
     * Callbacks are read once, when the break is requested.
     *
     * @param {object} arg Object passed to `adBreak()`, with a string `type`.
     */
    const handleAdBreak = (arg) => {
        const adBreak = {
            type: arg.type,
            name: arg.name,
            beforeReward: arg.beforeReward,
            beforeAd: arg.beforeAd,
            afterAd: arg.afterAd,
            adViewed: arg.adViewed,
            adBreakDone: arg.adBreakDone,
        };
        if (offeredReward) {
            const ignored = offeredReward;
            offeredReward = null;
            callLater(() => finishAdBreak(ignored, 'ignored'));
        }
        if (adBreak.type === 'reward' && typeof adBreak.beforeReward === 'function') {
            offeredReward = adBreak;
            const showAdFn = () => {
                // once, and only while the reward is offered
                if (offeredReward !== adBreak) {
                    return;
                }
                offeredReward = null;
                callLater(() => {
                    runProtected(adBreak.beforeAd, []);
                    runProtected(adBreak.adViewed, []);
                    runProtected(adBreak.afterAd, []);
                    finishAdBreak(adBreak, 'viewed');
                });
            };
            // as AdSense, before the call returns, e.g. so that the game can enable its reward button at once
            runProtected(adBreak.beforeReward, [showAdFn]);
            return;
        }
        // as the Ad Placement API, there is only one preroll per page load
        let breakStatus = 'frequencyCapped';
        if (adBreak.type === 'preroll') {
            breakStatus = isPrerollRequested ? 'invalid' : 'frequencyCapped';
            isPrerollRequested = true;
        }
        callLater(() => finishAdBreak(adBreak, breakStatus));
    };

    /**
     * Checks whether the value is an object of `Object`, also of another frame, e.g. `{ adBreakDone() {} }`,
     * or with a prototype of default options, e.g. `Object.create(defaults)`.
     *
     * @param {any} value Value pushed by the page.
     * @returns {boolean} True if its constructor is `Object` of any frame.
     */
    const isPlainObject = (value) => {
        if (value === null || typeof value !== 'object') {
            return false;
        }
        const ctor = value.constructor;
        return typeof ctor === 'function' && ctor.name === 'Object';
    };

    /**
     * Handles an object pushed by the page, also one pushed before the resource has run.
     *
     * @param {object} adsbygoogle Mocked `adsbygoogle` object.
     * @param {any} arg Pushed value.
     */
    const handlePush = (adsbygoogle, arg) => {
        const isObject = arg !== null && typeof arg === 'object';
        // calls of the Ad Placement API, recognized as by AdSense
        if (isObject && typeof arg.type === 'string') {
            handleAdBreak(arg);
            callHit();
        } else if (isObject && (typeof arg.sound === 'string' || typeof arg.preloadAdBreaks === 'string'
            || (arg.h5AdsConfig !== null && typeof arg.h5AdsConfig === 'object'))) {
            const { onReady } = arg;
            callLater(() => runProtected(onReady, []));
            callHit();
        } else if (isPlainObject(arg)) {
            // eslint-disable-next-line no-restricted-syntax
            for (const key of Object.keys(arg)) {
                if (typeof arg[key] === 'function') {
                    try {
                        // https://github.com/AdguardTeam/Scriptlets/issues/252
                        // argument "{}" is needed to fix issue with undefined argument
                        arg[key].call(adsbygoogle, {});
                    } catch {
                        /* empty */
                    }
                }
            }
        }
        // a rewarded ad, e.g. of ssstik.io, is shown by the page in this callback, if AdSense passes it one,
        // so it is called without an ad, as the page would not handle an object without `show()`;
        // as AdSense, it is an own property of `params` of any pushed object, e.g. of another frame
        const params = isObject ? arg.params : undefined;
        if (params !== null && typeof params === 'object'
            && Object.prototype.hasOwnProperty.call(params, 'google_ad_loaded_callback')) {
            runProtected(params.google_ad_loaded_callback, []);
        }
        // as AdSense, a placeholder which the page adds is filled when the page pushes its ad
        // https://github.com/AdguardTeam/Scriptlets/issues/525
        fillPlaceholders();
    };

    const mock = {
        // https://github.com/AdguardTeam/Scriptlets/issues/113
        // length: 0,
        loaded: true,
        // https://github.com/AdguardTeam/Scriptlets/issues/184
        push(arg) {
            if (typeof this.length === 'undefined') {
                this.length = 0;
                this.length += 1;
            }
            handlePush(this, arg);
        },
    };

    fillPlaceholders();

    const queue = window.adsbygoogle;
    // as AdSense, an object which is already loaded is kept, e.g. of this resource run before as a scriptlet,
    // so that the state of its breaks is kept, but unlike by AdSense, not an array, which is the queue of the page,
    // e.g. with `loaded` set by another rule
    const isLoaded = !!queue && !!queue.loaded && typeof queue.push === 'function' && typeof queue.shift !== 'function';
    if (!isLoaded) {
        // as AdSense, at most 20 objects which the page has pushed before, e.g. `(adsbygoogle = window.adsbygoogle
        // || []).push({})` before the script is loaded, are removed from its array and handled, before the array
        // is replaced, so that objects which they push to it are handled as well
        if (queue && typeof queue.shift === 'function') {
            for (let count = 0; count < 20; count += 1) {
                let arg;
                try {
                    if (!(queue.length > 0)) {
                        break;
                    }
                    arg = queue.shift();
                } catch (e) {
                    // e.g. a frozen array of the page
                    break;
                }
                // as AdSense, an error of one object, e.g. of a getter of the page, does not stop the next ones
                try {
                    handlePush(mock, arg);
                } catch (e) {
                    // continue with the next object
                }
            }
        }
        window.adsbygoogle = mock;
    }
    // placeholders after the script, e.g. if it is run as a scriptlet, before the page
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fillPlaceholders, { once: true });
    }
}

export const GoogleSyndicationAdsByGoogleNames = [
    'googlesyndication-adsbygoogle',
    'ubo-googlesyndication_adsbygoogle.js',
    'googlesyndication_adsbygoogle.js',
];

// eslint-disable-next-line prefer-destructuring
GoogleSyndicationAdsByGoogle.primaryName = GoogleSyndicationAdsByGoogleNames[0];

GoogleSyndicationAdsByGoogle.injections = [
    hit,
    runProtected,
];
