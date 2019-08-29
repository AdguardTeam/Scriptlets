# AdGuard Scriptlets and Resources
[![Build Status](https://travis-ci.org/AdguardTeam/Scriptlets.svg?branch=master)](https://travis-ci.org/AdguardTeam/Scriptlets)

* [Scriptlets](#scriptlets)
    * [Syntax](#syntax)
    * [Available scriptlets](#available-scriptlets)
        * [set-constant](#set-constant)
        * [abort-on-property-read](#abort-on-property-read)
        * [abort-on-property-write](#abort-on-property-write)
        * [abort-current-inline-script](#abort-current-inline-script)
        * [prevent-setTimeout](#prevent-setTimeout)
        * [prevent-setInterval](#prevent-setInterval)
        * [prevent-addEventListener](#prevent-addEventListener)
        * [prevent-window-open](#prevent-window-open)
        * [nowebrtc](#nowebrtc)
        * [prevent-bab](#prevent-bab)
        * [log](#log)
        * [log-addEventListener](#log-addEventListener)
        * [log-setInterval](#log-setInterval)
        * [log-setTimeout](#log-setTimeout)
        * [log-eval](#log-eval)
        * [noeval](#noeval)
        * [prevent-eval-if](#prevent-eval-if)
        * [remove-cookie](#remove-cookie)
        * [prevent-fab-3.2.0](#prevent-fab-3.2.0)
        * [set-popads-dummy](#set-popads-dummy)
        * [prevent-popads-net](#prevent-popads-net)
        * [prevent-adfly](#prevent-adfly)
        * [debug-on-property-read](#debug-on-property-read)
        * [debug-on-property-write](#debug-on-property-write)
        * [debug-current-inline-script](#debug-current-inline-script)
        * [remove-attr](#remove-attr)
        * [disable-newtab-links](#disable-newtab-links)
        * [googlesyndication-adsbygoogle](#googlesyndication-adsbygoogle-scriptlet)
    * [Scriptlets compatibility table](#compatibility)
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
        * [noopmp3-0.1s](#noopmp3-01s)
        * [noopmp4-1s](#noopmp4-1s)
        * [prevent-fab-3.2.0](#prevent-fab-3-2-0)
        * [set-popads-dummy](#set-popads-dummy)
        * [prevent-popads-net](#prevent-popads-net)
        * [noeval.js](#noeval-js)
        * [googlesyndication-adsbygoogle](#googlesyndication-adsbygoogle)
    * [Redirect resources compatibility table](#redirect-compatibility)
* [How to build](#how-to-build)

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

### <a id="available-scriptlets"></a> Available scriptlets

This is a list of scriptlets supported by AdGuard. Please note, that in order to achieve cross-blocker compatibility, we also support syntax of uBO and ABP. You can check out the [compatibility table](#compatibility).

#### <a id="set-constant"></a> set-constant

Creates a constant property and assigns it one of the values from the predefined list.

> Actually, it's not a constant. Please note, that it can be rewritten with a value of a different type.

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
example.org#%#//scriptlet("set-constant", "firstConst", "false")
! window.firstConst === false // this comparision will return true

example.org#%#//scriptlet("set-constant", "secondConst", "trueFunc")
! window.secondConst() === true // call to the secondConst will return true
```

[scriptlet source](./src/scriptlets/set-constant.js)

#### <a id="abort-on-property-read"></a> abort-on-property-read

Aborts a script when it attempts to **read** the specified property.

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

[Scriptlet source](./src/scriptlets/abort-on-property-read.js)

#### <a id="abort-on-property-write"></a> abort-on-property-write

Aborts a script when it attempts to **write** the specified property.

**Syntax**
```
example.org#%#//scriptlet("abort-on-property-write", <property>)
```

**Parameters**
- `property` (required) path to a property (joined with `.` if needed). The property must be attached to `window`.

**Examples**
```
! Aborts script when it tries to set `window.adblock` value
example.org#%#//scriptlet("abort-on-property-read", "adblock")
```

[Scriptlet source](./src/scriptlets/abort-on-property-write.js)

#### <a id="abort-current-inline-script"></a> abort-current-inline-script

Aborts an inline script when it attempts to **read** the specified property AND when the contents of the `<script>` element contains the specified text or matches the regular expression.

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

[scriptlet source](./src/scriptlets/abort-current-inline-script.js)

#### <a id="prevent-setTimeout"></a> prevent-setTimeout

Prevents a `setTimeout` call if the text of the callback is matching the specified search string/regexp and (optionally) have the specified delay.

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
    ```
    example.org#%#//scriptlet("prevent-setTimeout", "/\.test/")
    ```

    For instance, the followiing call will be prevented:
    ```javascript
    setTimeout(function () {
        window.test = "value";
    }, 100);
    ```

[scriptlet source](./src/scriptlets/prevent-setTimeout.js)

#### <a id="prevent-setInterval"></a> prevent-setInterval

Prevents a `setInterval` call if the text of the callback is matching the specified search string/regexp and (optionally) have the specified interval.

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

[scriptlet source](./src/scriptlets/prevent-setInterval.js)

#### <a id="prevent-addEventListener"></a> prevent-addEventListener

Prevents adding event listeners for the specified events and callbacks.

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

[scriptlet source](./src/scriptlets/prevent-addEventListener.js)

#### <a id="prevent-window-open"></a> prevent-window-open

Prevents `window.open` calls when URL either matches or not matches the specified string/regexp. Using it without parameters prevents all `window.open` calls.

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

[scriptlet source](./src/scriptlets/prevent-window-open.js)

#### <a id="nowebrtc"></a> nowebrtc

Disables WebRTC by overriding `RTCPeerConnection`. The overriden function will log every attempt to create a new connection.

**Syntax**
```
example.org#%#//scriptlet("nowebrtc")
```

[scriptlet source](./src/scriptlets/nowebrtc.js)

#### <a id="prevent-bab"></a> prevent-bab

Prevents BlockAdblock script from detecting an ad blocker.

**Syntax**
```
example.org#%#//scriptlet("prevent-bab")
```

[scriptlet source](./src/scriptlets/prevent-bab.js)

#### <a id="log"></a> log

A simple scriptlet which only purpose is to print arguments to console.
This scriptlet can be helpful for debugging and troubleshooting other scriptlets.

```
example.org#%#//scriptlet("log", "arg1", "arg2")
```

#### <a id="log-addEventListener"></a> log-addEventListener

Logs all addEventListener calls to the console

**Syntax**
```
example.org#%#//scriptlet("log-addEventListener")
```

[scriptlet source](./src/scriptlets/log-addEventListener.js)

#### <a id="log-setInterval"></a> log-setInterval

Logs all setInterval calls to the console

**Syntax**
```
example.org#%#//scriptlet("log-setInterval")
```

[scriptlet source](./src/scriptlets/log-setInterval.js)

#### <a id="log-setTimeout"></a> log-setTimeout

Logs all setTimeout call to the console

**Syntax**
```
example.org#%#//scriptlet("log-setTimeout")
```

[scriptlet source](./src/scriptlets/log-setTimeout.js)

#### <a id="log-eval"></a> log-eval

Logs all `eval()` or `new Function()` calls to the console

**Syntax**
```
example.org#%#//scriptlet("log-eval")
```

[scriptlet source](./src/scriptlets/log-eval.js)

#### <a id="remove-cookie"></a> remove-cookie

Removes current page cookies by passed string matching with name. For current domain and subdomains. Runs on load and before unload.

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

[scriptlet source](./src/scriptlets/cookie-remover.js)

#### <a id="prevent-fab-3.2.0"></a> prevent-fab-3.2.0

Prevents execution of the FAB script v3.2.0

**Syntax**
```
example.org#%#//scriptlet("prevent-fab-3.2.0")
```

[scriptlet source](./src/scriptlets/prevent-fab-3.2.0.js)

#### <a id="set-popads-dummy"></a> set-popads-dummy

Sets static properties PopAds and popns.

**Syntax**
```
example.org#%#//scriptlet("set-popads-dummy")
```

[scriptlet source](./src/scriptlets/set-popads-dummy.js)

#### <a id="prevent-popads-net"></a> prevent-popads-net

Aborts on property write (PopAds, popns), throws reference error with random id

**Syntax**
```
example.org#%#//scriptlet("prevent-popads-net")
```

[scriptlet source](./src/scriptlets/prevent-popads-net.js)

#### <a id="prevent-adfly"></a> prevent-adfly

Prevents anti-adblock scripts on adfly short links.

**Syntax**
```
example.org#%#//scriptlet("prevent-adfly")
```

[scriptlet source](./src/scriptlets/prevent-adfly.js)

#### <a id="debug-current-inline-script"></a> debug-current-inline-script

This scriptlet is basically the same as [abort-current-inline-script](#abort-current-inline-script), but instead of aborting it starts the debugger.

**Syntax**

```
! Aborts script when it tries to access `window.alert`
example.org#%#//scriptlet("debug-current-inline-script", "alert")
```

**It is not supposed to be used in production filter lists!**

[scriptlet source](./src/scriptlets/debug-current-inline-script.js)


#### <a id="debug-on-property-read"></a> debug-on-property-read

This scriptlet is basically the same as [abort-on-property-read](#abort-on-property-read), but instead of aborting it starts the debugger.

**Syntax**
```
! Aborts script when it tries to access `window.alert`
example.org#%#//scriptlet("debug-on-property-read", "alert")
```

**It is not supposed to be used in production filter lists!**

[scriptlet source](./src/scriptlets/debug-on-property-read.js)


#### <a id="debug-on-property-write"></a> debug-on-property-write

This scriptlet is basically the same as [abort-on-property-write](#abort-on-property-write), but instead of aborting it starts the debugger.

**Syntax**

```
! Aborts script when it tries to write in property `window.test`
example.org#%#//scriptlet("debug-on-property-write", "test")
```

**It is not supposed to be used in production filter lists!**

[scriptlet source](./src/scriptlets/debug-on-property-write.js)


#### <a id="remove-attr"></a> remove-attr

Removes attributes from DOM nodes. Will run only once after page load.

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

[scriptlet source](./src/scriptlets/remove-attr.js)

#### <a id="disable-newtab-links"></a> disable-newtab-links

Prevents opening new tabs and windows if there is `target` attribute in element

**Syntax**
```
example.org#%#//scriptlet("disable-newtab-links")
```

[scriptlet source](./src/scriptlets/disable-newtab-links.js)

### <a id="adjust-setInterval"></a> adjust-setInterval

Adjusts interval for specified setInterval() callbacks

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

[scriptlet source](./src/scriptlets/adjust-setInterval.js)

### <a id="adjust-setTimeout"></a> adjust-setTimeout

Adjusts timeout for specified setTimeout() callbacks

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

[scriptlet source](./src/scriptlets/adjust-setTimeout.js)


### <a id="dir-string"></a> dir-string

Wraps the `console.dir` API to call the `toString` method of the argument.
There are several adblock circumvention systems that detect browser devtools and hide themselves. Therefore, if we force them to think that devtools are open (using this scrciptlet), it will automatically disable the adblock circumvention script.

**Syntax**
```
example.org#%#//scriptlet("dir-string"[, times])
```
- `times` - optional, the number of times to call the `toString` method of the argument to `console.dir`

**Example**
1. Run 2 times
    ```
    example.org#%#//scriptlet("dir-string", "2")
    ```

[scriptlet source](./src/scriptlets/dir-string.js)

#### <a id="googlesyndication-adsbygoogle-scriptlet"></a> googlesyndication-adsbygoogle

Mocks Google AdSense API.

It mostly used as redirect rule.
See [redirect description](#googlesyndication-adsbygoogle).

**Example**
```
example.org#%#//scriptlet("googlesyndication-adsbygoogle")
```
[redirect source](./src/scriptlets/googlesyndication-adsbygoogle.js)


### <a id="compatibility"></a> Scriptlets compatibility table

|AdGuard | uBO | Adblock Plus |
|--|--|--|
| [abort-current-inline-script](#abort-current-inline-script) | abort-current-inline-script.js | abort-current-inline-script |
| [abort-on-property-read](#abort-on-property-read) | abort-on-property-read.js | abort-on-property-read |
| [abort-on-property-write](#abort-on-property-write) | abort-on-property-write.js | abort-on-property-write |
| [prevent-addEventListener](#prevent-addEventListener) | addEventListener-defuser.js |  |
| [log-addEventListener](#log-addEventListener) | addEventListener-logger.js |  |
| [remove-cookie](#remove-cookie) | cookie-remover.js |  |
|  | csp.js (deprecated) |  |
|  | disable-newtab-links.js |  |
| [noeval](#noeval) | noeval.js |  |
| [noeval](#noeval) | silent-noeval.js |  |
| [prevent-eval-if](#prevent-eval-if) | noeval-if.js |  |
| [nowebrtc](#nowebrtc) | nowebrtc.js |  |
|  | remove-attr.js |  |
| [set-constant](#set-constant) | set-constant.js |  |
| [prevent-setInterval](#prevent-setInterval) | setInterval-defuser.js |  |
| [log-setInterval](#log-setInterval) | setInterval-logger.js |  |
| [prevent-setTimeout](#prevent-setTimeout) | setTimeout-defuser.js |  |
| [log-setTimeout](#log-setInterval) | setTimeout-logger.js |  |
|  | sharedWorker-defuser.js (deprecated) |  |
| [prevent-window-open](#prevent-window-open) | window.open-defuser.js |  |
| [prevent-bab](#prevent-bab) | bab-defuser.js |  |
| [prevent-fab-3.2.0](#prevent-fab-3.2.0) | fuckadblock.js-3.2.0 |  |
| [set-popads-dummy](#set-popads-dummy) | popads-dummy.js |  |
| [prevent-popads-net](#prevent-popads-net) | popads.net.js |  |
| [prevent-adfly](#prevent-adfly) | adfly-defuser.js |  |
|  |  | hide-if-contains-image |
|  |  | hide-if-has-and-matches-style |
|  |  | hide-if-contains-and-matches-style |
|  |  | hide-if-contains |
|  |  | hide-if-shadow-contains |
| [log-eval](#log-eval) |  | |
| [log](#log) |  | log |
| [debug-current-inline-script](#debug-current-inline-script) |  |  |
| [debug-on-property-read](#debug-on-property-read) |  |  |
| [debug-on-property-write](#debug-on-property-write) |  |  |
| [remove-attr](#remove-attr) | remove-attr.js | |
| [disable-newtab-links](#disable-newtab-links) | disable-newtab-links.js | |
| [adjust-setInterval](#adjust-setInterval) | nano-setInterval-booster.js | |
| [adjust-setTimeout](#adjust-setTimeout) | nano-setTimeout-booster.js | |
| [dir-string](#dir-string) | | dir-string |

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

### <a id="available-resources"></a> Available redirect resources


#### <a id="1x1-transparent"></a> 1x1-transparent.gif

**Example**
```
||example.org^$image,redirect=1x1-transparent.gif
```
[redirect source](./src/redirects/static-redirects.yml)


#### <a id="2x2-transparent"></a> 2x2-transparent.png

**Example**
```
||example.org^$image,redirect=2x2-transparent.png
```
[redirect source](./src/redirects/static-redirects.yml)


#### <a id="3x2-transparent"></a> 3x2-transparent.png

**Example**
```
||example.org^$image,redirect=3x2-transparent.png
```
[redirect source](./src/redirects/static-redirects.yml)


#### <a id="32x32-transparent"></a> 32x32-transparent.png

**Example**
```
||example.org^$image,redirect=32x32-transparent.png
```
[redirect source](./src/redirects/static-redirects.yml)


#### <a id="noopframe"></a> noopframe

**Example**
```
||example.com^$subdocument,redirect=noopframe,domain=example.org
```
[redirect source](./src/redirects/static-redirects.yml)


#### <a id="noopcss"></a> noopcss

**Example**
```
||example.org^$stylesheet,redirect=noopcss
```
[redirect source](./src/redirects/static-redirects.yml)


#### <a id="noopjs"></a> noopjs

**Example**
```
||example.org^$script,redirect=noopjs
```
[redirect source](./src/redirects/static-redirects.yml)


#### <a id="nooptext"></a> nooptext

**Example**
```
||example.org^$xmlhttprequest,redirect=nooptext
```
[redirect source](./src/redirects/static-redirects.yml)


#### <a id="noopmp3-01s"></a> noopmp3-0.1s

**Example**
```
||example.org^$media,redirect=noopmp3-0.1s
```
[redirect source](./src/redirects/static-redirects.yml)


#### <a id="noopmp4-1s"></a> noopmp4-1s

**Example**
```
||example.org^$media,redirect=noopmp4-1s
```
[redirect source](./src/redirects/static-redirects.yml)


#### <a id="prevent-fab-3-2-0"></a> prevent-fab-3.2.0

Redirects fuckadblock script to the source js file

**Example**
```
*/fuckadblock-$script,redirect=prevent-fab-3.2.0
```
[redirect source](./src/scriptlets/prevent-fab-3.2.0.js)


#### <a id="set-popads-dummy"></a> set-popads-dummy

Redirects request to the source which sets static properties to PopAds and popns objectss

**Example**
```
||popads.net^$script,redirect=set-popads-dummy,domain=example.org
```
[redirect source](./src/scriptlets/set-popads-dummy.js)


#### <a id="prevent-popads-net"></a> prevent-popads-net

Redirects request to the source which sets static properties to PopAds and popns objectss

**Example**
```
||popads.net/pop.js$script,redirect=prevent-popads-net
```
[redirect source](./src/scriptlets/prevent-popads-net.js)


#### <a id="noeval-js"></a> noeval.js

Prevents page to use eval

**Example**
```
||example.org/index.js$script,redirect=noeval.js
```
[redirect source](./src/scriptlets/noeval.js)


#### <a id="googlesyndication-adsbygoogle"></a> googlesyndication-adsbygoogle

Mocks Google AdSense API

**Example**
```
||example.org/index.js$script,redirect=googlesyndication-adsbygoogle
```
[redirect source](./src/scriptlets/googlesyndication-adsbygoogle.js)

### <a id="redirect-compatibility"></a> Redirect resources compatibility table

|AdGuard | uBO | Adblock Plus |
|--|--|--|
| [1x1-transparent.gif](#1x1-transparent) | 1x1-transparent.gif | 1x1-transparent-gif |
| [2x2-transparent.png](#2x2-transparent) | 2x2-transparent.png | 2x2-transparent-png |
| [3x2-transparent.png](#3x2-transparent) | 3x2-transparent.png | 3x2-transparent-png |
| [32x32-transparent.png](#32x32-transparent) | 32x32-transparent.png | 32x32-transparent-png |
| [noopframe](#noopframe) | noopframe | blank-html |
| [noopcss](#noopcss) | noopcss | blank-css |
| [noopjs](#noopcss) | noopjs | blank-js |
| [nooptext](#nooptext) | nooptext | blank-text |
| [noopmp3-0.1s](#noopmp3-01s) | noopmp3-0.1s | blank-mp3 |
| [noopmp4-1s](#noopmp4-1s) | noopmp4-1s |  blank-mp4 |
| [prevent-fab-3.2.0](#prevent-fab-3-2-0) | fuckadblock.js-3.2.0 ||
| [set-popads-dummy](#set-popads-dummy) | popads-dummy.js ||
| [prevent-popads-net](#prevent-popads-net) | popads.net.js ||
| [noeval.js](#noeval-js) | silent-noeval.js | noeval |
| [googlesyndication-adsbygoogle](#googlesyndication-adsbygoogle) | googlesyndication_adsbygoogle.js | |
| | hd-main.js | |
| | googletagmanager.com/gtm.js | |
| | google-analytics.com/analytics.js | |
| | ligatus.com/*/angular-tag.js | |
| | scorecardresearch.com/beacon.js | |
| | google-analytics.com/ga.js | |
| | googletagservices.com/gpt.js | |


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

#### Redirect resources library

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