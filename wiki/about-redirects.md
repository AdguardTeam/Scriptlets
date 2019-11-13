# <a id="redirect-resources"></a> AdGuard Redirect resources

AdGuard is able to redirect web requests to a local "resource".


* **[Syntax](#syntax)**
* **[Available redirects](#available-redirects)**
    * [1x1-transparent.gif](#1x1-transparent)
    * [2x2-transparent.png](#2x2-transparent)
    * [3x2-transparent.png](#3x2-transparent)
    * [32x32-transparent.png](#32x32-transparent)
    * [noopframe](#noopframe)
    * [noopcss](#noopcss)
    * [noopjs](#noopcss)
    * [nooptext](#nooptext)
    * [noopvast-2.0](#noopvast-2-0)
    * [noopvast-3.0](#noopvast-3-0)
    * [noopmp3-0.1s](#noopmp3-01s)
    * [noopmp4-1s](#noopmp4-1s)
    * [google-analytics-ga](#google-analytics-ga-redirect)
    * [google-analytics](#google-analytics-redirect)
    * [googlesyndication-adsbygoogle](#googlesyndication-adsbygoogle-redirect)
    * [googletagmanager-gtm](#googletagmanager-gtm-redirect)
    * [googletagservices-gpt](#googletagservices-gpt-redirect)
    * [metrika-yandex-tag](#metrika-yandex-tag-redirect)
    * [metrika-yandex-watch](#metrika-yandex-watch-redirect)
    * [noeval.js](#noeval.js)
    * [prevent-fab-3.2.0](#prevent-fab-3.2.0-redirect)
    * [prevent-popads-net](#prevent-popads-net-redirect)
    * [scorecardresearch-beacon](#scorecardresearch-beacon-redirect)
    * [set-popads-dummy](#set-popads-dummy-redirect)

* **[Redirects compatibility table](./wiki/compatibility-table.md#scriptlets)**
* * *

### <a id="redirect-syntax"></a> Syntax

AdGuard uses the same filtering syntax as [uBlock Origin](https://github.com/gorhill/uBlock/wiki/Static-filter-syntax#redirect). Also, it is compatible with ABP `$rewrite` modifier.

`$redirect` is a modifier for the [basic filtering rules](https://kb.adguard.com/en/general/how-to-create-your-own-ad-filters#basic-rules-syntax) so rules with this modifier support all other basic modifiers like `$domain`, `$third-party`, `$script`, etc.

The value of the `$redirect` modifier must be the name of the resource, that will be used for redirection. See the list of resources [below](#available-resources).

**Examples**
* `||example.org/script.js$script,redirect=noopjs` -- redirects all requests to `script.js` to the resource named `noopjs`.
* `||example.org/test.mp4$media,redirect=noopmp4-1s` -- redirects all requests to `test.mp4` to the resource named `noopmp4-1s`.

> `$redirect` rules priority is higher than the regular basic blocking rules' priority. This means that if there's a basic blocking rule (even with `$important` modifier), `$redirect` rule will prevail over it. If there's a whitelist (`@@`) rule matching the same URL, it will disable redirecting as well (unless the `$redirect` rule is also marked as `$important`).

> uBlock Origin specifies additional resource name `none` that can disable other redirect rules. AdGuard does not support it, use `$badfilter` to disable specific rules.

## <a id="available-redirects"></a> Available redirect resources

### <a id="1x1-transparent"></a> ⚡️ 1x1-transparent.gif

**Example**
```
||example.org^$image,redirect=1x1-transparent.gif
```
[Redirect source](./src/redirects/static-redirects.yml)
* * *

### <a id="2x2-transparent"></a> ⚡️ 2x2-transparent.png

**Example**
```
||example.org^$image,redirect=2x2-transparent.png
```
[Redirect source](./src/redirects/static-redirects.yml)
* * *

### <a id="3x2-transparent"></a> ⚡️ 3x2-transparent.png

**Example**
```
||example.org^$image,redirect=3x2-transparent.png
```
[Redirect source](./src/redirects/static-redirects.yml)
* * *

### <a id="32x32-transparent"></a> ⚡️ 32x32-transparent.png

**Example**
```
||example.org^$image,redirect=32x32-transparent.png
```
[Redirect source](./src/redirects/static-redirects.yml)
* * *

### <a id="noopframe"></a> ⚡️ noopframe

**Example**
```
||example.com^$subdocument,redirect=noopframe,domain=example.org
```
[Redirect source](./src/redirects/static-redirects.yml)
* * *

### <a id="noopcss"></a> ⚡️ noopcss

**Example**
```
||example.org^$stylesheet,redirect=noopcss
```
[Redirect source](./src/redirects/static-redirects.yml)
* * *

### <a id="noopjs"></a> ⚡️ noopjs

**Example**
```
||example.org^$script,redirect=noopjs
```
[Redirect source](./src/redirects/static-redirects.yml)
* * *

### <a id="nooptext"></a> ⚡️ nooptext

**Example**
```
||example.org^$xmlhttprequest,redirect=nooptext
```
[Redirect source](./src/redirects/static-redirects.yml)
* * *

### <a id="noopvast-2-0"></a> ⚡️ noopvast-2.0

Redirects request to an empty [VAST](https://en.wikipedia.org/wiki/Video_Ad_Serving_Template) response.

**Example**
```
||example.org^$xmlhttprequest,redirect=noopvast-2.0
```
[Redirect source](./src/redirects/static-redirects.yml)
* * *

### <a id="noopvast-3-0"></a> ⚡️ noopvast-3.0

Redirects request to an empty [VAST](https://en.wikipedia.org/wiki/Video_Ad_Serving_Template) response.

**Example**
```
||example.org^$xmlhttprequest,redirect=noopvast-3.0
```
[Redirect source](./src/redirects/static-redirects.yml)
* * *

### <a id="noopmp3-01s"></a> ⚡️ noopmp3-0.1s

**Example**
```
||example.org^$media,redirect=noopmp3-0.1s
```
[Redirect source](./src/redirects/static-redirects.yml)
* * *

### <a id="noopmp4-1s"></a> ⚡️ noopmp4-1s

**Example**
```
||example.org^$media,redirect=noopmp4-1s
```
[Redirect source](./src/redirects/static-redirects.yml)
* * *

### <a id="google-analytics-ga-redirect"></a> ⚡️ google-analytics-ga

Mocks old Google Analytics API.

**Example**
```
||example.org/index.js$script,redirect=google-analytics-ga
```
[Redirect source](/Volumes/dev/scriptlets/src/scriptlets/google-analytics-ga.js)
* * *

### <a id="google-analytics-redirect"></a> ⚡️ google-analytics

Mocks Google Analytics API.

**Example**
```
||example.org/index.js$script,redirect=google-analytics
```
[Redirect source](/Volumes/dev/scriptlets/src/scriptlets/google-analytics.js)
* * *

### <a id="googlesyndication-adsbygoogle-redirect"></a> ⚡️ googlesyndication-adsbygoogle

Mocks Google AdSense API.

**Example**
```
||example.org/index.js$script,redirect=googlesyndication-adsbygoogle
```
[Redirect source](/Volumes/dev/scriptlets/src/scriptlets/googlesyndication-adsbygoogle.js)
* * *

### <a id="googletagmanager-gtm-redirect"></a> ⚡️ googletagmanager-gtm

Mocks Google Tag Manager API.

**Example**
```
||example.org/index.js$script,redirect=googletagmanager-gtm
```
[Redirect source](/Volumes/dev/scriptlets/src/scriptlets/googletagmanager-gtm.js)
* * *

### <a id="googletagservices-gpt-redirect"></a> ⚡️ googletagservices-gpt

Mocks Google Publisher Tag API.

**Example**
```
||example.org/index.js$script,redirect=googletagservices-gpt
```
[Redirect source](/Volumes/dev/scriptlets/src/scriptlets/googletagservices-gpt.js)
* * *

### <a id="metrika-yandex-tag-redirect"></a> ⚡️ metrika-yandex-tag

Mocks Yandex Metrika API.
https://yandex.ru/support/metrica/objects/method-reference.html

**Example**
```
||example.org/index.js$script,redirect=metrika-yandex-watch
```
[Redirect source](/Volumes/dev/scriptlets/src/scriptlets/metrika-yandex-tag.js)
* * *

### <a id="metrika-yandex-watch-redirect"></a> ⚡️ metrika-yandex-watch

Mocks the old Yandex Metrika API.
https://yandex.ru/support/metrica/objects/_method-reference.html

**Example**
```
||example.org/index.js$script,redirect=metrika-yandex-watch
```
[Redirect source](/Volumes/dev/scriptlets/src/scriptlets/metrika-yandex-watch.js)
* * *

### <a id="noeval.js"></a> ⚡️ noeval.js

Redirects request to the source which sets static properties to PopAds and popns objects

Prevents page to use eval.
Notifies about attempts in the console

Related UBO scriptlets:
https://github.com/gorhill/uBlock/wiki/Resources-Library#noevaljs-
https://github.com/gorhill/uBlock/wiki/Resources-Library#silent-noevaljs-

**Example**
```
||example.org/index.js$script,redirect=noeval.js
```
[Redirect source](/Volumes/dev/scriptlets/src/scriptlets/noeval.js)
* * *

### <a id="prevent-fab-3.2.0-redirect"></a> ⚡️ prevent-fab-3.2.0

Redirects fuckadblock script to the source js file

**Example**
```
\*\/fuckadblock-$script,redirect=prevent-fab-3.2.0
```
[Redirect source](/Volumes/dev/scriptlets/src/scriptlets/prevent-fab-3.2.0.js)
* * *

### <a id="prevent-popads-net-redirect"></a> ⚡️ prevent-popads-net

Redirects request to the source which sets static properties to PopAds and popns objects

**Example**
```
||popads.net/pop.js$script,redirect=prevent-popads-net
```
[Redirect source](/Volumes/dev/scriptlets/src/scriptlets/prevent-popads-net.js)
* * *

### <a id="scorecardresearch-beacon-redirect"></a> ⚡️ scorecardresearch-beacon

Mocks Scorecard Research API.

**Example**
```
||example.org/index.js$script,redirect=scorecardresearch-beacon
```
[Redirect source](/Volumes/dev/scriptlets/src/scriptlets/scorecardresearch-beacon.js)
* * *

### <a id="set-popads-dummy-redirect"></a> ⚡️ set-popads-dummy

Redirects request to the source which sets static properties to PopAds and popns objectss

**Example**
```
||popads.net^$script,redirect=set-popads-dummy,domain=example.org
```
[Redirect source](/Volumes/dev/scriptlets/src/scriptlets/set-popads-dummy.js)
* * *

