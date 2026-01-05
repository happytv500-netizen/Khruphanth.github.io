import { fetchSheetData } from './api';
import { SHEET_NAMES } from '../config/config';

// Key สำหรับเก็บข้อมูลลง LocalStorage (เพื่อให้จำการเข้าระบบไว้)
const STORAGE_KEY = 'loginUser';

export const AuthService = {
  // ฟังก์ชันล็อกอิน
  login: async (username, password) => {
    try {
      // 1. ดึงข้อมูลจาก Sheet 'LOGIN'
      const rows = await fetchSheetData(SHEET_NAMES.LOGIN || "LOGIN");
      
      // 2. แปลงข้อมูลเป็น Object เพื่อให้เช็คง่ายๆ
      // โครงสร้าง Sheet LOGIN: [0:ID, 1:Pass, 2:Status, 3:Name]
      const users = rows.map(r => ({
        username: String(r[0] || "").trim().toLowerCase(),
        password: String(r[1] || "").trim(),
        role: String(r[2] || "").trim().toLowerCase(), // admin หรือ user
        name: String(r[3] || "").trim()
      })).filter(u => u.username && u.password); // กรองแถวว่างทิ้ง

      // 3. ตรวจสอบ User & Password
      const foundUser = users.find(u => 
        u.username === username.toLowerCase().trim() && 
        u.password === password.trim()
      );

      if (foundUser) {
        // ถ้าเจอ -> บันทึกลงเครื่อง และส่งค่ากลับ
        const userData = { 
          name: foundUser.name, 
          role: foundUser.role, 
          username: foundUser.username 
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
        return { success: true, user: userData };
      }

      return { success: false, message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };

    } catch (err) {
      console.error("Login Error:", err);
      return { success: false, message: "เกิดข้อผิดพลาดในการเชื่อมต่อระบบ" };
    }
  },

  // ฟังก์ชันดึงข้อมูลคนล็อกอินอยู่ (เช็คว่าล็อกอินยัง)
  getCurrentUser: () => {
    const json = localStorage.getItem(STORAGE_KEY);
    return json ? JSON.parse(json) : null;
  },

  // ฟังก์ชันออกจากระบบ
  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    // ล้างค่าแล้ว Redirect ไปหน้า Login
    window.location.href = "/login"; 
  }
};