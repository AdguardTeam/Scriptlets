# Scriptlets and Redirect Resources Changelog

## Unreleased 1.8.x

### Fixed

- `prevent-xhr` and `trusted-replace-xhr-response` closure bug on multiple requests [#261](https://github.com/AdguardTeam/Scriptlets/issues/261)

## Unreleased 1.7.x

### Fixed

- `prevent-addEventListener` and `log-addEventListener` loosing context when encountering already bound `.addEventListener`

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
    - trusted-click-element [#23](https://github.com/AdguardTeam/Scriptlets/issues/23)
    - trusted-replace-xhr-response [#202](https://github.com/AdguardTeam/Scriptlets/issues/202)
    - trusted-replace-fetch-response
    - trusted-set-local-storage-item
    - trusted-set-cookie

- Scriptlets:
    - xml-prune [#249](https://github.com/AdguardTeam/Scriptlets/issues/249)

### Improved

- Scriptlets:
  - prevent-element-src-loading [#228](https://github.com/AdguardTeam/Scriptlets/issues/228)
  - prevent-fetch [#216](https://github.com/AdguardTeam/Scriptlets/issues/216)
  - abort-on-stack-trace [#201](https://github.com/AdguardTeam/Scriptlets/issues/201)
  - abort-current-inline-script [#251](https://github.com/AdguardTeam/Scriptlets/issues/251)
  - set-cookie & set-cookie-reload
- Redirects:
  - google-ima3 [#255](https://github.com/AdguardTeam/Scriptlets/issues/255)
  - metrika-yandex-tag [#254](https://github.com/AdguardTeam/Scriptlets/issues/254)
  - googlesyndication-adsbygoogle [#252](https://github.com/AdguardTeam/Scriptlets/issues/252)
