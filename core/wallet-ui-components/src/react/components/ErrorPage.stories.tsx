// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/react-vite'
import { ErrorPage } from './ErrorPage'

const meta: Meta = {
    title: 'ErrorPage',
    component: ErrorPage,
    args: {},
    beforeEach: () => {},
}

export default meta

type Story = StoryObj<typeof meta>

export const BackMode: Story = {
    args: {
        title: 'Not Found',
        message: 'The page you are looking for could not be found.',
        mode: 'back',
    },
    // play: async ({ canvas, userEvent }) => {},
}

export const RefreshMode: Story = {
    args: {
        mode: 'refresh',
    },
    // play: async ({ canvas, userEvent }) => {},
}
