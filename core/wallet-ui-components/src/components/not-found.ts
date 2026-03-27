// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { BaseElement } from '../internal/base-element'
import './error-page' // ensure wg-error-page is registered

@customElement('not-found')
export class NotFound extends BaseElement {
    static styles = [
        BaseElement.styles,
        css`
            :host {
                display: block;
            }
        `,
    ]

    @property({ type: String }) href: string = '/'

    render() {
        return html`
            <wg-error-page
                mode="back"
                title="Page not found"
                message="Sorry, the page you're looking for doesn't exist. It may have been moved or deleted."
                backHref=${this.href}
            ></wg-error-page>
        `
    }
}
