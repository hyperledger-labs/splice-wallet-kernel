// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import {
    BaseElement,
    WalletCreateEvent,
    chevronLeftIcon,
    handleErrorToast,
    toRelHref,
    toRelPath,
} from '@canton-network/core-wallet-ui-components'
import { SigningProvider } from '@canton-network/core-signing-lib'
import { createUserClient } from '../../rpc-client'
import { stateManager } from '../../state-manager'
import '../../index'

@customElement('user-ui-add-party')
export class UserUiAddParty extends BaseElement {
    @state() accessor signingProviders: string[] =
        Object.values(SigningProvider)
    @state() accessor networkIds: string[] = []
    @state() accessor loading = false

    static styles = [
        BaseElement.styles,
        css`
            :host {
                display: block;
                max-width: 900px;
                margin: 0 auto;
            }

            .page-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: var(--wg-space-4);
                gap: var(--wg-space-3);
            }

            .back-link {
                border: none;
                background: transparent;
                font-size: var(--wg-font-size-base);
                text-decoration: none;
                cursor: pointer;
                padding: 0;
                display: inline-flex;
                align-items: center;
                gap: 0.2rem;
            }

            .form-wrap {
                max-width: 560px;
            }
        `,
    ]

    override connectedCallback(): void {
        super.connectedCallback()
        this.loadContext()
    }

    private async loadContext() {
        const userClient = await createUserClient(
            stateManager.accessToken.get()
        )
        const sessions = await userClient
            .request({ method: 'listSessions' })
            .catch(() => ({ sessions: [] }))
        const currentSession = sessions?.sessions?.[0]
        const networkId =
            currentSession?.network?.id || stateManager.networkId.get()
        this.networkIds = networkId ? [networkId] : []
    }

    private navigateBack() {
        window.location.href = toRelHref('/parties')
    }

    private async onCreateParty(event: WalletCreateEvent) {
        this.loading = true

        try {
            const userClient = await createUserClient(
                stateManager.accessToken.get()
            )
            await userClient.request({
                method: 'createWallet',
                params: {
                    primary: event.primary,
                    partyHint: event.partyHint,
                    signingProviderId: event.signingProviderId,
                },
            })

            window.location.href = `${toRelPath('/parties/')}?created=1`
        } catch (error) {
            this.loading = false
            handleErrorToast(error)
        }
    }

    protected render() {
        return html`
            <div class="page-header">
                <h1 class="page-title">Add a new party</h1>
                <button
                    class="back-link"
                    type="button"
                    @click=${this.navigateBack}
                >
                    ${chevronLeftIcon}
                    <span>Back</span>
                </button>
            </div>

            <div class="form-wrap">
                <wg-wallet-create-form
                    .signingProviders=${this.signingProviders}
                    .networkIds=${this.networkIds}
                    ?loading=${this.loading}
                    @wallet-create=${this.onCreateParty}
                ></wg-wallet-create-form>
            </div>
        `
    }
}
