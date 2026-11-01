import subprocess
import re
from typing import Dict, Any, Optional

def get_system_hardware() -> Dict[str, Any]:
    """Inspects GPU VRAM and System RAM on the host machine."""
    gpu_info = {
        "has_gpu": False,
        "name": "Unknown",
        "vram_total_mb": 0,
        "vram_used_mb": 0,
        "vram_free_mb": 0,
        "driver_version": "N/A"
    }

    # Attempt to query NVIDIA GPU
    try:
        cmd = [
            "nvidia-smi",
            "--query-gpu=gpu_name,memory.total,memory.used,memory.free,driver_version",
            "--format=csv,noheader,nounits"
        ]
        out = subprocess.check_output(cmd, stderr=subprocess.DEVNULL, text=True).strip()
        if out:
            lines = out.splitlines()
            if lines:
                parts = [p.strip() for p in lines[0].split(",")]
                if len(parts) >= 5:
                    gpu_info["has_gpu"] = True
                    gpu_info["name"] = parts[0]
                    gpu_info["vram_total_mb"] = int(float(parts[1]))
                    gpu_info["vram_used_mb"] = int(float(parts[2]))
                    gpu_info["vram_free_mb"] = int(float(parts[3]))
                    gpu_info["driver_version"] = parts[4]
    except Exception:
        pass

    # Inspect System RAM via /proc/meminfo
    ram_info = {
        "ram_total_mb": 0,
        "ram_available_mb": 0
    }
    try:
        with open("/proc/meminfo", "r") as f:
            for line in f:
                if line.startswith("MemTotal:"):
                    ram_info["ram_total_mb"] = int(int(line.split()[1]) / 1024)
                elif line.startswith("MemAvailable:"):
                    ram_info["ram_available_mb"] = int(int(line.split()[1]) / 1024)
    except Exception:
        pass

    return {
        "gpu": gpu_info,
        "ram": ram_info
    }

def evaluate_model_compatibility(model_name: str, size_bytes: int = 0) -> Dict[str, Any]:
    """
    Evaluates whether a given Ollama model runs optimally in local GPU VRAM.
    """
    hw = get_system_hardware()
    vram_total_mb = hw["gpu"]["vram_total_mb"]
    size_mb = size_bytes / (1024 * 1024) if size_bytes > 0 else 0

    # Model size estimation from common tags if size_bytes is not supplied
    if size_mb == 0:
        name_lower = model_name.lower()
        if any(tag in name_lower for tag in ["3b", "4b", "e4b", "embed"]):
            size_mb = 3200
        elif any(tag in name_lower for tag in ["7b", "8b"]):
            size_mb = 5200
        elif any(tag in name_lower for tag in ["12b", "14b"]):
            size_mb = 8900
        elif any(tag in name_lower for tag in ["32b", "33b"]):
            size_mb = 20000
        elif any(tag in name_lower for tag in ["70b", "72b"]):
            size_mb = 42000
        else:
            size_mb = 5000

    # If NVIDIA GPU with VRAM is present
    if vram_total_mb > 0:
        vram_headroom = vram_total_mb - 1000  # Leave ~1GB for context & OS buffers
        if size_mb <= vram_headroom:
            vram_percent = min(100, int((size_mb / vram_total_mb) * 100))
            return {
                "status": "optimal",
                "label": "100% VRAM (Fastest)",
                "color": "emerald",
                "description": f"Fits fully in {hw['gpu']['name']} VRAM (~{vram_percent}% usage). Peak tokens/sec.",
                "size_mb": round(size_mb, 1),
                "runs_on_gpu": True
            }
        elif size_mb <= (vram_total_mb + hw["ram"]["ram_available_mb"] * 0.7):
            offload_vram = vram_total_mb - 500
            offload_cpu = size_mb - offload_vram
            return {
                "status": "partial_offload",
                "label": "Partial CPU Offload",
                "color": "amber",
                "description": f"GPU handles ~{int((offload_vram/size_mb)*100)}%, offloading ~{int(offload_cpu)}MB to system RAM.",
                "size_mb": round(size_mb, 1),
                "runs_on_gpu": True
            }
        else:
            return {
                "status": "too_large",
                "label": "Insufficient Memory",
                "color": "rose",
                "description": "Model exceeds combined VRAM and available RAM. Severe slowdown expected.",
                "size_mb": round(size_mb, 1),
                "runs_on_gpu": False
            }

    # CPU fallback
    return {
        "status": "cpu_only",
        "label": "CPU Execution",
        "color": "blue",
        "description": "Running on system RAM.",
        "size_mb": round(size_mb, 1),
        "runs_on_gpu": False
    }
