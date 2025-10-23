// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import zlib from 'zlib'
import { pipeline } from 'stream/promises'
import crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import * as process from 'process'
import { white, green, italic, red, yellow, bold } from 'yoctocolors'
import * as jsonc from 'jsonc-parser'
import * as tar from 'tar-fs'

export const info = (message: string): string => italic(white(message))
export const warn = (message: string): string => bold(yellow(message))
export const error = (message: string): string => bold(red(message))
export const success = (message: string): string => green(message)
export const trimNewline = (message: string): string =>
    message.replace(/\n$/, '')

const repoRoot = getRepoRoot()
export const CANTON_PATH = path.join(repoRoot, '.canton')
export const SPLICE_PATH = path.join(repoRoot, '.splice')
export const SPLICE_SPEC_PATH = path.join(repoRoot, '.splice-spec')
export const CANTON_BIN = path.join(CANTON_PATH, 'bin/canton')
export const CANTON_CONF = path.join(repoRoot, 'canton/canton.conf')
export const CANTON_BOOTSTRAP = path.join(repoRoot, 'canton/bootstrap.canton')
export const API_SPECS_PATH = path.join(repoRoot, 'api-specs')
export const UTILS_FILE_PATH = path.join(repoRoot, 'scripts/src/lib/utils.ts')

export type CantonVersionAndHash = {
    version: string
    hash: string
}
// Canton versions
export const DAML_RELEASE_VERSION = '3.3.0-snapshot.20251015.16130.0.v0ac138a0'

export const LOCALNET_ARCHIVE_HASH =
    '49c40f4caaeb46e03839a9da93343e6e3e13f7611705066e77ce8d02ffb62665'
export const SPLICE_ARCHIVE_HASH =
    '368e0ea676b7bf2490d3f0003ce7ff58caddab78756057100977695a57170f50'
export const SPLICE_SPEC_ARCHIVE_HASH =
    'f17b553a29ea58f184a67998e08bd9062cdaff7faa2ed11609adc71934566c2e'
export const CANTON_ARCHIVE_HASH =
    '43c89d9833886fc68cac4951ba1959b7f6cc5269abfff1ba5129859203aa8cd3'
export const SPLICE_VERSION = '0.4.22'

export const SUPPORTED_VERSIONS = {
    devnet: {
        canton: {
            version: '3.4.0-snapshot.20250922.16951.0.v1eb3f268',
            hash: 'e0f59a7b5015b56479ef4786662c5935a0fee9ac803465bb0f70bdc6c3bf4dff',
        },
    },
    mainnet: {
        canton: {
            version: '3.3.0-snapshot.20250910.16087.0.v82d35a4d',
            hash: '43c89d9833886fc68cac4951ba1959b7f6cc5269abfff1ba5129859203aa8cd3',
        },
    },
}

export async function downloadToFile(
    url: string | URL,
    directory: string,
    hash?: string
) {
    const filename = path.basename(url.toString())
    const res = await fetch(url)
    if (!res.ok || !res.body) {
        throw new Error(`Failed to download: ${url}`)
    }
    await ensureDir(directory)
    await pipeline(
        res.body,
        fs.createWriteStream(path.join(directory, filename))
    )

    if (hash) {
        await verifyFileIntegrity(
            path.join(directory, filename),
            hash,
            'sha256'
        )
    }
}

export async function verifyFileIntegrity(
    filePath: string,
    expectedHash: string,
    algo = 'sha256'
): Promise<boolean> {
    if (!fs.existsSync(filePath)) {
        return false
    }
    const computedHash = await computeFileHash(filePath, algo)

    if (computedHash === expectedHash) {
        console.log(
            success(
                `${algo.toUpperCase()} checksum verification of ${filePath} successful.`
            )
        )
    } else {
        console.log(
            error(
                `File hashes did not match.\n\tExpected: ${expectedHash}\n\tReceived: ${computedHash}\nDeleting ${filePath}...`
            )
        )
        //process.exit(1)
    }

    return true
}

async function computeFileHash(
    filePath: string,
    algo = 'sha256'
): Promise<string> {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash(algo)
        const stream = fs.createReadStream(filePath)

        stream.on('data', (chunk) => hash.update(chunk))
        stream.on('end', () => {
            const computedHash = hash.digest('hex')
            resolve(computedHash)
        })
        stream.on('error', (err) => reject(err))
    })
}

export async function downloadAndUnpackTarball(
    url: string,
    tarfile: string,
    unpackDir: string,
    options?: { hash?: string; strip?: number; updateHash?: boolean }
) {
    let shouldDownload = true
    let currentHash = options?.hash
    const algo = 'sha256'

    ensureDir(path.dirname(tarfile))
    ensureDir(path.dirname(unpackDir))

    if (fs.existsSync(tarfile) && options?.hash) {
        // File exists, check hash
        const validFile = await verifyFileIntegrity(tarfile, options.hash, algo)
        shouldDownload = !validFile
    }

    if (shouldDownload) {
        console.log(info(`Downloading tarball from ${url} to ${tarfile}...`))
        const res = await fetch(url)
        if (!res.ok || !res.body) {
            throw new Error(`Failed to download: ${url}`)
        }
        await pipeline(res.body, fs.createWriteStream(tarfile))
        console.log(success('Download complete.'))
    }

    if (options?.updateHash) {
        const newHash = await computeFileHash(tarfile, algo)

        // Update the hash in utils.ts if present
        const fileContent = fs.readFileSync(UTILS_FILE_PATH, 'utf8')
        // Find the old hash in the file (matching the old value)
        if (options?.hash && fileContent.includes(options.hash)) {
            const updatedContent = fileContent.replace(options.hash, newHash)
            if (updatedContent !== fileContent) {
                fs.writeFileSync(UTILS_FILE_PATH, updatedContent, 'utf8')
                console.log(success(`Updated hash in utils.ts to ${newHash}`))
            }
        } else {
            console.log(
                warn('Old hash not found in utils.ts, no update performed.')
            )
        }

        currentHash = newHash
    }

    if (!options?.updateHash && currentHash) {
        const validFile = await verifyFileIntegrity(tarfile, currentHash, algo)

        const downloadedHash = crypto
            .createHash(algo)
            .update(fs.readFileSync(tarfile))
            .digest('hex')
        if (!validFile) {
            // Remove the bad file
            throw new Error(
                error(
                    `Checksum mismatch for downloaded tarball.\n\tExpected: ${currentHash}\n\tReceived: ${downloadedHash}`
                )
            )
        }
    }

    await ensureDir(unpackDir)
    await pipeline(
        fs.createReadStream(tarfile),
        zlib.createGunzip(),
        tar.extract(unpackDir, { strip: options?.strip ?? 1 })
    )
    console.log(success(`Unpacked tarball into ${unpackDir}`))
}
// Get the root of the current repository
// Assumption: the root of the repository is the closest
//     ancestor directory of the CWD that contains a .git directory
export function getRepoRoot(): string {
    const cwd = process.cwd()
    const segments = cwd.split('/')

    for (let i = segments.length; i > 0; i--) {
        const potentialRoot = segments.slice(0, i).join('/')
        if (fs.existsSync(path.join(potentialRoot, '.git'))) {
            return potentialRoot
        }
    }

    console.error(
        error(`${cwd} does not seem to be inside a valid git repository.`)
    )
    process.exit(1)
}

export function findJsonKeyPosition(
    jsonContent: string,
    key: string
): { line: number; column: number } {
    const keyPath = key.split('.')
    let found: { line: number; column: number } | null = null

    function search(node: jsonc.Node, pathIdx: number) {
        if (!node || found) return
        if (node.type === 'object') {
            for (const prop of node.children ?? []) {
                if (prop.type === 'property' && prop.children?.[0]?.value) {
                    const propName = prop.children[0].value as string
                    const isLast = pathIdx === keyPath.length - 1
                    const matches = isLast
                        ? propName.startsWith(keyPath[pathIdx])
                        : propName === keyPath[pathIdx]
                    // If matches, advance pathIdx
                    if (matches) {
                        if (isLast) {
                            const offset = prop.children[0].offset
                            const before = jsonContent.slice(0, offset)
                            const lines = before.split('\n')
                            found = {
                                line: lines.length,
                                column: lines[lines.length - 1].length + 1,
                            }
                            return
                        } else if (prop.children[1]) {
                            search(prop.children[1], pathIdx + 1)
                        }
                    }
                    // Always search deeper with the same pathIdx (skip intermediate keys)
                    if (prop.children[1]) {
                        search(prop.children[1], pathIdx)
                    }
                }
            }
        } else if (node.type === 'array') {
            for (const child of node.children ?? []) {
                search(child, pathIdx)
            }
        }
    }

    const root = jsonc.parseTree(jsonContent)
    if (root) search(root, 0)

    return found ?? { line: 1, column: 1 }
}

export function traverseDirectory(
    directory: string,
    callback: (filePath: string) => void
): void {
    const entries = fs.readdirSync(directory)
    for (const entry of entries) {
        const fullPath = path.join(directory, entry)
        if (fs.statSync(fullPath).isDirectory()) {
            traverseDirectory(fullPath, callback)
        } else {
            callback(fullPath)
        }
    }
}

// Recursively get all files with a given extension
export function getAllFilesWithExtension(
    dir: string,
    ext?: string,
    recursive = true
): string[] {
    let results: string[] = []
    const list = fs.readdirSync(dir)
    for (const file of list) {
        const filePath = path.join(dir, file)
        const stat = fs.statSync(filePath)
        if (stat && stat.isDirectory()) {
            if (recursive) {
                results = results.concat(
                    getAllFilesWithExtension(filePath, ext, true)
                )
            }
        } else if (ext === undefined || filePath.endsWith(ext)) {
            results.push(filePath)
        }
    }
    return results
}

// Ensure a directory exists
export async function ensureDir(dir: string) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
    }
}

// Copy a file
export async function copyFileRecursive(src: string, dest: string) {
    fs.copyFileSync(src, dest)
}

export type markingLevel = 'info' | 'warn' | 'error'
export function markFile(
    relativePath: string,
    fileContent: string,
    key: string,
    warning: string,
    markingLevel: markingLevel
): void {
    const typePosition = findJsonKeyPosition(fileContent, key)
    const line = typePosition.line || 1
    const column = typePosition.column || 1
    if (markingLevel === 'error') {
        console.error(
            `::error file=${relativePath},line=${line},col=${column}::${warning}`
        )
    } else if (markingLevel === 'warn') {
        console.warn(
            `::warning file=${relativePath},line=${line},col=${column}::${warning}`
        )
    } else if (markingLevel === 'info') {
        console.info(
            `::info file=${relativePath},line=${line},col=${column}::${warning}`
        )
    }
}

/**
 * Maps over the keys and values of an object, allowing transformation of both.
 *
 * @param obj object to map over
 * @param mapFn mapping function, which can return either a new value directly (no key change), or a [newKey, newValue] tuple
 * @returns a new object with the mapped keys and values
 */
export function mapObject<V>(
    obj: Record<string, V>,
    mapFn: (k: string, v: V) => V | [string, V]
): Record<string, V> {
    return Object.fromEntries(
        Object.entries(obj).map(([k, v]) => {
            const mapped = mapFn(k, v)
            return Array.isArray(mapped) ? mapped : [k, mapped]
        })
    )
}

/**
 * Elides a string by replacing the middle portion with an ellipsis.
 *
 * @param s string to elide
 * @param len the length of the elided middle portion (default: 8)
 * @returns the elided string
 */
export function elideMiddle(s: string, len = 8) {
    const elider = '...'
    const totalLen = s.length

    if (totalLen <= len) return s
    if (len <= elider.length) return s

    const halfway = Math.floor(totalLen / 2)

    return (
        s.slice(0, halfway - Math.floor(len / 2)) +
        elider +
        s.slice(halfway + Math.floor(len / 2))
    )
}
