use windows::core::Interface;
use windows::Win32::Graphics::Dxgi::{
    CreateDXGIFactory, IDXGIFactory, IDXGIAdapter, DXGI_ADAPTER_DESC,
};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    unsafe {
        let factory: IDXGIFactory = CreateDXGIFactory()?;
        let mut i = 0;
        loop {
            let adapter = factory.EnumAdapters(i);
            if adapter.is_err() {
                break;
            }
            let adapter = adapter.unwrap();
            let desc = adapter.GetDesc()?;

            let description = String::from_utf16_lossy(&desc.Description);
            let description = description.trim_matches('\0');
            println!("Adapter {}: {}", i, description);
            println!("  Dedicated Video Memory: {} MB", desc.DedicatedVideoMemory / 1024 / 1024);
            println!("  Shared System Memory: {} MB", desc.SharedSystemMemory / 1024 / 1024);
            
            i += 1;
        }
    }
    Ok(())
}
