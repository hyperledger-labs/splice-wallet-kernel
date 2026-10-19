// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, html, nothing } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import {
    BaseElement,
    chevronLeftIcon,
    handleErrorToast,
    toRelHref,
    type WalletCardSelectEvent,
    type WalletCreateEvent,
} from '@canton-network/core-wallet-ui-components'
import type { Wallet } from '@canton-network/core-wallet-user-rpc-client'
import { SigningProvider } from '@canton-network/core-signing-lib'
import { jwtExpiresAt } from '@canton-network/core-wallet-auth'
import { createUserClient } from '../rpc-client.js'
import { showToast } from '../utils.js'
import { stateManager } from '../state-manager.js'
import { detectCurrentOrigin } from '../listeners.js'
import { redirectToIntendedOrDefault, shareUserSession } from '../index.js'
import { LOGIN_PAGE_REDIRECT } from '../constants.js'
import { setLocationHref } from '../navigation.js'

import '@canton-network/core-wallet-ui-components'

@customElement('user-ui-self-issued-login')
export class UserUiSelfIssuedLogin extends BaseElement {
    @state() private accessor submitting = false
    @state() private accessor wallet: Wallet | undefined
    @state() private accessor authWallets: Wallet[] = []
    @state() private accessor loginMode: 'create' | 'select' | undefined
    @state() private accessor onboardingReady = false
    @state() private accessor onboardingError: string | undefined
    @state() private accessor sessionLoaded = false

    private origin: string | undefined
    private sessionId: string | undefined

    private readonly signingProviders = [SigningProvider.WALLET_KERNEL]

    static styles = [
        BaseElement.styles,
        css`
            :host {
                display: block;
                max-width: 560px;
                margin: 0 auto;
                padding: var(--wg-space-5) var(--wg-space-3);
            }

            .onboarding-card {
                background: var(--wg-surface, #fff);
                border-radius: 12px;
                padding: var(--wg-space-5);
                box-shadow: 0 8px 24px rgb(0 0 0 / 8%);
            }

            .page-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: var(--wg-space-4);
                gap: var(--wg-space-3);
            }
        `,
    ]

    async connectedCallback(): Promise<void> {
        super.connectedCallback()
        this.origin = await detectCurrentOrigin()
        this.sessionId = stateManager.selfIssuedLoginSessionId.get(this.origin)
        this.sessionLoaded = true
        if (!this.sessionId) {
            return
        }

        try {
            const client = await createUserClient()
            const state = await client.request({
                method: 'getSelfIssuedLoginMode',
                params: { sessionId: this.sessionId },
            })
            this.loginMode = state.mode
            if (state.mode === 'select' && state.wallet) {
                this.authWallets = [state.wallet]
            }
            this.onboardingReady = true
        } catch (error) {
            this.onboardingError =
                error instanceof Error
                    ? error.message
                    : 'Unable to load self-issued onboarding.'
            handleErrorToast(error)
        }
    }

    private async connectSession(wallet: Wallet): Promise<void> {
        if (!this.sessionId) {
            return
        }

        this.submitting = true
        try {
            const client = await createUserClient()
            const result = await client.request({
                method: 'completeSelfIssuedLogin',
                params: {
                    sessionId: this.sessionId,
                    partyId: wallet.partyId,
                },
            })

            await this.completeLogin(result.accessToken, result.sessionId)
        } catch (error) {
            handleErrorToast(error)
        } finally {
            this.submitting = false
        }
    }

    private async completeLogin(
        accessToken: string,
        sessionId: string
    ): Promise<void> {
        if (!this.origin) {
            return
        }
        const currentOrigin = this.origin
        stateManager.selfIssuedLoginSessionId.clear(currentOrigin)
        stateManager.expirationDate.set(
            jwtExpiresAt(accessToken).toISOString(),
            currentOrigin
        )
        await stateManager.accessToken.set(accessToken, currentOrigin)
        shareUserSession(accessToken, sessionId, currentOrigin)
        await redirectToIntendedOrDefault()
    }

    private async allocateParty(wallet: Wallet): Promise<void> {
        if (!this.sessionId) {
            return
        }

        this.submitting = true
        try {
            const client = await createUserClient()
            const result = await client.request({
                method: 'allocateSelfIssuedWallet',
                params: {
                    sessionId: this.sessionId,
                    partyId: wallet.partyId,
                },
            })
            this.wallet = result.wallet
            if (result.wallet.status === 'allocated') {
                await this.connectSession(result.wallet)
                return
            }
            if (result.wallet.status === 'removed') {
                throw new Error('Party allocation was rejected')
            }
            showToast(
                'Party creation pending',
                'Approve the signing request, then try again.',
                'info'
            )
        } catch (error) {
            handleErrorToast(error)
        } finally {
            this.submitting = false
        }
    }

    private async createWallet(event: WalletCreateEvent): Promise<void> {
        if (!this.sessionId) {
            return
        }

        this.submitting = true
        try {
            const client = await createUserClient()
            const result = await client.request({
                method: 'createSelfIssuedWallet',
                params: {
                    sessionId: this.sessionId,
                    partyHint: event.partyHint,
                    signingProviderId: event.signingProviderId,
                },
            })
            if (result.wallet.status === 'allocated') {
                await this.connectSession(result.wallet)
            } else if (result.wallet.status === 'removed') {
                throw new Error('Party allocation was rejected')
            } else {
                this.wallet = result.wallet
                showToast(
                    'Party creation pending',
                    'Approve the signing request, then complete onboarding.',
                    'info'
                )
            }
        } catch (error) {
            handleErrorToast(error)
        } finally {
            this.submitting = false
        }
    }

    private selectAuthParty(event: WalletCardSelectEvent): void {
        void this.connectSession(event.wallet)
    }

    private async goBack(): Promise<void> {
        if (this.submitting) {
            return
        }

        this.submitting = true
        try {
            if (this.sessionId) {
                const client = await createUserClient()
                await client.request({
                    method: 'removeSelfIssuedLoginSession',
                    params: { sessionId: this.sessionId },
                })
                if (this.origin) {
                    stateManager.selfIssuedLoginSessionId.clear(this.origin)
                }
            }
            setLocationHref(toRelHref(LOGIN_PAGE_REDIRECT))
        } catch (error) {
            handleErrorToast(error)
        } finally {
            this.submitting = false
        }
    }

    private renderAlert(message: string) {
        return html`
            <div class="alert alert-danger mb-0" role="alert">${message}</div>
        `
    }

    private renderPartySelect() {
        return html`
            <div class="d-flex flex-column gap-3">
                ${this.authWallets.map(
                    (wallet) => html`
                        <wg-wallet-card
                            .wallet=${wallet}
                            .selectLabel=${'Select'}
                            ?loading=${this.submitting}
                            @wallet-select=${this.selectAuthParty}
                        ></wg-wallet-card>
                    `
                )}
            </div>
        `
    }

    private renderPendingApproval() {
        const wallet = this.wallet
        if (!wallet) return nothing

        return html`
            <div class="d-flex flex-column gap-3">
                <p class="text-body-secondary mb-0">
                    The party is waiting for signing-provider approval.
                </p>
                <button
                    class="btn btn-primary rounded-pill w-100"
                    type="button"
                    ?disabled=${this.submitting}
                    @click=${() => this.allocateParty(wallet)}
                >
                    ${
                        this.submitting
                            ? 'Checking approval...'
                            : 'Complete onboarding'
                    }
                </button>
            </div>
        `
    }

    private renderCreateForm() {
        return html`
            <wg-wallet-create-form
                .signingProviders=${this.signingProviders}
                .showPrimary=${false}
                .submitLabel=${'Create party'}
                ?submitting=${this.submitting}
                @wallet-create=${this.createWallet}
            ></wg-wallet-create-form>
        `
    }

    private renderBody() {
        if (!this.sessionLoaded) return nothing
        if (!this.sessionId) {
            return this.renderAlert(
                'No self-issued login session found. Start from the login page.'
            )
        }
        if (this.onboardingError) return this.renderAlert(this.onboardingError)
        if (!this.onboardingReady) return nothing

        if (this.loginMode === 'select') {
            return this.authWallets.length === 0
                ? this.renderAlert(
                      'No wallet was found for the authentication party.'
                  )
                : this.renderPartySelect()
        }

        return this.wallet
            ? this.renderPendingApproval()
            : this.renderCreateForm()
    }

    protected render() {
        const selectingExistingParty = this.loginMode === 'select'

        return html`
            <section class="onboarding-card">
                <div class="page-header">
                    <h1 class="h4 fw-semibold mb-0">
                        ${
                            selectingExistingParty
                                ? 'Select authentication party'
                                : 'Create authentication party'
                        }
                    </h1>
                    ${
                        this.sessionLoaded
                            ? html`
                                  <button
                                      class="btn btn-link btn-sm text-body text-decoration-none p-0 d-inline-flex align-items-center gap-1"
                                      type="button"
                                      ?disabled=${this.submitting}
                                      @click=${this.goBack}
                                  >
                                      ${chevronLeftIcon}
                                      <span>Back</span>
                                  </button>
                              `
                            : nothing
                    }
                </div>
                <p class="text-body-secondary mb-4">
                    ${
                        selectingExistingParty
                            ? 'Choose the party that authenticates this account.'
                            : 'Create the party that will authenticate your wallet gateway account.'
                    }
                </p>
                ${this.renderBody()}
            </section>
        `
    }
}
