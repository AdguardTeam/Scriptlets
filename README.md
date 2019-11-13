# AdGuard Scriptlets and Resources
[![Build Status](https://travis-ci.org/AdguardTeam/Scriptlets.svg?branch=master)](https://travis-ci.org/AdguardTeam/Scriptlets)

* [Scriptlets](#scriptlets)
    * [Syntax](#syntax)
    * [Available scriptlets](#available-scriptlets)
        * [abort-current-inline-script](#abort-current-inline-script)
        * [abort-on-property-read](#abort-on-property-read)
        * [abort-on-property-write](#abort-on-property-write)
        * [adjust-setInterval](#adjust-setInterval)
        * [adjust-setTimeout](#adjust-setTimeout)
        * [debug-current-inline-script](#debug-current-inline-script)
        * [debug-on-property-read](#debug-on-property-read)
        * [debug-on-property-write](#debug-on-property-write)
        * [dir-string](#dir-string)
        * [disable-newtab-links](#disable-newtab-links)
        * [google-analytics-ga](#google-analytics-ga-scriptlet)
        * [google-analytics](#google-analytics-scriptlet)
        * [googlesyndication-adsbygoogle](#googlesyndication-adsbygoogle-scriptlet)
        * [googletagmanager-gtm](#googletagmanager-gtm-scriptlet)
        * [googletagservices-gpt](#googletagservices-gpt-scriptlet)
        * [json-prune](#json-prune)
        * [log-addEventListener](#log-addEventListener)
        * [log-eval](#log-eval)
        * [log-setInterval](#log-setInterval)
        * [log-setTimeout](#log-setTimeout)
        * [log](#log)
        * [metrika-yandex-tag](#metrika-yandex-tag-scriptlet)
        * [metrika-yandex-watch](#metrika-yandex-watch-scriptlet)
        * [nowebrtc](#nowebrtc)
        * [prevent-addEventListener](#prevent-addEventListener)
        * [prevent-adfly](#prevent-adfly)
        * [prevent-bab](#prevent-bab)
        * [prevent-eval-if](#prevent-eval-if)
        * [prevent-fab-3.2.0](#prevent-fab-3.2.0-scriptlet)
        * [prevent-popads-net](#prevent-popads-net-scriptlet)
        * [prevent-setInterval](#prevent-setInterval)
        * [prevent-setTimeout](#prevent-setTimeout)
        * [prevent-window-open](#prevent-window-open)
        * [remove-attr](#remove-attr)
        * [remove-cookie](#remove-cookie)
        * [scorecardresearch-beacon](#scorecardresearch-beacon-scriptlet)
        * [set-constant](#set-constant)
        * [set-popads-dummy](#set-popads-dummy-scriptlet)

    * [Scriptlets compatibility table](./wiki/compatibility-table.md#scriptlets)
* [Redirect resources](#redirect-resources)
    * [Syntax](#redirect-syntax)
    * [Available redirect resources](#available-resources)
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

    * [Redirect resources compatibility table](./wiki/compatibility-table.md#redirects)
* [How to build](#how-to-build)
* [Browser compatibility](#browser-compatibility)

## <a id="scriptlets"></a> Scriptlets

Scriptlet is a JavaScript function that provides extended capabilities for content blocking. These functions can be used in a declarative manner in AdGuard filtering rules.

### <a id="syntax"></a> Syntax

```
rule = [domains]  "#%#//scriptlet(" scriptletName arguments ")"
```

* `scriptletName` (mandatory) is a name of the scriptlet from AdGuard's scriptlets library
* `arguments` (optional) a list of `String` arguments (no other types of arguments are supported)

> **Remarks**
> * The meanining of the arguments depends on the scriptlet.
> * You can use either single or double quotes for the scriptlet name and arguments.
> * Special characters must be escaped properly:
>     * `"prop[\"nested\"]"` - valid
>     * `"prop['nested']"` - also valid
>     * `"prop["nested"]"` - not valid

#### Example

```
example.org#%#//scriptlet("abort-on-property-read", "alert")
```

This rule applies the `abort-on-property-read` scriptlet on all pages of `example.org` and its subdomains, and passes one orgument to it (`alert`).

## <a id="available-scriptlets"></a> Available scriptlets

This is a list of scriptlets supported by AdGuard. Please note, that in order to achieve cross-blocker compatibility, we also support syntax of uBO and ABP. You can check out the [compatibility table](./wiki/compatibility-table.md).

### <a id="abort-current-inline-script"></a> ⚡️ abort-current-inline-script

Aborts an inline script when it attempts to **read** the specified property
AND when the contents of the `<script>` element contains the specified
text or matches the regular expression.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#abort-current-inline-scriptjs-

Related ABP source:
https://github.com/adblockplus/adblockpluscore/blob/6b2a309054cc23432102b85d13f12559639ef495/lib/content/snippets.js#L928

**Syntax**
```
example.org#%#//scriptlet("abort-current-inline-script", <property> [, <search>])
```

**Parameters**
- `property` (required) path to a property (joined with `.` if needed). The property must be attached to `window`.
- `search` (optional) string or regular expression that must match the inline script contents. If not set, abort all inline scripts which are trying to access the specified property.

**Examples**
1. Aborts all inline scripts trying to access `window.alert`
    ```
    example.org#%#//scriptlet("abort-current-inline-script", "alert")
    ```

2. Aborts inline scripts which are trying to access `window.alert` and contain `Hello, world`.
    ```
    example.org#%#//scriptlet("abort-current-inline-script", "alert", "Hello, world")
    ```

    For instance, the following script will be aborted
    ```html
    <script>alert("Hello, world");</script>
    ```

3. Aborts inline scripts which are trying to access `window.alert` and match this regexp: `/Hello.+world/`.
    ```
    example.org#%#//scriptlet("abort-current-inline-script", "alert", "/Hello.+world/")
    ```

    For instance, the following scripts will be aborted:
    ```html
    <script>alert("Hello, big world");</script>
    ```
    ```html
    <script>alert("Hello, little world");</script>
    ```

    This script will not be aborted:
    ```html
    <script>alert("Hi, little world");</script>
    ```
[Scriptlet source](/Volumes/dev/scriptlets/src/scriptlets/abort-current-inline-script.js)
* * *

### <a id="abort-on-property-read"></a> ⚡️ abort-on-property-read

Aborts a script when it attempts to **read** the specified property.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#abort-on-property-readjs-

Related ABP source:
https://github.com/adblockplus/adblockpluscore/blob/6b2a309054cc23432102b85d13f12559639ef495/lib/content/snippets.js#L864

**Syntax**
```
example.org#%#//scriptlet("abort-on-property-read", <property>)
```

**Parameters**
- `property` (required) path to a property (joined with `.` if needed). The property must be attached to `window`.

**Examples**
```
! Aborts script when it tries to access `window.alert`
example.org#%#//scriptlet("abort-on-property-read", "alert")

! Aborts script when it tries to access `navigator.language`
example.org#%#//scriptlet("abort-on-property-read", "navigator.language")
```
[Scriptlet source](/Volumes/dev/scriptlets/src/scriptlets/abort-on-property-read.js)
* * *

### <a id="abort-on-property-write"></a> ⚡️ abort-on-property-write

Aborts a script when it attempts to **write** the specified property.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#abort-on-property-writejs-

Related ABP source:
https://github.com/adblockplus/adblockpluscore/blob/6b2a309054cc23432102b85d13f12559639ef495/lib/content/snippets.js#L896

**Syntax**
```
example.org#%#//scriptlet("abort-on-property-write", <property>)
```

**Parameters**
- `property` (required) path to a property (joined with `.` if needed). The property must be attached to `window`.

**Examples**
```
! Aborts all inline scripts trying to access `window.alert`
utils.escape('<script></script>')
// => '&lt;script&gt;&lt;/script&gt;'
```
[Scriptlet source](/Volumes/dev/scriptlets/src/scriptlets/abort-on-property-write.js)
* * *

### <a id="adjust-setInterval"></a> ⚡️ adjust-setInterval

Adjusts interval for specified setInterval() callbacks.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#nano-setinterval-boosterjs-

**Syntax**
```
example.org#%#//scriptlet("adjust-setInterval"[, match [, interval[, boost]]])
```

- `match` - optional, string/regular expression, matching in stringified callback function
- `interval` - optional, defaults to 1000, decimal integer, matching interval
- `boost` - optional, default to 0.05, float, capped at 50 times for up and down, interval multiplier

**Examples**
1. Adjust all setInterval() x20 times where interval equal 1000ms:
    ```
    example.org#%#//scriptlet("adjust-setInterval")
    ```

2. Adjust all setInterval() x20 times where callback mathed with `example` and interval equal 1000ms
    ```
    example.org#%#//scriptlet("adjust-setInterval", "example")
    ```

3. Adjust all setInterval() x20 times where callback mathed with `example` and interval equal 400ms
    ```
    example.org#%#//scriptlet("adjust-setInterval", "example", "400")
    ```

4. Slow down setInterval() x2 times where callback matched with `example` and interval equal 400ms
    ```
    example.org#%#//scriptlet("adjust-setInterval", "example", "400", "2")
    ```
[Scriptlet source](/Volumes/dev/scriptlets/src/scriptlets/adjust-setInterval.js)
* * *

### <a id="adjust-setTimeout"></a> ⚡️ adjust-setTimeout

Adjusts timeout for specified setTimout() callbacks.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#nano-settimeout-boosterjs-

**Syntax**
```
example.org#%#//scriptlet("adjust-setTimeout"[, match [, timeout[, boost]]])
```

- `match` - optional, string/regular expression, matching in stringified callback function
- `timeout` - optional, defaults to 1000, decimal integer, matching interval
- `boost` - optional, default to 0.05, float, capped at 50 times for up and down, interval multiplier

**Examples**
1. Adjust all setTimeout() x20 times where interval equal 1000ms:
    ```
    example.org#%#//scriptlet("adjust-setTimeout")
    ```

2. Adjust all setTimeout() x20 times where callback mathed with `example` and interval equal 1000ms
    ```
    example.org#%#//scriptlet("adjust-setTimeout", "example")
    ```

3. Adjust all setTimeout() x20 times where callback mathed with `example` and interval equal 400ms
    ```
    example.org#%#//scriptlet("adjust-setTimeout", "example", "400")
    ```

4. Slow down setTimeout() x2 times where callback matched with `example` and interval equal 400ms
    ```
    example.org#%#//scriptlet("adjust-setTimeout", "example", "400", "2")
    ```
[Scriptlet source](/Volumes/dev/scriptlets/src/scriptlets/adjust-setTimeout.js)
* * *

### <a id="debug-current-inline-script"></a> ⚡️ debug-current-inline-script

This scriptlet is basically the same as [abort-current-inline-script](#abort-current-inline-script), but instead of aborting it starts the debugger.

**It is not supposed to be used in production filter lists!**

**Syntax**
```
! Aborts script when it tries to access `window.alert`
example.org#%#//scriptlet("debug-current-inline-script", "alert")
```
[Scriptlet source](/Volumes/dev/scriptlets/src/scriptlets/debug-current-inline-script.js)
* * *

### <a id="debug-on-property-read"></a> ⚡️ debug-on-property-read

This scriptlet is basically the same as [abort-on-property-read](#abort-on-property-read), but instead of aborting it starts the debugger.

**It is not supposed to be used in production filter lists!**

**Syntax**
```
! Aborts script when it tries to access `window.alert`
example.org#%#//scriptlet("debug-on-property-read", "alert")
```
[Scriptlet source](/Volumes/dev/scriptlets/src/scriptlets/debug-on-property-read.js)
* * *

### <a id="debug-on-property-write"></a> ⚡️ debug-on-property-write

This scriptlet is basically the same as [abort-on-property-write](#abort-on-property-write), but instead of aborting it starts the debugger.

**It is not supposed to be used in production filter lists!**

**Syntax**
```
! Aborts script when it tries to write in property `window.test`
example.org#%#//scriptlet("debug-on-property-write", "test")
```
[Scriptlet source](/Volumes/dev/scriptlets/src/scriptlets/debug-on-property-write.js)
* * *

### <a id="dir-string"></a> ⚡️ dir-string

Wraps the `console.dir` API to call the `toString` method of the argument.
There are several adblock circumvention systems that detect browser devtools and hide themselves. Therefore, if we force them to think that devtools are open (using this scrciptlet), it will automatically disable the adblock circumvention script.

Related ABP source:
https://github.com/adblockplus/adblockpluscore/blob/6b2a309054cc23432102b85d13f12559639ef495/lib/content/snippets.js#L766

**Syntax**
```
example.org#%#//scriptlet("dir-string"[, times])
```
- `times` - optional, the number of times to call the `toString` method of the argument to `console.dir`

**Example**
```
! Run 2 times
example.org#%#//scriptlet("dir-string", "2")
```
[Scriptlet source](/Volumes/dev/scriptlets/src/scriptlets/dir-string.js)
* * *

### <a id="disable-newtab-links"></a> ⚡️ disable-newtab-links

Prevents opening new tabs and windows if there is `target` attribute in element.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#disable-newtab-linksjs-

**Syntax**
```
example.org#%#//scriptlet("disable-newtab-links")
```
[Scriptlet source](/Volumes/dev/scriptlets/src/scriptlets/disable-newtab-links.js)
* * *

### <a id="google-analytics-ga-scriptlet"></a> ⚡️ google-analytics-ga

Mocks old Google Analytics API.

It is mostly used for `$redirect` rules.
See [redirect description](#google-analytics-redirect).\

Related UBO scriptlet:
https://github.com/gorhill/uBlock/blob/a94df7f3b27080ae2dcb3b914ace39c0c294d2f6/src/web_accessible_resources/google-analytics_ga.js

**Syntax**
```
example.org#%#//scriptlet("google-analytics-ga")
```
[Scriptlet source](/Volumes/dev/scriptlets/src/scriptlets/google-analytics-ga.js)
* * *

### <a id="google-analytics-scriptlet"></a> ⚡️ google-analytics

Mocks Google Analytics API.

It is mostly used for `$redirect` rules.
See [redirect description](#google-analytics-redirect).\

Related UBO scriptlet:
https://github.com/gorhill/uBlock/blob/a94df7f3b27080ae2dcb3b914ace39c0c294d2f6/src/web_accessible_resources/google-analytics_analytics.js

**Syntax**
```
example.org#%#//scriptlet("google-analytics")
```
[Scriptlet source](/Volumes/dev/scriptlets/src/scriptlets/google-analytics.js)
* * *

### <a id="googlesyndication-adsbygoogle-scriptlet"></a> ⚡️ googlesyndication-adsbygoogle

Mocks Google AdSense API.

It is mostly used for `$redirect` rules.
See [redirect description](#googlesyndication-adsbygoogle-redirect).

Related UBO scriptlet:
https://github.com/gorhill/uBlock/blob/a94df7f3b27080ae2dcb3b914ace39c0c294d2f6/src/web_accessible_resources/googlesyndication_adsbygoogle.js

**Syntax**
```
example.org#%#//scriptlet("googlesyndication-adsbygoogle")
```
[Scriptlet source](/Volumes/dev/scriptlets/src/scriptlets/googlesyndication-adsbygoogle.js)
* * *

### <a id="googletagmanager-gtm-scriptlet"></a> ⚡️ googletagmanager-gtm

Mocks Google Tag Manager API.

It is mostly used for `$redirect` rules.
See [redirect description](#googletagmanager-gtm-redirect).

Related UBO scriptlet:
https://github.com/gorhill/uBlock/blob/a94df7f3b27080ae2dcb3b914ace39c0c294d2f6/src/web_accessible_resources/googletagmanager_gtm.js

**Syntax**
```
example.org#%#//scriptlet("googletagmanager-gtm")
```
[Scriptlet source](/Volumes/dev/scriptlets/src/scriptlets/googletagmanager-gtm.js)
* * *

### <a id="googletagservices-gpt-scriptlet"></a> ⚡️ googletagservices-gpt

Mocks Google Publisher Tag API

It is mostly used for `$redirect` rules.
See [redirect description](#googletagmanager-gpt-redirect).

Related UBO scriptlet:
https://github.com/gorhill/uBlock/blob/a94df7f3b27080ae2dcb3b914ace39c0c294d2f6/src/web_accessible_resources/googletagservices_gpt.js

**Syntax**
```
example.org#%#//scriptlet("googletagservices-gpt")
```
[Scriptlet source](/Volumes/dev/scriptlets/src/scriptlets/googletagservices-gpt.js)
* * *

### <a id="json-prune"></a> ⚡️ json-prune

Removes specified properties from the result of calling JSON.parse and returns the caller

**Syntax**
```
example.org#%#//scriptlet("json-prune"[, propsToRemove [, obligatoryProps]])
```

- `propsToRemove` - string of space-separated properties to remove
- `obligatoryProps` - optional, string of space-separated properties which must be all present for the pruning to occur

**Examples**
1. Removes property `example` from the results of JSON.parse call
    ```
    example.org#%#//scriptlet("json-prune", "example")
    ```

    For instance, the following call will return `{ one: 1}`

    ```html
    JSON.parse('{"one":1,"example":true}')
    ```

2. If there are no specified properties in the result of JSON.parse call, pruning will NOT occur
    ```
    example.org#%#//scriptlet("json-prune", "one", "obligatoryProp")
    ```

    For instance, the following call will return `{ one: 1, two: 2}`

    ```html
    JSON.parse('{"one":1,"two":2}')
    ```

3. A property in a list of properties can be a chain of properties

    ```
    example.org#%#//scriptlet("json-prune", "a.b", "adpath.url.first")
    ```

4. Call with no arguments will log the current hostname and json payload at the console
    ```
    example.org#%#//scriptlet("json-prune")
    ```
[Scriptlet source](/Volumes/dev/scriptlets/src/scriptlets/json-prune.js)
* * *

### <a id="log-addEventListener"></a> ⚡️ log-addEventListener

Logs all addEventListener calls to the console

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#addeventlistener-loggerjs-

**Syntax**
```
example.org#%#//scriptlet("log-addEventListener")
```
[Scriptlet source](/Volumes/dev/scriptlets/src/scriptlets/log-addEventListener.js)
* * *

### <a id="log-eval"></a> ⚡️ log-eval

Logs all `eval()` or `new Function()` calls to the console

**Syntax**
```
example.org#%#//scriptlet("log-eval")
```
[Scriptlet source](/Volumes/dev/scriptlets/src/scriptlets/log-eval.js)
* * *

### <a id="log-setInterval"></a> ⚡️ log-setInterval

Logs all setInterval calls to the console

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#setinterval-loggerjs-

**Syntax**
```
example.org#%#//scriptlet("log-setInterval")
```
[Scriptlet source](/Volumes/dev/scriptlets/src/scriptlets/log-setInterval.js)
* * *

### <a id="log-setTimeout"></a> ⚡️ log-setTimeout

Logs all setTimeout call to the console.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#settimeout-loggerjs-

**Syntax**
```
example.org#%#//scriptlet("log-setTimeout")
```
[Scriptlet source](/Volumes/dev/scriptlets/src/scriptlets/log-setTimeout.js)
* * *

### <a id="log"></a> ⚡️ log

A simple scriptlet which only purpose is to print arguments to console.
This scriptlet can be helpful for debugging and troubleshooting other scriptlets.
**Example**
```
example.org#%#//scriptlet("log", "arg1", "arg2")
```
[Scriptlet source](/Volumes/dev/scriptlets/src/scriptlets/log.js)
* * *

### <a id="metrika-yandex-tag-scriptlet"></a> ⚡️ metrika-yandex-tag

Mocks Yandex Metrika API
https://yandex.ru/support/metrica/objects/method-reference.html

It is mostly used for `$redirect` rules.
See [redirect description](#scorecardresearch-beacon-redirect).

**Syntax**
```
example.org#%#//scriptlet("metrika-yandex-tag")
```
[Scriptlet source](/Volumes/dev/scriptlets/src/scriptlets/metrika-yandex-tag.js)
* * *

### <a id="metrika-yandex-watch-scriptlet"></a> ⚡️ metrika-yandex-watch

Mocks the old Yandex Metrika API.
https://yandex.ru/support/metrica/objects/_method-reference.html

It is mostly used for `$redirect` rules.
See [redirect description](#scorecardresearch-beacon-redirect).

**Syntax**
```
example.org#%#//scriptlet("metrika-yandex-watch")
```
[Scriptlet source](/Volumes/dev/scriptlets/src/scriptlets/metrika-yandex-watch.js)
* * *

### <a id="nowebrtc"></a> ⚡️ nowebrtc

Disables WebRTC by overriding `RTCPeerConnection`. The overriden function will log every attempt to create a new connection.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#nowebrtcjs-

**Syntax**
```
example.org#%#//scriptlet("nowebrtc")
```
[Scriptlet source](/Volumes/dev/scriptlets/src/scriptlets/nowebrtc.js)
* * *

### <a id="prevent-addEventListener"></a> ⚡️ prevent-addEventListener

Prevents adding event listeners for the specified events and callbacks.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#addeventlistener-defuserjs-

**Syntax**
```
example.org#%#//scriptlet("prevent-addEventListener"[, eventSearch[, functionSearch]])
```

**Parameters**
- `eventSearch` (optional) String or regex matching the event name. If not specified, the scriptlets prevents all event listeners.
- `functionSearch` (optional) String or regex matching the event listener function body. If not set, the scriptlet prevents all event listeners with event name matching `eventSearch`.

**Examples**
1. Prevent all `click` listeners:
```
    example.org#%#//scriptlet("prevent-addEventListener", "click")
```

2. Prevent 'click' listeners with the callback body containing `searchString`.
```
    example.org#%#//scriptlet("prevent-addEventListener", "click", "searchString")
```

    For instance, this listener will not be called:
```javascript
    el.addEventListener('click', () => {
        window.test = 'searchString';
    });
```
[Scriptlet source](/Volumes/dev/scriptlets/src/scriptlets/prevent-addEventListener.js)
* * *

### <a id="prevent-adfly"></a> ⚡️ prevent-adfly

Prevents anti-adblock scripts on adfly short links.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#adfly-defuserjs-

**Syntax**
```
example.org#%#//scriptlet("prevent-adfly")
```
[Scriptlet source](/Volumes/dev/scriptlets/src/scriptlets/prevent-adfly.js)
* * *

### <a id="prevent-bab"></a> ⚡️ prevent-bab

Prevents BlockAdblock script from detecting an ad blocker.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#bab-defuserjs-

**Syntax**
```
example.org#%#//scriptlet("prevent-bab")
```
[Scriptlet source](/Volumes/dev/scriptlets/src/scriptlets/prevent-bab.js)
* * *

### <a id="prevent-eval-if"></a> ⚡️ prevent-eval-if

Prevents page to use eval matching payload

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#noeval-ifjs-

**Parameters**
- `search` string or regexp matching stringified eval payload

**Examples**
```
!
```
[Scriptlet source](/Volumes/dev/scriptlets/src/scriptlets/prevent-eval-if.js)
* * *

### <a id="prevent-fab-3.2.0-scriptlet"></a> ⚡️ prevent-fab-3.2.0

Prevents execution of the FAB script v3.2.0

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#fuckadblockjs-320-

**Syntax**
```
example.org#%#//scriptlet("prevent-fab-3.2.0")
```
[Scriptlet source](/Volumes/dev/scriptlets/src/scriptlets/prevent-fab-3.2.0.js)
* * *

### <a id="prevent-popads-net-scriptlet"></a> ⚡️ prevent-popads-net

Aborts on property write (PopAds, popns), throws reference error with random id

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#popadsnetjs-

**Syntax**
```
example.org#%#//scriptlet("prevent-popads-net")
```
[Scriptlet source](/Volumes/dev/scriptlets/src/scriptlets/prevent-popads-net.js)
* * *

### <a id="prevent-setInterval"></a> ⚡️ prevent-setInterval

Prevents a `setInterval` call if the text of the callback is matching the specified search string/regexp and (optionally) have the specified interval.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#setinterval-defuserjs-

**Syntax**
```
example.org#%#//scriptlet("prevent-setInterval"[, <search>[, <interval>]])
```

**Parameters**
- `search` (optional) string or regular expression that must match the stringified callback . If not set, prevents all `setInterval` calls.
- `interval` (optional) must be an integer. If set, it matches the interval passed to the `setInterval` call.

**Example**

1. Prevents `setInterval` calls if the callback contains `value` and the interval is set to `300`.
    ```
    example.org#%#//scriptlet("prevent-setInterval", "value", "300")
    ```

    For instance, the followiing call will be prevented:
    ```javascript
    setInterval(function () {
        window.test = "value";
    }, 300);
    ```

2. Prevents `setInterval` calls if the callback matches `/\.test/` regardless of the interval.
    ```
    example.org#%#//scriptlet("prevent-setInterval", "/\.test/")
    ```

    For instance, the followiing call will be prevented:
    ```javascript
    setInterval(function () {
        window.test = "value";
    }, 100);
    ```
[Scriptlet source](/Volumes/dev/scriptlets/src/scriptlets/prevent-setInterval.js)
* * *

### <a id="prevent-setTimeout"></a> ⚡️ prevent-setTimeout

Prevents a `setTimeout` call if the text of the callback is matching the specified search string/regexp and (optionally) have the specified delay.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#settimeout-defuserjs-

**Syntax**
```
example.org#%#//scriptlet("prevent-setTimeout"[, <search>[, <delay>]])
```

**Parameters**
- `search` (optional) string or regular expression that must match the stringified callback . If not set, prevents all `setTimeout` calls.
- `delay` (optional) must be an integer. If set, it matches the delay passed to the `setTimeout` call.

**Examples**

1. Prevents `setTimeout` calls if the callback contains `value` and the delay is set to `300`.
    ```
    example.org#%#//scriptlet("prevent-setTimeout", "value", "300")
    ```

    For instance, the followiing call will be prevented:
    ```javascript
    setTimeout(function () {
        window.test = "value";
    }, 300);
    ```

2. Prevents `setTimeout` calls if the callback matches `/\.test/` regardless of the delay.
    ```bash
    example.org#%#//scriptlet("prevent-setTimeout", "/\.test/")
    ```

    For instance, the followiing call will be prevented:
    ```javascript
    setTimeout(function () {
        window.test = "value";
    }, 100);
    ```
[Scriptlet source](/Volumes/dev/scriptlets/src/scriptlets/prevent-setTimeout.js)
* * *

### <a id="prevent-window-open"></a> ⚡️ prevent-window-open

Prevents `window.open` calls when URL either matches or not matches the specified string/regexp. Using it without parameters prevents all `window.open` calls.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#windowopen-defuserjs-

**Syntax**
```
example.org#%#//scriptlet("prevent-window-open"[, <match>[, <search>]])
```

**Parameters**
- `match` (optional) defaults to "matching", any positive number for "matching", 0 or any string for "not matching",
- `search` (optional) string or regexp for matching the URL passed to `window.open` call.

**Example**

1. Prevent all `window.open` calls:
```
    example.org#%#//scriptlet("prevent-window-open")
```

2. Prevent `window.open` for all URLs containing `example`:
```
    example.org#%#//scriptlet("prevent-window-open", "1", "example")
```

3. Prevent `window.open` for all URLs matching RegExp `/example\./`:
```
    example.org#%#//scriptlet("prevent-window-open", "1", "/example\./")
```

4. Prevent `window.open` for all URLs **NOT** containing `example`:
```
    example.org#%#//scriptlet("prevent-window-open", "0", "example")
```
[Scriptlet source](/Volumes/dev/scriptlets/src/scriptlets/prevent-window-open.js)
* * *

### <a id="remove-attr"></a> ⚡️ remove-attr

Removes attributes from DOM nodes. Will run only once after page load.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#remove-attrjs-

**Syntax**
```
example.org#%#//scriptlet("remove-attr", attrs[, selector])
```

- `attrs` - required, attribute or list of attributes joined by |
- `selector` - optional, CSS selector, specifies nodes from which attributes will be removed

**Examples**
1.  Removes by attribute
    ```
    example.org#%#//scriptlet("remove-attr", "example|test")
    ```

    ```html
    <!-- before  -->
    <div example="true" test="true">Some text</div>

    <!-- after -->
    <div>Some text</div>
    ```

2. Removes with specified selector
    ```
    example.org#%#//scriptlet("remove-attr", "example", ".inner")
    ```

    ```html
    <!-- before -->
    <div class="wrapper" example="true">
        <div class="inner" example="true">Some text</div>
    </div>

    <!-- after -->
    <div class="wrapper" example="true">
        <div class="inner">Some text</div>
    </div>
    ```
[Scriptlet source](/Volumes/dev/scriptlets/src/scriptlets/remove-attr.js)
* * *

### <a id="remove-cookie"></a> ⚡️ remove-cookie

Removes current page cookies by passed string matching with name. For current domain and subdomains. Runs on load and before unload.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#cookie-removerjs-

**Syntax**
```
example.org#%#//scriptlet("remove-cookie"[, match])
```

**Parameters**
- `match` (optional) String or regex matching the cookie name. If not specified all accessible cookies will be removed.

**Examples**
1. Removes all cookies:
```
    example.org#%#//scriptlet("remove-cookie")
```

2. Removes cookies which name contains `example` string.
```
    example.org#%#//scriptlet("remove-cookie", "example")
```

    For instance this cookie will be removed
    ```javascript
    document.cookie = '__example=randomValue';
    ```
[Scriptlet source](/Volumes/dev/scriptlets/src/scriptlets/remove-cookie.js)
* * *

### <a id="scorecardresearch-beacon-scriptlet"></a> ⚡️ scorecardresearch-beacon

Mocks Scorecard Research API.

It is mostly used for `$redirect` rules.
See [redirect description](#scorecardresearch-beacon-redirect).

Related UBO scriptlet:
https://github.com/gorhill/uBlock/blob/a94df7f3b27080ae2dcb3b914ace39c0c294d2f6/src/web_accessible_resources/scorecardresearch_beacon.js

**Syntax**
```
example.org#%#//scriptlet("scorecardresearch-beacon")
```
[Scriptlet source](/Volumes/dev/scriptlets/src/scriptlets/scorecardresearch-beacon.js)
* * *

### <a id="set-constant"></a> ⚡️ set-constant

Creates a constant property and assigns it one of the values from the predefined list.

> Actually, it's not a constant. Please note, that it can be rewritten with a value of a different type.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#set-constantjs-

**Syntax**
```
example.org#%#//scriptlet("set-constant", <property>, <value>)
```

**Parameters**
- `property` (required) path to a property (joined with `.` if needed). The property must be attached to `window`.
- `value` (required). Possible values:
    - positive decimal integer `<= 32767`
    - one of the predefined constants:
        - `undefined`
        - `false`
        - `true`
        - `null`
        - `noopFunc` - function with empty body
        - `trueFunc` - function returning true
        - `falseFunc` - function returning false
        - `''` - empty string

**Examples**
```
! window.firstConst === false // this comparision will return true
example.org#%#//scriptlet("set-constant", "firstConst", "false")

! window.secondConst() === true // call to the secondConst will return true
example.org#%#//scriptlet("set-constant", "secondConst", "trueFunc")
```
[Scriptlet source](/Volumes/dev/scriptlets/src/scriptlets/set-constant.js)
* * *

### <a id="set-popads-dummy-scriptlet"></a> ⚡️ set-popads-dummy

Sets static properties PopAds and popns.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#popads-dummyjs-

**Syntax**
```
example.org#%#//scriptlet("set-popads-dummy")
```
[Scriptlet source](/Volumes/dev/scriptlets/src/scriptlets/set-popads-dummy.js)
* * *


## <a id="redirect-resources"></a> Redirect resources

AdGuard is able to redirect web requests to a local "resource".

### <a id="redirect-syntax"></a> Syntax

AdGuard uses the same filtering syntax as [uBlock Origin](https://github.com/gorhill/uBlock/wiki/Static-filter-syntax#redirect). Also, it is compatible with ABP `$rewrite` modifier.

`$redirect` is a modifier for the [basic filtering rules](https://kb.adguard.com/en/general/how-to-create-your-own-ad-filters#basic-rules-syntax) so rules with this modifier support all other basic modifiers like `$domain`, `$third-party`, `$script`, etc.

The value of the `$redirect` modifier must be the name of the resource, that will be used for redirection. See the list of resources [below](#available-resources).

**Examples**
* `||example.org/script.js$script,redirect=noopjs` -- redirects all requests to `script.js` to the resource named `noopjs`.
* `||example.org/test.mp4$media,redirect=noopmp4-1s` -- redirects all requests to `test.mp4` to the resource named `noopmp4-1s`.

> `$redirect` rules priority is higher than the regular basic blocking rules' priority. This means that if there's a basic blocking rule (even with `$important` modifier), `$redirect` rule will prevail over it. If there's a whitelist (`@@`) rule matching the same URL, it will disable redirecting as well (unless the `$redirect` rule is also marked as `$important`).

> uBlock Origin specifies additional resource name `none` that can disable other redirect rules. AdGuard does not support it, use `$badfilter` to disable specific rules.

## <a id="available-resources"></a> Available redirect resources

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


## <a id="how-to-build"></a> How to build

Install dependencies
```
yarn install
```

Build for Extension
```
yarn build
```

Build for Corelibs
```
yarn corelibs
```

Build dev (rebuild js files on every change)
```
yarn watch
```

Run node testing
```
yarn test
```

Run tests gui
```
yarn gui-test
```


To run browserstack tests create `.env` file or rename `.env-example`.

Fill in <username> and <key> with data from your Browserstack profile.
Run next command
```
yarn browserstack
```

### Build output

#### Scriptlets library

`dist/scriptlets.js`

Creates a global variable `scriptlets`.

```javascript
/**
* Returns scriptlet code
*
* @param {Source} source
* @returns {string}
*/
scriptlets.invoke(source)
```

#### Corelibs library

`dist/scriptlets.corelibs.json`

File example
```
{
    "version": "1.0.0",
    "scriptlets": [
        {
            "names": [
                "abort-on-property-read",
                "ubo-abort-on-property-read.js",
                "abp-abort-on-property-read"
            ],
            "scriptlet": "function() { ...code... }"
        },
    ]
}
```

Schema
```
{
    "type": "object",
    "properties": {
        "version": {
            "type": "string"
        },
        "scriptlets": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "names": {
                        "type": "array",
                        "items": {
                            "type": "string"
                        }
                    },
                    "scriptlet": {
                        "type": "string"
                    }
                },
            }
        }
    }
}
```

#### Redirects library
```
dist/redirects.js
dist/redirects.yml
```

Creates a global variable `Redirects`.

```javascript
// Usage

/**
 * Converts rawYaml into JS object with sources titles used as keys
 */
const redirects = new Redirects(rawYaml)

/**
 * Returns redirect source object by title
 */
const redirect = redirect.getRedirect('noopjs');

/**
 * Redirect - object with following props
 * {
 *      title: 1x1-transparent.gif
 *      comment: http://probablyprogramming.com/2009/03/15/the-tiniest-gif-ever
 *      contentType: image/gif;base64
 *      content: R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
 * }
 */
```

## <a id="browser-compatibility"> Browser Compatibility
| Chrome | Edge | Firefox | IE | Opera | Safari |
|--|--|--|--|--|--|
| 55 | 15 | 52 | 11 | 42 | 10 |