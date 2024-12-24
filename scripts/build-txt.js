import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { writeFile } from './helpers';
import { version } from '../package.json';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PATH = '../dist';
const FILENAME = 'build.txt';

export const buildTxt = async () => {
    const content = `version=${version}`;
    await writeFile(path.resolve(__dirname, PATH, FILENAME), content);
};
