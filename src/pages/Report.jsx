import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import { fetchSheetData } from '../services/api';
import { SHEET_NAMES } from '../config/config';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const Report = () => {
  const [rawData, setRawData] = useState([]);
  const [displayData, setDisplayData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [filters, setFilters] = useState({ search: '', status: '' });
  
  const reportRef = useRef(); // สำหรับอ้างอิงส่วนที่จะพิมพ์ PDF

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

  const exportPDF = async () => {
    const element = reportRef.current;
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`report_${new Date().getTime()}.pdf`);
  };

  return (
    <div className="container py-4">
      {/* Search Filter */}
      <div className="card border-0 shadow-sm mb-4 no-print">
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
            </select>
          </div>
          <div className="col-md-3">
            <button className="btn btn-primary w-100" onClick={handleSearch}>ค้นหา</button>
          </div>
        </div>
      </div>

      {hasSearched && (
        <div className="text-end mb-3 no-print">
          <button className="btn btn-danger" onClick={exportPDF}>
            <i className="bi bi-file-earmark-pdf"></i> ออกรายงาน PDF
          </button>
        </div>
      )}

      {/* พื้นที่รายงาน (โครงสร้างตามไฟล์แนบ) */}
      <div ref={reportRef} className="bg-white p-5 shadow-sm mx-auto" style={{ width: '210mm', minHeight: '297mm', color: '#000' }}>
        <div className="text-center mb-4">
          <h4 className="fw-bold">ใบรายงานสรุปสถานะครุภัณฑ์</h4>
          <p className="mb-1">ระบบจัดการข้อมูลครุภัณฑ์ออนไลน์</p>
          <hr />
        </div>

        <div className="row mb-4">
          <div className="col-8">
            <p className="mb-1"><strong>ผู้พิมรายงาน:</strong> แอดมินระบบ</p>
            <p className="mb-1"><strong>หน่วยงาน:</strong> สาขาวิชาเทคโนโลยีคอมพิวเตอร์</p>
          </div>
          <div className="col-4 text-end">
            <p className="mb-1"><strong>วันที่:</strong> {new Date().toLocaleDateString('th-TH')}</p>
            <p className="mb-1"><strong>เลขที่อ้างอิง:</strong> RE-{Math.floor(Math.random() * 1000000)}</p>
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

        <div className="mt-5 row">
          <div className="col-7"></div>
          <div className="col-5 text-center">
            <p className="mb-5">(ลงชื่อ)...........................................................</p>
            <p>ผู้ออกรายงาน</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Report;