import React, { useState, useEffect, useRef } from 'react';
import { fetchScriptData } from '../services/api'; 
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
      const res = await fetchScriptData("SHOW"); 
      if (Array.isArray(res)) {
        const cleanData = res.filter(row => {
          const id = row["รหัสครุภัณฑ์"];
          return id && id !== "รหัสครุภัณฑ์" && id !== "#N/A";
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
    try {
      const element = reportRef.current;
      const canvas = await html2canvas(element, { 
        scale: 2, 
        useCORS: true,
        logging: false
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.8);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; 
      const pageHeight = 295; 
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`ใบรายงานครุภัณฑ์_${new Date().getTime()}.pdf`);
    } catch (err) {
      console.error("PDF Error:", err);
    }
    setLoading(false);
  };

  return (
    <div className="card shadow-sm p-4">
      <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2">
        <h5 className="text-primary fw-bold">ระบบออกใบรายงาน</h5>
        <button className="btn btn-dark btn-sm" onClick={exportPDF} disabled={loading || data.length === 0}>
          <i className="bi bi-printer me-2"></i>พิมพ์ใบรายงาน (PDF)
        </button>
      </div>

      {/* โครงสร้างใบรายงานแบบทางการ */}
      <div ref={reportRef} className="bg-white p-5" style={{ minWidth: '800px', color: '#000', fontFamily: 'Sarabun, sans-serif' }}>
        
        {/* Header: ข้อมูลมหาวิทยาลัย */}
        <div className="text-center mb-4">
          <h4 className="fw-bold mb-2">ใบรายงานสรุปข้อมูลครุภัณฑ์</h4>
          <h5 className="mb-1">มหาวิทยาลัยเทคโนโลยีราชมงคลอีสาน วิทยาเขตขอนแก่น</h5>
          <h6 className="mb-1">คณะครุศาสตร์อุตสาหกรรม</h6>
          <p className="mb-0">สาขาเทคนิคครุศาสตร์อุตสาหกรรม คอมพิวเตอร์</p>
          <div className="border-bottom border-2 border-dark mx-auto my-3" style={{ width: '180px' }}></div>
        </div>

        <div className="d-flex justify-content-between mb-3 px-2">
          <span><strong>หน่วยงาน:</strong> สาขาเทคนิคครุศาสตร์อุตสาหกรรม คอมพิวเตอร์</span>
          <span><strong>วันที่ออกเอกสาร:</strong> {new Date().toLocaleDateString('th-TH')}</span>
        </div>

        <table className="table table-bordered border-dark text-center align-middle">
          <thead style={{ backgroundColor: '#f8f9fa' }}>
            <tr style={{ fontSize: '14px' }}>
              <th style={{ width: '50px' }}>ลำดับ</th>
              <th style={{ width: '160px' }}>รหัสครุภัณฑ์</th>
              <th>รายการ / ชื่อครุภัณฑ์</th>
              <th style={{ width: '90px' }}>สถานที่เก็บ</th>
              <th style={{ width: '100px' }}>สถานะ</th>
              <th>หมายเหตุ</th>
            </tr>
          </thead>
          <tbody style={{ fontSize: '14px' }}>
            {data.length > 0 ? data.map((row, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td className="text-start ps-2">{row["รหัสครุภัณฑ์"]}</td>
                <td className="text-start ps-2">{row["ชื่อครุภัณฑ์"]}</td>
                <td>{row["ที่เก็บ"]}</td>
                <td>{row["สถานะ"]}</td>
                <td className="text-start ps-2 text-muted" style={{ fontSize: '12px' }}>{row["รายละเอียดเพิ่มเติม"]}</td>
              </tr>
            )) : (
              <tr><td colSpan="6" className="py-5 text-muted">ไม่พบข้อมูลครุภัณฑ์ในระบบ</td></tr>
            )}
          </tbody>
        </table>

        {/* Footer: ส่วนลงนาม */}
        <div className="row mt-5 pt-4">
          <div className="col-7"></div>
          <div className="col-5 text-center" style={{ fontSize: '15px' }}>
            <p className="mb-5">ลงชื่อ......................................................ผู้รายงาน</p>
            <p>(......................................................)</p>
            <p className="mt-2">ตำแหน่ง......................................................</p>
            <p>วันที่........./........../..........</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Report;