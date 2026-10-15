// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, html, type TemplateResult } from 'lit'
import { state } from 'lit/decorators.js'
import {
    BaseElement,
    chevronLeftIcon,
    handleErrorToast,
    type SigningProviderChangeEvent,
    toRelHref,
} from '@canton-network/core-wallet-ui-components'
import {
    type KeysList,
    SigningProvider,
} from '@canton-network/core-signing-lib'
import { setLocationHref } from '../navigation.js'
import type {
    SigningProviderId,
    SigningProviders,
} from '@canton-network/core-wallet-user-rpc-client'
import { detectCurrentOrigin } from '../listeners.js'
import { createUserClient } from '../rpc-client.js'
import { stateManager } from '../state-manager.js'
import { showToast } from '../utils.js'

export abstract class UserUiAddOrEditParty extends BaseElement {
    protected abstract get form(): TemplateResult
    protected abstract pageTitle: string
    protected abstract get showToast(): boolean

    @state() protected accessor submitting = false
    @state() protected accessor signingProviders: SigningProviders = []
    @state() protected accessor signingProvidersLoading = false
    @state() protected accessor publicKeys: KeysList = []
    @state() protected accessor publicKeysLoading = false
    @state() accessor selectedSigningProvider = ''

    override connectedCallback() {
        super.connectedCallback()
        void this.loadContext()
    }

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

    private navigateBack() {
        setLocationHref(toRelHref('/parties'))
    }

    private async loadContext() {
        this.signingProviders = []
        this.signingProvidersLoading = true
        try {
            const currentOrigin = await detectCurrentOrigin()
            const userClient = await createUserClient(
                await stateManager.accessToken.get(currentOrigin)
            )
            const result = await userClient.request({
                method: 'listSigningProviders',
            })
            this.signingProviders = result.signingProviders
        } catch (error) {
            handleErrorToast(error)
        } finally {
            this.signingProvidersLoading = false
        }
    }

    protected async getSigningProviderKeys(
        signingProviderId: SigningProviderId
    ) {
        this.publicKeysLoading = true
        const currentOrigin = await detectCurrentOrigin()
        try {
            const userClient = await createUserClient(
                await stateManager.accessToken.get(currentOrigin)
            )
            const { keys } = await userClient.request({
                method: 'listSigningProviderKeys',
                params: { signingProviderId },
            })
            this.publicKeys = keys.sort((a, b) => a.name.localeCompare(b.name))
            if (keys.length === 0 && this.showToast) {
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

    protected async onSigningProviderChange(event: SigningProviderChangeEvent) {
        this.publicKeys = []

        const { signingProviderId } = event
        this.selectedSigningProvider = signingProviderId
        if (signingProviderId === SigningProvider.PARTICIPANT) {
            return
        }

        await this.getSigningProviderKeys(signingProviderId)
    }

    protected render() {
        return html`
            <div class="page-header">
                <h1 class="h4 fw-semibold mb-0">${this.pageTitle}</h1>
                <button
                    class="btn btn-link btn-sm text-body text-decoration-none p-0 d-inline-flex align-items-center gap-1"
                    type="button"
                    @click=${this.navigateBack}
                >
                    ${chevronLeftIcon}
                    <span>Back</span>
                </button>
            </div>

            <div class="form-wrap">${this.form}</div>
        `
    }
}
