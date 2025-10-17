// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { exec as ex } from 'child_process'
import { promisify } from 'util'
import readline from 'readline'
import { elideMiddle, mapObject, success } from './lib/utils.js'
import { bold, cyan } from 'yoctocolors'

const exec = promisify(ex)

/**
 * This script allows someone to retag a release to a different commit on GitHub.
 * It takes a commit SHA pointing to a release and ensures that the corresponding tags match that commit.
 * If they don't, it deletes the old tags and creates new ones pointing to the provided commit.
 *
 * The script is idempotent. If the tags are already corrected, it will do nothing.
 */
async function main() {
    const hash = process.argv[2]

    if (!hash) {
        console.error('Usage: yarn script:retag <commit-sha>')
        process.exit(1)
    }

    console.log(`Retagging release tags to commit ${bold(hash)}`)

    const { stdout: commitMessage } = await exec(
        `git rev-list --format=%B --max-count=1 ${hash}`
    )

    if (!commitMessage.includes('chore(release): publish'))
        throw new Error('Provided commit is not a release commit')

    const tags = parseTagsFromCommit(commitMessage)

    if (tags.length === 0)
        throw new Error('No tags found in the provided commit message')

    const preview: TagPreview = {}

    for (const tag of tags) {
        const current = await currentTagCommit(tag)
        preview[tag] = { current, target: hash }
    }

    console.log('The following tags will be moved:')
    console.table(
        mapObject(preview, (k, v) => [
            k.replace('@canton-network/', ''),
            {
                current: elideMiddle(v.current, 26),
                target: elideMiddle(v.target, 26),
            },
        ])
    )

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    })

    const answer = await new Promise<string>((resolve) => {
        rl.question(
            'Do you want to apply new target commit to these tags? (y/N) ',
            resolve
        )
    })

    rl.close()

    if (answer.toLowerCase() !== 'y') {
        console.log('Aborting')
        process.exit(0)
    }

    for (const [tag, { current, target }] of Object.entries(preview)) {
        if (current === target) {
            console.log(
                `Tag ${success(tag)} is already at the target commit, skipping`
            )
            continue
        }

        console.log(
            `Moving tag ${success(tag)} from ${cyan(current)} to ${success(target)}`
        )

        await exec(`git tag -f ${tag} ${target}`)
        await exec(`git push -f origin ${tag}`)

        console.log(success(`Tag ${tag} moved successfully`))
    }

    console.log('\n' + bold(success('All tags moved successfully')))
}

type TagPreview = Record<string, { current: string; target: string }>

function parseTagsFromCommit(message: string): string[] {
    return message
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.startsWith('- project:'))
        .map((line) => line.replace('- project: ', '').trim())
        .map((line) => line.split(' ').join('@'))
}

async function currentTagCommit(tag: string) {
    const currentSha = (await exec(`git rev-list -n 1 ${tag}`)).stdout.trim()

    if (!currentSha) {
        throw new Error(
            `Tag ${tag} was not found in the repo. Ensure you've ran 'git fetch --tags --force' first. Otherwise, there may have been an issue with the release.`
        )
    }

    return currentSha
}

main()
