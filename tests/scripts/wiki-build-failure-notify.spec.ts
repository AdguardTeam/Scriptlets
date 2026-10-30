import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vitest';

import {
    findMarkerComments,
    readWikiBuildLogTail,
    resolveReleasePr,
} from '../../scripts/wiki-build-failure-notify.cjs';

const MARKER = '<!-- ext-scriptlets:wiki-build-failure -->';
const BOT_LOGIN = 'github-actions[bot]';
const LOG_FILE_NAME = 'wiki-build.log';
const MAX_EXCERPT_LENGTH = 60000;
const MAX_EXCERPT_LINES = 80;
const TRUNCATED_MARKER = '…(truncated)\n';

const context = {
    repo: {
        owner: 'AdguardSoft',
        repo: 'ext-scriptlets',
    },
};

const tempDirs: string[] = [];

const makeRunnerTemp = (): string => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-build-notify-'));
    tempDirs.push(dir);
    return dir;
};

const writeLog = (runnerTemp: string, content: string): void => {
    fs.writeFileSync(path.join(runnerTemp, LOG_FILE_NAME), content);
};

const makeComment = (body: string | null, login = BOT_LOGIN) => ({
    id: 1,
    body,
    user: { login },
});

const makeGithub = (comments: object[]) => ({
    rest: {
        issues: {
            listComments: () => {},
        },
    },
    paginate: async () => comments,
});

const makePullsGithub = (pulls: object[]) => ({
    rest: {
        pulls: {
            list: async () => ({ data: pulls }),
        },
    },
});

afterEach(() => {
    tempDirs.splice(0).forEach((dir) => {
        fs.rmSync(dir, { recursive: true, force: true });
    });
});

describe('resolveReleasePr()', () => {
    it('returns the number of the open release PR', async () => {
        const github = makePullsGithub([{ number: 23 }]);

        const number = await resolveReleasePr({
            github,
            context,
            releaseBranch: 'release-bump/v2.5.0',
        });

        expect(number).toBe(23);
    });

    it('returns null when there is no open release PR', async () => {
        const github = makePullsGithub([]);

        const number = await resolveReleasePr({
            github,
            context,
            releaseBranch: 'release-bump/v2.5.0',
        });

        expect(number).toBeNull();
    });
});

describe('findMarkerComments()', () => {
    it('returns bot comments that contain the marker', async () => {
        const github = makeGithub([
            makeComment(`${MARKER}\nWarning`),
            makeComment('Unrelated comment'),
        ]);

        const comments = await findMarkerComments({
            github,
            context,
            number: 23,
            marker: MARKER,
        });

        expect(comments).toHaveLength(1);
    });

    it('ignores a human comment which quotes the body and the marker', async () => {
        const github = makeGithub([
            makeComment(`${MARKER}\nWarning`, 'a-maintainer'),
        ]);

        const comments = await findMarkerComments({
            github,
            context,
            number: 23,
            marker: MARKER,
        });

        expect(comments).toHaveLength(0);
    });

    it('ignores a comment without a body', async () => {
        const github = makeGithub([makeComment(null)]);

        const comments = await findMarkerComments({
            github,
            context,
            number: 23,
            marker: MARKER,
        });

        expect(comments).toHaveLength(0);
    });
});

describe('readWikiBuildLogTail()', () => {
    it('returns null when the log is missing', () => {
        expect(readWikiBuildLogTail(makeRunnerTemp())).toBeNull();
    });

    it('returns null when the log is empty', () => {
        const runnerTemp = makeRunnerTemp();
        writeLog(runnerTemp, ' \n\t\n');

        expect(readWikiBuildLogTail(runnerTemp)).toBeNull();
    });

    it('returns the whole short log without the trailing whitespace', () => {
        const runnerTemp = makeRunnerTemp();
        writeLog(runnerTemp, 'first line\nsecond line\n\n');

        expect(readWikiBuildLogTail(runnerTemp)).toBe('first line\nsecond line');
    });

    it('keeps only the last lines of a long log', () => {
        const runnerTemp = makeRunnerTemp();
        const lines = Array.from({ length: MAX_EXCERPT_LINES + 20 }, (_, index) => `line-${index + 1}`);
        writeLog(runnerTemp, `${lines.join('\n')}\n`);

        const tail = readWikiBuildLogTail(runnerTemp) as string;
        const tailLines = tail.split('\n');

        expect(tailLines).toHaveLength(MAX_EXCERPT_LINES);
        expect(tailLines[0]).toBe('line-21');
        expect(tailLines[MAX_EXCERPT_LINES - 1]).toBe(`line-${MAX_EXCERPT_LINES + 20}`);
    });

    it('keeps a log of the maximum length as is', () => {
        const runnerTemp = makeRunnerTemp();
        writeLog(runnerTemp, 'x'.repeat(MAX_EXCERPT_LENGTH));

        const tail = readWikiBuildLogTail(runnerTemp) as string;

        expect(tail).toHaveLength(MAX_EXCERPT_LENGTH);
        expect(tail.startsWith('x')).toBe(true);
    });

    it('truncates a longer log from the start and marks the cut', () => {
        const runnerTemp = makeRunnerTemp();
        writeLog(runnerTemp, `${'start'.repeat(2000)}${'y'.repeat(MAX_EXCERPT_LENGTH)}`);

        const tail = readWikiBuildLogTail(runnerTemp) as string;

        expect(tail.startsWith(TRUNCATED_MARKER)).toBe(true);
        expect(tail).toHaveLength(TRUNCATED_MARKER.length + MAX_EXCERPT_LENGTH);
        expect(tail.endsWith('y')).toBe(true);
    });
});
