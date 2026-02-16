import { execSync } from 'child_process';

import { CORELIBS_REDIRECTS_FILE_NAME, CORELIBS_SCRIPTLETS_FILE_NAME, DIST_DIR_NAME } from './constants';

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

checkScriptletsChanges(isRedirectsFileChanged());
