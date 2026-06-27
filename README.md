# SteamOS CEC Toolkit

SteamOS CEC Toolkit is an installable set of scripts and systemd/WirePlumber
overrides for DIY Steam Machine / HTPC builds that use HDMI-CEC through an
adapter such as the UGREEN DisplayPort-to-HDMI CEC adapter.

It was built for a living-room SteamOS box where:

- SteamOS Game Mode should show relative volume controls (`+` / `-`) instead of
  a normal software volume slider.
- The `+` / `-` buttons should control the real receiver / soundbar volume over
  HDMI-CEC.
- A Steam Controller Steam-button press should switch the TV/AVR input back to
  the SteamOS box.
- Waking or reconnecting the controller should also activate the SteamOS HDMI
  source.
- Optional helpers can suspend SteamOS when the TV sends standby and recover
  Gamescope after input switching.

The project uses Valve's existing SteamOS CEC daemon (`cecd`) and PipeWire
ExternalVolume plumbing. It does not patch Steam.

## Hardware This Targets

Known-good reference setup:

- SteamOS / Steam Deck-style Game Mode on a DIY HTPC.
- UGREEN DisplayPort-to-HDMI adapter with HDMI-CEC support.
- TV + AVR/soundbar HDMI-CEC chain.
- Steam Controller for the Steam-button input-switch helper.

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

Clone the repo on the SteamOS machine as the `deck` user:

```bash
git clone https://github.com/YOURNAME/steamos-cec-toolkit.git
cd steamos-cec-toolkit
```

Install the ExternalVolume integration and the Steam-button input-switch helper:

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

## Configure Your Machine

The installer creates:

```text
/etc/steamos-cec-toolkit.conf
```

Edit it if your CEC or HDMI card IDs differ:

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

## Steam Button Input Switching

The `steamos-cec-steam-button` service watches the Steam Controller HID reports.
It activates the SteamOS HDMI source by calling SteamOS `cecd`:

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

## Optional Before-Sleep CEC Standby

Enable with:

```bash
./install.sh --enable-before-sleep
```

This installs a system service that asks `cecd` to send TV standby before
SteamOS sleeps.

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

The important user files live under `/home/deck`, and the helper lives under
`/var/lib/steamos-cec-toolkit`. These normally survive SteamOS updates.

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
