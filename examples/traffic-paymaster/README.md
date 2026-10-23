# Traffic Paymaster — Example dApp

A minimal, throwaway UI that proves out `wallet-sdk`'s traffic-purchase API end to end: it shows a
paymaster's conversion rate, shows a party's traffic balance (`getTraffic`), and buys traffic
(`purchaseTraffic`) signed by a real connected wallet — not a raw keypair.

A few small backend scripts (not part of the UI) cover the paymaster side — setting the paymaster up,
serving its off-ledger API, crediting purchases, and funding a party with Amulet — all things a real
wallet provider's own services would do in production.

## Prerequisites

From the repo root:

```bash
pnpm install
pnpm run start:localnet          # LocalNet, with traffic-enforcement enabled
pnpm run generate:traffic-purchase
pnpm run build:all               # the scripts below import the SDK's built dist
pnpm run start:all               # wallet-gateway + a wallet to connect with
```

`build:all` is not optional, and it is worth re-running after a `git pull` or a branch switch: the
workspace packages resolve to their gitignored `dist/`, so a stale one left over from an earlier
checkout surfaces as a confusing `does not provide an export named ...` SyntaxError rather than as a
missing build.

Onboard a party in the wallet you'll connect with. It needs some Amulet (Canton Coin) to spend on
traffic — either tap it via the wallet's usual onboarding/tap flow, or fund it with the
`pnpm tap-amulet` script this package adds (see below). Without any Amulet, a purchase fails with
`Sender has no holdings, so transfer can't be executed.`

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
traffic. If your party has no Amulet yet, fund it first with the `pnpm tap-amulet` script below (a
LocalNet/DevNet dev faucet); the UI shows the party's Amulet balance so you can confirm it landed.
The traffic balance only updates once `scan-topup` notices the purchase on the ledger and credits
it — that's the real shape of the production flow, not a UI bug.

To fund a party with Amulet (so it can pay for traffic), use the one-shot tap script:

```bash
pnpm tap-amulet <partyId> [amount]   # defaults to 10 Amulet if amount is omitted
```

If you'd rather credit a traffic account directly, without a real purchase (e.g. while testing the
UI's balance display), use the one-shot manual script instead:

```bash
pnpm topup <partyId> [bytes]   # defaults to one Amulet's worth of traffic if bytes is omitted
```

(From the repo root instead: `pnpm --filter @canton-network/example-traffic-paymaster <script> <args>`.)

Writing `pnpm tap-amulet -- <partyId> [amount]` (or `pnpm topup -- …`) works too. pnpm forwards the
`--` to the script rather than eating it, so the script drops a leading one itself.

## What this isn't

A reference implementation. No tests, no styling to speak of, and the backend scripts are in-memory,
single-paymaster, LocalNet-only stand-ins for services a real wallet provider would run durably.
See `sdk/wallet-sdk/src/wallet/namespace/traffic/` for the real SDK surface this exercises.
