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

### conventional commits

We use [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/#summary) to track version changes for packages and create informative changelogs. Our linter automatically checks that the commit scope matches an `nx` project name. Some common commit types are:

- feat -- this results in a minor version bump for the scoped package (`feat(pkg): ...`) when a release is cut
- fix -- this results in a patch version bump for the scoped package (`fix(pkg): ...`) when a release is cut
- build
- chore
- ci
- docs
- perf
- refactor
- revert
- style
- test

major version bumps are triggered by adding an exclamation after the scope (`feat(pkg)!: breaking change`) or by including a `BREAKING CHANGE: ...` trailer at the end of the commit message.

## Running

### building

you can build each repo seperately by going into the repo and running `yarn build`. Alternatively you can run `yarn build:all` to build all workspaces from root.

### API generation

Run `yarn generate:<api>` from the root to regen RPC clients/servers for a particular Wallet Kernel API. For example:

- `yarn generate:dapp`: dApp API
- `yarn generate:user`: User API
- `yarn generate:all` : Generate all of the above API specs

### live reloading

To support fast iteration loops for developers, most workspaces have `dev` scripts that watch their respective src directories for changes, and rebuild. You could start everything one at a time, by running `yarn dev` in each respective directory, or start up a common subset with

```
yarn start:all
```

This uses `pm2` to run each dev server in parallel. See the `pm2` [cheatsheet](https://pm2.keymetrics.io/docs/usage/quick-start/#cheatsheet) for more commands (remember to preface them with `yarn pm2` when invoking).

> Note that the codegenned artifacts are not automatically watched, use `yarn generate:all` if updating the API specs.

After running `yarn start:all`, you'll have services exposed on the following ports:

| Service          | Url            |
| ---------------- | -------------- |
| example dApp UI  | localhost:5137 |
| HTTP WK dapp RPC | localhost:3000 |
| HTTP WK user RPC | localhost:3001 |

### canton

To run a Canton instance locally:

1. Ensure you have Java installed. A convenient tool to manage Java SDK versions (similar to `nvm` for Node) is [sdkman](https://sdkman.io/install)
2. Run `yarn scripts:fetch:canton` to download and install Canton 3.4 to a local `.canton/` directory in the repo (if you haven't already)
3. Run `yarn start:canton` to start a participant & synchronizer using the repo setup defined in `canton/`
    - (alternatively) start canton directly to access the interactive console: `yarn start:canton:console`

Canton is _not_ started automatically through the `start:all` script, as it requires extra dependencies and has a higher resource footprint.
