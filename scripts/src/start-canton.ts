// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Start a local Canton participant using the config file in the canton/ directory.
 */

import {
    SUPPORTED_VERSIONS,
    error,
    info,
    trimNewline,
    getNetworkArg,
    Network,
    getArgValue,
} from './lib/utils.js'
import { existsSync } from 'fs'
import pm2 from 'pm2'
import path from 'path'

const processName = 'canton'

async function main() {
    const network: Network = getNetworkArg()

    const envConfig = SUPPORTED_VERSIONS[network]?.canton
    if (!envConfig) {
        console.error(
            error(
                `Unsupported canton version ${network}. Please use "mainnet" or "devnet. If no argument is supplied, will use mainnet as a default"`
            )
        )
        process.exit(1)
    }

    const networkDir = path.resolve(`canton/${network}`)
    const inputCantonConf2 =
        getArgValue('config') ?? path.join(networkDir, 'canton.conf')

    const cantonBootstrap = path.join(networkDir, 'bootstrap.sc')

    console.log(
        info(
            `usinng bootstrap: ${cantonBootstrap} and conf ${inputCantonConf2}`
        )
    )

    const { version } = envConfig

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
                    args: `daemon --no-tty --config ${inputCantonConf2} --bootstrap ${cantonBootstrap} --log-level-stdout=INFO --log-level-canton=INFO`,
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
