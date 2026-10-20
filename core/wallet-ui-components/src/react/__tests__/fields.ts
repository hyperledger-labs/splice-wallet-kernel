// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { expect, waitFor, type userEvent } from 'storybook/test'

/**
 * Replaces the content of a controlled field, for stories that fill in big
 * forms. Typing key by key re-renders the form on every character and, on a
 * slow machine, can start the next step before React has applied the last one.
 * This pastes the text in one go and waits for the field to settle after each
 * step, so the result doesn't depend on how fast the machine is
 */
export const fillField = async (
    user: ReturnType<typeof userEvent.setup>,
    field: HTMLElement,
    text: string
) => {
    await user.clear(field)
    await waitFor(() => expect(field).toHaveValue(''))
    if (text) {
        await user.paste(text)
        await waitFor(() => expect(field).toHaveValue(text))
    }
}
