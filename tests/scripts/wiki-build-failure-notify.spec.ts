import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    deleteFailureComments,
    readWikiBuildLogTail,
    resolveReleasePr,
    upsertFailureComment,
} from '../../scripts/wiki-build-failure-notify.cjs';

const MARKER = '<!-- ext-scriptlets:wiki-build-failure -->';
const BOT_LOGIN = 'github-actions[bot]';
const LOG_FILE_NAME = 'wiki-build.log';
const MAX_EXCERPT_LENGTH = 60000;
const MAX_EXCERPT_LINES = 80;
const TRUNCATED_MARKER = '…(truncated)\n';
const PR_NUMBER = 23;

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

const makeComment = (id: number, body: string, login = BOT_LOGIN) => ({
    id,
    body,
    user: { login },
});

/**
 * Mock of the client which actions/github-script passes as `github`. Each
 * method is a spy, so the spec asserts the exact arguments the module sends.
 */
const makeGithub = (comments: object[]) => {
    const github = {
        paginate: vi.fn(async () => comments),
        rest: {
            issues: {
                createComment: vi.fn(),
                deleteComment: vi.fn(),
                listComments: vi.fn(),
                updateComment: vi.fn(),
            },
        },
    };
    return github;
};

const makePullsGithub = (pulls: object[]) => {
    const github = {
        rest: {
            pulls: {
                list: vi.fn(async () => ({ data: pulls })),
            },
        },
    };
    return github;
};

afterEach(() => {
    tempDirs.splice(0).forEach((dir) => {
        fs.rmSync(dir, { recursive: true, force: true });
    });
});

describe('resolveReleasePr()', () => {
    it('returns the number of the open PR of the release branch', async () => {
        const github = makePullsGithub([{ number: PR_NUMBER }]);

        const number = await resolveReleasePr({
            github,
            context,
            releaseBranch: 'release-bump/v2.5.0',
        });

        expect(number).toBe(PR_NUMBER);
        // A missing `head` would match any open PR, and a missing `state`
        // would match closed ones.
        expect(github.rest.pulls.list).toHaveBeenCalledWith({
            owner: 'AdguardSoft',
            repo: 'ext-scriptlets',
            state: 'open',
            head: 'AdguardSoft:release-bump/v2.5.0',
        });
    });

    it('returns null when there is no open release PR', async () => {
        const github = makePullsGithub([]);

        const number = await resolveReleasePr({
            github,
            context,
            releaseBranch: 'release-bump/v2.5.0',
        });

        expect(number).toBeNull();
        expect(github.rest.pulls.list).toHaveBeenCalledTimes(1);
    });
});

describe('upsertFailureComment()', () => {
    it('creates the comment with the marker when there is none', async () => {
        const github = makeGithub([makeComment(11, 'Unrelated comment')]);

        const result = await upsertFailureComment({
            github,
            context,
            number: PR_NUMBER,
            body: 'Warning',
        });

        expect(github.paginate).toHaveBeenCalledWith(github.rest.issues.listComments, {
            owner: 'AdguardSoft',
            repo: 'ext-scriptlets',
            issue_number: PR_NUMBER,
            per_page: 100,
        });
        expect(github.rest.issues.createComment).toHaveBeenCalledWith({
            owner: 'AdguardSoft',
            repo: 'ext-scriptlets',
            issue_number: PR_NUMBER,
            body: `${MARKER}\nWarning`,
        });
        expect(github.rest.issues.updateComment).not.toHaveBeenCalled();
        expect(github.rest.issues.deleteComment).not.toHaveBeenCalled();
        expect(result).toEqual({ created: true, removed: 0 });
    });

    it('updates the first marker comment and deletes the others', async () => {
        const github = makeGithub([
            makeComment(11, `${MARKER}\nFirst`),
            makeComment(22, `${MARKER}\nSecond`),
        ]);

        const result = await upsertFailureComment({
            github,
            context,
            number: PR_NUMBER,
            body: 'Warning',
        });

        expect(github.rest.issues.updateComment).toHaveBeenCalledWith({
            owner: 'AdguardSoft',
            repo: 'ext-scriptlets',
            comment_id: 11,
            body: `${MARKER}\nWarning`,
        });
        expect(github.rest.issues.deleteComment.mock.calls).toEqual([
            [{ owner: 'AdguardSoft', repo: 'ext-scriptlets', comment_id: 22 }],
        ]);
        expect(github.rest.issues.createComment).not.toHaveBeenCalled();
        expect(result).toEqual({ created: false, removed: 1 });
    });

    it('creates a comment when only a human quoted the marker', async () => {
        const github = makeGithub([
            makeComment(11, `${MARKER}\nQuoted`, 'a-maintainer'),
        ]);

        const result = await upsertFailureComment({
            github,
            context,
            number: PR_NUMBER,
            body: 'Warning',
        });

        expect(github.rest.issues.updateComment).not.toHaveBeenCalled();
        expect(github.rest.issues.deleteComment).not.toHaveBeenCalled();
        expect(github.rest.issues.createComment).toHaveBeenCalledTimes(1);
        expect(result).toEqual({ created: true, removed: 0 });
    });
});

describe('deleteFailureComments()', () => {
    it('deletes every marker comment of the bot', async () => {
        const github = makeGithub([
            makeComment(11, `${MARKER}\nFirst`),
            makeComment(22, `${MARKER}\nSecond`),
            makeComment(33, 'Unrelated comment'),
        ]);

        const removed = await deleteFailureComments({
            github,
            context,
            number: PR_NUMBER,
        });

        expect(github.rest.issues.deleteComment.mock.calls).toEqual([
            [{ owner: 'AdguardSoft', repo: 'ext-scriptlets', comment_id: 11 }],
            [{ owner: 'AdguardSoft', repo: 'ext-scriptlets', comment_id: 22 }],
        ]);
        expect(removed).toBe(2);
    });

    it('keeps a human comment which quotes the marker', async () => {
        const github = makeGithub([
            makeComment(11, `${MARKER}\nQuoted`, 'a-maintainer'),
        ]);

        const removed = await deleteFailureComments({
            github,
            context,
            number: PR_NUMBER,
        });

        expect(github.rest.issues.deleteComment).not.toHaveBeenCalled();
        expect(removed).toBe(0);
    });
});

describe('readWikiBuildLogTail()', () => {
    it('returns null when the log is missing', () => {
        expect(readWikiBuildLogTail(makeRunnerTemp(), LOG_FILE_NAME)).toBeNull();
    });

    it('returns null when the log is empty', () => {
        const runnerTemp = makeRunnerTemp();
        writeLog(runnerTemp, ' \n\t\n');

        expect(readWikiBuildLogTail(runnerTemp, LOG_FILE_NAME)).toBeNull();
    });

    it('returns the whole short log without the trailing whitespace', () => {
        const runnerTemp = makeRunnerTemp();
        writeLog(runnerTemp, 'first line\nsecond line\n\n');

        expect(readWikiBuildLogTail(runnerTemp, LOG_FILE_NAME)).toBe('first line\nsecond line');
    });

    it('keeps only the last lines of a long log', () => {
        const runnerTemp = makeRunnerTemp();
        const lines = Array.from({ length: MAX_EXCERPT_LINES + 20 }, (_, index) => `line-${index + 1}`);
        writeLog(runnerTemp, `${lines.join('\n')}\n`);

        const tail = readWikiBuildLogTail(runnerTemp, LOG_FILE_NAME) as string;
        const tailLines = tail.split('\n');

        expect(tailLines).toHaveLength(MAX_EXCERPT_LINES);
        expect(tailLines[0]).toBe('line-21');
        expect(tailLines[MAX_EXCERPT_LINES - 1]).toBe(`line-${MAX_EXCERPT_LINES + 20}`);
    });

    it('keeps a log of the maximum length as is', () => {
        const runnerTemp = makeRunnerTemp();
        writeLog(runnerTemp, 'x'.repeat(MAX_EXCERPT_LENGTH));

        const tail = readWikiBuildLogTail(runnerTemp, LOG_FILE_NAME) as string;

        expect(tail).toHaveLength(MAX_EXCERPT_LENGTH);
        expect(tail.startsWith('x')).toBe(true);
    });

    it('truncates a longer log from the start and marks the cut', () => {
        const runnerTemp = makeRunnerTemp();
        const errorLine = 'ERROR';
        writeLog(
            runnerTemp,
            `${'start'.repeat(2000)}${'y'.repeat(MAX_EXCERPT_LENGTH)}${errorLine}`,
        );

        const tail = readWikiBuildLogTail(runnerTemp, LOG_FILE_NAME) as string;

        expect(tail.startsWith(TRUNCATED_MARKER)).toBe(true);
        expect(tail).toHaveLength(TRUNCATED_MARKER.length + MAX_EXCERPT_LENGTH);
        // The end of the log carries the error, so it must survive the cut.
        expect(tail.endsWith(errorLine)).toBe(true);
        expect(tail.includes('start')).toBe(false);
    });
});
