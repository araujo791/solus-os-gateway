import { useSensors } from "@/contexts/SensorsContext";
import { MemoryPanel } from "@/components/dashboard/MemoryPanel";

export default function MemoryPage() {
  const s = useSensors();
  return (
    <MemoryPanel
      totalGb={s.memTotalGb}
      usedGb={s.memUsedGb}
      usage={s.memUsage}
      totalSlots={s.memTotalSlots}
      occupiedSlots={s.memOccupiedSlots}
      slots={s.memSlots}
    />
  );
}
