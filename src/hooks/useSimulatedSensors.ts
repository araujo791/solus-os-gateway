import { useState, useEffect, useCallback } from "react";

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
  const [profile, setProfile] = useState("balanced");

  useEffect(() => {
    const interval = setInterval(() => {
      const newCpu = Math.max(30, Math.min(95, cpuTemp + randomBetween(-3, 3)));
      const newGpu = Math.max(25, Math.min(90, gpuTemp + randomBetween(-2, 2)));
      const newBoard = Math.max(25, Math.min(55, boardTemp + randomBetween(-1, 1)));
      
      setCpuTemp(newCpu);
      setGpuTemp(newGpu);
      setBoardTemp(newBoard);
      setCpuUsage(Math.max(1, Math.min(100, cpuUsage + Math.round(randomBetween(-8, 8)))));
      setMemUsage(Math.max(20, Math.min(95, memUsage + Math.round(randomBetween(-3, 3)))));
      setFan1Rpm(Math.max(600, Math.min(3500, fan1Rpm + Math.round(randomBetween(-80, 80)))));
      setFan2Rpm(Math.max(500, Math.min(3000, fan2Rpm + Math.round(randomBetween(-60, 60)))));
      setFan3Rpm(Math.max(800, Math.min(4000, fan3Rpm + Math.round(randomBetween(-100, 100)))));
      setCpuFreq(Math.max(2.0, Math.min(5.2, cpuFreq + randomBetween(-0.2, 0.2))));
      setCpuVoltage(Math.max(0.9, Math.min(1.45, cpuVoltage + randomBetween(-0.02, 0.02))));
      setCpuPower(Math.max(15, Math.min(125, cpuPower + Math.round(randomBetween(-5, 5)))));

      setTempHistory((prev) => {
        const now = new Date();
        const newPoint = {
          time: now.toLocaleTimeString("pt-BR", { minute: "2-digit", second: "2-digit" }),
          cpu: newCpu,
          gpu: newGpu,
          board: newBoard,
        };
        return [...prev.slice(1), newPoint];
      });
    }, 2000);

    return () => clearInterval(interval);
  });

  return {
    cpuTemp, gpuTemp, boardTemp,
    cpuUsage, memUsage,
    fan1Rpm, fan2Rpm, fan3Rpm,
    fan1Speed, setFan1Speed,
    fan2Speed, setFan2Speed,
    fan3Speed, setFan3Speed,
    cpuFreq, cpuVoltage, cpuPower,
    tempHistory,
    profile, setProfile,
  };
}
