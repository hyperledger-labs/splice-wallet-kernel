Integration Testing
===================

.. _test-node-setup:

Test Node Setup
---------------

When testing on your laptop or in CI, we recommend using Splice's
`LocalNet <https://docs.dev.sync.global/app_dev/testing/localnet.html>`__,
which is a Docker-Compose based local deployment of a Global Synchronizer and Canton Coin.
Automate the :ref:`exchange parties setup <exchange-parties-setup>` as part of your test setup,
so that you can start from a clean state for each test run while reusing the same LocalNet.
Thereby achieving test isolation without the overhead of starting and stopping LocalNet for each test run.

Alternatively you can consider setting up a DevNet validator node
using either Docker-Compose or k8s as
`documented in Splice <https://docs.dev.sync.global/validator_operator/index.html>`__
and using that for testing.


Test Scenarios
---------------

Apart from testing functional correctness, we recommend testing for robustness and fault tolerance of your integration code.
In particular, we recommend testing for the following scenarios:

* :ref:`Crash-fault tolerance <crash-fault-tolerance>`, in particular:

  * successfully continuing Tx History Ingestion after a crash
  * successfully continuing Withdrawal Automation after a crash
  * handling the case that two withdrawal transfers are initiated for the same withdrawal request:
    test that only one of them succeeds because they spend the same UTXOs, which is detected by Canton
  * successfully continuing of the Multi-Step Deposit Automation after a crash, and handling the
    case that the deposit offer was accepted while the Multi-Step Deposit Automation was down

* :ref:`Retrying on RPC errors <retryable-errors>`, in particular:

  * retries that succeed after a few attempts
  * retries that do not succeed within the bounded number of retries, and
    how the integration code marks the withdrawal or deposit offer as failed.

* Does your integration code deal well with high rates of deposits and withdrawals.
  We recommend to determine
  target throughput rates for deposits and withdrawals and test that your integration code can handle
  those rates without falling behind. In particular, test:

  * Can Tx History Ingestion keep up with the rate of deposits and withdrawals.
  * Can :ref:`utxo-management` deal with the case that there are no UTXOs available
    to fund a withdrawal.
  * Does your integration code rate limit executing transactions on the Validator Node
    to avoid running out of traffic with your :ref:`automatic traffic configuration <reward-minting-and-traffic-funding>`.
    See the :ref:`validator-node-monitoring` section for more information.
  * Does your :ref:`utxo-management` code handle the case where there are only small UTXOs available,
    and they first have to be merged before they can be used to fund a withdrawal.
  * Does your integration code properly rate limit bursts of deposits and withdrawals above the target throughput rate.
  * Does your integration code gracefully handle a crash when under full load.


* Does your integration code recover from data loss due to

  * :ref:`validator_backup_restore`
  * :ref:`restore-canton-integration-db`

* Does your integration code handle :ref:`hard-synchronizer-migration`.
  Note that simulating a major Splice upgrade is not easily possible with LocalNet.
  We thus recommend to the check the :ref:`schedule for major Splice upgrades <hard-synchronizer-migration>`
  and ensure that you are ready to handle the first one on DevNet.

Where possible, we recommend to automate these tests as part of your CI pipeline
so that you can run them frequently and with little overhead.
