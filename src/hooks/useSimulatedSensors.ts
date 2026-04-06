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

interface SensorData {
  cpuTemp: number;
  gpuTemp: number;
  boardTemp: number;
  cpuUsage: number;
  memUsage: number;
  memTotalGb: number;
  memUsedGb: number;
  memTotalSlots: number;
  memOccupiedSlots: number;
  memSlots: MemorySlot[];
  fan1Rpm: number;
  fan2Rpm: number;
  fan3Rpm: number;
  fan1Speed: number;
  fan2Speed: number;
  fan3Speed: number;
  cpuFreq: number;
  cpuVoltage: number;
  cpuPower: number;
  tempHistory: { time: string; cpu: number; gpu: number; board: number }[];
  profile: string;
  connected: boolean;
  systemInfo: {
    board: string;
    cpu: string;
    kernel: string;
    os: string;
    uptime: string;
  };
  detectedSensors: {
    tempCount: number;
    fanCount: number;
    pwmCount: number;
  };
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
  const [cpuPower, setCpuPower] = useState(65);
  const [tempHistory, setTempHistory] = useState(generateTempHistory);
  const [memTotalGb, setMemTotalGb] = useState(32);
  const [memUsedGb, setMemUsedGb] = useState(13.1);
  const [memTotalSlots, setMemTotalSlots] = useState(4);
  const [memOccupiedSlots, setMemOccupiedSlots] = useState(2);
  const [memSlots, setMemSlots] = useState<MemorySlot[]>([
    { locator: "DIMM_A1", size_gb: 16, type: "DDR4", speed_mhz: 2400, configured_speed_mhz: 2133, voltage: 1.2, manufacturer: "Samsung", part_number: "M393A2K43CB2" },
    { locator: "DIMM_B1", size_gb: 16, type: "DDR4", speed_mhz: 2400, configured_speed_mhz: 2133, voltage: 1.2, manufacturer: "Samsung", part_number: "M393A2K43CB2" },
  ]);
  const [profile, setProfile] = useState("balanced");
  const [connected, setConnected] = useState(false);
  const [systemInfo, setSystemInfo] = useState({
    board: "Machinist E5 D8 Max",
    cpu: "Xeon E5-2680 v4",
    kernel: "6.18.13-330.current",
    os: "Solus Linux",
    uptime: "0h 00m",
  });
  const [detectedSensors, setDetectedSensors] = useState({ tempCount: 0, fanCount: 0, pwmCount: 0 });

  const wsRef = useRef<WebSocket | null>(null);
  const simulationRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tenta conectar ao backend real
  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connectWs() {
      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log("🟢 Conectado ao MachCtrl Backend");
          setConnected(true);
          // Para simulação quando conectado
          if (simulationRef.current) {
            clearInterval(simulationRef.current);
            simulationRef.current = null;
          }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "sensor_data" || data.type === "initial_data") {
              // Temperaturas - backend já envia com chaves classificadas (cpu, gpu, board)
              const temps = data.temperatures || {};
              if (temps.cpu !== undefined) setCpuTemp(temps.cpu);
              if (temps.gpu !== undefined) setGpuTemp(temps.gpu);
              if (temps.board !== undefined) setBoardTemp(temps.board);

              // CPU & Memória
              if (data.cpu) {
                setCpuUsage(Math.round(data.cpu.usage || 0));
                setCpuFreq(data.cpu.freq || 0);
              }
              if (data.memory) {
                setMemUsage(Math.round(data.memory.usage || 0));
                setMemTotalGb(data.memory.total_gb || 0);
                setMemUsedGb(data.memory.used_gb || 0);
                if (data.memory.total_slots !== undefined) setMemTotalSlots(data.memory.total_slots);
                if (data.memory.occupied_slots !== undefined) setMemOccupiedSlots(data.memory.occupied_slots);
                if (Array.isArray(data.memory.slots)) setMemSlots(data.memory.slots);
              }

              // Fans
              const fanEntries = Object.values(data.fans || {}) as any[];
              if (fanEntries.length > 0) {
                setFan1Rpm(fanEntries[0]?.rpm || 0);
                setFan1Speed(fanEntries[0]?.speed_percent || 0);
              }
              if (fanEntries.length > 1) {
                setFan2Rpm(fanEntries[1]?.rpm || 0);
                setFan2Speed(fanEntries[1]?.speed_percent || 0);
              }
              if (fanEntries.length > 2) {
                setFan3Rpm(fanEntries[2]?.rpm || 0);
                setFan3Speed(fanEntries[2]?.speed_percent || 0);
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

              // Histórico - backend já envia com cpu/gpu/board
              if (data.temp_history && data.temp_history.length > 0) {
                setTempHistory(data.temp_history.map((p: any) => ({
                  time: p.time || "",
                  cpu: p.cpu || 0,
                  gpu: p.gpu || 0,
                  board: p.board || 0,
                })));
              }
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
          // Tenta reconectar em 5s
          reconnectTimer = setTimeout(connectWs, 5000);
        };

        ws.onerror = () => {
          // Silencioso - onclose vai tratar
        };
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

  // Envia comandos ao backend
  const sendCommand = useCallback((cmd: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(cmd));
    }
  }, []);

  const sendFanCommand = useCallback((fan: string, speed: number) => {
    sendCommand({ action: "set_fan_speed", fan, speed });
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
    cpuFreq, cpuVoltage, cpuPower,
    tempHistory,
    profile, setProfile: handleSetProfile,
    connected,
    systemInfo,
    detectedSensors,
  };
}
