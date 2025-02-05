# <a id="trusted-scriptlets"></a> Available Trusted Scriptlets

- [trusted-click-element](#trusted-click-element)
- [trusted-create-element](#trusted-create-element)
- [trusted-dispatch-event](#trusted-dispatch-event)
- [trusted-prune-inbound-object](#trusted-prune-inbound-object)
- [trusted-replace-fetch-response](#trusted-replace-fetch-response)
- [trusted-replace-node-text](#trusted-replace-node-text)
- [trusted-replace-outbound-text](#trusted-replace-outbound-text)
- [trusted-replace-xhr-response](#trusted-replace-xhr-response)
- [trusted-set-attr](#trusted-set-attr)
- [trusted-set-constant](#trusted-set-constant)
- [trusted-set-cookie-reload](#trusted-set-cookie-reload)
- [trusted-set-cookie](#trusted-set-cookie)
- [trusted-set-local-storage-item](#trusted-set-local-storage-item)
- [trusted-set-session-storage-item](#trusted-set-session-storage-item)
- [trusted-suppress-native-method](#trusted-suppress-native-method)

* * *

## <a id="trusted-click-element"></a> ⚡️ trusted-click-element

> Added in v1.7.3.

Clicks selected elements in a strict sequence, ordered by selectors passed,
and waiting for them to render in the DOM first.
First matched element is clicked unless `containsText` is specified.
If `containsText` is specified, then it searches for all given selectors and clicks
the first element containing the specified text.
Deactivates after all elements have been clicked or by 10s timeout.

### Syntax

```text
example.com#%#//scriptlet('trusted-click-element', selectors[, extraMatch[, delay[, reload]]])
```
<!-- markdownlint-disable-next-line line-length -->
- `selectors` — required, string with query selectors delimited by comma. The scriptlet supports `>>>` combinator to select elements inside open shadow DOM. For usage, see example below.
- `extraMatch` — optional, extra condition to check on a page;
   allows to match `cookie`, `localStorage` and specified text;
can be set as `name:key[=value]` where `value` is optional.
If `cookie`/`localStorage` starts with `!` then the element will only be clicked
if specified `cookie`/`localStorage` item does not exist.
Multiple conditions are allowed inside one `extraMatch` but they should be delimited by comma
and each of them should match the syntax. Possible `names`:
    - `cookie` — test string or regex against cookies on a page
    - `localStorage` — check if localStorage item is present
    - `containsText` — check if clicked element contains specified text
- `delay` — optional, time in ms to delay scriptlet execution, defaults to instant execution.
            Must be a number less than 10000 ms (10s)
- `reload` — optional, string with reloadAfterClick marker and optional value. Possible values:
    - `reloadAfterClick` - reloads the page after all elements have been clicked,
       with default delay — 500ms
    - colon-separated pair `reloadAfterClick:value` where
        - `value` — time delay in milliseconds before reloading the page, after all elements
           have been clicked. Must be a number less than 10000 ms (10s)

<!-- markdownlint-disable line-length -->

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

1. Click element only if clicked element contains text `Accept cookie`

    ```adblock
    example.com#%#//scriptlet('trusted-click-element', 'button', 'containsText:Accept cookie')
    ```

1. Click element only if cookie with name `cmpconsent` does not exist

    ```adblock
    example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"]', '!cookie:cmpconsent')
    ```

1. Click element only if specified cookie string and localStorage item does not exist

    ```adblock
    example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"]', '!cookie:consent, !localStorage:promo')
    ```

1. Click element inside open shadow DOM, which could be selected by `div > button`, but is inside shadow host element with host element selected by `article .container`

   ```adblock
   example.com#%#//scriptlet('trusted-click-element', 'article .container > div#host >>> div > button')
   ```

1. Click elements after 1000ms delay and reload page after all elements have been clicked with 200ms delay

   ```adblock
   example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"], button[name="check"], input[type="submit"][value="akkoord"]', '', '1000', 'reloadAfterClick:200')
   ```

<!-- markdownlint-enable line-length -->

[Scriptlet source](../src/scriptlets/trusted-click-element.ts)

* * *

## <a id="trusted-create-element"></a> ⚡️ trusted-create-element

> Added in v1.10.1.

Creates an element with specified attributes and text content, and appends it to the specified parent element.

### Syntax

<!-- markdownlint-disable line-length -->

```text
example.com#%#//scriptlet('trusted-create-element', parentSelector, tagName[, attributePairs[, textContent[, cleanupDelayMs]]])
```

<!-- markdownlint-enable line-length -->

- `parentSelector` — required, CSS selector of the parent element to append the created element to.
- `tagName` — required, tag name of the created element.
- `attributePairs` — optional, space-separated list of attribute name and value pairs separated by `=`.
  Value can be omitted. If value is set, it should be wrapped in quotes.
  If quotes are needed inside value, they should be escaped with backslash.
  Defaults to no attributes.
- `textContent` — optional, text content of the created element. Defaults to empty string.
- `cleanupDelayMs` — optional, delay in milliseconds before the created element is removed from the DOM.
  Defaults to no cleanup.

### Examples

1. Create a div element with a single attribute

    ```adblock
    example.com#%#//scriptlet('trusted-create-element', 'body', 'div', 'data-cur="1"')
    ```

1. Create a div element with text content

    ```adblock
    example.com#%#//scriptlet('trusted-create-element', 'body', 'div', '', 'Hello world!')
    ```

1. Create a button element with multiple attributes, including attribute without value, and text content

    <!-- markdownlint-disable line-length -->

    ```adblock
    example.com#%#//scriptlet('trusted-create-element', 'body', 'button', 'disabled aria-hidden="true" style="width: 0px"', 'Press here')
    ```

    <!-- markdownlint-enable line-length -->

1. Create a button element with an attribute whose value contains quotes

    ```adblock
    example.com#%#//scriptlet('trusted-create-element', 'body', 'button', 'data="a\\"quote"')
    ```

1. Create a paragraph element with text content and remove it after 5 seconds

    ```adblock
    example.com#%#//scriptlet('trusted-create-element', '.container > article', 'p', '', 'Hello world!', '5000')
    ```

[Scriptlet source](../src/scriptlets/trusted-create-element.ts)

* * *

## <a id="trusted-dispatch-event"></a> ⚡️ trusted-dispatch-event

> Added in v1.11.1.

Dispatches a custom event on a specified target.

### Syntax

```text
example.org#%#//scriptlet('trusted-dispatch-event', event[, target])
```

- `event` — required, name of the event to dispatch
- `target` — optional, target on which event will be invoked. Possible values:
    - CSS selector — dispatch event on the element with the specified selector
    - `window` — dispatch event on the window object
    - if not set, then "document" is used — it's default value

### Examples

1. Dispatches a custom event "click" on the document.

    ```adblock
    example.org#%#//scriptlet('trusted-dispatch-event', 'click')
    ```

2. Dispatches a custom event "submit" on the element with the class "test".

    ```adblock
    example.org#%#//scriptlet('trusted-dispatch-event', 'submit', '.test')
    ```

3. Dispatches a custom event "load" on the window object.

    ```adblock
    example.org#%#//scriptlet('trusted-dispatch-event', 'load', 'window')
    ```

[Scriptlet source](../src/scriptlets/trusted-dispatch-event.ts)

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
<!-- markdownlint-disable-next-line line-length -->
- `verbose` — optional, boolean, if set to 'true' will log original and modified text content of fetch responses.

> `verbose` may be useful for debugging but it is not allowed for prod versions of filter lists.

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

1. Replace "foo" text content with "bar" of all fetch responses for example.com and log original and modified text content <!-- markdownlint-disable-line line-length -->

    ```adblock
    example.org#%#//scriptlet('trusted-replace-fetch-response', 'foo', 'bar', 'example.com', 'true')
    ```

[Scriptlet source](../src/scriptlets/trusted-replace-fetch-response.js)

* * *

## <a id="trusted-replace-node-text"></a> ⚡️ trusted-replace-node-text

> Added in v1.9.37.

Replaces text in text content of matched DOM nodes.

### Syntax

```text
example.org#%#//scriptlet('trusted-replace-node-text', nodeName, textMatch, pattern, replacement)
```

- `nodeName` — required, string or RegExp, specifies DOM node name from which the text will be removed.
Must target lowercased node names, e.g `div` instead of `DIV`.
- `textMatch` — required, string or RegExp to match against node's text content.
If matched, the `pattern` will be replaced by the `replacement`. Case sensitive.
- `pattern` — required, string or regexp for matching contents of `node.textContent` that should be replaced.
- `replacement` — required, string to replace text content matched by `pattern`.
- `...extraArgs` — optional, string, if includes 'verbose' will log original and modified text content.

> `verbose` may be useful for debugging but it is not allowed for prod versions of filter lists.

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

3. Replace node's text content and log original and modified text content:

    ```adblock
    example.org#%#//scriptlet('trusted-replace-node-text', 'div', 'some', 'text', 'other text', 'verbose')
    ```

[Scriptlet source](../src/scriptlets/trusted-replace-node-text.js)

* * *

## <a id="trusted-replace-outbound-text"></a> ⚡️ trusted-replace-outbound-text

> Added in v1.11.1.

Replace the text in the outbound function call.

Related UBO scriptlet:
https://github.com/gorhill/uBlock/commit/21e1ee30ee36c1b9a7a3c9f43ac97e52d8e79661

### Syntax

<!-- markdownlint-disable line-length -->
```text
example.org#%#//scriptlet('trusted-replace-outbound-text', methodPath[, textToReplace[, replacement[, decodeMethod[, stack[, logContent]]]]])
```
<!-- markdownlint-enable line-length -->

- `methodPath` — required, the name of the function to trap, it must have an object as an argument.
  Call with only `methodPath` as an argument will log all text content of the specified function to console,
  but only if function call returns a string, otherwise it will log information that content is not a string.
- `textToReplace` — optional, string or regular expression which should be replaced.
  By default it's set to `''`. If it's not set to other value and `logContent` is set, it will log the original content.
- `replacement` — optional, string which replace the matched text.
  By default it's set to '', so matched content will removed.
- `decodeMethod` — optional, string which specifies the method used to decode the content.
  For now supported value is 'base64'. By default it's set to `''` and no decoding is performed.
  If it's set and `logContent` is also set and `textToReplace` and `replacement` are not set,
  then it will log the decoded content.
- `stack` — optional, string or regular expression that must match the current function call stack trace.
  If regular expression is invalid it will be skipped.
- `logContent` — optional, if set to any value, the original and modified content will be logged.
  By default it's set to '' and no content will be logged.

> Logging content may be useful for debugging but it is not allowed for prod versions of filter lists.

### Examples

<!-- markdownlint-disable line-length -->

1. Replace `foo` with 'bar' from the payload of the atob call:

    ```adblock
    example.org#%#//scriptlet('trusted-replace-outbound-text', 'atob', 'foo', 'bar')
    ```

    For instance, the following call will return `bar`

    ```html
    const text = btoa('foo');
    atob(text);
    ```

1. Replace `disable_ads:false` with 'disable_ads:true' from the payload of the `Array.prototype.join` if content is encoded in base64:

    ```adblock
    example.org#%#//scriptlet('trusted-replace-outbound-text', 'Array.prototype.join', 'disable_ads:false', 'disable_ads:true', 'base64')
    ```

    For instance, the following call will return `ZGlzYWJsZV9hZHM6dHJ1ZQ==` which is `'disable_ads:true'` after decoding

    ```html
    const arrayBase64 = ['ZGlzYWJsZV9h','ZHM6ZmFsc2U=']; // `ZGlzYWJsZV9hZHM6ZmFsc2U=` after decoding is `disable_ads:false`
    arrayBase64.join('');
    ```

1. Replace `"loadAds":true` with `"loadAds":false` from the payload of the JSON.stringify if the stack trace contains `testStackFunction`:

    ```adblock
    example.org#%#//scriptlet('trusted-replace-outbound-text', 'JSON.stringify', '"loadAds":true', '"loadAds":false', '', 'testStackFunction')
    ```

    For instance, the following call will return `'{"loadAds":false,"content":"bar"}'`

    ```html
    const testStackFunction = () => JSON.stringify({ loadAds: true, content: 'bar' });
    testStackFunction();
    ```

1. Call with `decodeMethod` and `logContent` arguments will log original and decoded text content of the specified function:

    ```adblock
    example.org#%#//scriptlet('trusted-replace-outbound-text', 'Array.prototype.join', '', '', 'base64', '', 'true')
    ```

1. Call with only first argument will log text content of the specified function:

    ```adblock
    example.org#%#//scriptlet('trusted-replace-outbound-text', 'atob')
    ```

1. Call with `logContent` argument will log original and modified text content of the specified function:

    ```adblock
    example.org#%#//scriptlet('trusted-replace-outbound-text', 'atob', 'foo', 'bar', '', '', 'true')
    ```

<!-- markdownlint-enable line-length -->

[Scriptlet source](../src/scriptlets/trusted-replace-outbound-text.ts)

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
- `verbose` — optional, boolean, if set to 'true' will log original and modified text content of XMLHttpRequests.

> `verbose` may be useful for debugging but it is not allowed for prod versions of filter lists.

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

    <!-- markdownlint-disable line-length -->

    ```adblock
    example.org#%#//scriptlet('trusted-replace-xhr-response', '/#EXT-X-VMAP-AD-BREAK[\s\S]*?/', '#EXT-X-ENDLIST', '/\.m3u8/ method:/GET|HEAD/')
    ```

   <!-- markdownlint-enable line-length -->

1. Remove all text content of all XMLHttpRequests for example.com

    ```adblock
    example.org#%#//scriptlet('trusted-replace-xhr-response', '*', '', 'example.com')
    ```

1. Replace "foo" text content with "bar" of all XMLHttpRequests for example.com and log original and modified text content <!-- markdownlint-disable-line line-length -->

    ```adblock
    example.org#%#//scriptlet('trusted-replace-xhr-response', 'foo', 'bar', 'example.com', 'true')
    ```

[Scriptlet source](../src/scriptlets/trusted-replace-xhr-response.js)

* * *

## <a id="trusted-set-attr"></a> ⚡️ trusted-set-attr

> Added in v1.10.1.

Sets attribute with arbitrary value on the specified elements. This scriptlet runs once when the page loads
and after that on DOM tree changes.

### Syntax

```text
example.org#%#//scriptlet('trusted-set-attr', selector, attr[, value])
```

- `selector` — required, CSS selector, specifies DOM nodes to set attributes on
- `attr` — required, attribute to be set
- `value` — optional, the value to assign to the attribute, defaults to ''.

### Examples

1. Set attribute by selector

    ```adblock
    example.org#%#//scriptlet('trusted-set-attr', 'div.class > a.class', 'test-attribute', '[true, true]')
    ```

    ```html
    <!-- before -->
    <div>
        <a>Another text</a>
        <a class="class">Some text</a>
    </div>

    <!-- after -->
    <div>
        <a>Another text</a>
        <a class="class" test-attribute="[true, true]">Some text</a>
    </div>
    ```

1. Set attribute without value

    ```adblock
    example.org#%#//scriptlet('trusted-set-attr', 'a.class', 'test-attribute')
    ```

    ```html
    <!-- before -->
    <a class="class">Some text</div>

    <!-- after -->
    <a class="class" test-attribute>Some text</div>
    ```

1. Set attribute value to `MTIzNTY=`

    ```adblock
    example.org#%#//scriptlet('trusted-set-attr', 'a.class', 'test-attribute', 'MTIzNTY=')
    ```

    ```html
    <!-- before -->
    <a class="class">Some text</div>

    <!-- after -->
    <a class="class" test-attribute="MTIzNTY=">Some text</div>
    ```

1. Set attribute value to `{ playback: false }`

    ```adblock
    example.org#%#//scriptlet('trusted-set-attr', 'a.class', 'test-attribute', '{ playback: false }')
    ```

    ```html
    <!-- before -->
    <a class="class">Some text</div>

    <!-- after -->
    <a class="class" test-attribute="{ playback: false }">Some text</div>
    ```

[Scriptlet source](../src/scriptlets/trusted-set-attr.js)

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
and with optional ability to offset cookie attribute 'expires', set path
and set domain.
Also reloads the current page after the cookie setting.
If reloading option is not needed, use the [`trusted-set-cookie` scriptlet](#trusted-set-cookie).

### Syntax

```text
example.org#%#//scriptlet('trusted-set-cookie-reload', name, value[, offsetExpiresSec[, path[, domain]]])
```

- `name` — required, cookie name to be set
- `value` — required, cookie value. Possible values:
    - arbitrary value
    - empty string for no value
    - `$now$` keyword for setting current time in ms, e.g 1667915146503
    - `$currentDate$` keyword for setting current time as string, e.g 'Tue Nov 08 2022 13:53:19 GMT+0300'
    - `$currentISODate$` keyword for setting current date in the date time string format,
      e.g '2022-11-08T13:53:19.650Z'
- `offsetExpiresSec` — optional, offset from current time in seconds, after which cookie should expire;
  defaults to no offset. Possible values:
    - positive integer in seconds
    - `1year` keyword for setting expiration date to one year
    - `1day` keyword for setting expiration date to one day
- `path` — optional, argument for setting cookie path, defaults to `/`; possible values:
    - `/` — root path
    - `none` — to set no path at all
- `domain` — optional, cookie domain, if not set origin will be set as domain,
             if the domain does not match the origin, the cookie will not be set

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

1. Set cookie with domain

    ```adblock
    example.org#%#//scriptlet('trusted-set-cookie-reload', 'cmpconsent', 'decline', '', 'none', 'example.org')
    ```

[Scriptlet source](../src/scriptlets/trusted-set-cookie-reload.js)

* * *

## <a id="trusted-set-cookie"></a> ⚡️ trusted-set-cookie

> Added in v1.7.3.

Sets a cookie with arbitrary name and value,
and with optional ability to offset cookie attribute 'expires', set path
and set domain.

### Syntax

```text
example.org#%#//scriptlet('trusted-set-cookie', name, value[, offsetExpiresSec[, path[, domain]]])
```

- `name` — required, cookie name to be set
- `value` — required, cookie value. Possible values:
    - arbitrary value
    - empty string for no value
    - `$now$` keyword for setting current time in ms, e.g 1667915146503
    - `$currentDate$` keyword for setting current time as string, e.g 'Tue Nov 08 2022 13:53:19 GMT+0300'
    - `$currentISODate$` keyword for setting current date in the date time string format,
      e.g '2022-11-08T13:53:19.650Z'
- `offsetExpiresSec` — optional, offset from current time in seconds, after which cookie should expire;
  defaults to no offset. Possible values:
    - positive integer in seconds
    - `1year` keyword for setting expiration date to one year
    - `1day` keyword for setting expiration date to one day
- `path` — optional, argument for setting cookie path, defaults to `/`; possible values:
    - `/` — root path
    - `none` — to set no path at all
- `domain` — optional, cookie domain, if not set origin will be set as domain,
             if the domain does not match the origin, the cookie will not be set

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

1. Set cookie with domain

    ```adblock
    example.org#%#//scriptlet('trusted-set-cookie', 'cmpconsent', 'decline', '', 'none', 'example.org')
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
    - `$currentISODate$` keyword for setting current date in the date time string format,
      corresponds to `(new Date).toISOString()` call, e.g '2022-11-08T13:53:19.650Z'

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

## <a id="trusted-set-session-storage-item"></a> ⚡️ trusted-set-session-storage-item

> Added in v1.11.16.

Adds item with arbitrary key and value to sessionStorage object, or updates the value of the key if it already exists.
Scriptlet won't set item if storage is full.

### Syntax

```adblock
example.com#%#//scriptlet('trusted-set-session-storage-item', 'key', 'value')
```

- `key` — required, key name to be set.
- `value` — required, key value; possible values:
    - arbitrary value
    - `$now$` keyword for setting current time in ms, corresponds to `Date.now()` and `(new Date).getTime()` calls
    - `$currentDate$` keyword for setting string representation of the current date and time,
      corresponds to `Date()` and `(new Date).toString()` calls
    - `$currentISODate$` keyword for setting current date in the date time string format,
      corresponds to `(new Date).toISOString()` call, e.g '2022-11-08T13:53:19.650Z'

### Examples

1. Set session storage item

    <!-- markdownlint-disable line-length -->

    ```adblock
    example.org#%#//scriptlet('trusted-set-session-storage-item', 'player.live.current.mute', 'false')

    example.org#%#//scriptlet('trusted-set-session-storage-item', 'COOKIE_CONSENTS', '{"preferences":3,"flag":false}')

    example.org#%#//scriptlet('trusted-set-session-storage-item', 'providers', '[16364,88364]')

    example.org#%#//scriptlet('trusted-set-session-storage-item', 'providers', '{"providers":[123,456],"consent":"all"}')
    ```

    <!-- markdownlint-enable line-length -->

1. Set item with current time since unix epoch in ms

    ```adblock
    example.org#%#//scriptlet('trusted-set-session-storage-item', 'player.live.current.play', '$now$')
    ```

1. Set item with current date, e.g 'Tue Nov 08 2022 13:53:19 GMT+0300'

    ```adblock
    example.org#%#//scriptlet('trusted-set-session-storage-item', 'player.live.current.play', '$currentDate$')
    ```

1. Set item without value

    ```adblock
    example.org#%#//scriptlet('trusted-set-session-storage-item', 'ppu_main_none', '')
    ```

[Scriptlet source](../src/scriptlets/trusted-set-session-storage-item.ts)

* * *

## <a id="trusted-suppress-native-method"></a> ⚡️ trusted-suppress-native-method

> Added in v1.10.25.

Prevents a call of a given native method, matching the call by incoming arguments.

### Syntax

```text
example.org#%#//scriptlet('trusted-suppress-native-method', methodPath, signatureStr[, how[, stack]])
```

<!-- markdownlint-disable line-length -->

- `methodPath` – required, string path to a native method (joined with `.` if needed). The property must be attached to `window`.
- `signatureStr` –  required, string of `|`-separated argument matchers.
Supported value types with corresponding matchers:

    - string – exact string, part of the string or regexp pattern. Empty string `""` to match an empty string. Regexp patterns inside object matchers are not supported.
    - number, boolean, null, undefined – exact value,

    - object – partial of the object with the values as mentioned above, i.e by another object, that includes property names and values to be matched,
    - array – partial of the array with the values to be included in the incoming array, without considering the order of values.

To ignore specific argument, explicitly use whitespace as a matcher, e.g `' | |{"prop":"val"}'` to skip matching first and second arguments.

<!-- markdownlint-enable line-length -->

- `how` – optional, string, one of the following:
    - `abort` – default, aborts the call by throwing an error,
    - `prevent` – replaces the method call with the call of an empty function.
- `stack` — optional, string or regular expression that must match the current function call stack trace.

### Examples
<!-- markdownlint-disable-next-line line-length -->
1. Prevent `localStorage.setItem('test-key', 'test-value')` call matching first argument by regexp pattern and the second one by substring:

    ```adblock
    example.org#%#//scriptlet('trusted-suppress-native-method', 'localStorage.setItem', '/key/|"value"', 'prevent')
    ```

1. Abort `obj.hasOwnProperty('test')` call matching the first argument:

    ```adblock
    example.org#%#//scriptlet('trusted-suppress-native-method', 'Object.prototype.hasOwnProperty', '"test"')
    ```

1. Prevent `Node.prototype.appendChild` call on element with the id `test-id` by object matcher:

    ```adblock
    example.org#%#//scriptlet('trusted-suppress-native-method', 'Node.prototype.appendChild', '{"id":"str"}', 'prevent')
    ```

1. Abort all `document.querySelectorAll` calls with `div` as the first argument:

    ```adblock
    example.org#%#//scriptlet('trusted-suppress-native-method', 'Document.prototype.querySelectorAll', '"div"')
    ```

1. Abort `Array.prototype.concat([1, 'str', true, null])` calls by matching array argument contents:

    ```adblock
    example.org#%#//scriptlet('trusted-suppress-native-method', 'Array.prototype.concat', '[1, "str", true]')
    ```

1. Use `stack` argument to match by the call, while also matching the second argument:

    <!-- markdownlint-disable line-length -->

    ```adblock
    example.org#%#//scriptlet('trusted-suppress-native-method', 'sessionStorage.setItem', ' |"item-value"', 'abort', 'someFuncName')
    ```

    <!-- markdownlint-enable line-length -->

[Scriptlet source](../src/scriptlets/trusted-suppress-native-method.ts)

* * *

