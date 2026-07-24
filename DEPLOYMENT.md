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
   release. (This step is best-effort: it is not a required check on the release
   PR, so a red run — e.g. the compat table drifted from upstream uBO/ABP — never
   blocks the release; the wiki is simply retried next release.)
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
