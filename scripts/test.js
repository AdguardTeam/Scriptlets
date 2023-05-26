import { program } from 'commander';
import { open } from 'openurl';

import { buildScriptlets, buildScriptletsList } from './build-scriptlets';
import { buildScriptletsFunc } from './build-funcs';
import { buildRedirectsMap } from './build-redirects-map';
import {
    buildRedirectsFiles,
    buildRedirectsList,
    prebuildRedirects,
} from './build-redirects';
import { buildTests } from './build-tests';
import { generateHtmlTestFilename, runTasks } from './helpers';

import { runQunitTests } from '../tests';
import {
    server,
    port,
    start,
} from '../tests/server';

const SCRIPTLETS_TYPE = 'scriptlets';
const REDIRECTS_TYPE = 'redirects';

const buildScriptletsAndRedirectsLists = async () => {
    await Promise.all([buildRedirectsList(), buildScriptletsList()]);
};

/**
 * Runs specific scriptlet or redirect test in gui mode.
 *
 * @param {string} type 'scriptlet' | 'redirect'.
 * @param {string} name name of scriptlet or redirect.
 */
const runGuiTest = async (type, name) => {
    const filename = generateHtmlTestFilename(type, name);
    const testServer = server.init();
    await start(testServer, port);
    await open(`http://localhost:${port}/${filename}`);
};

const allBuildTestTasks = [
    buildScriptletsAndRedirectsLists,
    buildScriptletsFunc,
    buildRedirectsMap,
    prebuildRedirects,
    buildRedirectsFiles,
    buildScriptlets,
];

const scriptletsBuildTasks = [
    buildScriptletsList,
    buildScriptletsFunc,
    buildScriptlets,
];

const redirectsBuildTasks = [
    buildRedirectsList,
    buildRedirectsMap,
    prebuildRedirects,
    buildRedirectsFiles,
];

const buildTasksMap = {
    [SCRIPTLETS_TYPE]: scriptletsBuildTasks,
    [REDIRECTS_TYPE]: redirectsBuildTasks,
};

/**
 * Runs specific scriptlets or redirects tests.
 *
 * @param {string} type 'scriptlets' | 'redirects'.
 * @param {Object} [options] commander options object where:
 * - `name` — string[], list of scriptlets or redirects names;
 * - `gui` — boolean, flag for run the test in gui mode, requires `options.name` to be set.
 */
const runSpecificTests = async (type, options) => {
    await runTasks(buildTasksMap[type]);

    const limitData = { type };
    const { name, gui } = options;
    if (name) {
        limitData.name = name;
    }
    await buildTests(limitData);

    // gui testing is available only for specific scriptlet or redirect
    if (gui && name) {
        await runGuiTest(type, name);
    } else {
        await runQunitTests();
    }
};

program
    .description('By default run all tests')
    .action(async () => {
        await runTasks(allBuildTestTasks);
        await buildTests();
        await runQunitTests();
    });

program
    .description('Just build tests files, no run')
    .option('--build', 'only build')
    .action(async () => {
        await buildTests();
    });

program
    .description('Test only scriptlets')
    .command('scriptlets')
    .option('--name <name>', 'for specific scriptlet testing')
    .option('--gui', 'for gui testing, requires --name')
    .action(async (options) => {
        await runSpecificTests(SCRIPTLETS_TYPE, options);
    });

program
    .description('Test only redirects')
    .command('redirects')
    .option('--name <name>', 'for specific redirect testing')
    .option('--gui', 'for gui testing, requires --name')
    .action(async (options) => {
        await runSpecificTests(REDIRECTS_TYPE, options);
    });

program
    .description('Test only api methods')
    .command('api')
    .action(async () => {
        await buildTests({ type: 'api' });
        await runQunitTests();
    });

program
    .description('Test only helpers')
    .command('helpers')
    .action(async () => {
        await buildTests({ type: 'helpers' });
        await runQunitTests();
    });

program.parse(process.argv);
