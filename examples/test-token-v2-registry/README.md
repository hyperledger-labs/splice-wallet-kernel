# @canton-network/example-test-token-v2-registry

Example registry backend for the CIP-0112 token standard (Token Standard V2) on Canton.

For the shared registry background and the V1 example, see the [Test Token V1 registry README](../test-token-v1-registry/README.md).

## Overall Description

This project is a reference registry backend for Token Standard V2. It exposes V2 APIs for transfer instructions, allocations, and allocation instructions. Instrument metadata remains on the V1 metadata API.

### What V2 Adds

- **Transfer instructions:** Support offer transfers that require receiver acceptance, direct transfers where the receiver has pre-approved them, and self-transfers. The transfer factory returns the factory contract and choice context needed to start the on-ledger workflow. Follow-up choice-context endpoints cover accept, reject, and withdraw.
- **Allocations and allocation instructions:** Support creating allocation instructions, accepting or withdrawing them, and cancelling or withdrawing allocations. Allocations let clients prepare token movements for later settlement rather than settling each transfer immediately.
- **Batch settlement:** A settlement factory provides the choice context for settling allocations together, enabling multi-leg workflows.
- **Choice contexts and disclosed contracts:** Registry responses provide the additional context and contract data required to exercise standard Daml interface choices. Clients can use this data when preparing ledger commands without relying on token-specific Daml type definitions.
- **API discovery:** The V1 metadata API advertises the V2 transfer-instruction, allocation, and allocation-instruction APIs supported by this registry.

### Example Scope

This is a test implementation, not a production-ready registry. It serves a single in-memory test instrument, uses a test-token rules contract as the factory for V2 workflows, and returns empty choice contexts for follow-up actions. Replace those example behaviors with token-specific logic and persistence for a real token.

## API Overview

| API                                          | Purpose                                                           |
| -------------------------------------------- | ----------------------------------------------------------------- |
| `splice-api-token-metadata-v1`               | Registry info, supported API versions, and instrument metadata    |
| `splice-api-token-transfer-instruction-v2`   | Transfer factory and accept, reject, and withdraw choice contexts |
| `splice-api-token-allocation-instruction-v2` | Allocation factory and accept or withdraw choice contexts         |
| `splice-api-token-allocation-v2`             | Settlement factory and cancel or withdraw choice contexts         |

## Getting Started

### Prerequisites

- See [`docs/CONTRIBUTING.md`](../../docs/CONTRIBUTING.md) for development environment setup.
- A local Canton/localnet setup for end-to-end behavior.

### Installation

From the repository root:

```bash
pnpm install
```

Build this example:

```bash
pnpm --filter @canton-network/example-test-token-v2-registry build
```

Run in development mode:

```bash
pnpm --filter @canton-network/example-test-token-v2-registry dev
```

The API listens on `http://localhost:5635` by default.

## Project Structure

### Local Structure Overview

```text
examples/test-token-v2-registry/
  src/
    index.ts                          # app startup, API routing, development DAR vetting
    common/
      defaultSdk.ts                    # Wallet SDK bootstrap and localnet auth
      state.ts                         # registry configuration and operator initialization
    api/
      metadata/                        # V1 registry and instrument metadata
      transfer-instruction/            # V2 transfer factory and choice contexts
      allocation-instruction/          # V2 allocation factory and choice contexts
      allocation/                      # V2 settlement factory and allocation contexts
      utilities/                       # test registry operator endpoint
      getTokenRulesFactory.ts          # resolves or creates the shared V2 rules factory
  vitest.config.ts                     # node tests and coverage thresholds
  tsdown.config.ts                     # build configuration
```

## Testing

Run tests:

```bash
pnpm --filter @canton-network/example-test-token-v2-registry test
```

Run tests with coverage:

```bash
pnpm --filter @canton-network/example-test-token-v2-registry test:coverage
```

Tests are discovered under `src/**/*.test.ts`; coverage thresholds are defined in `vitest.config.ts`.

## Development & Contribution Guide

### `@customize` Flag

This example marks project-specific decisions with `@customize` comments. Search for `@customize` after copying the example and review each location, especially authentication, metadata, persistence, and development-only initialization.

Development loop:

1. Modify API handlers and domain logic in `src/api/**`.
2. Update the in-memory instrument data in `src/api/metadata/common.ts` or replace it with your token's metadata source.
3. Run tests and build before opening a PR.

General contribution guidelines for the monorepo: [Contributing Guide](https://github.com/canton-network/wallet/blob/main/docs/CONTRIBUTING.md).

## License

Apache-2.0

## Additional Resources

- [dApp Building Documentation](https://github.com/canton-network/wallet/tree/main/docs/dapp-building)
- [Wallet Integration Guide](https://github.com/canton-network/wallet/tree/main/docs/wallet-integration-guide)
- [CIP Repository](https://github.com/canton-foundation/cips)
