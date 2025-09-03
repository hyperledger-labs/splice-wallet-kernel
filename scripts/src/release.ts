// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
// Generate a release for all packages. Performs a version bump and opens a PR against `main`
import { promisify } from 'util'
import { exec, spawn } from 'child_process'
import readline from 'readline'

const ex = promisify(exec)

async function cmd(command: string): Promise<void> {
    const [bin, ...args] = command.split(' ')
    const child = spawn(bin, args, { stdio: 'inherit', shell: true })

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

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
})

async function main() {
    await checkGit()
    await checkGitHubCli()
    await checkBranchIsReady()

    rl.question(
        'This will push new version tags to git for all packages, and open a release PR. Continue? (y/n) ',
        (answer) => {
            if (answer.toLowerCase() !== 'y') {
                console.log('Release cancelled')
                rl.close()
                return
            }
            runRelease()
            rl.close()
        }
    )
}

async function runRelease() {
    const branch = `release/${Date.now()}`

    await cmd(`git checkout -b ${branch}`)
    await cmd(`git push --set-upstream origin ${branch}`)
    await cmd(`yarn nx release --skip-publish`)
    await cmd(`gh pr create --fill --base main --head ${branch}`)
}

async function checkGitHubCli() {
    return ex('gh --version').catch(() => {
        console.error('GitHub CLI is not installed')
        process.exit(1)
    })
}

async function checkGit() {
    return ex('git --version').catch(() => {
        console.error('Git is not installed')
        process.exit(1)
    })
}

async function checkBranchIsReady() {
    const { stdout: branch } = await ex('git branch --show-current')

    if (branch.trim() !== 'main') {
        console.error(
            `You must be on the main branch to release (detected branch: ${branch.trim()})`
        )
        process.exit(1)
    }

    const { stdout: count } = await ex('git rev-list --count HEAD..origin/main')

    if (count.trim() !== '0') {
        console.error(
            'Your branch may be behind the remote, run `git pull` to update it'
        )
        process.exit(1)
    }

    const { stdout: porcelain } = await ex('git status --porcelain')

    if (porcelain.trim()) {
        console.error('Git working directory is not clean:')
        console.error(porcelain)
        process.exit(1)
    }
}

main()
