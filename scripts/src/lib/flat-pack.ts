// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/* oxlint-disable typescript/no-explicit-any */

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

        console.log('Packing for: ' + mainPkgName)

        this.init()

        run(`pnpm nx --tui=false run ${mainPkgName}:flatpack`, {
            cwd: repoRoot,
            env: {
                ...process.env,
                // Pass the directory path. pnpm pack will generate <scope>-<name>-<version>.tgz inside it
                FLATPACK_OUTDIR: this.vendoredDir,
                TZ: process.env.TZ ?? '',
            },
        })

        const resolvedDependencies = {} as Record<string, string>
        let mainPkgFileName = ''

        const generatedFiles = fs
            .readdirSync(this.vendoredDir)
            .filter((f) => f.endsWith('.tgz'))

        // Read the actual package name out of each tarball instead of guessing the filename
        for (const file of generatedFiles) {
            const tarballPath = path.join(this.vendoredDir, file)

            // npm/pnpm tarballs always put files inside a root 'package/' directory
            const pkgJsonStr = execSync(
                `tar -xzO -f "${tarballPath}" package/package.json`,
                { encoding: 'utf8' }
            )
            const pkgName = JSON.parse(pkgJsonStr).name

            if (pkgName === mainPkgName) {
                mainPkgFileName = file
            } else {
                resolvedDependencies[pkgName] = `file:./.vendored/${file}`
            }
        }

        if (!mainPkgFileName) {
            throw new Error(
                `Could not find the generated tarball for main package: ${mainPkgName}`
            )
        }

        this.writePackageJson((pkgJson) => ({
            ...pkgJson,
            dependencies: {
                ...pkgJson.dependencies,
                [mainPkgName]: `file:./.vendored/${mainPkgFileName}`,
            },
            overrides: resolvedDependencies,
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
