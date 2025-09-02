// Generate a release for all packages. Performs a version bump and opens a PR against `latest`

import { promisify } from 'util'
import { exec, spawn } from 'child_process'
import readline from 'readline'

const ex = promisify(exec)

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
    await ex(`git checkout -b ${branch}`)

    const pr = spawn(
        'gh',
        [
            'pr',
            'create',
            '--base',
            'main',
            '--head',
            branch,
            '--title',
            'chore: release',
            '--body',
            'Release PR',
        ],
        { stdio: ['inherit', 'pipe', 'inherit'] }
    )

    pr.on('close', (code) => {
        if (code !== 0) {
            console.error(`PR creation failed with code ${code}`)
            process.exit(code)
        }

        const cmd = spawn(
            'yarn',
            ['nx', 'release', '--dry-run', '--skip-publish'],
            { stdio: 'inherit' }
        )

        cmd.on('close', (code) => {
            console.log(`child process exited with code ${code}`)
            process.exit(code)
        })
    })
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

    if (branch !== 'main') {
        console.error('You must be on the main branch to release')
        process.exit(1)
    }

    const { stdout: count } = await ex('git rev-list --count HEAD..origin/main')

    if (count !== '0') {
        console.error(
            'Your branch may be behind the remote, run `git pull` to update it'
        )
        process.exit(1)
    }

    const { stdout: porcelain } = await ex('git status --porcelain')

    if (porcelain) {
        console.error('Git working directory is not clean:')
        console.error(porcelain)
        process.exit(1)
    }
}

main()
