/**
 * Store of ADG redirects names and thier analogs.
 * As it is not a compatibility table, no need to keep in redirects array third-party redirects.
 *
 * Needed only for converion purposes.
 * e.g. googletagmanager-gtm is removed and should be removed from compatibility table as well
 * but now it works as alias for google-analytics so it should stay valid for compiler
 */
const redirects = [
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
        adg: 'googletagservices-gpt',
        ubo: 'googletagservices_gpt.js',
    },
    {
        adg: 'metrika-yandex-watch',
    },
    {
        adg: 'metrika-yandex-tag',
    },
    {
        adg: 'noeval',
        ubo: 'noeval-silent.js',
    },
    {
        adg: 'noopcss',
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
        adg: 'prevent-bab',
        ubo: 'nobab.js',
    },
    {
        adg: 'prevent-fab-3.2.0',
        ubo: 'nofab.js',
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
];

export default redirects;
