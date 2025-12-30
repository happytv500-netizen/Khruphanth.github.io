// --- 1. ตั้งค่า Google Sheet ---
const sheetID = "1bkpz-iG4B8qnvZc4ql4qE15Qw8HrIZ1aeX1vZQzMFy0";
const sheetName = "LOGIN";
const baseURL = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?tqx=out:json&sheet=${sheetName}`;

const loginForm = document.getElementById("loginForm");
const errorMessage = document.getElementById("error-message");

// --- 2. ดึงข้อมูล login (เวอร์ชันทน) ---
async function getLoginData() {
  try {
    const res = await fetch(baseURL);
    const text = await res.text();

    // แกะ JSON แบบไม่พัง
    const json = JSON.parse(
      text.replace(/^[\s\S]*?\(/, "").replace(/\);$/, "")
    );

    // แปลงข้อมูล (กัน null ทุกคอลัมน์)
    const data = json.table.rows.map(r => ({
      ID: r.c?.[0]?.v ? String(r.c[0].v).trim() : "",
      Pass: r.c?.[1]?.v ? String(r.c[1].v).trim() : "",
      Status: r.c?.[2]?.v ? String(r.c[2].v).trim().toLowerCase() : "",
      Name: r.c?.[3]?.v ? String(r.c[3].v).trim() : ""
    }))
    // ตัดแถวขยะ (ID / Pass ว่าง)
    .filter(u => u.ID && u.Pass);

    console.table(data);
    return data;

  } catch (err) {
    console.error("โหลดข้อมูล login ไม่สำเร็จ:", err);
    if (errorMessage) {
      errorMessage.textContent = "ไม่สามารถโหลดข้อมูลผู้ใช้ได้";
    }
    return [];
  }
}

// --- 3. ตรวจสอบ login ---
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorMessage.textContent = "กำลังตรวจสอบ...";

  const usernameInput = document.getElementById("username").value.trim().toLowerCase();
  const passwordInput = document.getElementById("password").value.trim(); // ❗ ไม่แปลง lowercase

  const loginData = await getLoginData();
  if (!loginData.length) {
    errorMessage.textContent = "ไม่พบข้อมูลผู้ใช้";
    return;
  }

  const user = loginData.find(u =>
    u.ID.toLowerCase() === usernameInput &&
    u.Pass === passwordInput
  );

  console.log("ผลการตรวจสอบ:", user);

  if (user) {
    localStorage.setItem("loginUser", JSON.stringify(user));

    if (user.Status === "admin") {
      window.location.href = "adminDashboard.html";
    } else {
      window.location.href = "userDashboard.html";
    }
  } else {
    errorMessage.textContent = "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";
  }
});
