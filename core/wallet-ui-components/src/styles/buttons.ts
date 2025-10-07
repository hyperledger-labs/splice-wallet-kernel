// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css } from 'lit'

export const buttons = css`
    .btn-primary,
    .btn-success {
        background-color: var(--wg-theme-primary-color);
        border-color: var(--wg-theme-primary-color);
    }

    .btn-outline-secondary {
        border-color: #6c757d;
        color: #6c757d;
    }

    .btn-outline-secondary:hover {
        background-color: #6c757d;
        color: #fff;
    }

    .buttons {
        padding: 0.4rem 0.8rem;
        font-size: 1rem;
        border-radius: 4px;
        border: 1px solid #ccc;
        background: #f5f5f5;
        cursor: pointer;
        transition: background 0.2s;
    }
    .buttons:hover {
        background: #e2e6ea;
    }
`
