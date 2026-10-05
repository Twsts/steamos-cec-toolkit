#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"

bash -n "$ROOT/install.sh" "$ROOT/uninstall.sh" "$ROOT/bin/steamos-cec-permissions-apply"
python3 -m py_compile "$ROOT/bin/steamos-cec-toolkitctl" "$ROOT/bin/steamos-cec-external-volume"

grep -q 'Skipping SteamOS atomic-update configuration' "$ROOT/install.sh"
grep -q 'CEC_DEVICE_DIRECTORY' "$ROOT/bin/steamos-cec-toolkitctl"
grep -q 'steamos-cec-external-volume.socket' "$ROOT/install.sh"
if grep -q 'cec-audio-control.socket' "$ROOT/install.sh"; then
  echo "installer still assumes SteamOS cec-audio-control.socket" >&2
  exit 1
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mkdir "$tmp/devices"
touch "$tmp/devices/cec0"
CEC_DEVICE_DIRECTORY="$tmp/devices" \
  STEAMOS_CEC_CONFIG="$tmp/missing.conf" \
  HOME="$tmp/home" \
  python3 - "$ROOT/bin/steamos-cec-toolkitctl" <<'PY'
import importlib.machinery
import importlib.util
import sys

loader = importlib.machinery.SourceFileLoader("toolkitctl", sys.argv[1])
spec = importlib.util.spec_from_loader("toolkitctl", loader)
module = importlib.util.module_from_spec(spec)
loader.exec_module(module)
result = module.discover_cec()
assert len(result["available_cec_devices"]) == 1
assert result["cec_device"].endswith("/cec0")
PY

echo "portability checks passed"
