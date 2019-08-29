import { hit } from '../helpers/hit';

/**
 * Hides Google AdSense ads
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/blob/a94df7f3b27080ae2dcb3b914ace39c0c294d2f6/src/web_accessible_resources/googlesyndication_adsbygoogle.js
 */
export function GooglesyndicationAdsbygoogle(source) {
    window.adsbygoogle = window.adsbygoogle || {
        length: 0,
        loaded: true,
        push() {
            this.length += 1;
        },
    };
    const adElem = document.querySelectorAll('.adsbygoogle');
    const css = 'height:1px!important;max-height:1px!important;max-width:1px!important;width:1px!important;';
    let executed = false;
    for (let i = 0; i < adElem.length; i += 1) {
        const fr = document.createElement('iframe');
        fr.id = `aswift_${i + 1}`;
        fr.style = css;
        const cfr = document.createElement('iframe');
        cfr.id = `google_ads_frame${i}`;
        fr.appendChild(cfr);
        document.body.appendChild(fr);
        executed = true;
    }
    if (executed) {
        hit(source);
    }
}

GooglesyndicationAdsbygoogle.names = [
    'googlesyndication-adsbygoogle',
    'ubo-googlesyndication-adsbygoogle.js',
    'googlesyndication_adsbygoogle.js',
];

GooglesyndicationAdsbygoogle.injections = [
    hit,
];
