# Scriptlets and Redirect Resources Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog], and this project adheres to [Semantic Versioning].

[Keep a Changelog]: https://keepachangelog.com/en/1.0.0/
[Semantic Versioning]: https://semver.org/spec/v2.0.0.html

<!-- TODO: change `@added unknown` tag due to the actual version -->
<!--       during new scriptlets or redirects releasing -->

## [Unreleased]

### Added

- XPath expressions support in `trusted-click-element` selectors, wrapped in `xpath()`,
  e.g. `xpath(//button[contains(text(), "Accept")])`, also combined with `>>>` combinator,
  e.g. `div#host >>> xpath(descendant-or-self::button)`. Absolute paths after `>>>` are evaluated against
  the document in Chromium-based browsers before version 146, so e.g. `xpath(//button)` selects nothing there,
  and relative paths with `descendant-or-self::` axis should be used instead. Invalid XPath expressions are logged once
  and the scriptlet exits. Errors which occur only on evaluation of page elements,
  e.g. a type error in a predicate like `//button[count(1)]`, may not be detected and are not logged,
  and such expression selects nothing while the error occurs, e.g. while there is a button on the page,
  or after `>>>` only the elements of top-level elements of the shadow root without the error.
- `isTrusted:all` in `extraMatch` of `trusted-click-element` to spoof `isTrusted` for all click-related events on the
  page, including the page's own ones, e.g. a click which a page handler dispatches on another element in response,
  similarly to the behavior before [#582], but trusted events are passed unchanged, and all listeners of an event
  receive the same proxy. Only listeners added by `addEventListener()` after the scriptlet has run receive spoofed
  events of the page; inline `on...` handlers receive spoofed events only on the clicked element during an event of the
  scriptlet of the same type, including the page's own events of that type dispatched on it meanwhile, so other page
  events may reach them unspoofed. It is enabled for the whole page, including the clicks of other rules, and may break
  the page, e.g. its guards which compare events, or its code which passes events to native methods, so use it only if
  the page does not accept the clicks of the scriptlet otherwise. It can be combined with other conditions in any
  order, but for compatibility with older versions of the scriptlet, it should be the first or the only condition,
  e.g. `isTrusted:all, !cookie:consent`. Older versions ignore it only there, but take it after another condition
  as a part of that condition's value, e.g. with `!cookie:consent, isTrusted:all` they click regardless of the
  `consent` cookie, and with `containsText:Accept, isTrusted:all` they never click.

### Changed

- Minimum supported Microsoft Edge version is now Edge Chromium 80.
- `trusted-click-element` spoofs `isTrusted` by default only for its own clicks, and for the clicks which labels
  forward from them to their controls, as one event shared by all listeners, instead of all click-related events
  on the page, which replaced the page's own events with proxies and broke popup opening-event guards [#582].
  The spoofed event is still not the same object as `window.event`. If a rule needs the page's own events
  to be spoofed as well, e.g. a click which a page handler dispatches in response, `isTrusted:all` should be added
  to its `extraMatch`, as the first condition for compatibility with older versions. It is needed as well for a click
  forwarded by a label in a closed shadow root which wraps the slot of the clicked element, as such label is not found
  by default. If an older version of `trusted-click-element` runs on the same page as well, e.g. in another AdGuard
  product, and this version hooks event listeners first, the clicks of the older version are not spoofed
  for event listeners until the page is reloaded, unless a rule of this version has `isTrusted:all`.
  If the page has sealed `EventTarget.prototype` before the scriptlet runs, `isTrusted` is not spoofed for event
  listeners, which is logged, as the rules cannot share the hook then, but the elements are still clicked.
- `trusted-click-element` validates its selectors once and exits if any of them is invalid, logging it with
  the reason, instead of throwing an error after hooking event listeners and `attachShadow`, or on each DOM change.
  So no element is clicked then, including the ones matched by valid selectors before the invalid one,
  e.g. a selector with a pseudo-class which is not supported by the browser.
- `stack` of `trusted-json-set` is matched against the stack trace of the intercepted call without the frames
  of the scriptlet itself, which it contained before. So `stack` values which matched these frames no longer match
  the calls from other scripts, e.g. `inlineScript` if the scriptlet is injected as an inline script.
  Also, a call which does not match `stack` is not processed at all, e.g. a JSON string returned by it
  is not parsed and serialized again, which removed its formatting before.
- `trusted-replace-outbound-text` with `stack` calls `hit` only for the calls which match `stack`.

### Deprecated

- Edge Legacy support.

### Removed

### Fixed

- `xml-prune` evaluating an XPath expression without the closing parenthesis with its last character dropped,
  e.g. `xpath(//*[name()="Period"]/@duration` as `//*[name()="Period"]/@duratio`, instead of logging it as invalid.
- Fetch-based scriptlets failing to match requests when `fetch` receives a `URL` object [#577].
- Scriptlets which re-apply themselves on DOM changes, e.g. `remove-attr` and `remove-class`, no longer stop
  doing it after an error thrown on a DOM change, e.g. by the page for an element. Also, `remove-attr`,
  `remove-class`, `remove-in-shadow-dom` and `hide-in-shadow-dom` log an error thrown for an element once,
  and continue with other elements, including ones added later, even if the error is thrown when the rule
  is applied.
- Infinite mutation loop and repeated logging when several non-conflicting `set-attr` or `trusted-set-attr`
  rules are applied on the same page: the attribute is no longer re-set, and `hit` is not called,
  if it already has the required value. Also, `set-attr` logs a missing attribute to copy the value from
  once for each element until the attribute is found, even if the element already holds the copied value.
  An error thrown for an element, e.g. by the page, is logged once for the element and does not stop setting
  the attribute on other elements, including ones added later, or prevent `hit` for changed elements.
  An invalid name of the attribute to copy the value from, e.g. `[data a]` or `[]`, is logged once
  as an invalid value, instead of setting the attribute to `null` on each matched element.
- Infinite mutation loop between several non-conflicting `href-sanitizer` rules, and `hit` called
  on each DOM change: `href` is no longer re-set, and `hit` is not called, if the link, including SVG `<a>`
  element, already points to the sanitized URL. Also, `href-sanitizer` logs invalid arguments only once,
  logs a failure to sanitize a link only once until its `href` or the value taken from the link is changed,
  or the URL resolved from it if the failure depends on the document base URL, and does not log a link
  sanitized by the rule as a failure, e.g. one without the URL parameter, or a base64 string which is not a URL
  if another one in the same value is decoded. An error thrown for a link, e.g. by the page, is logged once
  and does not stop sanitizing of other links.
- `href-sanitizer` resolving relative URLs against the page URL or its origin instead of the document base URL,
  e.g. `removeHash` and `removeParam` transforms rewrote a path-relative link to a wrong URL,
  or a link within the page, e.g. `#comments`, to another page.
- Infinite mutation loop between an `href-sanitizer` rule and another one which changes the URL set by it,
  e.g. a rule with link text and a rule with `removeParam:utm_source` on the same link, or a rule
  with an attribute and a rule with `?url` which unwraps the redirect set by the first one. Rules share their
  last actual write on the affected link, without a `window` registry or HTML attributes, so page edits
  of the link are still corrected, including ones which another rule has changed.
- `href-sanitizer` not sanitizing SVG `<a>` element by a URL parameter, e.g. `?url`.
- `removeHash` and `removeParam` transforms of `href-sanitizer` not setting the URL found in the link text,
  attribute or URL parameter if there is nothing to remove from it, as it is done without a transform.
- `href-sanitizer` setting link text which is not a URL as a relative URL or as a broken URL: link text is set
  only if it is an absolute URL or a path without whitespaces, e.g. not `Click here`, `Download`, `?`
  or `https://example.org/ (external)`, and not if a tab or newline is between its words, e.g. between
  the URL and the title of a card, rather than next to a URL delimiter, e.g. `/`. Also, a value of only
  whitespaces is not set, and neither is a placeholder hash, i.e. `#` or `#!`, unless it is `href` of the link.
- `href-sanitizer` decoding `+` in the URL parameter as a whitespace if the parameter is a URL which is not
  encoded, e.g. `?url=https://example.org/c++/docs` or `?url=https%3A//example.org/c++/docs`.
- `href-sanitizer` not decoding base64 string in a relative `href`, in `href` within the page, e.g. `#<base64>`,
  or in the hash if the query has no base64 encoded URL, e.g. `https://example.org/?ref=1#<base64>`.
- `href-sanitizer` accepting any transform starting with `removeParam`, e.g. `removeParams`, which removed
  all parameters.
- `href-sanitizer` unwrapping nested redirects in the URL parameter or base64 encoded ones only one by one
  on each DOM change; now up to 10 of them are unwrapped at once, and the rest right after that, as long as
  the link is still matched by the selector. Relative URL in the nested redirect, e.g. a parameter of the target
  with the same name, is not followed and not logged, since it is relative to the redirect, except for
  a scheme-relative one, e.g. `//example.org/`.
- Repeated logging on each DOM change by `remove-attr` if its selector matches elements without the attribute:
  `hit` is called only if some attribute has actually been removed. Also, invalid selector is logged only once.
- Infinite mutation loop between several `hide-in-shadow-dom` rules whose targets are light DOM children
  of shadow hosts, and `hit` called on each DOM change: already hidden elements are no longer re-hidden,
  and `hit` is called only if some element has actually been hidden.
- `hide-in-shadow-dom` and `remove-in-shadow-dom` not working if `baseSelector` matches an element
  which is not a shadow host itself, e.g. a container of shadow hosts. Also, both scriptlets log an invalid
  `selector` or `baseSelector` instead of throwing an error.
- Invalid selector logged on each DOM change by `remove-class`, `set-attr` and `trusted-set-attr`,
  as well as invalid attribute name by `set-attr` and `trusted-set-attr`: they are now validated
  and logged only once.
- `remove-class` and `remove-attr` not removing classes or attributes whose names are not valid CSS identifiers,
  e.g. `md:hidden` or `x-on:click`, if no selector is specified.
- `trusted-click-element` splitting selectors by commas inside pseudo-classes, e.g. `:is(.accept, .agree)`,
  by commas inside quoted attribute values, e.g. `[title="Accept, agree"]`, and by escaped commas,
  e.g. `#accept\,agree`, which made such selectors invalid. Also, `>>>` inside quoted strings or CSS comments,
  e.g. in `[title=" >>> "]`, is no longer taken for the shadow combinator.
- `trusted-click-element` ignoring `containsText` when it finds an element again because the found one
  was removed from DOM before the click, which could click another element matching the selector.
- `trusted-click-element` not clicking an element if `containsText`, or the key of a `cookie` condition,
  is a regexp with `g` or `y` flag, as each next check started from the end of the previous match,
  e.g. `cookie:/consent/g=/yes/` did not match `consent_a=no; consent_b=yes`.
- `trusted-click-element` clicking next elements of the sequence if a previous element was removed from DOM
  before the click and could not be found again.
- `trusted-click-element` not clicking elements after an empty selector, e.g. `#accept` in `#settings,, #accept`,
  and not calling `hit` if there is a trailing comma, e.g. in `#accept,`: empty selectors, and ones with only
  a CSS comment, are skipped.
- `trusted-click-element` hooking event listeners and `attachShadow` even when it exits early
  because of invalid timeout, delay or reload values or unmatched `extraMatch` conditions [#582].
- `trusted-click-element` failing to remove or deduplicate listeners shared across event targets,
  registered with non-boolean `capture` values or with options which return a different value on each read,
  and failing to remove a listener registered before the scriptlet ran if the same listener was also added
  after it [#582].
- `trusted-click-element` not finding elements in a closed shadow root attached with options which return
  a different `mode` on each read.
- `trusted-click-element` not clicking next elements of the sequence if a React click handler of the page throws,
  and clicking the element again when the sequence is continued, with the error not logged but reported
  as an unhandled rejection: the error is logged once and the next elements are clicked.
- `trusted-click-element` silently not spoofing `isTrusted`, or not tracking shadow roots attached later,
  if another script has made `addEventListener()`, `removeEventListener()` or `attachShadow()` read-only:
  it is logged now, and elements which can still be found are clicked.
- `trusted-click-element` with `>>>` combinator observing shadow roots attached after it has found all elements
  or its observer has timed out, which changed an attribute of the `html` element on each of their changes
  and so woke up all observers of the page for its whole lifetime.
- `trusted-click-element` throwing when inline `on*` handlers or React handlers set `cancelBubble`
  or `returnValue` on a scriptlet click [#582].
- `trusted-click-element` restoring inline `on*` handlers of the clicked element
  that the page replaced or cleared during the click [#582].
- `trusted-click-element` exposing a bound `constructor` on spoofed events
  and an untrusted `nativeEvent` to React handlers [#582].
- `trusted-click-element` passing an untrusted event to an inline `on...` handler of the clicked element
  which the page assigns during an earlier event of the click, e.g. `onclick` set on `mousedown`.
- `trusted-click-element` reporting outdated `isDefaultPrevented()` and `isPropagationStopped()` to React handlers
  if the default action or propagation is changed through `nativeEvent`, `returnValue` or `cancelBubble`.
- `trusted-json-set` modifying a native `Promise` returned by the intercepted method, e.g. `Response.prototype.json`,
  instead of the value it is fulfilled with [#585]. The value is modified now, and a new promise of it is returned,
  while a rejection is passed through. In logging-only mode, the value is logged, and the original promise is
  returned. Promises of polyfills or libraries which replace `window.Promise`, e.g. zone.js, are not supported.
  `stack` is matched when the method is called, so it works for such values as well. Also, the intercepted method
  is no longer called again if it throws an error.
- `stack` of `trusted-replace-outbound-text`, `trusted-suppress-native-method`, `json-prune-xhr-response`
  and `trusted-json-set-xhr-response` not matching the function which calls the intercepted method in browsers
  whose stack traces have no error message line, e.g. Firefox, as the frame of that function was removed
  as the scriptlet's own one.
- `trusted-replace-outbound-text` not modifying any content after the intercepted method is called
  from a function which does not match `stack`, e.g. by another script of the page, or after it throws an error,
  e.g. `JSON.stringify` of an object with a circular reference.
- `trusted-replace-argument` calling the intercepted method or constructor again if it throws an error,
  so its side effects were repeated, and the second call could even succeed.
- `trusted-suppress-native-method` throwing an error to the page and no longer intercepting the next calls
  after an error while a call is matched, e.g. thrown by a getter of an argument. Such call is not suppressed now.
- `trusted-suppress-native-method`, `trusted-json-set`, `trusted-replace-argument`, `trusted-replace-outbound-text`,
  `trusted-prune-inbound-object` and `call-nothrow` not intercepting methods of `localStorage` and `sessionStorage`,
  e.g. `localStorage.setItem`, in Firefox, and storing an item named after the method in the storage instead,
  e.g. `setItem`. The method is replaced in `Storage.prototype` now, unless the page has assigned its own method
  to the storage, e.g. in Chrome, and only its calls on the storage of the rule are processed, also the ones made
  through `Storage.prototype`.

[#577]: https://github.com/AdguardTeam/Scriptlets/issues/577
[#582]: https://github.com/AdguardTeam/Scriptlets/issues/582
[#585]: https://github.com/AdguardTeam/Scriptlets/issues/585

### Security

## [2.5.1] - 2026-08-25

## [2.5.1-beta.1] - 2026-08-25

### Changed

- Updated [@adguard/agtree] to v4.2.1.

## [2.5.1-beta.0] - 2026-08-05

### Added

- Support of `$now$`, `$currentDate$`, and `$currentISODate$` keywords used as a part of the value,
  not as a standalone value only, e.g. `'{"count":1,"firstTime":$now$}'`;
  more than one keyword may be used in the value.
  Applies to `trusted-set-cookie`, `trusted-set-cookie-reload`,
  `trusted-set-local-storage-item`, and `trusted-set-session-storage-item` scriptlets [#573].
- Support of `$now$`, `$currentDate$`, and `$currentISODate$` keywords in `argumentValue`
  of `trusted-json-set`, `trusted-json-set-fetch-response`, and `trusted-json-set-xhr-response`
  scriptlets — as a whole value, as a part of it, and inside `json:` and `replace:` values,
  e.g. `'json:{"count":1,"firstTime":$now$}'` [#573].

[#573]: https://github.com/AdguardTeam/Scriptlets/issues/573

## [2.5.0] - 2026-07-27

### Added

- `json-edit`, `json-edit-xhr-response`, and `json-edit-fetch-response`
  scriptlet aliases as uBO-compatible names for `json-prune`,
  `json-prune-xhr-response`, and `json-prune-fetch-response` respectively [#566].
- Dot-prefixed JSONPath auto-detection in `resolveJsonSyntaxMode` — expressions
  starting with `.` are now treated as JSONPath mode without explicitly
  passing `mode=jsonpath` [#566].
- `trusted-prevent-xhr` scriptlet, a trusted variant of `prevent-xhr` that
  supports passing arbitrary literal text as the XHR response body [#417].
- Expanded `prevent-xhr` `randomize` directive: added `emptyObj`, `emptyArr`,
  `emptyStr`, single-value `length:N` (e.g. `length:50`).
- `prevent-xhr` and `trusted-prevent-xhr` now handle `document` and `json` XHR
  `responseType` values when intercepting matched requests.

### Changed

- Updated [@adguard/agtree] to v4.2.0.
- UBO aliases for `prevent-bab` scriptlet and redirect.

### Fixed

- `trusted-replace-argument` — when `replace:` is used and the argument is not a string,
  the argument is no longer blindly overwritten with the replacement value; the replacement
  is applied to its string form and the original value and type are kept when the pattern
  does not match [#570].
- `adjust-setTimeout`, `adjust-setInterval`, `prevent-setTimeout`,
  `prevent-setInterval`, and `prevent-requestAnimationFrame` now handle
  callbacks with a modified prototype chain: `isValidCallback` uses a `typeof`
  check instead of `instanceof Function`, and callback stringification uses
  the native `Function.prototype.toString` so that `matchCallback` matching
  and logging work for such callbacks and never throw [#561].

[#417]: https://github.com/AdguardTeam/Scriptlets/issues/417
[#561]: https://github.com/AdguardTeam/Scriptlets/issues/561
[#566]: https://github.com/AdguardTeam/Scriptlets/issues/566
[#570]: https://github.com/AdguardTeam/Scriptlets/issues/570

## [2.4.3] - 2026-06-24

### Added

- `setConfig` and `getConfig` methods to `googletagservices-gpt` redirect [#560].
- Delay range matching for `prevent-setTimeout` and `prevent-setInterval` scriptlets.
  Supported formats: `min-max`, `min-`, `-max`, with `!` prefix for inversion [#467].

### Changed

- `listenerToString` helper now uses native `Function.prototype.toString`
  to prevent issues where websites redefine it [#292].
- `prevent-fetch` now supports a structured `responseConfig` argument for overriding synthetic response fields such as
  `ok`, `redirected`, `status`, `statusText`, and extended `type` values [#529].

### Fixed

- `trusted-replace-xhr-response` response headers (`getResponseHeader`, `getAllResponseHeaders`)
  now return the correct values on intercepted XHR objects [#419].
- `Maximum call stack size exceeded` error when
  `trusted-json-set` or `trusted-replace-argument` is called with method used inside scriptlet [#565].
- Infinite loop in `getRecursiveCandidates` in `json-path-utils` [#563].
- Missing `google.ima.dai.api.ui`, `google.ima.dai.api.customUi` surfaces and the
  default `StreamRequest.ui` container in the `google-ima3-dai` redirect.
- Missing `google.ima.dai.api.StreamRequest.StreamFormat` object to the `google-ima3-dai` redirect.
- Redirect resources with a `.ts` extension are now converted to `.js`.

[#292]: https://github.com/AdguardTeam/Scriptlets/issues/292
[#419]: https://github.com/AdguardTeam/Scriptlets/issues/419
[#467]: https://github.com/AdguardTeam/Scriptlets/issues/467
[#529]: https://github.com/AdguardTeam/Scriptlets/issues/529
[#560]: https://github.com/AdguardTeam/Scriptlets/issues/560
[#563]: https://github.com/AdguardTeam/Scriptlets/issues/563
[#565]: https://github.com/AdguardTeam/Scriptlets/issues/565

## [2.4.2] - 2026-04-24

### Added

- Scriptlets release version for `google-ima3-dai`.


## [2.4.1] - 2026-04-23

### Added

- `google-ima3-dai` redirect resource and scriptlet [#239].

### Changed

- Updated [@adguard/agtree] to v4.1.1

[#239]: https://github.com/AdguardTeam/Scriptlets/issues/239

## [2.4.0-beta] - 2026-04-21

### Added

- New `mode` parameter to all `json-prune` and `trusted-json-set` related scriptlets,
  which allows to specify the way of pruning JSON objects [#522].
- Line-delimited JSON processing in `trusted-json-set` related scriptlets [#522].
- `$remove$` value to all `trusted-json-set` related scriptlets, which allows removing specific properties [#522].
- Support for `JSONPath` in `json-prune`, `json-prune-fetch-response`, `json-prune-xhr-response`,
  `trusted-json-set`, `trusted-json-set-fetch-response` and `trusted-json-set-xhr-response` scriptlets [#522].

### Changed

- `trusted-json-set` now supports method-only logging, filtered log-only output,
  JSONPath-based log-only filters, and verbose logs only when a write actually happens [#308].
- `log-addEventListener` scriptlet: added new optional `noProtect` parameter,
  improving compatibility with other scriptlets that need to override `addEventListener` [#551].
- Updated [@adguard/agtree] to v4.1.0-beta.

### Fixed

- Logging original object in `trusted-json-set` scriptlet, previously original and modified object were pointing
  to the same reference, so the same content was logged, now deep copy is created for original object [#308].
- `trusted-click-element` no longer throws when event handlers set `cancelBubble`
  on spoofed events [#555].

[#522]: https://github.com/AdguardTeam/Scriptlets/issues/522
[#551]: https://github.com/AdguardTeam/Scriptlets/issues/551
[#555]: https://github.com/AdguardTeam/Scriptlets/issues/555

## [v2.3.1] - 2026-03-24

### Changed

- Updated [@adguard/agtree] to v4.0.3.

### Fixed

- `disable-newtab-links` not preventing clicks when the element has its own `click` handler
  added via `addEventListener` [#483].

[#483]: https://github.com/AdguardTeam/Scriptlets/issues/483

## [v2.3.0] - 2026-03-18

### Added

- New value to `set-cookie` and `set-cookie-reload` scriptlets: `all` [#501].
- New value to `set-cookie` and `set-cookie-reload` scriptlets: `mandatory` [#518].
- New value to `set-cookie` and `set-cookie-reload` scriptlets: `declined` [#552].
- `trusted-json-set`, `trusted-json-set-fetch-response`
  and `trusted-json-set-xhr-response` scriptlets [#308].
- `freewheel-admanager` redirect resource and scriptlet [#401].
- `getCreativeId` method to `Ad` class in `google-ima3` redirect [#515].

### Changed

- `trusted-click-element` now passes synthetic-like event objects to React handlers
  and supports `clickType:native` in `extraMatch` to force native click [#554].
- Added `interceptChainProp` helper to share intermediate chain property access logic
  across `abort-on-property-read`, `abort-on-property-write`, `abort-on-stack-trace`,
  `abort-current-inline-script`, `debug-on-property-write`, `debug-on-property-read`,
  `debug-current-inline-script` and `log-on-stack-trace` scriptlets [#513].
- `prevent-window-open` now checks all parameters [#549].
- Updated [@adguard/agtree] to v4.0.2.

### Fixed

- `prevent-fetch` — do not use `modifyResponse` on redirected requests [#545].
- issue with assigning `window` to property which was not set in
  `abort-on-property-read`, `abort-on-property-write`, `abort-on-stack-trace`,
  `abort-current-inline-script`, `debug-on-property-write`, `debug-on-property-read`,
  `debug-current-inline-script` and `log-on-stack-trace` scriptlets [#513].

[#308]: https://github.com/AdguardTeam/Scriptlets/issues/308
[#401]: https://github.com/AdguardTeam/Scriptlets/issues/401
[#501]: https://github.com/AdguardTeam/Scriptlets/issues/501
[#513]: https://github.com/AdguardTeam/Scriptlets/issues/513
[#515]: https://github.com/AdguardTeam/Scriptlets/issues/515
[#518]: https://github.com/AdguardTeam/Scriptlets/issues/518
[#545]: https://github.com/AdguardTeam/Scriptlets/issues/545
[#549]: https://github.com/AdguardTeam/Scriptlets/issues/549
[#552]: https://github.com/AdguardTeam/Scriptlets/issues/552
[#554]: https://github.com/AdguardTeam/Scriptlets/issues/554

## [v2.2.16] - 2026-02-19

### Added

- `prevent-navigation` scriptlet to prevent navigation to another URL, or reload website [#532].
- `prevent-constructor` scriptlet to prevent constructor calls
  like `new Promise()` or `new MutationObserver()` [#461].
- `remove-request-query-parameter` scriptlet to remove query parameters
  from `fetch` and `XMLHttpRequest` requests [#329].
- [Trusted Types API] support in `trusted-create-element` scriptlet [#507].
- [Trusted Types API] support in Firefox [#528].

### Changed

- `prevent-addEventListener` scriptlet: added new optional `noProtect` parameter,
  improving compatibility with other scriptlets that need to override `addEventListener` [#550].
- Updated [@adguard/agtree] to v4.0.1.

### Fixed

- `prevent-xhr` scriptlet, `responseURL` is now set at `readyState` 2, and the first
  state is skipped when `onreadystatechange` is assigned after `xhr.open()` [#485].
- Anti-adblock detection in `spoof-css` scriptlet
  by using cloaked bound functions instead of Proxies [#422].
- Response corruption in `trusted-replace-fetch-response` and `trusted-replace-xhr-response`
  scriptlets when URL pattern matches but content pattern does not [#486].
- XHR handling in `trusted-replace-xhr-response` and `xml-prune` scriptlets:
    - added `withCredentials` to forged requests,
    - fixed duplicate headers when multiple scriptlets are used,
    - used `ProgressEvent` for `load` and `loadend` events [#486].
- XHR scriptlet bypass vulnerability in `trusted-replace-xhr-response`,
  `prevent-xhr`, and `xml-prune` scriptlets where
  setting `xhr.shouldBePrevented = false` could disable the scriptlet [#386].
- Parsing of regexp patterns containing pipe `|` character in `signatureStr` arg
  of `trusted-suppress-native-method` scriptlet [#473].
- Stack matching in `set-constant` and `trusted-set-constant` scriptlets —
  now checked at property access time instead of scriptlet initialization [#500].
- Cloudflare captcha broken when `>>>` combinator
  is used in `trusted-click-element` scriptlet [#491].

[#329]: https://github.com/AdguardTeam/Scriptlets/issues/329
[#386]: https://github.com/AdguardTeam/Scriptlets/issues/386
[#422]: https://github.com/AdguardTeam/Scriptlets/issues/422
[#461]: https://github.com/AdguardTeam/Scriptlets/issues/461
[#473]: https://github.com/AdguardTeam/Scriptlets/issues/473
[#485]: https://github.com/AdguardTeam/Scriptlets/issues/485
[#486]: https://github.com/AdguardTeam/Scriptlets/issues/486
[#491]: https://github.com/AdguardTeam/Scriptlets/issues/491
[#500]: https://github.com/AdguardTeam/Scriptlets/issues/500
[#507]: https://github.com/AdguardTeam/Scriptlets/issues/507
[#528]: https://github.com/AdguardTeam/Scriptlets/issues/528
[#532]: https://github.com/AdguardTeam/Scriptlets/issues/532
[#550]: https://github.com/AdguardTeam/Scriptlets/issues/550

## [v2.2.15] - 2026-01-22

### Added

- Support for React elements that don't respond to native clicks
  in `trusted-click-element` scriptlet [#542].

### Changed

- Updated [@adguard/agtree] to v4.0.0.

### Fixed

- Do not throw error on `null` event type in `prevent-addEventListener` scriptlet [#539].

[#539]: https://github.com/AdguardTeam/Scriptlets/issues/539
[#542]: https://github.com/AdguardTeam/Scriptlets/issues/542

## [v2.2.14] - 2025-12-16

### Added

- `prevent-innerHTML` scriptlet [#488].
- Ability to configure observer timeout for `trusted-click-element` scriptlet
  with a new `observerTimeout` parameter [#400].
- Support for `window.Fingerprint` variable in `fingerprintjs2` redirect (and
  scriptlet as well since it is an alias for redirect) [#541].

### Changed

- Updated [@adguard/agtree] to v3.4.3.

[#400]: https://github.com/AdguardTeam/Scriptlets/issues/400
[#488]: https://github.com/AdguardTeam/Scriptlets/issues/488
[#541]: https://github.com/AdguardTeam/Scriptlets/issues/541

## [v2.2.13] - 2025-11-25

### Added

- New value to `set-cookie` and `set-cookie-reload` scriptlets: `denied` [#512].

### Changed

- Updated [@adguard/agtree] to v3.3.1.

### Fixed

- Determination of string values more precisely
  for `trusted-set-constant` scriptlet [#499].
- Support for negative priority suffix in UBO redirects rules.

[#499]: https://github.com/AdguardTeam/Scriptlets/issues/499
[#512]: https://github.com/AdguardTeam/Scriptlets/issues/512

## [v2.2.12] - 2025-11-12

### Changed

- Updated [@adguard/agtree] to v3.2.5.


## [v2.2.11] - 2025-10-17

### Changed

- Updated [@adguard/agtree] to v3.2.4.


## [v2.2.10] - 2025-09-11

### Added

- `-base64` as an alias of `base64decode` in `href-sanitizer` scriptlet [#493].

### Changed

- Updated [@adguard/agtree] to v3.2.3.

[#493]: https://github.com/AdguardTeam/Scriptlets/issues/493

## [v2.2.9] - 2025-08-14

### Added

- `trusted-replace-argument` scriptlet [#405].

### Fixed

- Incorrectly escaped quotes in `trusted-replace-node-text` scriptlet [#517].
- `TrustedScriptURL` in `prevent-element-src-loading` scriptlet [#514].
- Fix scriptlets compilation error in Safari 15 due to unsupported regex lookbehind [#519].

[#405]: https://github.com/AdguardTeam/Scriptlets/issues/405
[#514]: https://github.com/AdguardTeam/Scriptlets/issues/514
[#517]: https://github.com/AdguardTeam/Scriptlets/issues/517
[#519]: https://github.com/AdguardTeam/Scriptlets/issues/519

## [v2.2.8] - 2025-07-08

### Added

- UBO aliases `ubo-nobab`, `nobab`, and `bab-defuser` for `prevent-bab` AdGuard scriptlet.

### Changed

- Updated [@adguard/agtree] to v3.2.2.

### Fixed

- `trusted-set-cookie-reload` scriptlet infinite page reloading when cookie with time keyword is used [#489].

[#489]: https://github.com/AdguardTeam/Scriptlets/issues/489

<!-- v2.2.6 is the same as v2.2.7 -->
## [v2.2.7] - 2025-06-04

### Changed

- Updated [@adguard/agtree] to v3.2.1.

### Fixed

- `json-prune` scriptlet to properly handle `null` values
  while checking specified key in object [#504].

[#504]: https://github.com/AdguardTeam/Scriptlets/issues/504

<!-- v2.2.5 is the same as v2.2.4 -->
## [v2.2.4] - 2025-05-23

### Changed

- Updated [@adguard/agtree] to v3.2.0.

### Fixed

- `spoof-css` scriptlet — incorrect `DOMRect` setting [#498].

[#498]: https://github.com/AdguardTeam/Scriptlets/issues/498

## [v2.2.1] - 2025-05-21

### Fixed

- Trusted types bundle.


## [v2.2.0] - 2025-05-21

### Added

- New values to `set-cookie` and `set-cookie-reload` scriptlets: `emptyArr`, `emptyObj` [#497].
- Ability to set random response content in `prevent-fetch` scriptlet [#416].
- Ability to choose CSS injection method in `inject-css-in-shadow-dom` scriptlet [#477].
- TypeScript types for CoreLibs provided [`ContentScriptApi`](./README.md#scriptlets-api--content-script-api).
- [Trusted Types API] utility — [`PolicyApi`](./README.md#scriptlets-api--content-script-api--policy-api).

### Changed

- Improved docs for `json-prune`, `xml-prune` and `trusted-prune-inbound-object` scriptlets [#392].
- Updated [@adguard/agtree] to v3.1.5.

### Fixed

- Escaping quotes in `trusted-replace-node-text` scriptlet [#440].
- `trusted-suppress-native-method` scriptlet, `isMatchingSuspended` was not reset when the stack does not match,
  so in some cases given method was not prevented [#496].

[#392]: https://github.com/AdguardTeam/Scriptlets/issues/392
[#416]: https://github.com/AdguardTeam/Scriptlets/issues/416
[#440]: https://github.com/AdguardTeam/Scriptlets/issues/440
[#477]: https://github.com/AdguardTeam/Scriptlets/issues/477
[#496]: https://github.com/AdguardTeam/Scriptlets/issues/496
[#497]: https://github.com/AdguardTeam/Scriptlets/issues/497

## [v2.1.7] - 2025-04-03

### Changed

- Updated [@adguard/agtree] to v3.1.0.

### Added

- Ability in `prevent-addEventListener` scriptlet to match specific element
  and updated `log-addEventListener` scriptlet to log target element [#480].

[#480]: https://github.com/AdguardTeam/Scriptlets/issues/480

## [v2.1.6] - 2025-03-06

### Fixed

- Incorrectly removing content from parsed array when using the `json-prune` scriptlet [#482].

[#482]: https://github.com/AdguardTeam/Scriptlets/issues/482

## [v2.1.5] - 2025-02-28

### Changed

- Updated [@adguard/agtree] to v3.0.1.

### Added

- Ability in `json-prune` scriptlet to match `key` with specific `value`
  and remove `array`/`object` if it contains specific `item` [#183].

### Fixed

- `prevent-eval-if` and `prevent-bab` scriptlets, now `eval.toString()` call returns original value [#481].

[#183]: https://github.com/AdguardTeam/Scriptlets/issues/183
[#481]: https://github.com/AdguardTeam/Scriptlets/issues/481

## [v2.1.4] - 2025-01-20

### Changed

- ESM-only bundle.
- `trusted-click-element` scriptlet, now when `containsText` is used then it will search for all given selectors
  and click on the first element with matched text [#468].

### Fixed

- Issue with `metrika-yandex-tag` redirect when it's used as a scriptlet [#472].
- Issue with `trusted-click-element` scriptlet when `delay` was used and the element was removed
  and added again before it was clicked [#391].

[#391]: https://github.com/AdguardTeam/Scriptlets/issues/391
[#468]: https://github.com/AdguardTeam/Scriptlets/issues/468
[#472]: https://github.com/AdguardTeam/Scriptlets/issues/472

## [v2.0.1] - 2024-11-13

### Added

- `prevent-canvas` scriptlet [#451].
- [Trusted Types API] support in `trusted-replace-node-text` scriptlet [#457].
- `parentSelector` option to search for nodes for `remove-node-text` scriptlet [#397].
- `transform` option with `base64decode` value for `href-sanitizer` scriptlet [#455].
- `removeParam` and `removeHash` values in `transform` option  for `href-sanitizer` scriptlet [#460].
- New values to `set-cookie` and `set-local-storage-item` scriptlets: `forbidden`, `forever` [#458].

### Changed

- Set response `ok` to `false` by `prevent-fetch` if response type is `opaque` [#441].
- Improve `prevent-xhr` — modify response [#415].
- Improve `prevent-xhr` — add missed events [#414].
- `Source` type instead of `IConfiguration`.
- API structure. Validators, Converters, Scriptlets and redirects are now separate modules.
- The minimum supported Safari version is now 13.
- Updated [@adguard/agtree] to v3.0.0-alpha.1.

### Removed

- IIFE bundle.
- UMD bundle.
- Various conversion and validation functions including `isAdgRedirectRule`, `isAdgRedirectCompatibleWithUbo`,
  `isUboRedirectCompatibleWithAdg`, `isAbpRedirectCompatibleWithAdg`, `convertUboRedirectToAdg`,
  `convertAbpRedirectToAdg`, `convertRedirectToAdg`, and `convertRedirectNameToAdg` functions.

[#451]: https://github.com/AdguardTeam/Scriptlets/issues/451
[#415]: https://github.com/AdguardTeam/Scriptlets/issues/415
[#455]: https://github.com/AdguardTeam/Scriptlets/issues/455
[#414]: https://github.com/AdguardTeam/Scriptlets/issues/414
[#441]: https://github.com/AdguardTeam/Scriptlets/issues/441
[#397]: https://github.com/AdguardTeam/Scriptlets/issues/397
[#458]: https://github.com/AdguardTeam/Scriptlets/issues/458
[#457]: https://github.com/AdguardTeam/Scriptlets/issues/457
[#460]: https://github.com/AdguardTeam/Scriptlets/issues/460

## [v1.12.1] - 2024-09-20

### Added

- Integrated [@adguard/agtree] library for working with rules, compatibility tables,
  validator and converter.

### Fixed

- Re-adding element on every DOM change in `trusted-create-element` scriptlet [#450].
- Setting cookie which name has special prefix `__Host-` or `__Secure-`
  by `trusted-set-cookie` and `trusted-set-cookie-reload` scriptlets [#448].

[#450]: https://github.com/AdguardTeam/Scriptlets/issues/450
[#448]: https://github.com/AdguardTeam/Scriptlets/issues/448

## [v1.11.27] - 2024-08-29

### Added

- `reload` option for `trusted-click-element` scriptlet [#301].
- Support for matching line number in `abort-on-stack-trace` scriptlet
  when `inlineScript` or `injectedScript` option is used [#439].
- New values to `set-cookie` and `set-cookie-reload` scriptlets: `checked`, `unchecked` [#444].
- New values to `set-local-storage-item` and `set-session-storage-item` scriptlets:
  `allowed`, `denied` [#445].
- UBO aliases `noop-vast2.xml`, `noop-vast3.xml`, and `noop-vast4.xml` for correspondent AdGuard redirects.
- New field `uniqueId` to scriptlet configuration, allowing scriptlets to be executed only once per context.

### Changed

- UBO alias `noop-vmap1.0.xml` for `noopvmap-1.0` redirect is replaced by `noop-vmap1.xml`.

### Fixed

- Modifying `RegExp.$1, …, RegExp.$9` values
  in `log-on-stack-trace` and `abort-on-stack-trace` scriptlets [#384].

[#301]: https://github.com/AdguardTeam/Scriptlets/issues/301
[#384]: https://github.com/AdguardTeam/Scriptlets/issues/384
[#439]: https://github.com/AdguardTeam/Scriptlets/issues/439
[#444]: https://github.com/AdguardTeam/Scriptlets/issues/444
[#445]: https://github.com/AdguardTeam/Scriptlets/issues/445

## [v1.11.16] - 2024-08-01

### Added

- `trusted-set-session-storage-item` scriptlet [#426].
- New values to `set-cookie` and `set-cookie-reload` scriptlets: `essential`, `nonessential` [#436].
- `$currentISODate$` as a new possible value to `set-cookie`, `set-cookie-reload`,
  `set-local-storage-item` and `set-session-storage-item` scriptlets [#435].

### Fixed

- Re-adding element after removing it in `trusted-create-element` scriptlet [#434].
- `trusted-click-element` scriptlet does not click on an element that is already in the DOM [#437].

[#426]: https://github.com/AdguardTeam/Scriptlets/issues/426
[#434]: https://github.com/AdguardTeam/Scriptlets/issues/434
[#435]: https://github.com/AdguardTeam/Scriptlets/issues/435
[#436]: https://github.com/AdguardTeam/Scriptlets/issues/436
[#437]: https://github.com/AdguardTeam/Scriptlets/issues/437

## [v1.11.6] - 2024-07-08

### Added

- New values to `set-cookie` and `set-cookie-reload` scriptlets: `hide`, `hidden` [#433].
- New values to `set-local-storage-item` and `set-session-storage-item` scriptlets:
  `accept`, `accepted`, `reject`, `rejected` [#429].
- Ability to log original and modified content in `trusted-replace-node-text`, `xml-prune`, `m3u-prune`,
  `trusted-replace-fetch-response` and `trusted-replace-xhr-response` scriptlets [#411].

### Changed

- Log message format [CoreLibs#180].

[#433]: https://github.com/AdguardTeam/Scriptlets/issues/433
[#429]: https://github.com/AdguardTeam/Scriptlets/issues/429
[#411]: https://github.com/AdguardTeam/Scriptlets/issues/411
[CoreLibs#180]: https://github.com/AdguardTeam/CoreLibs/issues/180

## [v1.11.1] - 2024-06-13

### Added

- `trusted-dispatch-event` scriptlet [#382].
- `trusted-replace-outbound-text` scriptlet [#410].
- Ability to click on the element with specified text in `trusted-click-element` scriptlet [#409].
- Ability to click element in closed shadow root in `trusted-click-element` scriptlet [#423].
- `isRedirectResourceCompatibleWithAdg()` method to check compatibility of redirect resources with AdGuard
  without needing the full rule text [#420].

### Deprecated

- `ruleText` option in the `IConfiguration`.

### Fixed

- `set-attr` value cannot be set to minimum `0` and maximum `32767` possible value [#425].

[#425]: https://github.com/AdguardTeam/Scriptlets/issues/425
[#423]: https://github.com/AdguardTeam/Scriptlets/issues/423
[#420]: https://github.com/AdguardTeam/Scriptlets/issues/420
[#410]: https://github.com/AdguardTeam/Scriptlets/issues/410
[#409]: https://github.com/AdguardTeam/Scriptlets/issues/409
[#382]: https://github.com/AdguardTeam/Scriptlets/issues/382

## [v1.10.25] - 2024-03-28

### Added

- `trusted-suppress-native-method` scriptlet [#383].
- `json-prune-fetch-response` scriptlet [#361].
- `json-prune-xhr-response` scriptlet [#360].
- `href-sanitizer` scriptlet [#327].
- `no-protected-audience` scriptlet [#395].
- The ability for `prevent-fetch` scriptlet to set `cors` as a response type [#394].
- The ability for `trusted-click-element` scriptlet to click inside open shadow doms [#323].
- Domain value for setting cookie scriptlets [#389].
- Multiple redirects can now be used as scriptlets [#300]:
    - `amazon-apstag`;
    - `didomi-loader`;
    - `fingerprintjs2`;
    - `fingerprintjs3`;
    - `gemius`;
    - `google-analytics`;
    - `google-analytics-ga`;
    - `google-ima3`;
    - `googlesyndication-adsbygoogle`;
    - `googletagservices-gpt`;
    - `matomo`;
    - `metrika-yandex-tag`;
    - `metrika-yandex-watch`;
    - `naver-wcslog`;
    - `pardot-1.0`;
    - `prebid`;
    - `scorecardresearch-beacon`.

### Changed

- Validation of scriptlet rules with no name and args for multiple scriptlet exception rules [#377].
- Cookie name is not encoded by cookie setting scriptlets [#408].
- Increased the possible numeric value up to `32767` for `set-cookie` and `set-cookie-reload` scriptlets [#388].

### Fixed

- UBO→ADG conversion of `$remove$` scriptlet param [#404].
- `set-constant` scriptlet not setting a constant over falsy values [#403].

[#408]: https://github.com/AdguardTeam/Scriptlets/issues/408
[#404]: https://github.com/AdguardTeam/Scriptlets/issues/404
[#403]: https://github.com/AdguardTeam/Scriptlets/issues/403
[#395]: https://github.com/AdguardTeam/Scriptlets/issues/395
[#394]: https://github.com/AdguardTeam/Scriptlets/issues/394
[#389]: https://github.com/AdguardTeam/Scriptlets/issues/389
[#388]: https://github.com/AdguardTeam/Scriptlets/issues/388
[#383]: https://github.com/AdguardTeam/Scriptlets/issues/383
[#377]: https://github.com/AdguardTeam/Scriptlets/issues/377
[#361]: https://github.com/AdguardTeam/Scriptlets/issues/361
[#360]: https://github.com/AdguardTeam/Scriptlets/issues/360
[#327]: https://github.com/AdguardTeam/Scriptlets/issues/327
[#323]: https://github.com/AdguardTeam/Scriptlets/issues/323
[#300]: https://github.com/AdguardTeam/Scriptlets/issues/300

## [v1.10.1] - 2024-02-12

### Added

- `call-nothrow` scriptlet [#333].
- `spoof-css` scriptlet [#317].
- `trusted-create-element` scriptlet [#278].
- `trusted-set-attr` scriptlet [#281].
- Ability of `set-attr` to set an attribute value as a copy of another attribute value of the same element.
- UBO alias for `set-cookie-reload` scriptlet [#332].
- New values `t`, `f`, `necessary`, `required` for `set-cookie` and `set-cookie-reload` [#379].

[#278]: https://github.com/AdguardTeam/Scriptlets/issues/278
[#281]: https://github.com/AdguardTeam/Scriptlets/issues/281
[#317]: https://github.com/AdguardTeam/Scriptlets/issues/317
[#332]: https://github.com/AdguardTeam/Scriptlets/issues/332
[#333]: https://github.com/AdguardTeam/Scriptlets/issues/333
[#379]: https://github.com/AdguardTeam/Scriptlets/issues/379

## [v1.9.105] - 2023-12-25

### Added

- `OmidVerificationVendor` object to `google-ima3` redirect [#353].
- `ga.q` (queued commands) to `google-analytics` redirect [#355].

### Fixed

- `addEventListener` in `EventHandler` in `google-ima3` redirect, now it binds context to callback [#353].
- `AdDisplayContainer` constructor in `google-ima3` redirect, now it adds div element to container [#353].
- `getInnerError` method in `google-ima3` redirect, now it returns `null` [#353].

[#353]: https://github.com/AdguardTeam/Scriptlets/issues/353
[#355]: https://github.com/AdguardTeam/Scriptlets/issues/355

## [v1.9.101] - 2023-11-30

### Added

- `emptyStr` value for `responseBody` in `prevent-fetch` scriptlet [#364].
- `setPrivacySettings()` method to `googletagservices-gpt` redirect [#344].
- UBO alias `noop.json` for `noopjson` redirect.
- Library version number to the exports [AdguardBrowserExtension#2237].

### Changed

- `prevent-fetch` scriptlet, if `responseType` is set to `opaque` then now response `body` is set to `null`,
  `status` is set to `0` and `statusText` is set to `''` [#364].

[#344]: https://github.com/AdguardTeam/Scriptlets/issues/344
[#364]: https://github.com/AdguardTeam/Scriptlets/issues/364
[AdguardBrowserExtension#2237]: https://github.com/AdguardTeam/AdguardBrowserExtension/issues/2237

## [v1.9.96] - 2023-11-15

### Added

- Regular expression support for removing items in `set-local-storage-item`
  and `set-session-storage-item` scriptlets [#256].
- Ability to set proxy trap in `set-constant` scriptlet [#330].

[#256]: https://github.com/AdguardTeam/Scriptlets/issues/256

## [v1.9.91] - 2023-11-13

### Added

- `trusted-prune-inbound-object` scriptlet [#372].
- New values to `set-cookie` scriptlet: `on`, `off`, `accepted`, `notaccepted`, `rejected`, `allowed`,
  `disallow`, `enable`, `enabled`, `disable`, `disabled` [#375].
- New values to `set-local-storage-item` and `set-session-storage-item` scriptlets: `on`, `off` [#366].

### Fixed

- Setting proxy trap every time when property is accessed in `set-constant` scriptlet [#380].
- Issue with `stack` in `evaldata-prune` scriptlet [#378].
- Setting values to wrong properties in `set-constant` scriptlet [#373].

[#366]: https://github.com/AdguardTeam/Scriptlets/issues/366
[#372]: https://github.com/AdguardTeam/Scriptlets/issues/372
[#373]: https://github.com/AdguardTeam/Scriptlets/issues/373
[#375]: https://github.com/AdguardTeam/Scriptlets/issues/375
[#378]: https://github.com/AdguardTeam/Scriptlets/issues/378
[#380]: https://github.com/AdguardTeam/Scriptlets/issues/380

## [v1.9.83] - 2023-10-13

### Added

- ABP alias for the `log` scriptlet.

### Fixed

- Issue with `trusted-replace-fetch-response` scriptlet in case if data URL was used and properties was set by
  `Object.defineProperty` to deceive scriptlet [#367].
- Adding the same header value in `trusted-replace-xhr-response` scriptlet
  when it is used multiple times for the same request [#359].
- Not pruning in `m3u-prune` scriptlet if file contains carriage return [#354].
- Not overriding value in `set-constant` (only partially, for cases where single scriptlet is used) [#330].

[#330]: https://github.com/AdguardTeam/Scriptlets/issues/330
[#354]: https://github.com/AdguardTeam/Scriptlets/issues/354
[#359]: https://github.com/AdguardTeam/Scriptlets/issues/359
[#367]: https://github.com/AdguardTeam/Scriptlets/issues/367

## [v1.9.72] - 2023-08-25

### Added

- Conversion for scriptlets:
    - `set-attr`;
    - `set-cookie`;
    - `set-local-storage-item`;
    - `set-session-storage-item`.


## [v1.9.70] - 2023-08-21

### Added

- Support for `XPath` in `xml-prune` scriptlet [#325].
- Conversion of UBO's $redirect priority to the converter [tsurlfilter#59].

### Fixed

- Issue with `stack` in `json-prune` scriptlet [#348].
- Issue with `obligatoryProps` in `json-prune` scriptlet [#345].

[#325]: https://github.com/AdguardTeam/Scriptlets/issues/325
[#345]: https://github.com/AdguardTeam/Scriptlets/issues/345
[#348]: https://github.com/AdguardTeam/Scriptlets/issues/348
[tsurlfilter#59]: https://github.com/AdguardTeam/tsurlfilter/issues/59

## [v1.9.62] - 2023-08-04

### Fixed

- `prevent-xhr` closure bug on multiple requests [#347].

[#347]: https://github.com/AdguardTeam/Scriptlets/issues/347

## [v1.9.61] - 2023-08-01

### Added

- `convertRedirectNameToAdg()` method to convert redirect names to ADG [#346].

[#346]: https://github.com/AdguardTeam/Scriptlets/issues/346

## [v1.9.58] - 2023-07-27

### Fixed

- Escape commas in the params during conversion to ubo rules [#343].

[#343]: https://github.com/AdguardTeam/Scriptlets/issues/343

## [v1.9.57] - 2023-07-21

### Added

- Ability to remove an item from storage in `set-local-storage-item` and `set-session-storage-item` scriptlets [#338].
- New values to `set-cookie` and `set-cookie-reload` scriptlets: `Accept`, `Reject`, `y`, `n`, `N`, `No`,
  `allow`, `deny` [#336].
- Ability to use flags in regular expression scriptlet parameters [#303].

### Changed

- Predefined values of `set-cookie` and `set-cookie-reload` are now case-insensitive [#342].

### Fixed

- Overwriting `google.ima` value if it was already set [#331].
- Printing unnecessary logs to the console in `log-addEventListener` scriptlet [#335].
- Error throwing in `prevent-fetch` and `prevent-xhr` scriptlets when a request is blocked [#334].

[#303]: https://github.com/AdguardTeam/Scriptlets/issues/303
[#331]: https://github.com/AdguardTeam/Scriptlets/issues/331
[#334]: https://github.com/AdguardTeam/Scriptlets/issues/334
[#335]: https://github.com/AdguardTeam/Scriptlets/issues/335
[#336]: https://github.com/AdguardTeam/Scriptlets/issues/336
[#338]: https://github.com/AdguardTeam/Scriptlets/issues/338
[#342]: https://github.com/AdguardTeam/Scriptlets/issues/342

## <a name="v1.9.37"></a> [v1.9.37] - 2023-06-06

### Added

- `evaldata-prune` scriptlet [#322].
- `trusted-replace-node-text` scriptlet [#319].
- `remove-node-text` scriptlet [#318].
- Ability for `prevent-element-src-loading` scriptlet to
  prevent inline `onerror` and match `link` tag [#276].
- New special value modifiers for `set-constant` [#316].

### Changed

- `trusted-set-cookie` and `trusted-set-cookie-reload` scriptlets to not encode cookie name and value [#311].
- Improved `prevent-fetch`: if `responseType` is not specified,
  original response type is returned instead of `default` [#297].

### Fixed

- Pruning when `addEventListener` was used before calling `send()` method
  in `m3u-prune` and `xml-prune` scriptlets [#315].
- Issue with `updateTargetingFromMap()` method
  in `googletagservices-gpt` redirect [#293].
- Website reloading if `$now$`/`$currentDate$` value is used
  in `trusted-set-cookie-reload` scriptlet [#291].
- `getResponseHeader()` and `getAllResponseHeaders()` methods mock
  in `prevent-xhr` scriptlet [#295].

[#276]: https://github.com/AdguardTeam/Scriptlets/issues/276
[#291]: https://github.com/AdguardTeam/Scriptlets/issues/291
[#293]: https://github.com/AdguardTeam/Scriptlets/issues/293
[#295]: https://github.com/AdguardTeam/Scriptlets/issues/295
[#297]: https://github.com/AdguardTeam/Scriptlets/issues/297
[#311]: https://github.com/AdguardTeam/Scriptlets/issues/311
[#315]: https://github.com/AdguardTeam/Scriptlets/issues/315
[#316]: https://github.com/AdguardTeam/Scriptlets/issues/316
[#318]: https://github.com/AdguardTeam/Scriptlets/issues/318
[#319]: https://github.com/AdguardTeam/Scriptlets/issues/319
[#322]: https://github.com/AdguardTeam/Scriptlets/issues/322

## <a name="v1.9.7"></a> [v1.9.7] - 2023-03-14

### Added

- Ability for `trusted-click-element` scriptlet to click element
  if `cookie`/`localStorage` item doesn't exist [#298].
- Static delay between multiple clicks in `trusted-click-element` [#284].

### Changed

- Improved the `convertScriptletToAdg()` method — now it validates the input rule syntax if it is an ADG rule.

### Fixed

- Issue with `MutationObserver.disconnect()` in `trusted-click-element` [#284].

[#284]: https://github.com/AdguardTeam/Scriptlets/issues/284
[#298]: https://github.com/AdguardTeam/Scriptlets/issues/298

## <a name="v1.9.1"></a> [v1.9.1] - 2023-03-07

### Added

- `m3u-prune` scriptlet [#277].
- `true` and `false` values for `set-attr` scriptlet [#283].
- UBO alias `noop.css` for `noopcss` redirect.

### Changed

- Decreased the minimal value for the `boost` parameter to `0.001`
  for `adjust-setTimeout` and `adjust-setInterval` [#262].

### Fixed

- `prevent-element-src-loading` throwing error if `thisArg` is `undefined` [#270].
- Logging `null` in `json-prune` [#282].
- `xml-prune`: no pruning a request if `new Request()` is used,
  throwing an error while logging some requests [#289].
- Improve performance of the `isValidScriptletName()` method.

[#262]: https://github.com/AdguardTeam/Scriptlets/issues/262
[#270]: https://github.com/AdguardTeam/Scriptlets/issues/270
[#277]: https://github.com/AdguardTeam/Scriptlets/issues/277
[#282]: https://github.com/AdguardTeam/Scriptlets/issues/282
[#283]: https://github.com/AdguardTeam/Scriptlets/issues/283
[#289]: https://github.com/AdguardTeam/Scriptlets/issues/289

## <a name="v1.8.2"></a> [v1.8.2] - 2023-01-19

### Added

- `trusted-set-constant` scriptlet [#137].
- `inject-css-in-shadow-dom` scriptlet [#267].
- `throwFunc` and `noopCallbackFunc` prop values for `set-constant` scriptlet.
- `recreateIframeForSlot` method mock to `googletagservices-gpt` redirect [#259].

### Changed

- Added decimal delay matching for `prevent-setInterval` and `prevent-setTimeout` [#247].
- Debug logging to include rule text when available.
- `getScriptletFunction` calls to throw error on unknown scriptlet names.

### Fixed

- `prevent-xhr` and `trusted-replace-xhr-response` closure bug on multiple requests [#261].
- Missing `googletagmanager-gtm` in compatibility table.

[#137]: https://github.com/AdguardTeam/Scriptlets/issues/137
[#247]: https://github.com/AdguardTeam/Scriptlets/issues/247
[#259]: https://github.com/AdguardTeam/Scriptlets/issues/259
[#261]: https://github.com/AdguardTeam/Scriptlets/issues/261
[#267]: https://github.com/AdguardTeam/Scriptlets/issues/267

## <a name="v1.7.20"></a> [v1.7.20] - 2022-12-26

### Added

- `isBlocking()` method for Redirects class.
- `file` field for redirect type.

### Fixed

- Redirects types.


## <a name="v1.7.19"></a> [v1.7.19] - 2022-12-22

### Fixed

- `prevent-addEventListener` and `log-addEventListener` loosing context.
  when encountering already bound `.addEventListener`.
- `google-ima3` conversion.


## <a name="v1.7.14"></a> [v1.7.14] - 2022-12-16

### Added

- `set-constant` ADG→UBO conversion for `emptyArr` and `emptyObj` [uBlock-issues#2411].

[uBlock-issues#2411]: https://github.com/uBlockOrigin/uBlock-issues/issues/2411

## <a name="v1.7.13"></a> [v1.7.13] - 2022-12-13

### Fixed

- `isEmptyObject` helper not counting `prototype` as an object property.


## <a name="v1.7.10"></a> [v1.7.10] - 2022-12-07

### Added

- `trusted-set-cookie-reload` scriptlet.

### Fixed

- `set-cookie-reload` infinite page reloading [#265].
- Breakage of `prevent-element-src-loading` due to `window` getting into `apply` wrapper [#264].
- Spread of args bug at `getXhrData` call for `trusted-replace-xhr-response`.
- Request properties array not being served to `getRequestData` and `parseMatchProps` helpers.

[#264]: https://github.com/AdguardTeam/Scriptlets/issues/264
[#265]: https://github.com/AdguardTeam/Scriptlets/issues/265

## <a name="v1.7.3"></a> [v1.7.3] - 2022-11-21

### Added

- [Trusted scriptlets](./README.md#trusted-scriptlets) with extended capabilities:
    - `trusted-click-element` [#23];
    - `trusted-replace-xhr-response` [#202];
    - `trusted-replace-fetch-response`;
    - `trusted-set-local-storage-item`;
    - `trusted-set-cookie`.

- Scriptlets:
    - `xml-prune` [#249].

### Changed

- Scriptlets:
    - `prevent-element-src-loading` [#228];
    - `prevent-fetch` [#216];
    - `abort-on-stack-trace` [#201];
    - `abort-current-inline-script` [#251];
    - `set-cookie` & `set-cookie-reload`.
- Redirects:
    - `google-ima3` [#255];
    - `metrika-yandex-tag` [#254];
    - `googlesyndication-adsbygoogle` [#252].

[#23]: https://github.com/AdguardTeam/Scriptlets/issues/23
[#201]: https://github.com/AdguardTeam/Scriptlets/issues/201
[#202]: https://github.com/AdguardTeam/Scriptlets/issues/202
[#216]: https://github.com/AdguardTeam/Scriptlets/issues/216
[#228]: https://github.com/AdguardTeam/Scriptlets/issues/228
[#249]: https://github.com/AdguardTeam/Scriptlets/issues/249
[#251]: https://github.com/AdguardTeam/Scriptlets/issues/251
[#252]: https://github.com/AdguardTeam/Scriptlets/issues/252
[#254]: https://github.com/AdguardTeam/Scriptlets/issues/254
[#255]: https://github.com/AdguardTeam/Scriptlets/issues/255

[@adguard/agtree]: https://www.npmjs.com/package/@adguard/agtree

[Trusted Types API]: https://developer.mozilla.org/docs/Web/API/Trusted_Types_API

[Unreleased]: https://github.com/AdguardTeam/Scriptlets/compare/v2.5.1...HEAD
[2.5.1]: https://github.com/AdguardTeam/Scriptlets/compare/v2.5.0...v2.5.1
[2.5.1-beta.1]: https://github.com/AdguardTeam/Scriptlets/compare/v2.5.1-beta.0...v2.5.1-beta.1
[2.5.1-beta.0]: https://github.com/AdguardTeam/Scriptlets/compare/v2.5.0...v2.5.1-beta.0
[2.5.0]: https://github.com/AdguardTeam/Scriptlets/compare/v2.4.3...v2.5.0
[2.4.3]: https://github.com/AdguardTeam/Scriptlets/compare/v2.4.2...v2.4.3
[2.4.2]: https://github.com/AdguardTeam/Scriptlets/compare/v2.4.1...v2.4.2
[2.4.1]: https://github.com/AdguardTeam/Scriptlets/compare/v2.4.0-beta...v2.4.1
[2.4.0-beta]: https://github.com/AdguardTeam/Scriptlets/compare/v2.3.1...v2.4.0-beta
[v2.3.1]: https://github.com/AdguardTeam/Scriptlets/compare/v2.3.0...v2.3.1
[v2.3.0]: https://github.com/AdguardTeam/Scriptlets/compare/v2.2.16...v2.3.0
[v2.2.16]: https://github.com/AdguardTeam/Scriptlets/compare/v2.2.15...v2.2.16
[v2.2.15]: https://github.com/AdguardTeam/Scriptlets/compare/v2.2.14...v2.2.15
[v2.2.14]: https://github.com/AdguardTeam/Scriptlets/compare/v2.2.13...v2.2.14
[v2.2.13]: https://github.com/AdguardTeam/Scriptlets/compare/v2.2.12...v2.2.13
[v2.2.12]: https://github.com/AdguardTeam/Scriptlets/compare/v2.2.11...v2.2.12
[v2.2.11]: https://github.com/AdguardTeam/Scriptlets/compare/v2.2.10...v2.2.11
[v2.2.10]: https://github.com/AdguardTeam/Scriptlets/compare/v2.2.9...v2.2.10
[v2.2.9]: https://github.com/AdguardTeam/Scriptlets/compare/v2.2.8...v2.2.9
[v2.2.8]: https://github.com/AdguardTeam/Scriptlets/compare/v2.2.7...v2.2.8
[v2.2.7]: https://github.com/AdguardTeam/Scriptlets/compare/v2.2.4...v2.2.7
[v2.2.4]: https://github.com/AdguardTeam/Scriptlets/compare/v2.2.1...v2.2.4
[v2.2.1]: https://github.com/AdguardTeam/Scriptlets/compare/v2.2.0...v2.2.1
[v2.2.0]: https://github.com/AdguardTeam/Scriptlets/compare/v2.1.7...v2.2.0
[v2.1.7]: https://github.com/AdguardTeam/Scriptlets/compare/v2.1.6...v2.1.7
[v2.1.6]: https://github.com/AdguardTeam/Scriptlets/compare/v2.1.5...v2.1.6
[v2.1.5]: https://github.com/AdguardTeam/Scriptlets/compare/v2.1.4...v2.1.5
[v2.1.4]: https://github.com/AdguardTeam/Scriptlets/compare/v2.0.1...v2.1.4
[v2.0.1]: https://github.com/AdguardTeam/Scriptlets/compare/v1.12.1...v2.0.1
[v1.12.1]: https://github.com/AdguardTeam/Scriptlets/compare/v1.11.27...v1.12.1
[v1.11.27]: https://github.com/AdguardTeam/Scriptlets/compare/v1.11.16...v1.11.27
[v1.11.16]: https://github.com/AdguardTeam/Scriptlets/compare/v1.11.6...v1.11.16
[v1.11.6]: https://github.com/AdguardTeam/Scriptlets/compare/v1.11.1...v1.11.6
[v1.11.1]: https://github.com/AdguardTeam/Scriptlets/compare/v1.10.25...v1.11.1
[v1.10.25]: https://github.com/AdguardTeam/Scriptlets/compare/v1.10.1...v1.10.25
[v1.10.1]: https://github.com/AdguardTeam/Scriptlets/compare/v1.9.105...v1.10.1
[v1.9.105]: https://github.com/AdguardTeam/Scriptlets/compare/v1.9.101...v1.9.105
[v1.9.101]: https://github.com/AdguardTeam/Scriptlets/compare/v1.9.96...v1.9.101
[v1.9.96]: https://github.com/AdguardTeam/Scriptlets/compare/v1.9.91...v1.9.96
[v1.9.91]: https://github.com/AdguardTeam/Scriptlets/compare/v1.9.83...v1.9.91
[v1.9.83]: https://github.com/AdguardTeam/Scriptlets/compare/v1.9.72...v1.9.83
[v1.9.72]: https://github.com/AdguardTeam/Scriptlets/compare/v1.9.70...v1.9.72
[v1.9.70]: https://github.com/AdguardTeam/Scriptlets/compare/v1.9.62...v1.9.70
[v1.9.62]: https://github.com/AdguardTeam/Scriptlets/compare/v1.9.61...v1.9.62
[v1.9.61]: https://github.com/AdguardTeam/Scriptlets/compare/v1.9.58...v1.9.61
[v1.9.58]: https://github.com/AdguardTeam/Scriptlets/compare/v1.9.57...v1.9.58
[v1.9.57]: https://github.com/AdguardTeam/Scriptlets/compare/v1.9.37...v1.9.57
[v1.9.37]: https://github.com/AdguardTeam/Scriptlets/compare/v1.9.7...v1.9.37
[v1.9.7]: https://github.com/AdguardTeam/Scriptlets/compare/v1.9.1...v1.9.7
[v1.9.1]: https://github.com/AdguardTeam/Scriptlets/compare/v1.8.2...v1.9.1
[v1.8.2]: https://github.com/AdguardTeam/Scriptlets/compare/v1.7.20...v1.8.2
[v1.7.20]: https://github.com/AdguardTeam/Scriptlets/compare/v1.7.19...v1.7.20
[v1.7.19]: https://github.com/AdguardTeam/Scriptlets/compare/v1.7.14...v1.7.19
[v1.7.14]: https://github.com/AdguardTeam/Scriptlets/compare/v1.7.13...v1.7.14
[v1.7.13]: https://github.com/AdguardTeam/Scriptlets/compare/v1.7.10...v1.7.13
[v1.7.10]: https://github.com/AdguardTeam/Scriptlets/compare/v1.7.3...v1.7.10
[v1.7.3]: https://github.com/AdguardTeam/Scriptlets/compare/v1.6.55...v1.7.3
