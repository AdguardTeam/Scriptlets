import { hit } from '../helpers/index';

/* eslint-disable max-len */
/**
 * @redirect googlesyndication-adsbygoogle
 *
 * @description
 * Mocks Google AdSense API.
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
            }
        },
    };
    const adElems = document.querySelectorAll('.adsbygoogle');
    const css = 'height:1px!important;max-height:1px!important;max-width:1px!important;width:1px!important;';
    const statusAttrName = 'data-adsbygoogle-status';
    const ASWIFT_IFRAME_MARKER = 'aswift_';
    const GOOGLE_ADS_IFRAME_MARKER = 'google_ads_iframe_';

    let executed = false;
    for (let i = 0; i < adElems.length; i += 1) {
        const adElemChildNodes = adElems[i].childNodes;
        const childNodesQuantity = adElemChildNodes.length;
        // childNodes of .adsbygoogle can be defined if scriptlet was executed before
        // so we should check that childNodes are exactly defined by us
        // TODO: remake after scriptlets context developing in 1.3
        let areIframesDefined = false;
        if (childNodesQuantity > 0) {
            // it should be only 2 child iframes if scriptlet was executed
            areIframesDefined = childNodesQuantity === 2
                // the first of child nodes should be aswift iframe
                && adElemChildNodes[0].nodeName.toLowerCase() === 'iframe'
                && adElemChildNodes[0].id.includes(ASWIFT_IFRAME_MARKER)
                // the second of child nodes should be google_ads iframe
                && adElemChildNodes[1].nodeName.toLowerCase() === 'iframe'
                && adElemChildNodes[1].id.includes(GOOGLE_ADS_IFRAME_MARKER);
        }

        if (!areIframesDefined) {
            // here we do the job if scriptlet has not been executed earlier
            adElems[i].setAttribute(statusAttrName, 'done');

            const aswiftIframe = document.createElement('iframe');
            aswiftIframe.id = `${ASWIFT_IFRAME_MARKER}${i}`;
            aswiftIframe.style = css;
            adElems[i].appendChild(aswiftIframe);
            const innerAswiftIframe = document.createElement('iframe');
            aswiftIframe.contentWindow.document.body.appendChild(innerAswiftIframe);

            const googleadsIframe = document.createElement('iframe');
            googleadsIframe.id = `${GOOGLE_ADS_IFRAME_MARKER}${i}`;
            googleadsIframe.style = css;
            adElems[i].appendChild(googleadsIframe);
            const innerGoogleadsIframe = document.createElement('iframe');
            googleadsIframe.contentWindow.document.body.appendChild(innerGoogleadsIframe);

            executed = true;
        }
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
