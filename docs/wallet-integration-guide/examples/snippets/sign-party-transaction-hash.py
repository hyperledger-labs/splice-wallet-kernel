 # Combine the hashes of all three transactions, so we can perform a single signature
 multi_hash = compute_multi_transaction_hash(
     [
         namespace_transaction_hash,
         party_to_key_transaction_hash,
         party_to_participant_transaction_hash,
     ]
 )