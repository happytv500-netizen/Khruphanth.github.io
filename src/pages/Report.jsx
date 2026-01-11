import React, { useState, useEffect } from 'react';
import { fetchScriptData } from '../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Report = () => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  useEffect(() => { loadInitialData(); }, []);

  // ระบบ Filter: ใช้ค่าที่ Trim แล้วทั้งหมด
  useEffect(() => {
    const filtered = data.filter(item => {
      const name = String(item["ชื่อครุภัณฑ์"] || "").toLowerCase();
      const code = String(item["รหัสครุภัณฑ์"] || "");
      const status = String(item["สถานะ"] || "").trim();
      const location = String(item["ที่เก็บ"] || "").trim();
      const category = String(item["หมวดหมู่"] || "").trim();

      return (
        (searchTerm === "" || name.includes(searchTerm.toLowerCase()) || code.includes(searchTerm)) &&
        (filterStatus === "" || status === filterStatus) &&
        (filterLocation === "" || location === filterLocation) &&
        (filterCategory === "" || category === filterCategory)
      );
    });
    setFilteredData(filtered);
  }, [searchTerm, filterStatus, filterLocation, filterCategory, data]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [resData, resLogin] = await Promise.all([
        fetchScriptData("DATA"),
        fetchScriptData("LOGIN")
      ]);

      if (Array.isArray(resData)) {
        // หัวใจสำคัญ: ล้างช่องว่างออกจากชื่อคอลัมน์ (Keys) ทั้งหมด
        const cleanKeysData = resData.map(row => {
          const newRow = {};
          Object.keys(row).forEach(key => {
            newRow[key.trim()] = row[key];
          });
          return newRow;
        });

        // กรองแถวที่มีข้อมูลจริงและไม่ใช่ค่า Error
        const finalData = cleanKeysData.filter(row => 
          row["รหัสครุภัณฑ์"] && !String(row["รหัสครุภัณฑ์"]).includes("#N/A")
        );
        
        setData(finalData);
        setFilteredData(finalData);
      }
      
      if (Array.isArray(resLogin) && resLogin.length > 0) {
        // ล้าง Key ของชีท LOGIN ด้วย
        const cleanLogin = resLogin.map(row => {
          const newRow = {};
          Object.keys(row).forEach(key => { newRow[key.trim()] = row[key]; });
          return newRow;
        });
        const user = cleanLogin.find(u => u["Name"]);
        setUserName(user ? user["Name"] : "ผู้รับผิดชอบ");
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const exportPDF = async () => {
    setLoading(true);
    try {
      const response = await fetch('/fonts/Sarabun-Regular.ttf');
      const arrayBuffer = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const fontBase64 = window.btoa(binary);

      const doc = new jsPDF('p', 'mm', 'a4');
      doc.addFileToVFS("Sarabun.ttf", fontBase64);
      doc.addFont("Sarabun.ttf", "Sarabun", "normal");
      doc.setFont("Sarabun");

      // หัวรายงาน
      doc.setFontSize(18);
      doc.text("ใบรายงานสรุปข้อมูลครุภัณฑ์", 105, 15, { align: "center" });
      doc.setFontSize(10);
      doc.text(`วันที่ออกรายงาน: ${new Date().toLocaleDateString('th-TH')}`, 195, 25, { align: "right" });

      autoTable(doc, {
        startY: 30,
        head: [['ลำดับ', 'รหัสครุภัณฑ์', 'รายการครุภัณฑ์', 'สถานที่เก็บ', 'สถานะ']],
        body: filteredData.map((item, idx) => [
          idx + 1, 
          item["รหัสครุภัณฑ์"], 
          item["ชื่อครุภัณฑ์"], 
          item["ที่เก็บ"] || "-", 
          item["สถานะ"] || "-"
        ]),
        styles: { font: "Sarabun", fontSize: 10 },
        headStyles: { font: "Sarabun", fontStyle: 'normal', fillColor: [240, 240, 240], textColor: 0, halign: 'center' }
      });

      const finalY = doc.lastAutoTable.finalY + 20;
      doc.text("ลงชื่อ......................................................ผู้ออกรายงาน", 130, finalY);
      doc.text(`( ${userName} )`, 152, finalY + 8, { align: "center" });

      doc.save(`Report_${Date.now()}.pdf`);
    } catch (e) { alert("ไม่พบไฟล์ฟอนต์"); }
    setLoading(false);
  };

  // ดึงค่า Unique สำหรับตัวเลือก Dropdown
  const getOptions = (key) => {
    return [...new Set(data.map(item => String(item[key] || "").trim()))]
      .filter(v => v && v !== "undefined" && !v.includes("#"));
  };

  return (
    <div className="container mt-4">
      <div className="card p-3 shadow-sm bg-light mb-4">
        <div className="row g-2">
          <div className="col-md-3">
            <input type="text" className="form-control" placeholder="ค้นหาชื่อ/รหัส..." onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="col-md-2">
            <select className="form-select" onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="">ทุกหมวดหมู่</option>
              {getOptions("หมวดหมู่").map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="col-md-2">
            <select className="form-select" onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">ทุกสถานะ</option>
              {getOptions("สถานะ").map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="col-md-2">
            <select className="form-select" onChange={(e) => setFilterLocation(e.target.value)}>
              <option value="">ทุกที่เก็บ</option>
              {getOptions("ที่เก็บ").map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="col-md-3">
            <button className="btn btn-primary w-100" onClick={exportPDF} disabled={loading}>ออก PDF</button>
          </div>
        </div>
      </div>

      <div className="table-responsive border rounded bg-white" style={{ maxHeight: '500px' }}>
        <table className="table table-sm m-0">
          <thead className="table-dark sticky-top text-center">
            <tr><th>#</th><th>รหัส</th><th>ชื่อครุภัณฑ์</th><th>ที่เก็บ</th><th>สถานะ</th></tr>
          </thead>
          <tbody>
            {filteredData.map((row, idx) => (
              <tr key={idx}>
                <td className="text-center">{idx + 1}</td>
                <td>{row["รหัสครุภัณฑ์"]}</td>
                <td>{row["ชื่อครุภัณฑ์"]}</td>
                <td>{row["ที่เก็บ"]}</td>
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