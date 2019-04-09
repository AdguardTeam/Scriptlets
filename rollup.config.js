import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';
import project from './package.json';

const banner = `
/**
 * AdGuard Scriptlets
 * Version ${project.version}
 */
`;

const footer = `
/**
 * -------------------------------------------
 * |                                         |
 * |  If you want to add your own scriptlet  |
 * |  please put your code below             |
 * |                                         |
 * -------------------------------------------
 */
`;

const bundleBuild = {
    input: 'src/index.js',
    output: {
        dir: 'dist',
        file: 'scriptlets.js',
        format: 'iife',
        strict: false,
        sourcemap: true,
        banner,
        footer,
    },
    plugins: [
        resolve(),
        babel({
            exclude: 'node_modules/**',
            runtimeHelpers: true,
        }),
    ],
};

const testBuild = {
    input: 'tests/index.test.js',
    output: {
        dir: 'tests/dist',
        file: 'tests.js',
        format: 'iife',
        strict: false,
        sourcemap: true,
    },
    plugins: [
        resolve(),
        commonjs({
            include: 'node_modules/**',
        }),
        babel({
            exclude: 'node_modules/**',
            runtimeHelpers: true,
        }),
    ],
};

const isTest = process.env.UI_TEST === 'true';
const resultBuilds = isTest
    ? [bundleBuild, testBuild]
    : bundleBuild;

module.exports = resultBuilds;
