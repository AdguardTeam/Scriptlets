# AdGuard Scriptlets

Scriptlet is a JavaScript function which provide extended capabilities for filtration.

---

### Syntax

```
domains#%#//sciptlet(name[, arg1[, arg2[, ...]]])
```
**Example**
```
example.org#%#//sciptlet("abort-on-property-read", "alert")
```

**Valid rules**
- scriptlet `name` provided
- single and double qoutes are supported
    - `abc.org#%#//sciptlet('prop')` - valid
    - `abc.org#%#//sciptlet("prop")` - valid
    - `abc.org#%#//sciptlet("prop')` - not valid
- symbols inside parameters escaped properly
    - `"prop[\"nested\"]"` - valid
    - `"prop['nested']"` - also valid
    - `"prop["nested"]"` - not valid
- no characters after closing brace `)`

---

### Available scriptlets

**[abort-on-property-read](#abortOnPropertyRead)**
Throws a ReferenceError when trying to read 

**Syntax**
```
example.org#%#//sciptlet("abort-on-property-read", <arg>)
```

**Parameters**
- `arg`

Required. Name of property which should be abort on reading. Allowed chain of property defined via dot notation e.g. `navigator.language`

**Example**
```
example.org#%#//sciptlet("abort-on-property-read", "alert")
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
