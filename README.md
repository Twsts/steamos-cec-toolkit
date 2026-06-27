# SteamOS CEC Toolkit

SteamOS CEC Toolkit is a community project for DIY / self-installed SteamOS
console builds. It is known to work on a Radeon 9070 XT system using a UGREEN
DisplayPort-to-HDMI adapter that exposes `/dev/cec0`.

This is not an official Valve project. It was built and tested with Codex
assistance, and it intentionally uses SteamOS' existing CEC and audio plumbing
instead of patching Steam.

SteamOS CEC Toolkit is an installable set of scripts and systemd/WirePlumber
overrides for DIY Steam Machine / HTPC builds that use HDMI-CEC through an
adapter such as the UGREEN DisplayPort-to-HDMI CEC adapter.

It was built for a living-room SteamOS box where:

- SteamOS Game Mode should show relative volume controls (`+` / `-`) instead of
  a normal software volume slider.
- The `+` / `-` buttons should control the real receiver / soundbar volume over
  HDMI-CEC.
- A Steam Controller Steam-button press should wake/power on the TV/AVR over
  HDMI-CEC and switch the active input back to the SteamOS box.
- Waking or reconnecting the controller should also wake the display chain and
  activate the SteamOS HDMI source.
- Optional helpers can suspend SteamOS when the TV sends standby and recover
  Gamescope after CEC wake/input switching.

The project uses Valve's existing SteamOS CEC daemon (`cecd`) and PipeWire
ExternalVolume plumbing.

<img width="282" height="673" alt="image" src="https://github.com/user-attachments/assets/d0d05e52-e567-4005-a6ba-bea1e30460e3" />

## Install

Run this on the SteamOS machine as the normal desktop user, usually `deck`:

```bash
bash <(curl -fsSL https://github.com/Twsts/steamos-cec-toolkit/releases/latest/download/steamos-cec-toolkit-installer.sh)
```

The installer will:

- download the latest release assets
- ask which features you want to enable
- install the CEC volume shim and root helpers
- install the Decky plugin
- discover CEC devices where possible
- restart Decky Loader

After installation, open Game Mode and use the `SteamOS CEC` Decky plugin:

1. Open `Configuration`.
2. Press `Discover CEC Devices`.
3. Confirm `Volume Initiator` and `Audio Target`.
4. Use `Actions` to test wake/input selection and volume.
5. Toggle the features you want under `Features`.

If the plugin does not appear immediately, restart Steam or reboot.

Development builds can be installed from `main` with:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/Twsts/steamos-cec-toolkit/main/scripts/easy-install.sh)
```

## Requirements

- SteamOS / Steam Deck-style Game Mode on a DIY HTPC.
- Decky Loader already installed.
- A working CEC adapter exposed as `/dev/cec0` or similar.
- A TV/AVR/soundbar HDMI-CEC chain.
- `git`, `curl`, `sudo`, `systemctl`, and `unzip` available on the SteamOS
  desktop session.

## Hardware This Targets

Known-good reference setup:

- SteamOS / Steam Deck-style Game Mode on a DIY HTPC.
- UGREEN DisplayPort-to-HDMI adapter with HDMI-CEC support.
- TV + AVR/soundbar HDMI-CEC chain.
- Steam Controller for the Steam-button TV wake/input-switch helper.

Other adapters and controllers may work, but you should verify the CEC topology
and controller HID report format first.

## What It Installs

User files:

```text
~/.local/bin/steamos-cec-volume
~/.local/bin/steamos-cec-external-volume
~/.local/bin/steamos-cec-steam-button
~/.local/bin/steamos-cec-tv-standby-suspend
~/.local/bin/steamos-cec-gamescope-recovery
~/.config/systemd/user/cec-audio-control.service.d/override.conf
~/.config/systemd/user/steamos-cec-*.service
~/.config/wireplumber/wireplumber.conf.d/99-steamos-cec-external-volume.conf
```

Root files:

```text
/etc/steamos-cec-toolkit.conf
/etc/sudoers.d/zz-steamos-cec-toolkit-volume
/var/lib/steamos-cec-toolkit/steamos-cec-volume-raw
/var/lib/steamos-cec-toolkit/steamos-cec-before-sleep
/etc/systemd/system/steamos-cec-before-sleep.service
```

## Why Relative Volume Needs a Shim

SteamOS has an official user service:

```text
/usr/lib/systemd/user/cec-audio-control.socket
/usr/lib/systemd/user/cec-audio-control.service
```

It exposes a Varlink interface:

```text
org.pipewire.ExternalVolume
```

WirePlumber can attach this ExternalVolume socket to the HDMI ALSA card. When
Steam sees usable relative-volume capabilities, Game Mode changes from a normal
volume slider to `+` / `-`.

Some AVRs ignore CEC volume commands from the SteamOS playback device logical
address, but accept the exact same command when it is sent as if it came from
the TV logical address. The toolkit replaces the `cec-audio-control` service
with a small Varlink shim that still speaks `org.pipewire.ExternalVolume`, but
uses `cec-ctl --raw-msg -f <initiator> -t <audio-system>` for volume.

Default behavior:

```text
initiator: 0  (TV)
target:    5  (Audio System)
```

## Quick Install

Most users should use the one-command installer above.

Manual install:

Clone the repo on the SteamOS machine as the `deck` user:

```bash
git clone https://github.com/Twsts/steamos-cec-toolkit.git
cd steamos-cec-toolkit
```

Install the ExternalVolume integration and the Steam-button TV wake/input-switch
helper:

```bash
./install.sh --enable-steam-button
```

Install everything:

```bash
./install.sh \
  --enable-steam-button \
  --enable-tv-standby-suspend \
  --enable-gamescope-recovery \
  --enable-before-sleep
```

Then restart Steam/Game Mode or reboot.

## Release Assets

Each GitHub release should include:

```text
steamos-cec-toolkit-installer.sh
steamos-cec-toolkit-decky.zip
steamos-cec-toolkit.tar.gz
SHA256SUMS
```

Build them from a clean checkout:

```bash
scripts/build-release-assets.sh v0.1.0
```

Upload example:

```bash
gh release create v0.1.0 \
  release/steamos-cec-toolkit-installer.sh \
  release/steamos-cec-toolkit-decky.zip \
  release/steamos-cec-toolkit.tar.gz \
  release/SHA256SUMS \
  --title "v0.1.0"
```

## Decky Plugin

This repository also includes an early Decky plugin under:

```text
decky/
```

The plugin is a Game Mode control panel for an already bootstrapped toolkit. It
can:

- show ExternalVolume/toolkit status
- toggle SteamOS CEC volume buttons on/off so you can switch between relative
  `+ / -` control and the normal SteamOS volume bar
- toggle the user services for Steam-button TV wake, TV standby suspend,
  SteamOS sleep/shutdown TV standby, and Gamescope recovery
- discover CEC devices and choose the volume initiator/audio target from
  dropdowns
- test TV wake/input selection
- test volume up/down/mute
- restart the CEC audio/WirePlumber path

The plugin intentionally does not create sudoers rules or write root-owned
system files. Install the toolkit from Desktop/SSH first, then use the plugin
for day-to-day control. Runtime choices made in the plugin are written to:

```text
~/.config/steamos-cec-toolkit/config.conf
```

Build the plugin:

```bash
cd decky
npm install
npm run build
```

For local testing, install the built Decky plugin using Decky Loader developer
tools or copy the plugin directory according to your Decky development workflow.

## Configure Your Machine

The installer creates:

```text
/etc/steamos-cec-toolkit.conf
```

The Decky plugin can write user-level overrides for common runtime choices. For
system defaults, edit:

```bash
sudoedit /etc/steamos-cec-toolkit.conf
```

Important defaults:

```bash
CEC_DEVICE=/dev/cec0
STEAMOS_CEC_USER=deck
CEC_VOLUME_INITIATOR=0
CEC_AUDIO_LOGICAL_ADDRESS=5
HDMI_ALSA_CARD_NAME=alsa_card.pci-0000_03_00.1
HDMI_ALSA_CARD_NICK=HDA ATI HDMI
EXTERNAL_VOLUME_ROUTE=hdmi-output-0
```

Find CEC topology:

```bash
cec-ctl -d /dev/cec0 --show-topology
```

Find the HDMI ALSA card:

```bash
wpctl status
pw-cli ls Device
```

After changing config, rerun the installer or regenerate the WirePlumber file:

```bash
./install.sh --enable-steam-button
```

## Verify ExternalVolume

Check the Varlink capabilities:

```bash
varlinkctl call \
  unix:/run/user/1000/cec-audio-control/org.pipewire.ExternalVolume \
  org.pipewire.ExternalVolume.GetCapabilities \
  '{"device":""}'
```

Expected output includes:

```json
{
  "writeVolumeRelative": true,
  "writeVolumeRelativeStep": { "min": 1.0, "max": 1.0 },
  "writeMuteToggle": true,
  "routes": ["hdmi-output-0"]
}
```

Test volume:

```bash
varlinkctl call \
  unix:/run/user/1000/cec-audio-control/org.pipewire.ExternalVolume \
  org.pipewire.ExternalVolume.WriteVolumeRelative \
  '{"device":"","route":"hdmi-output-0","step":1.0}'
```

If the receiver volume moves, the shim is working.

## CEC Debug Capture

The Decky plugin has a Debug panel that can capture a short window of live CEC
messages. This uses a narrow root helper because `cec-ctl --monitor-all`
normally requires root on SteamOS.

From SSH/Desktop you can run the same capture manually:

```bash
~/.local/bin/steamos-cec-toolkitctl debug-cec 3
```

The capture window is intentionally limited to 1-5 seconds. It is meant for
checking routing, source activation, standby broadcasts, and volume commands
without leaving a long-running root monitor behind.

## Hardware and Topology Notes

The defaults match a common UGREEN DP-to-HDMI CEC adapter setup where SteamOS is
a playback device, the TV is logical address `0`, and the receiver/audio system
is logical address `5`. Other HDMI chains can differ.

Check topology:

```bash
cec-ctl -d /dev/cec0 --show-topology
```

Then update `/etc/steamos-cec-toolkit.conf` if needed:

```bash
CEC_DEVICE=/dev/cec0
CEC_VOLUME_INITIATOR=0
CEC_AUDIO_LOGICAL_ADDRESS=5
HDMI_ALSA_CARD_NAME=alsa_card.pci-0000_03_00.1
HDMI_ALSA_CARD_NICK=HDA ATI HDMI
EXTERNAL_VOLUME_ROUTE=hdmi-output-0
```

The toolkit is configurable, but not fully topology-agnostic yet. In
particular, some receivers accept volume only from the TV logical address while
others may accept it from the SteamOS playback address. HDMI/WirePlumber card
matching can also vary by GPU, adapter, and distro image.

## Steam Button TV Wake and Input Switching

The `steamos-cec-steam-button` service watches the Steam Controller HID reports.
It wakes/powers on the TV/AVR chain and activates the SteamOS HDMI source by
calling SteamOS `cecd`:

```bash
busctl --user call \
  com.steampowered.CecDaemon1 \
  /com/steampowered/CecDaemon1/Daemon \
  com.steampowered.CecDaemon1.Daemon1 \
  Wake
```

It triggers on:

- controller connect/resume
- a short Steam-button press

On a working CEC topology this is the same behavior users expect from a console:
press the controller button, the display wakes, the AVR/TV selects the SteamOS
input, and Game Mode appears.

Default report parsing targets the original Steam Controller:

```bash
STEAM_BUTTON_HID_ID=0003:000028DE:00001304
STEAM_BUTTON_REPORT_ID=0x45
STEAM_BUTTON_BYTE=4
STEAM_BUTTON_MASK=0x01
```

Other controllers may require different values or a new parser.

## Optional TV Standby Suspend

Enable with:

```bash
./install.sh --enable-tv-standby-suspend
```

This listens for TV broadcast standby:

```text
source:      0  (TV)
destination: 15 (broadcast)
opcode:      0x36 (Standby)
```

Then it runs:

```bash
systemctl suspend
```

## Optional SteamOS Sleep/Shutdown CEC Standby

Enable with:

```bash
./install.sh --enable-before-sleep
```

This installs a system service that asks `cecd` to send TV standby before
SteamOS sleeps or shuts down. The Decky plugin can toggle it after the root
helper and system unit have been installed.

## Optional Gamescope Recovery

Enable with:

```bash
./install.sh --enable-gamescope-recovery
```

This watches the `Active` property from `cecd`. When this source becomes active,
it can restart `gamescope-session.target` after a short delay. This is useful on
some HTPC setups where switching back to the SteamOS input leaves Game Mode in a
bad display state.

Configure the connector status path in:

```bash
GAMESCOPE_CONNECTOR_STATUS=/sys/class/drm/card0-DP-1/status
```

## Logs

```bash
journalctl --user -b -u cec-audio-control.service --no-pager
journalctl --user -b -u steamos-cec-steam-button.service --no-pager
journalctl --user -b -u steamos-cec-tv-standby-suspend.service --no-pager
journalctl --user -b -u steamos-cec-gamescope-recovery.service --no-pager
journalctl --user -b -u wireplumber.service --no-pager
```

## Uninstall

```bash
./uninstall.sh
```

Also remove `/etc/steamos-cec-toolkit.conf`:

```bash
./uninstall.sh --remove-config
```

## SteamOS Updates

The important user files live under the SteamOS desktop user's `$HOME`, and the
helper lives under `/var/lib/steamos-cec-toolkit`. These normally survive
SteamOS updates.

The sudoers file is under `/etc/sudoers.d`, which is an overlay on SteamOS and
usually survives normal updates. A factory reset, reimage, or major platform
change may still remove local modifications.

After an update, run:

```bash
systemctl --user is-active cec-audio-control.service wireplumber.service
wpctl status
varlinkctl call \
  unix:/run/user/1000/cec-audio-control/org.pipewire.ExternalVolume \
  org.pipewire.ExternalVolume.GetCapabilities \
  '{"device":""}'
```

If Game Mode still shows `+` / `-`, the integration is intact.

## Safety Notes

This project grants passwordless sudo only for one fixed root helper:

```text
/var/lib/steamos-cec-toolkit/steamos-cec-volume-raw *
```

The helper accepts only:

```text
up
down
mute
```

Do not broaden the sudoers rule.

## License

MIT. See [LICENSE](LICENSE).
