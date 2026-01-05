import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { fetchSheetData, postAction } from '../../services/api';
import { SHEET_NAMES } from '../../config/config';
import { formatDate, getStatusBadgeClass } from '../../utils/formatter';

const InventoryTable = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // States Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  const [currentItem, setCurrentItem] = useState({}); 
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // โหลดข้อมูล
  const loadList = async () => {
    setLoading(true);
    try {
      const rows = await fetchSheetData(SHEET_NAMES.DATA || "DATA");
      // Map: [0:Code, 1:Name, 2:Location, 3:Status, 4:Detail]
      const mapped = rows.map((r, i) => ({ 
        row: i + 2, 
        code: r[0], 
        name: r[1], 
        location: r[2], 
        status: r[3],
        detail: r[4]
      }));
      setData(mapped);
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadList(); }, []);

  // --- Actions ---

  // 1. เพิ่มรายการ (ส่ง Location/Status เป็นค่า Default)
  const handleAddItem = async (e) => {
    e.preventDefault();
    setShowAddModal(false);
    Swal.fire({ title: 'กำลังเพิ่ม...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    await postAction("DATA", "add", {
        "รหัส": currentItem.code,
        "ชื่อ": currentItem.name,
        "ที่อยู่": "-",       // Default
        "สถานะ": "ใช้งานได้", // Default
        "รายละเอียด": currentItem.detail || "-"
    });

    Swal.fire('สำเร็จ', 'เพิ่มครุภัณฑ์แล้ว', 'success');
    loadList();
  };

  // 2. บันทึกแก้ไข (ส่ง Location/Status เดิมกลับไป เพื่อไม่ให้หาย)
  const handleEditSave = async () => {
    setShowEditModal(false);
    Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    await postAction("DATA", "edit", {
        row: currentItem.row,
        "รหัส": currentItem.code,
        "ชื่อ": currentItem.name,
        "ที่อยู่": currentItem.location, // ใช้ค่าเดิม
        "สถานะ": currentItem.status,     // ใช้ค่าเดิม
        "รายละเอียด": currentItem.detail
    });

    Swal.fire('บันทึกแล้ว', '', 'success');
    loadList();
  };

  const handleDelete = async (row) => {
    const res = await Swal.fire({ title: 'ยืนยันลบ?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33' });
    if (res.isConfirmed) {
      Swal.fire({ title: 'กำลังลบ...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      await postAction("DATA", "delete", { row });
      Swal.fire('ลบแล้ว', '', 'success');
      loadList();
    }
  };

  // 3. ปุ่มประวัติ
  const openHistory = async (item) => {
    setCurrentItem(item);
    setShowHistoryModal(true);
    setHistoryLoading(true);
    
    try {
        const rows = await fetchSheetData(SHEET_NAMES.LOG || "LOG");
        // กรองหาประวัติของ Code นี้
        const logs = rows.filter(r => String(r[0]) === String(item.code));
        setHistoryLogs(logs);
    } catch (e) {
        setHistoryLogs([]);
    }
    setHistoryLoading(false);
  };

  // 4. โหลดรูป (แก้ให้พยายามโหลดเองก่อน ถ้าไม่ได้ค่อย new tab)
  const downloadImg = async (url, filename) => {
    try {
        Swal.fire({
            title: 'กำลังดาวน์โหลด...', 
            text: 'กรุณารอสักครู่',
            timer: 2000, 
            showConfirmButton: false, 
            didOpen: () => Swal.showLoading()
        });
        
        const response = await fetch(url);
        const blob = await response.blob();
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        // ถ้า Browser บล็อก (CORS) ให้เปิด Tab ใหม่แทน
        window.open(url, '_blank');
    }
  };

  return (
    <div className="card border-0 shadow-sm rounded-4">
      <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <h5 className="fw-bold text-primary m-0">ฐานข้อมูลครุภัณฑ์</h5>
        <div>
            <button className="btn btn-outline-secondary btn-sm me-2" onClick={loadList}><i className="bi bi-arrow-clockwise"></i> รีเฟรช</button>
            <button className="btn btn-primary btn-sm" onClick={() => { setCurrentItem({}); setShowAddModal(true); }}>+ เพิ่มครุภัณฑ์</button>
        </div>
      </div>
      <div className="table-responsive p-3">
        <table className="table table-hover align-middle table-custom">
          <thead className="table-light">
            <tr>
              <th>เลือก</th>
              <th>รหัส</th>
              <th>ชื่อ</th>
              <th className="text-center">Barcode</th>
              <th className="text-center">QR Code</th>
              <th className="text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan="6" className="text-center p-4">กำลังโหลด...</td></tr> :
             data.map((item, idx) => {
               const bc = `https://barcode.tec-it.com/barcode.ashx?data=${item.code}&code=Code128&translate-esc=on`;
               const qr = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${item.code}`;
               return (
                <tr key={idx}>
                  <td><input type="checkbox" className="form-check-input"/></td>
                  <td className="fw-bold">{item.code}</td>
                  <td>{item.name}</td>
                  <td className="text-center">
                    <div className="img-container" onClick={() => downloadImg(bc, `bc-${item.code}.gif`)}>
                        <img src={bc} height="30" alt="barcode" style={{cursor: 'pointer'}} />
                        <div className="small text-muted" style={{fontSize: '10px'}}>คลิกเพื่อโหลด</div>
                    </div>
                  </td>
                  <td className="text-center">
                    <div className="img-container" onClick={() => downloadImg(qr, `qr-${item.code}.png`)}>
                        <img src={qr} height="40" alt="qr" style={{cursor: 'pointer'}} />
                    </div>
                  </td>
                  <td className="text-center">
                    <div className="d-flex justify-content-center gap-1">
                        <button className="btn btn-warning btn-sm text-dark" onClick={() => { setCurrentItem(item); setShowEditModal(true); }}><i className="bi bi-pencil-square"></i></button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item.row)}><i className="bi bi-trash"></i></button>
                        <button className="btn btn-info btn-sm text-white" onClick={() => openHistory(item)}><i className="bi bi-file-text"></i></button>
                    </div>
                  </td>
                </tr>
               );
             })}
          </tbody>
        </table>
      </div>

      {/* --- ADD MODAL (เหลือแค่ รหัส/ชื่อ/รายละเอียด) --- */}
      {showAddModal && (
        <div className="modal fade show d-block" style={{background: 'rgba(0,0,0,0.5)'}}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header"><h5 className="modal-title">เพิ่มครุภัณฑ์ใหม่</h5></div>
                    <form onSubmit={handleAddItem}>
                        <div className="modal-body">
                            <div className="mb-3">
                                <label className="form-label">รหัสครุภัณฑ์</label>
                                <input required className="form-control" onChange={e=>setCurrentItem({...currentItem, code: e.target.value})}/>
                            </div>
                            <div className="mb-3">
                                <label className="form-label">ชื่อครุภัณฑ์</label>
                                <input required className="form-control" onChange={e=>setCurrentItem({...currentItem, name: e.target.value})}/>
                            </div>
                            <div className="mb-3">
                                <label className="form-label">รายละเอียดเพิ่มเติม</label>
                                <textarea className="form-control" rows="3" onChange={e=>setCurrentItem({...currentItem, detail: e.target.value})}></textarea>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={()=>setShowAddModal(false)}>ปิด</button>
                            <button type="submit" className="btn btn-primary">บันทึก</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
      )}

      {/* --- EDIT MODAL (เหลือแค่ รหัส/ชื่อ/รายละเอียด) --- */}
      {showEditModal && (
        <div className="modal fade show d-block" style={{background: 'rgba(0,0,0,0.5)'}}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header"><h5 className="modal-title">แก้ไขข้อมูล</h5></div>
                    <div className="modal-body">
                         <div className="mb-3">
                            <label className="form-label">รหัสครุภัณฑ์</label>
                            <input className="form-control" value={currentItem.code} onChange={e=>setCurrentItem({...currentItem, code: e.target.value})}/>
                        </div>
                        <div className="mb-3">
                            <label className="form-label">ชื่อครุภัณฑ์</label>
                            <input className="form-control" value={currentItem.name} onChange={e=>setCurrentItem({...currentItem, name: e.target.value})}/>
                        </div>
                        <div className="mb-3">
                            <label className="form-label">รายละเอียดเพิ่มเติม</label>
                            <textarea className="form-control" rows="3" value={currentItem.detail || ''} onChange={e=>setCurrentItem({...currentItem, detail: e.target.value})}></textarea>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-secondary" onClick={()=>setShowEditModal(false)}>ปิด</button>
                        <button className="btn btn-primary" onClick={handleEditSave}>บันทึกการแก้ไข</button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* --- HISTORY MODAL --- */}
      {showHistoryModal && (
        <div className="modal fade show d-block" style={{background: 'rgba(0,0,0,0.5)'}}>
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                <div className="modal-content">
                    <div className="modal-header bg-info text-white">
                        <h5 className="modal-title"><i className="bi bi-clock-history"></i> ประวัติ: {currentItem.code}</h5>
                        <button type="button" className="btn-close btn-close-white" onClick={()=>setShowHistoryModal(false)}></button>
                    </div>
                    <div className="modal-body bg-light">
                        <div className="alert alert-light border shadow-sm mb-3">
                            <strong>ชื่อ:</strong> {currentItem.name} | <strong>สถานะปัจจุบัน:</strong> {currentItem.status}
                        </div>
                        <table className="table table-striped table-bordered bg-white">
                            <thead className="table-primary"><tr><th>วันที่</th><th>เวลา</th><th>ที่เก็บ</th><th>สถานะ</th><th>หมายเหตุ</th></tr></thead>
                            <tbody>
                                {historyLoading ? <tr><td colSpan="5" className="text-center">โหลดประวัติ...</td></tr> :
                                 historyLogs.length === 0 ? <tr><td colSpan="5" className="text-center text-muted">ไม่พบประวัติ</td></tr> :
                                 historyLogs.map((log, i) => (
                                    <tr key={i}>
                                        <td>{formatDate(log[5])}</td>
                                        <td>{log[6] ? String(log[6]).substring(0,5) : "-"}</td>
                                        <td>{log[2]}</td>
                                        <td><span className={`badge ${getStatusBadgeClass(log[3])}`}>{log[3]}</span></td>
                                        <td>{log[4]}</td>
                                    </tr>
                                 ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-secondary" onClick={()=>setShowHistoryModal(false)}>ปิด</button>
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default InventoryTable;