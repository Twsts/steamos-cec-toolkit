import asyncio
import json
import os
import subprocess
from pathlib import Path

import decky


class Plugin:
    def __init__(self):
        self._home = Path(os.environ.get("SUDO_USER_HOME", "/home/deck"))
        if not self._home.exists():
            self._home = Path.home()
        self._ctl_path = self._home / ".local" / "bin" / "steamos-cec-toolkitctl"

    async def _run_ctl(self, *args: str) -> dict:
        command = [str(self._ctl_path), *args]
        env = os.environ.copy()
        env.update(
            {
                "HOME": str(self._home),
                "PATH": f"{self._home}/.local/bin:/usr/local/bin:/usr/bin:/bin",
                "SYSTEMD_PAGER": "",
                "XDG_RUNTIME_DIR": "/run/user/1000",
                "DBUS_SESSION_BUS_ADDRESS": "unix:path=/run/user/1000/bus",
            }
        )
        env.pop("LD_LIBRARY_PATH", None)

        decky.logger.info("SteamOS CEC Toolkit running command: %s", " ".join(command))

        process = await asyncio.create_subprocess_exec(
            *command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env,
        )
        stdout, stderr = await process.communicate()
        stdout_text = stdout.decode("utf-8", errors="replace").strip()
        stderr_text = stderr.decode("utf-8", errors="replace").strip()
        decky.logger.info(
            "SteamOS CEC Toolkit command exited rc=%s stdout=%r stderr=%r",
            process.returncode,
            stdout_text,
            stderr_text,
        )

        if process.returncode != 0 and not stdout_text:
            return {
                "ok": False,
                "error": stderr_text or f"Command failed with exit code {process.returncode}",
            }

        try:
            payload = json.loads(stdout_text)
        except json.JSONDecodeError as exc:
            return {
                "ok": False,
                "error": f"Invalid toolkitctl payload: {exc}: {stdout_text[:500]}",
            }

        if process.returncode != 0:
            payload["ok"] = False
            payload.setdefault("error", stderr_text or f"Command failed with exit code {process.returncode}")
        return payload

    async def get_status(self) -> dict:
        return await self._run_ctl("status")

    async def discover_cec(self) -> dict:
        return await self._run_ctl("discover-cec")

    async def discover_audio(self) -> dict:
        return await self._run_ctl("discover-audio")

    async def discover_input(self) -> dict:
        return await self._run_ctl("discover-input")

    async def set_config(self, updates: dict) -> dict:
        return await self._run_ctl("set-config", json.dumps(updates, separators=(",", ":")))

    async def set_service(self, name: str, enabled: bool) -> dict:
        return await self._run_ctl("set-service", name, "on" if enabled else "off")

    async def set_system_service(self, name: str, enabled: bool) -> dict:
        return await self._run_ctl("set-system-service", name, "on" if enabled else "off")

    async def set_external_volume(self, enabled: bool) -> dict:
        return await self._run_ctl("set-external-volume", "on" if enabled else "off")

    async def volume_up(self) -> dict:
        return await self._run_ctl("volume", "up")

    async def volume_down(self) -> dict:
        return await self._run_ctl("volume", "down")

    async def mute(self) -> dict:
        return await self._run_ctl("volume", "mute")

    async def wake_tv(self) -> dict:
        return await self._run_ctl("wake")

    async def standby_tv(self) -> dict:
        return await self._run_ctl("standby")

    async def restart_external_volume(self) -> dict:
        return await self._run_ctl("restart-external-volume")

    async def repair_cec_permissions(self) -> dict:
        return await self._run_ctl("repair-cec-permissions")

    async def debug_cec(self, seconds: int = 3) -> dict:
        safe_seconds = max(1, min(int(seconds), 5))
        return await self._run_ctl("debug-cec", str(safe_seconds))

    async def _main(self):
        decky.logger.info("SteamOS CEC Toolkit plugin loaded")

    async def _unload(self):
        decky.logger.info("SteamOS CEC Toolkit plugin unloading")

    async def _uninstall(self):
        decky.logger.info("SteamOS CEC Toolkit plugin uninstalled")
