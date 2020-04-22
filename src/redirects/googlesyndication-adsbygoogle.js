import { hit } from '../helpers';

/* eslint-disable max-len */
/**
 * @redirect googlesyndication-adsbygoogle
 *
 * @description
 * Mocks Google AdSense API.
 *
 * Related UBO redirect resource:
 * https://github.com/gorhill/uBlock/blob/a94df7f3b27080ae2dcb3b914ace39c0c294d2f6/src/web_accessible_resources/googlesyndication_adsbygoogle.js
 *
 * **Example**
 * ```
 * ||pagead2.googlesyndication.com/pagead/js/adsbygoogle.js$script,redirect=googlesyndication-adsbygoogle
 * ```
 */
/* eslint-enable max-len */
export function GoogleSyndicationAdsByGoogle(source) {
    window.adsbygoogle = window.adsbygoogle || {
        length: 0,
        loaded: true,
        push() {
            this.length += 1;
        },
    };
    const adElems = document.querySelectorAll('.adsbygoogle');
    const css = 'height:1px!important;max-height:1px!important;max-width:1px!important;width:1px!important;';
    const statusAttrName = 'data-adsbygoogle-status';
    const ASWIFT_IFRAME_MARKER = 'aswift_';
    const GOOGLE_ADS_IFRAME_MARKER = 'google_ads_iframe_';

    // checks if scriptlet was executed before
    // and if .adsbygoogle > iframes are defined by AdGuard earlier
    // TODO: remake after scriptlets context developing in 1.3
    const wasExecutedBefore = (i) => {
        const adElemChildren = adElems[i].childNodes;
        let executedBefore = false;
        if (adElemChildren.length > 0) {
            const areIframesDefined = adElemChildren
                .reduce((acc, el) => {
                    return el.tagName.toLowerCase() === 'iframe'
                        && (el.id.indexOf(ASWIFT_IFRAME_MARKER) > -1
                            || el.id.indexOf(GOOGLE_ADS_IFRAME_MARKER) > -1)
                        && acc;
                }, true);
            executedBefore = adElems[i].hasAttribute(statusAttrName) && areIframesDefined;
        }

        return executedBefore;
    };


    let executed = false;
    for (let i = 0; i < adElems.length; i += 1) {
        if (!wasExecutedBefore(i)) {
            adElems[i].setAttribute(statusAttrName, 'done');

            const aswiftIframe = document.createElement('iframe');
            aswiftIframe.id = `${ASWIFT_IFRAME_MARKER}${i + 1}`;
            aswiftIframe.style = css;
            adElems[i].appendChild(aswiftIframe);

            const googleadsIframe = document.createElement('iframe');
            googleadsIframe.id = `${GOOGLE_ADS_IFRAME_MARKER}${i + 1}`;
            googleadsIframe.style = css;
            adElems[i].appendChild(googleadsIframe);
        }

        executed = true;
    }

    if (executed) {
        hit(source);
    }
}

GoogleSyndicationAdsByGoogle.names = [
    'googlesyndication-adsbygoogle',
    'ubo-googlesyndication_adsbygoogle.js',
    'googlesyndication_adsbygoogle.js',
];

GoogleSyndicationAdsByGoogle.injections = [
    hit,
];
