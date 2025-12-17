// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react'
import {
    useRegistryService,
    useRegistryUrls,
} from '../contexts/RegistryServiceContext.js'

export const RegistriesTab: React.FC = () => {
    const registryService = useRegistryService()
    const registryUrls = useRegistryUrls()

    const [newPartyId, setNewPartyId] = useState('')
    const [newRegistryUrl, setNewRegistryUrl] = useState('')

    const adminParties = [...registryUrls.keys()]
    adminParties.sort()

    return (
        <div>
            <h2>Registries</h2>
            <table>
                <thead>
                    <tr>
                        <th>Party ID</th>
                        <th>Registry URL</th>
                    </tr>
                </thead>
                <tbody>
                    {adminParties.map((p) => {
                        return (
                            <tr key={p}>
                                <td>{p}</td>
                                <td>{registryUrls.get(p)}</td>
                                <td>
                                    <button
                                        type="submit"
                                        onClick={() =>
                                            registryService.deleteRegistryUrl(p)
                                        }
                                    >
                                        🗑️
                                    </button>
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
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
                    onClick={async () =>
                        registryService.setRegistryUrl(
                            newPartyId ? undefined : newPartyId,
                            newRegistryUrl
                        )
                    }
                >
                    Add registry
                </button>
            </form>
        </div>
    )
}
