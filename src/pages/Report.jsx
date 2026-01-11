import React, { useState, useEffect } from 'react';
import { fetchScriptData } from '../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Report = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchScriptData("SHOW");
      if (Array.isArray(res)) {
        const cleanData = res.filter(row => {
          const id = String(row["รหัสครุภัณฑ์"] || "");
          return id && id !== "รหัสครุภัณฑ์" && !id.includes("#");
        });
        setData(cleanData);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  // ฟังก์ชันโหลดไฟล์ .ttf แล้วแปลงเป็น Base64 เพื่อให้ jsPDF ใช้งาน
  const fetchFontAsBase64 = async (url) => {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  const exportPDF = async () => {
    setLoading(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');

      // 1. โหลดฟอนต์ Sarabun จากแหล่งออนไลน์ (GitHub ของ Google Fonts)
      const fontUrl = 'https://raw.githubusercontent.com/google/fonts/master/ofl/sarabun/Sarabun-Regular.ttf';
      const fontBase64 = await fetchFontAsBase64(fontUrl);
      
      // 2. ลงทะเบียนฟอนต์ในเอกสาร
      doc.addFileToVFS("Sarabun.ttf", fontBase64);
      doc.addFont("Sarabun.ttf", "Sarabun", "normal");
      doc.setFont("Sarabun");

      // 3. วาดหัวกระดาษ
      doc.setFontSize(18);
      doc.text("ใบรายงานสรุปข้อมูลครุภัณฑ์", 105, 15, { align: "center" });
      doc.setFontSize(12);
      doc.text("มหาวิทยาลัยเทคโนโลยีราชมงคลอีสาน วิทยาเขตขอนแก่น", 105, 22, { align: "center" });

      const columns = [
        { header: 'ลำดับ', dataKey: 'index' },
        { header: 'รหัสครุภัณฑ์', dataKey: 'code' },
        { header: 'รายการ / ชื่อครุภัณฑ์', dataKey: 'name' },
        { header: 'สถานะ', dataKey: 'status' }
      ];

      const rows = data.map((item, idx) => ({
        index: idx + 1,
        code: item["รหัสครุภัณฑ์"],
        name: item["ชื่อครุภัณฑ์"],
        status: item["สถานะ"]
      }));

      // 4. สร้างตารางโดยใช้ฟอนต์ที่โหลดมา
      autoTable(doc, {
        startY: 30,
        columns: columns,
        body: rows,
        styles: { font: "Sarabun", fontSize: 10 },
        headStyles: { fillColor: [240, 240, 240], textColor: 0, font: "Sarabun" },
        didDrawPage: (d) => {
          doc.setFontSize(8);
          doc.text(`หน้า ${doc.internal.getNumberOfPages()}`, 190, 285, { align: 'right' });
        }
      });

      doc.save(`ใบรายงาน_${Date.now()}.pdf`);
    } catch (error) {
      console.error("PDF Export Error:", error);
      alert("ไม่สามารถสร้าง PDF ได้เนื่องจากปัญหาการโหลดฟอนต์");
    }
    setLoading(false);
  };

  return (
    <div className="card shadow-sm p-4 text-center">
      <h5 className="mb-4">ระบบออกใบรายงาน (โหลดฟอนต์ออนไลน์)</h5>
      
      {/* ตารางพรีวิวบนหน้าเว็บ */}
      <div className="table-responsive mb-4 border" style={{ maxHeight: '450px' }}>
        <table className="table table-hover m-0 small">
          <thead className="table-light sticky-top">
            <tr>
              <th>ลำดับ</th>
              <th>รหัสครุภัณฑ์</th>
              <th>ชื่อครุภัณฑ์</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx}>
                <td>{idx + 1}</td>
                <td>{row["รหัสครุภัณฑ์"]}</td>
                <td>{row["ชื่อครุภัณฑ์"]}</td>
                <td>{row["สถานะ"]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button className="btn btn-primary btn-lg w-100" onClick={exportPDF} disabled={loading || !data.length}>
        {loading ? 'กำลังดาวน์โหลดฟอนต์...' : 'ดาวน์โหลด PDF (ไทย)'}
      </button>
    </div>
  );
};

export default Report;