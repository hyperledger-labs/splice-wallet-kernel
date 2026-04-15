// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css } from 'lit'

// TODO: consider creating a common Card.ts web component
export const cardStyles = css`
    .wg-card {
        background: var(--wg-surface);
        border: 1px solid var(--wg-border);
        border-radius: var(--wg-radius-lg);
        box-shadow: var(--wg-shadow-sm);
        display: flex;
        flex-direction: column;
        gap: var(--wg-space-2);
        min-width: 0;
        transition:
            box-shadow 0.2s ease,
            border-color 0.2s ease,
            transform 0.2s ease;
    }

    .wg-card:hover {
        border-color: var(--wg-accent);
        box-shadow: var(--wg-shadow-md);
    }

    .network-card {
        background: #fff;
        border: none;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        min-width: 0;
    }

    .network-meta {
        color: var(--bs-gray-600);
        margin-bottom: 0.5rem;
        word-break: break-all;
    }

    .network-desc {
        color: var(--bs-gray-700);
        margin-bottom: 0.5rem;
        word-break: break-all;
    }
`
