import path from 'path';
import { writeFile } from './helpers';
import { version } from '../package.json';

const PATH = '../dist';
const FILENAME = 'build.txt';

export const buildTxt = async () => {
    const content = `version=${version}`;
    await writeFile(path.resolve(__dirname, PATH, FILENAME), content);
};
