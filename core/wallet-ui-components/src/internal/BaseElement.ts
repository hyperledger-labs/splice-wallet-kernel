// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, CSSResultGroup, LitElement, unsafeCSS } from 'lit'
import defaultTheme from '../../themes/default.css?inline'
import mainStyles from '../styles/index.js'

/**
 * Use this element as the base class for all custom elements to ensure consistent theming
 */
export class BaseElement extends LitElement {
    static styles = [
        mainStyles,
        css`
            ${unsafeCSS(defaultTheme)}
        `,
    ] as CSSResultGroup
}
