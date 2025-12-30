// --- 1. ตั้งค่าการเชื่อมต่อ Google Sheet ---
const sheetID = "1bkpz-iG4B8qnvZc4ql4qE15Qw8HrIZ1aeX1vZQzMFy0";
const sheetName = "LOGIN";
const baseURL = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?tqx=out:json&sheet=${sheetName}&t=${Date.now()}`;

// --- 2. อ้างอิง Element จาก HTML ---
const loginForm = document.getElementById("loginForm");
const errorMessage = document.getElementById("error-message");

// --- 3. ฟังก์ชันดึงข้อมูลจาก Google Sheet ---
async function getLoginData() {
    try {
        const res = await fetch(baseURL);
        const text = await res.text();
        
        // ตัดข้อความส่วนเกินจาก JSON ของ Google
        const json = JSON.parse(text.substring(47).slice(0, -2));

        // แปลงข้อมูลแถวใน Sheet ให้เป็น Object
        return json.table.rows.map(r => ({
            ID: r.c[0]?.v?.toString().trim(),           // คอลัมน์ A
            Pass: r.c[1]?.v?.toString().trim(),         // คอลัมน์ B
            Status: r.c[2]?.v?.toString().trim().toLowerCase(), // คอลัมน์ C
            Name: r.c[3]?.v?.toString().trim()          // คอลัมน์ D (ชื่อจริง)
        }));

    } catch (err) {
        console.error("โหลดข้อมูลไม่สำเร็จ:", err);
        if (errorMessage) errorMessage.textContent = "ไม่สามารถเชื่อมต่อฐานข้อมูลได้";
        return [];
    }
}

// --- 4. ระบบตรวจสอบการ Login ---
loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    
    if (errorMessage) errorMessage.textContent = "กำลังตรวจสอบ...";

    const usernameInput = document.getElementById("username").value.trim().toLowerCase();
    const passwordInput = document.getElementById("password").value.trim().toLowerCase();

    const loginData = await getLoginData();
    if (loginData.length === 0) return;

    // ค้นหา User ที่ระบุ
    const user = loginData.find(u => 
        u.ID?.toLowerCase() === usernameInput && 
        u.Pass?.toLowerCase() === passwordInput
    );

    if (user) {
        // บันทึกข้อมูลลงเครื่อง (Dashboard จะมาดึงค่า Name จากตรงนี้ไปโชว์)
        localStorage.setItem("loginUser", JSON.stringify(user));

        // นำทางไปยังหน้า Dashboard ตามสิทธิ์ (เช็คชื่อไฟล์ให้ตรงกับที่คุณมี)
        if (user.Status === "admin") {
            window.location.href = "adminDashboard.html"; 
        } else {
            window.location.href = "userDashboard.html"; 
        }
    } else {
        if (errorMessage) errorMessage.textContent = "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";
    }
});
