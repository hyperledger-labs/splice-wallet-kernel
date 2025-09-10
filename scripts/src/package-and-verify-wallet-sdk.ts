// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import os from 'os'
import { getRepoRoot, success, error } from './utils.js'
import { diffChars } from 'diff'
import 'colors'

function run(cmd: string, opts: { cwd?: string } = {}) {
    console.log(`$ ${cmd}`)
    execSync(cmd, { stdio: 'inherit', ...opts })
}

function runAssert(cmd: string, assertOutput: string, opts: { cwd?: string }) {
    console.log(`$ ${cmd}`)
    const output = execSync(cmd, { stdio: 'pipe', ...opts }).toString()
    const cleanOut = output.trim()
    const cleanAssert = assertOutput.trim()

    if (cleanOut !== cleanAssert) {
        const diff = diffChars(cleanOut, cleanAssert)

        diff.forEach((part) => {
            // green for additions, red for deletions
            const text = part.added
                ? part.value.bgGreen
                : part.removed
                  ? part.value.bgRed
                  : part.value
            process.stdout.write(text)
        })
        console.log('\n')
        throw new Error('Output did not match expected, see above diff')
    }
    return output
}

const repoRoot = getRepoRoot()

async function buildPackage(
    name: string,
    pkgDir: string,
    tmpDir: string
): Promise<string> {
    const absolutePkgDir = path.join(repoRoot, pkgDir)
    const filename = path.join(tmpDir, `${name}.tgz`)

    run('yarn build', { cwd: absolutePkgDir })
    run(`yarn pack --filename "${filename}"`, { cwd: absolutePkgDir })
    run(`yarn add "${filename}"`, { cwd: tmpDir })

    return filename
}

function updateJsonResolutions(
    tmpDir: string,
    resolutions: Record<string, string>
) {
    const pkgJsonPath = path.join(tmpDir, 'package.json')
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'))
    pkgJson.resolutions = {
        ...pkgJson.resolutions,
        ...resolutions,
    }
    fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2))
}

async function main() {
    // Create a temp dir for both the test and the tgz
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wallet-sdk-test-'))

    // Prepare a yarn-based project in the tmp dir
    try {
        // write Yarn config for isolated, node_modules-based test project
        fs.writeFileSync(
            path.join(tmpDir, '.yarnrc.yml'),
            ['nodeLinker: node-modules', 'enableGlobalCache: false'].join(
                '\n'
            ) + '\n'
        )

        // Test import in temp dir
        run('yarn init -y', { cwd: tmpDir })
        run('yarn install --no-immutable', { cwd: tmpDir })

        // Write test import file
        const testFile = path.join(tmpDir, 'test-import.ts')
        fs.writeFileSync(
            testFile,
            `import { WalletSDKImpl } from '@canton-network/wallet-sdk';\n  console.log('Import successful.' + WalletSDKImpl);`
        )
        run('yarn add typescript tsx', { cwd: tmpDir })
    } catch (e) {
        fs.rmSync(tmpDir, { recursive: true, force: true })
        throw e
    }

    run('yarn install', { cwd: repoRoot })

    await buildPackage('wallet-sdk', 'sdk/wallet-sdk', tmpDir)
    const coreTokenStandardPkgPath = await buildPackage(
        'core-token-standard',
        'core/token-standard',
        tmpDir
    )

    let ran = false
    try {
        // Resolve token-standard to the packed tgz
        updateJsonResolutions(tmpDir, {
            '@canton-network/core-token-standard': `file:${coreTokenStandardPkgPath}`,
        })

        runAssert(
            'tsx test-import.ts',
            // Assert that the imported `WalletSDKImpl` object is not undefined or anything unexpected
            `
            Import successful.class WalletSDKImpl{static{__name(this,"WalletSDKImpl")}auth;authFactory=import_authController.localAuthDefault;ledgerFactory=import_ledgerController.localLedgerDefault;topologyFactory=import_topologyController.localTopologyDefault;tokenStandardFactory=import_tokenStandardController.localTokenStandardDefault;validatorFactory=import_validatorController.localValidatorDefault;logger;userLedger;adminLedger;topology;tokenStandard;validator;constructor(){this.auth=this.authFactory()}configure(config){if(config.logger)this.logger=config.logger;if(config.authFactory)this.auth=config.authFactory();if(config.ledgerFactory)this.ledgerFactory=config.ledgerFactory;if(config.topologyFactory)this.topologyFactory=config.topologyFactory;if(config.tokenStandardFactory)this.tokenStandardFactory=config.tokenStandardFactory;if(config.validatorFactory)this.validatorFactory=config.validatorFactory;return this}async connect(){const{userId,accessToken}=await this.auth.getUserToken();this.logger?.info(\`Connecting user \${userId} with token \${accessToken}\`);this.userLedger=this.ledgerFactory(userId,accessToken);this.tokenStandard=this.tokenStandardFactory(userId,accessToken);this.validator=this.validatorFactory(userId,accessToken);return this}async connectAdmin(){const{userId,accessToken}=await this.auth.getAdminToken();this.logger?.info(\`Connecting user \${userId} with token \${accessToken}\`);this.adminLedger=this.ledgerFactory(userId,accessToken);return this}async connectTopology(synchronizer){if(this.auth.userId===void 0)throw new Error("UserId is not defined in AuthController.");if(synchronizer===void 0)throw new Error("Synchronizer is not defined in connectTopology. Either provide a synchronizerId or a scanClient base url.");const{userId,accessToken}=await this.auth.getAdminToken();this.logger?.info(\`Connecting user \${userId} with token \${accessToken}\`);let synchronizerId;if(typeof synchronizer==="string"){synchronizerId=synchronizer}else if(synchronizer instanceof URL){const scanClient=new import_core_splice_client.ScanClient(synchronizer.href,this.logger,accessToken);const amuletSynchronizerId=await scanClient.GetAmuletSynchronizerId();if(amuletSynchronizerId===void 0){throw new Error("SynchronizerId is not defined in ScanClient.")}else{synchronizerId=amuletSynchronizerId}}else throw new Error("invalid Synchronizer format. Either provide a synchronizerId or a scanClient base url.");this.topology=this.topologyFactory(userId,accessToken,synchronizerId);return this}}
            `,
            {
                cwd: tmpDir,
            }
        )
        ran = true
        console.log(success('Package and import test completed successfully.'))
    } finally {
        // Cleanup temp dir and tgz
        fs.rmSync(tmpDir, { recursive: true, force: true })
        if (!ran) console.log(error('Cleaned up temp files after failure.'))
    }
}

main().catch((err) => {
    console.error(error(err.message || err))
    process.exit(1)
})
