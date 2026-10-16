// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import Button, { type ButtonProps } from '@mui/material/Button'
import { createLink } from '@tanstack/react-router'

function AnchorButton(props: ButtonProps<'a'>) {
    return <Button component="a" {...props} />
}

/** MUI Button that navigates like a type-safe router Link. */
export const ButtonLink = createLink(AnchorButton)
