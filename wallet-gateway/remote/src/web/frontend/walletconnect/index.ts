// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { html, css, nothing } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import {
    BaseElement,
    handleErrorToast,
} from '@canton-network/core-wallet-ui-components'
import { walletHandler, subscribe } from './walletkit-handler'
import type { PendingProposal, PendingRequest, SessionInfo } from './types'
import { stateManager } from '../state-manager'
import { createUserClient } from '../rpc-client'
import { showToast } from '../utils'
import '../index'

const WC_PROJECT_ID_KEY = 'com.splice.wallet.wcProjectId'

@customElement('user-ui-walletconnect')
export class WalletConnectUi extends BaseElement {
    static styles = [
        BaseElement.styles,
        css`
            :host {
                display: block;
                max-width: 900px;
                margin: 0 auto;
                padding: var(--wg-space-4) var(--wg-space-3);
            }

            h1 {
                margin: 0 0 var(--wg-space-4);
                font-size: var(--wg-font-size-xl);
            }

            h2 {
                margin: var(--wg-space-5) 0 var(--wg-space-3);
                font-size: var(--wg-font-size-lg);
            }

            .section {
                background: var(--wg-surface);
                border: 1px solid var(--wg-border);
                border-radius: var(--wg-radius-lg);
                padding: var(--wg-space-4);
                margin-bottom: var(--wg-space-4);
            }

            .pair-form {
                display: flex;
                gap: var(--wg-space-2);
                align-items: flex-end;
            }

            .pair-form input {
                flex: 1;
                padding: 0.5rem 0.75rem;
                font-size: var(--wg-font-size-sm);
                border: 1px solid var(--wg-border);
                border-radius: var(--wg-radius-md);
                background: var(--wg-bg);
                color: var(--wg-text);
                font-family: inherit;
            }

            .pair-form input::placeholder {
                color: var(--wg-text-secondary);
            }

            .project-id-form {
                display: flex;
                gap: var(--wg-space-2);
                align-items: flex-end;
                margin-bottom: var(--wg-space-3);
            }

            .project-id-form input {
                flex: 1;
                padding: 0.5rem 0.75rem;
                font-size: var(--wg-font-size-sm);
                border: 1px solid var(--wg-border);
                border-radius: var(--wg-radius-md);
                background: var(--wg-bg);
                color: var(--wg-text);
                font-family: inherit;
            }

            button {
                padding: 0.5rem 1rem;
                font-size: var(--wg-font-size-sm);
                border: 1px solid var(--wg-border);
                border-radius: var(--wg-radius-md);
                background: var(--wg-surface);
                color: var(--wg-text);
                cursor: pointer;
                font-family: inherit;
                white-space: nowrap;
            }

            button:hover {
                background: rgba(var(--wg-accent-rgb), 0.1);
            }

            button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            button.primary {
                background: var(--wg-accent);
                color: white;
                border-color: var(--wg-accent);
            }

            button.primary:hover {
                opacity: 0.9;
            }

            button.danger {
                color: var(--wg-error);
                border-color: var(--wg-error);
            }

            button.danger:hover {
                background: rgba(var(--wg-error-rgb, 220, 38, 38), 0.1);
            }

            .card {
                border: 1px solid var(--wg-border);
                border-radius: var(--wg-radius-md);
                padding: var(--wg-space-3);
                margin-bottom: var(--wg-space-2);
            }

            .card-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: var(--wg-space-2);
            }

            .card-title {
                font-weight: var(--wg-font-weight-semibold);
                font-size: var(--wg-font-size-sm);
            }

            .card-meta {
                font-size: var(--wg-font-size-xs);
                color: var(--wg-text-secondary);
            }

            .card-actions {
                display: flex;
                gap: var(--wg-space-2);
                margin-top: var(--wg-space-2);
            }

            .badge {
                display: inline-block;
                padding: 0.15rem 0.5rem;
                font-size: var(--wg-font-size-xs);
                border-radius: var(--wg-radius-sm);
                background: rgba(var(--wg-accent-rgb), 0.1);
                color: var(--wg-accent);
            }

            .empty {
                color: var(--wg-text-secondary);
                font-size: var(--wg-font-size-sm);
                font-style: italic;
            }

            .method-list {
                display: flex;
                flex-wrap: wrap;
                gap: 0.25rem;
                margin-top: var(--wg-space-1);
            }

            .status-indicator {
                display: inline-flex;
                align-items: center;
                gap: 0.35rem;
                font-size: var(--wg-font-size-sm);
                margin-bottom: var(--wg-space-3);
            }

            .status-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
            }

            .status-dot.connected {
                background: var(--wg-success);
            }

            .status-dot.disconnected {
                background: var(--wg-text-secondary);
            }

            .payload {
                margin-top: var(--wg-space-2);
                padding: var(--wg-space-2);
                background: var(--wg-bg);
                border: 1px solid var(--wg-border);
                border-radius: var(--wg-radius-md);
                font-family: monospace;
                font-size: var(--wg-font-size-xs);
                white-space: pre-wrap;
                word-break: break-all;
                max-height: 300px;
                overflow-y: auto;
                color: var(--wg-text);
            }

            .network-select {
                padding: 0.5rem 0.75rem;
                font-size: var(--wg-font-size-sm);
                border: 1px solid var(--wg-border);
                border-radius: var(--wg-radius-md);
                background: var(--wg-bg);
                color: var(--wg-text);
                font-family: inherit;
                margin-right: var(--wg-space-2);
            }
        `,
    ]

    @state() private accessor initialized = false
    @state() private accessor initializing = false
    @state() private accessor pairUri = ''
    @state() private accessor pairing = false
    @state() private accessor proposals: PendingProposal[] = []
    @state() private accessor requests: PendingRequest[] = []
    @state() private accessor sessions: SessionInfo[] = []
    @state() private accessor networks: Array<{ id: string; name: string }> = []
    @state() private accessor projectId =
        localStorage.getItem(WC_PROJECT_ID_KEY) ?? ''
    @state() private accessor processingIds = new Set<number>()

    private unsubscribe?: () => void

    async connectedCallback(): Promise<void> {
        super.connectedCallback()
        await this.loadNetworks()

        const envProjectId = (
            import.meta as unknown as { env?: { VITE_WC_PROJECT_ID?: string } }
        ).env?.VITE_WC_PROJECT_ID
        if (envProjectId && !this.projectId) {
            this.projectId = envProjectId
        }

        if (this.projectId) {
            await this.initWalletKit()
        }
    }

    disconnectedCallback(): void {
        this.unsubscribe?.()
        super.disconnectedCallback()
    }

    private async loadNetworks(): Promise<void> {
        try {
            const client = await createUserClient(
                stateManager.accessToken.get()
            )
            const response = await client.request({
                method: 'listNetworks',
                params: {},
            })
            this.networks = response.networks.map((n) => ({
                id: n.id,
                name: n.name,
            }))
        } catch {
            this.networks = []
        }
    }

    private async initWalletKit(): Promise<void> {
        if (!this.projectId) return

        this.initializing = true
        try {
            localStorage.setItem(WC_PROJECT_ID_KEY, this.projectId)
            await walletHandler.init(this.projectId)
            this.initialized = true
            this.refreshState()

            this.unsubscribe = subscribe(() => {
                this.refreshState()
            })
        } catch (err) {
            handleErrorToast(err, {
                message: 'Failed to initialize WalletKit',
            })
        } finally {
            this.initializing = false
        }
    }

    private refreshState(): void {
        this.proposals = walletHandler.getPendingProposals()
        this.requests = walletHandler.getPendingRequests()
        this.sessions = walletHandler.getActiveSessions()
    }

    private async handlePair(): Promise<void> {
        if (!this.pairUri.trim()) return

        this.pairing = true
        try {
            await walletHandler.pair(this.pairUri.trim())
            showToast('', 'Pairing initiated', 'success')
            this.pairUri = ''
        } catch (err) {
            handleErrorToast(err, { message: 'Pairing failed' })
        } finally {
            this.pairing = false
        }
    }

    private setProcessing(id: number, processing: boolean): void {
        const next = new Set(this.processingIds)
        if (processing) {
            next.add(id)
        } else {
            next.delete(id)
        }
        this.processingIds = next
    }

    private async handleApproveProposal(
        id: number,
        networkId: string
    ): Promise<void> {
        this.setProcessing(id, true)
        try {
            await walletHandler.approveProposal(id, networkId)
            showToast('', 'Session approved', 'success')
        } catch (err) {
            handleErrorToast(err, { message: 'Failed to approve session' })
        } finally {
            this.setProcessing(id, false)
        }
    }

    private async handleRejectProposal(id: number): Promise<void> {
        this.setProcessing(id, true)
        try {
            await walletHandler.rejectProposal(id)
        } catch (err) {
            handleErrorToast(err, { message: 'Failed to reject session' })
        } finally {
            this.setProcessing(id, false)
        }
    }

    private async handleApproveRequest(id: number): Promise<void> {
        this.setProcessing(id, true)
        try {
            await walletHandler.approveRequest(id)
            showToast('', 'Request approved', 'success')
        } catch (err) {
            handleErrorToast(err, { message: 'Request failed' })
        } finally {
            this.setProcessing(id, false)
        }
    }

    private async handleRejectRequest(id: number): Promise<void> {
        this.setProcessing(id, true)
        try {
            await walletHandler.rejectRequest(id)
        } catch (err) {
            handleErrorToast(err, { message: 'Failed to reject request' })
        } finally {
            this.setProcessing(id, false)
        }
    }

    private async handleDisconnect(topic: string): Promise<void> {
        try {
            await walletHandler.disconnectSession(topic)
            showToast('', 'Session disconnected', 'success')
        } catch (err) {
            handleErrorToast(err, { message: 'Failed to disconnect' })
        }
    }

    private renderSetup() {
        return html`
            <div class="section">
                <h2 style="margin-top:0">WalletConnect Setup</h2>
                <div class="project-id-form">
                    <input
                        type="text"
                        placeholder="WalletConnect Project ID"
                        .value=${this.projectId}
                        @input=${(e: Event) => {
                            this.projectId = (
                                e.target as HTMLInputElement
                            ).value
                        }}
                    />
                    <button
                        class="primary"
                        ?disabled=${!this.projectId || this.initializing}
                        @click=${this.initWalletKit}
                    >
                        ${this.initializing ? 'Initializing…' : 'Initialize'}
                    </button>
                </div>
            </div>
        `
    }

    private renderPairing() {
        return html`
            <div class="section">
                <h2 style="margin-top:0">Pair with dApp</h2>
                <div class="pair-form">
                    <input
                        type="text"
                        placeholder="Paste WalletConnect URI (wc:…)"
                        .value=${this.pairUri}
                        @input=${(e: Event) => {
                            this.pairUri = (e.target as HTMLInputElement).value
                        }}
                        @keydown=${(e: KeyboardEvent) => {
                            if (e.key === 'Enter') this.handlePair()
                        }}
                    />
                    <button
                        class="primary"
                        ?disabled=${!this.pairUri.trim() || this.pairing}
                        @click=${this.handlePair}
                    >
                        ${this.pairing ? 'Pairing…' : 'Pair'}
                    </button>
                </div>
            </div>
        `
    }

    private renderProposals() {
        if (this.proposals.length === 0) return nothing

        return html`
            <div class="section">
                <h2 style="margin-top:0">Pending Session Proposals</h2>
                ${this.proposals.map((p) => {
                    const isProcessing = this.processingIds.has(p.id)
                    const defaultNetwork =
                        this.networks.length > 0
                            ? this.networks[0].id
                            : 'devnet'
                    return html`
                        <div class="card">
                            <div class="card-header">
                                <span class="card-title">${p.peerName}</span>
                                <span class="card-meta"
                                    >${new Date(
                                        p.receivedAt
                                    ).toLocaleTimeString()}</span
                                >
                            </div>
                            <div class="card-meta">${p.peerDescription}</div>
                            <div class="card-meta">${p.peerUrl}</div>
                            <div class="method-list">
                                ${p.methods.map(
                                    (m) => html`<span class="badge">${m}</span>`
                                )}
                            </div>
                            <div class="card-actions">
                                <select
                                    class="network-select"
                                    id="network-${p.id}"
                                >
                                    ${this.networks.length > 0
                                        ? this.networks.map(
                                              (n) =>
                                                  html`<option value=${n.id}>
                                                      ${n.name}
                                                  </option>`
                                          )
                                        : html`<option value=${defaultNetwork}>
                                              ${defaultNetwork}
                                          </option>`}
                                </select>
                                <button
                                    class="primary"
                                    ?disabled=${isProcessing}
                                    @click=${() => {
                                        const select =
                                            this.shadowRoot?.querySelector(
                                                `#network-${p.id}`
                                            ) as HTMLSelectElement | null
                                        const networkId =
                                            select?.value ?? defaultNetwork
                                        this.handleApproveProposal(
                                            p.id,
                                            networkId
                                        )
                                    }}
                                >
                                    Approve
                                </button>
                                <button
                                    class="danger"
                                    ?disabled=${isProcessing}
                                    @click=${() =>
                                        this.handleRejectProposal(p.id)}
                                >
                                    Reject
                                </button>
                            </div>
                        </div>
                    `
                })}
            </div>
        `
    }

    private renderRequests() {
        if (this.requests.length === 0) return nothing

        return html`
            <div class="section">
                <h2 style="margin-top:0">Pending Requests</h2>
                ${this.requests.map((r) => {
                    const isProcessing = this.processingIds.has(r.id)
                    return html`
                        <div class="card">
                            <div class="card-header">
                                <span class="card-title">${r.peerName}</span>
                                <span class="card-meta"
                                    >${new Date(
                                        r.receivedAt
                                    ).toLocaleTimeString()}</span
                                >
                            </div>
                            <div>
                                <span class="badge">${r.method}</span>
                            </div>
                            <div class="payload">
                                ${JSON.stringify(r.params, null, 2)}
                            </div>
                            <div class="card-actions">
                                <button
                                    class="primary"
                                    ?disabled=${isProcessing}
                                    @click=${() =>
                                        this.handleApproveRequest(r.id)}
                                >
                                    ${isProcessing ? 'Processing…' : 'Approve'}
                                </button>
                                <button
                                    class="danger"
                                    ?disabled=${isProcessing}
                                    @click=${() =>
                                        this.handleRejectRequest(r.id)}
                                >
                                    Reject
                                </button>
                            </div>
                        </div>
                    `
                })}
            </div>
        `
    }

    private renderSessions() {
        return html`
            <div class="section">
                <h2 style="margin-top:0">
                    Active Sessions (${this.sessions.length})
                </h2>
                ${this.sessions.length === 0
                    ? html`<p class="empty">
                          No active sessions. Pair with a dApp to get started.
                      </p>`
                    : this.sessions.map(
                          (s) => html`
                              <div class="card">
                                  <div class="card-header">
                                      <span class="card-title"
                                          >${s.peerName}</span
                                      >
                                      <button
                                          class="danger"
                                          @click=${() =>
                                              this.handleDisconnect(s.topic)}
                                      >
                                          Disconnect
                                      </button>
                                  </div>
                                  <div class="card-meta">${s.peerUrl}</div>
                                  <div class="card-meta">
                                      Expires:
                                      ${new Date(
                                          s.expiry * 1000
                                      ).toLocaleString()}
                                  </div>
                                  <div class="card-meta">
                                      Topic: ${s.topic.slice(0, 16)}…
                                  </div>
                              </div>
                          `
                      )}
            </div>
        `
    }

    protected render() {
        return html`
            <h1>WalletConnect</h1>

            <div class="status-indicator">
                <span
                    class="status-dot ${this.initialized
                        ? 'connected'
                        : 'disconnected'}"
                ></span>
                <span>
                    ${this.initialized
                        ? 'WalletKit initialized'
                        : 'Not initialized'}
                </span>
            </div>

            ${!this.initialized ? this.renderSetup() : nothing}
            ${this.initialized ? this.renderPairing() : nothing}
            ${this.renderProposals()} ${this.renderRequests()}
            ${this.initialized ? this.renderSessions() : nothing}
        `
    }
}
