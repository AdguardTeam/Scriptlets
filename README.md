# AdGuard Scriptlets

Scriptlet is a JavaScript function that provides extended capabilities for content blocking. These functions can be used in a declarative manner in AdGuard filtering rules.

* [Syntax](#syntax)
* [Available scriptlets](#scriptlets)
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
    * [log-addEventListener](#log-addEventListener)
    * [log-setInterval](#log-setInterval)
    * [log-setTimeout](#log-setTimeout)
    * [log-eval](#log-eval)
    * [noeval](#noeval)
    * [prevent-eval-if](#prevent-eval-if)
* [Scriptlets compatibility table](#compatibility)
* [How to build](#how-to-build)

## <a id="syntax"></a> Syntax

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

## <a id="scriptlets"></a> Available scriptlets

This is a list of scriptlets supported by AdGuard. Please note, that in order to achieve cross-blocker compatibility, we also support syntax of uBO and ABP. You can check out the [compatibility table](#compatibility).

### <a id="set-constant"></a> set-constant

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

### <a id="abort-on-property-read"></a> abort-on-property-read

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

### <a id="abort-on-property-write"></a> abort-on-property-write

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

### <a id="abort-current-inline-script"></a> abort-current-inline-script

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

### <a id="prevent-setTimeout"></a> prevent-setTimeout

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

### <a id="prevent-setInterval"></a> prevent-setInterval

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

### <a id="prevent-addEventListener"></a> prevent-addEventListener

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

### <a id="prevent-window-open"></a> prevent-window-open

Prevents `window.open` calls when URL either matches or not matches the specified string/regexp. Using it without parameters prevents all `window.open` calls.

**Syntax**
```
example.org#%#//scriptlet("prevent-window-open"[, <match>[, <search>]])
```

**Parameters**
- `match` (optional) set to `Match` or `Not Match`.
- `search` (optional) string or regexp for matching the URL passed to `window.open` call.

**Example**

1. Prevent all `window.open` calls:
    ```
    example.org#%#//scriptlet("prevent-window-open")
    ```

2. Prevent `window.open` for all URLs containing `example` string:
    ```
    example.org#%#//scriptlet("prevent-window-open", 'Match', 'example')
    ```

3. Prevent `window.open` for all URLs matching `/example\./`:
    ```
    example.org#%#//scriptlet("prevent-window-open", 1, "/example\./")
    ```

4. Prevent `window.open` for all URLs **NOT** containing `example`:
    ```
    example.org#%#//scriptlet("prevent-window-open", 0, "example")
    ```

[scriptlet source](./src/scriptlets/prevent-window-open.js)

### <a id="nowebrtc"></a> nowebrtc

Disables WebRTC by overriding `RTCPeerConnection`. The overriden function will log every attempt to create a new connection.

**Syntax**
```
example.org#%#//scriptlet("nowebrtc")
```

[scriptlet source](./src/scriptlets/nowebrtc.js)

### <a id="prevent-bab"></a> prevent-bab

Prevents BlockAdblock script from detecting an ad blocker.

**Syntax**
```
example.org#%#//scriptlet("prevent-bab")
```

[scriptlet source](./src/scriptlets/prevent-bab.js)

### <a id="log-addEventListener"></a> log-addEventListener

Logs all addEventListener calls to the console

**Syntax**
```
example.org#%#//scriptlet("log-addEventListener")
```

[scriptlet source](./src/scriptlets/log-addEventListener.js)

### <a id="log-setInterval"></a> log-setInterval

Logs all setInterval calls to the console

**Syntax**
```
example.org#%#//scriptlet("log-setInterval")
```

[scriptlet source](./src/scriptlets/log-setInterval.js)

### <a id="log-setTimeout"></a> log-setTimeout

Logs all setTimeout call to the console

**Syntax**
```
example.org#%#//scriptlet("log-setTimeout")
```

[scriptlet source](./src/scriptlets/log-setTimeout.js)

### <a id="log-eval"></a> log-eval

Logs all `eval()` or `new Function()` calls to the console

**Syntax**
```
example.org#%#//scriptlet("log-eval")
```

[scriptlet source](./src/scriptlets/log-eval.js)

### <a id="noeval"></a> noeval

Prevents executing eval on the page.

**Syntax**
```
example.org#%#//scriptlet("noeval")
```

[scriptlet source](./src/scriptlets/noeval.js)

### <a id="prevent-eval-if"></a> prevent-eval-if

Prevents page to use eval matching payload

**Syntax**
```
example.org#%#//scriptlet('prevent-eval-if'[, <search>])
```

**Parameters**
- `search` (optional) string or regexp for matching the payload

**Examples**

1. Prevent all eval calls
    ```
    example.org#%#//scriptlet('prevent-eval-if')
    ```

2. Prevent eval call with payload containing 'test'
    ```
    example.org#%#//scriptlet('prevent-eval-if', 'test')
    ```

[scriptlet source](./src/scriptlets/prevent-eval-if.js)

## <a id="compatibility"></a> Sriptlets compatibility table

|AdGuard | uBO | Adblock Plus |
|--|--|--|
| [abort-current-inline-script](#abort-current-inline-script) | abort-current-inline-script.js | abort-current-inline-script |
| [abort-on-property-read](#abort-on-property-read) | abort-on-property-read.js | abort-on-property-read |
| [abort-on-property-write](#abort-on-property-write) | abort-on-property-write.js | abort-on-property-write |
| [prevent-addEventListener](#prevent-addEventListener) | addEventListener-defuser.js |  |
| [log-addEventListener](#log-addEventListener) | addEventListener-logger.js |  |
|  | cookie-remover.js |  |
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
|  | nano-setInterval-booster.js |  |
|  | nano-setTimeout-booster.js |  |
|  | sharedWorker-defuser.js (deprecated) |  |
| [prevent-window-open](#prevent-window-open) | window.open-defuser.js |  |
| [prevent-bab](#prevent-bab) | bab-defuser.js |  |
|  | fuckadblock.js-3.2.0 |  |
|  | popads-dummy.js |  |
|  | popads.net.js |  |
|  | adfly-defuser.js |  |
|  |  | hide-if-contains-image |
|  |  | hide-if-has-and-matches-style |
|  |  | dir-string |
|  |  | hide-if-contains-and-matches-style |
|  |  | hide-if-contains |
|  |  | hide-if-shadow-contains |
| [log-eval](#log-eval) |  | |



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

Run UI Unit testing
```
yarn test
```

### Build output

#### Scriplets library

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
