import { callable, definePlugin } from "@decky/api";
import { ButtonItem, DropdownItem, PanelSection, PanelSectionRow, ToggleField } from "@decky/ui";
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
  enabled: boolean;
  capabilities_ok: boolean;
  capabilities: string;
  service: ServiceState;
  socket: ServiceState;
};

type Status = {
  ok: boolean;
  error?: string;
  config_exists?: boolean;
  config?: Record<string, string>;
  discovery?: Discovery | null;
  root_helper_exists?: boolean;
  debug_helper_exists?: boolean;
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
  debug?: {
    ok: boolean;
    returncode: number;
    stdout: string;
  };
};

type CecDevice = {
  logical_address: string;
  device_type: string;
  osd_name: string;
  physical_address: string;
  vendor: string;
  power_status: string;
  label: string;
};

type Discovery = {
  ok: boolean;
  error?: string;
  cec_device: string;
  devices: CecDevice[];
  suggested: Record<string, string>;
  raw: string;
};

const getStatus = callable<[], Status>("get_status");
const discoverCec = callable<[], Discovery>("discover_cec");
const setConfig = callable<[Record<string, string>], Status>("set_config");
const setService = callable<[string, boolean], Status>("set_service");
const setExternalVolume = callable<[boolean], Status>("set_external_volume");
const volumeUp = callable<[], Status>("volume_up");
const volumeDown = callable<[], Status>("volume_down");
const mute = callable<[], Status>("mute");
const wakeTv = callable<[], Status>("wake_tv");
const restartExternalVolume = callable<[], Status>("restart_external_volume");
const debugCec = callable<[number], Status>("debug_cec");

function yesNo(value: boolean | undefined): string {
  return value ? "OK" : "Missing";
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
  if (!status.external_volume?.enabled) {
    return "CEC volume buttons are off; SteamOS should use the normal volume bar.";
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
      <div>Root helper: {yesNo(status.root_helper_exists)}</div>
      <div>Debug helper: {yesNo(status.debug_helper_exists)}</div>
      <div>Sudoers: {yesNo(status.sudoers_exists)}</div>
      <div>CEC volume buttons: {status.external_volume?.enabled ? "On" : "Off"}</div>
      <div>Relative volume: {status.external_volume?.capabilities_ok ? "OK" : "Inactive"}</div>
      <div>Custom config: {status.config_exists ? "Present" : "Defaults"}</div>
    </div>
  );
}

function needsInstallHelp(status: Status | null): boolean {
  if (!status?.ok) {
    return false;
  }
  return (
    !status.root_helper_exists ||
    !status.debug_helper_exists ||
    !status.sudoers_exists ||
    !status.volume_script_exists ||
    !status.external_volume_script_exists
  );
}

function missingItems(status: Status | null): string[] {
  if (!status?.ok) {
    return [];
  }
  const items: string[] = [];
  if (!status.root_helper_exists) {
    items.push("root CEC helper");
  }
  if (!status.sudoers_exists) {
    items.push("sudoers rule");
  }
  if (!status.debug_helper_exists) {
    items.push("CEC debug helper");
  }
  if (!status.volume_script_exists) {
    items.push("volume wrapper");
  }
  if (!status.external_volume_script_exists) {
    items.push("ExternalVolume shim");
  }
  return items;
}

function InstallHelp({ status }: { status: Status | null }) {
  const items = missingItems(status);
  const command = "git clone https://github.com/Twsts/steamos-cec-toolkit.git && cd steamos-cec-toolkit && ./install.sh --enable-steam-button";

  return (
    <PanelSection title="Install">
      <PanelSectionRow>
        <div style={{ fontSize: "12px", opacity: 0.8, lineHeight: 1.35 }}>
          <div>Missing: {items.length ? items.join(", ") : "toolkit bootstrap"}</div>
          <div style={{ marginTop: "6px" }}>Run from Desktop/SSH:</div>
          <code style={{ display: "block", whiteSpace: "normal", marginTop: "4px" }}>{command}</code>
          <div style={{ marginTop: "6px" }}>Use README options to enable TV standby or Gamescope recovery.</div>
        </div>
      </PanelSectionRow>
    </PanelSection>
  );
}

function configValue(status: Status | null, key: string, fallback: string): string {
  return status?.config?.[key] || fallback;
}

function ConfigDetails({ status }: { status: Status | null }) {
  if (!status?.ok) {
    return null;
  }

  const cecDevice = configValue(status, "CEC_DEVICE", "/dev/cec0");
  const initiator = configValue(status, "CEC_VOLUME_INITIATOR", "0");
  const audioTarget = configValue(status, "CEC_AUDIO_LOGICAL_ADDRESS", "5");
  const cardName = configValue(status, "HDMI_ALSA_CARD_NAME", "alsa_card.pci-0000_03_00.1");
  const cardNick = configValue(status, "HDMI_ALSA_CARD_NICK", "HDA ATI HDMI");
  const route = configValue(status, "EXTERNAL_VOLUME_ROUTE", "hdmi-output-0");

  return (
    <div style={{ fontSize: "12px", opacity: 0.8, lineHeight: 1.35 }}>
      <div>CEC device: {cecDevice}</div>
      <div>Volume path: logical {initiator} to {audioTarget}</div>
      <div>Route: {route}</div>
      <div>HDMI card: {cardName} / {cardNick}</div>
    </div>
  );
}

function DebugOutput({ output }: { output: string }) {
  if (!output) {
    return null;
  }

  const lines = output.split("\n").slice(-18).join("\n");

  return (
    <PanelSectionRow>
      <pre
        style={{
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontSize: "10px",
          lineHeight: 1.25,
          maxHeight: "180px",
          overflowY: "auto",
          opacity: 0.85,
          margin: 0,
        }}
      >
        {lines}
      </pre>
    </PanelSectionRow>
  );
}

function Content() {
  const [status, setStatus] = useState<Status | null>(null);
  const [discovery, setDiscovery] = useState<Discovery | null>(null);
  const [debugOutput, setDebugOutput] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setStatus(await getStatus());
  };

  const refreshDiscovery = async () => {
    setBusy(true);
    try {
      setDiscovery(await discoverCec());
      setStatus(await getStatus());
    } finally {
      setBusy(false);
    }
  };

  const runAction = async (action: () => Promise<Status>) => {
    setBusy(true);
    try {
      setStatus(await action());
    } finally {
      setBusy(false);
    }
  };

  const captureDebug = async () => {
    setBusy(true);
    try {
      const nextStatus = await debugCec(3);
      setStatus(nextStatus);
      setDebugOutput(nextStatus.debug?.stdout?.trim() || nextStatus.error || "No CEC messages captured.");
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
  const cecVolume = status?.external_volume;
  const installed = !!status?.ok && !!status.root_helper_exists && !!status.volume_script_exists;
  const showInstallHelp = needsInstallHelp(status);
  const discovered = discovery || status?.discovery || null;
  const deviceOptions = (discovered?.devices || []).map((device) => ({
    data: device.logical_address,
    label: device.label,
  }));
  const initiator = configValue(status, "CEC_VOLUME_INITIATOR", discovered?.suggested?.CEC_VOLUME_INITIATOR || "0");
  const audioTarget = configValue(status, "CEC_AUDIO_LOGICAL_ADDRESS", discovered?.suggested?.CEC_AUDIO_LOGICAL_ADDRESS || "5");

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
        <InstallHelp status={status} />
      )}

      <PanelSection title="Features">
        <PanelSectionRow>
          <ToggleField
            label="CEC Volume Buttons"
            description={cecVolume?.enabled ? "SteamOS shows + / - and sends volume over CEC" : "SteamOS uses the normal volume bar"}
            checked={!!cecVolume?.enabled}
            disabled={busy || !installed}
            onChange={(enabled: boolean) => void runAction(() => setExternalVolume(enabled))}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ToggleField
            label="Steam Button Wakes TV"
            description="Wake the TV/AVR and select this HDMI input when the Steam button wakes SteamOS"
            checked={!!steamButton?.is_enabled}
            disabled={busy}
            onChange={(enabled: boolean) => void runAction(() => setService("steam-button", enabled))}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ToggleField
            label="TV Standby Suspends SteamOS"
            description="Suspend SteamOS when the TV sends HDMI-CEC standby"
            checked={!!tvStandby?.is_enabled}
            disabled={busy}
            onChange={(enabled: boolean) => void runAction(() => setService("tv-standby", enabled))}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ToggleField
            label="Gamescope Recovery"
            description="Restart Gamescope after input activation if the display gets stuck"
            checked={!!gamescopeRecovery?.is_enabled}
            disabled={busy}
            onChange={(enabled: boolean) => void runAction(() => setService("gamescope-recovery", enabled))}
          />
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title="Configuration">
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={busy} onClick={() => void refreshDiscovery()}>
            Discover CEC Devices
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <DropdownItem
            label="Volume Initiator"
            description="Usually TV logical address 0 for receivers that reject playback-device volume"
            rgOptions={deviceOptions.length ? deviceOptions : [{ data: initiator, label: `Logical ${initiator}` }]}
            selectedOption={initiator}
            disabled={busy}
            onChange={(option) => void runAction(() => setConfig({ CEC_VOLUME_INITIATOR: String(option.data) }))}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <DropdownItem
            label="Audio Target"
            description="The receiver/audio-system logical address that receives volume commands"
            rgOptions={deviceOptions.length ? deviceOptions : [{ data: audioTarget, label: `Logical ${audioTarget}` }]}
            selectedOption={audioTarget}
            disabled={busy}
            onChange={(option) => void runAction(() => setConfig({ CEC_AUDIO_LOGICAL_ADDRESS: String(option.data) }))}
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

      <PanelSection title="Debug">
        <PanelSectionRow>
          <ConfigDetails status={status} />
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={busy || !status?.debug_helper_exists} onClick={() => void captureDebug()}>
            Capture CEC Messages
          </ButtonItem>
        </PanelSectionRow>
        <DebugOutput output={debugOutput} />
        {debugOutput && (
          <PanelSectionRow>
            <ButtonItem layout="below" disabled={busy} onClick={() => setDebugOutput("")}>
              Clear Capture
            </ButtonItem>
          </PanelSectionRow>
        )}
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
