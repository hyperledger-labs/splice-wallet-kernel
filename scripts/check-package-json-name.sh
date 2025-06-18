#!/bin/bash

check_package_name() {
  local package_json_path="$1"
  local folder_path
  local package_name

  folder_path=$(realpath --relative-to="$(pwd)" "$(dirname "$package_json_path")")
  #we replace slashes with dashes to match nested naming like "foo/bar/baz" to package name "foo-bar-baz"
  folder_path=$(echo "$folder_path" | tr '/' '-')
  package_name=$(jq -r '.name' "$package_json_path")

  # Ignore paths containing .yarn or .vite
  if [[ "$folder_path" == *".yarn"* || "$folder_path" == *".vite"* ]]; then
    return
  fi

  # Ignore imported package names
  if [[ "$package_name" == @* ]]; then
    return
  fi

  # Allow names with specific prefixes according to docs/CLEANCODING.md
  if [[ "$package_name" == splice-wallet-kernel* || "$package_name" == splice-wallet* ]]; then
    return
  fi

  if [[ "$package_name" != "$folder_path" ]]; then
    echo "Mismatch: Folder path '$folder_path' does not match package name '$package_name' in $package_json_path"
    mismatch_found=1
  fi
}

mismatch_found=0

find -name "package.json" | while read -r package_json; do
  check_package_name "$package_json"
done

if [[ $mismatch_found -eq 1 ]]; then
  exit 1
fi