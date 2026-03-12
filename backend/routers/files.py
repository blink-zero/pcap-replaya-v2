import asyncio
import json
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from services import file_service, pcap_service

router = APIRouter(prefix="/files")


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    result = await file_service.save_upload(file)
    # Trigger analysis in background
    asyncio.create_task(_analyze_bg(result["id"]))
    return result


async def _analyze_bg(file_id: str):
    try:
        f = await file_service.get_file(file_id)
        analysis = await asyncio.get_event_loop().run_in_executor(None, pcap_service.analyze_pcap, f["file_path"])
        analysis["file_id"] = file_id
        analysis["filename"] = f["original_filename"]
        await file_service.update_analysis(file_id, analysis)
    except Exception:
        pass


@router.get("")
async def list_files():
    return {"files": await file_service.list_files()}


@router.get("/{file_id}")
async def get_file(file_id: str):
    f = await file_service.get_file(file_id)
    f.pop("file_path", None)
    f.pop("analysis_json", None)
    return f


@router.get("/{file_id}/analysis")
async def get_analysis(file_id: str):
    f = await file_service.get_file(file_id)
    if f.get("analysis_json"):
        analysis = json.loads(f["analysis_json"])
        analysis["file_id"] = file_id
        analysis["filename"] = f["original_filename"]
        return analysis
    # Run on-demand
    analysis = await asyncio.get_event_loop().run_in_executor(None, pcap_service.analyze_pcap, f["file_path"])
    analysis["file_id"] = file_id
    analysis["filename"] = f["original_filename"]
    await file_service.update_analysis(file_id, analysis)
    return analysis


@router.get("/{file_id}/download")
async def download_file(file_id: str):
    f = await file_service.get_file(file_id)
    return FileResponse(f["file_path"], filename=f["original_filename"], media_type="application/octet-stream")


@router.delete("/{file_id}")
async def delete_file(file_id: str):
    await file_service.delete_file(file_id)
    return {"ok": True}
