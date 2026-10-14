import { localNetStaticConfig, SDK } from '@canton-network/wallet-sdk'
import { pino } from 'pino'
import _acceptV2 from './_acceptV2.js'
import type { TransferTestScriptParameters } from './types.js'

import {
    TOKEN_NAMESPACE_CONFIG,
    TOKEN_PROVIDER_CONFIG_DEFAULT,
    AMULET_NAMESPACE_CONFIG,
} from '../utils/index.js'
import _rejectV2 from './_rejectV2.js'
import _withdrawV2 from './_withdrawV2.js'

const logger = pino({ name: 'v1-02-two-step-transfer', level: 'info' })

const sdk = await SDK.create({
    auth: TOKEN_PROVIDER_CONFIG_DEFAULT,
    ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    token: TOKEN_NAMESPACE_CONFIG,
    amulet: AMULET_NAMESPACE_CONFIG,
})

const senderKeys = sdk.keys.generate()

const sender = await sdk.party.external
    .create(senderKeys.publicKey, {
        partyHint: 'v1-18-alice',
    })
    .sign(senderKeys.privateKey)
    .execute()

const receiverKeys = sdk.keys.generate()

const receiver = await sdk.party.external
    .create(receiverKeys.publicKey, {
        partyHint: 'v1-18-bob',
    })
    .sign(receiverKeys.privateKey)
    .execute()

const [amuletTapCommand, amuletTapDisclosedContracts] = await sdk.amulet.tap(
    sender.partyId,
    '10000'
)

await sdk.ledger
    .prepare({
        partyId: sender.partyId,
        commands: amuletTapCommand,
        disclosedContracts: amuletTapDisclosedContracts,
    })
    .sign(senderKeys.privateKey)
    .execute({ partyId: sender.partyId })

const senderUtxos = await sdk.token.utxos.list({ partyId: sender.partyId })

const senderAmuletUtxos = senderUtxos.filter((utxo) => {
    return (
        utxo.interfaceViewValue.amount === '10000.0000000000' &&
        utxo.interfaceViewValue.instrumentId.id === 'Amulet'
    )
})

if (senderAmuletUtxos.length === 0) {
    throw new Error('No UTXOs found for Sender')
}

const transferTestScriptParameters: TransferTestScriptParameters = {
    sdk,
    sender,
    senderKeys,
    receiver,
    receiverKeys,
    logger,
}

//requires splice 0.8.3+ for Token standard v2 transfer
await _acceptV2(transferTestScriptParameters)

await _rejectV2(transferTestScriptParameters)

await _withdrawV2(transferTestScriptParameters)

// Forcefully exit to prevent floating ledger retries from crashing the event loop
process.exit(0)
