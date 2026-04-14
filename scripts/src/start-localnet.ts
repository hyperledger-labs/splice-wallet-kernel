// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { execFileSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import {
    getRepoRoot,
    getNetworkArg,
    hasFlag,
    SUPPORTED_VERSIONS,
} from './lib/utils.js'

const args = process.argv.slice(2)
const command = args[0]

const rootDir = getRepoRoot()
const LOCALNET_DIR = path.join(rootDir, '.localnet/docker-compose/localnet')
const GENERATED_COMPOSE_OVERRIDE = path.join(
    rootDir,
    '.temp/start-localnet.override.yaml'
)

const CANTON_MAX_COMMANDS_IN_FLIGHT = 256

// ── Profile selection ──────────────────────────────────────
// Default profiles are the minimum set needed: sv, app-provider, app-user.
// Pass --profile <name> (repeatable) to override, or --multi-sync to add the
// multi-sync profile on top of the defaults.
//
// Examples:
//   tsx start-localnet.ts start                          # default (sv, app-provider, app-user)
//   tsx start-localnet.ts start --multi-sync             # default + multi-sync
//   tsx start-localnet.ts start --profile sv --profile app-user  # only sv and app-user

const DEFAULT_PROFILES = ['sv', 'app-provider', 'app-user']

function getRequestedProfiles(): string[] {
    // Collect all --profile=<value> or --profile <value> arguments
    const explicit: string[] = []
    for (let i = 0; i < args.length; i++) {
        const a = args[i]
        if (a.startsWith('--profile=')) {
            explicit.push(a.slice('--profile='.length))
        } else if (a === '--profile' && i + 1 < args.length) {
            explicit.push(args[++i])
        }
    }

    if (explicit.length > 0) {
        // When explicit profiles are given, use exactly those
        if (hasFlag('multi-sync') && !explicit.includes('multi-sync')) {
            explicit.push('multi-sync')
        }
        return explicit
    }

    // No explicit profiles → use defaults, optionally adding multi-sync
    const profiles = [...DEFAULT_PROFILES]
    if (hasFlag('multi-sync')) {
        profiles.push('multi-sync')
    }
    return profiles
}

const profiles = getRequestedProfiles()

function ensureComposeOverride() {
    fs.mkdirSync(path.dirname(GENERATED_COMPOSE_OVERRIDE), { recursive: true })
    fs.writeFileSync(
        GENERATED_COMPOSE_OVERRIDE,
        [
            'services:',
            '  canton:',
            '    environment:',
            '      ADDITIONAL_CONFIG_MAX_COMMANDS_IN_FLIGHT: |-',
            `        canton.participants.app-provider.ledger-api.command-service.max-commands-in-flight = ${CANTON_MAX_COMMANDS_IN_FLIGHT}`,
            `        canton.participants.app-user.ledger-api.command-service.max-commands-in-flight = ${CANTON_MAX_COMMANDS_IN_FLIGHT}`,
            `        canton.participants.sv.ledger-api.command-service.max-commands-in-flight = ${CANTON_MAX_COMMANDS_IN_FLIGHT}`,
            '',
        ].join('\n'),
        'utf8'
    )
}

const profileArgs = profiles.flatMap((p) => ['--profile', p])

const composeBase = [
    'docker',
    'compose',
    '--env-file',
    `${LOCALNET_DIR}/compose.env`,
    '--env-file',
    `${LOCALNET_DIR}/env/common.env`,
    '-f',
    `${LOCALNET_DIR}/compose.yaml`,
    '-f',
    `${LOCALNET_DIR}/resource-constraints.yaml`,
    '-f',
    GENERATED_COMPOSE_OVERRIDE,
    ...profileArgs,
]

const network = getNetworkArg()
const spliceVersion = SUPPORTED_VERSIONS[network].splice.version

// Set IMAGE_TAG env variable to SPLICE_VERSION
const env = { ...process.env, IMAGE_TAG: spliceVersion }

ensureComposeOverride()

console.log(`Profiles: ${profiles.join(', ')}`)
const startTime = Date.now()

if (command === 'start') {
    execFileSync(composeBase[0], [...composeBase.slice(1), 'up', '-d'], {
        stdio: 'inherit',
        env,
    })
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(
        `Localnet started in ${elapsed}s (profiles: ${profiles.join(', ')})`
    )
} else if (command === 'stop') {
    execFileSync(composeBase[0], [...composeBase.slice(1), 'down', '-v'], {
        stdio: 'inherit',
        env,
    })
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`Localnet stopped in ${elapsed}s`)
} else {
    console.error(
        'Usage: start-localnet.ts <start|stop> [--multi-sync] [--profile <name>...]'
    )
    process.exit(1)
}
