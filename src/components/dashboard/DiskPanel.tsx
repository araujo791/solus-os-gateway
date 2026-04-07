import { HardDrive } from "lucide-react";

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

interface DiskPanelProps {
  partitions: DiskPartition[];
  ioRates: Record<string, DiskIoRate>;
}

function getDeviceShortName(device: string): string {
  // /dev/sda1 -> sda1, /dev/nvme0n1p1 -> nvme0n1p1
  return device.replace("/dev/", "");
}

function getBaseDiskName(device: string): string {
  // sda1 -> sda, nvme0n1p1 -> nvme0n1
  const short = getDeviceShortName(device);
  const nvme = short.match(/^(nvme\d+n\d+)/);
  if (nvme) return nvme[1];
  const sd = short.match(/^(sd[a-z]+)/);
  if (sd) return sd[1];
  return short;
}

export function DiskPanel({ partitions, ioRates }: DiskPanelProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Discos
      </h3>

      {partitions.length === 0 && (
        <p className="font-mono text-[10px] text-muted-foreground opacity-50">
          Nenhum disco detectado
        </p>
      )}

      <div className="space-y-2">
        {partitions.map((part, i) => {
          const shortName = getDeviceShortName(part.device);
          const baseName = getBaseDiskName(part.device);
          const io = ioRates[baseName];

          return (
            <div
              key={i}
              className="rounded border border-border bg-background/50 p-2.5 transition-all hover:border-primary/30"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <HardDrive className="h-3.5 w-3.5 text-primary" />
                  <span className="font-display text-[10px] font-semibold uppercase tracking-wider text-foreground">
                    {shortName}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {part.mountpoint}
                  </span>
                </div>
                <span className="font-mono text-xs font-bold text-primary">
                  {part.usage_percent}%
                </span>
              </div>

              {/* Barra de uso */}
              <div className="mb-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    part.usage_percent > 90
                      ? "bg-destructive"
                      : part.usage_percent > 70
                      ? "bg-warning"
                      : "bg-primary"
                  }`}
                  style={{ width: `${part.usage_percent}%` }}
                />
              </div>

              <div className="flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[10px] text-muted-foreground">
                <span>
                  <span className="text-foreground">{part.used_gb}</span> / {part.total_gb} GB
                </span>
                <span className="text-muted-foreground/60">{part.fstype}</span>
                {io && (
                  <>
                    <span>
                      R: <span className="text-primary">{io.read_mb_s}</span> MB/s
                    </span>
                    <span>
                      W: <span className="text-accent">{io.write_mb_s}</span> MB/s
                    </span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
