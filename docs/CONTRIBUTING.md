# Contribution Guidelines

## Setup

> Note: This guide is for developers who want to contribute to Wallet Gateway. It is worth reading the entire doc first before starting setup.

### Prerequisites

- Node.js 24+ (see `.nvmrc` for exact version)
- pnpm (version specified in `package.json#packageManager`)
- Java (for Canton) - [sdkman](https://sdkman.io/install) is recommended for version management

An unofficial, community-contributed [nix shell](./development/shell.nix) is available as well to provide these system dependencies.

### Environment

1. Install [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm):

    ```bash
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.7/install.sh | bash

    # or

    curl -fsSL https://fnm.vercel.app/install | bash
    ```

2. Restart your terminal
3. Run `nvm install` or `fnm install` to install the Node.js version from `.nvmrc`
4. Install [pnpm](https://pnpm.io/installation)

    ```bash
        curl -fsSL https://get.pnpm.io/install.sh | sh -
    ```

5. Run `pnpm install` to install dependencies
6. Run `pnpm postinstall` to set up auto sign-off hooks

In order for Husky to use the correct node version (as part of our pre-commit), you might need to add an init file for certain IDEs.

Create the file `~/.config/husky/init.sh` with the following content:

```bash
# ~/.config/husky/init.sh

# for nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm

# or

# for fnm
eval "$(fnm env)"
```

### Git "Signed-off-by" Commit

As a requirement under the Hyperledger Foundation, all commits must be signed off. This can be done by adding the `-s` flag every time you commit.

In this repo, we use Husky to automatically configure a git hook to do this for you.

It is also recommended (but not required) to add a GPG key: https://docs.github.com/en/authentication/managing-commit-signature-verification/adding-a-gpg-key-to-your-github-account

### Conventional Commits

We use [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/#summary) to track version changes for packages and create informative changelogs. Our linter automatically checks that the commit scope matches an `nx` project name. Some common commit types are:

- `feat` -- results in a minor version bump for the scoped package (`feat(pkg): ...`)
- `fix` -- results in a patch version bump for the scoped package (`fix(pkg): ...`)
- `build`, `chore`, `ci`, `docs`, `perf`, `refactor`, `revert`, `style`, `test`

Major version bumps are triggered by adding an exclamation after the scope (`feat(pkg)!: breaking change`) or by including a `BREAKING CHANGE: ...` trailer at the end of the commit message.

## Running

### Building

Build all packages:

```bash
pnpm build:all
```

This uses `nx` to build all workspaces in parallel. After the initial build, you can selectively build each package by navigating into the corresponding directory and running `pnpm build`.

Other useful commands:

```bash
pnpm clean:all          # Clean all build artifacts and reset nx cache
pnpm test:all           # Run tests across all packages
pnpm test-coverage:all  # Run tests with coverage across all packages
pnpm full:rebuild       # Clean, regenerate, and rebuild everything
pnpm full:up            # Start localnet and all dev servers
pnpm full:down          # Stop everything and rebuild
```

Tests use [Vitest](https://vitest.dev/) and are exposed as the `test` Nx target, inferred by
`@nx/vitest` from each package's `vitest.config.ts` (which builds on the shared
[`vitest.base.ts`](../vitest.base.ts)). Extra arguments are forwarded to Vitest:

```bash
pnpm nx test <project>                     # e.g. pnpm nx test @canton-network/core-ledger-client
pnpm nx test <project> -c coverage         # with coverage report in <project>/coverage
pnpm nx test <project> -- src/foo.test.ts  # filter test files
```

### API Generation

Run `pnpm generate:<api>` from the root to regenerate RPC clients/servers. For example:

```bash
pnpm generate:dapp  # Regenerate dApp API client
pnpm generate:all   # Regenerate all API specs
```

### Live Reloading

To support fast iteration loops, most workspaces have `dev` scripts that watch their source directories for changes and rebuild. Start all dev servers with:

```bash
pnpm start:all
```

This uses `pm2` to run each dev server in parallel. See the `pm2` [cheatsheet](https://pm2.keymetrics.io/docs/usage/quick-start/#cheatsheet) for more commands (preface them with `pnpm pm2` when invoking).

```bash
pnpm pm2 list   # Show running processes
pnpm pm2 logs   # View logs
pnpm stop:all   # Stop all services
```

> Note: Codegenned artifacts are not automatically watched. Use `pnpm generate:all` if updating the API specs.

After running `pnpm start:all`, you'll have services exposed on the following ports:

| Service             | URL            |
| ------------------- | -------------- |
| Example Ping dApp   | localhost:8080 |
| Example Portfolio   | localhost:8081 |
| HTTP Wallet Gateway | localhost:3030 |

### Localnet

To run a local Splice network (includes Canton + Splice services):

```bash
pnpm script:fetch:localnet     # Download localnet artifacts
pnpm start:localnet            # Start the local network
pnpm stop:localnet             # Stop the local network
```

### Canton (Standalone)

If you need to run Canton without the full Splice network (localnet already includes Canton):

1. Ensure you have Java installed - [sdkman](https://sdkman.io/install) is recommended for version management
2. Run `pnpm script:fetch:canton` to download Canton to `.canton/`
3. Run `pnpm start:canton` to start a participant & synchronizer

```bash
pnpm start:canton              # Start Canton (mainnet config)
pnpm start:canton:tls          # Start Canton with TLS enabled
pnpm start:canton:console      # Start Canton with interactive console
```

### Network Selection

Many scripts support a `--network` flag to target different environments:

```bash
pnpm script:fetch:canton --network=devnet   # Fetch devnet Canton version
pnpm script:fetch:canton --network=mainnet  # Fetch mainnet Canton version (default)
```

## Migrating from `yarn`

If you've cloned this repository when it was set up to use `yarn`, finalize the switch to `pnpm`:

1. Pull latest main into your fork / branch
2. Stop all running services: `yarn pm2 kill` (and `yarn stop:localnet`, if applicable)
3. Delete any residual `yarn` directories: `rm -rf .pnp.cjs .pnp.loader.mjs .yarn`
4. Run `pnpm install`
5. Done! For 99% of cases, you can now use `pnpm` as a direct replacement for `yarn`, i.e.:
    - `yarn build:all` --> `pnpm build:all`
    - `yarn start:all` --> `pnpm start:all`
    - `yarn pm2 list` --> `pnpm pm2 list`
    - ... etc

## Migrating from `corepack`

If you've cloned this repository when it was set up to use `corepack`, finalize the switch to native `pnpm`:

1. Pull latest main into your fork / branch
2. Delete any residual `pnpm over corepack` references: `corepack disable pnpm` (see [pnpm troubleshooting](https://pnpm.io/installation#troubleshooting))
3. Ensure you have at least pnpm 11 installed globally
4. Use `pnpm`
