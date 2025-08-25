import { createCLI } from '@splice/core-wallet-store-sql'
import { ConfigUtils } from '../config/ConfigUtils.js'
import { configSchema } from '../config/Config.js'

const configPath = process.env.NETWORK_CONFIG_PATH || '../test/config.json'
const configFile = ConfigUtils.loadConfigFile(configPath)
const config = configSchema.parse(configFile)
const cli = createCLI(config.store)
cli.parseAsync(process.argv)
