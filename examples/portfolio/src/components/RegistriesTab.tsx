// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyId } from "@canton-network/core-types"

export type RegistriesTabProps = {
    registryUrls: Map<PartyId, string>
}

export const RegistriesTab: React.FC<RegistriesTabProps> = ({
    registryUrls
}) => {
    const adminParties = [...registryUrls.keys()]
    adminParties.sort()
    return (
        <div>
            <ul>
                {adminParties.map((p) => {
                    return (
                        <li key={p}>
                            <strong>{p}:</strong> {registryUrls.get(p)}
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}
