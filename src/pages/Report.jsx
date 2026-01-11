import React, { useState, useEffect, useRef } from 'react';
import { fetchScriptData } from '../services/api';
import { SHEET_NAMES } from '../config/config';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const Report = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const reportRef = useRef();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    // ดึงข้อมูลจาก sheet "SHOW" ตามภาพ
    const res = await fetchScriptData("SHOW"); 
    setData(res);
    setLoading(false);
  };

  const exportPDF = async () => {
    setLoading(true);
    const element = reportRef.current;
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`รายงานครุภัณฑ์_${Date.now()}.pdf`);
    setLoading(false);
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4><i className="bi bi-file-earmark-text me-2"></i>ออกรายงานครุภัณฑ์</h4>
        <button className="btn btn-danger" onClick={exportPDF} disabled={loading || data.length === 0}>
          {loading ? 'กำลังประมวลผล...' : 'ดาวน์โหลด PDF (A4)'}
        </button>
      </div>

      {/* ส่วนที่ html2canvas จะจับภาพ */}
      <div ref={reportRef} className="bg-white p-5 border" style={{ minWidth: '800px' }}>
        <h3 className="text-center mb-4">รายงานสรุปข้อมูลครุภัณฑ์</h3>
        <p className="text-end">วันที่ออกรายงาน: {new Date().toLocaleDateString('th-TH')}</p>
        
        <table className="table table-bordered border-dark">
          <thead className="table-secondary text-center">
            <tr>
              <th style={{ width: '50px' }}>ลำดับ</th>
              <th style={{ width: '150px' }}>รหัสครุภัณฑ์</th>
              <th>ชื่อครุภัณฑ์</th>
              <th style={{ width: '80px' }}>ที่เก็บ</th>
              <th style={{ width: '100px' }}>สถานะ</th>
              <th>รายละเอียดเพิ่มเติม</th>
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? data.map((row, index) => (
              <tr key={index}>
                <td className="text-center">{index + 1}</td>
                <td>{row["รหัสครุภัณฑ์"] || ""}</td>
                <td>{row["ชื่อครุภัณฑ์"] || ""}</td>
                <td className="text-center">{row["ที่เก็บ"] || ""}</td>
                <td className="text-center">{row["สถานะ"] || ""}</td>
                <td>{row["รายละเอียดเพิ่มเติม"] || ""}</td>
              </tr>
            )) : (
              <tr><td colSpan="6" className="text-center">ไม่พบข้อมูล</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Report;