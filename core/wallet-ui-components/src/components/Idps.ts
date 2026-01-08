// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { html } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { Idp, Session } from '@canton-network/core-wallet-user-rpc-client'

import { BaseElement } from '../internal/BaseElement'
import { modalStyles } from '../styles/modal'
import { FormInputChangedEvent } from './FormInput'

/** Emitted when the user Saves a Identity Provider */
export class IdpAddEvent extends Event {
    constructor(public idp: Idp) {
        super('idp-add', { bubbles: true, composed: true })
    }
}

@customElement('wg-idps')
export class WgIdps extends BaseElement {
    static styles = [BaseElement.styles, modalStyles]

    @property({ type: Array }) accessor idps: Idp[] = []
    @property({ type: Array }) activeSessions: Session[] = []

    @state() accessor isModalOpen = false
    @state() accessor modalIdp: Idp = {
        id: '',
        type: 'oauth',
        issuer: '',
        configUrl: '',
    }

    connectedCallback(): void {
        super.connectedCallback()
    }

    private openAddModal = () => {
        this.isModalOpen = true
        this.modalIdp = {
            id: '',
            type: 'oauth',
            issuer: '',
            configUrl: '',
        }
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
                        const isActive = this.activeSessions.some(
                            (session) => session.idp.id === idp.id
                        )
                        return html`<div class="mb-2">
                            <idp-card
                                .idp=${idp}
                                .activeSession=${isActive}
                                @update=${(e: Event) => {
                                    this.modalIdp = idp
                                    this.isModalOpen = true
                                    e.stopPropagation()
                                }}
                            ></idp-card>
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
                                      ${this.modalIdp
                                          ? 'Edit Identity Provider'
                                          : 'Add Identity Provider'}
                                  </h3>

                                  <form
                                      @submit=${(e: Event) => {
                                          e.preventDefault()
                                          this.dispatchEvent(
                                              new IdpAddEvent(this.modalIdp)
                                          )
                                          this.closeModal()
                                      }}
                                  >
                                      <form-input
                                          label="ID"
                                          @form-input-change=${(
                                              e: FormInputChangedEvent
                                          ) => {
                                              this.modalIdp.id = e.value
                                          }}
                                          .value=${this.modalIdp.id}
                                          required
                                      ></form-input>

                                      <label for="idp-type">Type</label>
                                      <select
                                          id="idp-type"
                                          class="form-select mb-3"
                                          @change=${(e: Event) => {
                                              const select =
                                                  e.target as HTMLSelectElement

                                              this.modalIdp.type = select.value

                                              if (
                                                  this.modalIdp.type !== 'oauth'
                                              ) {
                                                  delete this.modalIdp.configUrl
                                              }

                                              this.requestUpdate()
                                          }}
                                          .value=${this.modalIdp.type}
                                      >
                                          <option value="oauth">oauth</option>
                                          <option value="self_signed">
                                              self_signed
                                          </option>
                                      </select>

                                      <form-input
                                          label="Issuer"
                                          @form-input-change=${(
                                              e: FormInputChangedEvent
                                          ) => {
                                              this.modalIdp.issuer = e.value
                                          }}
                                          .value=${this.modalIdp.issuer}
                                          required
                                      ></form-input>

                                      ${this.modalIdp.type === 'oauth'
                                          ? html`<form-input
                                                label="Config URL"
                                                @form-input-change=${(
                                                    e: FormInputChangedEvent
                                                ) => {
                                                    this.modalIdp.configUrl =
                                                        e.value
                                                }}
                                                .value=${this.modalIdp
                                                    .configUrl || ''}
                                            ></form-input>`
                                          : ''}

                                      <div>
                                          <button
                                              class="btn btn-primary btn-sm"
                                              type="submit"
                                          >
                                              Save
                                          </button>

                                          <button
                                              class="btn btn-secondary btn-sm"
                                              @click=${() => this.closeModal()}
                                          >
                                              Cancel
                                          </button>
                                      </div>
                                  </form>
                              </div>
                          </div>
                      `
                    : ''}
            </div>
        `
    }
}
