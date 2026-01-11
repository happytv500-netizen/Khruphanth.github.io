import React, { useState, useEffect, useRef } from 'react';
import { fetchScriptData } from '../services/api'; //
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
    try {
      // ดึงข้อมูลจากชีท SHOW
      const res = await fetchScriptData("SHOW"); 
      
      // ถ้า Google Script คืนค่ามาเป็น Array ของ Array (มีหัวตารางติดมาที่ index 0)
      // เราจะตัดแถวแรกออก และกรองค่าที่เป็นว่างหรือ #N/A ออก
      if (Array.isArray(res) && res.length > 0) {
        const cleanData = res.filter((row, index) => {
          const val = Array.isArray(row) ? row[1] : row["รหัสครุภัณฑ์"];
          return val && val !== "รหัสครุภัณฑ์" && val !== "#N/A";
        });
        setData(cleanData);
      }
    } catch (err) {
      console.error("Load data error:", err);
    }
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
    pdf.save(`Report_${Date.now()}.pdf`);
    setLoading(false);
  };

  // ฟังก์ชันช่วยดึงค่าจาก row ไม่ว่าเป็น Object หรือ Array
  const getValue = (row, index, key) => {
    if (Array.isArray(row)) return row[index]; // ถ้าเป็นแบบ fetchSheetData (Array)
    return row[key]; // ถ้าเป็นแบบ fetchScriptData (Object)
  };

  return (
    <div className="card shadow-sm p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h5><i className="bi bi-file-earmark-text me-2"></i>ออกรายงานครุภัณฑ์</h5>
        <button className="btn btn-danger btn-sm" onClick={exportPDF} disabled={loading || data.length === 0}>
          ดาวน์โหลด PDF (A4)
        </button>
      </div>

      <div ref={reportRef} className="bg-white p-4" style={{ minWidth: '800px' }}>
        <h4 className="text-center mb-1">รายงานสรุปข้อมูลครุภัณฑ์</h4>
        <p className="text-end small">วันที่ออกรายงาน: {new Date().toLocaleDateString('th-TH')}</p>
        
        <table className="table table-bordered border-dark mt-3">
          <thead className="table-light text-center align-middle" style={{ fontSize: '14px' }}>
            <tr>
              <th>ลำดับ</th>
              <th>รหัสครุภัณฑ์</th>
              <th>ชื่อครุภัณฑ์</th>
              <th>ที่เก็บ</th>
              <th>สถานะ</th>
              <th>รายละเอียดเพิ่มเติม</th>
            </tr>
          </thead>
          <tbody style={{ fontSize: '13px' }}>
            {data.length > 0 ? data.map((row, index) => (
              <tr key={index}>
                <td className="text-center">{index + 1}</td>
                <td>{getValue(row, 1, "รหัสครุภัณฑ์")}</td>
                <td>{getValue(row, 2, "ชื่อครุภัณฑ์")}</td>
                <td className="text-center">{getValue(row, 3, "ที่เก็บ")}</td>
                <td className="text-center">{getValue(row, 4, "สถานะ")}</td>
                <td>{getValue(row, 5, "รายละเอียดเพิ่มเติม")}</td>
              </tr>
            )) : (
              <tr><td colSpan="6" className="text-center p-4">กำลังโหลดข้อมูล หรือ ไม่พบข้อมูล...</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Report;