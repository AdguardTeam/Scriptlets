import resolve from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';
import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';
import cleanup from 'rollup-plugin-cleanup';
import generateHtml from 'rollup-plugin-generate-html';
import path from 'path';
import project from './package.json';

const BUILD_DIST = 'dist';
const DIST_REDIRECT_FILES = 'dist/redirect-files';
const BANNER = `
/**
 * AdGuard Scriptlets
 * Version ${project.version}
 */
`;
const FOOTER = `
/**
 * -------------------------------------------
 * |                                         |
 * |  If you want to add your own scriptlet  |
 * |  please put your code below             |
 * |                                         |
 * -------------------------------------------
 */
`;

const commonPlugins = [
    json(),
    resolve({ extensions: ['.js', '.ts'] }),
    commonjs({
        include: path.resolve(__dirname, './node_modules/**'),
    }),
    babel({
        extensions: ['.js', '.ts'],
        babelHelpers: 'runtime',
    }),
];

const scriptletsIIFEConfig = {
    input: {
        scriptlets: 'src/scriptlets/scriptlets-wrapper.js',
    },
    output: {
        dir: BUILD_DIST,
        entryFileNames: '[name].js',
        format: 'iife',
        strict: false,
        banner: BANNER,
        footer: FOOTER,
    },
    plugins: [
        ...commonPlugins,
    ],
};

const scriptletsUMDConfig = {
    input: {
        'scriptlets.umd': 'src/scriptlets/scriptlets-umd-wrapper.js',
    },
    output: {
        dir: 'dist/umd',
        entryFileNames: '[name].js',
        // umd is preferred over cjs to avoid variables renaming in tsurlfilter
        format: 'umd',
        exports: 'named',
        strict: false,
        banner: BANNER,
        footer: FOOTER,
    },
    plugins: [
        ...commonPlugins,
        copy({
            targets: [
                { src: 'types/scriptlets.d.ts', dest: 'dist/umd/' },
            ],
        }),
    ],
};

const scriptletsListConfig = {
    input: {
        'scriptlets-list': 'src/scriptlets/scriptlets-list.js',
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

export {
    scriptletsIIFEConfig,
    scriptletsUMDConfig,
    scriptletsListConfig,
    redirectsListConfig,
    click2LoadConfig,
    redirectsPrebuildConfig,
};
