# AdGuard Scriptlets and Redirect Resources

AdGuard's Scriptlets and Redirect resources library which provides extended capabilities for content blocking.

- [Scriptlets](#scriptlets)
    - [Syntax](#scriptlet-syntax)
        - [Blocking rules](#scriptlet-syntax--blocking)
        - [Exception rules](#scriptlet-syntax--exceptions)
    - [Available scriptlets](./wiki/about-scriptlets.md#scriptlets)
    - [Scriptlets compatibility table](./wiki/compatibility-table.md#scriptlets)
    - [Trusted scriptlets](#trusted-scriptlets)
        - [Restriction](#trusted-scriptlets-restriction)
        - [Available trusted scriptlets](./wiki/about-trusted-scriptlets.md#trusted-scriptlets)
- [Redirect resources](#redirect-resources)
    - [Syntax](#redirect-syntax)
    - [Available redirect resources](./wiki/about-redirects.md#redirect-resources)
    - [Redirect resources compatibility table](./wiki/compatibility-table.md#redirects)
- [Development](#development)
    - [How to build](#how-to-build)
    - [How to test](#how-to-test)
    - [How to link packages](#how-to-link-packages)
    - [How to update wiki](#how-to-update-wiki)
- [Usage](#usage)
    - [CoreLibs](#corelibs)
    - [NPM module](#npm-module)
- [API description](#api-description)
    - [Scriptlets API](#scriptlets-api)
        - [`invoke()`](#scriptlets-api--invoke)
        - [`getScriptletFunction()`](#scriptlets-api--getScriptletFunction)
        - [Properties](#scriptlets-api-properties)
            - [`SCRIPTLETS_VERSION`](#scriptlets-api--version)
        - [`ContentScriptApi`](#scriptlets-api--content-script-api)
            - [`PolicyApi`](#scriptlets-api--content-script-api--policy-api)
    - [Redirects API](#redirects-api)
        - [Redirects class](#redirects-api--redirects-class)
        - [`getRedirect()`](#redirects-api--getRedirect)
        - [`isBlocking()`](#redirects-api--isBlocking)
        - [`getRedirectFilename()`](#redirects-api--getRedirectFilename)
    - [Validators API](#validators-api)
        - [`isValidScriptletName()`](#validators-api--isValidScriptletName)
        - [`isValidScriptletRule()`](#validators-api--isValidScriptletRule)
        <!-- markdownlint-disable-next-line -->
        - [`isAdgScriptletRule()`, `isUboScriptletRule()`, `isAbpSnippetRule()`](#scriptlets-api--is-Abg-Ubo-Abp-ScriptletRule)
        - [`isValidAdgRedirectRule()`](#redirects-api--isValidAdgRedirectRule)
        - [`isRedirectResourceCompatibleWithAdg()`](#redirects-api--isRedirectResourceCompatibleWithAdg)
    - [Converters API](#converters-api)
        - [`convertUboToAdg()`](#converters-api--convertUboToAdg)
        - [`convertAbpToAdg()`](#converters-api--convertAbpToAdg)
        - [`convertScriptletToAdg()`](#converters-api--convertScriptletToAdg)
        - [`convertAdgToUbo()`](#converters-api--convertAdgToUbo)
        - [`convertAdgRedirectToUbo()`](#converters-api--convertAdgRedirectToUbo)
- [Browser compatibility](#browser-compatibility)
- [Projects using Scriptlets](#used-by)

* * *

## Scriptlets

Scriptlet is a JavaScript function which can be used in a declarative manner in AdGuard filtering rules.

AdGuard supports a lot of different scriptlets.
Please note, that in order to achieve cross-blocker compatibility, we also support syntax of uBO and ABP.

### <a name="scriptlet-syntax"></a> Syntax

#### <a name="scriptlet-syntax--blocking"></a> Blocking rules

```text
[domains]#%#//scriptlet(name[, arguments])
```

- `domains` — optional, a list of domains where the rule should be applied;
- `name` — required, a name of the scriptlet from AdGuard Scriptlets library;
- `arguments` — optional, a list of `string` arguments (no other types of arguments are supported).

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
> - Scriptlet `name` and each of the `arguments` should be wrapped in quotes.
> You can use either single or double quotes for the scriptlet name and arguments.
> Single quote is recommended but not for cases when its usage makes readability worse,
> e.g. `".css('display','block');"` is more preferred then `'.css(\'display\',\'block\');'`.

#### <a name="scriptlet-syntax--exceptions"></a> Exception rules

```text
[domains]#@%#//scriptlet([name[, arguments]])
```

- `domains` — optional, a list of domains where the rule should be applied;
- `name` — optional, a name of the scriptlet to except from the applying;
  if not set, all scriptlets will not be applied;
- `arguments` — optional, a list of `string` arguments to match the same blocking rule and disable it.

#### Examples

1. Apply the `abort-on-property-read` scriptlet on all pages of `example.org` and its subdomains,
   and passes one argument to it (`alert`):

    ```adblock
    example.org#%#//scriptlet('abort-on-property-read', 'alert')
    ```

1. Remove the `branding` class from all `div[class^="inner"]` elements
   on all pages of `example.org` and its subdomains:

    ```adblock
    example.org#%#//scriptlet('remove-class', 'branding', 'div[class^="inner"]')
    ```

1. Apply `set-constant` and `set-cookie` on any webpage,
   but because of specific scriptlet exception rule
   only `set-constant` scriptlet will be applied on `example.org` and its subdomains:

    ```adblock
    #%#//scriptlet('set-constant', 'adList', 'emptyArr')
    #%#//scriptlet('set-cookie', 'accepted', 'true')
    example.org#@%#//scriptlet('set-cookie')
    ```

1. Apply `adjust-setInterval` on any webpage,
   and `set-local-storage-item` on all pages of `example.com` and its subdomains,
   but there is also multiple scriptlet exception rule,
   so no scriptlet rules will be applied on `example.com` and its subdomains:

    ```adblock
    #%#//scriptlet('adjust-setInterval', 'count', '*', '0.001')
    example.com#%#//scriptlet('set-local-storage-item', 'ALLOW_COOKIES', 'false')
    example.com#@%#//scriptlet()
    ```

- **[Scriptlets list](./wiki/about-scriptlets.md#scriptlets)**
- **[Scriptlets compatibility table](./wiki/compatibility-table.md#scriptlets)**


### <a name="trusted-scriptlets"></a> Trusted scriptlets

Trusted scriptlets are scriptlets with extended functionality.
Their names are prefixed with `trusted-`, e.g `trusted-click-element`,
to be easily distinguished from common scriptlets.

#### <a name="trusted-scriptlets-restriction"></a> Restriction

Trusted scriptlets application must be restricted due to dangerous nature of their capabilities.
Allowed sources of trusted scriptlets are:

- filters created by AdGuard Team,
- custom filters which were installed as `trusted`,
- user rules.

> Trusted scriptlets has no compatibility table as they are not compatible with any other blocker.

**[Trusted scriptlets list](./wiki/about-trusted-scriptlets.md#trusted-scriptlets)**

## Redirect resources

AdGuard is able to redirect web requests to a local "resource".

### <a name="redirect-syntax"></a> Syntax

AdGuard uses the same filtering rule syntax as [uBlock Origin][ubo-redirect].
Also, it is compatible with ABP `$rewrite=abp-resource` modifier.

`$redirect` is a modifier for [the basic filtering rules][kb-basic-rules]
so rules with this modifier support all other basic modifiers like `$domain`, `$third-party`, `$script`, etc.

The value of the `$redirect` modifier must be the name of the resource that will be used for redirection.
See the list of [available redirect resources](./wiki/about-redirects.md#redirect-resources).

> Priority of `$redirect` rules is described in the [Knowledge Base][kb-redirect-priority].

### Examples

- `||example.org/script.js$script,redirect=noopjs` — redirects all requests to `script.js`
  to the resource named `noopjs`.
- `||example.org/test.mp4$media,redirect=noopmp4-1s` — requests to `example.org/test.mp4` will be redirected
  to the resource named `noopmp4-1s`.

> uBlock Origin specifies additional resource name `none` that can disable other redirect rules.
> AdGuard does not support it, use `$badfilter` to disable specific rules.

- **[Redirect resources list](./wiki/about-redirects.md#redirect-resources)**
- **[Redirect resources compatibility table](./wiki/compatibility-table.md#redirects)**

* * *

## <a name="development"></a> Development

### <a name="how-to-build"></a> How to build

Install dependencies:

```bash
pnpm install
```

Build dist:

```bash
pnpm build
```

In tsurlfilter directory install and link dependencies, link scriptlets,
move into package and build, and create tsurlfilter link.

```bash
lerna bootstrap

pnpm link --global "@adguard/scriptlets"

cd ./packages/tsurlfilter

pnpm build

pnpm link --global
```

In extension directory install dependencies, link packages and build

``` bash
pnpm install

pnpm link --global "@adguard/scriptlets"

# run build script
```

### <a name="how-to-test"></a> How to test

Some tests are run in QUnit, some in Vitest.

Run all tests:

```bash
pnpm test
```

1. QUnit is used for testing of scriptlets, redirects, and helpers:

    ```text
    pnpm test:qunit [scriptlets | redirects | helpers]
    ```

    For scriptlets and redirects test run can be more specific:

    ```bash
    // node test run
    pnpm test:qunit scriptlets --name set-cookie
    pnpm test:qunit redirects --name ati-smarttag

    // gui test run
    pnpm test:qunit scriptlets --name set-cookie --gui
    pnpm test:qunit redirects --name ati-smarttag --gui
    ```

    For debugging purposes after some test is running in gui mode,
    you may change your scriptlet/redirect code, and without stopping the server
    run in new terminal:

    ```bash
    pnpm test:qunit scriptlets --name set-cookie --build
    ```

1. Run all jest tests:

    ```bash
    pnpm test:vitest
    ```

    or limit the testing — `include` may be specified in `vitest.config.ts`
    or specify [test name](https://vitest.dev/guide/filtering#cli) in command line, e.g.:

    ```bash
    pnpm test:vitest -t isValidScriptletRule
    ```

To run browserstack tests create `.env` file or copy and rename `.env-example`.

Fill in `<username>` and `<key>` with data from your Browserstack profile.
Run next command:

```bash
pnpm browserstack
```

Tests run by `jest` should be named `.spec.js`, so they will be not included in the `QUnit` tests.

#### Debugging

Use `debugger;` statement where you need it, run

```bash
pnpm test
```

and open needed HTML file from `tests/dist` in your browser with devtools


### <a name="how-to-link-packages"></a> How to link packages

Scriptlets library relies on external packages, such as `@adguard/agtree`.
During development, you might need to link these packages using `pnpm link`.

### <a name="how-to-update-wiki"></a> How to update wiki

There are two scripts to update wiki:

1. `pnpm wiki:build-table` — checks compatibility data updates and updates the compatibility table.
    Should be run manually while the release preparation.
1. `pnpm wiki:build-docs` — updates wiki pages `about-scriptlets.md` and `about-redirects.md`.
    They are being generated from JSDoc-type comments of corresponding scriptlets and redirects source files
    due to `@scriptlet`/`@redirect` and `@description` tags. Runs automatically while the release build.

## <a name="usage"></a> Usage

### <a name="corelibs"></a> CoreLibs

For CoreLibs usage you should use `dist/scriptlets.corelibs.json` and `dist/redirects.json`.

File example:

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
        }
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
                }
            }
        }
    }
}
```

### <a name="npm-module"></a> NPM module

#### Installation

You can install the library using

- [Yarn][yarn-pkg-manager-url]: `yarn add @adguard/scriptlets`
- [NPM][npm-pkg-manager-url]: `npm install @adguard/scriptlets`
- [PNPM][pnpm-pkg-manager-url]: `pnpm add @adguard/scriptlets`

## <a name="api-description"></a> API description

### <a name="scriptlets-api"></a> Scriptlets API

You are welcome to use scriptlets as a CJS modules or ESM modules:

```typescript
const { scriptlets } = require('@adguard/scriptlets');
// or
import { scriptlets } from '@adguard/scriptlets';
```

#### <a name="scriptlets-api--invoke"></a> `invoke()`

```typescript
/**
 * Returns scriptlet code by `source`.
 *
 * @param source Scriptlet properties.
 *
 * @returns Scriptlet code.
 * @throws An error on unknown scriptlet name.
 */
declare function getScriptletCode(source: Source): string;
declare const scriptlets: {
    invoke: typeof getScriptletCode;
};
```

where `Source` is:

```typescript
interface Source {
    /**
     * Scriptlet name
     */
    name: string;
    /**
     * Arguments for scriptlet function
     */
    args: string[];
    /**
     * {'extension'|'corelibs'} engine Defines the final form of scriptlet string presentation
     */
    engine: string;
    /**
     * Version
     */
    version: string;
    /**
     * flag to enable printing to console debug information
     */
    verbose: boolean;
    /**
     * Source rule text is used for debugging purposes.
     *
     * @deprecated since it is not used in the code anymore.
     */
    ruleText?: string;
    /**
     * Domain name, used to improve logging
     */
    domainName?: string;
    /**
     * Optional unique identifier for a scriptlet instance.
     *
     * This identifier is used to prevent multiple executions of the same scriptlet on the page.
     * If provided, this `uniqueId` will be combined with the scriptlet's `name` and `args`
     * to create a unique identifier for the scriptlet call. This identifier is
     * stored in the `Window.prototype.toString` object to ensure the scriptlet
     * is not executed more than once in the same context.
     *
     * By avoiding multiple executions, it helps in reducing redundant operations and
     * potential side effects that might occur if the same scriptlet is called multiple times.
     *
     * If `uniqueId` is not specified, no such unique identifier is created, and the
     * scriptlet can be called multiple times.
     */
    uniqueId?: string;
    /**
     * Instance of content script provided API.
     *
     * Property optional because:
     * - for backwards compatibility.
     * - currently only CoreLibs provides this API.
     */
    api?: ContentScriptApi;
}
```

see also [`ContentScriptApi`](#scriptlets-api--content-script-api) for more details.

#### <a name="scriptlets-api--getScriptletFunction"></a> `getScriptletFunction()`

```typescript
/**
 * Returns scriptlet function by `name`.
 *
 * @param {string} name Scriptlet name
 *
 * @returns {Function} — Scriptlet function.
 */
declare function getScriptletFunction(name: any): string;
declare const scriptlets: {
    getScriptletFunction: typeof getScriptletFunction;
};
```

#### <a name="scriptlets-api-properties"></a> Properties

##### <a name="scriptlets-api--version"></a> `SCRIPTLETS_VERSION`

type: `string`

Current version of scriptlets library.

#### <a name="scriptlets-api--content-script-api"></a> `ContentScriptApi`

API provided by CoreLibs content script.

This API is used to provide a set of utilities and shared state for scriptlets
running in the context of a web page. Particularly, it includes:

```typescript
export interface ContentScriptApi {
    /**
     * Trusted Types Policy API utilities.
     */
    readonly policy: PolicyApi;

    /**
     * Shared state between different script and scriptlet rules.
     *
     * This object acts as a centralized repository for shared data.
     * - Keys represent the unique identifiers or names of the shared data.
     * - Values can be of any type and should correspond to the specific data shared across script rules.
     *
     * Example:.
     * ```adguard
     * ! Modify in one script rule
     * #%#api.shared.testKey = 'testValue'
     *
     * ! Access in another (logs 'testValue')
     * #%#console.log(api.shared.testKey)
     * ```
     */
    readonly shared: Record<string, unknown>;
}
```

##### <a name="scriptlets-api--content-script-api--policy-api"></a> `PolicyApi`

Trusted Types Policy API utility.

This interface extends the native `TrustedTypePolicy` and `TrustedTypePolicyFactory`
to provide a more user-friendly API for working with Trusted Types. In case if
environment doesn't support Trusted Types API, it provides polyfilled methods
and properties to ensure compatibility.

```typescript
export interface PolicyApi extends TrustedTypePolicy, TrustedTypePolicyFactory {
    /**
     * Is Trusted Types API supported.
     */
    isSupported: boolean;

    /**
     * TrustedType enum attached to PolicyApi.
     *
     * Reason why we attach it to instance because inside
     * of script and scriptlet we can't import and to not
     * pollute global env with custom variables.
     *
     * @example
     * api.policy.TrustedType.HTML // "TrustedHTML"
     */
    TrustedType: typeof TrustedType;

    /**
     * Creates Trusted Type depending on `type`:
     * - `TrustedHTML`
     * - `TrustedScript`
     * - `TrustedScriptURL`
     * - or returns back `input` if none of them applicable.
     *
     * @example
     * divElement.innerHTML = api.policy.create(api.policy.TrustedType.HTML, '<div></div>');
     *
     * @param type Trusted Type.
     * @param input Input from which creates Trusted Type.
     * @returns Created value.
     */
    create(type: TrustedType, input: string): string;

    /**
     * Converts `value` of `attribute` into one of the Trusted Types:
     * - `TrustedHTML`
     * - `TrustedScript`
     * - `TrustedScriptURL`
     * - or returns back `value` if none of them applicable (`null`).
     *
     * @example
     * const trustedScriptURL = api.policy.convertAttributeToTrusted("script", "src", 'SOME_URL');
     * scriptElement.setAttribute("src", trustedScriptURL);
     *
     * @param tagName Name of an HTML tag.
     * @param attribute Attribute.
     * @param value Value of attribute that needs to be converted.
     * @param elementNS Element namespace, if empty defaults to the HTML namespace.
     * @param attrNS Attribute namespace, if empty defaults to null.
     * @returns Converted value.
     */
    convertAttributeToTrusted(
        tagName: string,
        attribute: string,
        value: string,
        elementNS?: string,
        attrNS?: string,
    ): string;

    /**
     * Converts `value` of `property` into one of the Trusted Types:
     * - `TrustedHTML`
     * - `TrustedScript`
     * - `TrustedScriptURL`
     * - or returns back `value` if none of them applicable (`null`).
     *
     * @example
     * divElement.innerHTML = api.policy.convertPropertyToTrusted("div", "innerHTML", "<div></div>");
     *
     * @param tagName Name of an HTML tag.
     * @param property Property.
     * @param value Value or property.
     * @param elementNS Element namespace, if empty defaults to the HTML namespace.
     * @returns Converted value.
     */
    convertPropertyToTrusted(
        tagName: string,
        property: string,
        value: string,
        elementNS?: string,
    ): string;
}
```

- [TrustedTypePolicy](https://developer.mozilla.org/en-US/docs/Web/API/TrustedTypePolicy) interface
- [TrustedTypePolicyFactory](https://developer.mozilla.org/en-US/docs/Web/API/TrustedTypePolicyFactory) interface


### <a name="redirects-api"></a> Redirects API

You are welcome to use redirects as a CJS modules or ESM modules:

```javascript
const { Redirects } = require('@adguard/scriptlets/redirects');
// or
import { Redirects, getRedirectFilename } from '@adguard/scriptlets/redirects';
```


#### <a name="redirects-api--redirects-class"></a> Redirects class

```typescript
import { Redirects } from '@adguard/scriptlets';

/**
 * Converts rawYaml into JS object with sources titles used as keys
 */
const redirects = new Redirects(rawYaml)
```

where `rawYaml` is a string with YAML content located in `dist/redirects.yml`.

#### <a name="redirects-api--getRedirect"></a> `getRedirect()`

```typescript
/**
 * Returns redirect source object by title
 */
const redirect = redirects.getRedirect('noopjs');

/**
 * Redirect is an object with following props:
 * {
 *     title: 1x1-transparent.gif
 *     comment: http://probablyprogramming.com/2009/03/15/the-tiniest-gif-ever
 *     contentType: image/gif;base64
 *     content: R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
 * }
 */
```

#### <a name="redirects-api--isBlocking"></a> `isBlocking()`

```typescript
/**
 * Check if redirect is blocking, e.g. click2load.html
 */
const isBlocking = redirect.isBlocking('click2load.html');
```


#### <a name="redirects-api--getRedirectFilename"></a> `getRedirectFilename()`

```typescript
import { getRedirectFilename } from '@adguard/scriptlets/redirects';
/**
 * For a given name or alias of redirect returns the corresponding filename
 * @param name Name or alias of redirect
 * @returns Redirect's filename with extension
 */
declare function getRedirectFilename(name: string): string;
```

### <a name="validators-api"></a> Validators API

#### <a name="validators-api--isValidScriptletName"></a> `isValidScriptletName()`

```typescript
import { isValidScriptletName } from '@adguard/scriptlets/validators';

/**
 * Checks whether the `name` is valid scriptlet name.
 * Uses cache for better performance.
 *
 * @param name Scriptlet name.
 * @returns True if scriptlet name is a valid one or an empty string,
 * otherwise false.
 */
declare function isValidScriptletName(name: string | null): boolean;
```

#### <a name="validators-api--isValidScriptletRule"></a> `isValidScriptletRule()`

```typescript
/**
 * 1. For ADG scriptlet checks whether the scriptlet syntax and name are valid.
 * 2. For UBO and ABP scriptlet first checks their compatibility with ADG
 * by converting them into ADG syntax, and after that checks the name.
 *
 * ADG or UBO rules are "single-scriptlet", but ABP rule may contain more than one snippet
 * so if at least one of them is not valid — whole `ruleText` rule is not valid too.
 *
 * @param rule Any scriptlet rule — ADG or UBO or ABP.
 *
 * @returns True if scriptlet name is valid in rule.
 */
declare function isValidScriptletRule(rule: string | ScriptletInjectionRule): boolean;
```

<!-- markdownlint-disable-next-line -->
#### <a name="scriptlets-api--is-Abg-Ubo-Abp-ScriptletRule"></a> `isAdgScriptletRule()`, `isUboScriptletRule()`, `isAbpSnippetRule()`

```typescript
/**
 * Checks if the `rule` is AdGuard scriptlet rule
 *
 * @param rule - rule text
 * @returns true if given rule is adg rule
 */
declare function isAdgScriptletRule(rule: string): boolean;

/**
 * Checks if the `rule` is uBO scriptlet rule
 *
 * @param rule rule text
 * @returns true if given rule is ubo rule
 */
declare function isUboScriptletRule(rule: string): boolean;

/**
 * Checks if the `rule` is AdBlock Plus snippet
 *
 * @param rule rule text
 * @returns true if given rule is abp rule
 */
declare function isAbpSnippetRule(rule: string): boolean;
```

#### <a name="redirects-api--isValidAdgRedirectRule"></a> `isValidAdgRedirectRule()`

```typescript
/**
 * Checks if the `rule` is **valid** AdGuard redirect resource rule
 *
 * @param rule - rule text
 * @returns true if given rule is valid adg redirect
 */
declare function isValidAdgRedirectRule(rule: string): boolean
```

#### <a name="redirects-api--isRedirectResourceCompatibleWithAdg"></a> `isRedirectResourceCompatibleWithAdg()`

```typescript
/**
 * Checks if the specified redirect resource is compatible with AdGuard
 *
 * @param redirectName - Redirect resource name to check
 * @returns - true if the redirect resource is compatible with AdGuard
 */
declare function isRedirectResourceCompatibleWithAdg(redirectName: string): boolean;
```

### <a name="converters-api"></a> Converters API

```typescript
import {
    convertUboToAdg,
    convertAbpToAdg,
    convertScriptletToAdg,
    convertAdgToUbo
} from '@adguard/scriptlets/converters';
```

#### <a name="converters-api--convertUboToAdg"></a> `convertUboToAdg()`

```typescript
/**
 * Converts string of UBO scriptlet rule to AdGuard scriptlet rule
 *
 * @param rule UBO scriptlet rule
 * @returns array with one AdGuard scriptlet rule
 *
 * @deprecated
 */
declare function convertUboToAdg(rule: string | ScriptletInjectionRule): string[];
```

> Note that parameters in UBO rule should be separated by comma + space. Otherwise, the rule is not valid.

#### <a name="converters-api--convertAbpToAdg"></a> `convertAbpToAdg()`

```typescript
/**
 * Convert string of ABP snippet rule to AdGuard scriptlet rule
 *
 * @param rule ABP snippet rule
 * @returns array of AdGuard scriptlet rules, one or few items depends on Abp-rule
 */
declare function convertAbpToAdg(rule: string | ScriptletInjectionRule): string[];
```

#### <a name="converters-api--convertScriptletToAdg"></a> `convertScriptletToAdg()`

```typescript
/**
 * Converts any scriptlet rule into AdGuard syntax rule.
 * Comments and non-scriptlet rules are returned without changes.
 *
 * @param rule Rule.
 *
 * @returns Array of AdGuard scriptlet rules: one array item for ADG and UBO or few items for ABP.
 * For the ADG `rule` validates its syntax, and returns an empty array if it is invalid.
 */
declare function convertScriptletToAdg(rule: string | ScriptletInjectionRule): string[];
```

#### <a name="converters-api--convertAdgToUbo"></a> `convertAdgToUbo()`

```typescript
/**
 * Converts AdGuard scriptlet rule to UBO syntax.
 *
 * @param rule AdGuard scriptlet rule
 * @returns UBO scriptlet rule
 * or undefined if `rule` is not valid AdGuard scriptlet rule.
 */
declare function convertAdgToUbo(rule: string | ScriptletInjectionRule): string | undefined;
```

#### <a name="converters-api--convertAdgRedirectToUbo"></a> `convertAdgRedirectToUbo()`

```typescript
/**
 * Converts Adg redirect rule to Ubo one
 * 1. Checks if there is Ubo analog for Adg rule
 * 2. Parses the rule and checks if there are any source type modifiers which are required by Ubo
 *    and if there are no one we add it manually to the end.
 *    Source types are chosen according to redirect name
 *    e.g. ||ad.com^$redirect=<name>,important  ->>  ||ad.com^$redirect=<name>,important,script
 * 3. Replaces Adg redirect name by Ubo analog
 *
 * Note: if adg redirect uses UBO's priority syntax, it will be lost on conversion, e.g:
 * ||example.com$redirect=noopjs:99 => ||example.com$redirect=noop.js
 *
 * @param rule adg rule
 * @returns converted ubo rule
 * @throws on incompatible rule
 */
declare function convertAdgRedirectToUbo(rule: string): string;
```

## <a name="browser-compatibility"> Browser Compatibility

| Browser               | Version |
|-----------------------|:--------|
| Chrome                | ✅ 55    |
| Firefox               | ✅ 52    |
| Edge                  | ✅ 15    |
| Opera                 | ✅ 42    |
| Safari                | ✅ 13    |
| Internet Explorer     | ❌       |

## <a name="used-by"> Projects using Scriptlets

- [CoreLibs](https://github.com/AdguardTeam/CoreLibs) (updates automatically)
- [TSUrlFilter](https://github.com/AdguardTeam/tsurlfilter)
- [FiltersCompiler](https://github.com/AdguardTeam/FiltersCompiler)
  (`tsurlfilter`'s update might be required as well)
- [AdguardBrowserExtension](https://github.com/AdguardTeam/AdguardBrowserExtension)
  (`tsurlfilter` also should be updated)
- [AdguardForSafari](https://github.com/AdguardTeam/AdGuardForSafari) (`adguard-resources` should be updated)
- [AdguardForiOS](https://github.com/AdguardTeam/AdguardForiOS)
  (`tsurlfilter` should be updated in `advanced-adblocker-web-extension`)

[ubo-redirect]: https://github.com/gorhill/uBlock/wiki/Static-filter-syntax#redirect
[kb-basic-rules]: https://adguard.com/kb/general/ad-filtering/create-own-filters/#basic-rules
[kb-redirect-priority]: https://adguard.com/kb/general/ad-filtering/create-own-filters/#redirect-rule-priorities
[yarn-pkg-manager-url]: https://yarnpkg.com/en/docs/install
[npm-pkg-manager-url]: https://www.npmjs.com/get-npm
[pnpm-pkg-manager-url]: https://pnpm.io/installation
