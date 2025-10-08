// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, CSSResultGroup, LitElement, unsafeCSS } from 'lit'
import bootstrapCss from 'bootstrap/dist/css/bootstrap.min.css?inline'
import defaultTheme from '../../themes/default.css?inline'
import mainStyles from '../styles/index.js'

/**
 * Use this element as the base class for all custom elements to ensure consistent theming
 */
export class BaseElement extends LitElement {
    static styles = [
        mainStyles,
        css`
            ${unsafeCSS(bootstrapCss.replaceAll(/:root/g, ':root,:host'))}
            ${unsafeCSS(defaultTheme)}

            :host {
                --bs-body-color: var(--wg-theme-text-color);

                margin: 0;
                font-family: var(--bs-body-font-family);
                font-size: var(--bs-body-font-size);
                font-weight: var(--bs-body-font-weight);
                line-height: var(--bs-body-line-height);
                color: var(--bs-body-color);
                text-align: var(--bs-body-text-align);
                background-color: var(--bs-body-bg);
                -webkit-text-size-adjust: 100%;
                -webkit-tap-highlight-color: transparent;
            }
        `,
    ] as CSSResultGroup
}
