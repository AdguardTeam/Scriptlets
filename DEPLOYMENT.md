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
   `create-release-pr.yml`.
2. Merge the release PR. **Publish release**
   (`.github/workflows/publish-release.yml`) runs the shared
   `ext-shared-actions/publish-release.yml`: it tags the commit from the
   changelog, injects the version (`npm pkg set version=…`), lints and tests
   and builds in Docker, publishes to npm, mirrors to the public repo, drafts a
   GitHub Release, and notifies Slack.
3. After publish, the `update-wiki` job regenerates `wiki/` from JSDoc (via the
   Docker `wiki-output` stage) and commits it to `master`; **mirror.yml** then
   mirrors that push (and every other push to `master`) to the public repo.

For the full release pipeline documentation, see
[ext-shared-actions/docs/publish-release.md](https://github.com/AdGuardSoftwareLimited/ext-shared-actions/blob/master/docs/publish-release.md).
