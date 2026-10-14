// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// Shared by the docs sync scripts (docs-sync/): the manifest of paired pages
// and the mapping between cf-docs site paths and wallet repository paths.

import fs from 'node:fs'
import path from 'node:path'
import { getRepoRoot } from './utils.js'

export type DocsSyncManifest = {
    remote: string
    siteBaseUrl: string
    pages: { wallet: string; cf: string }[]
}

export function loadManifest(): DocsSyncManifest {
    const manifestPath = path.join(getRepoRoot(), 'docs', 'docs-sync.json')
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
}

// cf-docs page file -> its site path, '/sdks-tools/foo/bar'
export function sitePathOf(cfFile: string): string {
    return '/' + cfFile.replace(/^docs-main\//, '').replace(/\.mdx?$/, '')
}

// '/sdks-tools/foo/bar' -> wallet repo path (relative to the repo root)
export function buildLinkMap(manifest: DocsSyncManifest): Map<string, string> {
    return new Map(
        manifest.pages.map((p) => [sitePathOf(p.cf), p.wallet] as const)
    )
}

// wallet repo path -> '/sdks-tools/foo/bar'
export function buildReverseLinkMap(
    manifest: DocsSyncManifest
): Map<string, string> {
    return new Map(
        manifest.pages.map((p) => [p.wallet, sitePathOf(p.cf)] as const)
    )
}

// 'https://github.com/canton-network/cf-docs.git' -> 'canton-network/cf-docs'
export function repoSlug(remote: string): string {
    return remote
        .replace(/\.git$/, '')
        .replace(/^.*github\.com[/:]/, '')
        .replace(/^\/+/, '')
}
