import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { fetchSheetData, postAction } from '../../services/api';
import { SHEET_NAMES } from '../config/config';

const UserTable = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [currentUser, setCurrentUser] = useState({ id: '', pass: '', name: '', role: 'user' });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const rows = await fetchSheetData(SHEET_NAMES.LOGIN || "LOGIN");
      // LOGIN: [0:ID, 1:Pass, 2:Role, 3:Name]
      const mapped = rows.map((r, i) => ({ 
        row: i + 2, 
        id: r[0], 
        pass: r[1], 
        role: r[2],
        name: r[3] 
      }));
      setData(mapped);
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setShowModal(false);
    Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    const payload = {
        "ID": currentUser.id,
        "Pass": currentUser.pass,
        "Status": currentUser.role, // ใน Script ใช้คำว่า Status แทน Role
        "Name": currentUser.name
    };

    if (modalMode === 'add') {
        await postAction("LOGIN", "add", payload);
    } else {
        await postAction("LOGIN", "edit", {
            ...payload,
            row: currentUser.row
        });
    }

    Swal.fire('สำเร็จ', '', 'success');
    loadUsers();
  };

  const handleDelete = async (row) => {
    const res = await Swal.fire({ title: 'ลบสมาชิก?', icon: 'warning', showCancelButton: true });
    if (res.isConfirmed) {
      Swal.fire({ title: 'กำลังลบ...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      await postAction("LOGIN", "delete", { row });
      Swal.fire('ลบแล้ว', '', 'success');
      loadUsers();
    }
  };

  const openAdd = () => {
    setCurrentUser({ id: '', pass: '', name: '', role: 'user' });
    setModalMode('add');
    setShowModal(true);
  };

  const openEdit = (u) => {
    setCurrentUser(u);
    setModalMode('edit');
    setShowModal(true);
  };

  return (
    <div className="card border-0 shadow-sm rounded-4">
      <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <h5 className="fw-bold text-primary m-0">จัดการสมาชิก</h5>
        <div>
            <button className="btn btn-outline-secondary btn-sm me-2" onClick={loadUsers}><i className="bi bi-arrow-clockwise"></i> รีเฟรช</button>
            <button className="btn btn-primary btn-sm" onClick={openAdd}>+ เพิ่มสมาชิก</button>
        </div>
      </div>
      <div className="table-responsive p-3">
        <table className="table table-hover align-middle">
          <thead className="table-light"><tr><th>เลือก</th><th>ID (Username)</th><th>ชื่อ-สกุล</th><th>สิทธิ์</th><th>จัดการ</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan="5" className="text-center p-4">กำลังโหลด...</td></tr> :
             data.map((u, i) => (
              <tr key={i}>
                <td><input type="checkbox" className="form-check-input"/></td>
                <td>{u.id}</td>
                <td>{u.name}</td>
                <td><span className={`badge rounded-pill ${u.role==='admin'?'bg-danger':'bg-info text-dark'}`}>{u.role}</span></td>
                <td>
                    <button className="btn btn-warning btn-sm me-1 text-dark" onClick={() => openEdit(u)}><i className="bi bi-pencil"></i></button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u.row)}><i className="bi bi-trash"></i></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Add/Edit */}
      {showModal && (
        <div className="modal fade show d-block" style={{background: 'rgba(0,0,0,0.5)'}}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header"><h5 className="modal-title">{modalMode==='add'?'เพิ่มสมาชิก':'แก้ไขสมาชิก'}</h5></div>
                    <form onSubmit={handleSave}>
                        <div className="modal-body">
                            <div className="mb-3">
                                <label className="form-label">Username (ID)</label>
                                <input required className="form-control" value={currentUser.id} onChange={e=>setCurrentUser({...currentUser, id:e.target.value})} />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Password</label>
                                <input required type="text" className="form-control" value={currentUser.pass} onChange={e=>setCurrentUser({...currentUser, pass:e.target.value})}/>
                            </div>
                            <div className="mb-3">
                                <label className="form-label">ชื่อ-สกุล</label>
                                <input required className="form-control" value={currentUser.name} onChange={e=>setCurrentUser({...currentUser, name:e.target.value})}/>
                            </div>
                            <div className="mb-3">
                                <label className="form-label">สิทธิ์</label>
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