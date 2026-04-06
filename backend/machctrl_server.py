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

# Caminhos do hwmon (detectados automaticamente)
HWMON_BASE = "/sys/class/hwmon"

# ==================== DETECÇÃO DE SENSORES ====================

def find_hwmon_devices():
    """Detecta automaticamente todos os dispositivos hwmon do sistema."""
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
    """Encontra todos os sensores de temperatura em um dispositivo hwmon."""
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
    """Encontra todos os sensores de fan em um dispositivo hwmon."""
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
            }
    return fans


def find_all_pwm():
    """Encontra todos os controles PWM no sistema."""
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
    """Lê um valor de um arquivo sysfs."""
    try:
        with open(path) as f:
            return int(f.read().strip())
    except (FileNotFoundError, ValueError, PermissionError):
        return None


def read_sensors_command():
    """Usa o comando 'sensors -j' para ler todos os sensores (fallback)."""
    try:
        result = subprocess.run(
            ["sensors", "-j"],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0:
            return json.loads(result.stdout)
    except (subprocess.TimeoutExpired, FileNotFoundError, json.JSONDecodeError):
        pass
    return None


def get_cpu_info():
    """Obtém informações do CPU via psutil e /proc/cpuinfo."""
    info = {
        "usage": psutil.cpu_percent(interval=None),
        "freq": 0,
        "cores": psutil.cpu_count(logical=False) or 0,
        "threads": psutil.cpu_count(logical=True) or 0,
    }
    
    freq = psutil.cpu_freq()
    if freq:
        info["freq"] = round(freq.current / 1000, 2)  # GHz
    
    # Tenta ler modelo do CPU
    try:
        with open("/proc/cpuinfo") as f:
            for line in f:
                if "model name" in line:
                    info["model"] = line.split(":")[1].strip()
                    break
    except FileNotFoundError:
        info["model"] = "Desconhecido"
    
    return info


def get_memory_info():
    """Obtém uso de memória e informações dos slots via dmidecode (como GtkStressTesting)."""
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
            # Cada "Memory Device" é um slot físico
            devices = output.split("Memory Device")
            for dev in devices[1:]:  # skip header
                # Ignora entradas que são sub-headers (Physical Memory Array etc.)
                if "Size:" not in dev:
                    continue
                
                info["total_slots"] += 1
                
                # Verifica se o slot está vazio
                size_line = re.search(r"Size:\s+(.+)", dev)
                if not size_line:
                    continue
                size_text = size_line.group(1).strip()
                
                # Slots vazios: "No Module Installed", "Not Installed", "0", etc.
                if "No Module" in size_text or "Not Installed" in size_text or size_text == "0":
                    continue
                
                size_match = re.match(r"(\d+)\s*(MB|GB|TB|kB)", size_text)
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

                # Extrai Speed (suporta MHz e MT/s)
                speed_match = re.search(r"^\s*Speed:\s+(\d+)\s*(MHz|MT/s)", dev, re.MULTILINE)
                conf_speed_match = re.search(r"Configured (?:Memory |Clock )?Speed:\s+(\d+)\s*(MHz|MT/s)", dev)
                voltage_match = re.search(r"Configured Voltage:\s+([\d.]+)\s*V", dev)
                if not voltage_match:
                    voltage_match = re.search(r"Minimum Voltage:\s+([\d.]+)\s*V", dev)
                type_match = re.search(r"^\s*Type:\s+(\S+)", dev, re.MULTILINE)
                locator_match = re.search(r"^\s*Locator:\s+(.+)", dev, re.MULTILINE)
                bank_match = re.search(r"Bank Locator:\s+(.+)", dev)
                manufacturer_match = re.search(r"Manufacturer:\s+(.+)", dev)
                part_match = re.search(r"Part Number:\s+(.+)", dev)
                serial_match = re.search(r"Serial Number:\s+(.+)", dev)
                rank_match = re.search(r"Rank:\s+(\d+)", dev)

                locator = locator_match.group(1).strip() if locator_match else "?"
                bank = bank_match.group(1).strip() if bank_match else ""
                manufacturer = manufacturer_match.group(1).strip() if manufacturer_match else "?"
                # Limpa fabricantes genéricos
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
    """Obtém informações do sistema."""
    info = {
        "hostname": "",
        "kernel": "",
        "os": "",
        "uptime": "",
    }
    
    try:
        info["hostname"] = subprocess.run(
            ["hostname"], capture_output=True, text=True
        ).stdout.strip()
    except FileNotFoundError:
        pass
    
    try:
        info["kernel"] = subprocess.run(
            ["uname", "-r"], capture_output=True, text=True
        ).stdout.strip()
    except FileNotFoundError:
        pass
    
    # Detecta distribuição
    try:
        with open("/etc/os-release") as f:
            for line in f:
                if line.startswith("PRETTY_NAME="):
                    info["os"] = line.split("=")[1].strip().strip('"')
                    break
    except FileNotFoundError:
        info["os"] = "Linux"
    
    # Detecta placa-mãe
    try:
        board_vendor = ""
        board_name = ""
        vendor_path = "/sys/class/dmi/id/board_vendor"
        name_path = "/sys/class/dmi/id/board_name"
        if os.path.exists(vendor_path):
            with open(vendor_path) as f:
                board_vendor = f.read().strip()
        if os.path.exists(name_path):
            with open(name_path) as f:
                board_name = f.read().strip()
        info["board"] = f"{board_vendor} {board_name}".strip() or "Desconhecida"
    except PermissionError:
        info["board"] = "Desconhecida (precisa de root)"
    
    # Uptime
    try:
        uptime_seconds = time.time() - psutil.boot_time()
        hours = int(uptime_seconds // 3600)
        minutes = int((uptime_seconds % 3600) // 60)
        info["uptime"] = f"{hours}h {minutes:02d}m"
    except Exception:
        info["uptime"] = "N/A"
    
    return info


# ==================== CONTROLE DE PWM ====================

def set_fan_speed(pwm_path, pwm_enable_path, speed_percent):
    """Define a velocidade de um fan (0-100%)."""
    pwm_value = int(speed_percent * 255 / 100)
    pwm_value = max(0, min(255, pwm_value))
    
    try:
        # Primeiro, habilita controle manual (1 = manual)
        if pwm_enable_path and os.path.exists(pwm_enable_path):
            with open(pwm_enable_path, "w") as f:
                f.write("1")
        
        # Define o valor PWM
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
    """Volta o fan para controle automático."""
    try:
        if pwm_enable_path and os.path.exists(pwm_enable_path):
            with open(pwm_enable_path, "w") as f:
                f.write("2")  # 2 = automático
            return True
    except PermissionError:
        print(f"ERRO: Sem permissão. Execute como root!")
        return False
    except Exception as e:
        print(f"ERRO: {e}")
        return False


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
        
        self.detect_hardware()
    
    def detect_hardware(self):
        """Detecta todo o hardware disponível."""
        print("=" * 60)
        print("🔍 MachCtrl - Detectando hardware...")
        print("=" * 60)
        
        self.hwmon_devices = find_hwmon_devices()
        
        if not self.hwmon_devices:
            print("⚠️  Nenhum dispositivo hwmon encontrado!")
            print("   Execute: sudo sensors-detect")
            print("   Depois: sudo modprobe <módulos sugeridos>")
        else:
            print(f"\n📦 Dispositivos hwmon encontrados: {len(self.hwmon_devices)}")
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
            print(f"\n🎛️  Controles PWM encontrados: {len(self.pwm_controls)}")
            for name, info in self.pwm_controls.items():
                print(f"   • {name}: {info['pwm']}")
        
        self.system_info = get_system_info()
        print(f"\n💻 Sistema: {self.system_info.get('os', 'N/A')}")
        print(f"   Kernel: {self.system_info.get('kernel', 'N/A')}")
        print(f"   Placa: {self.system_info.get('board', 'N/A')}")
        print(f"   Uptime: {self.system_info.get('uptime', 'N/A')}")
        print("=" * 60)
        print(f"🚀 Servidor WebSocket iniciando em ws://{WEBSOCKET_HOST}:{WEBSOCKET_PORT}")
        print("=" * 60)
    
    def read_all_sensors(self):
        """Lê todos os sensores e retorna os dados."""
        now = datetime.now()
        
        # Temperaturas
        temperatures = {}
        for label, path in self.temp_sensors.items():
            value = read_sensor_file(path)
            if value is not None:
                temperatures[label] = round(value / 1000, 1)  # millicelsius -> celsius
        
        # Fans
        fans = {}
        for label, info in self.fan_sensors.items():
            rpm = read_sensor_file(info["input"])
            fans[label] = {
                "rpm": rpm or 0,
                "has_pwm": os.path.exists(info.get("pwm", "")),
            }
        
        # PWM (velocidades atuais)
        for name, info in self.pwm_controls.items():
            pwm_val = read_sensor_file(info["pwm"])
            if pwm_val is not None:
                fans.setdefault(name, {})["speed_percent"] = round(pwm_val / 255 * 100)
        
        # CPU & Memória
        cpu_info = get_cpu_info()
        mem_info = get_memory_info()
        
        # Atualiza uptime
        self.system_info["uptime"] = get_system_info()["uptime"]
        
        # Histórico de temperatura
        temp_point = {
            "time": now.strftime("%M:%S"),
        }
        for label, value in temperatures.items():
            # Simplifica o nome para o gráfico
            simple_label = label.split("/")[-1].lower().replace(" ", "_")
            temp_point[simple_label] = value
        
        self.temp_history.append(temp_point)
        
        return {
            "type": "sensor_data",
            "timestamp": now.isoformat(),
            "temperatures": temperatures,
            "fans": fans,
            "cpu": cpu_info,
            "memory": mem_info,
            "system": self.system_info,
            "temp_history": list(self.temp_history),
            "detected_sensors": {
                "temp_count": len(self.temp_sensors),
                "fan_count": len(self.fan_sensors),
                "pwm_count": len(self.pwm_controls),
            },
        }
    
    async def handler(self, websocket):
        """Gerencia uma conexão WebSocket."""
        self.clients.add(websocket)
        client_addr = websocket.remote_address
        print(f"✅ Cliente conectado: {client_addr}")
        
        try:
            # Envia dados iniciais
            data = self.read_all_sensors()
            data["type"] = "initial_data"
            await websocket.send(json.dumps(data))
            
            # Escuta comandos do cliente
            async for message in websocket:
                try:
                    cmd = json.loads(message)
                    await self.handle_command(websocket, cmd)
                except json.JSONDecodeError:
                    await websocket.send(json.dumps({
                        "type": "error",
                        "message": "Comando JSON inválido"
                    }))
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            self.clients.discard(websocket)
            print(f"❌ Cliente desconectado: {client_addr}")
    
    async def handle_command(self, websocket, cmd):
        """Processa comandos do cliente."""
        action = cmd.get("action")
        
        if action == "set_fan_speed":
            pwm_name = cmd.get("fan")
            speed = cmd.get("speed", 50)
            
            if pwm_name in self.pwm_controls:
                info = self.pwm_controls[pwm_name]
                success = set_fan_speed(info["pwm"], info.get("pwm_enable"), speed)
                await websocket.send(json.dumps({
                    "type": "command_result",
                    "action": "set_fan_speed",
                    "success": success,
                    "fan": pwm_name,
                    "speed": speed,
                }))
            else:
                await websocket.send(json.dumps({
                    "type": "error",
                    "message": f"Fan '{pwm_name}' não encontrado. Disponíveis: {list(self.pwm_controls.keys())}"
                }))
        
        elif action == "set_fan_auto":
            pwm_name = cmd.get("fan")
            if pwm_name in self.pwm_controls:
                info = self.pwm_controls[pwm_name]
                success = set_fan_auto(info.get("pwm_enable"))
                await websocket.send(json.dumps({
                    "type": "command_result",
                    "action": "set_fan_auto",
                    "success": success,
                    "fan": pwm_name,
                }))
        
        elif action == "set_profile":
            profile_name = cmd.get("profile", "balanced")
            # Perfis de energia aplicam governador de CPU
            governors = {
                "silent": "powersave",
                "balanced": "ondemand",
                "performance": "performance",
                "turbo": "performance",
            }
            governor = governors.get(profile_name, "ondemand")
            success = True
            try:
                # Aplica governador a todos os cores (como GtkStressTesting)
                cpu_count = psutil.cpu_count(logical=True) or 1
                for i in range(cpu_count):
                    gov_path = f"/sys/devices/system/cpu/cpu{i}/cpufreq/scaling_governor"
                    if os.path.exists(gov_path):
                        try:
                            with open(gov_path, "w") as f:
                                f.write(governor)
                        except PermissionError:
                            success = False
                
                # Perfil turbo: desabilita intel_pstate no_turbo
                turbo_path = "/sys/devices/system/cpu/intel_pstate/no_turbo"
                if os.path.exists(turbo_path):
                    try:
                        with open(turbo_path, "w") as f:
                            f.write("0" if profile_name == "turbo" else "1" if profile_name == "silent" else "0")
                    except PermissionError:
                        pass
                
                # Perfil silent: limita frequência máxima
                if profile_name == "silent":
                    for i in range(psutil.cpu_count(logical=True) or 1):
                        max_path = f"/sys/devices/system/cpu/cpu{i}/cpufreq/scaling_max_freq"
                        min_info = f"/sys/devices/system/cpu/cpu{i}/cpufreq/cpuinfo_min_freq"
                        max_info = f"/sys/devices/system/cpu/cpu{i}/cpufreq/cpuinfo_max_freq"
                        if os.path.exists(max_path) and os.path.exists(max_info):
                            try:
                                with open(max_info) as f:
                                    max_freq = int(f.read().strip())
                                # Limita a 60% da frequência máxima
                                with open(max_path, "w") as f:
                                    f.write(str(int(max_freq * 0.6)))
                            except (PermissionError, ValueError):
                                pass
                else:
                    # Restaura frequência máxima
                    for i in range(psutil.cpu_count(logical=True) or 1):
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
                
            except Exception as e:
                print(f"Erro ao aplicar perfil {profile_name}: {e}")
                success = False
            
            await websocket.send(json.dumps({
                "type": "command_result",
                "action": "set_profile",
                "success": success,
                "profile": profile_name,
                "governor": governor,
            }))
        
        elif action == "get_sensors":
            data = self.read_all_sensors()
            await websocket.send(json.dumps(data))
    
    async def broadcast_loop(self):
        """Envia dados de sensores para todos os clientes periodicamente."""
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
        """Inicia o servidor."""
        async with websockets.serve(self.handler, WEBSOCKET_HOST, WEBSOCKET_PORT):
            print(f"🟢 MachCtrl Backend rodando em ws://{WEBSOCKET_HOST}:{WEBSOCKET_PORT}")
            await self.broadcast_loop()


if __name__ == "__main__":
    server = SensorServer()
    try:
        asyncio.run(server.run())
    except KeyboardInterrupt:
        print("\n🔴 MachCtrl Backend finalizado.")
