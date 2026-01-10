// Report.jsx
// ===============================
// REPORT MODULE (PDF / WORD)
// ===============================

const BASE_URL = "https://script.google.com/macros/s/AKfycbxweofgTSALf_znsnS88w1JM2eP32fOlyJD4z5lUsqivG_xnH21FFVrnVemVf_rMO9v8g/exec";
const REPORT_URL = BASE_URL + "?sheet=SHOW";
const THEME_COLOR = "#002147";

/* ===============================
   UTILITIES (เฉพาะรายงาน)
================================ */
async function fetchJSON(url) {
  try {
    const res = await fetch(url);
    return await res.json();
  } catch {
    return null;
  }
}

async function postAction(action, params = {}) {
  const body = new FormData();
  body.append("sheet", "SHOW");
  body.append("action", action);
  Object.entries(params).forEach(([k, v]) => body.append(k, v));
  const res = await fetch(BASE_URL, { method: "POST", body });
  return await res.json();
}

function showLoading(msg = "กำลังสร้างรายงาน...") {
  document.getElementById("page-content").innerHTML = `
    <div class="text-center py-5">
      <div class="spinner-border text-primary mb-3" style="width:3.5rem;height:3.5rem"></div>
      <h5 style="color:${THEME_COLOR}">${msg}</h5>
    </div>`;
}

function downloadFile(base64Data, fileName) {
  const bytes = atob(base64Data.replace(/-/g, '+').replace(/_/g, '/'));
  const arr = new Uint8Array([...bytes].map(c => c.charCodeAt(0)));
  const blob = new Blob([arr], { type: "application/octet-stream" });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/* ===============================
   RENDER REPORT PAGE
================================ */
export async function renderReport() {
  const data = await fetchJSON(REPORT_URL);

  const rows = (data || []).map(r => `
    <tr>
      <td>${r["รหัสครุภัณฑ์"] || ""}</td>
      <td>${r["ชื่อครุภัณฑ์"] || ""}</td>
      <td>${r["ที่เก็บ"] || ""}</td>
      <td>${r["สถานะ"] || ""}</td>
    </tr>
  `).join("");

  document.getElementById("page-title").textContent = "📊 รายงานครุภัณฑ์";
  document.getElementById("page-content").innerHTML = `
    <div class="mb-3 text-end">
      <button class="btn btn-success me-2" onclick="genReport('pdf')">📕 PDF</button>
      <button class="btn btn-primary" onclick="genReport('doc')">📑 Word</button>
    </div>

    <div class="table-responsive shadow-sm border rounded">
      <table class="table table-bordered bg-white mb-0">
        <thead class="table-success">
          <tr>
            <th>รหัส</th>
            <th>ชื่อ</th>
            <th>ที่เก็บ</th>
            <th>สถานะ</th>
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="4" class="text-center">ไม่พบข้อมูล</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

/* ===============================
   GENERATE REPORT FILE
================================ */
window.genReport = async function (format) {
  showLoading("กำลังสร้างไฟล์รายงาน...");
  const res = await postAction("generateReport", { format });

  if (res?.fileData) {
    downloadFile(res.fileData, res.fileName);
    Swal.fire("สำเร็จ", "ดาวน์โหลดรายงานแล้ว", "success");
    renderReport();
  } else {
    Swal.fire("ผิดพลาด", "ไม่สามารถสร้างรายงานได้", "error");
  }
};
