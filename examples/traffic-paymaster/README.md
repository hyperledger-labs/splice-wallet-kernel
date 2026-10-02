# Traffic Paymaster — Example dApp

A minimal, throwaway UI that proves out `wallet-sdk`'s traffic-purchase API end to end: it shows a
paymaster's conversion rate, shows a party's traffic balance (`getTraffic`), and buys traffic
(`purchaseTraffic`) signed by a real connected wallet — not a raw keypair.

Two small backend scripts (not part of the UI) cover the paymaster side: setting the paymaster up
and crediting purchases, both of which a real wallet provider's own services would do in production.

## Prerequisites

From the repo root:

```bash
pnpm install
pnpm run start:localnet          # LocalNet, with traffic-enforcement enabled
pnpm run generate:traffic-purchase
pnpm run start:all               # wallet-gateway + a wallet to connect with
```

Onboard a party in the wallet you'll connect with and make sure it holds some Amulet (via the
wallet's usual onboarding/tap flow) — that's what you'll spend on traffic.

## Running

Three terminals, in this order:

```bash
pnpm --filter @canton-network/example-traffic-paymaster initialize   # sets the paymaster up, leave running
pnpm --filter @canton-network/example-traffic-paymaster topup        # credits purchases, leave running
pnpm --filter @canton-network/example-traffic-paymaster dev          # http://localhost:8081
```

`initialize` allocates a paymaster party, prices traffic for Amulet, pre-approves the paymaster to
receive it, and starts the paymaster's off-ledger API. It writes `.env.local` with the paymaster's
party id and API URL, so `dev` and `topup` pick them up automatically — run it before the other two.

In the UI: connect your wallet, check the paymaster's rate and your traffic balance, then buy some
traffic. The wallet prompts you to sign. The balance only updates once `topup` notices the purchase
on the ledger and credits it — that's the real shape of the production flow, not a UI bug.

## What this isn't

A reference implementation. No tests, no styling to speak of, and the backend scripts are in-memory,
single-paymaster, LocalNet-only stand-ins for services a real wallet provider would run durably.
See `sdk/wallet-sdk/src/wallet/namespace/traffic/` for the real SDK surface this exercises.
