// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { inflateRawSync } from 'node:zlib'
import { SDKContext } from '../../../sdk.js'
import { Ops } from '@canton-network/core-provider-ledger'

export class DarNamespace {
    constructor(private readonly sdkContext: SDKContext) {}

    /**
     * Extracts the main package ID from a DAR file without requiring any
     * external ZIP library.
     *
     * A DAR is a ZIP archive whose META-INF/MANIFEST.MF contains a
     * `Main-Dalf:` entry. The DALF filename encodes the package ID as a
     * 64-character lowercase hex string immediately before the `.dalf`
     * extension, e.g. `my-package-<64-hex-chars>.dalf`.
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

        // 2. Walk Central Directory entries to find META-INF/MANIFEST.MF.
        const CD_ENTRY_SIG = 0x02014b50
        let pos = cdOffset
        let manifestLocalOffset = -1
        let manifestCompressedSize = -1
        let manifestMethod = -1

        while (pos < cdOffset + cdSize) {
            if (buf.readUInt32LE(pos) !== CD_ENTRY_SIG) break
            const method = buf.readUInt16LE(pos + 10)
            const compSize = buf.readUInt32LE(pos + 20)
            const nameLen = buf.readUInt16LE(pos + 28)
            const extraLen = buf.readUInt16LE(pos + 30)
            const commentLen = buf.readUInt16LE(pos + 32)
            const localOffset = buf.readUInt32LE(pos + 42)
            const name = buf
                .subarray(pos + 46, pos + 46 + nameLen)
                .toString('utf8')

            if (name === 'META-INF/MANIFEST.MF') {
                manifestLocalOffset = localOffset
                manifestCompressedSize = compSize
                manifestMethod = method
            }

            pos += 46 + nameLen + extraLen + commentLen
        }

        if (manifestLocalOffset === -1)
            throw new Error('META-INF/MANIFEST.MF not found in DAR')

        // 3. Skip the local file header (30 fixed bytes + name + extra).
        const lfhNameLen = buf.readUInt16LE(manifestLocalOffset + 26)
        const lfhExtraLen = buf.readUInt16LE(manifestLocalOffset + 28)
        const dataOffset = manifestLocalOffset + 30 + lfhNameLen + lfhExtraLen

        // 4. Read and optionally decompress the manifest data.
        const compressedData = buf.subarray(
            dataOffset,
            dataOffset + manifestCompressedSize
        )
        let manifestText: string
        if (manifestMethod === 0) {
            // STORED — no compression
            manifestText = compressedData.toString('utf8')
        } else if (manifestMethod === 8) {
            // DEFLATED
            manifestText = inflateRawSync(compressedData).toString('utf8')
        } else {
            throw new Error(
                `Unsupported compression method for MANIFEST.MF: ${manifestMethod}`
            )
        }

        // 5. Unfold JAR manifest continuation lines (a folded line starts
        //    with a single space on the continuation).
        const unfolded = manifestText.replace(/\r?\n /g, '')

        // 6. Find the Main-Dalf entry.
        const mainDalfMatch = unfolded.match(/^Main-Dalf:\s*(.+)$/m)
        if (!mainDalfMatch)
            throw new Error('Main-Dalf entry not found in MANIFEST.MF')

        const mainDalfPath = mainDalfMatch[1].trim()

        // 7. Extract the 64-char hex package ID from the DALF filename.
        const packageIdMatch = mainDalfPath.match(/([0-9a-f]{64})\.dalf$/i)
        if (!packageIdMatch)
            throw new Error(
                `Cannot extract package ID from Main-Dalf path: ${mainDalfPath}`
            )

        return packageIdMatch[1].toLowerCase()
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
