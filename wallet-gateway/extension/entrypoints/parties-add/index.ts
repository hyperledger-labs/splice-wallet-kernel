// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import {
    BaseElement,
    type WalletCreateEvent,
    chevronLeftIcon,
    handleErrorToast,
} from '@canton-network/core-wallet-ui-components'
import { SigningProvider } from '@canton-network/core-signing-lib'
import { createUserClient } from '@/utils/legacy-frontend/rpc-client'
import { setLocationHref } from '@/utils/legacy-frontend/navigation.js'
import { toRelHref, toRelPath } from '@/utils/legacy-frontend/routing'
import { stateManager } from '@/utils/legacy-frontend/state-manager'
import '@/utils/legacy-frontend'
import { WALLET_CREATION_STATUS_CODE } from '../parties/index'
import type { WalletStatus } from '@canton-network/core-wallet-user-rpc-client'
import { detectCurrentOrigin } from '@/utils/legacy-frontend/listeners.js'

@customElement('user-ui-add-party')
export class UserUiAddParty extends BaseElement {
    @state() accessor signingProviders: string[] = [
        SigningProvider.WALLET_KERNEL,
    ]
    @state() accessor networkIds: string[] = []
    @state() accessor submitting = false

    static styles = [
        BaseElement.styles,
        css`
            :host {
                display: block;
            }

            .page-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: var(--wg-space-4);
                gap: var(--wg-space-3);
            }

            .form-wrap {
                width: 100%;
            }
        `,
    ]

    override connectedCallback(): void {
        super.connectedCallback()
        this.loadContext().catch((error) => {
            handleErrorToast(error)
        })
    }

    private async loadContext() {
        const currentOrigin = await detectCurrentOrigin()
        const userClient = await createUserClient(
            (await stateManager.accessToken.get(currentOrigin)) || undefined
        )
        const sessions = await userClient
            .request({ method: 'listSessions' })
            .catch(() => ({ sessions: [] }))
        const currentSession = sessions?.sessions?.[0]
        const networkId =
            currentSession?.network?.id ||
            (await stateManager.networkId.get(currentOrigin))

        this.networkIds = networkId ? [networkId] : []
    }

    private navigateBack() {
        setLocationHref(toRelHref('/parties'))
    }

    private async onCreateParty(event: WalletCreateEvent) {
        this.submitting = true

        try {
            const currentOrigin = await detectCurrentOrigin()
            const userClient = await createUserClient(
                (await stateManager.accessToken.get(currentOrigin)) || undefined
            )
            const result = await userClient.request({
                method: 'createWallet',
                params: {
                    primary: event.primary,
                    partyHint: event.partyHint,
                    signingProviderId: event.signingProviderId,
                    ...(event.keyName && { keyName: event.keyName }),
                },
            })

            const statusMap: Record<WalletStatus, WALLET_CREATION_STATUS_CODE> =
                {
                    allocated: WALLET_CREATION_STATUS_CODE.WALLET_ALLOCATED,
                    initialized: WALLET_CREATION_STATUS_CODE.WALLET_INITIALIZED,
                    removed: WALLET_CREATION_STATUS_CODE.WALLET_REMOVED,
                }

            const createPartyStatus = statusMap[result.wallet.status]

            setLocationHref(
                `${toRelPath('/parties/')}?createPartyStatus=${createPartyStatus}`
            )
        } catch (error) {
            this.submitting = false
            handleErrorToast(error)
        }
    }

    protected render() {
        return html`
            <div class="page-header">
                <h1 class="h4 fw-semibold mb-0">Create a new party</h1>
                <button
                    class="btn btn-link btn-sm text-body text-decoration-none p-0 d-inline-flex align-items-center gap-1"
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
                    .submitLabel=${'Create party'}
                    .submittingLabel=${'Creating party...'}
                    .submittingMessage=${'Creating party, please wait...'}
                    ?submitting=${this.submitting}
                    @wallet-create=${this.onCreateParty}
                ></wg-wallet-create-form>
            </div>
        `
    }
}
