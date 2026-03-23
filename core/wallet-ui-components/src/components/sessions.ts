// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { BaseElement } from '../internal/base-element'
import { Session } from '@canton-network/core-wallet-user-rpc-client'
import { cardStyles } from '../styles/card'

@customElement('wg-sessions')
export class WgSessions extends BaseElement {
    static styles = [
        BaseElement.styles,
        cardStyles,
        css`
            :host {
                display: block;
            }

            .sessions-list {
                display: flex;
                flex-direction: column;
                gap: var(--wg-space-3);
            }

            .session-card {
                padding: var(--wg-space-4);
            }

            .card-header {
                display: flex;
                align-items: center;
                gap: var(--wg-space-2);
                margin-bottom: var(--wg-space-3);
            }

            .status-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                flex: 0 0 auto;
            }

            .status-dot.connected {
                background: var(--wg-success);
                box-shadow: 0 0 0 2px rgba(var(--wg-success-rgb), 0.18);
            }

            .status-dot.disconnected {
                background: var(--wg-error);
                box-shadow: 0 0 0 2px rgba(var(--wg-error-rgb), 0.18);
            }

            .card-title {
                margin: 0;
                font-size: var(--wg-font-size-base);
                font-weight: var(--wg-font-weight-bold);
                color: var(--wg-text);
            }

            .status-label {
                font-size: var(--wg-font-size-xs);
                font-weight: var(--wg-font-weight-semibold);
                text-transform: capitalize;
            }

            .status-label.connected {
                color: var(--wg-success);
            }

            .status-label.disconnected {
                color: var(--wg-error);
            }

            .meta {
                display: grid;
                gap: 0.35rem;
            }

            .meta-row {
                display: flex;
                align-items: center;
                gap: var(--wg-space-2);
                min-width: 0;
                font-size: var(--wg-font-size-sm);
                line-height: 1.4;
            }

            .meta-label {
                color: var(--wg-text);
                font-weight: var(--wg-font-weight-semibold);
                flex: 0 0 auto;
            }

            .meta-value {
                color: var(--wg-text);
                min-width: 0;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                flex: 1 1 auto;
            }

            .meta-value-muted {
                color: var(--wg-text-secondary);
            }

            wg-copy-button {
                flex: 0 0 auto;
            }
        `,
    ]

    @property({ type: Array }) sessions: Session[] = []

    protected render() {
        if (!this.sessions.length) {
            return html`<p
                style="color: var(--wg-text-secondary); font-size: var(--wg-font-size-sm);"
            >
                No active sessions.
            </p>`
        }

        return html`
            <div class="sessions-list">
                ${this.sessions.map((session) => {
                    const isConnected = session.status === 'connected'
                    return html`
                        <article class="wg-card session-card">
                            <div class="card-header">
                                <span
                                    class="status-dot ${isConnected
                                        ? 'connected'
                                        : 'disconnected'}"
                                ></span>
                                <h3 class="card-title">
                                    ${session.network.id}
                                </h3>
                                <span
                                    class="status-label ${isConnected
                                        ? 'connected'
                                        : 'disconnected'}"
                                >
                                    ${session.status}
                                </span>
                            </div>

                            <div class="meta">
                                ${session.rights?.length
                                    ? html`
                                          <div class="meta-row">
                                              <span class="meta-label"
                                                  >Permissions:</span
                                              >
                                              <span class="meta-value"
                                                  >${session.rights.join(', ')}</span
                                              >
                                          </div>
                                      `
                                    : ''}
                                ${session.reason
                                    ? html`
                                          <div class="meta-row">
                                              <span class="meta-label"
                                                  >Reason:</span
                                              >
                                              <span class="meta-value"
                                                  >${session.reason}</span
                                              >
                                          </div>
                                      `
                                    : ''}

                                <div class="meta-row">
                                    <span class="meta-label"
                                        >Access Token:</span
                                    >
                                    <span class="meta-value meta-value-muted"
                                        >[private]</span
                                    >
                                    <wg-copy-button
                                        .value=${session.accessToken}
                                        label="Copy access token"
                                    ></wg-copy-button>
                                </div>
                            </div>
                        </article>
                    `
                })}
            </div>
        `
    }
}
