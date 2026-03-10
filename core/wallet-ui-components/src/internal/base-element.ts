// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, CSSResultGroup, LitElement, unsafeCSS } from 'lit'

import 'bootstrap/dist/css/bootstrap.min.css'
import '../../themes/default.css'

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
                --bs-body-font-family: var(--wg-font-family);
                --bs-body-font-size: var(--wg-font-size-base);
                --bs-body-font-weight: var(--wg-font-weight-normal);
                --bs-body-line-height: var(--wg-line-height-normal);
                --bs-body-color: var(--wg-text);
                --bs-body-bg: var(--wg-bg);

                --bs-border-color: var(--wg-border);
                --bs-border-radius: var(--wg-radius-md);

                --bs-primary: var(--wg-primary);
                --bs-primary-rgb: var(--wg-primary-rgb);
                --bs-secondary-color: var(--wg-text-secondary);
                --bs-success: var(--wg-success);
                --bs-success-rgb: var(--wg-success-rgb);
                --bs-danger: var(--wg-error);
                --bs-danger-rgb: var(--wg-error-rgb);

                --bs-link-color: var(--wg-accent);
                --bs-link-hover-color: #6d28d9;

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
