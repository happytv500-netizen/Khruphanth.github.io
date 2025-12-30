// --- ดึงข้อมูล login ---
async function getLoginData() {
  try {
    const res = await fetch(baseURL);
    const text = await res.text();
    const json = JSON.parse(text.substring(47).slice(0,-2));

    // เพิ่มการดึงคอลัมน์ D (index 3) คือ Name
    const data = json.table.rows.map(r => ({
      ID: r.c[0]?.v?.toString().trim(),           // A = ID
      Pass: r.c[1]?.v?.toString().trim(),         // B = Pass
      Status: r.c[2]?.v?.toString().trim().toLowerCase(), // C = Status
      Name: r.c[3]?.v?.toString().trim()          // D = Name (ต้องมีบรรทัดนี้)
    }));

    console.log("Login Data จาก Google Sheet:", data);
    return data;

  } catch (err) {
    console.error("โหลดข้อมูล login ไม่สำเร็จ:", err);
    errorMessage.textContent = "ไม่สามารถโหลดข้อมูลผู้ใช้ได้ กรุณาลองใหม่";
    return [];
  }
}

// --- ตรวจสอบ login ---
loginForm.addEventListener("submit", async function(e){
  e.preventDefault();
  errorMessage.textContent = "";

  const usernameInput = document.getElementById("username").value.trim().toLowerCase();
  const passwordInput = document.getElementById("password").value.trim().toLowerCase();

  const loginData = await getLoginData();
  if(loginData.length === 0) return;

  // หา user
  const user = loginData.find(u => 
    u.ID?.toLowerCase() === usernameInput &&
    u.Pass?.toLowerCase() === passwordInput
  );

  if(user){
    // บันทึกข้อมูล user (ที่มี Name แล้ว) ลงใน localStorage
    localStorage.setItem("loginUser", JSON.stringify(user));

    // เปลี่ยนหน้าตามสิทธิ์ (ตรวจสอบชื่อไฟล์ html ของคุณให้ถูกต้อง)
    if(user.Status === "admin"){
      window.location.href = "adminDashboard.html"; 
    } else if(user.Status === "employee"){
      window.location.href = "userDashboard.html"; 
    } else {
      errorMessage.textContent = "สิทธิ์ผู้ใช้งานไม่ถูกต้อง";
    }
  } else {
    errorMessage.textContent = "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";
  }
});
