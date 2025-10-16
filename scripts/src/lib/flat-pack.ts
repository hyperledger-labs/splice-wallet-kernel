// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-explicit-any */

import os from 'os'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { getRepoRoot } from './utils.js'

const repoRoot = getRepoRoot()

function run(cmd: string, opts: { cwd?: string } = {}) {
    console.log(`$ ${cmd}`)
    execSync(cmd, { stdio: 'inherit', ...opts })
}

interface DependencyPackage {
    name: string
    dir: string
}

interface DependencyPackageVendored {
    name: string
    dir: string
    path: string
}

/** Given a package directory within this repository: build, pack, and copy it as well as all its dependencies to an output directory */
export class FlatPack {
    private outDir: string
    private vendoredDir: string

    constructor(
        private pkgDir: string,
        private projectType: 'npm' | 'yarn' = 'npm',
        outDir?: string
    ) {
        this.outDir = outDir ?? path.join(os.tmpdir(), 'flat-pack')
        this.vendoredDir = path.join(this.outDir, '.vendored')
    }

    /**
     * Build, pack, and copy the package and its dependencies to the output directory
     * @returns The path to the output directory
     */
    public pack(): string {
        const mainPkgDir = this.pkgDir
        const mainPkgName = this.readPackageJson(mainPkgDir).name

        console.log('packing for: ' + mainPkgName)
        this.init()

        const dependencies = this.getRecursiveDependencies()

        for (const dep of dependencies) {
            const vendored = this.buildDependency(dep)
            this.overridePackageJson(vendored)
        }

        const mainPkg = this.buildDependency({
            name: this.readPackageJson(this.pkgDir).name,
            dir: this.pkgDir,
        })
        this.overridePackageJson(mainPkg)
        this.writePackageJson((pkgJson) => ({
            ...pkgJson,
            dependencies: {
                [mainPkgName]: `file:${mainPkg.path}`,
            },
        }))

        return this.outDir
    }

    public getRecursiveDependencies(): DependencyPackage[] {
        const cmd =
            'yarn workspaces foreach --no-private --topological -R exec \'echo "$npm_package_name $(pwd)"\''

        const workspaces = execSync(cmd, {
            encoding: 'utf8',
            cwd: path.join(repoRoot, this.pkgDir),
        })

        return workspaces
            .trim()
            .split('\n')
            .filter((l) => !l.startsWith('Done'))
            .map((line) => {
                const [name, dir] = line.split(' ')
                return { name, dir }
            })
    }

    private readPackageJson(parentDir: string): any {
        const pkgJsonPath = path.join(parentDir, 'package.json')
        if (!fs.existsSync(pkgJsonPath)) {
            throw new Error(`package.json not found in ${parentDir}`)
        }
        const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'))
        return pkgJson
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
    }

    private pkgNameToFileName(name: string): string {
        return (
            name.replaceAll('/', '_').replaceAll('-', '_').replaceAll('@', '') +
            '.tgz'
        )
    }

    private buildDependency(dep: DependencyPackage): DependencyPackageVendored {
        console.log('building package in: ' + dep.dir)

        const filename = path.join(
            this.vendoredDir,
            this.pkgNameToFileName(dep.name)
        )

        run('yarn build', { cwd: dep.dir })
        run(`yarn pack --filename "${filename}"`, { cwd: dep.dir })

        return { ...dep, path: filename }
    }

    private writePackageJson(callback: (json: any) => any) {
        const pkgJson = this.readPackageJson(this.outDir)
        const outPkgJsonPath = path.join(this.outDir, 'package.json')

        fs.writeFileSync(
            outPkgJsonPath,
            JSON.stringify(callback(pkgJson), null, 2)
        )
    }

    private overridePackageJson(dep: DependencyPackageVendored) {
        const overrides =
            this.projectType === 'npm' ? 'overrides' : 'resolutions'

        this.writePackageJson((pkgJson) => ({
            ...pkgJson,
            [overrides]: {
                ...pkgJson[overrides],
                [dep.name]: `file:${dep.path}`,
            },
        }))
    }
}
