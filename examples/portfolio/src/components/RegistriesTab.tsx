// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react'
import { resolveTokenStandardClient } from '../services'
import { type Registries } from '../services/registries.js'

export type RegistriesTabProps = {
    registryUrls: Registries
    onChange: (registryUrls: Registries) => void
}

export const RegistriesTab: React.FC<RegistriesTabProps> = (props) => {
    const [registryUrls, setRegistryUrls] = useState(props.registryUrls)

    const [newPartyId, setNewPartyId] = useState('')
    const [newRegistryUrl, setNewRegistryUrl] = useState('')

    const adminParties = [...registryUrls.keys()]
    adminParties.sort()

    return (
        <div>
            <h2>Registries</h2>
            <ul>
                {adminParties.map((p) => {
                    return (
                        <li key={p}>
                            <strong>{p}:</strong> {registryUrls.get(p)}
                        </li>
                    )
                })}
            </ul>
            <h2>Add new registry</h2>
            <form onSubmit={(e) => e.preventDefault()}>
                <p>
                    The party ID is optional and will be retrieved from the URL
                    if not specified. Note that in this case you need to trust
                    the URL to provide the right information.
                </p>
                <label htmlFor="partyId">Party ID:&nbsp;</label>
                <input
                    id="partyId"
                    value={newPartyId}
                    onChange={(e) => setNewPartyId(e.target.value)}
                />
                <br />
                <label htmlFor="url">Registry URL:&nbsp;</label>
                <input
                    id="url"
                    value={newRegistryUrl}
                    onChange={(e) => setNewRegistryUrl(e.target.value)}
                />
                <br />
                <button
                    type="submit"
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
            </form>
        </div>
    )
}
