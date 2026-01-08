import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import { fetchSheetData, postAction } from '../services/api';
import { SHEET_NAMES } from '../config/config';
import { AuthService } from '../services/auth'; //

const Report = () => {
  const [rawData, setRawData] = useState([]);
  const [displayData, setDisplayData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [filters, setFilters] = useState({ search: '', status: '' });
  const [currentUser, setCurrentUser] = useState(null);
  const reportRef = useRef();

  useEffect(() => {
    // ดึงข้อมูลผู้ใช้จาก Session/LocalStorage
    const user = AuthService.getCurrentUser();
    setCurrentUser(user);

    const load = async () => {
      const rows = await fetchSheetData(SHEET_NAMES.SHOW || "SHOW");
      // ตัดหัวตาราง (Header) ออก
      setRawData(rows.length > 1 ? rows.slice(1) : []);
    };
    load();
  }, []);

  const handleSearch = () => {
    setLoading(true);
    setHasSearched(true);
    
    let filtered = rawData.map((r, i) => ({
      id: i + 1,
      code: String(r[1] || "-"),
      name: String(r[2] || "-"),
      location: String(r[3] || "-"),
      status: String(r[4] || "-"),
      note: String(r[5] || "-")
    }));

    const s = String(filters.search || "").toLowerCase();
    if (s) {
      filtered = filtered.filter(item => 
        item.code.toLowerCase().includes(s) || item.name.toLowerCase().includes(s)
      );
    }
    if (filters.status) {
      filtered = filtered.filter(item => item.status === filters.status);
    }
    
    setDisplayData(filtered);
    setLoading(false);
  };

  const handleExport = async (format) => {
    if (displayData.length === 0) return;
    
    Swal.fire({ 
      title: `กำลังสร้าง ${format.toUpperCase()}...`, 
      allowOutsideClick: false, 
      didOpen: () => Swal.showLoading() 
    });

    try {
      const res = await postAction(SHEET_NAMES.SHOW || "SHOW", "generateReport", { 
        format: format,
        filters: {
          search: String(filters.search || ""),
          status: String(filters.status || "")
        }
      });

      if (res && res.ok && res.fileData) {
        const base64 = res.fileData.replace(/-/g, '+').replace(/_/g, '/');
        const byteArray = new Uint8Array(atob(base64).split("").map(c => c.charCodeAt(0)));
        const url = URL.createObjectURL(new Blob([byteArray], { type: "application/octet-stream" }));
        const link = document.createElement('a');
        link.href = url;
        link.download = res.fileName;
        link.click();
        Swal.fire('สำเร็จ', 'ดาวน์โหลดรายงานเรียบร้อย', 'success');
      } else {
        Swal.fire('ผิดพลาด', res.message || 'สร้างไฟล์ไม่สำเร็จ', 'error');
      }
    } catch (e) {
      Swal.fire('ผิดพลาด', 'ระบบเชื่อมต่อ Server ไม่ได้', 'error');
    }
  };

  return (
    <div className="container py-4">
      {/* 🟢 แถวเลือกเงื่อนไข (Filter) */}
      <div className="card border-0 shadow-sm mb-4 no-print">
        <div className="card-body row g-3">
          <div className="col-md-5">
            <label className="form-label small fw-bold">ค้นหารหัส/ชื่อ</label>
            <input type="text" className="form-control" placeholder="พิมพ์เพื่อค้นหา..." 
              onChange={(e) => setFilters({...filters, search: e.target.value})} />
          </div>
          <div className="col-md-4">
            <label className="form-label small fw-bold">สถานะ</label>
            <select className="form-select" onChange={(e) => setFilters({...filters, status: e.target.value})}>
              <option value="">ทุกสถานะ</option>
              <option value="ใช้งานได้">ใช้งานได้</option>
              <option value="ชำรุด">ชำรุด</option>
              <option value="ส่งซ่อม">ส่งซ่อม</option>
              <option value="เสื่อมสภาพ">เสื่อมสภาพ</option>
            </select>
          </div>
          <div className="col-md-3 d-flex align-items-end">
            <button className="btn btn-primary w-100" onClick={handleSearch}>
              <i className="bi bi-search me-2"></i>ค้นหาข้อมูล
            </button>
          </div>
        </div>
      </div>

      {/* ปุ่มออกรายงาน */}
      {hasSearched && displayData.length > 0 && (
        <div className="text-end mb-3 no-print">
          <button className="btn btn-danger me-2" onClick={() => handleExport('pdf')}>
            <i className="bi bi-file-earmark-pdf me-1"></i>PDF
          </button>
          <button className="btn btn-primary" onClick={() => handleExport('doc')}>
            <i className="bi bi-file-earmark-word me-1"></i>Word
          </button>
        </div>
      )}

      {/* 📄 พื้นที่แสดงฟอร์มรายงาน */}
      <div ref={reportRef} className="bg-white p-5 shadow-sm mx-auto" style={{ width: '210mm', minHeight: '297mm', color: '#000' }}>
        <div className="text-center mb-4">
          <h4 className="fw-bold">ใบรายงานสรุปสถานะครุภัณฑ์</h4>
          <p>ระบบจัดการข้อมูลครุภัณฑ์ออนไลน์</p>
          <hr />
        </div>
        
        <div className="row mb-4">
          <div className="col-8">
            <p className="mb-1"><strong>ผู้พิมพ์รายงาน:</strong> {currentUser ? currentUser.name : 'แอดมินระบบ'}</p>
            <p><strong>หน่วยงาน:</strong> คณะ/สาขา ครุศาสตร์อุตสาหกรรม คอมพิวเตอร์</p>
          </div>
          <div className="col-4 text-end">
            <p><strong>วันที่:</strong> {new Date().toLocaleDateString('th-TH')}</p>
          </div>
        </div>

        <table className="table table-bordered border-dark">
          <thead className="text-center bg-light">
            <tr>
              <th>ลำดับ</th>
              <th>รหัสครุภัณฑ์</th>
              <th>ชื่อรายการ</th>
              <th>สถานะ</th>
              <th>สถานที่</th>
            </tr>
          </thead>
          <tbody>
            {displayData.length > 0 ? displayData.map((item, idx) => (
              <tr key={idx}>
                <td className="text-center">{idx + 1}</td>
                <td className="text-center">{item.code}</td>
                <td>{item.name}</td>
                <td className="text-center">{item.status}</td>
                <td>{item.location}</td>
              </tr>
            )) : (
              <tr><td colSpan="5" className="text-center py-5 text-muted">กรุณาเลือกเงื่อนไขและกดปุ่มค้นหา</td></tr>
            )}
          </tbody>
        </table>

        <div className="mt-5 row">
          <div className="col-7"></div>
          <div className="col-5 text-center">
            <p className="mb-5">ลงชื่อ...........................................................</p>
            <p>ผู้ออกรายงาน</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Report;