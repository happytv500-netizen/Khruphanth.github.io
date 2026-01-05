import React, { useState, useEffect } from 'react';
import { fetchSheetData } from '../../services/api';
import { SHEET_NAMES } from '../../config/config';

const DashboardStats = () => {
  const [stats, setStats] = useState({ total: 0, wait: 0 });

  useEffect(() => {
    const load = async () => {
      const d = await fetchSheetData(SHEET_NAMES.DATA || "DATA");
      const w = await fetchSheetData(SHEET_NAMES.WAIT || "WAIT");
      setStats({ total: d.length, wait: w.length });
    };
    load();
  }, []);

  return (
    <div>
      <h3 className="fw-bold mb-4 text-primary">📊 แผงควบคุม (Dashboard)</h3>
      <div className="row g-4">
        <div className="col-md-6 col-lg-4">
          <div className="card border-0 shadow-sm h-100 p-3 bg-primary text-white">
            <div className="card-body">
              <h5 className="card-title opacity-75">📦 ครุภัณฑ์ทั้งหมด</h5>
              <h2 className="display-4 fw-bold">{stats.total}</h2>
              <small>รายการในฐานข้อมูล</small>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-4">
          <div className="card border-0 shadow-sm h-100 p-3 bg-warning text-dark">
            <div className="card-body">
              <h5 className="card-title opacity-75">⏳ รอตรวจสอบ</h5>
              <h2 className="display-4 fw-bold">{stats.wait}</h2>
              <small>รายการที่แจ้งเข้ามา</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;