import React, { useState, useEffect } from 'react';
import { fetchScriptData } from '../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // เปลี่ยนมานำเข้าแบบนี้เพื่อความเสถียร

const Report = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

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
    } catch (err) {
      console.error("Load data error:", err);
    }
    setLoading(false);
  };

  const exportPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');

    // หมายเหตุ: สำหรับภาษาไทย คุณต้องโหลดฟอนต์ .ttf และเพิ่มเข้า doc
    // doc.addFileToVFS('Sarabun.ttf', base64String);
    // doc.addFont('Sarabun.ttf', 'Sarabun', 'normal');
    // doc.setFont('Sarabun');

    const university = "มหาวิทยาลัยเทคโนโลยีราชมงคลอีสาน วิทยาเขตขอนแก่น";
    const faculty = "คณะครุศาสตร์อุตสาหกรรม";
    const department = "สาขาเทคนิคครุศาสตร์อุตสาหกรรม คอมพิวเตอร์";
    const reportTitle = "ใบรายงานสรุปข้อมูลครุภัณฑ์";

    // ส่วนหัวกระดาษ (แสดงเฉพาะหน้าแรกผ่านการวาดตรง)
    doc.setFontSize(16);
    doc.text(reportTitle, 105, 15, { align: "center" });
    doc.setFontSize(12);
    doc.text(university, 105, 22, { align: "center" });
    doc.text(`${faculty} / ${department}`, 105, 28, { align: "center" });
    doc.setLineWidth(0.5);
    doc.line(80, 32, 130, 32);

    doc.setFontSize(10);
    doc.text(`หน่วยงาน: ${department}`, 15, 42);
    doc.text(`วันที่ออกเอกสาร: ${new Date().toLocaleDateString('th-TH')}`, 195, 42, { align: "right" });

    const columns = [
      { header: 'ลำดับ', dataKey: 'index' },
      { header: 'รหัสครุภัณฑ์', dataKey: 'code' },
      { header: 'รายการ / ชื่อครุภัณฑ์', dataKey: 'name' },
      { header: 'สถานที่เก็บ', dataKey: 'location' },
      { header: 'สถานะ', dataKey: 'status' },
      { header: 'หมายเหตุ', dataKey: 'note' },
    ];

    const rows = data.map((item, idx) => ({
      index: idx + 1,
      code: item["รหัสครุภัณฑ์"],
      name: item["ชื่อครุภัณฑ์"],
      location: item["ที่เก็บ"],
      status: item["สถานะ"],
      note: item["รายละเอียดเพิ่มเติม"]
    }));

    // ใช้ autoTable ฟังก์ชันหลักในการวาดตาราง
    autoTable(doc, {
      startY: 48,
      columns: columns,
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [240, 240, 240], textColor: 0, halign: 'center' },
      styles: { fontSize: 10, cellPadding: 2 }, // ระบุ font: 'Sarabun' หากโหลดฟอนต์แล้ว
      columnStyles: {
        index: { halign: 'center', cellWidth: 12 },
        code: { cellWidth: 40 },
        location: { halign: 'center', cellWidth: 20 },
        status: { halign: 'center', cellWidth: 20 },
      },
      didDrawPage: (data) => {
        // เลขหน้ามุมล่างขวา [cite: 105, 178]
        doc.setFontSize(8);
        const str = `หน้า ${doc.internal.getNumberOfPages()}`;
        doc.text(str, 195, 285, { align: "right" });
      }
    });

    // ส่วนลงนามท้ายเอกสาร [cite: 281, 284]
    const finalY = doc.lastAutoTable.finalY + 15;
    if (finalY < 250) {
      doc.setFontSize(11);
      doc.text("ลงชื่อ......................................................ผู้รายงาน", 130, finalY);
      doc.text("(......................................................)", 130, finalY + 10);
      doc.text("ตำแหน่ง......................................................", 130, finalY + 20);
    }

    doc.save(`ใบรายงานครุภัณฑ์_${Date.now()}.pdf`);
  };

  return (
    <div className="container mt-4 text-center">
      <div className="card shadow-sm p-5">
        <h4 className="mb-3">ออกใบรายงานระบบมหาวิทยาลัย</h4>
        <p className="text-muted small">ตัวหนังสือคมชัด ค้นหาได้ และแบ่งหน้าอัตโนมัติ</p>
        <div className="alert alert-secondary">
          มีข้อมูลที่พร้อมพิมพ์ทั้งหมด <strong>{data.length}</strong> รายการ
        </div>
        <button 
          className="btn btn-primary btn-lg" 
          onClick={exportPDF} 
          disabled={loading || data.length === 0}
        >
          {loading ? 'กำลังประมวลผล...' : 'ดาวน์โหลด PDF'}
        </button>
      </div>
    </div>
  );
};

export default Report;