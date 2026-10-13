Integrating with the Canton Network
===================================

When integrating with the Canton Network, we recommend that wallet providers support 
the necessary features outlined below to optimal user experience. Additionally, there 
are optional features that can further enhance the integration and provide additional 
value to users.

Necessary Features
------------------

The following features are required for wallet providers to integrate with the Canton Network:

* Support the `CIP-0056 token standard <https://github.com/canton-foundation/cips/blob/main/cip-0056/cip-0056.md>`_ to enable the holding and transferring of assets on the Canton Network. Documentation and guidance on how to implement this with the Wallet SDK is in the :ref:`Token Standard section of this guide <token_standard>`.
* Provide support specifically for Canton Coin and USDCx. The Canton Coin package of Amulet is preinstalled with all validators and USDCx is issued with the Digital Asset Registry and that dars for that application can be found in the `DAR Package Versions of the Utilities documentation <https://docs.digitalasset.com/utilities/mainnet/reference/dar-versions/dar-versions.html>`_.
* `Memo tag support <https://docs.digitalasset.com/integrate/devnet/deposits-into-exchanges/index.html>`_ to allow deposits to be sent to exchanges
* `UTXO management <https://docs.sync.global/app_dev/token_standard/index.html#holding-utxo-management>`_ to reduce the number of UTXOs

Optional Features
-----------------

While optional for wallet providers, the following features are strongly recommended to 
ensure full support for the Canton Network and maximize user adoption:

* `Canton Coin pre-approvals <https://docs.sync.global/background/preapprovals.html>`_. Documentation on how to implement pre-approvals with the Wallet SDK are in the `2-step transfer vs 1-step transfer section of this guide <https://docs.digitalasset.com/integrate/devnet/token-standard/index.html#step-transfer-vs-1-step-transfer>`_.
* dApp support by conforming to `CIP-0103 <https://github.com/canton-foundation/cips/blob/main/cip-0103/cip-0103.md>`_, the standard for wallet and dApp integration.
* The requirement to hold and transfer USDCx is included in the Necessary Features section above, however there are additional levels of support for USDCx for wallet providers to support such as supporting xReserves deposits and withdrawals and integrating the xReserve UI into the wallet directly. The options and instructions are laid out in the `USDCx Support for Wallets section of this guide <https://docs.digitalasset.com/integrate/devnet/usdcx-support/index.html>`_.
* `Pre-approvals for DA Registry issued assets <https://docs.digitalasset.com/utilities/mainnet/how-tos/registry/transfer-preapproval/transfer-preapproval.html>`_.

.. _install-wallet-sdk:

How to install the Wallet SDK
-----------------------------

The Wallet SDK is available as a package on the NPM registry. You can install it using your preferred package manager.

.. tabs::
    .. group-tab:: npm
        .. code:: shell

            npm install @canton-network/wallet-sdk
    .. group-tab:: yarn
        .. code:: shell

            yarn add @canton-network/wallet-sdk
    .. group-tab:: pnpm
        .. code:: shell

            pnpm add @canton-network/wallet-sdk

Alternatively, to do dApp development only, the dApp SDK can be used which has a smaller bundle size and is optimized for browser usage.
The dApp SDK can be installed with:

.. tabs::
    .. group-tab:: npm
        .. code:: shell

            npm install @canton-network/dapp-sdk
    .. group-tab:: yarn
        .. code:: shell

            yarn add @canton-network/dapp-sdk
    .. group-tab:: pnpm
        .. code:: shell

            pnpm add @canton-network/dapp-sdk

Both SDKs use the same underlying core packages and where only partial code is needed (like for transaction visualization or hash verification) those packages can be used independently.

.. _validator_nodes:

Hosting a Validator
-------------------

As stated in the :ref:`Implications for Wallet Providers section here <implications-for-wallet-providers>`, 
it's important for wallet providers to have a validator to host their users' parties. It's also strongly advised to operate a node in all three
network environments so that you can test and verify your applications and integration as the Canton Network evolves.

Links to the node deployment docs are below depending on the deployment choice and environment. The guidance differs very little based on the environment - different URLs and arguments etc.:

* `MainNet docs <https://docs.sync.global/index.html>`_
    * `Docker Compose MainNet docs <https://docs.sync.global/validator_operator/validator_compose.html>`_
    * `Kubernetes MainNet docs <https://docs.sync.global/validator_operator/validator_helm.html>`_
* `TestNet docs <https://docs.test.sync.global/index.html>`_
    * `Docker Compose TestNet docs <https://docs.test.sync.global/validator_operator/validator_compose.html>`_
    * `Kubernetes TestNet docs <https://docs.test.sync.global/validator_operator/validator_helm.html>`_
* `DevNet <https://docs.dev.sync.global/index.html>`_
    * `Docker Compose DevNet docs <https://docs.dev.sync.global/validator_operator/validator_compose.html>`_
    * `Kubernetes DevNet docs <https://docs.dev.sync.global/validator_operator/validator_helm.html>`_

The Wallet integration guide is tailored to work with a LocalNet setup (https://docs.dev.sync.global/app_dev/testing/localnet.html)
to make testing and verification easy.


Connecting to a Synchronizer
----------------------------

For onboarding a validator with the global synchronizer it is recommended to read the Splice documentation here: https://docs.dev.sync.global/validator_operator/validator_onboarding.html

Supporting Tokens and Applications
----------------------------------

To integrate and support tokens, it is recommended to use the Splice documentation here: https://docs.sync.global/validator_operator/validator_onboarding.html

If you are interested in building your own application, a good first place would be to utilize the CN quickstart: https://github.com/digital-asset/cn-quickstart
