import resolve from '@rollup/plugin-node-resolve';
// FIXME check if needed
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
// FIXME remove
// import copy from 'rollup-plugin-copy';
import cleanup from 'rollup-plugin-cleanup';
import generateHtml from 'rollup-plugin-generate-html';
import alias from '@rollup/plugin-alias';
import { dts } from 'rollup-plugin-dts';
// FIXME remove
// import { visualizer } from 'rollup-plugin-visualizer';
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
    // FIXME remove
    // visualizer({
    //     emitFile: true,
    //     filename: 'stats.html',
    // }),
    json(),
    resolve({ extensions: ['.js', '.ts'] }),
    commonjs(),
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

// FIXME remove
// const scriptletsUMDConfig = {
//     input: {
//         'scriptlets.umd': 'src/scriptlets/scriptlets-umd-wrapper.js', // FIXME remove file
//     },
//     output: {
//         dir: 'dist/umd',
//         entryFileNames: '[name].js',
//         // umd is preferred over cjs to avoid variables renaming in tsurlfilter
//         format: 'umd',
//         exports: 'named',
//         strict: false,
//         banner: BANNER,
//         footer: FOOTER,
//     },
//     plugins: [
//         ...commonPlugins,
//         copy({
//             targets: [
//                 { src: 'types/scriptlets.d.ts', dest: 'dist/umd/' },
//             ],
//         }),
//     ],
// };

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

const scriptletsCjsAndEsmConfig = {
    input: [
        path.resolve(__dirname, 'src/index.ts'),
        path.resolve(__dirname, 'src/scriptlets/index.ts'),
        path.resolve(__dirname, 'src/redirects/index.js'),
        path.resolve(__dirname, 'src/validators/index.ts'),
        path.resolve(__dirname, 'src/converters/index.ts'),
    ],
    output: [
        {
            dir: `${BUILD_DIST}/cjs`,
            format: 'cjs',
            exports: 'named',
            sourcemap: false,
            preserveModules: true,
            preserveModulesRoot: 'src',
        },
        {
            dir: `${BUILD_DIST}/esm`,
            entryFileNames: '[name].mjs',
            format: 'esm',
            sourcemap: false,
            preserveModules: true,
            preserveModulesRoot: 'src',
        },
    ],
    external: (id) => {
        return (
            /node_modules/.test(id)
            // this was added because when agtree is linked with yarn link, its id does not contains node_modules
            || id === '@adguard/agtree'
            || id.startsWith('@adguard/agtree/')
        );
    },
    plugins: [
        ...commonPlugins,
        alias({
            entries: [
                { find: 'scriptlets-func', replacement: path.resolve(__dirname, 'tmp/scriptlets-func.js') },
            ],
        }),
    ],
};

const typesConfig = {
    input: {
        index: path.resolve(__dirname, 'src/index.ts'),
        'scriptlets/index': path.resolve(__dirname, 'src/scriptlets/index.ts'),
        'redirects/index': path.resolve(__dirname, 'src/redirects/index.js'),
        'validators/index': path.resolve(__dirname, 'src/validators/index.ts'),
        'converters/index': path.resolve(__dirname, 'src/converters/index.ts'),
    },
    output: {
        dir: `${BUILD_DIST}/types`,
        format: 'es',
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].d.ts',
    },
    plugins: [
        dts(),
        alias({
            entries: [
                { find: 'scriptlets-func', replacement: path.resolve(__dirname, 'tmp/scriptlets-func.d.ts') },
            ],
        }),
    ],
};

const scriptletsCjsAndEsm = [scriptletsCjsAndEsmConfig, typesConfig];

export {
    scriptletsIIFEConfig,
    scriptletsCjsAndEsm,
    // FIXME remove umd
    // scriptletsUMDConfig,
    scriptletsListConfig,
    redirectsListConfig,
    click2LoadConfig,
    redirectsPrebuildConfig,
};
