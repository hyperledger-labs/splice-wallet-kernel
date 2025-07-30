import { expect, test, describe } from '@jest/globals'

import { FireblocksHandler } from './fireblocks.js'
import { readFileSync } from 'fs-extra'
import path from 'path'

const TEST_TRANSACTION_HASH =
    '88beb0783e394f6128699bad42906374ab64197d260db05bb0cfeeb518ba3ac2'

const SECRET_KEY_LOCATION = 'fireblocks_secret.key'
const TEST_USER_ID = 'test-user-id'

describe('fireblocks handler', () => {
    const apiKey = process.env.FIREBLOCKS_API_KEY
    if (!apiKey) {
        // skip this test suite if FIREBLOCKS_API_KEY is not set - there's really nothing to test for this class
        // if the API Key is not set. Mocked functionality of this class is tested in context of the controller
        // in index.test.ts
        test.skip('FIREBLOCKS_API_KEY environment variable is not set, skipping test.', () => {})
    } else {
        const secretPath = path.resolve(process.cwd(), SECRET_KEY_LOCATION)
        const apiSecret = readFileSync(secretPath, 'utf8')
        const userApiKeys = new Map([[TEST_USER_ID, { apiKey, apiSecret }]])
        const handler = new FireblocksHandler(undefined, userApiKeys)
        test('error is thrown if userId is not found and there is no default', async () => {
            await expect(handler.getPublicKeys('unknown')).rejects.toThrow()
        })

        const userId = TEST_USER_ID
        test('getPublicKeys', async () => {
            const keys = await handler.getPublicKeys(userId)
            expect(keys.length).toBeGreaterThan(0)
        }, 25000)
        test('signTransaction', async () => {
            const transaction = await handler.signTransaction(
                userId,
                TEST_TRANSACTION_HASH,
                '02fefbcc9aebc8a479f211167a9f564df53aefd603a8662d9449a98c1ead2eba'
            )
            expect(transaction).toBeDefined()
        })
        test('getTransactions', async () => {
            const transactions = await Array.fromAsync(
                handler.getTransactions(userId, { limit: 200 })
            )
            // ensure transactions created by other tests are not included
            const before = transactions[0]?.createdAt
            const limitedTransactions = await Array.fromAsync(
                handler.getTransactions(userId, { limit: 25, before })
            )
            expect(transactions.length).toEqual(limitedTransactions.length)
        }, 25000)

        const defaultHandler = new FireblocksHandler(
            { apiKey, apiSecret },
            new Map()
        )
        test('getPublicKeys works with a default handler', async () => {
            const keys = await defaultHandler.getPublicKeys(userId)
            expect(keys.length).toBeGreaterThan(0)
        }, 25000)
    }
})
