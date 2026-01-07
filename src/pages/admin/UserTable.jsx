import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { fetchSheetData, postAction } from '../../services/api';
import { SHEET_NAMES } from '../../config/config';

const UserTable = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState(new Set());
  
  // จำลองข้อมูลผู้ใช้ที่กำลังใช้งานระบบ (ควรดึงจาก Auth State ของคุณ)
  const loggedInUser = JSON.parse(localStorage.getItem('user')) || { role: 'admin' }; 

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [currentUser, setCurrentUser] = useState({ id: '', pass: '', name: '', role: 'user' });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const rows = await fetchSheetData(SHEET_NAMES.LOGIN || "LOGIN");
      const mapped = rows
        .filter(r => r[0] && String(r[0]).trim() !== "")
        .map((r, i) => ({ 
          row: i + 2, 
          id: r[0], 
          pass: r[1], 
          role: r[2] ? r[2].toLowerCase() : 'user',
          name: r[3] 
        }));
      setData(mapped);
      setSelectedRows(new Set());
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  // เช็คสิทธิ์การจัดการ (Admin แก้ได้แค่ User / SAdmin แก้ได้หมด)
  const canManage = (targetRole) => {
    if (loggedInUser.role === 'sadmin') return true;
    if (loggedInUser.role === 'admin') return targetRole === 'user';
    return false;
  };

  const toggleSelect = (u) => {
    if (!canManage(u.role)) return;
    const newSet = new Set(selectedRows);
    if (newSet.has(u.row)) newSet.delete(u.row); else newSet.add(u.row);
    setSelectedRows(newSet);
  };

  const handleBulkDelete = async () => {
    if (selectedRows.size === 0) return;
    const res = await Swal.fire({ title: `ลบสมาชิกที่เลือก ${selectedRows.size} รายการ?`, icon: 'warning', showCancelButton: true });
    if (res.isConfirmed) {
      Swal.fire({ title: 'กำลังลบ...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      const sortedRows = Array.from(selectedRows).sort((a, b) => b - a);
      for (const row of sortedRows) {
        await postAction("LOGIN", "delete", { row });
      }
      Swal.fire('สำเร็จ', '', 'success');
      loadUsers();
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setShowModal(false);
    Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    const payload = {
        "ID": currentUser.id,
        "Pass": currentUser.pass,
        "Status": currentUser.role, 
        "Name": currentUser.name
    };

    if (modalMode === 'add') {
        await postAction("LOGIN", "add", payload);
    } else {
        await postAction("LOGIN", "edit", { ...payload, row: currentUser.row });
    }
    Swal.fire('สำเร็จ', '', 'success');
    loadUsers();
  };

  return (
    <div className="card border-0 shadow-sm rounded-4">
      <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <h5 className="fw-bold text-primary m-0">จัดการสมาชิก ({selectedRows.size})</h5>
        <div className="btn-group btn-group-sm">
            <button className="btn btn-outline-secondary" onClick={loadUsers}><i className="bi bi-arrow-clockwise"></i> รีเฟรช</button>
            {selectedRows.size > 0 && <button className="btn btn-danger" onClick={handleBulkDelete}><i className="bi bi-trash"></i> ลบที่เลือก</button>}
            <button className="btn btn-primary" onClick={() => { setCurrentUser({ id: '', pass: '', name: '', role: 'user' }); setModalMode('add'); setShowModal(true); }}>+ เพิ่มสมาชิก</button>
        </div>
      </div>
      <div className="table-responsive p-3">
        <table className="table table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th width="40"><i className="bi bi-check2-square"></i></th>
              <th width="20%">ID</th>
              <th width="20%">Password</th>
              <th width="25%">Name</th>
              <th width="15%">Role</th>
              <th width="10%" className="text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan="6" className="text-center p-4">กำลังโหลด...</td></tr> :
             data.map((u, i) => {
              const isManageable = canManage(u.role);
              return (
                <tr key={i} onClick={() => isManageable && toggleSelect(u)} style={{opacity: isManageable ? 1 : 0.5}}>
                  <td onClick={e => e.stopPropagation()}>
                      <input type="checkbox" className="form-check-input" disabled={!isManageable} checked={selectedRows.has(u.row)} onChange={() => toggleSelect(u)} />
                  </td>
                  <td className="fw-bold text-primary">{u.id}</td>
                  <td className="text-muted">{u.pass}</td>
                  <td>{u.name}</td>
                  <td>
                    <span className={`badge rounded-pill ${u.role==='sadmin'?'bg-dark':u.role==='admin'?'bg-danger':'bg-info text-dark'}`}>{u.role}</span>
                  </td>
                  <td className="text-center" onClick={e => e.stopPropagation()}>
                      <button className="btn btn-warning btn-sm" disabled={!isManageable} onClick={() => { setCurrentUser(u); setModalMode('edit'); setShowModal(true); }}><i className="bi bi-pencil"></i></button>
                  </td>
                </tr>
              )
             })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal fade show d-block" style={{background: 'rgba(0,0,0,0.5)'}}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header"><h5 className="modal-title">{modalMode==='add'?'เพิ่มสมาชิก':'แก้ไขสมาชิก'}</h5></div>
                    <form onSubmit={handleSave}>
                        <div className="modal-body">
                            <div className="mb-3"><label className="form-label">Username (ID)</label><input required className="form-control" value={currentUser.id} onChange={e=>setCurrentUser({...currentUser, id:e.target.value})} /></div>
                            <div className="mb-3"><label className="form-label">Password</label><input required type="text" className="form-control" value={currentUser.pass} onChange={e=>setCurrentUser({...currentUser, pass:e.target.value})}/></div>
                            <div className="mb-3"><label className="form-label">Name</label><input required className="form-control" value={currentUser.name} onChange={e=>setCurrentUser({...currentUser, name:e.target.value})}/></div>
                            <div className="mb-3">
                                <label className="form-label">Role (สิทธิ์)</label>
                                <select 
                                  className="form-select" 
                                  value={currentUser.role} 
                                  onChange={e=>setCurrentUser({...currentUser, role:e.target.value})}
                                >
                                    <option value="user">User</option>
                                    
                                    {/* 🔥 บล็อกสิทธิ์: Admin จะไม่เห็นตัวเลือก Admin (เลือกได้แค่ User) */}
                                    {(loggedInUser.role === 'sadmin' || (loggedInUser.role === 'admin' && currentUser.role === 'admin')) && (
                                        <option value="admin">Admin</option>
                                    )}
                                    
                                    {/* SAdmin เห็นเฉพาะตอนแก้คนที่เป็น SAdmin อยู่แล้ว */}
                                    {currentUser.role === 'sadmin' && <option value="sadmin">SAdmin</option>}
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={()=>setShowModal(false)}>ปิด</button>
                            <button type="submit" className="btn btn-primary">บันทึก</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default UserTable;