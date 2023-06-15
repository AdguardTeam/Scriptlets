# <a id="redirect-resources"></a> Available Redirect resources

- [1x1-transparent.gif](#1x1-transparent.gif)
- [2x2-transparent.png](#2x2-transparent.png)
- [3x2-transparent.png](#3x2-transparent.png)
- [32x32-transparent.png](#32x32-transparent.png)
- [noopframe](#noopframe)
- [noopcss](#noopcss)
- [noopjs](#noopjs)
- [noopjson](#noopjson)
- [nooptext](#nooptext)
- [empty](#empty)
- [noopvmap-1.0](#noopvmap-1.0)
- [noopvast-2.0](#noopvast-2.0)
- [noopvast-3.0](#noopvast-3.0)
- [noopvast-4.0](#noopvast-4.0)
- [noopmp3-0.1s](#noopmp3-0.1s)
- [noopmp4-1s](#noopmp4-1s)
- [amazon-apstag](#amazon-apstag)
- [ati-smarttag](#ati-smarttag)
- [didomi-loader](#didomi-loader)
- [fingerprintjs2](#fingerprintjs2)
- [fingerprintjs3](#fingerprintjs3)
- [gemius](#gemius)
- [google-analytics-ga](#google-analytics-ga)
- [google-analytics](#google-analytics)
- [google-ima3](#google-ima3)
- [googlesyndication-adsbygoogle](#googlesyndication-adsbygoogle)
- [googletagservices-gpt](#googletagservices-gpt)
- [matomo](#matomo)
- [metrika-yandex-tag](#metrika-yandex-tag)
- [metrika-yandex-watch](#metrika-yandex-watch)
- [naver-wcslog](#naver-wcslog)
- [noeval](#noeval)
- [pardot-1.0](#pardot-1.0)
- [prebid-ads](#prebid-ads)
- [prebid](#prebid)
- [prevent-bab](#prevent-bab)
- [prevent-bab2](#prevent-bab2)
- [prevent-fab-3.2.0](#prevent-fab-3.2.0)
- [prevent-popads-net](#prevent-popads-net)
- [scorecardresearch-beacon](#scorecardresearch-beacon)
- [set-popads-dummy](#set-popads-dummy)
- [click2load.html](#click2load.html)

* * *

## <a id="1x1-transparent.gif"></a> ⚡️ 1x1-transparent.gif

> Added in v1.0.4.

### Examples

```adblock
||example.org^$image,redirect=1x1-transparent.gif
```

[Redirect source](../src/redirects/static-redirects.yml)

* * *

## <a id="2x2-transparent.png"></a> ⚡️ 2x2-transparent.png

> Added in v1.0.4.

### Examples

```adblock
||example.org^$image,redirect=2x2-transparent.png
```

[Redirect source](../src/redirects/static-redirects.yml)

* * *

## <a id="3x2-transparent.png"></a> ⚡️ 3x2-transparent.png

> Added in v1.0.4.

### Examples

```adblock
||example.org^$image,redirect=3x2-transparent.png
```

[Redirect source](../src/redirects/static-redirects.yml)

* * *

## <a id="32x32-transparent.png"></a> ⚡️ 32x32-transparent.png

> Added in v1.0.4.

### Examples

```adblock
||example.org^$image,redirect=32x32-transparent.png
```

[Redirect source](../src/redirects/static-redirects.yml)

* * *

## <a id="noopframe"></a> ⚡️ noopframe

> Added in v1.0.4.

### Examples

```adblock
||example.com^$subdocument,redirect=noopframe,domain=example.org
```

[Redirect source](../src/redirects/static-redirects.yml)

* * *

## <a id="noopcss"></a> ⚡️ noopcss

> Added in v1.0.4.

### Examples

```adblock
||example.org/style.css$stylesheet,redirect=noopcss
```

[Redirect source](../src/redirects/static-redirects.yml)

* * *

## <a id="noopjs"></a> ⚡️ noopjs

> Added in v1.0.4.

### Examples

```adblock
||example.org/advert.js$script,redirect=noopjs
```

[Redirect source](../src/redirects/static-redirects.yml)

* * *

## <a id="noopjson"></a> ⚡️ noopjson

> Added in v1.6.2.

### Examples

```adblock
||example.org/geo/location$xmlhttprequest,redirect=noopjson
```

[Redirect source](../src/redirects/static-redirects.yml)

* * *

## <a id="nooptext"></a> ⚡️ nooptext

> Added in v1.0.4.

### Examples

```adblock
||example.org/advert.js$xmlhttprequest,redirect=nooptext
```

[Redirect source](../src/redirects/static-redirects.yml)

* * *

## <a id="empty"></a> ⚡️ empty

> Added in v1.3.9.

Pretty much the same as `nooptext`. Used for conversion of modifier `empty`
so better avoid its using in prod versions of filter lists.

### Examples

```adblock
||example.org/log$redirect=empty
```

[Redirect source](../src/redirects/static-redirects.yml)

* * *

## <a id="noopvmap-1.0"></a> ⚡️ noopvmap-1.0

> Added in v1.1.5.

Redirects request to an empty VMAP response.

### Examples

```adblock
||example.org/vmap01.xml$xmlhttprequest,redirect=noopvmap-1.0
```

[Redirect source](../src/redirects/static-redirects.yml)

* * *

## <a id="noopvast-2.0"></a> ⚡️ noopvast-2.0

> Added in v1.0.10.

Redirects request to an empty VAST 2.0 response.

### Examples

```adblock
||example.org/vast02.xml^$xmlhttprequest,redirect=noopvast-2.0
```

[Redirect source](../src/redirects/static-redirects.yml)

* * *

## <a id="noopvast-3.0"></a> ⚡️ noopvast-3.0

> Added in v1.0.10.

Redirects request to an empty VAST 3.0 response.

### Examples

```adblock
||example.org/vast03.xml^$xmlhttprequest,redirect=noopvast-3.0
```

[Redirect source](../src/redirects/static-redirects.yml)

* * *

## <a id="noopvast-4.0"></a> ⚡️ noopvast-4.0

> Added in v1.4.3.

Redirects request to an empty VAST 4.0 response.

### Examples

```adblock
||example.org/vast04.xml^$xmlhttprequest,redirect=noopvast-4.0
```

[Redirect source](../src/redirects/static-redirects.yml)

* * *

## <a id="noopmp3-0.1s"></a> ⚡️ noopmp3-0.1s

> Added in v1.0.4.

### Examples

```adblock
||example.org/advert.mp3$media,redirect=noopmp3-0.1s
```

[Redirect source](../src/redirects/static-redirects.yml)

* * *

## <a id="noopmp4-1s"></a> ⚡️ noopmp4-1s

> Added in v1.0.4.

### Examples

```adblock
||example.org/advert.mp4$media,redirect=noopmp4-1s
```

[Redirect source](../src/redirects/static-redirects.yml)

* * *

## <a id="amazon-apstag"></a> ⚡️ amazon-apstag

> Added in v1.2.3.

Mocks Amazon's apstag.js

Related UBO redirect resource:
https://github.com/gorhill/uBlock/blob/master/src/web_accessible_resources/amazon_apstag.js

### Examples

```adblock
||amazon-adsystem.com/aax2/apstag.js$script,redirect=amazon-apstag
```

[Redirect source](../src/redirects/amazon-apstag.js)

* * *

## <a id="ati-smarttag"></a> ⚡️ ati-smarttag

> Added in v1.5.0.

Mocks AT Internat SmartTag.
https://developers.atinternet-solutions.com/as2-tagging-en/javascript-en/getting-started-javascript-en/tracker-initialisation-javascript-en/

### Examples

```adblock
||example.com/assets/scripts/smarttag.js$script,redirect=ati-smarttag
```

[Redirect source](../src/redirects/ati-smarttag.js)

* * *

## <a id="didomi-loader"></a> ⚡️ didomi-loader

> Added in v1.6.2.

Mocks Didomi's CMP loader script.
https://developers.didomi.io/

### Examples

```adblock
||sdk.privacy-center.org/fbf86806f86e/loader.js$script,redirect=didomi-loader
```

[Redirect source](../src/redirects/didomi-loader.js)

* * *

## <a id="fingerprintjs2"></a> ⚡️ fingerprintjs2

> Added in v1.5.0.

Mocks FingerprintJS v2
https://github.com/fingerprintjs

Related UBO redirect resource:
https://github.com/gorhill/uBlock/blob/master/src/web_accessible_resources/fingerprint2.js

### Examples

```adblock
||example.com/modules/js/lib/fgp/fingerprint2.js$script,redirect=fingerprintjs2
```

[Redirect source](../src/redirects/fingerprintjs2.js)

* * *

## <a id="fingerprintjs3"></a> ⚡️ fingerprintjs3

> Added in v1.6.2.

Mocks FingerprintJS v3
https://github.com/fingerprintjs

Related UBO redirect resource:
https://github.com/gorhill/uBlock/blob/master/src/web_accessible_resources/fingerprint3.js

### Examples

```adblock
||example.com/js/ufe/isomorphic/thirdparty/fp.min.js$script,redirect=fingerprintjs3
```

[Redirect source](../src/redirects/fingerprintjs3.js)

* * *

## <a id="gemius"></a> ⚡️ gemius

> Added in v1.5.0.

Mocks Gemius Analytics.
https://flowplayer.com/developers/plugins/gemius

### Examples

```adblock
||example.org/gplayer.js$script,redirect=gemius
```

[Redirect source](../src/redirects/gemius.js)

* * *

## <a id="google-analytics-ga"></a> ⚡️ google-analytics-ga

> Added in v1.0.10.

Mocks old Google Analytics API.

Related UBO redirect resource:
https://github.com/gorhill/uBlock/blob/master/src/web_accessible_resources/google-analytics_ga.js

### Examples

```adblock
||google-analytics.com/ga.js$script,redirect=google-analytics-ga
```

[Redirect source](../src/redirects/google-analytics-ga.js)

* * *

## <a id="google-analytics"></a> ⚡️ google-analytics

> Added in v1.0.10.

Mocks Google's Analytics and Tag Manager APIs.
Covers functionality of
the [obsolete googletagmanager-gtm redirect](https://github.com/AdguardTeam/Scriptlets/issues/127).

Related UBO redirect resource:
https://github.com/gorhill/uBlock/blob/master/src/web_accessible_resources/google-analytics_analytics.js

### Examples

```adblock
||google-analytics.com/analytics.js$script,redirect=google-analytics
||googletagmanager.com/gtm.js$script,redirect=google-analytics
```

[Redirect source](../src/redirects/google-analytics.js)

* * *

## <a id="google-ima3"></a> ⚡️ google-ima3

> Added in v1.6.2.

Mocks the IMA SDK of Google.

Related Mozilla shim:
https://searchfox.org/mozilla-central/source/browser/extensions/webcompat/shims/google-ima.js

### Examples

```adblock
||imasdk.googleapis.com/js/sdkloader/ima3.js$script,redirect=google-ima3
```

[Redirect source](../src/redirects/google-ima3.js)

* * *

## <a id="googlesyndication-adsbygoogle"></a> ⚡️ googlesyndication-adsbygoogle

> Added in v1.0.10.

Mocks Google AdSense API.

Related UBO redirect resource:
https://github.com/gorhill/uBlock/blob/master/src/web_accessible_resources/googlesyndication_adsbygoogle.js

### Examples

```adblock
||pagead2.googlesyndication.com/pagead/js/adsbygoogle.js$script,redirect=googlesyndication-adsbygoogle
```

[Redirect source](../src/redirects/googlesyndication-adsbygoogle.js)

* * *

## <a id="googletagservices-gpt"></a> ⚡️ googletagservices-gpt

> Added in v1.0.10.

Mocks Google Publisher Tag API.

Related UBO redirect resource:
https://github.com/gorhill/uBlock/blob/master/src/web_accessible_resources/googletagservices_gpt.js

### Examples

```adblock
||googletagservices.com/tag/js/gpt.js$script,redirect=googletagservices-gpt
```

[Redirect source](../src/redirects/googletagservices-gpt.js)

* * *

## <a id="matomo"></a> ⚡️ matomo

> Added in v1.5.0.

Mocks the piwik.js file of Matomo (formerly Piwik).

### Examples

```adblock
||example.org/piwik.js$script,redirect=matomo
```

[Redirect source](../src/redirects/matomo.js)

* * *

## <a id="metrika-yandex-tag"></a> ⚡️ metrika-yandex-tag

> Added in v1.0.10.

Mocks Yandex Metrika API.
https://yandex.ru/support/metrica/objects/method-reference.html

### Examples

```adblock
||mc.yandex.ru/metrika/tag.js$script,redirect=metrika-yandex-tag
```

[Redirect source](../src/redirects/metrika-yandex-tag.js)

* * *

## <a id="metrika-yandex-watch"></a> ⚡️ metrika-yandex-watch

> Added in v1.0.10.

Mocks the old Yandex Metrika API.
https://yandex.ru/support/metrica/objects/_method-reference.html

### Examples

```adblock
||mc.yandex.ru/metrika/watch.js$script,redirect=metrika-yandex-watch
```

[Redirect source](../src/redirects/metrika-yandex-watch.js)

* * *

## <a id="naver-wcslog"></a> ⚡️ naver-wcslog

> Added in v1.6.2.

Mocks wcslog.js of Naver Analytics.

### Examples

```adblock
||wcs.naver.net/wcslog.js$script,redirect=naver-wcslog
```

[Redirect source](../src/redirects/naver-wcslog.js)

* * *

## <a id="noeval"></a> ⚡️ noeval

> Added in v1.0.4.

Redirects request to the source which sets static properties to PopAds and popns objects.

Prevents page to use eval.
Notifies about attempts in the console

Mostly it is used as `scriptlet`.
See [scriptlet description](../wiki/about-scriptlets.md#noeval).

Related UBO redirect resource:
https://github.com/gorhill/uBlock/wiki/Resources-Library#noeval-silentjs-

### Examples

```adblock
||example.org/index.js$script,redirect=noeval
```

[Redirect source](../src/redirects/noeval.js)

* * *

## <a id="pardot-1.0"></a> ⚡️ pardot-1.0

> Added in v1.6.55.

Mocks the pd.js file of Salesforce.
https://pi.pardot.com/pd.js
https://developer.salesforce.com/docs/marketing/pardot/overview

### Examples

```adblock
||pi.pardot.com/pd.js$script,redirect=pardot
||pacedg.com.au/pd.js$redirect=pardot
```

[Redirect source](../src/redirects/pardot-1.0.js)

* * *

## <a id="prebid-ads"></a> ⚡️ prebid-ads

> Added in v1.6.2.

Sets predefined constants on a page:

- `canRunAds`: `true`
- `isAdBlockActive`: `false`

### Examples

```adblock
||example.org/assets/js/prebid-ads.js$script,redirect=prebid-ads
```

[Redirect source](../src/redirects/prebid-ads.js)

* * *

## <a id="prebid"></a> ⚡️ prebid

> Added in v1.6.2.

Mocks the prebid.js header bidding suit.
https://docs.prebid.org/

### Examples

```adblock
||example.org/bd/hb/prebid.js$script,redirect=prebid
```

[Redirect source](../src/redirects/prebid.js)

* * *

## <a id="prevent-bab"></a> ⚡️ prevent-bab

> Added in v1.3.19.

Prevents BlockAdblock script from detecting an ad blocker.

Mostly it is used as `scriptlet`.
See [scriptlet description](../wiki/about-scriptlets.md#prevent-bab).

Related UBO redirect resource:
https://github.com/gorhill/uBlock/blob/master/src/web_accessible_resources/nobab.js

### Examples

```adblock
/blockadblock.$script,redirect=prevent-bab
```

[Redirect source](../src/redirects/prevent-bab.js)

* * *

## <a id="prevent-bab2"></a> ⚡️ prevent-bab2

> Added in v1.5.0.

Prevents BlockAdblock script from detecting an ad blocker.

Related UBO redirect:
https://github.com/gorhill/uBlock/blob/master/src/web_accessible_resources/nobab2.js

See [redirect description](../wiki/about-redirects.md#prevent-bab2).

### Examples

```adblock
/blockadblock.$script,redirect=prevent-bab2
```

[Redirect source](../src/redirects/prevent-bab2.js)

* * *

## <a id="prevent-fab-3.2.0"></a> ⚡️ prevent-fab-3.2.0

> Added in v1.0.4.

Redirects fuckadblock script to the source js file.

### Examples

```adblock
\*\/fuckadblock-$script,redirect=prevent-fab-3.2.0
```

[Redirect source](../src/redirects/prevent-fab-3.2.0.js)

* * *

## <a id="prevent-popads-net"></a> ⚡️ prevent-popads-net

> Added in v1.0.4.

Redirects request to the source which sets static properties to PopAds and popns objects.

### Examples

```adblock
||popads.net/pop.js$script,redirect=prevent-popads-net
```

[Redirect source](../src/redirects/prevent-popads-net.js)

* * *

## <a id="scorecardresearch-beacon"></a> ⚡️ scorecardresearch-beacon

> Added in v1.0.10.

Mocks Scorecard Research API.

Related UBO redirect resource:
https://github.com/gorhill/uBlock/blob/master/src/web_accessible_resources/scorecardresearch_beacon.js

### Examples

```adblock
||sb.scorecardresearch.com/beacon.js$script,redirect=scorecardresearch-beacon
```

[Redirect source](../src/redirects/scorecardresearch-beacon.js)

* * *

## <a id="set-popads-dummy"></a> ⚡️ set-popads-dummy

> Added in v1.0.4.

Redirects request to the source which sets static properties to PopAds and popns objects.

### Examples

```adblock
||popads.net^$script,redirect=set-popads-dummy,domain=example.org
```

[Redirect source](../src/redirects/set-popads-dummy.js)

* * *

## <a id="click2load.html"></a> ⚡️ click2load.html

> Added in v1.5.0.

Redirects resource and replaces supposed content by decoy frame with button for original content recovering

Related UBO redirect resource:
https://github.com/gorhill/uBlock/blob/1.31.0/src/web_accessible_resources/click2load.html

### Example

```adblock
||youtube.com/embed/$frame,third-party,redirect=click2load.html
```

[Redirect source](../src/redirects/blocking-redirects/click2load.html)

* * *

