import { expect, test, describe } from '@jest/globals'

import { FireblocksHandler } from './fireblocks'
import { readFileSync } from 'fs-extra'
import path from 'path'

const TEST_TRANSACTION_HASH =
    '88beb0783e394f6128699bad42906374ab64197d260db05bb0cfeeb518ba3ac2'

const SECRET_KEY_LOCATION = 'fireblocks_secret.key'

describe.skip('fireblocks handler (skip due to API secret requirement)', () => {
    test('key creation', async () => {
        const apiKey = process.env.FIREBLOCKS_API_KEY
        if (!apiKey) {
            throw new Error(
                'FIREBLOCKS_API_KEY environment variable must be set.'
            )
        }
        const secretPath = path.resolve(process.cwd(), SECRET_KEY_LOCATION)
        const apiSecret = readFileSync(secretPath, 'utf8')
        const handler = new FireblocksHandler(apiKey, apiSecret)

        const keys = await handler.getPublicKeys()
        expect(keys.length).toBeGreaterThan(0)
        const transactions = await Array.fromAsync(handler.getTransactions())
        expect(transactions.length).toBeGreaterThan(0)

        const transaction = await handler.signTransaction(
            TEST_TRANSACTION_HASH,
            '02fefbcc9aebc8a479f211167a9f564df53aefd603a8662d9449a98c1ead2eba'
        )
        expect(transaction).toBeDefined()
    }, 25000)
})
