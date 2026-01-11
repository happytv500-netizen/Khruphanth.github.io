import React, { useState, useEffect } from 'react';
import { fetchScriptData } from '../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Report = () => {
  const [data, setData] = useState([]); // ข้อมูลต้นฉบับ
  const [filteredData, setFilteredData] = useState([]); // ข้อมูลที่กรองแล้ว
  const [userName, setUserName] = useState(""); // ชื่อจาก LOGIN
  const [loading, setLoading] = useState(false);
  
  // ตัวแปรสำหรับ Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  useEffect(() => { 
    loadInitialData(); 
  }, []);

  // กรองข้อมูลทุกครั้งที่ค่า Filter เปลี่ยน
  useEffect(() => {
    const filtered = data.filter(item => {
      return (
        (searchTerm === "" || String(item["ชื่อครุภัณฑ์"]).includes(searchTerm) || String(item["รหัสครุภัณฑ์"]).includes(searchTerm)) &&
        (filterStatus === "" || item["สถานะ"] === filterStatus) &&
        (filterLocation === "" || item["ที่เก็บ"] === filterLocation) &&
        (filterCategory === "" || item["หมวดหมู่"] === filterCategory)
      );
    });
    setFilteredData(filtered);
  }, [searchTerm, filterStatus, filterLocation, filterCategory, data]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const resData = await fetchScriptData("DATA"); // ดึงจากชีท DATA เพื่อเอาหมวดหมู่
      const resLogin = await fetchScriptData("LOGIN"); // ดึงชื่อผู้ใช้

      if (Array.isArray(resData)) {
        const clean = resData.filter(row => row["รหัสครุภัณฑ์"] && !String(row["รหัสครุภัณฑ์"]).includes("#"));
        setData(clean);
        setFilteredData(clean);
      }
      
      if (Array.isArray(resLogin) && resLogin.length > 0) {
        setUserName(resLogin[0]["Name"] || "ไม่ได้ระบุชื่อ"); // ดึงคอลัมน์ D=Name
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const loadFont = async () => {
    const response = await fetch('/fonts/Sarabun-Regular.ttf');
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) { binary += String.fromCharCode(bytes[i]); }
    return window.btoa(binary);
  };

  const exportPDF = async () => {
    setLoading(true);
    const fontBase64 = await loadFont();
    const doc = new jsPDF('p', 'mm', 'a4');

    doc.addFileToVFS("Sarabun.ttf", fontBase64);
    doc.addFont("Sarabun.ttf", "Sarabun", "normal");
    doc.setFont("Sarabun");

    // --- ส่วนหัวรายงาน ---
    // doc.addImage(logoBase64, 'PNG', 15, 10, 20, 25); // เปิดใช้ถ้ามี Base64 โลโก้
    doc.setFontSize(16);
    doc.text("ใบรายงานสรุปข้อมูลครุภัณฑ์", 105, 15, { align: "center" });
    doc.setFontSize(12);
    doc.text("มหาวิทยาลัยเทคโนโลยีราชมงคลอีสาน วิทยาเขตขอนแก่น", 105, 22, { align: "center" });
    doc.setFontSize(10);
    doc.text(`วันที่ออกรายงาน: ${new Date().toLocaleDateString('th-TH')}`, 195, 28, { align: "right" });

    autoTable(doc, {
      startY: 35,
      head: [['ลำดับ', 'รหัสครุภัณฑ์', 'รายการครุภัณฑ์', 'หมวดหมู่', 'สถานะ']],
      body: filteredData.map((item, idx) => [
        idx + 1, item["รหัสครุภัณฑ์"], item["ชื่อครุภัณฑ์"], item["หมวดหมู่"], item["สถานะ"]
      ]),
      styles: { font: "Sarabun", fontSize: 10 },
      headStyles: { font: "Sarabun", fontStyle: 'normal', fillColor: [240, 240, 240], textColor: 0, halign: 'center' },
      didDrawPage: (d) => {
        doc.setFontSize(8);
        doc.text(`หน้า ${doc.internal.getNumberOfPages()}`, 190, 285, { align: 'right' });
      }
    });

    // --- ส่วนลงชื่อท้ายรายงาน ---
    const finalY = doc.lastAutoTable.finalY + 20;
    doc.setFontSize(12);
    doc.text("ลงชื่อ......................................................ผู้ออกรายงาน", 130, finalY);
    doc.text(`( ${userName} )`, 152, finalY + 8, { align: "center" });

    doc.save(`Report_${Date.now()}.pdf`);
    setLoading(false);
  };

  return (
    <div className="container mt-4">
      {/* ส่วน Filter ข้อมูล */}
      <div className="card shadow-sm mb-4 p-3">
        <div className="row g-2">
          <div className="col-md-3">
            <input type="text" className="form-control" placeholder="ค้นหาชื่อ/รหัส..." onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="col-md-3">
            <select className="form-select" onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="">ทุกหมวดหมู่</option>
              {[...new Set(data.map(item => item["หมวดหมู่"]))].map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div className="col-md-2">
            <select className="form-select" onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">ทุกสถานะ</option>
              <option value="ปกติ">ปกติ</option>
              <option value="ชำรุด">ชำรุด</option>
            </select>
          </div>
          <div className="col-md-2">
            <select className="form-select" onChange={(e) => setFilterLocation(e.target.value)}>
              <option value="">ทุกที่เก็บ</option>
              {[...new Set(data.map(item => item["ที่เก็บ"]))].map(loc => <option key={loc} value={loc}>{loc}</option>)}
            </select>
          </div>
          <div className="col-md-2">
            <button className="btn btn-primary w-100" onClick={exportPDF} disabled={loading}>{loading ? '...' : 'ออก PDF'}</button>
          </div>
        </div>
      </div>

      {/* พรีวิวตาราง */}
      <div className="table-responsive border" style={{ maxHeight: '500px' }}>
        <table className="table table-sm table-hover">
          <thead className="table-light sticky-top">
            <tr className="text-center"><th>ลำดับ</th><th>รหัส</th><th>ชื่อ</th><th>หมวด</th><th>สถานะ</th></tr>
          </thead>
          <tbody>
            {filteredData.map((row, idx) => (
              <tr key={idx}>
                <td className="text-center">{idx + 1}</td>
                <td>{row["รหัสครุภัณฑ์"]}</td>
                <td>{row["ชื่อครุภัณฑ์"]}</td>
                <td className="text-center">{row["หมวดหมู่"]}</td>
                <td className="text-center">{row["สถานะ"]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Report;