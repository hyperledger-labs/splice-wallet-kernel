// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { BaseElement } from '../internal/base-element.js'

/**
 * The title row at the top of a page.
 *
 * Slots:
 *  - default: actions at the end of the row, such as an add button or a back link
 *  - `title-suffix`: content right next to the title, such as a refresh button
 */
@customElement('wg-page-header')
export class WgPageHeader extends BaseElement {
    @property() heading = ''

    static styles = [
        BaseElement.styles,
        css`
            :host {
                display: block;
            }

            .page-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: var(--wg-space-3);
                margin-bottom: var(--wg-space-4);
            }

            .page-title-wrap {
                display: inline-flex;
                align-items: center;
                gap: 0.15rem;
            }

            .page-title-wrap > h1 {
                line-height: 1.2;
            }
        `,
    ]

    render() {
        return html`
            <div class="page-header">
                <div class="page-title-wrap">
                    <h1 class="h4 fw-semibold mb-0">${this.heading}</h1>
                    <slot name="title-suffix"></slot>
                </div>
                <slot></slot>
            </div>
        `
    }
}
