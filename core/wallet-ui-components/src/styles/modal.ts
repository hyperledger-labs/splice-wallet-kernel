// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css } from 'lit'

// TODO: maybe turn this into a proper LitElement / web component
export const modalStyles = css`
    .modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }
    .modal-content {
        background: var(--wg-surface);
        padding: var(--wg-space-8);
        border-radius: var(--wg-radius-xl);
        min-width: 300px;
        max-width: 95vw;
        max-height: 75vh;
        overflow-y: scroll;
        box-shadow: var(--wg-shadow-lg);
        color: var(--wg-text);
        border: 1px solid var(--wg-border);
    }
    @media (max-width: 600px) {
        .modal-content {
            padding: var(--wg-space-4);
            min-width: unset;
        }
    }
    @media (max-width: 400px) {
        .modal-content {
            padding: var(--wg-space-2);
        }
    }
`
