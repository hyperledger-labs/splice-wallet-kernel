// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, html, nothing } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import {
    BaseElement,
    IdpFormSaveEvent,
    IdpFormDeleteEvent,
    chevronLeftIcon,
    handleErrorToast,
    toRelHref,
    toRelPath,
} from '@canton-network/core-wallet-ui-components'
import { Idp } from '@canton-network/core-wallet-user-rpc-client'
import { createUserClient } from '../../rpc-client'
import { stateManager } from '../../state-manager'
import '../../index'

@customElement('user-ui-review-idp')
export class UserUiReviewIdp extends BaseElement {
    @state() accessor idp: Idp | null = null
    @state() accessor loading = true

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

            .form-wrap {
                width: 100%;
            }
        `,
    ]

    async connectedCallback(): Promise<void> {
        super.connectedCallback()
        await this.loadIdp()
    }

    private async loadIdp() {
        const params = new URLSearchParams(window.location.search)
        const idpId = params.get('id')

        if (!idpId) {
            this.navigateBack()
            return
        }

        try {
            const userClient = await createUserClient(
                stateManager.accessToken.get()
            )
            const result = await userClient.request({ method: 'listIdps' })

            const found = result.idps.find((i: Idp) => i.id === idpId)
            if (!found) {
                handleErrorToast(
                    new Error(`Identity provider "${idpId}" not found`)
                )
                this.navigateBack()
                return
            }

            this.idp = found
        } catch (error) {
            handleErrorToast(error)
            this.navigateBack()
        } finally {
            this.loading = false
        }
    }

    private navigateBack() {
        window.location.href = toRelHref('/identity-providers')
    }

    private async onSave(e: IdpFormSaveEvent) {
        try {
            const userClient = await createUserClient(
                stateManager.accessToken.get()
            )
            await userClient.request({
                method: 'addIdp',
                params: { idp: e.idp },
            })

            window.location.href = toRelPath('/identity-providers/')
        } catch (error) {
            handleErrorToast(error)
        }
    }

    private async onDelete(e: IdpFormDeleteEvent) {
        if (!confirm(`Delete identity provider "${e.idp.id}"?`)) return

        try {
            const userClient = await createUserClient(
                stateManager.accessToken.get()
            )
            await userClient.request({
                method: 'removeIdp',
                params: { identityProviderId: e.idp.id },
            })

            window.location.href = toRelPath('/identity-providers/')
        } catch (error) {
            handleErrorToast(error)
        }
    }

    private onCancel() {
        this.navigateBack()
    }

    protected render() {
        if (this.loading) {
            return html`<p class="mb-0 text-body-secondary">
                Loading identity provider...
            </p>`
        }

        if (!this.idp) {
            return nothing
        }

        return html`
            <div class="page-header">
                <h1 class="h4 fw-semibold mb-0">Review Identity Provider</h1>
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
                <idp-form
                    mode="review"
                    .idp=${this.idp}
                    @idp-form-save=${this.onSave}
                    @idp-form-cancel=${this.onCancel}
                    @idp-form-delete=${this.onDelete}
                ></idp-form>
            </div>
        `
    }
}
