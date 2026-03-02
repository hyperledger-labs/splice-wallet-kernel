# TransactionParser test-data

This folder contains fixtures used by the unit tests for TransactionParser

## Files

`mock/eventsByContractIdResponses.ts`
mock responses for /v2/events/events-by-contract-id

`mock/txs.ts`
array of JsTransaction inputs to the parser

`expected/txs.ts`
expected parser outputs (Transaction[])

# Origin

This data was copied from the reference TransactionParser of Token Standard CLI
https://github.com/hyperledger-labs/splice/tree/main/token-standard/cli
Note that behavior of this implementation of TransactionParser is supposed to stay in sync with the one in splice/token-standard

## Differences from splice/token-standard/cli

Our tests validate the raw output of TransactionParser.parseTransaction() for each item in mock/txs.ts.
Note: The upstream CLI tests exercise the command (listHoldingTransactions) which postprocesses parser outputs by
filtering out transactions with events.length === 0, and renders events (drops empty sub-objects) via renderTransaction.
We do not apply those command-level steps here, TransactionParser is tested in isolation.
expected/txs.ts reflects the parser output as-is.

## Updating test-data

### Updating mocks

- Copy the latest upstream mocks for txs and eventsByContractIdResponses.
- Convert JSON to ESM TypeScript modules:
    - Change extension from .json to .ts
    - Add export default at the beginning of the file

### Updating expected outputs

- Run parser.test.ts
- Use the Jest diff to update expected/txs.ts so that it matches the actual parser output
