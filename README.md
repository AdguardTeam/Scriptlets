# AdGuard Scriptlets

Scriptlet is a JavaScript function which provide extended capabilities for filtration.

---

### Syntax

```
domains#%#//scriptlet(name[, arg1[, arg2[, ...]]])
```
**Example**
```
example.org#%#//scriptlet("abort-on-property-read", "alert")
```

**Valid rules**
- scriptlet `name` provided
- single and double qoutes are supported
    - `abc.org#%#//scriptlet('prop')` - valid
    - `abc.org#%#//scriptlet("prop")` - valid
    - `abc.org#%#//scriptlet("prop')` - not valid
- symbols inside parameters escaped properly
    - `"prop[\"nested\"]"` - valid
    - `"prop['nested']"` - also valid
    - `"prop["nested"]"` - not valid
- no characters after closing brace `)`

---

### Available scriptlets

**[abort-on-property-read](#abortOnPropertyRead)**
<br>
Throws a ReferenceError when trying to read property

**Syntax**
```
example.org#%#//scriptlet("abort-on-property-read", <arg>)
```

**Parameters**
- `arg`

Required. Name of property which should be abort on reading. Allowed chain of property defined via dot notation e.g. `navigator.language`

**Example**
```
example.org#%#//scriptlet("abort-on-property-read", "alert")
```

[scriptlet source](./src/scriptlets/abort-on-property-read.js)

---

### Source build

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

Run UI Unit testing
```
yarn test
```

### Output

**Extension**

After build will be generated `dist/scriptlets.js` file.
<br>
This file adds global variable `scriptlets`.

API
```
/**
* Returns scriptlet code
* 
* @param {Source} source
* @returns {string}
*/
scriptlets.invoke(source)
```

**Corelibs**

After build will be generated `dist/scriptlets.corelibs.json`.

File structure
```
{
    "scriptlets": [
        {
            "names": [ <NAME 1>[, <NAME 2>[, <NAME N>]]  ],
            "scriptlet": <SCRIPTLET CODE 1>
        },

        ...

        {
            "names": [ <NAME 1>[, <NAME 2>[, <NAME N>]]  ],
            "scriptlet": <SCRIPTLET CODE N>
        },
    ]
}
```

`<NAME>` - `{string}` Scriptlet name, also may has aliases.
<br>
`<SCRIPTLET CODE>` - `{string}` Scriptlet code.

**Example**
```
{
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