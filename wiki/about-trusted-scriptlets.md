## <a id="trusted-scriptlets"></a> Available Trusted Scriptlets
* [trusted-click-element](#trusted-click-element)
* [trusted-replace-fetch-response](#trusted-replace-fetch-response)
* [trusted-replace-xhr-response](#trusted-replace-xhr-response)
* [trusted-set-constant](#trusted-set-constant)
* [trusted-set-cookie-reload](#trusted-set-cookie-reload)
* [trusted-set-cookie](#trusted-set-cookie)
* [trusted-set-local-storage-item](#trusted-set-local-storage-item)
* * *
### <a id="trusted-click-element"></a> ⚡️ trusted-click-element

Clicks selected elements in a strict sequence, ordered by selectors passed, and waiting for them to render in the DOM first.
Deactivates after all elements have been clicked or by 10s timeout.

**Syntax**
```
example.com#%#//scriptlet('trusted-click-element', selectors[, extraMatch[, delay]])
```

- `selectors` — required, string with query selectors delimited by comma
- `extraMatch` — optional, extra condition to check on a page; allows to match `cookie` and `localStorage`; can be set as `name:key[=value]` where `value` is optional.
Multiple conditions are allowed inside one `extraMatch` but they should be delimited by comma and each of them should match the syntax. Possible `name`s:
   - `cookie` - test string or regex against cookies on a page
   - `localStorage` - check if localStorage item is present
- `delay` - optional, time in ms to delay scriptlet execution, defaults to instant execution.

**Examples**
1. Click single element by selector
```
example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"]')
```

2. Delay click execution by 500ms
```
example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"]', '', '500')
```

3. Click multiple elements by selector with a delay
```
example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"], button[name="check"], input[type="submit"][value="akkoord"]', '', '500')
```

4. Match cookies by keys using regex and string
```
example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"]', 'cookie:userConsentCommunity, cookie:/cmpconsent|cmp/')
```

5. Match by cookie key=value pairs using regex and string
```
example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"]', 'cookie:userConsentCommunity=true, cookie:/cmpconsent|cmp/=/[a-z]{1,5}/')
```

6. Match by localStorage item 'promo' key
```
example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"]', 'localStorage:promo')
```

7. Click multiple elements with delay and matching by both cookie string and localStorage item
```
example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"], input[type="submit"][value="akkoord"]', 'cookie:cmpconsent, localStorage:promo', '250')
```

[Scriptlet source](../src/scriptlets/trusted-click-element.js)
* * *

### <a id="trusted-replace-fetch-response"></a> ⚡️ trusted-replace-fetch-response

Replaces response text content of `fetch` requests if **all** given parameters match.

**Syntax**
```
example.org#%#//scriptlet('trusted-replace-fetch-response'[, pattern, replacement[, propsToMatch]])
```

- pattern - optional, argument for matching contents of responseText that should be replaced. If set, `replacement` is required;
possible values:
  - `*` to match all text content
  - non-empty string
  - regular expression
- replacement — optional, should be set if `pattern` is set. String to replace the response text content matched by `pattern`.
Empty string to remove content. Defaults to empty string.
- propsToMatch - optional, string of space-separated properties to match; possible props:
  - string or regular expression for matching the URL passed to fetch call; empty string, wildcard `*` or invalid regular expression will match all fetch calls
  - colon-separated pairs `name:value` where
    - `name` is [`init` option name](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters)
    - `value` is string or regular expression for matching the value of the option passed to fetch call; invalid regular expression will cause any value matching

> Usage with no arguments will log fetch calls to browser console;
which is useful for debugging but only allowed for production filter lists.

> Scriptlet does nothing if response body can't be converted to text.

**Examples**
1. Log all fetch calls
    ```
    example.org#%#//scriptlet('trusted-replace-fetch-response')
    ```

2. Replace response text content of fetch requests with specific url
    ```
    example.org#%#//scriptlet('trusted-replace-fetch-response', 'adb_detect:true', 'adb_detect:false', 'example.org')
    example.org#%#//scriptlet('trusted-replace-fetch-response', '/#EXT-X-VMAP-AD-BREAK[\s\S]*?/', '#EXT-X-ENDLIST', 'example.org')
    ```

3. Remove all text content of fetch responses with specific request method
    ```
    example.org#%#//scriptlet('trusted-replace-fetch-response', '*', '', 'method:GET')
    ```

4. Replace response text content of fetch requests matching by URL regex and request methods
    ```
    example.org#%#//scriptlet('trusted-replace-fetch-response', '/#EXT-X-VMAP-AD-BREAK[\s\S]*?/', '#EXT-X-ENDLIST', '/\.m3u8/ method:/GET|HEAD/')
    ```
5. Remove text content of all fetch responses for example.com
    ```
    example.org#%#//scriptlet('trusted-replace-fetch-response', '*', '', 'example.com')
    ```

[Scriptlet source](../src/scriptlets/trusted-replace-fetch-response.js)
* * *

### <a id="trusted-replace-xhr-response"></a> ⚡️ trusted-replace-xhr-response

Replaces response content of `xhr` requests if **all** given parameters match.

**Syntax**
```
example.org#%#//scriptlet('trusted-replace-xhr-response'[, pattern, replacement[, propsToMatch]])
```

- pattern - optional, argument for matching contents of responseText that should be replaced. If set, `replacement` is required;
possible values:
  - `*` to match all text content
  - non-empty string
  - regular expression
- replacement — optional, should be set if `pattern` is set. String to replace matched content with. Empty string to remove content.
- propsToMatch — optional, string of space-separated properties to match for extra condition; possible props:
  - string or regular expression for matching the URL passed to `.open()` call;
  - colon-separated pairs name:value where
    - name - name is string or regular expression for matching XMLHttpRequest property name
    - value is string or regular expression for matching the value of the option passed to `.open()` call

> Usage with no arguments will log XMLHttpRequest objects to browser console;
which is useful for debugging but not permitted for production filter lists.

**Examples**
1. Log all XMLHttpRequests
    ```
    example.org#%#//scriptlet('trusted-replace-xhr-response')
    ```

2. Replace text content of XMLHttpRequests with specific url
    ```
    example.org#%#//scriptlet('trusted-replace-xhr-response', 'adb_detect:true', 'adb_detect:false', 'example.org')
    example.org#%#//scriptlet('trusted-replace-xhr-response', '/#EXT-X-VMAP-AD-BREAK[\s\S]*?/', '#EXT-X-ENDLIST', 'example.org')
    ```

3. Remove all text content of XMLHttpRequests with specific request method
    ```
    example.org#%#//scriptlet('trusted-replace-xhr-response', '*', '', 'method:GET')
    ```

4. Replace text content of XMLHttpRequests matching by URL regex and request methods
    ```
    example.org#%#//scriptlet('trusted-replace-xhr-response', '/#EXT-X-VMAP-AD-BREAK[\s\S]*?/', '#EXT-X-ENDLIST', '/\.m3u8/ method:/GET|HEAD/')
    ```
5. Remove all text content of  all XMLHttpRequests for example.com
    ```
    example.org#%#//scriptlet('trusted-replace-xhr-response', '*', '', 'example.com')
    ```

[Scriptlet source](../src/scriptlets/trusted-replace-xhr-response.js)
* * *

### <a id="trusted-set-constant"></a> ⚡️ trusted-set-constant

Creates a constant property and assigns it a specified value.

> Actually, it's not a constant. Please note, that it can be rewritten with a value of a different type.

> If empty object is present in chain it will be trapped until chain leftovers appear.

> Use [set-constant](./about-scriptlets.md#set-constant) to set predefined values and functions.

**Syntax**
```
example.org#%#//scriptlet('trusted-set-constant', property, value[, stack])
```

- `property` - required, path to a property (joined with `.` if needed). The property must be attached to `window`.
- `value` - required, an arbitrary value to be set; value type is being inferred from the argument, e.g '500' will be set as number;
to set string type value wrap argument into another pair of quotes: `'"500"'`;
- `stack` - optional, string or regular expression that must match the current function call stack trace;
if regular expression is invalid it will be skipped

**Examples**
1. Set property values of different types
```
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

2. Use script stack matching to set value
```
! `document.first` will return `1` if the method is related to `checking.js`
example.org#%#//scriptlet('trusted-set-constant', 'document.first', '1', 'checking.js')

✔ document.first === 1  // if the condition described above is met
```

[Scriptlet source](../src/scriptlets/trusted-set-constant.js)
* * *

### <a id="trusted-set-cookie-reload"></a> ⚡️ trusted-set-cookie-reload

Sets a cookie with arbitrary name and value,
and with optional ability to offset cookie attribute 'expires' and set path.
Also reloads the current page after the cookie setting.
If reloading option is not needed, use the [`trusted-set-cookie` scriptlet](#trusted-set-cookie).

**Syntax**
```
example.org#%#//scriptlet('trusted-set-cookie-reload', name, value[, offsetExpiresSec[, path]])
```

- `name` - required, cookie name to be set
- `value` - required, cookie value. Possible values:
  - arbitrary value
  - empty string for no value
  - `$now$` keyword for setting current time in ms, e.g 1667915146503
  - `$currentDate$` keyword for setting current time as string, e.g 'Tue Nov 08 2022 13:53:19 GMT+0300'
- `offsetExpiresSec` - optional, offset from current time in seconds, after which cookie should expire; defaults to no offset
Possible values:
  - positive integer in seconds
  - `1year` keyword for setting expiration date to one year
  - `1day` keyword for setting expiration date to one day
- `path` - optional, argument for setting cookie path, defaults to `/`; possible values:
  - `/` — root path
  - `none` — to set no path at all

**Examples**
1. Set cookie and reload the page after it
```
example.org#%#//scriptlet('trusted-set-cookie-reload', 'cmpconsent', 'accept')
```

2. Set cookie with `new Date().getTime()` value and reload the page after it
```
example.org#%#//scriptlet('trusted-set-cookie-reload', 'cmpconsent', '$now$')
```

3. Set cookie which will expire in 3 days and reload the page after it
```
example.org#%#//scriptlet('trusted-set-cookie-reload', 'cmpconsent', 'accept', '259200')
```

4. Set cookie which will expire in one year and reload the page after it
```
example.org#%#//scriptlet('trusted-set-cookie-reload', 'cmpconsent', 'accept', '1year')
```

5. Set cookie with no 'expire' and no path, reload the page after it
```
example.org#%#//scriptlet('trusted-set-cookie-reload', 'cmpconsent', 'decline', '', 'none')
```

[Scriptlet source](../src/scriptlets/trusted-set-cookie-reload.js)
* * *

### <a id="trusted-set-cookie"></a> ⚡️ trusted-set-cookie

Sets a cookie with arbitrary name and value,
and with optional ability to offset cookie attribute 'expires' and set path.

**Syntax**
```
example.org#%#//scriptlet('trusted-set-cookie', name, value[, offsetExpiresSec[, path]])
```

- `name` - required, cookie name to be set
- `value` - required, cookie value. Possible values:
  - arbitrary value
  - empty string for no value
  - `$now$` keyword for setting current time in ms, e.g 1667915146503
  - `$currentDate$` keyword for setting current time as string, e.g 'Tue Nov 08 2022 13:53:19 GMT+0300'
- `offsetExpiresSec` - optional, offset from current time in seconds, after which cookie should expire; defaults to no offset
Possible values:
  - positive integer in seconds
  - `1year` keyword for setting expiration date to one year
  - `1day` keyword for setting expiration date to one day
- `path` - optional, argument for setting cookie path, defaults to `/`; possible values:
  - `/` — root path
  - `none` — to set no path at all

**Examples**
1. Set cookie
```
example.org#%#//scriptlet('trusted-set-cookie', 'cmpconsent', 'accept')
example.org#%#//scriptlet('trusted-set-cookie', 'cmpconsent', '1-accept_1')
```

2. Set cookie with `new Date().getTime()` value
```
example.org#%#//scriptlet('trusted-set-cookie', 'cmpconsent', '$now$')
```

3. Set cookie which will expire in 3 days
```
example.org#%#//scriptlet('trusted-set-cookie', 'cmpconsent', 'accept', '259200')
```

4. Set cookie which will expire in one year
```
example.org#%#//scriptlet('trusted-set-cookie', 'cmpconsent', 'accept', '1year')
```

5. Set cookie with no path
```
example.org#%#//scriptlet('trusted-set-cookie', 'cmpconsent', 'decline', '', 'none')
```

[Scriptlet source](../src/scriptlets/trusted-set-cookie.js)
* * *

### <a id="trusted-set-local-storage-item"></a> ⚡️ trusted-set-local-storage-item

Adds item with arbitrary key and value to localStorage object, or updates the value of the key if it already exists.
Scriptlet won't set item if storage is full.

**Syntax**
```
example.com#%#//scriptlet('trusted-set-local-storage-item', 'key', 'value')
```

- `key` — required, key name to be set.
- `value` - required, key value; possible values:
  - arbitrary value
  - `$now$` keyword for setting current time in ms, corresponds to `Date.now()` and `(new Date).getTime()` calls
  - `$currentDate$` keyword for setting string representation of the current date and time, corresponds to `Date()` and `(new Date).toString()` calls

**Examples**
1. Set local storage item
```
example.org#%#//scriptlet('trusted-set-local-storage-item', 'player.live.current.mute', 'false')

example.org#%#//scriptlet('trusted-set-local-storage-item', 'COOKIE_CONSENTS', '{"preferences":3,"marketing":false}')

example.org#%#//scriptlet('trusted-set-local-storage-item', 'providers', '[16364,88364]')

example.org#%#//scriptlet('trusted-set-local-storage-item', 'providers', '{"providers":[16364,88364],"consent":"all"}')
```

2. Set item with current time since unix epoch in ms
```
example.org#%#//scriptlet('trusted-set-local-storage-item', 'player.live.current.play', '$now$')
```

3. Set item with current date, e.g 'Tue Nov 08 2022 13:53:19 GMT+0300'
```
example.org#%#//scriptlet('trusted-set-local-storage-item', 'player.live.current.play', '$currentDate$')
```

4. Set item without value
```
example.org#%#//scriptlet('trusted-set-local-storage-item', 'ppu_main_none', '')
```

[Scriptlet source](../src/scriptlets/trusted-set-local-storage-item.js)
* * *

