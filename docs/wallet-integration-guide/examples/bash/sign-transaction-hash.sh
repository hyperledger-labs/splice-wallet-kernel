# In this example the hash is signed using openssl and "PREPARE_TRANSACTION_RESPONSE.json" is the JSON output from the prepare 
# transaction step is here. "PRIVATE_KEY_FILE" should be the private key of the namespace of the external party. For more information
# on the openssl commands to generate the key see the External Signing Tutorial:
# https://docs.canton.network/appdev/deep-dives/external-signing-onboarding

TRANSACTION_HASH=$(cat create_ping_prepare_response.json | jq -r .prepared_transaction_hash)
PREPARED_TRANSACTION=$(cat create_ping_prepare_response.json | jq -r .prepared_transaction)
SIGNATURE=$(echo -n "$TRANSACTION_HASH" | base64 --decode | openssl pkeyutl -rawin -inkey "PRIVATE_KEY_FILE" -keyform DER -sign | openssl base64 -e -A)
