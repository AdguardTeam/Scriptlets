# AdGuard Scriptlets and Redirect resources

AdGuard's Scriptlets and Redirect resources library which provides extended capabilities for content blocking.

* [Scriptlets](#scriptlets)
    * [Syntax](#scriptlet-syntax)
    * [Available scriptlets](https://github.com/AdguardTeam/Scriptlets/blob/master/wiki/about-scriptlets.md#scriptlets)
    * [Scriptlets compatibility table](https://github.com/AdguardTeam/Scriptlets/blob/master/wiki/compatibility-table.md#scriptlets)
    * [Trusted scriptlets](#trusted-scriptlets)
        * [Restriction](#trusted-scriptlets-restriction)
        * [Available trusted scriptlets](https://github.com/AdguardTeam/Scriptlets/blob/master/wiki/about-trusted-scriptlets.md#trusted-scriptlets)
* [Redirect resources](#redirect-resources)
    * [Syntax](#redirect-syntax)
    * [Available redirect resources](https://github.com/AdguardTeam/Scriptlets/blob/master/wiki/about-redirects.md#redirect-resources)
    * [Redirect resources compatibility table](https://github.com/AdguardTeam/Scriptlets/blob/master/wiki/compatibility-table.md#redirects)
* [How to build](#how-to-build)
* [How to test](#how-to-test)
* [How to update wiki](#how-to-update-wiki)
* [Browser compatibility](#browser-compatibility)
* [Projects using Scriptlets](#used-by)

* * *
## Scriptlets

Scriptlet is a JavaScript function which can be used in a declarative manner in AdGuard filtering rules.

AdGuard supports a lot of different scriptlets. Please note, that in order to achieve cross-blocker compatibility, we also support syntax of uBO and ABP.

### <a id="scriptlet-syntax"></a> Syntax

```
rule = [domains]  "#%#//scriptlet(" scriptletName arguments ")"
```

* `scriptletName` (mandatory) is a name of the scriptlet from AdGuard's scriptlets library
* `arguments` (optional) a list of `String` arguments (no other types of arguments are supported)

> **Remarks**
> * The meanining of the arguments depends on the scriptlet.
> * You can use either single or double quotes for the scriptlet name and arguments.
> * Special characters must be escaped properly:
>     * `'prop["nested"]'` - valid
>     * `"prop['nested']"` - valid
>     * `"prop[\"nested\"]"` - also valid
>     * `"prop["nested"]"` - not valid
>     * `'prop['nested']'` - not valid

**Example**

```
example.org#%#//scriptlet('abort-on-property-read', 'alert')
example.org#%#//scriptlet('remove-class', 'branding', 'div[class^="inner"]')
```

This rule applies the `abort-on-property-read` scriptlet on all pages of `example.org` and its subdomains, and passes one argument to it (`alert`).

* **[Scriptlets list](https://github.com/AdguardTeam/Scriptlets/blob/master/wiki/about-scriptlets.md#scriptlets)**
* **[Scriptlets compatibility table](https://github.com/AdguardTeam/Scriptlets/blob/master/wiki/compatibility-table.md#scriptlets)**


### <a id="trusted-scriptlets"></a> Trusted scriptlets

Trusted scriptlets are scriptlets with extended functionality. Their names are prefixed with `trusted-`, e.g `trusted-click-element`, to be easily distinguished from common scriptlets.

#### <a id="trusted-scriptlets-restriction"></a> Restriction

Trusted scriptlets application must be restricted due to dangerous nature of their capabilities.
Allowed sources of trusted scriptlets are:
* filters created by AdGuard Team,
* custom filters which were installed as `trusted`,
* user rules.

> Trusted scriptlets has no compatibility table as they are not compatible with any other blocker.

**[Trusted scriptlets list](https://github.com/AdguardTeam/Scriptlets/blob/master/wiki/about-trusted-scriptlets.md#trusted-scriptlets)**


## Redirect resources

AdGuard is able to redirect web requests to a local "resource".

### <a id="redirect-syntax"></a> Syntax

AdGuard uses the same filtering rule syntax as [uBlock Origin](https://github.com/gorhill/uBlock/wiki/Static-filter-syntax#redirect). Also, it is compatible with ABP `$rewrite=abp-resource` modifier.

`$redirect` is a modifier for [the basic filtering rules](https://kb.adguard.com/en/general/how-to-create-your-own-ad-filters#basic-rules-syntax) so rules with this modifier support all other basic modifiers like `$domain`, `$third-party`, `$script`, etc.

The value of the `$redirect` modifier must be the name of the resource, that will be used for redirection. See the list of resources [below](#available-resources).

**Examples**
* `||example.org/script.js$script,redirect=noopjs` -- redirects all requests to `script.js` to the resource named `noopjs`.
* `||example.org/test.mp4$media,redirect=noopmp4-1s` -- requests to `example.org/test.mp4` will be redirected to the resource named `noopmp4-1s`.

> `$redirect` rules priority is higher than the regular basic blocking rules' priority. This means that if there's a basic blocking rule (even with `$important` modifier), `$redirect` rule will prevail over it. If there's a whitelist (`@@`) rule matching the same URL, it will disable redirecting as well (unless the `$redirect` rule is also marked as `$important`).

> uBlock Origin specifies additional resource name `none` that can disable other redirect rules. AdGuard does not support it, use `$badfilter` to disable specific rules.

* **[Redirect resources list](https://github.com/AdguardTeam/Scriptlets/blob/master/wiki/about-redirects.md#redirect-resources)**
* **[Redirect resources compatibility table](https://github.com/AdguardTeam/Scriptlets/blob/master/wiki/compatibility-table.md#redirects)**

* * *

## <a id="how-to-build"></a> How to build

Install dependencies
```
yarn install
```

Build for CoreLibs
```
yarn corelibs
```

Build dev (rebuild js files on every change)
```
yarn watch
```

### Build for Extension
In scriptlets directory install dependencies, build scriptlets bundle, and create scriptlets link.
```
yarn
yarn build
yarn link
```

In tsurlfilter directory install and link dependencies, link scriptlets, move into package and build, and create tsurlfilter link.
```
lerna bootstrap

yarn link "@adguard/scriptlets"

cd ./packages/tsurlfilter
yarn build
yarn link
```
In extension directory install dependincies, link packages and build
```
yarn

yarn link @adguard/scriptlets
yarn link @adguard/tsurlfilter

yarn dev
```

### Build output

#### Scriptlets library

You are welcome to use scriptlets and redirect resources as a CJS module. They can be imported from `dist/cjs/scriptlets.cjs.js`:

```javascript
const scriptlets = require('scriptlets');
const { redirects } = require('scriptlets');

```

And also there is a module at `dist/scriptlets.js` which has been exported to a global variable `scriptlets` with such methods:

```javascript
/**
 * Returns scriptlet code by param
 * @param {Source} source
 * @returns {string|null} scriptlet code
 * @throws on unknown scriptlet name
 */
scriptlets.invoke(source);
```

```javascript
/**
 * Returns scriptlet function by name
 * @param {string} name scriptlet name
 * @returns {Function}
 */
scriptlets.getScriptletFunction(name);
```

```javascript
/**
 * Checks whether the `name` is valid scriptlet name
 * @param {string} name
 * @returns {boolean}
 */
scriptlets.isValidScriptletName(name);
```

```javascript
/**
 * Checks whether the ADG scriptlet exists or UBO/ABP scriptlet is compatible to ADG
 *
 * ADG or UBO rules are "single-scriptlet", but ABP rule may contain more than one snippet
 * so if at least one of them is not valid — whole 'input' rule is not valid too.
 * @param {string} input — any scriptlet rule
 * @returns {boolean}
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
 * Checks whether the `rule` is any scriptlet rule and converts it to AdGuard syntax
 * @param {string} rule — any scriptlet rule
 * @returns {string[]} — array of AdGuard scriptlet rules: one item for Adg and Ubo or few items for Abp
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


##### <a id="redirects_api-methods"></a> Imported `redirects` has such methods:

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
```
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

Schema
```
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
```
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
 * Redirect - object with following props
 * {
 *      title: 1x1-transparent.gif
 *      comment: http://probablyprogramming.com/2009/03/15/the-tiniest-gif-ever
 *      contentType: image/gif;base64
 *      content: R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
 * }
 */
```

## <a id="how-to-test"></a> How to test

Run node testing
```
yarn test
```

Run tests gui
```
yarn gui-test
```

Watcher is available
```
yarn test-watch
```

Limit testing by commenting out corresponding values in `build-tests.js`
```
const MULTIPLE_TEST_FILES_DIRS = [
// 'scriptlets',
// 'redirects',
];
const ONE_TEST_FILE_DIRS = [
'lib-tests',
// 'helpers',
];
```

or `index.test.js`
```
// import './scriptlets/index.test';
import './redirects/index.test';
// import './lib-tests/index.test';
// import './helpers/index.test';
```

> It is also possible to exclude libtests in `tests/lib-tests/index.test.js`

Run specific scriptlet or redirect test by editing `build-tests.js`
```
.filter((el) => {
    return el !== 'index.test.js'
        // Uncomment next line and use required scriptlet/redirect name
        // && el === 'gemius.test.js'
        && el.includes(TEST_FILE_NAME_MARKER);
});
```

To run browserstack tests create `.env` file or copy and rename `.env-example`.

Fill in <username> and <key> with data from your Browserstack profile.
Run next command
```
yarn browserstack
```

### Debugging

Use `debugger;` statement where you need it, run
```
yarn test
```
and open needed HTML file from `tests/dist` in your browser with devtools

## <a id="how-to-update-wiki"></a> How to update wiki

There are two scripts to update wiki:
1. `yarn wiki:build-table` — checks compatibility data updates and updates the compatibility table. Should be run manually while the release preparation.
2. `yarn wiki:build-docs` — updates wiki pages `about-scriptlets.md` and `about-redirects.md`. They are being generated from JSDoc-type comments of corresponding scriptlets and redirects source files due to `@scriptlet`/`@redirect` and `@description` tags. Runs automatically while the release build.

## <a id="browser-compatibility"> Browser Compatibility
| Chrome | Edge | Firefox | IE  | Opera | Safari |
| ------ | ---- | ------- | --- | ----- | ------ |
| 55     | 15   | 52      | 11  | 42    | 10     |

## <a id="used-by"> Projects using Scriptlets
* [CoreLibs](https://github.com/AdguardTeam/CoreLibs) (updates automatically)
* [TSUrlFilter](https://github.com/AdguardTeam/tsurlfilter)
* [FiltersCompiler](https://github.com/AdguardTeam/FiltersCompiler) (`tsurlfilter`'s update might be required as well)
* [AdguardBrowserExtension](https://github.com/AdguardTeam/AdguardBrowserExtension) (`tsurlfilter` also should be updated)
* [AdguardForSafari](https://github.com/AdguardTeam/AdGuardForSafari) (`adguard-resources` should be updated)
* [AdguardForiOS](https://github.com/AdguardTeam/AdguardForiOS) (`tsurlfilter` should be updated in `advanced-adblocker-web-extension`)
