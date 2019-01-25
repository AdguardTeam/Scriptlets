import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import project from './package.json';

const banner = `
/**
 * AdGuard Scriptlets
 * Version ${project.version}
 */
`

const footer = `
/**
 * -------------------------------------------
 * |                                         |
 * |  If you want to add your own scriptlet  |
 * |  please put your code below             |
 * |                                         |
 * -------------------------------------------
 */
`

module.exports = {
    input: 'src/index.js',
    output: {
        dir: 'dist',
        file: 'scriptlets.js',
        format: 'iife',
        strict: false,
        banner,
        footer
    },
    plugins: [
        resolve(),
        babel({
            exclude: 'node_modules/**'
        })
    ]
};