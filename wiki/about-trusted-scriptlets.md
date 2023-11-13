# <a id="trusted-scriptlets"></a> Available Trusted Scriptlets

- [trusted-click-element](#trusted-click-element)
- [trusted-prune-inbound-object](#trusted-prune-inbound-object)
- [trusted-replace-fetch-response](#trusted-replace-fetch-response)
- [trusted-replace-node-text](#trusted-replace-node-text)
- [trusted-replace-xhr-response](#trusted-replace-xhr-response)
- [trusted-set-constant](#trusted-set-constant)
- [trusted-set-cookie-reload](#trusted-set-cookie-reload)
- [trusted-set-cookie](#trusted-set-cookie)
- [trusted-set-local-storage-item](#trusted-set-local-storage-item)

* * *

## <a id="trusted-click-element"></a> ⚡️ trusted-click-element

> Added in v1.7.3.

Clicks selected elements in a strict sequence, ordered by selectors passed,
and waiting for them to render in the DOM first.
Deactivates after all elements have been clicked or by 10s timeout.

### Syntax

```text
example.com#%#//scriptlet('trusted-click-element', selectors[, extraMatch[, delay]])
```

- `selectors` — required, string with query selectors delimited by comma
- `extraMatch` — optional, extra condition to check on a page; allows to match `cookie` and `localStorage`;
can be set as `name:key[=value]` where `value` is optional.
If `cookie`/`localStorage` starts with `!` then the element will only be clicked
if specified cookie/localStorage item does not exist.
Multiple conditions are allowed inside one `extraMatch` but they should be delimited by comma
and each of them should match the syntax. Possible `name`s:
    - `cookie` — test string or regex against cookies on a page
    - `localStorage` — check if localStorage item is present
- `delay` — optional, time in ms to delay scriptlet execution, defaults to instant execution.

### Examples

1. Click single element by selector

    ```adblock
    example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"]')
    ```

1. Delay click execution by 500ms

    ```adblock
    example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"]', '', '500')
    ```

1. Click multiple elements by selector with a delay

    <!-- markdownlint-disable line-length -->

    ```adblock
    example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"], button[name="check"], input[type="submit"][value="akkoord"]', '', '500')
    ```

1. Match cookies by keys using regex and string

    ```adblock
    example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"]', 'cookie:userConsentCommunity, cookie:/cmpconsent|cmp/')
    ```

1. Match by cookie key=value pairs using regex and string

    ```adblock
    example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"]', 'cookie:userConsentCommunity=true, cookie:/cmpconsent|cmp/=/[a-z]{1,5}/')
    ```

1. Match by localStorage item 'promo' key

    ```adblock
    example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"]', 'localStorage:promo')
    ```

1. Click multiple elements with delay and matching by both cookie string and localStorage item

    ```adblock
    example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"], input[type="submit"][value="akkoord"]', 'cookie:cmpconsent, localStorage:promo', '250')
    ```

    <!-- markdownlint-enable line-length -->

1. Click element only if cookie with name `cmpconsent` does not exist

    ```adblock
    example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"]', '!cookie:cmpconsent')
    ```

1. Click element only if specified cookie string and localStorage item does not exist

    ```adblock
    example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"]', '!cookie:consent, !localStorage:promo')
    ```

[Scriptlet source](../src/scriptlets/trusted-click-element.js)

* * *

## <a id="trusted-prune-inbound-object"></a> ⚡️ trusted-prune-inbound-object

> Added in v1.9.91.

Removes listed properties from the result of calling specific function (if payload contains `Object`)
and returns to the caller.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/commit/1c9da227d7

### Syntax

```text
example.org#%#//scriptlet('trusted-prune-inbound-object', functionName[, propsToRemove [, obligatoryProps [, stack]]])
```

- `functionName` — required, the name of the function to trap, it must have an object as an argument
- `propsToRemove` — optional, string of space-separated properties to remove
- `obligatoryProps` — optional, string of space-separated properties
  which must be all present for the pruning to occur
- `stack` — optional, string or regular expression that must match the current function call stack trace;
  if regular expression is invalid it will be skipped

> Note please that you can use wildcard `*` for chain property name,
> e.g. `ad.*.src` instead of `ad.0.src ad.1.src ad.2.src`.

### Examples

1. Removes property `example` from the payload of the Object.getOwnPropertyNames call

    ```adblock
    example.org#%#//scriptlet('trusted-prune-inbound-object', 'Object.getOwnPropertyNames', 'example')
    ```

    For instance, the following call will return `['one']`

    ```html
    Object.getOwnPropertyNames({ one: 1, example: true })
    ```

2. Removes property `ads` from the payload of the Object.keys call

    ```adblock
    example.org#%#//scriptlet('trusted-prune-inbound-object', 'Object.keys', 'ads')
    ```

    For instance, the following call will return `['one', 'two']`

    ```html
    Object.keys({ one: 1, two: 2, ads: true })
    ```

3. Removes property `foo.bar` from the payload of the JSON.stringify call

    ```adblock
    example.org#%#//scriptlet('trusted-prune-inbound-object', 'JSON.stringify', 'foo.bar')
    ```

    For instance, the following call will return `'{"foo":{"a":2},"b":3}'`

    ```html
    JSON.stringify({ foo: { bar: 1, a: 2 }, b: 3 })
    ```

4. Removes property `foo.bar` from the payload of the JSON.stringify call if its error stack trace contains `test.js`

    ```adblock
    example.org#%#//scriptlet('trusted-prune-inbound-object', 'JSON.stringify', 'foo.bar', '', 'test.js')
    ```

5. Call with only first and third argument will log the current hostname and matched payload at the console

    ```adblock
    example.org#%#//scriptlet('trusted-prune-inbound-object', 'JSON.stringify', '', 'bar', '')
    ```

[Scriptlet source](../src/scriptlets/trusted-prune-inbound-object.js)

* * *

## <a id="trusted-replace-fetch-response"></a> ⚡️ trusted-replace-fetch-response

> Added in v1.7.3.

Replaces response text content of `fetch` requests if **all** given parameters match.

### Syntax

```text
example.org#%#//scriptlet('trusted-replace-fetch-response'[, pattern, replacement[, propsToMatch]])
```

- `pattern` — optional, argument for matching contents of responseText that should be replaced.
If set, `replacement` is required. Possible values:
    - `*` to match all text content
    - non-empty string
    - regular expression
- `replacement` — optional, should be set if `pattern` is set. String to replace the response text content
  matched by `pattern`. Empty string to remove content. Defaults to empty string.
- `propsToMatch` — optional, string of space-separated properties to match; possible props:
    - string or regular expression for matching the URL passed to fetch call;
      empty string, wildcard `*` or invalid regular expression will match all fetch calls
    - colon-separated pairs `name:value` where
        <!-- markdownlint-disable-next-line line-length -->
        - `name` is [`init` option name](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters)
        - `value` is string or regular expression for matching the value of the option passed to fetch call;
          invalid regular expression will cause any value matching

> Usage with no arguments will log fetch calls to browser console;
> it may be useful for debugging but it is not allowed for prod versions of filter lists.

> Scriptlet does nothing if response body can't be converted to text.

### Examples

1. Log all fetch calls

    ```adblock
    example.org#%#//scriptlet('trusted-replace-fetch-response')
    ```

1. Replace response text content of fetch requests with specific url

    <!-- markdownlint-disable line-length -->

    ```adblock
    example.org#%#//scriptlet('trusted-replace-fetch-response', 'adb_detect:true', 'adb_detect:false', 'example.org')
    example.org#%#//scriptlet('trusted-replace-fetch-response', '/#EXT-X-VMAP-AD-BREAK[\s\S]*?/', '#EXT-X-ENDLIST', 'example.org')
    ```

    <!-- markdownlint-enable line-length -->

1. Remove all text content of fetch responses with specific request method

    ```adblock
    example.org#%#//scriptlet('trusted-replace-fetch-response', '*', '', 'method:GET')
    ```

1. Replace response text content of fetch requests matching by URL regex and request methods

    <!-- markdownlint-disable line-length -->

    ```adblock
    example.org#%#//scriptlet('trusted-replace-fetch-response', '/#EXT-X-VMAP-AD-BREAK[\s\S]*?/', '#EXT-X-ENDLIST', '/\.m3u8/ method:/GET|HEAD/')
    ```

    <!-- markdownlint-enable line-length -->

1. Remove text content of all fetch responses for example.com

    ```adblock
    example.org#%#//scriptlet('trusted-replace-fetch-response', '*', '', 'example.com')
    ```

[Scriptlet source](../src/scriptlets/trusted-replace-fetch-response.js)

* * *

## <a id="trusted-replace-node-text"></a> ⚡️ trusted-replace-node-text

> Added in v1.9.37.

Replaces text in text content of matched DOM nodes.

### Syntax

```adblock
example.org#%#//scriptlet('trusted-replace-node-text', nodeName, textMatch, pattern, replacement)
```

- `nodeName` — required, string or RegExp, specifies DOM node name from which the text will be removed.
Must target lowercased node names, e.g `div` instead of `DIV`.
- `textMatch` — required, string or RegExp to match against node's text content.
If matched, the whole text will be removed. Case sensitive.
- `pattern` — required, string or regexp for matching contents of `node.textContent` that should be replaced.
- `replacement` — required, string to replace text content matched by `pattern`.

### Examples

1. Replace node's text content:

    ```adblock
    example.org#%#//scriptlet('trusted-replace-node-text', 'div', 'some', 'text', 'other text')
    ```

    ```html
    <!-- before -->
    <div>some text</div>
    <div>text</div>
    <span>some text</span>

    <!-- after -->
    <div>some other text</div>
    <div>text</div>
    <span>some text</span>
    ```

2. Replace node's text content, matching both node name, text and pattern by RegExp:

    ```adblock
    example.org#%#//scriptlet('trusted-replace-node-text', '/[a-z]*[0-9]/', '/s\dme/', '/t\dxt/', 'other text')
    ```

    ```html
    <!-- before -->
    <qrce3>s0me t3xt</qrce3> // this node is going to be matched by both node name and text
    <qrce3>text</qrce3> // this node won't be matched by text content nor text content
    <span>some text</span>

    <!-- after -->
    <qrce3>s0me other text</qrce3> // text content has changed
    <qrce3>text</qrce3>
    <span>some text</span>
    ```

[Scriptlet source](../src/scriptlets/trusted-replace-node-text.js)

* * *

## <a id="trusted-replace-xhr-response"></a> ⚡️ trusted-replace-xhr-response

> Added in v1.7.3.

Replaces response content of `xhr` requests if **all** given parameters match.

### Syntax

```text
example.org#%#//scriptlet('trusted-replace-xhr-response'[, pattern, replacement[, propsToMatch]])
```

- `pattern` — optional, argument for matching contents of responseText that should be replaced.
  If set, `replacement` is required. Possible values:
    - `*` to match all text content
    - non-empty string
    - regular expression
- `replacement` — optional, should be set if `pattern` is set. String to replace matched content with.
  Empty string to remove content.
- `propsToMatch` — optional, string of space-separated properties to match for extra condition; possible props:
    - string or regular expression for matching the URL passed to `XMLHttpRequest.open()` call;
    - colon-separated pairs `name:value` where
        - `name` — string or regular expression for matching XMLHttpRequest property name
        - `value` — string or regular expression for matching the value of the option
          passed to `XMLHttpRequest.open()` call

> Usage with no arguments will log XMLHttpRequest objects to browser console;
> it may be useful for debugging but it is not allowed for prod versions of filter lists.

### Examples

1. Log all XMLHttpRequests

    ```adblock
    example.org#%#//scriptlet('trusted-replace-xhr-response')
    ```

1. Replace text content of XMLHttpRequests with specific url

    <!-- markdownlint-disable line-length -->

    ```adblock
    example.org#%#//scriptlet('trusted-replace-xhr-response', 'adb_detect:true', 'adb_detect:false', 'example.org')
    example.org#%#//scriptlet('trusted-replace-xhr-response', '/#EXT-X-VMAP-AD-BREAK[\s\S]*?/', '#EXT-X-ENDLIST', 'example.org')
    ```

    <!-- markdownlint-enable line-length -->

1. Remove all text content of XMLHttpRequests with specific request method

    ```adblock
    example.org#%#//scriptlet('trusted-replace-xhr-response', '*', '', 'method:GET')
    ```

1. Replace text content of XMLHttpRequests matching by URL regex and request methods

    ```adblock
    example.org#%#//scriptlet('trusted-replace-xhr-response', '/#EXT-X-VMAP-AD-BREAK[\s\S]*?/', '#EXT-X-ENDLIST', '/\.m3u8/ method:/GET|HEAD/') <!-- markdownlint-disable-line line-length -->
    ```

1. Remove all text content of  all XMLHttpRequests for example.com

    ```adblock
    example.org#%#//scriptlet('trusted-replace-xhr-response', '*', '', 'example.com')
    ```

[Scriptlet source](../src/scriptlets/trusted-replace-xhr-response.js)

* * *

## <a id="trusted-set-constant"></a> ⚡️ trusted-set-constant

> Added in v1.8.2.

Creates a constant property and assigns it a specified value.

> Actually, it's not a constant. Please note, that it can be rewritten with a value of a different type.

> If empty object is present in chain it will be trapped until chain leftovers appear.

> Use [set-constant](./about-scriptlets.md#set-constant) to set predefined values and functions.

### Syntax

```text
example.org#%#//scriptlet('trusted-set-constant', property, value[, stack])
```

- `property` — required, path to a property (joined with `.` if needed). The property must be attached to `window`.
- `value` — required, an arbitrary value to be set; value type is being inferred from the argument,
  e.g '500' will be set as number; to set string type value wrap argument into another pair of quotes: `'"500"'`;
- `stack` — optional, string or regular expression that must match the current function call stack trace;
  if regular expression is invalid it will be skipped

### Examples

1. Set property values of different types

    ```adblock
    ! Set string value wrapping argument into another pair of quotes
    example.org#%#//scriptlet('trusted-set-constant', 'click_r', '"null"')

    ✔ window.click_r === 'null'
    ✔ typeof window.click_r === 'string'

    ! Set inferred null value
    example.org#%#//scriptlet('trusted-set-constant', 'click_r', 'null')

    ✔ window.click_r === null
    ✔ typeof window.click_r === 'object'

    ! Set number type value
    example.org#%#//scriptlet('trusted-set-constant', 'click_r', '48')

    ✔ window.click_r === 48
    ✔ typeof window.click_r === 'number'

    ! Set array or object as property value, argument should be a JSON string
    example.org#%#//scriptlet('trusted-set-constant', 'click_r', '[1,"string"]')
    example.org#%#//scriptlet('trusted-set-constant', 'click_r', '{"aaa":123,"bbb":{"ccc":"string"}}')
    ```

1. Use script stack matching to set value

    ```adblock
    ! `document.first` will return `1` if the method is related to `checking.js`
    example.org#%#//scriptlet('trusted-set-constant', 'document.first', '1', 'checking.js')

    ✔ document.first === 1  // if the condition described above is met
    ```

[Scriptlet source](../src/scriptlets/trusted-set-constant.js)

* * *

## <a id="trusted-set-cookie-reload"></a> ⚡️ trusted-set-cookie-reload

> Added in v1.7.10.

Sets a cookie with arbitrary name and value,
and with optional ability to offset cookie attribute 'expires' and set path.
Also reloads the current page after the cookie setting.
If reloading option is not needed, use the [`trusted-set-cookie` scriptlet](#trusted-set-cookie).

### Syntax

```text
example.org#%#//scriptlet('trusted-set-cookie-reload', name, value[, offsetExpiresSec[, path]])
```

- `name` — required, cookie name to be set
- `value` — required, cookie value. Possible values:
    - arbitrary value
    - empty string for no value
    - `$now$` keyword for setting current time in ms, e.g 1667915146503
    - `$currentDate$` keyword for setting current time as string, e.g 'Tue Nov 08 2022 13:53:19 GMT+0300'
- `offsetExpiresSec` — optional, offset from current time in seconds, after which cookie should expire;
  defaults to no offset. Possible values:
    - positive integer in seconds
    - `1year` keyword for setting expiration date to one year
    - `1day` keyword for setting expiration date to one day
- `path` — optional, argument for setting cookie path, defaults to `/`; possible values:
    - `/` — root path
    - `none` — to set no path at all

> Note that the scriptlet does not encode cookie names and values.
> As a result, if a cookie's name or value includes `;`,
> the scriptlet will not set the cookie since this may cause the cookie to break.

### Examples

1. Set cookie and reload the page after it

    ```adblock
    example.org#%#//scriptlet('trusted-set-cookie-reload', 'cmpconsent', 'accept')
    ```

1. Set cookie with `new Date().getTime()` value and reload the page after it

    ```adblock
    example.org#%#//scriptlet('trusted-set-cookie-reload', 'cmpconsent', '$now$')
    ```

1. Set cookie which will expire in 3 days and reload the page after it

    ```adblock
    example.org#%#//scriptlet('trusted-set-cookie-reload', 'cmpconsent', 'accept', '259200')
    ```

1. Set cookie which will expire in one year and reload the page after it

    ```adblock
    example.org#%#//scriptlet('trusted-set-cookie-reload', 'cmpconsent', 'accept', '1year')
    ```

1. Set cookie with no 'expire' and no path, reload the page after it

    ```adblock
    example.org#%#//scriptlet('trusted-set-cookie-reload', 'cmpconsent', 'decline', '', 'none')
    ```

[Scriptlet source](../src/scriptlets/trusted-set-cookie-reload.js)

* * *

## <a id="trusted-set-cookie"></a> ⚡️ trusted-set-cookie

> Added in v1.7.3.

Sets a cookie with arbitrary name and value,
and with optional ability to offset cookie attribute 'expires' and set path.

### Syntax

```text
example.org#%#//scriptlet('trusted-set-cookie', name, value[, offsetExpiresSec[, path]])
```

- `name` — required, cookie name to be set
- `value` — required, cookie value. Possible values:
    - arbitrary value
    - empty string for no value
    - `$now$` keyword for setting current time in ms, e.g 1667915146503
    - `$currentDate$` keyword for setting current time as string, e.g 'Tue Nov 08 2022 13:53:19 GMT+0300'
- `offsetExpiresSec` — optional, offset from current time in seconds, after which cookie should expire;
  defaults to no offset. Possible values:
    - positive integer in seconds
    - `1year` keyword for setting expiration date to one year
    - `1day` keyword for setting expiration date to one day
- `path` — optional, argument for setting cookie path, defaults to `/`; possible values:
    - `/` — root path
    - `none` — to set no path at all

> Note that the scriptlet does not encode cookie names and values.
> As a result, if a cookie's name or value includes `;`,
> the scriptlet will not set the cookie since this may cause the cookie to break.

### Examples

1. Set cookie

    ```adblock
    example.org#%#//scriptlet('trusted-set-cookie', 'cmpconsent', 'accept')
    example.org#%#//scriptlet('trusted-set-cookie', 'cmpconsent', '1-accept_1')
    ```

1. Set cookie with `new Date().getTime()` value

    ```adblock
    example.org#%#//scriptlet('trusted-set-cookie', 'cmpconsent', '$now$')
    ```

1. Set cookie which will expire in 3 days

    ```adblock
    example.org#%#//scriptlet('trusted-set-cookie', 'cmpconsent', 'accept', '259200')
    ```

1. Set cookie which will expire in one year

    ```adblock
    example.org#%#//scriptlet('trusted-set-cookie', 'cmpconsent', 'accept', '1year')
    ```

1. Set cookie with no path

    ```adblock
    example.org#%#//scriptlet('trusted-set-cookie', 'cmpconsent', 'decline', '', 'none')
    ```

[Scriptlet source](../src/scriptlets/trusted-set-cookie.js)

* * *

## <a id="trusted-set-local-storage-item"></a> ⚡️ trusted-set-local-storage-item

> Added in v1.7.3.

Adds item with arbitrary key and value to localStorage object, or updates the value of the key if it already exists.
Scriptlet won't set item if storage is full.

### Syntax

```adblock
example.com#%#//scriptlet('trusted-set-local-storage-item', 'key', 'value')
```

- `key` — required, key name to be set.
- `value` — required, key value; possible values:
    - arbitrary value
    - `$now$` keyword for setting current time in ms, corresponds to `Date.now()` and `(new Date).getTime()` calls
    - `$currentDate$` keyword for setting string representation of the current date and time,
      corresponds to `Date()` and `(new Date).toString()` calls

### Examples

1. Set local storage item

    ```adblock
    example.org#%#//scriptlet('trusted-set-local-storage-item', 'player.live.current.mute', 'false')

    example.org#%#//scriptlet('trusted-set-local-storage-item', 'COOKIE_CONSENTS', '{"preferences":3,"flag":false}')

    example.org#%#//scriptlet('trusted-set-local-storage-item', 'providers', '[16364,88364]')

    example.org#%#//scriptlet('trusted-set-local-storage-item', 'providers', '{"providers":[123,456],"consent":"all"}')
    ```

1. Set item with current time since unix epoch in ms

    ```adblock
    example.org#%#//scriptlet('trusted-set-local-storage-item', 'player.live.current.play', '$now$')
    ```

1. Set item with current date, e.g 'Tue Nov 08 2022 13:53:19 GMT+0300'

    ```adblock
    example.org#%#//scriptlet('trusted-set-local-storage-item', 'player.live.current.play', '$currentDate$')
    ```

1. Set item without value

    ```adblock
    example.org#%#//scriptlet('trusted-set-local-storage-item', 'ppu_main_none', '')
    ```

[Scriptlet source](../src/scriptlets/trusted-set-local-storage-item.js)

* * *

