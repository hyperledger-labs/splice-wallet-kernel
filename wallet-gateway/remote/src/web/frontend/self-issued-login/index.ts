// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, html, nothing } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import {
    BaseElement,
    chevronLeftIcon,
    handleErrorToast,
    toRelHref,
    type SigningProviderChangeEvent,
    type WalletCardSelectEvent,
    type WalletCreateEvent,
} from '@canton-network/core-wallet-ui-components'
import type {
    SelfIssuedLoginResult,
    Wallet,
} from '@canton-network/core-wallet-user-rpc-client'
import {
    type KeysList,
    SIGN_MESSAGE_CAPABLE_SIGNING_PROVIDERS,
    SigningProvider,
} from '@canton-network/core-signing-lib'
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
    // TODO rename / comment for better clarity
    @state() private accessor submitting = false
    @state() private accessor wallet: Wallet | undefined
    @state() private accessor authWallets: Wallet[] = []
    @state() private accessor loginMode: 'create' | 'select' | undefined
    @state() private accessor onboardingReady = false
    @state() private accessor onboardingError: string | undefined
    @state() private accessor sessionLoaded = false
    @state() private accessor loginMessageId: string | undefined
    @state() private accessor loginFailure: string | undefined
    @state() private accessor loggingIn = false
    @state() accessor pollIntervalMs = 3000
    @state() private accessor selectedSigningProvider = ''
    @state() private accessor publicKeys: KeysList = []
    @state() private accessor publicKeysLoading = false
    @state() private accessor signingProviders: string[] = []
    @state() private accessor signingProvidersLoading = false

    private origin: string | undefined
    private sessionId: string | undefined
    private loginWallet: Wallet | undefined
    private pollTimer: ReturnType<typeof setTimeout> | null = null
    private pollDelay = 3000
    private polling = false

    private readonly keySigningProviders: string[] = [
        SigningProvider.FIREBLOCKS,
    ]

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
        this.pollDelay = this.pollIntervalMs
        document.addEventListener('visibilitychange', this.onVisibilityChange)
        this.origin = await detectCurrentOrigin()
        this.sessionId = stateManager.selfIssuedLoginSessionId.get(this.origin)
        this.sessionLoaded = true
        if (!this.sessionId) {
            return
        }
        this.loginMessageId = stateManager.selfIssuedLoginMessageId.get(
            this.origin
        )
        this.syncPolling()

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
            if (state.mode === 'create') {
                void this.loadSigningProviders()
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

    private async loadSigningProviders(): Promise<void> {
        this.signingProvidersLoading = true
        try {
            const client = await createUserClient()
            const { signingProviders } = await client.request({
                method: 'listSigningProviders',
            })
            this.signingProviders = signingProviders.filter((providerId) =>
                SIGN_MESSAGE_CAPABLE_SIGNING_PROVIDERS.includes(
                    providerId as SigningProvider
                )
            )
        } catch (error) {
            handleErrorToast(error)
        } finally {
            this.signingProvidersLoading = false
        }
    }

    disconnectedCallback(): void {
        super.disconnectedCallback()
        this.stopPolling()
        document.removeEventListener(
            'visibilitychange',
            this.onVisibilityChange
        )
    }

    private async connectSession(wallet: Wallet): Promise<void> {
        if (!this.sessionId) {
            return
        }

        this.loginWallet = wallet
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
            await this.handleLoginResult(result)
        } catch (error) {
            handleErrorToast(error)
        } finally {
            this.submitting = false
        }
    }

    private async handleLoginResult(
        result: SelfIssuedLoginResult
    ): Promise<void> {
        if (result.status !== 'failed') {
            this.loginFailure = undefined
        }
        switch (result.status) {
            case 'connected':
                this.loggingIn = true
                this.setLoginMessageId(undefined)
                try {
                    await this.completeLogin(
                        result.accessToken,
                        result.sessionId
                    )
                } catch (error) {
                    this.loggingIn = false
                    throw error
                }
                return
            case 'awaiting-signature':
                this.setLoginMessageId(result.messageId)
                return
            case 'failed':
                this.setLoginMessageId(undefined)
                this.loginFailure = result.failureReason
                return
        }
    }

    private setLoginMessageId(messageId: string | undefined): void {
        this.loginMessageId = messageId
        if (this.origin) {
            if (messageId) {
                stateManager.selfIssuedLoginMessageId.set(
                    messageId,
                    this.origin
                )
            } else {
                stateManager.selfIssuedLoginMessageId.clear(this.origin)
            }
        }
        this.syncPolling()
    }

    private onVisibilityChange = () => {
        if (document.hidden) {
            this.stopPolling()
        } else {
            this.pollDelay = this.pollIntervalMs
            this.syncPolling()
        }
    }

    private get isAwaitingTopologyTransactionSignature(): boolean {
        return this.wallet?.status === 'initialized'
    }

    private hasPendingApproval(): boolean {
        const isAwaitingAccessTokenSignature = this.loginMessageId !== undefined
        return (
            isAwaitingAccessTokenSignature ||
            this.isAwaitingTopologyTransactionSignature
        )
    }

    private syncPolling() {
        if (this.isConnected && this.hasPendingApproval() && !document.hidden) {
            this.startPolling()
        } else {
            this.stopPolling()
        }
    }

    private startPolling() {
        if (this.pollTimer) return
        this.pollTimer = setTimeout(() => void this.poll(), this.pollDelay)
    }

    private stopPolling() {
        if (this.pollTimer) {
            clearTimeout(this.pollTimer)
            this.pollTimer = null
        }
    }

    private async poll() {
        this.pollTimer = null
        if (this.polling || !this.sessionId || !this.hasPendingApproval()) {
            return
        }
        this.polling = true

        try {
            const settled = this.loginMessageId
                ? await this.pollLoginStatus(
                      this.sessionId,
                      this.loginMessageId
                  )
                : await this.pollPartyAllocation(this.sessionId)
            this.pollDelay = settled
                ? this.pollIntervalMs
                : Math.min(this.pollDelay * 1.5, this.pollIntervalMs * 5)
        } catch (error) {
            console.error(error)
            this.pollDelay = Math.min(
                this.pollDelay * 2,
                this.pollIntervalMs * 10
            )
        } finally {
            this.polling = false
            this.syncPolling()
        }
    }

    // TODO maybe the name of api method should more directly indicate it's about access token signature
    private async pollLoginStatus(
        sessionId: string,
        messageId: string
    ): Promise<boolean> {
        const client = await createUserClient()
        const result = await client.request({
            method: 'getSelfIssuedLoginStatus',
            params: { sessionId, messageId },
        })
        if (result.status === 'awaiting-signature') {
            return false
        }
        await this.handleLoginResult(result)
        return true
    }

    private async pollPartyAllocation(sessionId: string): Promise<boolean> {
        const wallet = this.wallet
        if (!wallet) {
            return true
        }
        const client = await createUserClient()
        const result = await client.request({
            method: 'allocateSelfIssuedWallet',
            params: { sessionId, partyId: wallet.partyId },
        })
        await this.handleWalletResult(result.wallet)
        return !this.isAwaitingTopologyTransactionSignature
    }

    private async handleWalletResult(wallet: Wallet): Promise<void> {
        switch (wallet.status) {
            case 'allocated':
                this.wallet = wallet
                await this.connectSession(wallet)
                return
            case 'initialized':
                this.wallet = wallet
                this.syncPolling()
                return
            case 'removed':
                this.wallet = undefined
                handleErrorToast(new Error('Party allocation was rejected'))
                return
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
                    ...(event.keyName && { keyName: event.keyName }),
                },
            })
            await this.handleWalletResult(result.wallet)
        } catch (error) {
            handleErrorToast(error)
        } finally {
            this.submitting = false
        }
    }

    private async onSigningProviderChange(
        event: SigningProviderChangeEvent
    ): Promise<void> {
        this.selectedSigningProvider = event.signingProviderId
        this.publicKeys = []
        if (!this.keySigningProviders.includes(event.signingProviderId)) {
            return
        }
        await this.loadSigningProviderKeys(event.signingProviderId)
    }

    private async loadSigningProviderKeys(
        signingProviderId: string
    ): Promise<void> {
        if (!this.sessionId) {
            return
        }

        this.publicKeysLoading = true
        try {
            const client = await createUserClient()
            const { keys } = await client.request({
                method: 'listSelfIssuedSigningProviderKeys',
                params: { sessionId: this.sessionId, signingProviderId },
            })
            if (this.selectedSigningProvider !== signingProviderId) {
                return
            }
            this.publicKeys = keys.sort((a, b) => a.name.localeCompare(b.name))
            if (keys.length === 0) {
                showToast(
                    'No public keys found',
                    'No public keys are available for the selected signing provider.',
                    'info'
                )
            }
        } catch (error) {
            handleErrorToast(error)
        } finally {
            this.publicKeysLoading = false
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
            this.setLoginMessageId(undefined)
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

    private renderPartySelect(wallets: Wallet[]) {
        return html`
            <div class="d-flex flex-column gap-3">
                ${wallets.map(
                    (wallet) => html`
                        <wg-wallet-card
                            .wallet=${wallet}
                            .selectLabel=${'Select'}
                            ?selecting=${this.submitting}
                            @wallet-select=${this.selectAuthParty}
                        ></wg-wallet-card>
                    `
                )}
            </div>
        `
    }

    private renderProgress(label: string) {
        return html`
            <div class="d-flex align-items-center gap-2 text-body-secondary">
                <div class="spinner-border spinner-border-sm"></div>
                <span>${label}</span>
            </div>
        `
    }

    private renderAwaitingApproval(instructions: string) {
        return html`
            <div class="d-flex flex-column gap-3">
                <p class="text-body-secondary mb-0">${instructions}</p>
                ${this.renderProgress('Waiting for approval...')}
            </div>
        `
    }

    private renderPartyAwaitingApproval() {
        return this.renderAwaitingApproval(
            'Approve the party creation request in your signing provider. Onboarding will continue once it is approved.'
        )
    }

    private renderLoginAwaitingApproval() {
        return this.renderAwaitingApproval(
            'Approve the login request in your signing provider. You will be logged in once it is approved.'
        )
    }

    private renderLoginFailure(failureReason: string) {
        const wallet = this.loginWallet
        return html`
            <div class="d-flex flex-column gap-3">
                ${this.renderAlert(failureReason)}
                ${
                    wallet
                        ? html`
                              <button
                                  class="btn btn-primary rounded-pill w-100 d-inline-flex align-items-center justify-content-center gap-2"
                                  type="button"
                                  ?disabled=${this.submitting}
                                  @click=${() => this.connectSession(wallet)}
                              >
                                  ${
                                      this.submitting
                                          ? html`<span
                                                class="spinner-border spinner-border-sm"
                                                aria-hidden="true"
                                            ></span>`
                                          : nothing
                                  }
                                  Try again
                              </button>
                          `
                        : this.renderOnboardingStep()
                }
            </div>
        `
    }

    private renderCreateForm() {
        return html`
            <wg-wallet-create-form
                .signingProviders=${this.signingProviders}
                ?signingProvidersLoading=${this.signingProvidersLoading}
                .keySigningProviders=${this.keySigningProviders}
                .selectedSigningProvider=${this.selectedSigningProvider}
                .publicKeys=${this.publicKeys}
                ?publicKeysLoading=${this.publicKeysLoading}
                .showPrimary=${false}
                .submitLabel=${'Create party'}
                ?submitting=${this.submitting}
                @wallet-create=${this.createWallet}
                @signing-provider-change=${this.onSigningProviderChange}
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
        if (this.loggingIn) return this.renderProgress('Logging in...')
        if (this.loginMessageId) return this.renderLoginAwaitingApproval()
        if (this.loginFailure) return this.renderLoginFailure(this.loginFailure)

        return this.renderOnboardingStep()
    }

    private renderOnboardingStep() {
        if (this.loginMode === 'select') {
            return this.authWallets.length === 0
                ? this.renderAlert(
                      'No wallet was found for the authentication party.'
                  )
                : this.renderPartySelect(this.authWallets)
        }

        if (!this.wallet) return this.renderCreateForm()
        if (this.isAwaitingTopologyTransactionSignature) {
            return this.renderPartyAwaitingApproval()
        }
        return this.submitting
            ? this.renderProgress('Logging in...')
            : this.renderPartySelect([this.wallet])
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
