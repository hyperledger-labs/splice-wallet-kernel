// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    TRANSFER_INSTRUCTION_INTERFACE_ID,
    TRANSFER_FACTORY_INTERFACE_ID,
    ALLOCATION_FACTORY_INTERFACE_ID,
    ALLOCATION_INSTRUCTION_INTERFACE_ID,
    HOLDING_INTERFACE_ID,
    ALLOCATION_INTERFACE_ID,
    ALLOCATION_REQUEST_INTERFACE_ID,
} from '@canton-network/core-token-standard'
export interface InterfaceIdParts {
    packageName: string
    moduleName: string
    entityName: string
}

export function splitInterfaceId(interfaceId: string): InterfaceIdParts | null {
    // Captures 3 groups: pkg, module and entity
    // Note that prefix # is optional in regexp below,
    // format without # is deprecated, but supported in canton 3.3 and will be removed in canton 3.4
    // https://docs.digitalasset.com/build/3.3/reference/lapi-migration-guide.html#identifier-addressing-by-package-name
    const regExp = /^#?([^:]+):([^:]+):([^:]+)$/
    const match = regExp.exec(interfaceId)
    if (!match) return null
    const [, packageName, moduleName, entityName] = match // [0]=full, [1]=pkg, [2]=module, [3]=entity
    return {
        packageName,
        moduleName,
        entityName,
    }
}

export function matchInterfaceIds(a: string, b: string): boolean {
    const aParts = splitInterfaceId(a)
    const bParts = splitInterfaceId(b)

    return (
        aParts !== null &&
        bParts !== null &&
        aParts.moduleName === bParts.moduleName &&
        aParts.entityName === bParts.entityName
    )
}

export const TokenStandardTransactionInterfaces = [
    HOLDING_INTERFACE_ID,
    TRANSFER_FACTORY_INTERFACE_ID,
    TRANSFER_INSTRUCTION_INTERFACE_ID,
    ALLOCATION_FACTORY_INTERFACE_ID,
    ALLOCATION_INSTRUCTION_INTERFACE_ID,
    ALLOCATION_INTERFACE_ID,
    ALLOCATION_REQUEST_INTERFACE_ID,
]

const SpliceMetaKeyPrefix = 'splice.lfdecentralizedtrust.org/'
export const TxKindMetaKey = `${SpliceMetaKeyPrefix}tx-kind`
export const SenderMetaKey = `${SpliceMetaKeyPrefix}sender`
export const ReasonMetaKey = `${SpliceMetaKeyPrefix}reason`
export const BurnedMetaKey = `${SpliceMetaKeyPrefix}burned`
export const AllKnownMetaKeys = [
    TxKindMetaKey,
    SenderMetaKey,
    ReasonMetaKey,
    BurnedMetaKey,
]
