.. _usage:

Using the Wallet Gateway
========================

You can use the Wallet Gateway in two ways:

- mainly through the **User UI** (Web UI) for end users
- or through the **User API** (for automation, custom UIs, or integration with your own systems).

The **dApp API** is used by your dApp via the dApp SDK when users connect their wallet. See the :ref:`dApp SDK <dapp-sdk>` for more details.

This section describes typical workflows, the User UI, session handling, and when to use which interface.

User UI
------

The Wallet Gateway serves a **Web UI** at the Gateway root URL (e.g. ``http://localhost:3030``). Users manage wallets, approve transactions, and adjust settings there.

**Main pages:**

- **Login** (``/login``): Choose a network and identity provider (IDP), then sign in (OAuth redirect or self-signed). Unauthenticated users are redirected here when they need to log in.

- **Wallets** (``/wallets``): List wallets, create new wallets (choose network, signing provider, party id), set the primary wallet, and remove wallets. This is the default landing page after login.

- **Transactions** (``/transactions``): List transactions. View status and details for prepared, signed, and executed transactions.

- **Approve** (``/approve``): Shown when a dApp requests a transaction (e.g. via ``prepareExecute``). The user reviews the transaction and signs or rejects it. The dApp is notified of the result.

- **Settings** (``/settings``): Manage networks and identity providers (add, edit, remove), view sessions, and see Gateway version info.

- **Callback** (``/callback``): Used internally for OAuth redirects after login. Users are redirected back to the intended page (e.g. ``/wallets``) or to the dApp.

Users **log out** via the layout logout control. Logout calls ``removeSession``, clears local auth state, and redirects to ``/login`` (or closes the window if the UI was opened in a popup for approval).


When to use which interface
---------------------------

- **User UI**: Best for end users. They log in, create and manage wallets, view transactions, and approve dApp requests. No code required.

- **User API**: Use when you need to:
  - Drive wallet setup or management from scripts or your own backend.
  - Build a custom wallet UI (e.g. embedded in your app) instead of the default User UI.
  - Automate session, network, IDP, or wallet operations.

- **dApp API** (via dApp SDK): Use from your **dApp** frontend. The SDK calls the dApp API to connect, list accounts, and prepare/execute transactions. Users approve via the Web UI or browser extension. See :ref:`dApp SDK usage <dapp-sdk-usage>` and :ref:`apis` for details.

Typical flows
-------------

**1. User sets up a wallet**

- User opens the User UI and goes to **Login**.
- Selects network and IDP, completes login (e.g. OAuth).
- Lands on **Wallets**, creates a wallet (network, signing provider, party id), optionally sets it as primary.
- Can add networks or IDPs under **Settings** if needed.

**2. dApp connects and sends a transaction**

- Your dApp uses the dApp SDK: ``connect()`` → user is redirected to Gateway to log in if needed → ``listAccounts()`` → ``prepareExecute(commands)``.
- User is sent to **Approve** to sign (or reject) the transaction.
- Once signed and executed, the dApp receives the result and can react to ``onTxChanged``.

**3. User checks activity and manages wallets**

- User opens **Transactions** to list and inspect transactions.
- User opens **Wallets** to add wallets, change primary, or remove wallets.
- User opens **Settings** to manage networks, IDPs, or sessions.

**4. Automated wallet setup (User API)**

- Your script or backend calls ``addSession()``, then your auth flow provides a JWT.
- Calls ``listNetworks()`` / ``listIdps()``, then ``createWallet()`` with desired network and signing provider.
- Uses ``listWallets()``, ``sign()``, ``execute()``, etc. as needed for your use case.

Next steps
----------

- Configure the Gateway: :ref:`configuring-wallet-gateway`
- Explore User API and dApp API: :ref:`apis`
- Set up signing: :ref:`signing-providers`
- Run and operate the Gateway: :ref:`getting-started`, :ref:`troubleshooting`
