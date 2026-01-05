import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchSheetData } from '../services/api';
import { getStatusBadgeClass, formatDate } from '../utils/formatter';
import { SHEET_NAMES } from '../config/config';

const Detail = () => {
  const { id } = useParams(); // รับค่า id จาก URL
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [info, setInfo] = useState({ code: id, name: 'กำลังโหลด...' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDetail = async () => {
      setLoading(true);
      const rows = await fetchSheetData(SHEET_NAMES.LOG);
      
      // กรองหาแถวที่รหัสตรงกับ id (Column Index 0)
      // LOG Structure: [0:รหัส, 1:ชื่อ, 2:ที่เก็บ, 3:สถานะ, 4:รายละเอียด, 5:วันที่, 6:เวลา]
      const history = rows.filter(r => String(r[0]) === String(id));

      if (history.length > 0) {
        // เอาชื่อจากแถวล่าสุดมาแสดงหัวข้อ
        setInfo({ code: history[0][0], name: history[0][1] });
        setLogs(history);
      } else {
        setInfo({ code: id, name: 'ไม่พบข้อมูล' });
      }
      setLoading(false);
    };
    loadDetail();
  }, [id]);

  return (
    <div className="container my-5">
      <button className="btn btn-secondary mb-3" onClick={() => navigate('/')}>
        <i className="bi bi-arrow-left"></i> กลับหน้าหลัก
      </button>

      <div className="card shadow-sm border-0">
        <div className="card-header bg-primary text-white">
          <h4 className="m-0"><i className="bi bi-clock-history"></i> ประวัติครุภัณฑ์</h4>
        </div>
        <div className="card-body">
          {/* ข้อมูลหัวข้อ */}
          <div className="row mb-4">
            <div className="col-md-6">
              <div className="p-3 bg-light rounded">
                <small className="text-muted">รหัสครุภัณฑ์</small>
                <div className="fs-4 fw-bold text-primary">{info.code}</div>
              </div>
            </div>
            <div className="col-md-6 mt-2 mt-md-0">
              <div className="p-3 bg-light rounded">
                <small className="text-muted">ชื่อครุภัณฑ์</small>
                <div className="fs-4 fw-bold">{info.name}</div>
              </div>
            </div>
          </div>

          {/* ตารางประวัติ */}
          <h5 className="text-secondary mb-3">รายการบันทึก ({logs.length})</h5>
          <div className="table-responsive">
            <table className="table table-bordered table-striped">
              <thead className="table-primary">
                <tr>
                  <th>วันที่</th>
                  <th>เวลา</th>
                  <th>ที่เก็บ</th>
                  <th>สถานะ</th>
                  <th>หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="text-center">กำลังโหลด...</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan="5" className="text-center text-danger">ไม่พบประวัติการตรวจสอบ</td></tr>
                ) : (
                  logs.map((log, idx) => (
                    <tr key={idx}>
                      <td>{formatDate(log[5])}</td>
                      <td>{log[6] ? String(log[6]).substring(0, 5) : "-"}</td>
                      <td>{log[2]}</td>
                      <td><span className={`badge ${getStatusBadgeClass(log[3])}`}>{log[3]}</span></td>
                      <td>{log[4] || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Detail;