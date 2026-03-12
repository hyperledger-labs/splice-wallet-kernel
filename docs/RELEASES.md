# Release

This repository is a monorepo of independently versioned Javascript packages. We use Conventional Commits to track changes to individual packages over time. When it comes time to publish updates to NPM, a maintainer runs through the following process from the repo root:

1. Run `yarn script:release` to sanity check the new update versions via a dry-run
2. Run `yarn script:release --no-dry-run` if all looks good. This will
    - create and push new git tags for each package.
    - create new GH releases with changelogs.
    - create a commit containing the version bumps in all affected package.
    - waits for the pr to be merged (keep the terminal open).
    - retags the GH releases created earlier to the merge to main (since the PR squashes).
    - once it is merged creates a new pr from `main` to `latest`.
3. Wait for the `publish.yml` workflow to complete on `latest`. Afterwards, any updated packages should be pushed to NPM
    - Check the page here to confirm: https://www.npmjs.com/org/canton-network

## Backporting

It may be required to backport a fix to a previous major version of an SDK or package. Suppose we have latest stable of `wallet-sdk` at v2.x.y, but we need to apply an emergency fix to `wallet-sdk` v1. Because every release is tagged in git, this should be straightforward:

1. `git checkout @canton-network/wallet-sdk@1.x.y`
2. `git checkout -b backport/wallet-sdk/v1`
    - create a long-running backport branch, which we can continuously add fixes to over some LTS period, if necessary
    - from then on, we can just checkout the branch instead of the tag
3. Apply changes (`git apply ...` or etc)
4. Run a new release against the branch to trigger a minor/patch version bump
5. Open a PR, merge back into branch and wait for CI to publish
