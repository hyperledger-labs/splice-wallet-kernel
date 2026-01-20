// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-explicit-any */

import os from 'os'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { getRepoRoot } from './utils.js'

const repoRoot = getRepoRoot()

function run(
    cmd: string,
    opts: { cwd?: string; env?: Record<string, string> } = {}
) {
    console.log(`$ ${cmd}`)
    execSync(cmd, { stdio: 'inherit', ...opts })
}

/** Given a package directory within this repository: build, pack, and copy it as well as all its dependencies to an output directory */
export class FlatPack {
    private outDir: string
    private vendoredDir: string
    private postInitHook: (() => void) | undefined = undefined

    constructor(
        private pkgDir: string,
        private projectType: 'npm' | 'yarn' = 'npm',
        outDir?: string
    ) {
        this.outDir = outDir ?? path.join(os.tmpdir(), 'flat-pack')
        this.vendoredDir = path.join(this.outDir, '.vendored')
    }

    public postInit(callback: () => void): void {
        this.postInitHook = callback
    }

    /**
     * Build, pack, and copy the package and its dependencies to the output directory
     * @returns The path to the output directory
     */
    public pack(): string {
        const mainPkgDir = this.pkgDir
        const mainPkgName = this.readPackageJson(mainPkgDir).name
        const mainPkgFileName = `${mainPkgName.replaceAll('/', '-')}.tgz`

        console.log('Packing for: ' + mainPkgName)

        this.init()

        run(`yarn nx --tui=false run ${mainPkgName}:flatpack`, {
            cwd: repoRoot,
            env: {
                ...process.env,
                FLATPACK_OUTDIR: `${this.vendoredDir}/%s.tgz`,
                TZ: process.env.TZ ?? '',
            },
        })

        const overrides =
            this.projectType === 'npm' ? 'overrides' : 'resolutions'

        const resolvedDependencies = {} as Record<string, string>

        const dependencies = fs
            .readdirSync(this.vendoredDir)
            .filter((f) => f.endsWith('.tgz'))
            .filter((f) => f !== mainPkgFileName)

        for (const file of dependencies) {
            if (file.endsWith('.tgz')) {
                const pkgName = file
                    .split('.tgz')[0]
                    .replaceAll('@canton-network-', '@canton-network/')
                resolvedDependencies[pkgName] = `file:./.vendored/${file}`
            }
        }

        this.writePackageJson((pkgJson) => ({
            ...pkgJson,
            dependencies: {
                ...pkgJson.dependencies,
                [mainPkgName]: `file:./.vendored/${mainPkgFileName}`,
            },
            [overrides]: resolvedDependencies,
        }))

        return this.outDir
    }

    private init() {
        fs.mkdirSync(path.join(this.vendoredDir), { recursive: true })
        fs.writeFileSync(
            path.join(this.outDir, 'package.json'),
            JSON.stringify(
                {
                    name: 'flat-pack-temp',
                    private: true,
                    version: '0.0.0',
                    description: 'Temporary package for flat packing',
                    ...(this.projectType === 'yarn'
                        ? { packageManager: 'yarn@4.9.4' }
                        : {}),
                    dependencies: {},
                },
                null,
                2
            )
        )

        if (this.postInitHook) {
            this.postInitHook()
        }
    }

    private readPackageJson(parentDir: string): any {
        const pkgJsonPath = path.join(parentDir, 'package.json')
        if (!fs.existsSync(pkgJsonPath)) {
            throw new Error(`package.json not found in ${parentDir}`)
        }
        const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'))
        return pkgJson
    }

    private writePackageJson(callback: (json: any) => any) {
        const pkgJson = this.readPackageJson(this.outDir)
        const outPkgJsonPath = path.join(this.outDir, 'package.json')

        fs.writeFileSync(
            outPkgJsonPath,
            JSON.stringify(callback(pkgJson), null, 2)
        )
    }
}
