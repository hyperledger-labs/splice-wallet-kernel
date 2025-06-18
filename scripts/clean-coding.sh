#!/bin/bash

check_package_json() {
  local package_json_path="$1"
  local folder_path
  local package_name
  local main_file
  local types_file
  local package_type

  folder_path=$(realpath --relative-to="$(pwd)" "$(dirname "$package_json_path")")
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

  # Check if the folder path matches the package name
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

  # Check if "type" is set to "module"
  package_type=$(jq -r '.type' "$package_json_path")
  if [[ "$package_type" != "module" ]]; then
    type_position=$(jq -c 'to_entries | map(select(.key == "type")) | .[0]' "$package_json_path")
    line=$(echo "$type_position" | jq -r '.line // 1')
    column=$(echo "$type_position" | jq -r '.column // 1')
    echo "::warning file$package_json_path,line=$line,col=$column::type should be set to 'module'"
  fi
}

check_tsconfig_json() {
  local tsconfig_json_path="$1"
  local folder_path
  local tsconfig_file

  folder_path=$(realpath --relative-to="$(pwd)" "$(dirname "$tsconfig_json_path")")
  folder_path=$(echo "$folder_path" | tr '/' '-')

  # Check if "extends" contains the correct tsconfig.json variation
  extends_file=$(jq -r '.extends' "$tsconfig_json_path")
  if [[ "$extends_file" != *"tsconfig.web.json"* && "$extends_file" != *"tsconfig.node.json"* && "$extends_file" != *"tsconfig.base.json"* ]]; then
    type_position=$(jq -c 'to_entries | map(select(.key == "extends")) | .[0]' "$tsconfig_json_path")
    line=$(echo "$type_position" | jq -r '.line // 1')
    column=$(echo "$type_position" | jq -r '.column // 1')
    echo "::warning file=$tsconfig_json_path,line=$line,col=$column::typescript config 'extends' should reference 'tsconfig.web.json', 'tsconfig.node.json', or 'tsconfig.base.json'"
  fi
}

mismatch_found=0

find -name "package.json" | while read -r package_json; do
  check_package_json "$package_json"
done

find -name "tsconfig.json" | while read -r tsconfig_json; do
  check_tsconfig_json "$tsconfig_json"
done


if [[ $mismatch_found -eq 1 ]]; then
  exit 1
fi