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

  useEffect(() => {
    const filtered = data.filter(item => {
      // ใช้ฟังก์ชันช่วยหาค่าจากคอลัมน์เพื่อกันชื่อไม่ตรง
      const getValue = (keys) => {
        const foundKey = Object.keys(item).find(k => keys.includes(k.trim()));
        return String(item[foundKey] || "").trim();
      };

      const name = getValue(["ชื่อครุภัณฑ์", "รายการ"]);
      const code = getValue(["รหัสครุภัณฑ์", "รหัส"]);
      const status = getValue(["สถานะ"]);
      const location = getValue(["ที่เก็บ", "สถานที่เก็บ"]);
      const category = getValue(["หมวดหมู่", "หมวด"]);

      return (
        (searchTerm === "" || name.toLowerCase().includes(searchTerm.toLowerCase()) || code.includes(searchTerm)) &&
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
        // ล้างข้อมูล #N/A และแถวว่างออกทันที
        const clean = resData.filter(row => {
          const vals = Object.values(row).join("");
          return vals && !vals.includes("#N/A") && row["รหัสครุภัณฑ์"];
        });
        setData(clean);
        setFilteredData(clean);
      }
      
      if (Array.isArray(resLogin) && resLogin.length > 0) {
        // หาคอลัมน์ที่ชื่อ Name (D)
        const userRow = resLogin.find(u => u["Name"] || u["name"]);
        setUserName(userRow ? (userRow["Name"] || userRow["name"]) : "ผู้รับผิดชอบ");
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

      // ส่วนหัวรายงาน
      doc.setFontSize(18);
      doc.text("ใบรายงานสรุปข้อมูลครุภัณฑ์", 105, 15, { align: "center" });
      doc.setFontSize(11);
      doc.text(`วันที่ออกรายงาน: ${new Date().toLocaleDateString('th-TH')}`, 195, 25, { align: "right" });

      autoTable(doc, {
        startY: 30,
        head: [['ลำดับ', 'รหัสครุภัณฑ์', 'รายการครุภัณฑ์', 'สถานที่เก็บ', 'สถานะ']],
        body: filteredData.map((item, idx) => [
          idx + 1, item["รหัสครุภัณฑ์"], item["ชื่อครุภัณฑ์"], item["ที่เก็บ"] || "-", item["สถานะ"] || "-"
        ]),
        styles: { font: "Sarabun", fontSize: 10 },
        headStyles: { font: "Sarabun", fontStyle: 'normal', fillColor: [240, 240, 240], textColor: 0, halign: 'center' }
      });

      const finalY = doc.lastAutoTable.finalY + 20;
      doc.text("ลงชื่อ......................................................ผู้ออกรายงาน", 130, finalY);
      doc.text(`( ${userName} )`, 152, finalY + 8, { align: "center" });

      doc.save(`Report_${Date.now()}.pdf`);
    } catch (e) { alert("Error: ไม่พบไฟล์ฟอนต์ใน public/fonts/"); }
    setLoading(false);
  };

  // ฟังก์ชันดึงรายการ Unique สำหรับ Dropdown
  const getUniqueValues = (keyNames) => {
    return [...new Set(data.map(item => {
      const foundKey = Object.keys(item).find(k => keyNames.includes(k.trim()));
      return String(item[foundKey] || "").trim();
    }))].filter(v => v && v !== "undefined" && !v.includes("#"));
  };

  return (
    <div className="container mt-4">
      <div className="card p-3 shadow-sm bg-light mb-4">
        <div className="row g-2">
          <div className="col-md-3">
            <input type="text" className="form-control" placeholder="ค้นหา..." onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="col-md-2">
            <select className="form-select" onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="">ทุกหมวดหมู่</option>
              {getUniqueValues(["หมวดหมู่", "หมวด"]).map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="col-md-2">
            <select className="form-select" onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">ทุกสถานะ</option>
              {getUniqueValues(["สถานะ"]).map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="col-md-2">
            <select className="form-select" onChange={(e) => setFilterLocation(e.target.value)}>
              <option value="">ทุกที่เก็บ</option>
              {getUniqueValues(["ที่เก็บ", "สถานที่เก็บ"]).map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="col-md-3">
            <button className="btn btn-primary w-100" onClick={exportPDF} disabled={loading}>
              {loading ? 'กำลังโหลด...' : 'ออกรายงาน PDF'}
            </button>
          </div>
        </div>
      </div>

      <div className="table-responsive border" style={{ maxHeight: '500px' }}>
        <table className="table table-sm table-hover bg-white">
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