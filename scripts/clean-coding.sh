#!/bin/bash

check_package_name() {
  local package_json_path="$1"
  local folder_path
  local package_name
  local main_file
  local types_file

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

  # Check if "main" points to an existing file
  main_file=$(jq -r '.main' "$package_json_path")
  if [[ "$main_file" != "null" && ! -f "$(dirname "$package_json_path")/$main_file" ]]; then
    echo "Error: 'main' field points to a non-existing file '$main_file' in $package_json_path"
    mismatch_found=1
  fi

  # Check if "types" points to an existing file
  types_file=$(jq -r '.types' "$package_json_path")
  if [[ "$types_file" != "null" && ! -f "$(dirname "$package_json_path")/$types_file" ]]; then
    echo "Error: 'types' field points to a non-existing file '$types_file' in $package_json_path"
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