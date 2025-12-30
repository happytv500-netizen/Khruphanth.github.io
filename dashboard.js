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

// ============================================================
// 2. CORE UTILITIES
// ============================================================

// แก้ไข: เพิ่ม Parameter กัน Cache ข้อมูลเก่า
async function fetchJSON(url) {
    try {
        const res = await fetch(`${url}&t=${Date.now()}`); 
        return await res.json();
    } catch (e) { return null; }
}

async function postAction(sheet, action, params = {}) {
    try {
        const body = new FormData();
        body.append("sheet", sheet);
        body.append("action", action);
        Object.entries(params).forEach(([k, v]) => body.append(k, v));
        const res = await fetch(BASE_URL, { method: "POST", body });
        return await res.json();
    } catch (e) { return { status: "error" }; }
}

function showLoading(msg = "กำลังโหลดข้อมูล...") {
    if (dashUpdateTimer) clearInterval(dashUpdateTimer);
    document.getElementById("page-content").innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary mb-3"></div>
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
function formatDateCell(val) {
    if (!val || String(val).includes("1899")) return "-";
    const m = String(val).match(/Date\(([^)]+)\)/);
    if (m) {
        const [y, mo, d] = m[1].split(',').map(Number);
        return `${pad(d)}/${pad(mo + 1)}/${y + 543}`;
    }
    return val;
}

const getSelectedRows = () => Array.from(document.querySelectorAll(".row-checkbox:checked")).map(cb => cb.closest("tr"));

// ============================================================
// 3. ROUTER
// ============================================================

window.loadPage = async function(page, param = null) {
    showLoading(); 
    const routes = {
        "dash":    renderDashboard,
        "wait":    renderWait,
        "list":    renderList,
        "history": () => renderHistory(param),
        "user":    renderUser,
        "report":  renderReport,
        "filter":  () => renderFilteredStatus(param)
    };

    if (routes[page]) {
        await routes[page]();
    }
};

// ============================================================
// 4. PAGE RENDERERS
// ============================================================

async function renderDashboard() {
    document.getElementById("page-title").textContent = "🏰 แผงควบคุม (Dashboard)";
    document.getElementById("page-content").innerHTML = `
        <div class="row g-4 mb-4">
            <div class="col-md-4">
                <div class="card p-4 card-stat card-navy" onclick="window.loadPage('list')">
                    <div class="d-flex justify-content-between align-items-center">
                        <div><h6>ยอดรวมครุภัณฑ์</h6><h2 class="fw-bold" id="dash-total">...</h2></div>
                        <div class="icon-circle bg-white bg-opacity-25"><i class="bi bi-box-seam fs-4"></i></div>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card p-4 card-stat" onclick="window.loadPage('wait')" style="border-left:8px solid #ffc107">
                    <div class="d-flex justify-content-between align-items-center">
                        <div><h6 class="text-muted">รอการตรวจสอบ</h6><h2 class="fw-bold text-warning" id="dash-wait">...</h2></div>
                        <div class="icon-circle bg-warning bg-opacity-10"><i class="bi bi-clock-history fs-4 text-warning"></i></div>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card p-4 card-stat" onclick="checkWebStatus()" style="border-left:8px solid #0dcaf0">
                    <div class="d-flex justify-content-between align-items-center">
                        <div><h6 class="text-muted">สถานะระบบ</h6><h2 class="fw-bold text-info" id="web-status">ตรวจสอบ...</h2></div>
                        <div class="icon-circle bg-info bg-opacity-10"><i class="bi bi-cpu fs-4 text-info"></i></div>
                    </div>
                </div>
            </div>
        </div>
        <div class="row g-3" id="stats-container"></div>`;

    const updateStats = async () => {
        const [data, wait] = await Promise.all([fetchJSON(URLS.DATA), fetchJSON(URLS.WAIT)]);
        if (!data) return;

        document.getElementById('dash-total').innerText = data.filter(r => r["รหัสครุภัณฑ์"]).length;
        document.getElementById('dash-wait').innerText = (wait || []).length;
        document.getElementById('web-status').innerHTML = `<span class="text-success">Online</span>`;

        const getCount = (s) => data.filter(r => String(r["สถานะ"]).includes(s)).length;
        const stats = [
            { label: "ใช้งานได้", count: getCount("ใช้งานได้"), color: "text-success", icon: "bi-check-circle" },
            { label: "ชำรุด", count: getCount("ชำรุด"), color: "text-danger", icon: "bi-x-circle" },
            { label: "เสื่อมสภาพ", count: getCount("เสื่อมสภาพ"), color: "text-warning", icon: "bi-exclamation-triangle" },
            { label: "หมดอายุ", count: getCount("หมดอายุ"), color: "text-secondary", icon: "bi-calendar-x" }
        ];

        document.getElementById('stats-container').innerHTML = stats.map(s => `
            <div class="col-md-3 col-6">
                <div class="card card-stat text-center p-3" onclick="window.loadPage('filter', '${s.label}')">
                    <i class="bi ${s.icon} fs-3 ${s.color}"></i>
                    <div class="small text-muted mt-2">${s.label}</div>
                    <h4 class="fw-bold mb-0">${s.count}</h4>
                </div>
            </div>`).join("");
    };

    await updateStats();
    dashUpdateTimer = setInterval(updateStats, 15000);
}

async function renderWait() {
    const data = await fetchJSON(URLS.WAIT);
    const opt = (arr, sel) => arr.map(v => `<option value="${v}" ${v === sel ? 'selected' : ''}>${v}</option>`).join("");
    const rows = (data || []).map((r, i) => `
        <tr data-row="${r._row || i+2}">
            <td><input type="checkbox" class="form-check-input row-checkbox"></td>
            <td class="fw-bold text-navy">${r["รหัส"]||""}</td>
            <td>${r["ชื่อ"]||""}</td>
            <td><select class="form-select form-select-sm wait-loc">${opt(LOCATIONS, r["ที่อยู่"])}</select></td>
            <td><select class="form-select form-select-sm wait-status">${opt(STATUS_OPTIONS, r["สถานะ"])}</select></td>
            <td><input class="form-control form-control-sm wait-note" value="${r["หมายเหตุ"]||""}"></td>
            <td>${formatDateCell(r["วันที่"])}</td>
            <td class="text-center"><button class="btn btn-success btn-sm" onclick="confirmWait(this)">✔</button></td>
            <td class="text-center"><button class="btn btn-outline-danger btn-sm" onclick="deleteRow('WAIT', this)"><i class="bi bi-trash"></i></button></td>
        </tr>`).join("");

    document.getElementById("page-title").innerText = "รายการรอตรวจสอบ";
    document.getElementById("page-content").innerHTML = `
        <div class="mb-3"><button class="btn btn-success btn-sm" onclick="bulkConfirmWait()">✔ อนุมัติที่เลือก</button></div>
        <div class="table-responsive"><table class="table align-middle"><thead><tr><th>เลือก</th><th>รหัส</th><th>ชื่อ</th><th>ที่อยู่</th><th>สถานะ</th><th>หมายเหตุ</th><th>วันที่</th><th>ส่ง</th><th>ลบ</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    document.getElementById("check-all")?.addEventListener("click", (e) => document.querySelectorAll(".row-checkbox").forEach(cb => cb.checked = e.target.checked));
}

async function renderHistory(id = "") {
    document.getElementById("page-title").innerText = "สืบค้นประวัติ";
    document.getElementById("page-content").innerHTML = `
        <div class="card p-3 mb-4 border-0 shadow-sm">
            <div class="d-flex gap-2">
                <input type="text" id="h-input" class="form-control" placeholder="รหัสครุภัณฑ์..." value="${id}">
                <button class="btn btn-primary" onclick="window.loadPage('history', document.getElementById('h-input').value)">สืบค้น</button>
            </div>
        </div>
        <div id="h-result"></div>`;
    
    if(!id) return;
    const data = await fetchJSON(URLS.LOG); 
    const logs = (data || []).filter(r => String(r["รหัส"]) === String(id));
    
    document.getElementById("h-result").innerHTML = logs.length === 0 
        ? `<div class="alert alert-light text-center">ไม่พบประวัติรหัส: ${id}</div>` 
        : `<div class="table-responsive"><table class="table align-middle"><thead><tr><th>วันที่</th><th>ที่อยู่</th><th>สถานะ</th><th>หมายเหตุ</th></tr></thead><tbody>${logs.map(r => `<tr><td>${formatDateCell(r["วันที่"])}</td><td>${r["ที่อยู่"]}</td><td>${r["สถานะ"]}</td><td>${r["หมายเหตุ"] || "-"}</td></tr>`).join("")}</tbody></table></div>`;
}

// ============================================================
// 5. ACTION LOGIC
// ============================================================

window.confirmWait = async (btn) => {
    const tr = btn.closest("tr");
    const conf = await Swal.fire({ title: 'ยืนยันบันทึก?', icon: 'question', showCancelButton: true });
    if(conf.isConfirmed) {
        showLoading("กำลังบันทึก...");
        const res = await postAction("LOG", "addLog", { 
            "รหัส": tr.cells[1].innerText, 
            "ชื่อ": tr.cells[2].innerText, 
            "ที่อยู่": tr.querySelector(".wait-loc").value, 
            "สถานะ": tr.querySelector(".wait-status").value, 
            "หมายเหตุ": tr.querySelector(".wait-note").value 
        });
        await postAction("WAIT", "delete", { row: tr.dataset.row });
        window.loadPage('wait');
    }
};

window.genReport = async (fmt) => {
    showLoading("กำลังสร้างรายงาน...");
    const res = await postAction("SHOW", "generateReport", { format: fmt });
    if (res && res.fileData) { 
        downloadFile(res.fileData, res.fileName); 
        Swal.fire("สำเร็จ", "ดาวน์โหลดแล้ว", "success"); 
        window.loadPage('report'); 
    } else {
        Swal.fire("ผิดพลาด", "ไม่สามารถสร้างรายงานได้", "error");
        window.loadPage('report');
    }
};

window.checkWebStatus = async function() {
    const start = Date.now();
    const test = await fetchJSON(URLS.DATA);
    Swal.fire({ 
        title: 'Status Check', 
        html: `เชื่อมต่อฐานข้อมูล: ${test ? 'สำเร็จ' : 'ล้มเหลว'}<br>ความเร็ว: ${Date.now() - start}ms`, 
        icon: test ? 'success' : 'error' 
    });
};

// เริ่มต้นระบบ
document.addEventListener("DOMContentLoaded", () => window.loadPage("dash"));
