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

DECK_UID="$(id -u "$DECK_USER")"
run_user_systemctl() {
  runuser -u "$DECK_USER" -- env \
    XDG_RUNTIME_DIR="/run/user/$DECK_UID" \
    DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$DECK_UID/bus" \
    systemctl --user "$@"
}

if [[ ! -f "$PLUGIN_ZIP" ]]; then
  echo "missing plugin zip: $PLUGIN_ZIP" >&2
  exit 1
fi

install -d -m 0755 "$ROOT_HELPER_DIR"
install -d -o "$DECK_USER" -g "$DECK_USER" -m 0755 "$DECK_HOME/.local/bin"
install -d -o "$DECK_USER" -g "$DECK_USER" -m 0755 "$DECK_HOME/.config/systemd/user"

for user_script in \
  steamos-cec-volume \
  steamos-cec-toolkitctl \
  steamos-cec-external-volume \
  steamos-cec-steam-button \
  steamos-cec-tv-standby-suspend \
  steamos-cec-gamescope-recovery
do
  if [[ -f "$STAGED_BIN_DIR/$user_script" ]]; then
    install -o "$DECK_USER" -g "$DECK_USER" -m 0755 "$STAGED_BIN_DIR/$user_script" \
      "$DECK_HOME/.local/bin/$user_script"
  fi
done

for user_unit in \
  steamos-cec-steam-button.service \
  steamos-cec-tv-standby-suspend.service \
  steamos-cec-gamescope-recovery.service
do
  if [[ -f "$STAGED_BIN_DIR/$user_unit" ]]; then
    install -o "$DECK_USER" -g "$DECK_USER" -m 0644 "$STAGED_BIN_DIR/$user_unit" \
      "$DECK_HOME/.config/systemd/user/$user_unit"
  fi
done

if [[ -f "$STAGED_BIN_DIR/steamos-cec-volume-raw" ]]; then
  install -m 0755 "$STAGED_BIN_DIR/steamos-cec-volume-raw" \
    "$ROOT_HELPER_DIR/steamos-cec-volume-raw"
fi

if [[ -f "$STAGED_BIN_DIR/steamos-cec-debug-monitor" ]]; then
  install -m 0755 "$STAGED_BIN_DIR/steamos-cec-debug-monitor" \
    "$ROOT_HELPER_DIR/steamos-cec-debug-monitor"
fi

if [[ -f "$STAGED_BIN_DIR/steamos-cec-power-standby-control" ]]; then
  install -m 0755 "$STAGED_BIN_DIR/steamos-cec-power-standby-control" \
    "$ROOT_HELPER_DIR/steamos-cec-power-standby-control"
fi

if [[ -f "$STAGED_BIN_DIR/steamos-cec-before-sleep" ]]; then
  install -m 0755 "$STAGED_BIN_DIR/steamos-cec-before-sleep" \
    "$ROOT_HELPER_DIR/steamos-cec-before-sleep"
fi

if [[ -f "$STAGED_BIN_DIR/steamos-cec-usb-wake-apply" ]]; then
  install -m 0755 "$STAGED_BIN_DIR/steamos-cec-usb-wake-apply" \
    "$ROOT_HELPER_DIR/steamos-cec-usb-wake-apply"
fi

if [[ -f "$STAGED_BIN_DIR/steamos-cec-usb-wake-control" ]]; then
  install -m 0755 "$STAGED_BIN_DIR/steamos-cec-usb-wake-control" \
    "$ROOT_HELPER_DIR/steamos-cec-usb-wake-control"
fi

if [[ -f "$STAGED_BIN_DIR/steamos-cec-before-sleep.service" ]]; then
  install -m 0644 "$STAGED_BIN_DIR/steamos-cec-before-sleep.service" \
    /etc/systemd/system/steamos-cec-before-sleep.service
  systemctl daemon-reload
fi

if [[ -f "$STAGED_BIN_DIR/steamos-cec-usb-wake.service" ]]; then
  install -m 0644 "$STAGED_BIN_DIR/steamos-cec-usb-wake.service" \
    /etc/systemd/system/steamos-cec-usb-wake.service
  systemctl daemon-reload
fi

{
  printf '%s ALL=(root) NOPASSWD: %s/steamos-cec-volume-raw *\n' "$DECK_USER" "$ROOT_HELPER_DIR"
  printf '%s ALL=(root) NOPASSWD: %s/steamos-cec-debug-monitor *\n' "$DECK_USER" "$ROOT_HELPER_DIR"
  printf '%s ALL=(root) NOPASSWD: %s/steamos-cec-power-standby-control *\n' "$DECK_USER" "$ROOT_HELPER_DIR"
  printf '%s ALL=(root) NOPASSWD: %s/steamos-cec-usb-wake-control *\n' "$DECK_USER" "$ROOT_HELPER_DIR"
} > "$SUDOERS_FILE"
chmod 0440 "$SUDOERS_FILE"

install -d -m 0755 "$PLUGIN_DIR"
unzip -o "$PLUGIN_ZIP" -d "$PLUGIN_DIR"
chown -R root:root "$PLUGIN_DIR/steamos-cec-toolkit"
chmod -R a+rX "$PLUGIN_DIR/steamos-cec-toolkit"

run_user_systemctl daemon-reload
run_user_systemctl try-restart steamos-cec-steam-button.service || true
systemctl restart plugin_loader.service

echo "Installed SteamOS CEC Toolkit Decky plugin update."
echo "Plugin: $PLUGIN_DIR/steamos-cec-toolkit"
echo "Root helpers: $ROOT_HELPER_DIR"
