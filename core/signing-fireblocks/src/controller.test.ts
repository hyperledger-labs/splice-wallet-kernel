// import { expect, describe, test } from '@jest/globals'
//
// import { FireblocksDriver } from './controller.js'
// import { readFileSync } from 'fs-extra'
// import path from 'path'
//
// import {
//     CreateKeyResult,
//     isRpcError,
//     Transaction,
//     Error as RpcError,
// } from 'core-signing-lib'
// import { CC_COIN_TYPE } from './fireblocks.js'
//
// const TEST_KEY_NAME = 'test-key-name'
// const TEST_TRANSACTION = 'test-tx'
// const TEST_TRANSACTION_HASH =
//     '88beb0783e394f6128699bad42906374ab64197d260db05bb0cfeeb518ba3ac2'
//
// const TEST_FIREBLOCKS_VAULT_ID = [42, CC_COIN_TYPE, 4, 0, 0].join('-')
// const TEST_FIREBLOCKS_PUBLIC_KEY =
//     '02fefbcc9aebc8a479f211167a9f564df53aefd603a8662d9449a98c1ead2eba'
//
// const SECRET_KEY_LOCATION = 'fireblocks_secret.key'
// //
// // jest.mock('./controller.js', () => {
// //     return {
// //         FireblocksDriver:
// //     }
// // })
//
// interface TestValues {
//     signingDriver: FireblocksDriver
//     key: CreateKeyResult
// }
//
// export function throwWhenRpcError<T>(value: T | RpcError): void {
//     if (isRpcError(value)) {
//         throw new Error(
//             `Expected a valid return, but got an error: ${value.error_description}`
//         )
//     }
// }
//
// async function setupTest(keyName: string = TEST_KEY_NAME): Promise<TestValues> {
//     const secretPath = path.resolve(process.cwd(), SECRET_KEY_LOCATION)
//     const apiSecret = readFileSync(secretPath, 'utf8')
//
//     const apiKey = process.env.FIREBLOCKS_API_KEY
//     if (!apiKey) {
//         throw new Error('FIREBLOCKS_API_KEY environment variable must be set.')
//     }
//
//     const signingDriver = new FireblocksDriver({
//         apiKey,
//         apiSecret,
//     })
//     const key = {
//         id: TEST_FIREBLOCKS_VAULT_ID,
//         name: keyName,
//         publicKey: TEST_FIREBLOCKS_PUBLIC_KEY,
//     }
//     return {
//         signingDriver,
//         key,
//     }
// }
//
// describe.skip('fireblocks controller (skip due to API secret requirement)', () => {
//     test('key creation', async () => {
//         const { signingDriver } = await setupTest()
//         const err = await signingDriver.controller.createKey({ name: 'test' })
//         expect(isRpcError(err)).toBe(true)
//     })
//
//     test('transaction signature', async () => {
//         const { signingDriver, key } = await setupTest()
//         const tx = await signingDriver.controller.signTransaction({
//             tx: TEST_TRANSACTION,
//             txHash: TEST_TRANSACTION_HASH,
//             publicKey: key.publicKey,
//         })
//
//         throwWhenRpcError(tx)
//
//         // this hash has already been signed so Fireblocks won't bother getting it signed again
//         expect(tx.status).toBe('signed')
//
//         const transactionsByKey =
//             await signingDriver.controller.getTransactions({
//                 publicKeys: [key.publicKey],
//             })
//
//         throwWhenRpcError(transactionsByKey)
//         expect(
//             transactionsByKey.transactions?.find(
//                 (t: Transaction) => t.txId === tx.txId
//             )
//         ).toBeDefined()
//
//         const transactionsById = await signingDriver.controller.getTransactions(
//             {
//                 txIds: [tx.txId],
//             }
//         )
//
//         throwWhenRpcError(transactionsById)
//         expect(
//             transactionsById.transactions?.find(
//                 (t: Transaction) => t.txId === tx.txId
//             )
//         ).toBeDefined()
//
//         const foundTx = await signingDriver.controller.getTransaction({
//             txId: tx.txId,
//         })
//         throwWhenRpcError(foundTx)
//     }, 60000)
// })
