# Release

This repository is a monorepo of independently versioned Javascript packages. We use Conventional Commits to track changes to individual packages over time. When it comes time to publish updates to NPM, a maintainer runs through the following process:

1. Open a PR from `main` against `latest`
2. Wait for the `release.yml` workflow to complete on the PR -- this pushes new tags and commits to the branch
3. Merge into `latest`
4. Wait for the `publish.yml` workflow to complete on `latest`. Afterwards, any updated packages should be pushed to NPM
    - Check the page here to confirm: https://www.npmjs.com/org/canton-network
5. Open a PR from `latest` back into `main` to merge in the package.json changes
