Canton Coin Specific Considerations
===================================

Handling Time-Bound Signatures (Canton Coin)
--------------------------------------------

If your wallet infrastructure relies on offline signing, cold storage, or multi-party approval flows that take longer than **10–20 minutes**, then this guide is for you.

The 10-Minute Signing Window
^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Canton Coin transactions operate on a strict **10-minute minting cycle**. Unlike standard Daml transactions, 
**Canton Coin** transfers and acceptances must reference a specific 
`OpenMiningRound <https://docs.dev.sync.global/app_dev/api/splice-amulet/Splice-Round.html>`_ contract to 
calculate network fees and rewards.

* A new ``OpenMiningRound`` is created every **10 minutes**.
* The contract remains active for approximately **20 minutes** (the current round + overlap).
* **The Problem:** If you prepare a transaction referencing *Round A*, but you do not sign and submit it before *Round A* expires, the network will reject it.

**Common Error:**
If your transaction exceeds this window, the API will return a ``409 Conflict`` with the following error:

.. code-block:: text

   LOCAL_VERDICT_INACTIVE_CONTRACTS

There are currently two ways to handle this limitation:

Solution 1: Implement Pre-approvals for Incoming Transfers
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

**Use Case:** Your users need to receive Canton Coin, but you cannot sign a transaction within 10 minutes 
(e.g., due to cold storage of the receiver's keys).

**The Fix:** Enable **1-Step Transfers** using **Pre-approvals** (docs `here <https://docs.dev.sync.global/background/preapprovals.html>`_).

Instead of signing every incoming transfer, the receiver signs a single, long-living ``TransferPreapproval`` 
contract. This authorizes the sending party (or a specific provider) to deposit funds immediately without 
requiring an interactive acceptance signature for every transaction.

To do this, create a `Splice.Wallet.TransferPreapproval <https://docs.dev.sync.global/app_dev/api/splice-wallet/Splice-Wallet-TransferPreapproval.html>`_ 
contract.
See the guide on `Canton Coin Preapprovals <https://docs.dev.sync.global/background/preapprovals.html>`_ for setup instructions.
By implementing a preapproval contract the receiver doesn't need to accept Canton Coin transfers sent to 
them as they are automatically accepted.

Solution 2: Use Command Delegation for Sending Funds 
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

**Use Case:** Your users need to send Canton Coin, but the signing process (e.g., institutional custody approval) takes hours.

**The Fix:** Use **Command Delegation - TransferCommand** (`docs here <https://docs.dev.sync.global/app_dev/api/splice-amulet/Splice-ExternalPartyAmuletRules.html>`_).

Instead of signing the transfer transaction directly (which pins a short-lived Mining Round), the user signs a long-living instruction to transfer funds.

How it works
""""""""""""

1.  **User Signs Instruction:** The user signs a transaction to create a ``Splice.ExternalPartyAmuletRules.TransferCommand`` contract.
    
    * This contract **does not** reference a mining round.
    * It can remain valid for up to 24 hours (or as defined by ``expiresAt``).

2.  **Delegated Execution:** Once this command is on the ledger, a Super Validator (SV) or a delegate picks it up.

3.  **Execution:** The delegate executes the actual transfer. The *delegate* selects the current ``OpenMiningRound`` at the moment of execution, ensuring the transaction succeeds regardless of how long ago the user signed the instruction.