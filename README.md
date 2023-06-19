# AdGuard Scriptlets and Redirect Resources

AdGuard's Scriptlets and Redirect resources library which provides extended capabilities for content blocking.

- [Scriptlets](#scriptlets)
    - [Syntax](#scriptlet-syntax)
    - [Available scriptlets](./wiki/about-scriptlets.md#scriptlets)
    - [Scriptlets compatibility table](./wiki/compatibility-table.md#scriptlets)
    - [Trusted scriptlets](#trusted-scriptlets)
        - [Restriction](#trusted-scriptlets-restriction)
        - [Available trusted scriptlets](./wiki/about-trusted-scriptlets.md#trusted-scriptlets)
- [Redirect resources](#redirect-resources)
    - [Syntax](#redirect-syntax)
    - [Available redirect resources](./wiki/about-redirects.md#redirect-resources)
    - [Redirect resources compatibility table](./wiki/compatibility-table.md#redirects)
- [How to build](#how-to-build)
- [How to test](#how-to-test)
- [How to update wiki](#how-to-update-wiki)
- [Browser compatibility](#browser-compatibility)
- [Projects using Scriptlets](#used-by)

* * *

## Scriptlets

Scriptlet is a JavaScript function which can be used in a declarative manner in AdGuard filtering rules.

AdGuard supports a lot of different scriptlets.
Please note, that in order to achieve cross-blocker compatibility, we also support syntax of uBO and ABP.

### <a id="scriptlet-syntax"></a> Syntax

```text
rule = [domains]  "#%#//scriptlet(" scriptletName arguments ")"
```

- `scriptletName` (mandatory) is a name of the scriptlet from AdGuard's scriptlets library
- `arguments` (optional) a list of `String` arguments (no other types of arguments are supported)

> **Remarks**
>
> - The meaning of the arguments depends on the scriptlet.
>
> - Special characters in scriptlet argument must be escaped properly:
>     - valid:
>         - `'prop["nested"]'`
>         - `"prop['nested']"`
>         - `'prop[\'nested\']'`
>         - `"prop[\"nested\"]"`
>     - not valid:
>         - `'prop['nested']'`
>         - `"prop["nested"]"`
>
> - You can use either single or double quotes for the scriptlet name and arguments.
> Single quote is recommended but not for cases when its usage makes readability worse,
> e.g. `".css('display','block');"` is more preferred then `'.css(\'display\',\'block\');'`.


#### Example

```adblock
example.org#%#//scriptlet('abort-on-property-read', 'alert')
example.org#%#//scriptlet('remove-class', 'branding', 'div[class^="inner"]')
```

This rule applies the `abort-on-property-read` scriptlet on all pages of `example.org` and its subdomains,
and passes one argument to it (`alert`).

- **[Scriptlets list](./wiki/about-scriptlets.md#scriptlets)**
- **[Scriptlets compatibility table](./wiki/compatibility-table.md#scriptlets)**


### <a id="trusted-scriptlets"></a> Trusted scriptlets

Trusted scriptlets are scriptlets with extended functionality.
Their names are prefixed with `trusted-`, e.g `trusted-click-element`,
to be easily distinguished from common scriptlets.

#### <a id="trusted-scriptlets-restriction"></a> Restriction

Trusted scriptlets application must be restricted due to dangerous nature of their capabilities.
Allowed sources of trusted scriptlets are:

- filters created by AdGuard Team,
- custom filters which were installed as `trusted`,
- user rules.

> Trusted scriptlets has no compatibility table as they are not compatible with any other blocker.

**[Trusted scriptlets list](./wiki/about-trusted-scriptlets.md#trusted-scriptlets)**


## Redirect resources

AdGuard is able to redirect web requests to a local "resource".

### <a id="redirect-syntax"></a> Syntax

AdGuard uses the same filtering rule syntax
as [uBlock Origin](https://github.com/gorhill/uBlock/wiki/Static-filter-syntax#redirect).
Also, it is compatible with ABP `$rewrite=abp-resource` modifier.

`$redirect` is a modifier for
[the basic filtering rules](https://kb.adguard.com/en/general/how-to-create-your-own-ad-filters#basic-rules-syntax)
so rules with this modifier support all other basic modifiers like `$domain`, `$third-party`, `$script`, etc.

The value of the `$redirect` modifier must be the name of the resource that will be used for redirection.
See the list of [available redirect resources](./wiki/about-redirects.md#redirect-resources).

### Examples

- `||example.org/script.js$script,redirect=noopjs` — redirects all requests to `script.js`
  to the resource named `noopjs`.
- `||example.org/test.mp4$media,redirect=noopmp4-1s` — requests to `example.org/test.mp4` will be redirected
  to the resource named `noopmp4-1s`.

> `$redirect` rules priority is higher than the regular basic blocking rules' priority.
> This means that if there's a basic blocking rule (even with `$important` modifier),
> `$redirect` rule will prevail over it.
> If there's a whitelist (`@@`) rule matching the same URL,
> it will disable redirecting as well (unless the `$redirect` rule is also marked as `$important`).

> uBlock Origin specifies additional resource name `none` that can disable other redirect rules.
> AdGuard does not support it, use `$badfilter` to disable specific rules.

- **[Redirect resources list](./wiki/about-redirects.md#redirect-resources)**
- **[Redirect resources compatibility table](./wiki/compatibility-table.md#redirects)**

* * *

## <a id="how-to-build"></a> How to build

Install dependencies:

```bash
yarn install
```

Build for CoreLibs:

```bash
yarn corelibs
```

Build dev (rebuild js files on every change):

```bash
yarn watch
```

### Build for Extension

In scriptlets directory install dependencies, build scriptlets bundle, and create scriptlets link.

```bash
yarn
yarn build
yarn link
```

In tsurlfilter directory install and link dependencies, link scriptlets,
move into package and build, and create tsurlfilter link.

```bash
lerna bootstrap

yarn link "@adguard/scriptlets"

cd ./packages/tsurlfilter
yarn build
yarn link
```

In extension directory install dependencies, link packages and build

``` bash
yarn

yarn link @adguard/scriptlets
yarn link @adguard/tsurlfilter

yarn dev
```

### Build output

#### Scriptlets library

You are welcome to use scriptlets and redirect resources as a CJS module.
They can be imported from `dist/cjs/scriptlets.cjs.js`:

```javascript
const scriptlets = require('scriptlets');
const { redirects } = require('scriptlets');

```

And also there is a module at `dist/scriptlets.js`
which has been exported to a global variable `scriptlets` with such methods:

```javascript
/**
 * Returns scriptlet code by `source`.
 *
 * @param {Source} source Scriptlet properties.
 *
 * @returns {string|null} Scriptlet code.
 * @throws An error on unknown scriptlet name.
 */
scriptlets.invoke(source);
```

where:

```javascript
/**
 * @typedef {object} Source — Scriptlet properties.
 * @property {string} name — Scriptlet name.
 * @property {Array<string>} args — Arguments for scriptlet function.
 * @property {'extension'|'corelibs'} engine — Defines the final form of scriptlet string presentation.
 * @property {string} [version] — Extension version.
 * @property {boolean} [verbose] — Flag to enable debug information printing to console.
 * @property {string} [ruleText] — Source rule text, needed for debug purposes.
 * @property {string} [domainName] — Domain name where scriptlet is applied, needed for debug purposes.
 */
```

```javascript
/**
 * Returns scriptlet function by `name`.
 *
 * @param {string} name Scriptlet name
 *
 * @returns {Function} — Scriptlet function.
 */
scriptlets.getScriptletFunction(name);
```

```javascript
/**
 * Checks whether the `name` is valid scriptlet name.
 * Uses cache for better performance.
 *
 * @param {string} name — Scriptlet name
 * @returns {boolean} — True if scriptlet name is valid.
 */
scriptlets.isValidScriptletName(name);
```

```javascript
/**
 * 1. For ADG scriptlet checks whether the scriptlet syntax and name are valid.
 * 2. For UBO and ABP scriptlet first checks their compatibility with ADG
 * by converting them into ADG syntax, and after that checks the name.
 *
 * ADG or UBO rules are "single-scriptlet", but ABP rule may contain more than one snippet
 * so if at least one of them is not valid — whole `ruleText` rule is not valid too.
 *
 * @param {string} ruleText — Any scriptlet rule — ADG or UBO or ABP.
 *
 * @returns {boolean} — True if scriptlet name is valid in rule.
 */
scriptlets.isValidScriptletRule(input);
```

```javascript
/**
 * Checks if the `rule` is AdGuard / Ubo / Abp scriptlet rule
 * @param {string} rule — any rule
 * @returns {boolean}
 */
scriptlets.isAdgScriptletRule(rule);
scriptlets.isUboScriptletRule(rule);
scriptlets.isAbpSnippetRule(rule);
```

```javascript
/**
 * Converts Ubo scriptlet rule to AdGuard
 * @param {string} rule — Ubo rule
 * @returns {string[]} — array with single AdGuard scriptlet rule
 */
scriptlets.convertUboToAdg(rule);
```

> Note that parameters in UBO rule should be separated by comma + space. Otherwise, the rule is not valid.

```javascript
/**
 * Converts Abp snippet rule to AdGuard
 * @param {string} rule — Abp rule
 * @returns {string[]} — array with AdGuard scriptlet rule or rules if Abp-rule has few snippets in one line
 */
scriptlets.convertAbpToAdg(rule);
```

```javascript
/**
 * Converts any scriptlet rule into AdGuard syntax rule.
 * Comment is returned as is.
 *
 * @param {string} rule — Scriptlet rule.
 *
 * @returns {string[]} — Array of AdGuard scriptlet rules: one array item for ADG and UBO or few items for ABP.
 * For the ADG `rule`, validates its syntax and returns an empty array if it is invalid.
 */
scriptlets.convertScriptletToAdg(rule);
```

```javascript
/**
 * Converts AdGuard scriptlet rule to UBO one
 * @param {string} rule — AdGuard scriptlet rule
 * @returns {string} — UBO scriptlet rule
 */
scriptlets.convertAdgToUbo(rule);
```


##### <a id="redirects_api-methods"></a> Imported `redirects` methods

```javascript
/**
 * Returns redirects code
 * @param {Source} source
 * @returns {string}
 */
redirects.getCode(source);
```

```javascript
/**
 * Checks whether the `rule` is AdGuard redirect resource rule.
 * Discards comments and JS rules and checks whether the `rule` has $redirect or $redirect-rule modifier
 * @param {string} rule
 */
redirects.isAdgRedirectRule(rule)
```

```javascript
/**
 * Checks whether the `rule` is **valid** AdGuard redirect resource rule.
 * No matter $redirect or $redirect-rule
 * @param {string} rule
 * @returns {boolean}
 */
redirects.isValidAdgRedirectRule(rule);
```

```javascript
/**
 * Checks whether the AdGuard redirect `rule` has Ubo analog.
 * Needed for Adg->Ubo conversion. No matter $redirect or $redirect-rule modifier is used
 * @param {string} rule — AdGuard rule
 * @returns {boolean} — true if the rule can be converted to Ubo syntax
 */
redirects.isAdgRedirectCompatibleWithUbo(rule);
```

```javascript
/**
 * Checks if the Ubo redirect `rule` has AdGuard analog.
 * Needed for Ubo->Adg conversion. No matter $redirect or $redirect-rule modifier is used
 * @param {string} rule — Ubo rule
 * @returns {boolean} — true if the rule can be converted to AdGuard syntax
 */
redirects.isUboRedirectCompatibleWithAdg(rule);
```

```javascript
/**
 * Checks whether the Abp redirect `rule` has AdGuard analog. Needed for Abp->Adg conversion
 * @param {string} rule — Abp rule
 * @returns {boolean} — true if the rule can be converted to AdGuard syntax
 */
redirects.isAbpRedirectCompatibleWithAdg(rule);
```

```javascript
/**
 * Converts Ubo redirect resource rule to AdGuard syntax.
 * No matter $redirect or $redirect-rule modifier is used
 * @param {string} rule — Ubo rule
 * @returns {string} — Adg rule
 */
redirects.convertUboRedirectToAdg(rule);
```

```javascript
/**
 * Converts Abp redirect resource rule to AdGuard syntax
 * @param {string} rule — Abp rule
 * @returns {string} — Adg rule
 */
redirects.convertAbpRedirectToAdg(rule);
```

```javascript
/**
 * Checks whether the `rule` is any redirect rule and converts it to AdGuard syntax.
 * No matter $redirect or $redirect-rule modifier is used
 * @param {string} rule — any resource rule
 * @returns {string} — valid Adguard redirect resource rule
 */
redirects.convertRedirectToAdg(rule);
```

```javascript
/**
 * Converts Adg redirect rule to Ubo syntax.
 * No matter $redirect or $redirect-rule modifier is used
 * @param {string} rule — Adg rule
 * @returns {string} — Ubo rule
 */
redirects.convertAdgRedirectToUbo(rule);
```

```javascript
/**
 * For a given name or alias of redirect returns the corresponding filename
 * @param {string} name — name or alias of redirect
 * @returns {string} — Redirect's filename with extension
 */
redirects.getRedirectFilename(name);
```


#### Corelibs library

`dist/scriptlets.corelibs.json`

File example

```json
{
    "version": "1.0.0",
    "scriptlets": [
        {
            "names": [
                "abort-on-property-read",
                "ubo-abort-on-property-read.js",
                "abp-abort-on-property-read"
            ],
            "scriptlet": "function() { ...code... }"
        },
    ]
}
```

Schema:

```json
{
    "type": "object",
    "properties": {
        "version": {
            "type": "string"
        },
        "scriptlets": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "names": {
                        "type": "array",
                        "items": {
                            "type": "string"
                        }
                    },
                    "scriptlet": {
                        "type": "string"
                    }
                },
            }
        }
    }
}
```

#### Redirects library

```text
dist/redirects.js
dist/redirects.yml
```

Creates a global variable `Redirects`.

```javascript
// Usage

/**
 * Converts rawYaml into JS object with sources titles used as keys
 */
const redirects = new Redirects(rawYaml)

/**
 * Returns redirect source object by title
 */
const redirect = redirect.getRedirect('noopjs');

/**
 * Check if redirect is blocking, e.g. click2load.html
 */
const isBlocking = redirect.isBlocking('click2load.html');

/**
 * Redirect — object with following props
 * {
 *      title: 1x1-transparent.gif
 *      comment: http://probablyprogramming.com/2009/03/15/the-tiniest-gif-ever
 *      contentType: image/gif;base64
 *      content: R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
 * }
 */
```


## <a id="how-to-test"></a> How to test

Some tests are run in QUnit, some in Jest.

Run all tests:

```bash
yarn test
```

1. QUnit is used for testing of scriptlets, redirects, and helpers:

    ```text
    yarn test:qunit [scriptlets | redirects | helpers]
    ```

    For scriptlets and redirects test run can be more specific:

    ```bash
    // node test run
    yarn test:qunit scriptlets --name set-cookie
    yarn test:qunit redirects --name ati-smarttag

    // gui test run
    yarn test:qunit scriptlets --name set-cookie --gui
    yarn test:qunit redirects --name ati-smarttag --gui
    ```

    For debugging purposes after some test is running in gui mode,
    you may change your scriptlet/redirect code, and without stopping the server
    run in new terminal:

    ```bash
    yarn test:qunit scriptlets --name set-cookie --build
    ```

1. Run all jest tests:

    ```bash
    yarn test:jest
    ```

    or limit the testing — `testRegex` may be specified in `jest.config.js`
    or specify [test name](https://jestjs.io/docs/cli#--testnamepatternregex) in command line, e.g.:

    ```bash
    yarn test:jest -t isValidScriptletRule
    ```

To run browserstack tests create `.env` file or copy and rename `.env-example`.

Fill in `<username>` and `<key>` with data from your Browserstack profile.
Run next command:

```bash
yarn browserstack
```

Tests run by `jest` should be named `.spec.js`, so they will be not included in the `QUnit` tests.

### Debugging

Use `debugger;` statement where you need it, run

```bash
yarn test
```

and open needed HTML file from `tests/dist` in your browser with devtools


## <a id="how-to-update-wiki"></a> How to update wiki

There are two scripts to update wiki:

1. `yarn wiki:build-table` — checks compatibility data updates and updates the compatibility table.
    Should be run manually while the release preparation.
2. `yarn wiki:build-docs` — updates wiki pages `about-scriptlets.md` and `about-redirects.md`.
    They are being generated from JSDoc-type comments of corresponding scriptlets and redirects source files
    due to `@scriptlet`/`@redirect` and `@description` tags. Runs automatically while the release build.


## <a id="browser-compatibility"> Browser Compatibility

| Browser               | Version   |
|-----------------------|:----------|
| Chrome                | ✅ 55     |
| Firefox               | ✅ 52     |
| Edge                  | ✅ 15     |
| Opera                 | ✅ 42     |
| Safari                | ✅ 11     |
| Internet Explorer     | ❌        |


## <a id="used-by"> Projects using Scriptlets

- [CoreLibs](https://github.com/AdguardTeam/CoreLibs) (updates automatically)
- [TSUrlFilter](https://github.com/AdguardTeam/tsurlfilter)
- [FiltersCompiler](https://github.com/AdguardTeam/FiltersCompiler)
  (`tsurlfilter`'s update might be required as well)
- [AdguardBrowserExtension](https://github.com/AdguardTeam/AdguardBrowserExtension)
  (`tsurlfilter` also should be updated)
- [AdguardForSafari](https://github.com/AdguardTeam/AdGuardForSafari) (`adguard-resources` should be updated)
- [AdguardForiOS](https://github.com/AdguardTeam/AdguardForiOS)
  (`tsurlfilter` should be updated in `advanced-adblocker-web-extension`)
