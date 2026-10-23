// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// Maps this app's colours onto the `--wg-theme-*` tokens of the Lit components
// from @canton-network/core-wallet-ui-components, so they follow the MUI theme
// and its dark mode.
//
// The base tokens inherit through shadow roots, so setting them once on the
// root element reaches every Lit component, including those nested inside
// other Lit components. That is also why this is a stylesheet and not part of
// the MUI theme object.

import type { CSSObject } from '@mui/material/styles'
import { walletColors } from './tokens'

interface LitTokens {
    background: string
    surface: string
    surfaceHover: string
    text: string
    textSecondary: string
    border: string
    primary: string
    primaryHover: string
    primaryText: string
    success: string
    error: string
    inputBackground: string
    inputPlaceholder: string
}

const dark: LitTokens = {
    background: walletColors.grey27,
    surface: walletColors.grey36,
    surfaceHover: walletColors.grey54,
    text: walletColors.grey226,
    textSecondary: walletColors.grey207,
    border: walletColors.grey69,
    primary: walletColors.lightBlue99,
    primaryHover: walletColors.lightBlue89,
    primaryText: walletColors.black,
    success: walletColors.green76,
    error: walletColors.red99,
    inputBackground: walletColors.grey27,
    inputPlaceholder: walletColors.grey105,
}

// The dark scheme's feedback colours don't have enough contrast on white.
const light: LitTokens = {
    background: walletColors.white,
    surface: walletColors.grey226,
    surfaceHover: walletColors.grey207,
    text: walletColors.black,
    textSecondary: walletColors.grey54,
    border: walletColors.grey207,
    primary: walletColors.purple90,
    primaryHover: walletColors.purple100,
    primaryText: walletColors.white,
    success: '#077e3b',
    error: '#dc2626',
    inputBackground: walletColors.white,
    inputPlaceholder: walletColors.grey105,
}

/** `#rrggbb` as the `r, g, b` list that `rgba(var(--token), a)` needs. */
function rgb(hex: string): string {
    const value = Number.parseInt(hex.slice(1), 16)
    return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`
}

function tokens(t: LitTokens): CSSObject {
    return {
        '--wg-theme-font-family': 'Inter, sans-serif',
        '--wg-theme-background-color': t.background,
        '--wg-theme-surface-color': t.surface,
        '--wg-theme-surface-hover': t.surfaceHover,
        '--wg-theme-text-color': t.text,
        '--wg-theme-text-rgb': rgb(t.text),
        '--wg-theme-text-secondary': t.textSecondary,
        '--wg-theme-border-color': t.border,
        '--wg-theme-primary-color': t.primary,
        '--wg-theme-primary-hover': t.primaryHover,
        '--wg-theme-primary-text-color': t.primaryText,
        '--wg-theme-primary-rgb': rgb(t.primary),
        '--wg-theme-accent-color': t.primary,
        '--wg-theme-accent-hover': t.primaryHover,
        '--wg-theme-accent-rgb': rgb(t.primary),
        '--wg-theme-success-color': t.success,
        '--wg-theme-success-rgb': rgb(t.success),
        '--wg-theme-error-color': t.error,
        '--wg-theme-error-rgb': rgb(t.error),
        '--wg-theme-label-required-color': t.error,
        '--wg-theme-shade-rgb': rgb(t.text),
        '--wg-theme-icon-bg': `rgba(${rgb(t.text)}, 0.06)`,
        '--wg-theme-badge-bg': `rgba(${rgb(t.text)}, 0.1)`,
        '--wg-theme-input-bg': t.inputBackground,
        '--wg-theme-input-border': t.border,
        '--wg-theme-input-placeholder': t.inputPlaceholder,
    }
}

/**
 * For MUI's `GlobalStyles`. The class names come from `colorSchemeSelector:
 * 'class'`. `:root.light` is more specific than the library's own `:root`
 * defaults, so the order of the stylesheets doesn't matter.
 */
export const litBridgeStyles: Record<string, CSSObject> = {
    ':root.light': tokens(light),
    ':root.dark': tokens(dark),
}
