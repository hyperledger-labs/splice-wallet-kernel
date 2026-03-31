// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'

const meta: Meta = {
    title: 'Pagination',
}

export default meta

export const Default: StoryObj = {
    render: () =>
        html`<wg-pagination total=${19} pageSize=${5}></wg-pagination>`,
}

export const MiddlePage: StoryObj = {
    render: () =>
        html`<wg-pagination
            total=${42}
            pageSize=${10}
            page=${3}
        ></wg-pagination>`,
}

export const Interactive: StoryObj = {
    render: () => {
        const onPageChange = (e: Event) => {
            const page = (e as CustomEvent<{ page: number }>).detail.page
            console.log('page-change', { page })
        }

        return html`<wg-pagination
            total=${29}
            pageSize=${5}
            @page-change=${onPageChange}
        ></wg-pagination>`
    },
}
