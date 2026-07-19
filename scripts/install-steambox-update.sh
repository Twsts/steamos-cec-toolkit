#!/usr/bin/env bash
set -euo pipefail

DECK_USER="${DECK_USER:-deck}"
DECK_HOME="${DECK_HOME:-/home/$DECK_USER}"
PLUGIN_ZIP="${PLUGIN_ZIP:-$DECK_HOME/steamos-cec-toolkit-decky.zip}"
PLUGIN_DIR="${PLUGIN_DIR:-$DECK_HOME/homebrew/plugins}"
ROOT_HELPER_DIR="/var/lib/steamos-cec-toolkit"
SUDOERS_FILE="/etc/sudoers.d/zz-steamos-cec-toolkit-volume"
PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
STAGED_BIN_DIR="${STAGED_BIN_DIR:-}"

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

source_file() {
  local relative_path="$1"
  local flat_name="${relative_path##*/}"

  if [[ -n "$STAGED_BIN_DIR" && -f "$STAGED_BIN_DIR/$flat_name" ]]; then
    printf '%s\n' "$STAGED_BIN_DIR/$flat_name"
    return 0
  fi

  if [[ -f "$PROJECT_DIR/$relative_path" ]]; then
    printf '%s\n' "$PROJECT_DIR/$relative_path"
    return 0
  fi

  return 1
}

if [[ ! -f "$PLUGIN_ZIP" ]]; then
  echo "missing plugin zip: $PLUGIN_ZIP" >&2
  exit 1
fi

install -d -m 0755 "$ROOT_HELPER_DIR"
install -d -o "$DECK_USER" -g "$DECK_USER" -m 0755 "$DECK_HOME/.local/bin"
install -d -o "$DECK_USER" -g "$DECK_USER" -m 0755 "$DECK_HOME/.local/share/steamos-cec-toolkit"
install -d -o "$DECK_USER" -g "$DECK_USER" -m 0755 "$DECK_HOME/.config/systemd/user"

if src="$(source_file "VERSION")"; then
  install -o "$DECK_USER" -g "$DECK_USER" -m 0644 "$src" \
    "$DECK_HOME/.local/share/steamos-cec-toolkit/VERSION"
fi

for user_script in \
  steamos-cec-volume \
  steamos-cec-toolkitctl \
  steamos-cec-external-volume \
  steamos-cec-boot-wake \
  steamos-cec-steam-button \
  steamos-cec-tv-standby-suspend \
  steamos-cec-input-away-suspend \
  steamos-cec-gamescope-recovery
do
  if src="$(source_file "bin/$user_script")"; then
    install -o "$DECK_USER" -g "$DECK_USER" -m 0755 "$src" \
      "$DECK_HOME/.local/bin/$user_script"
  fi
done

for user_unit in \
  steamos-cec-boot-wake.service \
  steamos-cec-steam-button.service \
  steamos-cec-tv-standby-suspend.service \
  steamos-cec-input-away-suspend.service \
  steamos-cec-gamescope-recovery.service
do
  if src="$(source_file "systemd/user/$user_unit")"; then
    install -o "$DECK_USER" -g "$DECK_USER" -m 0644 "$src" \
      "$DECK_HOME/.config/systemd/user/$user_unit"
  fi
done

if src="$(source_file "bin/steamos-cec-volume-raw")"; then
  install -m 0755 "$src" \
    "$ROOT_HELPER_DIR/steamos-cec-volume-raw"
fi

if src="$(source_file "bin/steamos-cec-debug-monitor")"; then
  install -m 0755 "$src" \
    "$ROOT_HELPER_DIR/steamos-cec-debug-monitor"
fi

if src="$(source_file "bin/steamos-cec-power-standby-control")"; then
  install -m 0755 "$src" \
    "$ROOT_HELPER_DIR/steamos-cec-power-standby-control"
fi

if src="$(source_file "bin/steamos-cec-permissions-apply")"; then
  install -m 0755 "$src" \
    "$ROOT_HELPER_DIR/steamos-cec-permissions-apply"
fi

if src="$(source_file "bin/steamos-cec-before-sleep")"; then
  install -m 0755 "$src" \
    "$ROOT_HELPER_DIR/steamos-cec-before-sleep"
fi

if src="$(source_file "bin/steamos-cec-resume-wake")"; then
  install -m 0755 "$src" \
    "$ROOT_HELPER_DIR/steamos-cec-resume-wake"
fi

if src="$(source_file "bin/steamos-cec-usb-wake-apply")"; then
  install -m 0755 "$src" \
    "$ROOT_HELPER_DIR/steamos-cec-usb-wake-apply"
fi

if src="$(source_file "bin/steamos-cec-usb-wake-control")"; then
  install -m 0755 "$src" \
    "$ROOT_HELPER_DIR/steamos-cec-usb-wake-control"
fi

if src="$(source_file "systemd/system/steamos-cec-before-sleep.service")"; then
  install -m 0644 "$src" \
    /etc/systemd/system/steamos-cec-before-sleep.service
  systemctl daemon-reload
fi

if src="$(source_file "systemd/system/steamos-cec-permissions.service")"; then
  install -m 0644 "$src" \
    /etc/systemd/system/steamos-cec-permissions.service
  systemctl daemon-reload
  systemctl enable --now steamos-cec-permissions.service
fi

if src="$(source_file "udev/70-steamos-cec-toolkit.rules")"; then
  install -D -m 0644 "$src" \
    /etc/udev/rules.d/70-steamos-cec-toolkit.rules
  udevadm control --reload-rules || true
fi

if src="$(source_file "config/atomic-update-steamos-cec-toolkit.conf")"; then
  install -D -m 0644 "$src" \
    /etc/atomic-update.conf.d/steamos-cec-toolkit.conf
fi

if src="$(source_file "systemd/system/steamos-cec-usb-wake.service")"; then
  install -m 0644 "$src" \
    /etc/systemd/system/steamos-cec-usb-wake.service
  systemctl daemon-reload
fi

if src="$(source_file "systemd/system/steamos-cec-resume-wake.service")"; then
  install -m 0644 "$src" \
    /etc/systemd/system/steamos-cec-resume-wake.service
  rm -f /etc/systemd/system-sleep/steamos-cec-system-sleep
  systemctl daemon-reload
  if run_user_systemctl is-enabled --quiet steamos-cec-steam-button.service; then
    systemctl enable steamos-cec-resume-wake.service
  else
    systemctl disable steamos-cec-resume-wake.service 2>/dev/null || true
  fi
fi

{
  printf '%s ALL=(root) NOPASSWD: %s/steamos-cec-volume-raw *\n' "$DECK_USER" "$ROOT_HELPER_DIR"
  printf '%s ALL=(root) NOPASSWD: %s/steamos-cec-debug-monitor *\n' "$DECK_USER" "$ROOT_HELPER_DIR"
  printf '%s ALL=(root) NOPASSWD: %s/steamos-cec-power-standby-control *\n' "$DECK_USER" "$ROOT_HELPER_DIR"
  printf '%s ALL=(root) NOPASSWD: %s/steamos-cec-usb-wake-control *\n' "$DECK_USER" "$ROOT_HELPER_DIR"
  printf '%s ALL=(root) NOPASSWD: %s/steamos-cec-permissions-apply\n' "$DECK_USER" "$ROOT_HELPER_DIR"
} > "$SUDOERS_FILE"
chmod 0440 "$SUDOERS_FILE"

install -d -m 0755 "$PLUGIN_DIR"
unzip -o "$PLUGIN_ZIP" -d "$PLUGIN_DIR"
chown -R root:root "$PLUGIN_DIR/steamos-cec-toolkit"
chmod -R a+rX "$PLUGIN_DIR/steamos-cec-toolkit"

run_user_systemctl daemon-reload
run_user_systemctl try-restart steamos-cec-boot-wake.service || true
run_user_systemctl try-restart steamos-cec-steam-button.service || true
run_user_systemctl try-restart steamos-cec-input-away-suspend.service || true
run_user_systemctl try-restart steamos-cec-gamescope-recovery.service || true

echo "Installed SteamOS CEC Toolkit Decky plugin update."
echo "Plugin: $PLUGIN_DIR/steamos-cec-toolkit"
echo "Root helpers: $ROOT_HELPER_DIR"
echo "Restart Steam or reboot if the Decky plugin does not update immediately."
