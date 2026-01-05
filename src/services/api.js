import { CONFIG } from '../config/config';

// 1. ดึงข้อมูลแบบ Read-Only (GViz) - เร็วและง่าย (ใช้กับหน้า Home/Login)
export const fetchSheetData = async (sheetName) => {
  const url = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:json&sheet=${sheetName}&t=${Date.now()}`;
  try {
    const res = await fetch(url);
    const text = await res.text();
    let json = null;
    
    // แกะ JSON จาก Google Visualization API
    const m = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]+)\);?/);
    if (m && m[1]) json = JSON.parse(m[1]);
    else {
        const start = text.indexOf("{");
        const end = text.lastIndexOf("}");
        if (start !== -1 && end !== -1) json = JSON.parse(text.substring(start, end + 1));
    }
    
    if (!json || !json.table || !json.table.rows) return [];
    return json.table.rows.map(r => (r.c || []).map(c => c ? c.v : ""));
  } catch (err) {
    console.error(`Fetch ${sheetName} Error:`, err);
    return [];
  }
};

// 2. ดึงข้อมูลผ่าน Google Script (สำหรับ Dashboard ที่ต้องการข้อมูล Real-time กว่า)
export const fetchScriptData = async (sheetParam) => {
  try {
    const res = await fetch(`${CONFIG.SCRIPT_URL}?sheet=${sheetParam}&t=${Date.now()}`);
    return await res.json();
  } catch (e) {
    console.error("Fetch Script Error:", e);
    return [];
  }
};

// 3. ส่งข้อมูล (POST) ไปยัง Google Script (เพิ่ม/ลบ/แก้ไข)
export const postAction = async (sheet, action, params = {}) => {
  const body = new FormData();
  body.append("sheet", sheet);
  body.append("action", action);
  
  // วนลูปเอา params ใส่เข้าไปใน FormData
  Object.entries(params).forEach(([k, v]) => body.append(k, v));

  try {
    const res = await fetch(CONFIG.SCRIPT_URL, { method: "POST", body });
    return await res.json();
  } catch (e) {
    console.error("Post Action Error:", e);
    return { status: "error", message: e.message };
  }
};