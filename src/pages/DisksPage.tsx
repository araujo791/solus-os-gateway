import { useSensors } from "@/contexts/SensorsContext";
import { DiskPanel } from "@/components/dashboard/DiskPanel";

export default function DisksPage() {
  const s = useSensors();
  return <DiskPanel partitions={s.diskPartitions} ioRates={s.diskIoRates} />;
}
