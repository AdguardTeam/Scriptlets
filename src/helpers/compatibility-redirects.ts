/**
 * Store of ADG redirects names and their analogs.
 * As it is not a compatibility table, no need to keep in redirects array third-party redirects.
 *
 * Needed only for conversion purposes.
 * e.g. googletagmanager-gtm is removed and should be removed from compatibility table as well
 * but now it works as alias for google-analytics so it should stay valid for compiler
 */
const redirects: RedirectCompatibilityMap[] = [
    {
        adg: '1x1-transparent.gif',
        ubo: '1x1.gif',
        abp: '1x1-transparent-gif',
    },
    {
        adg: '2x2-transparent.png',
        ubo: '2x2.png',
        abp: '2x2-transparent-png',
    },
    {
        adg: '3x2-transparent.png',
        ubo: '3x2.png',
        abp: '3x2-transparent-png',
    },
    {
        adg: '32x32-transparent.png',
        ubo: '32x32.png',
        abp: '32x32-transparent-png',
    },
    {
        adg: 'amazon-apstag',
        ubo: 'amazon_apstag.js',
    },
    {
        adg: 'ati-smarttag',
    },
    {
        adg: 'didomi-loader',
    },
    {
        adg: 'click2load.html',
        ubo: 'click2load.html',
    },
    {
        adg: 'fingerprintjs2',
        ubo: 'fingerprint2.js',
    },
    {
        adg: 'fingerprintjs3',
        ubo: 'fingerprint3.js',
    },
    {
        adg: 'google-analytics',
        ubo: 'google-analytics_analytics.js',
    },
    {
        adg: 'google-analytics-ga',
        ubo: 'google-analytics_ga.js',
    },
    {
        adg: 'googlesyndication-adsbygoogle',
        ubo: 'googlesyndication_adsbygoogle.js',
    },
    {
        // https://github.com/AdguardTeam/Scriptlets/issues/162
        adg: 'googlesyndication-adsbygoogle',
        ubo: 'googlesyndication.com/adsbygoogle.js',
    },
    {
        // https://github.com/AdguardTeam/Scriptlets/issues/127
        adg: 'googletagmanager-gtm',
        ubo: 'google-analytics_ga.js',
    },
    {
        // https://github.com/AdguardTeam/Scriptlets/issues/260
        adg: 'googletagmanager-gtm',
        ubo: 'googletagmanager_gtm.js',
    },
    {
        adg: 'googletagservices-gpt',
        ubo: 'googletagservices_gpt.js',
    },
    {
        adg: 'google-ima3',
        ubo: 'google-ima.js',
    },
    {
        adg: 'gemius',
    },
    {
        adg: 'matomo',
    },
    {
        adg: 'metrika-yandex-watch',
    },
    {
        adg: 'metrika-yandex-tag',
    },
    {
        adg: 'naver-wcslog',
    },
    {
        adg: 'noeval',
        ubo: 'noeval-silent.js',
    },
    {
        adg: 'noopcss',
        ubo: 'noop.css',
        abp: 'blank-css',
    },
    {
        adg: 'noopframe',
        ubo: 'noop.html',
        abp: 'blank-html',
    },
    {
        adg: 'noopjs',
        ubo: 'noop.js',
        abp: 'blank-js',
    },
    {
        adg: 'noopjson',
        ubo: 'noop.json',
    },
    {
        adg: 'nooptext',
        ubo: 'noop.txt',
        abp: 'blank-text',
    },
    {
        adg: 'noopmp3-0.1s',
        ubo: 'noop-0.1s.mp3',
        abp: 'blank-mp3',
    },
    {
        adg: 'noopmp4-1s',
        ubo: 'noop-1s.mp4',
        abp: 'blank-mp4',
    },
    {
        adg: 'noopvmap-1.0',
        ubo: 'noop-vmap1.0.xml',
    },
    {
        adg: 'noopvast-2.0',
    },
    {
        adg: 'noopvast-3.0',
    },
    {
        adg: 'noopvast-4.0',
    },
    {
        adg: 'prebid',
    },
    {
        adg: 'pardot-1.0',
    },
    {
        adg: 'prevent-bab',
        ubo: 'nobab.js',
    },
    {
        adg: 'prevent-bab2',
        ubo: 'nobab2.js',
    },
    {
        adg: 'prevent-fab-3.2.0',
        ubo: 'nofab.js',
    },
    {
        // AG-15917
        adg: 'prevent-fab-3.2.0',
        ubo: 'fuckadblock.js-3.2.0',
    },
    {
        adg: 'prevent-popads-net',
        ubo: 'popads.js',
    },
    {
        adg: 'scorecardresearch-beacon',
        ubo: 'scorecardresearch_beacon.js',
    },
    {
        adg: 'set-popads-dummy',
        ubo: 'popads-dummy.js',
    },
    {
        adg: 'empty',
        ubo: 'empty',
    },
    {
        adg: 'prebid-ads',
        ubo: 'prebid-ads.js',
    },
];

export default redirects;
