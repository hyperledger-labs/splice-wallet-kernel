// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Network } from '@canton-network/core-wallet-store'
import { LitElement, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import { styles } from '../themes/styles.js'

@customElement('network-table')
export class NetworkTable extends LitElement {
    @property({ type: Array }) networks: Network[] = []

    static styles = [styles]

    render() {
        console.log('rendering with networks ' + JSON.stringify(this.networks))
        return html`
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>ID</th>
                        <th>Description</th>
                        <th>Auth type</th>
                        <th>Synchronizer ID</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.networks.map(
                        (net) => html`
                            <tr>
                                <td>${net.name}</td>
                                <td>${net.chainId}</td>
                                <td>${net.description}</td>
                                <td>${net.auth.type}</td>
                                <td>${net.synchronizerId}</td>
                                <td class="actions">
                                    <button>Update</button>
                                    <button
                                        @click=${() =>
                                            this.dispatchEvent(
                                                new CustomEvent('delete', {
                                                    detail: net,
                                                })
                                            )}
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        `
                    )}
                </tbody>
            </table>
        `
    }
}
