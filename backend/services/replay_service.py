import asyncio
import uuid
import re
import logging
import time
from datetime import datetime, timezone
from typing import Optional
from database import get_db
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ReplayManager:
    def __init__(self):
        self._process: Optional[asyncio.subprocess.Process] = None
        self._task: Optional[asyncio.Task] = None
        self._status: dict = {"status": "idle"}
        self._ws_clients: list[WebSocket] = []
        self._stop_event = asyncio.Event()

    # --- WebSocket management ---

    def register_ws(self, ws: WebSocket):
        self._ws_clients.append(ws)

    def unregister_ws(self, ws: WebSocket):
        if ws in self._ws_clients:
            self._ws_clients.remove(ws)

    async def _broadcast(self, data: dict):
        dead: list[WebSocket] = []
        for ws in self._ws_clients:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self._ws_clients.remove(ws)

    # --- Public API ---

    def get_status(self) -> dict:
        return self._status.copy()

    def is_running(self) -> bool:
        return self._status.get("status") in ("starting", "running")

    async def start_replay(self, file_id: str, filename: str, file_path: str,
                           interface: str, speed: float, speed_unit: str, continuous: bool) -> str:
        if self.is_running():
            raise RuntimeError("A replay is already in progress")

        replay_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        self._stop_event.clear()
        self._status = {
            "replay_id": replay_id,
            "file_id": file_id,
            "filename": filename,
            "interface": interface,
            "speed": speed,
            "speed_unit": speed_unit,
            "continuous": continuous,
            "status": "starting",
            "packets_sent": 0,
            "bytes_sent": 0,
            "progress_percent": 0,
            "elapsed_time": 0,
            "loop_count": 0,
            "error": None,
            "started_at": now,
        }

        # Save to DB
        db = await get_db()
        await db.execute(
            "INSERT INTO replays (id,file_id,filename,interface,speed,speed_unit,continuous,status,started_at) VALUES (?,?,?,?,?,?,?,?,?)",
            (replay_id, file_id, filename, interface, speed, speed_unit, int(continuous), "running", now),
        )
        await db.commit()

        self._task = asyncio.create_task(self._run(file_path, interface, speed, speed_unit, continuous, replay_id))
        return replay_id

    async def stop_replay(self) -> bool:
        if not self.is_running():
            return False
        self._stop_event.set()
        if self._process and self._process.returncode is None:
            try:
                self._process.terminate()
                try:
                    await asyncio.wait_for(self._process.wait(), timeout=5)
                except asyncio.TimeoutError:
                    self._process.kill()
            except ProcessLookupError:
                pass
        self._status["status"] = "stopped"
        self._status["finished_at"] = datetime.now(timezone.utc).isoformat()
        await self._persist_final()
        await self._broadcast(self._status)
        return True

    # --- Internal ---

    def _build_cmd(self, file_path: str, interface: str, speed: float, speed_unit: str) -> list[str]:
        cmd = ["tcpreplay", "-i", interface]
        if speed_unit == "pps":
            cmd.extend(["--pps", str(int(speed))])
        else:
            cmd.extend(["--multiplier", f"{speed:.2f}"])
        cmd.extend(["--timer", "select", "--quiet"])
        cmd.append(file_path)
        return cmd

    async def _run(self, file_path: str, interface: str, speed: float, speed_unit: str,
                   continuous: bool, replay_id: str):
        try:
            self._status["status"] = "running"
            await self._broadcast(self._status)

            while not self._stop_event.is_set():
                self._status["loop_count"] += 1
                self._status["progress_percent"] = 0

                cmd = self._build_cmd(file_path, interface, speed, speed_unit)
                logger.info(f"REPLAY_COMMAND: {' '.join(cmd)}")

                start_time = time.monotonic()
                self._process = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )

                # Progress emitter — broadcasts every 1 second while process runs
                async def emit_progress():
                    while self._process and self._process.returncode is None:
                        elapsed = time.monotonic() - start_time
                        self._status["elapsed_time"] = round(elapsed, 2)
                        await self._broadcast(self._status)
                        await asyncio.sleep(1)

                progress_task = asyncio.create_task(emit_progress())

                stdout, stderr = await self._process.communicate()
                progress_task.cancel()

                # Parse final output
                self._parse_output(stdout.decode() if stdout else "")
                self._parse_output(stderr.decode() if stderr else "")

                if self._process.returncode != 0 and not self._stop_event.is_set():
                    err = stderr.decode().strip() if stderr else f"tcpreplay exited with code {self._process.returncode}"
                    self._status["error"] = err
                    self._status["status"] = "failed"
                    break

                self._status["progress_percent"] = 100
                self._status["elapsed_time"] = round(time.monotonic() - start_time, 2)
                await self._broadcast(self._status)

                if not continuous:
                    break

                # Small delay between loops
                for _ in range(20):
                    if self._stop_event.is_set():
                        break
                    await asyncio.sleep(0.1)

            if self._status["status"] == "running":
                self._status["status"] = "completed" if not continuous else "stopped"

            self._status["finished_at"] = datetime.now(timezone.utc).isoformat()
            await self._persist_final()
            await self._broadcast(self._status)

        except asyncio.CancelledError:
            self._status["status"] = "stopped"
            await self._persist_final()
        except Exception as e:
            logger.exception(f"Replay error: {e}")
            self._status["status"] = "failed"
            self._status["error"] = str(e)
            await self._persist_final()
            await self._broadcast(self._status)
        finally:
            self._process = None

    _ACTUAL_RE = re.compile(r"(\d+)\s+packets\s+\((\d+)\s+bytes\)\s+sent in\s+([\d.]+)\s+seconds")

    def _parse_output(self, text: str):
        for line in text.splitlines():
            m = self._ACTUAL_RE.search(line)
            if m:
                self._status["packets_sent"] = int(m.group(1))
                self._status["bytes_sent"] = int(m.group(2))
                self._status["elapsed_time"] = float(m.group(3))

    async def _persist_final(self):
        try:
            db = await get_db()
            s = self._status
            await db.execute(
                "UPDATE replays SET status=?, packets_sent=?, bytes_sent=?, duration=?, loop_count=?, error=?, finished_at=? WHERE id=?",
                (s.get("status"), s.get("packets_sent", 0), s.get("bytes_sent", 0),
                 s.get("elapsed_time", 0), s.get("loop_count", 0), s.get("error"),
                 s.get("finished_at"), s.get("replay_id")),
            )
            await db.commit()
        except Exception as e:
            logger.error(f"Error persisting replay status: {e}")


# Singleton
replay_manager = ReplayManager()
