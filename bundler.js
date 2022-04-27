import { program } from 'commander';

import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import babel from '@rollup/plugin-babel';
import { buildScriptletsFunc } from './scripts/build-funcs';
import resultConfig from './rollup.config';
import { rollupStandard, rollupWatch } from './scripts/rollup-runners';
import { buildRedirectsFiles } from './scripts/build-redirects';

const runRollup = async ({ watch }) => {
    if (watch) {
        rollupWatch(resultConfig);
    } else {
        await rollupStandard(resultConfig);
    }
};

const buildScriptletsList = async () => {
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

const prebuildRedirects = async () => {
    await rollupStandard({
        input: {
            redirects: 'src/redirects/index.js',
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

const tasks = [
    buildScriptletsList,
    buildScriptletsFunc,
    prebuildRedirects,
    // TODO
    // buildRedirectsFiles,
    runRollup,
];

const runTasks = async (tasks, options) => {
    for (const task of tasks) {
        await task(options);
    }
};

program
    .option('--watch', 'Builds in watch mode', false);

program
    .description('Builds scriptlets')
    .action(async () => {
        const options = program.opts();
        await runTasks(tasks, { watch: options.watch });
    });

program.parse(process.argv);
