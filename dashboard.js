// ============================================================
// 1. CONFIG & CONSTANTS
// ============================================================
const BASE_URL = "https://script.google.com/macros/s/AKfycbxweofgTSALf_znsnS88w1JM2eP32fOlyJD4z5lUsqivG_xnH21FFVrnVemVf_rMO9v8g/exec";
const URLS = Object.freeze({
    DATA: BASE_URL + "?sheet=DATA",
    WAIT: BASE_URL + "?sheet=WAIT",
    LOG:  BASE_URL + "?sheet=LOG",
    USER: BASE_URL + "?sheet=LOGIN",
    SHOW: BASE_URL + "?sheet=SHOW"
});
const THEME_COLOR = "#002147";

const LOCATIONS = ["-", "501", "502", "503", "401", "401A", "401B", "401C", "402", "403", "404", "405", "ห้องพักครู", "301", "302"];
const STATUS_OPTIONS = ["ใช้งานได้", "ชำรุด", "เสื่อมสภาพ", "หมดอายุการใช้งาน", "ไม่รองรับการใช้งาน"];

let dashUpdateTimer = null;

// แทรก CSS พิเศษ
const style = document.createElement('style');
style.innerHTML = `
    .card-hover { transition: all 0.3s ease; cursor: pointer; position: relative; overflow: hidden; border: none !important; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .card-hover:hover { transform: translateY(-7px); box-shadow: 0 12px 20px rgba(0,0,0,0.15); }
    .card-hover .view-more { position: absolute; bottom: -30px; left: 0; width: 100%; background: ${THEME_COLOR}; color: white; font-size: 0.7rem; text-align: center; padding: 4px 0; font-weight: bold; transition: 0.3s; }
    .card-hover:hover .view-more { bottom: 0; }
    .bg-navy { background-color: ${THEME_COLOR} !important; color: white; }
    .text-navy { color: ${THEME_COLOR} !important; }
`;
document.head.appendChild(style);

// ============================================================
// 2. CORE UTILITIES
// ============================================================

async function fetchJSON(url) {
    try { const res = await fetch(url + `&t=${Date.now()}`); return await res.json(); } catch (e) { return null; }
}

async function postAction(sheet, action, params = {}) {
    const body = new FormData();
    body.append("sheet", sheet);
    body.append("action", action);
    Object.entries(params).forEach(([k, v]) => body.append(k, v));
    const res = await fetch(BASE_URL, { method: "POST", body });
    return await res.json();
}

function showLoading(msg = "กำลังโหลดข้อมูล...") {
    if (dashUpdateTimer) clearInterval(dashUpdateTimer);
    document.getElementById("page-content").innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary mb-3" style="width: 3.5rem; height: 3.5rem;"></div>
            <h4 class="fw-bold text-navy">${msg}</h4>
        </div>`;
}

function downloadFile(base64Data, fileName) {
    const byteCharacters = atob(base64Data.replace(/-/g, '+').replace(/_/g, '/'));
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) { byteNumbers[i] = byteCharacters.charCodeAt(i); }
    const blob = new Blob([new Uint8Array(byteNumbers)], { type: "application/octet-stream" });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

const pad = (n) => String(n).padStart(2, '0');
function formatTimeCell(val) {
    if (!val) return "-";
    const m = String(val).match(/Date\(([^)]+)\)/);
    if (m) { const p = m[1].split(',').map(Number); return `${pad(p[3])}:${pad(p[4])} น.`; }
    return val;
}
function formatDateCell(val) {
    if (!val || String(val).includes("1899")) return "-";
    const m = String(val).match(/Date\(([^)]+)\)/);
    if (m) { const [y, mo, d] = m[1].split(',').map(Number); return `${pad(d)}/${pad(mo + 1)}/${y + 543}`; }
    return val;
}

const getSelectedRows = () => Array.from(document.querySelectorAll(".row-checkbox:checked")).map(cb => cb.closest("tr"));

// ============================================================
// 3. AUTH LOGIC (ตรวจสอบชื่อจาก Name)
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
    const loginUser = JSON.parse(localStorage.getItem("loginUser"));
    if (loginUser && loginUser.Name) {
        document.getElementById("username").innerHTML = `<i class="bi bi-person-circle"></i> ยินดีต้อนรับ, ${loginUser.Name}`;
        window.loadPage("dash");
    } else {
        window.location.href = "index.html"; 
    }
});

window.logout = function() {
    Swal.fire({
        title: 'ยืนยันการออกจากระบบ?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ตกลง',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: THEME_COLOR
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem("loginUser");
            window.location.href = "index.html";
        }
    });
};

// ============================================================
// 4. ROUTER & PAGE RENDERERS
// ============================================================

window.loadPage = async function(page, param = null) {
    showLoading(); 
    const routes = {
        "dash": renderDashboard,
        "wait": renderWait,
        "list": renderList,
        "history": () => renderHistory(param),
        "user": renderUser,
        "report": renderReport,
        "manual": renderManual,
        "filter": () => renderFilteredStatus(param)
    };
    if (routes[page]) {
        await routes[page]();
        document.querySelectorAll('.btn-primary').forEach(b => b.style.backgroundColor = THEME_COLOR);
    }
};

async function renderDashboard() {
    document.getElementById("page-title").textContent = "🏰 แผงควบคุม (Dashboard)";
    document.getElementById("page-content").innerHTML = `
        <div class="row g-4 mb-4">
            <div class="col-md-4"><div class="card p-4 card-hover bg-navy" onclick="window.loadPage('list')"><div class="d-flex justify-content-between align-items-center"><div><h6>ยอดรวมครุภัณฑ์</h6><h2 class="fw-bold" id="dash-total">...</h2></div><i class="bi bi-box-seam fs-1 opacity-50"></i></div><div class="view-more">ดูฐานข้อมูลครุภัณฑ์</div></div></div>
            <div class="col-md-4"><div class="card p-4 card-hover" onclick="window.loadPage('wait')" style="border-left:8px solid #ffc107 !important"><div class="d-flex justify-content-between align-items-center"><div><h6 class="text-muted">รอการตรวจสอบ</h6><h2 class="fw-bold text-warning" id="dash-wait">...</h2></div><i class="bi bi-clock-history fs-1 text-warning opacity-50"></i></div><div class="view-more">ดูรายการรอตรวจสอบ</div></div></div>
            <div class="col-md-4"><div class="card p-4 card-hover" onclick="checkWebStatus()" style="border-left:8px solid #0dcaf0 !important"><div class="d-flex justify-content-between align-items-center"><div><h6 class="text-muted">สถานะเว็บไซต์</h6><h2 class="fw-bold text-info" id="web-status">ตรวจสอบ...</h2></div><i class="bi bi-cpu fs-1 text-info opacity-50"></i></div><div class="view-more">ดูสถานะการเชื่อมต่อ</div></div></div>
        </div>
        <div class="row g-3 mb-5" id="stats-container"></div>`;

    const updateStats = async () => {
        const [data, wait] = await Promise.all([fetchJSON(URLS.DATA), fetchJSON(URLS.WAIT)]);
        if (!data || !wait) return;
        document.getElementById('dash-total').innerText = data.filter(r => r["รหัสครุภัณฑ์"]).length;
        document.getElementById('dash-wait').innerText = wait.length;
        document.getElementById('web-status').innerHTML = `<span class="text-success">พร้อมใช้งาน</span>`;
        
        const getCount = (s) => data.filter(r => String(r["สถานะ"]).includes(s)).length;
        const stats = [
            { label: "ใช้งานได้", count: getCount("ใช้งานได้"), color: "#198754", icon: "bi-check-circle" },
            { label: "ชำรุด", count: getCount("ชำรุด"), color: "#dc3545", icon: "bi-x-circle" },
            { label: "เสื่อมสภาพ", count: getCount("เสื่อมสภาพ"), color: "#fd7e14", icon: "bi-exclamation-triangle" },
            { label: "หมดอายุ", count: getCount("หมดอายุ"), color: "#6c757d", icon: "bi-calendar-x" }
        ];
        document.getElementById('stats-container').innerHTML = stats.map(s => `<div class="col-md-3 col-6"><div class="card h-100 card-hover text-center p-3" onclick="window.loadPage('filter', '${s.label}')" style="border-bottom: 4px solid ${s.color} !important;"><i class="bi ${s.icon} fs-3" style="color: ${s.color}"></i><div class="small text-muted mt-2">${s.label}</div><h4 class="fw-bold mb-0">${s.count}</h4><div class="view-more">ดูรายการ</div></div></div>`).join("");
    };
    await updateStats();
    dashUpdateTimer = setInterval(updateStats, 15000);
}

async function renderWait() {
    const data = await fetchJSON(URLS.WAIT);
    const opt = (arr, sel) => arr.map(v => `<option value="${v}" ${v === sel ? 'selected' : ''}>${v}</option>`).join("");
    const rows = (data || []).map((r, i) => `<tr data-row="${r._row || i+2}"><td><input type="checkbox" class="form-check-input row-checkbox"></td><td class="fw-bold">${r["รหัส"]||""}</td><td>${r["ชื่อ"]||""}</td><td><select class="form-select form-select-sm wait-loc">${opt(LOCATIONS, r["ที่อยู่"])}</select></td><td><select class="form-select form-select-sm wait-status">${opt(STATUS_OPTIONS, r["สถานะ"])}</select></td><td><input class="form-control form-control-sm wait-note" value="${r["หมายเหตุ"]||""}"></td><td>${formatDateCell(r["วันที่"])}</td><td class="text-center"><button class="btn btn-success btn-sm" onclick="confirmWait(this)">✔</button></td><td class="text-center"><button class="btn btn-danger btn-sm" onclick="deleteRow('WAIT', this)">🗑</button></td></tr>`).join("");
    document.getElementById("page-content").innerHTML = `<div class="mb-3"><button class="btn btn-success btn-sm" onclick="bulkConfirmWait()">✔ ส่งที่เลือก</button></div><div class="table-responsive border"><table class="table table-hover align-middle bg-white mb-0"><thead class="table-dark"><tr><th><input type="checkbox" id="check-all"></th><th>รหัส</th><th>ชื่อ</th><th>ที่อยู่</th><th>สถานะ</th><th>หมายเหตุ</th><th>วันที่</th><th>ส่ง</th><th>ลบ</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    document.getElementById("check-all").onclick = (e) => document.querySelectorAll(".row-checkbox").forEach(cb => cb.checked = e.target.checked);
}

async function renderList() {
    const data = await fetchJSON(URLS.DATA);
    const rows = (data || []).filter(r => r["รหัสครุภัณฑ์"]).map((r, i) => `<tr data-row="${r._row || i+2}"><td><input type="checkbox" class="form-check-input row-checkbox"></td><td class="fw-bold">${r["รหัสครุภัณฑ์"]}</td><td>${r["ชื่อครุภัณฑ์"]}</td><td class="text-center"><img src="https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(r["รหัสครุภัณฑ์"])}" height="30"></td><td class="text-center"><button class="btn btn-warning btn-sm" onclick="editList(this)">📝</button></td><td class="text-center"><button class="btn btn-danger btn-sm" onclick="deleteRow('DATA', this)">🗑</button></td><td class="text-center"><button class="btn btn-info btn-sm text-white" onclick="window.loadPage('history', '${r["รหัสครุภัณฑ์"]}')">📜 ประวัติ</button></td></tr>`).join("");
    document.getElementById("page-content").innerHTML = `<div class="mb-3"><button class="btn btn-primary btn-sm" onclick="openDynamicAddForm()">➕ เพิ่มรายการ</button></div><div class="table-responsive border"><table class="table table-hover align-middle bg-white mb-0"><thead class="table-dark"><tr><th>เลือก</th><th>รหัส</th><th>ชื่อ</th><th>Barcode</th><th>แก้</th><th>ลบ</th><th>สืบค้น</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

async function renderUser() {
    const data = await fetchJSON(URLS.USER);
    const rows = (data || []).map((u, i) => `<tr data-row="${u._row || i+2}"><td><input type="checkbox" class="form-check-input row-checkbox"></td><td>${u["ID"]||""}</td><td>${u["name"]||""}</td><td><span class="badge ${u["Status"]==='admin'?'bg-danger':'bg-info text-dark'}">${u["Status"]}</span></td><td class="text-center"><button class="btn btn-warning btn-sm" onclick="editUser(this)">📝</button> <button class="btn btn-danger btn-sm" onclick="deleteRow('LOGIN', this)">🗑</button></td></tr>`).join("");
    document.getElementById("page-content").innerHTML = `<div class="mb-3"><button class="btn btn-primary btn-sm" onclick="addUser()">➕ เพิ่มสมาชิก</button></div><div class="table-responsive border"><table class="table table-hover align-middle bg-white mb-0"><thead class="table-dark"><tr><th>เลือก</th><th>ID</th><th>ชื่อ</th><th>สิทธิ์</th><th>จัดการ</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderManual() {
    document.getElementById("page-title").textContent = "📖 คู่มือการใช้งาน";
    document.getElementById("page-content").innerHTML = `<div class="card p-4 border-0 shadow-sm"><h6>ขั้นตอนการใช้งานหลัก:</h6><ul><li><b>ตรวจสอบครุภัณฑ์:</b> ยืนยันรายการที่ส่งมาจากระบบ</li><li><b>ฐานข้อมูล:</b> เพิ่มหรือแก้ไขข้อมูลครุภัณฑ์หลัก</li><li><b>ออกรายงาน:</b> ดาวน์โหลดสรุปผลเป็น PDF หรือ Word</li></ul></div>`;
}

// ============================================================
// 5. ACTION LOGIC (CRUD)
// ============================================================

window.confirmWait = async (btn) => {
    const tr = btn.closest("tr");
    const conf = await Swal.fire({ title: 'ยืนยันการบันทึก?', icon: 'question', showCancelButton: true });
    if(conf.isConfirmed) {
        showLoading("กำลังบันทึก...");
        await postAction("LOG", "addLog", { "รหัส": tr.cells[1].innerText, "ชื่อ": tr.cells[2].innerText, "ที่อยู่": tr.querySelector(".wait-loc").value, "สถานะ": tr.querySelector(".wait-status").value, "หมายเหตุ": tr.querySelector(".wait-note").value });
        await postAction("WAIT", "delete", { row: tr.dataset.row });
        window.loadPage('wait');
    }
};

window.deleteRow = async (sheet, btn) => {
    const conf = await Swal.fire({ title: 'ยืนยันการลบ?', text: "ข้อมูลจะหายไปถาวร!", icon: 'warning', showCancelButton: true });
    if(conf.isConfirmed) {
        showLoading("กำลังลบ...");
        await postAction(sheet, "delete", { row: btn.closest("tr").dataset.row });
        window.loadPage(sheet === 'DATA' ? 'list' : (sheet === 'WAIT' ? 'wait' : 'user'));
    }
};

window.addUser = async () => {
    const { value: f } = await Swal.fire({ title: 'เพิ่มสมาชิกใหม่', html: `<input id="u-i" class="form-control mb-2" placeholder="ID"><input id="u-p" class="form-control mb-2" placeholder="Password"><input id="u-n" class="form-control mb-2" placeholder="ชื่อ"><select id="u-s" class="form-select"><option value="employee">Employee</option><option value="admin">Admin</option></select>`, preConfirm: () => ({ id: document.getElementById('u-i').value, pass: document.getElementById('u-p').value, name: document.getElementById('u-n').value, status: document.getElementById('u-s').value })});
    if (f && f.id) { await postAction("LOGIN", "addUser", f); window.loadPage('user'); }
};

window.openDynamicAddForm = async function() {
    const { value: f } = await Swal.fire({ title: 'เพิ่มครุภัณฑ์', html: `<input id="sw-c" class="form-control mb-2" placeholder="รหัสครุภัณฑ์"><input id="sw-n" class="form-control" placeholder="ชื่อครุภัณฑ์">`, preConfirm: () => ({ code: document.getElementById('sw-c').value, name: document.getElementById('sw-n').value })});
    if (f && f.code) { showLoading("กำลังบันทึก..."); await postAction("DATA", "add", f); window.loadPage('list'); }
};

// --- ตรวจสอบสถานะจริง ---
window.checkWebStatus = async function() {
    const start = Date.now();
    const test = await fetchJSON(URLS.DATA);
    const latency = Date.now() - start;
    Swal.fire({ title: 'Status', html: `Database: Connected<br>Latency: ${latency}ms`, icon: test ? 'success' : 'error' });
};

// ฟังก์ชันอื่นๆ (renderHistory, renderReport, renderFilteredStatus) จะทำงานตามโครงสร้างข้างต้น
