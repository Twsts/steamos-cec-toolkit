import { callable, definePlugin } from "@decky/api";
import { ButtonItem, PanelSection, PanelSectionRow, ToggleField } from "@decky/ui";
import { useEffect, useState } from "react";
import { FaTv } from "react-icons/fa";

type ServiceState = {
  unit: string;
  active: string;
  enabled: string;
  is_active: boolean;
  is_enabled: boolean;
};

type ExternalVolumeState = {
  config_exists: boolean;
  override_exists: boolean;
  capabilities_ok: boolean;
  capabilities: string;
  service: ServiceState;
  socket: ServiceState;
};

type Status = {
  ok: boolean;
  error?: string;
  config_exists?: boolean;
  root_helper_exists?: boolean;
  sudoers_exists?: boolean;
  external_volume_script_exists?: boolean;
  volume_script_exists?: boolean;
  external_volume?: ExternalVolumeState;
  services?: Record<string, ServiceState>;
  action?: {
    ok: boolean;
    returncode: number;
    stdout: string;
  };
};

const getStatus = callable<[], Status>("get_status");
const setService = callable<[string, boolean], Status>("set_service");
const volumeUp = callable<[], Status>("volume_up");
const volumeDown = callable<[], Status>("volume_down");
const mute = callable<[], Status>("mute");
const wakeTv = callable<[], Status>("wake_tv");
const restartExternalVolume = callable<[], Status>("restart_external_volume");

function yesNo(value: boolean | undefined): string {
  return value ? "OK" : "Missing";
}

function serviceLine(service?: ServiceState): string {
  if (!service) {
    return "Unknown";
  }
  return `${service.enabled || "unknown"}, ${service.active || "unknown"}`;
}

function overallLine(status: Status | null): string {
  if (!status) {
    return "Checking toolkit status...";
  }
  if (!status.ok) {
    return status.error ?? "Toolkit status failed";
  }
  if (!status.root_helper_exists || !status.sudoers_exists) {
    return "Bootstrap incomplete: root helper or sudoers rule is missing.";
  }
  if (!status.external_volume?.capabilities_ok) {
    return "ExternalVolume is installed but relative volume capabilities are not active.";
  }
  return "Ready: ExternalVolume and CEC helper are available.";
}

function CapabilityDetails({ status }: { status: Status | null }) {
  if (!status?.ok) {
    return null;
  }

  return (
    <div style={{ fontSize: "12px", opacity: 0.8, lineHeight: 1.35 }}>
      <div>Config: {yesNo(status.config_exists)}</div>
      <div>Root helper: {yesNo(status.root_helper_exists)}</div>
      <div>Sudoers: {yesNo(status.sudoers_exists)}</div>
      <div>ExternalVolume config: {yesNo(status.external_volume?.config_exists)}</div>
      <div>ExternalVolume override: {yesNo(status.external_volume?.override_exists)}</div>
      <div>Relative volume: {yesNo(status.external_volume?.capabilities_ok)}</div>
    </div>
  );
}

function needsInstallHelp(status: Status | null): boolean {
  if (!status?.ok) {
    return false;
  }
  return (
    !status.config_exists ||
    !status.root_helper_exists ||
    !status.sudoers_exists ||
    !status.volume_script_exists ||
    !status.external_volume?.config_exists ||
    !status.external_volume?.override_exists ||
    !status.external_volume?.capabilities_ok
  );
}

function Content() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setStatus(await getStatus());
  };

  const runAction = async (action: () => Promise<Status>) => {
    setBusy(true);
    try {
      setStatus(await action());
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const steamButton = status?.services?.["steam-button"];
  const tvStandby = status?.services?.["tv-standby"];
  const gamescopeRecovery = status?.services?.["gamescope-recovery"];
  const installed = !!status?.ok && !!status.root_helper_exists && !!status.volume_script_exists;
  const showInstallHelp = needsInstallHelp(status);

  return (
    <>
      <PanelSection title="Status">
        <PanelSectionRow>
          <div>
            <div>{overallLine(status)}</div>
            <CapabilityDetails status={status} />
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={busy} onClick={() => void refresh()}>
            Refresh
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>

      {showInstallHelp && (
        <PanelSection title="Install">
          <PanelSectionRow>
            <div style={{ fontSize: "12px", opacity: 0.8, lineHeight: 1.35 }}>
              Install or update the toolkit from Desktop/SSH first. This plugin intentionally does not write sudoers or
              root-owned system files.
            </div>
          </PanelSectionRow>
        </PanelSection>
      )}

      <PanelSection title="Features">
        <PanelSectionRow>
          <ToggleField
            label="Steam Button Wakes TV"
            description={serviceLine(steamButton)}
            checked={!!steamButton?.is_enabled}
            disabled={busy}
            onChange={(enabled: boolean) => void runAction(() => setService("steam-button", enabled))}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ToggleField
            label="TV Standby Suspends SteamOS"
            description={serviceLine(tvStandby)}
            checked={!!tvStandby?.is_enabled}
            disabled={busy}
            onChange={(enabled: boolean) => void runAction(() => setService("tv-standby", enabled))}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ToggleField
            label="Gamescope Recovery"
            description={serviceLine(gamescopeRecovery)}
            checked={!!gamescopeRecovery?.is_enabled}
            disabled={busy}
            onChange={(enabled: boolean) => void runAction(() => setService("gamescope-recovery", enabled))}
          />
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title="Test">
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={busy || !installed} onClick={() => void runAction(wakeTv)}>
            Wake TV / Select Input
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={busy || !installed} onClick={() => void runAction(volumeUp)}>
            Volume Up
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={busy || !installed} onClick={() => void runAction(volumeDown)}>
            Volume Down
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={busy || !installed} onClick={() => void runAction(mute)}>
            Mute
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={busy} onClick={() => void runAction(restartExternalVolume)}>
            Restart CEC Audio
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>
    </>
  );
}

export default definePlugin(() => {
  return {
    name: "SteamOS CEC",
    titleView: <div>SteamOS CEC</div>,
    content: <Content />,
    icon: <FaTv />,
  };
});
