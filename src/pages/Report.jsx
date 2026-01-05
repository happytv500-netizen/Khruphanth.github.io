import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { fetchSheetData, postAction } from '../services/api';
import { SHEET_NAMES } from '../config/config';
import { formatDate } from '../utils/formatter';

const Report = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // โหลดข้อมูลรายงาน
  const loadReport = async () => {
    setLoading(true);
    try {
      // ใช้ fetchSheetData (GViz) เพื่อความเร็วและสม่ำเสมอ
      const rows = await fetchSheetData(SHEET_NAMES.REPORT || "REPORT");
      
      // Map ข้อมูล (ปรับ Index ตามคอลัมน์จริงใน Sheet REPORT ของคุณ)
      // สมมติ: [0:ID, 1:Name, 2:Detail, 3:Date]
      const items = rows.map((r, i) => ({
        row: i + 2, // เก็บเลขแถวสำหรับลบ
        id: r[0] || "",
        name: r[1] || "",
        detail: r[2] || "",
        date: r[3] || ""
      }));
      setData(items);
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'โหลดข้อมูลไม่สำเร็จ', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadReport();
  }, []);

  // ฟังก์ชันลบ
  const handleDelete = async (row) => {
    const result = await Swal.fire({
      title: 'ยืนยันการลบ?',
      text: "ข้อมูลจะหายไปถาวร",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'ลบข้อมูล'
    });

    if (result.isConfirmed) {
      Swal.fire({ title: 'กำลังลบ...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      
      const res = await postAction(SHEET_NAMES.REPORT || "REPORT", "delete", { row });
      
      if (res && res.status !== 'error') {
        Swal.fire('ลบเสร็จสิ้น', '', 'success');
        loadReport();
      } else {
        Swal.fire('ผิดพลาด', 'ลบข้อมูลไม่สำเร็จ', 'error');
      }
    }
  };

  // ฟังก์ชันสร้างเอกสาร (PDF/Word)
  const handleExport = async (format) => {
    Swal.fire({
      title: `กำลังสร้างไฟล์ ${format.toUpperCase()}...`,
      text: 'กรุณารอสักครู่',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    // ส่งคำขอไป Google Script (ฟังก์ชัน generateReport)
    // หมายเหตุ: ต้องมั่นใจว่าใน Google Apps Script มีฟังก์ชันรองรับ case 'generateReport'
    const res = await postAction(SHEET_NAMES.SHOW || "SHOW", "generateReport", { format });

    if (res && res.fileData) {
      // แปลง Base64 เป็นไฟล์แล้วดาวน์โหลด
      const link = document.createElement('a');
      link.href = `data:application/octet-stream;base64,${res.fileData}`;
      link.download = res.fileName || `report.${format === 'doc' ? 'docx' : 'pdf'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      Swal.fire('สำเร็จ', 'ดาวน์โหลดเอกสารแล้ว', 'success');
    } else {
      Swal.fire('ผิดพลาด', 'ไม่สามารถสร้างเอกสารได้', 'error');
    }
  };

  return (
    <div className="card border-0 shadow-sm rounded-4">
      {/* Header */}
      <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <h5 className="fw-bold text-primary m-0">📄 รายงานสรุป</h5>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={loadReport}>
            <i className="bi bi-arrow-clockwise"></i> รีเฟรช
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => handleExport('pdf')}>
            <i className="bi bi-file-earmark-pdf me-1"></i> PDF
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => handleExport('doc')}>
            <i className="bi bi-file-earmark-word me-1"></i> Word
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="table-responsive p-3">
        <table className="table table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th>รหัส</th>
              <th>ชื่อรายการ</th>
              <th>รายละเอียด</th>
              <th>วันที่</th>
              <th className="text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="text-center p-4">กำลังโหลดข้อมูล...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan="5" className="text-center p-4 text-muted">ไม่พบข้อมูลรายงาน</td></tr>
            ) : (
              data.map((item, idx) => (
                <tr key={idx}>
                  <td className="fw-bold text-primary">{item.id}</td>
                  <td>{item.name}</td>
                  <td>{item.detail}</td>
                  <td>{formatDate(item.date)}</td>
                  <td className="text-center">
                    <button 
                      className="btn btn-light btn-sm text-danger border" 
                      onClick={() => handleDelete(item.row)}
                      title="ลบรายการ"
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Report;