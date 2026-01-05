import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// --- Import หน้าเว็บต่างๆ ---
import Home from './pages/Home';
import Login from './pages/Login';
import Detail from './pages/Detail';
import AdminDashboard from './pages/AdminDashboard'; // ต้องมีไฟล์นี้ใน src/pages/
import UserDashboard from './pages/UserDashboard';   // ต้องมีไฟล์นี้ใน src/pages/

// --- Import Components ---
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute'; // <--- ⚠️ บรรทัดนี้ที่ขาดไปครับ

function App() {
  return (
    <BrowserRouter>
      <div className="d-flex flex-column min-vh-100 bg-light">
        
        {/* ส่วนเนื้อหา ดัน Footer ลงล่าง */}
        <div className="flex-grow-1">
          <Routes>
            {/* หน้าทั่วไป */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/detail/:id" element={<Detail />} />
            
            {/* 🔒 หน้า Admin (ต้อง Login และเป็น admin) */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />

            {/* 🔒 หน้า User (ต้อง Login เป็น user หรือ admin ก็ได้) */}
            <Route 
              path="/user" 
              element={
                <ProtectedRoute allowedRoles={['user', 'admin']}>
                  <UserDashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* พิมพ์มั่ว ดีดกลับหน้าแรก */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        <Footer />
        
      </div>
    </BrowserRouter>
  );
}

export default App;