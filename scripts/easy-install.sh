#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/Twsts/steamos-cec-toolkit.git}"
RELEASE_BASE_URL="${RELEASE_BASE_URL:-}"
TOOLKIT_TARBALL_URL="${TOOLKIT_TARBALL_URL:-}"
DECKY_PLUGIN_ZIP_URL="${DECKY_PLUGIN_ZIP_URL:-}"
WORKDIR="${WORKDIR:-/tmp/steamos-cec-toolkit-install}"
PLUGIN_DIR="${PLUGIN_DIR:-$HOME/homebrew/plugins}"
PLUGIN_NAME="steamos-cec-toolkit"
verify_atomic_update=0

usage() {
  cat <<'USAGE'
Usage: steamos-cec-toolkit-installer.sh [options]

Options:
  --verify    Run SteamOS atomic-update persistence verification when supported
  -h, --help  Show this help
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --verify) verify_atomic_update=1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
  shift
done

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

service_default() {
  local scope="$1"
  local unit="$2"
  local fallback="$3"
  local state

  if [[ "$scope" == "user" ]]; then
    state="$(systemctl --user is-enabled "$unit" 2>/dev/null || true)"
  else
    state="$(systemctl is-enabled "$unit" 2>/dev/null || true)"
  fi

  case "$state" in
    enabled|static|generated|linked|linked-runtime) printf 'yes\n' ;;
    disabled|masked) printf 'no\n' ;;
    *) printf '%s\n' "$fallback" ;;
  esac
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

say "SteamOS CEC Toolkit installer"
say "This installs the HDMI-CEC toolkit and can optionally install the Decky plugin for Game Mode."
say "You will be asked for sudo once or a few times while root-owned files are installed."
say "The feature choices below can be changed later from the SteamOS CEC Decky plugin if you install it."
say "If this is a reinstall, the defaults below use your current enabled/disabled feature state where it can be detected."

install_decky_default=no
if [[ -d "$HOME/homebrew" ]]; then
  install_decky_default=yes
else
  say "Decky Loader was not found at $HOME/homebrew."
  say "The toolkit can still be installed and managed from the command line."
fi

install_decky=0
if ask_yes_no "Install the Decky plugin?" "$install_decky_default"; then
  install_decky=1
  if [[ ! -d "$HOME/homebrew" ]]; then
    say "Decky Loader is required for the plugin but was not found at $HOME/homebrew."
    say "You can still install the toolkit now and add the Decky plugin later."
    if ask_yes_no "Continue without the Decky plugin?" yes; then
      install_decky=0
    else
      say "Install Decky Loader first, then rerun this installer if you want the plugin."
      exit 1
    fi
  fi
  if [[ "$install_decky" -eq 1 ]]; then
    require_command unzip
  fi
fi

enable_steam_button=0
enable_boot_wake=0
enable_tv_standby=0
enable_input_away_suspend=0
enable_gamescope_recovery=0
enable_before_sleep=0
enable_usb_wake=0

steam_button_default="$(service_default user steamos-cec-steam-button.service yes)"
boot_wake_default="$(service_default user steamos-cec-boot-wake.service no)"
tv_standby_default="$(service_default user steamos-cec-tv-standby-suspend.service no)"
input_away_suspend_default="$(service_default user steamos-cec-input-away-suspend.service no)"
before_sleep_default="$(service_default system steamos-cec-before-sleep.service yes)"
usb_wake_default="$(service_default system steamos-cec-usb-wake.service no)"
gamescope_recovery_default="$(service_default user steamos-cec-gamescope-recovery.service no)"

if ask_yes_no "Enable Steam button/controller wake and input switching?" "$steam_button_default"; then
  enable_steam_button=1
fi
if ask_yes_no "Enable wake and input switching when SteamOS starts?" "$boot_wake_default"; then
  enable_boot_wake=1
fi
if ask_yes_no "Enable TV standby suspends SteamOS?" "$tv_standby_default"; then
  enable_tv_standby=1
fi
if ask_yes_no "Enable input inactive suspends SteamOS?" "$input_away_suspend_default"; then
  enable_input_away_suspend=1
fi
if ask_yes_no "Enable SteamOS sleep/shutdown turns off TV?" "$before_sleep_default"; then
  enable_before_sleep=1
fi
if ask_yes_no "Enable Bluetooth/controller wake from suspend?" "$usb_wake_default"; then
  enable_usb_wake=1
fi
if ask_yes_no "Enable Gamescope recovery after CEC input activation?" "$gamescope_recovery_default"; then
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
if [[ "$enable_boot_wake" -eq 1 ]]; then
  install_args+=(--enable-boot-wake)
fi
if [[ "$enable_tv_standby" -eq 1 ]]; then
  install_args+=(--enable-tv-standby-suspend)
fi
if [[ "$enable_input_away_suspend" -eq 1 ]]; then
  install_args+=(--enable-input-inactive-suspend)
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
if [[ "$verify_atomic_update" -eq 1 ]]; then
  install_args+=(--verify)
fi

step "Installing CEC toolkit"
./install.sh "${install_args[@]}"

if [[ "$install_decky" -eq 1 ]]; then
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
else
  step "Skipping Decky plugin"
  say "You can manage the toolkit with ~/.local/bin/steamos-cec-toolkitctl and rerun this installer later to add the plugin."
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

step "Checking HDMI audio setup"
if ~/.local/bin/steamos-cec-toolkitctl discover-audio >/tmp/steamos-cec-audio-discovery.json 2>/tmp/steamos-cec-audio-discovery.err; then
  python3 - <<'PY' || true
import json
from pathlib import Path

payload = json.loads(Path("/tmp/steamos-cec-audio-discovery.json").read_text())
cards = payload.get("cards", [])
if cards:
    print("Found HDMI/DisplayPort audio outputs:")
    for card in cards:
        print(f"  {card.get('label') or card.get('name')}")
suggested = payload.get("suggested", {})
if suggested:
    print("Suggested HDMI audio card:")
    print(f"  {suggested.get('HDMI_ALSA_CARD_NAME', '')} / {suggested.get('HDMI_ALSA_CARD_NICK', '')}")
    print(f"  route: {suggested.get('EXTERNAL_VOLUME_ROUTE', 'hdmi-output-0')}")
note = payload.get("note", "")
if note:
    print(note)
PY
else
  say "HDMI audio discovery did not find a usable output yet."
  if [[ -s /tmp/steamos-cec-audio-discovery.json ]]; then
    python3 - <<'PY' || true
import json
from pathlib import Path

payload = json.loads(Path("/tmp/steamos-cec-audio-discovery.json").read_text())
error = payload.get("error", "")
if error:
    print(error)
PY
  fi
  say "You can run audio discovery later from the Decky plugin after PipeWire/Game Mode audio is available."
  sed -n '1,8p' /tmp/steamos-cec-audio-discovery.err 2>/dev/null || true
fi

step "Done"
cat <<'DONE'
If you installed the Decky plugin, open Game Mode and check the plugin named "SteamOS CEC".

Recommended first steps in the plugin:
  1. Open Configuration and run Discover CEC Devices.
  2. Test Wake TV / Select Input.
  3. If you want SteamOS volume buttons to control CEC audio, run Discover Audio Output, confirm Volume Initiator / Audio Target / HDMI Audio Card, then test Volume Up.
  4. Toggle features on or off under Features.
  5. If you enabled CEC Volume Buttons, reboot once before judging whether Quick Settings has switched from the slider to + / -.

Command-line checks:
  ~/.local/bin/steamos-cec-toolkitctl status
  ~/.local/bin/steamos-cec-toolkitctl wake
  ~/.local/bin/steamos-cec-toolkitctl volume up

If Game Mode does not show the plugin immediately after plugin install, restart Steam or reboot.
DONE
