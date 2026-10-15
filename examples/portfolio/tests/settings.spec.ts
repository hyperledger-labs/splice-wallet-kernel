// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { test, expect, type Page } from '@playwright/test'
import type { PartyId } from '@canton-network/core-types'
import { toPortfolioInstrument } from '../src/types/instruments'
import { normalizeRegistryUrl } from '../src/utils/registry'
import {
    createGatewayApi,
    connectGateway,
    createWalletGateway,
    expectWalletBalance,
    gotoConnect,
    setupRegistry,
    tap,
} from './utils'

const REGISTRY_INFO_PATH = '/registry/metadata/v1/info'
const LOCAL_REGISTRY_URL = 'http://scan.localhost:4000'

// Settings tests involve wallet setup and a tap transaction, so give them
// more time than the default 30s.
test.setTimeout(120_000)

const connectToSettings = async (page: Page) => {
    const wg = createWalletGateway(page)

    await gotoConnect(page)
    await connectGateway(page, wg)
    await page.goto('http://localhost:8081/dashboard/settings')
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

    return wg
}

const registriesSection = (page: Page) =>
    page.locator('section[aria-labelledby="registries-heading"]')

const registryRow = (page: Page, registryUrl: string) => {
    const visibleUrl =
        registryUrl.length <= 30
            ? registryUrl
            : `${registryUrl.slice(0, 30)}...`
    return registriesSection(page)
        .getByRole('row')
        .filter({ hasText: visibleUrl })
}

const refetchRegistryReachability = async (page: Page) => {
    await page.evaluate(() =>
        window.dispatchEvent(new Event('visibilitychange'))
    )
    await page.waitForTimeout(50)
}

test('registry management', async ({ page: dappPage }) => {
    await connectToSettings(dappPage)
    await setupRegistry(dappPage)

    const section = registriesSection(dappPage)

    // Verify the registry was added with the DSO party ID and registry URL.
    await expect(
        section.getByRole('heading', { name: 'Registries' })
    ).toBeVisible()
    await expect(section.getByText(/^DSO::/)).toBeVisible()
    await expect(section.getByText(LOCAL_REGISTRY_URL)).toBeVisible()
    await expect(
        registryRow(dappPage, LOCAL_REGISTRY_URL).getByLabel(
            'Registry status: Reachable'
        )
    ).toBeVisible()

    // Delete the stored override. The immutable configured registry remains.
    await section.getByRole('button', { name: 'Delete' }).click()
    await expect(section.getByText(LOCAL_REGISTRY_URL)).toBeVisible()
    await expect(section.getByRole('button', { name: 'Delete' })).toHaveCount(0)
})

test('registry reachability updates on failure and recovery', async ({
    page: dappPage,
}) => {
    await connectToSettings(dappPage)

    const row = registryRow(dappPage, LOCAL_REGISTRY_URL)
    await expect(row.getByLabel('Registry status: Reachable')).toBeVisible({
        timeout: 10000,
    })

    let failedRequests = 0
    await dappPage.route(`**${REGISTRY_INFO_PATH}`, async (route) => {
        await route.fulfill({ status: 503, body: 'Registry unavailable' })
        failedRequests += 1
    })

    await refetchRegistryReachability(dappPage)
    await expect.poll(() => failedRequests).toBe(1)
    await expect(row.getByText('Unreachable', { exact: true })).toBeVisible()

    // A later success restores reachability.
    await dappPage.unroute(`**${REGISTRY_INFO_PATH}`)
    await refetchRegistryReachability(dappPage)
    await expect(row.getByText('Reachable', { exact: true })).toBeVisible({
        timeout: 10000,
    })
})

test('one reachable registry keeps validation valid', async ({
    page: dappPage,
}) => {
    const unreachableUrl = 'http://unreachable.registry.test:4000'
    await dappPage.route('**/config.json', (route) =>
        route.fulfill({
            json: {
                amulet: {
                    validatorUrl: 'http://localhost:2000/api/validator',
                    registry: LOCAL_REGISTRY_URL,
                },
                token: {
                    validatorUrl: 'http://localhost:2000/api/validator',
                    registries: [{ url: unreachableUrl }],
                },
            },
        })
    )
    await dappPage.route(`${unreachableUrl}${REGISTRY_INFO_PATH}`, (route) =>
        route.fulfill({ status: 503, body: 'Registry unavailable' })
    )

    await connectToSettings(dappPage)
    await expect(
        registryRow(dappPage, LOCAL_REGISTRY_URL).getByText('Reachable', {
            exact: true,
        })
    ).toBeVisible({ timeout: 10000 })

    await refetchRegistryReachability(dappPage)
    await expect(
        registryRow(dappPage, unreachableUrl).getByText('Unreachable', {
            exact: true,
        })
    ).toBeVisible({ timeout: 10000 })

    await dappPage.goto('http://localhost:8081/')
    await expect(
        dappPage.getByRole('heading', {
            name: 'Registry Configuration Required',
        })
    ).not.toBeVisible()
})

test('URL-only registry remains visible and recovers its admin party', async ({
    page: dappPage,
}) => {
    const registryUrl = 'http://recover.registry.test:4000'
    const adminId = `Recovery::1220${'1'.repeat(64)}`
    let registryIsReachable = false
    let failedRequests = 0

    await dappPage.route('**/config.json', (route) =>
        route.fulfill({
            json: {
                amulet: {
                    validatorUrl: 'http://localhost:2000/api/validator',
                    registry: registryUrl,
                },
                token: {
                    validatorUrl: 'http://localhost:2000/api/validator',
                    registries: [],
                },
            },
        })
    )
    await dappPage.route(`${registryUrl}${REGISTRY_INFO_PATH}`, (route) =>
        registryIsReachable
            ? route.fulfill({
                  json: { adminId, supportedApis: {} },
              })
            : route
                  .fulfill({
                      status: 503,
                      body: 'Registry unavailable',
                  })
                  .finally(() => {
                      failedRequests += 1
                  })
    )

    await connectToSettings(dappPage)

    const row = registryRow(dappPage, registryUrl)
    await expect(row.getByText('Resolving…')).toBeVisible({ timeout: 10000 })
    await expect(row.getByRole('button', { name: 'Delete' })).toHaveCount(0)
    await expect.poll(() => failedRequests).toBeGreaterThanOrEqual(1)

    await refetchRegistryReachability(dappPage)
    await expect(row.getByText('Unreachable', { exact: true })).toBeVisible({
        timeout: 10000,
    })

    registryIsReachable = true
    await refetchRegistryReachability(dappPage)
    await expect(row.getByText(/^Recovery::/)).toBeVisible({ timeout: 10000 })
    await expect(row.getByText('Reachable', { exact: true })).toBeVisible()
})

test('normalizes registry URL aliases consistently', () => {
    expect(normalizeRegistryUrl(`${LOCAL_REGISTRY_URL}/registry/`)).toBe(
        LOCAL_REGISTRY_URL
    )
    expect(
        normalizeRegistryUrl(
            `${LOCAL_REGISTRY_URL}/registry/?ignored=true#fragment`
        )
    ).toBe(LOCAL_REGISTRY_URL)
    expect(
        normalizeRegistryUrl(
            'https://apps.da.com/registrar/operator::1234567890/'
        )
    ).toBe('https://apps.da.com/registrar/operator::1234567890')
})

test('instrument mapping preserves registry and SDK fields', () => {
    const instrument = toPortfolioInstrument({
        instrument: {
            id: 'Amulet',
            name: 'Amulet',
            symbol: 'AMT',
            decimals: 10,
            paused: false,
            showAccountInputFields: false,
            supportedApis: {
                'splice-api-token-transfer-instruction-v2': 1,
                'splice-api-token-allocation-v1': 1,
                'splice-api-token-holding-v2': 1,
                'splice-api-token-allocation-instruction-v2': 1,
                'splice-api-token-metadata-v1': 1,
                'splice-api-token-allocation-v2': 1,
                'splice-api-token-transfer-events-v2': 1,
                'splice-api-token-transfer-instruction-v1': 1,
                'splice-api-token-holding-v1': 1,
                'splice-api-token-allocation-instruction-v1': 1,
            },
        },
        admin: 'DSO::1220admin' as PartyId,
        registryUrl: LOCAL_REGISTRY_URL,
    })

    expect(instrument).toEqual({
        id: 'Amulet',
        admin: 'DSO::1220admin',
        registryUrl: new URL(LOCAL_REGISTRY_URL),
        displayName: 'Amulet',
        name: 'Amulet',
        symbol: 'AMT',
        decimals: 10,
        capabilities: {
            allocation: ['v1', 'v2'],
            allocationInstruction: ['v1', 'v2'],
            allocationRequest: [],
            holding: ['v1', 'v2'],
            transferInstruction: ['v1', 'v2'],
        },
    })
})

test('tap via settings page', async ({ page: dappPage }) => {
    const rnd = Math.floor(Math.random() * 100000)
    const wg = createWalletGateway(dappPage)

    // Scaffolding: this test is about the tap flow, not about creating wallets.
    const api = await createGatewayApi()
    const alice = await api.createWallet({
        partyHint: `alice-${rnd}`,
        signingProvider: 'participant',
        primary: true,
    })

    await gotoConnect(dappPage)
    await connectGateway(dappPage, wg)

    await setupRegistry(dappPage)
    await tap(dappPage, wg, '5000.123456789')

    // The wallet is freshly created, so its balance equals the tapped amount.
    await expectWalletBalance(dappPage, alice, '5000.123456789')
})
