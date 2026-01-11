import React, { useState, useEffect } from 'react';
import { fetchScriptData } from '../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
        // กรองค่า Error และหัวตารางออก [cite: 112, 129]
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
    // ใช้ตัวเลือกนี้เพื่อให้พิมพ์ภาษาไทยได้ (หากไม่ได้โหลดฟอนต์ Sarabun จะยังเห็นเป็นเอเลี่ยน)
    const doc = new jsPDF('p', 'mm', 'a4');

    // ส่วนหัวใบรายงาน (จะโชว์แค่หน้าแรก) [cite: 101, 102, 103]
    doc.text("ใบรายงานสรุปข้อมูลครุภัณฑ์", 105, 15, { align: "center" });
    doc.text("มหาวิทยาลัยเทคโนโลยีราชมงคลอีสาน วิทยาเขตขอนแก่น", 105, 22, { align: "center" });
    
    const columns = [
      { header: 'ลำดับ', dataKey: 'index' },
      { header: 'รหัสครุภัณฑ์', dataKey: 'code' },
      { header: 'รายการ', dataKey: 'name' },
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
      styles: { fontSize: 10 },
      didDrawPage: (d) => {
        doc.text(`หน้า ${doc.internal.getNumberOfPages()}`, 190, 285);
      }
    });

    doc.save(`ใบรายงาน_${Date.now()}.pdf`);
  };

  return (
    <div className="card shadow-sm p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h5 className="fw-bold m-0">ใบรายงานสรุปข้อมูลครุภัณฑ์</h5>
        <button className="btn btn-primary" onClick={exportPDF} disabled={loading || data.length === 0}>
          {loading ? 'กำลังโหลด...' : 'ดาวน์โหลด PDF'}
        </button>
      </div>

      <div className="alert alert-light border small">
        หน่วยงาน: สาขาเทคนิคครุศาสตร์อุตสาหกรรม คอมพิวเตอร์ [cite: 103]
      </div>

      {/* --- ตารางพรีวิวบนหน้าเว็บ (กลับมาแล้ว) --- */}
      <div className="table-responsive border shadow-sm" style={{ maxHeight: '600px' }}>
        <table className="table table-hover table-bordered m-0">
          <thead className="table-secondary sticky-top text-center">
            <tr>
              <th style={{ width: '70px' }}>ลำดับ</th>
              <th>รหัสครุภัณฑ์</th>
              <th>ชื่อครุภัณฑ์</th>
              <th style={{ width: '100px' }}>ที่เก็บ</th>
              <th style={{ width: '120px' }}>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? (
              data.map((row, idx) => (
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
              ))
            ) : (
              <tr><td colSpan="5" className="text-center p-5 text-muted">กำลังโหลดข้อมูลครุภัณฑ์...</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Report;