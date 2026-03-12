from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from models import ReplayStartRequest
from services.replay_service import replay_manager
from services import file_service

router = APIRouter()


@router.post("/replay/start")
async def start_replay(req: ReplayStartRequest):
    f = await file_service.get_file(req.file_id)
    try:
        replay_id = await replay_manager.start_replay(
            file_id=req.file_id,
            filename=f["original_filename"],
            file_path=f["file_path"],
            interface=req.interface,
            speed=req.speed,
            speed_unit=req.speed_unit,
            continuous=req.continuous,
        )
    except RuntimeError as e:
        raise HTTPException(409, str(e))
    return {"replay_id": replay_id, "status": "starting"}


@router.post("/replay/stop")
async def stop_replay():
    ok = await replay_manager.stop_replay()
    if not ok:
        raise HTTPException(400, "No replay is running")
    return {"ok": True, "status": "stopped"}


@router.get("/replay/status")
async def replay_status():
    return replay_manager.get_status()


@router.websocket("/ws/replay")
async def ws_replay(ws: WebSocket):
    await ws.accept()
    replay_manager.register_ws(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        replay_manager.unregister_ws(ws)
