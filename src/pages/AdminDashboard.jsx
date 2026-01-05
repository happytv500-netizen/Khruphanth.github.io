import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../services/auth';

// Import หน้าลูก
import DashboardStats from './admin/DashboardStats';
import WaitTable from './admin/WaitTable';
import InventoryTable from './admin/InventoryTable';
import UserTable from './admin/UserTable';
import Report from './Report';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dash'); // dash, wait, list, user, report

  // เมนู Config
  const menuItems = [
    { id: 'dash', label: 'แผงควบคุม', icon: 'speedometer2' },
    { id: 'wait', label: 'รอตรวจสอบ', icon: 'clock-history' },
    { id: 'list', label: 'ฐานข้อมูล', icon: 'archive' },
    { id: 'report', label: 'ประวัติ', icon: 'search' },
    { id: 'user', label: 'สมาชิก', icon: 'people' },
  ];

  // เลือกแสดงหน้า
  const renderContent = () => {
    switch (activeTab) {
      case 'dash':
        return <DashboardStats />;
      case 'wait':
        return <WaitTable />;
      case 'list':
        return <InventoryTable />;
      case 'user':
        return <UserTable />;
      case 'report':
        return <Report />;
      default:
        return <DashboardStats />;
    }
  };

  // ---- LOGOUT ----
  const handleLogout = () => {
    AuthService.logout();
    navigate('/', { replace: true }); // กลับหน้า Home
  };

  return (
    <div className="d-flex bg-light" style={{ minHeight: '100vh' }}>
      
      {/* Sidebar */}
      <div
        className="d-flex flex-column p-3 bg-white shadow-sm"
        style={{ width: '260px', minHeight: '100vh' }}
      >
        <div className="d-flex align-items-center mb-3">
          <span className="fs-5 fw-bold text-primary">
            ระบบจัดการครุภัณฑ์
          </span>
        </div>

        <hr />

        <ul className="nav nav-pills flex-column mb-auto gap-2">
          {menuItems.map(item => (
            <li className="nav-item" key={item.id}>
              <button
                className={`nav-link w-100 text-start ${
                  activeTab === item.id ? 'active' : 'link-dark'
                }`}
                onClick={() => setActiveTab(item.id)}
              >
                <i className={`bi bi-${item.icon} me-2`}></i>
                {item.label}
              </button>
            </li>
          ))}
        </ul>

        <hr />

        <button
          onClick={handleLogout}
          className="btn btn-outline-danger w-100"
        >
          <i className="bi bi-box-arrow-right me-2"></i>
          ออกจากระบบ
        </button>
      </div>

      {/* Main Content */}
      <div
        className="flex-grow-1 p-4"
        style={{ overflowY: 'auto', maxHeight: '100vh' }}
      >
        {renderContent()}
      </div>

    </div>
  );
};

export default AdminDashboard;
