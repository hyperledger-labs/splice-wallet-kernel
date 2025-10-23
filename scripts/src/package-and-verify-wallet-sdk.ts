// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { execSync } from 'child_process'
import 'colors'
import { diffChars } from 'diff'
import * as fs from 'fs'
import os from 'os'
import * as path from 'path'
import { error, success } from './lib/utils.js'
import { FlatPack } from './lib/flat-pack.js'

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

async function main() {
    const sdkDir = 'sdk/wallet-sdk'

    // Create a temp dir for both the test and the tgz
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wallet-sdk-test-'))
    const flatpacker = new FlatPack(sdkDir, 'yarn', tmpDir)

    // Prepare a yarn-based project in the tmp dir
    try {
        flatpacker.postInit(() => {
            // write Yarn config for isolated, node_modules-based test project
            fs.writeFileSync(
                path.join(tmpDir, '.yarnrc.yml'),
                ['nodeLinker: node-modules', 'enableGlobalCache: false'].join(
                    '\n'
                ) + '\n'
            )

            // Write test import file
            const testFile = path.join(tmpDir, 'test-import.ts')
            fs.writeFileSync(
                testFile,
                `import { WalletSDKImpl } from '@canton-network/wallet-sdk';\n  console.log('Import successful.' + WalletSDKImpl);`
            )

            run('yarn add typescript tsx', { cwd: tmpDir })
        })
        flatpacker.pack()
        run('yarn install --no-immutable', { cwd: tmpDir })
    } catch (e) {
        fs.rmSync(tmpDir, { recursive: true, force: true })
        throw e
    }

    let ran = false
    try {
        runAssert(
            'tsx test-import.ts',
            // Assert that the imported `WalletSDKImpl` object is not undefined or anything unexpected
            // Note: compares current wallet-sdk build with previous build that is hardcoded below:
            'Import successful.class WalletSDKImpl{static{__name(this,"WalletSDKImpl")}auth;_authTokenProvider;get authTokenProvider(){return this._authTokenProvider}constructor(){this.auth=this.authFactory();this._authTokenProvider=new import_authTokenProvider.AuthTokenProvider(this.auth)}authFactory=import_authController.localNetAuthDefault;ledgerFactory=import_ledgerController.localNetLedgerDefault;topologyFactory=import_topologyController.localNetTopologyDefault;tokenStandardFactory=import_tokenStandardController.localNetTokenStandardDefault;validatorFactory=import_validatorController.localValidatorDefault;logger;userLedger;adminLedger;topology;tokenStandard;validator;configure(config){if(config.logger)this.logger=config.logger;if(config.authFactory){if(!this.auth||this.authFactory!==config.authFactory){this.authFactory=config.authFactory;this.auth=this.authFactory();this._authTokenProvider=new import_authTokenProvider.AuthTokenProvider(this.auth)}}if(config.ledgerFactory)this.ledgerFactory=config.ledgerFactory;if(config.topologyFactory)this.topologyFactory=config.topologyFactory;if(config.tokenStandardFactory)this.tokenStandardFactory=config.tokenStandardFactory;if(config.validatorFactory)this.validatorFactory=config.validatorFactory;return this}async connect(){const{userId}=await this.auth.getUserToken();this.userLedger=this.ledgerFactory(userId,this._authTokenProvider,false);this.tokenStandard=this.tokenStandardFactory(userId,this._authTokenProvider,false);this.validator=this.validatorFactory(userId,this._authTokenProvider);return this}async connectAdmin(){const{userId}=await this.auth.getAdminToken();this.adminLedger=this.ledgerFactory(userId,this._authTokenProvider,true);return this}async connectTopology(synchronizer){if(this.auth.userId===void 0)throw new Error("UserId is not defined in AuthController.");if(synchronizer===void 0)throw new Error("Synchronizer is not defined in connectTopology. Provide a synchronizerId");const{userId,accessToken}=await this.auth.getAdminToken();let synchronizerId;if(typeof synchronizer==="string"){synchronizerId=synchronizer}else if(synchronizer instanceof URL){const scanProxyClient=new import_core_splice_client.ScanProxyClient(synchronizer,this.logger,true,accessToken,this._authTokenProvider);const amuletSynchronizerId=await scanProxyClient.getAmuletSynchronizerId();if(amuletSynchronizerId===void 0){throw new Error("SynchronizerId is not defined in ScanProxyClient.")}else{synchronizerId=amuletSynchronizerId}}else throw new Error("invalid Synchronizer format. Either provide a synchronizerId or a scanProxyClient base url.");this.topology=this.topologyFactory(userId,this._authTokenProvider,synchronizerId);if(!this.userLedger){this.logger?.warn("userLedger is not defined, synchronizerId will not be set automatically. Consider calling sdk.connect() first")}this.userLedger?.setSynchronizerId(synchronizerId);return this}async setPartyId(partyId,synchronizerId){let _synchronizerId=synchronizerId??"empty::empty";if(synchronizerId===void 0){let synchronizer=await this.userLedger.listSynchronizers(partyId);let retry=0;const maxRetries=10;while(true){synchronizer=await this.userLedger.listSynchronizers(partyId);if(!synchronizer.connectedSynchronizers||synchronizer.connectedSynchronizers.length!==0){_synchronizerId=synchronizer.connectedSynchronizers[0].synchronizerId;break}else{retry++}if(retry>maxRetries)throw new Error(`Could not find any synchronizer id for ${partyId}`);await new Promise(resolve=>setTimeout(resolve,1e3))}}this.logger?.info(`synchronizer id will be set to ${_synchronizerId}`);if(this.userLedger===void 0)this.logger?.warn("User ledger controller is not defined, consider calling sdk.connect() first!");else{this.logger?.info(`setting user ledger controller to use ${partyId}`);this.userLedger.setPartyId(partyId);this.userLedger.setSynchronizerId(_synchronizerId)}if(this.tokenStandard===void 0)this.logger?.warn("token standard controller is not defined, consider calling sdk.connect() first!");else{this.logger?.info(`setting token standard controller to use ${partyId}`);this.tokenStandard?.setPartyId(partyId);this.tokenStandard?.setSynchronizerId(_synchronizerId)}if(this.validator===void 0)this.logger?.warn("validator controller is not defined");this.validator?.setPartyId(partyId);this.validator?.setSynchronizerId(_synchronizerId)}}',
            {
                cwd: tmpDir,
            }
        )
        ran = true
        console.log(success('Package and import test completed successfully.'))
    } catch {
        console.log(error('final script should looks like:'))
        console.log(runAssert('tsx test-import.ts', '', { cwd: tmpDir }))
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
