import { expect, test } from '@jest/globals'

import { ParticipantSigningDriver } from './controller.js'

const TEST_TRANSACTION = 'test-tx'
const TEST_TRANSACTION_HASH =
    '88beb0783e394f6128699bad42906374ab64197d260db05bb0cfeeb518ba3ac2'

test('driver properties', async () => {
    const signingDriver = new ParticipantSigningDriver()
    expect(signingDriver.partyMode).toBe('internal')
    expect(signingDriver.signingProvider).toBe('participant')
})

test('transaction signature', async () => {
    const signingDriver = new ParticipantSigningDriver()
    const tx = await signingDriver.controller.signTransaction({
        tx: TEST_TRANSACTION,
        txHash: TEST_TRANSACTION_HASH,
        publicKey: '',
    })
    expect(tx.status).toBe('signed')
})
