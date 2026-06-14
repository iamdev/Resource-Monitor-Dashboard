import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { 
  CpuIcon, 
  RamIcon, 
  GpuIcon, 
  NetworkLanIcon, 
  NetworkWifiIcon, 
  NetworkOfflineIcon, 
  DiskIcon 
} from "./components/Icons";

interface DiskStats {
  name: string;
  label: string;
  read_bytes: number;
  write_bytes: number;
  total_space: number;
  available_space: number;
}

interface NetStats {
  name: string;
  label: string;
  net_up: number;
  net_down: number;
}

interface GpuStats {
  name: string;
  usage_3d: number;
  usage_encode: number;
  dedicated_total: number;
  dedicated_used: number;
  shared_used: number;
}

interface SystemStats {
  cpu_usage: number;
  cpu_cores: number;
  cpu_speed_mhz: number;
  ram_total: number;
  ram_used: number;
  ram_available: number;
  ram_cached: number;
  gpus: GpuStats[];
  networks: NetStats[];
  network_offline: boolean;
  disks: DiskStats[];
}

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

const appWindow = getCurrentWindow();

function App() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [currentSize, setCurrentSize] = useState<'S' | 'M' | 'L' | 'XL'>('XL');
  const [widgetCount, setWidgetCount] = useState<number>(5);

  useEffect(() => {
    const unlisten = listen<SystemStats>("system-stats", (event) => {
      setStats(event.payload);
    });

    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  useEffect(() => {
    if (stats) {
      const gpusCount = stats.gpus.length;
      const netsCount = stats.networks.length > 0 ? stats.networks.length : 1;
      const disksCount = stats.disks.length;
      const newCount = 2 + gpusCount + netsCount + disksCount; // CPU (1) + RAM (1) + GPUs + Networks + Disks
      if (newCount !== widgetCount) {
        setWidgetCount(newCount);
      }
    }
  }, [stats, widgetCount]);

  const calculateHeight = (size: 'S' | 'M' | 'L' | 'XL', count: number) => {
    let baseHeight = 84; // header + padding + border offset
    let gap = 12;

    if (size === 'XL') {
      const gpusCount = stats?.gpus.length || 0;
      const netsCount = stats?.networks.length && stats.networks.length > 0 ? stats.networks.length : 1;
      const disksCount = stats?.disks.length || 0;
      
      const cpuHeight = 70;
      const ramHeight = 84; // Taller because Available and Cached are on separate lines (3 lines total)
      const gpuHeight = 98; // Taller because Enc, VRAM, and Shared are all on separate lines (4 lines total)
      const netHeight = 70;
      const diskHeight = 84; // Taller because Free is on a new line (3 lines total)
      
      const totalWidgetsHeight = cpuHeight + ramHeight + (gpuHeight * gpusCount) + (netHeight * netsCount) + (diskHeight * disksCount);
      return baseHeight + totalWidgetsHeight + ((count - 1) * gap);
    }

    let widgetHeight = 70;
    switch (size) {
      case 'S':
        widgetHeight = 36;
        gap = 8;
        break;
      case 'M':
        widgetHeight = 44;
        gap = 10;
        break;
      case 'L':
        widgetHeight = 56;
        gap = 12;
        break;
    }

    return baseHeight + (count * widgetHeight) + ((count - 1) * gap);
  };

  const [windowHeight, setWindowHeight] = useState<number>(0);

  useEffect(() => {
    const height = calculateHeight(currentSize, widgetCount);
    if (height !== windowHeight) {
      setWindowHeight(height);
    }
  }, [currentSize, widgetCount, stats]);

  useEffect(() => {
    if (windowHeight > 0) {
      const resizeWindow = async () => {
        let width = 280;
        try {
          await appWindow.setSize(new LogicalSize(width, windowHeight));
        } catch (err) {
          console.error("Failed to resize window:", err);
        }
      };
      resizeWindow();
    }
  }, [windowHeight]);

  const handleResize = (size: 'S' | 'M' | 'L' | 'XL') => {
    setCurrentSize(size);
  };

  const renderWidget = (
    type: string,
    icon: React.ReactNode,
    label: string,
    value: string,
    detailL?: React.ReactNode,
    detailXL?: React.ReactNode
  ) => {
    return (
      <div className={`widget ${type}`} data-tauri-drag-region>
        <div style={{ display: 'flex', alignItems: 'center' }} data-tauri-drag-region>
          <div className="widget-icon" data-tauri-drag-region>{icon}</div>
          {currentSize !== 'S' && (
            <div className="widget-title" style={{ marginLeft: '12px' }} data-tauri-drag-region>{label}</div>
          )}
        </div>
        <div className="widget-info" style={{ alignItems: 'flex-end', textAlign: 'right' }} data-tauri-drag-region>
          <div className="widget-value" data-tauri-drag-region>{value}</div>
          {currentSize === 'L' && detailL && (
            <div className="widget-subvalue" data-tauri-drag-region>{detailL}</div>
          )}
          {currentSize === 'XL' && detailXL && (
            <div className="widget-subvalue" data-tauri-drag-region>{detailXL}</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div 
      className={`dashboard-container ${currentSize.toLowerCase()}`}
      data-tauri-drag-region 
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="header-controls" data-tauri-drag-region style={{ display: 'flex', gap: '8px', marginBottom: '8px', justifyContent: 'space-between', alignItems: 'center' }}>
        <div data-tauri-drag-region style={{ fontSize: '10px', color: '#8892b0', fontWeight: 'bold', letterSpacing: '0.5px' }}>
          MONITOR
        </div>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {(['S', 'M', 'L', 'XL'] as const).map((sz) => (
            <button 
              key={sz} 
              onClick={() => handleResize(sz)} 
              style={{ 
                padding: '2px 6px', 
                fontSize: '10px', 
                background: currentSize === sz ? 'rgba(0, 210, 255, 0.4)' : 'rgba(255, 255, 255, 0.1)', 
                border: currentSize === sz ? '1px solid rgba(0, 210, 255, 0.6)' : 'none', 
                color: '#fff', 
                borderRadius: '4px', 
                cursor: 'pointer',
                fontWeight: currentSize === sz ? 'bold' : 'normal',
                transition: 'all 0.2s ease'
              }}
            >
              {sz}
            </button>
          ))}
          <button 
            onClick={() => appWindow.close()} 
            style={{ 
              padding: '2px 6px', 
              fontSize: '10px', 
              background: 'rgba(255, 60, 60, 0.2)', 
              border: 'none', 
              color: '#ff6b6b', 
              borderRadius: '4px', 
              cursor: 'pointer',
              fontWeight: 'bold',
              marginLeft: '4px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 60, 60, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 60, 60, 0.2)';
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* CPU Widget */}
      {renderWidget(
        "cpu",
        <CpuIcon size={currentSize === 'S' ? 14 : currentSize === 'M' ? 16 : 18} />,
        "CPU",
        stats ? `${stats.cpu_usage.toFixed(1)}%` : "0.0%",
        stats ? `${(stats.cpu_speed_mhz / 1000).toFixed(2)} GHz` : "0.0 GHz",
        stats ? `${(stats.cpu_speed_mhz / 1000).toFixed(2)} GHz | ${stats.cpu_cores} Cores` : "0 Cores"
      )}

      {/* RAM Widget */}
      {renderWidget(
        "ram",
        <RamIcon size={currentSize === 'S' ? 14 : currentSize === 'M' ? 16 : 18} />,
        "RAM",
        stats ? formatBytes(stats.ram_used) : "0 B",
        stats ? `Available: ${formatBytes(stats.ram_available)}` : "Available: 0 B",
        stats ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div>Available: {formatBytes(stats.ram_available)}</div>
            <div>Cached: {formatBytes(stats.ram_cached)}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div>Available: 0 B</div>
            <div>Cached: 0 B</div>
          </div>
        )
      )}

      {/* GPU Widgets */}
      {stats && stats.gpus.map((gpu, index) => {
        const vramPercent = gpu.dedicated_total > 0 
          ? Math.min(Math.round((gpu.dedicated_used / gpu.dedicated_total) * 100), 100).toString()
          : "0";
        const valStr = `${gpu.usage_3d.toFixed(0)}%`;
        return renderWidget(
          "gpu",
          <GpuIcon size={currentSize === 'S' ? 14 : currentSize === 'M' ? 16 : 18} />,
          stats.gpus.length > 1 ? `GPU ${index}` : "GPU",
          valStr,
          `Enc: ${gpu.usage_encode.toFixed(0)}% | VRAM: ${vramPercent}%`,
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div>Enc: {gpu.usage_encode.toFixed(0)}%</div>
            <div>VRAM: {vramPercent}% ({formatBytes(gpu.dedicated_used)}/{formatBytes(gpu.dedicated_total)})</div>
            <div>Shared: {formatBytes(gpu.shared_used)}</div>
          </div>
        );
      })}

      {/* Network Widgets */}
      {stats && (stats.network_offline || stats.networks.length === 0 ? (
        renderWidget(
          "net offline",
          <NetworkOfflineIcon size={currentSize === 'S' ? 14 : currentSize === 'M' ? 16 : 18} />,
          "NET",
          "Offline",
          "Disconnected",
          "No internet connection active"
        )
      ) : (
        stats.networks.map((net) => 
          renderWidget(
            "net",
            net.label === "Wifi" ? 
              <NetworkWifiIcon size={currentSize === 'S' ? 14 : currentSize === 'M' ? 16 : 18} /> : 
              <NetworkLanIcon size={currentSize === 'S' ? 14 : currentSize === 'M' ? 16 : 18} />,
            net.label,
            `↓ ${formatBytes(net.net_down)}/s`,
            `↑ ${formatBytes(net.net_up)}/s`,
            `↓ ${formatBytes(net.net_down)}/s | ↑ ${formatBytes(net.net_up)}/s`
          )
        )
      ))}

      {/* Disk Widgets */}
      {stats && stats.disks.map((disk) => 
        renderWidget(
          "disk",
          <DiskIcon size={currentSize === 'S' ? 14 : currentSize === 'M' ? 16 : 18} />,
          disk.label,
          `↓ ${formatBytes(disk.write_bytes)}/s`,
          `Read: ${formatBytes(disk.read_bytes)}/s`,
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div>R: {formatBytes(disk.read_bytes)}/s | W: {formatBytes(disk.write_bytes)}/s</div>
            <div>Free: {formatBytes(disk.available_space)} / {formatBytes(disk.total_space)}</div>
          </div>
        )
      )}
    </div>
  );
}

export default App;
