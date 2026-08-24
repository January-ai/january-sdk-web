#!/bin/bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
lock="$root/Contract/sdk-contract.lock.json"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

value() { sed -n "s/.*\"$1\": \"\([^\"]*\)\".*/\1/p" "$lock"; }
version="$(value contractVersion)"
artifact="$(value artifact)"
archive_root="$(value archiveRoot)"
expected_archive_sha="$(value sha256)"
archive="${JANUARY_CONTRACT_ARCHIVE:-$root/../partner-api-contract/artifacts/releases/$version/$artifact}"

if [[ ! -f "$archive" ]]; then
  archive="$work/$artifact"
  gh api -H "Accept: application/vnd.github.raw+json" \
    "repos/January-ai/partner-api-contract/contents/artifacts/releases/$version/$artifact" > "$archive"
fi
[[ "$(shasum -a 256 "$archive" | awk '{print $1}')" == "$expected_archive_sha" ]] || {
  echo "Contract archive SHA-256 does not match sdk-contract.lock.json." >&2; exit 1;
}

tar -xzf "$archive" -C "$work"
openapi="$work/$archive_root/openapi/partner-api.generator.yaml"
node --input-type=module - "$openapi" <<'NODE'
import fs from 'node:fs';
const path = process.argv[2];
const source = fs.readFileSync(path, 'utf8');
const start = source.indexOf('    CompleteScanNutritionFacts:\n');
const remainder = source.slice(start + 1);
const nextSchema = remainder.search(/^    [A-Za-z0-9_]+:\n/m);
const end = nextSchema < 0 ? -1 : start + 1 + nextSchema;
const schema = source.slice(start, end);
const required = schema.indexOf('\n      required:\n');
const metadata = schema.indexOf('\n      x-january-upstream-schema:', required);
if (start < 0 || end < 0 || required < 0 || metadata < 0) throw new Error('Compatibility schema block was not found.');
fs.writeFileSync(path, source.slice(0, start) + schema.slice(0, required) + schema.slice(metadata) + source.slice(end));
NODE

jar="${JANUARY_OPENAPI_GENERATOR_JAR:-$root/../partner-api-contract/node_modules/.cache/january-generators/openapi-generator-cli-7.24.0.jar}"
if [[ ! -f "$jar" ]]; then
  jar="$work/openapi-generator-cli-7.24.0.jar"
  curl -fsSL "https://repo1.maven.org/maven2/org/openapitools/openapi-generator-cli/7.24.0/openapi-generator-cli-7.24.0.jar" -o "$jar"
fi
[[ "$(shasum -a 256 "$jar" | awk '{print $1}')" == "4b83ccc6fd43056c8c631cd0195e5100bd0550912502527bab09ac76152dab0c" ]] || {
  echo "OpenAPI Generator SHA-256 is invalid." >&2; exit 1;
}

java -jar "$jar" generate -i "$openapi" -g typescript-fetch -c "$root/Tools/ContractGenerator/config.yaml" -o "$work/generated" >/dev/null
find "$work/generated/src" -name '*.ts' -type f -print0 | xargs -0 perl -pi -e "s/(from\\s+['\"])(\\.{1,2}\\/[^'\"]+?)(?<!\\.js)(['\"])/\$1\$2.js\$3/g"
node --input-type=module - "$work/generated/src" <<'NODE'
import fs from 'node:fs';
import path from 'node:path';
const normalize = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) normalize(file);
    else {
      const source = fs.readFileSync(file, 'utf8');
      fs.writeFileSync(file, source.replace(/[ \t]+(?=\r?$)/gm, '').replace(/(?:\r?\n)+$/, '\n'));
    }
  }
};
normalize(process.argv[2]);
NODE
destination="$root/src/internal/transport"
rm -rf "$destination"
mkdir -p "$destination"
cp -R "$work/generated/src/." "$destination/"
echo "Generated the internal TypeScript transport from contract release $version."
