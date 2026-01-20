// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export function prettyjson(obj: object): string {
    return JSON.stringify(obj, Object.keys(obj).sort(), 2)
}
