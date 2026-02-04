// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    type PaginationArguments,
    PaginationArguments as ZodPaginationArguments,
} from '@canton-network/core-types'

export const paginate = <T>(items: T[], perPage: number): T[][] => {
    const result: T[][] = []

    for (let i = 0; i < items.length; i += perPage) {
        result.push(items.slice(i, i + perPage))
    }

    return result
}

export const paginationPage = <T>(
    items: T[],
    pagination: PaginationArguments
): T[] => {
    ZodPaginationArguments.parse(pagination) // prevent user from entering negative values

    const paginatedItems = paginate(items, pagination.itemsPerPage)
    const page = Math.min(items.length, pagination.page)

    return paginatedItems[page]
}
