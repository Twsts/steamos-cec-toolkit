#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/Twsts/steamos-cec-toolkit.git}"
RELEASE_BASE_URL="${RELEASE_BASE_URL:-}"
TOOLKIT_TARBALL_URL="${TOOLKIT_TARBALL_URL:-}"
DECKY_PLUGIN_ZIP_URL="${DECKY_PLUGIN_ZIP_URL:-}"
WORKDIR="${WORKDIR:-/tmp/steamos-cec-toolkit-install}"
PLUGIN_DIR="${PLUGIN_DIR:-$HOME/homebrew/plugins}"
PLUGIN_NAME="steamos-cec-toolkit"

say() {
  printf '\n%s\n' "$*"
}

step() {
  printf '\n==> %s\n' "$*"
}

ask_yes_no() {
  local prompt="$1"
  local default="${2:-yes}"
  local suffix answer
  if [[ "$default" == "yes" ]]; then
    suffix="[Y/n]"
  else
    suffix="[y/N]"
  fi

  if [[ "${STEAMOS_CEC_ASSUME_YES:-0}" == "1" ]]; then
    [[ "$default" == "yes" ]]
    return
  fi

  while true; do
    read -r -p "$prompt $suffix " answer
    answer="${answer,,}"
    if [[ -z "$answer" ]]; then
      [[ "$default" == "yes" ]]
      return
    fi
    case "$answer" in
      y|yes) return 0 ;;
      n|no) return 1 ;;
      *) printf 'Please answer yes or no.\n' ;;
    esac
  done
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'Missing required command: %s\n' "$1" >&2
    exit 1
  fi
}

if [[ "$(id -u)" -eq 0 ]]; then
  echo "Run this installer as the SteamOS desktop user, usually 'deck', not as root." >&2
  exit 1
fi

require_command curl
require_command sudo
require_command install
require_command systemctl
require_command tar
require_command unzip

say "SteamOS CEC Toolkit installer"
say "This installs the HDMI-CEC toolkit and the Decky plugin for Game Mode."
say "You will be asked for sudo once or a few times while root-owned files are installed."
say "The feature choices below can be changed later from the SteamOS CEC Decky plugin."

if [[ ! -d "$HOME/homebrew" ]]; then
  say "Decky Loader was not found at $HOME/homebrew."
  say "Install Decky Loader first, then rerun this installer."
  exit 1
fi

enable_steam_button=0
enable_tv_standby=0
enable_gamescope_recovery=0
enable_before_sleep=0
enable_usb_wake=0

if ask_yes_no "Enable Steam button/controller wake and input switching?" yes; then
  enable_steam_button=1
fi
if ask_yes_no "Enable TV standby suspends SteamOS?" no; then
  enable_tv_standby=1
fi
if ask_yes_no "Enable SteamOS sleep/shutdown turns off TV?" yes; then
  enable_before_sleep=1
fi
if ask_yes_no "Enable Bluetooth/controller wake from suspend?" no; then
  enable_usb_wake=1
fi
if ask_yes_no "Enable Gamescope recovery after CEC input activation?" no; then
  enable_gamescope_recovery=1
fi

step "Downloading toolkit"
rm -rf "$WORKDIR"
mkdir -p "$WORKDIR"

if [[ -n "$RELEASE_BASE_URL" && -z "$TOOLKIT_TARBALL_URL" ]]; then
  TOOLKIT_TARBALL_URL="$RELEASE_BASE_URL/steamos-cec-toolkit.tar.gz"
fi
if [[ -n "$RELEASE_BASE_URL" && -z "$DECKY_PLUGIN_ZIP_URL" ]]; then
  DECKY_PLUGIN_ZIP_URL="$RELEASE_BASE_URL/steamos-cec-toolkit-decky.zip"
fi

if [[ -n "$TOOLKIT_TARBALL_URL" ]]; then
  curl -fL "$TOOLKIT_TARBALL_URL" -o "$WORKDIR/toolkit.tar.gz"
  tar -xzf "$WORKDIR/toolkit.tar.gz" -C "$WORKDIR" --strip-components=1
else
  require_command git
  git clone --depth 1 "$REPO_URL" "$WORKDIR"
fi
cd "$WORKDIR"

install_args=()
if [[ "$enable_steam_button" -eq 1 ]]; then
  install_args+=(--enable-steam-button)
fi
if [[ "$enable_tv_standby" -eq 1 ]]; then
  install_args+=(--enable-tv-standby-suspend)
fi
if [[ "$enable_gamescope_recovery" -eq 1 ]]; then
  install_args+=(--enable-gamescope-recovery)
fi
if [[ "$enable_before_sleep" -eq 1 ]]; then
  install_args+=(--enable-before-sleep)
fi
if [[ "$enable_usb_wake" -eq 1 ]]; then
  install_args+=(--enable-usb-wake)
fi

step "Installing CEC toolkit"
./install.sh "${install_args[@]}"

step "Installing Decky plugin"
sudo install -d -m 0755 "$PLUGIN_DIR"
sudo rm -rf "$PLUGIN_DIR/$PLUGIN_NAME"

if [[ -n "$DECKY_PLUGIN_ZIP_URL" ]]; then
  curl -fL "$DECKY_PLUGIN_ZIP_URL" -o "$WORKDIR/steamos-cec-toolkit-decky.zip"
  sudo unzip -o "$WORKDIR/steamos-cec-toolkit-decky.zip" -d "$PLUGIN_DIR"
else
  sudo install -d -m 0755 "$PLUGIN_DIR/$PLUGIN_NAME"
  sudo cp -a decky/plugin.json decky/package.json decky/main.py decky/dist "$PLUGIN_DIR/$PLUGIN_NAME/"
fi

sudo chown -R root:root "$PLUGIN_DIR/$PLUGIN_NAME"
sudo chmod -R a+rX "$PLUGIN_DIR/$PLUGIN_NAME"

if systemctl list-unit-files plugin_loader.service >/dev/null 2>&1; then
  sudo systemctl restart plugin_loader.service
fi

step "Checking CEC setup"
if ~/.local/bin/steamos-cec-toolkitctl discover-cec >/tmp/steamos-cec-discovery.json 2>/tmp/steamos-cec-discovery.err; then
  python3 - <<'PY' || true
import json
from pathlib import Path

payload = json.loads(Path("/tmp/steamos-cec-discovery.json").read_text())
adapter = payload.get("cec_device", "")
available = payload.get("available_cec_devices", [])
note = payload.get("note", "")
if adapter:
    print(f"Using CEC adapter: {adapter}")
if len(available) > 1:
    print("Available CEC adapters:")
    for device in available:
        print(f"  {device}")
if note:
    print(note)
devices = payload.get("devices", [])
if devices:
    print("Found CEC devices:")
    for device in devices:
        print(f"  {device.get('label', device.get('logical_address', '?'))}")
suggested = payload.get("suggested", {})
if suggested:
    print(
        "Suggested volume path: "
        f"{suggested.get('CEC_VOLUME_INITIATOR', '0')} -> "
        f"{suggested.get('CEC_AUDIO_LOGICAL_ADDRESS', '5')}"
    )
PY
else
  say "CEC discovery did not complete yet."
  if [[ -s /tmp/steamos-cec-discovery.json ]]; then
    python3 - <<'PY' || true
import json
from pathlib import Path

payload = json.loads(Path("/tmp/steamos-cec-discovery.json").read_text())
error = payload.get("error", "")
if error:
    print(error)
PY
  fi
  say "You can run discovery later from the Decky plugin after the CEC adapter is available."
  sed -n '1,8p' /tmp/steamos-cec-discovery.err 2>/dev/null || true
fi

step "Done"
cat <<'DONE'
Open Game Mode and check the Decky plugin named "SteamOS CEC".

Recommended first steps in the plugin:
  1. Open Configuration and run Discover CEC Devices.
  2. Test Wake TV / Select Input.
  3. If you want SteamOS volume buttons to control CEC audio, confirm Volume Initiator and Audio Target, then test Volume Up.
  4. Toggle features on or off under Features.

If Game Mode does not show the plugin immediately, restart Steam or reboot.
DONE
