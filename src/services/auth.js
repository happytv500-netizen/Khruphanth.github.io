import { fetchSheetData } from './api';
import { SHEET_NAMES } from '../config/config';

const STORAGE_KEY = 'loginUser';
const EXPIRE_KEY = 'loginExpire';
const SESSION_MIN = 60; // อายุ session (นาที)

/* =========================
   LOGIN
========================= */
export const AuthService = {
  login: async (username, password) => {
    try {
      const rows = await fetchSheetData(SHEET_NAMES.LOGIN || "LOGIN");

      const users = rows.map(r => ({
        username: String(r[0] || "").trim().toLowerCase(),
        password: String(r[1] || "").trim(),
        role: String(r[2] || "").trim().toLowerCase(),
        name: String(r[3] || "").trim()
      })).filter(u => u.username && u.password);

      const found = users.find(u =>
        u.username === username.toLowerCase().trim() &&
        u.password === password.trim()
      );

      if (!found) {
        return { success: false, message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
      }

      const userData = {
        username: found.username,
        name: found.name,
        role: found.role
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      localStorage.setItem(
        EXPIRE_KEY,
        Date.now() + SESSION_MIN * 60 * 1000
      );

      return { success: true, user: userData };

    } catch (err) {
      console.error("Login error:", err);
      return { success: false, message: "ระบบมีปัญหา" };
    }
  },

  /* =========================
     GET CURRENT USER + AUTO LOGOUT
  ========================= */
  getCurrentUser: () => {
    const user = localStorage.getItem(STORAGE_KEY);
    const expire = localStorage.getItem(EXPIRE_KEY);

    if (!user || !expire) return null;

    if (Date.now() > Number(expire)) {
      AuthService.logout(true);
      return null;
    }

    return JSON.parse(user);
  },

  /* =========================
     LOGOUT + CLEAR STATE
  ========================= */
  logout: (silent = false) => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(EXPIRE_KEY);
    sessionStorage.clear();

    if (!silent) {
      alert("Session หมดอายุ กรุณาเข้าสู่ระบบใหม่");
    }

    window.location.replace("/");
  }
};

/* =========================
   🔐 AUTH GUARD (ADMIN)
========================= */
/* =========================
   🔐 AUTH GUARD (ADMIN & SADMIN)
========================= */
export function requireAdmin() {
  const user = AuthService.getCurrentUser();

  // ปรับเงื่อนไขให้ยอมรับทั้ง "admin" และ "sadmin"
  if (!user || (user.role !== "admin" && user.role !== "sadmin")) {
    window.location.replace("/");
    return false;
  }
  return true;
}

/* =========================
   🔁 SESSION WATCHDOG
   (เรียกครั้งเดียวตอน app โหลด)
========================= */
export function startSessionWatcher() {
  setInterval(() => {
    AuthService.getCurrentUser();
  }, 60000);
}

/* =========================
   🚫 BASIC DEVTOOLS BLOCK
   (ไม่กันเทพ แต่กันมือซน)
========================= */
export function blockDevTools() {
  document.addEventListener('contextmenu', e => e.preventDefault());

  document.addEventListener('keydown', e => {
    if (
      e.key === "F12" ||
      (e.ctrlKey && e.shiftKey && ["I", "C", "J"].includes(e.key)) ||
      (e.ctrlKey && e.key === "U")
    ) {
      e.preventDefault();
    }
  });
}

/* =========================
   🧠 INIT SECURITY
   (เรียกครั้งเดียว)
========================= */
export function initAuthProtection() {
  startSessionWatcher();
  blockDevTools();
}
