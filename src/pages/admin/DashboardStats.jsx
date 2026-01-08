import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { fetchSheetData, postAction } from '../services/api';
import { SHEET_NAMES } from '../config/config';

const Report = () => {
  const [rawData, setRawData] = useState([]); // ข้อมูลทั้งหมดจาก Sheet
  const [displayData, setDisplayData] = useState([]); // ข้อมูลที่ผ่านการกรองแล้ว
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false); // เช็คว่ากดค้นหาหรือยัง

  // ตัวแปรสำหรับ Filter
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    category: ''
  });

  // โหลดข้อมูลดิบเตรียมไว้ (หรือโหลดตอนกด Search ก็ได้)
  const loadInitialData = async () => {
    try {
      const rows = await fetchSheetData(SHEET_NAMES.SHOW || "SHOW");
      // ตัดหัวตารางออก
      setRawData(rows.length > 1 ? rows.slice(1) : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // ฟังก์ชันกดค้นหา
  const handleSearch = () => {
    setLoading(true);
    setHasSearched(true);

    let filtered = rawData.map((r, i) => ({
      id: i + 1,
      code: r[1] || "-",
      name: r[2] || "-",
      category: r[0] || "-", // สมมติคอลัมน์ 0 คือหมวดหมู่
      location: r[3] || "-",
      status: r[4] || "-",
      note: r[5] || "-"
    }));

    // กรองตามชื่อ/รหัส
    if (filters.search) {
      filtered = filtered.filter(item => 
        item.code.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.name.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // กรองตามสถานะ
    if (filters.status) {
      filtered = filtered.filter(item => item.status === filters.status);
    }

    // กรองตามหมวดหมู่
    if (filters.category) {
      filtered = filtered.filter(item => item.category === filters.category);
    }

    setDisplayData(filtered);
    setLoading(false);
  };

  // ฟังก์ชันดาวน์โหลด (ส่ง Filter ไปที่ Server ด้วย)
  const handleExport = async (format) => {
    if (displayData.length === 0) {
      return Swal.fire('คำเตือน', 'กรุณาค้นหาและเลือกข้อมูลที่ต้องการออกรายงาน', 'warning');
    }

    Swal.fire({
      title: `กำลังสร้างไฟล์ ${format.toUpperCase()}...`,
      text: 'ระบบกำลังดึงข้อมูลตามเงื่อนไขที่ท่านเลือก',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      // ส่ง payload filters ไปด้วย เพื่อให้ backend กรองข้อมูลชุดเดียวกัน
      const res = await postAction(SHEET_NAMES.SHOW || "SHOW", "generateReport", { 
        format,
        filters: filters, // ส่งเงื่อนไขการกรองไปที่ Apps Script
        dataCount: displayData.length 
      });

      if (res && res.fileData) {
        const base64 = res.fileData.replace(/-/g, '+').replace(/_/g, '/');
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/octet-stream" });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = res.fileName || `report_${filters.status || 'all'}.${format === 'doc' ? 'docx' : 'pdf'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        Swal.fire('สำเร็จ', 'ดาวน์โหลดเอกสารแล้ว', 'success');
      }
    } catch (e) {
      Swal.fire('ผิดพลาด', 'เกิดข้อผิดพลาดในการสร้างไฟล์', 'error');
    }
  };

  return (
    <div className="container-fluid py-3">
      {/* Search & Filter Section */}
      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body p-4">
          <h5 className="fw-bold mb-3"><i className="bi bi-filter-square me-2"></i>เลือกเงื่อนไขรายงาน</h5>
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label small fw-bold text-muted">ค้นหา รหัส/ชื่อ</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="ระบุรหัสหรือชื่อครุภัณฑ์..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-bold text-muted">สถานะ</label>
              <select 
                className="form-select"
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
              >
                <option value="">ทั้งหมด</option>
                <option value="ใช้งานได้">ใช้งานได้</option>
                <option value="ชำรุด">ชำรุด</option>
                <option value="ส่งซ่อม">ส่งซ่อม</option>
                <option value="เสื่อมสภาพ">เสื่อมสภาพ</option>
              </select>
            </div>
            <div className="col-md-3 d-flex align-items-end gap-2">
              <button className="btn btn-primary w-100" onClick={handleSearch}>
                <i className="bi bi-search me-1"></i> ค้นหาข้อมูล
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
          <h5 className="fw-bold text-primary m-0">
            {hasSearched ? `พบข้อมูล ${displayData.length} รายการ` : "📄 รายงานสรุป"}
          </h5>
          {hasSearched && displayData.length > 0 && (
            <div className="d-flex gap-2">
              <button className="btn btn-danger btn-sm px-3" onClick={() => handleExport('pdf')}>
                <i className="bi bi-file-earmark-pdf me-1"></i> PDF
              </button>
              <button className="btn btn-primary btn-sm px-3" onClick={() => handleExport('doc')}>
                <i className="bi bi-file-earmark-word me-1"></i> Word
              </button>
            </div>
          )}
        </div>

        <div className="table-responsive p-0">
          <table className="table table-hover align-middle m-0">
            <thead className="table-light text-center">
              <tr>
                <th width="5%">ลำดับ</th>
                <th width="15%">รหัสครุภัณฑ์</th>
                <th width="30%">รายการ</th>
                <th width="15%">สถานะ</th>
                <th width="15%">สถานที่</th>
                <th>หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {!hasSearched ? (
                <tr>
                  <td colSpan="6" className="text-center py-5">
                    <div className="text-muted">
                      <i className="bi bi-info-circle fs-2 d-block mb-2"></i>
                      กรุณาเลือกเงื่อนไขและกดปุ่มค้นหาเพื่อแสดงข้อมูล
                    </div>
                  </td>
                </tr>
              ) : loading ? (
                <tr><td colSpan="6" className="text-center p-5">กำลังค้นหา...</td></tr>
              ) : displayData.length === 0 ? (
                <tr><td colSpan="6" className="text-center p-5 text-muted">ไม่พบข้อมูลที่ตรงกับเงื่อนไข</td></tr>
              ) : (
                displayData.map((item, idx) => (
                  <tr key={idx}>
                    <td className="text-center">{idx + 1}</td>
                    <td className="fw-bold text-primary text-center">{item.code}</td>
                    <td>{item.name}</td>
                    <td className="text-center">
                      <span className={`badge rounded-pill ${
                        item.status === 'ใช้งานได้' ? 'bg-success' : 
                        item.status === 'ชำรุด' ? 'bg-danger' : 
                        item.status === 'เสื่อมสภาพ' ? 'bg-warning text-dark' : 'bg-info'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="text-center">{item.location}</td>
                    <td className="small text-muted">{item.note}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Report;