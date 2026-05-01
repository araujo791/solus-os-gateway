#!/usr/bin/env python3
"""
MachCtrl Backend - Lê sensores reais via lm_sensors e controla fans via fancontrol.
Serve dados em tempo real via WebSocket para o dashboard.

Requisitos: pip install websockets psutil
"""

import asyncio
import json
import subprocess
import re
import os
import time
from collections import deque
from datetime import datetime

try:
    import websockets
except ImportError:
    print("Instalando websockets...")
    os.system("pip install websockets")
    import websockets

try:
    import psutil
except ImportError:
    print("Instalando psutil...")
    os.system("pip install psutil")
    import psutil


# ==================== CONFIGURAÇÃO ====================

WEBSOCKET_HOST = "0.0.0.0"
WEBSOCKET_PORT = 8765
UPDATE_INTERVAL = 2  # segundos

HWMON_BASE = "/sys/class/hwmon"

# ==================== DETECÇÃO DE SENSORES ====================

def find_hwmon_devices():
    devices = {}
    if not os.path.exists(HWMON_BASE):
        return devices
    for entry in sorted(os.listdir(HWMON_BASE)):
        path = os.path.join(HWMON_BASE, entry)
        name_file = os.path.join(path, "name")
        if os.path.exists(name_file):
            with open(name_file) as f:
                name = f.read().strip()
            devices[name] = path
    return devices


def find_temp_sensors(hwmon_path):
    temps = {}
    for f in sorted(os.listdir(hwmon_path)):
        match = re.match(r"temp(\d+)_input", f)
        if match:
            idx = match.group(1)
            label_file = os.path.join(hwmon_path, f"temp{idx}_label")
            label = f"Temp {idx}"
            if os.path.exists(label_file):
                with open(label_file) as lf:
                    label = lf.read().strip()
            temps[label] = os.path.join(hwmon_path, f)
    return temps


def find_fan_sensors(hwmon_path):
    fans = {}
    for f in sorted(os.listdir(hwmon_path)):
        match = re.match(r"fan(\d+)_input", f)
        if match:
            idx = match.group(1)
            label_file = os.path.join(hwmon_path, f"fan{idx}_label")
            label = f"Fan {idx}"
            if os.path.exists(label_file):
                with open(label_file) as lf:
                    label = lf.read().strip()
            fans[label] = {
                "input": os.path.join(hwmon_path, f),
                "pwm": os.path.join(hwmon_path, f"pwm{idx}"),
                "pwm_enable": os.path.join(hwmon_path, f"pwm{idx}_enable"),
                "idx": idx,
            }
    return fans


def find_all_pwm():
    pwms = {}
    if not os.path.exists(HWMON_BASE):
        return pwms
    for entry in sorted(os.listdir(HWMON_BASE)):
        path = os.path.join(HWMON_BASE, entry)
        for f in sorted(os.listdir(path)):
            match = re.match(r"pwm(\d+)$", f)
            if match:
                idx = match.group(1)
                name_file = os.path.join(path, "name")
                chip_name = "unknown"
                if os.path.exists(name_file):
                    with open(name_file) as nf:
                        chip_name = nf.read().strip()
                fan_input = os.path.join(path, f"fan{idx}_input")
                pwm_path = os.path.join(path, f)
                pwm_enable = os.path.join(path, f"pwm{idx}_enable")
                key = f"{chip_name}_pwm{idx}"
                pwms[key] = {
                    "pwm": pwm_path,
                    "pwm_enable": pwm_enable if os.path.exists(pwm_enable) else None,
                    "fan_input": fan_input if os.path.exists(fan_input) else None,
                }
    return pwms


# ==================== LEITURA DE SENSORES ====================

def read_sensor_file(path):
    try:
        with open(path) as f:
            return int(f.read().strip())
    except (FileNotFoundError, ValueError, PermissionError):
        return None


def get_cpu_topology():
    """Detecta todos os sockets físicos e seus núcleos via /proc/cpuinfo."""
    sockets = {}  # physical_id -> {"model": str, "cores": set(), "threads": [logical_ids]}
    try:
        with open("/proc/cpuinfo") as f:
            current = {}
            for line in f:
                line = line.strip()
                if not line:
                    if current:
                        pid = current.get("physical id", "0")
                        sockets.setdefault(pid, {"model": "", "cores": set(), "threads": []})
                        sockets[pid]["model"] = current.get("model name", sockets[pid]["model"])
                        if "core id" in current:
                            sockets[pid]["cores"].add(current["core id"])
                        if "processor" in current:
                            try:
                                sockets[pid]["threads"].append(int(current["processor"]))
                            except ValueError:
                                pass
                    current = {}
                    continue
                if ":" in line:
                    k, v = line.split(":", 1)
                    current[k.strip()] = v.strip()
    except FileNotFoundError:
        pass
    return sockets


def get_cpu_info():
    """Informações agregadas + por socket."""
    topology = get_cpu_topology()
    freqs_per_cpu = []
    try:
        per = psutil.cpu_freq(percpu=True)
        if per:
            freqs_per_cpu = [round(f.current / 1000, 2) for f in per]
    except Exception:
        pass
    usage_per_cpu = psutil.cpu_percent(interval=None, percpu=True) or []

    info = {
        "usage": psutil.cpu_percent(interval=None),
        "freq": 0,
        "cores": psutil.cpu_count(logical=False) or 0,
        "threads": psutil.cpu_count(logical=True) or 0,
        "model": "Desconhecido",
        "sockets": [],
    }
    freq = psutil.cpu_freq()
    if freq:
        info["freq"] = round(freq.current / 1000, 2)

    # Constrói lista por socket
    for pid in sorted(topology.keys(), key=lambda x: int(x) if x.isdigit() else 0):
        s = topology[pid]
        threads = sorted(s["threads"])
        sock_freqs = [freqs_per_cpu[t] for t in threads if t < len(freqs_per_cpu)]
        sock_usages = [usage_per_cpu[t] for t in threads if t < len(usage_per_cpu)]
        info["sockets"].append({
            "id": int(pid) if pid.isdigit() else 0,
            "model": s["model"] or info["model"],
            "core_count": len(s["cores"]),
            "thread_count": len(threads),
            "threads": threads,
            "freq": round(sum(sock_freqs) / len(sock_freqs), 2) if sock_freqs else 0,
            "usage": round(sum(sock_usages) / len(sock_usages), 1) if sock_usages else 0,
        })

    if info["sockets"]:
        info["model"] = info["sockets"][0]["model"]
    return info


def get_cpu_power():
    """Lê consumo real da CPU via RAPL (Running Average Power Limit) como GtkStressTesting."""
    # Tenta RAPL primeiro (Intel/AMD)
    rapl_base = "/sys/class/powercap"
    if os.path.exists(rapl_base):
        for entry in os.listdir(rapl_base):
            name_path = os.path.join(rapl_base, entry, "name")
            energy_path = os.path.join(rapl_base, entry, "energy_uj")
            if os.path.exists(name_path) and os.path.exists(energy_path):
                try:
                    with open(name_path) as f:
                        name = f.read().strip()
                    if name == "package-0":
                        return energy_path
                except (PermissionError, FileNotFoundError):
                    pass

    # Tenta hwmon power sensors
    if os.path.exists(HWMON_BASE):
        for entry in sorted(os.listdir(HWMON_BASE)):
            path = os.path.join(HWMON_BASE, entry)
            for f in sorted(os.listdir(path)):
                if re.match(r"power\d+_input", f):
                    return os.path.join(path, f)
    return None


def read_rapl_power(energy_path, prev_energy, prev_time):
    """Calcula watts a partir de leituras RAPL (energy_uj é acumulativo)."""
    try:
        with open(energy_path) as f:
            energy_uj = int(f.read().strip())
        now = time.time()
        if prev_energy is not None and prev_time is not None:
            dt = now - prev_time
            if dt > 0:
                watts = (energy_uj - prev_energy) / (dt * 1_000_000)
                if watts < 0:  # overflow do contador
                    watts = 0
                return round(watts, 1), energy_uj, now
        return 0, energy_uj, now
    except (PermissionError, FileNotFoundError, ValueError):
        return 0, None, None


def get_cpu_voltage():
    """Lê voltagem da CPU via hwmon (se disponível)."""
    if os.path.exists(HWMON_BASE):
        for entry in sorted(os.listdir(HWMON_BASE)):
            path = os.path.join(HWMON_BASE, entry)
            for f in sorted(os.listdir(path)):
                if re.match(r"in0_input", f):
                    val = read_sensor_file(os.path.join(path, f))
                    if val is not None:
                        v = val / 1000.0
                        if 0.5 < v < 2.0:  # range válido para Vcore
                            return round(v, 3)
    return 0


def get_memory_info():
    """Obtém uso de memória e informações dos slots via dmidecode."""
    mem = psutil.virtual_memory()
    info = {
        "usage": round(mem.percent, 1),
        "total_gb": round(mem.total / (1024**3), 1),
        "used_gb": round(mem.used / (1024**3), 1),
        "slots": [],
        "total_slots": 0,
        "occupied_slots": 0,
    }

    try:
        result = subprocess.run(
            ["dmidecode", "-t", "17"],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0:
            output = result.stdout
            # Divide por "Memory Device\n" para separar cada slot
            # O split em "Memory Device" pode pegar substrings - usamos regex
            blocks = re.split(r"^Memory Device$", output, flags=re.MULTILINE)
            for block in blocks[1:]:  # skip header
                if "Size:" not in block:
                    continue

                info["total_slots"] += 1

                size_line = re.search(r"Size:\s+(.+)", block)
                if not size_line:
                    continue
                size_text = size_line.group(1).strip()

                if "No Module" in size_text or "Not Installed" in size_text or size_text == "0":
                    continue

                size_match = re.match(r"(\d+)\s*(kB|MB|GB|TB)", size_text)
                if not size_match:
                    continue

                info["occupied_slots"] += 1
                size_val = int(size_match.group(1))
                size_unit = size_match.group(2)
                if size_unit == "kB":
                    size_gb = round(size_val / (1024 * 1024), 2)
                elif size_unit == "MB":
                    size_gb = round(size_val / 1024, 1)
                elif size_unit == "TB":
                    size_gb = size_val * 1024
                else:
                    size_gb = size_val

                speed_match = re.search(r"^\s*Speed:\s+(\d+)\s*(MHz|MT/s)", block, re.MULTILINE)
                conf_speed_match = re.search(r"Configured (?:Memory |Clock )?Speed:\s+(\d+)\s*(MHz|MT/s)", block)
                voltage_match = re.search(r"Configured Voltage:\s+([\d.]+)\s*V", block)
                if not voltage_match:
                    voltage_match = re.search(r"Minimum Voltage:\s+([\d.]+)\s*V", block)
                type_match = re.search(r"^\s*Type:\s+(\S+)", block, re.MULTILINE)
                locator_match = re.search(r"^\s*Locator:\s+(.+)", block, re.MULTILINE)
                bank_match = re.search(r"Bank Locator:\s+(.+)", block)
                manufacturer_match = re.search(r"Manufacturer:\s+(.+)", block)
                part_match = re.search(r"Part Number:\s+(.+)", block)
                serial_match = re.search(r"Serial Number:\s+(.+)", block)
                rank_match = re.search(r"Rank:\s+(\d+)", block)

                locator = locator_match.group(1).strip() if locator_match else "?"
                bank = bank_match.group(1).strip() if bank_match else ""
                manufacturer = manufacturer_match.group(1).strip() if manufacturer_match else "?"
                if manufacturer in ("Unknown", "Not Specified", "Undefined", ""):
                    manufacturer = "?"

                slot = {
                    "locator": locator,
                    "bank": bank,
                    "size_gb": size_gb,
                    "type": type_match.group(1).strip() if type_match else "?",
                    "speed_mhz": int(speed_match.group(1)) if speed_match else 0,
                    "configured_speed_mhz": int(conf_speed_match.group(1)) if conf_speed_match else 0,
                    "voltage": float(voltage_match.group(1)) if voltage_match else 0,
                    "manufacturer": manufacturer,
                    "part_number": part_match.group(1).strip() if part_match else "?",
                    "serial": serial_match.group(1).strip() if serial_match else "",
                    "rank": int(rank_match.group(1)) if rank_match else 0,
                }
                info["slots"].append(slot)
    except (subprocess.TimeoutExpired, FileNotFoundError, PermissionError) as e:
        print(f"⚠️  dmidecode não disponível ou sem permissão: {e}")

    return info


def get_system_info():
    info = {"hostname": "", "kernel": "", "os": "", "uptime": "", "board": "Desconhecida"}
    try:
        info["hostname"] = subprocess.run(["hostname"], capture_output=True, text=True).stdout.strip()
    except FileNotFoundError:
        pass
    try:
        info["kernel"] = subprocess.run(["uname", "-r"], capture_output=True, text=True).stdout.strip()
    except FileNotFoundError:
        pass
    try:
        with open("/etc/os-release") as f:
            for line in f:
                if line.startswith("PRETTY_NAME="):
                    info["os"] = line.split("=")[1].strip().strip('"')
                    break
    except FileNotFoundError:
        info["os"] = "Linux"
    try:
        def _read(p):
            try:
                with open(p) as f:
                    return f.read().strip()
            except (FileNotFoundError, PermissionError):
                return ""

        board_vendor = _read("/sys/class/dmi/id/board_vendor")
        board_name = _read("/sys/class/dmi/id/board_name")
        board_version = _read("/sys/class/dmi/id/board_version")
        product_name = _read("/sys/class/dmi/id/product_name")
        sys_vendor = _read("/sys/class/dmi/id/sys_vendor")

        # Filtra strings genéricas
        def _clean(s):
            if not s:
                return ""
            generic = ("default string", "to be filled by o.e.m.", "system manufacturer",
                       "system product name", "not specified", "none", "n/a", "oem", "unknown")
            return "" if s.lower().strip() in generic else s.strip()

        board_vendor = _clean(board_vendor)
        board_name = _clean(board_name)
        product_name = _clean(product_name)
        sys_vendor = _clean(sys_vendor)
        board_version = _clean(board_version)

        # Monta melhor identificação possível
        parts = []
        vendor = board_vendor or sys_vendor
        name = board_name or product_name
        if vendor:
            parts.append(vendor)
        if name:
            parts.append(name)
        if board_version and board_version not in (name, vendor):
            parts.append(f"({board_version})")

        # Fallback dmidecode
        if not parts:
            try:
                r = subprocess.run(["dmidecode", "-s", "baseboard-product-name"],
                                   capture_output=True, text=True, timeout=3)
                n = _clean(r.stdout.strip())
                r2 = subprocess.run(["dmidecode", "-s", "baseboard-manufacturer"],
                                    capture_output=True, text=True, timeout=3)
                v = _clean(r2.stdout.strip())
                if v: parts.append(v)
                if n: parts.append(n)
            except Exception:
                pass

        info["board"] = " ".join(parts) if parts else "Desconhecida"
    except PermissionError:
        info["board"] = "Desconhecida (precisa de root)"
    try:
        uptime_seconds = time.time() - psutil.boot_time()
        hours = int(uptime_seconds // 3600)
        minutes = int((uptime_seconds % 3600) // 60)
        info["uptime"] = f"{hours}h {minutes:02d}m"
    except Exception:
        info["uptime"] = "N/A"
    return info


def get_disk_info():
    """Obtém informações de todos os discos: partições, uso e I/O."""
    disks = []
    seen_devices = set()

    # Partições montadas
    for part in psutil.disk_partitions(all=False):
        if part.device in seen_devices:
            continue
        seen_devices.add(part.device)

        try:
            usage = psutil.disk_usage(part.mountpoint)
        except (PermissionError, OSError):
            continue

        disks.append({
            "device": part.device,
            "mountpoint": part.mountpoint,
            "fstype": part.fstype,
            "total_gb": round(usage.total / (1024**3), 1),
            "used_gb": round(usage.used / (1024**3), 1),
            "free_gb": round(usage.free / (1024**3), 1),
            "usage_percent": round(usage.percent, 1),
        })

    # I/O por disco
    io_counters = {}
    try:
        io = psutil.disk_io_counters(perdisk=True)
        if io:
            for name, counters in io.items():
                io_counters[name] = {
                    "read_bytes": counters.read_bytes,
                    "write_bytes": counters.write_bytes,
                    "read_count": counters.read_count,
                    "write_count": counters.write_count,
                }
    except Exception:
        pass

    return {"partitions": disks, "io": io_counters}


# ==================== CONTROLE DE PWM ====================

def set_fan_speed(pwm_path, pwm_enable_path, speed_percent):
    pwm_value = int(speed_percent * 255 / 100)
    pwm_value = max(0, min(255, pwm_value))
    try:
        if pwm_enable_path and os.path.exists(pwm_enable_path):
            with open(pwm_enable_path, "w") as f:
                f.write("1")
        with open(pwm_path, "w") as f:
            f.write(str(pwm_value))
        return True
    except PermissionError:
        print(f"ERRO: Sem permissão para escrever em {pwm_path}. Execute como root!")
        return False
    except Exception as e:
        print(f"ERRO ao definir fan: {e}")
        return False


def set_fan_auto(pwm_enable_path):
    try:
        if pwm_enable_path and os.path.exists(pwm_enable_path):
            with open(pwm_enable_path, "w") as f:
                f.write("2")
            return True
    except PermissionError:
        print(f"ERRO: Sem permissão. Execute como root!")
        return False
    except Exception as e:
        print(f"ERRO: {e}")
        return False


def get_available_profiles():
    """Detecta quais perfis de energia estão disponíveis baseado nos governadores do sistema."""
    available_governors = []
    avail_path = "/sys/devices/system/cpu/cpu0/cpufreq/scaling_available_governors"
    if os.path.exists(avail_path):
        try:
            with open(avail_path) as f:
                available_governors = f.read().strip().split()
        except (PermissionError, FileNotFoundError):
            pass

    has_pstate = os.path.exists("/sys/devices/system/cpu/intel_pstate")

    profiles = []
    if has_pstate:
        # intel_pstate sempre suporta todos os perfis via min/max_perf_pct
        profiles = ["silent", "balanced", "performance", "turbo"]
    else:
        if "powersave" in available_governors:
            profiles.append("silent")
        if any(g in available_governors for g in ("schedutil", "ondemand", "conservative")):
            profiles.append("balanced")
        if "performance" in available_governors:
            profiles.append("performance")
            profiles.append("turbo")

    # Fallback: se nada detectado, mostra balanced
    if not profiles:
        profiles = ["balanced"]

    return profiles, available_governors, has_pstate


def get_current_profile(available_governors, has_pstate):
    """Detecta o perfil atual baseado no governador e configurações."""
    current_governor = ""
    try:
        gov_path = "/sys/devices/system/cpu/cpu0/cpufreq/scaling_governor"
        if os.path.exists(gov_path):
            with open(gov_path) as f:
                current_governor = f.read().strip()
    except Exception:
        pass

    if has_pstate:
        max_perf = 100
        no_turbo = 0
        try:
            mp = "/sys/devices/system/cpu/intel_pstate/max_perf_pct"
            if os.path.exists(mp):
                with open(mp) as f:
                    max_perf = int(f.read().strip())
            nt = "/sys/devices/system/cpu/intel_pstate/no_turbo"
            if os.path.exists(nt):
                with open(nt) as f:
                    no_turbo = int(f.read().strip())
        except Exception:
            pass

        if current_governor == "powersave" and max_perf <= 50:
            return "silent"
        elif current_governor == "powersave":
            return "balanced"
        elif current_governor == "performance" and no_turbo == 0 and max_perf == 100:
            return "turbo"
        elif current_governor == "performance":
            return "performance"
        return "balanced"
    else:
        gov_to_profile = {
            "powersave": "silent",
            "conservative": "silent",
            "schedutil": "balanced",
            "ondemand": "balanced",
            "performance": "performance",
        }
        return gov_to_profile.get(current_governor, "balanced")


# ==================== SERVIDOR WEBSOCKET ====================

class SensorServer:
    def __init__(self):
        self.clients = set()
        self.hwmon_devices = {}
        self.temp_sensors = {}
        self.fan_sensors = {}
        self.pwm_controls = {}
        self.temp_history = deque(maxlen=60)
        self.system_info = {}
        self.memory_slots_cache = None
        self.temp_label_map = {}
        self.current_profile = "balanced"
        self.available_profiles = ["balanced"]
        self.available_governors = []
        self.has_pstate = False
        # RAPL power tracking
        self.rapl_path = None
        self.prev_rapl_energy = None
        self.prev_rapl_time = None
        self.current_power = 0
        # Disk I/O tracking
        self.prev_disk_io = {}
        self.prev_disk_time = None
        # Fan name mapping: sequential index -> pwm key
        self.fan_index_map = {}  # "fan1" -> "chip_pwm1", etc.

        self.detect_hardware()

    def _classify_temp_sensors(self):
        # Mapeia chips coretemp-isa-XXXX para socket index sequencial
        coretemp_chips = sorted({lbl.split("/")[0] for lbl in self.temp_sensors if "coretemp" in lbl.split("/")[0].lower()})
        chip_to_socket = {chip: idx for idx, chip in enumerate(coretemp_chips)}

        for label in self.temp_sensors:
            lower = label.lower()
            chip = label.split("/")[0] if "/" in label else ""
            sensor_name = label.split("/")[1] if "/" in label else label

            if "coretemp" in chip.lower():
                socket_idx = chip_to_socket.get(chip, 0)
                if "package" in lower:
                    self.temp_label_map[label] = f"cpu{socket_idx}_package"
                else:
                    # ex: "Core 0", "Core 14"
                    core_match = re.search(r"core\s*(\d+)", lower)
                    if core_match:
                        self.temp_label_map[label] = f"cpu{socket_idx}_core_{core_match.group(1)}"
                    else:
                        self.temp_label_map[label] = f"cpu{socket_idx}_{sensor_name.lower().replace(' ', '_')}"
            elif "k10temp" in chip.lower() or "zenpower" in chip.lower():
                # AMD: tdie/tctl
                socket_idx = chip_to_socket.get(chip, 0)
                if "tctl" in lower or "tdie" in lower or "tccd" not in lower:
                    self.temp_label_map[label] = f"cpu{socket_idx}_package"
                else:
                    self.temp_label_map[label] = f"cpu{socket_idx}_{sensor_name.lower().replace(' ', '_')}"
            elif "amdgpu" in chip.lower() or "radeon" in chip.lower() or "nouveau" in chip.lower():
                self.temp_label_map[label] = "gpu"
            elif "nvme" in chip.lower():
                self.temp_label_map[label] = f"nvme_{chip}"
            elif "nct" in chip.lower() or "it87" in chip.lower() or "w83" in chip.lower():
                if "systin" in lower or "system" in lower:
                    self.temp_label_map[label] = "board"
                elif "cputin" in lower:
                    self.temp_label_map[label] = "cpu_board"
                else:
                    self.temp_label_map[label] = sensor_name.lower().replace(" ", "_")
            else:
                self.temp_label_map[label] = sensor_name.lower().replace(" ", "_")

    def detect_hardware(self):
        print("=" * 60)
        print("🔍 MachCtrl - Detectando hardware...")
        print("=" * 60)

        self.hwmon_devices = find_hwmon_devices()

        if not self.hwmon_devices:
            print("⚠️  Nenhum dispositivo hwmon encontrado!")
        else:
            print(f"\n📦 Dispositivos hwmon: {len(self.hwmon_devices)}")
            for name, path in self.hwmon_devices.items():
                print(f"   • {name}: {path}")
                temps = find_temp_sensors(path)
                if temps:
                    self.temp_sensors.update({f"{name}/{k}": v for k, v in temps.items()})
                    for label in temps:
                        print(f"     🌡️  {label}")
                fans = find_fan_sensors(path)
                if fans:
                    self.fan_sensors.update({f"{name}/{k}": v for k, v in fans.items()})
                    for label in fans:
                        print(f"     🌀 {label}")

        self.pwm_controls = find_all_pwm()
        if self.pwm_controls:
            print(f"\n🎛️  Controles PWM: {len(self.pwm_controls)}")
            for i, (name, info) in enumerate(self.pwm_controls.items(), 1):
                self.fan_index_map[f"fan{i}"] = name
                print(f"   • fan{i} -> {name}: {info['pwm']}")

        self._classify_temp_sensors()
        print(f"\n🌡️  Mapa de temperaturas:")
        for label, category in self.temp_label_map.items():
            print(f"   • {label} → {category}")

        # Memória
        print("\n💾 Detectando slots de memória...")
        mem_info = get_memory_info()
        self.memory_slots_cache = {
            "slots": mem_info["slots"],
            "total_slots": mem_info["total_slots"],
            "occupied_slots": mem_info["occupied_slots"],
        }
        print(f"   Slots: {self.memory_slots_cache['occupied_slots']}/{self.memory_slots_cache['total_slots']} ocupados")
        for s in self.memory_slots_cache["slots"]:
            print(f"   • {s['locator']}: {s['size_gb']}GB {s['type']} @ {s['configured_speed_mhz']}MT/s {s['voltage']}V")

        # RAPL power
        self.rapl_path = get_cpu_power()
        if self.rapl_path:
            print(f"\n⚡ RAPL detectado: {self.rapl_path}")
        else:
            print("\n⚠️  RAPL não detectado - consumo não disponível")

        # Perfis de energia
        self.available_profiles, self.available_governors, self.has_pstate = get_available_profiles()
        self.current_profile = get_current_profile(self.available_governors, self.has_pstate)
        print(f"\n🔋 Perfis disponíveis: {self.available_profiles}")
        print(f"   Perfil atual: {self.current_profile}")
        print(f"   Governadores: {self.available_governors}")
        print(f"   intel_pstate: {self.has_pstate}")

        self.system_info = get_system_info()
        print(f"\n💻 Sistema: {self.system_info.get('os', 'N/A')}")
        print(f"   Placa: {self.system_info.get('board', 'N/A')}")
        print("=" * 60)
        print(f"🚀 Servidor WebSocket em ws://{WEBSOCKET_HOST}:{WEBSOCKET_PORT}")
        print("=" * 60)

    def read_all_sensors(self):
        now = datetime.now()

        # Temperaturas
        temperatures = {}
        for label, path in self.temp_sensors.items():
            value = read_sensor_file(path)
            if value is not None:
                category = self.temp_label_map.get(label, label)
                temp_c = round(value / 1000, 1)
                if -40 < temp_c < 150:
                    temperatures[category] = temp_c

        # Fans - enviar com índice sequencial para o frontend
        fans = {}
        fan_list = []
        for label, info in self.fan_sensors.items():
            rpm = read_sensor_file(info["input"])
            pwm_val = None
            pwm_path = info.get("pwm", "")
            if os.path.exists(pwm_path):
                pwm_val = read_sensor_file(pwm_path)
            speed_pct = round(pwm_val / 255 * 100) if pwm_val is not None else 0
            fan_list.append({
                "label": label,
                "rpm": rpm or 0,
                "speed_percent": speed_pct,
                "has_pwm": os.path.exists(pwm_path),
            })

        # CPU
        cpu_info = get_cpu_info()

        # CPU Power via RAPL
        if self.rapl_path:
            watts, energy, t = read_rapl_power(
                self.rapl_path, self.prev_rapl_energy, self.prev_rapl_time
            )
            self.prev_rapl_energy = energy
            self.prev_rapl_time = t
            if watts > 0:
                self.current_power = watts

        # CPU Voltage
        cpu_voltage = get_cpu_voltage()

        # Memória
        mem = psutil.virtual_memory()
        mem_info = {
            "usage": round(mem.percent, 1),
            "total_gb": round(mem.total / (1024**3), 1),
            "used_gb": round(mem.used / (1024**3), 1),
            "slots": self.memory_slots_cache["slots"] if self.memory_slots_cache else [],
            "total_slots": self.memory_slots_cache["total_slots"] if self.memory_slots_cache else 0,
            "occupied_slots": self.memory_slots_cache["occupied_slots"] if self.memory_slots_cache else 0,
        }

        # Discos
        disk_info = get_disk_info()
        # Calcula I/O rates
        disk_rates = {}
        now_time = time.time()
        if self.prev_disk_io and self.prev_disk_time:
            dt = now_time - self.prev_disk_time
            if dt > 0:
                for name, counters in disk_info["io"].items():
                    prev = self.prev_disk_io.get(name)
                    if prev:
                        read_rate = (counters["read_bytes"] - prev["read_bytes"]) / dt
                        write_rate = (counters["write_bytes"] - prev["write_bytes"]) / dt
                        disk_rates[name] = {
                            "read_mb_s": round(max(0, read_rate) / (1024 * 1024), 1),
                            "write_mb_s": round(max(0, write_rate) / (1024 * 1024), 1),
                        }
        self.prev_disk_io = disk_info["io"]
        self.prev_disk_time = now_time

        # Uptime
        self.system_info["uptime"] = get_system_info()["uptime"]

        # Histórico
        temp_point = {
            "time": now.strftime("%M:%S"),
            "cpu": temperatures.get("cpu", 0),
            "gpu": temperatures.get("gpu", 0),
            "board": temperatures.get("board", 0),
        }
        self.temp_history.append(temp_point)

        # Governador atual
        current_governor = ""
        try:
            gov_path = "/sys/devices/system/cpu/cpu0/cpufreq/scaling_governor"
            if os.path.exists(gov_path):
                with open(gov_path) as f:
                    current_governor = f.read().strip()
        except Exception:
            pass

        return {
            "type": "sensor_data",
            "timestamp": now.isoformat(),
            "temperatures": temperatures,
            "fans": fan_list,
            "cpu": cpu_info,
            "cpu_power": self.current_power,
            "cpu_voltage": cpu_voltage,
            "memory": mem_info,
            "disks": {
                "partitions": disk_info["partitions"],
                "io_rates": disk_rates,
            },
            "system": self.system_info,
            "temp_history": list(self.temp_history),
            "current_governor": current_governor,
            "current_profile": self.current_profile,
            "available_profiles": self.available_profiles,
            "detected_sensors": {
                "temp_count": len(self.temp_sensors),
                "fan_count": len(self.fan_sensors),
                "pwm_count": len(self.pwm_controls),
            },
            "pwm_names": list(self.pwm_controls.keys()),
            "fan_map": self.fan_index_map,
        }

    async def handler(self, websocket):
        self.clients.add(websocket)
        client_addr = websocket.remote_address
        print(f"✅ Cliente conectado: {client_addr}")
        try:
            data = self.read_all_sensors()
            data["type"] = "initial_data"
            await websocket.send(json.dumps(data))
            async for message in websocket:
                try:
                    cmd = json.loads(message)
                    await self.handle_command(websocket, cmd)
                except json.JSONDecodeError:
                    await websocket.send(json.dumps({"type": "error", "message": "JSON inválido"}))
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            self.clients.discard(websocket)
            print(f"❌ Cliente desconectado: {client_addr}")

    async def handle_command(self, websocket, cmd):
        action = cmd.get("action")

        if action == "set_fan_speed":
            fan_key = cmd.get("fan", "")
            speed = cmd.get("speed", 50)

            # Resolve "fan1" -> real PWM name
            pwm_name = self.fan_index_map.get(fan_key, fan_key)

            if pwm_name in self.pwm_controls:
                info = self.pwm_controls[pwm_name]
                success = set_fan_speed(info["pwm"], info.get("pwm_enable"), speed)
                await websocket.send(json.dumps({
                    "type": "command_result",
                    "action": "set_fan_speed",
                    "success": success,
                    "fan": fan_key,
                    "speed": speed,
                }))
            else:
                await websocket.send(json.dumps({
                    "type": "error",
                    "message": f"Fan '{fan_key}' não encontrado. Map: {self.fan_index_map}. PWMs: {list(self.pwm_controls.keys())}"
                }))

        elif action == "set_fan_auto":
            fan_key = cmd.get("fan", "")
            pwm_name = self.fan_index_map.get(fan_key, fan_key)
            if pwm_name in self.pwm_controls:
                info = self.pwm_controls[pwm_name]
                success = set_fan_auto(info.get("pwm_enable"))
                await websocket.send(json.dumps({
                    "type": "command_result",
                    "action": "set_fan_auto",
                    "success": success,
                    "fan": fan_key,
                }))

        elif action == "set_profile":
            profile_name = cmd.get("profile", "balanced")
            success = True
            applied_governor = ""

            try:
                cpu_count = psutil.cpu_count(logical=True) or 1

                if self.has_pstate:
                    gov_map = {
                        "silent": "powersave",
                        "balanced": "powersave",
                        "performance": "performance",
                        "turbo": "performance",
                    }
                else:
                    gov_map = {
                        "silent": "powersave",
                        "balanced": next((g for g in ("schedutil", "ondemand") if g in self.available_governors), "powersave"),
                        "performance": "performance",
                        "turbo": "performance",
                    }

                governor = gov_map.get(profile_name, "powersave")
                if governor not in self.available_governors and self.available_governors:
                    governor = self.available_governors[0]
                applied_governor = governor

                for i in range(cpu_count):
                    gov_path = f"/sys/devices/system/cpu/cpu{i}/cpufreq/scaling_governor"
                    if os.path.exists(gov_path):
                        try:
                            with open(gov_path, "w") as f:
                                f.write(governor)
                        except PermissionError:
                            success = False

                if self.has_pstate:
                    perf_settings = {
                        "silent":      {"no_turbo": "1", "min_perf": "15", "max_perf": "50"},
                        "balanced":    {"no_turbo": "0", "min_perf": "20", "max_perf": "80"},
                        "performance": {"no_turbo": "0", "min_perf": "30", "max_perf": "100"},
                        "turbo":       {"no_turbo": "0", "min_perf": "50", "max_perf": "100"},
                    }
                    settings = perf_settings.get(profile_name, perf_settings["balanced"])
                    for path, val in [
                        ("/sys/devices/system/cpu/intel_pstate/no_turbo", settings["no_turbo"]),
                        ("/sys/devices/system/cpu/intel_pstate/min_perf_pct", settings["min_perf"]),
                        ("/sys/devices/system/cpu/intel_pstate/max_perf_pct", settings["max_perf"]),
                    ]:
                        if os.path.exists(path):
                            try:
                                with open(path, "w") as f:
                                    f.write(val)
                            except PermissionError:
                                print(f"   ❌ Sem permissão: {path}")
                else:
                    if profile_name == "silent":
                        for i in range(cpu_count):
                            max_path = f"/sys/devices/system/cpu/cpu{i}/cpufreq/scaling_max_freq"
                            max_info = f"/sys/devices/system/cpu/cpu{i}/cpufreq/cpuinfo_max_freq"
                            if os.path.exists(max_path) and os.path.exists(max_info):
                                try:
                                    with open(max_info) as f:
                                        max_freq = int(f.read().strip())
                                    with open(max_path, "w") as f:
                                        f.write(str(int(max_freq * 0.6)))
                                except (PermissionError, ValueError):
                                    pass
                    else:
                        for i in range(cpu_count):
                            max_path = f"/sys/devices/system/cpu/cpu{i}/cpufreq/scaling_max_freq"
                            max_info = f"/sys/devices/system/cpu/cpu{i}/cpufreq/cpuinfo_max_freq"
                            if os.path.exists(max_path) and os.path.exists(max_info):
                                try:
                                    with open(max_info) as f:
                                        max_freq = f.read().strip()
                                    with open(max_path, "w") as f:
                                        f.write(max_freq)
                                except (PermissionError, ValueError):
                                    pass

                self.current_profile = profile_name
                print(f"✅ Perfil '{profile_name}' aplicado: governor={applied_governor}")

            except Exception as e:
                print(f"Erro ao aplicar perfil {profile_name}: {e}")
                success = False

            await websocket.send(json.dumps({
                "type": "command_result",
                "action": "set_profile",
                "success": success,
                "profile": profile_name,
                "governor": applied_governor,
            }))

        elif action == "get_sensors":
            data = self.read_all_sensors()
            await websocket.send(json.dumps(data))

    async def broadcast_loop(self):
        while True:
            if self.clients:
                data = self.read_all_sensors()
                message = json.dumps(data)
                dead_clients = set()
                for client in self.clients:
                    try:
                        await client.send(message)
                    except websockets.exceptions.ConnectionClosed:
                        dead_clients.add(client)
                self.clients -= dead_clients
            await asyncio.sleep(UPDATE_INTERVAL)

    async def run(self):
        async with websockets.serve(self.handler, WEBSOCKET_HOST, WEBSOCKET_PORT):
            print(f"🟢 MachCtrl Backend rodando em ws://{WEBSOCKET_HOST}:{WEBSOCKET_PORT}")
            await self.broadcast_loop()


if __name__ == "__main__":
    server = SensorServer()
    try:
        asyncio.run(server.run())
    except KeyboardInterrupt:
        print("\n🔴 MachCtrl Backend finalizado.")
