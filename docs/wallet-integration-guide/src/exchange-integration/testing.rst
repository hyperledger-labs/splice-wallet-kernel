Integration Testing
===================
.. REVIEW: This page should be a general page for wallet providers too
.. _test-node-setup:

Test Node Setup
---------------

Sketch:

* When testing on your laptop or in CI, we recommend using the
  `Docker-Compose based local deployment of a Global Synchronizer and Canton Coin from Splice
  <https://docs.dev.sync.global/app_dev/testing/localnet.html>`_.
* You can also setup a DevNet node for testing purposes
  using either Docker-Compose or k8s as `documented in Splice <https://docs.dev.sync.global/validator_operator/index.html>`_.



Testing Checklists
-------------------

Sketch: at a minimum, make sure to test

* backup and restore of validator node
* crash-fault tolerance of integration code
* withdrawal deduplication
* high-rates of deposits
* high-rates of withdrawals
* consuming a major splice upgrade
