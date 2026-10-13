# Release

This repository is a monorepo of independently versioned Javascript packages. We use Conventional Commits to track changes to individual packages over time. When it comes time to publish updates to NPM, a maintainer runs through the following process from the repo root:

1. Run `pnpm script:release` to sanity check the new update versions via a dry-run
2. Run `pnpm script:release --no-dry-run` if all looks good. This will
    - create and push new git tags for each package.
    - create new GH releases with changelogs.
    - create a commit containing the version bumps in all affected package.
    - waits for the pr to be merged (keep the terminal open).
    - retags the GH releases created earlier to the merge to main (since the PR squashes).
    - once it is merged creates a new pr from `main` to `latest`.
3. Wait for the `publish.yml` workflow ("Publish packages") to complete. Afterwards, any updated packages should be pushed to NPM
    - Check the page here to confirm: https://www.npmjs.com/org/canton-network

## Core Packages

For regular releases, core packages are pre-selected by default as a group. They are bumped in accordance with conventional commits for minor or patch versions.

Explicitly releasing a major version of a core package (i.e. when the API changes in a breaking way) is tricky. Due to CI requirements for merging PRs, it's impossible to isolate a breaking change in a core package from the related necessary (minor) changes to the top-level package (like `dapp-sdk` or `wallet-sdk`) that consumes it.

However, since pull requests are squashed, you can't mark the entire PR as a breaking change -- or else the SDK will get an unwanted major bump, too.

The workaround is to manually use the `--core-major [rev]` flag of the release script after merging your breaking PR. This is a special way to manually trigger a major bump, _outside of conventional commits_, in any core package you want. Pass in an optional revision to target the set of core packages changed in the associated commit.

Examples:

- `pnpm script:release --core-major` displays a multi-select of all publishable core packages.
- `pnpm script:release --core-major HEAD~1` displays a multi-select pre-populated with the publishable core packages changed in the last commit.
- `pnpm script:release --core-major 8b4deae` similar as above, for a specific commit sha.

As always, pair with `--no-dry-run` when ready to push a real release to GitHub and NPM.

### Slack notifications

Subscribe your Slack channel to the **Release announce** workflow. **Publish packages** starts it in the final step of the `release` job (`workflow_dispatch`). Ordinary merges to `main` skip `release` and never invoke **Release announce**.

## Backporting

It may be required to backport a fix to a previous major version of an SDK or package. Suppose we have latest stable of `wallet-sdk` at v2.x.y, but we need to apply an emergency fix to `wallet-sdk` v1. Because every release is tagged in git, this should be straightforward:

1. `git checkout @canton-network/wallet-sdk@1.x.y`
2. `git checkout -b backport/wallet-sdk/v1`
    - create a long-running backport branch, which we can continuously add fixes to over some LTS period, if necessary
    - from then on, we can just checkout the branch instead of the tag
3. Apply changes (`git apply ...` or etc)
4. Run a new release against the branch to trigger a minor/patch version
    - NOTE: this will automatically set a pre-release label, so that the stable `v1.2.3` becomes `v1.2.3-backport.0`. Subsequent backport releases against this line will increment the pre-release identifier.
5. Open a PR, merge back into branch and wait for CI to publish
