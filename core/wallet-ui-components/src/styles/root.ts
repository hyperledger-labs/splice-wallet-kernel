// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css } from 'lit'

/**
 * General styles that affect the whole window
 */
export const root = css`
    * {
        color: var(--wg-theme-text-color, black);
        font-family: var(--wg-theme-font-family);
    }

    .container {
        padding: 20px;
    }
`
