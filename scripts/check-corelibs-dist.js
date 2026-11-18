import { execSync } from 'child_process';
import path from 'node:path';
import fs from 'fs-extra';

import { CORELIBS_REDIRECTS_FILE_NAME, CORELIBS_SCRIPTLETS_FILE_NAME, DIST_DIR_NAME } from './constants';
import { getBuildVersion, verifyBuiltVersions } from './helpers';
import { findUndefinedNames } from './check-built-scriptlets';
import packageJson from '../package.json';

const { error: logError, log } = console;

/**
 * Returns a string output of a `command`.
 *
 * Wrapper for `execSync()` function.
 *
 * @param {string} command The command to run
 *
 * @returns {string} Actual output of the command, or an empty string if the command failed.
 */
const getExecSyncStr = (command) => {
    let result = '';
    try {
        result = execSync(command, { encoding: 'utf8' });
    } catch (error) {
        logError(`Error executing command: '${command}' - ${error}`);
    }
    return result;
};

/**
 * Wrapper for `execSync()` function to run a `command` without output.
 *
 * @param {string} command The command to run.
 */
const execSyncVoid = (command) => {
    try {
        execSync(command, { stdio: 'ignore' });
    } catch (error) {
        logError(`Error executing command: '${command}' - ${error}`);
    }
};

/**
 * Checks whether the `dist/redirects.json` file is updated during the build.
 *
 * @returns {boolean} True if the file is changed, false otherwise.
 */
const isRedirectsFileChanged = () => {
    const gitDiff = getExecSyncStr('git diff --name-only --diff-filter=M');
    const modifiedFiles = gitDiff.toString().split('\n').filter(Boolean);
    return modifiedFiles.includes(`${DIST_DIR_NAME}/${CORELIBS_REDIRECTS_FILE_NAME}`);
};

/**
 * Checks whether the `dist/scriptlets.corelibs.json` file is changed
 * and if there are real changes in it except the version.
 *
 * So if there are no real changes for the scriptlets and {@link isCorelibsRedirectsUpdated} is false,
 * the scriptlets file will be reverted to the previous version.
 *
 * @param {boolean} isCorelibsRedirectsUpdated Flag indicating whether the corelibs redirects file is changed.
 */
const checkScriptletsChanges = (isCorelibsRedirectsUpdated) => {
    // Check the changes of `dist/scriptlets.corelibs.json` file after the build
    const gitDiff = getExecSyncStr(`git diff --unified=0 HEAD ${DIST_DIR_NAME}/${CORELIBS_SCRIPTLETS_FILE_NAME}`);
    const diffLines = gitDiff.toString().split('\n').filter((l) => {
        // filter lines which describe the changes in the file
        return l.startsWith('@@') && l.endsWith('@@');
    });

    if (!isCorelibsRedirectsUpdated
        // and there is only one line in the corelibs scriptlets file diff about the version
        && diffLines.length === 1
        && diffLines[0] === '@@ -2 +2 @@') {
        // do not update the corelibs scriptlets file. AG-24667
        log(`No real changes for ${CORELIBS_SCRIPTLETS_FILE_NAME}, skipping...`);
        execSyncVoid(`git checkout ${DIST_DIR_NAME}/${CORELIBS_SCRIPTLETS_FILE_NAME}`);
    }
};

const REDIRECTS_YML_FILE_NAME = 'redirects.yml';

/**
 * Verifies that the resolved build version (workflow-stamped or changelog-
 * derived) is propagated exactly into the built `dist/redirects.yml` and
 * `dist/scriptlets.corelibs.json`. Delegates the comparison to
 * `verifyBuiltVersions`.
 *
 * @throws {Error} if a version mismatches between the resolved value and the
 * built artifacts
 */
const runVersionGuard = () => {
    const version = getBuildVersion(packageJson.version);

    // The script runs from the repo root (the existing `git diff …` commands
    // rely on this), so cwd-relative paths resolve to dist/.
    const redirectsYmlPath = path.resolve(DIST_DIR_NAME, REDIRECTS_YML_FILE_NAME);
    const corelibsPath = path.resolve(DIST_DIR_NAME, CORELIBS_SCRIPTLETS_FILE_NAME);

    const redirectsYml = fs.readFileSync(redirectsYmlPath, { encoding: 'utf8' });
    const corelibsScriptletsJson = fs.readFileSync(corelibsPath, { encoding: 'utf8' });

    const errors = verifyBuiltVersions({ version, redirectsYml, corelibsScriptletsJson });

    if (errors.length > 0) {
        throw new Error(`Version guard failed:\n  ${errors.join('\n  ')}`);
    }

    log(`Version guard OK: ${version}`);
};

/**
 * Checks that built scriptlets use no undefined names, e.g. a helper which is missing in the injections
 * of a scriptlet, as it is called by another helper, which would throw `ReferenceError` on a page.
 *
 * @throws {Error} if a built scriptlet uses an undefined name
 */
const runUndefinedNamesGuard = async () => {
    const corelibsPath = path.resolve(DIST_DIR_NAME, CORELIBS_SCRIPTLETS_FILE_NAME);
    const { scriptlets } = JSON.parse(fs.readFileSync(corelibsPath, { encoding: 'utf8' }));
    const undefinedNames = await findUndefinedNames(scriptlets);
    const entries = Object.entries(undefinedNames);
    if (entries.length > 0) {
        const details = entries.map(([name, names]) => `${name}: ${names.join(', ')}`).join('\n  ');
        throw new Error(`Built scriptlets use undefined names, e.g. missing injections:\n  ${details}`);
    }

    log(`Undefined names guard OK: ${scriptlets.length} scriptlets`);
};

checkScriptletsChanges(isRedirectsFileChanged());
runVersionGuard();
await runUndefinedNamesGuard();
