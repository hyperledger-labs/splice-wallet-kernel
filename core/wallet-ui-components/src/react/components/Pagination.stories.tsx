// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'
import { Pagination } from './Pagination'

const meta: Meta<typeof Pagination> = {
    title: 'Pagination',
    component: Pagination,
    args: {
        onPageChange: fn(),
    },
}

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
    args: { total: 19, pageSize: 5 },
    play: async ({ args, canvas, userEvent }) => {
        await expect(canvas.getByText('1-5 of 19')).toBeInTheDocument()
        await expect(
            canvas.getByRole('button', { name: 'Previous page' })
        ).toBeDisabled()

        await userEvent.click(canvas.getByRole('button', { name: 'Next page' }))
        await expect(args.onPageChange).toHaveBeenCalledTimes(1)
        await expect(args.onPageChange).toHaveBeenCalledWith(2)
    },
}

export const MiddlePage: Story = {
    args: { total: 42, pageSize: 10, page: 3 },
    play: async ({ args, canvas, userEvent }) => {
        await expect(canvas.getByText('21-30 of 42')).toBeInTheDocument()

        await userEvent.click(
            canvas.getByRole('button', { name: 'Previous page' })
        )
        await expect(args.onPageChange).toHaveBeenLastCalledWith(2)

        await userEvent.click(canvas.getByRole('button', { name: 'Next page' }))
        await expect(args.onPageChange).toHaveBeenLastCalledWith(4)
    },
}

export const LastPage: Story = {
    args: { total: 19, pageSize: 5, page: 4 },
    play: async ({ args, canvas }) => {
        await expect(canvas.getByText('16-19 of 19')).toBeInTheDocument()
        await expect(
            canvas.getByRole('button', { name: 'Next page' })
        ).toBeDisabled()
        await expect(
            canvas.getByRole('button', { name: 'Previous page' })
        ).toBeEnabled()
        await expect(args.onPageChange).not.toHaveBeenCalled()
    },
}

export const Empty: Story = {
    args: { total: 0 },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('0-0 of 0')).toBeInTheDocument()
        await expect(
            canvas.getByRole('button', { name: 'Previous page' })
        ).toBeDisabled()
        await expect(
            canvas.getByRole('button', { name: 'Next page' })
        ).toBeDisabled()
    },
}

export const PageOutOfRange: Story = {
    args: { total: 10, pageSize: 5, page: 99 },
    play: async ({ args, canvas }) => {
        // Clamped for display only; the caller owns `page`
        await expect(canvas.getByText('6-10 of 10')).toBeInTheDocument()
        await expect(
            canvas.getByRole('button', { name: 'Next page' })
        ).toBeDisabled()
        await expect(args.onPageChange).not.toHaveBeenCalled()
    },
}

export const Controlled: Story = {
    args: { total: 29, pageSize: 5 },
    render: (args) => {
        const [page, setPage] = useState(1)
        return (
            <Pagination
                {...args}
                page={page}
                onPageChange={(next) => {
                    args.onPageChange(next)
                    setPage(next)
                }}
            />
        )
    },
    play: async ({ args, canvas, userEvent }) => {
        const next = canvas.getByRole('button', { name: 'Next page' })
        const prev = canvas.getByRole('button', { name: 'Previous page' })

        for (const range of ['6-10', '11-15', '16-20', '21-25', '26-29']) {
            await userEvent.click(next)
            await expect(canvas.getByText(`${range} of 29`)).toBeInTheDocument()
        }
        await expect(next).toBeDisabled()
        await expect(args.onPageChange).toHaveBeenCalledTimes(5)

        await userEvent.click(prev)
        await expect(canvas.getByText('21-25 of 29')).toBeInTheDocument()
    },
}
