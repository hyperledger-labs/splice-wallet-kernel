// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react'
import { PartyId } from '@canton-network/core-types'
import { resolveTokenStandardClient } from '../services'

export type RegistriesTabProps = {
    // TODO: multiple URLs per party.
    registryUrls: Map<PartyId, string>
    onChange: (registryUrls: Map<PartyId, string>) => void
}

export const RegistriesTab: React.FC<RegistriesTabProps> = (props) => {
    const [registryUrls, setRegistryUrls] = useState(props.registryUrls)

    const [newRegistryUrl, setNewRegistryUrl] = useState('')

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
            <label htmlFor="url">Registry URL:&nbsp;</label>
            <input
                id="url"
                value={newRegistryUrl}
                onChange={(e) => setNewRegistryUrl(e.target.value)}
            />
            <br />
            <button
                onClick={async () => {
                    const tokenStandardClient =
                        await resolveTokenStandardClient({
                            registryUrl: newRegistryUrl,
                        })
                    const registryInfo = await tokenStandardClient.get(
                        '/registry/metadata/v1/info'
                    )
                    const newRegistryUrls = new Map(registryUrls).set(
                        registryInfo.adminId,
                        newRegistryUrl
                    )
                    setRegistryUrls(newRegistryUrls)
                    props.onChange(newRegistryUrls)
                }}
            >
                Add registry
            </button>
        </div>
    )
}
