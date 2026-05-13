import { createContext, useContext, ReactNode } from "react";
import { useSimulatedSensors } from "@/hooks/useSimulatedSensors";

type SensorsValue = ReturnType<typeof useSimulatedSensors>;

const SensorsContext = createContext<SensorsValue | null>(null);

export function SensorsProvider({ children }: { children: ReactNode }) {
  const sensors = useSimulatedSensors();
  return <SensorsContext.Provider value={sensors}>{children}</SensorsContext.Provider>;
}

export function useSensors(): SensorsValue {
  const ctx = useContext(SensorsContext);
  if (!ctx) throw new Error("useSensors deve ser usado dentro de SensorsProvider");
  return ctx;
}
