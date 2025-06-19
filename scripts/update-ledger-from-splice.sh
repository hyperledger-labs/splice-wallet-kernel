#!/bin/bash

# Variables
REPO_OWNER="hyperledger-labs"
REPO_NAME="splice"
BRANCH="main"
json-api-docs="canton/community/ledger/ledger-json-api/src/test/resources/json-api-docs"
OUTPUT_DIR="./temp"
FINAL_DIR="./api-specs/ledger-api"


fetch_api_specs() {
  # Ensure output directory exists
  mkdir -p "$OUTPUT_DIR"
  mkdir -p "$FINAL_DIR"

  # Get the list of files in the folder using GitHub API
  FILES=$(curl -s "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/contents/$json-api-docs?ref=$BRANCH" | jq -r '.[] | select(.type == "file") | .download_url')

  for FILE_URL in $FILES; do
    # Download the file
    wget -q -P "$OUTPUT_DIR" "$FILE_URL"

    # Rename the file with the version postfix
    FILE_NAME=$(basename "$FILE_URL")
    VERSION=$(grep -E '^  version:' "$OUTPUT_DIR/$FILE_NAME" | awk -F': ' '{print $2}' | tr -d '"')
    EXTENSION="${FILE_NAME##*.}"
    if [ -n "$VERSION" ]; then
      mv "$OUTPUT_DIR/$FILE_NAME" "$OUTPUT_DIR/${FILE_NAME%.*}-$VERSION.$EXTENSION"
    fi
  done

  mv -f "$OUTPUT_DIR"/* "$FINAL_DIR"

  rm -rf "$OUTPUT_DIR"

  echo "Downloaded API Specs into $FINAL_DIR"
}

fetch_api_specs