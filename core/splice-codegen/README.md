# @canton-network/core-splice-codegen

Typed wrappers around generated DAML JS packages used by Splice examples and SDK integrations.

This package currently exposes three modules:

- `TestToken` (from `@daml.js/splice-test-token-v1-1.0.0`)
- `TestTokenV2` (from `@daml.js/splice-test-token-v2-1.0.0`)
- `OTCTrade` (from `@daml.js/splice-token-test-trading-app-1.0.0`)

## Installation

```sh
pnpm install @canton-network/core-splice-codegen
```

## Requirements

This package requires a localnet instance that relies on Splice v0.6.12 or higher. Please ensure you have the latest localnet fetched.

## Build

From repository root:

```sh
pnpm --filter @canton-network/core-splice-codegen build
```

## Regenerating DAML Codegen Inputs

This package depends on generated DAML JS artifacts under
`damljs/test-token-v1` and `damljs/test-token-v2`.

To refresh those artifacts, run:

```sh
pnpm generate:codegen
```

Then rebuild this package.

## Usage

```ts
import { TestToken, OTCTrade } from '@canton-network/core-splice-codegen'

// Template references
console.log(TestToken.DAR.TestTokenV1.TokenRules.templateId)
console.log(OTCTrade.DAR.TradingApp.OTCTradeProposal.templateId)

// Typed create command
const createRules = TestToken.commands.create.rules({
    admin: 'Alice::1220...',
})

// Typed exercise command
const settleTrade = OTCTrade.commands.exercise.otcTrade.settle({
    contractId: '00abc...',
    choiceArgument: {
        allocationsWithContext: {},
    },
})
```

## DAR Vetting Utility

Both modules expose `utils.vetDar`, which loads a local DAR file and uploads it through the SDK:

```ts
import { TestToken } from '@canton-network/core-splice-codegen'

await TestToken.utils.vetDar(sdk)
await TestToken.utils.vetDar(sdk, 'global-synchronizer-id')
```

Notes:

- `vetDar` expects local DAR files to exist under `.localnet/dars/`.
- If those files are absent, DAR upload will fail at runtime.

## Relationship To Token Standard

`TestToken` command helpers are wired to choice names from `@canton-network/core-token-standard`:

- transfer-instruction choices
- allocation choices
- transfer/allocation factory choices

This keeps command generation aligned with Token Standard API semantics while staying strongly typed against DAML templates.

## License

Apache-2.0
