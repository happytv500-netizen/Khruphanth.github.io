import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { fetchSheetData, postAction } from '../services/api';
import { SHEET_NAMES } from '../config/config';

const Report = () => {
  const [rawData, setRawData] = useState([]);
  const [displayData, setDisplayData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [filters, setFilters] = useState({ search: '', status: '' });

  useEffect(() => {
    const load = async () => {
      const rows = await fetchSheetData(SHEET_NAMES.SHOW || "SHOW");
      setRawData(rows.length > 1 ? rows.slice(1) : []);
    };
    load();
  }, []);

  const handleSearch = () => {
    setLoading(true);
    setHasSearched(true);
    let filtered = rawData.map((r, i) => ({
      id: i + 1,
      code: r[1] || "-",
      name: r[2] || "-",
      location: r[3] || "-",
      status: r[4] || "-",
      note: r[5] || "-"
    }));

    if (filters.search) {
      filtered = filtered.filter(item => 
        item.code.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.name.toLowerCase().includes(filters.search.toLowerCase())
      );
    }
    if (filters.status) {
      filtered = filtered.filter(item => item.status === filters.status);
    }
    setDisplayData(filtered);
    setLoading(false);
  };

  // เปลี่ยนมาใช้การเรียก GAS แทนการใช้ html2canvas
  const handleExport = async (format) => {
    if (displayData.length === 0) return;

    Swal.fire({
      title: `กำลังสร้างไฟล์ ${format.toUpperCase()}...`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      // ส่งคำสั่งไปที่ Google Apps Script
      const res = await postAction(SHEET_NAMES.SHOW || "SHOW", "generateReport", { 
        format: format,
        filters: filters 
      });

      if (res && res.fileData) {
        // แปลง Base64 กลับเป็นไฟล์เพื่อดาวน์โหลด
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
        link.download = res.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        Swal.fire('สำเร็จ', 'ดาวน์โหลดรายงานเรียบร้อย', 'success');
      } else {
        throw new Error(res.message || "สร้างไฟล์ไม่สำเร็จ");
      }
    } catch (e) {
      console.error(e);
      Swal.fire('ผิดพลาด', 'ไม่สามารถสร้างรายงานได้: ' + e.message, 'error');
    }
  };

  return (
    <div className="container py-4">
      {/* ส่วน Filter เหมือนเดิม */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body row g-3">
          <div className="col-md-5">
            <input type="text" className="form-control" placeholder="ค้นหารหัส/ชื่อ..." 
              onChange={(e) => setFilters({...filters, search: e.target.value})} />
          </div>
          <div className="col-md-4">
            <select className="form-select" onChange={(e) => setFilters({...filters, status: e.target.value})}>
              <option value="">ทุกสถานะ</option>
              <option value="ใช้งานได้">ใช้งานได้</option>
              <option value="ชำรุด">ชำรุด</option>
              <option value="ส่งซ่อม">ส่งซ่อม</option>
              <option value="เสื่อมสภาพ">เสื่อมสภาพ</option>
            </select>
          </div>
          <div className="col-md-3">
            <button className="btn btn-primary w-100" onClick={handleSearch}>ค้นหา</button>
          </div>
        </div>
      </div>

      {hasSearched && (
        <div className="text-end mb-3">
          <button className="btn btn-danger me-2" onClick={() => handleExport('pdf')}>
            <i className="bi bi-file-earmark-pdf"></i> PDF (จากระบบ)
          </button>
          <button className="btn btn-primary" onClick={() => handleExport('doc')}>
            <i className="bi bi-file-earmark-word"></i> Word
          </button>
        </div>
      )}

      {/* ตารางแสดงตัวอย่างบนเว็บ */}
      <div className="bg-white p-4 shadow-sm">
        <table className="table table-bordered">
          <thead className="table-light text-center">
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
                <td>{item.code}</td>
                <td>{item.name}</td>
                <td className="text-center">{item.status}</td>
                <td>{item.location}</td>
              </tr>
            )) : (
              <tr><td colSpan="5" className="text-center py-4 text-muted">กรุณากดค้นหาเพื่อแสดงข้อมูล</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Report;