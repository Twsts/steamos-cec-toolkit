#!/usr/bin/env bash
set -euo pipefail

remove_config=0

if [[ "${1:-}" == "--remove-config" ]]; then
  remove_config=1
elif [[ $# -gt 0 ]]; then
  echo "usage: ./uninstall.sh [--remove-config]" >&2
  exit 2
fi

systemctl --user disable --now steamos-cec-steam-button.service 2>/dev/null || true
systemctl --user disable --now steamos-cec-tv-standby-suspend.service 2>/dev/null || true
systemctl --user disable --now steamos-cec-gamescope-recovery.service 2>/dev/null || true

rm -f "$HOME/.config/systemd/user/steamos-cec-steam-button.service"
rm -f "$HOME/.config/systemd/user/steamos-cec-tv-standby-suspend.service"
rm -f "$HOME/.config/systemd/user/steamos-cec-gamescope-recovery.service"
rm -f "$HOME/.config/systemd/user/cec-audio-control.service.d/override.conf"
rm -f "$HOME/.config/wireplumber/wireplumber.conf.d/99-steamos-cec-external-volume.conf"
rm -f "$HOME/.local/bin/steamos-cec-volume"
rm -f "$HOME/.local/bin/steamos-cec-toolkitctl"
rm -f "$HOME/.local/bin/steamos-cec-external-volume"
rm -f "$HOME/.local/bin/steamos-cec-steam-button"
rm -f "$HOME/.local/bin/steamos-cec-tv-standby-suspend"
rm -f "$HOME/.local/bin/steamos-cec-gamescope-recovery"

systemctl --user daemon-reload
systemctl --user stop cec-audio-control.service 2>/dev/null || true
systemctl --user start cec-audio-control.socket 2>/dev/null || true
systemctl --user restart wireplumber.service 2>/dev/null || true

sudo systemctl disable --now steamos-cec-before-sleep.service 2>/dev/null || true
sudo systemctl disable --now steamos-cec-usb-wake.service 2>/dev/null || true
sudo rm -f /etc/systemd/system/steamos-cec-before-sleep.service
sudo rm -f /etc/systemd/system/steamos-cec-usb-wake.service
sudo rm -f /etc/sudoers.d/zz-steamos-cec-toolkit-volume
sudo rm -rf /var/lib/steamos-cec-toolkit
sudo systemctl daemon-reload

if [[ "$remove_config" -eq 1 ]]; then
  sudo rm -f /etc/steamos-cec-toolkit.conf
fi

echo "Uninstalled SteamOS CEC Toolkit."
