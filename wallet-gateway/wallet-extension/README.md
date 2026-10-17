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
├── entrypoints/      WXT entry files for background.ts, popup/ and app/ (the full-page tab)
├── background/       service worker code, without DOM or React
├── content/          content script code
├── shared/           code that more than one runtime imports
└── ui/               React code for the extension pages
    ├── app/          mount, providers, router, query client and devtools
    ├── routes/       TanStack Router file routes and the generated routeTree.gen.ts
    ├── features/     one folder per product area, such as auth/ and parties/
    ├── components/   UI that several features use, such as AppShell
    ├── lib/query/    keys.ts with the query key factory
    └── theme/        MUI theme, tokens and fonts
```

## Conventions

### Entrypoints

Entry files only call into `src/`. `entrypoints/background.ts` calls `startBackground()` from `background/`, and the popup and app pages call `mountApp()` from `ui/app/mount`.

### Routes

A route file contains the path, `validateSearch`, `beforeLoad`, `loader` and a page component imported from a feature. The page itself lives in the feature folder. `autoCodeSplitting` still gives each page its own chunk.

A route that loads data looks like this:

```tsx
// src/ui/routes/_authed/parties/index.tsx
import { PartiesPage, walletsQuery } from '@/ui/features/parties'

export const Route = createFileRoute('/_authed/parties/')({
    loader: ({ context }) => context.queryClient.ensureQueryData(walletsQuery(...)),
    component: PartiesPage,
})
```

### Features

A feature folder holds the pages for one product area, an `api.ts` with its `queryOptions` factories and mutation hooks, and a `components/` folder for UI that only this feature uses. Its `index.ts` exports what the rest of the app may use, and other code imports from `@/ui/features/<name>` instead of files inside the folder.

Create a feature folder when you port its first page. UI that several features use goes in `ui/components/`. Presentational components that the remote web UI could also use go in `core/wallet-ui-components/src/react`, which has Storybook.

### State

- TanStack Query holds server state. Build query keys with `queryKeys` from `ui/lib/query/keys.ts`. After a mutation, invalidate with the key's `all` prefix.
- WXT storage items hold persisted state. Define them with `storage.defineItem` in `shared/`. No React hook subscribes to storage changes yet. Add one when a page has to update after another context writes to storage. The approval queue will be the first case.
- React state holds everything else. Don't add a global store library.

### Imports

ESLint (`eslint.config.mjs`) blocks these imports:

| Code in                          | May not import                                       |
| -------------------------------- | ---------------------------------------------------- |
| `ui/`, popup and app entrypoints | values from `background/` or `content/`              |
| `background/`                    | anything from `ui/`, or values from `content/`       |
| `content/`                       | anything from `ui/`, or values from `background/`    |
| `shared/`                        | anything from `ui/`, or values from other runtimes   |
| any file                         | the `@mui/material` or `@mui/icons-material` root    |
| any file                         | the `@canton-network/core-wallet-ui-components` root |

`import type` across runtimes is allowed. Import MUI by path, for example `@mui/material/Button`. Import the shared UI components from `@canton-network/core-wallet-ui-components/react`, because the package root loads Lit and Bootstrap CSS.

Use the `@/` alias to import across top-level folders. The ESLint rule doesn't check dynamic `import()`.

## Tests

Unit tests live next to the code as `*.test.ts` files. They run in Node with `WxtVitest`, which replaces `wxt/browser` with an in-memory fake browser. Call `fakeBrowser.reset()` in `beforeEach`. Nx infers the `test` target from `vitest.config.ts`.

```sh
pnpm nx test @canton-network/wallet-extension
```

## Devtools

`pnpm dev` shows the TanStack devtools with Router and Query panels. The root route only imports them when `import.meta.env.DEV` is true, so production builds leave them out.
