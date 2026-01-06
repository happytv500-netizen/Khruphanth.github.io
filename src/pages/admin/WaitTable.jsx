import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { fetchSheetData, postAction } from '../../services/api';
import { formatDate } from '../../utils/formatter';
import { SHEET_NAMES } from '../../config/config';

const WaitTable = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const LOCATIONS = ["-", "501", "502", "503", "401", "401A", "401B", "401C", "402", "403", "404", "405", "ห้องพักครู", "301", "302"];
  const STATUS_OPTIONS = ["-", "ใช้งานได้", "ชำรุด", "ส่งซ่อม", "เสื่อมสภาพ"];

  const loadWait = async () => {
    setLoading(true);
    try {
      const rows = await fetchSheetData(SHEET_NAMES.WAIT || "WAIT");
      // Map: [0:Code, 1:Name, 2:Location, 3:Status, 4:Note, 5:Date, 6:Time]
      const mapped = rows.map((r, i) => ({
        row: i + 2,
        code: r[0], 
        name: r[1],
        location: "-", // บังคับเริ่มเป็น -
        status: "-",   // บังคับเริ่มเป็น -
        note: r[4] || "", 
        date: r[5], 
        time: r[6] // เวลา
      }));
      setData(mapped);
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'โหลดข้อมูลไม่สำเร็จ', 'error');
    }
    setLoading(false);
  };

  useEffect(() => { loadWait(); }, []);

  const handleChange = (index, field, value) => {
    const newData = [...data];
    newData[index][field] = value;
    setData(newData);
  };

  const handleApprove = async (item) => {
    if (item.location === "-" || item.status === "-") {
      Swal.fire('ข้อมูลไม่ครบ', 'กรุณาเลือกที่อยู่และสถานะ', 'warning');
      return;
    }
    
    Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    await postAction("LOG", "addLog", {
      "รหัส": item.code, "ชื่อ": item.name, "ที่อยู่": item.location,
      "สถานะ": item.status, "หมายเหตุ": item.note
    });
    await postAction("WAIT", "delete", { row: item.row });
    
    Swal.fire('สำเร็จ', 'อนุมัติเรียบร้อย', 'success');
    loadWait();
  };

  const handleDelete = async (row) => {
    const res = await Swal.fire({ title: 'ยืนยันลบ?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33' });
    if (res.isConfirmed) {
      Swal.fire({ title: 'กำลังลบ...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      await postAction("WAIT", "delete", { row });
      Swal.fire('ลบแล้ว', '', 'success');
      loadWait();
    }
  };

  const renderTime = (val) => {
    if (!val) return "-";
    if (val instanceof Date) return val.toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'});
    // กรณีเป็น String เช่น "14:30:00"
    if(String(val).includes(":")) return String(val).substring(0, 5);
    return val;
  };

  return (
    <div className="card border-0 shadow-sm rounded-4">
      <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <h5 className="fw-bold text-primary m-0">รายการรอตรวจสอบ</h5>
        <button className="btn btn-outline-secondary btn-sm" onClick={loadWait}>
            <i className="bi bi-arrow-clockwise"></i> รีเฟรช
        </button>
      </div>
      <div className="table-responsive p-3">
        <table className="table table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th>รหัส</th>
              <th>ชื่อ</th>
              <th style={{width: '150px'}}>ที่อยู่</th>
              <th style={{width: '150px'}}>สถานะ</th>
              <th>หมายเหตุ</th>
              <th>วันที่</th>
              <th>เวลา</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan="8" className="text-center p-4">กำลังโหลด...</td></tr> :
             data.length === 0 ? <tr><td colSpan="8" className="text-center p-4 text-muted">ไม่พบข้อมูล</td></tr> :
             data.map((item, idx) => (
              <tr key={idx}>
                <td className="fw-bold">{item.code}</td>
                <td>{item.name}</td>
                <td>
                  <select className={`form-select form-select-sm ${item.location === '-' ? 'border-danger' : 'border-success'}`}
                    value={item.location} onChange={e => handleChange(idx, 'location', e.target.value)}>
                    {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </td>
                <td>
                  <select className={`form-select form-select-sm ${item.status === '-' ? 'border-danger' : 'border-success'}`}
                    value={item.status} onChange={e => handleChange(idx, 'status', e.target.value)}>
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td><input className="form-control form-control-sm" value={item.note} onChange={e => handleChange(idx, 'note', e.target.value)}/></td>
                <td>{formatDate(item.date)}</td>
                <td>{renderTime(item.time)}</td>
                <td>
                  <button className="btn btn-success btn-sm me-1" onClick={() => handleApprove(item)}><i className="bi bi-check-lg"></i></button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item.row)}><i className="bi bi-trash"></i></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WaitTable;