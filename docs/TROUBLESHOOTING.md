# Troubleshooting

## Game Mode Still Shows a Normal Slider

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

## Steam Button Does Not Switch Input

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

The included parser is known to target the original Steam Controller. Other
controllers may need a small code change.

## `dbus_next` Missing

The Steam-button and ExternalVolume pieces do not need `dbus_next`.

The optional TV standby and Gamescope recovery services use `dbus_next`. If the
module is missing, install it using your preferred SteamOS-safe Python packaging
approach or leave those optional services disabled.

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
