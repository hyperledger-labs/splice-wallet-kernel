# Wallet extension

A browser extension wallet built with [WXT](https://wxt.dev), React, MUI, TanStack Router and TanStack Query.

```sh
pnpm --filter @canton-network/wallet-extension dev   # Chrome, with hot reload
pnpm nx run-many -t typecheck lint test build -p @canton-network/wallet-extension
```

## Layout

The top-level folders in `src/` follow the runtime the code runs in. The service worker, content script and extension pages don't share memory, so each gets its own folder.

```
src/
├── entrypoints/      WXT entry files for background.ts, content.ts, popup/ and app/ (the full-page tab)
├── background/       service worker code, without DOM or React
│   ├── controllers/
│   │   ├── dapp/     dApp API: controller.ts, the dispatch.ts entry point and rpc-gen/
│   │   └── user/     user API: one module per area (sessions.ts, wallets.ts, …) and rpc-gen/
│   ├── vault/        the encrypted vault: crypto, envelope format and the lock/unlock coordinator
│   ├── vault-service.ts  vault messages for the extension pages
│   ├── auth-context.ts, store.ts, status.ts, notifications.ts, open-ui.ts
│   └── index.ts      startBackground()
├── content/          content script code: startContent(), the JSON-RPC proxy and the notification relay
├── shared/           code that more than one runtime imports: service keys, ports, storage items, logger
├── __tests__/        test helpers such as fake-port.ts
└── ui/               React code for the extension pages
    ├── app/          mount, providers, router, query client and devtools
    ├── routes/       TanStack Router file routes and the generated routeTree.gen.ts
    ├── features/     one folder per product area, such as parties/ and vault/
    ├── components/   UI that several features use, such as AppShell
    ├── lib/query/    keys.ts with the query key factory
    └── theme/        MUI theme, tokens and fonts
```

## Conventions

### Entrypoints

Entry files only call into `src/`. `entrypoints/background.ts` calls `startBackground()` from `background/`, `entrypoints/content.ts` calls `startContent()` from `content/`, and the popup and app pages call `mountApp()` from `ui/app/mount`.

### Background

Chrome stops an idle service worker and starts it again for the next message or port connect. That event is lost if its listener isn't there yet, so `startBackground()` adds every listener (`registerService`, `runtime.onConnect`, `runtime.onMessage`) before its first `await`. Code that needs the wallet store takes a `getStore()` callback, which waits for the store to load.

### Vault

`background/vault/` keeps data encrypted in `local:vault`. The key comes from the user's password through PBKDF2-SHA-256, and the data is encrypted with AES-256-GCM. While the vault is unlocked, the decrypted data is in the background's memory and the key is cached in `session:vaultSession`. After a service worker restart, `startBackground()` restores the vault from that cached key without the password. Closing the browser, reloading the extension or pressing Lock clears it. Store secrets with `vault.defineItem(key, { fallback })`, which has the same shape as a WXT storage item.

The pages send `vault.getStatus`, `vault.create`, `vault.unlock` and `vault.lock` through `vaultMessenger` (`shared/vault-protocol.ts`). `vault-service.ts` answers them only from `popup.html` and `app.html`. Errors arrive as plain `Error`s, so compare `error.name` with `VaultErrorName`. While the vault isn't unlocked, every user API method rejects with `VaultLockedError`. The dApp dispatcher answers `status`, `isConnected` and `connect` with a not-connected result whose reason is `Locked`, and every other method with error 4100. Its `connect` also opens the unlock page.

The pages and the content script call the background through [`@webext-core/proxy-service`](https://webext-core.aklinker1.dev/proxy-service/installation). `shared/service-keys.ts` defines the keys:

- `USER_RPC_KEY` is the user API, for the extension pages.
- `DAPP_RPC_KEY` is the dApp dispatcher, for the content script. The content script calls `request(request, location.origin)`. The dispatcher builds the dApp controller for that origin, calls only the controller's own methods (`Object.hasOwn`) and always resolves to a JSON-RPC response. Thrown errors become JSON-RPC errors that keep their code.

The content script answers every dApp request that has an id. When the background can't be reached, for example after an extension reload, it replies with a JSON-RPC error.

### Controllers

`core/rpc-generator` writes the `rpc-gen/` folders from the OpenRPC specs in `api-specs/`. Don't edit them by hand. After a spec change, regenerate them from the repository root:

```sh
pnpm generate:user && pnpm generate:dapp
pnpm exec oxfmt wallet-gateway/wallet-extension/src/background/controllers
```

The user controller is split by area. Each module in `controllers/user/` returns a `Pick<Methods, …>` with the methods of its area, and `index.ts` spreads them into `buildController`. The generated `buildController` requires every method, so `tsc` fails when one is missing. Add a method to the module of its area. Methods the extension doesn't support go in `unsupported.ts`.

### Logging

Import `logger` (LogTape) from `shared/logger.ts`. Importing it configures a LogTape console sink for that context, which also receives the core libraries' records. A record's properties are appended to the message as an object. Don't log request or response payloads, notification arguments or tokens. Tests run with logging disabled.

### Naming

`shared/brand.ts` exports `WALLET_NAME`. The manifest name and the provider name announced to dApps come from it. It is "Wallet Extension" so that the old extension can stay installed next to this one.

### Routes

A route file contains the path, `validateSearch`, `beforeLoad`, `loader` and a page component imported from a feature. The page itself lives in the feature folder. `autoCodeSplitting` still gives each page its own chunk.

Pages that need an unlocked vault go under the pathless `_unlocked` layout, which renders them inside `AppShell`. Its `beforeLoad` sends the user to `/onboarding/password` before a vault exists and to `/unlock` while it's locked. `/onboarding` and `/unlock` sit outside it.

A route that loads data looks like this:

```tsx
// src/ui/routes/_unlocked/parties/index.tsx
import { PartiesPage, walletsQuery } from '@/ui/features/parties'

export const Route = createFileRoute('/_unlocked/parties/')({
    loader: ({ context }) => context.queryClient.ensureQueryData(walletsQuery(...)),
    component: PartiesPage,
})
```

### Features

A feature folder holds the pages for one product area, an `api.ts` with its `queryOptions` factories and mutation hooks, and a `components/` folder for UI that only this feature uses. Its `index.ts` exports what the rest of the app may use, and other code imports from `@/ui/features/<name>` instead of files inside the folder.

Create a feature folder when you port its first page. UI that several features use goes in `ui/components/`. Presentational components that the remote web UI could also use go in `core/wallet-ui-components/src/react`, which has Storybook.

### State

- TanStack Query holds server state. Build query keys with `queryKeys` from `ui/lib/query/keys.ts`. After a mutation, invalidate with the key's `all` prefix.
- WXT storage items hold persisted state. Define them with `storage.defineItem` in `shared/storage.ts`, and keep the storage keys stable, since existing installs read them. To follow writes from another context, subscribe with the item's `watch()`. For example, `watchVaultStatus()` (in `features/vault/`) watches `session:vaultStatus` from `mountApp`, so every open page clears its query cache and re-runs its route guards when the vault locks.
- React state holds everything else. Don't add a global store library.

### Imports

Oxlint (`.oxlintrc.json`) blocks these imports:

| Code in                          | May not import                                       |
| -------------------------------- | ---------------------------------------------------- |
| `ui/`, popup and app entrypoints | values from `background/` or `content/`              |
| `background/`                    | anything from `ui/`, or values from `content/`       |
| `content/`                       | anything from `ui/`, or values from `background/`    |
| `shared/`                        | anything from `ui/`, or values from other runtimes   |
| any file                         | the `@mui/material` or `@mui/icons-material` root    |
| any file                         | the `@canton-network/core-wallet-ui-components` root |

`import type` across runtimes is allowed. Import MUI by path, for example `@mui/material/Button`. Import the shared UI components from `@canton-network/core-wallet-ui-components/react`, because the package root loads Lit and Bootstrap CSS.

Use the `@/` alias to import across top-level folders. The lint rule doesn't check dynamic `import()`.

## Tests

Unit tests live next to the code as `*.test.ts` files. They run in Node with `WxtVitest`, which replaces `wxt/browser` and the global `chrome` with an in-memory fake browser. Call `fakeBrowser.reset()` in `beforeEach`. The fake browser doesn't implement every API, for example `runtime.onConnect`. Stub those with `vi.spyOn`. Shared test helpers live in `src/__tests__/`, and coverage skips that folder and the generated `rpc-gen/` folders. Nx infers the `test` target from `vitest.config.ts`.

```sh
pnpm nx test @canton-network/wallet-extension
```

## Devtools

`pnpm dev` shows the TanStack devtools with Router and Query panels. The root route only imports them when `import.meta.env.DEV` is true, so production builds leave them out.
