# Scriptlets and Redirect Resources Changelog


## Unreleased

### Added

- new `m3u-prune` scriptlet [#277](https://github.com/AdguardTeam/Scriptlets/issues/277)
- `true` and `false` values for `set-attr` scriptlet [#283](https://github.com/AdguardTeam/Scriptlets/issues/283)


## v1.8.3

### Fixed
- improve performance of the `isValidScriptletName()` method


## v1.8.2

### Added

- new `trusted-set-constant` scriptlet [#137](https://github.com/AdguardTeam/Scriptlets/issues/137)
- new `inject-css-in-shadow-dom` scriptlet [#267](https://github.com/AdguardTeam/Scriptlets/issues/267)
- `throwFunc` and `noopCallbackFunc` prop values for `set-constant` scriptlet
- `recreateIframeForSlot` method mock to `googletagservices-gpt` redirect [#259](https://github.com/AdguardTeam/Scriptlets/issues/259)

### Changed

- add decimal delay matching for `prevent-setInterval` and `prevent-setTimeout` [#247](https://github.com/AdguardTeam/Scriptlets/issues/247)
- debug logging to include rule text when available
- `getScriptletFunction` calls to throw error on unknown scriptlet names

### Fixed

- `prevent-xhr` and `trusted-replace-xhr-response` closure bug on multiple requests [#261](https://github.com/AdguardTeam/Scriptlets/issues/261)
- missing `googletagmanager-gtm` in compatibility table


## v1.7.20

### Added

- `isBlocking()` method for Redirects class
- `file` field for redirect type

### Fixed

- Redirects types.


## v1.7.19

### Fixed

- `prevent-addEventListener` and `log-addEventListener` loosing context when encountering already bound `.addEventListener`
- `google-ima3` conversion


## v1.7.14

### Added

* `set-constant` ADG→UBO conversion for [`emptyArr` and `emptyObj`](https://github.com/uBlockOrigin/uBlock-issues/issues/2411)


## v1.7.13

### Fixed

* `isEmptyObject` helper not counting `prototype` as an object property


## v1.7.10

### Added

- new scriptlet `trusted-set-cookie-reload`

### Fixed

- `set-cookie-reload` infinite page reloading [#265](https://github.com/AdguardTeam/Scriptlets/issues/265)
- breakage of `prevent-element-src-loading` due to `window` getting into `apply` wrapper [#264](https://github.com/AdguardTeam/Scriptlets/issues/264)
- spread of args bug at `getXhrData` call for `trusted-replace-xhr-response`
- request properties array not being served to `getRequestData` and `parseMatchProps` helpers


## v1.7.3

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
