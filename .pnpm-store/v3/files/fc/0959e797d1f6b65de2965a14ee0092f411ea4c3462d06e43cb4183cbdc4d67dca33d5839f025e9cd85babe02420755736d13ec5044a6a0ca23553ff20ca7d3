# rollup-plugin-generate-html

[![Build Status](https://travis-ci.org/vladshcherbin/rollup-plugin-generate-html.svg?branch=master)](https://travis-ci.org/vladshcherbin/rollup-plugin-generate-html)
[![Codecov](https://codecov.io/gh/vladshcherbin/rollup-plugin-generate-html/branch/master/graph/badge.svg)](https://codecov.io/gh/vladshcherbin/rollup-plugin-generate-html)

Generate html file for your Rollup bundle.

## Installation

```bash
# yarn
yarn add rollup-plugin-generate-html -D

# npm
npm install rollup-plugin-generate-html -D
```

## Usage

```js
// rollup.config.js
import generateHtml from 'rollup-plugin-generate-html'

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/app.js',
    format: 'iife'
  },
  plugins: [
    generateHtml({
      filename: 'dist/public/index.html'
    })
  ]
}
```

### Configuration

There are some useful options:

#### filename

Type: `string`

Path for generated html file.

```js
generateHtml({
  filename: 'dist/public/index.html'
})
```

#### template

Type: `string` | Default: `included template string`

Path for template to use.

```js
generateHtml({
  filename: 'dist/public/index.html',
  template: 'src/assets/template.html'
})
```

#### selector

Type: `string` | Default: `body`

Selector where to place scripts.

```js
generateHtml({
  filename: 'dist/public/index.html',
  selector: 'head'
})
```

#### inline

Type: `boolean` | Default: `false`

Inline scripts in template.

```js
generateHtml({
  filename: 'dist/public/index.html',
  inline: true
})
```

#### formatInline

Type: `boolean` | Default: `false`

Beautify inline scripts.

```js
generateHtml({
  filename: 'dist/public/index.html',
  inline: true,
  formatInline: true
})
```

## License

MIT
