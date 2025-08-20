import { test, expect } from '@playwright/test'

test('dApp: execute externally signed tx', async ({ page: dappPage }) => {
    await dappPage.goto('http://localhost:8080/')

    // Expect a title "to contain" a substring.
    await expect(dappPage).toHaveTitle(/Example dApp/)

    const discoverPopupPromise = dappPage.waitForEvent('popup')

    await dappPage
        .getByRole('button', { name: 'connect to wallet kernel' })
        .click()

    const discoverPopup = await discoverPopupPromise

    // Connect to remote wallet kernel
    await discoverPopup
        .locator('div')
        .filter({ hasText: /^remote - http:\/\/localhost:3000\/rpcConnect$/ })
        .getByRole('button')
        .click()

    const wkPagePromise = dappPage.waitForEvent('popup')
    const wkPage = await wkPagePromise

    await wkPage.locator('#network').selectOption('1')
    await wkPage.getByRole('button', { name: 'Connect' }).click()

    // Reload due to issue #233
    await wkPage.waitForSelector('text=Logged In!')
    await wkPage.reload()

    await wkPage.getByRole('link', { name: 'Wallets' }).click()

    dappPage.reload() // Reloading to get the socket to reconnect in playwright
    await expect(dappPage.getByText(/status: connected/)).toBeVisible()

    const party1 = `test-${Date.now()}`
    const party2 = `test-${Date.now() + 1}`

    // Create a participant party named `test1`
    await wkPage.getByRole('textbox', { name: 'Party ID hint:' }).click()
    await wkPage.getByRole('textbox', { name: 'Party ID hint:' }).fill(party1)
    await wkPage.getByLabel('Signing Provider:').selectOption('participant')
    await wkPage.getByLabel('Network:').selectOption('canton:local-oauth')

    await wkPage.getByRole('button', { name: 'Create' }).click()

    // Create a kernel party named `test2`
    await wkPage.getByRole('textbox', { name: 'Party ID hint:' }).click()
    await wkPage.getByRole('textbox', { name: 'Party ID hint:' }).fill(party2)
    await wkPage.getByLabel('Signing Provider:').selectOption('wallet-kernel')
    await wkPage
        .getByRole('checkbox', { name: 'Set as primary wallet:' })
        .check()
    await wkPage.getByRole('button', { name: 'Create' }).click()

    // Wait for parties to be allocated
    const list = wkPage.getByRole('list')
    await expect(list).toContainText(party1)
    await expect(list).toContainText(party2)

    // Create a Ping contract through the dapp with the new party
    await dappPage.getByRole('button', { name: 'create Ping contract' }).click()
    await expect(
        wkPage.getByRole('heading', { name: 'Pending Transaction Request' })
    ).toBeVisible()

    const id = new URL(wkPage.url()).searchParams.get('commandId')

    await wkPage.getByRole('button', { name: 'Approve' }).click()

    // Wait for command to have fully executed
    await expect(
        dappPage.getByText(`{"commandId":"${id}","status":"executed","`).first()
    ).toBeVisible()
})
