const fs = require('fs');
const path = require('path');

// GitHub caps issue/PR comment bodies at 65,536 characters; keep the excerpt
// well below that, together with the fixed text around it.
const MAX_EXCERPT_LENGTH = 60000;
const MAX_EXCERPT_LINES = 80;

// Comments of GITHUB_TOKEN are authored by this bot. The login also keeps
// a human comment that quotes the body, and thus the marker, from matching.
const COMMENT_AUTHOR = 'github-actions[bot]';

/**
 * Resolve the number of the open release PR whose head branch is
 * `releaseBranch`. Returns `null` when no open PR matches.
 *
 * @param {object} args
 * @param {object} args.github Octokit client provided by actions/github-script
 * @param {object} args.context Workflow context provided by actions/github-script
 * @param {string} args.releaseBranch Branch of the release PR
 * @returns {Promise<number|null>} PR number, or `null` when there is none
 */
const resolveReleasePr = async ({ github, context, releaseBranch }) => {
    const { data: pulls } = await github.rest.pulls.list({
        owner: context.repo.owner,
        repo: context.repo.repo,
        state: 'open',
        head: `${context.repo.owner}:${releaseBranch}`,
    });
    return pulls.length > 0 ? pulls[0].number : null;
};

/**
 * Every comment of PR `number` that the bot posted and whose body contains
 * `marker`.
 *
 * @param {object} args
 * @param {object} args.github Octokit client provided by actions/github-script
 * @param {object} args.context Workflow context provided by actions/github-script
 * @param {number} args.number PR number
 * @param {string} args.marker Hidden marker of the failure comment
 * @returns {Promise<object[]>} Matching comments
 */
const findMarkerComments = async ({
    github, context, number, marker,
}) => {
    const comments = await github.paginate(github.rest.issues.listComments, {
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: number,
        per_page: 100,
    });
    return comments.filter((comment) => comment.user?.login === COMMENT_AUTHOR
        && (comment.body || '').includes(marker));
};

/**
 * The tail of the wiki build log `tee` has been filling, or `null` when the
 * log is missing or empty. The last MAX_EXCERPT_LINES lines are kept and
 * truncated to MAX_EXCERPT_LENGTH characters with a `…(truncated)` marker.
 *
 * @param {string} runnerTemp Value of RUNNER_TEMP
 * @returns {string|null} Log tail, or `null` when there is nothing to show
 */
const readWikiBuildLogTail = (runnerTemp) => {
    let log;
    try {
        log = fs.readFileSync(path.join(runnerTemp, 'wiki-build.log'), 'utf8').trim();
    } catch {
        return null;
    }
    if (!log) {
        return null;
    }
    const tail = log.split('\n').slice(-MAX_EXCERPT_LINES).join('\n');
    return tail.length > MAX_EXCERPT_LENGTH
        ? `…(truncated)\n${tail.slice(-MAX_EXCERPT_LENGTH)}`
        : tail;
};

module.exports = {
    findMarkerComments,
    readWikiBuildLogTail,
    resolveReleasePr,
};
