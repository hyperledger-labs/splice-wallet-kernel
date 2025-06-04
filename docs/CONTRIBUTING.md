# Contribution Guidelines

## Setup

### environment

1. Install NodeJS, preferably via [nvm](https://github.com/nvm-sh/nvm). We support the latest LTS (v22.16.0 at time of writing)
2. After installing nvm, run `nvm use` in the repo root
3. Run `corepack enable` to install `yarn`
4. Run `yarn set version stable` to update `yarn` to v4
5. Run `yarn install` to install the workspaces

### git "signed-off-by" commit

As a requirement under the hyperledger foundation, all commits must be signed off. This can be done by adding the `-s` flag every time you commit.

In this repo, we use Husky to automatically configure a git hook to do this for you.

It is also recommended (but not required) to add a gpg key: https://docs.github.com/en/authentication/managing-commit-signature-verification/adding-a-gpg-key-to-your-github-account
