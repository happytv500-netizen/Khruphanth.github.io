import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchSheetData } from '../../services/api';
import { SHEET_NAMES } from '../../config/config';

const DashboardStats = () => {
  const navigate = useNavigate();
  const [showData, setShowData] = useState([]);
  const [stats, setStats] = useState({ total: 0, wait: 0, available: 0, broken: 0, repair: 0, expired: 0 });
  const [modalData, setModalData] = useState({ show: false, title: '', items: [] });

  useEffect(() => {
    const load = async () => {
      try {
        const d = await fetchSheetData(SHEET_NAMES.DATA || "DATA");
        const w = await fetchSheetData(SHEET_NAMES.WAIT || "WAIT");
        const s = await fetchSheetData(SHEET_NAMES.SHOW || "SHOW");

        // ใช้ .slice(1) เพื่อตัดแถว Header ทิ้ง ป้องกันการนับเกิน
        const dataRows = d.length > 1 ? d.slice(1) : [];
        const waitRows = w.length > 1 ? w.slice(1) : [];
        const showRows = s.length > 1 ? s.slice(1) : [];

        setShowData(showRows);

        // คำนวณสถิติ (อ้างอิงสถานะจาก index 5 ในชีท SHOW)
        setStats({
          total: dataRows.length,
          wait: waitRows.length,
          available: showRows.filter(r => String(r[5] || "").trim() === "ใช้งานได้").length,
          broken: showRows.filter(r => String(r[5] || "").trim() === "ชำรุด").length,
          repair: showRows.filter(r => String(r[5] || "").trim() === "ส่งซ่อม").length,
          expired: showRows.filter(r => String(r[5] || "").trim() === "เสื่อมสภาพ").length,
        });
      } catch (err) {
        console.error("Load stats error:", err);
      }
    };
    load();
  }, []);

  const openModal = (status) => {
    const filtered = showData.filter(r => String(r[5] || "").trim() === status);
    setModalData({ show: true, title: `รายการ: ${status}`, items: filtered });
  };

  const Card = ({ title, count, color, onClick, isDark = false }) => (
    <div className="col-md-6 col-lg-4" onClick={onClick} style={{ cursor: 'pointer' }}>
      <div className={`card border-0 shadow-sm h-100 p-3 bg-${color} ${isDark ? 'text-dark' : 'text-white'}`}>
        <div className="card-body">
          <h5 className="card-title opacity-75">{title}</h5>
          <h2 className="display-4 fw-bold">{count}</h2>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <h3 className="fw-bold mb-4 text-primary">📊 แผงควบคุม (Dashboard)</h3>
      <div className="row g-4">
        {/* ดึงจาก DATA และ WAIT */}
        <Card title="📦 ครุภัณฑ์ทั้งหมด" count={stats.total} color="primary" onClick={() => navigate('/admin/inventory')} />
        <Card title="⏳ รอตรวจสอบ" count={stats.wait} color="warning" isDark onClick={() => navigate('/admin/wait')} />
        
        {/* ดึงจาก SHOW */}
        <Card title="✅ ใช้งานได้" count={stats.available} color="success" onClick={() => openModal("ใช้งานได้")} />
        <Card title="❌ ชำรุด" count={stats.broken} color="danger" onClick={() => openModal("ชำรุด")} />
        <Card title="🔧 ส่งซ่อม" count={stats.repair} color="info" onClick={() => openModal("ส่งซ่อม")} />
        <Card title="⚠️ เสื่อมสภาพ" count={stats.expired} color="secondary" onClick={() => openModal("เสื่อมสภาพ")} />
      </div>

      {/* Modal โดยใช้ Standard Bootstrap CSS */}
      {modalData.show && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content text-dark">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">{modalData.title}</h5>
                <button type="button" className="btn-close" onClick={() => setModalData({ ...modalData, show: false })}></button>
              </div>
              <div className="modal-body">
                <table className="table table-hover table-bordered">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: '20%' }}>รหัส</th>
                      <th>ชื่อรายการ</th>
                      <th style={{ width: '25%' }}>สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalData.items.length > 0 ? modalData.items.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item[1]}</td>
                        <td>{item[2]}</td>
                        <td>{item[5]}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan="3" className="text-center">ไม่พบข้อมูลในสถานะนี้</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setModalData({ ...modalData, show: false })}>ปิด</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardStats;