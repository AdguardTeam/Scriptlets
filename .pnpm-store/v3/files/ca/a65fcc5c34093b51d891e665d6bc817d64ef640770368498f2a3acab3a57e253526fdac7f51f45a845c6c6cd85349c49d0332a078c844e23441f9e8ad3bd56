# posthtml-insert-at <img align="right" width="220" height="200" title="PostHTML logo" src="http://posthtml.github.io/posthtml/logo.svg">

[![NPM][npm]][npm-url]
[![Build][build]][build-badge]
[![Coverage][codecov-shield]][codecov]

`posthtml-insert-at` is a [PostHTML](https://github.com/posthtml/posthtml) plugin to append or prepend HTML to a selector.

## [Examples](examples/)

**Before:**

```html
<html>
  <body>
    <main></main>
  </body>
</html>
```

**After:**

```html
<html>
  <body>
    <header></header>
    <main></main>
    <footer></footer>
  </body>
</html>
```

## Install

```bash
yarn add -D posthtml-insert-at
# OR
npm i posthtml-insert-at
```

## Usage

```js
const fs = require('fs');
const posthtml = require('posthtml');
const { insertAt } = require('posthtml-insert-at');

const html = fs.readFileSync('./index.html');

posthtml()
  .use(
    insertAt({
      /**
       * Specify the selector to append/prepend content to.
       * Selectors include tag name (e.g. `main`), class (e.g. `.main`) or id (e.g. `#main`).
       */
      selector: 'main',

      /**
       * Prepend HTML markup at the selector.
       */
      prepend: `
        <header>
          <a href="/">Home</a>
        </header>
      `,

      /**
       * Append HTML markup at the selector.
       */
      append: `
        <footer>
          &copy; ${new Date().getFullYear()}
        </footer>
      `,

      /**
       * Specify whether to append/prepend content inside or outside (i.e. adjacent to) of the selector.
       *
       * The default behavior is `inside`.
       */
      behavior: 'outside'
    })
  )
  .process(html)
  .then(result => fs.writeFileSync('./after.html', result.html));
```

## Options

| Name       | Kind                                                         | Description                                                         |
| ---------- | ------------------------------------------------------------ | ------------------------------------------------------------------- |
| `selector` | **required** `string`                                        | Selector to insert markup at (e.g. `.classname`, `#id` or `tag`)    |
| `prepend`  | optional `string`                                            | Markup to prepend to the selector                                   |
| `append`   | optional `string`                                            | Markup to append to the selector                                    |
| `behavior` | optional (`"inside"` or `"outside"`) - default is `"inside"` | Whether to append/prepend content inside or outside of the selector |

The plugin accepts an object or an an array of objects.

```js
const option = {
  selector: 'body',
  prepend: '<header></header>',
  append: '<footer></footer>',
  behavior: 'inside'
};

insertAt(option);
// OR
insertAt([option /*, ...more options */]);
```

## Limitations

Currently, this plugin does not supported nested selectors.

## Contributing

See the [PostHTML Guidelines](https://github.com/posthtml/posthtml/tree/master/docs).

## [Changelog](CHANGELOG.md)

## License

[MIT](LICENSE)

[npm]: https://img.shields.io/npm/v/posthtml-insert-at.svg?color=blue
[npm-url]: https://npmjs.com/package/posthtml-insert-at
[build]: https://travis-ci.org/posthtml/posthtml-insert-at.svg?branch=master
[build-badge]: https://travis-ci.com/posthtml/posthtml-insert-at
[codecov]: https://codecov.io/gh/posthtml/posthtml-insert-at
[codecov-shield]: https://img.shields.io/codecov/c/github/posthtml/posthtml-insert-at.svg
