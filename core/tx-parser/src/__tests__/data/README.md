# TransactionParser test-data

This folder contains fixtures used by the unit tests for TransactionParser

## Files

`mock/txs.json`
mock response of /v2/updates/flats, the test parses each contained transaction

`mock/eventsByContractIdResponses.json`
mock responses for /v2/events/events-by-contract-id

`expected/txs.json`
expected parser outputs (Transaction[])

`expected/alice-transfer-objects.json`, `expected/bob-transfer-objects.json`
expected transfer objects for the respective party

# Origin

The mocks are copied unmodified from the reference TransactionParser of the Token Standard CLI, using the
splice release that matches the mainnet version in `scripts/src/lib/version-config.json` (currently 0.6.14):
https://github.com/hyperledger-labs/splice/tree/0.6.14/token-standard/cli/__tests__/mocks/data
Note that behavior of this implementation of TransactionParser is supposed to stay in sync with the one in splice/token-standard

## Differences from splice/token-standard/cli

Our tests validate the raw output of TransactionParser.parseTransaction() for each transaction in mock/txs.json.
Note: The upstream CLI tests exercise the command (listHoldingTransactions) which postprocesses parser outputs by
filtering out transactions with events.length === 0, and renders events (drops empty sub-objects) via renderTransaction.
We do not apply those command-level steps here, TransactionParser is tested in isolation.
expected/txs.json reflects the parser output as-is, which additionally contains contract ids, transfer instruction
statuses and per-instrument holdings change summaries.

## Updating test-data

### Updating mocks

- Copy the upstream `txs.json` and `eventsByContractIdResponses.json` of the matching splice release to `mock/`.

### Updating expected outputs

- Run parser.test.ts
- Use the Vitest diff to update `expected/` so that it matches the actual parser output
- Compare the labels and holdings changes with the upstream `expected/txs-v1.json` of the same release
