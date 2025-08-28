# Load the signed transactions onto the participant
 add_transactions_request = (
     topology_manager_write_service_pb2.AddTransactionsRequest(
         transactions=[
             signed_namespace_transaction,
             signed_party_to_key_transaction,
             signed_party_to_participant_transaction,
         ],
         store=common_pb2.StoreId(
             synchronizer=common_pb2.StoreId.Synchronizer(
                 id=synchronizer_id,
             )
         ),
     )
 )
 topology_write_client.AddTransactions(add_transactions_request)