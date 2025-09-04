// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Start a local Canton participant using the config file in the canton/ directory.
 */

import {
    CANTON_BIN,
    CANTON_BOOTSTRAP,
    CANTON_CONF,
    error,
    info,
    trimNewline,
} from './utils.js'
import { existsSync } from 'fs'
import pm2 from 'pm2'

const processName = 'canton'
async function main() {
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
