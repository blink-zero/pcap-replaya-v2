import time
import psutil
import netifaces  # type: ignore
from fastapi import APIRouter, HTTPException
from config import settings

router = APIRouter()

_boot_time = psutil.boot_time()


@router.get("/health")
async def health():
    return {"status": "ok", "timestamp": time.time()}


@router.get("/version")
async def version():
    return {"version": settings.app_version, "name": settings.app_name}


@router.get("/interfaces")
async def list_interfaces():
    interfaces = []
    try:
        for iface_name in netifaces.interfaces():
            addrs = netifaces.ifaddresses(iface_name)
            addr_list = []
            for family, addr_info in addrs.items():
                for addr in addr_info:
                    addr_list.append({
                        "family": family,
                        "address": addr.get("addr", ""),
                        "netmask": addr.get("netmask", ""),
                    })
            stats = psutil.net_if_stats().get(iface_name)
            interfaces.append({
                "name": iface_name,
                "addresses": addr_list,
                "is_up": stats.isup if stats else False,
            })
    except Exception:
        # Fallback: use psutil only
        for name, stats in psutil.net_if_stats().items():
            addrs_raw = psutil.net_if_addrs().get(name, [])
            addr_list = [{"address": a.address, "netmask": a.netmask or ""} for a in addrs_raw]
            interfaces.append({"name": name, "addresses": addr_list, "is_up": stats.isup})
    return {"interfaces": interfaces}


@router.get("/system/status")
async def system_status():
    cpu = psutil.cpu_percent(interval=0.5)
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage("/")
    return {
        "cpu_percent": cpu,
        "memory_total": mem.total,
        "memory_used": mem.used,
        "memory_percent": mem.percent,
        "disk_total": disk.total,
        "disk_used": disk.used,
        "disk_percent": disk.percent,
        "uptime": time.time() - _boot_time,
    }
