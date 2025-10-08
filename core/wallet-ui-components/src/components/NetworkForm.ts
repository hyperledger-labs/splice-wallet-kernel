// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Network } from '@canton-network/core-wallet-store'
import { html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { BaseElement } from '../internal/BaseElement.js'

@customElement('network-form')
export class NetworkForm extends BaseElement {
    @property({ type: Object }) editingNetwork: Network | null = null
    @property({ type: String }) authType: string = 'implicit'

    static styles = [BaseElement.styles]

    private getAuthField(field: string): string {
        if (!this.editingNetwork) return ''
        const auth = this.editingNetwork.auth
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (auth as any)?.[field] ?? ''
    }

    onAuthTypeChange(e: Event) {
        const select = e.target as HTMLSelectElement
        this.authType = select.value
    }

    handleSubmit(e: Event) {
        e.preventDefault()

        const form = e.target as HTMLFormElement
        const formData = new FormData(form)

        this.dispatchEvent(
            new CustomEvent('form-submit', {
                detail: formData,
                bubbles: true,
                composed: true,
            })
        )
    }

    render() {
        return html`
            <form @submit=${this.handleSubmit}>
                <input
                    name="name"
                    placeholder="Name"
                    .value=${this.editingNetwork?.name ?? ''}
                    required
                />
                <input
                    name="chainId"
                    placeholder="Network Id"
                    .value=${this.editingNetwork?.chainId ?? ''}
                    required
                />
                <input
                    name="synchronizerId"
                    placeholder="Synchronizer Id"
                    .value=${this.editingNetwork?.synchronizerId ?? ''}
                    required
                />
                <input
                    name="description"
                    placeholder="Description"
                    .value=${this.editingNetwork?.description ?? ''}
                    required
                />
                <input
                    name="ledgerApi.baseurl"
                    placeholder="Ledger API Base Url"
                    .value=${this.editingNetwork?.ledgerApi?.baseUrl ?? ''}
                    required
                />

                <select
                    name="authType"
                    @change=${this.onAuthTypeChange}
                    .value=${this.authType}
                >
                    <option value="password">password</option>
                    <option value="implicit">implicit</option>
                </select>

                ${this.authType === 'implicit'
                    ? html`
                          <input
                              name="domain"
                              placeholder="Domain"
                              .value=${this.getAuthField('domain')}
                              required
                          />
                          <input
                              name="clientId"
                              placeholder="ClientId"
                              .value=${this.getAuthField('clientId')}
                              required
                          />
                          <input
                              name="scope"
                              placeholder="Scope"
                              .value=${this.getAuthField('scope')}
                              required
                          />
                          <input
                              name="audience"
                              placeholder="Audience"
                              .value=${this.getAuthField('audience')}
                              required
                          />
                      `
                    : html`
                          <input
                              name="tokenUrl"
                              placeholder="TokenUrl"
                              .value=${this.getAuthField('tokenUrl')}
                              required
                          />
                          <input
                              name="grantType"
                              placeholder="GrantType"
                              .value=${this.getAuthField('grantType')}
                              required
                          />
                          <input
                              name="scope"
                              placeholder="Scope"
                              .value=${this.getAuthField('scope')}
                              required
                          />
                          <input
                              name="audience"
                              placeholder="Audience"
                              .value=${this.getAuthField('audience')}
                              required
                          />
                      `}

                <div class="buttons">
                    <button type="submit">Save</button>
                    <button
                        type="button"
                        @click=${() => this.dispatchEvent(new Event('cancel'))}
                    >
                        Cancel
                    </button>
                </div>
            </form>
        `
    }
}
