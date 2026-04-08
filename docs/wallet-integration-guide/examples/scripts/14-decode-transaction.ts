import pino from 'pino'
import { localNetStaticConfig, SDK } from '@canton-network/wallet-sdk'
import {
    TOKEN_PROVIDER_CONFIG_DEFAULT,
    AMULET_NAMESPACE_CONFIG,
} from './utils/index.js'

const logger = pino({ name: '14-decode-transaction', level: 'info' })

const sdk = await SDK.create({
    auth: TOKEN_PROVIDER_CONFIG_DEFAULT,
    ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
})

const aliceKeys = sdk.keys.generate()
const alice = await sdk.party.external
    .create(aliceKeys.publicKey, {
        partyHint: '14-alice',
    })
    .sign(aliceKeys.privateKey)
    .execute()

const amulet = await sdk.amulet(AMULET_NAMESPACE_CONFIG)

const [tapCommand, disclosedContracts] = await amulet.tap(alice.partyId, '2000')

const preparedTransaction = sdk.ledger.prepare({
    commands: tapCommand,
    disclosedContracts,
    partyId: alice.partyId,
})

const decodedTransaction = await preparedTransaction.decode()

logger.info({ decodedTransaction }, 'Result:')

if (Object.keys(decodedTransaction).length === 0)
    throw Error('Something went wrong when decoding the transaction')
