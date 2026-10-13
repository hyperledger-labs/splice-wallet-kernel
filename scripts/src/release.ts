// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// Generate a release for all packages. Performs a version bump and opens a PR against `main`

import { spawn } from 'child_process'
import { program } from '@commander-js/extra-typings'
import { confirm } from '@inquirer/prompts'
import { select } from 'inquirer-select-pro'

// This helper passes through the underlying command's input/output to console
async function cmd(
    command: string,
    envOverrides?: NodeJS.ProcessEnv
): Promise<void> {
    const child = spawn(command, {
        stdio: 'inherit',
        shell: true,
        env: { ...process.env, ...envOverrides },
    })

    await new Promise<void>((resolve, reject) => {
        child.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Command failed: ${command}`))
                process.exit(code)
            } else {
                resolve()
            }
        })
    })
}

async function cmdCapture(command: string): Promise<string> {
    const child = spawn(command, { shell: true })

    let stdout = ''
    let stderr = ''

    child.stdout?.on('data', (data) => {
        stdout += data.toString()
    })

    child.stderr?.on('data', (data) => {
        stderr += data.toString()
    })

    return new Promise<string>((resolve, reject) => {
        child.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Command failed: ${command}\n${stderr}`))
            } else {
                resolve(stdout + stderr)
            }
        })
    })
}

async function checkGhAuth(): Promise<void> {
    try {
        await cmdCapture('gh --version')
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
        console.error('Error: gh CLI is not installed.')
        console.error(
            'Please install gh CLI: https://cli.github.com/manual/installation'
        )
        process.exit(1)
    }

    let authOutput: string
    try {
        authOutput = await cmdCapture('gh auth status')
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
        console.error('Error: gh CLI is not authenticated.')
        console.error('Please run: gh auth login')
        process.exit(1)
    }

    if (!authOutput.includes('write:packages')) {
        console.error('Error: gh CLI token does not have write:packages scope.')
        console.error('Please run:')
        console.error('gh auth refresh -h github.com -s repo,write:packages')
        process.exit(1)
    }

    console.log('gh CLI is authenticated with required scopes')
}

async function getBaseBranch(): Promise<string> {
    const branch = await cmdCapture(`git rev-parse --abbrev-ref HEAD`).then(
        (res) => res.trim()
    )

    const validBranch = /^(main|backport\/.+)$/.test(branch)
    if (validBranch) {
        return branch
    } else {
        throw new Error(
            `Release script must run off 'main' or a backport branch. Current branch: '${branch}'`
        )
    }
}

const options = [
    'wallet-sdk',
    'dapp-sdk',
    'wallet-gateway',
    'example-portfolio',
    'tool-conformance',
]

interface ReleaseArgs {
    core: boolean
    coreMajor: string | true | undefined
    dryRun: boolean
    preid?: string | undefined
}

class ReleaseManager {
    private staleTagHash: string | undefined

    private constructor(
        private readonly dryRun: boolean,
        private readonly core: boolean,
        private readonly coreMajor: string | true | undefined,
        private readonly preid: string | undefined,
        private readonly baseBranch: string,
        private readonly releaseBranch: string
    ) {}

    static async create(args: ReleaseArgs): Promise<ReleaseManager> {
        console.log('Checking gh CLI authentication...')
        await checkGhAuth()

        const baseBranch = await getBaseBranch()

        console.log(
            `Checking out ${baseBranch} branch and pulling latest changes...`
        )
        await cmd(`git checkout ${baseBranch}`)
        await cmd('git pull')

        console.log('Fetching latest tags...')
        await cmd('git fetch --tags --force')

        const timestamp = Math.floor(Date.now() / 1000)
        const releaseBranch = `release/${timestamp}`

        let preid = args.preid

        if (!preid && baseBranch.startsWith('backport/')) {
            preid = 'backport'
            console.log(
                `Detected backport branch; defaulting to --preid=${preid}`
            )
        }

        return new ReleaseManager(
            args.dryRun,
            args.core,
            args.coreMajor,
            preid,
            baseBranch,
            releaseBranch
        )
    }

    async run(): Promise<void> {
        const { releaseCmd, affected } = this.coreMajor
            ? await this.coreMajorRelease()
            : await this.groupRelease()

        if (!this.dryRun) {
            console.log(`Creating release branch: ${this.releaseBranch}`)
            await cmd(`git checkout -b ${this.releaseBranch}`)

            console.log('Pushing branch to remote...')
            await cmd(`git push --set-upstream origin ${this.releaseBranch}`)
        }

        await this.release(releaseCmd)

        console.log('Getting current commit hash...')
        this.staleTagHash = (await cmdCapture('git rev-parse HEAD')).trim()
        console.log(`Old hash: ${this.staleTagHash}`)

        await this.createAndMergePullRequest(affected)
        await this.pushGitTags()
        await this.cleanup()
    }

    async groupRelease() {
        const groups = await select({
            canToggleAll: true,
            message: 'Select groups to release',
            options: options.map((opt) => ({ name: opt, value: opt })),
        }).catch(() => process.exit(0))

        if (groups.length === 0) {
            console.log('No release groups selected; quitting.')
            process.exit(0)
        }

        if (this.core && !groups.includes('core')) {
            groups.push('core')
        }

        let releaseCmd = ''

        if (this.preid) {
            releaseCmd += ` --specifier=prerelease --preid='${this.preid}'`
        }

        const affected = groups.join(',')
        releaseCmd += ` --groups='${affected}'`

        return { affected, releaseCmd }
    }

    async coreMajorRelease() {
        let releaseCmd = ''

        const allCorePackagesRaw = await cmdCapture(
            'pnpm ls -r --filter "./core/*" --depth -1 --json'
        )
        const allCorePackages = JSON.parse(allCorePackagesRaw) as {
            name: string
            path: string
            private: boolean
        }[]
        const corePackages = allCorePackages.filter((p) => !p.private)

        const projectOptions = new Set<{ name: string; value: string }>()
        const defaultValues = new Set<string>()

        if (typeof this.coreMajor === 'string') {
            // load a list of core packages based on git revision
            const modifiedGitFiles = (
                await cmdCapture(`git diff --name-only ${this.coreMajor}`)
            )
                .trim()
                .split('\n')
                .filter((file) => file.startsWith('core/'))
                .reduce((acc, file) => {
                    const dir = file.split('/').slice(0, 2).join('/')
                    acc.add(dir)
                    return acc
                }, new Set<string>())

            for (const file of modifiedGitFiles) {
                // Git returns the relative file path, where pnpm returned the absolute path on disk, hence we check if the pnpm path ends with the git file path.
                const pkg = corePackages.find((p) => p.path.endsWith(file))

                if (pkg) {
                    const shortName = pkg.name.replace('@canton-network/', '')
                    projectOptions.add({ name: shortName, value: pkg.name })
                    defaultValues.add(pkg.name)
                }
            }
        } else {
            // load all core packages
            for (const pkg of corePackages) {
                const shortName = pkg.name.replace('@canton-network/', '')
                projectOptions.add({ name: shortName, value: pkg.name })
            }
        }

        const projects = await select({
            canToggleAll: true,
            message: 'Select core packages to bump major versions',
            defaultValue: Array.from(defaultValues),
            options: Array.from(projectOptions),
            pageSize: Math.min(
                corePackages.length,
                (process.stdout.rows ?? 20) - 4
            ),
            theme: {
                style: {
                    renderSelectedOptions: (selected: string[]) =>
                        selected.length ? `${selected.length} selected` : '',
                },
            },
        }).catch(() => process.exit(0))

        if (projects.length === 0) {
            console.log('No core packages selected; quitting.')
            process.exit(0)
        }

        const affected = projects.join(',')
        releaseCmd += ` --specifier=major --projects='${affected}'`

        return { affected, releaseCmd }
    }

    private async release(releaseCmdArgs: string) {
        console.log(`Running release for branch: ${this.releaseBranch}`)
        let releaseCmd = `pnpm nx release --skip-publish`

        if (!this.dryRun) {
            const proceedDryRun = await confirm({
                message:
                    'Dry run is off, and this will result in real GitHub tags & releases being made. Proceed?',
                default: false,
            })

            if (!proceedDryRun) {
                console.log('Aborting')
                process.exit(0)
            }
        } else {
            releaseCmd += ' --dry-run'
        }

        releaseCmd += ` ${releaseCmdArgs}`

        if (!this.dryRun) {
            const proceedRelease = await confirm({
                message: `About to run:\n\n${releaseCmd}\n\nProceed?`,
                default: false,
            })

            if (!proceedRelease) {
                console.log('Aborting')
                process.exit(0)
            }
        }

        const ghToken = (await cmdCapture('gh auth token')).trim()
        await cmd(releaseCmd, { GITHUB_TOKEN: ghToken })
    }

    private async createAndMergePullRequest(affected: string): Promise<void> {
        if (!this.dryRun) {
            console.log('Creating PR and enabling auto-merge...')
            await cmd(
                `gh pr create --base ${this.baseBranch} --head ${this.releaseBranch} --title "chore(release): ${affected}" --body "Automated release PR for ${affected}"`
            )
            await cmd(`gh pr merge ${this.releaseBranch} --auto --squash`)
            console.log('PR created with auto-merge enabled')

            console.log('Waiting for PR to be merged...')
            let merged = false
            while (!merged) {
                await new Promise((resolve) => setTimeout(resolve, 5000)) // Wait 5 seconds
                try {
                    const prStatus = await cmdCapture(
                        `gh pr view ${this.releaseBranch} --json state,mergeCommit`
                    )
                    const status = JSON.parse(prStatus)
                    if (status.state === 'MERGED') {
                        merged = true
                        console.log('PR has been merged!')
                    } else {
                        console.log(`PR status: ${status.state}, waiting...`)
                    }
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                } catch (error) {
                    console.log('Checking PR status...')
                }
            }
        }
    }

    private async pushGitTags(): Promise<void> {
        if (!this.staleTagHash) {
            throw new Error('Stale tag hash is not set')
        }

        if (!this.dryRun) {
            console.log(
                `Checking out ${this.baseBranch} and pulling latest changes...`
            )
            await cmd(`git checkout ${this.baseBranch}`)
            await cmd('git pull')

            const newHash = (await cmdCapture('git rev-parse HEAD')).trim()
            console.log(`New hash: ${newHash}`)

            if (this.staleTagHash !== newHash) {
                console.log('Running retag to update tag references...')
                await cmd(`pnpm script:retag ${this.staleTagHash} ${newHash}`)
                console.log('Tags updated successfully')
            } else {
                console.log('Hashes are identical, no retagging needed')
            }
        }
    }

    private async cleanup(): Promise<void> {
        console.log('Cleaning up...')
        await cmd(`git checkout ${this.baseBranch}`)
        await cmd('git pull')

        const localBranchExists =
            (
                await cmdCapture(`git branch --list ${this.releaseBranch}`)
            ).trim() !== ''

        const remoteBranchExists =
            (
                await cmdCapture(
                    `git ls-remote --heads origin ${this.releaseBranch}`
                )
            ).trim() !== ''

        if (localBranchExists || remoteBranchExists) {
            let message = 'Delete the release branch?'

            if (!localBranchExists) {
                message = 'Delete the release branch (remote)?'
            } else if (!remoteBranchExists) {
                message = 'Delete the release branch (local)?'
            }

            const shouldDelete = await confirm({
                message,
                default: false,
            })

            if (shouldDelete) {
                if (localBranchExists) {
                    await cmd(`git branch -d ${this.releaseBranch}`)
                }
                if (remoteBranchExists) {
                    await cmd(`git push origin --delete ${this.releaseBranch}`)
                }
            }
        }

        console.log(`Current branch: ${this.baseBranch}`)
    }
}

program
    .option('--no-dry-run', 'Perform a real release (default: false)')
    .option('--no-core', 'Exclude core packages from release (default: false)')
    .option(
        '--core-major [rev]',
        'Perform a major release for a selection of core packages. Optionally pre-selects the set of core packages that changed in a given git revision.'
    )
    .option(
        '--preid <preid>',
        'Prerelease identifier to use (implies version specifier "prerelease"). Defaults to "backport" when releasing from a backport/** branch.'
    )
    .action(async ({ dryRun = true, core = true, preid, coreMajor }) => {
        const manager = await ReleaseManager.create({
            dryRun,
            core,
            preid,
            coreMajor,
        })
        await manager.run()
        process.exit(0)
    })
    .parseAsync(process.argv)
