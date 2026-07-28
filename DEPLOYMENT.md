# Deployment — @adguard/scriptlets

| Parameter              | Value                    |
| ---------------------- | ------------------------ |
| **npm package**        | `@adguard/scriptlets`    |
| **Artifact**           | `scriptlets.tgz`         |
| **Public mirror**      | `AdguardTeam/Scriptlets` |
| **GitHub environment** | `npm`                    |
| **Slack channel**      | `#adguard-extension-vcs` |

## Release flow

1. **Prepare release** (`.github/workflows/prepare-release.yml`, manual
   dispatch with a `v*` tag) opens a release PR that moves `## [Unreleased]`
   in `CHANGELOG.md` into a dated `## [x.y.z]` section, via the shared
   `create-release-pr.yml`, and then regenerates the auto-generated `wiki/`
   from JSDoc (via the Docker `wiki-output` stage), appending it to the same
   release PR so the wiki update is reviewed and merged together with the
   release. (Only the wiki build is best-effort — the `Build wiki` step runs
   with `continue-on-error: true` because the shared remote BuildKit instance
   can be transiently unreachable, so a build failure leaves the release PR fully
   mergeable without the wiki; the wiki is retried next release. The commit/push
   step, however, only runs when the build succeeded, so wiki changes that WERE
   built always reach the PR — and a push failure surfaces as a real red job
   rather than being silently swallowed. Either way it is not a required check
   on the release PR, so it never blocks the merge.)
2. Merge the release PR. **Publish release**
   (`.github/workflows/publish-release.yml`) runs the shared
   `ext-shared-actions/publish-release.yml`: it tags the commit from the
   changelog, injects the version (`npm pkg set version=…`), lints and tests
   and builds in Docker, publishes to npm, mirrors to the public repo, drafts a
   GitHub Release, and notifies Slack. **mirror.yml** mirrors every push to
   `master` (including the wiki update that landed with the release PR) to the
   public repo.

For the full release pipeline documentation, see
[ext-shared-actions/docs/publish-release.md](https://github.com/AdGuardSoftwareLimited/ext-shared-actions/blob/master/docs/publish-release.md).
