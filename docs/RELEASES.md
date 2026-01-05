# Release

This repository is a monorepo of independently versioned Javascript packages. We use Conventional Commits to track changes to individual packages over time. When it comes time to publish updates to NPM, a maintainer runs through the following process from the repo root:

1. Ensure you have the `gh` CLI tool installed and authenticated: `gh auth status`
    - if unauthenticated, `gh auth login`
2. Run `yarn script:release` to sanity check the new update versions via a dry-run
3. Run `yarn script:release --no-dry-run` if all looks good. This will automatically:
    - checkout `main` and pull to be up-to-date
    - fetch the latest tags locally
    - create a new release branch with timestamp
    - push the branch to the remote
    - verify gh CLI authentication
    - create and push new git tags for each package
    - create new GH releases with changelogs
    - create a commit containing the version bumps in all affected package.json's
4. Create new PR to main with title `chore(release): publish`
    - After this gets merged it will run the `yarn script:retag` and create a new PR from `main` to `latest`
5. Merge new PR from `main` to `latest`
6. Wait for the `publish.yml` workflow to complete on `latest`. Afterwards, any updated packages should be pushed to NPM
    - Check the page here to confirm: https://www.npmjs.com/org/canton-network

## Backporting

It may be required to backport a fix to a previous major version of an SDK or package. Suppose we have latest stable of `wallet-sdk` at v2.x.y, but we need to apply an emergency fix to `wallet-sdk` v1. Because every release is tagged in git, this should be straightforward:

1. `git checkout @canton-network/wallet-sdk@1.x.y`
2. `git checkout -b backport/wallet-sdk/v1`
    - create a long-running backport branch, which we can continuously add fixes to over some LTS period, if necessary
    - from then on, we can just checkout the branch instead of the tag
3. Apply changes (`git apply ...` or etc)
4. Ensure you have the `gh` CLI tool installed and authenticated: `gh auth status`
    - if unauthenticated, `gh auth login`
5. Run `yarn script:release --backport` to sanity check the new update versions via a dry-run
    - The `--backport` flag tells the script to use the current branch instead of checking out main
6. Run `yarn script:release --no-dry-run --backport` if all looks good
7. Open a PR to merge the release branch back into the backport branch (e.g., `backport/wallet-sdk/v1`)
8. Wait for CI to publish the backported version to NPM
