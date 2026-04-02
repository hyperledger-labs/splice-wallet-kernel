// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { CommonCtx } from '../../../sdk.js'
import { Ops } from '@canton-network/core-provider-ledger'

type CheckByPackageId = {
    packageId: string
    failIfMissing?: boolean
}

type CheckByPackageSpec = {
    packageName: string
    packageVersion: string
    moduleName: string
    failIfMissing?: boolean
}

type CheckByPackageIdAndSpec = {
    packageId: string
    packageName: string
    packageVersion: string
    moduleName: string
    failIfMissing?: boolean
    failIfPresentButPackageIdDoesNotMatch?: boolean
}

type CheckOptions =
    | CheckByPackageId
    | CheckByPackageSpec
    | CheckByPackageIdAndSpec

export class Dar {
    constructor(private readonly sdkContext: CommonCtx) {}

    private isCheckByPackageId(
        options: CheckOptions
    ): options is CheckByPackageId {
        return 'packageId' in options && !('packageName' in options)
    }

    private isCheckByPackageIdAndSpec(
        options: CheckOptions
    ): options is CheckByPackageIdAndSpec {
        return 'packageId' in options && 'packageName' in options
    }

    private async getUploadedPackageIds(): Promise<string[]> {
        const result =
            await this.sdkContext.ledgerProvider.request<Ops.GetV2Packages>({
                method: 'ledgerApi',
                params: {
                    resource: '/v2/packages',
                    requestMethod: 'get',
                },
            })
        return result.packageIds || []
    }

    async check(options: CheckOptions): Promise<boolean> {
        const uploadedIds = await this.getUploadedPackageIds()

        if (this.isCheckByPackageIdAndSpec(options)) {
            return this.checkByPackageIdAndSpec(options, uploadedIds)
        }

        if (this.isCheckByPackageId(options)) {
            return this.checkByPackageId(options, uploadedIds)
        }

        return this.checkByPackageSpec(options, uploadedIds)
    }

    private checkByPackageId(
        options: CheckByPackageId,
        uploadedIds: string[]
    ): boolean {
        const isAvailable = uploadedIds.includes(options.packageId)

        if (!isAvailable && options.failIfMissing) {
            throw new Error(
                `Required package (packageId '${options.packageId}') was not found on the validator.`
            )
        }

        return isAvailable
    }

    private checkByPackageSpec(
        options: CheckByPackageSpec,
        uploadedIds: string[]
    ): boolean {
        // With /v2/packages endpoint, we can only check if any packages are uploaded
        // Actual spec validation (name/version matching) would require package metadata
        const hasPackages = uploadedIds.length > 0

        if (!hasPackages && options.failIfMissing) {
            throw new Error(
                `Module '${options.moduleName}' requires package '${options.packageName}' ` +
                    `version '${options.packageVersion}', but no packages were found on the validator.`
            )
        }

        return hasPackages
    }

    private checkByPackageIdAndSpec(
        options: CheckByPackageIdAndSpec,
        uploadedIds: string[]
    ): boolean {
        const isAvailable = uploadedIds.includes(options.packageId)

        if (!isAvailable && options.failIfMissing) {
            throw new Error(
                `Module '${options.moduleName}' requires package '${options.packageName}' ` +
                    `version '${options.packageVersion}' (packageId '${options.packageId}'), but it was not found on the validator.`
            )
        }

        return isAvailable
    }

    async upload(darBytes: Uint8Array | Buffer, packageId: string) {
        const isUploaded = await this.check({ packageId })

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
}
