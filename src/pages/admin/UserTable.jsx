import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { fetchSheetData, postAction } from '../../services/api';

const UserTable = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState(new Set());
  
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [currentUser, setCurrentUser] = useState({ id: '', pass: '', name: '', role: 'user' });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const rows = await fetchSheetData("LOGIN");
      const mapped = rows.slice(1)
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

  // ฟังก์ชันสลับการเลือกแถว
  const toggleRow = (rowId) => {
    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) newSet.delete(rowId);
      else newSet.add(rowId);
      return new Set(newSet);
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setShowModal(false);
    Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    const payload = {
        "action": modalMode,
        "ID": currentUser.id,
        "Pass": currentUser.pass,
        "Status": currentUser.role, 
        "Name": currentUser.name
    };

    if (modalMode === 'edit') payload.row = currentUser.row;

    try {
      await postAction("LOGIN", modalMode, payload);
      Swal.fire('สำเร็จ', '', 'success');
      loadUsers();
    } catch (err) {
      Swal.fire('ผิดพลาด', 'บันทึกไม่สำเร็จ', 'error');
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedRows.size;
    const res = await Swal.fire({ 
      title: `ลบที่เลือก ${count} รายการ?`, 
      icon: 'warning', 
      showCancelButton: true 
    });

    if (res.isConfirmed) {
      Swal.fire({ title: 'กำลังลบ...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

      try {
        // ส่งข้อมูลไปลบในครั้งเดียว
        await postAction("LOGIN", "delete", { 
          action: "delete", 
          sheet: "LOGIN",
          rows: Array.from(selectedRows) // ส่งเป็น Array ของเลขแถว
        });

        Swal.fire('สำเร็จ', '', 'success');
        setSelectedRows(new Set());
        loadUsers();
      } catch (err) {
        console.error(err);
        Swal.fire('ผิดพลาด', 'ลบไม่สำเร็จ', 'error');
      }
    }
  };
  return (
    <div className="card border-0 shadow-sm rounded-4">
      <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <h5 className="fw-bold text-primary m-0">จัดการสมาชิก ({selectedRows.size})</h5>
        <div className="btn-group btn-group-sm">
            <button className="btn btn-outline-secondary" onClick={loadUsers}>รีเฟรช</button>
            {selectedRows.size > 0 && <button className="btn btn-danger" onClick={handleBulkDelete}>ลบที่เลือก</button>}
            <button className="btn btn-primary" onClick={() => { setCurrentUser({ id: '', pass: '', name: '', role: 'user' }); setModalMode('add'); setShowModal(true); }}>+ เพิ่มสมาชิก</button>
        </div>
      </div>
      <div className="table-responsive p-3">
        <table className="table table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th width="40"></th>
              <th>ID</th>
              <th>Password</th>
              <th>Name</th>
              <th>Role</th>
              <th className="text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan="6" className="text-center p-4">กำลังโหลด...</td></tr> :
             data.map((u) => (
                <tr key={u.row} onClick={() => toggleRow(u.row)} style={{ cursor: 'pointer' }}>
                  <td onClick={e => e.stopPropagation()}>
                    <input 
                        type="checkbox" 
                        className="form-check-input" 
                        checked={selectedRows.has(u.row)} 
                        onChange={() => toggleRow(u.row)} 
                    />
                  </td>
                  <td className="fw-bold text-primary">{u.id}</td>
                  <td className="text-muted">{u.pass}</td>
                  <td>{u.name}</td>
                  <td><span className={`badge rounded-pill ${u.role==='admin'?'bg-danger':'bg-info text-dark'}`}>{u.role}</span></td>
                  <td className="text-center" onClick={e => e.stopPropagation()}>
                    <button className="btn btn-warning btn-sm" onClick={() => { setCurrentUser(u); setModalMode('edit'); setShowModal(true); }}>แก้ไข</button>
                  </td>
                </tr>
             ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal fade show d-block" style={{background: 'rgba(0,0,0,0.5)'}}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <form onSubmit={handleSave}>
                        <div className="modal-body">
                            <div className="mb-3"><label className="form-label">ID</label><input required className="form-control" value={currentUser.id} onChange={e=>setCurrentUser({...currentUser, id:e.target.value})} /></div>
                            <div className="mb-3"><label className="form-label">Password</label><input required className="form-control" value={currentUser.pass} onChange={e=>setCurrentUser({...currentUser, pass:e.target.value})}/></div>
                            <div className="mb-3"><label className="form-label">Name</label><input required className="form-control" value={currentUser.name} onChange={e=>setCurrentUser({...currentUser, name:e.target.value})}/></div>
                            <div className="mb-3">
                                <label className="form-label">Role</label>
                                <select className="form-select" value={currentUser.role} onChange={e=>setCurrentUser({...currentUser, role:e.target.value})}>
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
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