import { program } from 'commander';

import { buildScriptletsFunc } from './build-funcs.js';
import {
    buildClick2Load,
    buildRedirectsFiles,
    buildRedirectsForCorelibs,
    buildRedirectsList,
    prebuildRedirects,
} from './build-redirects.js';
import { buildScriptletsForCorelibs } from './build-corelibs.js';
import { buildScriptlets, buildScriptletsList } from './build-scriptlets.js';
import { buildTxt } from './build-txt.js';
import { buildRedirectsMap } from './build-redirects-map.js';
import { runTasks } from './helpers.js';

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

program
    .description('Builds scriptlets and redirects')
    .action(async () => {
        await runTasks(tasks);
    });

program.parse(process.argv);
