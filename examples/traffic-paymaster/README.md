# Traffic Paymaster — Example dApp

A minimal, throwaway UI that proves out `wallet-sdk`'s traffic-purchase API end to end: it shows a
paymaster's conversion rate, shows a party's traffic balance (`getTraffic`), and buys traffic
(`purchaseTraffic`) signed by a real connected wallet — not a raw keypair.

Four small backend scripts (not part of the UI) cover the paymaster side — setting the paymaster up,
serving its off-ledger API, and crediting purchases — all things a real wallet provider's own
services would do in production.

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

`cd examples/traffic-paymaster` first — these are that package's own scripts, not root ones, so
`pnpm --filter @canton-network/example-traffic-paymaster <script>` works too if you'd rather stay
at the repo root.

One setup step, then three terminals left running:

```bash
cd examples/traffic-paymaster
pnpm initialize        # one-shot: allocates the paymaster, prices traffic, pre-approves it, then exits
```

```bash
pnpm serve-paymaster   # terminal 1, leave running — serves the paymaster's off-ledger API the UI needs
pnpm scan-topup        # terminal 2, leave running — watches the ledger and credits purchases as they happen
pnpm dev               # terminal 3 — http://localhost:8081
```

`initialize` writes `.env.local` with the paymaster's party id; `serve-paymaster` reads that, starts
the API, and adds its URL to the same file, which `dev` then picks up. Run them in this order the
first time; after that, `initialize` doesn't need to be re-run unless you want a fresh paymaster.

In the UI: connect your wallet, check the paymaster's rate and your traffic balance, then buy some
traffic. The wallet prompts you to sign. The balance only updates once `scan-topup` notices the
purchase on the ledger and credits it — that's the real shape of the production flow, not a UI bug.

If you'd rather credit an account directly, without a real purchase (e.g. while testing the UI's
balance display), use the one-shot manual script instead:

```bash
pnpm topup -- <partyId> [bytes]   # defaults to one Amulet's worth of traffic if bytes is omitted
```

(From the repo root instead: `pnpm --filter @canton-network/example-traffic-paymaster topup -- <partyId> [bytes]`.)

## What this isn't

A reference implementation. No tests, no styling to speak of, and the backend scripts are in-memory,
single-paymaster, LocalNet-only stand-ins for services a real wallet provider would run durably.
See `sdk/wallet-sdk/src/wallet/namespace/traffic/` for the real SDK surface this exercises.
