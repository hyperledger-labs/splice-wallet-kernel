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
            'Import successful.class {\n' +
                '  constructor() {\n' +
                '    __publicField(this, "auth");\n' +
                '    __publicField(this, "_authTokenProvider");\n' +
                '    __publicField(this, "authFactory", localNetAuthDefault);\n' +
                '    __publicField(this, "ledgerFactory", localNetLedgerDefault);\n' +
                '    __publicField(this, "topologyFactory", localNetTopologyDefault);\n' +
                '    __publicField(this, "tokenStandardFactory", localNetTokenStandardDefault);\n' +
                '    __publicField(this, "validatorFactory", localValidatorDefault);\n' +
                '    __publicField(this, "logger");\n' +
                '    __publicField(this, "userLedger");\n' +
                '    __publicField(this, "adminLedger");\n' +
                '    __publicField(this, "topology");\n' +
                '    __publicField(this, "tokenStandard");\n' +
                '    __publicField(this, "validator");\n' +
                '    this.auth = this.authFactory();\n' +
                '    this._authTokenProvider = new AuthTokenProvider(this.auth);\n' +
                '  }\n' +
                '  get authTokenProvider() {\n' +
                '    return this._authTokenProvider;\n' +
                '  }\n' +
                '  /**\n' +
                '   * Configures the SDK with the provided configuration.\n' +
                '   * @param config\n' +
                '   * @returns The configured WalletSDK instance.\n' +
                '   */\n' +
                '  configure(config) {\n' +
                '    if (config.logger) this.logger = config.logger;\n' +
                '    if (config.authFactory) {\n' +
                '      if (!this.auth || this.authFactory !== config.authFactory) {\n' +
                '        this.authFactory = config.authFactory;\n' +
                '        this.auth = this.authFactory();\n' +
                '        this._authTokenProvider = new AuthTokenProvider(this.auth);\n' +
                '      }\n' +
                '    }\n' +
                '    if (config.ledgerFactory) this.ledgerFactory = config.ledgerFactory;\n' +
                '    if (config.topologyFactory)\n' +
                '      this.topologyFactory = config.topologyFactory;\n' +
                '    if (config.tokenStandardFactory)\n' +
                '      this.tokenStandardFactory = config.tokenStandardFactory;\n' +
                '    if (config.validatorFactory)\n' +
                '      this.validatorFactory = config.validatorFactory;\n' +
                '    return this;\n' +
                '  }\n' +
                '  /**\n' +
                '   * Connects to the ledger using user credentials.\n' +
                '   * Initializes the userLedger property.\n' +
                '   * @returns A promise that resolves to the WalletSDK instance.\n' +
                '   */\n' +
                '  async connect() {\n' +
                '    const { userId } = await this.auth.getUserToken();\n' +
                '    this.userLedger = this.ledgerFactory(\n' +
                '      userId,\n' +
                '      this._authTokenProvider,\n' +
                '      false\n' +
                '    );\n' +
                '    this.tokenStandard = this.tokenStandardFactory(\n' +
                '      userId,\n' +
                '      this._authTokenProvider,\n' +
                '      false\n' +
                '    );\n' +
                '    this.validator = this.validatorFactory(userId, this._authTokenProvider);\n' +
                '    return this;\n' +
                '  }\n' +
                '  /** Connects to the ledger using admin credentials.\n' +
                '   * @returns A promise that resolves to the WalletSDK instance.\n' +
                '   */\n' +
                '  async connectAdmin() {\n' +
                '    const { userId } = await this.auth.getAdminToken();\n' +
                '    this.adminLedger = this.ledgerFactory(\n' +
                '      userId,\n' +
                '      this._authTokenProvider,\n' +
                '      true\n' +
                '    );\n' +
                '    return this;\n' +
                '  }\n' +
                '  /** Connects to the topology service using admin credentials.\n' +
                '   * @param synchronizer either the synchronizerId or the base url of the scanProxyClient.\n' +
                '   * @returns A promise that resolves to the WalletSDK instance.\n' +
                '   */\n' +
                '  async connectTopology(synchronizer) {\n' +
                '    if (this.auth.userId === void 0)\n' +
                '      throw new Error("UserId is not defined in AuthController.");\n' +
                '    if (synchronizer === void 0)\n' +
                '      throw new Error(\n' +
                '        "Synchronizer is not defined in connectTopology. Provide a synchronizerId"\n' +
                '      );\n' +
                '    const { userId, accessToken } = await this.auth.getAdminToken();\n' +
                '    let synchronizerId;\n' +
                '    if (typeof synchronizer === "string") {\n' +
                '      synchronizerId = synchronizer;\n' +
                '    } else if (synchronizer instanceof URL) {\n' +
                '      const scanProxyClient = new coreSpliceClient.ScanProxyClient(\n' +
                '        synchronizer,\n' +
                '        this.logger,\n' +
                '        true,\n' +
                '        accessToken,\n' +
                '        this._authTokenProvider\n' +
                '      );\n' +
                '      const amuletSynchronizerId = await scanProxyClient.getAmuletSynchronizerId();\n' +
                '      if (amuletSynchronizerId === void 0) {\n' +
                '        throw new Error(\n' +
                '          "SynchronizerId is not defined in ScanProxyClient."\n' +
                '        );\n' +
                '      } else {\n' +
                '        synchronizerId = amuletSynchronizerId;\n' +
                '      }\n' +
                '    } else\n' +
                '      throw new Error(\n' +
                '        "invalid Synchronizer format. Either provide a synchronizerId or a scanProxyClient base url."\n' +
                '      );\n' +
                '    this.topology = this.topologyFactory(\n' +
                '      userId,\n' +
                '      this._authTokenProvider,\n' +
                '      synchronizerId\n' +
                '    );\n' +
                '    if (!this.userLedger) {\n' +
                '      this.logger?.warn(\n' +
                '        "userLedger is not defined, synchronizerId will not be set automatically. Consider calling sdk.connect() first"\n' +
                '      );\n' +
                '    }\n' +
                '    this.userLedger?.setSynchronizerId(synchronizerId);\n' +
                '    return this;\n' +
                '  }\n' +
                '  /**\n' +
                '   * Sets the partyId (and synchronizerId) for all controllers except for adminLedger.\n' +
                '   * @param partyId the partyId to set.\n' +
                '   * @param synchronizerId optional synchronizerId, if the party is hosted on multiple synchronizers.\n' +
                '   */\n' +
                '  async setPartyId(partyId, synchronizerId) {\n' +
                '    let _synchronizerId = synchronizerId ?? "empty::empty";\n' +
                '    if (synchronizerId === void 0) {\n' +
                '      let synchronizer = await this.userLedger.listSynchronizers(partyId);\n' +
                '      let retry = 0;\n' +
                '      const maxRetries = 10;\n' +
                '      while (true) {\n' +
                '        synchronizer = await this.userLedger.listSynchronizers(partyId);\n' +
                '        if (!synchronizer.connectedSynchronizers || synchronizer.connectedSynchronizers.length !== 0) {\n' +
                '          _synchronizerId = synchronizer.connectedSynchronizers[0].synchronizerId;\n' +
                '          break;\n' +
                '        } else {\n' +
                '          retry++;\n' +
                '        }\n' +
                '        if (retry > maxRetries)\n' +
                '          throw new Error(\n' +
                '            `Could not find any synchronizer id for ${partyId}`\n' +
                '          );\n' +
                '        await new Promise((resolve) => setTimeout(resolve, 1e3));\n' +
                '      }\n' +
                '    }\n' +
                '    this.logger?.info(`synchronizer id will be set to ${_synchronizerId}`);\n' +
                '    if (this.userLedger === void 0)\n' +
                '      this.logger?.warn(\n' +
                '        "User ledger controller is not defined, consider calling sdk.connect() first!"\n' +
                '      );\n' +
                '    else {\n' +
                '      this.logger?.info(\n' +
                '        `setting user ledger controller to use ${partyId}`\n' +
                '      );\n' +
                '      this.userLedger.setPartyId(partyId);\n' +
                '      this.userLedger.setSynchronizerId(_synchronizerId);\n' +
                '    }\n' +
                '    if (this.tokenStandard === void 0)\n' +
                '      this.logger?.warn(\n' +
                '        "token standard controller is not defined, consider calling sdk.connect() first!"\n' +
                '      );\n' +
                '    else {\n' +
                '      this.logger?.info(\n' +
                '        `setting token standard controller to use ${partyId}`\n' +
                '      );\n' +
                '      this.tokenStandard?.setPartyId(partyId);\n' +
                '      this.tokenStandard?.setSynchronizerId(_synchronizerId);\n' +
                '    }\n' +
                '    if (this.validator === void 0)\n' +
                '      this.logger?.warn("validator controller is not defined");\n' +
                '    this.validator?.setPartyId(partyId);\n' +
                '    this.validator?.setSynchronizerId(_synchronizerId);\n' +
                '  }\n' +
                '}',
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
