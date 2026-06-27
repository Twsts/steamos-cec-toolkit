# Architecture

## Components

```text
SteamOS Game Mode
  -> PipeWire / WirePlumber HDMI ALSA card
  -> org.pipewire.ExternalVolume Varlink socket
  -> steamos-cec-external-volume
  -> steamos-cec-volume
  -> sudo /var/lib/steamos-cec-toolkit/steamos-cec-volume-raw
  -> cec-ctl --raw-msg -f 0 -t 5
  -> AVR / soundbar
```

## ExternalVolume

WirePlumber attaches an ExternalVolume socket to the HDMI ALSA card when:

```text
monitor.alsa.enable-external-volume-control = true
api.alsa.external-volume-control = "unix:/run/user/1000/cec-audio-control/org.pipewire.ExternalVolume"
steamos.supports-hdmi-cec = true
```

SteamOS Game Mode uses this to decide whether the volume UI should be a slider
or relative `+` / `-` buttons.

The shim returns relative-only capabilities:

```text
readVolume=false
writeVolumeAbsolute=false
writeVolumeRelative=true
writeMuteToggle=true
```

This avoids pretending that the AVR volume can be read or set absolutely.

## CEC Volume Spoofing

HDMI-CEC user control opcodes:

```text
0x44 User Control Pressed
0x45 User Control Released
0x41 Volume Up
0x42 Volume Down
0x43 Mute
```

Some receivers ignore:

```text
Playback Device 1 -> Audio System
```

but accept:

```text
TV -> Audio System
```

The raw helper therefore sends:

```bash
cec-ctl --raw-msg -f "$CEC_VOLUME_INITIATOR" -t "$CEC_AUDIO_LOGICAL_ADDRESS"
```

Defaults:

```text
CEC_VOLUME_INITIATOR=0
CEC_AUDIO_LOGICAL_ADDRESS=5
```

## Steam Button TV Wake and Input Switching

SteamOS `cecd` already knows how to wake the HDMI-CEC display chain and activate
this HDMI source. The toolkit does not reimplement CEC source activation; it
calls:

```text
com.steampowered.CecDaemon1.Daemon1.Wake
```

The Steam-button helper only decides when to call it:

- on controller connect/resume
- after a confirmed short Steam-button press

On typical TV/AVR CEC setups, this wakes or powers on the TV/AVR and switches
the active input to the SteamOS machine.

The confirmation window prevents accidental activation from long presses and
startup noise.

## Standby Loop Prevention

The optional before-sleep service writes:

```text
/run/steamos-cec-local-suspend
```

The optional TV standby monitor ignores TV standby events that occur right after
this marker is written. This avoids treating a locally initiated sleep as a new
external TV standby event.
