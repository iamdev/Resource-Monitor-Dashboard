const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log("🚀 Starting Build Process...");

// 1. Get version from package.json
if (!fs.existsSync("package.json")) {
  console.error("package.json not found!");
  process.exit(1);
}
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const version = packageJson.version;

// Format dates
const now = new Date();
const yyyy = now.getFullYear();
const mm = String(now.getMonth() + 1).padStart(2, '0');
const dd = String(now.getDate()).padStart(2, '0');
const dateStr = `${yyyy}${mm}${dd}`;
const formattedDate = `${yyyy}-${mm}-${dd}`;

console.log(`📦 App Version: ${version}`);
console.log(`📅 Date: ${formattedDate}`);

// 2. Run Tauri build with cargo path set in environment
console.log("🔨 Compiling production build (npm run tauri build)...");
try {
  const env = { ...process.env };
  // Append cargo user bin directory to PATH to make sure cargo metadata command works
  env.PATH = `${env.PATH};C:\\Users\\kamon\\.cargo\\bin`;
  execSync("npm run tauri build", { stdio: "inherit", shell: true, env });
} catch (err) {
  console.error("Tauri build failed!");
  process.exit(1);
}

// 3. Verify tauri-app.exe exists
const exePath = path.join("src-tauri", "target", "release", "tauri-app.exe");
if (!fs.existsSync(exePath)) {
  console.error(`Compiled executable not found at ${exePath}!`);
  process.exit(1);
}

// 4. Create release directory
if (!fs.existsSync("release")) {
  fs.mkdirSync("release");
  console.log("📁 Created release directory.");
}

// 5. Compress tauri-app.exe to zip using PowerShell's Compress-Archive
const zipName = `Resource_Monitor_v${version}_${dateStr}.zip`;
const zipPath = path.join("release", zipName);
console.log(`🤐 Compressing ${exePath} to ${zipPath}...`);

try {
  // If zip exists, remove it first
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }
  execSync(`powershell -Command "Compress-Archive -Path '${exePath}' -DestinationPath '${zipPath}' -Force"`, { stdio: 'inherit' });
} catch (err) {
  console.error("Compression failed:", err);
  process.exit(1);
}

// 6. Update README.md with download link and release details
console.log("📝 Updating README.md...");
const readmeContent = `# Resource Monitor Dashboard 🖥️

แอปพลิเคชันแดชบอร์ดแสดงสถานะฮาร์ดแวร์บนหน้าจอคอมพิวเตอร์ในรูปแบบ Overlay Panel กึ่งโปร่งใส (Glassmorphism) สวยงามระดับพรีเมียม พัฒนาด้วย **Tauri + React + TypeScript** น้ำหนักเบามาก กินทรัพยากรน้อยมาก (RAM < 20MB, CPU < 1%)

---

## 📥 ดาวน์โหลดเวอร์ชันล่าสุด (Download Release)

👉 [**ดาวน์โหลด Resource Monitor v${version} (${formattedDate})**](https://github.com/iamdev/Resource-Monitor-Dashboard/raw/main/release/${zipName})

> [!NOTE]  
> แตกไฟล์ ZIP แล้วรันไฟล์ **\`tauri-app.exe\`** ได้ทันทีโดยไม่ต้องทำการติดตั้ง (Portable) และไม่จำเป็นต้องใช้สิทธิ์ Administrator (สิทธิ์แอดมิน) ในการรันแอป

---

## ✨ คุณสมบัติของแดชบอร์ด (Features)
- **ปรับขนาดได้ 4 รูปแบบ (S / M / L / XL)** เพื่อให้เหมาะสมกับพื้นที่บนหน้าจอ
- **CPU**: แสดงความเร็วสัญญาณนาฬิกา (GHz) การใช้งานแยกแต่ละคอร์ และจำนวนคอร์หลัก
- **RAM**: แสดงข้อมูลการใช้งาน ความจุที่พร้อมใช้งาน (Available) และความจุแคช (Cached) แยกบรรทัดชัดเจน
- **GPU (การ์ดจอ)**: แสดง % การประมวลผล 3D, % Video Encode, การใช้งาน VRAM และการใช้งาน Shared VRAM แยกเป็นบรรทัดอย่างละเอียด (กรองการ์ดจอเสมือนออกให้อัตโนมัติ)
- **Disk (ฮาร์ดดิสก์)**: แสดงความเร็วในการอ่าน/เขียนแบบเรียลไทม์ และความจุว่าง (Free Space) แยกบรรทัดเรียงตามรายลูก
- **Network**: ตัวกรองพอร์ต LAN/Wifi อัจฉริยะ แสดงเฉพาะสายที่เชื่อมต่ออินเทอร์เน็ตอยู่ ณ ขณะนั้น (หากตัดการเชื่อมต่อจะขึ้น Offline)

---

## 🛠️ วิธีการติดตั้งเพื่อพัฒนาต่อ (Development Setup)

1. ติดตั้ง Node.js และ Rust บนเครื่องคอมพิวเตอร์ของคุณ
2. โคลนคลังโค้ดนี้:
   \`\`\`bash
   git clone https://github.com/iamdev/Resource-Monitor-Dashboard.git
   cd Resource-Monitor-Dashboard
   \`\`\`
3. ติดตั้ง Dependencies:
   \`\`\`bash
   npm install
   \`\`\`
4. รันโหมด Developer (พัฒนาไปพร้อมทดสอบ):
   \`\`\`bash
   npm run tauri dev
   \`\`\`

---

## 📋 รายละเอียดการปล่อยเวอร์ชันนี้ (Release Notes - v${version})
- **วันที่ปล่อยตัว**: ${formattedDate}
- **การอัปเกรดและการแก้ไขบั๊กล่าสุด**:
  - แก้ไขปัญหา VRAM เพี้ยนและการใช้งานทะลุ 160% โดยการดึงขนาดหน่วยความจำจริงผ่าน **DXGI API** และจัดกลุ่มคุมระดับ Utilized Engine
  - กรองการ์ดจอเสมือน \`Microsoft Basic Render Driver\` ออกให้อัตโนมัติ เหลือเฉพาะการ์ดจอตัวจริง
  - แยกรายละเอียดการแสดงผลของ **GPU (Enc, Vram, Shared)** และ **Disk (Read/Write, Free)** ออกเป็นคนละบรรทัดในโหมด XL เพื่อให้มีหน้าตาเหมือนหน้าต่าง Task Manager
  - แยกรายละเอียดความจุแรม **Available** (แสดงคำเต็ม) และ **Cached** แยกคนละบรรทัดในโหมด XL
`;

fs.writeFileSync("README.md", readmeContent, "utf8");

// 7. Git commit and push
console.log("🐙 Adding changes to Git...");
try {
  execSync("git add .", { stdio: "inherit" });
  execSync(`git commit -m "Release v${version} - ${formattedDate}"`, { stdio: "inherit" });
  console.log("📤 Pushing to Git Repository...");
  execSync("git push origin main", { stdio: "inherit" });
} catch (err) {
  console.error("Git operations failed:", err);
  process.exit(1);
}

console.log(`✅ Done! Release v${version} has been compiled, zipped, and pushed to Git successfully.`);
