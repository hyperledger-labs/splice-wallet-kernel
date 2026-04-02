// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export type SdkDarValidationContext = {
    ledger: {
        dar: {
            check(
                options:
                    | {
                          packageId: string
                          failIfMissing?: boolean
                      }
                    | {
                          packageName: string
                          packageVersion: string
                          moduleName: string
                          failIfMissing?: boolean
                      }
                    | {
                          packageId: string
                          packageName: string
                          packageVersion: string
                          moduleName: string
                          failIfMissing?: boolean
                          failIfPresentButPackageIdDoesNotMatch?: boolean
                      }
            ): Promise<boolean>
        }
    }
}
