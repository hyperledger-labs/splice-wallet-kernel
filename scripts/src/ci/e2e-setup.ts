// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { execFileSync } from 'node:child_process'
import { appendFileSync } from 'node:fs'
import { Command } from '@commander-js/extra-typings'
import versionConfig from '../lib/version-config.json' with { type: 'json' }

type Environment = {
    network: 'devnet' | 'mainnet'
    instance: 'canton' | 'localnet'
}

type Suite = {
    name: string
    project: string
    environments: Environment[]
    databases?: ('sqlite' | 'postgres')[]
}

const suites: Suite[] = [
    {
        name: 'ping',
        project: '@canton-network/example-ping',
        environments: [
            { network: 'devnet', instance: 'canton' },
            { network: 'mainnet', instance: 'canton' },
        ],
        databases: ['sqlite', 'postgres'],
    },
    {
        name: 'extension',
        project: '@canton-network/wallet-gateway-extension',
        environments: [{ network: 'devnet', instance: 'canton' }],
    },
    {
        name: 'portfolio',
        project: '@canton-network/example-portfolio',
        environments: [
            { network: 'devnet', instance: 'localnet' },
            { network: 'mainnet', instance: 'localnet' },
        ],
    },
    {
        name: 'sdk-examples',
        project: 'docs-wallet-integration-guide-examples',
        environments: [
            { network: 'devnet', instance: 'localnet' },
            { network: 'mainnet', instance: 'localnet' },
        ],
    },
]

function selectE2e(projects: string[]): Record<string, string> {
    const selections = suites.map((suite) => ({
        ...suite,
        environments: projects.includes(suite.project)
            ? suite.environments.map((environment) => {
                  const versions =
                      versionConfig.SUPPORTED_VERSIONS[environment.network]
                  return {
                      ...environment,
                      canton_version: versions.canton.version,
                      splice_version: versions.splice.version,
                  }
              })
            : [],
    }))
    const environments = selections.flatMap((suite) => suite.environments)
    const hydration = environments.filter(
        (environment, index) =>
            environments.findIndex(
                (candidate) =>
                    candidate.network === environment.network &&
                    candidate.instance === environment.instance
            ) === index
    )

    const outputs: Record<string, string> = {
        daml_release_version: versionConfig.DAML_RELEASE_VERSION,
        versions: JSON.stringify(versionConfig.SUPPORTED_VERSIONS),
        hydrate: String(hydration.length > 0),
        'hydrate-matrix': JSON.stringify({ include: hydration }),
    }
    for (const suite of selections) {
        outputs[suite.name] = String(suite.environments.length > 0)
        outputs[`${suite.name}-matrix`] = JSON.stringify({
            include: suite.environments.flatMap((environment) =>
                suite.databases
                    ? suite.databases.map((db) => ({ ...environment, db }))
                    : [environment]
            ),
        })
    }
    return outputs
}

function main(): void {
    const program = new Command()
        .option('--base <ref>', 'Git base ref for affected selection')
        .option('--head <ref>', 'Git head ref for affected selection')
        .parse()
    const { base, head } = program.opts()
    if ((base === undefined) !== (head === undefined)) {
        program.error('--base and --head must be supplied together')
    }
    if (base === '' || head === '') {
        program.error('--base and --head must not be empty')
    }
    const args = [
        'nx',
        'show',
        'projects',
        '--with-target=playwright:e2e,snippets',
        '--json',
    ]
    if (base && head) {
        args.push('--affected', `--base=${base}`, `--head=${head}`)
    }
    const projects: unknown = JSON.parse(
        execFileSync('pnpm', args, {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'inherit'],
        })
    )
    if (
        !Array.isArray(projects) ||
        !projects.every(
            (project): project is string => typeof project === 'string'
        )
    ) {
        throw new Error('Expected Nx to return an array of project names')
    }

    const mappedProjects = new Set(suites.map((suite) => suite.project))
    const unmappedProjects = projects.filter(
        (project) => !mappedProjects.has(project)
    )
    if (unmappedProjects.length > 0) {
        throw new Error(
            `E2E projects missing suite configuration: ${unmappedProjects.join(', ')}`
        )
    }

    console.log('Parsed e2e projects:', projects)
    const outputs = selectE2e(projects)
    const content = Object.entries(outputs)
        .map(([key, value]) => `${key}=${value}\n`)
        .join('')
    process.stdout.write(content)
    if (process.env.GITHUB_OUTPUT) {
        appendFileSync(process.env.GITHUB_OUTPUT, content)
    }
}

main()
