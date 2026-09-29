# Traffic Purchase

Generated JavaScript/TypeScript bindings for the `Tea.TrafficPurchase` Daml model
(`damljs/traffic-purchase-models`), which sells Canton network traffic for CIP-0056 token-standard
assets.

The bindings are not committed: `pnpm generate:traffic-purchase` regenerates them with `dpm`, and
this package's `build` runs that first. Rollup inlines the generated declarations into
`dist/index.d.ts`, so consumers — `@canton-network/wallet-sdk` — depend on this package alone and
need no `@daml.js/*` resolution of their own.
