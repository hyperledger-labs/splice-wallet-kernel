# Release

This repository is a monorepo of independently versioned Javascript packages. We use Conventional Commits to track changes to individual packages over time. When it comes time to publish updates to NPM, a maintainer runs through the following process:

1. Checkout `main` and `git pull` to be up-to-date
2. Run `yarn release` from the repo root (depends on `gh` CLI to open a PR)
3. Merge the version bump PR into `main`
4. Open and merge a PR from `main` to `latest`
5. Wait for the `publish.yml` workflow to complete on `latest`. Afterwards, any updated packages should be pushed to NPM
    - Check the page here to confirm: https://www.npmjs.com/org/canton-network
