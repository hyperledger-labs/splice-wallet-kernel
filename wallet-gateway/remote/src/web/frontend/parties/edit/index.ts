// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { html } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import {
    type WalletEditEvent,
    handleErrorToast,
    toRelPath,
} from '@canton-network/core-wallet-ui-components'
import { createUserClient } from '../../rpc-client'
import { setLocationHref } from '../../navigation.js'
import { stateManager } from '../../state-manager'
import '../../index'
import { WALLET_STATUS_CODE } from '../index'
import type { Wallet } from '@canton-network/core-wallet-user-rpc-client'
import { detectCurrentOrigin } from '../../listeners.js'
import { UserUiAddOrEditParty } from '../common.js'
import { SigningProvider } from '@canton-network/core-signing-lib'

@customElement('user-ui-edit-party')
export class UserUiEditParty extends UserUiAddOrEditParty {
    @state() accessor userClient!: Awaited<ReturnType<typeof createUserClient>>
    @state() accessor wallet!: Wallet

    @state() accessor selectedPublicKey = ''

    protected readonly pageTitle = 'Edit party'
    protected readonly showToast = true

    private get partyId() {
        const partyId = new URLSearchParams(window.location.search).get(
            'partyId'
        )
        if (!partyId) throw new Error('partyId query param must be provided')
        return partyId
    }

    private get loaded() {
        return Boolean(this.userClient)
    }

    override async connectedCallback() {
        super.connectedCallback()
        const currentOrigin = await detectCurrentOrigin()
        this.userClient = await createUserClient(
            await stateManager.accessToken.get(currentOrigin)
        )
        const result = await this.userClient.request({
            method: 'getWallet',
            params: { partyId: this.partyId },
        })
        if (!result) throw new Error('wallet not found')
        this.wallet = result
        this.selectedSigningProvider = this.wallet.signingProviderId
        this.selectedPublicKey = this.wallet.publicKey
        if (this.selectedSigningProvider !== SigningProvider.PARTICIPANT)
            await this.getSigningProviderKeys(this.wallet.signingProviderId)
    }

    private async onEditParty(event: WalletEditEvent) {
        if (!this.loaded) return
        this.submitting = true

        try {
            await this.userClient.request({
                method: 'changeSigningProvider',
                params: {
                    signingProviderId: event.signingProviderId,
                    partyId: event.partyId,
                    publicKey: event.publicKey,
                },
            })

            setLocationHref(
                `${toRelPath('/parties/')}?createPartyStatus=${WALLET_STATUS_CODE.WALLET_EDITED}`
            )
        } catch (error) {
            this.submitting = false
            handleErrorToast(error)
        }
    }

    protected get form() {
        return html`
            <wg-wallet-edit-form
                .signingProviders=${this.signingProviders}
                ?signingProvidersLoading=${this.signingProvidersLoading}
                .disabledSigningProviders=${[SigningProvider.PARTICIPANT]}
                .publicKeys=${this.publicKeys}
                .selectedSigningProvider=${this.selectedSigningProvider}
                .partyId=${this.partyId}
                .selectedPublicKey=${this.selectedPublicKey}
                ?publicKeysLoading=${this.publicKeysLoading}
                ?submitting=${this.submitting}
                @signing-provider-change=${this.onSigningProviderChange}
                @wallet-edit=${this.onEditParty}
            ></wg-wallet-edit-form>
        `
    }
}
