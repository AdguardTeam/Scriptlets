import resolve from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';
import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import cleanup from 'rollup-plugin-cleanup';
import generateHtml from 'rollup-plugin-generate-html';
import alias from '@rollup/plugin-alias';
import { dts } from 'rollup-plugin-dts';
import terser from '@rollup/plugin-terser';

const BUILD_DIST = 'dist';
const DIST_REDIRECT_FILES = 'dist/redirect-files';

const commonPlugins = [
    json(),
    resolve({ extensions: ['.js', '.ts'] }),
    commonjs(),
    babel({
        extensions: ['.js', '.ts'],
        babelHelpers: 'runtime',
        plugins: ['@babel/plugin-transform-runtime'],
    }),
];

const scriptletsListConfig = {
    input: {
        'scriptlets-list': 'src/scriptlets/scriptlets-list.ts',
    },
    output: {
        dir: 'tmp',
        entryFileNames: '[name].js',
        format: 'es',
    },
    plugins: [
        ...commonPlugins,
    ],
};

const redirectsListConfig = {
    input: {
        'redirects-list': 'src/redirects/redirects-list.js',
    },
    output: {
        dir: 'tmp',
        entryFileNames: '[name].js',
        format: 'es',
    },
    plugins: [
        ...commonPlugins,
    ],
};

const redirectsPrebuildConfig = {
    input: {
        redirects: 'src/redirects/index.js',
    },
    output: {
        dir: 'tmp',
        entryFileNames: '[name].js',
        format: 'es',
    },
    plugins: [
        ...commonPlugins,
    ],
};

const click2LoadConfig = {
    script: {
        input: {
            click2load: 'src/redirects/blocking-redirects/click2load.js',
        },
        output: {
            dir: 'tmp',
            entryFileNames: '[name].js',
            name: 'click2load',
            format: 'iife',
        },
        plugins: [
            ...commonPlugins,
            cleanup(),
        ],
    },
    html: {
        input: 'src/redirects/blocking-redirects/click2load.js',
        output: {
            dir: DIST_REDIRECT_FILES,
            name: 'click2load',
            format: 'iife',
        },
        plugins: [
            ...commonPlugins,
            cleanup(),
            generateHtml({
                filename: `${DIST_REDIRECT_FILES}/click2load.html`,
                template: 'src/redirects/blocking-redirects/click2load.html',
                selector: 'body',
                inline: true,
            }),
        ],
    },
};

const entryPoints = {
    index: 'src/index.ts',
    'scriptlets/index': 'src/scriptlets/index.ts',
    'redirects/index': 'src/redirects/index.js',
    'validators/index': 'src/validators/index.ts',
    'converters/index': 'src/converters/index.ts',
};

const scriptletsConfig = {
    input: entryPoints,
    output: [
        {
            dir: BUILD_DIST,
            format: 'esm',
            entryFileNames: '[name].js',
            chunkFileNames: 'common/[name].js',
            exports: 'named',
            preserveModulesRoot: 'src',
        },
    ],
    treeshake: {
        /**
         * To avoid leftovers in the code when you access a property without side effects,
         * like below:
         * ```js
         * Fingerprintjs3Names[0];
         * ```
         */
        propertyReadSideEffects: false,

        /**
         * Assume that all modules do not have side effects
         */
        moduleSideEffects: false,
    },
    external: (id) => {
        return (
            // Added because when agtree is linked using 'yarn link', its ID does not contain 'node_modules'
            id.startsWith('js-yaml')
            || id.startsWith('@adguard/agtree')
        );
    },
    plugins: [
        ...commonPlugins,
        terser(
            {
                compress: false,
                mangle: false,
                format: {
                    comments: false,
                    beautify: true,
                    indent_level: 2,
                },
            },
        ),
        alias({
            entries: [
                {
                    find: 'scriptlets-func',
                    replacement: 'tmp/scriptlets-func.js',
                },
            ],
        }),
    ],
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
    plugins: [
        dts(),
        alias({
            entries: [
                {
                    find: 'scriptlets-func',
                    replacement: 'tmp/scriptlets-func.d.ts',
                },
            ],
        }),
    ],
};

const scriptlets = [scriptletsConfig, typesConfig];

export {
    scriptlets,
    scriptletsListConfig,
    redirectsListConfig,
    click2LoadConfig,
    redirectsPrebuildConfig,
};
