# AdGuard Scriptlets and Resources
[![Build Status](https://travis-ci.org/AdguardTeam/Scriptlets.svg?branch=master)](https://travis-ci.org/AdguardTeam/Scriptlets)

## Available scriptlets

AdGuard supports a lot of different scriptlets. Please note, that in order to achieve cross-blocker compatibility, we also support syntax of uBO and ABP. 

* **[Scriptlets list](./wiki/about-scriptlets.md#scriptlets)**
* **[Scriptlets compatibility table](./wiki/about-scriptlets.md#scriptlets)**


## Available redirects

AdGuard is able to redirect web requests to a local "resource".

* **[Redirect resources list](./wiki/about-redirects.md#redirect-resources)**
* **[Redirect resources compatibility table](./wiki/compatibility-table.md#redirects)**

* * *

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