import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { fetchSheetData, postAction } from '../services/api';
import { SHEET_NAMES } from '../config/config';

const InventoryTable = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [currentItem, setCurrentItem] = useState({
    row: '',
    code: '',
    name: ''
  });

  // ================= LOAD =================
  const loadList = async () => {
    setLoading(true);
    try {
      const rows = await fetchSheetData(SHEET_NAMES.DATA || "DATA");

      // DATA: [0]=ลำดับ, [1]=รหัส, [2]=ชื่อ, [3]=Barcode, [4]=QRCode
      const mapped = rows.map((r, i) => ({
        row: i + 2,
        no: i + 1, // รันเลขลำดับใหม่โดยอัตโนมัติ (หรือใช้ r[0] ก็ได้)
        code: r[1],
        name: r[2]
        // ไม่ต้องดึง r[3], r[4] เพราะเราจะ Gen รูปสดๆ
      }));

      setData(mapped);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { loadList(); }, []);

  // ฟังก์ชันดาวน์โหลดรูป (เพิ่มเข้ามาให้)
  const downloadImg = async (url, filename) => {
    try {
        Swal.fire({
            title: 'กำลังดาวน์โหลด...',
            timer: 1000,
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
        window.open(url, '_blank');
    }
  };

  // ================= ADD =================
  const handleAddItem = async (e) => {
    e.preventDefault();
    setShowAddModal(false);

    Swal.fire({ title: 'กำลังเพิ่ม...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    // ส่งสูตร Excel ไปเก็บใน Sheet (เพื่อให้ใน Sheet มีรูปด้วย)
    await postAction("DATA", "add", {
      "รหัส": currentItem.code,
      "ชื่อ": currentItem.name,
      "ที่อยู่": "-",
      "สถานะ": "ใช้งานได้",
      "รายละเอียด": "-"
    });

    Swal.fire('สำเร็จ', '', 'success');
    loadList();
  };

  // ================= UPDATE =================
  const handleEditSave = async () => {
    setShowEditModal(false);

    Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    await postAction("DATA", "edit", {
      row: currentItem.row,
      "รหัส": currentItem.code,
      "ชื่อ": currentItem.name,
      // ส่งค่าเดิมกลับไป หรือเว้นว่างถ้า API จัดการไว้แล้ว
      "ที่อยู่": "-", 
      "สถานะ": "ใช้งานได้",
      "รายละเอียด": "-"
    });

    Swal.fire('บันทึกแล้ว', '', 'success');
    loadList();
  };

  // ================= DELETE =================
  const handleDelete = async (row) => {
    const res = await Swal.fire({
      title: 'ยืนยันลบ?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33'
    });

    if (!res.isConfirmed) return;

    Swal.fire({ title: 'กำลังลบ...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    await postAction("DATA", "delete", { row });

    Swal.fire('ลบแล้ว', '', 'success');
    loadList();
  };

  // ================= UI =================
  return (
    <div className="card shadow-sm rounded-4">
      <div className="card-header bg-white d-flex justify-content-between align-items-center">
        <h5 className="fw-bold text-primary m-0">ฐานข้อมูลครุภัณฑ์</h5>
        <button className="btn btn-primary btn-sm" onClick={() => { setCurrentItem({}); setShowAddModal(true); }}>
          + เพิ่ม
        </button>
      </div>

      <div className="table-responsive p-3">
        <table className="table table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th>ลำดับ</th>
              <th>รหัสครุภัณฑ์</th>
              <th>ชื่อครุภัณฑ์</th>
              <th className="text-center">Barcode</th>
              <th className="text-center">QRCode</th>
              <th className="text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="text-center py-4">กำลังโหลด...</td></tr>
            ) : data.map((item, i) => {
              // สร้าง URL รูปภาพ
              const bcUrl = `https://barcode.tec-it.com/barcode.ashx?data=${item.code}&code=Code128&translate-esc=on`;
              const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${item.code}`;

              return (
                <tr key={i}>
                  <td>{item.no}</td>
                  <td className="fw-bold text-primary">{item.code}</td>
                  <td>{item.name}</td>
                  
                  {/* แสดงรูป Barcode */}
                  <td className="text-center" style={{cursor: 'pointer'}} onClick={() => downloadImg(bcUrl, `barcode-${item.code}.gif`)}>
                    <img src={bcUrl} alt="barcode" height="30" />
                  </td>
                  
                  {/* แสดงรูป QR Code */}
                  <td className="text-center" style={{cursor: 'pointer'}} onClick={() => downloadImg(qrUrl, `qr-${item.code}.png`)}>
                    <img src={qrUrl} alt="qrcode" height="40" />
                  </td>

                  <td className="text-center">
                    <button className="btn btn-warning btn-sm me-1"
                      onClick={() => { setCurrentItem(item); setShowEditModal(true); }}>
                      <i className="bi bi-pencil-square"></i>
                    </button>
                    <button className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(item.row)}>
                      <i className="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ADD MODAL */}
      {showAddModal && (
        <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleAddItem}>
                <div className="modal-header"><h5>เพิ่มครุภัณฑ์</h5></div>
                <div className="modal-body">
                  <input required className="form-control mb-2" placeholder="รหัสครุภัณฑ์"
                    value={currentItem.code || ''}
                    onChange={e => setCurrentItem({ ...currentItem, code: e.target.value })} />
                  <input required className="form-control" placeholder="ชื่อครุภัณฑ์"
                    value={currentItem.name || ''}
                    onChange={e => setCurrentItem({ ...currentItem, name: e.target.value })} />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>ปิด</button>
                  <button type="submit" className="btn btn-primary">บันทึก</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && (
        <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header"><h5>แก้ไขครุภัณฑ์</h5></div>
              <div className="modal-body">
                <input className="form-control mb-2"
                  value={currentItem.code || ''}
                  onChange={e => setCurrentItem({ ...currentItem, code: e.target.value })} />
                <input className="form-control"
                  value={currentItem.name || ''}
                  onChange={e => setCurrentItem({ ...currentItem, name: e.target.value })} />
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>ปิด</button>
                <button className="btn btn-primary" onClick={handleEditSave}>บันทึก</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryTable;