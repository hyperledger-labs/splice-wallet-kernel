// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import {
    BaseElement,
    NetworkEditSaveEvent,
    chevronLeftIcon,
    handleErrorToast,
    toRelHref,
    toRelPath,
} from '@canton-network/core-wallet-ui-components'
import { Auth as ApiAuth } from '@canton-network/core-wallet-user-rpc-client'
import { Auth } from '@canton-network/core-wallet-auth'
import { createUserClient } from '../../rpc-client'
import { stateManager } from '../../state-manager'
import '../../index'

@customElement('user-ui-add-network')
export class UserUiAddNetwork extends BaseElement {
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

            .form-wrap {
                width: 100%;
            }
        `,
    ]

    private navigateBack() {
        window.location.href = toRelHref('/networks')
    }

    private toApiAuth(auth: Auth): ApiAuth {
        return {
            method: auth.method,
            audience: auth.audience ?? '',
            scope: auth.scope ?? '',
            clientId: auth.clientId ?? '',
            issuer: (auth as ApiAuth).issuer ?? '',
            clientSecret: (auth as ApiAuth).clientSecret ?? '',
        }
    }

    private async onSave(e: NetworkEditSaveEvent) {
        this.loading = true

        const auth = this.toApiAuth(e.network.auth)
        const adminAuth = e.network.adminAuth
            ? this.toApiAuth(e.network.adminAuth)
            : {
                  method: 'client_credentials',
                  audience: '',
                  scope: '',
                  clientId: '',
                  clientSecret: '',
              }

        try {
            const userClient = await createUserClient(
                stateManager.accessToken.get()
            )
            await userClient.request({
                method: 'addNetwork',
                params: {
                    network: {
                        id: e.network.id,
                        name: e.network.name,
                        description: e.network.description,
                        identityProviderId: e.network.identityProviderId,
                        ...(e.network.synchronizerId && {
                            synchronizerId: e.network.synchronizerId as string,
                        }),
                        ledgerApi: e.network.ledgerApi.baseUrl,
                        auth,
                        adminAuth,
                    },
                },
            })

            window.location.href = toRelPath('/networks/')
        } catch (error) {
            this.loading = false
            handleErrorToast(error)
        }
    }

    protected render() {
        return html`
            <div class="page-header">
                <h1 class="h4 fw-semibold mb-0">Add a new network</h1>
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
                <network-form
                    mode="add"
                    @network-edit-save=${this.onSave}
                ></network-form>
            </div>
        `
    }
}
