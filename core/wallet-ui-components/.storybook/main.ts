// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { StorybookConfig } from '@storybook/web-components-vite'

const config: StorybookConfig = {
    stories: ['../src/**/*.@(mdx|stories.@(js|jsx|ts|tsx))'],
    addons: [],
    framework: {
        name: '@storybook/web-components-vite',
        options: {
            builder: {
                viteConfigPath: 'vite.config.js',
            },
        },
    },
}

export default config

// To customize your Vite configuration you can use the viteFinal field.
// Check https://storybook.js.org/docs/react/builders/vite#configuration
// and https://nx.dev/recipes/storybook/custom-builder-configs
