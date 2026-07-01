#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${STEAMOS_CEC_CONFIG:-/etc/steamos-cec-toolkit.conf}"

enable_external_volume=1
enable_steam_button=0
enable_boot_wake=0
enable_tv_standby=0
enable_gamescope_recovery=0
enable_before_sleep=0
enable_usb_wake=0
restart_services=1

usage() {
  cat <<'USAGE'
Usage: ./install.sh [options]

Options:
  --enable-steam-button         Wake the TV/AVR and activate this HDMI input from the Steam button/controller wake
  --enable-boot-wake            Wake the TV/AVR and activate this HDMI input when SteamOS starts
  --enable-tv-standby-suspend   Suspend SteamOS when the TV broadcasts HDMI-CEC standby
  --enable-gamescope-recovery   Restart Gamescope after CEC source activation if the display gets stuck
  --enable-before-sleep         Send HDMI-CEC standby before SteamOS sleeps (system service)
  --enable-usb-wake             Enable USB wake for Bluetooth/controller receivers (system service)
  --no-external-volume          Do not install the PipeWire ExternalVolume integration
  --no-restart                  Install files but do not restart user services
  -h, --help                    Show this help

Environment:
  STEAMOS_CEC_CONFIG=/path/to/config
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --enable-steam-button) enable_steam_button=1 ;;
    --enable-boot-wake) enable_boot_wake=1 ;;
    --enable-tv-standby-suspend) enable_tv_standby=1 ;;
    --enable-gamescope-recovery) enable_gamescope_recovery=1 ;;
    --enable-before-sleep) enable_before_sleep=1 ;;
    --enable-usb-wake) enable_usb_wake=1 ;;
    --no-external-volume) enable_external_volume=0 ;;
    --no-restart) restart_services=0 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
  shift
done

if [[ "$(id -u)" -eq 0 ]]; then
  echo "Run this installer as the SteamOS desktop user, usually 'deck', not as root." >&2
  exit 1
fi

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "missing required command: $1" >&2
    exit 1
  fi
}

require_command install
require_command sudo
require_command systemctl
require_command python3

if [[ "$enable_external_volume" -eq 1 ]]; then
  require_command cec-ctl
  require_command varlinkctl
fi

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "Installing default config at $CONFIG_FILE"
  sudo install -D -m 0644 "$PROJECT_DIR/config/steamos-cec-toolkit.conf.example" "$CONFIG_FILE"
  mapfile -t detected_cec_devices < <(compgen -G "/dev/cec*" | sort)
  if [[ "${#detected_cec_devices[@]}" -eq 1 && "${detected_cec_devices[0]}" != "/dev/cec0" ]]; then
    echo "Using detected CEC adapter ${detected_cec_devices[0]} in $CONFIG_FILE"
    sudo sed -i "s|^CEC_DEVICE=.*|CEC_DEVICE=${detected_cec_devices[0]}|" "$CONFIG_FILE"
  elif [[ "${#detected_cec_devices[@]}" -gt 1 ]]; then
    echo "Multiple CEC adapters found: ${detected_cec_devices[*]}"
    echo "Keeping default CEC_DEVICE=/dev/cec0. You can change this later from the Decky plugin or $CONFIG_FILE."
  fi
else
  echo "Keeping existing config at $CONFIG_FILE"
fi

if grep -qx 'HDMI_ALSA_CARD_NICK=HDA ATI HDMI' "$CONFIG_FILE" 2>/dev/null; then
  echo "Repairing unquoted HDMI_ALSA_CARD_NICK in $CONFIG_FILE"
  sudo sed -i 's/^HDMI_ALSA_CARD_NICK=HDA ATI HDMI$/HDMI_ALSA_CARD_NICK="HDA ATI HDMI"/' "$CONFIG_FILE"
fi

install -d "$HOME/.local/bin"
install -m 0755 "$PROJECT_DIR/bin/steamos-cec-volume" "$HOME/.local/bin/steamos-cec-volume"
install -m 0755 "$PROJECT_DIR/bin/steamos-cec-toolkitctl" "$HOME/.local/bin/steamos-cec-toolkitctl"
install -m 0755 "$PROJECT_DIR/bin/steamos-cec-external-volume" "$HOME/.local/bin/steamos-cec-external-volume"
install -m 0755 "$PROJECT_DIR/bin/steamos-cec-boot-wake" "$HOME/.local/bin/steamos-cec-boot-wake"
install -m 0755 "$PROJECT_DIR/bin/steamos-cec-steam-button" "$HOME/.local/bin/steamos-cec-steam-button"
install -m 0755 "$PROJECT_DIR/bin/steamos-cec-tv-standby-suspend" \
  "$HOME/.local/bin/steamos-cec-tv-standby-suspend"
install -m 0755 "$PROJECT_DIR/bin/steamos-cec-gamescope-recovery" \
  "$HOME/.local/bin/steamos-cec-gamescope-recovery"

if [[ "$enable_external_volume" -eq 1 ]]; then
  "$HOME/.local/bin/steamos-cec-toolkitctl" discover-audio >/dev/null 2>&1 || true
fi

# shellcheck disable=SC1090
source "$CONFIG_FILE"
USER_CONFIG_FILE="$HOME/.config/steamos-cec-toolkit/config.conf"
if [[ -f "$USER_CONFIG_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$USER_CONFIG_FILE"
fi

HDMI_ALSA_CARD_NAME="${HDMI_ALSA_CARD_NAME:-alsa_card.pci-0000_03_00.1}"
HDMI_ALSA_CARD_NICK="${HDMI_ALSA_CARD_NICK:-HDA ATI HDMI}"

sudo install -d -m 0755 /var/lib/steamos-cec-toolkit
sudo install -m 0755 "$PROJECT_DIR/bin/steamos-cec-volume-raw" \
  /var/lib/steamos-cec-toolkit/steamos-cec-volume-raw
sudo install -m 0755 "$PROJECT_DIR/bin/steamos-cec-debug-monitor" \
  /var/lib/steamos-cec-toolkit/steamos-cec-debug-monitor
sudo install -m 0755 "$PROJECT_DIR/bin/steamos-cec-power-standby-control" \
  /var/lib/steamos-cec-toolkit/steamos-cec-power-standby-control
sudo install -m 0755 "$PROJECT_DIR/bin/steamos-cec-permissions-apply" \
  /var/lib/steamos-cec-toolkit/steamos-cec-permissions-apply
sudo install -m 0755 "$PROJECT_DIR/bin/steamos-cec-before-sleep" \
  /var/lib/steamos-cec-toolkit/steamos-cec-before-sleep
sudo install -m 0755 "$PROJECT_DIR/bin/steamos-cec-usb-wake-apply" \
  /var/lib/steamos-cec-toolkit/steamos-cec-usb-wake-apply
sudo install -m 0755 "$PROJECT_DIR/bin/steamos-cec-usb-wake-control" \
  /var/lib/steamos-cec-toolkit/steamos-cec-usb-wake-control
sudo install -D -m 0644 "$PROJECT_DIR/systemd/system/steamos-cec-before-sleep.service" \
  /etc/systemd/system/steamos-cec-before-sleep.service
sudo install -D -m 0644 "$PROJECT_DIR/systemd/system/steamos-cec-permissions.service" \
  /etc/systemd/system/steamos-cec-permissions.service
sudo install -D -m 0644 "$PROJECT_DIR/systemd/system/steamos-cec-usb-wake.service" \
  /etc/systemd/system/steamos-cec-usb-wake.service
sudo install -D -m 0644 "$PROJECT_DIR/udev/70-steamos-cec-toolkit.rules" \
  /etc/udev/rules.d/70-steamos-cec-toolkit.rules

sudoers_tmp="$(mktemp)"
{
  printf '%s ALL=(root) NOPASSWD: /var/lib/steamos-cec-toolkit/steamos-cec-volume-raw *\n' "$(id -un)"
  printf '%s ALL=(root) NOPASSWD: /var/lib/steamos-cec-toolkit/steamos-cec-debug-monitor *\n' "$(id -un)"
  printf '%s ALL=(root) NOPASSWD: /var/lib/steamos-cec-toolkit/steamos-cec-power-standby-control *\n' "$(id -un)"
  printf '%s ALL=(root) NOPASSWD: /var/lib/steamos-cec-toolkit/steamos-cec-usb-wake-control *\n' "$(id -un)"
  printf '%s ALL=(root) NOPASSWD: /var/lib/steamos-cec-toolkit/steamos-cec-permissions-apply\n' "$(id -un)"
} > "$sudoers_tmp"
sudo install -m 0440 "$sudoers_tmp" /etc/sudoers.d/zz-steamos-cec-toolkit-volume
rm -f "$sudoers_tmp"

if [[ "$enable_external_volume" -eq 1 ]]; then
  install -d "$HOME/.config/systemd/user/cec-audio-control.service.d"
  install -m 0644 "$PROJECT_DIR/systemd/user/cec-audio-control.service.d/override.conf" \
    "$HOME/.config/systemd/user/cec-audio-control.service.d/override.conf"

  install -d "$HOME/.config/wireplumber/wireplumber.conf.d"
  sed \
    -e "s|@HDMI_ALSA_CARD_NAME@|$HDMI_ALSA_CARD_NAME|g" \
    "$PROJECT_DIR/wireplumber/99-steamos-cec-external-volume.conf.in" \
    > "$HOME/.config/wireplumber/wireplumber.conf.d/99-steamos-cec-external-volume.conf"
fi

install -d "$HOME/.config/systemd/user"
install -m 0644 "$PROJECT_DIR/systemd/user/steamos-cec-steam-button.service" \
  "$HOME/.config/systemd/user/steamos-cec-steam-button.service"
install -m 0644 "$PROJECT_DIR/systemd/user/steamos-cec-boot-wake.service" \
  "$HOME/.config/systemd/user/steamos-cec-boot-wake.service"
install -m 0644 "$PROJECT_DIR/systemd/user/steamos-cec-tv-standby-suspend.service" \
  "$HOME/.config/systemd/user/steamos-cec-tv-standby-suspend.service"
install -m 0644 "$PROJECT_DIR/systemd/user/steamos-cec-gamescope-recovery.service" \
  "$HOME/.config/systemd/user/steamos-cec-gamescope-recovery.service"

if [[ "$enable_tv_standby" -eq 1 || "$enable_gamescope_recovery" -eq 1 ]]; then
  if ! python3 -c 'import dbus_next' >/dev/null 2>&1; then
    echo "warning: python module dbus_next is missing; TV standby/Gamescope recovery services may fail" >&2
  fi
fi

systemctl --user daemon-reload

sudo systemctl daemon-reload
sudo udevadm control --reload-rules || true
sudo /var/lib/steamos-cec-toolkit/steamos-cec-permissions-apply || true
sudo systemctl enable --now steamos-cec-permissions.service
systemctl --user restart cecd.service 2>/dev/null || true

if [[ "$enable_steam_button" -eq 1 ]]; then
  systemctl --user enable --now steamos-cec-steam-button.service
fi
if [[ "$enable_boot_wake" -eq 1 ]]; then
  systemctl --user enable steamos-cec-boot-wake.service
fi
if [[ "$enable_tv_standby" -eq 1 ]]; then
  systemctl --user enable --now steamos-cec-tv-standby-suspend.service
fi
if [[ "$enable_gamescope_recovery" -eq 1 ]]; then
  systemctl --user enable --now steamos-cec-gamescope-recovery.service
fi
if [[ "$enable_before_sleep" -eq 1 ]]; then
  sudo /var/lib/steamos-cec-toolkit/steamos-cec-power-standby-control on
else
  sudo systemctl daemon-reload
fi
if [[ "$enable_usb_wake" -eq 1 ]]; then
  sudo systemctl daemon-reload
  sudo systemctl enable --now steamos-cec-usb-wake.service
fi

if [[ "$restart_services" -eq 1 ]]; then
  if [[ "$enable_external_volume" -eq 1 ]]; then
    systemctl --user stop cec-audio-control.service 2>/dev/null || true
    systemctl --user start cec-audio-control.socket 2>/dev/null || true
    systemctl --user restart wireplumber.service
  fi
fi

echo
echo "Installed SteamOS CEC Toolkit."
echo "Config: $CONFIG_FILE"
echo
echo "Quick checks:"
echo "  ~/.local/bin/steamos-cec-volume up"
echo "  varlinkctl call unix:/run/user/1000/cec-audio-control/org.pipewire.ExternalVolume org.pipewire.ExternalVolume.GetCapabilities '{\"device\":\"\"}'"
echo "  wpctl status"
