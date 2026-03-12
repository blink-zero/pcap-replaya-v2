import os
import logging
from collections import Counter
from datetime import datetime, timezone
from scapy.all import PcapReader  # type: ignore
from config import settings

logger = logging.getLogger(__name__)


def _detect_format(file_path: str) -> str:
    with open(file_path, "rb") as f:
        magic = f.read(4)
    if magic in (b"\xd4\xc3\xb2\xa1", b"\xa1\xb2\xc3\xd4"):
        return "pcap"
    if magic == b"\x0a\x0d\x0d\x0a":
        return "pcapng"
    return "unknown"


def analyze_pcap(file_path: str) -> dict:
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"PCAP file not found: {file_path}")

    file_size = os.path.getsize(file_path)
    file_format = _detect_format(file_path)

    packet_count = 0
    first_ts = None
    last_ts = None
    total_bytes = 0
    protocol_counter: Counter = Counter()
    talker_counter: Counter = Counter()
    size_buckets = {"0-64": 0, "65-128": 0, "129-256": 0, "257-512": 0, "513-1024": 0, "1025-1518": 0, "1519+": 0}
    analysis_limited = False

    try:
        with PcapReader(file_path) as reader:
            for pkt in reader:
                packet_count += 1
                pkt_len = len(pkt)
                total_bytes += pkt_len

                if hasattr(pkt, "time"):
                    ts = float(pkt.time)
                    if first_ts is None:
                        first_ts = ts
                    last_ts = ts

                # Protocol detection
                if pkt.haslayer("TCP"):
                    protocol_counter["TCP"] += 1
                elif pkt.haslayer("UDP"):
                    protocol_counter["UDP"] += 1
                elif pkt.haslayer("ICMP"):
                    protocol_counter["ICMP"] += 1
                elif pkt.haslayer("ICMPv6"):
                    protocol_counter["ICMPv6"] += 1
                elif pkt.haslayer("ARP"):
                    protocol_counter["ARP"] += 1
                elif pkt.haslayer("DNS"):
                    protocol_counter["DNS"] += 1
                else:
                    protocol_counter["Other"] += 1

                # Top talkers (IP pairs)
                if pkt.haslayer("IP"):
                    src = pkt["IP"].src
                    dst = pkt["IP"].dst
                    talker_counter[(src, dst)] += 1
                elif pkt.haslayer("IPv6"):
                    src = pkt["IPv6"].src
                    dst = pkt["IPv6"].dst
                    talker_counter[(src, dst)] += 1

                # Size distribution
                if pkt_len <= 64:
                    size_buckets["0-64"] += 1
                elif pkt_len <= 128:
                    size_buckets["65-128"] += 1
                elif pkt_len <= 256:
                    size_buckets["129-256"] += 1
                elif pkt_len <= 512:
                    size_buckets["257-512"] += 1
                elif pkt_len <= 1024:
                    size_buckets["513-1024"] += 1
                elif pkt_len <= 1518:
                    size_buckets["1025-1518"] += 1
                else:
                    size_buckets["1519+"] += 1

                if packet_count >= settings.analysis_packet_limit:
                    analysis_limited = True
                    break

    except Exception as e:
        logger.error(f"Error analysing PCAP: {e}")
        raise

    duration = (last_ts - first_ts) if (first_ts is not None and last_ts is not None) else 0.0
    data_rate = total_bytes / duration if duration > 0 else 0.0

    # Build protocol list with percentages
    protocols = []
    for proto, count in protocol_counter.most_common():
        protocols.append({
            "name": proto,
            "count": count,
            "percentage": round((count / packet_count * 100) if packet_count else 0, 2),
        })

    # Top talkers
    top_talkers = []
    for (src, dst), count in talker_counter.most_common(20):
        top_talkers.append({
            "src": src,
            "dst": dst,
            "count": count,
            "percentage": round((count / packet_count * 100) if packet_count else 0, 2),
        })

    return {
        "file_size": file_size,
        "file_format": file_format,
        "packet_count": packet_count,
        "duration": round(duration, 4),
        "start_time": datetime.fromtimestamp(first_ts, tz=timezone.utc).isoformat() if first_ts else None,
        "end_time": datetime.fromtimestamp(last_ts, tz=timezone.utc).isoformat() if last_ts else None,
        "data_rate": round(data_rate, 2),
        "protocols": protocols,
        "top_talkers": top_talkers,
        "packet_size_distribution": size_buckets,
        "analysis_limited": analysis_limited,
    }
