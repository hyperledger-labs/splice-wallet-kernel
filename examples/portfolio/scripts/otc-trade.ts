// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { OTCTrade } from '@canton-network/core-wallet-test-utils'
import { pino } from 'pino'
import * as readline from 'node:readline'

const logger = pino({ name: 'otc-trade', level: 'info' })

export function prompt(question: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    })

    logger.info({ prompt: question })
    return new Promise((resolve) => {
        rl.question('', (answer) => {
            rl.close()
            resolve(answer)
        })
    })
}

const venue = await prompt('Party ID for Venue')
const alice = await prompt('Party ID for Alice')
const bob = await prompt('Party ID for Bob')

const tradeHelper = new OTCTrade({
    logger,
    venue,
    alice,
    bob,
})

const tradeDetails = await tradeHelper.setup()

await prompt('Please type yes once both parties have made their allocations')

await tradeHelper.settle(tradeDetails)
