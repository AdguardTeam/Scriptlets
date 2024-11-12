# eslint-plugin-import-newlines [![npm](https://img.shields.io/npm/v/eslint-plugin-import-newlines)]((https://www.npmjs.com/package/eslint-plugin-import-newlines)) [![npm](https://img.shields.io/npm/dw/eslint-plugin-import-newlines)](https://www.npmjs.com/package/eslint-plugin-import-newlines) [![Build Status](https://travis-ci.com/SeinopSys/eslint-plugin-import-newlines.svg?branch=master)](https://travis-ci.com/SeinopSys/eslint-plugin-import-newlines)

ESLint plugin for enforcing newlines in ES6 import statements past a certain number of items.

There is only one rule in this plugin which will report when there are more than 4 values in a line
by default, and if there are less it will report when the import is not on a single line.

## Installation

You'll first need to install [ESLint](http://eslint.org):

```
$ npm i eslint --save-dev
```

Next, install `eslint-plugin-import-newlines`:

```
$ npm install eslint-plugin-import-newlines --save-dev
```

**Note:** If you installed ESLint globally (using the `-g` flag) then you must also
install `eslint-plugin-import-newlines` globally.

## Usage

Add `import-newlines` to the plugins section of your `.eslintrc` configuration file.

```json
{
  "plugins": [
    "import-newlines"
  ]
}
```

Then add the rule in the rules section.

```json
{
  "rules": {
    "import-newlines/enforce": "error"
  }
}
```

### Options

The first and most readable way is to use an object which allows you to specify any of the available
options, leaving everything that's not specified as the default.

  ```json
  {
  "rules": {
    "max-len": [
      "error",
      100
    ],
    "semi": [
      "error",
      "never"
    ],
    "import-newlines/enforce": [
      "error",
      {
        "items": 2,
        "max-len": 100,
        "semi": false
      }
    ]
  }
}
  ```

Because of its easy expandability this is the only format that will allow you to configure any new
options &ndash; should they be added &ndash; but there is also a shorter syntax that will let you
configure just the first two and keep everything else default.

To specify `items` as **6**:

  ```json
  {
  "rules": {
    "import-newlines/enforce": [
      "error",
      6
    ]
  }
}
  ```

To specify `items` as **4** and `max-len` as **120**:

  ```json
  {
  "rules": {
    "max-len": [
      "error",
      120
    ],
    "import-newlines/enforce": [
      "error",
      4,
      120
    ]
  }
}
  ```

#### `items` [number] (default: `4`)

Specifies the maximum number of items before the plugin requires breaking up the `import` to
multiple lines. If there are exactly this many or fewer items, then the plugin will make sure the
import stays on one line unless it would violate the `max-len` option. More items than this number
will always be split onto multiple lines.

Note that the plugin simply inserts newline characters after each token in the import when
splitting, and the fix output never includes leading tabs or spaces. To have consistent indentation,
be sure to use the built-in `indent` rule.

#### `max-len` [number] (default: `Infinity`)

Specifies the maximum length for source code lines in your project. This allows the plugin to
prevent quick fixes that would cause your code to violate this limit from being applied. The rule
will also automatically split import lines for you should they exceed the limit, which works great
as an automatic fix for the ESLint built-in `max-len` rule (which doesn't have any quick fixes out
of the box at the time of writing) for your imports. It's highly recommended you keep this option's
value in sync with what you use for the aforementioned rule for best results.

#### `semi` [boolean] (default: `true`)

Indicates whether you want to have semicolons at the end of your imports. This is used in the
maximum length calculation for the previous rule, so be sure to set this to false if your code style
does not use semicolons at the end of imports otherwise it can lead to some unexpected automatic
fixes.

Note that this **does not enforce** the use of semicolons, use the built-in ESLint `semi` rule to
control that. Setting this to the right value merely aims to ensure that the plugin will not produce
conflicting quick fixes.

Also, to preserve backwards compatibility with the existing array-based configuration, this is
always set to `false` when not using the new object syntax to configure the rule.

#### `forceSingleLine` [boolean] (default: `true`)

Forces the import to a single line provided there's less than or equal to `items` imported values
and the result would fit within the configured `max-length`. This can be set to `false` if you want
to be able to break imports up to multiple lines without the plugin reporting an error and offering
an autofix.

#### `allowBlankLines` [boolean] (default: `false`)

By default, the rule will report if there are any additional lines between the imported items. This
is checked by comparing the end and start lines of adjacent import specifiers and if the difference
is greater than one, the error will be raised. If you want to allow blank lines between imported
items, set this option to `true`. Note that applying any auto-fixes from this rule will cause your
new lines to be lost.

### Testing

Tests can be run via `npm run test`, make sure these pass after every change. Be sure to add tests
for new features.
