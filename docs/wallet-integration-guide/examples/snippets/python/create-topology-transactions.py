# Build and hash transaction function
 def build_serialized_transaction_and_hash(
     mapping: topology_pb2.TopologyMapping,
 ) -> (bytes, bytes):
     """
     Generates a serialized topology transaction and its corresponding hash.

     Args:
         mapping (topology_pb2.TopologyMapping): The topology mapping to be serialized.

     Returns:
         tuple: A tuple containing:
             - bytes: The serialized transaction.
             - bytes: The SHA-256 hash of the serialized transaction.
     """
     transaction = serialize_topology_transaction(mapping)
     transaction_hash = compute_sha256_canton_hash(11, transaction)
     return transaction, transaction_hash

# Build a party to key transaction

# Note: This function is an example of how to safely build a topology transaction by first obtaining 
# the highest serial for it unique mapping, updating the mapping’s content and incrementing the serial by 1. 
# This ensures concurrent updates would be rejected. During onboarding of external parties however it is 
# expected that there are no existing mappings and the serial will therefore bet set to 1.

 def build_party_to_key_transaction(
     channel: grpc.Channel,
     party_id: str,
     new_signing_key: crypto_pb2.SigningPublicKey,
     synchronizer_id: str,
 ) -> bytes:
     """
     Constructs a topology transaction that updates the party-to-key mapping.

     Args:
         channel (grpc.Channel): gRPC channel for communication with the topology manager.
         party_id (str): Identifier of the party whose key mapping is being updated.
         new_signing_key (crypto_pb2.SigningPublicKey): The new signing key to be added.
         synchronizer_id (str): ID of the synchronizer to query the topology state.

     Returns:
         bytes: Serialized topology transaction containing the updated mapping.
     """
     # Retrieve the current party to key mapping
     list_party_to_key_request = (
         topology_manager_read_service_pb2.ListPartyToKeyMappingRequest(
             base_query=topology_manager_read_service_pb2.BaseQuery(
                 store=common_pb2.StoreId(
                     synchronizer=common_pb2.StoreId.Synchronizer(id=synchronizer_id)
                 ),
                 head_state=empty_pb2.Empty(),
             ),
             filter_party=party_id,
         )
     )
     topology_read_client = (
         topology_manager_read_service_pb2_grpc.TopologyManagerReadServiceStub(channel)
     )
     party_to_key_response: (
         topology_manager_read_service_pb2.ListPartyToKeyMappingResponse
     ) = topology_read_client.ListPartyToKeyMapping(list_party_to_key_request)
     if len(party_to_key_response.results) == 0:
         current_serial = 1
         current_keys_list = []
     else:
         # Sort the results by serial in descending order and take the first one
         sorted_results = sorted(
             party_to_key_response.results,
             key=lambda result: result.context.serial,
             reverse=True,
         )
         # Get the mapping with the highest serial and its list of hosting participants
         current_serial = sorted_results[0].context.serial
         current_keys_list: [crypto_pb2.SigningPublicKey] = sorted_results[
             0
         ].item.signing_keys

     # Create a new mapping adding the new participant to the list and incrementing the serial
     updated_mapping = topology_pb2.TopologyMapping(
         party_to_key_mapping=topology_pb2.PartyToKeyMapping(
             party=party_id,
             threshold=1,
             signing_keys=current_keys_list + [new_signing_key],
         )
     )
     # Build the serialized transaction
     return serialize_topology_transaction(updated_mapping, serial=current_serial + 1)

# Build and hash onboarding transactions
 # Namespace delegation: registers a root namespace with the public key of the party to the network
 # effectively creating the party.
 namespace_delegation_mapping = topology_pb2.TopologyMapping(
     namespace_delegation=topology_pb2.NamespaceDelegation(
         namespace=public_key_fingerprint,
         target_key=signing_public_key,
         is_root_delegation=True,
     )
 )
 (namespace_delegation_transaction, namespace_transaction_hash) = (
     build_serialized_transaction_and_hash(namespace_delegation_mapping)
 )

 # Party to key: registers the public key as the one that will be used to sign and authorize Daml transactions submitted
 # to the ledger via the interactive submission service
 party_to_key_transaction = build_party_to_key_transaction(
     channel, party_id, signing_public_key, synchronizer_id
 )
 party_to_key_transaction_hash = compute_topology_transaction_hash(
     party_to_key_transaction
 )

 # Party to participant: records the fact that the party wants to be hosted on the participants with confirmation rights
 # This means those participants are not allowed to submit transactions on behalf of this party but will validate transactions
 # on behalf of the party by confirming or rejecting them according to the ledger model. They also records transaction for that party on the ledger.
 confirming_participants_hosting = []
 for confirming_participant_id in confirming_participant_ids:
     confirming_participants_hosting.append(
         topology_pb2.PartyToParticipant.HostingParticipant(
             participant_uid=confirming_participant_id,
             permission=topology_pb2.Enums.ParticipantPermission.PARTICIPANT_PERMISSION_CONFIRMATION,
         )
     )
 party_to_participant_mapping = topology_pb2.TopologyMapping(
     party_to_participant=topology_pb2.PartyToParticipant(
         party=party_id,
         threshold=confirming_threshold,
         participants=confirming_participants_hosting,
     )
 )
 (party_to_participant_transaction, party_to_participant_transaction_hash) = (
     build_serialized_transaction_and_hash(party_to_participant_mapping)
 )