const fs = require('node:fs');
const path = require('node:path');

// GitHub caps issue/PR comment bodies at 65,536 characters; keep the excerpt
// well below that, together with the fixed text around it.
const MAX_EXCERPT_LENGTH = 60000;
const MAX_EXCERPT_LINES = 80;

// Comments of GITHUB_TOKEN are authored by this bot. The login also keeps
// a human comment that quotes the body, and thus the marker, from matching.
const COMMENT_AUTHOR = 'github-actions[bot]';

// Hidden first line of the failure comment, so a later run can find the
// comment it posted before and replace it instead of posting a duplicate.
const WIKI_FAILURE_MARKER = '<!-- ext-scriptlets:wiki-build-failure -->';

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
        ...context.repo,
        state: 'open',
        head: `${context.repo.owner}:${releaseBranch}`,
    });
    return pulls.length > 0 ? pulls[0].number : null;
};

/**
 * Every comment of PR `number` that the bot posted and whose body contains
 * WIKI_FAILURE_MARKER.
 *
 * @param {object} args
 * @param {object} args.github Octokit client provided by actions/github-script
 * @param {object} args.context Workflow context provided by actions/github-script
 * @param {number} args.number PR number
 * @returns {Promise<object[]>} Matching comments
 */
const findMarkerComments = async ({ github, context, number }) => {
    const comments = await github.paginate(github.rest.issues.listComments, {
        ...context.repo,
        issue_number: number,
        per_page: 100,
    });
    return comments.filter((comment) => comment.user?.login === COMMENT_AUTHOR
        && comment.body.includes(WIKI_FAILURE_MARKER));
};

/**
 * Post `body` as the wiki build failure comment of PR `number`. When the bot
 * has already posted such comments, update the first one instead of creating
 * a duplicate, and delete the others: overlapping failed runs can both post
 * one before either finds the other.
 *
 * The hidden marker is prepended here, so callers pass the visible text only.
 *
 * @param {object} args
 * @param {object} args.github Octokit client provided by actions/github-script
 * @param {object} args.context Workflow context provided by actions/github-script
 * @param {number} args.number PR number
 * @param {string} args.body Visible text of the comment
 * @returns {Promise<{created: boolean, removed: number}>} Whether a comment
 * was created instead of updated, and how many duplicates were deleted
 */
const upsertFailureComment = async ({
    github, context, number, body,
}) => {
    const commentBody = `${WIKI_FAILURE_MARKER}\n${body}`;
    const previousComments = await findMarkerComments({ github, context, number });

    if (previousComments.length === 0) {
        await github.rest.issues.createComment({
            ...context.repo,
            issue_number: number,
            body: commentBody,
        });
        return { created: true, removed: 0 };
    }

    await github.rest.issues.updateComment({
        ...context.repo,
        comment_id: previousComments[0].id,
        body: commentBody,
    });
    for (const duplicate of previousComments.slice(1)) {
        await github.rest.issues.deleteComment({
            ...context.repo,
            comment_id: duplicate.id,
        });
    }
    return { created: false, removed: previousComments.length - 1 };
};

/**
 * Delete every wiki build failure comment of PR `number`, so a later
 * successful run does not leave a warning that contradicts the committed
 * `wiki/`. Only comments of the bot are deleted, so a human quote of the
 * comment is kept.
 *
 * @param {object} args
 * @param {object} args.github Octokit client provided by actions/github-script
 * @param {object} args.context Workflow context provided by actions/github-script
 * @param {number} args.number PR number
 * @returns {Promise<number>} Number of deleted comments
 */
const deleteFailureComments = async ({ github, context, number }) => {
    const comments = await findMarkerComments({ github, context, number });
    for (const comment of comments) {
        await github.rest.issues.deleteComment({
            ...context.repo,
            comment_id: comment.id,
        });
    }
    return comments.length;
};

/**
 * The tail of the wiki build log `tee` has been filling, or `null` when the
 * log is missing or empty. `tee` keeps writing until the build step is
 * killed, so a timed-out build still has a tail. The last MAX_EXCERPT_LINES
 * lines are kept and truncated to MAX_EXCERPT_LENGTH characters with a
 * `…(truncated)` marker.
 *
 * @param {string} runnerTemp Value of RUNNER_TEMP
 * @param {string} fileName Name of the log file, from the job-level env
 * @returns {string|null} Log tail, or `null` when there is nothing to show
 */
const readWikiBuildLogTail = (runnerTemp, fileName) => {
    let log;
    try {
        log = fs.readFileSync(path.join(runnerTemp, fileName), 'utf8').trim();
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
    deleteFailureComments,
    readWikiBuildLogTail,
    resolveReleasePr,
    upsertFailureComment,
};
