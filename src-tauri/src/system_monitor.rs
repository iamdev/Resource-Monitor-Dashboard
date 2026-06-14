use serde::Serialize;
use std::time::Duration;
use sysinfo::{System, Networks, Disks};
use tauri::{AppHandle, Emitter};
use wmi::WMIConnection;
use serde::Deserialize;
use windows::Win32::Graphics::Dxgi::{
    CreateDXGIFactory, IDXGIFactory, DXGI_ADAPTER_DESC,
};

#[derive(Clone, Serialize)]
pub struct DiskStats {
    pub name: String,
    pub label: String,
    pub read_bytes: u64,
    pub write_bytes: u64,
    pub total_space: u64,
    pub available_space: u64,
}

#[derive(Clone, Serialize)]
pub struct NetStats {
    pub name: String,
    pub label: String,
    pub net_up: u64,
    pub net_down: u64,
}

#[derive(Clone, Serialize)]
pub struct GpuStats {
    pub name: String,
    pub usage_3d: f32,
    pub usage_encode: f32,
    pub dedicated_total: u64,
    pub dedicated_used: u64,
    pub shared_used: u64,
}

#[derive(Clone, Serialize)]
pub struct SystemStats {
    pub cpu_usage: f32,
    pub cpu_cores: usize,
    pub cpu_speed_mhz: u64,
    pub ram_total: u64,
    pub ram_used: u64,
    pub ram_available: u64,
    pub ram_cached: u64,
    pub gpus: Vec<GpuStats>,
    pub networks: Vec<NetStats>,
    pub network_offline: bool,
    pub disks: Vec<DiskStats>,
}

#[derive(Deserialize, Debug, Clone)]
#[serde(rename = "Win32_PerfFormattedData_PerfOS_Memory")]
#[serde(rename_all = "PascalCase")]
struct WmiMemory {
    CacheBytes: u64,
}

#[derive(Deserialize, Debug, Clone)]
#[serde(rename = "Win32_VideoController")]
#[serde(rename_all = "PascalCase")]
struct WmiVideoController {
    Name: String,
    AdapterRAM: Option<u64>,
}

#[derive(Deserialize, Debug, Clone)]
#[serde(rename = "Win32_PerfFormattedData_GPUPerformanceCounters_GPUAdapterMemory")]
#[serde(rename_all = "PascalCase")]
struct WmiGpuMemory {
    Name: String,
    DedicatedUsage: u64,
    SharedUsage: u64,
}

#[derive(Deserialize, Debug, Clone)]
#[serde(rename = "Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine")]
#[serde(rename_all = "PascalCase")]
struct WmiGpuEngine {
    Name: String,
    UtilizationPercentage: u32,
}

#[derive(Deserialize, Debug, Clone)]
#[serde(rename = "Win32_NetworkAdapterConfiguration")]
#[serde(rename_all = "PascalCase")]
struct WmiNetConfig {
    Description: String,
    IPAddress: Option<Vec<String>>,
    DefaultIPGateway: Option<Vec<String>>,
}

#[derive(Deserialize, Debug, Clone)]
#[serde(rename = "Win32_NetworkAdapter")]
#[serde(rename_all = "PascalCase")]
struct WmiNetAdapter {
    Description: String,
    NetConnectionId: Option<String>,
}

#[derive(Deserialize, Debug, Clone)]
#[serde(rename = "Win32_PerfFormattedData_PerfDisk_PhysicalDisk")]
#[serde(rename_all = "PascalCase")]
struct WmiPhysicalDisk {
    Name: String,
    DiskReadBytesPersec: u64,
    DiskWriteBytesPersec: u64,
}

pub fn start_monitor(app_handle: AppHandle) {
    std::thread::spawn(move || {
        let wmi_con = match WMIConnection::new() {
            Ok(w) => w,
            Err(e) => {
                eprintln!("Failed to initialize WMI connection: {:?}", e);
                return;
            }
        };

        let mut sys = System::new_all();
        let mut networks = Networks::new_with_refreshed_list();
        let mut disks = Disks::new_with_refreshed_list();
        
        loop {
            sys.refresh_cpu_usage();
            sys.refresh_memory();
            networks.refresh(true);
            disks.refresh(true);
            
            let cpu_usage = sys.global_cpu_usage();
            let cpu_cores = sys.cpus().len();
            
            // Average CPU speed in MHz
            let cpu_speed_mhz = if cpu_cores > 0 {
                sys.cpus().iter().map(|c| c.frequency()).sum::<u64>() / cpu_cores as u64
            } else {
                0
            };

            let ram_total = sys.total_memory();
            let ram_used = sys.used_memory();
            let ram_available = sys.available_memory();

            // Query WMI for Cached RAM
            let ram_cached = match wmi_con.query::<WmiMemory>() {
                Ok(mem) => mem.first().map(|m| m.CacheBytes).unwrap_or(0),
                Err(_) => 0,
            };

            // Query DXGI for GPU adapter details
            let dxgi_gpus = get_gpu_dxgi_info();

            // Query WMI for GPU details
            let gpu_mem_list: Vec<WmiGpuMemory> = wmi_con.query().unwrap_or_default();
            let gpu_engines: Vec<WmiGpuEngine> = wmi_con.query().unwrap_or_default();

            let mut gpus = Vec::new();
            for (description, dedicated_total, luid_str) in dxgi_gpus {
                // Ignore basic/remote display/render drivers
                if description.contains("Microsoft Basic Display") || description.contains("Remote Display") || description.contains("Microsoft Basic Render") {
                    continue;
                }

                // Match with WMI GPUAdapterMemory (case-insensitive contains for LUID)
                let usage = gpu_mem_list.iter().find(|m| m.Name.to_lowercase().contains(&luid_str.to_lowercase()));
                let dedicated_used = usage.map(|u| u.DedicatedUsage).unwrap_or(0);
                let shared_used = usage.map(|u| u.SharedUsage).unwrap_or(0);

                // Calculate 3D engine usage percentage (sum per engine ID, then max, capped at 100)
                let mut eng_3d_totals = std::collections::HashMap::new();
                for e in &gpu_engines {
                    if e.Name.to_lowercase().contains(&luid_str.to_lowercase()) && e.Name.contains("engtype_3D") {
                        if let Some(eng_id) = get_engine_id(&e.Name) {
                            *eng_3d_totals.entry(eng_id.to_string()).or_insert(0) += e.UtilizationPercentage;
                        } else {
                            *eng_3d_totals.entry("default".to_string()).or_insert(0) += e.UtilizationPercentage;
                        }
                    }
                }
                let util_3d = eng_3d_totals.values().cloned().max().unwrap_or(0).min(100);

                // Calculate Video Encode usage percentage (sum per engine ID, then max, capped at 100)
                let mut eng_encode_totals = std::collections::HashMap::new();
                for e in &gpu_engines {
                    if e.Name.to_lowercase().contains(&luid_str.to_lowercase()) && (e.Name.contains("engtype_VideoEncode") || e.Name.contains("engtype_VideoEncoder")) {
                        if let Some(eng_id) = get_engine_id(&e.Name) {
                            *eng_encode_totals.entry(eng_id.to_string()).or_insert(0) += e.UtilizationPercentage;
                        } else {
                            *eng_encode_totals.entry("default".to_string()).or_insert(0) += e.UtilizationPercentage;
                        }
                    }
                }
                let util_encode = eng_encode_totals.values().cloned().max().unwrap_or(0).min(100);

                gpus.push(GpuStats {
                    name: description,
                    usage_3d: (util_3d as f32).min(100.0),
                    usage_encode: (util_encode as f32).min(100.0),
                    dedicated_total,
                    dedicated_used,
                    shared_used,
                });
            }

            // Query WMI for Network Connection Info
            let net_configs: Vec<WmiNetConfig> = wmi_con.query().unwrap_or_default();
            let net_adapters: Vec<WmiNetAdapter> = wmi_con.query().unwrap_or_default();

            let mut active_nets = Vec::new();
            for config in &net_configs {
                if let Some(ref ips) = config.IPAddress {
                    if !ips.is_empty() {
                        let has_gateway = config.DefaultIPGateway.as_ref().map(|g| !g.is_empty()).unwrap_or(false);
                        if has_gateway {
                            let adapter = net_adapters.iter().find(|a| a.Description == config.Description);
                            if let Some(friendly_name) = adapter.and_then(|a| a.NetConnectionId.clone()) {
                                let lower_name = friendly_name.to_lowercase();
                                let label = if lower_name.contains("wi-fi") || lower_name.contains("wireless") || lower_name.contains("wlan") {
                                    "Wifi".to_string()
                                } else {
                                    "LAN".to_string()
                                };

                                // Get read/write speeds from sysinfo Networks
                                let mut net_up = 0;
                                let mut net_down = 0;
                                if let Some(sys_net) = networks.iter().find(|(name, _)| name.to_string() == friendly_name) {
                                    net_up = sys_net.1.transmitted();
                                    net_down = sys_net.1.received();
                                } else {
                                    for (name, data) in &networks {
                                        if name.to_lowercase().contains(&friendly_name.to_lowercase()) || friendly_name.to_lowercase().contains(&name.to_lowercase()) {
                                            net_up = data.transmitted();
                                            net_down = data.received();
                                            break;
                                        }
                                    }
                                }

                                active_nets.push(NetStats {
                                    name: friendly_name,
                                    label,
                                    net_up,
                                    net_down,
                                });
                            }
                        }
                    }
                }
            }

            let network_offline = active_nets.is_empty();

            // Query WMI for Disk performance
            let wmi_disks: Vec<WmiPhysicalDisk> = wmi_con.query().unwrap_or_default();
            let mut disks_stats = Vec::new();

            for disk in wmi_disks {
                if disk.Name != "_Total" {
                    let parts: Vec<&str> = disk.Name.split_whitespace().collect();
                    let drive_letters: Vec<String> = parts.iter()
                        .filter(|p| p.ends_with(':'))
                        .map(|p| p.to_string())
                        .collect();

                    let drive_label = if drive_letters.is_empty() {
                        "Disk".to_string()
                    } else {
                        drive_letters.join(", ")
                    };

                    let label = format!("Disk {} ({})", parts.first().unwrap_or(&""), drive_label);

                    // Find total/available size by summing up matching drive letters in sysinfo::Disks
                    let mut total_space = 0;
                    let mut available_space = 0;

                    for drive in &drive_letters {
                        let normalized_drive = format!("{}\\", drive);
                        if let Some(sys_disk) = disks.iter().find(|d| d.mount_point().to_string_lossy().to_string().contains(&normalized_drive) || d.mount_point().to_string_lossy().to_string().starts_with(drive)) {
                            total_space += sys_disk.total_space();
                            available_space += sys_disk.available_space();
                        }
                    }

                    disks_stats.push(DiskStats {
                        name: disk.Name.clone(),
                        label,
                        read_bytes: disk.DiskReadBytesPersec,
                        write_bytes: disk.DiskWriteBytesPersec,
                        total_space,
                        available_space,
                    });
                }
            }
            
            let stats = SystemStats {
                cpu_usage,
                cpu_cores,
                cpu_speed_mhz,
                ram_total,
                ram_used,
                ram_available,
                ram_cached,
                gpus,
                networks: active_nets,
                network_offline,
                disks: disks_stats,
            };
            
            let _ = app_handle.emit("system-stats", stats);
            
            std::thread::sleep(Duration::from_secs(1));
        }
    });
}

fn get_engine_id(name: &str) -> Option<&str> {
    if let Some(pos) = name.find("_eng_") {
        let start = pos + 5;
        if let Some(end) = name[start..].find('_') {
            return Some(&name[start..start + end]);
        }
    }
    None
}

fn get_gpu_dxgi_info() -> Vec<(String, u64, String)> {
    let mut results = Vec::new();
    unsafe {
        if let Ok(factory) = CreateDXGIFactory::<IDXGIFactory>() {
            let mut i = 0;
            while let Ok(adapter) = factory.EnumAdapters(i) {
                if let Ok(desc) = adapter.GetDesc() {
                    let description = String::from_utf16_lossy(&desc.Description);
                    let description = description.trim_matches('\0').to_string();
                    let luid_str = format!("luid_0x{:08X}_0x{:08X}", desc.AdapterLuid.HighPart as u32, desc.AdapterLuid.LowPart);
                    results.push((description, desc.DedicatedVideoMemory as u64, luid_str));
                }
                i += 1;
            }
        }
    }
    results
}
