# Troubleshooting

## After a SteamOS Update

SteamOS updates can reset system-level pieces that this toolkit depends on:

- `/etc/sudoers.d/zz-steamos-cec-toolkit-volume`
- `/var/lib/steamos-cec-toolkit/*`
- `/etc/systemd/system/steamos-cec-before-sleep.service`
- `/etc/systemd/system/steamos-cec-permissions.service`
- `/etc/systemd/system/steamos-cec-usb-wake.service`
- `/etc/udev/rules.d/70-steamos-cec-toolkit.rules`
- user service state and WirePlumber behavior
- Decky Loader installation or plugin loading

Version `v0.1.15` and newer install:

```text
/etc/atomic-update.conf.d/steamos-cec-toolkit.conf
```

On SteamOS builds that honor `/etc/atomic-update.conf.d`, this asks the OS to
preserve the toolkit-managed `/etc` files across atomic updates. This reduces
how often a SteamOS update breaks the toolkit, but it cannot protect Decky
Loader, SteamOS internals, WirePlumber behavior changes, or files outside the
configured keep-list.

The Decky plugin should make this visible in `Status`:

- helper or sudoers entries show `Missing`
- `CEC volume buttons` is `Off`
- `Relative volume` is `Inactive`
- an `Install` section appears and lists missing pieces

Repair by rerunning the latest installer:

```bash
bash <(curl -fsSL https://github.com/Twsts/steamos-cec-toolkit/releases/latest/download/steamos-cec-toolkit-installer.sh)
```

To also run SteamOS atomic-update verification when the SteamOS image provides
`holo-sync-var`:

```bash
bash <(curl -fsSL https://github.com/Twsts/steamos-cec-toolkit/releases/latest/download/steamos-cec-toolkit-installer.sh) --verify
```

Then open the plugin, run `Discover CEC Devices`, and re-enable the features
you want. User-level runtime config is stored in
`~/.config/steamos-cec-toolkit/config.conf` and should normally survive OS
updates.

## Game Mode Still Shows a Normal Slider

After first install or after enabling `CEC Volume Buttons`, reboot once before
debugging this. The Decky volume action buttons can work before Steam/Game Mode
has reloaded the PipeWire ExternalVolume route that changes Quick Settings from
a slider to `+` / `-`.

Check that WirePlumber has ExternalVolume enabled:

```bash
pw-dump | grep -E \
  'monitor.alsa.enable-external-volume-control|api.alsa.external-volume-control|steamos.supports-hdmi-cec'
```

Check capabilities:

```bash
varlinkctl call \
  unix:/run/user/1000/cec-audio-control/org.pipewire.ExternalVolume \
  org.pipewire.ExternalVolume.GetCapabilities \
  '{"device":""}'
```

The output must include:

```text
writeVolumeRelative:true
routes:["hdmi-output-0"]
```

If capabilities are correct but Steam still shows a slider, restart Steam/Game
Mode or reboot.

## `+` / `-` Shows but the Receiver Volume Does Not Move

Test the direct wrapper:

```bash
sudo -k
~/.local/bin/steamos-cec-volume up
sleep 1
~/.local/bin/steamos-cec-volume down
```

If this asks for a password, the sudoers rule is missing or wrong.

Check topology:

```bash
cec-ctl -d /dev/cec0 --show-topology
```

If your Audio System logical address is not `5`, update:

```bash
CEC_AUDIO_LOGICAL_ADDRESS=5
```

in `/etc/steamos-cec-toolkit.conf`.

If your receiver accepts normal playback-device volume commands, try:

```bash
CEC_VOLUME_INITIATOR=4
```

If it only accepts TV-originated volume commands, keep:

```bash
CEC_VOLUME_INITIATOR=0
```

## Volume Does Nothing on an LG TV With No Receiver

This is a different failure than the receiver case above, with a different fix.

Check topology:

```bash
cec-ctl -d /dev/cec0 --show-topology
```

If there is no `Audio System` device listed, the TV renders its own audio.
Set:

```bash
CEC_AUDIO_LOGICAL_ADDRESS=0
CEC_VOLUME_INITIATOR=
```

leaving `CEC_VOLUME_INITIATOR` empty so the kernel supplies the adapter's own
logical address and validates the frame. If the TV's `Vendor ID` in the
topology output is `0x00e091` (LG), also set:

```bash
CEC_SIMPLINK_ACK=1
```

LG TVs run a vendor extension called SIMPLINK on top of standard HDMI-CEC and
gate `User Control Pressed` (the opcode volume/mute use) behind a SIMPLINK
vendor-command handshake. Without it, the TV silently drops volume keys while
continuing to answer unrelated CEC queries like power status normally, which
makes it look like nothing is happening at all rather than failing loudly.

Confirm with a bus capture. This needs root:

```bash
sudo cec-ctl -d /dev/cec0 -s --monitor-all --monitor-time 20 --show-raw --wall-clock
```

A `FEATURE_ABORT` reply to `VENDOR_COMMAND (0x89)` with payload `0x01` is the
signature of a refused SIMPLINK handshake — the TV is trying to establish a
SIMPLINK session and the connected device (previously this toolkit) is
rejecting it.

**Do not diagnose this by manually running `cec-ctl --playback`,
`--vendor-id`, or anything else that reclaims the adapter's logical
address**, even to inspect state (`--show-topology` alone is read-only and
safe). SteamOS's own `cecd.service` owns the adapter continuously in the
background and already sets the correct vendor ID to match the connected TV.
Manually reclaiming the adapter races with `cecd`, which reacts by
briefly resetting its own logical address and vendor ID before reasserting
them — and while that race is in progress, volume commands from *either*
side can silently fail. If you're mid-troubleshooting and volume stops
responding for no clear reason, wait several seconds without touching the
adapter and retest before concluding the fix doesn't work.

If a transmit reports success but nothing happens and none of the above
explains it, remember that `--raw-msg` (used only when `CEC_VOLUME_INITIATOR`
is explicitly set to something other than `CEC_AUDIO_LOGICAL_ADDRESS`)
suppresses all kernel-side validation of the frame. A transmit can exit 0
while having sent a malformed or nonsensically-addressed message. Prefer
leaving `CEC_VOLUME_INITIATOR` empty so the kernel validates every frame
before it goes out.

## Audio Device Disappears

Rollback the ExternalVolume integration:

```bash
rm -f ~/.config/wireplumber/wireplumber.conf.d/99-steamos-cec-external-volume.conf
rm -f ~/.config/systemd/user/cec-audio-control.service.d/override.conf
systemctl --user daemon-reload
systemctl --user restart wireplumber.service
systemctl --user stop cec-audio-control.service
systemctl --user start cec-audio-control.socket
wpctl status
```

Then inspect:

```bash
journalctl --user -b -u wireplumber.service --no-pager
journalctl --user -b -u cec-audio-control.service --no-pager
```

## Controller Button Does Not Switch Input

Check the service:

```bash
systemctl --user status steamos-cec-steam-button.service --no-pager
journalctl --user -b -u steamos-cec-steam-button.service --no-pager
```

Check whether the controller HID ID matches:

```bash
for d in /sys/class/hidraw/hidraw*/device/uevent; do
  echo "$d"
  grep -E 'HID_ID|HID_PHYS|HID_NAME' "$d"
done
```

Update these values if needed:

```bash
STEAM_BUTTON_HID_ID=
STEAM_BUTTON_EXCLUDED_PHYS=
STEAM_BUTTON_REPORT_ID=
STEAM_BUTTON_BYTE=
STEAM_BUTTON_MASK=
```

For non-Steam-Controller gamepads, use the Decky plugin's `Discover Controllers`
action first. Generic controller wake listens for gamepad-like Linux input
devices and supported Home/Guide button events.

The included parser is known to target the original Steam Controller. Other
controllers may need a small code change.

## Bluetooth Wake Resumes to No Display or No SSH

If Bluetooth/controller wake powers the PC but SteamOS does not fully resume,
this is usually below the CEC layer. A common symptom is that the machine still
responds to ping, but Game Mode never appears and SSH does not answer.

Check BIOS/firmware power-management settings. On one AMD desktop reference
build with an internal Intel Bluetooth adapter, setting `Power Supply Idle
Control` to `Typical Current Idle` and disabling `Global C-state Control`
stabilized Bluetooth controller wake from suspend.

Keep `Bluetooth/Controller Wake` disabled while testing BIOS changes. Once
manual sleep/resume is stable, enable only that feature and test controller wake
before enabling CEC input switching or TV standby features.

## `dbus_next` Missing

The Steam-button and ExternalVolume pieces do not need `dbus_next`.

The optional TV standby, input inactive suspend, and Gamescope recovery services use
`dbus_next`. If the module is missing, install it using your preferred
SteamOS-safe Python packaging approach or leave those optional services disabled.

## Inspect the Official SteamOS CEC Service

```bash
systemctl --user cat cec-audio-control.socket cec-audio-control.service
varlinkctl introspect \
  unix:/run/user/1000/cec-audio-control/org.pipewire.ExternalVolume \
  org.pipewire.ExternalVolume
```

Note: on current SteamOS builds, introspection says `GetCapabilities -> ()`,
but the real service returns a capabilities object. The shim intentionally
matches the real behavior.
