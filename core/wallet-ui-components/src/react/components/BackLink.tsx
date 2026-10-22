// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Button } from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'

interface BackLinkBaseProps {
    /** @default 'Back' */
    label?: string
}

interface BackLinkHrefProps extends BackLinkBaseProps {
    /** Renders a link; navigation goes through the theme's LinkComponent */
    href: string
    onClick?: never
}

interface BackLinkClickProps extends BackLinkBaseProps {
    href?: never
    /** Renders a button; the caller decides how to navigate */
    onClick: () => void
}

export type BackLinkProps = BackLinkHrefProps | BackLinkClickProps

export const BackLink = ({ label = 'Back', href, onClick }: BackLinkProps) => (
    <Button
        color="inherit"
        size="small"
        startIcon={<ChevronLeftIcon />}
        {...(href !== undefined ? { href } : { onClick })}
    >
        {label}
    </Button>
)
