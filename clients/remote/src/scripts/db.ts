// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createCLI } from '@canton-network/core-wallet-store-sql'
import { ConfigUtils } from '../config/ConfigUtils.js'

const configPath = process.env.NETWORK_CONFIG_PATH || '../test/config.json'
const config = ConfigUtils.loadConfigFile(configPath)
const cli = createCLI(config.store)
cli.parseAsync(process.argv)
