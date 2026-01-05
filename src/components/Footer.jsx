// src/components/Footer.jsx
import React from 'react';

const Footer = () => {
  return (
    // ลบ mt-auto ออก
    <footer className="py-4 text-white" style={{ backgroundColor: '#2c3e50' }}>
      <div className="container">
        {/* ... (เนื้อหาข้างในเหมือนเดิม) ... */}
        <div className="row gy-4">
           <div className="col-md-6">
            <h5 className="fw-bold text-uppercase border-bottom border-secondary d-inline-block pb-1">
              เกี่ยวกับระบบ
            </h5>
            <p className="small text-white-50 mt-2">
              ระบบตรวจสอบครุภัณฑ์นี้ จัดทำขึ้นเพื่อเป็นส่วนหนึ่งของวิชาโครงงาน (Project) 
              คณะครุศาสตร์อุตสาหกรรม มหาวิทยาลัยเทคโนโลยีราชมงคลอีสาน วิทยาเขตขอนแก่น
              โดยมีวัตถุประสงค์เพื่อเพิ่มประสิทธิภาพในการบริหารจัดการทรัพย์สิน
            </p>
          </div>
          <div className="col-md-6 text-md-end">
             {/* ... ข้อมูลผู้จัดทำ ... */}
             <h5 className="fw-bold text-uppercase border-bottom border-secondary d-inline-block pb-1">
              ผู้จัดทำ
            </h5>
            <ul className="list-unstyled small text-white-50 mt-2">
              <li><i className="bi bi-person-fill me-2"></i>นาย.......................... (รหัสนักศึกษา ......)</li>
              <li><i className="bi bi-envelope-fill me-2"></i>email@example.com</li>
              <li><i className="bi bi-telephone-fill me-2"></i>08x-xxxx-xxxx</li>
            </ul>
          </div>
        </div>
        <hr className="border-secondary my-3" />
        <div className="text-center small text-white-50">
          &copy; {new Date().getFullYear()} ระบบตรวจสอบครุภัณฑ์. All Rights Reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;