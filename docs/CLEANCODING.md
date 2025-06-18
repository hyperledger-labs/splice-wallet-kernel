# Clean Coding Guidelines

In here is contained the clean coding guidelines for the Hyperledger Wallet Kernel project.
These guidelines are meant to help maintain a high standard of code quality and readability across the codebase.
These guidelines are decided within the Hyperledger Wallet Kernel team, and are subject to change as the project evolves.

## General Principles

### Folder Structure

- Use a clear and consistent folder structure that reflects the functionality of the code.
- For workspaces keep the folder hierarchy as flat as possible, with each package in its own folder.
- The name used in the `package.json` should match the folder name and structure. _(this is enforced with [script](../scripts/check-package-json-name.sh))_
    - it may be prefixed with `splice-wallet` or `splice-wallet-kernel` in cases where it would be to generic or ambiguous.
