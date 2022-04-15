/**
 * Builds scriptlets module returning functions with dependencies placed inside scriptlets
 */
import fs from 'fs-extra';
import path from 'path';
import scriptlets from '.';

// e.g.
// // before
// const dependencyFunc = () => {};
//
// export const scriptletFunc = () => {
//     dependencyFunc();
// };
//
// // after
// export const func = () => {
//     const dependencyFunc = () => {};
//     dependencyFunc();
// };

const writeFile = async (filePath, content) => {
    const dirname = path.dirname(filePath);

    await fs.ensureDir(dirname);
    await fs.writeFile(filePath, content);
};
(async () => {
    const scriptlet = scriptlets.getScriptletFunctionString();
    await writeFile('dist/func/scriptlets.js', scriptlet);
})();
