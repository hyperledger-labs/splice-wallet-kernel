// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import * as path from 'path'
import { readFileSync, existsSync } from 'fs'
import { Config, configSchema } from './Config.js'

export class ConfigUtils {
    static loadConfigFile(filePath: string): Config {
        const __dirname = path.resolve()
        const resolvedFilePath = path.join(__dirname, filePath)

        if (existsSync(resolvedFilePath)) {
            return configSchema.parse(
                JSON.parse(readFileSync(resolvedFilePath, 'utf-8'))
            )
        } else {
            throw new Error(
                "Supplied file path doesn't exist " + resolvedFilePath
            )
        }
    }
}
