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
  // Windows is case-insensitive with environment variables, but Node.js process.env keys are case-sensitive.
  // Find the actual key used for PATH (usually "Path" or "PATH" on Windows).
  const pathKey = Object.keys(env).find(k => k.toUpperCase() === 'PATH') || 'Path';
  env[pathKey] = `${env[pathKey] || ''};C:\\Users\\kamon\\.cargo\\bin`;
  execSync("npm run tauri build", { stdio: "inherit", shell: true, env });
} catch (err) {
  console.error("Tauri build failed!");
  process.exit(1);
}

// 3. Verify resource-monitor.exe exists
const exePath = path.join("src-tauri", "target", "release", "resource-monitor.exe");
if (!fs.existsSync(exePath)) {
  console.error(`Compiled executable not found at ${exePath}!`);
  process.exit(1);
}

// 4. Create release directory
if (!fs.existsSync("release")) {
  fs.mkdirSync("release");
  console.log("📁 Created release directory.");
}

// 5. Compress resource-monitor.exe to zip using PowerShell's Compress-Archive
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
> แตกไฟล์ ZIP แล้วรันไฟล์ **\`resource-monitor.exe\`** ได้ทันทีโดยไม่ต้องทำการติดตั้ง (Portable) และไม่จำเป็นต้องใช้สิทธิ์ Administrator (สิทธิ์แอดมิน) ในการรันแอป

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

## 🔑 วิธีการทำงานกับตัวแอปเพื่อปล่อยเผยแพร่ (Release & Sign & CI/CD)

### 📦 1. การ Build Release (คอมไพล์เพื่อปล่อยตัวจริง)
คุณสามารถรันสคริปต์อัตโนมัติในการคอมไพล์ บีบอัดเป็น ZIP อัปเดตไฟล์เอกสารนี้ และส่งขึ้น Git อัตโนมัติ:
\`\`\`bash
node build-release.cjs
\`\`\`
หรือหากต้องการคอมไพล์แบบปกติเฉลี่ยเฉพาะไฟล์ติดตั้งโดยไม่ต้องอัปเดต Git:
\`\`\`bash
npm run tauri build
\`\`\`
ไฟล์ที่คอมไพล์เสร็จจะถูกเก็บไว้ที่ \`src-tauri/target/release/\`

---

### 🛡️ 2. วิธีการทำ Self-Signed Certificate (แก้ปัญหา Unknown Publisher ในเครื่องทั่วไป)
หากแอปพลิเคชันยังไม่ได้ลงทะเบียนใบรับรองแบบเสียเงิน คุณสามารถสร้างใบรับรองความปลอดภัยสำหรับทดสอบด้วยตนเองเพื่อทำการลงชื่อ (Sign) ไฟล์แอปพลิเคชันได้:

#### ขั้นตอนที่ 1: สร้างใบรับรองขึ้นมาเองด้วย PowerShell (Run as Administrator)
\`\`\`powershell
New-SelfSignedCertificate -Type Custom -Subject "CN=ResourceMonitorDev, O=ResourceMonitor, C=TH" -KeyUsage DigitalSignature -FriendlyName "Resource Monitor Dev Cert" -CertStoreLocation "Cert:\\CurrentUser\\My" -NotAfter (Get-Date).AddYears(5)
\`\`\`

#### ขั้นตอนที่ 2: ส่งออกใบรับรองเป็นไฟล์ .pfx
1. กดปุ่ม Start พิมพ์ค้นหาและเปิดโปรแกรม **Manage user certificates** (certmgr.msc)
2. ไปที่โฟลเดอร์ **Personal** > **Certificates**
3. คลิกขวาใบรับรองที่สร้างขึ้นมาล่าสุด > **All Tasks** > **Export...**
4. เลือกส่งออก Private Key ตั้งรหัสผ่านของไฟล์ใบรับรอง และบันทึกไฟล์เป็นชื่อ \`cert.pfx\`

#### ขั้นตอนที่ 3: ใช้ Signtool ลงลายมือชื่อไฟล์แอป
รันคำสั่งด้วย \`signtool.exe\` เพื่อ Sign ไฟล์แอป (หากพิมพ์ signtool ตรง ๆ แล้วไม่เจอ ให้เรียกใช้ผ่านเส้นทางเต็มใน PowerShell):
\`\`\`powershell
& "C:\\Program Files (x86)\\Windows Kits\\10\\bin\\10.0.28000.0\\x64\\signtool.exe" sign /f cert.pfx /p [รหัสผ่านของคุณ] /t http://timestamp.digicert.com /fd SHA256 src-tauri/target/release/resource-monitor.exe
\`\`\`

#### ขั้นตอนที่ 4: การนำเข้าใบรับรองบนเครื่องอื่นเพื่อยอมรับแอป
ในเครื่องปลายทางที่จะทดสอบ ให้นำเข้าใบรับรองผ่าน PowerShell (Admin) ก่อนเปิดใช้งานเพื่อข้ามการแจ้งเตือน SmartScreen:
\`\`\`powershell
Import-Certificate -FilePath "cert.cer" -CertStoreLocation Cert:\\LocalMachine\\Root
\`\`\`

---

### 🤖 3. การใช้งาน GitHub Actions (CI/CD Build & Publish)
โปรเจกต์นี้ได้รับการติดตั้งระบบ CI/CD บน GitHub Actions เรียบร้อยแล้วผ่านไฟล์ \`.github/workflows/publish.yml\`:

#### ขั้นตอนการสั่งปล่อยเวอร์ชันใหม่บน GitHub:
1. พิมพ์คำสั่ง Tag เวอร์ชันบน Git แล้ว push ขึ้นไป:
   \`\`\`bash
   git tag v${version}
   git push origin v${version}
   \`\`\`
2. หรือไปที่หน้าเว็บ GitHub ของโปรเจกต์นี้ > แท็บ **Actions** > เลือกเวิร์กโฟลว์ **Build & Publish Release** > กดปุ่ม **Run workflow**
3. ระบบจะทำงานและสร้าง **Draft Release** พร้อมอัปโหลดไฟล์ติดตั้งให้คุณเลือกกด Publish บน GitHub ทันที!

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
