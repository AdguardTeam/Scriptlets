# <a id="redirect-resources"></a> AdGuard Redirect resources

AdGuard is able to redirect web requests to a local "resource".


* **[Syntax](#syntax)**
* **[Available redirects](#available-redirects)**
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
* **[Redirects compatibility table](./wiki/compatibility-table.md#scriptlets)**
* * *

### <a id="redirect-syntax"></a> Syntax

AdGuard uses the same filtering syntax as [uBlock Origin](https://github.com/gorhill/uBlock/wiki/Static-filter-syntax#redirect). Also, it is compatible with ABP `$rewrite` modifier.

`$redirect` is a modifier for the [basic filtering rules](https://kb.adguard.com/en/general/how-to-create-your-own-ad-filters#basic-rules-syntax) so rules with this modifier support all other basic modifiers like `$domain`, `$third-party`, `$script`, etc.

The value of the `$redirect` modifier must be the name of the resource, that will be used for redirection. See the list of resources [below](#available-resources).

**Examples**
* `||example.org/script.js$script,redirect=noopjs` -- redirects all requests to `script.js` to the resource named `noopjs`.
* `||example.org/test.mp4$media,redirect=noopmp4-1s` -- redirects all requests to `test.mp4` to the resource named `noopmp4-1s`.

> `$redirect` rules priority is higher than the regular basic blocking rules' priority. This means that if there's a basic blocking rule (even with `$important` modifier), `$redirect` rule will prevail over it. If there's a whitelist (`@@`) rule matching the same URL, it will disable redirecting as well (unless the `$redirect` rule is also marked as `$important`).

> uBlock Origin specifies additional resource name `none` that can disable other redirect rules. AdGuard does not support it, use `$badfilter` to disable specific rules.

## <a id="available-redirects"></a> Available redirect resources

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