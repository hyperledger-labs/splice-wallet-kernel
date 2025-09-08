Traffic
=======

Below is a high-level summary of the `Sycnrhonizer Traffic Fees page <https://docs.sync.global/deployment/traffic.html>`_ in the Splice Validator documentation.
For more detail on point, it's advised to read the that documenation.

Traffic
-------
* Traffic fees are paid at the validator node level, not the party level.
* Every validator has a traffic balance at the global synchronizer level.
    * Traffic is measured in bytes.
    * A trickle rate of free traffic is provided to validator nodes every 10 minutes (each mining round).
* Traffic is deducted from your validator node's traffic balance every time your node sends a message to the synchronizer. Traffic is charged for:
    * Broadcasting a transaction - this is where the bulk of the traffic fees will be paid.
    * Sending consensus messages for transactions a validator is involved in.
* If your node runs out of traffic it is unable to transact. It'll recover by itself thanks to the free trickle rate. However, you can buy more traffic. See the next section.


Getting more traffic
--------------------
* Traffic is obtained by burning Canton Coin and it is always pre-purchased.
* The conversion Canton Coin <> Bytes can be derived from on-chain parameters.
    * Super Validators publish an on-chain conversion CC <> USD.
    * Super Validators publish a traffic cost USD <> Bytes.
* Anyone can burn Canton Coin to get traffic for any node.
    * You can buy your own traffic.
    * You can sign up with a service like the `Denex Gas Station <https://denex.io/gasstation>`__ to buy your traffic.
* The validator node has automation to keep traffic topped up. As long as you keep CC in your validator party, it'll stay available. See `here <https://docs.sync.global/validator_operator/validator_helm.html#configuring-automatic-traffic-purchases>`__ for how to configure automatic traffic purchases.

How to determine the traffic cost of a transaction?
---------------------------------------------------

Follow this `FAQ entry in the Splice documentation <https://docs.dev.sync.global/faq.html#term-How-do-I-determine-the-traffic-used-for-a-specific-transaction>`__.