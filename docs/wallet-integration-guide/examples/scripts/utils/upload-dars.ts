import { localNetStaticConfig, SDK } from '@canton-network/wallet-sdk'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'
import {
    TOKEN_PROVIDER_CONFIG_DEFAULT,
    localNetGlobalSynchronizer,
} from './index.js'

/*
This script is so that the CI can run all the scripts in parallel
We first run the uploadDars script and then all of the tests
*/

import { configureLogging } from '../utils/configure-logging.js'
const logger = await configureLogging()

const sdk = await SDK.create({
    auth: TOKEN_PROVIDER_CONFIG_DEFAULT,
    ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    synchronizerId: localNetGlobalSynchronizer,
})

// This example needs uploaded .dar for splice-token-test-trading-app
// It's in files of localnet, but it's not uploaded to participant, so we need to do this in the script
// Adjust if to your .localnet location
const PATH_TO_LOCALNET = '../../../../../.localnet'
const PATH_TO_TRADING_APP_DAR_IN_LOCALNET =
    '/dars/splice-token-test-trading-app-1.0.0.dar'
const TRADING_APP_PACKAGE_ID =
    'e5c9847d5a88d3b8d65436f01765fc5ba142cc58529692e2dacdd865d9939f71'

const here = path.dirname(fileURLToPath(import.meta.url))

const tradingDarPath = path.join(
    here,
    PATH_TO_LOCALNET,
    PATH_TO_TRADING_APP_DAR_IN_LOCALNET
)

//upload dar
const darBytes = await fs.readFile(tradingDarPath)
await sdk.ledger.dar.upload(darBytes, TRADING_APP_PACKAGE_ID)

const PATH_TO_TOKEN_STANDARD_DAR_IN_LOCALNET =
    '/dars/splice-util-token-standard-wallet-1.0.0.dar'
const SPLICE_UTIL_TOKEN_STANDARD_WALLET_PACKAGE_ID =
    '1da198cb7968fa478cfa12aba9fdf128a63a8af6ab284ea6be238cf92a3733ac'

const spliceUtilTokenStandardWalletDarPath = path.join(
    here,
    PATH_TO_LOCALNET,
    PATH_TO_TOKEN_STANDARD_DAR_IN_LOCALNET
)

//upload dar
const tokenStandardDarBytes = await fs.readFile(
    spliceUtilTokenStandardWalletDarPath
)
await sdk.ledger.dar.upload(
    tokenStandardDarBytes,
    SPLICE_UTIL_TOKEN_STANDARD_WALLET_PACKAGE_ID
)

//splice-token-test-trading-app-v2

const PATH_TO_TRADING_APP_V2_DAR_IN_LOCALNET =
    '/dars/splice-token-test-trading-app-v2-1.0.0.dar'
const TRADING_APP_V2_PACKAGE_ID =
    '20d42271cbd760c26c08401e4d1eec624458f5b48c73ae44c87c754e35621f5d'

const tradingDarV2Path = path.join(
    here,
    PATH_TO_LOCALNET,
    PATH_TO_TRADING_APP_V2_DAR_IN_LOCALNET
)

//upload dar
const tradingAppV2DarBytes = await fs.readFile(tradingDarV2Path)
await sdk.ledger.dar.upload(tradingAppV2DarBytes, TRADING_APP_V2_PACKAGE_ID)

logger.info('upload dars completed')
