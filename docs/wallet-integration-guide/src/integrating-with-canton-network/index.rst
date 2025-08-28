Integrating with the Canton Network
===================================


How to install the Wallet SDK
-----------------------------

The Wallet SDK is available as a package on the NPM registry. You can install it using your preferred package manager.

.. tabs::
    .. group-tab:: npm
        .. code:: shell

            npm install @splice/wallet-sdk
    .. group-tab:: yarn
        .. code:: shell

            yarn add @splice/wallet-sdk
    .. group-tab:: pnpm
        .. code:: shell

            pnpm add @splice/wallet-sdk

Alternatively, to do dApp development only, the dApp SDK can be used which has a smaller bundle size and is optimized for browser usage.
The dApp SDK can be installed with:

.. tabs::
    .. group-tab:: npm
        .. code:: shell

            npm install @splice/dapp-sdk
    .. group-tab:: yarn
        .. code:: shell

            yarn add @splice/dapp-sdk
    .. group-tab:: pnpm
        .. code:: shell

            pnpm add @splice/dapp-sdk

Both SDKs use the same underlying core packages and where only partial code is needed (like for transaction visualization or hash verification) those packages can be used independently.

.. _validator_nodes:

Hosting a Validator
-------------------

As stated in the :ref:`Implications for Wallet Providers section here <implications-for-wallet-providers>`, it's important for wallet providers to have a validator to host their users' parties. It's also strongly advised to operate a node in all three
network environments so that you can test and verify your applications and integration as the Canton Network evolves.

For hosting a validator we recommend reading the Splice documentation on: https://docs.dev.sync.global/index.html

The Wallet integration guide is tailored to work with a LocalNet setup (https://docs.dev.sync.global/app_dev/testing/localnet.html)
to make testing and verification easy.


Connecting to a Synchronizer
----------------------------

For onboarding a validator with the global synchronizer it is recommended to read the Splice documentation here: https://docs.dev.sync.global/validator_operator/validator_onboarding.html

Supporting Tokens and Applications
----------------------------------

To integrate and support tokens, it is recommended to use the Splice documentation here: https://docs.dev.sync.global/app_dev/token_standard/index.html

If you are interested in building your own application, a good first place would be to utilize the CN quickstart: https://github.com/digital-asset/cn-quickstart