import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthService } from '../services/auth';

const Navbar = () => {
  const navigate = useNavigate();
  const user = AuthService.getCurrentUser();

  const handleLogout = () => {
    AuthService.logout();
    navigate('/login');
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark shadow-sm" style={{ backgroundColor: '#4a90e2' }}>
      <div className="container">
        {/* Logo / Home Link */}
        <Link className="navbar-brand fw-bold" to="/">
          <i className="bi bi-box-seam me-2"></i>ระบบครุภัณฑ์
        </Link>

        {/* Hamburger Menu (Mobile) */}
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav">
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Menu Items */}
        <div className="collapse navbar-collapse" id="mainNav">
          <ul className="navbar-nav ms-auto mb-2 mb-lg-0 align-items-center">
            
            <li className="nav-item">
              <Link className="nav-link text-white" to="/">หน้าแรก</Link>
            </li>

            {/* ถ้าล็อกอินแล้ว ให้แสดงชื่อและปุ่ม Logout */}
            {user ? (
              <>
                <li className="nav-item">
                  <Link className="nav-link text-white" to={user.role === 'admin' ? '/admin' : '/user'}>
                    แผงควบคุม ({user.role})
                  </Link>
                </li>
                <li className="nav-item ms-lg-2">
                  <button onClick={handleLogout} className="btn btn-sm btn-light text-primary fw-bold rounded-pill px-3">
                    <i className="bi bi-box-arrow-right"></i> ออกจากระบบ
                  </button>
                </li>
              </>
            ) : (
              /* ถ้ายังไม่ล็อกอิน แสดงปุ่ม Login */
              <li className="nav-item ms-lg-2">
                <Link to="/login" className="btn btn-sm btn-light text-primary fw-bold rounded-pill px-3">
                  LOGIN
                </Link>
              </li>
            )}

          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;