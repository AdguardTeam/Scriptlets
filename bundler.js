import { program } from 'commander';

import { buildScriptletsFunc } from './scripts/build-funcs';
import {
    buildClick2Load,
    buildRedirectsFiles,
    buildRedirectsForCorelibs,
    prebuildRedirects,
} from './scripts/build-redirects';
import { buildScriptletsForCorelibs } from './scripts/build-corelibs';
import { buildScriptlets, buildScriptletsList } from './scripts/build-scriptlets';
import { buildTxt } from './scripts/build-txt';

const tasks = [
    buildScriptletsList,
    buildScriptletsFunc,
    prebuildRedirects,
    buildClick2Load,
    buildRedirectsFiles,
    buildRedirectsForCorelibs,
    buildScriptlets,
    buildScriptletsForCorelibs,
    buildTxt,
];

const runTasks = async (tasks, options) => {
    for (const task of tasks) {
        await task(options);
    }
};

program
    .description('Builds scriptlets')
    .action(async () => {
        await runTasks(tasks);
    });

program.parse(process.argv);
