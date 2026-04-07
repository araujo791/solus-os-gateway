import { useState, useEffect, useCallback, useRef } from "react";

function randomBetween(min: number, max: number) {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

function generateTempHistory() {
  const data = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 5000);
    data.push({
      time: time.toLocaleTimeString("pt-BR", { minute: "2-digit", second: "2-digit" }),
      cpu: randomBetween(35, 72),
      gpu: randomBetween(30, 68),
      board: randomBetween(28, 45),
    });
  }
  return data;
}

interface MemorySlot {
  locator: string;
  size_gb: number;
  type: string;
  speed_mhz: number;
  configured_speed_mhz: number;
  voltage: number;
  manufacturer: string;
  part_number: string;
}

interface DiskPartition {
  device: string;
  mountpoint: string;
  fstype: string;
  total_gb: number;
  used_gb: number;
  free_gb: number;
  usage_percent: number;
}

interface DiskIoRate {
  read_mb_s: number;
  write_mb_s: number;
}

interface FanEntry {
  label: string;
  rpm: number;
  speed_percent: number;
  has_pwm: boolean;
}

const WS_URL = "ws://localhost:8765";

export function useSimulatedSensors() {
  const [cpuTemp, setCpuTemp] = useState(52);
  const [gpuTemp, setGpuTemp] = useState(45);
  const [boardTemp, setBoardTemp] = useState(35);
  const [cpuUsage, setCpuUsage] = useState(23);
  const [memUsage, setMemUsage] = useState(41);
  const [fan1Rpm, setFan1Rpm] = useState(1200);
  const [fan2Rpm, setFan2Rpm] = useState(980);
  const [fan3Rpm, setFan3Rpm] = useState(1450);
  const [fan1Speed, setFan1Speed] = useState(45);
  const [fan2Speed, setFan2Speed] = useState(35);
  const [fan3Speed, setFan3Speed] = useState(55);
  const [cpuFreq, setCpuFreq] = useState(3.8);
  const [cpuVoltage, setCpuVoltage] = useState(1.25);
  const [cpuPower, setCpuPower] = useState(0);
  const [tempHistory, setTempHistory] = useState(generateTempHistory);
  const [memTotalGb, setMemTotalGb] = useState(32);
  const [memUsedGb, setMemUsedGb] = useState(13.1);
  const [memTotalSlots, setMemTotalSlots] = useState(0);
  const [memOccupiedSlots, setMemOccupiedSlots] = useState(0);
  const [memSlots, setMemSlots] = useState<MemorySlot[]>([]);
  const [profile, setProfile] = useState("balanced");
  const [availableProfiles, setAvailableProfiles] = useState<string[]>(["silent", "balanced", "performance", "turbo"]);
  const [connected, setConnected] = useState(false);
  const [systemInfo, setSystemInfo] = useState({
    board: "Machinist E5 D8 Max",
    cpu: "Xeon E5-2680 v4",
    kernel: "6.18.13-330.current",
    os: "Solus Linux",
    uptime: "0h 00m",
  });
  const [detectedSensors, setDetectedSensors] = useState({ tempCount: 0, fanCount: 0, pwmCount: 0 });
  const [fanLabels, setFanLabels] = useState<string[]>(["GPU Fan", "CPU Fan 1", "CPU Fan 2"]);
  const [diskPartitions, setDiskPartitions] = useState<DiskPartition[]>([]);
  const [diskIoRates, setDiskIoRates] = useState<Record<string, DiskIoRate>>({});

  const wsRef = useRef<WebSocket | null>(null);
  const simulationRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function processData(data: any) {
      // Temperaturas
      const temps = data.temperatures || {};
      if (temps.cpu !== undefined) setCpuTemp(temps.cpu);
      if (temps.gpu !== undefined) setGpuTemp(temps.gpu);
      if (temps.board !== undefined) setBoardTemp(temps.board);

      // CPU
      if (data.cpu) {
        setCpuUsage(Math.round(data.cpu.usage || 0));
        setCpuFreq(data.cpu.freq || 0);
      }
      if (data.cpu_power !== undefined && data.cpu_power > 0) setCpuPower(data.cpu_power);
      if (data.cpu_voltage !== undefined && data.cpu_voltage > 0) setCpuVoltage(data.cpu_voltage);

      // Memória
      if (data.memory) {
        setMemUsage(Math.round(data.memory.usage || 0));
        setMemTotalGb(data.memory.total_gb || 0);
        setMemUsedGb(data.memory.used_gb || 0);
        if (data.memory.total_slots !== undefined) setMemTotalSlots(data.memory.total_slots);
        if (data.memory.occupied_slots !== undefined) setMemOccupiedSlots(data.memory.occupied_slots);
        if (Array.isArray(data.memory.slots)) setMemSlots(data.memory.slots);
      }

      // Fans - agora é uma lista sequencial
      const fanList: FanEntry[] = Array.isArray(data.fans) ? data.fans : [];
      if (fanList.length > 0) {
        setFan1Rpm(fanList[0]?.rpm || 0);
        setFan1Speed(fanList[0]?.speed_percent || 0);
      }
      if (fanList.length > 1) {
        setFan2Rpm(fanList[1]?.rpm || 0);
        setFan2Speed(fanList[1]?.speed_percent || 0);
      }
      if (fanList.length > 2) {
        setFan3Rpm(fanList[2]?.rpm || 0);
        setFan3Speed(fanList[2]?.speed_percent || 0);
      }
      // Atualiza labels dos fans
      if (fanList.length > 0) {
        setFanLabels(fanList.map((f) => f.label || "Fan"));
      }

      // Discos
      if (data.disks) {
        if (Array.isArray(data.disks.partitions)) setDiskPartitions(data.disks.partitions);
        if (data.disks.io_rates) setDiskIoRates(data.disks.io_rates);
      }

      // Perfil de energia
      if (data.current_profile) setProfile(data.current_profile);
      if (Array.isArray(data.available_profiles) && data.available_profiles.length > 0) {
        setAvailableProfiles(data.available_profiles);
      }

      // Sistema
      if (data.system) {
        setSystemInfo({
          board: data.system.board || "Desconhecida",
          cpu: data.cpu?.model || "Desconhecido",
          kernel: data.system.kernel || "",
          os: data.system.os || "Linux",
          uptime: data.system.uptime || "",
        });
      }

      // Sensores detectados
      if (data.detected_sensors) {
        setDetectedSensors({
          tempCount: data.detected_sensors.temp_count || 0,
          fanCount: data.detected_sensors.fan_count || 0,
          pwmCount: data.detected_sensors.pwm_count || 0,
        });
      }

      // Histórico
      if (data.temp_history && data.temp_history.length > 0) {
        setTempHistory(data.temp_history.map((p: any) => ({
          time: p.time || "",
          cpu: p.cpu || 0,
          gpu: p.gpu || 0,
          board: p.board || 0,
        })));
      }
    }

    function connectWs() {
      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log("🟢 Conectado ao MachCtrl Backend");
          setConnected(true);
          if (simulationRef.current) {
            clearInterval(simulationRef.current);
            simulationRef.current = null;
          }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "sensor_data" || data.type === "initial_data") {
              processData(data);
            }
          } catch (e) {
            console.error("Erro ao processar dados:", e);
          }
        };

        ws.onclose = () => {
          console.log("🔴 Desconectado do backend. Usando dados simulados...");
          setConnected(false);
          wsRef.current = null;
          startSimulation();
          reconnectTimer = setTimeout(connectWs, 5000);
        };

        ws.onerror = () => {};
      } catch {
        startSimulation();
        reconnectTimer = setTimeout(connectWs, 5000);
      }
    }

    function startSimulation() {
      if (simulationRef.current) return;
      simulationRef.current = setInterval(() => {
        setCpuTemp((prev) => Math.max(30, Math.min(95, prev + randomBetween(-3, 3))));
        setGpuTemp((prev) => Math.max(25, Math.min(90, prev + randomBetween(-2, 2))));
        setBoardTemp((prev) => Math.max(25, Math.min(55, prev + randomBetween(-1, 1))));
        setCpuUsage((prev) => Math.max(1, Math.min(100, prev + Math.round(randomBetween(-8, 8)))));
        setMemUsage((prev) => Math.max(20, Math.min(95, prev + Math.round(randomBetween(-3, 3)))));
        setFan1Rpm((prev) => Math.max(600, Math.min(3500, prev + Math.round(randomBetween(-80, 80)))));
        setFan2Rpm((prev) => Math.max(500, Math.min(3000, prev + Math.round(randomBetween(-60, 60)))));
        setFan3Rpm((prev) => Math.max(800, Math.min(4000, prev + Math.round(randomBetween(-100, 100)))));
        setCpuFreq((prev) => Math.max(2.0, Math.min(5.2, prev + randomBetween(-0.2, 0.2))));
        setCpuVoltage((prev) => Math.max(0.9, Math.min(1.45, prev + randomBetween(-0.02, 0.02))));
        setCpuPower((prev) => Math.max(15, Math.min(125, prev + Math.round(randomBetween(-5, 5)))));

        setTempHistory((prev) => {
          const now = new Date();
          const newPoint = {
            time: now.toLocaleTimeString("pt-BR", { minute: "2-digit", second: "2-digit" }),
            cpu: Math.max(30, Math.min(95, (prev[prev.length - 1]?.cpu || 50) + randomBetween(-3, 3))),
            gpu: Math.max(25, Math.min(90, (prev[prev.length - 1]?.gpu || 45) + randomBetween(-2, 2))),
            board: Math.max(25, Math.min(55, (prev[prev.length - 1]?.board || 35) + randomBetween(-1, 1))),
          };
          return [...prev.slice(1), newPoint];
        });
      }, 2000);
    }

    connectWs();

    return () => {
      clearTimeout(reconnectTimer);
      if (wsRef.current) wsRef.current.close();
      if (simulationRef.current) clearInterval(simulationRef.current);
    };
  }, []);

  const sendCommand = useCallback((cmd: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(cmd));
    }
  }, []);

  const sendFanCommand = useCallback((fan: string, speed: number) => {
    sendCommand({ action: "set_fan_speed", fan, speed });
  }, [sendCommand]);

  const sendFanAuto = useCallback((fan: string) => {
    sendCommand({ action: "set_fan_auto", fan });
  }, [sendCommand]);

  const handleSetProfile = useCallback((profileId: string) => {
    setProfile(profileId);
    sendCommand({ action: "set_profile", profile: profileId });
  }, [sendCommand]);

  return {
    cpuTemp, gpuTemp, boardTemp,
    cpuUsage, memUsage, memTotalGb, memUsedGb, memTotalSlots, memOccupiedSlots, memSlots,
    fan1Rpm, fan2Rpm, fan3Rpm,
    fan1Speed, setFan1Speed: (v: number) => { setFan1Speed(v); sendFanCommand("fan1", v); },
    fan2Speed, setFan2Speed: (v: number) => { setFan2Speed(v); sendFanCommand("fan2", v); },
    fan3Speed, setFan3Speed: (v: number) => { setFan3Speed(v); sendFanCommand("fan3", v); },
    sendFanAuto,
    fanLabels,
    cpuFreq, cpuVoltage, cpuPower,
    tempHistory,
    profile, setProfile: handleSetProfile,
    availableProfiles,
    connected,
    systemInfo,
    detectedSensors,
    diskPartitions, diskIoRates,
  };
}
