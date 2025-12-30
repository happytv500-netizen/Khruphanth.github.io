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

const LOCATIONS = ["-", "501", "502", "503", "401", "401A", "401B", "401C", "402", "403", "404", "405", "ห้องพักครู", "301", "302"];
const STATUS_OPTIONS = ["ใช้งานได้", "ชำรุด", "เสื่อมสภาพ", "หมดอายุการใช้งาน", "ไม่รองรับการใช้งาน"];

let dashUpdateTimer = null;

// ============================================================
// 2. CORE UTILITIES
// ============================================================

async function fetchJSON(url) {
    try {
        const res = await fetch(`${url}&t=${Date.now()}`); // กัน Cache
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

function showLoading(msg = "กำลังโหลด...") {
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
// 3. PAGE ROUTER
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
        "manual":  renderManual,
        "filter":  () => renderFilteredStatus(param)
    };
    if (routes[page]) await routes[page]();
};

// ============================================================
// 4. PAGE RENDERERS
// ============================================================

async function renderDashboard() {
    document.getElementById("page-title").innerText = "แผงควบคุม (Dashboard)";
    document.getElementById("page-content").innerHTML = `
        <div class="row g-4 mb-4">
            <div class="col-md-4">
                <div class="card card-stat card-navy p-4" onclick="loadPage('list')">
                    <div class="d-flex justify-content-between">
                        <div><p class="mb-1 opacity-75">ยอดรวมครุภัณฑ์</p><h2 id="dash-total">...</h2></div>
                        <div class="icon-circle bg-white bg-opacity-25"><i class="bi bi-box-seam fs-4"></i></div>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card card-stat p-4 border-left-warning" onclick="loadPage('wait')">
                    <div class="d-flex justify-content-between">
                        <div><p class="mb-1 text-muted">รอตรวจสอบ</p><h2 class="text-warning" id="dash-wait">...</h2></div>
                        <div class="icon-circle bg-warning bg-opacity-10"><i class="bi bi-clock-history fs-4 text-warning"></i></div>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card card-stat p-4 border-left-info" onclick="checkWebStatus()">
                    <div class="d-flex justify-content-between">
                        <div><p class="mb-1 text-muted">สถานะระบบ</p><h2 class="text-info" id="web-status">...</h2></div>
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
                <div class="card card-stat text-center p-3" onclick="loadPage('filter', '${s.label}')">
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
    
    document.getElementById("page-content").innerHTML = `
        <div class="mb-3 d-flex gap-2">
            <button class="btn btn-success btn-sm" onclick="bulkConfirmWait()">✔ อนุมัติที่เลือก</button>
            <button class="btn btn-outline-secondary btn-sm" onclick="loadPage('wait')">🔄 รีเฟรช</button>
        </div>
        <div class="table-responsive"><table class="table align-middle">
            <thead class="table-navy"><tr><th><input type="checkbox" id="check-all" class="form-check-input"></th><th>รหัส</th><th>ชื่อ</th><th>ที่อยู่</th><th>สถานะ</th><th>หมายเหตุ</th><th>วันที่</th><th>ส่ง</th><th>ลบ</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="9" class="text-center p-4">ไม่มีข้อมูล</td></tr>'}</tbody>
        </table></div>`;
    
    document.getElementById("check-all").onclick = (e) => document.querySelectorAll(".row-checkbox").forEach(cb => cb.checked = e.target.checked);
}

async function renderList() {
    const data = await fetchJSON(URLS.DATA);
    const rows = (data || []).filter(r => r["รหัสครุภัณฑ์"]).map((r, i) => `
        <tr data-row="${r._row || i+2}">
            <td><input type="checkbox" class="form-check-input row-checkbox"></td>
            <td class="fw-bold text-navy">${r["รหัสครุภัณฑ์"]}</td>
            <td>${r["ชื่อครุภัณฑ์"]}</td>
            <td class="text-center"><img src="https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(r["รหัสครุภัณฑ์"])}" height="25"></td>
            <td class="text-center"><button class="btn btn-light btn-sm text-warning" onclick="editList(this)"><i class="bi bi-pencil-square"></i></button></td>
            <td class="text-center"><button class="btn btn-light btn-sm text-danger" onclick="deleteRow('DATA', this)"><i class="bi bi-trash"></i></button></td>
            <td class="text-center"><button class="btn btn-light btn-sm text-primary" onclick="loadPage('history', '${r["รหัสครุภัณฑ์"]}')"><i class="bi bi-search"></i></button></td>
        </tr>`).join("");
    
    document.getElementById("page-content").innerHTML = `
        <div class="mb-3"><button class="btn btn-primary btn-sm" onclick="openDynamicAddForm()">+ เพิ่มครุภัณฑ์</button></div>
        <div class="table-responsive"><table class="table align-middle">
            <thead class="table-navy"><tr><th>เลือก</th><th>รหัส</th><th>ชื่อ</th><th>Barcode</th><th>แก้</th><th>ลบ</th><th>สืบค้น</th></tr></thead>
            <tbody>${rows}</tbody>
        </table></div>`;
}

// ============================================================
// 5. ACTION LOGIC
// ============================================================

window.openDynamicAddForm = async function() {
    let rowCount = 1;
    const getRowHTML = (i) => `<div class="item-row mb-3 p-2 border rounded" id="row-${i}"><div class="small fw-bold mb-1">รายการที่ ${i}</div><div class="row g-2"><div class="col-5"><input class="form-control form-control-sm sw-code" placeholder="รหัส"></div><div class="col-7"><input class="form-control form-control-sm sw-name" placeholder="ชื่อ"></div></div></div>`;

    const { value: formValues } = await Swal.fire({
        title: 'เพิ่มรายการครุภัณฑ์',
        html: `<div id="dynamic-container" class="swal-scroll">${getRowHTML(1)}</div>`,
        showCancelButton: true, confirmButtonText: 'บันทึกทั้งหมด',
        didOpen: () => {
            const container = document.getElementById('dynamic-container');
            container.addEventListener('input', (e) => {
                if (e.target.classList.contains('sw-name')) {
                    const allRows = container.querySelectorAll('.item-row');
                    const lastRow = allRows[allRows.length - 1];
                    if (lastRow.querySelector('.sw-code').value && lastRow.querySelector('.sw-name').value) {
                        rowCount++;
                        const div = document.createElement('div');
                        div.innerHTML = getRowHTML(rowCount);
                        container.appendChild(div.firstElementChild);
                        container.scrollTop = container.scrollHeight;
                    }
                }
            });
        },
        preConfirm: () => {
            let data = [];
            document.querySelectorAll('.item-row').forEach(r => {
                const c = r.querySelector('.sw-code').value.trim();
                const n = r.querySelector('.sw-name').value.trim();
                if(c && n) data.push({ code: c, name: n });
            });
            return data.length > 0 ? data : Swal.showValidationMessage('กรุณากรอกข้อมูล');
        }
    });

    if (formValues) {
        showLoading(`บันทึก ${formValues.length} รายการ...`);
        for (const item of formValues) await postAction("DATA", "add", item);
        window.loadPage('list');
    }
};

window.confirmWait = async (btn) => {
    const tr = btn.closest("tr");
    const conf = await Swal.fire({ title: 'ยืนยันบันทึก?', icon: 'question', showCancelButton: true });
    if(conf.isConfirmed) {
        showLoading();
        await postAction("LOG", "addLog", { 
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

window.bulkConfirmWait = async () => {
    const sel = getSelectedRows();
    if(sel.length === 0) return;
    const conf = await Swal.fire({ title: `ยืนยัน ${sel.length} รายการ?`, showCancelButton: true });
    if(conf.isConfirmed) {
        showLoading(`กำลังประมวลผล ${sel.length} รายการ...`);
        sel.sort((a,b) => b.dataset.row - a.dataset.row);
        for (let tr of sel) {
            await postAction("LOG", "addLog", { 
                "รหัส": tr.cells[1].innerText, 
                "ชื่อ": tr.cells[2].innerText, 
                "ที่อยู่": tr.querySelector(".wait-loc").value, 
                "สถานะ": tr.querySelector(".wait-status").value, 
                "หมายเหตุ": tr.querySelector(".wait-note").value 
            });
            await postAction("WAIT", "delete", { row: tr.dataset.row });
        }
        window.loadPage('wait');
    }
};

window.deleteRow = async (sheet, btn) => {
    const conf = await Swal.fire({ title: 'ยืนยันลบ?', icon: 'warning', showCancelButton: true });
    if(conf.isConfirmed) {
        showLoading();
        await postAction(sheet, "delete", { row: btn.closest("tr").dataset.row });
        window.loadPage(sheet === 'DATA' ? 'list' : 'wait');
    }
};

// ... ฟังก์ชันเสริมอื่นๆ (User, History, Report) สามารถคงเดิมจากเวอร์ชันก่อนหน้าได้เลย ...

document.addEventListener("DOMContentLoaded", () => {
    const loginUser = JSON.parse(localStorage.getItem("loginUser"));
    if (loginUser) {
        document.getElementById("username").innerHTML = `<i class="bi bi-person-circle"></i> ${loginUser.Name}`;
        window.loadPage("dash");
    } else { window.location.href = "index.html"; }
});
