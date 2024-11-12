# js-reporters

[![Chat on Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/js-reporters/js-reporters)
[![Build Status](https://travis-ci.com/js-reporters/js-reporters.svg?branch=main)](https://travis-ci.com/js-reporters/js-reporters)
[![Coverage Status](https://coveralls.io/repos/github/js-reporters/js-reporters/badge.svg?branch=main)](https://coveralls.io/github/js-reporters/js-reporters?branch=main)
[![npm](https://img.shields.io/npm/dm/js-reporters.svg)](https://www.npmjs.com/package/js-reporters)
[![npm](https://img.shields.io/npm/v/js-reporters.svg)](https://www.npmjs.com/package/js-reporters)

The Common Reporter Interface (CRI) for JavaScript Testing Frameworks.

| Avoid this:                | Do this:                         |
|----------------------------|----------------------------------|
| ![](img/situation-now.png) | ![](img/situation-expected.png)  |

## Specification

**See [Common Reporter Interface](spec/cri-draft.adoc) for the latest version of the specification.**

See also:

* [example](docs/example.md), illustrates how reporting works in practice.
* [frameworks](docs/frameworks.md), studies various popular testing frameworks.
* **[Integrations](#integrations)**, a list of real-world implementations.

Help with AsciiDoc (used for the standard document):

* [AsciiDoc Syntax Quick Reference](https://asciidoctor.org/docs/asciidoc-syntax-quick-reference/)
* [AsciiDoc User Manual](https://asciidoctor.org/docs/user-manual/)
* [AsciiDoc cheatsheet](https://powerman.name/doc/asciidoc)

## Background

In 2014, the [QUnit](https://qunitjs.com/) team started [discussing](https://github.com/qunitjs/qunit/issues/531) the possibility of interoperability between JavaScript testing frameworks such as QUnit, Mocha, Jasmine, Intern, Buster, etc. The "Common Reporter Interface" would be an allow integrations for output formats and communication bridges to be shared between frameworks. This would also benefit high-level consumers of these frameworks such as Karma, BrowserStack, SauceLabs, Testling, by having a standard machine-readable interface.

Our mission is to deliver:

- a common JavaScript API, e.g. based on EventEmitter featuring `.on()` and `.off()`.
- a minimum viable set of events with standardized event names and event data.
- a minimum viable set of concepts behind those events to allow consumers to set expectations (e.g. define what "pass", "fail", "skip", "todo", and "pending" mean).
- work with participating testing frameworks to support the Common Reporter Interface.

Would _you_ be interested in discussing this with us further? Please join in!

* [Join the Chat room](https://gitter.im/js-reporters/js-reporters)
* [Browse open issues](https://github.com/js-reporters/js-reporters/issues/)
* [Help frameworks and runners implement the spec](#cross-project-coordination)

## js-reporters Package

### Usage

Listen to the events and receive the emitted data:

```js
// Use automatic discovery of the framework adapter.
const runner = JsReporters.autoRegister();

// Listen to standard events, from any testing framework.
runner.on('testEnd', (test) => {
  console.log('Test %s has errors:', test.fullName.join(' '), test.errors);
});

runner.on('runEnd', (run) => {
  const counts = run.testCounts;

  console.log('Testsuite status: %s', run.status);
  console.log('Total %d tests: %d passed, %d failed, %d skipped',
    counts.total,
    counts.passed,
    counts.failed,
    counts.skipped
  );
  console.log('Total duration: %d', run.runtime);
});

// Or use one of the built-in reporters.
JsReporters.TapReporter.init(runner);
```

### Runtime support

* Internet Explorer 9+
* Edge 15+ (Legacy)
* Edge 80+ (Chromium-based)
* Safari 9+
* Firefox 45+
* Chrome 58+
* Node.js 10+

### Adapter support

| Testing framework | Supported | Last checked | Unresolved
|--|--|--|--
| QUnit | 1.20+ | ✅ `qunit@2.14.1` (Apr 2021) | –
| Jasmine | 2.1+ | ✅ `jasmine@3.7.0` (Apr 2021) | –
| Mocha | 1.18+ | ✅ `mocha@8.3.2` (Apr 2021) | –

See also [past issues](test/versions/failing-versions.js).

### API

**autoRegister()**

Automatically detects which testing framework you use and attaches any adapters as needed, and returns a compatible runner object. If no framework is found, it will throw an `Error`.

```js
JsReporters.autoRegister();
```

## Integrations

Runners:

* [QUnit](https://qunitjs.com/), natively since [QUnit 2.2](https://github.com/qunitjs/qunit/releases/2.2.0).
* Jasmine, via [js-reporters JasmineAdapter](lib/adapters/JasmineAdapter.js).
* Mocha, via [js-reporters MochaAdapter](lib/adapters/MochaAdapter.js).

Reporters:

* [TAP](lib/reporters/TapReporter), implements the [Test Anything Protocol](https://testanything.org/) for command-line output.
* [browserstack-runner](https://github.com/browserstack/browserstack-runner/blob/0.9.1/lib/_patch/reporter.js), runs JavaScript unit tests remotely in multiple browsers, summarize the results by browser, and fail or pass the continuous integration build accordingly.
* _Add your own, and let us know!_

## Cross-project coordination

Testing frameworks:

* [QUnit issue](https://github.com/qunitjs/qunit/issues/531) (Done!)
* [Mocha issue](https://github.com/visionmedia/mocha/issues/1326) (pending…)
* [Jasmine issue](https://github.com/pivotal/jasmine/issues/659) (pending…)
* [Intern issue](https://github.com/theintern/intern/issues/257) (pending…)
* [Vows issue](https://github.com/flatiron/vows/issues/313) (pending…)
* [Buster issue](https://github.com/busterjs/buster/issues/419) (Discontinued.)
* [Nodeunit issue](https://github.com/caolan/nodeunit/issues/276) (Discontinued.)

Reporters and proxy layers:

* [BrowserStack](https://github.com/browserstack/browserstack-runner/issues/92) (Done!)
* [Karma](https://github.com/karma-runner/karma/issues/1183) (pending…)
* [grunt-saucelabs](https://github.com/axemclion/grunt-saucelabs/issues/164) (pending…)
* [Testling](https://github.com/substack/testling/issues/93) (pending…)

## Credits

[![Testing Powered By SauceLabs](https://opensource.saucelabs.com/images/opensauce/powered-by-saucelabs-badge-gray.png?sanitize=true "Testing Powered By SauceLabs")](https://saucelabs.com)
