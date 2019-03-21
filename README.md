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

<br>

**[abort-current-inline-script](#abortCurrentInlineScript)**
<br>
Throws a ReferenceError when trying to access property of inline script

**Syntax**
```
example.org#%#//scriptlet("abort-current-inline-script", <arg1>[, arg2])
```

**Parameters**
- `arg1`
Required. Name of property access to which will abort inline script. Allowed chain of properties defined via dot notation e.g. `navigator.language`

- `arg2`
Optional. String or RegExp for matching in inline script text.

**Example**
```
// Simple example
example.org#%#//scriptlet("abort-current-inline-script", "alert")

// all scripts accessing alert property in global scope will be aborted

// Example with search
example.org#%#//scriptlet("abort-current-inline-script", "alert", "Hello, world")

// the following script will be aborted
alert("Hello, world");

// Example with regexp search
example.org#%#//scriptlet("abort-current-inline-script", "alert", "/Hello.+world/")

// Following scripts will be aborted
"alert("Hello, big world");"
"alert("Hello, little world");"
// This one won't
"alert("Hi, little world");"
```

[scriptlet source](./src/scriptlets/abort-current-inline-script.js)

<br>

**[prevent-setTimeout](#preventSetTimeout)**
<br>
Prevent calls to setTimeout for specified matching in passed callback and delay by setting callback to empty function

**Syntax**
```
example.org#%#//scriptlet("prevent-setTimeout"[, arg1[, arg2]])
```

**Parameters**
- `arg1`

Optional. String or RegExp for matching in stringified callback function.
RegExp must start and end with `/` symbol, flags are not supported.

- `arg2`

Optional. Number to be matched for delay.

**Example**
```
example.org#%#//scriptlet("prevent-setTimeout", "value", 300)

// the following setTimeout will be prevented
setTimeout(function () {
    window.test = "value";
}, 300);


// RegExp example
example.org#%#//scriptlet("prevent-setTimeout", "/\.test/", 100)

// the following setTimeout will be prevented
setTimeout(function () {
    window.test = "value";
}, 100);

```

[scriptlet source](./src/scriptlets/prevent-setTimeout.js)

<br>

## set-constant

Creates `"constant"` property and assigns it a one of the values from the predefined list. Actually property is not `"constant"`. In current implementation it could be rewritten by the value with another type.

**Syntax**
```
example.org#%#//scriptlet("set-constant", <arg1>, <arg2>)
```

**Parameters**
- `arg1`

Required. Name of the property to which will be saved provided value. You can use chain of properties defined via dot notation e.g. `chained.property`

- `arg2`

Required. Possible values:
- positive decimal integer `<= 32767`
- one value from the set of predefined constants:
    - `undefined`
    - `false`
    - `true`
    - `null`
    - `noopFunc` - function with empty body
    - `trueFunc` - function returning true
    - `falseFunc` - function returning false
    - `''` - empty string

**Example**
```
example.org#%#//scriptlet("set-constant", "firstConst", "false")
window.firstConst === false // this comparision will return true

example.org#%#//scriptlet("set-constant", "secondConst", "trueFunc")
window.secondConst() === true // call to the secondConst will return true

```

[scriptlet source](./src/scriptlets/set-constant.js)

<br>

**[prevent-setInterval](#preventSetInterval)**
<br>
Prevent calls to setInterval for specified matching in passed callback and delay by setting callback to empty function

**Syntax**
```
example.org#%#//scriptlet("prevent-setInterval"[, arg1[, arg2]])
```

**Parameters**
- `arg1`

Optional. String or RegExp for matching in stringified callback function.<br>
RegExp must start and end with `/` symbol, flags are not supported.

- `arg2`

Optional. Number to be matched for interval.

**Example**
```
example.org#%#//scriptlet("prevent-setInterval", "value", 300)

// the following setInterval will be prevented
setInterval(function () {
    window.test = "value";
}, 300);


// RegExp example
example.org#%#//scriptlet("prevent-setInterval", "/\.test/", 100)

// the following setInterval will be prevented
setInterval(function () {
    window.test = "value";
}, 100);

```

[scriptlet source](./src/scriptlets/prevent-setInterval.js)

<br>

**[prevent-window-open](#preventWindowOpen)**
<br>
Prevent calls `window.open` when URL match or not match with passed to scriptlets param.

**Syntax**
```
example.org#%#//scriptlet("prevent-window-open"[, arg1[, arg2]])
```

**Parameters**
- `arg1`

Optional. Set to `Match` or `Not Match` with passed string or RegExp in `arg2`.<br>
Any positive number set it to `Match`, 0 or any string value set it to `Not Match`.<br>
Default: `Match`.

- `arg2`

Optional. String or RegExp for matching with URL.<br>
RegExp must start and end with `/` symbol, flags are not supported.

**Example**

In this case all `window.open` calls will be prevented
```
example.org#%#//scriptlet("prevent-window-open")
```

Simple example
```
example.org#%#//scriptlet("prevent-window-open", , 'example')

window.open('http://example.org'); // prevented
```

RegExp and `Match` flag example
```
example.org#%#//scriptlet("prevent-window-open", 1, "/example\./")

window.open('http://example.org'); // prevented
```

String and `Not Match` flag example
```
example.org#%#//scriptlet("prevent-window-open", 0, "example")

window.open('http://test.org'); // prevented

window.open('http://example.org'); // executed
```

[scriptlet source](./src/scriptlets/prevent-window-open.js)

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
