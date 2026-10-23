# TokenStandardService test-data

This folder contains fixtures used by the unit tests of the token standard service.

## Files

`mock/utility-payload-ledger-effects.json`
locally recorded /v2/updates response with utility payloads, parsed by parser.test.ts

`expected/utility-payload-ledger-effects-sender.json`
expected pretty transactions of the utility payloads from the sender's perspective

`mock/eventsByContractIdResponses.json`
mock responses for /v2/events/events-by-contract-id, resolving the contracts archived by the utility payloads

`mock/txs.json`, `expected/txs.json`
transactions and parser outputs used by token-standard-service.test.ts, where the TransactionParser itself is mocked

# Origin

`mock/txs.json` and `mock/eventsByContractIdResponses.json` are older copies of the token standard CLI mocks. The
TransactionParser fixtures that track the upstream splice release live in `core/tx-parser/src/__tests__/data`.
