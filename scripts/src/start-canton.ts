/**
 * Start a local Canton participant using the config file in the canton/ directory.
 */

import { CANTON_BIN, CANTON_CONF, error, info } from './utils.js'
import { existsSync } from 'fs'
import pm2 from 'pm2'

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
                    name: 'canton',
                    interpreter: '/bin/bash',
                    script: CANTON_BIN,
                    args: '--no-tty --config ' + CANTON_CONF,
                },
                function (err) {
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
