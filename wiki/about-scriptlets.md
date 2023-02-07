## <a id="scriptlets"></a> Available Scriptlets
* [abort-current-inline-script](#abort-current-inline-script)
* [abort-on-property-read](#abort-on-property-read)
* [abort-on-property-write](#abort-on-property-write)
* [abort-on-stack-trace](#abort-on-stack-trace)
* [adjust-setInterval](#adjust-setinterval)
* [adjust-setTimeout](#adjust-settimeout)
* [close-window](#close-window)
* [debug-current-inline-script](#debug-current-inline-script)
* [debug-on-property-read](#debug-on-property-read)
* [debug-on-property-write](#debug-on-property-write)
* [dir-string](#dir-string)
* [disable-newtab-links](#disable-newtab-links)
* [hide-in-shadow-dom](#hide-in-shadow-dom)
* [inject-css-in-shadow-dom](#inject-css-in-shadow-dom)
* [json-prune](#json-prune)
* [log-addEventListener](#log-addeventlistener)
* [log-eval](#log-eval)
* [log-on-stack-trace](#log-on-stack-trace)
* [log](#log)
* [m3u-prune](#m3u-prune)
* [no-topics](#no-topics)
* [noeval](#noeval)
* [nowebrtc](#nowebrtc)
* [prevent-addEventListener](#prevent-addeventlistener)
* [prevent-adfly](#prevent-adfly)
* [prevent-bab](#prevent-bab)
* [prevent-element-src-loading](#prevent-element-src-loading)
* [prevent-eval-if](#prevent-eval-if)
* [prevent-fab-3.2.0](#prevent-fab-3.2.0)
* [prevent-fetch](#prevent-fetch)
* [prevent-popads-net](#prevent-popads-net)
* [prevent-refresh](#prevent-refresh)
* [prevent-requestAnimationFrame](#prevent-requestanimationframe)
* [prevent-setInterval](#prevent-setinterval)
* [prevent-setTimeout](#prevent-settimeout)
* [prevent-window-open](#prevent-window-open)
* [prevent-xhr](#prevent-xhr)
* [remove-attr](#remove-attr)
* [remove-class](#remove-class)
* [remove-cookie](#remove-cookie)
* [remove-in-shadow-dom](#remove-in-shadow-dom)
* [set-attr](#set-attr)
* [set-constant](#set-constant)
* [set-cookie-reload](#set-cookie-reload)
* [set-cookie](#set-cookie)
* [set-local-storage-item](#set-local-storage-item)
* [set-popads-dummy](#set-popads-dummy)
* [set-session-storage-item](#set-session-storage-item)
* [xml-prune](#xml-prune)
* * *
### <a id="abort-current-inline-script"></a> ⚡️ abort-current-inline-script

Aborts an inline script when it attempts to **read** or **write to** the specified property
AND when the contents of the `<script>` element contains the specified
text or matches the regular expression.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#abort-current-inline-scriptjs-

Related ABP source:
https://github.com/adblockplus/adblockpluscore/blob/6b2a309054cc23432102b85d13f12559639ef495/lib/content/snippets.js#L928

**Syntax**
```
example.org#%#//scriptlet('abort-current-inline-script', property[, search])
```

- `property` - required, path to a property (joined with `.` if needed). The property must be attached to `window`
- `search` - optional, string or regular expression that must match the inline script content.
Defaults to abort all scripts which are trying to access the specified property.
Invalid regular expression will cause exit and rule will not work.

> Note please that for inline script with addEventListener in it
`property` should be set as `EventTarget.prototype.addEventListener`,
not just `addEventListener`.

**Examples**
1. Aborts all inline scripts trying to access `window.alert`
    ```
    example.org#%#//scriptlet('abort-current-inline-script', 'alert')
    ```

2. Aborts inline scripts which are trying to access `window.alert` and contain `Hello, world`.
    ```
    example.org#%#//scriptlet('abort-current-inline-script', 'alert', 'Hello, world')
    ```

    For instance, the following script will be aborted
    ```html
    <script>alert("Hello, world");</script>
    ```

3. Aborts inline scripts which are trying to access `window.alert` and match this regexp: `/Hello.+world/`.
    ```
    example.org#%#//scriptlet('abort-current-inline-script', 'alert', '/Hello.+world/')
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
example.org#%#//scriptlet('abort-on-property-read', property)
```

- `property` - required, path to a property (joined with `.` if needed). The property must be attached to `window`

**Examples**
```
! Aborts script when it tries to access `window.alert`
example.org#%#//scriptlet('abort-on-property-read', 'alert')

! Aborts script when it tries to access `navigator.language`
example.org#%#//scriptlet('abort-on-property-read', 'navigator.language')
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
example.org#%#//scriptlet('abort-on-property-write', property)
```

- `property` - required, path to a property (joined with `.` if needed). The property must be attached to `window`

**Examples**
```
! Aborts script when it tries to set `window.adblock` value
example.org#%#//scriptlet('abort-on-property-write', 'adblock')
```

[Scriptlet source](../src/scriptlets/abort-on-property-write.js)
* * *

### <a id="abort-on-stack-trace"></a> ⚡️ abort-on-stack-trace

Aborts a script when it attempts to utilize (read or write to) the specified property and it's error stack trace contains given value.

Related UBO scriptlet:
https://github.com/gorhill/uBlock-for-firefox-legacy/commit/7099186ae54e70b588d5e99554a05d783cabc8ff

**Syntax**
```
example.com#%#//scriptlet('abort-on-stack-trace', property, stack)
```

- `property` - required, path to a property. The property must be attached to window.
- `stack` - required, string that must match the current function call stack trace.
    - values to abort inline or injected script, accordingly:
        - `inlineScript`
        - `injectedScript`

**Examples**
```
! Aborts script when it tries to access `window.Ya` and it's error stack trace contains `test.js`
example.org#%#//scriptlet('abort-on-stack-trace', 'Ya', 'test.js')

! Aborts script when it tries to access `window.Ya.videoAd` and it's error stack trace contains `test.js`
example.org#%#//scriptlet('abort-on-stack-trace', 'Ya.videoAd', 'test.js')

! Aborts script when stack trace matches with any of these parameters
example.org#%#//scriptlet('abort-on-stack-trace', 'Ya', 'yandexFuncName')
example.org#%#//scriptlet('abort-on-stack-trace', 'Ya', 'yandexScriptName')

! Aborts script when it tries to access `window.Ya` and it's an inline script
example.org#%#//scriptlet('abort-on-stack-trace', 'Ya', 'inlineScript')

! Aborts script when it tries to access `window.Ya` and it's an injected script
example.org#%#//scriptlet('abort-on-stack-trace', 'Ya', 'injectedScript')
```

[Scriptlet source](../src/scriptlets/abort-on-stack-trace.js)
* * *

### <a id="adjust-setinterval"></a> ⚡️ adjust-setInterval

Adjusts delay for specified setInterval() callbacks.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#nano-setinterval-boosterjs-

**Syntax**
```
example.org#%#//scriptlet('adjust-setInterval'[, matchCallback [, matchDelay[, boost]]])
```

- `matchCallback` - optional, string or regular expression for stringified callback matching;
defaults to match all callbacks; invalid regular expression will cause exit and rule will not work
- `matchDelay` - optional, defaults to 1000, matching setInterval delay; decimal integer OR '*' for any delay
- `boost` - optional, default to 0.05, float, capped at 50 times for up and down (0.02...50), setInterval delay multiplier

**Examples**
1. Adjust all setInterval() x20 times where delay equal 1000ms:
    ```
    example.org#%#//scriptlet('adjust-setInterval')
    ```

2. Adjust all setInterval() x20 times where callback matched with `example` and delay equal 1000ms
    ```
    example.org#%#//scriptlet('adjust-setInterval', 'example')
    ```

3. Adjust all setInterval() x20 times where callback matched with `example` and delay equal 400ms
    ```
    example.org#%#//scriptlet('adjust-setInterval', 'example', '400')
    ```

4. Slow down setInterval() x2 times where callback matched with `example` and delay equal 1000ms
    ```
    example.org#%#//scriptlet('adjust-setInterval', 'example', '', '2')
    ```
5. Adjust all setInterval() x50 times where delay equal 2000ms
    ```
    example.org#%#//scriptlet('adjust-setInterval', '', '2000', '0.02')
    ```
6. Adjust all setInterval() x50 times where delay is randomized
    ```
    example.org#%#//scriptlet('adjust-setInterval', '', '*', '0.02')
    ```

[Scriptlet source](../src/scriptlets/adjust-setInterval.js)
* * *

### <a id="adjust-settimeout"></a> ⚡️ adjust-setTimeout

Adjusts delay for specified setTimeout() callbacks.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#nano-settimeout-boosterjs-

**Syntax**
```
example.org#%#//scriptlet('adjust-setTimeout'[, matchCallback [, matchDelay[, boost]]])
```

- `matchCallback` - optional, string or regular expression for stringified callback matching;
defaults to match all callbacks; invalid regular expression will cause exit and rule will not work
- `matchDelay` - optional, defaults to 1000, matching setTimeout delay; decimal integer OR '*' for any delay
- `boost` - optional, default to 0.05, float, capped at 50 times for up and down (0.02...50), setTimeout delay multiplier

**Examples**
1. Adjust all setTimeout() x20 times where timeout equal 1000ms:
    ```
    example.org#%#//scriptlet('adjust-setTimeout')
    ```

2. Adjust all setTimeout() x20 times where callback matched with `example` and timeout equal 1000ms
    ```
    example.org#%#//scriptlet('adjust-setTimeout', 'example')
    ```

3. Adjust all setTimeout() x20 times where callback matched with `example` and timeout equal 400ms
    ```
    example.org#%#//scriptlet('adjust-setTimeout', 'example', '400')
    ```

4. Slow down setTimeout() x2 times where callback matched with `example` and timeout equal 1000ms
    ```
    example.org#%#//scriptlet('adjust-setTimeout', 'example', '', '2')
    ```
5. Adjust all setTimeout() x50 times where timeout equal 2000ms
    ```
    example.org#%#//scriptlet('adjust-setTimeout', '', '2000', '0.02')
    ```
6. Adjust all setTimeout() x20 times where callback matched with `test` and timeout is randomized
    ```
    example.org#%#//scriptlet('adjust-setTimeout', 'test', '*')
    ```

[Scriptlet source](../src/scriptlets/adjust-setTimeout.js)
* * *

### <a id="close-window"></a> ⚡️ close-window

Closes the browser tab immediately.

> `window.close()` usage is restricted in Chrome. In this case
tab will only be closed when using AdGuard browser extension.

**Syntax**
```
example.org#%#//scriptlet('close-window'[, path])
```

- `path` — optional, string or regular expression
matching the current location's path: `window.location.pathname` + `window.location.search`.
Defaults to execute on every page.

**Examples**
```
! closes any example.org tab
example.org#%#//scriptlet('close-window')

! closes specific example.org tab
example.org#%#//scriptlet('close-window', '/example-page.html')
```

[Scriptlet source](../src/scriptlets/close-window.js)
* * *

### <a id="debug-current-inline-script"></a> ⚡️ debug-current-inline-script

This scriptlet is basically the same as [abort-current-inline-script](#abort-current-inline-script), but instead of aborting it starts the debugger.

**It is not supposed to be used in production filter lists!**

**Syntax**
```
! Aborts script when it tries to access `window.alert`
example.org#%#//scriptlet('debug-current-inline-script', 'alert')
```

[Scriptlet source](../src/scriptlets/debug-current-inline-script.js)
* * *

### <a id="debug-on-property-read"></a> ⚡️ debug-on-property-read

This scriptlet is basically the same as [abort-on-property-read](#abort-on-property-read), but instead of aborting it starts the debugger.

**It is not supposed to be used in production filter lists!**

**Syntax**
```
! Debug script if it tries to access `window.alert`
example.org#%#//scriptlet('debug-on-property-read', 'alert')
! of `window.open`
example.org#%#//scriptlet('debug-on-property-read', 'open')
```

[Scriptlet source](../src/scriptlets/debug-on-property-read.js)
* * *

### <a id="debug-on-property-write"></a> ⚡️ debug-on-property-write

This scriptlet is basically the same as [abort-on-property-write](#abort-on-property-write), but instead of aborting it starts the debugger.

**It is not supposed to be used in production filter lists!**

**Syntax**
```
! Aborts script when it tries to write in property `window.test`
example.org#%#//scriptlet('debug-on-property-write', 'test')
```

[Scriptlet source](../src/scriptlets/debug-on-property-write.js)
* * *

### <a id="dir-string"></a> ⚡️ dir-string

Wraps the `console.dir` API to call the `toString` method of the argument.
There are several adblock circumvention systems that detect browser devtools
and hide themselves. Therefore, if we force them to think
that devtools are open (using this scriptlet),
it will automatically disable the adblock circumvention script.

Related ABP source:
https://github.com/adblockplus/adblockpluscore/blob/6b2a309054cc23432102b85d13f12559639ef495/lib/content/snippets.js#L766

**Syntax**
```
example.org#%#//scriptlet('dir-string'[, times])
```
- `times` - optional, the number of times to call the `toString` method of the argument to `console.dir`

**Example**
```
! Run 2 times
example.org#%#//scriptlet('dir-string', '2')
```

[Scriptlet source](../src/scriptlets/dir-string.js)
* * *

### <a id="disable-newtab-links"></a> ⚡️ disable-newtab-links

Prevents opening new tabs and windows if there is `target` attribute in element.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#disable-newtab-linksjs-

**Syntax**
```
example.org#%#//scriptlet('disable-newtab-links')
```

[Scriptlet source](../src/scriptlets/disable-newtab-links.js)
* * *

### <a id="hide-in-shadow-dom"></a> ⚡️ hide-in-shadow-dom

Hides elements inside open shadow DOM elements.

**Syntax**
```
example.org#%#//scriptlet('hide-in-shadow-dom', selector[, baseSelector])
```

- `selector` — required, CSS selector of element in shadow-dom to hide
- `baseSelector` — optional, selector of specific page DOM element,
narrows down the part of the page DOM where shadow-dom host supposed to be,
defaults to document.documentElement

> `baseSelector` should match element of the page DOM, but not of shadow DOM

**Examples**
```
! hides menu bar
virustotal.com#%#//scriptlet('hide-in-shadow-dom', 'iron-pages', 'vt-virustotal-app')

! hides floating element
virustotal.com#%#//scriptlet('hide-in-shadow-dom', 'vt-ui-contact-fab')
```

[Scriptlet source](../src/scriptlets/hide-in-shadow-dom.js)
* * *

### <a id="inject-css-in-shadow-dom"></a> ⚡️ inject-css-in-shadow-dom

Injects CSS rule into selected Shadow DOM subtrees on a page

**Syntax**
```
example.org#%#//scriptlet('inject-css-in-shadow-dom', cssRule[, hostSelector])
```

- `cssRule` - required, string representing a single css rule
- `hostSelector` - optional, string, selector to match shadow host elements. CSS rule will be only applied to shadow roots inside these elements.
Defaults to injecting css rule into all available roots.

**Examples**
1. Apply style to all shadow dom subtrees
```
example.org#%#//scriptlet('inject-css-in-shadow-dom', '#advertisement { display: none !important; }')
```

2. Apply style to a specific shadow dom subtree
```
example.org#%#//scriptlet('inject-css-in-shadow-dom', '#content { margin-top: 0 !important; }', '.row > #hidden')
```

[Scriptlet source](../src/scriptlets/inject-css-in-shadow-dom.js)
* * *

### <a id="json-prune"></a> ⚡️ json-prune

Removes specified properties from the result of calling JSON.parse and returns the caller

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#json-prunejs-

Related ABP source:
https://github.com/adblockplus/adblockpluscore/blob/master/lib/content/snippets.js#L1285

**Syntax**
```
example.org#%#//scriptlet('json-prune'[, propsToRemove [, obligatoryProps [, stack]]])
```

- `propsToRemove` - optional, string of space-separated properties to remove
- `obligatoryProps` - optional, string of space-separated properties which must be all present for the pruning to occur
- `stack` - optional, string or regular expression that must match the current function call stack trace;
if regular expression is invalid it will be skipped

> Note please that you can use wildcard `*` for chain property name.
e.g. 'ad.*.src' instead of 'ad.0.src ad.1.src ad.2.src ...'

**Examples**
1. Removes property `example` from the results of JSON.parse call
    ```
    example.org#%#//scriptlet('json-prune', 'example')
    ```

    For instance, the following call will return `{ one: 1}`

    ```html
    JSON.parse('{"one":1,"example":true}')
    ```

2. If there are no specified properties in the result of JSON.parse call, pruning will NOT occur
    ```
    example.org#%#//scriptlet('json-prune', 'one', 'obligatoryProp')
    ```

    For instance, the following call will return `{ one: 1, two: 2}`

    ```html
    JSON.parse('{"one":1,"two":2}')
    ```

3. A property in a list of properties can be a chain of properties

    ```
    example.org#%#//scriptlet('json-prune', 'a.b', 'adpath.url.first')
    ```

4. Removes property `content.ad` from the results of JSON.parse call if its error stack trace contains `test.js`
    ```
    example.org#%#//scriptlet('json-prune', 'content.ad', '', 'test.js')
    ```

5. A property in a list of properties can be a chain of properties with wildcard in it

    ```
    example.org#%#//scriptlet('json-prune', 'content.*.media.src', 'content.*.media.preroll')
    ```

6. Call with no arguments will log the current hostname and json payload at the console
    ```
    example.org#%#//scriptlet('json-prune')
    ```

7. Call with only second argument will log the current hostname and matched json payload at the console
    ```
    example.org#%#//scriptlet('json-prune', '', '"id":"117458"')
    ```

[Scriptlet source](../src/scriptlets/json-prune.js)
* * *

### <a id="log-addeventlistener"></a> ⚡️ log-addEventListener

Logs all addEventListener calls to the console.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#addeventlistener-loggerjs-

**Syntax**
```
example.org#%#//scriptlet('log-addEventListener')
```

[Scriptlet source](../src/scriptlets/log-addEventListener.js)
* * *

### <a id="log-eval"></a> ⚡️ log-eval

Logs all `eval()` or `new Function()` calls to the console.

**Syntax**
```
example.org#%#//scriptlet('log-eval')
```

[Scriptlet source](../src/scriptlets/log-eval.js)
* * *

### <a id="log-on-stack-trace"></a> ⚡️ log-on-stack-trace

This scriptlet is basically the same as [abort-on-stack-trace](#abort-on-stack-trace), but instead of aborting it logs:
- function and source script names pairs that access the given property
- was that get or set attempt
- script being injected or inline

**Syntax**
```
example.com#%#//scriptlet('log-on-stack-trace', 'property')
```

- `property` - required, path to a property. The property must be attached to window.

[Scriptlet source](../src/scriptlets/log-on-stack-trace.js)
* * *

### <a id="log"></a> ⚡️ log

A simple scriptlet which only purpose is to print arguments to console.
This scriptlet can be helpful for debugging and troubleshooting other scriptlets.

**Example**
```
example.org#%#//scriptlet('log', 'arg1', 'arg2')
```

[Scriptlet source](../src/scriptlets/log.js)
* * *

### <a id="m3u-prune"></a> ⚡️ m3u-prune

Removes content from the specified M3U file.


**Syntax**
```
example.org#%#//scriptlet('m3u-prune'[, propsToRemove[, urlToMatch[, optionalRegExp]]])
```

- `propsToRemove` - required, selector of elements which will be removed from M3U file
- `urlToMatch` - optional, string or regular expression for matching the request's URL
- `optionalRegExp` - optional, string or regular expression for matching a content which will be removed from response

**Examples**
1. Removes a tag which contains `tvessaiprod.nbcuni.com/video/`, from all requests
    ```
    example.org#%#//scriptlet('m3u-prune', 'tvessaiprod.nbcuni.com/video/')
    ```

2. Removes a tag which contains `tvessaiprod.nbcuni.com/video/`, only if request's URL contains `.m3u8`
    ```
    example.org#%#//scriptlet('m3u-prune', 'tvessaiprod.nbcuni.com/video/', '.m3u8')
    ```

2. Removes everything from response what is matched by RegExp, only if request's URL contains `.m3u8`
    ```
    example.org#%#//scriptlet('m3u-prune', 'VMAP-AD', '.m3u8', '/#EXTINF:.*\\n.*tvessaiprod\\.nbcuni\\.com\\/video\\/[\\s\\S]*?#EXT-X-DISCONTINUITY|#EXT-X-VMAP-AD-BREAK[\\s\\S]*?#EXT-X-ENDLIST/')
    ```

[Scriptlet source](../src/scriptlets/m3u-prune.js)
* * *

### <a id="no-topics"></a> ⚡️ no-topics

Prevents using The Topics API
https://developer.chrome.com/docs/privacy-sandbox/topics/

**Syntax**
```
example.org#%#//scriptlet('no-topics')
```

[Scriptlet source](../src/scriptlets/no-topics.js)
* * *

### <a id="noeval"></a> ⚡️ noeval

Prevents page to use eval.
Notifies about attempts in the console

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#noevaljs-

It also can be used as `$redirect` rules sometimes.
See [redirect description](../wiki/about-redirects.md#noeval).

**Syntax**
```
example.org#%#//scriptlet('noeval')
```

[Scriptlet source](../src/scriptlets/noeval.js)
* * *

### <a id="nowebrtc"></a> ⚡️ nowebrtc

Disables WebRTC by overriding `RTCPeerConnection`. The overridden function will log every attempt to create a new connection.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#nowebrtcjs-

**Syntax**
```
example.org#%#//scriptlet('nowebrtc')
```

[Scriptlet source](../src/scriptlets/nowebrtc.js)
* * *

### <a id="prevent-addeventlistener"></a> ⚡️ prevent-addEventListener

Prevents adding event listeners for the specified events and callbacks.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#addeventlistener-defuserjs-

**Syntax**
```
example.org#%#//scriptlet('prevent-addEventListener'[, typeSearch[, listenerSearch]])
```

- `typeSearch` - optional, string or regular expression matching the type (event name);
defaults to match all types; invalid regular expression will cause exit and rule will not work
- `listenerSearch` - optional, string or regular expression matching the listener function body;
defaults to match all listeners; invalid regular expression will cause exit and rule will not work

**Examples**
1. Prevent all `click` listeners:
    ```
    example.org#%#//scriptlet('prevent-addEventListener', 'click')
    ```

2. Prevent 'click' listeners with the callback body containing `searchString`.
    ```
    example.org#%#//scriptlet('prevent-addEventListener', 'click', 'searchString')
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
example.org#%#//scriptlet('prevent-adfly')
```

[Scriptlet source](../src/scriptlets/prevent-adfly.js)
* * *

### <a id="prevent-bab"></a> ⚡️ prevent-bab

Prevents BlockAdblock script from detecting an ad blocker.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#bab-defuserjs-

It also can be used as `$redirect` sometimes.
See [redirect description](../wiki/about-redirects.md#prevent-bab).

**Syntax**
```
example.org#%#//scriptlet('prevent-bab')
```

[Scriptlet source](../src/scriptlets/prevent-bab.js)
* * *

### <a id="prevent-element-src-loading"></a> ⚡️ prevent-element-src-loading

Prevents target element source loading without triggering 'onerror' listeners and not breaking 'onload' ones.

**Syntax**
```
example.org#%#//scriptlet('prevent-element-src-loading', tagName, match)
```

- `tagName` - required, case-insensitive target element tagName which `src` property resource loading will be silently prevented; possible values:
    - `script`
    - `img`
    - `iframe`
- `match` - required, string or regular expression for matching the element's URL;

**Examples**
1. Prevent script source loading:
```
    example.org#%#//scriptlet('prevent-element-src-loading', 'script' ,'adsbygoogle')
```

[Scriptlet source](../src/scriptlets/prevent-element-src-loading.js)
* * *

### <a id="prevent-eval-if"></a> ⚡️ prevent-eval-if

Prevents page to use eval matching payload.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#noeval-ifjs-

**Syntax**
```
example.org#%#//scriptlet('prevent-eval-if'[, search])
```

- `search` - optional, string or regular expression matching the stringified eval payload;
defaults to match all stringified eval payloads;
invalid regular expression will cause exit and rule will not work

**Examples**
```
! Prevents eval if it matches 'test'
example.org#%#//scriptlet('prevent-eval-if', 'test')
```

[Scriptlet source](../src/scriptlets/prevent-eval-if.js)
* * *

### <a id="prevent-fab-3.2.0"></a> ⚡️ prevent-fab-3.2.0

Prevents execution of the FAB script v3.2.0.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#fuckadblockjs-320-

**Syntax**
```
example.org#%#//scriptlet('prevent-fab-3.2.0')
```

[Scriptlet source](../src/scriptlets/prevent-fab-3.2.0.js)
* * *

### <a id="prevent-fetch"></a> ⚡️ prevent-fetch

Prevents `fetch` calls if **all** given parameters match

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#no-fetch-ifjs-

**Syntax**
```
example.org#%#//scriptlet('prevent-fetch'[, propsToMatch[, responseBody[, responseType]]])
```

- `propsToMatch` - optional, string of space-separated properties to match; possible props:
  - string or regular expression for matching the URL passed to fetch call; empty string, wildcard `*` or invalid regular expression will match all fetch calls
  - colon-separated pairs `name:value` where
    - `name` is [`init` option name](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters)
    - `value` is string or regular expression for matching the value of the option passed to fetch call; invalid regular expression will cause any value matching
- responseBody - optional, string for defining response body value, defaults to `emptyObj`. Possible values:
   - `emptyObj` - empty object
   - `emptyArr` - empty array
- responseType - optional, string for defining response type, defaults to `default`. Possible values:
   - default
   - opaque

> Usage with no arguments will log fetch calls to browser console;
which is useful for debugging but not permitted for production filter lists.

**Examples**
1. Log all fetch calls
    ```
    example.org#%#//scriptlet('prevent-fetch')
    ```

2. Prevent all fetch calls
    ```
    example.org#%#//scriptlet('prevent-fetch', '*')
    OR
    example.org#%#//scriptlet('prevent-fetch', '')
    ```

3. Prevent fetch call for specific url
    ```
    example.org#%#//scriptlet('prevent-fetch', '/url\\.part/')
    ```

4. Prevent fetch call for specific request method
    ```
    example.org#%#//scriptlet('prevent-fetch', 'method:HEAD')
    ```

5. Prevent fetch call for specific url and request method
    ```
    example.org#%#//scriptlet('prevent-fetch', '/specified_url_part/ method:/HEAD|GET/')
    ```

6. Prevent fetch call and specify response body value
    ```
    ! Specify response body for fetch call to a specific url
    example.org#%#//scriptlet('prevent-fetch', '/specified_url_part/ method:/HEAD|GET/', 'emptyArr')

    ! Specify response body for all fetch calls
    example.org#%#//scriptlet('prevent-fetch', '', 'emptyArr')
    ```

7. Prevent all fetch calls and specify response type value
    ```
    example.org#%#//scriptlet('prevent-fetch', '*', '', 'opaque')
    ```

[Scriptlet source](../src/scriptlets/prevent-fetch.js)
* * *

### <a id="prevent-popads-net"></a> ⚡️ prevent-popads-net

Aborts on property write (PopAds, popns), throws reference error with random id.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#popadsnetjs-

**Syntax**
```
example.org#%#//scriptlet('prevent-popads-net')
```

[Scriptlet source](../src/scriptlets/prevent-popads-net.js)
* * *

### <a id="prevent-refresh"></a> ⚡️ prevent-refresh

Prevents reloading of a document through a meta "refresh" tag.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#refresh-defuserjs-

**Syntax**
```
example.org#%#//scriptlet('prevent-refresh'[, delay])
```

- `delay` - optional, number of seconds for delay that indicates when scriptlet should run. If not set, source tag value will be applied.

**Examples**
1. Prevent reloading of a document through a meta "refresh" tag.
```
    enrt.eu#%#//scriptlet('prevent-refresh')
```

2. Prevent reloading of a document with delay.
```
    cryptodirectories.com#%#//scriptlet('prevent-refresh', 3)
```

[Scriptlet source](../src/scriptlets/prevent-refresh.js)
* * *

### <a id="prevent-requestanimationframe"></a> ⚡️ prevent-requestAnimationFrame

Prevents a `requestAnimationFrame` call
if the text of the callback is matching the specified search string which does not start with `!`;
otherwise mismatched calls should be defused.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#no-requestanimationframe-ifjs-

**Syntax**
```
example.org#%#//scriptlet('prevent-requestAnimationFrame'[, search])
```

- `search` - optional, string or regular expression; invalid regular expression will be skipped and all callbacks will be matched.
If starts with `!`, scriptlet will not match the stringified callback but all other will be defused.
If do not start with `!`, the stringified callback will be matched.

Call with no argument will log all requestAnimationFrame calls while debugging.
So do not use the scriptlet without any parameter in production filter lists.

**Examples**
1. Prevents `requestAnimationFrame` calls if the callback matches `/\.test/`.
    ```bash
    example.org#%#//scriptlet('prevent-requestAnimationFrame', '/\.test/')
    ```

    For instance, the following call will be prevented:
    ```javascript
    var times = 0;
    requestAnimationFrame(function change() {
        window.test = 'new value';
        if (times < 2) {
            times += 1;
            requestAnimationFrame(change);
        }
    });
    ```
2. Prevents `requestAnimationFrame` calls if **does not match** 'check'.
    ```bash
    example.org#%#//scriptlet('prevent-requestAnimationFrame', '!check')
    ```

    For instance, only the first call will be prevented:

    ```javascript
    var timesFirst = 0;
    requestAnimationFrame(function changeFirst() {
        window.check = 'should not be prevented';
        if (timesFirst < 2) {
            timesFirst += 1;
            requestAnimationFrame(changeFirst);
        }
    });

    var timesSecond = 0;
    requestAnimationFrame(function changeSecond() {
        window.second = 'should be prevented';
        if (timesSecond < 2) {
            timesSecond += 1;
            requestAnimationFrame(changeSecond);
        }
    });
    ```

[Scriptlet source](../src/scriptlets/prevent-requestAnimationFrame.js)
* * *

### <a id="prevent-setinterval"></a> ⚡️ prevent-setInterval

Prevents a `setInterval` call if:
1) the text of the callback is matching the specified `matchCallback` string/regexp which does not start with `!`;
otherwise mismatched calls should be defused;
2) the delay is matching the specified `matchDelay`; otherwise mismatched calls should be defused.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#no-setinterval-ifjs-

**Syntax**
```
example.org#%#//scriptlet('prevent-setInterval'[, matchCallback[, matchDelay]])
```

Call with no arguments will log calls to setInterval while debugging (`log-setInterval` superseding),
so production filter lists' rules definitely require at least one of the parameters:
- `matchCallback` - optional, string or regular expression; invalid regular expression will be skipped and all callbacks will be matched.
If starts with `!`, scriptlet will not match the stringified callback but all other will be defused.
If do not start with `!`, the stringified callback will be matched.
If not set, prevents all `setInterval` calls due to specified `matchDelay`.
- `matchDelay` - optional, must be an integer.
If starts with `!`, scriptlet will not match the delay but all other will be defused.
If do not start with `!`, the delay passed to the `setInterval` call will be matched.
Decimal delay values will be rounded down, e.g `10.95` will be matched by `matchDelay` with value `10`.

> If `prevent-setInterval` log looks like `setInterval(undefined, 1000)`,
it means that no callback was passed to setInterval() and that's not scriptlet issue
and obviously it can not be matched by `matchCallback`.

 **Examples**
1. Prevents `setInterval` calls if the callback matches `/\.test/` regardless of the delay.
    ```bash
    example.org#%#//scriptlet('prevent-setInterval', '/\.test/')
    ```

    For instance, the following call will be prevented:
    ```javascript
    setInterval(function () {
        window.test = "value";
    }, 100);
    ```

2. Prevents `setInterval` calls if the callback does not contain `value`.
    ```
    example.org#%#//scriptlet('prevent-setInterval', '!value')
    ```

    For instance, only the first of the following calls will be prevented:
    ```javascript
    setInterval(function () {
        window.test = "test -- prevented";
    }, 300);
    setInterval(function () {
        window.test = "value -- executed";
    }, 400);
    setInterval(function () {
        window.value = "test -- executed";
    }, 500);
    ```

3. Prevents `setInterval` calls if the callback contains `value` and the delay is not set to `300`.
    ```
    example.org#%#//scriptlet('prevent-setInterval', 'value', '!300')
    ```

    For instance, only the first of the following calls will not be prevented:
    ```javascript
    setInterval(function () {
        window.test = "value 1 -- executed";
    }, 300);
    setInterval(function () {
        window.test = "value 2 -- prevented";
    }, 400);
    setInterval(function () {
        window.test = "value 3 -- prevented";
    }, 500);
    ```

4. Prevents `setInterval` calls if the callback does not contain `value` and the delay is not set to `300`.
    ```
    example.org#%#//scriptlet('prevent-setInterval', '!value', '!300')
    ```

    For instance, only the second of the following calls will be prevented:
    ```javascript
    setInterval(function () {
        window.test = "test -- executed";
    }, 300);
    setInterval(function () {
        window.test = "test -- prevented";
    }, 400);
    setInterval(function () {
        window.test = "value -- executed";
    }, 400);
    setInterval(function () {
        window.value = "test -- executed";
    }, 500);
    ```

5. Prevents `setInterval` calls if the callback contains `value` and delay is a decimal.
    ```
    example.org#%#//scriptlet('prevent-setInterval', 'value', '300')
    ```

    For instance, the following calls will be prevented:
    ```javascript
    setInterval(function () {
        window.test = "value";
    }, 300);
    setInterval(function () {
        window.test = "value";
    }, 300 + Math.random());
    ```

[Scriptlet source](../src/scriptlets/prevent-setInterval.js)
* * *

### <a id="prevent-settimeout"></a> ⚡️ prevent-setTimeout

Prevents a `setTimeout` call if:
1) the text of the callback is matching the specified `matchCallback` string/regexp which does not start with `!`;
otherwise mismatched calls should be defused;
2) the delay is matching the specified `matchDelay`; otherwise mismatched calls should be defused.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#no-settimeout-ifjs-

**Syntax**
```
example.org#%#//scriptlet('prevent-setTimeout'[, matchCallback[, matchDelay]])
```

Call with no arguments will log calls to setTimeout while debugging (`log-setTimeout` superseding),
so production filter lists' rules definitely require at least one of the parameters:
- `matchCallback` - optional, string or regular expression; invalid regular expression will be skipped and all callbacks will be matched.
If starts with `!`, scriptlet will not match the stringified callback but all other will be defused.
If do not start with `!`, the stringified callback will be matched.
If not set, prevents all `setTimeout` calls due to specified `matchDelay`.
- `matchDelay` - optional, must be an integer.
If starts with `!`, scriptlet will not match the delay but all other will be defused.
If do not start with `!`, the delay passed to the `setTimeout` call will be matched.
Decimal delay values will be rounded down, e.g `10.95` will be matched by `matchDelay` with value `10`.

> If `prevent-setTimeout` log looks like `setTimeout(undefined, 1000)`,
it means that no callback was passed to setTimeout() and that's not scriptlet issue
and obviously it can not be matched by `matchCallback`.

**Examples**
1. Prevents `setTimeout` calls if the callback matches `/\.test/` regardless of the delay.
    ```bash
    example.org#%#//scriptlet('prevent-setTimeout', '/\.test/')
    ```

    For instance, the following call will be prevented:
    ```javascript
    setTimeout(function () {
        window.test = "value";
    }, 100);
    ```

2. Prevents `setTimeout` calls if the callback does not contain `value`.
    ```
    example.org#%#//scriptlet('prevent-setTimeout', '!value')
    ```

    For instance, only the first of the following calls will be prevented:
    ```javascript
    setTimeout(function () {
        window.test = "test -- prevented";
    }, 300);
    setTimeout(function () {
        window.test = "value -- executed";
    }, 400);
    setTimeout(function () {
        window.value = "test -- executed";
    }, 500);
    ```

3. Prevents `setTimeout` calls if the callback contains `value` and the delay is not set to `300`.
    ```
    example.org#%#//scriptlet('prevent-setTimeout', 'value', '!300')
    ```

    For instance, only the first of the following calls will not be prevented:
    ```javascript
    setTimeout(function () {
        window.test = "value 1 -- executed";
    }, 300);
    setTimeout(function () {
        window.test = "value 2 -- prevented";
    }, 400);
    setTimeout(function () {
        window.test = "value 3 -- prevented";
    }, 500);
    ```

4. Prevents `setTimeout` calls if the callback does not contain `value` and the delay is not set to `300`.
    ```
    example.org#%#//scriptlet('prevent-setTimeout', '!value', '!300')
    ```

    For instance, only the second of the following calls will be prevented:
    ```javascript
    setTimeout(function () {
        window.test = "test -- executed";
    }, 300);
    setTimeout(function () {
        window.test = "test -- prevented";
    }, 400);
    setTimeout(function () {
        window.test = "value -- executed";
    }, 400);
    setTimeout(function () {
        window.value = "test -- executed";
    }, 500);
    ```

5. Prevents `setTimeout` calls if the callback contains `value` and delay is a decimal.
    ```
    example.org#%#//scriptlet('prevent-setTimeout', 'value', '300')
    ```

    For instance, the following calls will be prevented:
    ```javascript
    setTimeout(function () {
        window.test = "value";
    }, 300);
    setTimeout(function () {
        window.test = "value";
    }, 300 + Math.random());
    ```

[Scriptlet source](../src/scriptlets/prevent-setTimeout.js)
* * *

### <a id="prevent-window-open"></a> ⚡️ prevent-window-open

Prevents `window.open` calls when URL either matches or not matches the specified string/regexp. Using it without parameters prevents all `window.open` calls.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#windowopen-defuserjs-

**Syntax**
```
example.org#%#//scriptlet('prevent-window-open'[, match[, delay[, replacement]]])
```

- `match` - optional, string or regular expression. If not set or regular expression is invalid, all window.open calls will be matched.
If starts with `!`, scriptlet will not match the stringified callback but all other will be defused.
If do not start with `!`, the stringified callback will be matched.
- `delay` - optional, number of seconds. If not set, scriptlet will return `null`,
otherwise valid sham window object as injected `iframe` will be returned
for accessing its methods (blur(), focus() etc.) and will be removed after the delay.
- `replacement` - optional, string; one of the predefined constants:
    - `obj` - for returning an object instead of default iframe;
       for cases when the page requires a valid `window` instance to be returned
    - `log` - for logging window.open calls; permitted for production filter lists.

**Examples**
1. Prevent all `window.open` calls:
    ```
    example.org#%#//scriptlet('prevent-window-open')
    ```

2. Prevent `window.open` for all URLs containing `example`:
    ```
    example.org#%#//scriptlet('prevent-window-open', 'example')
    ```

3. Prevent `window.open` for all URLs matching RegExp `/example\./`:
    ```
    example.org#%#//scriptlet('prevent-window-open', '/example\./')
    ```

4. Prevent `window.open` for all URLs **NOT** containing `example`:
    ```
    example.org#%#//scriptlet('prevent-window-open', '!example')
    ```

Old syntax of prevent-window-open parameters:
- `match` - optional, defaults to "matching", any positive number or nothing for "matching", 0 or empty string for "not matching"
- `search` - optional, string or regexp for matching the URL passed to `window.open` call; defaults to search all `window.open` call
- `replacement` - optional, string to return prop value or property instead of window.open; defaults to return noopFunc.
**Examples**
    ```
    example.org#%#//scriptlet('prevent-window-open', '1', '/example\./')
    example.org#%#//scriptlet('prevent-window-open', '0', 'example')
    example.org#%#//scriptlet('prevent-window-open', '', '', 'trueFunc')
    example.org#%#//scriptlet('prevent-window-open', '1', '', '{propName=noopFunc}')
    ```

> For better compatibility with uBO, old syntax is not recommended to use.

[Scriptlet source](../src/scriptlets/prevent-window-open.js)
* * *

### <a id="prevent-xhr"></a> ⚡️ prevent-xhr

Prevents `xhr` calls if **all** given parameters match.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#no-xhr-ifjs-

**Syntax**
```
example.org#%#//scriptlet('prevent-xhr'[, propsToMatch[, randomize]])
```

- propsToMatch - optional, string of space-separated properties to match; possible props:
  - string or regular expression for matching the URL passed to `.open()` call; empty string or wildcard * for all `.open()` calls match
  - colon-separated pairs name:value where
    - name is XMLHttpRequest object property name
    - value is string or regular expression for matching the value of the option passed to `.open()` call
- randomize - defaults to `false` for empty responseText, optional argument to randomize responseText of matched XMLHttpRequest's response; possible values:
  - boolean 'true' to randomize responseText, random alphanumeric string of 10 symbols
  - string value to customize responseText data, colon-separated pairs name:value where
      - name — only `length` supported for now
      - value — range on numbers, for example `100-300`, limited to 500000 characters

> Usage with no arguments will log XMLHttpRequest objects to browser console;
which is useful for debugging but not allowed for production filter lists.

**Examples**
1. Log all XMLHttpRequests
    ```
    example.org#%#//scriptlet('prevent-xhr')
    ```

2. Prevent all XMLHttpRequests
    ```
    example.org#%#//scriptlet('prevent-xhr', '*')
    example.org#%#//scriptlet('prevent-xhr', '')
    ```

3. Prevent XMLHttpRequests for specific url
    ```
    example.org#%#//scriptlet('prevent-xhr', 'example.org')
    ```

4. Prevent XMLHttpRequests for specific request method
    ```
    example.org#%#//scriptlet('prevent-xhr', 'method:HEAD')
    ```

5. Prevent XMLHttpRequests for specific url and specified request methods
    ```
    example.org#%#//scriptlet('prevent-xhr', 'example.org method:/HEAD|GET/')
    ```

6. Prevent XMLHttpRequests for specific url and randomize it's response text
    ```
    example.org#%#//scriptlet('prevent-xhr', 'example.org', 'true')
    ```

7. Prevent XMLHttpRequests for specific url and randomize it's response text with range
    ```
   example.org#%#//scriptlet('prevent-xhr', 'example.org', 'length:100-300')
    ```

[Scriptlet source](../src/scriptlets/prevent-xhr.js)
* * *

### <a id="remove-attr"></a> ⚡️ remove-attr

Removes the specified attributes from DOM nodes. This scriptlet runs once when the page loads
and after that periodically in order to DOM tree changes by default,
or as specified by applying argument.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#remove-attrjs-

**Syntax**
```
example.org#%#//scriptlet('remove-attr', attrs[, selector, applying])
```

- `attrs` — required, attribute or list of attributes joined by '|'
- `selector` — optional, CSS selector, specifies DOM nodes from which the attributes will be removed
- `applying` — optional, one or more space-separated flags that describe the way scriptlet apply, defaults to 'asap stay'; possible flags:
    - `asap` — runs as fast as possible **once**
    - `complete` — runs **once** after the whole page has been loaded
    - `stay` — as fast as possible **and** stays on the page observing possible DOM changes

**Examples**
1.  Removes by attribute
    ```
    example.org#%#//scriptlet('remove-attr', 'example|test')
    ```

    ```html
    <!-- before  -->
    <div example="true" test="true">Some text</div>

    <!-- after -->
    <div>Some text</div>
    ```

2. Removes with specified selector
    ```
    example.org#%#//scriptlet('remove-attr', 'example', 'div[class="inner"]')
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

 3. Using flags
    ```
    example.org#%#//scriptlet('remove-attr', 'example', 'html', 'asap complete')
    ```

[Scriptlet source](../src/scriptlets/remove-attr.js)
* * *

### <a id="remove-class"></a> ⚡️ remove-class

Removes the specified classes from DOM nodes. This scriptlet runs once after the page loads
and after that periodically in order to DOM tree changes.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#remove-classjs-

**Syntax**
```
example.org#%#//scriptlet('remove-class', classes[, selector, applying])
```

- `classes` — required, class or list of classes separated by '|'
- `selector` — optional, CSS selector, specifies DOM nodes from which the classes will be removed.
If there is no `selector`, each class of `classes` independently will be removed from all nodes which has one
- `applying` — optional, one or more space-separated flags that describe the way scriptlet apply, defaults to 'asap stay'; possible flags:
    - `asap` — runs as fast as possible **once**
    - `complete` — runs **once** after the whole page has been loaded
    - `stay` — as fast as possible **and** stays on the page observing possible DOM changes

**Examples**
1.  Removes by classes
    ```
    example.org#%#//scriptlet('remove-class', 'example|test')
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
    example.org#%#//scriptlet('remove-class', 'branding', 'div[class^="inner"]')
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

 3. Using flags
    ```
    example.org#%#//scriptlet('remove-class', 'branding', 'div[class^="inner"]', 'asap complete')
    ```

[Scriptlet source](../src/scriptlets/remove-class.js)
* * *

### <a id="remove-cookie"></a> ⚡️ remove-cookie

Removes current page cookies by passed string matching with name. For current domain and subdomains. Runs on load and before unload.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#cookie-removerjs-

**Syntax**
```
example.org#%#//scriptlet('remove-cookie'[, match])
```

- `match` - optional, string or regex matching the cookie name. If not specified all accessible cookies will be removed.

**Examples**
1. Removes all cookies:
    ```
    example.org#%#//scriptlet('remove-cookie')
    ```

2. Removes cookies which name contains `example` string:
    ```
    example.org#%#//scriptlet('remove-cookie', 'example')
    ```

    For instance this cookie will be removed:

    ```javascript
    document.cookie = '__example=randomValue';
    ```

[Scriptlet source](../src/scriptlets/remove-cookie.js)
* * *

### <a id="remove-in-shadow-dom"></a> ⚡️ remove-in-shadow-dom

Removes elements inside open shadow DOM elements.

**Syntax**
```
example.org#%#//scriptlet('remove-in-shadow-dom', selector[, baseSelector])
```

- `selector` — required, CSS selector of element in shadow-dom to remove
- `baseSelector` — optional, selector of specific page DOM element,
narrows down the part of the page DOM where shadow-dom host supposed to be,
defaults to document.documentElement

> `baseSelector` should match element of the page DOM, but not of shadow DOM

**Examples**
```
! removes menu bar
virustotal.com#%#//scriptlet('remove-in-shadow-dom', 'iron-pages', 'vt-virustotal-app')

! removes floating element
virustotal.com#%#//scriptlet('remove-in-shadow-dom', 'vt-ui-contact-fab')
```

[Scriptlet source](../src/scriptlets/remove-in-shadow-dom.js)
* * *

### <a id="set-attr"></a> ⚡️ set-attr

Sets the specified attribute on the specified elements. This scriptlet runs once when the page loads
and after that and after that on DOM tree changes.

**Syntax**
```
example.org#%#//scriptlet('set-attr', selector, attr[, value])
```

- `selector` — required, CSS selector, specifies DOM nodes to set attributes on
- `attr` — required, attribute to be set
- `value` — the value to assign to the attribute, defaults to ''. Possible values:
    - `''` - empty string
    - positive decimal integer `<= 32767`

**Examples**
1.  Set attribute by selector
    ```
    example.org#%#//scriptlet('set-attr', 'div.class > a.class', 'test-attribute', '0')
    ```

    ```html
    <!-- before  -->
    <a class="class">Some text</div>

    <!-- after -->
    <a class="class" test-attribute="0">Some text</div>
    ```
2.  Set attribute without value
    ```
    example.org#%#//scriptlet('set-attr', 'div.class > a.class', 'test-attribute')
    ```

    ```html
    <!-- before  -->
    <a class="class">Some text</div>

    <!-- after -->
    <a class="class" test-attribute>Some text</div>
    ```

[Scriptlet source](../src/scriptlets/set-attr.js)
* * *

### <a id="set-constant"></a> ⚡️ set-constant

Creates a constant property and assigns it one of the values from the predefined list.

> Actually, it's not a constant. Please note, that it can be rewritten with a value of a different type.

> If empty object is present in chain it will be trapped until chain leftovers appear.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#set-constantjs-

Related ABP snippet:
https://github.com/adblockplus/adblockpluscore/blob/adblockpluschrome-3.9.4/lib/content/snippets.js#L1361

**Syntax**
```
example.org#%#//scriptlet('set-constant', property, value[, stack])
```

- `property` - required, path to a property (joined with `.` if needed). The property must be attached to `window`.
- `value` - required. Possible values:
    - positive decimal integer `<= 32767`
    - one of the predefined constants:
        - `undefined`
        - `false`
        - `true`
        - `null`
        - `emptyObj` - empty object
        - `emptyArr` - empty array
        - `noopFunc` - function with empty body
        - `noopCallbackFunc` - function returning noopFunc
        - `trueFunc` - function returning true
        - `falseFunc` - function returning false
        - `throwFunc` - function throwing an error
        - `noopPromiseResolve` - function returning Promise object that is resolved with an empty response
        - `noopPromiseReject` - function returning Promise.reject()
        - `''` - empty string
        - `-1` - number value `-1`
        - `yes`
        - `no`
- `stack` - optional, string or regular expression that must match the current function call stack trace;
if regular expression is invalid it will be skipped

**Examples**
```
! Any access to `window.first` will return `false`
example.org#%#//scriptlet('set-constant', 'first', 'false')

✔ window.first === false
```

```
! Any call to `window.second()` will return `true`
example.org#%#//scriptlet('set-constant', 'second', 'trueFunc')

✔ window.second() === true
✔ window.second.toString() === "function trueFunc() {return true;}"
```

```
! Any call to `document.third()` will return `true` if the method is related to `checking.js`
example.org#%#//scriptlet('set-constant', 'document.third', 'trueFunc', 'checking.js')

✔ document.third() === true  // if the condition described above is met
```

[Scriptlet source](../src/scriptlets/set-constant.js)
* * *

### <a id="set-cookie-reload"></a> ⚡️ set-cookie-reload

Sets a cookie with the specified name and value, and path,
and reloads the current page after the cookie setting.
If reloading option is not needed, use [set-cookie](#set-cookie) scriptlet.

**Syntax**
```
example.org#%#//scriptlet('set-cookie-reload', name, value[, path])
```

- `name` - required, cookie name to be set
- `value` - required, cookie value; possible values:
    - number `>= 0 && <= 15`
    - one of the predefined constants:
        - `true` / `True`
        - `false` / `False`
        - `yes` / `Yes` / `Y`
        - `no`
        - `ok` / `OK`
- `path` - optional, cookie path, defaults to `/`; possible values:
    - `/` — root path
    - `none` — to set no path at all

**Examples**
```
example.org#%#//scriptlet('set-cookie-reload', 'checking', 'ok')

example.org#%#//scriptlet('set-cookie-reload', 'gdpr-settings-cookie', '1')

example.org#%#//scriptlet('set-cookie-reload', 'cookie-set', 'true', 'none')
```

[Scriptlet source](../src/scriptlets/set-cookie-reload.js)
* * *

### <a id="set-cookie"></a> ⚡️ set-cookie

Sets a cookie with the specified name, value, and path.

**Syntax**
```
example.org#%#//scriptlet('set-cookie', name, value[, path])
```

- `name` - required, cookie name to be set
- `value` - required, cookie value; possible values:
    - number `>= 0 && <= 15`
    - one of the predefined constants:
        - `true` / `True`
        - `false` / `False`
        - `yes` / `Yes` / `Y`
        - `no`
        - `ok` / `OK`
- `path` - optional, cookie path, defaults to `/`; possible values:
    - `/` — root path
    - `none` — to set no path at all

**Examples**
```
example.org#%#//scriptlet('set-cookie', 'CookieConsent', '1')

example.org#%#//scriptlet('set-cookie', 'gdpr-settings-cookie', 'true')

example.org#%#//scriptlet('set-cookie', 'cookie_consent', 'ok', 'none')
```

[Scriptlet source](../src/scriptlets/set-cookie.js)
* * *

### <a id="set-local-storage-item"></a> ⚡️ set-local-storage-item

Adds specified key and its value to localStorage object, or updates the value of the key if it already exists.
Scriptlet won't set item if storage is full.

**Syntax**
```
example.com#%#//scriptlet('set-local-storage-item', 'key', 'value')
```

- `key` — required, key name to be set.
- `value` - required, key value; possible values:
    - positive decimal integer `<= 32767`
    - one of the predefined constants:
        - `undefined`
        - `false`
        - `true`
        - `null`
        - `emptyObj` - empty object
        - `emptyArr` - empty array
        - `''` - empty string
        - `yes`
        - `no`

**Examples**
```
example.org#%#//scriptlet('set-local-storage-item', 'player.live.current.mute', 'false')

example.org#%#//scriptlet('set-local-storage-item', 'exit-intent-marketing', '1')
```

[Scriptlet source](../src/scriptlets/set-local-storage-item.js)
* * *

### <a id="set-popads-dummy"></a> ⚡️ set-popads-dummy

Sets static properties PopAds and popns.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/wiki/Resources-Library#popads-dummyjs-

**Syntax**
```
example.org#%#//scriptlet('set-popads-dummy')
```

[Scriptlet source](../src/scriptlets/set-popads-dummy.js)
* * *

### <a id="set-session-storage-item"></a> ⚡️ set-session-storage-item

Adds specified key and its value to sessionStorage object, or updates the value of the key if it already exists.
Scriptlet won't set item if storage is full.

**Syntax**
```
example.com#%#//scriptlet('set-session-storage-item', 'key', 'value')
```

- `key` — required, key name to be set.
- `value` - required, key value; possible values:
    - positive decimal integer `<= 32767`
    - one of the predefined constants:
        - `undefined`
        - `false`
        - `true`
        - `null`
        - `emptyObj` - empty object
        - `emptyArr` - empty array
        - `''` - empty string
        - `yes`
        - `no`

**Examples**
```
example.org#%#//scriptlet('set-session-storage-item', 'player.live.current.mute', 'false')

example.org#%#//scriptlet('set-session-storage-item', 'exit-intent-marketing', '1')
```

[Scriptlet source](../src/scriptlets/set-session-storage-item.js)
* * *

### <a id="xml-prune"></a> ⚡️ xml-prune

Removes an element from the specified XML.

**Syntax**
```
example.org#%#//scriptlet('xml-prune'[, propsToMatch[, optionalProp[, urlToMatch]]])
```

- `propsToMatch` - optional, selector of elements which will be removed from XML
- `optionalProp` - optional, selector of elements that must occur in XML document
- `urlToMatch` - optional, string or regular expression for matching the request's URL
> Usage with no arguments will log response payload and URL to browser console;
which is useful for debugging but prohibited for production filter lists.

**Examples**
1. Remove `Period` tag whose `id` contains `-ad-` from all requests
    ```
    example.org#%#//scriptlet('xml-prune', 'Period[id*="-ad-"]')
    ```

2. Remove `Period` tag whose `id` contains `-ad-`, only if XML contains `SegmentTemplate`
    ```
    example.org#%#//scriptlet('xml-prune', 'Period[id*="-ad-"]', 'SegmentTemplate')
    ```

3. Remove `Period` tag whose `id` contains `-ad-`, only if request's URL contains `.mpd`
    ```
    example.org#%#//scriptlet('xml-prune', 'Period[id*="-ad-"]', '', '.mpd')
    ```

4. Call with no arguments will log response payload and URL at the console
    ```
    example.org#%#//scriptlet('xml-prune')
    ```

5. Call with only `urlToMatch` argument will log response payload and URL only for the matched URL
    ```
    example.org#%#//scriptlet('xml-prune', '', '', '.mpd')
    ```

[Scriptlet source](../src/scriptlets/xml-prune.js)
* * *

