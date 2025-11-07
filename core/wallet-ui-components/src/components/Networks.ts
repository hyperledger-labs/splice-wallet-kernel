// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { html, css } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { Network } from '@canton-network/core-wallet-user-rpc-client'

import { BaseElement } from '../internal/BaseElement'

@customElement('wg-networks')
export class WgNetworks extends BaseElement {
    static styles = [
        BaseElement.styles,
        css`
            .modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.25);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            }
            .modal-content {
                background: #fff;
                padding: 2rem;
                border-radius: 8px;
                min-width: 300px;
                max-width: 95vw;
                max-height: 75vh;
                overflow-y: scroll;
                box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
            }
            @media (max-width: 600px) {
                .modal-content {
                    padding: 1rem;
                    min-width: unset;
                }
                table,
                th,
                td {
                    font-size: 0.95rem;
                }
                .header h1 {
                    font-size: 1.2rem;
                }
            }
            @media (max-width: 400px) {
                .modal-content {
                    padding: 0.5rem;
                }
            }
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

                <button class="btn btn-primary" @click=${this.openAddModal}>
                    Add Network
                </button>

                <network-table .networks=${this.networks}></network-table>

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
