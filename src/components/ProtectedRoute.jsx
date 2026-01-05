import React from 'react';
import { Navigate } from 'react-router-dom';
import { AuthService } from '../services/auth';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const user = AuthService.getCurrentUser();

  // 1. ถ้ายังไม่ล็อกอินเลย -> ดีดไปหน้า Login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 2. ถ้าล็อกอินแล้ว แต่ Role ไม่ตรงกับที่กำหนด (เช่น User พยายามเข้าหน้า Admin)
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // ดีดกลับไปหน้า Dashboard ของตัวเอง
    if (user.role === 'admin') {
        return <Navigate to="/admin" replace />;
    } else {
        return <Navigate to="/user" replace />;
    }
  }

  // 3. ถ้าผ่านทุกด่าน -> อนุญาตให้เข้าได้
  return children;
};

export default ProtectedRoute;