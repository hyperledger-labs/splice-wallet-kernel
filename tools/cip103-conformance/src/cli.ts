// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { Command, InvalidArgumentError } from 'commander'
import {
    readArtifact,
    signArtifact,
    toBadgeData,
    verifyArtifactSignature,
    writeArtifact,
} from './artifact'
import { runConformance } from './runner'
import {
    ProfileSchema,
    ProviderConfigSchema,
    type ProviderConfig,
} from './schemas'

function asProfile(value: string): 'sync' | 'async' {
    const parsed = ProfileSchema.safeParse(value)
    if (!parsed.success) {
        throw new InvalidArgumentError(
            `Invalid profile '${value}'. Use 'sync' or 'async'.`
        )
    }
    return parsed.data
}

function nonEmpty(value: string, optionName: string): string {
    const trimmed = value.trim()
    if (!trimmed) {
        throw new InvalidArgumentError(`${optionName} cannot be empty.`)
    }
    return trimmed
}

function toPath(value: string): string {
    return nonEmpty(value, 'Path')
}

async function readProviderConfig(path: string): Promise<ProviderConfig> {
    const raw = await readFile(resolve(process.cwd(), path), 'utf8')
    return ProviderConfigSchema.parse(JSON.parse(raw))
}

async function runCommand(options: {
    profile: 'sync' | 'async'
    providerConfig: string
    out: string
    signingKey?: string
    keyId?: string
}): Promise<void> {
    if (options.keyId && !options.signingKey) {
        throw new Error('--key-id requires --signing-key.')
    }

    const provider = await readProviderConfig(options.providerConfig)
    let artifact = await runConformance(options.profile, provider)
    if (options.signingKey) {
        artifact = await signArtifact(
            artifact,
            options.signingKey,
            options.keyId
        )
    }

    await writeArtifact(options.out, artifact)
    console.log(
        `Conformance completed: ${artifact.summary.status.toUpperCase()} (${artifact.summary.passed}/${artifact.summary.total})`
    )
    console.log(`Artifact written: ${options.out}`)
    if (artifact.summary.status !== 'pass') {
        process.exitCode = 1
    }
}

async function validateArtifactCommand(options: {
    artifact: string
    publicKey?: string
    requireSignature: boolean
}): Promise<void> {
    const artifact = await readArtifact(options.artifact)
    if (options.requireSignature && !artifact.signature) {
        throw new Error(
            'Artifact does not contain a signature. Use a signed artifact.'
        )
    }

    if (!options.publicKey) {
        console.log(
            `Artifact is valid (unsigned check): ${artifact.summary.status.toUpperCase()}`
        )
        return
    }
    const ok = await verifyArtifactSignature(artifact, options.publicKey)
    if (!ok) {
        throw new Error('Signature validation failed.')
    }
    console.log('Artifact + signature validation succeeded.')
}

async function exportBadgeCommand(options: {
    artifact: string
    out: string
}): Promise<void> {
    const artifact = await readArtifact(options.artifact)
    const badge = toBadgeData(artifact)
    const absoluteOut = resolve(process.cwd(), options.out)
    await writeFile(absoluteOut, `${JSON.stringify(badge, null, 2)}\n`, 'utf8')
    console.log(`Badge exported: ${options.out}`)
}

async function main(): Promise<void> {
    const program = new Command()
        .name('conformance-cli')
        .description('CIP-103 sync/async conformance runner')
        .showSuggestionAfterError(true)
        .showHelpAfterError()

    program
        .command('run')
        .description('Run conformance checks against a provider endpoint')
        .requiredOption(
            '--profile <profile>',
            "Conformance profile: 'sync' or 'async'",
            asProfile
        )
        .requiredOption(
            '--provider-config <file>',
            'Provider config JSON file path',
            toPath
        )
        .option(
            '--out <file>',
            'Output path for conformance artifact',
            'dist/conformance/result.json'
        )
        .option(
            '--signing-key <pem>',
            'Optional Ed25519 private key (PEM) path',
            toPath
        )
        .option(
            '--key-id <id>',
            'Optional key identifier to include in the artifact',
            toPath
        )
        .action(runCommand)

    program
        .command('validate-artifact')
        .description(
            'Validate a conformance artifact (and signature if provided)'
        )
        .requiredOption('--artifact <file>', 'Artifact JSON path', toPath)
        .option(
            '--public-key <pem>',
            'Optional Ed25519 public key (PEM) path',
            toPath
        )
        .option(
            '--require-signature',
            'Fail when artifact has no signature (use for CI ingestion checks)',
            false
        )
        .action(validateArtifactCommand)

    program
        .command('export-badge')
        .description('Export badge JSON from a conformance artifact')
        .requiredOption('--artifact <file>', 'Artifact JSON path', toPath)
        .option(
            '--out <file>',
            'Output path for badge JSON',
            'dist/conformance/badge.json'
        )
        .action(exportBadgeCommand)

    await program.parseAsync(process.argv)
}

void main()
