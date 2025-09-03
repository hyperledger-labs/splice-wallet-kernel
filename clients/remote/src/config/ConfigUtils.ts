// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
import * as path from 'path'
import { readFileSync, existsSync } from 'fs'

export class ConfigUtils {
    static loadConfigFile(filePath: string) {
        const __dirname = path.resolve()
        const resolvedFilePath = path.join(__dirname, filePath)

        if (existsSync(resolvedFilePath)) {
            return JSON.parse(readFileSync(resolvedFilePath, 'utf-8'))
        } else {
            console.error(
                "Supplied file path doesn't exist " + resolvedFilePath
            )
        }
    }
}
