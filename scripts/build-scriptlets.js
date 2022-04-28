import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';
import { rollupStandard } from './rollup-runners';
import project from '../package.json';

const BUILD_DIST = 'dist';
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

const buildScriptletsIIFE = async () => {
    await rollupStandard({
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
            resolve(),
            commonjs({
                include: 'node_modules/**',
            }),
        ],
    });
};

const buildScriptletsUMD = async () => {
    await rollupStandard({
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
            resolve(),
            commonjs({
                include: 'node_modules/**',
            }),
            copy({
                targets: [
                    { src: 'types/scriptlets.d.ts', dest: 'dist/umd/' },
                ],
            }),
        ],
    });
};

export const buildScriptlets = async () => {
    // FIXME fix eslint config
    // eslint-disable-next-line compat/compat
    await Promise.all([
        buildScriptletsUMD(),
        buildScriptletsIIFE()]);
};

export const buildScriptletsList = async () => {
    await rollupStandard({
        input: {
            // FIXME move to constants
            'scriptlets-list': 'src/scriptlets/scriptlets-list.js',
        },
        output: {
            dir: 'tmp',
            entryFileNames: '[name].js',
            format: 'es',
        },
        plugins: [
            resolve(),
            commonjs({
                include: 'node_modules/**',
            }),
        ],
    });
};
