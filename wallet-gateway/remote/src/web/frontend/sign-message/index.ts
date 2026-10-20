// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { html, nothing } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import {
    BaseElement,
    handleErrorToast,
    toRelHref,
} from '@canton-network/core-wallet-ui-components'
import { createUserClient } from '../rpc-client'
import { setLocationHref } from '../navigation.js'
import { stateManager } from '../state-manager'
import '../index'
import { ACTIVITIES_PAGE_REDIRECT } from '../constants'
import { showToast } from '../utils'
import type { GetSignMessageStatusResult } from '@canton-network/core-wallet-user-rpc-client'
import { detectCurrentOrigin } from '../listeners.js'

@customElement('user-ui-sign-message')
export class UserUiSignMessage extends BaseElement {
    @state() accessor messageId = ''
    @state() accessor message = ''
    @state() accessor origin: string | null = null
    @state() accessor status = ''
    @state() accessor externalTxId: string | null = null
    @state() accessor failureReason: string | null = null
    @state() accessor isApproving = false
    @state() accessor isDeleting = false
    @state() accessor disabled = false
    @state() accessor isSigning = false
    @state() accessor loadError: string | null = null
    @state() accessor isLoading = true
    @state() accessor pollIntervalMs = 3000
    private pollTimer: ReturnType<typeof setTimeout> | null = null
    private pollDelay = 3000
    private polling = false

    connectedCallback(): void {
        super.connectedCallback()
        const url = new URL(window.location.href)
        this.messageId = url.searchParams.get('messageId') || ''
        this.pollDelay = this.pollIntervalMs
        document.addEventListener('visibilitychange', this.onVisibilityChange)
        void this.load()
    }

    disconnectedCallback(): void {
        super.disconnectedCallback()
        this.stopPolling()
        document.removeEventListener(
            'visibilitychange',
            this.onVisibilityChange
        )
    }

    private closeOrGoToList() {
        this.disabled = true
        const params = new URLSearchParams(window.location.search)
        const shouldClose = params.has('closeafteraction')
        setTimeout(() => {
            if (shouldClose && window.opener) {
                window.close()
            } else {
                // TODO consider adding messages list page
                setLocationHref(toRelHref(ACTIVITIES_PAGE_REDIRECT))
            }
        }, 2000)
    }

    // TODO polling logic very similar to tx approve. consider extracting to a common module, or maybe create an issue to also add such polling for parties and than extract what is common for all

    private async load() {
        this.isLoading = true
        this.loadError = null
        try {
            if (!this.messageId) {
                this.loadError = 'Message not found.'
                return
            }
            await this.updateState()
        } finally {
            this.isLoading = false
        }
    }

    private async updateState() {
        try {
            const currentOrigin = await detectCurrentOrigin()
            const userClient = await createUserClient(
                await stateManager.accessToken.get(currentOrigin)
            )
            const result = await userClient.request({
                method: 'getMessageToSign',
                params: { messageId: this.messageId },
            })
            this.message = result.message.message
            this.origin = result.message.origin ?? null
            this.status = result.message.status
            this.externalTxId = result.message.externalTxId ?? null
            this.failureReason = result.message.failureReason ?? null
        } catch (err) {
            console.error(err)
            // Most common case: messageId doesn't exist anymore / was deleted
            this.loadError = 'Message not found.'
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

    private syncPolling() {
        if (
            this.isConnected &&
            this.status === 'awaiting-signature' &&
            !document.hidden
        ) {
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
        if (this.polling) return
        this.polling = true

        try {
            const currentOrigin = await detectCurrentOrigin()
            const userClient = await createUserClient(
                await stateManager.accessToken.get(currentOrigin)
            )
            const res: GetSignMessageStatusResult = await userClient.request({
                method: 'getSignMessageStatus',
                params: { messageId: this.messageId },
            })

            if (res.status !== this.status) {
                this.pollDelay = this.pollIntervalMs
                await this.updateState()
                if (res.status === 'signed') {
                    showToast('', 'Message signed successfully', 'success')
                    this.closeOrGoToList()
                }
                return
            }

            this.pollDelay = Math.min(
                this.pollDelay * 1.5,
                this.pollIntervalMs * 5
            )
        } catch (err) {
            console.error(err)
            this.pollDelay = Math.min(
                this.pollDelay * 2,
                this.pollIntervalMs * 10
            )
        } finally {
            this.polling = false
            this.syncPolling()
        }
    }

    private async handleApproveAction() {
        if (this.isSigning || this.isApproving) return

        if (this.status === 'awaiting-signature') {
            showToast(
                'Awaiting external signature',
                'Approve the request with your signing provider. This page will update automatically.',
                'info'
            )
            return
        }

        if (this.status !== 'pending') {
            return
        }

        return this.handleSign()
    }

    private async handleSign() {
        this.isSigning = true

        try {
            const currentOrigin = await detectCurrentOrigin()
            const userClient = await createUserClient(
                await stateManager.accessToken.get(currentOrigin)
            )
            const result = await userClient.request({
                method: 'signMessage',
                params: { messageId: this.messageId },
            })

            if (result.status === 'signed') {
                showToast('', 'Message signed successfully', 'success')
                this.closeOrGoToList()
                return
            }
            await this.updateState()
        } catch (err) {
            console.error(err)
            handleErrorToast(err, { message: 'Error signing message' })
            await this.updateState()
        } finally {
            this.isSigning = false
        }
    }

    private async handleReject() {
        if (!confirm('Reject pending message?')) {
            return
        }

        this.isDeleting = true

        try {
            const currentOrigin = await detectCurrentOrigin()
            const userClient = await createUserClient(
                await stateManager.accessToken.get(currentOrigin)
            )
            await userClient.request({
                method: 'deleteMessageToSign',
                params: { messageId: this.messageId },
            })

            showToast('', 'Message rejected successfully', 'success')
            this.closeOrGoToList()
        } catch (err) {
            console.error(err)
            handleErrorToast(err, { message: 'Error rejecting message' })
        } finally {
            this.isDeleting = false
        }
    }

    protected render() {
        if (this.isLoading) {
            return html` <p class="mb-0 text-body-secondary">Loading...</p> `
        }

        if (this.loadError) {
            return html`
                <div class="alert alert-warning" role="alert">
                    ${this.loadError}
                </div>
            `
        }

        return html`
            ${
                this.failureReason
                    ? html`<div class="alert alert-warning" role="alert">
                          ${this.failureReason}
                      </div>`
                    : nothing
            }
            <wg-message-detail
                .messageId=${this.messageId}
                .message=${this.message}
                .status=${this.status}
                .origin=${this.origin}
                .externalTxId=${this.externalTxId}
                .backHref=${toRelHref(ACTIVITIES_PAGE_REDIRECT)}
                .isApproving=${this.isApproving}
                .isDeleting=${this.isDeleting}
                .isSigning=${this.isSigning}
                .disabled=${this.disabled}
                @message-approve=${this.handleApproveAction}
                @message-delete=${this.handleReject}
            ></wg-message-detail>
        `
    }
}
