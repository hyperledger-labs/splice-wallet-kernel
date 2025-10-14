Canton Coin Rewards
===================

.. todo link to splice repo package once it is live: https://github.com/hyperledger-labs/splice/pull/1729/files#diff-59a55a4aea809c242d9cb649b699f31e1d4f22b18ea4d68e868a8d874dcee6af



Validator & Super Validator Liveness Rewards
---------------------------------------------
Validators and Super Validators generate reward coupons that can be used to mint Canton Coins. The coupons are paid
out to the validator adminstration party. For local parties onboarded to a validator, the
validator application runs background automation to mint all activity
records automatically. An external party signs transactions using a key
they control. As a consequence, the validator automation is not able to
perform minting for external parties.

For external parties, automation needs
to be developed to call ``AmuletRules_Transfer`` at least once per round
with all activity records as inputs.

You can find more information about the tokenomics of Canton Coin at https://docs.dev.sync.global/overview/overview.html#tokenomics.

*All rewards and coupons are mintable the follow mining round, if rewards are not redemed then they are lost*

App Activity Rewards
--------------------
Another way for generating rewards is by running applications that generate value for the canton network. By applying a
``FeaturedAppActivityMarker`` to transaction it is then marked and converted to reward coupons that can be redeemed.

``FeaturedAppActivityMarker`` can be added even if the application is not featured and will still generate coupons, but
the payout rate is higher for featured applications.

.. todo add code example once we have this in the wallet SDK

Redeeming Reward Coupons with External Party
-------------------------------------------
To accept rewards with an external party you need to call ``AmuletRules_Transfer`` with the activity records as inputs.

.. todo add code example once we have this in the wallet SDK

Sharing Featured Application Reward between multiple parties
------------------------------------------------------------
Featured Application rewards can be shared between multiple parties, this can be done by defining a list of beneficiaries
and give them a weighted amount of the total reward. The sum of all beneficiaries weight must be equal to 1.0. This results
in separate coupons being generated for each beneficiary.

.. todo add code example once we have this in the wallet SDK
