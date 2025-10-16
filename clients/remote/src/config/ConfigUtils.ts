// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { readFileSync, existsSync } from 'fs'
import { Config, configSchema } from './Config.js'

export class ConfigUtils {
    static loadConfigFile(filePath: string): Config {
        if (existsSync(filePath)) {
            return configSchema.parse(
                JSON.parse(readFileSync(filePath, 'utf-8'))
            )
        } else {
            throw new Error("Supplied file path doesn't exist " + filePath)
        }
    }
}
