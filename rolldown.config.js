import { dts } from 'rolldown-plugin-dts';

const BUILD_DIST = 'dist';

const entryPoints = {
    index: 'src/index.ts',
    'scriptlets/index': 'src/scriptlets/index.ts',
    'redirects/index': 'src/redirects/index.js',
    'validators/index': 'src/validators/index.ts',
    'converters/index': 'src/converters/index.ts',
};

const scriptletsListConfig = {
    input: {
        'scriptlets-list': 'src/scriptlets/scriptlets-list.ts',
    },
    output: {
        dir: 'tmp',
        entryFileNames: '[name].js',
        format: 'esm',
    },
};

const redirectsListConfig = {
    input: {
        'redirects-list': 'src/redirects/redirects-list.js',
    },
    output: {
        dir: 'tmp',
        entryFileNames: '[name].js',
        format: 'esm',
    },
};

const redirectsPrebuildConfig = {
    input: {
        redirects: 'src/redirects/index.js',
    },
    output: {
        dir: 'tmp',
        entryFileNames: '[name].js',
        format: 'esm',
    },
};

const click2LoadScriptConfig = {
    input: {
        click2load: 'src/redirects/blocking-redirects/click2load.js',
    },
    output: {
        dir: 'tmp',
        entryFileNames: '[name].js',
        format: 'iife',
        name: 'click2load',
    },
};

/**
 * Shared output options for the dist bundles.
 */
const distOutput = {
    dir: BUILD_DIST,
    format: 'esm',
    entryFileNames: '[name].js',
    chunkFileNames: 'common/[name].js',
    exports: 'named',
};

/**
 * Conservative build for entry points that depend on the pre-built
 * `scriptlets-func` module (`index`, `scriptlets/index`, `redirects/index`).
 *
 * `scriptlets-func` holds already-minified, *live* scriptlet code that
 * mutates passed-in objects — e.g. `jsonSetter` creates intermediate
 * path objects with `o[n] = {}`. Setting `propertyReadSideEffects` or
 * `propertyWriteSideEffects` to `false` here would make the bundler
 * treat such meaningful writes as side-effect-free and
 * dead-code-eliminate them, which corrupted `trusted-json-set` (and
 * other scriptlets reusing the same inlined helper code). Those flags
 * are therefore reserved for `validatorsConfig` below.
 */
const coreConfig = {
    input: {
        index: entryPoints.index,
        'scriptlets/index': entryPoints['scriptlets/index'],
        'redirects/index': entryPoints['redirects/index'],
    },
    output: distOutput,
    treeshake: {
        /**
         * Assume that all modules do not have side effects.
         * Mirrors `"sideEffects": false` in package.json and the
         * old Rollup config.
         */
        moduleSideEffects: false,
    },
    external: /^(js-yaml|@adguard\/agtree)/,
    resolve: {
        alias: {
            'scriptlets-func': 'tmp/scriptlets-func.js',
        },
    },
};

/**
 * Aggressive build for the `validators` and `converters` entry points.
 *
 * These depend on `scriptlets-names-list`, which re-exports the
 * `*Names` arrays from every scriptlet *source* file. Each such file
 * also defines a function body that is unused in this graph, plus dead
 * `.primaryName`/`.injections` property writes (e.g. `Fingerprintjs3Names[0]`)
 * that would otherwise anchor the unused function and bloat the bundle.
 * The flags below let the bundler strip those writes and function
 * bodies, keeping `dist/validators/index.js` around ~30 KB. This is safe
 * here because the stripped code is genuinely unused — only the literal
 * `*Names` arrays are consumed.
 */
const toolsConfig = {
    input: {
        'validators/index': entryPoints['validators/index'],
        'converters/index': entryPoints['converters/index'],
    },
    output: distOutput,
    treeshake: {
        propertyReadSideEffects: false,
        propertyWriteSideEffects: false,
        moduleSideEffects: false,
    },
    external: /^(js-yaml|@adguard\/agtree)/,
};

const typesConfig = {
    input: entryPoints,
    output: {
        dir: `${BUILD_DIST}/types`,
        format: 'esm',
        exports: 'named',
        preserveModules: true,
        preserveModulesRoot: 'src',
    },
    external: /^(js-yaml|@adguard\/agtree)/,
    plugins: [
        dts(),
    ],
    resolve: {
        alias: {
            'scriptlets-func': 'tmp/scriptlets-func.d.ts',
        },
    },
};

export {
    coreConfig,
    toolsConfig,
    scriptletsListConfig,
    redirectsListConfig,
    click2LoadScriptConfig,
    redirectsPrebuildConfig,
    typesConfig,
};
