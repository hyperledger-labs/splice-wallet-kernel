#!/bin/bash

# Variables
OUTPUT_DIR="./core/ledger-client/generated-clients"
SPECS_DIR="./api-specs/ledger-api"

for FILE in "$SPECS_DIR"/*; do
  FILE_NAME=$(basename "$FILE")

  # Check if the file starts with "openapi-"
  if [[ "$FILE_NAME" == openapi-* ]]; then
    npx openapi-typescript "$FILE" -o "${OUTPUT_DIR}/${FILE_NAME%.yaml}.d.ts"
  fi

  # Check if the file starts with "asyncapi-"
  #if [[ "$FILE_NAME" == asyncapi-* ]]; then
    #npx asyncapi generate fromTemplate "$FILE" @asyncapi/ts-nats-template@.10.3
  #fi
done

echo "Generated fresh typescript clients for all ledger api specs"