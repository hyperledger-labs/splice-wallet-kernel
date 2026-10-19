// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// Colour tokens ported from examples/portfolio/src/lib/theme.ts.

import type { ColorSystemOptions } from '@mui/material/styles'

export const walletColors = {
    black: '#000000',
    grey27: '#1B1B1B',
    grey36: '#272727',
    grey54: '#363636',
    grey69: '#454545',
    grey105: '#696969',
    grey207: '#CFCFCF',
    grey226: '#E2E2E2',
    white: '#FFFFFF',
    lightBlue99: '#96E4FD',
    lightBlue89: '#C8F1FE',
    yellow100: '#F3FF97',
    yellow99: '#F8FDCD',
    purple100: '#875CFF',
    purple90: '#561AFF',
    purple30: '#C6B2FF',
    red99: '#FD8575',
    green76: '#33C200',
    green80: '#BBFBD7',
} as const

interface StatusColors {
    background: string
    text: string
}

/**
 * App-specific tokens that differ between light and dark. They live under
 * `palette` so MUI emits them as CSS variables per colour scheme; read them
 * via `theme.vars.palette.wallet.*`.
 */
export interface WalletPaletteTokens {
    sidebar: { background: string; active: string }
    surface: { subtle: string; border: string; required: string }
    nav: { main: string; hover: string; soft: string }
    status: {
        pending: StatusColors
        'action-required': StatusColors
        'partially-allocated': StatusColors
        allocated: StatusColors
        expired: StatusColors
    }
}

declare module '@mui/material/styles' {
    interface CssThemeVariables {
        enabled: true
    }

    interface Palette {
        wallet: WalletPaletteTokens
    }

    interface PaletteOptions {
        wallet?: WalletPaletteTokens
    }
}

const nav = {
    main: walletColors.purple100,
    hover: walletColors.purple90,
    soft: walletColors.purple30,
}

const feedback = {
    error: { main: walletColors.red99, contrastText: walletColors.black },
    warning: { main: walletColors.red99, contrastText: walletColors.black },
    success: { main: walletColors.green76, contrastText: walletColors.black },
}

export const darkScheme: ColorSystemOptions = {
    palette: {
        primary: {
            main: walletColors.lightBlue99,
            light: walletColors.lightBlue89,
            contrastText: walletColors.black,
        },
        secondary: {
            main: walletColors.yellow100,
            light: walletColors.yellow99,
            contrastText: walletColors.black,
        },
        ...feedback,
        background: {
            default: walletColors.grey27,
            paper: walletColors.grey36,
        },
        text: {
            primary: walletColors.grey226,
            secondary: walletColors.grey207,
            disabled: walletColors.grey105,
        },
        divider: walletColors.grey69,
        action: {
            hover: walletColors.grey54,
            selected: walletColors.grey54,
            disabled: walletColors.grey105,
            disabledBackground: walletColors.grey54,
        },
        wallet: {
            sidebar: {
                background: walletColors.grey36,
                active: walletColors.grey54,
            },
            surface: {
                subtle: walletColors.grey36,
                border: walletColors.grey69,
                required: walletColors.grey54,
            },
            nav,
            status: {
                pending: {
                    background: walletColors.lightBlue89,
                    text: walletColors.black,
                },
                'action-required': {
                    background: walletColors.yellow99,
                    text: walletColors.black,
                },
                'partially-allocated': {
                    background: walletColors.yellow99,
                    text: walletColors.black,
                },
                allocated: {
                    background: walletColors.purple30,
                    text: walletColors.black,
                },
                expired: {
                    background: walletColors.grey54,
                    text: walletColors.grey207,
                },
            },
        },
    },
}

export const lightScheme: ColorSystemOptions = {
    palette: {
        primary: {
            main: walletColors.purple90,
            light: walletColors.purple100,
            contrastText: walletColors.white,
        },
        secondary: {
            main: walletColors.grey54,
            light: walletColors.grey69,
            contrastText: walletColors.white,
        },
        ...feedback,
        background: {
            default: walletColors.white,
            paper: walletColors.grey226,
        },
        text: {
            primary: walletColors.black,
            secondary: walletColors.grey54,
            disabled: walletColors.grey105,
        },
        divider: walletColors.grey207,
        action: {
            hover: walletColors.grey226,
            selected: walletColors.grey207,
            disabled: walletColors.grey105,
            disabledBackground: walletColors.grey207,
        },
        wallet: {
            sidebar: {
                background: walletColors.grey226,
                active: walletColors.grey207,
            },
            surface: {
                subtle: walletColors.white,
                border: walletColors.grey207,
                required: walletColors.grey226,
            },
            nav,
            status: {
                pending: {
                    background: walletColors.purple100,
                    text: walletColors.white,
                },
                'action-required': {
                    background: walletColors.grey69,
                    text: walletColors.white,
                },
                'partially-allocated': {
                    background: walletColors.grey69,
                    text: walletColors.white,
                },
                allocated: {
                    background: walletColors.purple30,
                    text: walletColors.black,
                },
                expired: {
                    background: walletColors.grey207,
                    text: walletColors.grey54,
                },
            },
        },
    },
}
