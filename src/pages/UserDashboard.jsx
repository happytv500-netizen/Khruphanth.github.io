import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { AuthService } from '../services/auth';
import { postAction } from '../services/api';

const UserDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'add', 'wait', 'list', 'manual'
  
  // State สำหรับฟอร์มเพิ่มข้อมูล
  const [newItem, setNewItem] = useState({ name: '', location: '', reason: '' });

  // เช็ค Login
  useEffect(() => {
    const currentUser = AuthService.getCurrentUser();
    if (!currentUser) {
      navigate('/login');
    } else {
      setUser(currentUser);
    }
  }, []);

  const handleLogout = () => {
    AuthService.logout();
    navigate('/login');
  };

  const openModal = (type) => {
    setModalType(type);
    setShowModal(true);
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    // ส่งข้อมูลไป Google Script (Sheet WAIT)
    const res = await postAction("WAIT", "add", {
      "ชื่อ": newItem.name,
      "ที่อยู่": newItem.location,
      "หมายเหตุ": newItem.reason,
      "ผู้แจ้ง": user.name
    });

    if (res && res.status === "success") {
      Swal.fire('สำเร็จ', 'บันทึกข้อมูลแล้ว รอการตรวจสอบ', 'success');
      setNewItem({ name: '', location: '', reason: '' }); // ล้างฟอร์ม
      setShowModal(false);
    } else {
      Swal.fire('ล้มเหลว', 'บันทึกไม่สำเร็จ', 'error');
    }
  };

  // --- Render เนื้อหาใน Modal ตามประเภทที่เลือก ---
  const renderModalContent = () => {
    switch (modalType) {
      case 'add':
        return (
          <form onSubmit={handleAddItem}>
            <div className="mb-3">
              <label className="form-label">ชื่อครุภัณฑ์</label>
              <input type="text" className="form-control" required 
                value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
            </div>
            <div className="mb-3">
              <label className="form-label">สถานที่/ห้อง</label>
              <input type="text" className="form-control" required
                value={newItem.location} onChange={e => setNewItem({...newItem, location: e.target.value})} />
            </div>
            <div className="mb-3">
              <label className="form-label">รายละเอียด/เหตุผล</label>
              <textarea className="form-control" rows="3"
                value={newItem.reason} onChange={e => setNewItem({...newItem, reason: e.target.value})}></textarea>
            </div>
            <button type="submit" className="btn btn-success w-100">บันทึกข้อมูล</button>
          </form>
        );
      case 'manual':
        return (
          <div className="text-muted">
            <h6>ขั้นตอนการใช้งาน:</h6>
            <ol>
              <li>กดเมนู "แจ้งเพิ่มครุภัณฑ์" เพื่อกรอกข้อมูลใหม่</li>
              <li>ข้อมูลจะถูกส่งไปยังผู้ดูแลระบบเพื่อตรวจสอบ</li>
              <li>สามารถตรวจสอบสถานะได้ที่เมนู "ติดตามสถานะ"</li>
            </ol>
          </div>
        );
      case 'wait':
        return <div className="text-center p-3">กำลังพัฒนา: แสดงรายการที่ user เคยแจ้งไป...</div>;
      case 'list':
        return <div className="text-center p-3">กำลังพัฒนา: แสดงรายการครุภัณฑ์ทั้งหมด...</div>;
      default:
        return null;
    }
  };

  const getModalTitle = () => {
    switch(modalType) {
      case 'add': return '➕ แจ้งเพิ่มครุภัณฑ์ใหม่';
      case 'wait': return '🕓 ติดตามสถานะ';
      case 'list': return '📋 รายการครุภัณฑ์ทั้งหมด';
      case 'manual': return '📘 คู่มือการใช้งาน';
      default: return '';
    }
  };

  return (
    <div className="bg-light min-vh-100">
      {/* Header */}
      <nav className="navbar navbar-dark bg-primary px-4 shadow-sm">
        <span className="navbar-brand mb-0 h1"><i className="bi bi-person-circle"></i> User Dashboard</span>
        <div className="d-flex align-items-center text-white gap-3">
          <span>{user?.name}</span>
          <button onClick={handleLogout} className="btn btn-sm btn-light text-primary fw-bold">Logout</button>
        </div>
      </nav>

      {/* Main Content (Cards) */}
      <div className="container py-5">
        <div className="row g-4 justify-content-center">
          
          <div className="col-md-6 col-lg-3">
            <div className="card h-100 shadow-sm hover-shadow text-center p-4 cursor-pointer" 
                 onClick={() => openModal('add')} style={{cursor: 'pointer'}}>
              <div className="mb-3 text-success"><i className="bi bi-plus-circle display-4"></i></div>
              <h5 className="card-title">แจ้งเพิ่มครุภัณฑ์</h5>
            </div>
          </div>

          <div className="col-md-6 col-lg-3">
            <div className="card h-100 shadow-sm hover-shadow text-center p-4 cursor-pointer" 
                 onClick={() => openModal('wait')} style={{cursor: 'pointer'}}>
              <div className="mb-3 text-warning"><i className="bi bi-clock-history display-4"></i></div>
              <h5 className="card-title">ติดตามสถานะ</h5>
            </div>
          </div>

          <div className="col-md-6 col-lg-3">
            <div className="card h-100 shadow-sm hover-shadow text-center p-4 cursor-pointer" 
                 onClick={() => openModal('list')} style={{cursor: 'pointer'}}>
              <div className="mb-3 text-info"><i className="bi bi-list-check display-4"></i></div>
              <h5 className="card-title">รายการทั้งหมด</h5>
            </div>
          </div>

          <div className="col-md-6 col-lg-3">
            <div className="card h-100 shadow-sm hover-shadow text-center p-4 cursor-pointer" 
                 onClick={() => openModal('manual')} style={{cursor: 'pointer'}}>
              <div className="mb-3 text-secondary"><i className="bi bi-book display-4"></i></div>
              <h5 className="card-title">คู่มือการใช้งาน</h5>
            </div>
          </div>

        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{getModalTitle()}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                </div>
                <div className="modal-body">
                  {renderModalContent()}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UserDashboard;