import path from 'path';
import fs from 'fs-extra';

export const writeFile = async (filePath, content) => {
    const dirname = path.dirname(filePath);

    await fs.ensureDir(dirname);
    await fs.writeFile(filePath, content);
};
