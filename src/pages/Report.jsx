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
          // กรองข้อมูลขยะและค่า Error ออก [cite: 112]
          return id && id !== "รหัสครุภัณฑ์" && !id.includes("#N/A");
        });
        setData(cleanData);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const exportPDF = async () => {
    setLoading(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');

      // 1. โหลดฟอนต์ (ใส่ try-catch ตรงนี้เพื่อเช็คว่าไฟล์อยู่จริงไหม)
      const response = await fetch('/fonts/Sarabun-Regular.ttf');
      if (!response.ok) throw new Error("หาไฟล์ฟอนต์ไม่เจอใน public/fonts/");
      
      const arrayBuffer = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const fontBase64 = window.btoa(binary);

      // 2. ลงทะเบียนฟอนต์ (ชื่อต้องตรงกันทุกจุด) 
      doc.addFileToVFS("Sarabun.ttf", fontBase64);
      doc.addFont("Sarabun.ttf", "Sarabun", "normal");
      doc.setFont("Sarabun"); 

      // 3. หัวกระดาษ (พิมพ์ภาษาไทย) [cite: 75, 76]
      doc.setFontSize(18);
      doc.text("ใบรายงานสรุปข้อมูลครุภัณฑ์", 105, 15, { align: "center" });
      doc.setFontSize(12);
      doc.text("มหาวิทยาลัยเทคโนโลยีราชมงคลอีสาน วิทยาเขตขอนแก่น", 105, 22, { align: "center" });

      // 4. วาดตาราง (บังคับฟอนต์ที่หัวและเนื้อหา) [cite: 77, 117]
      autoTable(doc, {
        startY: 30,
        head: [['ลำดับ', 'รหัสครุภัณฑ์', 'ชื่อครุภัณฑ์', 'สถานะ']],
        body: data.map((item, idx) => [
          idx + 1, 
          item["รหัสครุภัณฑ์"], 
          item["ชื่อครุภัณฑ์"], 
          item["สถานะ"] || "ปกติ"
        ]),
        theme: 'grid',
        styles: { 
          font: "Sarabun", // บังคับฟอนต์ไทยเนื้อหา 
          fontSize: 10 
        },
        headStyles: { 
          font: "Sarabun", // บังคับฟอนต์ไทยหัวตาราง 
          fillColor: [240, 240, 240], 
          textColor: 0 
        },
        didDrawPage: (d) => {
          doc.setFontSize(8);
          doc.text(`หน้า ${doc.internal.getNumberOfPages()}`, 190, 285, { align: 'right' });
        }
      });

      doc.save(`Report_${Date.now()}.pdf`);
    } catch (error) {
      alert("เอเลี่ยนบุก! เพราะ: " + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="p-4 text-center">
      <button className="btn btn-primary" onClick={exportPDF} disabled={loading}>
        {loading ? 'กำลังโหลดฟอนต์...' : 'ดาวน์โหลด PDF ภาษาไทย'}
      </button>
    </div>
  );
};

export default Report;