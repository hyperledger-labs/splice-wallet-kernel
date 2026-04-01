// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { CommonCtx } from '../../../sdk.js'
import { Ops } from '@canton-network/core-provider-ledger'

export class Dar {
    constructor(private readonly sdkContext: CommonCtx) {}

    async getVettedPackageIdsByNameVersion(
        packageName: string,
        packageVersion: string
    ): Promise<string[]> {
        const packageIds = new Set<string>()
        let pageToken = ''

        while (true) {
            const response =
                await this.sdkContext.ledgerProvider.request<Ops.GetV2PackageVetting>(
                    {
                        method: 'ledgerApi',
                        params: {
                            resource: '/v2/package-vetting',
                            requestMethod: 'get',
                            body: {
                                packageMetadataFilter: {
                                    packageNamePrefixes: [packageName],
                                },
                                pageToken,
                                pageSize: 200,
                            },
                        },
                    }
                )

            for (const vettedSet of response.vettedPackages ?? []) {
                for (const vettedPackage of vettedSet.packages ?? []) {
                    if (
                        vettedPackage.packageName === packageName &&
                        vettedPackage.packageVersion === packageVersion
                    ) {
                        packageIds.add(vettedPackage.packageId)
                    }
                }
            }

            const next = response.nextPageToken
            if (!next || next === pageToken) {
                break
            }

            pageToken = next
        }

        return Array.from(packageIds)
    }

    async validateExpectedVettedPackage(args: {
        moduleName: string
        packageName: string
        packageVersion: string
        expectedPackageId: string
    }): Promise<void> {
        const vettedPackageIds = await this.getVettedPackageIdsByNameVersion(
            args.packageName,
            args.packageVersion
        )

        if (vettedPackageIds.length === 0) {
            throw new Error(
                `Module '${args.moduleName}' requires vetted package ` +
                    `'${args.packageName}' version '${args.packageVersion}', but none was found on the validator.`
            )
        }

        if (!vettedPackageIds.includes(args.expectedPackageId)) {
            this.sdkContext.logger.warn(
                {
                    moduleName: args.moduleName,
                    packageName: args.packageName,
                    packageVersion: args.packageVersion,
                    expectedPackageId: args.expectedPackageId,
                    vettedPackageIds,
                },
                'Expected vetted package ID not found; an alternate package ID is vetted and may be incompatible'
            )
        }
    }

    async upload(darBytes: Uint8Array | Buffer, packageId: string) {
        const isUploaded = await this.check(packageId)

        if (isUploaded) {
            this.sdkContext.logger.info(
                { packageId },
                'DAR already uploaded, skipping upload'
            )
            return
        }

        await this.sdkContext.ledgerProvider.request<Ops.PostV2Packages>({
            method: 'ledgerApi',
            params: {
                resource: '/v2/packages',
                requestMethod: 'post',
                query: {},
                body: darBytes as never,
                headers: { 'Content-Type': 'application/octet-stream' },
            },
        })
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
