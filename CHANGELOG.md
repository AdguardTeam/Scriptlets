# Scriptlets and Redirect Resources Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog], and this project adheres to [Semantic Versioning].

[Keep a Changelog]: https://keepachangelog.com/en/1.0.0/
[Semantic Versioning]: https://semver.org/spec/v2.0.0.html

<!-- TODO: change `@added unknown` tag due to the actual version -->
<!--       during new scriptlets or redirects releasing -->

## [v2.2.2] - 2025-05-23

### Changed

- Updated [@adguard/agtree] to `3.2.0`.

### Fixed

- `spoof-css` scriptlet — incorrect `DOMRect` setting [#498].

[v2.2.2]: https://github.com/AdguardTeam/Scriptlets/compare/v2.2.1...v2.2.2
[#498]: https://github.com/AdguardTeam/Scriptlets/issues/498

## [v2.2.1] - 2025-05-21

### Fixed

- Trusted types bundle.

[v2.2.1]: https://github.com/AdguardTeam/Scriptlets/compare/v2.2.0...v2.2.1

## [v2.2.0] - 2025-05-21

### Added

- New values to `set-cookie` and `set-cookie-reload` scriptlets: `emptyArr`, `emptyObj` [#497].
- Ability to set random response content in `prevent-fetch` scriptlet [#416].
- Ability to choose CSS injection method in `inject-css-in-shadow-dom` scriptlet [#477].
- TypeScript types for CoreLibs provided [`ContentScriptApi`](./README.md#scriptlets-api--content-script-api).
- Trusted Types API utility — [`PolicyApi`](./README.md#scriptlets-api--content-script-api--policy-api).

### Changed

- Improved docs for `json-prune`, `xml-prune` and `trusted-prune-inbound-object` scriptlets [#392].
- Updated [@adguard/agtree] to `3.1.5`.

### Fixed

- Escaping quotes in `trusted-replace-node-text` scriptlet [#440].
- `trusted-suppress-native-method` scriptlet, `isMatchingSuspended` was not reset when the stack does not match,
  so in some cases given method was not prevented [#496].

[v2.2.0]: https://github.com/AdguardTeam/Scriptlets/compare/v2.1.7...v2.2.0
[#392]: https://github.com/AdguardTeam/Scriptlets/issues/392
[#416]: https://github.com/AdguardTeam/Scriptlets/issues/416
[#440]: https://github.com/AdguardTeam/Scriptlets/issues/440
[#477]: https://github.com/AdguardTeam/Scriptlets/issues/477
[#496]: https://github.com/AdguardTeam/Scriptlets/issues/496
[#497]: https://github.com/AdguardTeam/Scriptlets/issues/497

## [v2.1.7] - 2025-04-03

### Changed

- Updated [@adguard/agtree] to `3.1.0`.

### Added

- Ability in `prevent-addEventListener` scriptlet to match specific element
  and updated `log-addEventListener` scriptlet to log target element [#480].

[v2.1.7]: https://github.com/AdguardTeam/Scriptlets/compare/v2.1.6...v2.1.7
[#480]: https://github.com/AdguardTeam/Scriptlets/issues/480

## [v2.1.6] - 2025-03-06

### Fixed

- Incorrectly removing content from parsed array when using the `json-prune` scriptlet [#482].

[v2.1.6]: https://github.com/AdguardTeam/Scriptlets/compare/v2.1.5...v2.1.6
[#482]: https://github.com/AdguardTeam/Scriptlets/issues/482

## [v2.1.5] - 2025-02-28

### Changed

- Updated [@adguard/agtree] to `3.0.1`.

### Added

- Ability in `json-prune` scriptlet to match `key` with specific `value`
  and remove `array`/`object` if it contains specific `item` [#183].

### Fixed

- `prevent-eval-if` and `prevent-bab` scriptlets, now `eval.toString()` call returns original value [#481].

[v2.1.5]: https://github.com/AdguardTeam/Scriptlets/compare/v2.1.4...v2.1.5
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

[v2.1.4]: https://github.com/AdguardTeam/Scriptlets/compare/v2.0.1...v2.1.4
[#391]: https://github.com/AdguardTeam/Scriptlets/issues/391
[#468]: https://github.com/AdguardTeam/Scriptlets/issues/468
[#472]: https://github.com/AdguardTeam/Scriptlets/issues/472

## [v2.0.1] - 2024-11-13

### Added

- `prevent-canvas` scriptlet [#451].
- `trusted-types` policy to `trusted-replace-node-text` scriptlet [#457].
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
- Updated [@adguard/agtree] to `3.0.0-alpha.1`.

### Removed

- IIFE bundle.
- UMD bundle.
- Various conversion and validation functions including `isAdgRedirectRule`, `isAdgRedirectCompatibleWithUbo`,
  `isUboRedirectCompatibleWithAdg`, `isAbpRedirectCompatibleWithAdg`, `convertUboRedirectToAdg`,
  `convertAbpRedirectToAdg`, `convertRedirectToAdg`, and `convertRedirectNameToAdg` functions.

[v2.0.1]: https://github.com/AdguardTeam/Scriptlets/compare/v1.12.1...v2.0.1
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

[v1.12.1]: https://github.com/AdguardTeam/Scriptlets/compare/v1.11.27...v1.12.1
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

[v1.11.27]: https://github.com/AdguardTeam/Scriptlets/compare/v1.11.16...v1.11.27
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

[v1.11.16]: https://github.com/AdguardTeam/Scriptlets/compare/v1.11.6...v1.11.16
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

[v1.11.6]: https://github.com/AdguardTeam/Scriptlets/compare/v1.11.1...v1.11.6
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

[v1.11.1]: https://github.com/AdguardTeam/Scriptlets/compare/v1.10.25...v1.11.1
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

[v1.10.25]: https://github.com/AdguardTeam/Scriptlets/compare/v1.10.1...v1.10.25
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

[v1.10.1]: https://github.com/AdguardTeam/Scriptlets/compare/v1.9.105...v1.10.1
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

[v1.9.105]: https://github.com/AdguardTeam/Scriptlets/compare/v1.9.101...v1.9.105
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

[v1.9.101]: https://github.com/AdguardTeam/Scriptlets/compare/v1.9.96...v1.9.101
[#344]: https://github.com/AdguardTeam/Scriptlets/issues/344
[#364]: https://github.com/AdguardTeam/Scriptlets/issues/364
[AdguardBrowserExtension#2237]: https://github.com/AdguardTeam/AdguardBrowserExtension/issues/2237

## [v1.9.96] - 2023-11-15

### Added

- Regular expression support for removing items in `set-local-storage-item`
  and `set-session-storage-item` scriptlets [#256].
- Ability to set proxy trap in `set-constant` scriptlet [#330].

[v1.9.96]: https://github.com/AdguardTeam/Scriptlets/compare/v1.9.91...v1.9.96
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

[v1.9.91]: https://github.com/AdguardTeam/Scriptlets/compare/v1.9.83...v1.9.91
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

[v1.9.83]: https://github.com/AdguardTeam/Scriptlets/compare/v1.9.72...v1.9.83
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

[v1.9.72]: https://github.com/AdguardTeam/Scriptlets/compare/v1.9.70...v1.9.72

## [v1.9.70] - 2023-08-21

### Added

- Support for `XPath` in `xml-prune` scriptlet [#325].
- Conversion of UBO's $redirect priority to the converter [tsurlfilter#59].

### Fixed

- Issue with `stack` in `json-prune` scriptlet [#348].
- Issue with `obligatoryProps` in `json-prune` scriptlet [#345].

[v1.9.70]: https://github.com/AdguardTeam/Scriptlets/compare/v1.9.62...v1.9.70
[#325]: https://github.com/AdguardTeam/Scriptlets/issues/325
[#345]: https://github.com/AdguardTeam/Scriptlets/issues/345
[#348]: https://github.com/AdguardTeam/Scriptlets/issues/348
[tsurlfilter#59]: https://github.com/AdguardTeam/tsurlfilter/issues/59

## [v1.9.62] - 2023-08-04

### Fixed

- `prevent-xhr` closure bug on multiple requests [#347].

[v1.9.62]: https://github.com/AdguardTeam/Scriptlets/compare/v1.9.61...v1.9.62
[#347]: https://github.com/AdguardTeam/Scriptlets/issues/347

## [v1.9.61] - 2023-08-01

### Added

- `convertRedirectNameToAdg()` method to convert redirect names to ADG [#346].

[v1.9.61]: https://github.com/AdguardTeam/Scriptlets/compare/v1.9.58...v1.9.61
[#346]: https://github.com/AdguardTeam/Scriptlets/issues/346

## [v1.9.58] - 2023-07-27

### Fixed

- Escape commas in the params during conversion to ubo rules [#343].

[v1.9.58]: https://github.com/AdguardTeam/Scriptlets/compare/v1.9.57...v1.9.58
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

[v1.9.57]: https://github.com/AdguardTeam/Scriptlets/compare/v1.9.37...v1.9.57
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

[v1.9.37]: https://github.com/AdguardTeam/Scriptlets/compare/v1.9.7...v1.9.37
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

[v1.9.7]: https://github.com/AdguardTeam/Scriptlets/compare/v1.9.1...v1.9.7
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

[v1.9.1]: https://github.com/AdguardTeam/Scriptlets/compare/v1.8.2...v1.9.1
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

[v1.8.2]: https://github.com/AdguardTeam/Scriptlets/compare/v1.7.20...v1.8.2
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

[v1.7.20]: https://github.com/AdguardTeam/Scriptlets/compare/v1.7.19...v1.7.20

## <a name="v1.7.19"></a> [v1.7.19] - 2022-12-22

### Fixed

- `prevent-addEventListener` and `log-addEventListener` loosing context.
  when encountering already bound `.addEventListener`.
- `google-ima3` conversion.

[v1.7.19]: https://github.com/AdguardTeam/Scriptlets/compare/v1.7.14...v1.7.19

## <a name="v1.7.14"></a> [v1.7.14] - 2022-12-16

### Added

- `set-constant` ADG→UBO conversion for `emptyArr` and `emptyObj` [uBlock-issues#2411].

[v1.7.14]: https://github.com/AdguardTeam/Scriptlets/compare/v1.7.13...v1.7.14
[uBlock-issues#2411]: https://github.com/uBlockOrigin/uBlock-issues/issues/2411

## <a name="v1.7.13"></a> [v1.7.13] - 2022-12-13

### Fixed

- `isEmptyObject` helper not counting `prototype` as an object property.

[v1.7.13]: https://github.com/AdguardTeam/Scriptlets/compare/v1.7.10...v1.7.13

## <a name="v1.7.10"></a> [v1.7.10] - 2022-12-07

### Added

- `trusted-set-cookie-reload` scriptlet.

### Fixed

- `set-cookie-reload` infinite page reloading [#265].
- Breakage of `prevent-element-src-loading` due to `window` getting into `apply` wrapper [#264].
- Spread of args bug at `getXhrData` call for `trusted-replace-xhr-response`.
- Request properties array not being served to `getRequestData` and `parseMatchProps` helpers.

[v1.7.10]: https://github.com/AdguardTeam/Scriptlets/compare/v1.7.3...v1.7.10
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

[v1.7.3]: https://github.com/AdguardTeam/Scriptlets/compare/v1.6.55...v1.7.3
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
