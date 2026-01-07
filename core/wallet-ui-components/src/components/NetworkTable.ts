// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Network } from '@canton-network/core-wallet-store'
import { html } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import { BaseElement } from '../internal/BaseElement.js'
import { Session } from '@canton-network/core-wallet-user-rpc-client'

@customElement('network-table')
export class NetworkTable extends BaseElement {
    @property({ type: Array }) networks: Network[] = []
    @property({ type: Array }) activeSessions: Session[] = []

    static styles = [BaseElement.styles]

    render() {
        return html`
            <div class="container p-0 m-0">
                <div
                    class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-md-2 g-lg-2 g-0"
                >
                    ${this.networks.map((net) => {
                        const isActive = this.activeSessions.some(
                            (session) => session.network.id === net.id
                        )
                        return html`
                            <network-card
                                .network=${net}
                                .activeSession=${isActive}
                            ></network-card>
                        `
                    })}
                </div>
            </div>
        `
    }
}
