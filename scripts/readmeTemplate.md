# AdGuard Scriptlets and Resources
[![Build Status](https://travis-ci.org/AdguardTeam/Scriptlets.svg?branch=master)](https://travis-ci.org/AdguardTeam/Scriptlets)

* [Scriptlets](#scriptlets)
    * [Syntax](#syntax)
    * [Available scriptlets](#available-scriptlets)
{{{scriptletsList}}}
    * [Scriptlets compatibility table](./wiki/compatibility-table.md#scriptlets)
* [Redirect resources](#redirect-resources)
    * [Syntax](#redirect-syntax)
    * [Available redirect resources](#available-resources)
        * [1x1-transparent.gif](#1x1-transparent)
        * [2x2-transparent.png](#2x2-transparent)
        * [3x2-transparent.png](#3x2-transparent)
        * [32x32-transparent.png](#32x32-transparent)
        * [noopframe](#noopframe)
        * [noopcss](#noopcss)
        * [noopjs](#noopcss)
        * [nooptext](#nooptext)
        * [noopvast-2.0](#noopvast-2-0)
        * [noopvast-3.0](#noopvast-3-0)
        * [noopmp3-0.1s](#noopmp3-01s)
        * [noopmp4-1s](#noopmp4-1s)
{{{redirectsList}}}
    * [Redirect resources compatibility table](./wiki/compatibility-table.md#redirects)
* [How to build](#how-to-build)
* [Browser compatibility](#browser-compatibility)

## <a id="scriptlets"></a> Scriptlets

Scriptlet is a JavaScript function that provides extended capabilities for content blocking. These functions can be used in a declarative manner in AdGuard filtering rules.

### <a id="syntax"></a> Syntax

```
rule = [domains]  "#%#//scriptlet(" scriptletName arguments ")"
```

* `scriptletName` (mandatory) is a name of the scriptlet from AdGuard's scriptlets library
* `arguments` (optional) a list of `String` arguments (no other types of arguments are supported)

> **Remarks**
> * The meanining of the arguments depends on the scriptlet.
> * You can use either single or double quotes for the scriptlet name and arguments.
> * Special characters must be escaped properly:
>     * `"prop[\"nested\"]"` - valid
>     * `"prop['nested']"` - also valid
>     * `"prop["nested"]"` - not valid

#### Example

```
example.org#%#//scriptlet("abort-on-property-read", "alert")
```

This rule applies the `abort-on-property-read` scriptlet on all pages of `example.org` and its subdomains, and passes one orgument to it (`alert`).

## <a id="available-scriptlets"></a> Available scriptlets

This is a list of scriptlets supported by AdGuard. Please note, that in order to achieve cross-blocker compatibility, we also support syntax of uBO and ABP. You can check out the [compatibility table](./wiki/compatibility-table.md).

{{{scriptletsBody}}}
## <a id="redirect-resources"></a> Redirect resources

AdGuard is able to redirect web requests to a local "resource".

### <a id="redirect-syntax"></a> Syntax

AdGuard uses the same filtering syntax as [uBlock Origin](https://github.com/gorhill/uBlock/wiki/Static-filter-syntax#redirect). Also, it is compatible with ABP `$rewrite` modifier.

`$redirect` is a modifier for the [basic filtering rules](https://kb.adguard.com/en/general/how-to-create-your-own-ad-filters#basic-rules-syntax) so rules with this modifier support all other basic modifiers like `$domain`, `$third-party`, `$script`, etc.

The value of the `$redirect` modifier must be the name of the resource, that will be used for redirection. See the list of resources [below](#available-resources).

**Examples**
* `||example.org/script.js$script,redirect=noopjs` -- redirects all requests to `script.js` to the resource named `noopjs`.
* `||example.org/test.mp4$media,redirect=noopmp4-1s` -- redirects all requests to `test.mp4` to the resource named `noopmp4-1s`.

> `$redirect` rules priority is higher than the regular basic blocking rules' priority. This means that if there's a basic blocking rule (even with `$important` modifier), `$redirect` rule will prevail over it. If there's a whitelist (`@@`) rule matching the same URL, it will disable redirecting as well (unless the `$redirect` rule is also marked as `$important`).

> uBlock Origin specifies additional resource name `none` that can disable other redirect rules. AdGuard does not support it, use `$badfilter` to disable specific rules.

## <a id="available-resources"></a> Available redirect resources

### <a id="1x1-transparent"></a> ⚡️ 1x1-transparent.gif

**Example**
```
||example.org^$image,redirect=1x1-transparent.gif
```
[Redirect source](./src/redirects/static-redirects.yml)
* * *

### <a id="2x2-transparent"></a> ⚡️ 2x2-transparent.png

**Example**
```
||example.org^$image,redirect=2x2-transparent.png
```
[Redirect source](./src/redirects/static-redirects.yml)
* * *

### <a id="3x2-transparent"></a> ⚡️ 3x2-transparent.png

**Example**
```
||example.org^$image,redirect=3x2-transparent.png
```
[Redirect source](./src/redirects/static-redirects.yml)
* * *

### <a id="32x32-transparent"></a> ⚡️ 32x32-transparent.png

**Example**
```
||example.org^$image,redirect=32x32-transparent.png
```
[Redirect source](./src/redirects/static-redirects.yml)
* * *

### <a id="noopframe"></a> ⚡️ noopframe

**Example**
```
||example.com^$subdocument,redirect=noopframe,domain=example.org
```
[Redirect source](./src/redirects/static-redirects.yml)
* * *

### <a id="noopcss"></a> ⚡️ noopcss

**Example**
```
||example.org^$stylesheet,redirect=noopcss
```
[Redirect source](./src/redirects/static-redirects.yml)
* * *

### <a id="noopjs"></a> ⚡️ noopjs

**Example**
```
||example.org^$script,redirect=noopjs
```
[Redirect source](./src/redirects/static-redirects.yml)
* * *

### <a id="nooptext"></a> ⚡️ nooptext

**Example**
```
||example.org^$xmlhttprequest,redirect=nooptext
```
[Redirect source](./src/redirects/static-redirects.yml)
* * *

### <a id="noopvast-2-0"></a> ⚡️ noopvast-2.0

Redirects request to an empty [VAST](https://en.wikipedia.org/wiki/Video_Ad_Serving_Template) response.

**Example**
```
||example.org^$xmlhttprequest,redirect=noopvast-2.0
```
[Redirect source](./src/redirects/static-redirects.yml)
* * *

### <a id="noopvast-3-0"></a> ⚡️ noopvast-3.0

Redirects request to an empty [VAST](https://en.wikipedia.org/wiki/Video_Ad_Serving_Template) response.

**Example**
```
||example.org^$xmlhttprequest,redirect=noopvast-3.0
```
[Redirect source](./src/redirects/static-redirects.yml)
* * *

### <a id="noopmp3-01s"></a> ⚡️ noopmp3-0.1s

**Example**
```
||example.org^$media,redirect=noopmp3-0.1s
```
[Redirect source](./src/redirects/static-redirects.yml)
* * *

### <a id="noopmp4-1s"></a> ⚡️ noopmp4-1s

**Example**
```
||example.org^$media,redirect=noopmp4-1s
```
[Redirect source](./src/redirects/static-redirects.yml)
* * *

{{{redirectsBody}}}
## <a id="how-to-build"></a> How to build

Install dependencies
```
yarn install
```

Build for Extension
```
yarn build
```

Build for Corelibs
```
yarn corelibs
```

Build dev (rebuild js files on every change)
```
yarn watch
```

Run node testing
```
yarn test
```

Run tests gui
```
yarn gui-test
```


To run browserstack tests create `.env` file or rename `.env-example`.

Fill in <username> and <key> with data from your Browserstack profile.
Run next command
```
yarn browserstack
```

### Build output

#### Scriptlets library

`dist/scriptlets.js`

Creates a global variable `scriptlets`.

```javascript
/**
* Returns scriptlet code
*
* @param {Source} source
* @returns {string}
*/
scriptlets.invoke(source)
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

## <a id="browser-compatibility"> Browser Compatibility
| Chrome | Edge | Firefox | IE | Opera | Safari |
|--|--|--|--|--|--|
| 55 | 15 | 52 | 11 | 42 | 10 |