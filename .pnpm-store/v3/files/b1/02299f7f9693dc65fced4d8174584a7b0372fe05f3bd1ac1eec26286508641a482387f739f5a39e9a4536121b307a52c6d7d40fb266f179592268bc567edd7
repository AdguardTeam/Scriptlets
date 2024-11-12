Changelog for the [js-reporters](https://www.npmjs.com/package/js-reporters) package. See [spec/](./spec/cri-draft.adoc) for the CRI standard.

2.1.0 / 2021-06-06
==================

### Added

* QUnitAdapter: Support for `todo` tests. (Timo Tijhof) [#140](https://github.com/js-reporters/js-reporters/pull/140)

2.0.0 / 2021-04-04
==================

This release provides a simplified spec, with various properties and features removed. Overall the new spec is considered narrower than the previous one. Existing reporters that support old producers should naturally support new producers as well. Existing producers can choose to remain unchanged or to remove older portions in a future release.

### Added

* Add SummaryReporter implementation.

### Changed

* Spec: Rewrite current proposal into a formal specification at [spec/](./spec/cri-draft.adoc). (Timo Tijhof)
* Spec: Remove "todo" from Assertion event data. [#119](https://github.com/js-reporters/js-reporters/pull/119)
* Spec: Remove "tests" and "childSuites" from SuiteStart and SuiteEnd event data.
* Spec: Prefer `null` instead of `undefined` for optional fields.
* TapReporter: Improve formatting of multi-line strings. [#109](https://github.com/js-reporters/js-reporters/issues/109)

### Fixed

* TapReporter: Fix support objects with cycles, avoiding uncaught errors. (Zachary Mulgrew) [#104](https://github.com/js-reporters/js-reporters/issues/104)
* TapReporter: Defend against mocked `console` object. [#125](https://github.com/js-reporters/js-reporters/issues/125)
* MochaAdapter: Fix support for Mocha 8, due to changes in `STATE_PENDING`. [#116](https://github.com/js-reporters/js-reporters/issues/116)

### Removed

* Remove support for Node.js 8 and older. This release requires Node.js 10 or later. (Browser support has not changed and remains IE 9+, see [README](./README.md#runtime-support).)
* Helpers: Remove the `Assertion`, `Test`, and `Suite` classes.
* Helpers: Remove `collectSuite{Start,StartData,EndData}` methods.

1.2.3 / 2020-09-07
==================

### Changed

* TapReporter: Align `actual` with `expected` in TAP output. (Robert Jackson) [#107](https://github.com/js-reporters/js-reporters/pull/107)

### Fixed

* Helpers: Correct spelling in `autoRegister()` error message. (P. Roebuck) [#108](https://github.com/js-reporters/js-reporters/issues/108)
* TapReporter: Revert "Fix YAML syntax". [#110](https://github.com/js-reporters/js-reporters/issues/110)

1.2.2 / 2019-05-13
==================

### Fixed

* TapReporter: Fix YAML syntax. (jeberger) [#110](https://github.com/js-reporters/js-reporters/issues/110)

1.2.1 / 2017-07-04
==================

### Changed

* TapReporter: Print "actual:", "expected:" even if undefined. (Martin Olsson)

### Fixed

* TapReporter: Drop accidentally committed `console.warn()` statement. (Martin Olsson)

1.2.0 / 2017-03-22
==================

### Added

* TapReporter: Improve TAP information and styling. (Florentin Simion)
* TapReporter: Support todo test in TAP reporter. (Trent Willis)
* Docs: Add API docs for the js-reporters package. (Florentin Simion)
