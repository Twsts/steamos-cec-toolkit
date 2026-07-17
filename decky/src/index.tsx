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
  version?: string;
  error?: string;
  config_exists?: boolean;
  config?: Record<string, string>;
  discovery?: Discovery | null;
  root_helper_exists?: boolean;
  debug_helper_exists?: boolean;
  power_standby_helper_exists?: boolean;
  usb_wake_helper_exists?: boolean;
  cec_permissions_helper_exists?: boolean;
  sudoers_exists?: boolean;
  boot_wake_script_exists?: boolean;
  cec_device?: {
    device: string;
    exists: boolean;
    readable: boolean;
    writable: boolean;
    permissions_helper_exists: boolean;
  };
  external_volume_script_exists?: boolean;
  volume_script_exists?: boolean;
  external_volume?: ExternalVolumeState;
  steam_button_script_exists?: boolean;
  tv_standby_script_exists?: boolean;
  input_away_suspend_script_exists?: boolean;
  gamescope_recovery_script_exists?: boolean;
  controller_wake?: ControllerWakeState;
  services?: Record<string, ServiceState>;
  system_services?: Record<string, ServiceState>;
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

type InputDevice = {
  path: string;
  name: string;
  display_name?: string;
  phys: string;
  sysfs?: string;
  bus?: string;
  vendor?: string;
  product?: string;
  handlers: string[];
  readable: boolean;
  gamepad: boolean;
};

type HidFallbackDevice = {
  path: string;
  name: string;
  display_name: string;
  method: string;
};

type InputDiscovery = {
  ok: boolean;
  supported_codes: string[];
  devices: InputDevice[];
  hid_fallback_devices?: HidFallbackDevice[];
  all_input_devices: number;
};

type AudioCard = {
  name: string;
  nick: string;
  description: string;
  label: string;
};

type AudioDiscovery = {
  ok: boolean;
  error?: string;
  note?: string;
  cards: AudioCard[];
  routes: string[];
  suggested: Record<string, string>;
};

type ControllerWakeState = {
  script_exists: boolean;
  generic_input_enabled: boolean;
  steam_hid_enabled: boolean;
  gamepad_devices: InputDevice[];
  hid_fallback_devices?: HidFallbackDevice[];
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
  note?: string;
  cec_device: string;
  available_cec_devices?: string[];
  devices: CecDevice[];
  suggested: Record<string, string>;
  raw: string;
};

const getStatus = callable<[], Status>("get_status");
const discoverCec = callable<[], Discovery>("discover_cec");
const discoverAudio = callable<[], AudioDiscovery>("discover_audio");
const discoverInput = callable<[], InputDiscovery>("discover_input");
const setConfig = callable<[Record<string, string>], Status>("set_config");
const setService = callable<[string, boolean], Status>("set_service");
const setSystemService = callable<[string, boolean], Status>("set_system_service");
const setExternalVolume = callable<[boolean], Status>("set_external_volume");
const volumeUp = callable<[], Status>("volume_up");
const volumeDown = callable<[], Status>("volume_down");
const mute = callable<[], Status>("mute");
const wakeTv = callable<[], Status>("wake_tv");
const standbyTv = callable<[], Status>("standby_tv");
const restartExternalVolume = callable<[], Status>("restart_external_volume");
const repairCecPermissions = callable<[], Status>("repair_cec_permissions");
const debugCec = callable<[number], Status>("debug_cec");

function yesNo(value: boolean | undefined): string {
  return value ? "OK" : "Missing";
}

type StatusLevel = "ok" | "warn" | "error" | "checking";

type StatusSummary = {
  level: StatusLevel;
  title: string;
  detail: string;
};

function statusSummary(status: Status | null): StatusSummary {
  if (!status) {
    return {
      level: "checking",
      title: "Checking",
      detail: "Reading toolkit status...",
    };
  }
  if (!status.ok) {
    return {
      level: "error",
      title: "Error",
      detail: status.error ?? "Toolkit status failed",
    };
  }
  if (!status.root_helper_exists || !status.sudoers_exists) {
    return {
      level: "error",
      title: "Needs reinstall",
      detail: "Root helper or sudoers rule is missing.",
    };
  }
  if (!status.cec_device?.exists) {
    return {
      level: "error",
      title: "CEC adapter missing",
      detail: `${status.cec_device?.device || "/dev/cec0"} was not found. Check the adapter or run discovery.`,
    };
  }
  if (!status.cec_device?.readable || !status.cec_device?.writable) {
    return {
      level: "error",
      title: "CEC permissions",
      detail: `${status.cec_device.device} needs permission repair.`,
    };
  }
  if (status.external_volume?.enabled && !status.external_volume?.capabilities_ok) {
    return {
      level: "warn",
      title: "Volume needs restart",
      detail: "CEC volume is enabled. Restart Steam/Game Mode or reboot if Quick Settings still shows a slider.",
    };
  }
  if (!status.external_volume?.enabled) {
    return {
      level: "ok",
      title: "Ready",
      detail: "CEC control is available. SteamOS volume buttons are off.",
    };
  }
  return {
    level: "ok",
    title: "Ready",
    detail: "CEC control and relative volume are available.",
  };
}

function statusColor(level: StatusLevel): string {
  if (level === "ok") {
    return "#59bf6b";
  }
  if (level === "warn") {
    return "#d9a441";
  }
  if (level === "error") {
    return "#d85c5c";
  }
  return "#8a98a8";
}

function StatusCard({ status }: { status: Status | null }) {
  const summary = statusSummary(status);
  const color = statusColor(summary.level);

  return (
    <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
      <div
        style={{
          width: "10px",
          height: "10px",
          borderRadius: "50%",
          background: color,
          marginTop: "5px",
          flex: "0 0 auto",
        }}
      />
      <div>
        <div style={{ color, fontWeight: 600 }}>{summary.title}</div>
        <div style={{ fontSize: "12px", opacity: 0.78, lineHeight: 1.35 }}>{summary.detail}</div>
      </div>
    </div>
  );
}

function DiagnosticsDetails({ status }: { status: Status | null }) {
  if (!status?.ok) {
    return null;
  }

  return (
    <div style={{ fontSize: "12px", opacity: 0.8, lineHeight: 1.35 }}>
      <div>Toolkit version: {status.version || "Unknown"}</div>
      <div>Root helper: {yesNo(status.root_helper_exists)}</div>
      <div>Debug helper: {yesNo(status.debug_helper_exists)}</div>
      <div>Power standby helper: {yesNo(status.power_standby_helper_exists)}</div>
      <div>USB wake helper: {yesNo(status.usb_wake_helper_exists)}</div>
      <div>Boot wake helper: {yesNo(status.boot_wake_script_exists)}</div>
      <div>CEC permissions: {status.cec_device?.readable && status.cec_device?.writable ? "OK" : "Needs repair"}</div>
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
    !status.power_standby_helper_exists ||
    !status.usb_wake_helper_exists ||
    !status.cec_permissions_helper_exists ||
    !status.boot_wake_script_exists ||
    !status.cec_device?.readable ||
    !status.cec_device?.writable ||
    !status.sudoers_exists ||
    !status.volume_script_exists ||
    !status.external_volume_script_exists ||
    !status.steam_button_script_exists ||
    !status.tv_standby_script_exists ||
    !status.input_away_suspend_script_exists ||
    !status.gamescope_recovery_script_exists
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
  if (!status.power_standby_helper_exists) {
    items.push("power standby helper");
  }
  if (!status.usb_wake_helper_exists) {
    items.push("USB wake helper");
  }
  if (!status.cec_permissions_helper_exists) {
    items.push("CEC permissions helper");
  }
  if (!status.cec_device?.readable || !status.cec_device?.writable) {
    items.push("CEC device permissions");
  }
  if (!status.volume_script_exists) {
    items.push("volume wrapper");
  }
  if (!status.boot_wake_script_exists) {
    items.push("boot wake helper");
  }
  if (!status.steam_button_script_exists) {
    items.push("controller wake helper");
  }
  if (!status.tv_standby_script_exists) {
    items.push("TV standby suspend helper");
  }
  if (!status.input_away_suspend_script_exists) {
    items.push("input-away suspend helper");
  }
  if (!status.gamescope_recovery_script_exists) {
    items.push("Gamescope recovery helper");
  }
  if (!status.external_volume_script_exists) {
    items.push("ExternalVolume shim");
  }
  return items;
}

function InstallHelp({ status, busy, onRepairPermissions }: {
  status: Status | null;
  busy: boolean;
  onRepairPermissions: () => void;
}) {
  const items = missingItems(status);
  const command = "bash <(curl -fsSL https://github.com/Twsts/steamos-cec-toolkit/releases/latest/download/steamos-cec-toolkit-installer.sh)";
  const canRepairPermissions = !!status?.cec_permissions_helper_exists && !!status.cec_device?.exists;
  const permissionProblem = !!status?.cec_device?.exists && (!status.cec_device?.readable || !status.cec_device?.writable);

  return (
    <PanelSection title="Install / Repair">
      <PanelSectionRow>
        <div style={{ fontSize: "12px", opacity: 0.8, lineHeight: 1.35 }}>
          <div>Missing: {items.length ? items.join(", ") : "toolkit bootstrap"}</div>
          {permissionProblem && (
            <div style={{ marginTop: "6px" }}>
              CEC actions need read/write access to {status?.cec_device?.device}. Try repair here first.
            </div>
          )}
          <div style={{ marginTop: "6px" }}>If repair is unavailable or does not fix it, run from Desktop/SSH:</div>
          <code style={{ display: "block", whiteSpace: "normal", marginTop: "4px" }}>{command}</code>
          <div style={{ marginTop: "6px" }}>The installer keeps your Decky configuration and refreshes root helpers.</div>
        </div>
      </PanelSectionRow>
      {permissionProblem && canRepairPermissions && (
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={busy} onClick={onRepairPermissions}>
            Repair CEC Permissions
          </ButtonItem>
        </PanelSectionRow>
      )}
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
  const physicalAddress = configValue(status, "CEC_PHYSICAL_ADDRESS", "Not discovered");
  const initiator = configValue(status, "CEC_VOLUME_INITIATOR", "0");
  const audioTarget = configValue(status, "CEC_AUDIO_LOGICAL_ADDRESS", "5");
  const cardName = configValue(status, "HDMI_ALSA_CARD_NAME", "alsa_card.pci-0000_03_00.1");
  const cardNick = configValue(status, "HDMI_ALSA_CARD_NICK", "HDA ATI HDMI");
  const route = configValue(status, "EXTERNAL_VOLUME_ROUTE", "hdmi-output-0");

  return (
    <div style={{ fontSize: "12px", opacity: 0.8, lineHeight: 1.35 }}>
      <div>CEC device: {cecDevice}</div>
      <div>Physical address: {physicalAddress}</div>
      <div>Volume path: logical {initiator} to {audioTarget}</div>
      <div>Route: {route}</div>
      <div>HDMI card: {cardName} / {cardNick}</div>
    </div>
  );
}

function ControllerWakeDetails({ discovery, status }: { discovery: InputDiscovery | null; status: Status | null }) {
  const devices = discovery?.devices || status?.controller_wake?.gamepad_devices || [];
  const hidDevices = discovery?.hid_fallback_devices || status?.controller_wake?.hid_fallback_devices || [];
  const readable = devices.filter((device) => device.readable).length;
  const supportedButtons = "Home / Guide / PS / Xbox";
  const total = devices.length + hidDevices.length;
  const needsPermission = devices.some((device) => !device.readable);

  return (
    <div style={{ fontSize: "12px", opacity: 0.8, lineHeight: 1.35 }}>
      <div>Uses controller system buttons: {supportedButtons}</div>
      <div>{total ? `Found controllers: ${total}` : "No controllers detected"}</div>
      {(devices.length > 0 || hidDevices.length > 0) && (
        <div style={{ marginTop: "6px" }}>
          {devices.slice(0, 4).map((device) => (
            <div key={device.path}>
              {device.display_name || device.name || "Unknown controller"}{device.readable ? "" : " - permission needed"}
            </div>
          ))}
          {hidDevices.slice(0, 2).map((device) => (
            <div key={device.path}>
              {device.display_name || device.name}
            </div>
          ))}
        </div>
      )}
      {needsPermission && (
        <div style={{ marginTop: "6px" }}>Some controllers need input permissions.</div>
      )}
    </div>
  );
}

function AudioDiscoveryDetails({ discovery }: { discovery: AudioDiscovery | null }) {
  if (!discovery) {
    return null;
  }

  const count = discovery.cards?.length || 0;
  const message = discovery.ok
    ? `Found HDMI/DP audio outputs: ${count}`
    : discovery.error || discovery.note || "No HDMI/DP audio output detected";

  return (
    <div style={{ fontSize: "12px", opacity: 0.78, lineHeight: 1.35 }}>
      <div>{message}</div>
      {discovery.note && discovery.ok && <div>{discovery.note}</div>}
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
  const [audioDiscovery, setAudioDiscovery] = useState<AudioDiscovery | null>(null);
  const [inputDiscovery, setInputDiscovery] = useState<InputDiscovery | null>(null);
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

  const refreshInputDiscovery = async () => {
    setBusy(true);
    try {
      setInputDiscovery(await discoverInput());
      setStatus(await getStatus());
    } finally {
      setBusy(false);
    }
  };

  const refreshAudioDiscovery = async () => {
    setBusy(true);
    try {
      setAudioDiscovery(await discoverAudio());
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
  }, []);

  const steamButton = status?.services?.["steam-button"];
  const bootWake = status?.services?.["boot-wake"];
  const tvStandby = status?.services?.["tv-standby"];
  const inputAwaySuspend = status?.services?.["input-away-suspend"];
  const gamescopeRecovery = status?.services?.["gamescope-recovery"];
  const powerStandby = status?.system_services?.["power-standby"];
  const usbWake = status?.system_services?.["usb-wake"];
  const cecVolume = status?.external_volume;
  const installed = !!status?.ok && !!status.root_helper_exists && !!status.volume_script_exists;
  const showInstallHelp = needsInstallHelp(status);
  const discovered = discovery || status?.discovery || null;
  const deviceOptions = (discovered?.devices || []).map((device) => ({
    data: device.logical_address,
    label: device.label,
  }));
  const cecDevice = configValue(status, "CEC_DEVICE", discovered?.suggested?.CEC_DEVICE || discovered?.cec_device || "/dev/cec0");
  const cecDeviceOptions = (discovered?.available_cec_devices || []).map((device) => ({
    data: device,
    label: device,
  }));
  const initiator = configValue(status, "CEC_VOLUME_INITIATOR", discovered?.suggested?.CEC_VOLUME_INITIATOR || "0");
  const audioTarget = configValue(status, "CEC_AUDIO_LOGICAL_ADDRESS", discovered?.suggested?.CEC_AUDIO_LOGICAL_ADDRESS || "5");
  const audioCardName = configValue(status, "HDMI_ALSA_CARD_NAME", audioDiscovery?.suggested?.HDMI_ALSA_CARD_NAME || "alsa_card.pci-0000_03_00.1");
  const audioRoute = configValue(status, "EXTERNAL_VOLUME_ROUTE", audioDiscovery?.suggested?.EXTERNAL_VOLUME_ROUTE || "hdmi-output-0");
  const inputAwayDelay = configValue(status, "INPUT_AWAY_SUSPEND_DELAY_SECONDS", "60");
  const audioCardOptions = (audioDiscovery?.cards || []).map((card) => ({
    data: card.name,
    label: card.label,
  }));
  const audioRouteOptions = (audioDiscovery?.routes || []).map((route) => ({
    data: route,
    label: route,
  }));
  const inputAwayDelayOptions = [
    { data: "30", label: "30 seconds" },
    { data: "60", label: "1 minute" },
    { data: "120", label: "2 minutes" },
    { data: "300", label: "5 minutes" },
  ];

  return (
    <>
      <PanelSection title="Status">
        <PanelSectionRow>
          <StatusCard status={status} />
        </PanelSectionRow>
      </PanelSection>

      {showInstallHelp && (
        <InstallHelp
          status={status}
          busy={busy}
          onRepairPermissions={() => void runAction(repairCecPermissions)}
        />
      )}

      <PanelSection title="Features">
        <PanelSectionRow>
          <ToggleField
            label="CEC Volume Buttons"
            description="Show SteamOS + / - controls and send volume commands over HDMI-CEC"
            checked={!!cecVolume?.enabled}
            disabled={busy || !installed}
            onChange={(enabled: boolean) => void runAction(() => setExternalVolume(enabled))}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ToggleField
            label="Controller Button Wakes TV"
            description="Use controller Home/Guide buttons to wake the TV/AVR and select this input"
            checked={!!steamButton?.is_enabled}
            disabled={busy || !status?.steam_button_script_exists}
            onChange={(enabled: boolean) => void runAction(() => setService("steam-button", enabled))}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ToggleField
            label="SteamOS Start Wakes TV"
            description="Wake the TV/AVR and select this input when SteamOS starts"
            checked={!!bootWake?.is_enabled}
            disabled={busy || !status?.boot_wake_script_exists}
            onChange={(enabled: boolean) => void runAction(() => setService("boot-wake", enabled))}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ToggleField
            label="TV Standby Suspends SteamOS"
            description="Suspend SteamOS when the TV broadcasts HDMI-CEC standby"
            checked={!!tvStandby?.is_enabled}
            disabled={busy || !status?.tv_standby_script_exists}
            onChange={(enabled: boolean) => void runAction(() => setService("tv-standby", enabled))}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ToggleField
            label="Input Away Suspends SteamOS"
            description="Suspend SteamOS after this HDMI input is no longer active"
            checked={!!inputAwaySuspend?.is_enabled}
            disabled={busy || !status?.input_away_suspend_script_exists}
            onChange={(enabled: boolean) => void runAction(() => setService("input-away-suspend", enabled))}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ToggleField
            label="SteamOS Sleep Turns Off TV"
            description="Send TV standby before SteamOS sleeps or shuts down"
            checked={!!powerStandby?.is_enabled}
            disabled={busy || !status?.power_standby_helper_exists}
            onChange={(enabled: boolean) => void runAction(() => setSystemService("power-standby", enabled))}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ToggleField
            label="Bluetooth/Controller Wake"
            description="Allow supported Bluetooth and controller receivers to wake SteamOS from suspend"
            checked={!!usbWake?.is_enabled}
            disabled={busy || !status?.usb_wake_helper_exists}
            onChange={(enabled: boolean) => void runAction(() => setSystemService("usb-wake", enabled))}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ToggleField
            label="Gamescope Recovery"
            description="Restart Gamescope after CEC input activation if the display gets stuck"
            checked={!!gamescopeRecovery?.is_enabled}
            disabled={busy || !status?.gamescope_recovery_script_exists}
            onChange={(enabled: boolean) => void runAction(() => setService("gamescope-recovery", enabled))}
          />
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title="Actions">
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={busy || !installed} onClick={() => void runAction(wakeTv)}>
            Wake TV / Select Input
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={busy || !installed} onClick={() => void runAction(standbyTv)}>
            TV Standby
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

      <PanelSection title="Configuration">
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={busy} onClick={() => void refreshInputDiscovery()}>
            Discover Controllers
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <ControllerWakeDetails discovery={inputDiscovery} status={status} />
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={busy} onClick={() => void refreshDiscovery()}>
            Discover CEC Devices
          </ButtonItem>
        </PanelSectionRow>
        {cecDeviceOptions.length > 1 && (
          <PanelSectionRow>
            <DropdownItem
              label="CEC Device"
              description="Use the adapter connected to the TV/AVR HDMI chain"
              rgOptions={cecDeviceOptions}
              selectedOption={cecDevice}
              disabled={busy}
              onChange={(option) => void runAction(() => setConfig({ CEC_DEVICE: String(option.data) }))}
            />
          </PanelSectionRow>
        )}
        {inputAwaySuspend?.is_enabled && (
          <PanelSectionRow>
            <DropdownItem
              label="Input Away Delay"
              description="How long to wait before suspending after this CEC source becomes inactive"
              rgOptions={inputAwayDelayOptions}
              selectedOption={inputAwayDelay}
              disabled={busy}
              onChange={(option) => void runAction(() => setConfig({ INPUT_AWAY_SUSPEND_DELAY_SECONDS: String(option.data) }))}
            />
          </PanelSectionRow>
        )}
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
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={busy} onClick={() => void refreshAudioDiscovery()}>
            Discover Audio Output
          </ButtonItem>
        </PanelSectionRow>
        {audioDiscovery && (
          <PanelSectionRow>
            <AudioDiscoveryDetails discovery={audioDiscovery} />
          </PanelSectionRow>
        )}
        {audioCardOptions.length > 0 && (
          <PanelSectionRow>
            <DropdownItem
              label="HDMI Audio Card"
              description="Use the PipeWire/ALSA HDMI output connected to the TV/AVR chain"
              rgOptions={audioCardOptions}
              selectedOption={audioCardName}
              disabled={busy}
              onChange={(option) => {
                const selected = (audioDiscovery?.cards || []).find((card) => card.name === String(option.data));
                void runAction(() => setConfig({
                  HDMI_ALSA_CARD_NAME: String(option.data),
                  HDMI_ALSA_CARD_NICK: selected?.nick || selected?.description || String(option.data),
                }));
              }}
            />
          </PanelSectionRow>
        )}
        {audioRouteOptions.length > 1 && (
          <PanelSectionRow>
            <DropdownItem
              label="ExternalVolume Route"
              description="Usually hdmi-output-0; change only if relative volume does not attach"
              rgOptions={audioRouteOptions}
              selectedOption={audioRoute}
              disabled={busy}
              onChange={(option) => void runAction(() => setConfig({ EXTERNAL_VOLUME_ROUTE: String(option.data) }))}
            />
          </PanelSectionRow>
        )}
      </PanelSection>

      <PanelSection title="Debug">
        <PanelSectionRow>
          <DiagnosticsDetails status={status} />
        </PanelSectionRow>
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
