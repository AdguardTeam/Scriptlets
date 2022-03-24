## <a id="redirect-resources"></a> Available Redirect resources
* [1x1-transparent.gif](#1x1-transparent.gif)
* [2x2-transparent.png](#2x2-transparent.png)
* [3x2-transparent.png](#3x2-transparent.png)
* [32x32-transparent.png](#32x32-transparent.png)
* [noopframe](#noopframe)
* [noopcss](#noopcss)
* [noopjs](#noopjs)
* [noopjson](#noopjson)
* [nooptext](#nooptext)
* [empty](#empty)
* [noopvmap-1.0](#noopvmap-1.0)
* [noopvast-2.0](#noopvast-2.0)
* [noopvast-3.0](#noopvast-3.0)
* [noopvast-4.0](#noopvast-4.0)
* [noopmp3-0.1s](#noopmp3-0.1s)
* [noopmp4-1s](#noopmp4-1s)
* [amazon-apstag](#amazon-apstag)
* [ati-smarttag](#ati-smarttag)
* [didomi-loader](#didomi-loader)
* [fingerprintjs2](#fingerprintjs2)
* [fingerprintjs3](#fingerprintjs3)
* [gemius](#gemius)
* [google-analytics-ga](#google-analytics-ga)
* [google-analytics](#google-analytics)
* [google-ima3](#google-ima3)
* [googlesyndication-adsbygoogle](#googlesyndication-adsbygoogle)
* [googletagservices-gpt](#googletagservices-gpt)
* [matomo](#matomo)
* [metrika-yandex-tag](#metrika-yandex-tag)
* [metrika-yandex-watch](#metrika-yandex-watch)
* [naver-wcslog](#naver-wcslog)
* [noeval](#noeval)
* [prebid-ads](#prebid-ads)
* [prebid](#prebid)
* [prevent-bab](#prevent-bab)
* [prevent-bab2](#prevent-bab2)
* [prevent-fab-3.2.0](#prevent-fab-3.2.0)
* [prevent-popads-net](#prevent-popads-net)
* [scorecardresearch-beacon](#scorecardresearch-beacon)
* [set-popads-dummy](#set-popads-dummy)
* [click2load.html](#click2load.html)
* * *
### <a id="1x1-transparent.gif"></a> ⚡️ 1x1-transparent.gif
**Example**
```
||example.org^$image,redirect=1x1-transparent.gif
```
[Redirect source](../src/redirects/static-redirects.yml)
* * *

### <a id="2x2-transparent.png"></a> ⚡️ 2x2-transparent.png
**Example**
```
||example.org^$image,redirect=2x2-transparent.png
```
[Redirect source](../src/redirects/static-redirects.yml)
* * *

### <a id="3x2-transparent.png"></a> ⚡️ 3x2-transparent.png
**Example**
```
||example.org^$image,redirect=3x2-transparent.png
```
[Redirect source](../src/redirects/static-redirects.yml)
* * *

### <a id="32x32-transparent.png"></a> ⚡️ 32x32-transparent.png
**Example**
```
||example.org^$image,redirect=32x32-transparent.png
```
[Redirect source](../src/redirects/static-redirects.yml)
* * *

### <a id="noopframe"></a> ⚡️ noopframe
**Example**
```
||example.com^$subdocument,redirect=noopframe,domain=example.org
```
[Redirect source](../src/redirects/static-redirects.yml)
* * *

### <a id="noopcss"></a> ⚡️ noopcss
**Example**
```
||example.org/style.css$stylesheet,redirect=noopcss
```
[Redirect source](../src/redirects/static-redirects.yml)
* * *

### <a id="noopjs"></a> ⚡️ noopjs
**Example**
```
||example.org/advert.js$script,redirect=noopjs
```
[Redirect source](../src/redirects/static-redirects.yml)
* * *

### <a id="noopjson"></a> ⚡️ noopjson
**Example**
```
||example.org/geo/location$xmlhttprequest,redirect=noopjson
```
[Redirect source](../src/redirects/static-redirects.yml)
* * *

### <a id="nooptext"></a> ⚡️ nooptext
**Example**
```
||example.org/advert.js$xmlhttprequest,redirect=nooptext
```
[Redirect source](../src/redirects/static-redirects.yml)
* * *

### <a id="empty"></a> ⚡️ empty
Pretty much the same as `nooptext`. Used for conversion of modifier `empty` so better avoid its using in production filter lists.

**Example**
```
||example.org/log$redirect=empty
```
[Redirect source](../src/redirects/static-redirects.yml)
* * *

### <a id="noopvmap-1.0"></a> ⚡️ noopvmap-1.0
Redirects request to an empty VMAP response.

**Example**
```
||example.org/vmap01.xml$xmlhttprequest,redirect=noopvmap-1.0
```
[Redirect source](../src/redirects/static-redirects.yml)
* * *

### <a id="noopvast-2.0"></a> ⚡️ noopvast-2.0
Redirects request to an empty VAST 2.0 response.

**Example**
```
||example.org/vast02.xml^$xmlhttprequest,redirect=noopvast-2.0
```
[Redirect source](../src/redirects/static-redirects.yml)
* * *

### <a id="noopvast-3.0"></a> ⚡️ noopvast-3.0
Redirects request to an empty VAST 3.0 response.

**Example**
```
||example.org/vast03.xml^$xmlhttprequest,redirect=noopvast-3.0
```
[Redirect source](../src/redirects/static-redirects.yml)
* * *

### <a id="noopvast-4.0"></a> ⚡️ noopvast-4.0
Redirects request to an empty VAST 4.0 response.

**Example**
```
||example.org/vast04.xml^$xmlhttprequest,redirect=noopvast-4.0
```
[Redirect source](../src/redirects/static-redirects.yml)
* * *

### <a id="noopmp3-0.1s"></a> ⚡️ noopmp3-0.1s
**Example**
```
||example.org/advert.mp3$media,redirect=noopmp3-0.1s
```
[Redirect source](../src/redirects/static-redirects.yml)
* * *

### <a id="noopmp4-1s"></a> ⚡️ noopmp4-1s
**Example**
```
||example.org/advert.mp4$media,redirect=noopmp4-1s
```
[Redirect source](../src/redirects/static-redirects.yml)
* * *

### <a id="amazon-apstag"></a> ⚡️ amazon-apstag

Mocks Amazon's apstag.js

Related UBO redirect resource:
https://github.com/gorhill/uBlock/blob/f842ab6d3c1cf0394f95d27092bf59627262da40/src/web_accessible_resources/amazon_apstag.js

**Example**
```
||amazon-adsystem.com/aax2/apstag.js$script,redirect=amazon-apstag
```

[Redirect source](../src/redirects/amazon-apstag.js)
* * *

### <a id="ati-smarttag"></a> ⚡️ ati-smarttag

Mocks AT Internat SmartTag.
https://developers.atinternet-solutions.com/as2-tagging-en/javascript-en/getting-started-javascript-en/tracker-initialisation-javascript-en/

**Example**
```
||bloctel.gouv.fr/assets/scripts/smarttag.js$script,redirect=ati-smarttag
```

[Redirect source](../src/redirects/ati-smarttag.js)
* * *

### <a id="didomi-loader"></a> ⚡️ didomi-loader

Mocks Didomi's CMP loader script.
https://developers.didomi.io/

**Example**
```
||sdk.privacy-center.org/fbf86806f86e/loader.js$script,redirect=didomi-loader
```

[Redirect source](../src/redirects/didomi-loader.js)
* * *

### <a id="fingerprintjs2"></a> ⚡️ fingerprintjs2

Mocks FingerprintJS v2
https://github.com/fingerprintjs

Related UBO redirect resource:
https://github.com/gorhill/uBlock/blob/master/src/web_accessible_resources/fingerprint2.js

**Example**
```
||the-japan-news.com/modules/js/lib/fgp/fingerprint2.js$script,redirect=fingerprintjs2
```

[Redirect source](../src/redirects/fingerprintjs2.js)
* * *

### <a id="fingerprintjs3"></a> ⚡️ fingerprintjs3

Mocks FingerprintJS v3
https://github.com/fingerprintjs

Related UBO redirect resource:
https://github.com/gorhill/uBlock/blob/master/src/web_accessible_resources/fingerprint3.js

**Example**
```
||sephora.com/js/ufe/isomorphic/thirdparty/fp.min.js$script,redirect=fingerprintjs3
```

[Redirect source](../src/redirects/fingerprintjs3.js)
* * *

### <a id="gemius"></a> ⚡️ gemius

Mocks Gemius Analytics.
https://flowplayer.com/developers/plugins/gemius

**Example**
```
||gapt.hit.gemius.pl/gplayer.js$script,redirect=gemius
```

[Redirect source](../src/redirects/gemius.js)
* * *

### <a id="google-analytics-ga"></a> ⚡️ google-analytics-ga

Mocks old Google Analytics API.

Related UBO redirect resource:
https://github.com/gorhill/uBlock/blob/a94df7f3b27080ae2dcb3b914ace39c0c294d2f6/src/web_accessible_resources/google-analytics_ga.js

**Example**
```
||google-analytics.com/ga.js$script,redirect=google-analytics-ga
```

[Redirect source](../src/redirects/google-analytics-ga.js)
* * *

### <a id="google-analytics"></a> ⚡️ google-analytics

Mocks Google's Analytics and Tag Manager APIs.
[Covers obsolete googletagmanager-gtm redirect functionality](https://github.com/AdguardTeam/Scriptlets/issues/127).

Related UBO redirect resource:
https://github.com/gorhill/uBlock/blob/8cd2a1d263a96421487b39040c1d23eb01169484/src/web_accessible_resources/google-analytics_analytics.js

**Example**
```
||google-analytics.com/analytics.js$script,redirect=google-analytics
||googletagmanager.com/gtm.js$script,redirect=googletagmanager-gtm
```

[Redirect source](../src/redirects/google-analytics.js)
* * *

### <a id="google-ima3"></a> ⚡️ google-ima3

Mocks the IMA SDK of Google.

**Example**
```
||imasdk.googleapis.com/js/sdkloader/ima3.js$script,redirect=google-ima3
```

[Redirect source](../src/redirects/google-ima3.js)
* * *

### <a id="googlesyndication-adsbygoogle"></a> ⚡️ googlesyndication-adsbygoogle

Mocks Google AdSense API.

Related UBO redirect resource:
https://github.com/gorhill/uBlock/blob/a94df7f3b27080ae2dcb3b914ace39c0c294d2f6/src/web_accessible_resources/googlesyndication_adsbygoogle.js

**Example**
```
||pagead2.googlesyndication.com/pagead/js/adsbygoogle.js$script,redirect=googlesyndication-adsbygoogle
```

[Redirect source](../src/redirects/googlesyndication-adsbygoogle.js)
* * *

### <a id="googletagservices-gpt"></a> ⚡️ googletagservices-gpt

Mocks Google Publisher Tag API.

Related UBO redirect resource:
https://github.com/gorhill/uBlock/blob/a94df7f3b27080ae2dcb3b914ace39c0c294d2f6/src/web_accessible_resources/googletagservices_gpt.js

**Example**
```
||googletagservices.com/tag/js/gpt.js$script,redirect=googletagservices-gpt
```

[Redirect source](../src/redirects/googletagservices-gpt.js)
* * *

### <a id="matomo"></a> ⚡️ matomo

Mocks the piwik.js file of Matomo (formerly Piwik).

**Example**
```
||example.org/piwik.js$script,redirect=matomo
```

[Redirect source](../src/redirects/matomo.js)
* * *

### <a id="metrika-yandex-tag"></a> ⚡️ metrika-yandex-tag

Mocks Yandex Metrika API.
https://yandex.ru/support/metrica/objects/method-reference.html

**Example**
```
||mc.yandex.ru/metrika/tag.js$script,redirect=metrika-yandex-tag
```

[Redirect source](../src/redirects/metrika-yandex-tag.js)
* * *

### <a id="metrika-yandex-watch"></a> ⚡️ metrika-yandex-watch

Mocks the old Yandex Metrika API.
https://yandex.ru/support/metrica/objects/_method-reference.html

**Example**
```
||mc.yandex.ru/metrika/watch.js$script,redirect=metrika-yandex-watch
```

[Redirect source](../src/redirects/metrika-yandex-watch.js)
* * *

### <a id="naver-wcslog"></a> ⚡️ naver-wcslog

Mocks wcslog.js of Naver Analytics.

**Example**
```
||wcs.naver.net/wcslog.js$script,redirect=naver-wcslog
```

[Redirect source](../src/redirects/naver-wcslog.js)
* * *

### <a id="noeval"></a> ⚡️ noeval

Redirects request to the source which sets static properties to PopAds and popns objects.

Prevents page to use eval.
Notifies about attempts in the console

Mostly it is used as `scriptlet`.
See [scriptlet description](../wiki/about-scriptlets.md#noeval).

Related UBO redirect resource:
https://github.com/gorhill/uBlock/wiki/Resources-Library#noeval-silentjs-

**Example**
```
||example.org/index.js$script,redirect=noeval
```

[Redirect source](../src/redirects/noeval.js)
* * *

### <a id="prebid-ads"></a> ⚡️ prebid-ads

Sets predefined constants on a page:
- `canRunAds`: `true`
- `isAdBlockActive`: `false`

**Example**
```
||playerdrive.me/assets/js/prebid-ads.js$script,redirect=prebid-ads
```

[Redirect source](../src/redirects/prebid-ads.js)
* * *

### <a id="prebid"></a> ⚡️ prebid

Mocks the prebid.js header bidding suit.
https://docs.prebid.org/

**Example**
```
||tmgrup.com.tr/bd/hb/prebid.js$script,redirect=prebid
```

[Redirect source](../src/redirects/prebid.js)
* * *

### <a id="prevent-bab"></a> ⚡️ prevent-bab

Prevents BlockAdblock script from detecting an ad blocker.

Mostly it is used as `scriptlet`.
See [scriptlet description](../wiki/about-scriptlets.md#prevent-bab).

Related UBO redirect resource:
https://github.com/gorhill/uBlock/blob/a94df7f3b27080ae2dcb3b914ace39c0c294d2f6/src/web_accessible_resources/nobab.js

**Example**
```
/blockadblock.$script,redirect=prevent-bab
```

[Redirect source](../src/redirects/prevent-bab.js)
* * *

### <a id="prevent-bab2"></a> ⚡️ prevent-bab2

Prevents BlockAdblock script from detecting an ad blocker.

Related UBO redirect:
https://github.com/gorhill/uBlock/blob/master/src/web_accessible_resources/nobab2.js

See [redirect description](../wiki/about-redirects.md#prevent-bab2).

**Syntax**
```
/blockadblock.$script,redirect=prevent-bab2
```

[Redirect source](../src/redirects/prevent-bab2.js)
* * *

### <a id="prevent-fab-3.2.0"></a> ⚡️ prevent-fab-3.2.0

Redirects fuckadblock script to the source js file.

**Example**
```
\*\/fuckadblock-$script,redirect=prevent-fab-3.2.0
```

[Redirect source](../src/redirects/prevent-fab-3.2.0.js)
* * *

### <a id="prevent-popads-net"></a> ⚡️ prevent-popads-net

Redirects request to the source which sets static properties to PopAds and popns objects.

**Example**
```
||popads.net/pop.js$script,redirect=prevent-popads-net
```

[Redirect source](../src/redirects/prevent-popads-net.js)
* * *

### <a id="scorecardresearch-beacon"></a> ⚡️ scorecardresearch-beacon

Mocks Scorecard Research API.

Related UBO redirect resource:
https://github.com/gorhill/uBlock/blob/a94df7f3b27080ae2dcb3b914ace39c0c294d2f6/src/web_accessible_resources/scorecardresearch_beacon.js

**Example**
```
||sb.scorecardresearch.com/beacon.js$script,redirect=scorecardresearch-beacon
```

[Redirect source](../src/redirects/scorecardresearch-beacon.js)
* * *

### <a id="set-popads-dummy"></a> ⚡️ set-popads-dummy

Redirects request to the source which sets static properties to PopAds and popns objects.

**Example**
```
||popads.net^$script,redirect=set-popads-dummy,domain=example.org
```

[Redirect source](../src/redirects/set-popads-dummy.js)
* * *

### <a id="click2load.html"></a> ⚡️ click2load.html
Redirects resource and replaces supposed content by decoy frame with button for original content recovering

Related UBO redirect resource:
https://github.com/gorhill/uBlock/blob/1.31.0/src/web_accessible_resources/click2load.html

**Example**
```
||youtube.com/embed/$frame,third-party,redirect=click2load.html
```
[Redirect source](../src/redirects/blocking-redirects/click2load.html)
* * *

