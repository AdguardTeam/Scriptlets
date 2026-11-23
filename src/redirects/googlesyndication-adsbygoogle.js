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
 * Ad placeholders, i.e. `.adsbygoogle` elements, are filled with empty frames, as by AdSense, also the ones which the
 * page adds later: on each `adsbygoogle.push()`, and once the document is parsed.
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
    const ASWIFT_IFRAME_MARKER = 'aswift_';
    const GOOGLE_ADS_IFRAME_MARKER = 'google_ads_iframe_';
    let isHitCalled = false;

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
     * Checks whether the placeholder has the frames of this resource as its children.
     *
     * @param {Element} adElem Placeholder, i.e. `.adsbygoogle` element.
     * @returns {boolean} True if both frames are its children.
     */
    const hasOwnFrames = (adElem) => {
        let hasAswiftIframe = false;
        let hasGoogleAdsIframe = false;
        const { children } = adElem;
        for (let i = 0; i < children.length; i += 1) {
            const child = children[i];
            if (child.nodeName.toLowerCase() === 'iframe') {
                if (child.id.startsWith(ASWIFT_IFRAME_MARKER)) {
                    hasAswiftIframe = true;
                } else if (child.id.startsWith(GOOGLE_ADS_IFRAME_MARKER)) {
                    hasGoogleAdsIframe = true;
                }
            }
        }
        return hasAswiftIframe && hasGoogleAdsIframe;
    };

    /**
     * Fills the ad placeholders, i.e. `.adsbygoogle` elements, which are not filled yet, with empty frames,
     * as AdSense does.
     */
    const fillPlaceholders = () => {
        const adElems = document.querySelectorAll('.adsbygoogle');
        let executed = false;
        for (let i = 0; i < adElems.length; i += 1) {
            // the frames of this resource, also if it has already been run, e.g. as a scriptlet and as a redirect,
            // and the placeholder has other content, e.g. whitespace, so that it is not filled again on each push
            const areIframesDefined = hasOwnFrames(adElems[i]);

            if (!areIframesDefined) {
                // here we do the job if scriptlet has not been executed earlier
                adElems[i].setAttribute(statusAttrName, 'done');

                const aswiftIframe = document.createElement('iframe');
                aswiftIframe.id = getFreeId(ASWIFT_IFRAME_MARKER);
                aswiftIframe.style = css;
                adElems[i].appendChild(aswiftIframe);
                const innerAswiftIframe = document.createElement('iframe');
                aswiftIframe.contentWindow.document.body.appendChild(innerAswiftIframe);

                const googleadsIframe = document.createElement('iframe');
                googleadsIframe.id = getFreeId(GOOGLE_ADS_IFRAME_MARKER);
                googleadsIframe.style = css;
                adElems[i].appendChild(googleadsIframe);
                const innerGoogleadsIframe = document.createElement('iframe');
                googleadsIframe.contentWindow.document.body.appendChild(innerGoogleadsIframe);

                executed = true;
            }
        }

        if (executed && !isHitCalled) {
            isHitCalled = true;
            hit(source);
        }
    };

    window.adsbygoogle = {
        // https://github.com/AdguardTeam/Scriptlets/issues/113
        // length: 0,
        loaded: true,
        // https://github.com/AdguardTeam/Scriptlets/issues/184
        push(arg) {
            if (typeof this.length === 'undefined') {
                this.length = 0;
                this.length += 1;
            }
            if (arg !== null && arg instanceof Object && arg.constructor.name === 'Object') {
                // eslint-disable-next-line no-restricted-syntax
                for (const key of Object.keys(arg)) {
                    if (typeof arg[key] === 'function') {
                        try {
                            // https://github.com/AdguardTeam/Scriptlets/issues/252
                            // argument "{}" is needed to fix issue with undefined argument
                            arg[key].call(this, {});
                        } catch {
                            /* empty */
                        }
                    }
                }
                // a rewarded ad, e.g. of ssstik.io, is shown by the page in this callback, if AdSense passes it one,
                // so it is called without an ad, as the page would not handle an object without `show()`
                const { params } = arg;
                if (params !== null && typeof params === 'object') {
                    runProtected(params.google_ad_loaded_callback, []);
                }
            }
            // as AdSense, a placeholder which the page adds is filled when the page pushes its ad
            // https://github.com/AdguardTeam/Scriptlets/issues/525
            fillPlaceholders();
        },
    };

    fillPlaceholders();
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
