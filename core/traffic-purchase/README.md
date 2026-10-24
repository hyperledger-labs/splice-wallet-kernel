# Traffic Purchase

Generated JavaScript/TypeScript bindings for the `Tea.TrafficPurchase` Daml model
(`damljs/traffic-purchase-models`), which sells Canton network traffic for CIP-0056 token-standard
assets.

The bindings are not committed: `pnpm generate:traffic-purchase` regenerates them with `dpm`, and
this package's `build` runs that first. Rollup inlines the generated declarations into
`dist/index.d.ts`, so consumers — `@canton-network/wallet-sdk` — depend on this package alone and
need no `@daml.js/*` resolution of their own.

## The paymaster's off-ledger API

`TrafficPurchaseClient` speaks the HTTP API a traffic paymaster serves, so a buyer can discover the
paymaster's half of a purchase instead of being handed it out of band:

|                                                                             |                                                      |
| --------------------------------------------------------------------------- | ---------------------------------------------------- |
| `GET /registry/traffic-purchase/v1/traffic-purchaser`                       | the `TrafficPurchaser` to exercise, and the receiver |
| `GET /registry/traffic-purchase/v1/conversion-rates/{instrumentId}?admin=…` | the `ConversionRate`, its terms, and its contract id |

Both answers carry the **disclosures** for the contract they name, which is the point: the paymaster
is the sole signatory of both templates, so a buyer is not a stakeholder and cannot produce their
`createdEventBlob`s itself.

The spec lives at `api-specs/traffic-purchase/v1/traffic-purchase-v1.yaml` and is hand-written — it
is not part of the splice release bundle. `pnpm script:generate:openapi` regenerates
`src/generated-clients/`, which _is_ committed.

`sdk.traffic.purchaseTraffic({ paymasterApiUrl, … })` is the consumer; without that URL it keeps
taking every term from the caller, exactly as before.
