# Resource Monitor Dashboard Overlay

แผนพัฒนาแอปพลิเคชัน Dashboard สำหรับแสดง Performance Monitoring บน Windows (10/11) ในรูปแบบ Overlay Panel โดยใช้ **Tauri + React + TypeScript** เพื่อให้ได้ UI ที่สวยงาม ทันสมัยระดับพรีเมียม และที่สำคัญที่สุดคือ **กินทรัพยากรเครื่องน้อยมาก** (Low Overhead) ซึ่งเหมาะสมกับแอปประเภท Monitor มากกว่า Electron

## User Review Required

> [!IMPORTANT]
> **การตัดสินใจเลือก Technology Stack**
> ผมขอเสนอให้ใช้ **Tauri (Rust + React)** แทน Electron เนื่องจากแอปพลิเคชัน Monitor ควรจะดึงทรัพยากรเครื่องให้น้อยที่สุดเท่าที่จะทำได้ Tauri จะใช้ WebView ของระบบปฏิบัติการ ทำให้กิน RAM และ CPU น้อยกว่า Electron มาก คุณโอเคกับตัวเลือกนี้หรือไม่?

> [!IMPORTANT]
> **การเข้าถึงข้อมูล GPU**
> การดึงข้อมูล GPU (เช่น อุณหภูมิ, การทำงาน) บน Windows มีความซับซ้อนกว่า CPU/RAM ในเบื้องต้นผมจะใช้ Windows Management Instrumentation (WMI) หรือ Performance Counters เพื่อให้รองรับได้ทั้ง NVIDIA, AMD และ Intel หากต้องการข้อมูลเจาะลึก (เช่น Video Encode/Decode usage) อาจจะต้องเขียนเจาะจงค่าย (เช่น ใช้ nvml-wrapper สำหรับ NVIDIA) เบื้องต้นคุณต้องการให้เจาะลึกระดับไหนครับ?

## Open Questions

> [!WARNING]
> **ความถี่ในการอัปเดตข้อมูล (Refresh Rate)**
> คุณต้องการให้ข้อมูลอัปเดตบ่อยแค่ไหน? (เช่น ทุกๆ 1 วินาที หรือ 0.5 วินาที) การอัปเดตถี่เกินไปอาจจะส่งผลให้แอปใช้ CPU เพิ่มขึ้นเล็กน้อย

> [!WARNING]
> **การตกแต่งและดีไซน์ (Aesthetics)**
> ผมวางแผนจะใช้ดีไซน์แบบ Glassmorphism (พื้นหลังกึ่งโปร่งใส) พร้อมกับ Dark Mode และมี Micro-animations เล็กน้อยเพื่อให้ดูล้ำสมัยและพรีเมียม คุณมีโทนสีหรือสไตล์ที่ชอบเป็นพิเศษไหมครับ?

## Proposed Changes

การพัฒนาจะแบ่งออกเป็นส่วน Frontend (UI) และ Backend (Rust สำหรับดึงข้อมูลระบบ)

### 1. Project Initialization & Setup
- ติดตั้งและตั้งค่าโปรเจกต์ Tauri + Vite + React + TypeScript
- กำหนดให้แอปเป็นหน้าต่างแบบ Frameless (ไม่มีขอบ), Transparent (โปร่งใส) และ Always on Top (อยู่บนสุดเสมอ)

### 2. Backend (Rust - System Information Gathering)
พัฒนาส่วนดึงข้อมูล Hardware ผ่านไลบรารีของ Rust แล้วส่งไปยัง Frontend
#### [NEW] `src-tauri/src/system_monitor.rs`
- สร้างฟังก์ชันดึงข้อมูล **CPU**: Speed (GHz), Utilization (%), จำนวน Core
- สร้างฟังก์ชันดึงข้อมูล **RAM**: Total, Used, Available
- สร้างฟังก์ชันดึงข้อมูล **Disk**: Read/Write Speed, Total/Free Space
- สร้างฟังก์ชันดึงข้อมูล **Network**: Upload/Download Speed
- สร้างฟังก์ชันดึงข้อมูล **GPU**: Utilization, VRAM (ผ่าน WMI หรือ Performance Counters)

#### [MODIFY] `src-tauri/src/main.rs`
- ตั้งค่า Thread เพื่อวนลูปดึงข้อมูลจาก `system_monitor` และส่ง Event (IPC) ไปยัง Frontend ทุกๆ 1 วินาที

### 3. Frontend (React UI & Styling)
พัฒนา UI และ Component ต่างๆ โดยใช้ CSS บริสุทธิ์เพื่อให้จัดการประสิทธิภาพได้ดี
#### [NEW] `src/styles/design-system.css`
- กำหนด Color Palette, CSS Variables สำหรับ Glassmorphism, Font (เช่น Inter หรือ Roboto)

#### [NEW] `src/components/Dashboard.tsx`
- จัดการ Grid Layout สำหรับกล่องแสดงผล (CPU, RAM, Disk, Network, GPU)

#### [NEW] `src/components/widgets/...`
- `CpuWidget.tsx`: แสดงเปอร์เซ็นต์การทำงานแบบวงแหวน หรือกราฟแท่งเล็กๆ พร้อมระบุความเร็ว GHz
- `RamWidget.tsx`: แสดงพื้นที่การใช้งาน พร้อมตัวเลข Used / Total
- `DiskWidget.tsx`: แสดงความเร็ว Read / Write ปัจจุบันแบบกราฟเส้นเล็กๆ (Sparkline)
- `NetworkWidget.tsx`: แสดงความเร็ว Upload / Download ปัจจุบัน
- `GpuWidget.tsx`: แสดงเปอร์เซ็นต์การใช้งาน GPU และ VRAM

#### [NEW] `src/components/SettingsPanel.tsx`
- หน้าต่างตั้งค่า (อาจจะแสดงเมื่อคลิกขวาที่ Dashboard)
- เลือกขนาด S / M / L / XL ซึ่งจะเปลี่ยน CSS Transform/Scale ของแอป
- ปรับเปลี่ยนตำแหน่ง (Lock/Unlock Position เพื่อให้ใช้เมาส์ลากไปวางจุดที่ต้องการได้)

### 4. Window State Management
#### [MODIFY] `src-tauri/tauri.conf.json`
- ตั้งค่าการจำขนาดและตำแหน่งของหน้าต่าง (ใช้ `tauri-plugin-window-state`) เพื่อให้เปิดแอปครั้งถัดไปแล้วอยู่ตำแหน่งเดิม

## Verification Plan

### Automated Tests
- ทดสอบการดึงค่า (Unit test) ในส่วนของ Rust backend ว่าดึงค่า CPU, RAM กลับมาได้ถูกต้องและไม่เป็น 0

### Manual Verification
- รันคำสั่ง `npm run tauri dev` เพื่อเปิดแอปพลิเคชัน
- ตรวจสอบว่าแอปแสดงอยู่บนสุด (Always on top) และพื้นหลังโปร่งใสถูกต้อง
- ตรวจสอบค่า CPU/RAM ที่แสดงในแอป เทียบกับ Task Manager ของ Windows ว่าใกล้เคียงกันหรือไม่
- ลองคลิกเปลี่ยนขนาด (S/M/L/XL) และลากเปลี่ยนตำแหน่งหน้าต่าง
- ตรวจสอบ Performance Overhead ใน Task Manager ว่าแอป Dashboard ของเรากิน CPU และ RAM น้อย (เป้าหมายคือ RAM < 50MB และ CPU < 1%)
