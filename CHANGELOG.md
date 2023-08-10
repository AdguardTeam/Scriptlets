# Scriptlets and Redirect Resources Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!-- TODO: add @added tag to the files with specific version -->
<!--       during new scriptlets or redirects releasing -->

## [Unreleased]

### Fixed

- issue with `stack` in `json-prune` scriptlet
  [#348](https://github.com/AdguardTeam/Scriptlets/issues/348)
- issue with `obligatoryProps` in `json-prune` scriptlet
  [#345](https://github.com/AdguardTeam/Scriptlets/issues/345)

## [v1.9.62] - 2023-08-04

### Fixed

- `prevent-xhr` closure bug on multiple requests
  [#347](https://github.com/AdguardTeam/Scriptlets/issues/347)

## [v1.9.61] - 2023-08-01

### Added

- add `convertRedirectNameToAdg()` method to convert redirect names to ADG
  [#346](https://github.com/AdguardTeam/Scriptlets/issues/346)

## [v1.9.58] - 2023-07-27

### Fixed

- escape commas in the params during conversion to ubo rules
  [#343](https://github.com/AdguardTeam/Scriptlets/issues/343)

## [v1.9.57] - 2023-07-21

### Added

- ability to remove an item from storage in `set-local-storage-item` and `set-session-storage-item` scriptlets
  [#338](https://github.com/AdguardTeam/Scriptlets/issues/338)
- new values to `set-cookie` and `set-cookie-reload` scriptlets: `Accept`, `Reject`, `y`, `n`, `N`, `No`,
  `allow`, `deny` [#336](https://github.com/AdguardTeam/Scriptlets/issues/336)
- ability to use flags in regular expression scriptlet parameters
  [#303](https://github.com/AdguardTeam/Scriptlets/issues/303)

### Changed

- predefined values of `set-cookie` and `set-cookie-reload` are now case-insensitive
  [#342](https://github.com/AdguardTeam/Scriptlets/issues/342)

### Fixed

- issue with overwriting `google.ima` value if it was already set
  [#331](https://github.com/AdguardTeam/Scriptlets/issues/331)
- issue with printing unnecessary logs to the console in `log-addEventListener` scriptlet
  [#335](https://github.com/AdguardTeam/Scriptlets/issues/335)
- error throwing in `prevent-fetch` and `prevent-xhr` scriptlets when a request is blocked
  [#334](https://github.com/AdguardTeam/Scriptlets/issues/334)

## <a name="v1.9.37"></a> [v1.9.37] - 2023-06-06

### Added

- new `evaldata-prune` scriptlet [#322](https://github.com/AdguardTeam/Scriptlets/issues/322)
- new `trusted-replace-node-text` scriptlet [#319](https://github.com/AdguardTeam/Scriptlets/issues/319)
- new `remove-node-text` scriptlet [#318](https://github.com/AdguardTeam/Scriptlets/issues/318)
- ability for `prevent-element-src-loading` scriptlet to
prevent inline `onerror` and match `link` tag [#276](https://github.com/AdguardTeam/Scriptlets/issues/276)
- new special value modifiers for `set-constant` [#316](https://github.com/AdguardTeam/Scriptlets/issues/316)

### Changed

- `trusted-set-cookie` and `trusted-set-cookie-reload` scriptlets to not encode cookie name and value
  [#311](https://github.com/AdguardTeam/Scriptlets/issues/311)
- improved `prevent-fetch`: if `responseType` is not specified,
  original response type is returned instead of `default` [#297](https://github.com/AdguardTeam/Scriptlets/issues/291)

### Fixed

- issue with pruning when `addEventListener` was used before calling `send()` method
  in `m3u-prune` and `xml-prune` scriptlets [#315](https://github.com/AdguardTeam/Scriptlets/issues/315)
- issue with `updateTargetingFromMap()` method
  in `googletagservices-gpt` redirect [#293](https://github.com/AdguardTeam/Scriptlets/issues/293)
- website reloading if `$now$`/`$currentDate$` value is used
  in `trusted-set-cookie-reload` scriptlet [#291](https://github.com/AdguardTeam/Scriptlets/issues/291)
- `getResponseHeader()` and `getAllResponseHeaders()` methods mock
  in `prevent-xhr` scriptlet [#295](https://github.com/AdguardTeam/Scriptlets/issues/295)

## <a name="v1.9.7"></a> [v1.9.7] - 2023-03-14

### Added

- ability for `trusted-click-element` scriptlet to click element
  if `cookie`/`localStorage` item doesn't exist [#298](https://github.com/AdguardTeam/Scriptlets/issues/298)
- static delay between multiple clicks in `trusted-click-element`
  [#284](https://github.com/AdguardTeam/Scriptlets/issues/284)

### Changed

- improved the `convertScriptletToAdg()` method — now it validates the input rule syntax if it is an ADG rule

### Fixed

- issue with `MutationObserver.disconnect()`
  in `trusted-click-element` [#284](https://github.com/AdguardTeam/Scriptlets/issues/284)


## <a name="v1.9.1"></a> [v1.9.1] - 2023-03-07

### Added

- new `m3u-prune` scriptlet [#277](https://github.com/AdguardTeam/Scriptlets/issues/277)
- `true` and `false` values for `set-attr` scriptlet [#283](https://github.com/AdguardTeam/Scriptlets/issues/283)
- UBO alias `noop.css` for `noopcss` redirect

### Changed

- decreased the minimal value for the `boost` parameter to `0.001`
  for `adjust-setTimeout` and `adjust-setInterval` [#262](https://github.com/AdguardTeam/Scriptlets/issues/262)

### Fixed

- `prevent-element-src-loading` throwing error
  if `thisArg` is `undefined` [#270](https://github.com/AdguardTeam/Scriptlets/issues/270)
- logging `null` in `json-prune` [#282](https://github.com/AdguardTeam/Scriptlets/issues/282)
- `xml-prune`: no pruning a request if `new Request()` is used,
  throwing an error while logging some requests [#289](https://github.com/AdguardTeam/Scriptlets/issues/289)
- improve performance of the `isValidScriptletName()` method


## <a name="v1.8.2"></a> [v1.8.2] - 2023-01-19

### Added

- new `trusted-set-constant` scriptlet [#137](https://github.com/AdguardTeam/Scriptlets/issues/137)
- new `inject-css-in-shadow-dom` scriptlet [#267](https://github.com/AdguardTeam/Scriptlets/issues/267)
- `throwFunc` and `noopCallbackFunc` prop values for `set-constant` scriptlet
- `recreateIframeForSlot` method mock
  to `googletagservices-gpt` redirect [#259](https://github.com/AdguardTeam/Scriptlets/issues/259)

### Changed

- add decimal delay matching for `prevent-setInterval` and `prevent-setTimeout`
  [#247](https://github.com/AdguardTeam/Scriptlets/issues/247)
- debug logging to include rule text when available
- `getScriptletFunction` calls to throw error on unknown scriptlet names

### Fixed

- `prevent-xhr` and `trusted-replace-xhr-response` closure bug on multiple requests
  [#261](https://github.com/AdguardTeam/Scriptlets/issues/261)
- missing `googletagmanager-gtm` in compatibility table


## <a name="v1.7.20"></a> [v1.7.20] - 2022-12-26

### Added

- `isBlocking()` method for Redirects class
- `file` field for redirect type

### Fixed

- Redirects types.


## <a name="v1.7.19"></a> [v1.7.19] - 2022-12-22

### Fixed

- `prevent-addEventListener` and `log-addEventListener` loosing context
  when encountering already bound `.addEventListener`
- `google-ima3` conversion


## <a name="v1.7.14"></a> [v1.7.14] - 2022-12-16

### Added

- `set-constant` ADG→UBO conversion
  for [`emptyArr` and `emptyObj`](https://github.com/uBlockOrigin/uBlock-issues/issues/2411)


## <a name="v1.7.13"></a> [v1.7.13] - 2022-12-13

### Fixed

- `isEmptyObject` helper not counting `prototype` as an object property


## <a name="v1.7.10"></a> [v1.7.10] - 2022-12-07

### Added

- new scriptlet `trusted-set-cookie-reload`

### Fixed

- `set-cookie-reload` infinite page reloading [#265](https://github.com/AdguardTeam/Scriptlets/issues/265)
- breakage of `prevent-element-src-loading` due to `window` getting into `apply` wrapper
  [#264](https://github.com/AdguardTeam/Scriptlets/issues/264)
- spread of args bug at `getXhrData` call for `trusted-replace-xhr-response`
- request properties array not being served to `getRequestData` and `parseMatchProps` helpers


## <a name="v1.7.3"></a> [v1.7.3] - 2022-11-21

### Added

- [Trusted scriptlets](./README.md#trusted-scriptlets) with extended capabilities:
    - `trusted-click-element` [#23](https://github.com/AdguardTeam/Scriptlets/issues/23)
    - `trusted-replace-xhr-response` [#202](https://github.com/AdguardTeam/Scriptlets/issues/202)
    - `trusted-replace-fetch-response`
    - `trusted-set-local-storage-item`
    - `trusted-set-cookie`

- Scriptlets:
    - `xml-prune` [#249](https://github.com/AdguardTeam/Scriptlets/issues/249)

### Changed

- Scriptlets:
    - `prevent-element-src-loading` [#228](https://github.com/AdguardTeam/Scriptlets/issues/228)
    - `prevent-fetch` [#216](https://github.com/AdguardTeam/Scriptlets/issues/216)
    - `abort-on-stack-trace` [#201](https://github.com/AdguardTeam/Scriptlets/issues/201)
    - `abort-current-inline-script` [#251](https://github.com/AdguardTeam/Scriptlets/issues/251)
    - `set-cookie` & `set-cookie-reload`
- Redirects:
    - `google-ima3` [#255](https://github.com/AdguardTeam/Scriptlets/issues/255)
    - `metrika-yandex-tag` [#254](https://github.com/AdguardTeam/Scriptlets/issues/254)
    - `googlesyndication-adsbygoogle` [#252](https://github.com/AdguardTeam/Scriptlets/issues/252)

[Unreleased]: https://github.com/AdguardTeam/Scriptlets/compare/v1.9.62...HEAD
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
