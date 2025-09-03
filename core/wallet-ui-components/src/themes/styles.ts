// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
import { css } from 'lit'
export const styles = css`
    .table-wrapper {
        max-height: 300px;
        overflow-y: auto;
        border: 1px solid var(--splice-wk-border-color, #ccc);
        border-radius: 4px;
    }

    table {
        width: 100%;
        border-collapse: collapse;
    }

    thead th {
        position: sticky;
        top: 0;
        z-index: 1;
        text-align: left;
        padding: 8px 12px;
        border-bottom: 1px solid var(--splice-wk-border-color, #ccc);
    }

    tbody td {
        padding: 8px 12px;
        border-bottom: 1px solid var(--splice-wk-border-color, #ccc);
    }

    tr:nth-child(even) {
        background-color: var(--splice-wk-background-color, none);
    }

    .actions button {
        margin-right: 4px;
        font-size: 0.8rem;
        padding: 4px 8px;
    }

    .modal {
        position: fixed;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .modal-content {
        background: var(--splice-wk-background-color, none);
        padding: 1.5rem;
        border-radius: 8px;
        width: 400px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
    }

    .form {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    input,
    select {
        padding: 6px;
        font-size: 1rem;
    }

    .buttons {
        display: flex;
        justify-content: flex-end;
        margin-top: 1rem;
        gap: 0.5rem;
        margin-bottom: 1.5rem;
    }
`
