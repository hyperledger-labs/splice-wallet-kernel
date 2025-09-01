#  The hash is signed using openssl.

TRANSACTION_HASH=$(cat create_ping_prepare_response.json | jq -r .prepared_transaction_hash)
PREPARED_TRANSACTION=$(cat create_ping_prepare_response.json | jq -r .prepared_transaction)
SIGNATURE=$(echo -n "$TRANSACTION_HASH" | base64 --decode | openssl pkeyutl -rawin -inkey "PRIVATE_KEY_FILE" -keyform DER -sign | openssl base64 -e -A)