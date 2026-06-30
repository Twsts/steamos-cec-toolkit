const manifest = {"name":"SteamOS CEC Toolkit"};
const API_VERSION = 2;
const internalAPIConnection = window.__DECKY_SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_deckyLoaderAPIInit;
if (!internalAPIConnection) {
    throw new Error('[@decky/api]: Failed to connect to the loader as as the loader API was not initialized. This is likely a bug in Decky Loader.');
}
let api;
try {
    api = internalAPIConnection.connect(API_VERSION, manifest.name);
}
catch {
    api = internalAPIConnection.connect(1, manifest.name);
    console.warn(`[@decky/api] Requested API version ${API_VERSION} but the running loader only supports version 1. Some features may not work.`);
}
if (api._version != API_VERSION) {
    console.warn(`[@decky/api] Requested API version ${API_VERSION} but the running loader only supports version ${api._version}. Some features may not work.`);
}
const callable = api.callable;
const definePlugin = (fn) => {
    return (...args) => {
        return fn(...args);
    };
};

var DefaultContext = {
  color: undefined,
  size: undefined,
  className: undefined,
  style: undefined,
  attr: undefined
};
var IconContext = SP_REACT.createContext && /*#__PURE__*/SP_REACT.createContext(DefaultContext);

var _excluded = ["attr", "size", "title"];
function _objectWithoutProperties(e, t) { if (null == e) return {}; var o, r, i = _objectWithoutPropertiesLoose(e, t); if (Object.getOwnPropertySymbols) { var n = Object.getOwnPropertySymbols(e); for (r = 0; r < n.length; r++) o = n[r], -1 === t.indexOf(o) && {}.propertyIsEnumerable.call(e, o) && (i[o] = e[o]); } return i; }
function _objectWithoutPropertiesLoose(r, e) { if (null == r) return {}; var t = {}; for (var n in r) if ({}.hasOwnProperty.call(r, n)) { if (-1 !== e.indexOf(n)) continue; t[n] = r[n]; } return t; }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), true).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: true, configurable: true, writable: true }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function Tree2Element(tree) {
  return tree && tree.map((node, i) => /*#__PURE__*/SP_REACT.createElement(node.tag, _objectSpread({
    key: i
  }, node.attr), Tree2Element(node.child)));
}
function GenIcon(data) {
  return props => /*#__PURE__*/SP_REACT.createElement(IconBase, _extends({
    attr: _objectSpread({}, data.attr)
  }, props), Tree2Element(data.child));
}
function IconBase(props) {
  var elem = conf => {
    var {
        attr,
        size,
        title
      } = props,
      svgProps = _objectWithoutProperties(props, _excluded);
    var computedSize = size || conf.size || "1em";
    var className;
    if (conf.className) className = conf.className;
    if (props.className) className = (className ? className + " " : "") + props.className;
    return /*#__PURE__*/SP_REACT.createElement("svg", _extends({
      stroke: "currentColor",
      fill: "currentColor",
      strokeWidth: "0"
    }, conf.attr, attr, svgProps, {
      className: className,
      style: _objectSpread(_objectSpread({
        color: props.color || conf.color
      }, conf.style), props.style),
      height: computedSize,
      width: computedSize,
      xmlns: "http://www.w3.org/2000/svg"
    }), title && /*#__PURE__*/SP_REACT.createElement("title", null, title), props.children);
  };
  return IconContext !== undefined ? /*#__PURE__*/SP_REACT.createElement(IconContext.Consumer, null, conf => elem(conf)) : elem(DefaultContext);
}

// THIS FILE IS AUTO GENERATED
function FaTv (props) {
  return GenIcon({"attr":{"viewBox":"0 0 640 512"},"child":[{"tag":"path","attr":{"d":"M592 0H48A48 48 0 0 0 0 48v320a48 48 0 0 0 48 48h240v32H112a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16H352v-32h240a48 48 0 0 0 48-48V48a48 48 0 0 0-48-48zm-16 352H64V64h512z"},"child":[]}]})(props);
}

const getStatus = callable("get_status");
const discoverCec = callable("discover_cec");
const discoverAudio = callable("discover_audio");
const discoverInput = callable("discover_input");
const setConfig = callable("set_config");
const setService = callable("set_service");
const setSystemService = callable("set_system_service");
const setExternalVolume = callable("set_external_volume");
const volumeUp = callable("volume_up");
const volumeDown = callable("volume_down");
const mute = callable("mute");
const wakeTv = callable("wake_tv");
const standbyTv = callable("standby_tv");
const restartExternalVolume = callable("restart_external_volume");
const repairCecPermissions = callable("repair_cec_permissions");
const debugCec = callable("debug_cec");
function yesNo(value) {
    return value ? "OK" : "Missing";
}
function statusSummary(status) {
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
            detail: "CEC volume is enabled, but SteamOS has not attached relative volume yet.",
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
function statusColor(level) {
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
function StatusCard({ status }) {
    const summary = statusSummary(status);
    const color = statusColor(summary.level);
    return (SP_JSX.jsxs("div", { style: { display: "flex", gap: "10px", alignItems: "flex-start" }, children: [SP_JSX.jsx("div", { style: {
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: color,
                    marginTop: "5px",
                    flex: "0 0 auto",
                } }), SP_JSX.jsxs("div", { children: [SP_JSX.jsx("div", { style: { color, fontWeight: 600 }, children: summary.title }), SP_JSX.jsx("div", { style: { fontSize: "12px", opacity: 0.78, lineHeight: 1.35 }, children: summary.detail })] })] }));
}
function DiagnosticsDetails({ status }) {
    if (!status?.ok) {
        return null;
    }
    return (SP_JSX.jsxs("div", { style: { fontSize: "12px", opacity: 0.8, lineHeight: 1.35 }, children: [SP_JSX.jsxs("div", { children: ["Root helper: ", yesNo(status.root_helper_exists)] }), SP_JSX.jsxs("div", { children: ["Debug helper: ", yesNo(status.debug_helper_exists)] }), SP_JSX.jsxs("div", { children: ["Power standby helper: ", yesNo(status.power_standby_helper_exists)] }), SP_JSX.jsxs("div", { children: ["USB wake helper: ", yesNo(status.usb_wake_helper_exists)] }), SP_JSX.jsxs("div", { children: ["Boot wake helper: ", yesNo(status.boot_wake_script_exists)] }), SP_JSX.jsxs("div", { children: ["CEC permissions: ", status.cec_device?.readable && status.cec_device?.writable ? "OK" : "Needs repair"] }), SP_JSX.jsxs("div", { children: ["Sudoers: ", yesNo(status.sudoers_exists)] }), SP_JSX.jsxs("div", { children: ["CEC volume buttons: ", status.external_volume?.enabled ? "On" : "Off"] }), SP_JSX.jsxs("div", { children: ["Relative volume: ", status.external_volume?.capabilities_ok ? "OK" : "Inactive"] }), SP_JSX.jsxs("div", { children: ["Custom config: ", status.config_exists ? "Present" : "Defaults"] })] }));
}
function needsInstallHelp(status) {
    if (!status?.ok) {
        return false;
    }
    return (!status.root_helper_exists ||
        !status.debug_helper_exists ||
        !status.power_standby_helper_exists ||
        !status.usb_wake_helper_exists ||
        !status.cec_permissions_helper_exists ||
        !status.boot_wake_script_exists ||
        !status.cec_device?.readable ||
        !status.cec_device?.writable ||
        !status.sudoers_exists ||
        !status.volume_script_exists ||
        !status.external_volume_script_exists);
}
function missingItems(status) {
    if (!status?.ok) {
        return [];
    }
    const items = [];
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
    if (!status.external_volume_script_exists) {
        items.push("ExternalVolume shim");
    }
    return items;
}
function InstallHelp({ status, busy, onRepairPermissions }) {
    const items = missingItems(status);
    const command = "bash <(curl -fsSL https://github.com/Twsts/steamos-cec-toolkit/releases/latest/download/steamos-cec-toolkit-installer.sh)";
    const canRepairPermissions = !!status?.cec_permissions_helper_exists && !!status.cec_device?.exists;
    const permissionProblem = !!status?.cec_device?.exists && (!status.cec_device?.readable || !status.cec_device?.writable);
    return (SP_JSX.jsxs(DFL.PanelSection, { title: "Install / Repair", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: { fontSize: "12px", opacity: 0.8, lineHeight: 1.35 }, children: [SP_JSX.jsxs("div", { children: ["Missing: ", items.length ? items.join(", ") : "toolkit bootstrap"] }), permissionProblem && (SP_JSX.jsxs("div", { style: { marginTop: "6px" }, children: ["CEC actions need read/write access to ", status?.cec_device?.device, ". Try repair here first."] })), SP_JSX.jsx("div", { style: { marginTop: "6px" }, children: "If repair is unavailable or does not fix it, run from Desktop/SSH:" }), SP_JSX.jsx("code", { style: { display: "block", whiteSpace: "normal", marginTop: "4px" }, children: command }), SP_JSX.jsx("div", { style: { marginTop: "6px" }, children: "The installer keeps your Decky configuration and refreshes root helpers." })] }) }), permissionProblem && canRepairPermissions && (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: busy, onClick: onRepairPermissions, children: "Repair CEC Permissions" }) }))] }));
}
function configValue(status, key, fallback) {
    return status?.config?.[key] || fallback;
}
function ConfigDetails({ status }) {
    if (!status?.ok) {
        return null;
    }
    const cecDevice = configValue(status, "CEC_DEVICE", "/dev/cec0");
    const initiator = configValue(status, "CEC_VOLUME_INITIATOR", "0");
    const audioTarget = configValue(status, "CEC_AUDIO_LOGICAL_ADDRESS", "5");
    const cardName = configValue(status, "HDMI_ALSA_CARD_NAME", "alsa_card.pci-0000_03_00.1");
    const cardNick = configValue(status, "HDMI_ALSA_CARD_NICK", "HDA ATI HDMI");
    const route = configValue(status, "EXTERNAL_VOLUME_ROUTE", "hdmi-output-0");
    return (SP_JSX.jsxs("div", { style: { fontSize: "12px", opacity: 0.8, lineHeight: 1.35 }, children: [SP_JSX.jsxs("div", { children: ["CEC device: ", cecDevice] }), SP_JSX.jsxs("div", { children: ["Volume path: logical ", initiator, " to ", audioTarget] }), SP_JSX.jsxs("div", { children: ["Route: ", route] }), SP_JSX.jsxs("div", { children: ["HDMI card: ", cardName, " / ", cardNick] })] }));
}
function ControllerWakeDetails({ discovery, status }) {
    const devices = discovery?.devices || status?.controller_wake?.gamepad_devices || [];
    const hidDevices = discovery?.hid_fallback_devices || status?.controller_wake?.hid_fallback_devices || [];
    devices.filter((device) => device.readable).length;
    const supportedButtons = "Home / Guide / PS / Xbox";
    const total = devices.length + hidDevices.length;
    const needsPermission = devices.some((device) => !device.readable);
    return (SP_JSX.jsxs("div", { style: { fontSize: "12px", opacity: 0.8, lineHeight: 1.35 }, children: [SP_JSX.jsxs("div", { children: ["Uses controller system buttons: ", supportedButtons] }), SP_JSX.jsx("div", { children: total ? `Found controllers: ${total}` : "No controllers detected" }), (devices.length > 0 || hidDevices.length > 0) && (SP_JSX.jsxs("div", { style: { marginTop: "6px" }, children: [devices.slice(0, 4).map((device) => (SP_JSX.jsxs("div", { children: [device.display_name || device.name || "Unknown controller", device.readable ? "" : " - permission needed"] }, device.path))), hidDevices.slice(0, 2).map((device) => (SP_JSX.jsx("div", { children: device.display_name || device.name }, device.path)))] })), needsPermission && (SP_JSX.jsx("div", { style: { marginTop: "6px" }, children: "Some controllers need input permissions." }))] }));
}
function AudioDiscoveryDetails({ discovery }) {
    if (!discovery) {
        return null;
    }
    const count = discovery.cards?.length || 0;
    const message = discovery.ok
        ? `Found HDMI/DP audio outputs: ${count}`
        : discovery.error || discovery.note || "No HDMI/DP audio output detected";
    return (SP_JSX.jsxs("div", { style: { fontSize: "12px", opacity: 0.78, lineHeight: 1.35 }, children: [SP_JSX.jsx("div", { children: message }), discovery.note && discovery.ok && SP_JSX.jsx("div", { children: discovery.note })] }));
}
function DebugOutput({ output }) {
    if (!output) {
        return null;
    }
    const lines = output.split("\n").slice(-18).join("\n");
    return (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("pre", { style: {
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontSize: "10px",
                lineHeight: 1.25,
                maxHeight: "180px",
                overflowY: "auto",
                opacity: 0.85,
                margin: 0,
            }, children: lines }) }));
}
function Content() {
    const [status, setStatus] = SP_REACT.useState(null);
    const [discovery, setDiscovery] = SP_REACT.useState(null);
    const [audioDiscovery, setAudioDiscovery] = SP_REACT.useState(null);
    const [inputDiscovery, setInputDiscovery] = SP_REACT.useState(null);
    const [debugOutput, setDebugOutput] = SP_REACT.useState("");
    const [busy, setBusy] = SP_REACT.useState(false);
    const refresh = async () => {
        setStatus(await getStatus());
    };
    const refreshDiscovery = async () => {
        setBusy(true);
        try {
            setDiscovery(await discoverCec());
            setStatus(await getStatus());
        }
        finally {
            setBusy(false);
        }
    };
    const refreshInputDiscovery = async () => {
        setBusy(true);
        try {
            setInputDiscovery(await discoverInput());
            setStatus(await getStatus());
        }
        finally {
            setBusy(false);
        }
    };
    const refreshAudioDiscovery = async () => {
        setBusy(true);
        try {
            setAudioDiscovery(await discoverAudio());
            setStatus(await getStatus());
        }
        finally {
            setBusy(false);
        }
    };
    const runAction = async (action) => {
        setBusy(true);
        try {
            setStatus(await action());
        }
        finally {
            setBusy(false);
        }
    };
    const captureDebug = async () => {
        setBusy(true);
        try {
            const nextStatus = await debugCec(3);
            setStatus(nextStatus);
            setDebugOutput(nextStatus.debug?.stdout?.trim() || nextStatus.error || "No CEC messages captured.");
        }
        finally {
            setBusy(false);
        }
    };
    SP_REACT.useEffect(() => {
        void refresh();
        const timer = window.setInterval(() => {
            void refresh();
        }, 5000);
        return () => window.clearInterval(timer);
    }, []);
    const steamButton = status?.services?.["steam-button"];
    const bootWake = status?.services?.["boot-wake"];
    const tvStandby = status?.services?.["tv-standby"];
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
    const audioCardOptions = (audioDiscovery?.cards || []).map((card) => ({
        data: card.name,
        label: card.label,
    }));
    const audioRouteOptions = (audioDiscovery?.routes || []).map((route) => ({
        data: route,
        label: route,
    }));
    return (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsxs(DFL.PanelSection, { title: "Status", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(StatusCard, { status: status }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: busy, onClick: () => void refresh(), children: "Refresh" }) })] }), showInstallHelp && (SP_JSX.jsx(InstallHelp, { status: status, busy: busy, onRepairPermissions: () => void runAction(repairCecPermissions) })), SP_JSX.jsxs(DFL.PanelSection, { title: "Features", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ToggleField, { label: "CEC Volume Buttons", description: "Show SteamOS + / - controls and send volume commands over HDMI-CEC", checked: !!cecVolume?.enabled, disabled: busy || !installed, onChange: (enabled) => void runAction(() => setExternalVolume(enabled)) }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ToggleField, { label: "Controller Button Wakes TV", description: "Use controller Home/Guide buttons to wake the TV/AVR and select this input", checked: !!steamButton?.is_enabled, disabled: busy, onChange: (enabled) => void runAction(() => setService("steam-button", enabled)) }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ToggleField, { label: "SteamOS Start Wakes TV", description: "Wake the TV/AVR and select this input when SteamOS starts", checked: !!bootWake?.is_enabled, disabled: busy || !status?.boot_wake_script_exists, onChange: (enabled) => void runAction(() => setService("boot-wake", enabled)) }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ToggleField, { label: "TV Standby Suspends SteamOS", description: "Suspend SteamOS when the TV broadcasts HDMI-CEC standby", checked: !!tvStandby?.is_enabled, disabled: busy, onChange: (enabled) => void runAction(() => setService("tv-standby", enabled)) }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ToggleField, { label: "SteamOS Sleep Turns Off TV", description: "Send TV standby before SteamOS sleeps or shuts down", checked: !!powerStandby?.is_enabled, disabled: busy || !status?.power_standby_helper_exists, onChange: (enabled) => void runAction(() => setSystemService("power-standby", enabled)) }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ToggleField, { label: "Bluetooth/Controller Wake", description: "Allow supported Bluetooth and controller receivers to wake SteamOS from suspend", checked: !!usbWake?.is_enabled, disabled: busy || !status?.usb_wake_helper_exists, onChange: (enabled) => void runAction(() => setSystemService("usb-wake", enabled)) }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ToggleField, { label: "Gamescope Recovery", description: "Restart Gamescope after CEC input activation if the display gets stuck", checked: !!gamescopeRecovery?.is_enabled, disabled: busy, onChange: (enabled) => void runAction(() => setService("gamescope-recovery", enabled)) }) })] }), SP_JSX.jsxs(DFL.PanelSection, { title: "Actions", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: busy || !installed, onClick: () => void runAction(wakeTv), children: "Wake TV / Select Input" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: busy || !installed, onClick: () => void runAction(standbyTv), children: "TV Standby" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: busy || !installed, onClick: () => void runAction(volumeUp), children: "Volume Up" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: busy || !installed, onClick: () => void runAction(volumeDown), children: "Volume Down" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: busy || !installed, onClick: () => void runAction(mute), children: "Mute" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: busy, onClick: () => void runAction(restartExternalVolume), children: "Restart CEC Audio" }) })] }), SP_JSX.jsxs(DFL.PanelSection, { title: "Configuration", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: busy, onClick: () => void refreshInputDiscovery(), children: "Discover Controllers" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(ControllerWakeDetails, { discovery: inputDiscovery, status: status }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: busy, onClick: () => void refreshDiscovery(), children: "Discover CEC Devices" }) }), cecDeviceOptions.length > 1 && (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.DropdownItem, { label: "CEC Device", description: "Use the adapter connected to the TV/AVR HDMI chain", rgOptions: cecDeviceOptions, selectedOption: cecDevice, disabled: busy, onChange: (option) => void runAction(() => setConfig({ CEC_DEVICE: String(option.data) })) }) })), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.DropdownItem, { label: "Volume Initiator", description: "Usually TV logical address 0 for receivers that reject playback-device volume", rgOptions: deviceOptions.length ? deviceOptions : [{ data: initiator, label: `Logical ${initiator}` }], selectedOption: initiator, disabled: busy, onChange: (option) => void runAction(() => setConfig({ CEC_VOLUME_INITIATOR: String(option.data) })) }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.DropdownItem, { label: "Audio Target", description: "The receiver/audio-system logical address that receives volume commands", rgOptions: deviceOptions.length ? deviceOptions : [{ data: audioTarget, label: `Logical ${audioTarget}` }], selectedOption: audioTarget, disabled: busy, onChange: (option) => void runAction(() => setConfig({ CEC_AUDIO_LOGICAL_ADDRESS: String(option.data) })) }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: busy, onClick: () => void refreshAudioDiscovery(), children: "Discover Audio Output" }) }), audioDiscovery && (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(AudioDiscoveryDetails, { discovery: audioDiscovery }) })), audioCardOptions.length > 0 && (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.DropdownItem, { label: "HDMI Audio Card", description: "Use the PipeWire/ALSA HDMI output connected to the TV/AVR chain", rgOptions: audioCardOptions, selectedOption: audioCardName, disabled: busy, onChange: (option) => {
                                const selected = (audioDiscovery?.cards || []).find((card) => card.name === String(option.data));
                                void runAction(() => setConfig({
                                    HDMI_ALSA_CARD_NAME: String(option.data),
                                    HDMI_ALSA_CARD_NICK: selected?.nick || selected?.description || String(option.data),
                                }));
                            } }) })), audioRouteOptions.length > 1 && (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.DropdownItem, { label: "ExternalVolume Route", description: "Usually hdmi-output-0; change only if relative volume does not attach", rgOptions: audioRouteOptions, selectedOption: audioRoute, disabled: busy, onChange: (option) => void runAction(() => setConfig({ EXTERNAL_VOLUME_ROUTE: String(option.data) })) }) }))] }), SP_JSX.jsxs(DFL.PanelSection, { title: "Debug", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DiagnosticsDetails, { status: status }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(ConfigDetails, { status: status }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: busy || !status?.debug_helper_exists, onClick: () => void captureDebug(), children: "Capture CEC Messages" }) }), SP_JSX.jsx(DebugOutput, { output: debugOutput }), debugOutput && (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: busy, onClick: () => setDebugOutput(""), children: "Clear Capture" }) }))] })] }));
}
var index = definePlugin(() => {
    return {
        name: "SteamOS CEC",
        titleView: SP_JSX.jsx("div", { children: "SteamOS CEC" }),
        content: SP_JSX.jsx(Content, {}),
        icon: SP_JSX.jsx(FaTv, {}),
    };
});

export { index as default };
//# sourceMappingURL=index.js.map
