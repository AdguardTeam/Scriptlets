import { program } from 'commander';

import { buildScriptletsFunc } from './scripts/build-funcs';
import {
    buildClick2Load,
    buildRedirectsFiles,
    buildRedirectsForCorelibs,
    buildRedirectsList,
    prebuildRedirects,
} from './scripts/build-redirects';
import { buildScriptletsForCorelibs } from './scripts/build-corelibs';
import { buildScriptlets, buildScriptletsList } from './scripts/build-scriptlets';
import { buildTxt } from './scripts/build-txt';
import { buildRedirectsMap } from './scripts/build-redirects-map';

const buildScriptletsAndRedirectsLists = async () => {
    await Promise.all([buildRedirectsList(), buildScriptletsList()]);
};

const tasks = [
    buildScriptletsAndRedirectsLists,
    buildScriptletsFunc,
    buildClick2Load,
    buildRedirectsMap,
    prebuildRedirects,
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
