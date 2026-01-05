import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchSheetData } from '../services/api';
import { getStatusBadgeClass, formatDate } from '../utils/formatter';
import { SHEET_NAMES } from '../config/config';

const Home = () => {
  const navigate = useNavigate();

  // --- State สำหรับข้อมูลหลัก ---
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // --- State สำหรับ Modal ---
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null); // เก็บข้อมูลครุภัณฑ์ที่กำลังดู
  const [historyLogs, setHistoryLogs] = useState([]);     // เก็บประวัติของตัวที่เลือก
  const [loadingHistory, setLoadingHistory] = useState(false);

  // 1. โหลดข้อมูลครุภัณฑ์เมื่อเปิดหน้าเว็บ
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const rows = await fetchSheetData(SHEET_NAMES.SHOW);
      
      // Map ข้อมูลตามคอลัมน์ [0:number, 1:code, 2:name, 3:location, 4:status, 5:details]
      const items = rows.map((r, i) => ({
        id: i,
        code: r[1] || "",
        name: r[2] || "",
        location: r[3] || "",
        status: r[4] || "",
      })).filter(item => item.code); // กรองเอาเฉพาะที่มีรหัส

      setData(items);
      setFilteredData(items);
      setLoading(false);
    };
    loadData();
  }, []);

  // 2. ระบบค้นหา Real-time
  useEffect(() => {
    const keyword = searchTerm.toLowerCase().trim();
    const result = data.filter(item => 
      item.code.toLowerCase().includes(keyword) ||
      item.name.toLowerCase().includes(keyword) ||
      item.status.toLowerCase().includes(keyword) ||
      item.location.toLowerCase().includes(keyword)
    );
    setFilteredData(result);
  }, [searchTerm, data]);

  // 3. ฟังก์ชันเปิด Modal และโหลดประวัติ
  const handleOpenHistory = async (item) => {
    setSelectedItem(item);
    setShowModal(true);
    setLoadingHistory(true);
    setHistoryLogs([]); // เคลียร์ของเก่าก่อน

    // ดึงข้อมูลจาก Sheet LOG
    const rows = await fetchSheetData(SHEET_NAMES.LOG);
    
    // กรองเอาเฉพาะ Code ที่ตรงกัน (Column 0 คือรหัส)
    const logs = rows.filter(r => String(r[0]) === String(item.code));
    
    setHistoryLogs(logs);
    setLoadingHistory(false);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedItem(null);
  };

  return (
    <div className="d-flex flex-column">
      {/* --- Header --- */}
      <header className="py-3 px-4 d-flex justify-content-between align-items-center text-white shadow-sm" style={{ backgroundColor: '#4a90e2' }}>
        <div className="fw-bold fs-5">LOGO</div>
        <h1 className="h4 m-0 flex-grow-1 text-center d-none d-md-block">ระบบตรวจสอบครุภัณฑ์</h1>
        
        <div className="d-flex gap-2 align-items-center">
          <div className="input-group input-group-sm" style={{ maxWidth: '250px' }}>
            <span className="input-group-text bg-white border-0"><i className="bi bi-search"></i></span>
            <input 
              type="text" 
              className="form-control border-0" 
              placeholder="ค้นหา..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn btn-light btn-sm fw-bold px-3" onClick={() => navigate('/login')}>
            LOGIN
          </button>
        </div>
      </header>

      {/* --- Main Content --- */}
      {/* เพิ่ม mb-5 เพื่อเว้นระยะห่างจาก Footer */}
      <main className="container mt-5 mb-5 flex-grow-1">
        <div className="card shadow-lg mx-auto border-0" style={{ maxWidth: '1000px' }}>
          <div className="card-body p-4">
            <h2 className="h5 text-primary mb-3 border-bottom pb-2">รายการครุภัณฑ์</h2>
            
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead style={{ backgroundColor: '#cfe2ff' }}>
                  <tr>
                    <th className="py-3">รหัสครุภัณฑ์</th>
                    <th className="py-3">ชื่อ</th>
                    <th className="py-3">ที่อยู่</th>
                    <th className="py-3">สถานะ</th>
                    <th className="py-3 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="5" className="text-center py-5 text-muted">กำลังโหลดข้อมูล...</td></tr>
                  ) : filteredData.length === 0 ? (
                    <tr><td colSpan="5" className="text-center py-5 text-muted">ไม่พบข้อมูล</td></tr>
                  ) : (
                    filteredData.map((item) => (
                      <tr key={item.id}>
                        <td className="fw-bold text-primary">{item.code}</td>
                        <td>{item.name}</td>
                        <td>{item.location}</td>
                        <td>
                          <span className={`badge ${getStatusBadgeClass(item.status)} px-3 py-2 rounded-pill`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="text-center">
                          <button 
                            className="btn btn-sm btn-outline-primary rounded-pill px-3"
                            onClick={() => handleOpenHistory(item)}
                          >
                            <i className="bi bi-eye-fill me-1"></i> ดูประวัติ
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* --- MODAL (Popup) --- */}
      {showModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content border-0 shadow">
                
                {/* Modal Header */}
                <div className="modal-header text-white" style={{ backgroundColor: '#4a90e2' }}>
                  <h5 className="modal-title">
                    <i className="bi bi-clock-history me-2"></i> 
                    ประวัติ: {selectedItem?.code}
                  </h5>
                  <button type="button" className="btn-close btn-close-white" onClick={handleCloseModal}></button>
                </div>

                {/* Modal Body */}
                <div className="modal-body bg-light p-4">
                  
                  {/* ข้อมูลสรุป */}
                  <div className="d-flex justify-content-between align-items-center bg-white p-3 rounded shadow-sm mb-4 border-start border-4 border-primary">
                    <div>
                      <small className="text-muted d-block">ชื่อครุภัณฑ์</small>
                      <span className="fs-5 fw-bold text-dark">{selectedItem?.name}</span>
                    </div>
                    <div className="text-end">
                      <small className="text-muted d-block">สถานะล่าสุด</small>
                      <span className={`badge ${getStatusBadgeClass(selectedItem?.status)}`}>
                        {selectedItem?.status}
                      </span>
                    </div>
                  </div>

                  {/* ตารางประวัติ */}
                  <h6 className="text-secondary mb-2"><i className="bi bi-list-ul"></i> รายการบันทึกย้อนหลัง</h6>
                  <div className="table-responsive bg-white rounded shadow-sm">
                    <table className="table table-striped mb-0 text-center">
                      <thead className="table-light">
                        <tr>
                          <th>วันที่</th>
                          <th>เวลา</th>
                          <th>ที่อยู่</th>
                          <th>สถานะ</th>
                          <th>หมายเหตุ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingHistory ? (
                          <tr><td colSpan="5" className="py-4 text-muted">กำลังโหลดประวัติ...</td></tr>
                        ) : historyLogs.length === 0 ? (
                          <tr><td colSpan="5" className="py-4 text-muted">ไม่พบประวัติการตรวจสอบ</td></tr>
                        ) : (
                          historyLogs.map((log, idx) => (
                            <tr key={idx}>
                              <td>{formatDate(log[5])}</td>
                              <td>{log[6] ? String(log[6]).substring(0, 5) : "-"}</td>
                              <td>{log[2]}</td>
                              <td>
                                <span className={`badge ${getStatusBadgeClass(log[3])}`}>
                                  {log[3]}
                                </span>
                              </td>
                              <td className="text-start">{log[4] || "-"}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                </div>

                {/* Modal Footer */}
                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-secondary px-4" onClick={handleCloseModal}>ปิด</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Home;