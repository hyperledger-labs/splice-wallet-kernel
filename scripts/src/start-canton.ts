// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Start a local Canton participant using the config file in the canton/ directory.
 */

import {
    CANTON_BOOTSTRAP,
    CANTON_VERSION,
    CANTON_CONF,
    error,
    info,
    trimNewline,
    CANTON_VERSION_34,
} from './utils.js'
import { existsSync } from 'fs'
import pm2 from 'pm2'
import path from 'path'

const processName = 'canton'
const VERSION_MAP: Record<string, string | undefined> = {
    '3.3': CANTON_VERSION,
    '3.4': CANTON_VERSION_34,
}

async function main() {
    const inputVersion = process.argv[2] ?? '3.3'

    if (!(inputVersion in VERSION_MAP)) {
        console.error(
            error(
                `Unsupported canton version ${inputVersion}. Please use "3.3" or "3.4"`
            )
        )
        process.exit(1)
    }
    const version = VERSION_MAP[inputVersion]
    const CANTON_BIN = path.resolve(`.canton/${version}/bin/canton`)

    if (existsSync(CANTON_BIN)) {
        console.log(
            info(`Starting Canton participant using binary at ${CANTON_BIN}...`)
        )
        pm2.connect(function (err) {
            if (err) {
                console.error(err)
                process.exit(2)
            }

            pm2.start(
                {
                    name: processName,
                    interpreter: '/bin/bash',
                    script: CANTON_BIN,
                    args: `daemon --no-tty --config ${CANTON_CONF} --bootstrap ${CANTON_BOOTSTRAP} --log-level-stdout=INFO --log-level-canton=INFO`,
                },
                function (err) {
                    pm2.launchBus((err, bus) => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        bus.on('log:out', (packet: any) => {
                            if (packet.process.name == processName)
                                console.log(info(trimNewline(packet.data)))
                        })
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        bus.on('log:err', (packet: any) => {
                            if (packet.process.name == processName)
                                console.error(error(trimNewline(packet.data)))
                        })
                    })
                    if (err) {
                        console.error(err)
                        return pm2.disconnect()
                    }
                }
            )
        })
    } else {
        console.error(
            error(
                `Canton binary not found at ${CANTON_BIN}. Please run 'yarn script:fetch:canton' to download it.`
            )
        )
        process.exit(1)
    }
}

main()
