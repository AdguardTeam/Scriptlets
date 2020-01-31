## <a id="scriptlets"></a> Available Scriptlets
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
* [json-prune](#json-prune)
* [log-addEventListener](#log-addEventListener)
* [log-eval](#log-eval)
* [log-setInterval](#log-setInterval)
* [log-setTimeout](#log-setTimeout)
* [log](#log)
* [noeval](#noeval)
* [nowebrtc](#nowebrtc)
* [prevent-addEventListener](#prevent-addEventListener)
* [prevent-adfly](#prevent-adfly)
* [prevent-bab](#prevent-bab)
* [prevent-eval-if](#prevent-eval-if)
* [prevent-fab-3.2.0](#prevent-fab-3.2.0)
* [prevent-popads-net](#prevent-popads-net)
* [prevent-setInterval](#prevent-setInterval)
* [prevent-setTimeout](#prevent-setTimeout)
* [prevent-window-open](#prevent-window-open)
* [remove-attr](#remove-attr)
* [remove-class](#remove-class)
* [remove-cookie](#remove-cookie)
* [set-constant](#set-constant)
* [set-popads-dummy](#set-popads-dummy)
* * *
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
[Scriptlet source](../src/scriptlets/abort-current-inline-script.js)
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
[Scriptlet source](../src/scriptlets/abort-on-property-read.js)
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
[Scriptlet source](../src/scriptlets/abort-on-property-write.js)
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
[Scriptlet source](../src/scriptlets/adjust-setInterval.js)
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
[Scriptlet source](../src/scriptlets/adjust-setTimeout.js)
* * *

### <a id="debug-current-inline-script"></a> ⚡️ debug-current-inline-script

This scriptlet is basically the same as [abort-current-inline-script](#abort-current-inline-script), but instead of aborting it starts the debugger.

**It is not supposed to be used in production filter lists!**

**Syntax**
```
! Aborts script when it tries to access `window.alert`
example.org#%#//scriptlet("debug-current-inline-script", "alert")
```
[Scriptlet source](../src/scriptlets/debug-current-inline-script.js)
* * *

### <a id="debug-on-property-read"></a> ⚡️ debug-on-property-read

This scriptlet is basically the same as [abort-on-property-read](#abort-on-property-read), but instead of aborting it starts the debugger.

**It is not supposed to be used in production filter lists!**

**Syntax**
```
! Aborts script when it tries to access `window.alert`
example.org#%#//scriptlet("debug-on-property-read", "alert")
```
[Scriptlet source](../src/scriptlets/debug-on-property-read.js)
* * *

### <a id="debug-on-property-write"></a> ⚡️ debug-on-property-write

This scriptlet is basically the same as [abort-on-property-write](#abort-on-property-write), but instead of aborting it starts the debugger.

**It is not supposed to be used in production filter lists!**

**Syntax**
```
! Aborts script when it tries to write in property `window.test`
example.org#%#//scriptlet("debug-on-property-write", "test")
```
[Scriptlet source](../src/scriptlets/debug-on-property-write.js)
* * *

### <a id="dir-string"></a> ⚡️ dir-string

Wraps the `console.dir` API to call the `toString` method of the argument.
There are several adblock circumvention systems that detect browser devtools
and hide themselves. Therefore, if we force them to think
that devtools are open (using this scrciptlet),
it will automatically disable the adblock circumvention script.

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
[Scriptlet source](../src/scriptlets/dir-string.js)
* * *

### <a id="disable-newtab-links"></a> ⚡️ disable-newtab-links

Prevents opening new tabs and windows if there is `target` attribute in element.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#disable-newtab-linksjs-

**Syntax**
```
example.org#%#//scriptlet("disable-newtab-links")
```
[Scriptlet source](../src/scriptlets/disable-newtab-links.js)
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
[Scriptlet source](../src/scriptlets/json-prune.js)
* * *

### <a id="log-addEventListener"></a> ⚡️ log-addEventListener

Logs all addEventListener calls to the console.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#addeventlistener-loggerjs-

**Syntax**
```
example.org#%#//scriptlet("log-addEventListener")
```
[Scriptlet source](../src/scriptlets/log-addEventListener.js)
* * *

### <a id="log-eval"></a> ⚡️ log-eval

Logs all `eval()` or `new Function()` calls to the console.

**Syntax**
```
example.org#%#//scriptlet("log-eval")
```
[Scriptlet source](../src/scriptlets/log-eval.js)
* * *

### <a id="log-setInterval"></a> ⚡️ log-setInterval

Logs all setInterval calls to the console.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#setinterval-loggerjs-

**Syntax**
```
example.org#%#//scriptlet("log-setInterval")
```
[Scriptlet source](../src/scriptlets/log-setInterval.js)
* * *

### <a id="log-setTimeout"></a> ⚡️ log-setTimeout

Logs all setTimeout call to the console.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#settimeout-loggerjs-

**Syntax**
```
example.org#%#//scriptlet("log-setTimeout")
```
[Scriptlet source](../src/scriptlets/log-setTimeout.js)
* * *

### <a id="log"></a> ⚡️ log

A simple scriptlet which only purpose is to print arguments to console.
This scriptlet can be helpful for debugging and troubleshooting other scriptlets.
**Example**
```
example.org#%#//scriptlet("log", "arg1", "arg2")
```
[Scriptlet source](../src/scriptlets/log.js)
* * *

### <a id="noeval"></a> ⚡️ noeval

Prevents page to use eval.
Notifies about attempts in the console

It is mostly used for `$redirect` rules.
See [redirect description](../wiki/about-redirects.md#noeval).

**Syntax**
```
example.org#%#//scriptlet("noeval")
```
[Scriptlet source](../src/scriptlets/noeval.js)
* * *

### <a id="nowebrtc"></a> ⚡️ nowebrtc

Disables WebRTC by overriding `RTCPeerConnection`. The overriden function will log every attempt to create a new connection.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#nowebrtcjs-

**Syntax**
```
example.org#%#//scriptlet("nowebrtc")
```
[Scriptlet source](../src/scriptlets/nowebrtc.js)
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
[Scriptlet source](../src/scriptlets/prevent-addEventListener.js)
* * *

### <a id="prevent-adfly"></a> ⚡️ prevent-adfly

Prevents anti-adblock scripts on adfly short links.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#adfly-defuserjs-

**Syntax**
```
example.org#%#//scriptlet("prevent-adfly")
```
[Scriptlet source](../src/scriptlets/prevent-adfly.js)
* * *

### <a id="prevent-bab"></a> ⚡️ prevent-bab

Prevents BlockAdblock script from detecting an ad blocker.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#bab-defuserjs-

**Syntax**
```
example.org#%#//scriptlet("prevent-bab")
```
[Scriptlet source](../src/scriptlets/prevent-bab.js)
* * *

### <a id="prevent-eval-if"></a> ⚡️ prevent-eval-if

Prevents page to use eval matching payload.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#noeval-ifjs-

**Parameters**
- `search` string or regexp matching stringified eval payload

**Examples**
```
!
```
[Scriptlet source](../src/scriptlets/prevent-eval-if.js)
* * *

### <a id="prevent-fab-3.2.0"></a> ⚡️ prevent-fab-3.2.0

Prevents execution of the FAB script v3.2.0.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#fuckadblockjs-320-

**Syntax**
```
example.org#%#//scriptlet("prevent-fab-3.2.0")
```
[Scriptlet source](../src/scriptlets/prevent-fab-3.2.0.js)
* * *

### <a id="prevent-popads-net"></a> ⚡️ prevent-popads-net

Aborts on property write (PopAds, popns), throws reference error with random id.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#popadsnetjs-

**Syntax**
```
example.org#%#//scriptlet("prevent-popads-net")
```
[Scriptlet source](../src/scriptlets/prevent-popads-net.js)
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
[Scriptlet source](../src/scriptlets/prevent-setInterval.js)
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
[Scriptlet source](../src/scriptlets/prevent-setTimeout.js)
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
[Scriptlet source](../src/scriptlets/prevent-window-open.js)
* * *

### <a id="remove-attr"></a> ⚡️ remove-attr

Removes the specified attributes from DOM notes. This scriptlet runs only once after the page load (DOMContentLoaded).

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#remove-attrjs-

**Syntax**
```
example.org#%#//scriptlet("remove-attr", attrs[, selector])
```

- `attrs` — required, attribute or list of attributes joined by '|';
- `selector` — optional, CSS selector, specifies DOM nodes from which the attributes will be removed

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
[Scriptlet source](../src/scriptlets/remove-attr.js)
* * *

### <a id="remove-class"></a> ⚡️ remove-class

Removes the specified classes from DOM notes. This scriptlet runs only once after the page load (DOMContentLoaded).

**Syntax**
```
example.org#%#//scriptlet("remove-class", classes[, selector])
```

- `classes` — required, class or list of classes separated by '|';
- `selector` — optional, CSS selector, specifies DOM nodes from which the classes will be removed;
if there is no selector, every class independently will be removed from all nodes which has one

**Examples**
1.  Removes by classes
    ```
    example.org#%#//scriptlet("remove-class", "example|test")
    ```

    ```html
    <!-- before  -->
    <div id="first" class="nice test">Some text</div>
    <div id="second" class="rare example for test">Some text</div>
    <div id="third" class="testing better example">Some text</div>

    <!-- after -->
    <div id="first" class="nice">Some text</div>
    <div id="second" class="rare for">Some text</div>
    <div id="third" class="testing better">Some text</div>
    ```

2. Removes with specified selector
    ```
    example.org#%#//scriptlet("remove-class", "branding", ".inner")
    ```

    ```html
    <!-- before -->
    <div class="wrapper true branding">
        <div class="inner bad branding">Some text</div>
    </div>

    <!-- after -->
    <div class="wrapper true branding">
        <div class="inner bad">Some text</div>
    </div>
    ```
[Scriptlet source](../src/scriptlets/remove-class.js)
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
[Scriptlet source](../src/scriptlets/remove-cookie.js)
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
        - `-1` - number value `-1`

**Examples**
```
! window.firstConst === false // this comparision will return true
example.org#%#//scriptlet("set-constant", "firstConst", "false")

! window.secondConst() === true // call to the secondConst will return true
example.org#%#//scriptlet("set-constant", "secondConst", "trueFunc")
```
[Scriptlet source](../src/scriptlets/set-constant.js)
* * *

### <a id="set-popads-dummy"></a> ⚡️ set-popads-dummy

Sets static properties PopAds and popns.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#popads-dummyjs-

**Syntax**
```
example.org#%#//scriptlet("set-popads-dummy")
```
[Scriptlet source](../src/scriptlets/set-popads-dummy.js)
* * *

