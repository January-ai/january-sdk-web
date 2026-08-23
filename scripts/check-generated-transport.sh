#!/bin/bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
baseline="$(mktemp -d)"
trap 'rm -rf "$baseline"' EXIT
cp -R "$root/src/internal/transport/." "$baseline/"
"$root/scripts/generate-transport.sh"
diff -ru "$baseline" "$root/src/internal/transport"
echo "Generated TypeScript transport is current."

