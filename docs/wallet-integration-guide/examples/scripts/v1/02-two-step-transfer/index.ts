import {
    localNetAuthDefault,
    localNetStaticConfig,
    Sdk,
    AuthTokenProvider,
} from '@canton-network/wallet-sdk'
import { pino } from 'pino'
import { createParties } from '../common/createParties.js'
import _accept from './_accept.js'
import { TransferTestScriptParameters } from './types.js'
import _reject from './_reject.js'
import _withdraw from './_withdraw.js'
import _expire from './_expire.js'

const logger = pino({ name: 'v1-02-two-step-transfer', level: 'info' })

const localNetAuth = localNetAuthDefault(logger)

const sdk = await Sdk.create({
    authTokenProvider: new AuthTokenProvider(localNetAuth),
    ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    validatorUrl: localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL,
    tokenStandardUrl: localNetStaticConfig.LOCALNET_TOKEN_STANDARD_URL,
    scanApiBaseUrl: localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL,
    registries: [localNetStaticConfig.LOCALNET_REGISTRY_API_URL],
})

const { sender, receiver, senderKeys, receiverKeys } = await createParties(sdk)

const [amuletTapCommand, amuletTapDisclosedContracts] = await sdk.amulet.tap(
    sender.partyId,
    '10000'
)

await (
    await sdk.ledger.prepare({
        partyId: sender.partyId,
        commands: amuletTapCommand,
        disclosedContracts: amuletTapDisclosedContracts,
    })
)
    .sign(senderKeys.privateKey)
    .execute({ partyId: sender.partyId })

const senderUtxos = await sdk.token.utxos({ partyId: sender.partyId })

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

// await _accept(transferTestScriptParameters)

// await _reject(transferTestScriptParameters)

// await _withdraw(transferTestScriptParameters)

await _expire(transferTestScriptParameters)
