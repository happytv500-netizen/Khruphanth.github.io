import React, { useState, useEffect } from 'react';
import { fetchScriptData } from '../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ห้ามมีช่องว่างในเครื่องหมาย " " และห้ามมี data:font/ttf;base64, นำหน้า
// แนะนำให้ก๊อปใหม่จากลิงก์: https://raw.githubusercontent.com/id61023/thai-fonts-base64/master/THSarabunNew.txt
const rawFontBase64 = "AAEAAA...(วางรหัสยาวๆ ที่นี่)...";

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

  const exportPDF = () => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');

      // ล้างค่า Base64 ให้สะอาด (ป้องกันตัวอักษรนอกเหนือจาก Latin1)
      const cleanFont = rawFontBase64.replace(/\s/g, ''); 

      doc.addFileToVFS("ThaiFont.ttf", cleanFont);
      doc.addFont("ThaiFont.ttf", "ThaiFont", "normal");
      doc.setFont("ThaiFont");

      // หัวกระดาษ
      doc.setFontSize(18);
      doc.text("ใบรายงานสรุปข้อมูลครุภัณฑ์", 105, 15, { align: "center" });
      doc.setFontSize(12);
      doc.text("มหาวิทยาลัยเทคโนโลยีราชมงคลอีสาน วิทยาเขตขอนแก่น", 105, 22, { align: "center" });
      doc.text("คณะครุศาสตร์อุตสาหกรรม / สาขาเทคนิคครุศาสตร์อุตสาหกรรม คอมพิวเตอร์", 105, 28, { align: "center" });

      const columns = [
        { header: 'ลำดับ', dataKey: 'index' },
        { header: 'รหัสครุภัณฑ์', dataKey: 'code' },
        { header: 'รายการ / ชื่อครุภัณฑ์', dataKey: 'name' },
        { header: 'ที่เก็บ', dataKey: 'location' },
        { header: 'สถานะ', dataKey: 'status' }
      ];

      const rows = data.map((item, idx) => ({
        index: idx + 1,
        code: item["รหัสครุภัณฑ์"],
        name: item["ชื่อครุภัณฑ์"],
        location: item["ที่เก็บ"],
        status: item["สถานะ"]
      }));

      autoTable(doc, {
        startY: 35,
        columns: columns,
        body: rows,
        theme: 'grid',
        styles: { font: "ThaiFont", fontSize: 11 },
        headStyles: { fillColor: [240, 240, 240], textColor: 0, font: "ThaiFont" },
        didDrawPage: (d) => {
          doc.setFontSize(10);
          doc.text(`หน้า ${doc.internal.getNumberOfPages()}`, 190, 285, { align: 'right' });
        }
      });

      doc.save(`ใบรายงาน_${Date.now()}.pdf`);
    } catch (error) {
      console.error("PDF Export Error:", error);
      alert("Error: ตรวจสอบรหัสฟอนต์ว่าก๊อปปี้มาครบถ้วนหรือไม่");
    }
  };

  return (
    <div className="card shadow-sm p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h5 className="fw-bold">พรีวิวใบรายงาน (พบ {data.length} รายการ)</h5>
        <button className="btn btn-primary btn-lg" onClick={exportPDF} disabled={loading || !data.length}>
          ดาวน์โหลด PDF (คมชัดสูง)
        </button>
      </div>

      <div className="table-responsive border" style={{ maxHeight: '600px' }}>
        <table className="table table-hover table-bordered m-0">
          <thead className="table-secondary sticky-top">
            <tr>
              <th className="text-center">ลำดับ</th>
              <th>รหัสครุภัณฑ์</th>
              <th>ชื่อครุภัณฑ์</th>
              <th className="text-center">สถานที่เก็บ</th>
              <th className="text-center">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx}>
                <td className="text-center">{idx + 1}</td>
                <td>{row["รหัสครุภัณฑ์"]}</td>
                <td>{row["ชื่อครุภัณฑ์"]}</td>
                <td className="text-center">{row["ที่เก็บ"]}</td>
                <td className="text-center">
                  <span className={`badge ${row["สถานะ"] === 'ชำรุด' ? 'bg-danger' : 'bg-success'}`}>
                    {row["สถานะ"]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Report;