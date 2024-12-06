import { program } from 'commander';

import { buildScriptletsFunc } from './build-funcs';
import {
    buildClick2Load,
    buildRedirectsFiles,
    buildRedirectsForCorelibs,
    buildRedirectsList,
    prebuildRedirects,
} from './build-redirects';
import { buildScriptletsForCorelibs } from './build-corelibs';
import { buildScriptlets, buildScriptletsList } from './build-scriptlets';
import { buildTxt } from './build-txt';
import { buildRedirectsMap } from './build-redirects-map';
import { runTasks } from './helpers';

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
