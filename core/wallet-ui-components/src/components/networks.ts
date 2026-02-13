// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { html, css } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { Network, Session } from '@canton-network/core-wallet-user-rpc-client'

import { BaseElement } from '../internal/base-element'
import { modalStyles } from '../styles/modal'

@customElement('wg-networks')
export class WgNetworks extends BaseElement {
    static styles = [
        BaseElement.styles,
        modalStyles,
        css`
            @media (max-width: 600px) {
                .card-list {
                    grid-template-columns: 1fr;
                }
                .network-card {
                    padding: 0.7rem;
                }
            }
        `,
    ]

    @property({ type: Array }) accessor networks: Network[] = []
    @property({ type: Array }) accessor activeSessions: Session[] = []
    @property({ type: Boolean }) accessor readonly = false
    @state() accessor isModalOpen = false
    @state() accessor editingNetwork: Network | null = null
    @state() accessor authType: string =
        this.editingNetwork?.auth?.method ?? 'authorization_code'

    connectedCallback(): void {
        super.connectedCallback()
    }

    private openAddModal = () => {
        this.isModalOpen = true
        this.editingNetwork = null
    }

    private closeModal = () => {
        this.isModalOpen = false
    }

    protected render() {
        return html`
            <div class="mb-5">
                <div class="header">
                    <h1>Networks</h1>
                </div>

                ${this.readonly
                    ? ''
                    : html`<button
                          class="btn btn-primary"
                          @click=${this.openAddModal}
                      >
                          Add Network
                      </button>`}

                <div class="mt-2">
                    <network-table
                        .networks=${this.networks}
                        .activeSessions=${this.activeSessions}
                        .readonly=${this.readonly}
                    ></network-table>
                </div>

                ${this.isModalOpen
                    ? html`
                          <div class="modal" @click=${this.closeModal}>
                              <div
                                  class="modal-content"
                                  @click=${(e: Event) => e.stopPropagation()}
                              >
                                  <h3>
                                      ${this.editingNetwork
                                          ? 'Edit Network'
                                          : 'Add Network'}
                                  </h3>
                                  <network-form
                                      .editingNetwork=${this.editingNetwork}
                                      .authType=${this.authType}
                                      @network-edit-save=${this.closeModal}
                                      @network-edit-cancel=${this.closeModal}
                                  ></network-form>
                              </div>
                          </div>
                      `
                    : ''}
            </div>
        `
    }
}
