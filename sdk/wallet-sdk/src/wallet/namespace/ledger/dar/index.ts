// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { SDKContext } from '../../../sdk.js'
import type { Ops } from '@canton-network/core-provider-ledger'
import { requireSynchronizerId } from '../../../init/synchronizer.js'

export class DarNamespace {
    constructor(private readonly sdkContext: SDKContext) {}

    async upload(
        darBytes: Uint8Array | Buffer,
        packageId: string,
        synchronizerId?: string,
        vetAllPackages?: boolean
    ) {
        const isUploaded = await this.check(packageId)

        if (isUploaded && !vetAllPackages) {
            this.sdkContext.logger.info(
                { packageId },
                'DAR already uploaded, skipping upload'
            )
            return
        }

        try {
            await this.sdkContext.ledgerProvider.request<Ops.PostV2Packages>({
                method: 'ledgerApi',
                params: {
                    resource: '/v2/packages',
                    requestMethod: 'post',
                    query: {
                        synchronizerId: requireSynchronizerId(
                            this.sdkContext,
                            synchronizerId
                        ),
                        vetAllPackages: vetAllPackages ?? true,
                    },
                    body: darBytes as never,
                    headers: { 'Content-Type': 'application/octet-stream' },
                },
            })
        } catch (e) {
            const code = (e as { code?: string })?.code
            const message = `${(e as { cause?: unknown })?.cause ?? (e as Error)?.message ?? e}`
            if (
                code === 'KNOWN_PACKAGE_VERSION' ||
                message.includes('same name and version')
            ) {
                this.sdkContext.logger.warn(
                    'A package with the same name+version is already vetted; reusing the existing package.'
                )
                return
            }
            throw e
        }
    }

    async check(packageId: string): Promise<boolean> {
        const result =
            await this.sdkContext.ledgerProvider.request<Ops.GetV2Packages>({
                method: 'ledgerApi',
                params: {
                    resource: '/v2/packages',
                    requestMethod: 'get',
                },
            })

        return (
            Array.isArray(result.packageIds) &&
            result.packageIds.includes(packageId)
        )
    }
}
