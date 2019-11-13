# <a id="scriptlets"></a> AdGuard Scriptlets

Scriptlet is a JavaScript function that provides extended capabilities for content blocking. These functions can be used in a declarative manner in AdGuard filtering rules.


* **[Syntax](#syntax)**
* **[Available scriptlets](#available-scriptlets)**
{{{scriptletsList}}}
* **[Scriptlets compatibility table](./wiki/compatibility-table.md#scriptlets)**
* * *

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