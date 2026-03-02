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
        background: rgba(0, 0, 0, 0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }
    .modal-content {
        background: #fff;
        padding: 2rem;
        border-radius: 8px;
        min-width: 300px;
        max-width: 95vw;
        max-height: 75vh;
        overflow-y: scroll;
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
    }
    @media (max-width: 600px) {
        .modal-content {
            padding: 1rem;
            min-width: unset;
        }
    }
    @media (max-width: 400px) {
        .modal-content {
            padding: 0.5rem;
        }
    }
`
