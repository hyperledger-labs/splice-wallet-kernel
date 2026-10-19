#!/usr/bin/env node
// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Command } from 'commander'
import { loadCommandOptions } from './cli-config.ts'
import {
    readArtifact,
    readSignature,
    signArtifact,
    verifyArtifactSignature,
    writeSignature,
} from './artifact.ts'
import { runHarness, serveApp } from './harness.ts'
import { runPassed } from '@canton-network/tool-conformance-dapp'

const program = new Command()
    .name('conformance-cli')
    .description('CIP-103 conformance tests')

program
    .command('serve')
    .description('Serve the bundled conformance dApp')
    .option('--config <file>', 'Shared JSON configuration (serve section)')
    .action(async ({ config }: { config?: string }) => {
        const server = await serveApp(await loadCommandOptions('serve', config))
        console.log(server.url)
    })

program
    .command('run')
    .description('Run tests in the bundled browser dApp using playwright')
    .option('--config <file>', 'Shared JSON configuration (run section)')
    .action(async ({ config }: { config?: string }) => {
        const options = await loadCommandOptions('run', config)
        const report = await runHarness(options)
        const summary = report.results.summary
        console.log(
            `${summary.passed} passed, ${summary.failed} failed, ${summary.skipped} skipped. Report: ${options.out}`
        )
        if (!runPassed(report)) process.exitCode = 1
    })

program
    .command('verify')
    .description('Validate CTRF structure and verify its detached signature')
    .option('--config <file>', 'Shared JSON configuration (verify section)')
    .action(async ({ config }: { config?: string }) => {
        const options = await loadCommandOptions('verify', config)
        const report = await readArtifact(options.artifact)
        const signaturePath =
            options.artifactSignature === undefined
                ? `${options.artifact}.sig`
                : options.artifactSignature
        if (signaturePath) {
            const signature = await readSignature(signaturePath)
            if (
                !(await verifyArtifactSignature(
                    report,
                    signature,
                    options.publicKey
                ))
            )
                throw new Error('Signature verification failed')
            console.log(
                options.publicKey
                    ? 'CTRF and tester signature verified; this is not independent certification.'
                    : 'CTRF and signature verified against the embedded public key. Signer identity is not trusted; this is not independent certification.'
            )
        } else console.log('CTRF structure validated. Signature not verified.')
    })

program
    .command('sign')
    .description('Sign an existing CTRF report, writing a detached .sig file')
    .option('--config <file>', 'Shared JSON configuration (sign section)')
    .action(async ({ config }: { config?: string }) => {
        const options = await loadCommandOptions('sign', config)
        const signature = await signArtifact(
            await readArtifact(options.artifact),
            options.signingKey
        )
        await writeSignature(
            options.out ?? `${options.artifact}.sig`,
            signature
        )
    })

await program.parseAsync()
