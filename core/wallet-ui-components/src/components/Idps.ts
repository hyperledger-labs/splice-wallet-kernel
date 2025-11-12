// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { html } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { Idp } from '@canton-network/core-wallet-user-rpc-client'

import { BaseElement } from '../internal/BaseElement'
import { modalStyles } from '../styles/modal'

@customElement('wg-idps')
export class WgIdps extends BaseElement {
    static styles = [BaseElement.styles, modalStyles]

    @property({ type: Array }) accessor idps: Idp[] = []
    @state() accessor isModalOpen = false
    @state() accessor editingIdp: Idp | null = null

    connectedCallback(): void {
        super.connectedCallback()
    }

    private openAddModal = () => {
        this.isModalOpen = true
        this.editingIdp = null
    }

    private closeModal = () => {
        this.isModalOpen = false
    }

    protected render() {
        return html`
            <div class="mb-5">
                <div class="header">
                    <h1>Identity Providers</h1>
                </div>

                <button class="btn btn-primary" @click=${this.openAddModal}>
                    Add Identity Provider
                </button>

                <div class="mt-4">
                    ${this.idps.map((idp) => {
                        return html`<div class="mb-2">
                            <idp-card .idp=${idp}></idp-card>
                        </div>`
                    })}
                </div>

                ${this.isModalOpen
                    ? html`
                          <div class="modal" @click=${this.closeModal}>
                              <div
                                  class="modal-content"
                                  @click=${(e: Event) => e.stopPropagation()}
                              >
                                  <h3>
                                      ${this.editingIdp
                                          ? 'Edit Identity Provider'
                                          : 'Add Identity Provider'}
                                  </h3>
                              </div>
                          </div>
                      `
                    : ''}
            </div>
        `
    }
}
