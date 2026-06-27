#!/usr/bin/env bash
set -euo pipefail

DECK_USER="${DECK_USER:-deck}"
DECK_HOME="${DECK_HOME:-/home/$DECK_USER}"
PLUGIN_ZIP="${PLUGIN_ZIP:-$DECK_HOME/steamos-cec-toolkit-decky.zip}"
STAGED_BIN_DIR="${STAGED_BIN_DIR:-$DECK_HOME/steamos-cec-updated-bin}"
PLUGIN_DIR="${PLUGIN_DIR:-$DECK_HOME/homebrew/plugins}"
ROOT_HELPER_DIR="/var/lib/steamos-cec-toolkit"
SUDOERS_FILE="/etc/sudoers.d/zz-steamos-cec-toolkit-volume"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "usage: sudo bash $0" >&2
  exit 1
fi

if [[ ! -f "$PLUGIN_ZIP" ]]; then
  echo "missing plugin zip: $PLUGIN_ZIP" >&2
  exit 1
fi

install -d -m 0755 "$ROOT_HELPER_DIR"

if [[ -f "$STAGED_BIN_DIR/steamos-cec-volume-raw" ]]; then
  install -m 0755 "$STAGED_BIN_DIR/steamos-cec-volume-raw" \
    "$ROOT_HELPER_DIR/steamos-cec-volume-raw"
fi

if [[ -f "$STAGED_BIN_DIR/steamos-cec-debug-monitor" ]]; then
  install -m 0755 "$STAGED_BIN_DIR/steamos-cec-debug-monitor" \
    "$ROOT_HELPER_DIR/steamos-cec-debug-monitor"
fi

{
  printf '%s ALL=(root) NOPASSWD: %s/steamos-cec-volume-raw *\n' "$DECK_USER" "$ROOT_HELPER_DIR"
  printf '%s ALL=(root) NOPASSWD: %s/steamos-cec-debug-monitor *\n' "$DECK_USER" "$ROOT_HELPER_DIR"
} > "$SUDOERS_FILE"
chmod 0440 "$SUDOERS_FILE"

install -d -m 0755 "$PLUGIN_DIR"
unzip -o "$PLUGIN_ZIP" -d "$PLUGIN_DIR"
chown -R root:root "$PLUGIN_DIR/steamos-cec-toolkit"
chmod -R a+rX "$PLUGIN_DIR/steamos-cec-toolkit"

systemctl restart plugin_loader.service

echo "Installed SteamOS CEC Toolkit Decky plugin update."
echo "Plugin: $PLUGIN_DIR/steamos-cec-toolkit"
echo "Root helpers: $ROOT_HELPER_DIR"
