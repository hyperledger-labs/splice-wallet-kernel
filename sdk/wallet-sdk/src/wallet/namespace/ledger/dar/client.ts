// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { SDKContext } from '../../../sdk.js'
import { Ops } from '@canton-network/core-provider-ledger'

export class DarNamespace {
    constructor(private readonly sdkContext: SDKContext) {}

    /**
     * Extracts the main package ID from a DAR file.
     *
     * A DAR is a ZIP archive. In a DAR the main DALF lives at
     * `<dir>/<dir>.dalf` — its basename (without the `.dalf` extension)
     * equals its parent directory name. That name encodes the package ID
     * as a 64-character lowercase hex string at the end, e.g.
     * `my-package-1.0.0-<64-hex-chars>`. The package ID is read directly
     * from the ZIP Central Directory entry names, so no decompression or
     * Node.js-specific built-ins are required.
     */
    extractPackageId(darBytes: Uint8Array | Buffer): string {
        const buf = Buffer.isBuffer(darBytes) ? darBytes : Buffer.from(darBytes)

        // 1. Find the End of Central Directory record (PK\x05\x06).
        //    Search backward from the end to handle ZIP comment edge cases.
        const EOCD_SIG = 0x06054b50
        let eocdOffset = -1
        for (let i = buf.length - 22; i >= 0; i--) {
            if (buf.readUInt32LE(i) === EOCD_SIG) {
                eocdOffset = i
                break
            }
        }
        if (eocdOffset === -1)
            throw new Error('Not a valid ZIP/DAR file: EOCD record not found')

        const cdOffset = buf.readUInt32LE(eocdOffset + 16)
        const cdSize = buf.readUInt32LE(eocdOffset + 12)

        // 2. Walk Central Directory entries looking for the main DALF.
        //    In a DAR the main DALF entry path has the form:
        //      <dir>/<basename>.dalf  where  <basename> === <dir>
        //    No file content is read, so no decompression is needed.
        const CD_ENTRY_SIG = 0x02014b50
        let pos = cdOffset

        while (pos < cdOffset + cdSize) {
            if (buf.readUInt32LE(pos) !== CD_ENTRY_SIG) break
            const nameLen = buf.readUInt16LE(pos + 28)
            const extraLen = buf.readUInt16LE(pos + 30)
            const commentLen = buf.readUInt16LE(pos + 32)
            const name = buf
                .subarray(pos + 46, pos + 46 + nameLen)
                .toString('utf8')

            pos += 46 + nameLen + extraLen + commentLen

            if (!name.endsWith('.dalf')) continue
            const slashIdx = name.indexOf('/')
            if (slashIdx === -1) continue
            const dir = name.slice(0, slashIdx)
            // basename = entry filename without the leading "<dir>/" and trailing ".dalf"
            const basename = name.slice(slashIdx + 1, -5)
            if (basename !== dir) continue

            // Extract the 64-char hex package ID from the end of the name.
            const packageIdMatch = dir.match(/([0-9a-f]{64})$/i)
            if (!packageIdMatch)
                throw new Error(
                    `Cannot extract package ID from DALF name: ${dir}`
                )

            return packageIdMatch[1].toLowerCase()
        }

        throw new Error('Main DALF not found in DAR')
    }

    async upload(
        darBytes: Uint8Array | Buffer,
        packageId?: string,
        synchronizerId?: string,
        vetAllPackages?: boolean
    ) {
        if (packageId !== undefined) {
            const isUploaded = await this.checkVetted(packageId)

            if (isUploaded) {
                this.sdkContext.logger.info(
                    { packageId },
                    'DAR already uploaded, skipping upload'
                )
                return
            }
        }

        await this.sdkContext.ledgerProvider.request<Ops.PostV2Packages>({
            method: 'ledgerApi',
            params: {
                resource: '/v2/packages',
                requestMethod: 'post',
                query: {
                    synchronizerId:
                        synchronizerId ?? this.sdkContext.defaultSynchronizerId,
                    vetAllPackages: vetAllPackages ?? true,
                },
                body: darBytes as never,
                headers: { 'Content-Type': 'application/octet-stream' },
            },
        })
    }

    async list(): Promise<string[]> {
        const result =
            await this.sdkContext.ledgerProvider.request<Ops.GetV2Packages>({
                method: 'ledgerApi',
                params: {
                    resource: '/v2/packages',
                    requestMethod: 'get',
                },
            })

        return result.packageIds ?? []
    }

    async checkVetted(packageId: string): Promise<boolean> {
        const packages = await this.list()
        return packages.includes(packageId)
    }

    async vet(
        darBytes: Uint8Array | Buffer,
        synchronizerId: string
    ): Promise<void> {
        await this.sdkContext.ledgerProvider.request<Ops.PostV2Packages>({
            method: 'ledgerApi',
            params: {
                resource: '/v2/packages',
                requestMethod: 'post',
                query: { synchronizerId, vetAllPackages: true },
                body: darBytes as never,
                headers: { 'Content-Type': 'application/octet-stream' },
            },
        })
    }
}
