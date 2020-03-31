import { hit } from '../helpers/hit';

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
    let executed = false;
    for (let i = 0; i < adElems.length; i += 1) {
        adElems[i].setAttribute('data-adsbygoogle-status', 'done');

        const aswiftIframe = document.createElement('iframe');
        aswiftIframe.id = `aswift_${i + 1}`;
        aswiftIframe.style = css;
        adElems[i].appendChild(aswiftIframe);

        const googleadsIframe = document.createElement('iframe');
        googleadsIframe.id = `google_ads_iframe_${i}`;
        googleadsIframe.style = css;
        adElems[i].appendChild(googleadsIframe);

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
